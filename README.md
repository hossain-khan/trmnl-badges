# TRMNL Badges

Dynamic SVG badges displaying statistics for [TRMNL](https://trmnl.com/) [recipes](https://trmnl.com/recipes).


  <picture align="right">
    <source media="(prefers-color-scheme: dark)" srcset="assets/trmnl/trmnl-badge-compatible-with-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/trmnl/trmnl-badge-compatible-with-light.svg">
    <img alt="Show it on TRMNL" src="assets/trmnl/trmnl-badge-compatible-with-dark.svg" height="40">
  </picture>

## Features

- ⚡ Fast badge generation using Cloudflare Workers edge network
- 🎨 Official TRMNL brand styling and colors
- 📊 Display recipe statistics (installs, forks)
- 🔄 Real-time data from TRMNL API
- 🎯 Simple integration with markdown and HTML
- 📏 Compact number formatting support

## Query Parameters

- `recipe` (required) - TRMNL recipe ID (e.g., 28496)
- `label` (optional) - Custom label text
- `pretty` (optional) - Format numbers in compact notation (e.g., 1.2K)

## Usage

Add badges to your TRMNL recipe documentation using Markdown or HTML.

### Finding Your Recipe ID

Your recipe ID can be found in the URL of your recipe page on TRMNL:
```
https://trmnl.com/recipes/28496
                          ^^^^^
                        (Recipe ID)
```

### Badge Examples

| Badge Type | Code | Preview |
|------------|------|---------|
| **Installs** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496) |
| **Forks** | `![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496)` | ![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496) |
| **Pretty Format** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&pretty)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&pretty) |
| **Custom Label** | `![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads)` | ![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads) |
| **Linked Badge** | `[![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)](https://trmnl.com/recipes/28496)` | [![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)](https://trmnl.com/recipes/28496) |

### HTML Usage
```html
<img src="https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496" alt="Installs">
<img src="https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496" alt="Forks">
```

## Examples

### Installs Badge
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496
```

### Forks Badge with Pretty Formatting
```
https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496&pretty
```

### Custom Label
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads
```

## Contributing

For developers interested in contributing or running this project locally, see [CONTRIBUTING.md](CONTRIBUTING.md).
