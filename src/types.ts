/**
 * TRMNL Recipe data returned from the TRMNL API
 * Represents a complete recipe/plugin available on the TRMNL platform
 *
 * Sample URL: https://trmnl.com/recipes/240176.json
 *
 * @example
 * {
 *   "id": 240176,
 *   "user_id": 29,
 *   "name": "Kung Fu Panda Quotes",
 *   "published_at": "2026-02-09T07:45:36.616Z",
 *   "stats": {
 *     "installs": 7,
 *     "forks": 5
 *   },
 *   "author_bio": {
 *     "github_url": "https://github.com/hossain-khan/trmnl-kung-fu-panda-quotes",
 *     "learn_more_url": "https://hossain-khan.github.io/trmnl-kung-fu-panda-quotes"
 *   }
 * }
 */
export interface TRMNLRecipe {
  /** Unique recipe identifier */
  id: number;
  /** User ID of the recipe author */
  user_id: number;
  /** Human-readable recipe name */
  name: string;
  /** ISO 8601 timestamp when recipe was published */
  published_at: string;
  /** Engagement statistics for the recipe */
  stats: {
    /** Number of times the recipe has been installed */
    installs: number;
    /** Number of times the recipe has been forked */
    forks: number;
  };
  /** URL to the recipe's icon/thumbnail image */
  icon_url?: string;
  /** URL to the recipe's screenshot/preview image */
  screenshot_url?: string;
  /** Author metadata and contact information */
  author_bio?: {
    /** Brief description of the recipe */
    description?: string;
    /** GitHub profile URL of the author */
    github_url?: string;
    /** URL to learn more about the recipe */
    learn_more_url?: string;
    /** Author's email address */
    email_address?: string;
    /** Recipe category classification */
    category?: string;
  };
}

/**
 * Options for generating SVG badges
 * Used by the badge generation service to customize appearance
 */
export interface BadgeOptions {
  /** Left-side label text of the badge */
  label: string;
  /** Right-side message/value text of the badge */
  message: string;
  /** Right-side background color (hex or named color, default: brightgreen) */
  color?: string;
  /** Left-side background color (hex or named color, default: dark gray) */
  labelColor?: string;
  /** SVG logo/icon to display on the badge (default: TRMNL logo) */
  logo?: string;
}

/**
 * shields.io compatible endpoint response for health status badge
 * @see https://shields.io/endpoint
 */
export interface HealthBadgeResponse {
  /** Schema version identifier (always 1 for shields.io) */
  schemaVersion: 1;
  /** Left-side label text */
  label: string;
  /** Right-side status message */
  message: string;
  /** Right-side background color */
  color: string;
}

export type Bindings = {
  NODE_ENV: string;
  /**
   * 🎉 Fun tracking feature: KV store to track total badges served
   * Used to display a fun counter of how many badges have been generated
   */
  BADGE_COUNTER: KVNamespace;
};
