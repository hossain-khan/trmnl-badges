/**
 * Compact number formatter (e.g., 1234 -> 1.2K)
 */
export const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumSignificantDigits: 3,
});

/**
 * Format a number with optional pretty formatting
 */
export function formatNumber(value: number, pretty: boolean = false): string {
  if (pretty) {
    return compactNumberFormatter.format(value);
  }
  return value.toLocaleString('en-US');
}
