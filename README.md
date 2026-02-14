# TRMNL Badges

A Cloudflare Workers application that generates dynamic badges for TRMNL recipes.

## Features

- ⚡ Fast badge generation using Cloudflare Workers
- 🎨 TRMNL brand styling with official colors
- 📊 Display recipe statistics (installs, forks)
- 🔄 TRMNL API integration
- 🎯 Perfect for showcasing your TRMNL recipes

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy

# Run tests
npm run test
```

## API Endpoints

### Badge Endpoints
- `GET /badge/installs?recipe=<recipe_id>` - Recipe install count
- `GET /badge/forks?recipe=<recipe_id>` - Recipe fork count

### Utility Endpoints
- `GET /health` - Health check
- `GET /api/stats?recipe=<recipe_id>` - JSON stats for TRMNL recipes

## Query Parameters

- `recipe` (required) - TRMNL recipe ID (e.g., 240176)
- `label` (optional) - Custom label text
- `pretty` (optional) - Format numbers in compact notation (e.g., 1.2K)

## Examples

### Installs Badge
```
https://trmnl-badges.hk-c91.workers.dev/badge/installs?recipe=240176
```

### Forks Badge with Pretty Formatting
```
https://trmnl-badges.hk-c91.workers.dev/badge/forks?recipe=240176&pretty
```

### Custom Label
```
https://trmnl-badges.hk-c91.workers.dev/badge/installs?recipe=240176&label=Downloads
```

### Stats API
```
https://trmnl-badges.hk-c91.workers.dev/api/stats?recipe=240176
```

Returns:
```json
{
  "id": 240176,
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

## TRMNL Brand Colors

- **Primary**: `#F8654B` (orange)
- **Dark**: `#3D3D3E` (dark gray)
- **Light**: `#E7E7E7` (light gray)

## License

ISC
