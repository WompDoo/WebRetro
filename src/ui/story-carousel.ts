/** A pixel of slack, so a carousel scrolled to within rounding of its end counts as at the end. */
const END_SLACK_PX = 1;

function findChapter(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('.one-pager-chapter') : null;
}

/** The carousel a click on one of its chapters landed in; clicks anywhere else don't count. */
function findClickedCarousel(target: EventTarget | null): HTMLElement | null {
  const chapter = findChapter(target);
  return chapter === null ? null : chapter.closest<HTMLElement>('.one-pager');
}

function isCarousel(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.classList.contains('one-pager');
}

/** One chapter on, or back to the first after the last. The snap points line it up. */
function showNextChapter(carousel: HTMLElement, chapterWidth: number): void {
  const isAtEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - END_SLACK_PX;
  carousel.scrollTo({ left: isAtEnd ? 0 : carousel.scrollLeft + chapterWidth, behavior: 'smooth' });
}

function chapterWidthOf(carousel: HTMLElement): number {
  const first = carousel.firstElementChild;
  return first instanceof HTMLElement ? first.offsetWidth : carousel.clientWidth;
}

function markCurrentChapter(site: HTMLElement, carousel: HTMLElement): void {
  const current = Math.round(carousel.scrollLeft / Math.max(1, chapterWidthOf(carousel)));
  site.querySelectorAll('.one-pager-dots i').forEach((dot, index) => dot.classList.toggle('is-current', index === current));
}

/**
 * The one-pager's chapter carousel. Phones and trackpads swipe it; a mouse wheel can't, so a click on a chapter
 * moves to the next one. The dots follow whichever chapter is showing. The listeners sit on the site itself,
 * because its contents are re-rendered often.
 */
export function installStoryCarousel(site: HTMLElement): void {
  site.addEventListener('click', (event) => {
    const carousel = findClickedCarousel(event.target);
    if (carousel !== null) showNextChapter(carousel, chapterWidthOf(carousel));
  });
  // Scroll events don't bubble, so this listens on their way down instead.
  site.addEventListener(
    'scroll',
    (event) => {
      if (isCarousel(event.target)) markCurrentChapter(site, event.target);
    },
    { capture: true, passive: true },
  );
}
