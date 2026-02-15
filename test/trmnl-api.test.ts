import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchRecipe } from '../src/trmnl-api';
import { mockRecipe } from './fixtures';

// Mock the global fetch function
global.fetch = vi.fn();

describe('fetchRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return recipe data when API returns valid JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json; charset=utf-8']]),
      json: async () => ({ data: mockRecipe }),
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('227153');

    expect(result).toEqual(mockRecipe);
    expect(global.fetch).toHaveBeenCalledWith('https://trmnl.com/recipes/227153.json', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'trmnl-badges',
      },
    });
  });

  it('should return null when recipe does not exist (302 redirect with HTML)', async () => {
    const mockResponse = {
      ok: false,
      status: 302,
      headers: new Map([['content-type', 'text/html; charset=utf-8']]),
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('22715322');

    expect(result).toBeNull();
  });

  it('should return null when content-type is not JSON', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'text/html']]),
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

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

    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('999999');

    expect(result).toBeNull();
  });

  it('should return null and log error when fetch fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

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

    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

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

    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

    const result = await fetchRecipe('227153');

    expect(result).toBeNull();
  });
});
