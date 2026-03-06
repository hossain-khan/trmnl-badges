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
 * Returns true if the error is a Cloudflare KV 429 Too Many Requests error
 */
function is429Error(err: unknown): boolean {
  return err instanceof Error && err.message.includes('429');
}

/**
 * Returns a Promise that resolves after the given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to increment badge counter.
 * Retries up to KV_MAX_ATTEMPTS times with exponential backoff and jitter on
 * 429 Too Many Requests errors, which can occur when many concurrent requests
 * all attempt to write to the same KV key simultaneously.
 */
export async function incrementBadgeCounter(
  context: Context<{ Bindings: Bindings }>,
  counterKey: string
) {
  if (!context.env || !context.env.BADGE_COUNTER) {
    return;
  }

  for (let attempt = 1; attempt <= KV_MAX_ATTEMPTS; attempt++) {
    try {
      const current = await context.env.BADGE_COUNTER.get(counterKey);
      const count = current ? parseInt(current, 10) : 0;

      if (!Number.isFinite(count)) {
        console.warn(`Invalid counter value: ${current}, resetting to 0`);
      }

      const newCount = (Number.isFinite(count) ? count : 0) + 1;
      await context.env.BADGE_COUNTER.put(counterKey, newCount.toString());
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
