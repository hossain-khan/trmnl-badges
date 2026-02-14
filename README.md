# TRMNL Badges

A Cloudflare Workers application that generates dynamic SVG badges displaying statistics for [TRMNL](https://usetrmnl.com/) recipes.

## About

[TRMNL](https://usetrmnl.com/) is an e-paper display platform that shows personalized content through community-created recipes. This service generates badges to showcase recipe statistics like install counts and forks, perfect for README files and recipe documentation.

## Features

- ⚡ Fast badge generation using Cloudflare Workers edge network
- 🎨 Official TRMNL brand styling and colors
- 📊 Display recipe statistics (installs, forks)
- 🔄 Real-time data from TRMNL API
- 🎯 Simple integration with markdown and HTML
- 📏 Compact number formatting support

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

## Usage

Add badges to your TRMNL recipe documentation using Markdown or HTML.

### Finding Your Recipe ID

Your recipe ID can be found in the URL of your recipe page on TRMNL:
```
https://usetrmnl.com/recipes/240176
                             ^^^^^^
                          (recipe ID)
```

### Markdown
```markdown
![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=240176)
![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=240176)
```

### HTML
```html
<img src="https://trmnl-badges.gohk.xyz/badge/installs?recipe=240176" alt="Installs">
<img src="https://trmnl-badges.gohk.xyz/badge/forks?recipe=240176" alt="Forks">
```

### Linked Badges
```markdown
[![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=240176)](https://usetrmnl.com/recipes/240176)
```

## Examples

### Installs Badge
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=240176
```

### Forks Badge with Pretty Formatting
```
https://trmnl-badges.gohk.xyz/badge/forks?recipe=240176&pretty
```

### Custom Label
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=240176&label=Downloads
```

### Stats API
```
https://trmnl-badges.gohk.xyz/api/stats?recipe=240176
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

