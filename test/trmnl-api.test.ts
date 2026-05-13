import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchRecipe, fetchUserRecipes } from '../src/trmnl-api';
import { APP_USER_AGENT } from '../src/constants';
import {
  mockRecipe,
  mockUserRecipesResponse,
  mockUserRecipesPage1,
  mockUserRecipesPage2,
} from './fixtures';

describe('fetchRecipe', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return recipe data when API returns valid JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json; charset=utf-8']]),
      json: async () => ({ data: mockRecipe }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('227153');

    expect(result).toEqual(mockRecipe);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://trmnl.com/recipes/227153.json',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'User-Agent': APP_USER_AGENT,
        },
        cf: {
          cacheEverything: true,
          cacheTtl: 60,
        },
      })
    );
  });

  it('should return null when recipe does not exist (302 redirect with HTML)', async () => {
    const mockResponse = {
      ok: false,
      status: 302,
      headers: new Map([['content-type', 'text/html; charset=utf-8']]),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('22715322');

    expect(result).toBeNull();
  });

  it('should return null when content-type is not JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'text/html']]),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('12345');

    expect(result).toBeNull();
  });

  it('should return null when API returns 404', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map([['content-type', 'application/json']]),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('999999');

    expect(result).toBeNull();
  });

  it('should return null and log error when fetch fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchRecipe('227153');

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching recipe:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should return null and log error when JSON parsing fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => {
        throw new Error('Invalid JSON');
      },
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('227153');

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching recipe:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should handle missing content-type header', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ data: mockRecipe }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('227153');

    expect(result).toBeNull();
  });

  it('should dedupe concurrent requests for the same recipe ID', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const deferredFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockFetch.mockReturnValueOnce(deferredFetch as any);

    const p1 = fetchRecipe('227153');
    const p2 = fetchRecipe('227153');
    const p3 = fetchRecipe('227153');

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json; charset=utf-8']]),
      json: async () => ({ data: mockRecipe }),
    });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toEqual(mockRecipe);
    expect(r2).toEqual(mockRecipe);
    expect(r3).toEqual(mockRecipe);
  });

  it('should clear in-flight state after a failed request so the next call retries', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json; charset=utf-8']]),
      json: async () => ({ data: mockRecipe }),
    } as any);

    const first = await fetchRecipe('227153');
    const second = await fetchRecipe('227153');

    expect(first).toBeNull();
    expect(second).toEqual(mockRecipe);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });
});

describe('fetchUserRecipes', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return user recipes when API returns valid JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json; charset=utf-8']]),
      json: async () => mockUserRecipesResponse,
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchUserRecipes('29');

    expect(result).toEqual({ data: mockUserRecipesResponse.data });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://trmnl.com/recipes.json?per_page=100&sort-by=popularity&user_id=29',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'User-Agent': APP_USER_AGENT,
        },
        cf: {
          cacheEverything: true,
          cacheTtl: 60,
        },
      })
    );
  });

  it('should return null when content-type is not JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'text/html']]),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchUserRecipes('29');

    expect(result).toBeNull();
  });

  it('should return null when API returns 404', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map([['content-type', 'application/json']]),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchUserRecipes('99999');

    expect(result).toBeNull();
  });

  it('should return null and log error when fetch fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchUserRecipes('29');

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user recipes:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should return null when content-type header is missing', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => mockUserRecipesResponse,
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    const result = await fetchUserRecipes('29');

    expect(result).toBeNull();
  });

  it('should encode userId in the URL', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ data: [] }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse as any);

    await fetchUserRecipes('user 123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://trmnl.com/recipes.json?per_page=100&sort-by=popularity&user_id=user%20123',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'User-Agent': APP_USER_AGENT,
        },
      })
    );
  });

  it('should dedupe concurrent requests for the same user ID', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const deferredFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockFetch.mockReturnValueOnce(deferredFetch as any);

    const p1 = fetchUserRecipes('29');
    const p2 = fetchUserRecipes('29');
    const p3 = fetchUserRecipes('29');

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json; charset=utf-8']]),
      json: async () => mockUserRecipesResponse,
    });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toEqual({ data: mockUserRecipesResponse.data });
    expect(r2).toEqual({ data: mockUserRecipesResponse.data });
    expect(r3).toEqual({ data: mockUserRecipesResponse.data });
  });

  it('should fetch all pages when next_page_url is present', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => mockUserRecipesPage1,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => mockUserRecipesPage2,
      } as any);

    const result = await fetchUserRecipes('6458');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://trmnl.com/recipes.json?per_page=100&sort-by=popularity&user_id=6458',
      expect.anything()
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://trmnl.com/recipes.json?page=2&per_page=100&user_id=6458',
      expect.anything()
    );

    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(
      mockUserRecipesPage1.data.length + mockUserRecipesPage2.data.length
    );
    expect(result!.data[0]).toEqual(mockUserRecipesPage1.data[0]);
    expect(result!.data[100]).toEqual(mockUserRecipesPage2.data[0]);
  });

  it('should combine stats from all pages for a user with over 25 recipes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => mockUserRecipesPage1,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => mockUserRecipesPage2,
      } as any);

    const result = await fetchUserRecipes('6458');

    expect(result).not.toBeNull();
    // 100 recipes × 10 installs + 30 recipes × 5 installs = 1150
    const totalInstalls = result!.data.reduce((sum, r) => sum + r.stats.installs, 0);
    expect(totalInstalls).toBe(100 * 10 + 30 * 5);
    // 100 recipes × 2 forks + 30 recipes × 1 fork = 230
    const totalForks = result!.data.reduce((sum, r) => sum + r.stats.forks, 0);
    expect(totalForks).toBe(100 * 2 + 30 * 1);
  });

  it('should return null when the first page returns non-JSON content-type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'text/html']]),
    } as any);

    const result = await fetchUserRecipes('6458');

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should return partial results when a subsequent page returns non-JSON', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => mockUserRecipesPage1,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
      } as any);

    const result = await fetchUserRecipes('6458');

    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(mockUserRecipesPage1.data.length);
  });

  it('should return null when the first page returns a non-OK non-404 status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map([['content-type', 'application/json']]),
    } as any);

    const result = await fetchUserRecipes('6458');

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('should return partial results when a subsequent page returns a non-OK non-404 status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => mockUserRecipesPage1,
      } as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Map([['content-type', 'application/json']]),
      } as any);

    const result = await fetchUserRecipes('6458');

    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(mockUserRecipesPage1.data.length);
    consoleErrorSpy.mockRestore();
  });

  it('should stop fetching and return collected recipes when pagination cap is reached', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Build 21 pages where each page points to the next, simulating a very deep pagination.
    // We use a unique userId to avoid deduplication cache collisions with other tests.
    const maxPages = 20;
    for (let i = 0; i < maxPages + 1; i++) {
      const isLast = i === maxPages;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json; charset=utf-8']]),
        json: async () => ({
          data: [
            {
              id: 500000 + i,
              user_id: 9999,
              name: `Recipe ${i}`,
              published_at: '2026-01-01T00:00:00.000Z',
              stats: { installs: 1, forks: 0 },
            },
          ],
          total: (maxPages + 1) * 1,
          from: i + 1,
          to: i + 1,
          per_page: 1,
          current_page: i + 1,
          prev_page_url:
            i > 0 ? `https://trmnl.com/recipes.json?page=${i}&per_page=1&user_id=9999` : null,
          next_page_url: isLast
            ? null
            : `https://trmnl.com/recipes.json?page=${i + 2}&per_page=1&user_id=9999`,
        }),
      } as any);
    }

    const result = await fetchUserRecipes('9999');

    // Should have stopped at MAX_PAGES (20), not fetched all 21 pages
    expect(mockFetch).toHaveBeenCalledTimes(maxPages);
    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(maxPages);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[trmnl-api] fetchUserRecipes pagination cap reached',
      expect.objectContaining({ pageCount: maxPages, maxPages })
    );
    consoleWarnSpy.mockRestore();
  });
});
