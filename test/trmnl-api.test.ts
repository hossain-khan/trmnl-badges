import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchRecipe, fetchUserRecipes } from '../src/trmnl-api';
import { APP_USER_AGENT } from '../src/constants';
import { mockRecipe, mockUserRecipesResponse } from './fixtures';

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

    expect(result).toEqual(mockUserRecipesResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://trmnl.com/recipes.json?user_id=29',
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
      'https://trmnl.com/recipes.json?user_id=user%20123',
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
    expect(r1).toEqual(mockUserRecipesResponse);
    expect(r2).toEqual(mockUserRecipesResponse);
    expect(r3).toEqual(mockUserRecipesResponse);
  });
});
