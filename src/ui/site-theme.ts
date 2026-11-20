import { areSpecializationsOn } from '../engine';
import type { GameState, SiteBackground, SiteColors } from '../engine';
import { hexToHsl, mixHex, pickInk, rotateHue, withLightness } from './color-math';
import { findSpecializationAccent } from './sites/specialization-look';

/**
 * The site's colors on the page. One accent becomes the handful of shades every era's page needs: a darker one for
 * links, a pale one for wells and heroes, a light one for dark pages, the text that reads on it, and its neighbours
 * either side on the wheel for gradients. The page is wrapped in `.site-theme` with them as CSS variables; 92-site-theme.css
 * says where each era uses them. Without colors the era keeps its own look.
 */

export interface SitePalette {
  readonly id: string;
  readonly name: string;
  readonly colors: SiteColors;
}

/** Picked to look good on every era's page: none too pale for links, none too loud for a navbar. */
export const SITE_PALETTES: readonly SitePalette[] = [
  { id: 'ocean', name: 'Ocean', colors: { accent: '#1864AB', background: 'white' } },
  { id: 'lagoon', name: 'Lagoon', colors: { accent: '#0C8599', background: 'tint' } },
  { id: 'forest', name: 'Forest', colors: { accent: '#2B8A3E', background: 'cream' } },
  { id: 'sunset', name: 'Sunset', colors: { accent: '#E8590C', background: 'cream' } },
  { id: 'cherry', name: 'Cherry', colors: { accent: '#C2255C', background: 'tint' } },
  { id: 'grape', name: 'Grape', colors: { accent: '#6741D9', background: 'white' } },
  { id: 'midnight', name: 'Midnight', colors: { accent: '#212F4D', background: 'white' } },
  { id: 'honey', name: 'Honey', colors: { accent: '#E67700', background: 'cream' } },
];

export const BACKGROUND_NAMES: Readonly<Record<SiteBackground, string>> = { white: 'White', tint: 'Tinted', cream: 'Cream' };

/** What the picker starts from before you've picked anything. */
export const STARTING_COLORS: SiteColors = { accent: '#1864AB', background: 'white' };

const WHITE = '#FFFFFF';
const BLACK = '#000000';
const CREAM = '#FBF6EC';
const TINT_SHARE = 0.07;
const SOFT_SHARE = 0.14;
const LINE_SHARE = 0.32;
const DEEP_SHARE = 0.18;
/** Links on a light page: never lighter than this, so they read on white. */
const STRONG_LIGHTNESS_LIMIT = 0.36;
const STRONG_SHADE = 0.8;
/** Headings and links on a dark page. */
const LIGHT_LIGHTNESS = 0.74;
/** Boxes on a dark page: the color, nearly black. */
const DARK_LIGHTNESS = 0.16;
/** Neighbours either side on the wheel: orange runs from pink to gold, blue from teal to indigo. Never across it. */
const SECOND_HUE_TURN = 30;
const THIRD_HUE_TURN = -30;

const BACKGROUNDS: Readonly<Record<SiteBackground, (accent: string) => string>> = {
  white: () => WHITE,
  tint: (accent) => mixHex(WHITE, accent, TINT_SHARE),
  cream: () => CREAM,
};

/** A specialized site has the colors a site like it tends to have, until you pick your own. */
function findRouteColors(state: GameState): SiteColors | null {
  const accent = findSpecializationAccent(state);
  return accent === null ? null : { accent, background: STARTING_COLORS.background };
}

/** The colors the page wears: yours, else your specialization's, else none. A first site has none. */
export function findEffectiveColors(state: GameState): SiteColors | null {
  if (!areSpecializationsOn(state)) return null;
  return state.siteColors ?? findRouteColors(state);
}

function darken(accent: string): string {
  return withLightness(accent, Math.min(hexToHsl(accent).lightness * STRONG_SHADE, STRONG_LIGHTNESS_LIMIT));
}

/** Every shade the era stylesheets use, as `--name:value;` pairs for a style attribute. */
export function buildThemeVariables(colors: SiteColors): string {
  const { accent } = colors;
  const light = withLightness(accent, LIGHT_LIGHTNESS);
  const variables: Readonly<Record<string, string>> = {
    '--site-accent': accent,
    '--site-accent-strong': darken(accent),
    '--site-accent-deep': mixHex(accent, BLACK, DEEP_SHARE),
    '--site-accent-soft': mixHex(WHITE, accent, SOFT_SHARE),
    '--site-accent-line': mixHex(WHITE, accent, LINE_SHARE),
    '--site-accent-light': light,
    '--site-accent-dark': withLightness(accent, DARK_LIGHTNESS),
    '--site-accent-ink': pickInk(accent),
    '--site-accent-2': rotateHue(accent, SECOND_HUE_TURN),
    '--site-accent-3': rotateHue(accent, THIRD_HUE_TURN),
    '--site-light-2': rotateHue(light, SECOND_HUE_TURN),
    '--site-light-3': rotateHue(light, THIRD_HUE_TURN),
    '--site-bg': BACKGROUNDS[colors.background](accent),
  };
  return Object.entries(variables).map(([name, value]) => `${name}:${value}`).join(';');
}

/**
 * The page in its theme. From the second site it's always wrapped, so the color picker can preview a color on the
 * page before it's picked; `is-themed` is what switches the era stylesheets over. A first site's page is as it always
 * was.
 */
export function wrapInSiteTheme(state: GameState, html: string): string {
  if (!areSpecializationsOn(state)) return html;
  const colors = findEffectiveColors(state);
  return colors === null ? `<div class="site-theme">${html}</div>` : `<div class="site-theme is-themed" style="${buildThemeVariables(colors)}">${html}</div>`;
}
