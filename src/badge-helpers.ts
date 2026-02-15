import { generateErrorBadge } from './badge-generator';
import type { TRMNLRecipe, Bindings } from './types';
import type { Context } from 'hono';

/**
 * Return error badge response with proper headers
 */
export function returnErrorBadge(
  c: Context<{ Bindings: Bindings }>,
  label: string,
  message: string,
  cacheTime: number = 60
) {
  const errorBadge = generateErrorBadge(label, message);
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', `public, max-age=${cacheTime}`);
  return c.body(errorBadge);
}

/**
 * Validate recipe data and its stats
 * Returns true if valid, false if should show error
 * Serves as a type guard to ensure recipeData is not null/undefined
 */
export function isRecipeValid(
  recipeData: TRMNLRecipe | null | undefined,
  statKey?: 'installs' | 'forks'
): recipeData is TRMNLRecipe {
  if (!recipeData) return false;
  if (statKey && recipeData.stats?.[statKey] === undefined) return false;
  return true;
}
