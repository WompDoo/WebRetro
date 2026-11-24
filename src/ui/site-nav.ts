/**
 * The site's own menu works: a link scrolls the page to what it names (the blog, the photos, the pricing table), Home
 * goes to the top, About and the like to the footer, and anything else to the specialization's own block, or the top
 * when there's none.
 */

const TOP = 'top';
const FOOTER = 'footer, .site-footer';
const SPECIALIZATION_BLOCK = '.spec-block';
/** A little room above the block, so it doesn't sit flush against the top. */
const NAV_MARGIN_PX = 8;

const NAV_TARGETS: Readonly<Record<string, string>> = {
  Home: TOP,
  'Main page': TOP,
  Blog: '[data-feature="blog"]',
  Blogs: '[data-feature="blog"]',
  Archive: '[data-feature="blog"]',
  Photos: '[data-feature="photo-gallery"]',
  Tags: '[data-feature="tag-cloud"]',
  Guestbook: '[data-feature="guestbook"]',
  'Cool links': '[data-feature="webring"]',
  Forums: '[data-feature="forum"]',
  'New posts': '[data-feature="forum"]',
  Pricing: '[data-feature="pricing-table"]',
  Subscribe: '[data-feature="newsletter"]',
  About: FOOTER,
  'About me': FOOTER,
  'Email me': FOOTER,
  Careers: FOOTER,
  Changelog: FOOTER,
  Docs: FOOTER,
};

/** What the link names, if the page has it; else the specialization's block. */
function findOnPage(site: HTMLElement, selector: string): HTMLElement | null {
  return site.querySelector<HTMLElement>(selector) ?? site.querySelector<HTMLElement>(SPECIALIZATION_BLOCK);
}

/** Null is the top of the page. */
export function findNavSelector(label: string): string | null {
  const selector = NAV_TARGETS[label] ?? SPECIALIZATION_BLOCK;
  return selector === TOP ? null : selector;
}

/**
 * Where the block starts within the scrolling page. The page can be scaled down (a desktop layout on a phone) and the
 * phone zoomed out, so the distance on screen is divided by the scale to get the page's own pixels.
 */
function measureOffset(site: HTMLElement, target: HTMLElement): number {
  const siteRect = site.getBoundingClientRect();
  const scale = siteRect.height / Math.max(site.offsetHeight, 1);
  return (target.getBoundingClientRect().top - siteRect.top) / scale + site.scrollTop - NAV_MARGIN_PX;
}

export function scrollSiteTo(site: HTMLElement, label: string): void {
  const selector = findNavSelector(label);
  const target = selector === null ? null : findOnPage(site, selector);
  site.scrollTo({ top: target === null ? 0 : Math.max(0, measureOffset(site, target)), behavior: 'smooth' });
}
