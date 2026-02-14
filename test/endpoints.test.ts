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
      
      const json = await response.json();
      expect(json).toHaveProperty('status', 'ok');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('projectUrl', 'https://github.com/hossain-khan/trmnl-badges');
      
      // Verify timestamp is a valid ISO string
      expect(() => new Date(json.timestamp)).not.toThrow();
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
      
      const json = await response.json();
      expect(json).toHaveProperty('id', 240176);
      expect(json).toHaveProperty('name', 'Kung Fu Panda Quotes');
      expect(json).toHaveProperty('published_at');
      expect(json.stats).toEqual({ installs: 7, forks: 5 });
    });

    it('should include author information when available', async () => {
      vi.mocked(fetchRecipe).mockResolvedValueOnce(mockRecipe);
      
      const response = await app.request('/api/stats?recipe=240176');
      expect(response.status).toBe(200);
      
      const json = await response.json();
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
      
      const json = await response.json();
      expect(json.author).toEqual({
        github_url: null,
        learn_more_url: null,
      });
    });
  });
});
