[![CI](https://github.com/hossain-khan/trmnl-badges/actions/workflows/ci.yml/badge.svg)](https://github.com/hossain-khan/trmnl-badges/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hossain-khan/trmnl-badges/graph/badge.svg?token=TWWWM4OMY4)](https://codecov.io/github/hossain-khan/trmnl-badges) [![Health](https://img.shields.io/endpoint?url=https://trmnl-badges.gohk.xyz/health-badge)](https://trmnl-badges.gohk.xyz/health) [![Badges Served Counter](https://trmnl-badges.gohk.xyz/badge/counter)](https://hossain-khan.github.io/trmnl-badges/) [![](https://badgen.net/github/release/hossain-khan/trmnl-badges/stable)](https://github.com/hossain-khan/trmnl-badges/releases)

# TRMNL Badges

Dynamic SVG badges displaying statistics for [TRMNL](https://trmnl.com/) [recipes](https://trmnl.com/recipes).

  <picture align="right">
    <source media="(prefers-color-scheme: dark)" srcset="assets/trmnl/trmnl-badge-compatible-with-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/trmnl/trmnl-badge-compatible-with-light.svg">
    <img alt="Show it on TRMNL" src="assets/trmnl/trmnl-badge-compatible-with-dark.svg" height="40">
  </picture>

<details><summary>Features</summary>

- ⚡️ Fast badge generation using Cloudflare Workers edge network
- 🎨 Official TRMNL brand styling and colors
- 📊 Display recipe statistics (installs, forks, connections)
- 🎭 Author badges with combined stats across all recipes
- 🔄 Real-time data from TRMNL API
- 🎯 Simple integration with markdown and HTML
- 📏 Compact number formatting support

</details>

> [!NOTE]  
> 🎨 **Try the Interactive Badge Builder** 🛠️  
> Use our 👷 **[TRMNL Badge Builder](https://hossain-khan.github.io/trmnl-badges/)** 🧰 for an easy, visual way to create and customize badges with live previews.  
> 👤 **New!** Try the **[Author Badge Builder](https://hossain-khan.github.io/trmnl-badges/author-badge.html)** to generate combined badges for all your recipes.

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

| Badge Type        | Code                                                                                                        | Preview                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Installs**      | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)`                                    | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)                                    |
| **Forks**         | `![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496)`                                          | ![Forks](https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496)                                          |
| **Connections**   | `![Connections](https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496)`                              | ![Connections](https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496)                              |
| **Pretty Format** | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=9917&pretty)`                              | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=9917&pretty)                              |
| **Custom Label**  | `![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Download%20Count)`            | ![Downloads](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Download%20Count)            |
| **Linked Badge**  | `[![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)](https://trmnl.com/recipes/28496)` | [![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496)](https://trmnl.com/recipes/28496) |
| **Customizations**  | `![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&glyph=white&color=959393&labelColor=4EBC91)` | ![Installs](https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&glyph=white&color=959393&labelColor=4EBC91) |

## Badge URL Query Parameters

- **`recipe`** (required\*) - TRMNL recipe ID (e.g., `28496`)
- **`userId`** (required\*) - TRMNL author/user ID for combined stats (e.g., `364`)
- **`label`** (optional) - Custom label text (eg. `?label=Downloads` or `?label=Download%20Count`)
- **`pretty`** (optional) - Format numbers in compact notation (e.g., `1.78K`)
- **`glyph`** (optional) - TRMNL logo variant: `brand` (default), `black`, or `white`
- **`color`** (optional) - Badge value background color as a hex code without `#` (default: `F8654B` — TRMNL orange, e.g., `&color=959393`)
- **`labelColor`** (optional) - Badge label background color as a hex code without `#` (default: `3D3D3E` — TRMNL dark gray, e.g., `&labelColor=4EBC91`)
- **`scale`** (optional) - Badge scale multiplier as a positive number (default: `1`, e.g., `&scale=2` for 2x size)

\* Either `recipe` or `userId` is required. Use `recipe` for single recipe badges, `userId` for author badges.

> [!TIP]
> Use the **[TRMNL Badge Builder](https://hossain-khan.github.io/trmnl-badges/)** to generate badge markup, or the **[Author Badge Builder](https://hossain-khan.github.io/trmnl-badges/author-badge.html)** for author badges.

### HTML Usage

```html
<img src="https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496" alt="Installs" />
<img src="https://trmnl-badges.gohk.xyz/badge/forks?recipe=28496" alt="Forks" />
<img src="https://trmnl-badges.gohk.xyz/badge/connections?recipe=28496" alt="Connections" />
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
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&label=Download%20Count
```

### Scaled Badge (2x size)

```
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&scale=2
```

## Author Badges

Author badges display **combined statistics** across all recipes published by a TRMNL user. Use the `userId` parameter instead of `recipe`.

### Finding Your User ID

Your user ID can be found by using the [Badge Builder](https://hossain-khan.github.io/trmnl-badges/) — enter any of your recipe URLs and your user ID will be detected automatically.

### Author Badge Examples

| Badge Type          | Code                                                                                                            | Preview                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Recipes**         | `![Recipes](https://trmnl-badges.gohk.xyz/badge/recipes?userId=364)`                                            | ![Recipes](https://trmnl-badges.gohk.xyz/badge/recipes?userId=364)                                       |
| **Total Installs**  | `![Total Installs](https://trmnl-badges.gohk.xyz/badge/installs?userId=364)`                                    | ![Total Installs](https://trmnl-badges.gohk.xyz/badge/installs?userId=364)                                |
| **Total Forks**     | `![Total Forks](https://trmnl-badges.gohk.xyz/badge/forks?userId=364)`                                          | ![Total Forks](https://trmnl-badges.gohk.xyz/badge/forks?userId=364)                                      |
| **Total Connections** | `![Total Connections](https://trmnl-badges.gohk.xyz/badge/connections?userId=364)`                            | ![Total Connections](https://trmnl-badges.gohk.xyz/badge/connections?userId=364)                          |
| **Pretty Format**   | `![Total Installs](https://trmnl-badges.gohk.xyz/badge/installs?userId=364&pretty)`                            | ![Total Installs](https://trmnl-badges.gohk.xyz/badge/installs?userId=364&pretty)                         |

### Author Badge HTML Usage

```html
<img src="https://trmnl-badges.gohk.xyz/badge/recipes?userId=364" alt="Recipes" />
<img src="https://trmnl-badges.gohk.xyz/badge/installs?userId=364" alt="Total Installs" />
<img src="https://trmnl-badges.gohk.xyz/badge/forks?userId=364" alt="Total Forks" />
<img src="https://trmnl-badges.gohk.xyz/badge/connections?userId=364" alt="Total Connections" />
```

> [!TIP]
> Use the **[Author Badge Builder](https://hossain-khan.github.io/trmnl-badges/author-badge.html)** for a visual way to generate author badges with live previews and per-recipe breakdowns.

## Contributing

For developers interested in contributing or running this project locally, see [CONTRIBUTING.md](CONTRIBUTING.md).
