export interface GitHubRepository {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  language: string | null;
  html_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
}

export interface BadgeOptions {
  label: string;
  message: string;
  color?: string;
  labelColor?: string;
  logo?: string;
}

export type Bindings = {
  NODE_ENV: string;
  GITHUB_TOKEN?: string;
}
