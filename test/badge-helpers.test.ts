import { describe, it, expect, vi } from 'vitest';
import { isRecipeValid, returnErrorBadge, returnSuccessBadge } from '../src/badge-helpers';
import { mockRecipe, mockRecipeZeroStats } from './fixtures';
import type { Context } from 'hono';
import type { Bindings } from '../src/types';

describe('badge-helpers', () => {
  describe('isRecipeValid', () => {
    it('should return true for valid recipe data without statKey', () => {
      const result = isRecipeValid(mockRecipe);
      expect(result).toBe(true);
    });

    it('should return false for null recipe data', () => {
      const result = isRecipeValid(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined recipe data', () => {
      const result = isRecipeValid(undefined);
      expect(result).toBe(false);
    });

    it('should return true when statKey is "installs" and the stat exists', () => {
      const result = isRecipeValid(mockRecipe, 'installs');
      expect(result).toBe(true);
    });

    it('should return true when statKey is "forks" and the stat exists', () => {
      const result = isRecipeValid(mockRecipe, 'forks');
      expect(result).toBe(true);
    });

    it('should return true when statKey is "installs" and value is 0', () => {
      const result = isRecipeValid(mockRecipeZeroStats, 'installs');
      expect(result).toBe(true);
    });

    it('should return false when statKey is specified but stat is undefined', () => {
      const recipeWithoutInstalls = {
        ...mockRecipe,
        stats: { forks: 5 } as any, // Cast to bypass type checking
      };
      const result = isRecipeValid(recipeWithoutInstalls, 'installs');
      expect(result).toBe(false);
    });

    it('should return false when statKey is specified but stats object is undefined', () => {
      const recipeWithoutStats = {
        ...mockRecipe,
        stats: undefined as any, // Cast to bypass type checking
      };
      const result = isRecipeValid(recipeWithoutStats, 'installs');
      expect(result).toBe(false);
    });

    it('should return false for null when statKey is specified', () => {
      const result = isRecipeValid(null, 'installs');
      expect(result).toBe(false);
    });

    it('should return false for undefined when statKey is specified', () => {
      const result = isRecipeValid(undefined, 'forks');
      expect(result).toBe(false);
    });
  });

  describe('returnErrorBadge', () => {
    it('should set correct headers for error badge', () => {
      const mockContext = {
        header: vi.fn(),
        body: vi.fn().mockReturnValue({ status: 200 }),
      } as unknown as Context<{ Bindings: Bindings }>;

      returnErrorBadge(mockContext, 'Test Label', 'Test Message');

      expect(mockContext.header).toHaveBeenCalledWith('Content-Type', 'image/svg+xml');
      expect(mockContext.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60');
    });

    it('should use custom cache time when provided', () => {
      const mockContext = {
        header: vi.fn(),
        body: vi.fn().mockReturnValue({ status: 200 }),
      } as unknown as Context<{ Bindings: Bindings }>;

      returnErrorBadge(mockContext, 'Test Label', 'Test Message', 300);

      expect(mockContext.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
    });

    it('should call body with error badge SVG', () => {
      const mockContext = {
        header: vi.fn(),
        body: vi.fn().mockReturnValue({ status: 200 }),
      } as unknown as Context<{ Bindings: Bindings }>;

      returnErrorBadge(mockContext, 'Test Label', 'Test Message');

      expect(mockContext.body).toHaveBeenCalled();
      const badgeSVG = (mockContext.body as any).mock.calls[0][0];
      expect(typeof badgeSVG).toBe('string');
      expect(badgeSVG).toContain('svg');
    });
  });

  describe('returnSuccessBadge', () => {
    it('should set correct headers for success badge', () => {
      const mockContext = {
        header: vi.fn(),
        body: vi.fn().mockReturnValue({ status: 200 }),
      } as unknown as Context<{ Bindings: Bindings }>;

      const mockBadge = '<svg>test</svg>';
      returnSuccessBadge(mockContext, mockBadge);

      expect(mockContext.header).toHaveBeenCalledWith('Content-Type', 'image/svg+xml');
      expect(mockContext.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    });

    it('should call body with the provided badge SVG', () => {
      const mockContext = {
        header: vi.fn(),
        body: vi.fn().mockReturnValue({ status: 200 }),
      } as unknown as Context<{ Bindings: Bindings }>;

      const mockBadge = '<svg>test badge</svg>';
      returnSuccessBadge(mockContext, mockBadge);

      expect(mockContext.body).toHaveBeenCalledWith(mockBadge);
    });

    it('should always use 1 hour cache time', () => {
      const mockContext = {
        header: vi.fn(),
        body: vi.fn().mockReturnValue({ status: 200 }),
      } as unknown as Context<{ Bindings: Bindings }>;

      returnSuccessBadge(mockContext, '<svg></svg>');

      // Cache time should always be 3600 (1 hour) for success responses
      expect(mockContext.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    });
  });
});
