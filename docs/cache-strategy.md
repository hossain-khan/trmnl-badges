# Cache Invalidation and Freshness Strategy

This project uses multiple cache layers to reduce load on `trmnl.com` while keeping badge values reasonably fresh.

## Cache Layers

| Layer | Scope | Key | TTL | Invalidation |
| --- | --- | --- | --- | --- |
| In-flight request dedupe (`src/trmnl-api.ts`) | Per Worker isolate (memory) | Upstream URL | Lifetime of one in-flight request | Automatic (`finally` removes key) |
| Upstream fetch cache hint (`fetch(..., { cf })`) | Cloudflare fetch path | Upstream URL | 60s (`cacheTtl`) | TTL expiry only |
| Worker edge badge cache (`caches.default` in `src/index.ts`) | Per datacenter | Full badge request URL (path + query params) | 90s success, 30s error (via `s-maxage`) | TTL expiry or zone-wide purge |
| Response `Cache-Control` headers | Browser/downstream caches | URL + cache policy | 3600s success, 60s error (via `max-age`) | TTL expiry, client refresh, URL versioning |

## Cache-Control Strategy

Badge responses use a two-directive `Cache-Control` header to separate edge/shared cache TTL from browser cache TTL:

- **`max-age`** (e.g. `max-age=3600`) — controls browser and downstream client caching. Set by the route handler via `returnSuccessBadge` / `returnErrorBadge`.
- **`s-maxage`** (e.g. `s-maxage=90`) — controls shared/edge cache TTL. Added by the edge cache middleware in `buildCacheableResponse` when storing a response in `caches.default`.

Example headers stored in edge cache:

| Badge result | `Cache-Control` stored in edge cache |
| --- | --- |
| Success | `public, max-age=3600, s-maxage=90` |
| Error | `public, max-age=60, s-maxage=30` |

On a **cache miss** the response is served directly from the route handler with the plain `max-age` header (`public, max-age=3600` or `public, max-age=60`). On a **cache hit** the stored response (including `s-maxage`) is returned. Browsers receiving the hit response still honor the `max-age` directive for their local cache, while Cloudflare's edge layer uses `s-maxage` to determine its own freshness window.

This decoupling ensures:
- Short edge TTLs absorb request bursts without flooding the upstream TRMNL API.
- Downstream browser cache semantics are preserved and intentional.

## Freshness Model

- Badge responses are cached at the Worker edge for a short period to absorb bursts.
- Upstream TRMNL API fetches use a short cache hint (`60s`) plus request coalescing.
- Practical freshness target is usually under 2 minutes for active keys.
- Worst-case staleness can be higher during cold PoP transitions because Worker cache is per datacenter, not globally shared.

## Invalidation Playbook

### Normal operation (preferred)

- Let TTLs expire naturally.
- This is the simplest and safest mode.

### Force freshness for a specific embedded badge URL

- Add or bump a query version parameter in the consumer URL, for example:

```text
https://trmnl-badges.gohk.xyz/badge/installs?recipe=28496&v=20260308
```

- Because cache keys include the full URL, this creates an immediate new cache key.

### Emergency global flush

- Use Cloudflare zone purge (`purge_everything`) only when necessary.
- This is broad and can affect unrelated cached traffic.

### Post-deploy guidance

- If a deploy changes badge rendering semantics, bump a `v` parameter in docs/examples where deterministic freshness is required.

## Observability Signals

### Edge cache logs (`src/index.ts`)

- Marker: `[edge-cache] badge-cache-metrics`
- Fields to watch:
  - `hitRatePercent`
  - `hits`, `misses`, `writes`
  - `cacheUnavailable`, `errors`

### TRMNL API dedupe logs (`src/trmnl-api.ts`)

- Marker: `[trmnl-api] dedupe-metrics`
- Fields to watch:
  - `hitRatePercent`
  - `recipeHits`, `recipeMisses`, `userHits`, `userMisses`
  - `upstreamTimeouts`, `upstreamErrors`

### Timeout warning

- Marker: `[trmnl-api] upstream-timeout`
- Indicates upstream fetch exceeded `TRMNL_API_TIMEOUT_MS`.

## Operational Notes

- Worker cache (`caches.default`) is not globally coherent; each datacenter warms independently.
- Use short TTLs + observability metrics as the primary control loop.
- Prefer versioned badge URLs for targeted freshness over global purge.