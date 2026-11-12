import { BEFORE_STORY, calculateStoryProgress, clampToGesture, createStoryZone, easeInOut, findJackedStop, findSettleStop, placeReader } from './scroll-jack';
import type { ReaderPlace, StoryBox, StoryZone } from './scroll-jack';

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
  /** The section's height: screen-tall plus the scrolling it takes over, or just the band when that's off. */
  readonly height: number;
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
  const height = element.offsetHeight;
  const zone = createStoryZone(layoutTop(element, site), height - track.offsetHeight, chapters, site.clientHeight);
  return { element, track, dots: [...element.querySelectorAll('.one-pager-dots i')], chapters, height, zone };
}

function readStory(element: HTMLElement, site: HTMLElement): Story | null {
  const track = element.querySelector<HTMLElement>('.one-pager-track');
  return track === null ? null : buildStory(element, track, site);
}

function findStory(site: HTMLElement): Story | null {
  const element = site.querySelector<HTMLElement>('.one-pager');
  return element === null ? null : readStory(element, site);
}

/** The shop's comfort switch, mirrored on #site by the renderer. Until it is, scroll-jacking is on. */
function isScrollJackingOn(site: HTMLElement): boolean {
  return site.dataset['scrollJacking'] !== 'off';
}

function lastChapterIndex(story: Story): number {
  return Math.max(1, story.chapters - 1);
}

/** Slides the track to a chapter, or between two (a fraction); the dots follow the nearest. */
function showChapterPosition(story: Story, position: number): void {
  story.track.style.transform = `translateX(${-position * story.track.clientWidth}px)`;
  story.dots.forEach((dot, index) => dot.classList.toggle('is-current', index === Math.round(position)));
}

/** The page's scroll position, turned into the chapters' sideways position. */
function slideStory(story: Story, scrollTop: number): void {
  showChapterPosition(story, calculateStoryProgress(scrollTop, story.zone) * lastChapterIndex(story));
}

/** The chapter the page's scroll position shows, while scroll-jacking is on. */
function findJackedChapter(story: Story, scrollTop: number): number {
  return Math.round(calculateStoryProgress(scrollTop, story.zone) * lastChapterIndex(story));
}

function storyBox(story: Story): StoryBox {
  return { top: story.zone.start, height: story.height };
}

/**
 * With scroll-jacking switched off, the story is a band in the page's flow and the page scrolls past it as usual.
 * A click reads on, and the last chapter goes back to the first. The chapter lives here: the band is re-rendered.
 */
class StoryReader {
  private chapter = 0;

  readOn(story: Story): void {
    this.chapter = (this.chapter + 1) % Math.max(1, story.chapters);
    // Only a click slides: a re-rendered band shows its chapter at once.
    story.element.classList.add('is-turning');
    this.show(story);
  }

  show(story: Story): void {
    showChapterPosition(story, this.chapter % Math.max(1, story.chapters));
  }

  currentChapter(): number {
    return this.chapter;
  }

  /** Switching off in the middle of the story keeps the chapter the reader was on. */
  goTo(chapter: number): void {
    this.chapter = chapter;
  }
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
  /** Right after the layout changes, the browser may move the page itself; that isn't the reader scrolling. */
  private isLayoutSettling = false;
  private settlingFrame = 0;

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

  /** A swipe's step: one chapter, unless the last step is still running. */
  stepTo(target: number): void {
    if (!this.isLocked()) this.animateTo(target);
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
    if (this.isPaceable()) this.pace(story);
    slideStory(story, this.site.scrollTop);
    this.notice();
  }

  /** Where the page is, so the next gesture is measured from there; kept up even while scroll-jacking is off. */
  notice(): void {
    this.lastTop = this.site.scrollTop;
  }

  /**
   * The layout just changed (a re-render, a resize, the switch). When content above the reader grows or shrinks,
   * the browser moves the page to keep their place, and that move must not count as a gesture. It arrives with the
   * next frame or the one after, depending on when the change happened, so the page goes unpaced until then.
   */
  resync(): void {
    this.isLayoutSettling = true;
    window.cancelAnimationFrame(this.settlingFrame);
    this.settlingFrame = window.requestAnimationFrame(() => {
      this.settlingFrame = window.requestAnimationFrame(() => {
        this.isLayoutSettling = false;
      });
    });
  }

  /** The switch was flipped: whatever the page was doing stops, and it starts over where it is. */
  reset(): void {
    window.cancelAnimationFrame(this.animation);
    window.clearTimeout(this.settleTimer);
    this.isAnimating = false;
    this.lockedUntil = 0;
    this.resync();
  }

  private isPaceable(): boolean {
    return !this.isAnimating && !this.isLayoutSettling;
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

  /** A finger still on the screen isn't at rest, and nor is a step on its way: neither settles. */
  private settle(): void {
    if (!this.isPointerDown && !this.isAnimating) this.settleAt(findRestingStop(this.site));
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
 * What the phone view's swipe asks before it moves the page. A finger doesn't drag a scroll-jacking story along:
 * each swipe is one chapter, as each wheel gesture is.
 */
export interface SwipeJack {
  /** Where a swipe this way goes if the story takes it over; null when the page follows the finger. */
  readonly findStop: (deltaY: number) => number | null;
  readonly stepTo: (stop: number) => void;
  /** Where a page following the finger since dragStart may go: it stops at the story's edge. */
  readonly limit: (dragStart: number, toTop: number) => number;
}

/**
 * The scroll-jacking one-pager. While its band is pinned, the page's scrolling slides the chapters sideways,
 * and the page sets the pace: one chapter per gesture, each step taking STEP_MS, whatever did the scrolling.
 * A click on a chapter moves on one too. The shop can switch the scroll-jacking off (it's funny twice): the
 * story stays, as a band the page scrolls past and a click reads on. Flipping the switch keeps the reader's place.
 */
export function installStoryChapters(site: HTMLElement): SwipeJack {
  const pace = new StoryPace(site);
  const reader = new StoryReader();
  const isJacking = (): boolean => isScrollJackingOn(site);
  const withStory = (use: (story: Story) => void) => (): void => {
    const story = findStory(site);
    if (story !== null) use(story);
  };

  // Where the reader is, kept up to date: when the switch flips, the old layout is already gone.
  let place: ReaderPlace = BEFORE_STORY;
  let placeChapter = 0;
  const chapterOf = (story: Story): number => (isJacking() ? findJackedChapter(story, site.scrollTop) : reader.currentChapter());
  const rememberPlace = (story: Story): void => {
    placeChapter = chapterOf(story);
    place = placeReader(site.scrollTop, storyBox(story), placeChapter);
  };
  const showStory = (story: Story): void => {
    if (isJacking()) slideStory(story, site.scrollTop);
    else reader.show(story);
    rememberPlace(story);
  };
  const keepPlace = (story: Story): void => {
    reader.goTo(placeChapter);
    site.scrollTop = place.findTop(site.scrollTop, storyBox(story), story.zone);
    showStory(story);
  };
  const turnChapter = (story: Story): void => {
    if (isJacking()) pace.clickChapter(story);
    else reader.readOn(story);
  };
  const followScroll = (story: Story): void => {
    if (isJacking()) pace.follow(story);
    else pace.notice();
    rememberPlace(story);
  };

  site.addEventListener(
    'wheel',
    (event) =>
      withStory((story) => {
        if (isJacking()) pace.wheel(event, story);
      })(),
    { passive: false },
  );
  site.addEventListener('click', (event) => {
    const story = findClickedStory(event.target, site);
    if (story !== null) turnChapter(story);
  });
  site.addEventListener('pointerdown', () => {
    if (isJacking()) pace.pressPointer();
  });
  const releasePointer = (): void => {
    if (isJacking()) pace.releasePointer();
  };
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);
  site.addEventListener('scroll', withStory(followScroll), { passive: true });

  // A resize (the phone view, the window) changes the band's height and moves the page under the reader.
  new ResizeObserver(() => {
    publishViewportHeight(site);
    pace.resync();
    withStory(rememberPlace)();
  }).observe(site);
  // The site is re-rendered when the game changes it; a fresh story starts where the page is. A re-render can
  // move the page too, and that isn't the reader scrolling either.
  new MutationObserver(() => {
    pace.resync();
    withStory(showStory)();
  }).observe(site, { childList: true });
  // The shop's switch. The browser can't keep the reader's place itself (it doesn't anchor scrolling across a
  // change from sticky), so the remembered place does: whatever the page was doing stops, and it lands there.
  new MutationObserver(() => {
    pace.reset();
    withStory(keepPlace)();
  }).observe(site, { attributes: true, attributeFilter: ['data-scroll-jacking'] });

  const jackingStory = (): Story | null => (isJacking() ? findStory(site) : null);
  return {
    findStop: (deltaY) => {
      const story = jackingStory();
      return story === null ? null : findJackedStop(site.scrollTop, deltaY, story.zone);
    },
    stepTo: (stop) => pace.stepTo(stop),
    limit: (dragStart, toTop) => {
      const story = jackingStory();
      return story === null ? toTop : clampToGesture(dragStart, toTop, story.zone);
    },
  };
}
