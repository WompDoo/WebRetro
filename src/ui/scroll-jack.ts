/**
 * The rules of a scroll-jacking section, apart from the DOM so they can be tested. Positions are the page's
 * scrollTop. Inside the section every scroll gesture moves one stop, however big it was: the page sets the pace,
 * not the reader. Scrolling into the section stops at its edge; past the last stop the page scrolls on as usual.
 * A wheel gesture is taken over before it moves anything (findJackedStop); every other kind of scrolling is
 * held back after the fact (clampToGesture), and settles on a chapter when it comes to rest (findSettleStop).
 */
export interface StoryZone {
  /** Where the section's first chapter fills the band, and where its last one does. */
  readonly start: number;
  readonly end: number;
  /** How much of the page is on screen: once the section is that close, it takes over. */
  readonly viewportHeight: number;
  /** One stop per chapter, from start to end. */
  readonly stops: readonly number[];
}

/** Rounding slack: a page within a pixel of a stop is at that stop. */
const SLACK_PX = 1;

export function createStoryZone(start: number, travel: number, chapters: number, viewportHeight: number): StoryZone {
  const steps = Math.max(1, chapters - 1);
  const stops = Array.from({ length: steps + 1 }, (_, index) => start + (travel * index) / steps);
  return { start, end: start + travel, viewportHeight, stops };
}

/** 0 at the first chapter, 1 at the last, clamped either side. */
export function calculateStoryProgress(scrollTop: number, zone: StoryZone): number {
  return Math.min(1, Math.max(0, (scrollTop - zone.start) / Math.max(1, zone.end - zone.start)));
}

function nextStopAfter(scrollTop: number, zone: StoryZone): number | null {
  return zone.stops.find((stop) => stop > scrollTop + SLACK_PX) ?? null;
}

function previousStopBefore(scrollTop: number, zone: StoryZone): number | null {
  return [...zone.stops].reverse().find((stop) => stop < scrollTop - SLACK_PX) ?? null;
}

function isAboveZone(scrollTop: number, zone: StoryZone): boolean {
  return scrollTop < zone.start - SLACK_PX;
}

function isBelowZone(scrollTop: number, zone: StoryZone): boolean {
  return scrollTop > zone.end + SLACK_PX;
}

/** The furthest one gesture down may take the page: into the section from above, else on to the next chapter. */
function downwardLimit(scrollTop: number, zone: StoryZone): number | null {
  return isAboveZone(scrollTop, zone) ? zone.start : nextStopAfter(scrollTop, zone);
}

function upwardLimit(scrollTop: number, zone: StoryZone): number | null {
  return isBelowZone(scrollTop, zone) ? zone.end : previousStopBefore(scrollTop, zone);
}

type LimitRule = (scrollTop: number, zone: StoryZone) => number | null;

function limitFor(deltaY: number): LimitRule {
  return deltaY > 0 ? downwardLimit : upwardLimit;
}

/** The section is on screen, or the page is inside it. */
function isInReach(scrollTop: number, zone: StoryZone): boolean {
  return scrollTop > zone.start - zone.viewportHeight && scrollTop < zone.end + zone.viewportHeight;
}

function findLimitInReach(scrollTop: number, deltaY: number, zone: StoryZone): number | null {
  return isInReach(scrollTop, zone) ? limitFor(deltaY)(scrollTop, zone) : null;
}

/**
 * Where a wheel gesture takes the page, if the section takes it over; null when it doesn't and the page
 * should scroll normally. Once the section is on screen, scrolling towards it brings it into place.
 * Only the gesture's direction counts: browsers don't agree on what a wheel's delta means.
 */
export function findJackedStop(scrollTop: number, deltaY: number, zone: StoryZone): number | null {
  return deltaY === 0 ? null : findLimitInReach(scrollTop, deltaY, zone);
}

function clampDown(gestureStart: number, scrollTop: number, zone: StoryZone): number {
  return Math.min(scrollTop, downwardLimit(gestureStart, zone) ?? Number.POSITIVE_INFINITY);
}

function clampUp(gestureStart: number, scrollTop: number, zone: StoryZone): number {
  return Math.max(scrollTop, upwardLimit(gestureStart, zone) ?? Number.NEGATIVE_INFINITY);
}

/**
 * However the page is scrolled (dragged, flung, the scrollbar, the keyboard), one gesture moves it at most one
 * chapter: where a gesture that started at gestureStart is allowed to have taken the page.
 */
export function clampToGesture(gestureStart: number, scrollTop: number, zone: StoryZone): number {
  return scrollTop > gestureStart ? clampDown(gestureStart, scrollTop, zone) : clampUp(gestureStart, scrollTop, zone);
}

function isInsideZone(scrollTop: number, zone: StoryZone): boolean {
  return scrollTop > zone.start + SLACK_PX && scrollTop < zone.end - SLACK_PX;
}

function isOffStop(scrollTop: number, zone: StoryZone): boolean {
  return zone.stops.every((stop) => Math.abs(stop - scrollTop) > SLACK_PX);
}

function nearestStop(scrollTop: number, zone: StoryZone): number {
  return zone.stops.reduce((nearest, stop) => (Math.abs(stop - scrollTop) < Math.abs(nearest - scrollTop) ? stop : nearest));
}

function isBetweenStops(scrollTop: number, zone: StoryZone): boolean {
  return isInsideZone(scrollTop, zone) && isOffStop(scrollTop, zone);
}

/** A page left resting between two chapters settles on the nearer one; null when it rests on one, or outside. */
export function findSettleStop(scrollTop: number, zone: StoryZone): number | null {
  return isBetweenStops(scrollTop, zone) ? nearestStop(scrollTop, zone) : null;
}

const HALFWAY = 0.5;

/** Slow in, slow out (the standard quadratic ease): the eased fraction of a step's animation. */
export function easeInOut(fraction: number): number {
  return fraction < HALFWAY ? 2 * fraction * fraction : 1 - (2 - 2 * fraction) ** 2 / 2;
}
