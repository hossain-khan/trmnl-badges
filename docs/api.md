# TRMNL Badges JSON Proxy API Reference

Public-facing documentation for the JSON proxy API provided by the `trmnl-badges` service. This API serves cached and deduplicated statistics from [TRMNL](https://trmnl.com/) for consumption by badge services (such as [Shields.io](https://shields.io)) and custom integrations.

---

## 1. Service Information

- **Production Base URL:** `https://trmnl-badges.gohk.xyz`
- **Source Repository:** `https://github.com/hossain-khan/trmnl-badges`
- **Issue Tracker:** `https://github.com/hossain-khan/trmnl-badges/issues`

### Purpose and Architecture

This proxy service acts as an edge-cached layer in front of the upstream TRMNL platform (`trmnl.com`). It provides:

1. **Edge and Browser Caching:** Responses include standard `Cache-Control` headers allowing edge networks and downstream consumers to reuse cached data.
2. **In-Flight Request Deduplication:** Concurrent requests for the same recipe or author stats within a single Worker isolate share a single upstream request, protecting `trmnl.com` from burst traffic and avoiding upstream rate limits.

---

## 2. Recipe Statistics Endpoint

### `GET /api/stats`

Fetches metadata and usage statistics for a single TRMNL recipe.

#### Parameters

| Parameter | Type             | Required | Description                          |
| --------- | ---------------- | -------- | ------------------------------------ |
| `recipe`  | string / integer | **Yes**  | The TRMNL recipe ID (e.g., `28496`). |

#### Parameter Validation

- The `recipe` query parameter is required. If omitted or empty, the API returns an `HTTP 400 Bad Request` response.

#### Example Request

```http
GET /api/stats?recipe=28496 HTTP/1.1
Host: trmnl-badges.gohk.xyz
Accept: application/json
```

#### Example Successful Response (`HTTP 200 OK`)

```json
{
  "id": 28496,
  "user_id": 3503,
  "name": "Peanuts Comics",
  "icon_url": "https://trmnl-public.s3.us-east-2.amazonaws.com/rq83bcflbrb1vgte2gv0686a6kme",
  "published_at": "2025-03-12T23:35:31.247Z",
  "stats": {
    "installs": 552,
    "forks": 201
  },
  "author": {
    "github_url": null,
    "learn_more_url": null
  }
}
```

#### Field Descriptions

| Field                   | Type           | Description                                              |
| ----------------------- | -------------- | -------------------------------------------------------- |
| `id`                    | integer        | Unique numerical identifier of the TRMNL recipe.         |
| `user_id`               | integer        | Numerical ID of the recipe's author on TRMNL.            |
| `name`                  | string         | Display title of the recipe.                             |
| `icon_url`              | string \| null | URL of the recipe icon asset, or `null` if none is set.  |
| `published_at`          | string         | ISO 8601 timestamp string when the recipe was published. |
| `stats`                 | object         | Upstream usage statistics object.                        |
| `stats.installs`        | integer        | Number of active installations for this recipe.          |
| `stats.forks`           | integer        | Number of forks created from this recipe.                |
| `author`                | object         | Author social and project links.                         |
| `author.github_url`     | string \| null | Author's GitHub repository or profile URL, or `null`.    |
| `author.learn_more_url` | string \| null | Author's external reference URL, or `null`.              |

> **Note on Connections:** The `stats` object contains `installs` and `forks` directly from the upstream TRMNL API. The endpoint does **not** return a precalculated `connections` field. Consumers (such as Shields.io or badge renderers) calculate total connections as `installs + forks`.

#### Expected Error Responses

##### Missing Required Parameter (`HTTP 400 Bad Request`)

Returned when the `recipe` parameter is missing.

```json
{
  "error": "Missing required parameter: recipe"
}
```

##### Recipe Not Found (`HTTP 404 Not Found`)

Returned when the specified recipe ID does not exist on `trmnl.com`.

```json
{
  "error": "Recipe not found"
}
```

> **Deployment Discrepancy Note:** In the current live deployment at `https://trmnl-badges.gohk.xyz`, requests for non-existent recipe IDs return `HTTP 500 Internal Server Error` (`Internal Server Error` plain text) due to upstream redirect handling (upstream `trmnl.com` redirects non-existent recipe JSON requests to `/recipes` with an HTML page). The source implementation handles non-JSON redirect responses to correctly return `HTTP 404`. Redeploying the Worker from the latest source code resolves this discrepancy.

##### Server or Upstream Error (`HTTP 500 Internal Server Error`)

Returned when an unexpected server error occurs or upstream request fails.

---

## 3. User Recipes Endpoint

### `GET /api/recipes`

Fetches all published recipes and aggregated metadata for a specific TRMNL user/author.

#### Parameters

| Parameter | Type             | Required | Description                             |
| --------- | ---------------- | -------- | --------------------------------------- |
| `user_id` | string / integer | **Yes**  | The TRMNL user/author ID (e.g., `364`). |

#### Example Request

```http
GET /api/recipes?user_id=364 HTTP/1.1
Host: trmnl-badges.gohk.xyz
Accept: application/json
```

#### Response Shape

> **Important:** The root response is a JSON **object** containing a `data` array of recipe objects, **not** a raw JSON array.

#### Example Successful Response (`HTTP 200 OK`)

```json
{
  "data": [
    {
      "id": 619,
      "user_id": 364,
      "name": "Dad Jokes",
      "description": null,
      "published_at": "2024-09-19T12:25:09.253Z",
      "icon_url": "https://trmnl.com/images/plugins/private_plugin.svg",
      "icon_content_type": null,
      "screenshot_url": "https://trmnl-public.s3.us-east-2.amazonaws.com/oyda25kgu5vo9fzx39s3b24lbv9r",
      "author_bio": null,
      "custom_fields": [],
      "stats": {
        "installs": 1314,
        "forks": 38
      }
    }
  ]
}
```

#### Field Descriptions

| Field                      | Type             | Description                                            |
| -------------------------- | ---------------- | ------------------------------------------------------ |
| `data`                     | array of objects | List of recipe objects authored by the requested user. |
| `data[].id`                | integer          | Recipe ID.                                             |
| `data[].user_id`           | integer          | User/author ID.                                        |
| `data[].name`              | string           | Recipe title.                                          |
| `data[].description`       | string \| null   | Recipe description, or `null`.                         |
| `data[].published_at`      | string           | ISO 8601 formatted publication timestamp.              |
| `data[].icon_url`          | string \| null   | Icon asset URL.                                        |
| `data[].icon_content_type` | string \| null   | MIME type of icon asset.                               |
| `data[].screenshot_url`    | string \| null   | Screenshot image URL.                                  |
| `data[].author_bio`        | object \| null   | Author bio or metadata if configured.                  |
| `data[].custom_fields`     | array            | Defined custom fields for recipe configuration.        |
| `data[].stats`             | object           | Usage statistics object (`installs` and `forks`).      |

#### Expected Error Responses

##### Missing Required Parameter (`HTTP 400 Bad Request`)

Returned when the `user_id` parameter is missing.

```json
{
  "error": "Missing required parameter: user_id"
}
```

##### User or Recipes Not Found (`HTTP 404 Not Found`)

Returned when no recipes are found for the provided `user_id`.

```json
{
  "error": "No recipes found for this user"
}
```

---

## 4. Caching and Rate Limits

### Caching Behavior and TTLs

- **API Downstream / Browser Cache:** Both `/api/stats` and `/api/recipes` endpoints return the HTTP header:
  ```http
  Cache-Control: public, max-age=3600
  ```
  This instructs downstream consumers, HTTP proxies, and browser caches to cache successful responses for **1 hour (3600 seconds)**.
- **Upstream Fetch Cache:** Upstream requests to `trmnl.com` use Cloudflare edge cache hints (`cacheTtl: 60` seconds) to avoid sending duplicate requests to the origin during spikes.
- **In-Flight Request Deduplication:** Concurrent requests for the same upstream URL within the same Cloudflare Worker isolate are coalesced into a single fetch.

For full architectural details on caching layers and invalidation strategies, see [docs/cache-strategy.md](cache-strategy.md).

### Rate Limits

- **No Explicit Public Rate Limit:** The `trmnl-badges` proxy does **not** enforce an explicit client-facing HTTP request rate limit (such as 429 Too Many Requests).
- **Consumer Usage Guidance:** Integration consumers (such as Shields.io or external dashboard aggregators) should respect the `Cache-Control: public, max-age=3600` header and avoid unnecessary short-interval polling.
- _Note:_ Do not confuse internal Cloudflare edge protection or KV store write limits with a public client API rate limit.

---

## 5. Stability and Ownership

- **Ownership:** `trmnl-badges` is an open-source community project created and maintained by [hossain-khan](https://github.com/hossain-khan) and open-source contributors. It is an independent community proxy and not an official service of TRMNL Inc.
- **Issue Tracker:** Report API bugs, downtime, or integration requests on the [GitHub Issue Tracker](https://github.com/hossain-khan/trmnl-badges/issues).
- **SLA & Guarantees:** This API is provided on a best-effort basis for open-source community integrations. While designed for high availability and low latency, no explicit uptime or SLA guarantees are offered.
