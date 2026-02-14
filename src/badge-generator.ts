import { badgen } from 'badgen';
import type { BadgeOptions } from './types';

// https://simpleicons.org/icons/github.svg
const githubLogo = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;

// Base64 encode for data URI (Cloudflare Workers compatible)
function base64Encode(str: string): string {
  // Cloudflare Workers supports btoa globally
  return btoa(str);
}

const githubLogoDataUri = 'data:image/svg+xml;base64,' + base64Encode(githubLogo);

/**
 * Generate a GitHub-themed badge using badgen
 */
export function generateBadge(options: BadgeOptions): string {
  const {
    label,
    message,
    color = '2ea44f',
    labelColor = '24292e',
    logo
  } = options;

  return badgen({
    label,
    status: message,
    color,
    labelColor,
    icon: logo || githubLogoDataUri,
  });
}

/**
 * Get color based on count thresholds
 */
export function getColorForCount(count: number): string {
  if (count >= 1000) return '2ea44f'; // Green
  if (count >= 100) return '58a6ff'; // Blue
  if (count >= 10) return 'f59e0b'; // Yellow
  return '8b949e'; // Gray
}

/**
 * Get color for open issues (red scale)
 */
export function getIssuesColor(count: number): string {
  if (count >= 100) return 'dc2626'; // Dark red
  if (count >= 50) return 'ef4444'; // Red
  if (count >= 10) return 'f59e0b'; // Orange
  return '2ea44f'; // Green (few issues is good)
}
