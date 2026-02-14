import type { GitHubRepository, GitHubRelease } from './types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetch repository information from GitHub API
 */
export async function fetchRepository(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepository | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-badges-worker',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching repository:', error);
    return null;
  }
}

/**
 * Fetch the latest release for a repository
 */
export async function fetchLatestRelease(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRelease | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/latest`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-badges-worker',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
}
