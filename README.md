[![CI](https://github.com/hossain-khan/trmnl-badges/actions/workflows/ci.yml/badge.svg)](https://github.com/hossain-khan/trmnl-badges/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hossain-khan/trmnl-badges/graph/badge.svg?token=TWWWM4OMY4)](https://codecov.io/github/hossain-khan/trmnl-badges) [![Health](https://img.shields.io/endpoint?url=https://trmnl-badges.gohk.xyz/health-badge)](https://trmnl-badges.gohk.xyz/health) ![Badges Served Counter](https://trmnl-badges.gohk.xyz/badge/counter)

# TRMNL Badges

Dynamic SVG badges displaying statistics for [TRMNL](https://trmnl.com/) [recipes](https://trmnl.com/recipes).

  <picture align="right">
    <source media="(prefers-color-scheme: dark)" srcset="assets/trmnl/trmnl-badge-compatible-with-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/trmnl/trmnl-badge-compatible-with-light.svg">
    <img alt="Show it on TRMNL" src="assets/trmnl/trmnl-badge-compatible-with-dark.svg" height="40">
  </picture>

<details><summary>Features</summary>

- ⚡ Fast badge generation using Cloudflare Workers edge network
- 🎨 Official TRMNL brand styling and colors
- 📊 Display recipe statistics (installs, forks, connections)
- 🔄 Real-time data from TRMNL API
- 🎯 Simple integration with markdown and HTML
- 📏 Compact number formatting support

</details>

### 🎨 **Try the Interactive Badge Builder** 🛠️

> Don't want to manually construct URLs? Use our 👷 **[TRMNL Badge Builder](https://hossain-khan.github.io/trmnl-badges/)** 🧰 for an easy, visual way to create and customize badges with live previews.

## Usage

Add badges to your TRMNL recipe documentation using Markdown or HTML.

### Finding Your Recipe ID

Your recipe ID can be found in the URL of your [recipe page](https://trmnl.com/recipes) on TRMNL:
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
| **Connections** | `![Connections](https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496)` | ![Connections](https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496) |
| **Pretty Format** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&pretty)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&pretty) |
| **Custom Label** | `![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads)` | ![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads) |
| **Linked Badge** | `[![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)](https://trmnl.com/recipes/28496)` | [![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)](https://trmnl.com/recipes/28496) |


## Badge URL Query Parameters

- **`recipe`** (required) - TRMNL recipe ID (e.g., 28496)
- **`label`** (optional) - Custom label text (eg. `?label=Downloads` or `?label=Download%20Count`)
- **`pretty`** (optional) - Format numbers in compact notation (e.g., 1.2K)

> ℹ️ Tip: Use the **[TRMNL Badge Builder](https://hossain-khan.github.io/trmnl-badges/)** to generate badge markup.

### HTML Usage
```html
<img src="https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496" alt="Installs">
<img src="https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496" alt="Forks">
<img src="https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496" alt="Connections">
```

## Examples

### Installs Badge
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496
```

### Forks Badge
```
https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496
```

### Connections Badge
```
https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496
```

### Badge with Pretty Formatting (e.g., 2.7K)
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&pretty
```

### Custom Label
```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Downloads
```

## Contributing

For developers interested in contributing or running this project locally, see [CONTRIBUTING.md](CONTRIBUTING.md).
