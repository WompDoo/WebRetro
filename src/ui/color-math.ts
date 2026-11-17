/**
 * Colors as the site's theme needs them: hex in and out, HSL for the wheel, and the few derived shades a page uses
 * (darker for links, a pale tint for backgrounds, text that reads on the accent).
 */

export interface Hsl {
  /** 0–360, round the wheel from red. */
  readonly hue: number;
  /** 0–1, from grey at the centre to full color at the rim. */
  readonly saturation: number;
  /** 0–1, from black to white. */
  readonly lightness: number;
}

type Rgb = readonly [number, number, number];

const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const HEX_PAIR_LENGTH = 2;
const RED_START = 1;
const GREEN_START = 3;
const BLUE_START = 5;
const DEGREES = 360;
const SECTOR_DEGREES = 60;
const HUE_SECTORS = 6;
const GREEN_SECTOR_OFFSET = 2;
const BLUE_SECTOR_OFFSET = 4;

function parseChannel(hex: string, start: number): number {
  return Number.parseInt(hex.slice(start, start + HEX_PAIR_LENGTH), HEX_RADIX) / CHANNEL_MAX;
}

/** "#RRGGBB" to channels from 0 to 1. */
function hexToRgb(hex: string): Rgb {
  return [parseChannel(hex, RED_START), parseChannel(hex, GREEN_START), parseChannel(hex, BLUE_START)];
}

function formatChannel(channel: number): string {
  const clamped = Math.min(1, Math.max(0, channel));
  return Math.round(clamped * CHANNEL_MAX).toString(HEX_RADIX).padStart(HEX_PAIR_LENGTH, '0');
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map(formatChannel).join('')}`.toUpperCase();
}

/** Which sixth of the wheel the color is in, from whichever channel is strongest. */
const SECTOR_BY_STRONGEST_CHANNEL: readonly ((rgb: Rgb, spread: number) => number)[] = [
  ([, green, blue], spread) => ((green - blue) / spread + HUE_SECTORS) % HUE_SECTORS,
  ([red, , blue], spread) => (blue - red) / spread + GREEN_SECTOR_OFFSET,
  ([red, green], spread) => (red - green) / spread + BLUE_SECTOR_OFFSET,
];

function calculateHue(rgb: Rgb, strongest: number, spread: number): number {
  const sector = SECTOR_BY_STRONGEST_CHANNEL[Math.max(0, rgb.indexOf(strongest))];
  return sector(rgb, spread) * SECTOR_DEGREES;
}

export function hexToHsl(hex: string): Hsl {
  const rgb = hexToRgb(hex);
  const strongest = Math.max(...rgb);
  const weakest = Math.min(...rgb);
  const lightness = (strongest + weakest) / 2;
  const spread = strongest - weakest;
  if (spread === 0) return { hue: 0, saturation: 0, lightness };
  return { hue: calculateHue(rgb, strongest, spread), saturation: spread / (1 - Math.abs(2 * lightness - 1)), lightness };
}

const RED_OFFSET = 0;
const GREEN_OFFSET = 8;
const BLUE_OFFSET = 4;
const HUE_STEPS = 12;
const HUE_STEP_DEGREES = 30;
const RISE_STEP = 3;
const FALL_STEP = 9;

/** The standard HSL-to-RGB curve, one channel at a time: no branches, just clamps. */
function hslChannel(hsl: Hsl, offset: number): number {
  const chroma = hsl.saturation * Math.min(hsl.lightness, 1 - hsl.lightness);
  const step = (offset + hsl.hue / HUE_STEP_DEGREES) % HUE_STEPS;
  return hsl.lightness - chroma * Math.max(-1, Math.min(step - RISE_STEP, FALL_STEP - step, 1));
}

export function hslToHex(hsl: Hsl): string {
  const hue = ((hsl.hue % DEGREES) + DEGREES) % DEGREES;
  const normalized = { ...hsl, hue };
  return rgbToHex([hslChannel(normalized, RED_OFFSET), hslChannel(normalized, GREEN_OFFSET), hslChannel(normalized, BLUE_OFFSET)]);
}

/** Part of one color over another: 0 is all `base`, 1 is all `over`. */
export function mixHex(base: string, over: string, share: number): string {
  const from = hexToRgb(base);
  const to = hexToRgb(over);
  const blend = (index: 0 | 1 | 2): number => from[index] * (1 - share) + to[index] * share;
  return rgbToHex([blend(0), blend(1), blend(2)]);
}

const LINEAR_THRESHOLD = 0.03928;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA = 2.4;
const LUMINANCE_WEIGHTS: Rgb = [0.2126, 0.7152, 0.0722];
const CONTRAST_FLARE = 0.05;
const WHITE_LUMINANCE = 1;

function linearize(channel: number): number {
  return channel <= LINEAR_THRESHOLD ? channel / LINEAR_DIVISOR : ((channel + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA;
}

/** WCAG's relative luminance: how bright a color looks, 0 for black and 1 for white. */
export function calculateLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);
  const [redWeight, greenWeight, blueWeight] = LUMINANCE_WEIGHTS;
  return linearize(red) * redWeight + linearize(green) * greenWeight + linearize(blue) * blueWeight;
}

export const LIGHT_INK = '#FFFFFF';
export const DARK_INK = '#111111';

/** White or near-black, whichever reads better on this color. */
export function pickInk(background: string): string {
  const luminance = calculateLuminance(background);
  const onWhite = (WHITE_LUMINANCE + CONTRAST_FLARE) / (luminance + CONTRAST_FLARE);
  const onBlack = (luminance + CONTRAST_FLARE) / CONTRAST_FLARE;
  return onWhite >= onBlack ? LIGHT_INK : DARK_INK;
}

/** The same color turned round the wheel, for gradients that go somewhere. */
export function rotateHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, hue: hsl.hue + degrees });
}

/** The same hue and saturation at another lightness, from 0 (black) to 1 (white). */
export function withLightness(hex: string, lightness: number): string {
  return hslToHex({ ...hexToHsl(hex), lightness });
}
