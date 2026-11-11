/**
 * The arithmetic of a touchscreen swipe, kept apart from the DOM so it can be tested: how fast the finger
 * moved, how a flick glides on and slows down, and when a press was a tap rather than a swipe.
 * Velocities are in screen pixels per millisecond.
 */

/** How much of the newest movement counts when smoothing the speed: the rest is the speed so far. */
const VELOCITY_SMOOTHING = 0.8;
/** A finger held still this long before letting go stops the page instead of flicking it. */
const HOLD_BEFORE_RELEASE_MS = 80;
/** Per millisecond of gliding, the speed keeps this share: about 0.9 s from a fast flick to a stop. */
const GLIDE_FRICTION_PER_MS = 0.995;
/** Slower than this, the glide is over. */
const SETTLED_SPEED = 0.02;
/** A press that moves less than this is a tap: buttons under it still get clicked. */
export const TAP_SLOP_PX = 6;

export function smoothSwipeVelocity(previousVelocity: number, deltaPx: number, elapsedMs: number): number {
  return elapsedMs > 0 ? VELOCITY_SMOOTHING * (deltaPx / elapsedMs) + (1 - VELOCITY_SMOOTHING) * previousVelocity : previousVelocity;
}

/** The speed the page leaves the finger with: none if the finger stopped before it let go. */
export function releaseSwipeVelocity(velocity: number, msSinceLastMove: number): number {
  return msSinceLastMove > HOLD_BEFORE_RELEASE_MS ? 0 : velocity;
}

export function decaySwipeVelocity(velocity: number, elapsedMs: number): number {
  return velocity * GLIDE_FRICTION_PER_MS ** elapsedMs;
}

export function isSwipeSettled(velocity: number): boolean {
  return Math.abs(velocity) < SETTLED_SPEED;
}

export function isTap(distancePx: number): boolean {
  return distancePx < TAP_SLOP_PX;
}
