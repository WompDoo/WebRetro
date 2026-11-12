import type { ConsentBanner, GameState } from '../../engine';
import { renderFeatureBlocks } from './features';
import type { SiteContext } from './site-context';

/**
 * The banner the GDPR put on every site in 2018, bottom left, as the site asks: not at all, honestly (two
 * buttons the same size), or with a dark pattern (one big button, and the way out in small grey text).
 */
const COOKIE_BANNERS: Readonly<Record<ConsentBanner, string>> = {
  none: '',
  honest:
    '<aside class="cookie-banner is-honest" aria-label="Cookie consent"><p>We’d like to use cookies to show you personalised ads. Is that OK?</p><div class="cookie-buttons"><button type="button" class="cookie-button" data-action="dismiss-cookie-banner">Reject</button><button type="button" class="cookie-button" data-action="dismiss-cookie-banner">Accept</button></div></aside>',
  'dark-pattern':
    '<aside class="cookie-banner is-dark-pattern" aria-label="Cookie consent"><p><b>We value your privacy</b>We and our 214 partners use cookies to improve your experience, personalise content and ads, and analyse our traffic. By continuing to browse, you agree.</p><button type="button" class="cookie-button is-accept" data-action="dismiss-cookie-banner">Accept all</button><span class="cookie-manage">Manage options</span></aside>',
};

export function renderCookieBanner(state: GameState): string {
  return state.isCookieBannerDismissed ? '' : COOKIE_BANNERS[state.consentBanner];
}

/**
 * The corner widgets: the cookie banner bottom left, the chat bubble bottom right. They sit in a strip of no height
 * pinned to the bottom of the screen, so they float over the page instead of making it longer, and on a narrow
 * screen the bubble moves up above the banner instead of covering it.
 */
export function renderCornerDock(context: SiteContext): string {
  const widgets = `${renderCookieBanner(context.state)}${renderFeatureBlocks(context, ['live-chat']).join('')}`;
  return widgets === '' ? '' : `<div class="corner-dock"><div class="corner-dock-inner">${widgets}</div></div>`;
}
