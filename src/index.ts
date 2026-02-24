import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import { fetchRecipe, fetchUserRecipes } from './trmnl-api';
import { generateBadge } from './badge-generator';
import { formatNumber } from './utils';
import { returnErrorBadge, isRecipeValid, returnSuccessBadge } from './badge-helpers';

// App version - https://github.com/hossain-khan/trmnl-badges/releases
const APP_VERSION = '1.3.0';

// 🎉 Fun tracking feature: KV store key for total badges served counter
const BADGES_SERVED_COUNTER_KEY = 'badges_served_total';

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// Enable CORS for GitHub Pages and other origins
app.use('*', cors({
  origin: ['https://hossain-khan.github.io', 'http://localhost:8787'],
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 600,
}));

/**
 * Helper function to aggregate author statistics from multiple recipes
 */
function aggregateAuthorStats(recipes: any[]) {
  let totalInstalls = 0;
  let totalForks = 0;

  recipes.forEach((recipe) => {
    totalInstalls += recipe.stats?.installs || 0;
    totalForks += recipe.stats?.forks || 0;
  });

  return {
    recipes: recipes.length,
    installs: totalInstalls,
    forks: totalForks,
    connections: totalInstalls + totalForks,
  };
}

/**
 * Helper function to increment badge counter
 */
async function incrementBadgeCounter(context: any) {
  if (context.env && context.env.BADGE_COUNTER) {
    try {
      const current = await context.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
      const count = current ? parseInt(current, 10) : 0;

      if (!Number.isFinite(count)) {
        console.warn(`Invalid counter value: ${current}, resetting to 0`);
      }

      const newCount = (Number.isFinite(count) ? count : 0) + 1;
      await context.env.BADGE_COUNTER.put(BADGES_SERVED_COUNTER_KEY, newCount.toString());
    } catch (err) {
      console.error('Counter error:', err);
    }
  }
}

// Badge endpoints for TRMNL recipes
app.get('/badge/installs', async (context) => {
  try {
    const { recipe, userId, label, pretty } = context.req.query();
    const defaultLabel = 'Installs';
    const isPretty = pretty !== undefined;

    if (recipe) {
      // Single recipe badge
      let recipeData;
      try {
        recipeData = await fetchRecipe(recipe);
      } catch (err) {
        console.error('[badge/installs] Network error fetching recipe:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!isRecipeValid(recipeData, 'installs')) {
        return returnErrorBadge(context, label || defaultLabel, 'Recipe Not Found');
      }

      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(recipeData.stats.installs, isPretty),
      });

      await incrementBadgeCounter(context);
      return returnSuccessBadge(context, badge);
    } else if (userId) {
      // Author badge - combined stats
      let userRecipes;
      try {
        userRecipes = await fetchUserRecipes(userId);
      } catch (err) {
        console.error('[badge/installs] Network error fetching user recipes:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
        return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
      }

      const stats = aggregateAuthorStats(userRecipes.data);
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(stats.installs, isPretty),
      });

      await incrementBadgeCounter(context);
      context.header('Cache-Control', 'public, max-age=3600');
      return returnSuccessBadge(context, badge);
    } else {
      return returnErrorBadge(context, label || defaultLabel, 'Missing recipe or userId');
    }
  } catch (err) {
    console.error('[badge/installs] Unexpected error:', err);
    return returnErrorBadge(context, 'Installs', 'Service Error');
  }
});

app.get('/badge/forks', async (context) => {
  try {
    const { recipe, userId, label, pretty } = context.req.query();
    const defaultLabel = 'Forks';
    const isPretty = pretty !== undefined;

    if (recipe) {
      // Single recipe badge
      let recipeData;
      try {
        recipeData = await fetchRecipe(recipe);
      } catch (err) {
        console.error('[badge/forks] Network error fetching recipe:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!isRecipeValid(recipeData, 'forks')) {
        return returnErrorBadge(context, label || defaultLabel, 'Recipe Not Found');
      }

      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(recipeData.stats.forks, isPretty),
      });

      await incrementBadgeCounter(context);
      return returnSuccessBadge(context, badge);
    } else if (userId) {
      // Author badge - combined stats
      let userRecipes;
      try {
        userRecipes = await fetchUserRecipes(userId);
      } catch (err) {
        console.error('[badge/forks] Network error fetching user recipes:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
        return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
      }

      const stats = aggregateAuthorStats(userRecipes.data);
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(stats.forks, isPretty),
      });

      await incrementBadgeCounter(context);
      context.header('Cache-Control', 'public, max-age=3600');
      return returnSuccessBadge(context, badge);
    } else {
      return returnErrorBadge(context, label || defaultLabel, 'Missing recipe or userId');
    }
  } catch (err) {
    console.error('[badge/forks] Unexpected error:', err);
    return returnErrorBadge(context, 'Forks', 'Service Error');
  }
});

app.get('/badge/recipes', async (context) => {
  try {
    const { userId, label, pretty } = context.req.query();
    const defaultLabel = 'Recipes';
    const isPretty = pretty !== undefined;

    if (!userId) {
      return returnErrorBadge(context, label || defaultLabel, 'Missing userId');
    }

    let userRecipes;
    try {
      userRecipes = await fetchUserRecipes(userId);
    } catch (err) {
      console.error('[badge/recipes] Network error fetching user recipes:', err);
      return returnErrorBadge(context, label || defaultLabel, 'Network Error');
    }

    if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
      return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
    }

    const stats = aggregateAuthorStats(userRecipes.data);
    const badge = generateBadge({
      label: label || defaultLabel,
      message: formatNumber(stats.recipes, isPretty),
    });

    await incrementBadgeCounter(context);
    context.header('Cache-Control', 'public, max-age=3600');
    return returnSuccessBadge(context, badge);
  } catch (err) {
    console.error('[badge/recipes] Unexpected error:', err);
    return returnErrorBadge(context, 'Recipes', 'Service Error');
  }
});

app.get('/badge/connections', async (context) => {
  try {
    const { recipe, userId, label, pretty } = context.req.query();
    const defaultLabel = 'Connections';
    const isPretty = pretty !== undefined;

    if (recipe) {
      // Single recipe badge
      let recipeData;
      try {
        recipeData = await fetchRecipe(recipe);
      } catch (err) {
        console.error('[badge/connections] Network error fetching recipe:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (
        !isRecipeValid(recipeData) ||
        recipeData.stats?.installs === undefined ||
        recipeData.stats?.forks === undefined
      ) {
        return returnErrorBadge(context, label || defaultLabel, 'Recipe Not Found');
      }

      const totalConnections = recipeData.stats.installs + recipeData.stats.forks;
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(totalConnections, isPretty),
      });

      await incrementBadgeCounter(context);
      return returnSuccessBadge(context, badge);
    } else if (userId) {
      // Author badge - combined stats
      let userRecipes;
      try {
        userRecipes = await fetchUserRecipes(userId);
      } catch (err) {
        console.error('[badge/connections] Network error fetching user recipes:', err);
        return returnErrorBadge(context, label || defaultLabel, 'Network Error');
      }

      if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
        return returnErrorBadge(context, label || defaultLabel, 'No recipes found');
      }

      const stats = aggregateAuthorStats(userRecipes.data);
      const badge = generateBadge({
        label: label || defaultLabel,
        message: formatNumber(stats.connections, isPretty),
      });

      await incrementBadgeCounter(context);
      context.header('Cache-Control', 'public, max-age=3600');
      return returnSuccessBadge(context, badge);
    } else {
      return returnErrorBadge(context, label || defaultLabel, 'Missing recipe or userId');
    }
  } catch (err) {
    console.error('[badge/connections] Unexpected error:', err);
    return returnErrorBadge(context, 'Connections', 'Service Error');
  }
});

// API endpoint for TRMNL recipe stats
app.get('/api/stats', async (context) => {
  const { recipe } = context.req.query();

  if (!recipe) {
    return context.json({ error: 'Missing required parameter: recipe' }, 400);
  }

  const recipeData = await fetchRecipe(recipe);

  if (!recipeData) {
    return context.json({ error: 'Recipe not found' }, 404);
  }

  const stats = {
    id: recipeData.id,
    user_id: recipeData.user_id,
    name: recipeData.name,
    published_at: recipeData.published_at,
    stats: {
      installs: recipeData.stats.installs,
      forks: recipeData.stats.forks,
    },
    author: {
      github_url: recipeData.author_bio?.github_url || null,
      learn_more_url: recipeData.author_bio?.learn_more_url || null,
    },
  };

  context.header('Cache-Control', 'public, max-age=3600');
  return context.json(stats);
});

// API endpoint for fetching all recipes for a specific user/author
app.get('/api/recipes', async (context) => {
  const { user_id } = context.req.query();

  if (!user_id) {
    return context.json({ error: 'Missing required parameter: user_id' }, 400);
  }

  const userRecipes = await fetchUserRecipes(user_id);

  if (!userRecipes || !userRecipes.data || userRecipes.data.length === 0) {
    return context.json({ error: 'No recipes found for this user' }, 404);
  }

  context.header('Cache-Control', 'public, max-age=3600');
  return context.json(userRecipes);
});

///////////////////////////////////////////////////////////
// Utility endpoints for status, testing and development
///////////////////////////////////////////////////////////

app.get('/health', (context) => {
  return context.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    projectUrl: 'https://github.com/hossain-khan/trmnl-badges',
  });
});

// Health badge endpoint for shields.io
app.get('/health-badge', (context) => {
  return context.json({
    schemaVersion: 1,
    label: 'TRMNL Badge Service',
    message: 'Online',
    color: 'brightgreen',
  });
});

app.get('/', (context) => {
  if (context.env.NODE_ENV === 'production') {
    return context.redirect('https://github.com/hossain-khan/trmnl-badges');
  } else {
    return context.text('TRMNL Badges API - Development Mode');
  }
});

/**
 * 🎉 Fun tracking feature: Badge showing total badges served
 *
 * NOTE: This counter uses approximate counting due to potential race conditions
 * in KV operations. Multiple concurrent requests may result in lost updates.
 */
app.get('/badge/counter', async (context) => {
  const counterValue = await context.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
  const count = counterValue ? parseInt(counterValue, 10) : 0;

  // Validate that parseInt produced a valid number
  if (!Number.isFinite(count)) {
    console.warn(`Invalid counter value: ${counterValue}, resetting to 0`);
  }

  const validCount = Number.isFinite(count) ? count : 0;

  const badge = generateBadge({
    label: 'Badges Served',
    message: formatNumber(validCount, true),
  });

  return returnSuccessBadge(context, badge);
});

export default app;
