# Cache Invalidation and Freshness Strategy

This project uses multiple cache layers to reduce load on `trmnl.com` while keeping badge values reasonably fresh.

## Cache Layers

| Layer | Scope | Key | TTL | Invalidation |
| --- | --- | --- | --- | --- |
| In-flight request dedupe (`src/trmnl-api.ts`) | Per Worker isolate (memory) | Upstream URL | Lifetime of one in-flight request | Automatic (`finally` removes key) |
| Upstream fetch cache hint (`fetch(..., { cf })`) | Cloudflare fetch path | Upstream URL | 60s (`cacheTtl`) | TTL expiry only |
| Worker edge badge cache (`caches.default` in `src/index.ts`) | Per datacenter | Full badge request URL (path + query params) | 90s success, 30s error | TTL expiry or zone-wide purge |
| Response `Cache-Control` headers | Browser/downstream caches | URL + cache policy | 3600s success, 60s error | TTL expiry, client refresh, URL versioning |

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