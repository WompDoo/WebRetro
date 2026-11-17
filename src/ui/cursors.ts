/**
 * Custom cursors, the late-90s way: the pointer over your site replaced by something worse every few levels. Five
 * tiers, each more outrageous; from the third on, a trail follows the pointer around the page.
 */

export type CursorTrail = 'none' | 'sparkles' | 'fire' | 'rainbow';

export interface CursorTier {
  readonly level: number;
  readonly name: string;
  readonly svg: string;
  /** Where the click lands, in the 32 px image. */
  readonly hotspotX: number;
  readonly hotspotY: number;
  readonly trail: CursorTrail;
}

const svg = (body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${body}</svg>`;

const ARROW_PATH = 'M3 2 L3 25 L9 19.5 L13.5 29 L17.5 27.2 L13.2 18 L21 18 Z';

const LIME_ARROW: CursorTier = {
  level: 1,
  name: 'Lime arrow',
  svg: svg(`<path d="${ARROW_PATH}" fill="#7CFF2E" stroke="#000" stroke-width="2" stroke-linejoin="round"/>`),
  hotspotX: 3,
  hotspotY: 2,
  trail: 'none',
};

export const CURSOR_TIERS: readonly CursorTier[] = [
  LIME_ARROW,
  {
    level: 5,
    name: 'Magic wand',
    svg: svg(
      '<path d="M10 10 L29 29" stroke="#000" stroke-width="5" stroke-linecap="round"/><path d="M10 10 L29 29" stroke="#8B4BFF" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M7 1 L9 5.5 L14 6 L10.2 9.2 L11.4 14 L7 11.4 L2.6 14 L3.8 9.2 L0 6 L5 5.5 Z" fill="#FFE12E" stroke="#000" stroke-width="1.2"/>',
    ),
    hotspotX: 7,
    hotspotY: 7,
    trail: 'none',
  },
  {
    level: 15,
    name: 'Glitter arrow',
    svg: svg(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD1F5"/><stop offset="1" stop-color="#FF2EC4"/></linearGradient></defs><path d="${ARROW_PATH}" fill="url(#g)" stroke="#000" stroke-width="2" stroke-linejoin="round"/>` +
        '<circle cx="7" cy="12" r="1.3" fill="#fff"/><circle cx="10" cy="17" r="1" fill="#fff"/><circle cx="6" cy="20" r="0.9" fill="#fff"/><path d="M26 4 L27 7 L30 8 L27 9 L26 12 L25 9 L22 8 L25 7 Z" fill="#FFF36B" stroke="#000" stroke-width="0.8"/>',
    ),
    hotspotX: 3,
    hotspotY: 2,
    trail: 'sparkles',
  },
  {
    level: 30,
    name: 'Flaming sword',
    svg: svg(
      '<path d="M2 2 L6 13 L20 27 L27 20 L13 6 Z" fill="#FFB21A" opacity="0.85"/><path d="M1 1 L9 14 L18 23 L23 18 L14 9 Z" fill="#FF5A1F" opacity="0.7"/>' +
        '<path d="M2 2 L15 9 L23 17 L17 23 L9 15 Z" fill="#E6EDF5" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M16 26 L26 16" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M16 26 L26 16" stroke="#C99A2E" stroke-width="2.2" stroke-linecap="round"/><path d="M24 24 L30 30" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M24 24 L30 30" stroke="#7A3B12" stroke-width="2.2" stroke-linecap="round"/>',
    ),
    hotspotX: 2,
    hotspotY: 2,
    trail: 'fire',
  },
  {
    level: 60,
    name: 'Rainbow cat',
    svg: svg(
      '<rect x="0" y="9" width="12" height="2.4" fill="#FF3B3B"/><rect x="0" y="11.4" width="12" height="2.4" fill="#FF9F1A"/><rect x="0" y="13.8" width="12" height="2.4" fill="#FFE12E"/><rect x="0" y="16.2" width="12" height="2.4" fill="#3BD16F"/><rect x="0" y="18.6" width="12" height="2.4" fill="#2E8BFF"/><rect x="0" y="21" width="12" height="2.4" fill="#8B4BFF"/>' +
        '<rect x="10" y="8" width="16" height="16" rx="2" fill="#F7B6E8" stroke="#000" stroke-width="1.5"/>' +
        '<path d="M17 9 L19 4 L22 9 Z M24 9 L27 4 L29 9 Z" fill="#9AA3AD" stroke="#000" stroke-width="1"/><rect x="16" y="9" width="14" height="11" rx="2" fill="#9AA3AD" stroke="#000" stroke-width="1.2"/>' +
        '<rect x="19" y="12" width="2" height="2" fill="#000"/><rect x="25" y="12" width="2" height="2" fill="#000"/><rect x="18" y="15.5" width="2" height="1.6" fill="#FF7AC8"/><rect x="26" y="15.5" width="2" height="1.6" fill="#FF7AC8"/><path d="M21.5 16 L23 17 L24.5 16" stroke="#000" stroke-width="1" fill="none"/>',
    ),
    hotspotX: 16,
    hotspotY: 16,
    trail: 'rainbow',
  },
];

/** The cursor this many levels buys: the last tier you've reached, or none before level 1. */
export function findCursorTier(level: number): CursorTier | null {
  return [...CURSOR_TIERS].reverse().find((tier) => level >= tier.level) ?? null;
}

/** The cursor the "Get this cursor!" box shows: the one you have, or the first one. */
export function findShownCursorTier(level: number): CursorTier {
  return findCursorTier(level) ?? LIME_ARROW;
}

/** What the next tier is, for the box: at the top, nothing could top the cat. */
export function describeNextCursorTier(level: number): string {
  const next = findNextCursorTier(level);
  return next === null ? 'Nothing could top this.' : `Level ${next.level}: ${next.name}`;
}

/** The next one up, to aim for. Null at the top: nothing could top the cat. */
export function findNextCursorTier(level: number): CursorTier | null {
  return CURSOR_TIERS.find((tier) => tier.level > level) ?? null;
}

export function toCursorImage(tier: CursorTier): string {
  return `url('data:image/svg+xml,${encodeURIComponent(tier.svg)}')`;
}

/** The CSS cursor value: the picture, where it clicks, and the usual pointer if the browser won't draw it. */
export function toCursorValue(tier: CursorTier): string {
  return `${toCursorImage(tier)} ${tier.hotspotX} ${tier.hotspotY}, auto`;
}
