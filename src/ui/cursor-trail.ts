import { findCursorTier, toCursorValue } from './cursors';
import type { CursorTier, CursorTrail } from './cursors';

/**
 * The custom cursor over the site, and the trail behind it from the third tier on. The site keeps its own pointer
 * listener, so re-rendering the page never drops it; the trail is a fixed layer of short-lived particles that never
 * catches a click.
 */

/** One particle every this often, at most: a trail, not a flood. */
const TRAIL_INTERVAL_MS = 32;
const MAX_PARTICLES = 40;
/** At the top tier, every few particles is a copy of the pointer itself chasing the cat. */
const POINTER_COPY_EVERY = 3;

export interface CursorTrailController {
  /** The level of the custom cursor feature, and whether the site is shown on a phone (no pointer there). */
  readonly update: (level: number, isPhoneView: boolean) => void;
}

const PARTICLE_TEXT: Readonly<Record<CursorTrail, string>> = {
  none: '',
  sparkles: '✨',
  fire: '🔥',
  rainbow: '',
};

function pickParticleKind(trail: CursorTrail, count: number): string {
  const isPointerCopy = trail === 'rainbow' && count % POINTER_COPY_EVERY === 0;
  return isPointerCopy ? 'pointer' : trail;
}

function spawnParticle(layer: HTMLElement, trail: CursorTrail, count: number, event: PointerEvent): void {
  if (layer.childElementCount >= MAX_PARTICLES) layer.firstElementChild?.remove();
  const particle = document.createElement('span');
  particle.className = `cursor-particle cursor-particle--${pickParticleKind(trail, count)}`;
  particle.textContent = PARTICLE_TEXT[trail];
  particle.style.left = `${event.clientX}px`;
  particle.style.top = `${event.clientY}px`;
  particle.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 10}px`);
  particle.addEventListener('animationend', () => particle.remove());
  layer.append(particle);
}

export function createCursorTrail(site: HTMLElement): CursorTrailController {
  const layer = document.createElement('div');
  layer.className = 'cursor-trail-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  let tier: CursorTier | null = null;
  let trail: CursorTrail = 'none';
  let lastSpawnAt = 0;
  let count = 0;

  /** A mouse (fingers leave no trail), a tier with a trail, and long enough since the last particle. */
  const isTrailDue = (event: PointerEvent): boolean => trail !== 'none' && event.pointerType === 'mouse' && event.timeStamp - lastSpawnAt >= TRAIL_INTERVAL_MS;

  site.addEventListener('pointermove', (event) => {
    if (!isTrailDue(event)) return;
    lastSpawnAt = event.timeStamp;
    count += 1;
    spawnParticle(layer, trail, count, event);
  });

  const apply = (next: CursorTier | null): void => {
    tier = next;
    trail = next === null ? 'none' : next.trail;
    site.toggleAttribute('data-custom-cursor', next !== null);
    site.style.setProperty('--site-cursor', next === null ? 'auto' : toCursorValue(next));
  };

  const update = (level: number, isPhoneView: boolean): void => {
    const next = isPhoneView ? null : findCursorTier(level);
    if (next !== tier) apply(next);
  };

  return { update };
}
