import { badgen } from 'badgen';
import type { BadgeOptions, TRMNLGlyph } from './types';

// TRMNL glyph variants
// Source: https://trmnl.com/brand
const trmnlGlyphs: Record<TRMNLGlyph, string> = {
  brand: `<svg viewBox="0 0 160 162" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M43.2322 11.3438L85.6168 27.2379L77.7459 48.2271L35.3613 32.3328L43.2322 11.3438Z" fill="#F8654B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M111.192 6.1543L125.192 49.2018L103.875 56.1345L89.875 13.0871L111.192 6.1543Z" fill="#F8654B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M157.609 56.0668L132.682 93.8519L113.971 81.5078L138.898 43.7227L157.609 56.0668Z" fill="#F8654B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M147.533 123.466L102.449 127.536L100.434 105.211L145.517 101.141L147.533 123.466Z" fill="#F8654B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M88.5468 157.611L57.2559 124.901L73.4541 109.406L104.745 142.116L88.5468 157.611Z" fill="#F8654B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.0723 132.804L31.1366 87.9453L53.3508 90.9484L47.2865 135.808L25.0723 132.804Z" fill="#F8654B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M4.9082 67.6809L43.7612 44.4531L55.2636 63.6933L16.4107 86.921L4.9082 67.6809Z" fill="#F8654B"/></svg>`,
  black: `<svg viewBox="0 0 160 162" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M43.2322 11.3438L85.6168 27.2379L77.7459 48.2271L35.3613 32.3328L43.2322 11.3438Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M111.192 6.1543L125.192 49.2018L103.875 56.1345L89.875 13.0871L111.192 6.1543Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M157.609 56.0686L132.682 93.8537L113.971 81.5097L138.898 43.7246L157.609 56.0686Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M147.533 123.467L102.449 127.536L100.434 105.211L145.517 101.141L147.533 123.467Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M88.5468 157.611L57.2559 124.901L73.4541 109.406L104.745 142.116L88.5468 157.611Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.0723 132.804L31.1366 87.9453L53.3508 90.9484L47.2865 135.808L25.0723 132.804Z" fill="black"/><path fill-rule="evenodd" clip-rule="evenodd" d="M4.9082 67.6808L43.7612 44.4531L55.2636 63.6933L16.4107 86.921L4.9082 67.6808Z" fill="black"/></svg>`,
  white: `<svg viewBox="0 0 160 162" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M43.2322 11.3438L85.6168 27.238L77.7459 48.227L35.3613 32.3328L43.2322 11.3438Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M111.192 6.1543L125.192 49.2018L103.875 56.1345L89.875 13.0871L111.192 6.1543Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M157.61 56.0687L132.682 93.8538L113.971 81.5097L138.898 43.7246L157.61 56.0687Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M147.533 123.467L102.449 127.537L100.434 105.211L145.517 101.141L147.533 123.467Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M88.5488 157.611L57.2578 124.901L73.4561 109.406L104.747 142.116L88.5488 157.611Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.0723 132.802L31.1366 87.9434L53.3508 90.9465L47.2866 135.805L25.0723 132.802Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M4.9082 67.6828L43.7612 44.4551L55.2637 63.6953L16.4107 86.923L4.9082 67.6828Z" fill="white"/></svg>`,
};

// Base64 encode for data URI (Cloudflare Workers compatible)
function base64Encode(str: string): string {
  // Cloudflare Workers supports btoa globally
  return btoa(str);
}

function getGlyphDataUri(glyph: TRMNLGlyph = 'brand'): string {
  return 'data:image/svg+xml;base64,' + base64Encode(trmnlGlyphs[glyph]);
}

// TRMNL brand colors
// Source: https://trmnl.com/brand
const TRMNL_ORANGE = 'F8654B';
const TRMNL_DARK_GRAY = '3D3D3E';

/**
 * Generate a TRMNL-themed badge using badgen
 */
export function generateBadge(options: BadgeOptions): string {
  const {
    label,
    message,
    color = TRMNL_ORANGE,
    labelColor = TRMNL_DARK_GRAY,
    glyph,
    logo,
    scale,
  } = options;

  return badgen({
    label,
    status: message,
    color,
    labelColor,
    icon: logo || getGlyphDataUri(glyph),
    scale,
  });
}

/**
 * Generate an error badge with a red/warning color
 * Used when recipe is not found or API call fails
 */
export function generateErrorBadge(label: string, errorMessage: string): string {
  return badgen({
    label,
    status: errorMessage,
    color: 'red',
    labelColor: TRMNL_DARK_GRAY,
    icon: getGlyphDataUri('brand'),
  });
}
