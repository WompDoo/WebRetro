import type { ConsentBanner, GameState } from '../../engine';

/**
 * The banner the GDPR put on every site in 2018, bottom left, as the site asks: not at all, honestly (two
 * buttons the same size), or with a dark pattern (one big button, and the way out in small grey text).
 */
const COOKIE_BANNERS: Readonly<Record<ConsentBanner, string>> = {
  none: '',
  honest:
    '<aside class="cookie-banner is-honest" aria-label="Cookie consent"><p>We’d like to use cookies to show you personalised ads. Is that OK?</p><div class="cookie-buttons"><span class="cookie-button">Reject</span><span class="cookie-button">Accept</span></div></aside>',
  'dark-pattern':
    '<aside class="cookie-banner is-dark-pattern" aria-label="Cookie consent"><p><b>We value your privacy</b>We and our 214 partners use cookies to improve your experience, personalise content and ads, and analyse our traffic. By continuing to browse, you agree.</p><span class="cookie-button is-accept">Accept all</span><span class="cookie-manage">Manage options</span></aside>',
};

export function renderCookieBanner(state: GameState): string {
  return COOKIE_BANNERS[state.consentBanner];
}
