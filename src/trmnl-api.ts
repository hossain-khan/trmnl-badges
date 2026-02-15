import type { TRMNLRecipe } from './types';

const TRMNL_API_BASE = 'https://trmnl.com';

/**
 * Fetch TRMNL recipe information
 */
export async function fetchRecipe(recipeId: string): Promise<TRMNLRecipe | null> {
  const url = `${TRMNL_API_BASE}/recipes/${recipeId}.json`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'trmnl-badges',
  };

  try {
    const response = await fetch(url, { headers });

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
    console.error('Error fetching recipe:', error);
    return null;
  }
}
