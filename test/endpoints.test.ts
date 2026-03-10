import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index';
import {
  mockRecipe,
  mockRecipeHighEngagement,
  mockRecipeZeroStats,
  mockRecipeZeroForks,
  mockUserRecipesResponse,
} from './fixtures';

// Mock the trmnl-api functions
vi.mock('../src/trmnl-api', () => ({
  fetchRecipe: vi.fn(),
  fetchUserRecipes: vi.fn(),
}));

import { fetchRecipe, fetchUserRecipes } from '../src/trmnl-api';

describe('TRMNL Badges API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GET /', () => {
    it('should redirect to GitHub in production mode', async () => {
      const response = await app.request('/', {}, { NODE_ENV: 'production' });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('https://github.com/hossain-khan/trmnl-badges');
    });

    it('should return development message when not in production', async () => {
      const response = await app.request('/', {}, { NODE_ENV: 'development' });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('TRMNL Badges API - Development Mode');
    });
  });

  describe('GET /health', () => {
    it('should return ok status with timestamp and projectUrl', async () => {
      const response = await app.request('/health');
      expect(response.status).toBe(200);

      const json = (await response.json()) as any;
      expect(json).toHaveProperty('status', 'ok');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('projectUrl', 'https://github.com/hossain-khan/trmnl-badges');

      // Verify timestamp is a valid ISO string
      expect(() => new Date(json.timestamp as string)).not.toThrow();
    });
  });

  describe('GET /health-badge', () => {
    it('should return shields.io compatible health badge', async () => {
      const response = await app.request('/health-badge');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const json = (await response.json()) as any;
      expect(json).toHaveProperty('schemaVersion', 1);
      expect(json).toHaveProperty('label', 'TRMNL Badge Service');
      expect(json).toHaveProperty('message', 'Online');
      expect(json).toHaveProperty('color', 'brightgreen');
    });
  });

  describe('Edge cache middleware', () => {
    function createInMemoryEdgeCache() {
      const store = new Map<string, Response>();
      const match = vi.fn(async (request: Request) => {
        const cached = store.get(request.url);
        return cached ? cached.clone() : undefined;
      });

      const put = vi.fn(async (request: Request, response: Response) => {
        store.set(request.url, response.clone());
      });

      vi.stubGlobal('caches', {
        default: {
          match,
          put,
        },
      });

      return { store, match, put };
    }

    it('should serve repeated badge request from edge cache after first miss', async () => {
      const edgeCache = createInMemoryEdgeCache();
      vi.mocked(fetchRecipe).mockResolvedValue(mockRecipe);

      const firstResponse = await app.request('/badge/installs?recipe=240176');
      expect(firstResponse.status).toBe(200);
      await firstResponse.text();

      expect(edgeCache.match).toHaveBeenCalledTimes(1);
      expect(edgeCache.put).toHaveBeenCalledTimes(1);
      expect(fetchRecipe).toHaveBeenCalledTimes(1);

      const secondResponse = await app.request('/badge/installs?recipe=240176');
      expect(secondResponse.status).toBe(200);
      const secondSvg = await secondResponse.text();

      expect(secondSvg).toContain('Installs');
      expect(secondSvg).toContain('7');
      expect(edgeCache.match).toHaveBeenCalledTimes(2);
      expect(fetchRecipe).toHaveBeenCalledTimes(1);
    });

    it('should preserve downstream max-age on cache hit for success badge', async () => {
      const edgeCache = createInMemoryEdgeCache();
      vi.mocked(fetchRecipe).mockResolvedValue(mockRecipe);

      // Cache miss: response carries route-level max-age
      const missResponse = await app.request('/badge/installs?recipe=240176');
      expect(missResponse.status).toBe(200);
      expect(missResponse.headers.get('Cache-Control')).toBe('public, max-age=3600');
      await missResponse.text();

      // Edge cache stored copy uses s-maxage for short edge TTL, preserving max-age for browsers
      const cachedCopy = edgeCache.store.get('http://localhost/badge/installs?recipe=240176');
      expect(cachedCopy).toBeDefined();
      expect(cachedCopy?.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=90');

      // Cache hit: downstream browser still receives the intended long max-age
      const hitResponse = await app.request('/badge/installs?recipe=240176');
      expect(hitResponse.status).toBe(200);
      expect(hitResponse.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=90');
      expect(fetchRecipe).toHaveBeenCalledTimes(1);
    });

    it('should cache error badge responses with short edge TTL via s-maxage', async () => {
      const edgeCache = createInMemoryEdgeCache();
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      // Cache miss: response carries route-level max-age (error policy)
      const response = await app.request('/badge/installs?recipe=999999');
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      await response.text();

      // Edge cache stored copy uses s-maxage for short edge TTL, preserving max-age for browsers
      const cachedResponse = edgeCache.store.get('http://localhost/badge/installs?recipe=999999');
      expect(cachedResponse).toBeDefined();
      expect(cachedResponse?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=30');
    });

    it('should bypass edge cache lookups for non-GET requests', async () => {
      const edgeCache = createInMemoryEdgeCache();

      const response = await app.request('/badge/installs?recipe=240176', { method: 'POST' });

      expect(response.status).toBe(404);
      expect(edgeCache.match).not.toHaveBeenCalled();
      expect(edgeCache.put).not.toHaveBeenCalled();
    });

    it('should not cache non-200 responses', async () => {
      const edgeCache = createInMemoryEdgeCache();

      const response = await app.request('/badge/unknown-route');

      expect(response.status).toBe(404);
      expect(edgeCache.match).toHaveBeenCalledTimes(1);
      expect(edgeCache.put).not.toHaveBeenCalled();
    });

    it('should continue request flow when cache lookup fails', async () => {
      const matchError = new Error('cache lookup failed');
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const put = vi.fn(async () => undefined);
      vi.stubGlobal('caches', {
        default: {
          match: vi.fn(async () => {
            throw matchError;
          }),
          put,
        },
      });

      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/installs?recipe=240176');

      expect(response.status).toBe(200);
      expect(put).toHaveBeenCalledTimes(1);
      expect(warnMock).toHaveBeenCalledWith(
        '[edge-cache] cache lookup failed',
        expect.objectContaining({ pathname: '/badge/installs', error: matchError })
      );
      warnMock.mockRestore();
    });

    it('should keep serving responses when cache write fails', async () => {
      const writeError = new Error('cache write failed');
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.stubGlobal('caches', {
        default: {
          match: vi.fn(async () => undefined),
          put: vi.fn(async () => {
            throw writeError;
          }),
        },
      });

      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/installs?recipe=240176');
      const svg = await response.text();

      expect(response.status).toBe(200);
      expect(svg).toContain('Installs');
      expect(warnMock).toHaveBeenCalledWith(
        '[edge-cache] cache write failed',
        expect.objectContaining({ pathname: '/badge/installs', error: writeError })
      );
      warnMock.mockRestore();
    });

    it('should emit edge-cache metrics logs after enough eligible requests', async () => {
      const edgeCache = createInMemoryEdgeCache();
      const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.mocked(fetchRecipe).mockResolvedValue(mockRecipe);

      for (let i = 0; i < 30; i++) {
        const response = await app.request(`/badge/installs?recipe=240176&label=Load${i}`);
        expect(response.status).toBe(200);
        await response.text();
      }

      expect(edgeCache.match).toHaveBeenCalledTimes(30);
      expect(
        logMock.mock.calls.some((call) => String(call[0]) === '[edge-cache] badge-cache-metrics')
      ).toBe(true);
      logMock.mockRestore();
    });
  });

  describe('GET /badge/installs', () => {
    it('should return error badge when recipe parameter is missing', async () => {
      const response = await app.request('/badge/installs');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Missing recipe or userId');
    });

    it('should return error badge when recipe is not found', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      const response = await app.request('/badge/installs?recipe=999999');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Recipe Not Found');
    });

    it('should return error badge when network error occurs', async () => {
      vi.mocked(fetchRecipe).mockRejectedValueOnce(new Error('Network error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/installs?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      const svg = await response.text();
      expect(svg).toContain('Network Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/installs] Network error fetching recipe:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });

    it('should generate an installs badge with default label', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/installs?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Installs');
      expect(svg).toContain('7');
    });

    it('should support custom label', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/installs?recipe=240176&label=Downloads');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Downloads');
      expect(svg).toContain('7');
    });

    it('should support glyph selection', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/installs?recipe=240176&glyph=white');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Installs');
      expect(svg).toContain('7');
    });

    it('should support pretty formatting for large numbers', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeHighEngagement);

      const response = await app.request('/badge/installs?recipe=999999&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Installs');
      expect(svg).toContain('1.5K');
    });

    it('should format numbers without pretty flag', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeHighEngagement);

      const response = await app.request('/badge/installs?recipe=999999');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Installs');
      expect(svg).toContain('1,500');
    });

    it('should return service error badge for unexpected errors', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock KV that throws unexpected error during counter increment
      const failingKV = {
        get: vi.fn().mockRejectedValue(new Error('KV error')),
        put: vi.fn().mockRejectedValue(new Error('KV error')),
      };
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: failingKV };

      const response = await app.request('/badge/installs?recipe=240176', {}, bindings);

      // Should still return 200 with badge despite KV error
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Installs');
      expect(svg).toContain('7');
      consoleMock.mockRestore();
    });

    it('should handle 0 installs correctly', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeZeroStats);

      const response = await app.request('/badge/installs?recipe=231754');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Installs');
      expect(svg).toContain('0');
      expect(svg).not.toContain('Recipe Not Found');
    });

    // Tests for userId parameter (author badges)
    it('should return error badge when neither recipe nor userId are provided', async () => {
      const response = await app.request('/badge/installs');
      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('Missing recipe or userId');
    });

    it('should return error badge when userId has no recipes', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce({ data: [] });

      const response = await app.request('/badge/installs?userId=9999');
      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('No recipes found');
    });

    it('should generate installs badge with userId parameter', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/installs?userId=29');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Installs');
      // Total installs: 100 + 75 + 50 = 225
      expect(svg).toContain('225');
    });

    it('should support custom label with userId', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/installs?userId=29&label=Total%20Downloads');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Total Downloads');
      expect(svg).toContain('225');
    });

    it('should support pretty formatting with userId', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/installs?userId=29&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Installs');
      // 225 formatted as '225' (under 1000, so no K suffix)
      expect(svg).toContain('225');
    });

    it('should handle null response when fetching user recipes', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(null);

      const response = await app.request('/badge/installs?userId=29');
      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('No recipes found');
    });

    it('should return service error when user recipe fetch throws unexpectedly', async () => {
      vi.mocked(fetchUserRecipes).mockRejectedValueOnce(new Error('Unexpected user fetch error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/installs?userId=29');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Service Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/installs] Unexpected error:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });
  });

  describe('GET /badge/forks', () => {
    it('should return error badge when recipe parameter is missing', async () => {
      const response = await app.request('/badge/forks');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Missing recipe or userId');
    });

    it('should return error badge when recipe is not found', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      const response = await app.request('/badge/forks?recipe=999999');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Recipe Not Found');
    });

    it('should return error badge when network error occurs', async () => {
      vi.mocked(fetchRecipe).mockRejectedValueOnce(new Error('Network error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/forks?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      const svg = await response.text();
      expect(svg).toContain('Network Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/forks] Network error fetching recipe:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });

    it('should generate a forks badge with default label', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/forks?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Forks');
      expect(svg).toContain('5');
    });

    it('should support custom label', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/forks?recipe=240176&label=Branches');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Branches');
      expect(svg).toContain('5');
    });

    it('should support pretty formatting for large numbers', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeHighEngagement);

      const response = await app.request('/badge/forks?recipe=999999&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Forks');
      expect(svg).toContain('250');
    });

    it('should return service error badge for unexpected errors', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock KV that throws unexpected error during counter increment
      const failingKV = {
        get: vi.fn().mockRejectedValue(new Error('KV error')),
        put: vi.fn().mockRejectedValue(new Error('KV error')),
      };
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: failingKV };

      const response = await app.request('/badge/forks?recipe=240176', {}, bindings);

      // Should still return 200 with badge despite KV error
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Forks');
      expect(svg).toContain('5');
      consoleMock.mockRestore();
    });

    it('should handle 0 forks correctly', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeZeroForks);

      const response = await app.request('/badge/forks?recipe=231754');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Forks');
      expect(svg).toContain('0');
      expect(svg).not.toContain('Recipe Not Found');
    });

    // Tests for userId parameter (author badges)
    it('should generate forks badge with userId parameter', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/forks?userId=29');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Forks');
      // Total forks: 50 + 30 + 20 = 100
      expect(svg).toContain('100');
    });

    it('should support pretty formatting for forks with userId', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/forks?userId=29&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Forks');
      expect(svg).toContain('100');
    });

    it('should return error badge when userId has no recipes for forks', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce({ data: [] });

      const response = await app.request('/badge/forks?userId=29');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('No recipes found');
    });

    it('should return service error when user forks fetch throws unexpectedly', async () => {
      vi.mocked(fetchUserRecipes).mockRejectedValueOnce(new Error('Unexpected user fetch error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/forks?userId=29');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Service Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/forks] Unexpected error:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });
  });

  describe('GET /badge/connections', () => {
    it('should return error badge when recipe parameter is missing', async () => {
      const response = await app.request('/badge/connections');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Missing recipe or userId');
    });

    it('should return error badge when recipe is not found', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      const response = await app.request('/badge/connections?recipe=999999');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Recipe Not Found');
    });

    it('should return error badge when network error occurs', async () => {
      vi.mocked(fetchRecipe).mockRejectedValueOnce(new Error('Network error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/connections?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      const svg = await response.text();
      expect(svg).toContain('Network Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/connections] Network error fetching recipe:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });

    it('should generate a connections badge combining installs and forks', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/connections?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Connections');
      // mockRecipe has installs: 7 and forks: 5, total should be 12
      expect(svg).toContain('12');
    });

    it('should support custom label', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/badge/connections?recipe=240176&label=Total Users');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Total Users');
      expect(svg).toContain('12');
    });

    it('should support pretty formatting for large numbers', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeHighEngagement);

      const response = await app.request('/badge/connections?recipe=999999&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Connections');
      // mockRecipeHighEngagement has installs: 1500 and forks: 250, total should be 1750 = 1.75K
      expect(svg).toContain('1.75K');
    });

    it('should return service error badge for unexpected errors', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock KV that throws unexpected error during counter increment
      const failingKV = {
        get: vi.fn().mockRejectedValue(new Error('KV error')),
        put: vi.fn().mockRejectedValue(new Error('KV error')),
      };
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: failingKV };

      const response = await app.request('/badge/connections?recipe=240176', {}, bindings);

      // Should still return 200 with badge despite KV error
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('Connections');
      expect(svg).toContain('12');
      consoleMock.mockRestore();
    });

    it('should handle 0 connections (0 installs and 0 forks)', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipeZeroStats);

      const response = await app.request('/badge/connections?recipe=231754');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Connections');
      expect(svg).toContain('0');
      expect(svg).not.toContain('Recipe Not Found');
    });

    it('should increment counter when /badge/connections is called', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      };
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      // Make a badge request
      await app.request('/badge/connections?recipe=240176', {}, bindings);

      // Check that counter was incremented
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '1');
    });

    // Tests for userId parameter (author badges)
    it('should generate connections badge with userId parameter', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/connections?userId=29');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Connections');
      // Total connections: (100+75+50) + (50+30+20) = 225 + 100 = 325
      expect(svg).toContain('325');
    });

    it('should support pretty formatting for connections with userId', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/connections?userId=29&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Connections');
      expect(svg).toContain('325');
    });

    it('should return error badge when userId has no recipes for connections', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce({ data: [] });

      const response = await app.request('/badge/connections?userId=29');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('No recipes found');
    });

    it('should return service error when user connections fetch throws unexpectedly', async () => {
      vi.mocked(fetchUserRecipes).mockRejectedValueOnce(new Error('Unexpected user fetch error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/connections?userId=29');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Service Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/connections] Unexpected error:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });
  });

  describe('GET /badge/recipes', () => {
    it('should return error badge when userId is missing', async () => {
      const response = await app.request('/badge/recipes');
      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('Missing userId');
    });

    it('should return error badge when userId has no recipes', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce({ data: [] });

      const response = await app.request('/badge/recipes?userId=9999');
      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('No recipes found');
    });

    it('should generate recipes count badge with userId', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/recipes?userId=29');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const svg = await response.text();
      expect(svg).toContain('Recipes');
      expect(svg).toContain('3');
    });

    it('should support custom label for recipes badge', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/recipes?userId=29&label=Total%20Recipes');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Total Recipes');
      expect(svg).toContain('3');
    });

    it('should support pretty formatting for recipes', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/badge/recipes?userId=29&pretty');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Recipes');
      expect(svg).toContain('3');
    });

    it('should handle null response when fetching recipes list', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(null);

      const response = await app.request('/badge/recipes?userId=29');
      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('No recipes found');
    });

    it('should return service error when recipes fetch throws unexpectedly', async () => {
      vi.mocked(fetchUserRecipes).mockRejectedValueOnce(new Error('Unexpected user fetch error'));
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await app.request('/badge/recipes?userId=29');
      expect(response.status).toBe(200);

      const svg = await response.text();
      expect(svg).toContain('Service Error');
      expect(consoleMock).toHaveBeenCalledWith(
        '[badge/recipes] Unexpected error:',
        expect.any(Error)
      );
      consoleMock.mockRestore();
    });
  });

  describe('GET /api/stats', () => {
    it('should return 400 when recipe parameter is missing', async () => {
      const response = await app.request('/api/stats');
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json).toHaveProperty('error', 'Missing required parameter: recipe');
    });

    it('should return 404 when recipe is not found', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      const response = await app.request('/api/stats?recipe=999999');
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json).toHaveProperty('error', 'Recipe not found');
    });

    it('should return JSON stats for a valid recipe', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/api/stats?recipe=240176');
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const json = (await response.json()) as any;
      expect(json).toHaveProperty('id', 240176);
      expect(json).toHaveProperty('name', 'Kung Fu Panda Quotes');
      expect(json).toHaveProperty('published_at');
      expect(json.stats).toEqual({ installs: 7, forks: 5 });
    });

    it('should include author information when available', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const response = await app.request('/api/stats?recipe=240176');
      expect(response.status).toBe(200);

      const json = (await response.json()) as any;
      expect(json.author).toEqual({
        github_url: 'https://github.com/hossain-khan/trmnl-kung-fu-panda-quotes',
        learn_more_url: 'https://hossain-khan.github.io/trmnl-kung-fu-panda-quotes',
      });
    });

    it('should handle missing author information gracefully', async () => {
      const recipeWithoutAuthor = { ...mockRecipe, author_bio: undefined };
      vi.mocked(fetchRecipe).mockResolvedValueOnce(recipeWithoutAuthor);

      const response = await app.request('/api/stats?recipe=240176');
      expect(response.status).toBe(200);

      const json = (await response.json()) as any;
      expect(json.author).toEqual({
        github_url: null,
        learn_more_url: null,
      });
    });
  });

  describe('GET /api/recipes', () => {
    it('should return 400 when user_id parameter is missing', async () => {
      const response = await app.request('/api/recipes');
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json).toHaveProperty('error', 'Missing required parameter: user_id');
    });

    it('should return 404 when no recipes are found for user', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce({ data: [] });

      const response = await app.request('/api/recipes?user_id=9999');
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json).toHaveProperty('error', 'No recipes found for this user');
    });

    it('should return user recipes with cache header for valid user', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(mockUserRecipesResponse);

      const response = await app.request('/api/recipes?user_id=29');
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

      const json = (await response.json()) as any;
      expect(json.data).toHaveLength(3);
      expect(json.data[0].name).toBe('Kung Fu Panda Quotes');
    });

    it('should return 404 when fetchUserRecipes returns null', async () => {
      vi.mocked(fetchUserRecipes).mockResolvedValueOnce(null);

      const response = await app.request('/api/recipes?user_id=29');
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json).toHaveProperty('error', 'No recipes found for this user');
    });
  });

  describe('GET /badge/counter', () => {
    // Helper to create a mock KV namespace
    const createMockKV = (initialData: Record<string, string> = {}) => {
      const data = { ...initialData };
      return {
        get: async (key: string) => data[key] ?? null,
        put: async (key: string, value: string) => {
          data[key] = value;
        },
      } as any;
    };

    it('should return a valid SVG badge', async () => {
      const mockKV = createMockKV();
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');

      const svg = await response.text();
      expect(svg).toContain('Badges Served');
    });

    it('should return count of 0 when counter is not set', async () => {
      const mockKV = createMockKV();
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('0'); // Formatted count should be 0
    });

    it('should display formatted count when counter has a value', async () => {
      const mockKV = createMockKV({ badges_served_total: '1500' });
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('1.5K'); // Pretty formatted number
    });

    it('should set cache header to 1 hour', async () => {
      const mockKV = createMockKV();
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    });

    it('should display large numbers with pretty formatting', async () => {
      const mockKV = createMockKV({ badges_served_total: '12500' });
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('12.5K');
    });

    it('should increment counter when /badge/installs is called', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const mockKV = createMockKV();
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      // Make a badge request
      await app.request('/badge/installs?recipe=240176', {}, bindings);

      // Check that counter was incremented
      const counterValue = await mockKV.get('badges_served_total');
      expect(counterValue).toBe('1');
    });

    it('should increment counter when /badge/forks is called', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      const mockKV = createMockKV();
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      // Make a badge request
      await app.request('/badge/forks?recipe=240176', {}, bindings);

      // Check that counter was incremented
      const counterValue = await mockKV.get('badges_served_total');
      expect(counterValue).toBe('1');
    });

    it('should handle multiple increments correctly', async () => {
      vi.mocked(fetchRecipe).mockResolvedValue(mockRecipe);

      const mockKV = createMockKV();
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      // Make multiple badge requests
      await app.request('/badge/installs?recipe=240176', {}, bindings);
      await app.request('/badge/forks?recipe=240176', {}, bindings);
      await app.request('/badge/installs?recipe=240176', {}, bindings);

      // Check that counter was incremented 3 times
      const counterValue = await mockKV.get('badges_served_total');
      expect(counterValue).toBe('3');
    });

    it('should handle counter KV errors gracefully for installs badge', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Mock KV that throws error
      const failingKV = {
        get: vi.fn().mockRejectedValue(new Error('KV error')),
        put: vi.fn().mockRejectedValue(new Error('KV error')),
      };
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: failingKV };
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Badge should still be returned despite counter error
      const response = await app.request('/badge/installs?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      expect(consoleMock).toHaveBeenCalledWith('Counter error:', expect.any(Error));
      consoleMock.mockRestore();
    });

    it('should handle counter KV errors gracefully for forks badge', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Mock KV that throws error
      const failingKV = {
        get: vi.fn().mockRejectedValue(new Error('KV error')),
        put: vi.fn().mockRejectedValue(new Error('KV error')),
      };
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: failingKV };
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Badge should still be returned despite counter error
      const response = await app.request('/badge/forks?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      expect(consoleMock).toHaveBeenCalledWith('Counter error:', expect.any(Error));
      consoleMock.mockRestore();
    });

    it('should handle invalid counter value (non-numeric string) and reset to 0', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Mock KV with invalid counter value
      const mockKV = {
        get: async () => 'invalid-string',
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await app.request('/badge/installs?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      expect(warnMock).toHaveBeenCalledWith(
        'Invalid counter value: invalid-string, resetting to 0'
      );
      // Should increment from 0 to 1
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '1');
      warnMock.mockRestore();
    });

    it('should handle null counter value and treat as 0', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Mock KV with null counter value
      const mockKV = {
        get: async () => null,
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      const response = await app.request('/badge/forks?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      // Should increment from 0 to 1
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '1');
    });

    it('should handle empty string counter value and reset to 0', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Mock KV with empty string
      const mockKV = {
        get: async () => '',
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      const response = await app.request('/badge/installs?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      // Empty string parses to 0, so should increment to 1
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '1');
    });

    it('should handle Infinity counter value and reset to 0', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Mock KV with string that parses to Infinity
      const mockKV = {
        get: async () => 'Infinity',
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await app.request('/badge/connections?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      expect(warnMock).toHaveBeenCalledWith('Invalid counter value: Infinity, resetting to 0');
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '1');
      warnMock.mockRestore();
    });

    it('should handle counter badge with invalid value and reset', async () => {
      const mockKV = createMockKV({ badges_served_total: 'not-a-number' });
      const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      expect(consoleWarnMock).toHaveBeenCalledWith(
        'Invalid counter value: not-a-number, resetting to 0'
      );
      consoleWarnMock.mockRestore();
    });

    it('should handle negative numbers in counter gracefully', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // Negative numbers are technically valid finite numbers, so they should increment
      const mockKV = {
        get: async () => '-5',
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      const response = await app.request('/badge/installs?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      // -5 + 1 = -4
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '-4');
    });

    it('should handle floating point numbers in counter by truncating with parseInt', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // parseInt truncates the decimal part, so 5.5 becomes 5
      const mockKV = {
        get: async () => '5.5',
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      const response = await app.request('/badge/forks?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      // parseInt('5.5') = 5, so 5 + 1 = 6
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '6');
    });
  });

  describe('Counter edge cases and validation', () => {
    const createMockKV = (initialData: Record<string, string> = {}) => {
      const data = { ...initialData };
      return {
        get: async (key: string) => data[key] ?? null,
        put: async (key: string, value: string) => {
          data[key] = value;
        },
      } as any;
    };

    it('should handle leading/trailing whitespace in counter value', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);

      // parseInt handles whitespace and parses the number
      const mockKV = {
        get: async () => '  100  ',
        put: vi.fn().mockResolvedValue(undefined),
      } as any;
      const bindings = { NODE_ENV: 'production', BADGE_COUNTER: mockKV };

      const response = await app.request('/badge/installs?recipe=240176', {}, bindings);

      expect(response.status).toBe(200);
      // parseInt('  100  ') = 100, so 100 + 1 = 101
      expect(mockKV.put).toHaveBeenCalledWith('badges_served_total', '101');
    });

    it('should handle very large numbers in counter', async () => {
      const mockKV = createMockKV({ badges_served_total: '999999999' });
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('1B'); // 1 billion formatted
    });

    it('should handle NaN in counter value and reset', async () => {
      const mockKV = createMockKV({ badges_served_total: 'NaN' });
      const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      expect(consoleWarnMock).toHaveBeenCalledWith('Invalid counter value: NaN, resetting to 0');
      consoleWarnMock.mockRestore();
    });
  });
});
