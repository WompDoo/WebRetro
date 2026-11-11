import { decaySwipeVelocity, isSwipeSettled, isTap, releaseSwipeVelocity, smoothSwipeVelocity } from './swipe';

interface Drag {
  readonly pointerId: number;
  readonly startY: number;
  readonly startScrollTop: number;
  readonly lastY: number;
  readonly lastTimeMs: number;
  readonly velocity: number;
  /** The farthest the pointer got from where it went down: under the tap slop, it was a tap. */
  readonly distance: number;
}

function startDrag(event: PointerEvent, scrollTop: number): Drag {
  return { pointerId: event.pointerId, startY: event.clientY, startScrollTop: scrollTop, lastY: event.clientY, lastTimeMs: event.timeStamp, velocity: 0, distance: 0 };
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
 * trackpad's two-finger swipe) still scrolls too.
 */
export function installPhoneSwipe(viewport: HTMLElement, site: HTMLElement): void {
  let drag: Drag | null = null;
  let glideFrame = 0;
  let endedInSwipe = false;

  const isPhoneView = (): boolean => viewport.dataset['device'] === 'phone';
  /** Screen pixels per page pixel: the phone's zoom times the shrink of a desktop page. */
  const measureScale = (): number => site.getBoundingClientRect().height / Math.max(1, site.offsetHeight);

  const glide = (velocity: number, lastFrameAt: number) => (now: number): void => {
    const elapsedMs = now - lastFrameAt;
    const next = decaySwipeVelocity(velocity, elapsedMs);
    site.scrollTop -= (next * elapsedMs) / measureScale();
    if (!isSwipeSettled(next)) glideFrame = window.requestAnimationFrame(glide(next, now));
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
    drag = moveDrag(drag, event);
    site.scrollTop = drag.startScrollTop - (drag.lastY - drag.startY) / measureScale();
  });

  const endDrag = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) return;
    endedInSwipe = !isTap(drag.distance);
    const velocity = releaseSwipeVelocity(drag.velocity, event.timeStamp - drag.lastTimeMs);
    drag = null;
    site.classList.remove('is-swiping');
    glideFrame = window.requestAnimationFrame(glide(velocity, performance.now()));
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
