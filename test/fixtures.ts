import type { TRMNLRecipe } from '../src/types';

export const mockRecipe: TRMNLRecipe = {
  id: 240176,
  user_id: 29,
  name: 'Kung Fu Panda Quotes',
  published_at: '2026-02-09T07:45:36.616Z',
  stats: {
    installs: 7,
    forks: 5,
  },
  icon_url: 'https://trmnl-public.s3.us-east-2.amazonaws.com/icon.png',
  screenshot_url: 'https://trmnl.s3.us-east-2.amazonaws.com/screenshot.png',
  author_bio: {
    description: 'A test recipe for badges',
    github_url: 'https://github.com/hossain-khan/trmnl-kung-fu-panda-quotes',
    learn_more_url: 'https://hossain-khan.github.io/trmnl-kung-fu-panda-quotes',
    email_address: 'trmnl@hossain.dev',
    category: 'entertainment,humor',
  },
};

export const mockRecipeHighEngagement: TRMNLRecipe = {
  ...mockRecipe,
  id: 999999,
  name: 'Popular Recipe',
  stats: {
    installs: 1500,
    forks: 250,
  },
};

export const mockRecipeZeroStats: TRMNLRecipe = {
  ...mockRecipe,
  id: 231754,
  name: 'New Recipe',
  stats: {
    installs: 0,
    forks: 0,
  },
};

export const mockRecipeZeroForks: TRMNLRecipe = {
  ...mockRecipe,
  id: 231754,
  name: 'Rarely Forked Recipe',
  stats: {
    installs: 42,
    forks: 0,
  },
};
