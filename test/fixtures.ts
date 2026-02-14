import type { GitHubRepository, GitHubRelease } from '../src/types';

export const mockRepository: GitHubRepository = {
  name: 'hono',
  full_name: 'honojs/hono',
  description: 'Fast, lightweight, built on Web Standards. Support for any JavaScript runtime.',
  stargazers_count: 15234,
  forks_count: 892,
  open_issues_count: 45,
  license: {
    key: 'mit',
    name: 'MIT License',
    spdx_id: 'MIT',
  },
  language: 'TypeScript',
  html_url: 'https://github.com/honojs/hono',
};

export const mockRelease: GitHubRelease = {
  tag_name: 'v4.0.0',
  name: 'v4.0.0',
  published_at: '2024-01-15T10:00:00Z',
};

export const mockRepositoryNoLicense: GitHubRepository = {
  ...mockRepository,
  license: null,
};

export const mockRepositoryNoLanguage: GitHubRepository = {
  ...mockRepository,
  language: null,
};
