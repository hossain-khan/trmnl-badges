import type { Context } from 'hono';
import type { Bindings, TRMNLRecipe } from './types';

/**
 * Compact number formatter (e.g., 1234 -> 1.2K)
 */
export const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumSignificantDigits: 3,
});

/**
 * Format a number with optional pretty formatting
 */
export function formatNumber(value: number, pretty: boolean = false): string {
  if (pretty) {
    return compactNumberFormatter.format(value);
  }
  return value.toLocaleString('en-US');
}

/**
 * Helper function to aggregate author statistics from multiple recipes
 */
export function aggregateAuthorStats(recipes: TRMNLRecipe[]) {
  let totalInstalls = 0;
  let totalForks = 0;

  recipes.forEach((recipe) => {
    totalInstalls += recipe.stats?.installs || 0;
    totalForks += recipe.stats?.forks || 0;
  });

  return {
    recipes: recipes.length,
    installs: totalInstalls,
    forks: totalForks,
    connections: totalInstalls + totalForks,
  };
}

/**
 * Helper function to safely check if userId is a valid non-empty string
 */
export function isValidUserId(userId: string | string[] | undefined): boolean {
  return typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Maximum number of attempts (1 initial + retries) for KV counter operations
 */
const KV_MAX_ATTEMPTS = 3;

/**
 * Base delay in milliseconds for exponential backoff on KV rate limit errors
 */
const KV_RETRY_BASE_DELAY_MS = 100;

/**
 * Returns true if the error is a Cloudflare KV 429 Too Many Requests error.
 * Checks structured status/statusCode/code fields first, then falls back to
 * message inspection using an exact word-boundary match to avoid false positives
 * from unrelated error codes that contain "429" as a substring (e.g. 1429, 4290).
 */
function is429Error(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  const anyErr = err as any;

  // Prefer structured status fields when available
  if (typeof anyErr.status === 'number' && anyErr.status === 429) {
    return true;
  }
  if (typeof anyErr.statusCode === 'number' && anyErr.statusCode === 429) {
    return true;
  }
  if (typeof anyErr.code === 'number' && anyErr.code === 429) {
    return true;
  }

  const message = err.message;

  // Match well-known 429 phrase
  if (message.toLowerCase().includes('too many requests')) {
    return true;
  }

  // Match "429" only as a standalone status code, not part of a larger number
  return /\b429\b/.test(message);
}

/**
 * Returns a Promise that resolves after the given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs the actual KV counter increment with exponential backoff retry on 429 errors.
 * Separated from incrementBadgeCounter so it can be scheduled via waitUntil.
 */
async function doIncrementCounter(kv: KVNamespace, counterKey: string): Promise<void> {
  for (let attempt = 1; attempt <= KV_MAX_ATTEMPTS; attempt++) {
    try {
      const current = await kv.get(counterKey);
      const count = current ? parseInt(current, 10) : 0;

      if (!Number.isFinite(count)) {
        console.warn(`Invalid counter value: ${current}, resetting to 0`);
      }

      const newCount = (Number.isFinite(count) ? count : 0) + 1;
      await kv.put(counterKey, newCount.toString());
      return; // success
    } catch (err) {
      const isLastAttempt = attempt === KV_MAX_ATTEMPTS;
      if (is429Error(err) && !isLastAttempt) {
        // Exponential backoff with full jitter to spread out concurrent retries
        const ceiling = KV_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const delay = Math.random() * ceiling;
        console.warn(
          `KV rate limited (429), retrying in ${Math.round(delay)}ms (attempt ${attempt}/${KV_MAX_ATTEMPTS})...`
        );
        await sleep(delay);
      } else {
        console.error('Counter error:', err);
        return;
      }
    }
  }
}

/**
 * Helper function to increment badge counter.
 * In Cloudflare Workers, schedules the increment as a non-blocking background task
 * via `executionCtx.waitUntil`, so rate-limit retries don't delay badge responses.
 * Falls back to a direct await in other environments (e.g., tests).
 */
export async function incrementBadgeCounter(
  context: Context<{ Bindings: Bindings }>,
  counterKey: string
): Promise<void> {
  if (!context.env || !context.env.BADGE_COUNTER) {
    return;
  }

  const work = doIncrementCounter(context.env.BADGE_COUNTER, counterKey);
  try {
    // In Cloudflare Workers, schedule as a background task so the badge
    // response is returned immediately without waiting for retries.
    context.executionCtx.waitUntil(work);
  } catch {
    // executionCtx not available (test environment) — await directly so
    // the counter is updated before the caller's assertions run.
    await work;
  }
}
