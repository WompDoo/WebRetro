/**
 * The achievements window's hover tip. It lives outside the scrolling card, fixed to the screen, so a tile in the top
 * row or at either end shows all of it: inside the card, the card's own scrolling cut it off. It sits above the tile,
 * or below when there's no room above, and never past the screen's edges. Only on a device that can hover; a phone
 * taps, and the bar under the tiles says what the tile is.
 */

const GAP_PX = 8;
const EDGE_PX = 8;

export interface TipPlacement {
  readonly left: number;
  readonly top: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

/** Above the tile, centered on it; below when it won't fit above; kept inside the screen sideways. */
export function placeTip(tile: Pick<DOMRect, 'left' | 'top' | 'bottom' | 'width'>, tip: Size, screen: Size): TipPlacement {
  const above = tile.top - GAP_PX - tip.height;
  const centered = tile.left + tile.width / 2 - tip.width / 2;
  return {
    left: Math.min(Math.max(centered, EDGE_PX), screen.width - tip.width - EDGE_PX),
    top: above >= EDGE_PX ? above : tile.bottom + GAP_PX,
  };
}

function hideTip(tip: HTMLElement): void {
  tip.hidden = true;
}

function showTipFor(tile: HTMLElement, tip: HTMLElement): void {
  const text = tile.querySelector('.badge-tip');
  if (text === null) return hideTip(tip);
  tip.innerHTML = text.innerHTML;
  tip.hidden = false;
  const placement = placeTip(tile.getBoundingClientRect(), tip.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
  tip.style.left = `${placement.left}px`;
  tip.style.top = `${placement.top}px`;
}

function findTile(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('.badge') : null;
}

function followPointer(event: MouseEvent, tip: HTMLElement): void {
  const tile = findTile(event.target);
  if (tile === null) hideTip(tip);
  else showTipFor(tile, tip);
}

export function attachBadgeTooltip(card: HTMLElement, tip: HTMLElement): void {
  if (!window.matchMedia('(hover: hover)').matches) return;
  card.addEventListener('mouseover', (event) => followPointer(event, tip));
  card.addEventListener('mouseleave', () => hideTip(tip));
  card.addEventListener('scroll', () => hideTip(tip));
}
