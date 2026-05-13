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

// Mock user recipes for author badge testing (single page, no pagination)
export const mockUserRecipesResponse = {
  data: [
    {
      id: 240176,
      user_id: 29,
      name: 'Kung Fu Panda Quotes',
      published_at: '2026-02-09T07:45:36.616Z',
      stats: {
        installs: 100,
        forks: 50,
      },
    },
    {
      id: 240177,
      user_id: 29,
      name: 'Test Recipe 2',
      published_at: '2026-02-09T07:45:36.616Z',
      stats: {
        installs: 75,
        forks: 30,
      },
    },
    {
      id: 240178,
      user_id: 29,
      name: 'Test Recipe 3',
      published_at: '2026-02-09T07:45:36.616Z',
      stats: {
        installs: 50,
        forks: 20,
      },
    },
  ],
  total: 3,
  from: 1,
  to: 3,
  per_page: 100,
  current_page: 1,
  prev_page_url: null,
  next_page_url: null,
};

// Mock page 1 of a paginated user recipes response (simulates user with >100 recipes)
export const mockUserRecipesPage1 = {
  data: Array.from({ length: 100 }, (_, i) => ({
    id: 300000 + i,
    user_id: 6458,
    name: `Recipe ${i + 1}`,
    published_at: '2026-01-01T00:00:00.000Z',
    stats: {
      installs: 10,
      forks: 2,
    },
  })),
  total: 130,
  from: 1,
  to: 100,
  per_page: 100,
  current_page: 1,
  prev_page_url: null,
  next_page_url: 'https://trmnl.com/recipes.json?page=2&per_page=100&user_id=6458',
};

// Mock page 2 of a paginated user recipes response
export const mockUserRecipesPage2 = {
  data: Array.from({ length: 30 }, (_, i) => ({
    id: 400000 + i,
    user_id: 6458,
    name: `Recipe ${i + 101}`,
    published_at: '2026-01-01T00:00:00.000Z',
    stats: {
      installs: 5,
      forks: 1,
    },
  })),
  total: 130,
  from: 101,
  to: 130,
  per_page: 100,
  current_page: 2,
  prev_page_url: 'https://trmnl.com/recipes.json?page=1&per_page=100&user_id=6458',
  next_page_url: null,
};
