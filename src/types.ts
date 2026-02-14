export interface TRMNLRecipe {
  id: number;
  user_id: number;
  name: string;
  published_at: string;
  stats: {
    installs: number;
    forks: number;
  };
  icon_url?: string;
  screenshot_url?: string;
  author_bio?: {
    description?: string;
    github_url?: string;
    learn_more_url?: string;
    email_address?: string;
    category?: string;
  };
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
}
