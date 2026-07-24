import type { TRMNLRecipe, TRMNLUserRecipesResponse } from './types';
import { APP_USER_AGENT } from './constants';

const TRMNL_API_BASE = 'https://trmnl.com';
const TRMNL_API_TIMEOUT_MS = 4000;
const TRMNL_API_CACHE_TTL_SECONDS = 60;
const DEDUPE_METRICS_LOG_EVERY = 25;
const FETCH_USER_RECIPES_MAX_PAGES = 20;

type DedupeRequestKind = 'recipe' | 'user';

const dedupeMetrics = {
  recipeHits: 0,
  recipeMisses: 0,
  userHits: 0,
  userMisses: 0,
  upstreamTimeouts: 0,
  upstreamErrors: 0,
};

const inFlightRecipeRequests = new Map<string, Promise<TRMNLRecipe | null>>();
const inFlightUserRequests = new Map<string, Promise<{ data: TRMNLRecipe[] } | null>>();

function maybeLogDedupeMetrics() {
  const lookups =
    dedupeMetrics.recipeHits +
    dedupeMetrics.recipeMisses +
    dedupeMetrics.userHits +
    dedupeMetrics.userMisses;

  if (lookups === 0 || lookups % DEDUPE_METRICS_LOG_EVERY !== 0) {
    return;
  }

  const hits = dedupeMetrics.recipeHits + dedupeMetrics.userHits;
  const hitRatePercent = Math.round((hits / lookups) * 1000) / 10;

  console.log('[trmnl-api] dedupe-metrics', {
    lookups,
    hits,
    hitRatePercent,
    recipeHits: dedupeMetrics.recipeHits,
    recipeMisses: dedupeMetrics.recipeMisses,
    userHits: dedupeMetrics.userHits,
    userMisses: dedupeMetrics.userMisses,
    upstreamTimeouts: dedupeMetrics.upstreamTimeouts,
    upstreamErrors: dedupeMetrics.upstreamErrors,
    inFlightRecipeRequests: inFlightRecipeRequests.size,
    inFlightUserRequests: inFlightUserRequests.size,
  });
}

function recordDedupeLookup(kind: DedupeRequestKind, hit: boolean) {
  if (kind === 'recipe') {
    if (hit) {
      dedupeMetrics.recipeHits += 1;
    } else {
      dedupeMetrics.recipeMisses += 1;
    }
  } else {
    if (hit) {
      dedupeMetrics.userHits += 1;
    } else {
      dedupeMetrics.userMisses += 1;
    }
  }

  maybeLogDedupeMetrics();
}

function recordUpstreamFailure(error: unknown, url: string) {
  if (error instanceof Error && error.name === 'AbortError') {
    dedupeMetrics.upstreamTimeouts += 1;
    console.warn('[trmnl-api] upstream-timeout', { url, timeoutMs: TRMNL_API_TIMEOUT_MS });
  } else {
    dedupeMetrics.upstreamErrors += 1;
  }
}

function getInFlightOrCreate<T>(
  map: Map<string, Promise<T>>,
  key: string,
  kind: DedupeRequestKind,
  work: () => Promise<T>
): Promise<T> {
  const existing = map.get(key);
  if (existing) {
    recordDedupeLookup(kind, true);
    return existing;
  }

  recordDedupeLookup(kind, false);

  const promise = work().finally(() => {
    map.delete(key);
  });

  map.set(key, promise);
  return promise;
}

async function fetchTrmnlJson(
  url: string,
  headers: Record<string, string>,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRMNL_API_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      // Ask Cloudflare to keep a short upstream cache to reduce burst traffic.
      cf: {
        cacheEverything: true,
        cacheTtl: TRMNL_API_CACHE_TTL_SECONDS,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch TRMNL recipe information
 */
export async function fetchRecipe(recipeId: string): Promise<TRMNLRecipe | null> {
  const url = `${TRMNL_API_BASE}/recipes/${encodeURIComponent(recipeId)}.json`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': APP_USER_AGENT,
  };

  return getInFlightOrCreate(inFlightRecipeRequests, url, 'recipe', async () => {
    try {
      // Use redirect: 'manual' to catch upstream 302 redirects for non-existent recipes
      const response = await fetchTrmnlJson(url, headers, { redirect: 'manual' });

      // Handle upstream redirects (TRMNL API redirects non-existent recipes to /recipes)
      if (response.status >= 300 && response.status < 400) {
        return null;
      }

      if (response.redirected) {
        return null;
      }

      // Check if response is JSON (a redirect or HTML error page is non-JSON)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return null;
      }

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`TRMNL API error: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as { data: TRMNLRecipe };

      // Ensure data is a valid single recipe object with stats, not an Array or missing stats
      if (
        !result ||
        !result.data ||
        Array.isArray(result.data) ||
        typeof result.data !== 'object' ||
        !('stats' in result.data)
      ) {
        return null;
      }

      return result.data;
    } catch (error) {
      recordUpstreamFailure(error, url);
      console.error('Error fetching recipe:', error);
      return null;
    }
  });
}

/**
 * Fetch all recipes for a specific user/author, following pagination via next_page_url.
 * Returns all recipes across all pages with their stats (installs, forks).
 */
export async function fetchUserRecipes(userId: string): Promise<{ data: TRMNLRecipe[] } | null> {
  const initialUrl = `${TRMNL_API_BASE}/recipes.json?per_page=100&sort-by=popularity&user_id=${encodeURIComponent(userId)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': APP_USER_AGENT,
  };

  return getInFlightOrCreate(inFlightUserRequests, initialUrl, 'user', async () => {
    try {
      const allRecipes: TRMNLRecipe[] = [];
      let nextUrl: string | null = initialUrl;
      let pageCount = 0;

      while (nextUrl) {
        if (pageCount >= FETCH_USER_RECIPES_MAX_PAGES) {
          console.warn('[trmnl-api] fetchUserRecipes pagination cap reached', {
            userId,
            pageCount,
            maxPages: FETCH_USER_RECIPES_MAX_PAGES,
          });
          break;
        }

        const response = await fetchTrmnlJson(nextUrl, headers);

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return allRecipes.length > 0 ? { data: allRecipes } : null;
        }

        if (!response.ok) {
          if (response.status === 404) {
            return allRecipes.length > 0 ? { data: allRecipes } : null;
          }
          // For other non-OK responses (e.g., 500, 503, 429), return any recipes already
          // collected rather than discarding them by throwing and catching to null.
          console.error('[trmnl-api] fetchUserRecipes upstream error', {
            status: response.status,
            statusText: response.statusText,
            page: pageCount + 1,
          });
          return allRecipes.length > 0 ? { data: allRecipes } : null;
        }

        const result = (await response.json()) as TRMNLUserRecipesResponse;
        allRecipes.push(...result.data);
        nextUrl = result.next_page_url ?? null;
        pageCount++;
      }

      return { data: allRecipes };
    } catch (error) {
      recordUpstreamFailure(error, initialUrl);
      console.error('Error fetching user recipes:', error);
      return null;
    }
  });
}
