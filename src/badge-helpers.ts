import { generateErrorBadge } from './badge-generator';

/**
 * Return error badge response with proper headers
 */
export function returnErrorBadge(c: any, label: string, message: string, cacheTime: number = 60) {
  const errorBadge = generateErrorBadge(label, message);
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', `public, max-age=${cacheTime}`);
  return c.body(errorBadge);
}

/**
 * Validate recipe data and its stats
 * Returns true if valid, false if should show error
 * Serves as a type guard to ensure recipeData is not null
 */
export function isRecipeValid(
  recipeData: unknown,
  statKey?: 'installs' | 'forks'
): recipeData is { stats: { installs: number; forks: number } } {
  if (!recipeData || typeof recipeData !== 'object') return false;
  const data = recipeData as any;
  if (statKey && data.stats?.[statKey] === undefined) return false;
  return true;
}
