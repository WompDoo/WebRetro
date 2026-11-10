import { calculateMobileStayShare, ERAS_BY_ID, formatPercent, isMobileFriendly } from '../../engine';
import type { FeatureId, GameState } from '../../engine';
import { escapeHtml } from '../dom';
import { renderFeatureBlocks } from './features';
import { siteName } from './site-context';
import type { SiteContext } from './site-context';
import { render2005Site } from './site-2005';

const BOOTSTRAP_MAIN_FEATURES: readonly FeatureId[] = ['video-player', 'flash-intro', 'blog', 'activity-feed', 'comments', 'photo-gallery', 'forum', 'map-mashup'];
const BOOTSTRAP_SIDEBAR_FEATURES: readonly FeatureId[] = ['share-buttons', 'hit-counter', 'guestbook', 'tag-cloud', 'midi-player', 'webring', 'under-construction'];
const NAV_ITEMS: readonly string[] = ['Home', 'Blog', 'Photos', 'About'];
/** The three supporting columns under the hero, before you've built anything to put there. */
const PLACEHOLDER_COLUMNS: readonly string[] = ['Heading', 'Heading', 'Heading'];

function knows(state: GameState, skillId: 'learn-bootstrap' | 'responsive-design'): boolean {
  return state.purchasedUpgradeIds.includes(skillId);
}

/**
 * Your site on a phone, in the corner of the page. Before responsive design it is the desktop page,
 * shrunk and scrolling sideways; after it, it fits.
 */
function renderPhonePreview(state: GameState): string {
  const fits = isMobileFriendly(state);
  const leaving = formatPercent(1 - calculateMobileStayShare(state));
  const caption = fits ? 'Fits on phones' : `Phone visitors: ${leaving} leave`;
  return `<aside class="phone-preview${fits ? ' is-fitting' : ''}" aria-label="Your site on a phone"><span class="phone-screen"><span class="phone-page"><i></i><i></i><i></i><i></i></span></span><span class="phone-caption">${escapeHtml(caption)}</span></aside>`;
}

function renderPlaceholderColumns(): string {
  return PLACEHOLDER_COLUMNS.map((title) => `<section class="feature-block bs-placeholder"><h2 class="feature-heading">${title}</h2><p>Donec id elit non mi porta gravida at eget metus.</p><span class="bs-button">View details »</span></section>`).join('');
}

/** After "Learn Bootstrap": the template every 2011 site started from, "Hello, world!" and all. */
function renderBootstrapSite(context: SiteContext): string {
  const main = renderFeatureBlocks(context, BOOTSTRAP_MAIN_FEATURES).join('');
  const sidebar = renderFeatureBlocks(context, BOOTSTRAP_SIDEBAR_FEATURES).join('');
  const responsive = knows(context.state, 'responsive-design') ? ' is-responsive' : '';
  const nav = NAV_ITEMS.map((item, index) => `<span${index === 0 ? ' class="is-active"' : ''}>${item}</span>`).join('');
  return `<div class="site-2011${responsive}">
    <header class="bs-navbar"><span class="bs-brand">${escapeHtml(siteName(context.state))}</span><nav class="bs-nav">${nav}</nav><span class="bs-menu" aria-hidden="true">☰</span><span class="bs-signin">Sign in</span></header>
    <section class="bs-hero"><h1>Hello, world!</h1><p>This is a template for a simple website. It has a big callout called a hero unit and three supporting pieces of content. Use it as a starting point to make something unique.</p><span class="bs-button is-large">Learn more »</span></section>
    <div class="bs-row"><div class="bs-main">${main === '' ? renderPlaceholderColumns() : main}</div><aside class="bs-sidebar">${sidebar}</aside></div>
    <footer class="bs-footer">© ${siteName(context.state)} ${ERAS_BY_ID[context.eraId].year} · Built with Bootstrap · Follow us everywhere</footer>
  </div>`;
}

/** The relaunch keeps your 2005 site until you learn Bootstrap. Either way, the phone preview tells the truth. */
export function render2011Site(context: SiteContext): string {
  const page = knows(context.state, 'learn-bootstrap') ? renderBootstrapSite(context) : render2005Site(context);
  return `${renderPhonePreview(context.state)}${page}`;
}
