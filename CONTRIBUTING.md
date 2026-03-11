# Contributing to TRMNL Badges

## Development Setup

```bash
# Clone the repository
git clone https://github.com/hossain-khan/trmnl-badges.git
cd trmnl-badges

# Install dependencies
npm install

# Run locally
npm run dev

# The service will be available at http://localhost:8787
```

## Project Structure

```
trmnl-badges/
├── src/
│   ├── index.ts              # Main Hono app with route handlers
│   ├── badge-generator.ts    # SVG badge generation with TRMNL branding
│   ├── badge-helpers.ts      # Response helpers (error/success badges, validation)
│   ├── trmnl-api.ts          # TRMNL API client for fetching recipe/user data
│   ├── types.ts              # TypeScript interfaces
│   ├── utils.ts              # Helper utilities (number formatting, aggregation)
│   └── global.d.ts           # Cloudflare Workers global type declarations
├── test/
│   ├── endpoints.test.ts     # API endpoint integration tests
│   ├── badge-generator.test.ts # Badge SVG generation tests
│   ├── badge-helpers.test.ts # Badge helper function tests
│   ├── trmnl-api.test.ts     # TRMNL API client tests
│   ├── utils.test.ts         # Utility function tests
│   └── fixtures.ts           # Mock data for testing
├── index.html                # Single recipe badge builder (GitHub Pages)
├── author-badge.html         # Author badge builder (GitHub Pages)
└── assets/
    └── trmnl/                # TRMNL logo SVG files
```

## API Endpoints

### Badge Endpoints

#### Single Recipe Badges

- `GET /badge/installs?recipe=<recipe_id>` - Recipe install count badge
- `GET /badge/forks?recipe=<recipe_id>` - Recipe fork count badge
- `GET /badge/connections?recipe=<recipe_id>` - Recipe connections count badge (sum of installs and forks)

#### Author Badges (combined stats across all recipes)

- `GET /badge/recipes?userId=<user_id>` - Total recipe count badge
- `GET /badge/installs?userId=<user_id>` - Total installs badge
- `GET /badge/forks?userId=<user_id>` - Total forks badge
- `GET /badge/connections?userId=<user_id>` - Total connections badge

### Utility Endpoints

- `GET /health` - Health check endpoint
- `GET /health-badge` - Health badge endpoint for shields.io monitoring
- `GET /api/stats?recipe=<recipe_id>` - JSON stats for TRMNL recipes
- `GET /api/recipes?user_id=<user_id>` - JSON list of all recipes for a user
- `GET /badge/counter` - Fun tracking badge showing total badges served
- `GET /` - Redirects to GitHub repository

### Query Parameters

- `recipe` (required\*) - TRMNL recipe ID
- `userId` (required\*) - TRMNL author/user ID for combined stats
- `label` (optional) - Custom label text for the badge
- `pretty` (optional) - Format numbers in compact notation (e.g., 1.2K)

\* Either `recipe` or `userId` is required for badge endpoints. `/badge/recipes` only supports `userId`.

### Health Badge Endpoint

The `/health-badge` endpoint returns a [shields.io](https://shields.io/endpoint) compatible JSON response for monitoring service uptime:

```
GET /health-badge
```

Response format:

```json
{
  "schemaVersion": 1,
  "label": "TRMNL Badge Service",
  "message": "Online",
  "color": "brightgreen"
}
```

Usage with shields.io:

```markdown
[![Health](https://img.shields.io/endpoint?url=https://trmnl-badges.gohk.xyz/health-badge)](https://trmnl-badges.gohk.xyz/health)
```

Related endpoints:

- `GET /health` - JSON health status check (returns status, timestamp, projectUrl)

### API Examples

#### Badge Endpoints

```
# Installs badge
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496

# Forks badge
https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496

# Connections badge
https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496

# Total badges served counter
https://trmnl-badges.gohk.xyz/badge/counter

# With pretty formatting
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&pretty

# With custom label
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads

# Author badges (combined stats)
https://trmnl-badges.gohk.xyz/badge/recipes?userId=364
https://trmnl-badges.gohk.xyz/badge/installs?userId=364
https://trmnl-badges.gohk.xyz/badge/forks?userId=364
https://trmnl-badges.gohk.xyz/badge/connections?userId=364
```

#### Stats API

```
https://trmnl-badges.gohk.xyz/api/stats?recipe=28496
```

Returns:

```json
{
  "id": 28496,
  "name": "Recipe Name",
  "published_at": "2026-02-09T07:45:36.616Z",
  "stats": {
    "installs": 7,
    "forks": 5
  },
  "author": {
    "github_url": "https://github.com/...",
    "learn_more_url": "https://..."
  }
}
```

#### User Recipes API

```
https://trmnl-badges.gohk.xyz/api/recipes?user_id=364
```

Returns all recipes for the given user with their stats.

## Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test -- --watch
```

## Deployment

The project uses Cloudflare Workers with automatic deployment via GitHub Actions.

```bash
# Deploy to Cloudflare Workers
npm run deploy

# The service will be deployed to:
# - https://trmnl-badges.hk-c91.workers.dev (Workers URL)
# - https://trmnl-badges.gohk.xyz (Custom domain)
```

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono v4.11.5
- **Badge Generation**: badgen v3.2.3
- **Language**: TypeScript with strict mode
- **Testing**: Vitest v4.0.18
- **Deployment**: Wrangler v4.60.0

## TRMNL API Integration

The service fetches recipe data from the TRMNL API:

```
# Single recipe
https://trmnl.com/recipes/{recipe_id}.json

# All recipes for a user
https://trmnl.com/recipes.json?user_id={user_id}
```

Response includes:

- Recipe metadata (id, name, published_at)
- Statistics (installs, forks)
- Author information

## Badge Generation

Badges are generated using the `badgen` library with:

- **TRMNL Logo**: Official TRMNL glyph SVG
- **Brand Colors**:
  - Primary: `#F8654B` (orange)
  - Dark: `#3D3D3E` (dark gray)
  - Light: `#E7E7E7` (light gray)
- **Color Thresholds**: Dynamic badge colors based on stat counts

## Code Style

- TypeScript with strict mode enabled
- ESM modules
- Async/await for asynchronous operations
- Error handling with try-catch blocks

## Performance Optimizations

### Client-Side

- **Input debouncing**: Custom label input is debounced (300ms) to prevent excessive requests while typing
- This significantly reduces server load when users are actively composing labels

### Server-Side

- **HTTP Caching**: All badge endpoints return appropriate cache headers (set by route handlers):
  - Error responses: `Cache-Control: public, max-age=60` (1 minute)
  - Success responses: `Cache-Control: public, max-age=3600` (1 hour)
- **Worker edge cache**: `/badge/*` responses are cached in `caches.default` using `s-maxage` to keep the edge TTL short without changing the downstream `max-age`:
  - Success badges: `s-maxage=90` (edge TTL 90s, browser `max-age=3600` preserved)
  - Error badges: `s-maxage=30` (edge TTL 30s, browser `max-age=60` preserved)
- **TRMNL upstream fetch cache hint**: upstream requests use `cf.cacheTtl=60` with request coalescing to reduce duplicate fetches under concurrency
- The `/badge/counter` endpoint caches for 1 hour to allow for reasonable badge count accuracy while minimizing KV operations

For cache invalidation, freshness expectations, and observability markers, see [docs/cache-strategy.md](docs/cache-strategy.md).

## Contributing Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT
