import { Hono } from 'hono';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

app.get('/', (c) => {
  if (c.env.NODE_ENV === 'production') {
    return c.redirect('https://github.com/your-username/trmnl-badges');
  } else {
    return c.text('TRMNL Badges API - Development Mode');
  }
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Badge endpoints - to be implemented
app.get('/badge/stars', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }
  
  // TODO: Implement stars badge
  return c.text('Stars badge - Coming soon', 501);
});

app.get('/badge/forks', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }
  
  // TODO: Implement forks badge
  return c.text('Forks badge - Coming soon', 501);
});

app.get('/badge/issues', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }
  
  // TODO: Implement issues badge
  return c.text('Issues badge - Coming soon', 501);
});

app.get('/badge/license', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }
  
  // TODO: Implement license badge
  return c.text('License badge - Coming soon', 501);
});

app.get('/badge/release', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }
  
  // TODO: Implement release badge
  return c.text('Release badge - Coming soon', 501);
});

app.get('/badge/language', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.text('Missing required parameters: owner and repo', 400);
  }
  
  // TODO: Implement language badge
  return c.text('Language badge - Coming soon', 501);
});

// API endpoint for TRMNL integration
app.get('/api/stats', async (c) => {
  const { owner, repo } = c.req.query();
  
  if (!owner || !repo) {
    return c.json({ error: 'Missing required parameters: owner and repo' }, 400);
  }
  
  // TODO: Implement stats API
  return c.json({ 
    error: 'Not implemented yet',
    message: 'This endpoint will provide JSON stats for TRMNL integration'
  }, 501);
});

export default app;
