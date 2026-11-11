import { calculateStoryProgress, clampToGesture, createStoryZone, easeInOut, findJackedStop, findSettleStop } from './scroll-jack';
import type { StoryZone } from './scroll-jack';

/** How long one jacked step takes. However hard you scroll, this is the pace. */
const STEP_MS = 700;
/** After a step, scrolling stays swallowed a little longer, so a trackpad's coasting doesn't skip a chapter. */
const COOLDOWN_MS = 350;
/** Scroll events further apart than this are separate gestures; a gesture this quiet has come to rest. */
const GESTURE_GAP_MS = 200;
/** Firefox reports mouse wheels in lines, not pixels. */
const LINE_HEIGHT_PX = 16;
const DOM_DELTA_LINE = 1;

interface Story {
  readonly element: HTMLElement;
  readonly track: HTMLElement;
  readonly dots: readonly Element[];
  readonly chapters: number;
  readonly zone: StoryZone;
}

function isInsideSite(element: Element | null, site: HTMLElement): element is HTMLElement {
  return element instanceof HTMLElement && element !== site;
}

/** Layout position within the page, unaffected by the phone view's zoom or shrink. */
function layoutTop(element: Element | null, site: HTMLElement): number {
  return isInsideSite(element, site) ? element.offsetTop + layoutTop(element.offsetParent, site) : 0;
}

/** The track fills the pinned band, so the section's height beyond the track's is the scrolling it takes over. */
function buildStory(element: HTMLElement, track: HTMLElement, site: HTMLElement): Story {
  const chapters = element.querySelectorAll('.one-pager-chapter').length;
  const zone = createStoryZone(layoutTop(element, site), element.offsetHeight - track.offsetHeight, chapters, site.clientHeight);
  return { element, track, dots: [...element.querySelectorAll('.one-pager-dots i')], chapters, zone };
}

function readStory(element: HTMLElement, site: HTMLElement): Story | null {
  const track = element.querySelector<HTMLElement>('.one-pager-track');
  return track === null ? null : buildStory(element, track, site);
}

function findStory(site: HTMLElement): Story | null {
  const element = site.querySelector<HTMLElement>('.one-pager');
  return element === null ? null : readStory(element, site);
}

/** The page's scroll position, turned into the chapters' sideways position. */
function slideStory(story: Story, scrollTop: number): void {
  const progress = calculateStoryProgress(scrollTop, story.zone);
  const lastChapter = Math.max(1, story.chapters - 1);
  story.track.style.transform = `translateX(${-progress * lastChapter * story.track.clientWidth}px)`;
  story.dots.forEach((dot, index) => dot.classList.toggle('is-current', index === Math.round(progress * lastChapter)));
}

function wheelPixels(event: WheelEvent): number {
  return event.deltaMode === DOM_DELTA_LINE ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
}

function isChapterClick(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.one-pager-chapter') !== null;
}

function findClickedStory(target: EventTarget | null, site: HTMLElement): Story | null {
  return isChapterClick(target) ? findStory(site) : null;
}

/** The next chapter's stop, or back to the first after the last: what a click on a chapter does. */
function nextChapterStop(story: Story, scrollTop: number): number {
  return findJackedStop(scrollTop, 1, story.zone) ?? story.zone.start;
}

/**
 * The story's band is as tall as the site's screen. #site outlives every re-render, so the height lives there:
 * a fresh story is the right height from its first frame, and the page never shrinks under the reader.
 */
function publishViewportHeight(site: HTMLElement): void {
  site.style.setProperty('--site-viewport-height', `${site.clientHeight}px`);
}

function findRestingStop(site: HTMLElement): number | null {
  const story = findStory(site);
  return story === null ? null : findSettleStop(site.scrollTop, story.zone);
}

/**
 * Sets the pace of the page while the story is on screen. Every step is animated by the page itself; while one
 * runs, and for a moment after, nothing else moves the page. A wheel gesture is caught before it scrolls;
 * anything else (a drag in phone view, the scrollbar, the keyboard) is held to one chapter per gesture as it
 * scrolls, and settles on a chapter when it comes to rest.
 */
class StoryPace {
  private readonly site: HTMLElement;
  /** Until then, the page stays at heldAt. */
  private lockedUntil = 0;
  private heldAt = 0;
  private animation = 0;
  private isAnimating = false;
  /** Where the page was when the current gesture began, and when that gesture last moved it. */
  private gestureStart = 0;
  private lastGestureAt = Number.NEGATIVE_INFINITY;
  private lastTop: number;
  private isPointerDown = false;
  private settleTimer = 0;

  constructor(site: HTMLElement) {
    this.site = site;
    this.lastTop = site.scrollTop;
  }

  wheel(event: WheelEvent, story: Story): void {
    if (this.isLocked()) event.preventDefault();
    else this.jack(event, story);
  }

  clickChapter(story: Story): void {
    this.animateTo(nextChapterStop(story, this.site.scrollTop));
  }

  /**
   * A finger going down starts a new gesture from where the page is, even while the last one still glides
   * against its hold. Only a step the page is still animating keeps it waiting.
   */
  pressPointer(): void {
    this.isPointerDown = true;
    this.gestureStart = this.site.scrollTop;
    this.lastGestureAt = performance.now();
    window.clearTimeout(this.settleTimer);
    if (!this.isAnimating) this.lockedUntil = 0;
  }

  releasePointer(): void {
    this.isPointerDown = false;
    this.scheduleSettle();
  }

  /** Every scroll, whoever made it: the page's own steps pass, everything else is held to the pace. */
  follow(story: Story): void {
    if (!this.isAnimating) this.pace(story);
    slideStory(story, this.site.scrollTop);
    this.lastTop = this.site.scrollTop;
  }

  private isLocked(): boolean {
    return performance.now() < this.lockedUntil;
  }

  private jack(event: WheelEvent, story: Story): void {
    const target = findJackedStop(this.site.scrollTop, wheelPixels(event), story.zone);
    if (target === null) return;
    event.preventDefault();
    this.animateTo(target);
  }

  private pace(story: Story): void {
    if (this.isLocked()) this.keepHolding();
    else this.limitGesture(story);
  }

  /** Pushing against a hold is still the same gesture: a swipe that reached its chapter can't take another. */
  private keepHolding(): void {
    this.lastGestureAt = performance.now();
    this.site.scrollTop = this.heldAt;
  }

  private limitGesture(story: Story): void {
    const now = performance.now();
    this.gestureStart = now - this.lastGestureAt > GESTURE_GAP_MS ? this.lastTop : this.gestureStart;
    this.lastGestureAt = now;
    this.holdIfStopped(clampToGesture(this.gestureStart, this.site.scrollTop, story.zone), now);
    this.scheduleSettle();
  }

  /** A scroll that tried to go past its chapter stays at it for a moment, like after a wheel step. */
  private holdIfStopped(allowed: number, now: number): void {
    if (allowed === this.site.scrollTop) return;
    this.hold(allowed, now + COOLDOWN_MS);
    this.site.scrollTop = allowed;
  }

  private hold(top: number, until: number): void {
    this.heldAt = top;
    this.lockedUntil = until;
  }

  private scheduleSettle(): void {
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.settle(), GESTURE_GAP_MS);
  }

  /** A finger still on the screen isn't at rest: the release settles it instead. */
  private settle(): void {
    if (!this.isPointerDown) this.settleAt(findRestingStop(this.site));
  }

  private settleAt(stop: number | null): void {
    if (stop !== null) this.animateTo(stop);
  }

  private animateTo(target: number): void {
    const startedAt = performance.now();
    const from = this.site.scrollTop;
    window.cancelAnimationFrame(this.animation);
    window.clearTimeout(this.settleTimer);
    this.hold(target, startedAt + STEP_MS + COOLDOWN_MS);
    // Whatever scrolling carries on after this step is measured from where it ends.
    this.gestureStart = target;
    this.isAnimating = true;
    const frame = (now: number): void => {
      const fraction = Math.min(1, (now - startedAt) / STEP_MS);
      this.site.scrollTop = from + (target - from) * easeInOut(fraction);
      this.isAnimating = fraction < 1;
      if (this.isAnimating) this.animation = window.requestAnimationFrame(frame);
    };
    this.animation = window.requestAnimationFrame(frame);
  }
}

/**
 * The scroll-jacking one-pager. While its band is pinned, the page's scrolling slides the chapters sideways,
 * and the page sets the pace: one chapter per gesture, each step taking STEP_MS, whatever did the scrolling.
 * A click on a chapter moves on one too.
 */
export function installStoryChapters(site: HTMLElement): void {
  const pace = new StoryPace(site);
  const withStory = (use: (story: Story) => void) => (): void => {
    const story = findStory(site);
    if (story !== null) use(story);
  };

  site.addEventListener('wheel', (event) => withStory((story) => pace.wheel(event, story))(), { passive: false });
  site.addEventListener('click', (event) => {
    const story = findClickedStory(event.target, site);
    if (story !== null) pace.clickChapter(story);
  });
  site.addEventListener('pointerdown', () => pace.pressPointer());
  window.addEventListener('pointerup', () => pace.releasePointer());
  window.addEventListener('pointercancel', () => pace.releasePointer());

  new ResizeObserver(() => publishViewportHeight(site)).observe(site);
  site.addEventListener('scroll', withStory((story) => pace.follow(story)), { passive: true });
  // The site is re-rendered often; a fresh story starts where the page is. Re-renders aren't scrolling,
  // so they don't count towards a gesture.
  new MutationObserver(withStory((story) => slideStory(story, site.scrollTop))).observe(site, { childList: true });
}
