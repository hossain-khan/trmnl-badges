import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatNumber,
  compactNumberFormatter,
  aggregateAuthorStats,
  isValidUserId,
  parseScale,
  BADGE_SCALE_DEFAULT,
  BADGE_SCALE_MAX,
  incrementBadgeCounter,
} from '../src/utils';
import type { TRMNLRecipe } from '../src/types';
import { mockRecipe, mockRecipeZeroStats } from './fixtures';

describe('Utils', () => {
  describe('formatNumber', () => {
    describe('without pretty formatting', () => {
      it('should format small numbers with locale separation', () => {
        expect(formatNumber(0)).toBe('0');
      });

      it('should format single digit numbers', () => {
        expect(formatNumber(5)).toBe('5');
      });

      it('should format two digit numbers', () => {
        expect(formatNumber(42)).toBe('42');
      });

      it('should format three digit numbers', () => {
        expect(formatNumber(100)).toBe('100');
      });

      it('should add locale separator for thousands', () => {
        expect(formatNumber(1000)).toBe('1,000');
      });

      it('should add locale separator for millions', () => {
        expect(formatNumber(1000000)).toBe('1,000,000');
      });

      it('should add locale separator for large numbers', () => {
        expect(formatNumber(1500)).toBe('1,500');
      });

      it('should add locale separator for larger numbers', () => {
        expect(formatNumber(250000)).toBe('250,000');
      });
    });

    describe('with pretty formatting enabled', () => {
      it('should format small numbers as-is', () => {
        expect(formatNumber(5, true)).toBe('5');
      });

      it('should format 999 without compact notation', () => {
        expect(formatNumber(999, true)).toBe('999');
      });

      it('should format 1000 as 1K', () => {
        expect(formatNumber(1000, true)).toBe('1K');
      });

      it('should format 1500 as 1.5K', () => {
        expect(formatNumber(1500, true)).toBe('1.5K');
      });

      it('should format 7000 as 7K', () => {
        expect(formatNumber(7000, true)).toBe('7K');
      });

      it('should format 1000000 as 1M', () => {
        expect(formatNumber(1000000, true)).toBe('1M');
      });

      it('should format 1500000 as 1.5M', () => {
        expect(formatNumber(1500000, true)).toBe('1.5M');
      });

      it('should format 1000000000 as 1B', () => {
        expect(formatNumber(1000000000, true)).toBe('1B');
      });

      it('should format 250 as 250 (below 1K threshold)', () => {
        expect(formatNumber(250, true)).toBe('250');
      });
    });

    describe('compactNumberFormatter', () => {
      it('should use compact notation with short display', () => {
        // Verify it's configured correctly by testing through the formatter
        const result = compactNumberFormatter.format(1500);
        expect(result).toBe('1.5K');
      });

      it('should have proper significant digits', () => {
        // Test that significant digits are limited to 3
        const result = compactNumberFormatter.format(1500000);
        expect(result).toBe('1.5M');
      });
    });
  });

  describe('aggregateAuthorStats', () => {
    it('should return zeros for an empty recipe array', () => {
      const result = aggregateAuthorStats([]);
      expect(result).toEqual({ recipes: 0, installs: 0, forks: 0, connections: 0 });
    });

    it('should aggregate stats from a single recipe', () => {
      const result = aggregateAuthorStats([mockRecipe]);
      expect(result).toEqual({ recipes: 1, installs: 7, forks: 5, connections: 12 });
    });

    it('should aggregate stats from multiple recipes', () => {
      const recipes: TRMNLRecipe[] = [
        { ...mockRecipe, stats: { installs: 100, forks: 50 } },
        { ...mockRecipe, stats: { installs: 75, forks: 30 } },
        { ...mockRecipe, stats: { installs: 50, forks: 20 } },
      ];
      const result = aggregateAuthorStats(recipes);
      expect(result).toEqual({ recipes: 3, installs: 225, forks: 100, connections: 325 });
    });

    it('should handle recipes with zero stats', () => {
      const result = aggregateAuthorStats([mockRecipeZeroStats]);
      expect(result).toEqual({ recipes: 1, installs: 0, forks: 0, connections: 0 });
    });

    it('should handle recipes with undefined stats gracefully', () => {
      const recipeNoStats = { ...mockRecipe, stats: undefined } as any;
      const result = aggregateAuthorStats([recipeNoStats]);
      expect(result).toEqual({ recipes: 1, installs: 0, forks: 0, connections: 0 });
    });

    it('should handle recipes with partial stats (missing forks)', () => {
      const recipePartial = { ...mockRecipe, stats: { installs: 10 } } as any;
      const result = aggregateAuthorStats([recipePartial]);
      expect(result).toEqual({ recipes: 1, installs: 10, forks: 0, connections: 10 });
    });

    it('should handle recipes with partial stats (missing installs)', () => {
      const recipePartial = { ...mockRecipe, stats: { forks: 5 } } as any;
      const result = aggregateAuthorStats([recipePartial]);
      expect(result).toEqual({ recipes: 1, installs: 0, forks: 5, connections: 5 });
    });
  });

  describe('isValidUserId', () => {
    it('should return true for a valid string userId', () => {
      expect(isValidUserId('29')).toBe(true);
    });

    it('should return true for a non-numeric string', () => {
      expect(isValidUserId('abc')).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(isValidUserId(undefined)).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(isValidUserId('')).toBe(false);
    });

    it('should return false for a whitespace-only string', () => {
      expect(isValidUserId('   ')).toBe(false);
    });

    it('should return false for an array of strings', () => {
      expect(isValidUserId(['29', '30'] as any)).toBe(false);
    });
  });

  describe('parseScale', () => {
    it('should return the value for a valid positive integer string', () => {
      expect(parseScale('2')).toBe(2);
    });

    it('should return the value for a valid positive decimal string', () => {
      expect(parseScale('1.5')).toBe(1.5);
    });

    it('should return the value for a fractional scale like 1.2', () => {
      expect(parseScale('1.2')).toBe(1.2);
    });

    it('should return the value for a larger scale like 3.5', () => {
      expect(parseScale('3.5')).toBe(3.5);
    });

    it('should return undefined for undefined input', () => {
      expect(parseScale(undefined)).toBeUndefined();
    });

    it('should return undefined for an empty string', () => {
      expect(parseScale('')).toBeUndefined();
    });

    it('should return undefined for a non-numeric string', () => {
      expect(parseScale('abc')).toBeUndefined();
    });

    it('should return undefined for zero', () => {
      expect(parseScale('0')).toBeUndefined();
    });

    it('should return undefined for a negative number', () => {
      expect(parseScale('-1')).toBeUndefined();
    });

    it('should return undefined for a negative decimal', () => {
      expect(parseScale('-0.5')).toBeUndefined();
    });

    it('should return undefined for Infinity', () => {
      expect(parseScale('Infinity')).toBeUndefined();
    });

    it('should return undefined for NaN string', () => {
      expect(parseScale('NaN')).toBeUndefined();
    });

    it('should return 5 for a value exactly at the max', () => {
      expect(parseScale('5')).toBe(BADGE_SCALE_MAX);
    });

    it('should cap a value exceeding max to BADGE_SCALE_MAX', () => {
      expect(parseScale('6')).toBe(BADGE_SCALE_MAX);
    });

    it('should cap a large value to BADGE_SCALE_MAX', () => {
      expect(parseScale('100')).toBe(BADGE_SCALE_MAX);
    });

    it('should return BADGE_SCALE_DEFAULT as 1', () => {
      expect(BADGE_SCALE_DEFAULT).toBe(1);
    });

    it('should return BADGE_SCALE_MAX as 5', () => {
      expect(BADGE_SCALE_MAX).toBe(5);
    });
  });

  describe('incrementBadgeCounter', () => {
    const makeContext = (kv: any) => ({ env: { BADGE_COUNTER: kv } }) as any;

    // Ensure real timers are restored after every test even if the test throws
    afterEach(() => vi.useRealTimers());

    it('should increment the counter successfully', async () => {
      const kv = { get: vi.fn().mockResolvedValue('5'), put: vi.fn().mockResolvedValue(undefined) };
      await incrementBadgeCounter(makeContext(kv), 'key');
      expect(kv.put).toHaveBeenCalledWith('key', '6');
    });

    it('should do nothing when BADGE_COUNTER binding is absent', async () => {
      // No error should be thrown
      await expect(incrementBadgeCounter({ env: {} } as any, 'key')).resolves.toBeUndefined();
    });

    it('should log error and not throw for non-429 KV errors', async () => {
      const kv = {
        get: vi.fn().mockRejectedValue(new Error('KV internal error')),
        put: vi.fn(),
      };
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
      await incrementBadgeCounter(makeContext(kv), 'key');
      expect(consoleMock).toHaveBeenCalledWith('Counter error:', expect.any(Error));
      consoleMock.mockRestore();
    });

    it('should retry on 429 error and succeed on second attempt', async () => {
      vi.useFakeTimers();
      const kv = {
        get: vi.fn().mockResolvedValue('10'),
        put: vi
          .fn()
          .mockRejectedValueOnce(new Error('KV PUT failed: 429 Too Many Requests'))
          .mockResolvedValue(undefined),
      };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = incrementBadgeCounter(makeContext(kv), 'key');
      await vi.runAllTimersAsync();
      await promise;

      expect(kv.put).toHaveBeenCalledTimes(2);
      expect(kv.put).toHaveBeenLastCalledWith('key', '11');
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringMatching(/KV rate limited \(429\), retrying/)
      );
      warnMock.mockRestore();
    });

    it('should retry up to max attempts and then log error when all attempts fail with 429', async () => {
      vi.useFakeTimers();
      const error = new Error('KV PUT failed: 429 Too Many Requests');
      const kv = {
        get: vi.fn().mockResolvedValue('0'),
        put: vi.fn().mockRejectedValue(error),
      };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      const promise = incrementBadgeCounter(makeContext(kv), 'key');
      await vi.runAllTimersAsync();
      await promise;

      // 3 total attempts (KV_MAX_ATTEMPTS = 3), 2 warn retries then 1 final error
      expect(kv.put).toHaveBeenCalledTimes(3);
      expect(warnMock).toHaveBeenCalledTimes(2);
      expect(errorMock).toHaveBeenCalledWith('Counter error:', error);
      warnMock.mockRestore();
      errorMock.mockRestore();
    });

    it('should not retry on non-429 errors', async () => {
      const kv = {
        get: vi.fn().mockResolvedValue('0'),
        put: vi.fn().mockRejectedValue(new Error('KV internal error')),
      };
      const errorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      await incrementBadgeCounter(makeContext(kv), 'key');

      expect(kv.put).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalledWith('Counter error:', expect.any(Error));
      errorMock.mockRestore();
    });

    it('should retry on 429 from GET and succeed on second attempt', async () => {
      vi.useFakeTimers();
      const kv = {
        get: vi
          .fn()
          .mockRejectedValueOnce(new Error('KV GET failed: 429 Too Many Requests'))
          .mockResolvedValue('3'),
        put: vi.fn().mockResolvedValue(undefined),
      };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = incrementBadgeCounter(makeContext(kv), 'key');
      await vi.runAllTimersAsync();
      await promise;

      expect(kv.put).toHaveBeenCalledWith('key', '4');
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringMatching(/KV rate limited \(429\), retrying/)
      );
      warnMock.mockRestore();
    });
    it('should not retry on errors containing "429" as part of a larger number (false positive guard)', async () => {
      // Error message "1429" or "4290" should NOT be treated as a 429 rate limit error
      const kv = {
        get: vi.fn().mockResolvedValue('0'),
        put: vi.fn().mockRejectedValue(new Error('Error code 1429: something else')),
      };
      const errorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

      await incrementBadgeCounter(makeContext(kv), 'key');

      // Should fail immediately without retry (only 1 put attempt)
      expect(kv.put).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalledWith('Counter error:', expect.any(Error));
      errorMock.mockRestore();
    });

    it('should retry on errors matching "too many requests" phrase (case-insensitive)', async () => {
      vi.useFakeTimers();
      const kv = {
        get: vi.fn().mockResolvedValue('2'),
        put: vi
          .fn()
          .mockRejectedValueOnce(new Error('KV PUT failed: Too Many Requests'))
          .mockResolvedValue(undefined),
      };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = incrementBadgeCounter(makeContext(kv), 'key');
      await vi.runAllTimersAsync();
      await promise;

      expect(kv.put).toHaveBeenCalledTimes(2);
      expect(kv.put).toHaveBeenLastCalledWith('key', '3');
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringMatching(/KV rate limited \(429\), retrying/)
      );
      warnMock.mockRestore();
    });

    it('should retry on errors with a structured numeric status field of 429', async () => {
      vi.useFakeTimers();
      const rateLimitError = Object.assign(new Error('rate limited'), { status: 429 });
      const kv = {
        get: vi.fn().mockResolvedValue('7'),
        put: vi.fn().mockRejectedValueOnce(rateLimitError).mockResolvedValue(undefined),
      };
      const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = incrementBadgeCounter(makeContext(kv), 'key');
      await vi.runAllTimersAsync();
      await promise;

      expect(kv.put).toHaveBeenCalledTimes(2);
      expect(kv.put).toHaveBeenLastCalledWith('key', '8');
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringMatching(/KV rate limited \(429\), retrying/)
      );
      warnMock.mockRestore();
    });
  });
});
