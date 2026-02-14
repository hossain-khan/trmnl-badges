import { Hono } from 'hono';
import type { Bindings } from './types';
import { fetchRepository, fetchLatestRelease } from './github-api';
import { generateBadge, getColorForCount, getIssuesColor } from './badge-generator';
import { formatNumber, validateGitHubParams } from './utils';

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

// Badge endpoints - to be implemented
app.get('/badge/stars', async (c) => {
  const { owner, repo, label, pretty } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.text(validation.error || 'Invalid parameters', 400);
  }

  const repository = await fetchRepository(owner, repo, c.env.GITHUB_TOKEN);
  
  if (!repository) {
    return c.text('Repository not found', 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || 'Stars',
    message: formatNumber(repository.stargazers_count, isPretty),
    color: getColorForCount(repository.stargazers_count),
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

app.get('/badge/forks', async (c) => {
  const { owner, repo, label, pretty } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.text(validation.error || 'Invalid parameters', 400);
  }

  const repository = await fetchRepository(owner, repo, c.env.GITHUB_TOKEN);
  
  if (!repository) {
    return c.text('Repository not found', 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || 'Forks',
    message: formatNumber(repository.forks_count, isPretty),
    color: getColorForCount(repository.forks_count),
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

app.get('/badge/issues', async (c) => {
  const { owner, repo, label, pretty } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.text(validation.error || 'Invalid parameters', 400);
  }

  const repository = await fetchRepository(owner, repo, c.env.GITHUB_TOKEN);
  
  if (!repository) {
    return c.text('Repository not found', 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || 'Issues',
    message: formatNumber(repository.open_issues_count, isPretty),
    color: getIssuesColor(repository.open_issues_count),
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

app.get('/badge/license', async (c) => {
  const { owner, repo, label } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.text(validation.error || 'Invalid parameters', 400);
  }

  const repository = await fetchRepository(owner, repo, c.env.GITHUB_TOKEN);
  
  if (!repository) {
    return c.text('Repository not found', 404);
  }

  const licenseText = repository.license?.spdx_id || 'None';
  const badge = generateBadge({
    label: label || 'License',
    message: licenseText,
    color: repository.license ? '2ea44f' : '8b949e',
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

app.get('/badge/release', async (c) => {
  const { owner, repo, label, fallback } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.text(validation.error || 'Invalid parameters', 400);
  }

  const release = await fetchLatestRelease(owner, repo, c.env.GITHUB_TOKEN);
  
  const releaseText = release?.tag_name || fallback || 'No release';
  const badge = generateBadge({
    label: label || 'Release',
    message: releaseText,
    color: release ? '2ea44f' : '8b949e',
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

app.get('/badge/language', async (c) => {
  const { owner, repo, label } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.text(validation.error || 'Invalid parameters', 400);
  }

  const repository = await fetchRepository(owner, repo, c.env.GITHUB_TOKEN);
  
  if (!repository) {
    return c.text('Repository not found', 404);
  }

  const languageText = repository.language || 'Unknown';
  const badge = generateBadge({
    label: label || 'Language',
    message: languageText,
    color: repository.language ? '58a6ff' : '8b949e',
  });

  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(badge);
});

// API endpoint for TRMNL integration
app.get('/api/stats', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.json({ error: 'Missing required parameters: owner and repo' }, 400);
  }

  const validation = validateGitHubParams(owner, repo);
  if (!validation.valid) {
    return c.json({ error: validation.error || 'Invalid parameters' }, 400);
  }

  const repository = await fetchRepository(owner, repo, c.env.GITHUB_TOKEN);
  
  if (!repository) {
    return c.json({ error: 'Repository not found' }, 404);
  }

  const release = await fetchLatestRelease(owner, repo, c.env.GITHUB_TOKEN);

  const stats = {
    name: repository.name,
    full_name: repository.full_name,
    description: repository.description,
    html_url: repository.html_url,
    stats: {
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      issues: repository.open_issues_count,
      watchers: repository.stargazers_count, // GitHub API uses same value
    },
    license: repository.license?.spdx_id || null,
    language: repository.language || null,
    latest_release: release?.tag_name || null,
  };

  c.header('Cache-Control', 'public, max-age=3600');
  return c.json(stats);
});

export default app;
