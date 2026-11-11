/**
 * Parallax needs to know how far the page has scrolled. This keeps it in a custom property on the site;
 * the layers move in CSS, so a page without parallax pays nothing but setting one number.
 */
export function installScrollDepth(site: HTMLElement): void {
  site.addEventListener('scroll', () => site.style.setProperty('--site-scroll', String(site.scrollTop)), { passive: true });
}
