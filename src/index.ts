import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { Bindings, TRMNLGlyph, TRMNLRecipe } from './types';
import { fetchRecipe, fetchUserRecipes } from './trmnl-api';
import { generateBadge } from './badge-generator';
import {
  formatNumber,
  aggregateAuthorStats,
  isValidUserId,
  incrementBadgeCounter,
  parseScale,
} from './utils';
import { returnErrorBadge, isRecipeValid, returnSuccessBadge } from './badge-helpers';

// App version - https://github.com/hossain-khan/trmnl-badges/releases
const APP_VERSION = '1.4.0';

// 🎉 Fun tracking feature: KV store key for total badges served counter
const BADGES_SERVED_COUNTER_KEY = 'badges_served_total';

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
  });

  return returnSuccessBadge(context, badge);
});

export default app;
