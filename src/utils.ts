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
 * Helper function to increment badge counter
 */
export async function incrementBadgeCounter(
  context: Context<{ Bindings: Bindings }>,
  counterKey: string
) {
  if (context.env && context.env.BADGE_COUNTER) {
    try {
      const current = await context.env.BADGE_COUNTER.get(counterKey);
      const count = current ? parseInt(current, 10) : 0;

      if (!Number.isFinite(count)) {
        console.warn(`Invalid counter value: ${current}, resetting to 0`);
      }

      const newCount = (Number.isFinite(count) ? count : 0) + 1;
      await context.env.BADGE_COUNTER.put(counterKey, newCount.toString());
    } catch (err) {
      console.error('Counter error:', err);
    }
  }
}
