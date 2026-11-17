import { SITE_BACKGROUNDS } from '../engine';
import type { GameState, SiteBackground, SiteColors } from '../engine';
import { hexToHsl, hslToHex } from './color-math';
import type { Hsl } from './color-math';
import { escapeHtml } from './dom';
import { BACKGROUND_NAMES, findEffectiveColors, SITE_PALETTES, STARTING_COLORS } from './site-theme';
import type { SitePalette } from './site-theme';

/**
 * The color picker: a row of palettes that look good on every era's page, a wheel with every hue and how much of it,
 * a lightness slider, and three backgrounds. The wheel is drawn in CSS from the current lightness; site-colors-picker.ts
 * makes it pickable.
 */

const PERCENT = 100;
const HALF = 0.5;
const DEGREES_PER_HALF_TURN = 180;
const DEGREES = 360;
export const LIGHTNESS_MIN = 0.2;
export const LIGHTNESS_MAX = 0.8;

/** The colors the picker shows: what the page wears now, or a starting blue. */
export function findPickerColors(state: GameState): SiteColors {
  return findEffectiveColors(state) ?? STARTING_COLORS;
}

/** Where a color sits on the wheel: hue round the rim from the top, saturation out from the centre. */
export function placeOnWheel(hsl: Hsl): { readonly left: number; readonly top: number } {
  const radians = (hsl.hue * Math.PI) / DEGREES_PER_HALF_TURN;
  return { left: (HALF + Math.sin(radians) * hsl.saturation * HALF) * PERCENT, top: (HALF - Math.cos(radians) * hsl.saturation * HALF) * PERCENT };
}

export interface WheelBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/** The hue and saturation under a point on the wheel: the inverse of placeOnWheel. Past the rim counts as the rim. */
export function readWheelPoint(box: WheelBox, x: number, y: number): Pick<Hsl, 'hue' | 'saturation'> {
  const radius = box.width / 2;
  const across = x - (box.left + radius);
  const down = y - (box.top + radius);
  const hue = ((Math.atan2(across, -down) * DEGREES_PER_HALF_TURN) / Math.PI + DEGREES) % DEGREES;
  return { hue, saturation: Math.min(1, Math.hypot(across, down) / radius) };
}

/** The wheel shows hues at half lightness; this layer darkens or lightens it to the slider's lightness, as HSL does. */
export function describeWheelShade(lightness: number): string {
  const amount = Math.abs(2 * lightness - 1).toFixed(2);
  return lightness < HALF ? `rgba(0, 0, 0, ${amount})` : `rgba(255, 255, 255, ${amount})`;
}

export function clampLightness(lightness: number): number {
  return Math.min(LIGHTNESS_MAX, Math.max(LIGHTNESS_MIN, lightness));
}

/** The style that draws the wheel, its marker and the slider for one color. Also used live while dragging. */
export function describeWheelStyle(hsl: Hsl): string {
  const lightness = clampLightness(hsl.lightness);
  const low = hslToHex({ ...hsl, lightness: LIGHTNESS_MIN });
  const middle = hslToHex({ ...hsl, lightness: HALF });
  const high = hslToHex({ ...hsl, lightness: LIGHTNESS_MAX });
  return `--wheel-shade:${describeWheelShade(lightness)};--slider-low:${low};--slider-middle:${middle};--slider-high:${high}`;
}

/** Colors are a plain accent and background, built in the same order everywhere: comparing them as JSON is exact. */
function isSamePalette(state: GameState, palette: SitePalette): boolean {
  return JSON.stringify(state.siteColors) === JSON.stringify(palette.colors);
}

function renderPalette(state: GameState, palette: SitePalette): string {
  const isCurrent = isSamePalette(state, palette);
  return `<button type="button" class="colors-palette" data-action="site-palette" data-id="${palette.id}" aria-pressed="${isCurrent}" style="--swatch:${palette.colors.accent}">
    <span class="colors-palette-swatch" aria-hidden="true"></span><span class="colors-palette-name">${escapeHtml(palette.name)}</span>
  </button>`;
}

function renderBackground(current: SiteBackground, background: SiteBackground): string {
  return `<button type="button" class="colors-background is-${background}" data-action="site-background" data-id="${background}" aria-pressed="${current === background}">${BACKGROUND_NAMES[background]}</button>`;
}

function renderWheel(colors: SiteColors): string {
  const hsl = hexToHsl(colors.accent);
  const marker = placeOnWheel(hsl);
  const lightness = Math.round(clampLightness(hsl.lightness) * PERCENT);
  return `<div class="colors-custom" style="${describeWheelStyle(hsl)}">
    <div class="color-wheel" data-color-wheel role="img" aria-label="Color wheel: drag to pick any color"><span class="color-wheel-marker" style="left:${marker.left.toFixed(1)}%;top:${marker.top.toFixed(1)}%;background:${colors.accent}"></span></div>
    <div class="colors-side">
      <span class="colors-preview" style="background:${colors.accent}" aria-hidden="true"></span>
      <code class="colors-hex">${colors.accent}</code>
      <label class="colors-lightness-label">Lightness<input class="color-lightness" data-color-lightness type="range" min="${LIGHTNESS_MIN * PERCENT}" max="${LIGHTNESS_MAX * PERCENT}" step="1" value="${lightness}"></label>
    </div>
  </div>`;
}

/** Your own pick can be undone; a specialization's colors are the page's own. */
function renderReset(state: GameState): string {
  return `<button type="button" class="colors-reset" data-action="site-colors-reset"${state.siteColors === null ? ' disabled' : ''}>Back to the page’s own colors</button>`;
}

export function renderSiteColorsPanel(state: GameState): string {
  const colors = findPickerColors(state);
  return `<div class="colors-head"><b class="colors-title">Your site’s colors</b><button type="button" class="colors-close" data-action="toggle-colors" aria-label="Close">×</button></div>
    <p class="colors-intro">Every era’s page wears them. The Web Attic keeps the colors each year had.</p>
    <div class="colors-palettes">${SITE_PALETTES.map((palette) => renderPalette(state, palette)).join('')}</div>
    ${renderWheel(colors)}
    <div class="colors-backgrounds" role="group" aria-label="Background">${SITE_BACKGROUNDS.map((background) => renderBackground(colors.background, background)).join('')}</div>
    ${renderReset(state)}`;
}

/** What the panel's markup depends on. */
export function calculateColorsSignature(state: GameState, isOpen: boolean): string {
  return isOpen ? `${state.eraId}|${state.specializationId}|${JSON.stringify(state.siteColors)}` : 'closed';
}
