# TRMNL Badges

Dynamic SVG badges displaying statistics for [TRMNL](https://trmnl.com/) [recipes](https://trmnl.com/recipes).

## Features

- ⚡ Fast badge generation using Cloudflare Workers edge network
- 🎨 Official TRMNL brand styling and colors
- 📊 Display recipe statistics (installs, forks)
- 🔄 Real-time data from TRMNL API
- 🎯 Simple integration with markdown and HTML
- 📏 Compact number formatting support
- 🌓 Light and dark theme support

## Query Parameters

- `recipe` (required) - TRMNL recipe ID (e.g., 16765)
- `label` (optional) - Custom label text
- `pretty` (optional) - Format numbers in compact notation (e.g., 1.2K)
- `theme` (optional) - Badge theme: `dark` (default) or `light`

## Usage

Add badges to your TRMNL recipe documentation using Markdown or HTML.

### Finding Your Recipe ID

Your recipe ID can be found in the URL of your recipe page on TRMNL:
```
https://usetrmnl.com/recipes/16765
                             ^^^^^
                          (recipe ID)
```

### Badge Examples

| Badge Type | Code | Preview |
|------------|------|---------|
| **Installs** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765) |
| **Forks** | `![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=16765)` | ![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=16765) |
| **Pretty Format** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&pretty)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&pretty) |
| **Custom Label** | `![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&label=Downloads)` | ![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&label=Downloads) |
| **Light Theme** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&theme=light)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&theme=light) |
| **Linked Badge** | `[![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765)](https://usetrmnl.com/recipes/16765)` | [![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765)](https://usetrmnl.com/recipes/16765) |

### HTML Usage
```html
<img src="https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765" alt="Installs">
<img src="https://trmnl-badges.gohk.xyz/badge/forks?recipe=16765" alt="Forks">
```

## Examples

### Installs Badge
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765
```

### Forks Badge with Pretty Formatting
```
https://trmnl-badges.gohk.xyz/badge/forks?recipe=16765&pretty
```

### Custom Label
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&label=Downloads
```

### Light Theme Badge
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=16765&theme=light
```

## Contributing

For developers interested in contributing or running this project locally, see [CONTRIBUTING.md](CONTRIBUTING.md).
