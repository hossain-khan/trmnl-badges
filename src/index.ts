import { Hono } from "hono";
import type { Bindings } from "./types";
import { fetchRecipe } from "./trmnl-api";
import { generateBadge } from "./badge-generator";
import { formatNumber } from "./utils";

// 🎉 Fun tracking feature: KV store key for total badges served counter
const BADGES_SERVED_COUNTER_KEY = "badges_served_total";

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// Badge endpoints for TRMNL recipes
app.get("/badge/installs", async (c) => {
  const { recipe, label, pretty } = c.req.query();

  if (!recipe) {
    return c.text("Missing required parameter: recipe", 400);
  }

  const recipeData = await fetchRecipe(recipe);

  if (!recipeData) {
    return c.text("Recipe not found", 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || "Installs",
    message: formatNumber(recipeData.stats.installs, isPretty),
  });

  // 🎉 Fun tracking feature: Increment counter for this badge request
  incrementBadgeCounter(c.env).catch((err) =>
    console.error("Failed to increment counter:", err),
  );

  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(badge);
});

app.get("/badge/forks", async (c) => {
  const { recipe, label, pretty } = c.req.query();

  if (!recipe) {
    return c.text("Missing required parameter: recipe", 400);
  }

  const recipeData = await fetchRecipe(recipe);

  if (!recipeData) {
    return c.text("Recipe not found", 404);
  }

  const isPretty = pretty !== undefined;
  const badge = generateBadge({
    label: label || "Forks",
    message: formatNumber(recipeData.stats.forks, isPretty),
  });

  // 🎉 Fun tracking feature: Increment counter for this badge request
  incrementBadgeCounter(c.env).catch((err) =>
    console.error("Failed to increment counter:", err),
  );

  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(badge);
});

// API endpoint for TRMNL recipe stats
app.get("/api/stats", async (c) => {
  const { recipe } = c.req.query();

  if (!recipe) {
    return c.json({ error: "Missing required parameter: recipe" }, 400);
  }

  const recipeData = await fetchRecipe(recipe);

  if (!recipeData) {
    return c.json({ error: "Recipe not found" }, 404);
  }

  const stats = {
    id: recipeData.id,
    name: recipeData.name,
    published_at: recipeData.published_at,
    stats: {
      installs: recipeData.stats.installs,
      forks: recipeData.stats.forks,
    },
    author: {
      github_url: recipeData.author_bio?.github_url || null,
      learn_more_url: recipeData.author_bio?.learn_more_url || null,
    },
  };

  c.header("Cache-Control", "public, max-age=3600");
  return c.json(stats);
});

///////////////////////////////////////////////////////////
// Utility endpoints for status, testing and development
///////////////////////////////////////////////////////////

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    projectUrl: "https://github.com/hossain-khan/trmnl-badges",
  });
});

// Health badge endpoint for shields.io
app.get("/health-badge", (c) => {
  return c.json({
    schemaVersion: 1,
    label: "TRMNL Badge Service",
    message: "Online",
    color: "brightgreen",
  });
});

/**
 * 🎉 Fun tracking feature: Increment the total badge counter
 *
 * NOTE: This counter uses approximate counting due to potential race conditions
 * in KV operations. Multiple concurrent requests may result in lost updates.
 *
 * Example race condition:
 * - Request A reads count = 5
 * - Request B reads count = 5 (before A writes)
 * - Request A writes count = 6
 * - Request B writes count = 6 (instead of 7)
 *
 * This is acceptable for a fun, non-critical metric. For production counting,
 * consider using Durable Objects with strong consistency guarantees.
 *
 * @param env Cloudflare Workers bindings
 * @returns The new count value (approximate)
 */
async function incrementBadgeCounter(env: Bindings): Promise<number> {
  const currentValue = await env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
  const count = currentValue ? parseInt(currentValue, 10) : 0;
  const newCount = count + 1;
  await env.BADGE_COUNTER.put(BADGES_SERVED_COUNTER_KEY, newCount.toString());
  return newCount;
}

app.get("/", (c) => {
  if (c.env.NODE_ENV === "production") {
    return c.redirect("https://github.com/hossain-khan/trmnl-badges");
  } else {
    return c.text("TRMNL Badges API - Development Mode");
  }
});

// 🎉 Fun tracking feature: Badge showing total badges served
app.get("/badge/counter", async (c) => {
  const counterValue = await c.env.BADGE_COUNTER.get(BADGES_SERVED_COUNTER_KEY);
  const count = counterValue ? parseInt(counterValue, 10) : 0;

  const badge = generateBadge({
    label: "Badges Served",
    message: formatNumber(count, true),
    color: "blueviolet",
  });

  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
  return c.body(badge);
});

export default app;
