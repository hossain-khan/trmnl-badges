import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import { mockRecipe, mockRecipeHighEngagement } from './fixtures';

// Mock the fetchRecipe function
vi.mock('../src/trmnl-api', () => ({
  fetchRecipe: vi.fn(),
}));

import { fetchRecipe } from '../src/trmnl-api';

describe('TRMNL Badges API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('GET /badge/installs', () => {
    it('should return 400 when recipe parameter is missing', async () => {
      const response = await app.request('/badge/installs');
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing required parameter: recipe');
    });

    it('should return 404 when recipe is not found', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      const response = await app.request('/badge/installs?recipe=999999');
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Recipe not found');
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
  });

  describe('GET /badge/forks', () => {
    it('should return 400 when recipe parameter is missing', async () => {
      const response = await app.request('/badge/forks');
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing required parameter: recipe');
    });

    it('should return 404 when recipe is not found', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(null);

      const response = await app.request('/badge/forks?recipe=999999');
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Recipe not found');
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

    it('should use blueviolet color', async () => {
      const mockKV = createMockKV();
      const response = await app.request(
        '/badge/counter',
        {},
        { NODE_ENV: 'production', BADGE_COUNTER: mockKV }
      );

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('blueviolet');
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
  });
});
