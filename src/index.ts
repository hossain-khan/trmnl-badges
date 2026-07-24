import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { Bindings, TRMNLGlyph, TRMNLRecipe } from './types';
import { fetchRecipe, fetchUserRecipes } from './trmnl-api';
import { generateBadge } from './badge-generator';
import { APP_VERSION } from './constants';
import {
  formatNumber,
  aggregateAuthorStats,
  isValidUserId,
  incrementBadgeCounter,
  parseScale,
} from './utils';
import { returnErrorBadge, isRecipeValid, returnSuccessBadge } from './badge-helpers';

// 🎉 Fun tracking feature: KV store key for total badges served counter
const BADGES_SERVED_COUNTER_KEY = 'badges_served_total';
const EDGE_CACHE_TTL_SUCCESS_SECONDS = 90;
const EDGE_CACHE_TTL_ERROR_SECONDS = 30;
const EDGE_CACHE_METRICS_LOG_EVERY = 25;

const edgeCacheMetrics = {
  eligibleRequests: 0,
  hits: 0,
  misses: 0,
  writes: 0,
  bypasses: 0,
  cacheUnavailable: 0,
  errors: 0,
};

function maybeLogEdgeCacheMetrics() {
  if (
    edgeCacheMetrics.eligibleRequests === 0 ||
    edgeCacheMetrics.eligibleRequests % EDGE_CACHE_METRICS_LOG_EVERY !== 0
  ) {
    return;
  }

  const totalRequests =
    edgeCacheMetrics.eligibleRequests +
    edgeCacheMetrics.bypasses +
    edgeCacheMetrics.cacheUnavailable;

  const hitRatePercent =
    edgeCacheMetrics.eligibleRequests === 0
      ? 0
      : Math.round((edgeCacheMetrics.hits / edgeCacheMetrics.eligibleRequests) * 1000) / 10;

  console.log('[edge-cache] badge-cache-metrics', {
    totalRequests,
    eligibleRequests: edgeCacheMetrics.eligibleRequests,
    hits: edgeCacheMetrics.hits,
    misses: edgeCacheMetrics.misses,
    hitRatePercent,
    writes: edgeCacheMetrics.writes,
    bypasses: edgeCacheMetrics.bypasses,
    cacheUnavailable: edgeCacheMetrics.cacheUnavailable,
    errors: edgeCacheMetrics.errors,
  });
}

function parseMaxAge(cacheControl: string | null): number | undefined {
  if (!cacheControl) {
    return undefined;
  }

  const match = cacheControl.match(/max-age=(\d+)/i);
  if (!match) {
    return undefined;
  }

  const value = parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function resolveEdgeCacheTtlSeconds(response: Response): number {
  const maxAge = parseMaxAge(response.headers.get('Cache-Control'));
  if (typeof maxAge === 'number' && maxAge <= 60) {
    return EDGE_CACHE_TTL_ERROR_SECONDS;
  }
  return EDGE_CACHE_TTL_SUCCESS_SECONDS;
}

function buildCacheableResponse(response: Response, edgeTtlSeconds: number): Response {
  const clone = response.clone();
  const headers = new Headers(clone.headers);

  // Preserve the original max-age (browser/downstream cache TTL) and add s-maxage
  // for edge/shared cache TTL. This ensures cache-hit responses still deliver the
  // intended downstream Cache-Control semantics while keeping the edge cache TTL short.
  const originalCacheControl = clone.headers.get('Cache-Control');
  if (!originalCacheControl) {
    console.warn('[edge-cache] response missing Cache-Control header before caching');
  }
  headers.set('Cache-Control', `${originalCacheControl ?? 'public'}, s-maxage=${edgeTtlSeconds}`);

  return new Response(clone.body, {
    status: clone.status,
    statusText: clone.statusText,
    headers,
  });
}

// Valid TRMNL glyph options accepted as query params
const VALID_GLYPHS: TRMNLGlyph[] = ['brand', 'black', 'white'];
function parseGlyph(glyph: string | undefined): TRMNLGlyph | undefined {
  if (glyph && (VALID_GLYPHS as string[]).includes(glyph)) {
    return glyph as TRMNLGlyph;
  }
  return undefined;
}

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// Enable CORS for GitHub Pages and other origins
app.use(
  '*',
  cors({
    origin: ['https://hossain-khan.github.io', 'http://localhost:8787'],
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  })
);

// Cache rendered SVG badges at edge for a short period to reduce duplicate upstream calls.
app.use('/badge/*', async (context, next) => {
  if (context.req.method !== 'GET') {
    await next();
    return;
  }

  const pathname = new URL(context.req.url).pathname;
  if (pathname === '/badge/counter') {
    edgeCacheMetrics.bypasses += 1;
    maybeLogEdgeCacheMetrics();
    await next();
    return;
  }

  if (typeof caches === 'undefined' || !caches.default) {
    edgeCacheMetrics.cacheUnavailable += 1;
    maybeLogEdgeCacheMetrics();
    await next();
    return;
  }

  const cacheKey = new Request(context.req.url, { method: 'GET' });

  try {
    edgeCacheMetrics.eligibleRequests += 1;
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      edgeCacheMetrics.hits += 1;
      maybeLogEdgeCacheMetrics();
      return cached;
    }

    edgeCacheMetrics.misses += 1;
    maybeLogEdgeCacheMetrics();
  } catch (error) {
    edgeCacheMetrics.errors += 1;
    console.warn('[edge-cache] cache lookup failed', { pathname, error });
    maybeLogEdgeCacheMetrics();
  }

  await next();

  const response = context.res;
  if (response.status !== 200) {
    return;
  }

  const contentType = response.headers.get('Content-Type') || response.headers.get('content-type');
  if (!contentType?.includes('image/svg+xml')) {
    return;
  }

  const edgeTtlSeconds = resolveEdgeCacheTtlSeconds(response);
  const cacheableResponse = buildCacheableResponse(response, edgeTtlSeconds);

  const writePromise = caches.default
    .put(cacheKey, cacheableResponse)
    .then(() => {
      edgeCacheMetrics.writes += 1;
      maybeLogEdgeCacheMetrics();
    })
    .catch((error) => {
      edgeCacheMetrics.errors += 1;
      console.warn('[edge-cache] cache write failed', { pathname, error });
      maybeLogEdgeCacheMetrics();
    });

  try {
    context.executionCtx.waitUntil(writePromise);
  } catch {
    await writePromise;
  }
});

// Badge endpoints for TRMNL recipes
app.get('/badge/installs', async (context) => {
  try {
    const { recipe, userId, label, pretty, color, labelColor, glyph, scale } = context.req.query();
    const defaultLabel = isValidUserId(userId) ? 'Total Installs' : 'Installs';
    const isPretty = pretty !== undefined;
    const parsedGlyph = parseGlyph(glyph);
    const parsedScale = parseScale(scale);

    if (recipe) {
      // Single recipe badge
      let recipeData;
      try {
        recipeData = await fetchRecipe(recipe);
      } catch (err) {
        console.error('[badge/installs] Network error fetching recipe:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!isRecipeValid(recipeData, 'installs')) {
        return returnErrorBadge(context, label || defaultLabel, 'Recipe Not Found');
      }

      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(recipeData.stats.installs, isPretty),
        color: color || undefined,
        labelColor: labelColor || undefined,
        glyph: parsedGlyph,
        scale: parsedScale,
      });

      await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
      return returnSuccessBadge(context, badge);
    } else if (isValidUserId(userId)) {
      // Author badge - combined stats
      const userRecipes = await fetchUserRecipes(userId as string);

      if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
        return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
      }

      const stats = aggregateAuthorStats(userRecipes.data);
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(stats.installs, isPretty),
        color: color || undefined,
        labelColor: labelColor || undefined,
        glyph: parsedGlyph,
        scale: parsedScale,
      });

      await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
      return returnSuccessBadge(context, badge);
    } else {
      return returnErrorBadge(context, label || defaultLabel, 'Missing recipe or userId');
    }
  } catch (err) {
    console.error('[badge/installs] Unexpected error:', err);
    return returnErrorBadge(context, 'Installs', 'Service Error');
  }
});

app.get('/badge/forks', async (context) => {
  try {
    const { recipe, userId, label, pretty, color, labelColor, glyph, scale } = context.req.query();
    const defaultLabel = isValidUserId(userId) ? 'Total Forks' : 'Forks';
    const isPretty = pretty !== undefined;
    const parsedGlyph = parseGlyph(glyph);
    const parsedScale = parseScale(scale);

    if (recipe) {
      // Single recipe badge
      let recipeData;
      try {
        recipeData = await fetchRecipe(recipe);
      } catch (err) {
        console.error('[badge/forks] Network error fetching recipe:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!isRecipeValid(recipeData, 'forks')) {
        return returnErrorBadge(context, label || defaultLabel, 'Recipe Not Found');
      }

      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(recipeData.stats.forks, isPretty),
        color: color || undefined,
        labelColor: labelColor || undefined,
        glyph: parsedGlyph,
        scale: parsedScale,
      });

      await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
      return returnSuccessBadge(context, badge);
    } else if (isValidUserId(userId)) {
      // Author badge - combined stats
      const userRecipes = await fetchUserRecipes(userId as string);

      if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
        return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
      }

      const stats = aggregateAuthorStats(userRecipes.data);
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(stats.forks, isPretty),
        color: color || undefined,
        labelColor: labelColor || undefined,
        glyph: parsedGlyph,
        scale: parsedScale,
      });

      await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
      return returnSuccessBadge(context, badge);
    } else {
      return returnErrorBadge(context, label || defaultLabel, 'Missing recipe or userId');
    }
  } catch (err) {
    console.error('[badge/forks] Unexpected error:', err);
    return returnErrorBadge(context, 'Forks', 'Service Error');
  }
});

app.get('/badge/recipes', async (context) => {
  try {
    const { userId, label, pretty, color, labelColor, glyph, scale } = context.req.query();
    const defaultLabel = 'Recipes';
    const isPretty = pretty !== undefined;
    const parsedGlyph = parseGlyph(glyph);
    const parsedScale = parseScale(scale);

    if (!userId) {
      return returnErrorBadge(context, label || defaultLabel, 'Missing userId');
    }

    const userRecipes = await fetchUserRecipes(userId);

    if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
      return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
    }

    const stats = aggregateAuthorStats(userRecipes.data);
    const badge = generateBadge({
      label: label || defaultLabel,
      message: formatNumber(stats.recipes, isPretty),
      color: color || undefined,
      labelColor: labelColor || undefined,
      glyph: parsedGlyph,
      scale: parsedScale,
    });

    await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
    return returnSuccessBadge(context, badge);
  } catch (err) {
    console.error('[badge/recipes] Unexpected error:', err);
    return returnErrorBadge(context, 'Recipes', 'Service Error');
  }
});

// API endpoint for TRMNL recipe connections
// Connection is basically sum of forks and installs
// https://discord.com/channels/1281055965508141100/1284986484767723611/1472606943976624323
// See API spec for details: https://github.com/hossain-khan/trmnl-badges/blob/main/docs/api.md
app.get('/badge/connections', async (context) => {
  try {
    const { recipe, userId, label, pretty, color, labelColor, glyph, scale } = context.req.query();
    const defaultLabel = isValidUserId(userId) ? 'Total Connections' : 'Connections';
    const isPretty = pretty !== undefined;
    const parsedGlyph = parseGlyph(glyph);
    const parsedScale = parseScale(scale);

    if (recipe) {
      // Single recipe badge
      let recipeData;
      try {
        recipeData = await fetchRecipe(recipe);
      } catch (err) {
        console.error('[badge/connections] Network error fetching recipe:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (
        !isRecipeValid(recipeData) ||
        recipeData.stats?.installs === undefined ||
        recipeData.stats?.forks === undefined
      ) {
        return returnErrorBadge(context, label || defaultLabel, 'Recipe Not Found');
      }

      const totalConnections = recipeData.stats.installs + recipeData.stats.forks;
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(totalConnections, isPretty),
        color: color || undefined,
        labelColor: labelColor || undefined,
        glyph: parsedGlyph,
        scale: parsedScale,
      });

      await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
      return returnSuccessBadge(context, badge);
    } else if (isValidUserId(userId)) {
      // Author badge - combined stats
      const userRecipes = await fetchUserRecipes(userId as string);

      if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
        return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
      }

      const stats = aggregateAuthorStats(userRecipes.data);
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(stats.connections, isPretty),
        color: color || undefined,
        labelColor: labelColor || undefined,
        glyph: parsedGlyph,
        scale: parsedScale,
      });

      await incrementBadgeCounter(context, BADGES_SERVED_COUNTER_KEY);
      return returnSuccessBadge(context, badge);
    } else {
      return returnErrorBadge(context, label || defaultLabel, 'Missing recipe or userId');
    }
  } catch (err) {
    console.error('[badge/connections] Unexpected error:', err);
    return returnErrorBadge(context, 'Connections', 'Service Error');
  }
});

// API endpoint for TRMNL recipe stats
// See API spec for details: https://github.com/hossain-khan/trmnl-badges/blob/main/docs/api.md
app.get('/api/stats', async (context) => {
  const { recipe } = context.req.query();

  if (!recipe) {
    return context.json({ error: 'Missing required parameter: recipe' }, 400);
  }

  const recipeData = await fetchRecipe(recipe);

  if (!recipeData) {
    return context.json({ error: 'Recipe not found' }, 404);
  }

  const stats = {
    id: recipeData.id,
    user_id: recipeData.user_id,
    name: recipeData.name,
    icon_url: recipeData.icon_url || null,
    published_at: recipeData.published_at,
    stats: {
      installs: recipeData.stats.installs,
      forks: recipeData.stats.forks,
    },
    author: {
      github_url: recipeData.author_bio?.github_url || null,
      learn_more_url: recipeData.author_bio?.learn_more_url || null,
    },
  };

  context.header('Cache-Control', 'public, max-age=3600');
  return context.json(stats);
});

// API endpoint for fetching all recipes for a specific user/author
// See API spec for details: https://github.com/hossain-khan/trmnl-badges/blob/main/docs/api.md
app.get('/api/recipes', async (context) => {
  const { user_id } = context.req.query();

  if (!user_id) {
    return context.json({ error: 'Missing required parameter: user_id' }, 400);
  }

  const userRecipes = await fetchUserRecipes(user_id);

  if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
    return context.json({ error: 'No recipes found for this user' }, 404);
  }

  context.header('Cache-Control', 'public, max-age=3600');
  return context.json(userRecipes);
});

///////////////////////////////////////////////////////////
// Utility endpoints for status, testing and development
///////////////////////////////////////////////////////////

app.get('/health', (context) => {
  return context.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    projectUrl: 'https://github.com/hossain-khan/trmnl-badges',
  });
});

// Health badge endpoint for shields.io
app.get('/health-badge', (context) => {
  return context.json({
    schemaVersion: 1,
    label: 'TRMNL Badge Service',
    message: 'Online',
    color: 'brightgreen',
  });
});

app.get('/', (context) => {
  if (context.env.NODE_ENV === 'production') {
    return context.redirect('https://github.com/hossain-khan/trmnl-badges');
  } else {
    return context.text('TRMNL Badges API - Development Mode');
  }
});

/**
 * 🎉 Fun tracking feature: Badge showing total badges served
 *
 * NOTE: This counter uses approximate counting due to potential race conditions
 * in KV operations. Multiple concurrent requests may result in lost updates.
 */
app.get('/badge/counter', async (context) => {
  const counterValue = await context.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
  const count = counterValue ? parseInt(counterValue, 10) : 0;

  // Validate that parseInt produced a valid number
  if (!Number.isFinite(count)) {
    console.warn(`Invalid counter value: ${counterValue}, resetting to 0`);
  }

  const validCount = Number.isFinite(count) ? count : 0;

  const badge = generateBadge({
    label: 'Badges Served',
    message: formatNumber(validCount, true),
    glyph: 'white',
  });

  return returnSuccessBadge(context, badge);
});

export default app;
