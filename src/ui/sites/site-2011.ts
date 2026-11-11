import { ERAS_BY_ID } from '../../engine';
import type { FeatureId, GameState, UpgradeId } from '../../engine';
import { escapeHtml } from '../dom';
import { ownedFeatures, renderFeatureBlocks } from './features';
import { siteName } from './site-context';
import type { SiteContext } from './site-context';
import { render2005Site } from './site-2005';

/** Bootstrap 2's span8: one column of content. What retired in 2011 (counter, badge, webring, tags, Flash intro) has no place here. */
const BOOTSTRAP_MAIN_FEATURES: readonly FeatureId[] = ['one-pager', 'video-player', 'blog', 'photo-gallery', 'comments', 'forum', 'map-mashup'];
/** The span4 sidebar: small widgets, each in a well. */
const BOOTSTRAP_SIDEBAR_FEATURES: readonly FeatureId[] = ['social-login', 'share-buttons', 'activity-feed', 'guestbook', 'midi-player'];
const NAV_ITEMS: readonly string[] = ['Home', 'Blog', 'Photos', 'About'];
/** The three supporting columns under the hero, before you've built anything to put there. */
const PLACEHOLDER_COLUMNS: readonly string[] = ['Heading', 'Heading', 'Heading'];

function knows(state: GameState, upgradeId: UpgradeId): boolean {
  return state.purchasedUpgradeIds.includes(upgradeId);
}

/** What each 2011 look skill does to the page: a class, styled in 80-era-2011.css. */
const LOOK_CLASSES: readonly (readonly [UpgradeId, string])[] = [
  ['responsive-design', 'is-responsive'],
  ['learn-masonry', 'has-masonry'],
  ['parallax-scrolling', 'has-parallax'],
  ['retina-images', 'has-retina'],
];

function renderLookClasses(context: SiteContext): string {
  const skills = LOOK_CLASSES.filter(([upgradeId]) => knows(context.state, upgradeId)).map(([, className]) => className);
  const onePager = ownedFeatures(context, ['one-pager']).length > 0 ? ['has-one-pager'] : [];
  return [...skills, ...onePager].map((className) => ` ${className}`).join('');
}

/** Once "Sign in with…" is built, the navbar offers it too. */
function renderSignIn(context: SiteContext): string {
  return ownedFeatures(context, ['social-login']).length > 0 ? 'Sign in with Facespace' : 'Sign in';
}

/** "Get our app!": across the top of the page, above even the navbar. */
function renderAppBanner(context: SiteContext): string {
  const name = escapeHtml(siteName(context.state));
  return knows(context.state, 'app-banner')
    ? `<div class="bs-app-banner"><span class="bs-app-close" aria-hidden="true">×</span><span class="bs-app-icon" aria-hidden="true">${name.charAt(0).toUpperCase()}</span><span class="bs-app-text"><b>${name}</b>Get our app! FREE</span><span class="bs-app-view">VIEW</span></div>`
    : '';
}

function renderPlaceholderColumns(): string {
  return PLACEHOLDER_COLUMNS.map((title) => `<section class="feature-block bs-placeholder"><h2 class="feature-heading">${title}</h2><p>Donec id elit non mi porta gravida at eget metus.</p><span class="bs-button">View details »</span></section>`).join('');
}

/** After "Learn Bootstrap": the template every 2011 site started from, "Hello, world!" and all. */
function renderBootstrapSite(context: SiteContext): string {
  const main = renderFeatureBlocks(context, BOOTSTRAP_MAIN_FEATURES).join('');
  const sidebar = renderFeatureBlocks(context, BOOTSTRAP_SIDEBAR_FEATURES).join('');
  const nav = NAV_ITEMS.map((item, index) => `<span${index === 0 ? ' class="is-active"' : ''}>${item}</span>`).join('');
  return `<div class="site-2011${renderLookClasses(context)}">
    ${renderAppBanner(context)}
    <header class="bs-navbar"><span class="bs-brand">${escapeHtml(siteName(context.state))}</span><nav class="bs-nav">${nav}</nav><span class="bs-menu" aria-hidden="true">☰</span><span class="bs-signin">${renderSignIn(context)}</span></header>
    <section class="bs-hero"><span class="bs-hero-far" aria-hidden="true"></span><span class="bs-hero-near" aria-hidden="true"></span><h1>Hello, world!</h1><p>This is a template for a simple website. It has a big callout called a hero unit and three supporting pieces of content. Use it as a starting point to make something unique.</p><span class="bs-button is-large">Learn more »</span></section>
    <div class="bs-row"><div class="bs-main">${main === '' ? `<div class="bs-columns">${renderPlaceholderColumns()}</div>` : main}</div><aside class="bs-sidebar">${sidebar}</aside></div>
    <footer class="bs-footer">© ${siteName(context.state)} ${ERAS_BY_ID[context.eraId].year} · Built with Bootstrap · Follow us everywhere</footer>
  </div>`;
}

/** The relaunch keeps your 2005 site until you learn Bootstrap. The browser's phone view shows how either looks on a phone. */
export function render2011Site(context: SiteContext): string {
  return knows(context.state, 'learn-bootstrap') ? renderBootstrapSite(context) : render2005Site(context);
}
