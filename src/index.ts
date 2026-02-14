import { Hono } from 'hono';
import type { Bindings } from './types';
import { fetchRecipe } from './trmnl-api';
import { generateBadge, getColorForCount } from './badge-generator';
import { formatNumber } from './utils';

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

app.get('/', (c) => {
  if (c.env.NODE_ENV === 'production') {
    return c.redirect('https://github.com/hossain-khan/trmnl-badges');
  } else {
    return c.text('TRMNL Badges API - Development Mode');
  }
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Badge endpoints for TRMNL recipes
app.get('/badge/installs', async (c) => {
  const { recipe, label, pretty } = c.req.query();
  
  if (!recipe) {
    return c.text('Missing required parameter: recipe', 400);
  }

  const recipeData = await fetchRecipe(recipe);
  
  if (!recipeData) {
    return c.text('Recipe not found', 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || 'Installs',
    message: formatNumber(recipeData.stats.installs, isPretty),
    color: getColorForCount(recipeData.stats.installs),
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

app.get('/badge/forks', async (c) => {
  const { recipe, label, pretty } = c.req.query();
  
  if (!recipe) {
    return c.text('Missing required parameter: recipe', 400);
  }

  const recipeData = await fetchRecipe(recipe);
  
  if (!recipeData) {
    return c.text('Recipe not found', 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || 'Forks',
    message: formatNumber(recipeData.stats.forks, isPretty),
    color: getColorForCount(recipeData.stats.forks),
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
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

export default app;
