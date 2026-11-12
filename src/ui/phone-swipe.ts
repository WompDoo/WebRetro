import type { SwipeJack } from './story-chapters';
import { decaySwipeVelocity, isSwipeSettled, isTap, releaseSwipeVelocity, smoothSwipeVelocity } from './swipe';

/**
 * What a drag is doing. Until it has moved past a tap it hasn't decided; then either the page follows the finger, or
 * a scroll-jacking story has taken the swipe as one chapter's step. A followed drag that reaches the story's edge is
 * held there for the rest of the gesture: the next swipe is the story's.
 */
type DragMode = 'undecided' | 'follow' | 'stepped' | 'held';

interface Drag {
  readonly pointerId: number;
  readonly startY: number;
  readonly startScrollTop: number;
  readonly lastY: number;
  readonly lastTimeMs: number;
  readonly velocity: number;
  /** The farthest the pointer got from where it went down: under the tap slop, it was a tap. */
  readonly distance: number;
  readonly mode: DragMode;
}

function startDrag(event: PointerEvent, scrollTop: number): Drag {
  return { pointerId: event.pointerId, startY: event.clientY, startScrollTop: scrollTop, lastY: event.clientY, lastTimeMs: event.timeStamp, velocity: 0, distance: 0, mode: 'undecided' };
}

function moveDrag(drag: Drag, event: PointerEvent): Drag {
  return {
    ...drag,
    lastY: event.clientY,
    lastTimeMs: event.timeStamp,
    velocity: smoothSwipeVelocity(drag.velocity, event.clientY - drag.lastY, event.timeStamp - drag.lastTimeMs),
    distance: Math.max(drag.distance, Math.abs(event.clientY - drag.startY)),
  };
}

/**
 * Phone view scrolls the way a phone does: drag the screen, flick it and it glides on. The page follows the
 * pointer exactly, whatever the phone's zoom and however far the desktop page is shrunk. A press that barely
 * moves is a tap, so buttons on the page still work; a swipe never clicks what it ends on. The wheel (and a
 * trackpad's two-finger swipe) still scrolls too. A scroll-jacking story sets its own pace: one chapter a swipe.
 */
export function installPhoneSwipe(viewport: HTMLElement, site: HTMLElement, jack: SwipeJack): void {
  let drag: Drag | null = null;
  let glideFrame = 0;
  let endedInSwipe = false;

  const isPhoneView = (): boolean => viewport.dataset['device'] === 'phone';
  /** Screen pixels per page pixel: the phone's zoom times the shrink of a desktop page. */
  const measureScale = (): number => site.getBoundingClientRect().height / Math.max(1, site.offsetHeight);
  /** How far the drag wants the page to move, in page pixels: down is positive, as a finger moving up scrolls. */
  const measurePageDelta = (current: Drag): number => -(current.lastY - current.startY) / measureScale();

  const followFinger = (current: Drag): Drag => {
    const wanted = current.startScrollTop + measurePageDelta(current);
    const allowed = jack.limit(current.startScrollTop, wanted);
    site.scrollTop = allowed;
    return allowed === wanted ? current : { ...current, mode: 'held' };
  };

  /** Past a tap, the swipe is the story's step or the page's to follow, and stays so until the finger lifts. */
  const chooseMode = (current: Drag): Drag => {
    const stop = jack.findStop(measurePageDelta(current));
    if (stop === null) return followFinger({ ...current, mode: 'follow' });
    jack.stepTo(stop);
    return { ...current, mode: 'stepped' };
  };

  const DRAG_STEPS: Readonly<Record<DragMode, (current: Drag) => Drag>> = {
    undecided: (current) => (isTap(current.distance) ? current : chooseMode(current)),
    follow: followFinger,
    stepped: (current) => current,
    held: (current) => current,
  };

  const glide = (velocity: number, lastFrameAt: number, gestureStart: number) => (now: number): void => {
    const elapsedMs = now - lastFrameAt;
    const next = decaySwipeVelocity(velocity, elapsedMs);
    const wanted = site.scrollTop - (next * elapsedMs) / measureScale();
    const allowed = jack.limit(gestureStart, wanted);
    site.scrollTop = allowed;
    if (allowed === wanted && !isSwipeSettled(next)) glideFrame = window.requestAnimationFrame(glide(next, now, gestureStart));
  };

  site.addEventListener('pointerdown', (event) => {
    if (!isPhoneView()) return;
    window.cancelAnimationFrame(glideFrame);
    endedInSwipe = false;
    drag = startDrag(event, site.scrollTop);
    site.classList.add('is-swiping');
  });

  // On the window, so a swipe that leaves the phone keeps going until the button comes up.
  window.addEventListener('pointermove', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    const moved = moveDrag(drag, event);
    drag = DRAG_STEPS[moved.mode](moved);
  });

  /** Only a drag the page followed glides on: a story's step has already gone where it goes. */
  const releaseVelocity = (ended: Drag, event: PointerEvent): number =>
    ended.mode === 'follow' ? releaseSwipeVelocity(ended.velocity, event.timeStamp - ended.lastTimeMs) : 0;

  const endDrag = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) return;
    endedInSwipe = !isTap(drag.distance);
    const velocity = releaseVelocity(drag, event);
    const gestureStart = drag.startScrollTop;
    drag = null;
    site.classList.remove('is-swiping');
    glideFrame = window.requestAnimationFrame(glide(velocity, performance.now(), gestureStart));
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Captured before the game's own click handler: a swipe that ends on a button doesn't press it.
  site.addEventListener(
    'click',
    (event) => {
      if (!endedInSwipe) return;
      endedInSwipe = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );
  site.addEventListener('wheel', () => window.cancelAnimationFrame(glideFrame), { passive: true });
}
