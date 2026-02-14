import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

let devServer: ChildProcess;
const BASE_URL = 'http://localhost:8787';

describe('Integration Tests', () => {
  beforeAll(async () => {
    // Start the Wrangler dev server
    devServer = spawn('npx', ['wrangler', 'dev', '--port', '8787'], {
      stdio: 'pipe',
      detached: true,
    });

    // Wait for the server to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      try {
        const response = await fetch(`${BASE_URL}/health`, { timeout: 1000 });
        if (response.ok) {
          ready = true;
        }
      } catch {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!ready) {
      throw new Error('Dev server failed to start');
    }
  }, 60000);

  afterAll(() => {
    if (devServer) {
      process.kill(-devServer.pid!);
    }
  });

  describe('Health Endpoint', () => {
    it('should return ok status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('projectUrl');
    });
  });

  describe('Badge Endpoints', () => {
    it('should return 400 for missing recipe param on installs', async () => {
      const response = await fetch(`${BASE_URL}/badge/installs`);
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing recipe param on forks', async () => {
      const response = await fetch(`${BASE_URL}/badge/forks`);
      expect(response.status).toBe(400);
    });

    it('should return SVG for valid installs badge', async () => {
      const response = await fetch(`${BASE_URL}/badge/installs?recipe=28496`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('<svg');
    });

    it('should return SVG for valid forks badge', async () => {
      const response = await fetch(`${BASE_URL}/badge/forks?recipe=28496`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('image/svg+xml');
      const svg = await response.text();
      expect(svg).toContain('<svg');
    });
  });

  describe('Stats API Endpoint', () => {
    it('should return 400 for missing recipe param', async () => {
      const response = await fetch(`${BASE_URL}/api/stats`);
      expect(response.status).toBe(400);
    });

    it('should return JSON stats for valid recipe', async () => {
      const response = await fetch(`${BASE_URL}/api/stats?recipe=28496`);
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('stats');
      expect(data.stats).toHaveProperty('installs');
      expect(data.stats).toHaveProperty('forks');
    });

    it('should include author information in stats', async () => {
      const response = await fetch(`${BASE_URL}/api/stats?recipe=28496`);
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data).toHaveProperty('author');
    });
  });
});
