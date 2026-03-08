import type { TRMNLRecipe } from './types';
import { APP_USER_AGENT } from './constants';

const TRMNL_API_BASE = 'https://trmnl.com';
const TRMNL_API_TIMEOUT_MS = 4000;
const TRMNL_API_CACHE_TTL_SECONDS = 60;
const DEDUPE_METRICS_LOG_EVERY = 25;

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

async function fetchTrmnlJson(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRMNL_API_TIMEOUT_MS);

  try {
    return await fetch(url, {
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
      const response = await fetchTrmnlJson(url, headers);

      // Check if response is JSON (a 302 redirect to recipes page returns HTML)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        // Recipe not found (API redirects to recipe list page with HTML, or other non-JSON response)
        return null;
      }

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`TRMNL API error: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as { data: TRMNLRecipe };
      return result.data;
    } catch (error) {
      recordUpstreamFailure(error, url);
      console.error('Error fetching recipe:', error);
      return null;
    }
  });
}

/**
 * Fetch all recipes for a specific user/author
 * Returns recipes with their stats (installs, forks)
 */
export async function fetchUserRecipes(userId: string): Promise<{ data: TRMNLRecipe[] } | null> {
  const url = `${TRMNL_API_BASE}/recipes.json?user_id=${encodeURIComponent(userId)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': APP_USER_AGENT,
  };

  return getInFlightOrCreate(inFlightUserRequests, url, 'user', async () => {
    try {
      const response = await fetchTrmnlJson(url, headers);

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

      const result = (await response.json()) as { data: TRMNLRecipe[] };
      return result;
    } catch (error) {
      recordUpstreamFailure(error, url);
      console.error('Error fetching user recipes:', error);
      return null;
    }
  });
}
