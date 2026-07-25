# Copilot Instructions for trmnl-badges

## Project Overview

**trmnl-badges** is a **Cloudflare Workers** application that generates dynamic SVG badges for [TRMNL](https://trmnl.com/) recipes (plugins for the TRMNL e-paper display platform). It is live at `https://trmnl-badges.gohk.xyz`.

The app fetches recipe statistics (installs, forks) from the public TRMNL API and renders them as branded SVG badges suitable for embedding in README files or websites. It also provides interactive badge builders deployed as GitHub Pages static HTML.

---

## Tech Stack

| Layer             | Technology                                        |
| ----------------- | ------------------------------------------------- |
| Runtime           | **Cloudflare Workers** (serverless edge)          |
| Framework         | **Hono** v4 (lightweight web framework)           |
| Language          | **TypeScript** (strict mode, ES2022 target)       |
| Badge generation  | **badgen** library                                |
| Schema validation | **Zod** v4                                        |
| Testing           | **Vitest**                                        |
| Coverage          | V8 provider, uploaded to Codecov                  |
| Deployment        | **Wrangler** CLI (`wrangler deploy --minify`)     |
| KV storage        | Cloudflare KV namespace `BADGE_COUNTER`           |
| Code formatting   | **Prettier** (enforced via Husky pre-commit hook) |
| HTML validation   | `html-validate`                                   |

---

## Directory Structure

```
trmnl-badges/
├── src/
│   ├── index.ts             # Hono app — all route handlers (main entry point)
│   ├── badge-generator.ts   # SVG badge creation using badgen + TRMNL branding
│   ├── badge-helpers.ts     # HTTP response helpers and type guard (isRecipeValid)
│   ├── trmnl-api.ts         # TRMNL API client (public endpoints, no auth)
│   ├── types.ts             # Core TypeScript interfaces (TRMNLRecipe, BadgeOptions, Bindings)
│   ├── utils.ts             # Number formatting, stats aggregation, KV counter with retry
│   └── global.d.ts          # Cloudflare Workers globals (btoa/atob)
├── test/
│   ├── endpoints.test.ts    # Integration-style tests for all HTTP routes
│   ├── badge-generator.test.ts
│   ├── badge-helpers.test.ts
│   ├── trmnl-api.test.ts
│   ├── utils.test.ts
│   └── fixtures.ts          # Shared mock recipe data
├── scripts/
│   └── integration-test.sh  # Shell script for live server integration tests
├── .github/workflows/
│   ├── ci.yml               # Main CI: type-check, HTML validation, unit tests, Codecov
│   ├── integration.yml      # Integration test workflow
│   └── pages.yml            # GitHub Pages deployment (index.html, author-badge.html)
├── index.html               # Single recipe badge builder (static GitHub Pages)
├── author-badge.html        # Author badge builder (static GitHub Pages)
├── assets/                  # TRMNL logos, icons, sample SVG responses, banners
├── wrangler.toml            # Cloudflare Workers config (KV binding, entry point)
├── tsconfig.json            # TypeScript config (no emit, bundler resolution, strict)
├── vitest.config.ts         # Vitest config (Node env, V8 coverage, globals)
└── .prettierrc              # Prettier formatting rules
```

---

## Bootstrap & Development Workflow

```bash
npm install            # Install all dependencies
npm run dev            # Start local Wrangler dev server at http://localhost:8787
npm test               # Run Vitest in watch mode
npm test -- --run      # Run all tests once (no watch)
npm test -- --run --coverage   # Run tests with V8 coverage report (outputs to coverage/)
npm run validate:html  # Validate index.html and author-badge.html with html-validate
npm run deploy         # Deploy to Cloudflare Workers (requires Wrangler auth)
```

**Type checking only (no emit):**

```bash
npx tsc --noEmit
```

**CI checks that must pass:**

1. `npx tsc --noEmit` — TypeScript type check
2. `npm run validate:html` — HTML validation
3. `npm test -- --run --coverage` — All unit tests with coverage

---

## Key Source File Details

### `src/index.ts` — Route Handlers

The Hono app binds to `Bindings` type (from `src/types.ts`). Current app version: `APP_VERSION = '1.8.0'`.

**Badge endpoints** (return `image/svg+xml`):

- `GET /badge/installs?recipe=<id>` or `?userId=<id>`
- `GET /badge/forks?recipe=<id>` or `?userId=<id>`
- `GET /badge/connections?recipe=<id>` or `?userId=<id>` — combined installs+forks
- `GET /badge/recipes?userId=<id>` — total published recipe count
- `GET /badge/counter` — total badges served (reads from KV)

**JSON API endpoints**:

- `GET /api/stats?recipe=<id>` — recipe stats object
- `GET /api/recipes?user_id=<id>` — array of all user recipes

**Utility endpoints**:

- `GET /health` — returns JSON with status, version, timestamp
- `GET /health-badge` — shields.io-compatible endpoint
- `GET /` — redirects to GitHub repo (production) or dev message

**Shared query parameters** across badge endpoints:

- `label` — override the left label text
- `pretty` — compact number formatting (e.g. `1.2K`)
- `color` — hex color for the right side (without `#`)
- `labelColor` — hex color for the left side (without `#`)
- `glyph` — `brand` | `black` | `white` (TRMNL logo variant)
- `scale` — numeric scale multiplier (max 5)

**CORS** is configured to allow `https://hossain-khan.github.io` for the badge builders.

### `src/utils.ts` — KV Counter with Retry

`incrementBadgeCounter(context, counterKey)` uses `context.executionCtx.waitUntil()` for non-blocking background execution in production (Cloudflare Workers). In test environments (no `executionCtx`), it falls back to a direct `await`.

The internal `doIncrementCounter(kv, counterKey)` retries up to **3 attempts** with exponential backoff + full jitter (base delay 100ms) specifically for Cloudflare KV **429 rate limit** errors.

### `src/badge-generator.ts` — TRMNL Branding

- TRMNL brand colors: Orange `#F8654B` (default right-side), Dark Gray `#3D3D3E` (default left-side)
- Three glyph variants embed SVG logos as base64 `data:image/svg+xml;base64,...` URIs
- SVG logo files read from `assets/trmnl/` and encoded via `btoa()` (Cloudflare Workers global)
- `scale` parameter capped at 5 for safety

### `src/trmnl-api.ts` — Public API Client

- No authentication required; TRMNL API is public
- Checks `Content-Type` response header to detect 404 redirects (TRMNL returns HTML for missing recipes)
- Returns `null` on any error (callers must handle `null`)

---

## Conventions & Patterns

- **Error handling:** All badge routes return an error SVG badge (not HTTP error codes) when data is unavailable. Use `returnErrorBadge()` from `badge-helpers.ts`.
- **Type guard:** `isRecipeValid(data, statKey?)` in `badge-helpers.ts` is a TypeScript type predicate that narrows `TRMNLRecipe | null` to `TRMNLRecipe`.
- **Cache headers:** Error badges cache for 60s; success badges cache for 3600s (1 hour). Set via `returnErrorBadge()` and `returnSuccessBadge()`.
- **Dual query param modes:** Each badge endpoint accepts either `recipe=<id>` (single recipe) or `userId=<id>` (aggregated author stats). When `userId` is provided, all recipes for that user are fetched and aggregated via `aggregateAuthorStats()`.
- **No throwing:** API functions return `null` on failure; badge helpers return error SVG. Avoid throwing exceptions in route handlers.
- **Formatting:** Prettier with `singleQuote: true`, `semi: true`, `trailingComma: 'es5'`, `printWidth: 100`, `tabWidth: 2`. Run Prettier before committing (Husky pre-commit hook handles it automatically).
- **TypeScript strict mode:** All strict checks enabled. Avoid `any` types.

---

## Testing Approach

Tests live in `test/` and use **Vitest** with globals enabled (no import needed for `describe`, `it`, `expect`).

**Mocking:** `vi.mock('../src/trmnl-api')` mocks all TRMNL API calls. Fixtures in `test/fixtures.ts` provide realistic mock data (`mockRecipe`, `mockUserRecipesResponse`, etc.).

**Test a single file:**

```bash
npm test -- --run test/utils.test.ts
```

**Test with coverage:**

```bash
npm test -- --run --coverage
```

Coverage reports appear in `coverage/` (HTML) and as `coverage/lcov.info` for Codecov.

**Adding new tests:** Follow the existing pattern in the relevant test file. For new routes, add cases to `test/endpoints.test.ts`. For new utilities, add to `test/utils.test.ts`.

---

## Environment Variables & Bindings

| Name            | Type          | Source                        | Purpose                                        |
| --------------- | ------------- | ----------------------------- | ---------------------------------------------- |
| `NODE_ENV`      | string        | `wrangler.toml` vars          | Environment detection (`"production"` in prod) |
| `BADGE_COUNTER` | `KVNamespace` | `wrangler.toml` kv_namespaces | Cloudflare KV store for badge counter          |

No secrets or API keys are required for the TRMNL API (it is public). The only CI secret is `CODECOV_TOKEN` for uploading coverage reports.

---

## Cloudflare Workers Specifics

- **Entry point:** `./src/index.ts` (set in `wrangler.toml`)
- **Compatibility date:** `2025-08-01`
- **`btoa`/`atob`** are available as globals in the Workers environment (declared in `src/global.d.ts`)
- **KV namespace ID** (production): `78174a7d02f045d884886f38e43964a9`
- **Observability logs** are enabled (`invocation_logs = true`)
- Do not use Node.js built-ins unless they are supported by the Workers runtime or polyfilled

---

## Known Errors & Workarounds

- **`btoa` not available in Vitest (Node.js):** The `src/global.d.ts` declares `btoa`/`atob` as global types for Workers. In tests, these are available natively in Node 16+. If tests fail with "btoa is not defined", ensure the Node.js version is 20+ (CI tests on Node 20.x and 22.x).
- **KV 429 rate limits:** Handled automatically by `incrementBadgeCounter` with exponential backoff. No action needed in normal usage.
- **TRMNL API 404 redirects:** The API returns HTML (not JSON) for missing recipes. `fetchRecipe` checks `Content-Type` and returns `null` if the response is not JSON.
- **`executionCtx` unavailable in tests:** `incrementBadgeCounter` detects absence of `executionCtx` and falls back to `await` instead of `waitUntil()`. Mock the context object in tests with `{ executionCtx: { waitUntil: vi.fn() }, env: { BADGE_COUNTER: mockKV } }`.
- **Husky pre-commit hook:** Runs `lint-staged` (Prettier on staged files). If you bypass with `--no-verify`, run `npx prettier --write <files>` manually before pushing to avoid CI formatting failures (CI does not enforce Prettier, but it is best practice).

---

## CI/CD Pipelines

| Workflow          | Trigger           | Key Steps                                                                        |
| ----------------- | ----------------- | -------------------------------------------------------------------------------- |
| `ci.yml`          | Push to main, PRs | tsc type-check → HTML validate → unit tests → Codecov upload                     |
| `integration.yml` | Push to main, PRs | type-check → unit tests → live integration tests (`scripts/integration-test.sh`) |
| `pages.yml`       | Push to main      | Deploy repo to GitHub Pages (badge builder HTML)                                 |

The integration test script sends real HTTP requests to the deployed Worker. It is not run in the standard unit test suite.

---

## Release & Tagging

**Versioning:** Follows semantic versioning (semver) with format `MAJOR.MINOR.PATCH` (e.g., `1.8.0`).

**Tagging Convention:** Git tags **do not use a `v` prefix**. Tag names match version numbers exactly:

- ✅ Correct: `git tag 1.8.0`
- ❌ Incorrect: `git tag v1.8.0`

**Release Process:**

1. Create a release branch: `git checkout -b release/<version>` (e.g., `release/1.8.0`)
2. Update version in three files:
   - `package.json` — `"version"` field
   - `src/constants.ts` — `APP_VERSION` export
   - `.github/copilot-instructions.md` — current app version reference
3. Run local verification checks:
   - `npx tsc --noEmit`
   - `npm run validate:html`
   - `npm test -- --run`
4. Commit version changes: `git commit -am "Release v<version>"`
5. Create git tag: `git tag <version>` (without `v` prefix)
6. Push release branch and tag to GitHub:
   - `git push -u origin release/<version>`
   - `git push origin <version>`
7. Open Pull Request and merge into `main`:
   - `gh pr create --title "Release v<version>"`
8. Create GitHub Release notes (via CLI or web UI):
   - `gh release create <version> --generate-notes`
9. Deploy to Cloudflare Workers: `npm run deploy`
