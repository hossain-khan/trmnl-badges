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
│   ├── trmnl-api.ts          # TRMNL API client for fetching recipe data
│   ├── types.ts              # TypeScript interfaces
│   ├── utils.ts              # Helper utilities (number formatting)
│   └── global.d.ts           # Cloudflare Workers global type declarations
├── test/
│   ├── endpoints.test.ts     # API endpoint tests
│   └── fixtures.ts           # Mock data for testing
└── assets/
    └── trmnl/                # TRMNL logo SVG files
```

## API Endpoints

### Badge Endpoints
- `GET /badge/installs?recipe=<recipe_id>` - Recipe install count badge
- `GET /badge/forks?recipe=<recipe_id>` - Recipe fork count badge

### Utility Endpoints
- `GET /health` - Health check endpoint
- `GET /api/stats?recipe=<recipe_id>` - JSON stats for TRMNL recipes
- `GET /` - Redirects to GitHub repository

### Query Parameters
- `recipe` (required) - TRMNL recipe ID
- `label` (optional) - Custom label text for the badge
- `pretty` (optional) - Format numbers in compact notation (e.g., 1.2K)
- `theme` (optional) - Badge theme: `dark` (default) or `light`

### API Examples

#### Badge Endpoints
```
# Installs badge
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765

# Forks badge
https://trmnl-badges.gohk.xyz/badge/forks?recipe=16765

# With pretty formatting
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&pretty

# With custom label
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&label=Downloads

# With light theme
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&theme=light
```

#### Stats API
```
https://trmnl-badges.gohk.xyz/api/stats?recipe=16765
```

Returns:
```json
{
  "id": 16765,
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
https://trmnl.com/recipes/{recipe_id}.json
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
- **Theme Support**: 
  - **Dark theme** (default): Dark gray label background (`#3D3D3E`)
  - **Light theme**: Light gray label background (`#E7E7E7`)
- **Color Thresholds**: Dynamic badge colors based on stat counts
  - Dark mode: Lighter oranges for better visibility
  - Light mode: Darker oranges for better contrast

## Code Style

- TypeScript with strict mode enabled
- ESM modules
- Async/await for asynchronous operations
- Error handling with try-catch blocks

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
