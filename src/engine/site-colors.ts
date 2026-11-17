import type { GameState, SiteBackground, SiteColors } from './types';

/**
 * The site's own colors, the player's choice: one accent color, from anywhere on the color wheel, and a background
 * that keeps every era's page readable. Picking none keeps the era's own look. The archive keeps each era's choice,
 * so the page you finished 2005 with is the page it shows again.
 */
export const SITE_BACKGROUNDS: readonly SiteBackground[] = ['white', 'tint', 'cream'];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function isSiteBackground(value: string): value is SiteBackground {
  return (SITE_BACKGROUNDS as readonly string[]).includes(value);
}

/** Null goes back to the era's own look; anything that isn't a color is ignored. */
export function chooseSiteColors(state: GameState, colors: SiteColors | null): GameState {
  const isValid = colors === null || isHexColor(colors.accent);
  return isValid ? { ...state, siteColors: colors === null ? null : { accent: colors.accent.toUpperCase(), background: colors.background } } : state;
}
