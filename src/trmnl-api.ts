import type { TRMNLRecipe } from "./types";

const TRMNL_API_BASE = "https://trmnl.com";

/**
 * Fetch TRMNL recipe information
 */
export async function fetchRecipe(
  recipeId: string,
): Promise<TRMNLRecipe | null> {
  const url = `${TRMNL_API_BASE}/recipes/${recipeId}.json`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "trmnl-badges",
  };

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `TRMNL API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as { data: TRMNLRecipe };
    return result.data;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null;
  }
}
