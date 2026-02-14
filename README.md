# TRMNL Badges

A Cloudflare Workers application that generates dynamic GitHub repository badges for TRMNL integration.

## Features

- ⚡ Fast badge generation using Cloudflare Workers
- 🎨 Customizable badge styles using badgen
- 📊 Multiple badge types (stars, forks, issues, license, etc.)
- 🔄 GitHub API integration (to be implemented)
- 🎯 TRMNL recipe support

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

## API Endpoints (Planned)

### Badge Endpoints
- `GET /badge/stars?owner=<owner>&repo=<repo>` - Repository stars count
- `GET /badge/forks?owner=<owner>&repo=<repo>` - Repository forks count
- `GET /badge/issues?owner=<owner>&repo=<repo>` - Open issues count
- `GET /badge/license?owner=<owner>&repo=<repo>` - Repository license
- `GET /badge/release?owner=<owner>&repo=<repo>` - Latest release version
- `GET /badge/language?owner=<owner>&repo=<repo>` - Primary language

### Utility Endpoints
- `GET /health` - Health check
- `GET /api/stats?owner=<owner>&repo=<repo>` - JSON stats for TRMNL

## Query Parameters

- `owner` (required) - GitHub repository owner/organization
- `repo` (required) - Repository name
- `label` (optional) - Custom label text
- `pretty` (optional) - Format numbers in compact notation (e.g., 1.2K)

## License

ISC
