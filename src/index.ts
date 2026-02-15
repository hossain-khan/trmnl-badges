import { Hono } from 'hono';
import type { Bindings } from './types';
import { fetchRecipe } from './trmnl-api';
import { generateBadge, generateErrorBadge } from './badge-generator';
import { formatNumber } from './utils';

// 🎉 Fun tracking feature: KV store key for total badges served counter
const BADGES_SERVED_COUNTER_KEY = 'badges_served_total';

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// Badge endpoints for TRMNL recipes
app.get('/badge/installs', async (c) => {
  try {
    const { recipe, label, pretty } = c.req.query();

    if (!recipe) {
      const errorBadge = generateErrorBadge(label || 'Installs', 'Missing recipe ID');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    let recipeData;
    try {
      recipeData = await fetchRecipe(recipe);
    } catch (err) {
      console.error('[installs] Network error fetching recipe:', err);
      const errorBadge = generateErrorBadge(label || 'Installs', 'Network Error');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    if (!recipeData) {
      const errorBadge = generateErrorBadge(label || 'Installs', 'Recipe Not Found');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    if (recipeData.stats?.installs === undefined) {
      const errorBadge = generateErrorBadge(label || 'Installs', 'Recipe Not Found');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    const isPretty = pretty !== undefined;
    const badge = generateBadge({
      label: label || 'Installs',
      message: formatNumber(recipeData.stats.installs, isPretty),
    });

    // 🎉 Fun tracking feature: Increment counter
    // Await the counter update synchronously to ensure it completes
    if (c.env && c.env.BADGE_COUNTER) {
      try {
        const current = await c.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
        const count = current ? parseInt(current, 10) : 0;

        // Validate that parseInt produced a valid number
        if (!Number.isFinite(count)) {
          console.warn(`Invalid counter value: ${current}, resetting to 0`);
        }

        const newCount = (Number.isFinite(count) ? count : 0) + 1;
        await c.env.BADGE_COUNTER.put(BADGES_SERVED_COUNTER_KEY, newCount.toString());
      } catch (err) {
        console.error('[installs] Counter error:', err);
      }
    }

    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(badge);
  } catch (err) {
    console.error('[installs] Unexpected error:', err);
    const errorBadge = generateErrorBadge('Installs', 'Service Error');
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=60');
    return c.body(errorBadge);
  }
});

app.get('/badge/forks', async (c) => {
  try {
    const { recipe, label, pretty } = c.req.query();

    if (!recipe) {
      const errorBadge = generateErrorBadge(label || 'Forks', 'Missing recipe ID');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    let recipeData;
    try {
      recipeData = await fetchRecipe(recipe);
    } catch (err) {
      console.error('[forks] Network error fetching recipe:', err);
      const errorBadge = generateErrorBadge(label || 'Forks', 'Network Error');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    if (!recipeData) {
      const errorBadge = generateErrorBadge(label || 'Forks', 'Recipe Not Found');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    if (recipeData.stats?.forks === undefined) {
      const errorBadge = generateErrorBadge(label || 'Forks', 'Recipe Not Found');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    const isPretty = pretty !== undefined;
    const badge = generateBadge({
      label: label || 'Forks',
      message: formatNumber(recipeData.stats.forks, isPretty),
    });

    // 🎉 Fun tracking feature: Increment counter
    // Await the counter update synchronously to ensure it completes
    if (c.env && c.env.BADGE_COUNTER) {
      try {
        const current = await c.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
        const count = current ? parseInt(current, 10) : 0;

        // Validate that parseInt produced a valid number
        if (!Number.isFinite(count)) {
          console.warn(`Invalid counter value: ${current}, resetting to 0`);
        }

        const newCount = (Number.isFinite(count) ? count : 0) + 1;
        await c.env.BADGE_COUNTER.put(BADGES_SERVED_COUNTER_KEY, newCount.toString());
      } catch (err) {
        console.error('[forks] Counter error:', err);
      }
    }

    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(badge);
  } catch (err) {
    console.error('[forks] Unexpected error:', err);
    const errorBadge = generateErrorBadge('Forks', 'Service Error');
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=60');
    return c.body(errorBadge);
  }
});

app.get('/badge/connections', async (c) => {
  try {
    const { recipe, label, pretty } = c.req.query();

    if (!recipe) {
      const errorBadge = generateErrorBadge(label || 'Connections', 'Missing recipe ID');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    let recipeData;
    try {
      recipeData = await fetchRecipe(recipe);
    } catch (err) {
      console.error('[connections] Network error fetching recipe:', err);
      const errorBadge = generateErrorBadge(label || 'Connections', 'Network Error');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    if (!recipeData) {
      const errorBadge = generateErrorBadge(label || 'Connections', 'Recipe Not Found');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    if (recipeData.stats?.installs === undefined || recipeData.stats?.forks === undefined) {
      const errorBadge = generateErrorBadge(label || 'Connections', 'Recipe Not Found');
      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=60');
      return c.body(errorBadge);
    }

    const isPretty = pretty !== undefined;
    const totalConnections = recipeData.stats.installs + recipeData.stats.forks;
    const badge = generateBadge({
      label: label || 'Connections',
      message: formatNumber(totalConnections, isPretty),
    });

    // 🎉 Fun tracking feature: Increment counter
    // Await the counter update synchronously to ensure it completes
    if (c.env && c.env.BADGE_COUNTER) {
      try {
        const current = await c.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
        const count = current ? parseInt(current, 10) : 0;

        // Validate that parseInt produced a valid number
        if (!Number.isFinite(count)) {
          console.warn(`Invalid counter value: ${current}, resetting to 0`);
        }

        const newCount = (Number.isFinite(count) ? count : 0) + 1;
        await c.env.BADGE_COUNTER.put(BADGES_SERVED_COUNTER_KEY, newCount.toString());
      } catch (err) {
        console.error('[connections] Counter error:', err);
      }
    }

    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(badge);
  } catch (err) {
    console.error('[connections] Unexpected error:', err);
    const errorBadge = generateErrorBadge('Connections', 'Service Error');
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=60');
    return c.body(errorBadge);
  }
});

// API endpoint for TRMNL recipe stats
app.get('/api/stats', async (c) => {
  const { recipe } = c.req.query();

  if (!recipe) {
    return c.json({ error: 'Missing required parameter: recipe' }, 400);
  }

  const recipeData = await fetchRecipe(recipe);

  if (!recipeData) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  const stats = {
    id: recipeData.id,
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

  c.header('Cache-Control', 'public, max-age=3600');
  return c.json(stats);
});

///////////////////////////////////////////////////////////
// Utility endpoints for status, testing and development
///////////////////////////////////////////////////////////

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    projectUrl: 'https://github.com/hossain-khan/trmnl-badges',
  });
});

// Health badge endpoint for shields.io
app.get('/health-badge', (c) => {
  return c.json({
    schemaVersion: 1,
    label: 'TRMNL Badge Service',
    message: 'Online',
    color: 'brightgreen',
  });
});

app.get('/', (c) => {
  if (c.env.NODE_ENV === 'production') {
    return c.redirect('https://github.com/hossain-khan/trmnl-badges');
  } else {
    return c.text('TRMNL Badges API - Development Mode');
  }
});

/**
 * 🎉 Fun tracking feature: Badge showing total badges served
 *
 * NOTE: This counter uses approximate counting due to potential race conditions
 * in KV operations. Multiple concurrent requests may result in lost updates.
 */
app.get('/badge/counter', async (c) => {
  const counterValue = await c.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
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

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  return c.body(badge);
});

export default app;
