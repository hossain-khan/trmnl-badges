import { z, ZodError } from 'zod';

/**
 * Badge endpoint query parameters schema
 * Validates recipe ID, custom label, and formatting preferences
 */
export const badgeQuerySchema = z.object({
  recipe: z.string().min(1, 'Recipe ID is required').regex(/^\d+$/, 'Recipe ID must be numeric'),
  label: z.string().optional(),
  pretty: z.boolean().default(false),
});

export type BadgeQuery = z.infer<typeof badgeQuerySchema>;

/**
 * Stats endpoint query parameters schema
 */
export const statsQuerySchema = z.object({
  recipe: z.string().min(1, 'Recipe ID is required').regex(/^\d+$/, 'Recipe ID must be numeric'),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;

/**
 * Parse and validate query parameters with Zod
 * Returns validated data or throws ZodError
 */
export function parseBadgeQuery(params: Record<string, string | string[] | undefined>): BadgeQuery {
  const parsed = {
    recipe: Array.isArray(params.recipe) ? params.recipe[0] : params.recipe || '',
    label: Array.isArray(params.label) ? params.label[0] : params.label,
    pretty: params.pretty !== undefined, // Presence of parameter treats it as true
  };

  return badgeQuerySchema.parse(parsed);
}

/**
 * Parse and validate stats query parameters
 */
export function parseStatsQuery(params: Record<string, string | string[] | undefined>): StatsQuery {
  const parsed = {
    recipe: Array.isArray(params.recipe) ? params.recipe[0] : params.recipe || '',
  };

  return statsQuerySchema.parse(parsed);
}

/**
 * Format ZodError for user-friendly error messages
 */
export function formatZodError(err: ZodError): string {
  return err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
}
