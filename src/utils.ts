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

/**
 * Validate GitHub owner and repo names
 */
export function validateGitHubParams(owner: string, repo: string): {
  valid: boolean;
  error?: string;
} {
  // GitHub usernames and repo names must be alphanumeric with hyphens/underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  
  if (!validPattern.test(owner)) {
    return { valid: false, error: 'Invalid owner name' };
  }
  
  if (!validPattern.test(repo)) {
    return { valid: false, error: 'Invalid repository name' };
  }
  
  return { valid: true };
}


