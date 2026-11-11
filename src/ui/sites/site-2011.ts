import { ERAS_BY_ID, getActiveUpgradeIds, isFeaturePluginDead } from '../../engine';
import type { FeatureId, GameState, UpgradeId } from '../../engine';
import { escapeHtml } from '../dom';
import { listAds, renderAdPicture, renderAdText } from './ads';
import { ownedFeatures, renderDeadNotice, renderFeatureBlocks, renderFeatureSection, renderSignInWithButtons } from './features';
import { siteName } from './site-context';
import type { SiteContext } from './site-context';
import { render2005Site } from './site-2005';

/**
 * Bootstrap 2's span8: one column of content. What retired in 2011 (counter, badge, webring, tags, Flash intro) has no
 * place here. In 2018, before a framework rewrites the site, the new features squeeze in here too.
 */
const BOOTSTRAP_MAIN_FEATURES: readonly FeatureId[] = ['stories', 'video-player', 'blog', 'pricing-table', 'comments', 'photo-gallery', 'forum'];
/** The span4 sidebar: small widgets, each in a well. */
/** Sign in with… isn't listed: its buttons go in the sign-in box. Maps were sidebar widgets. */
const BOOTSTRAP_SIDEBAR_FEATURES: readonly FeatureId[] = ['share-buttons', 'activity-feed', 'guestbook', 'map-mashup', 'midi-player'];
const NAV_ITEMS: readonly string[] = ['Home', 'Blog', 'Photos', 'About'];
/** The three supporting columns under the hero, before you've built anything to put there. */
const PLACEHOLDER_COLUMNS: readonly string[] = ['Heading', 'Heading', 'Heading'];

/** Learned or bought, and still working: a boost that went out of fashion leaves the page. */
function knows(state: GameState, upgradeId: UpgradeId): boolean {
  return getActiveUpgradeIds(state).includes(upgradeId);
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

/** Anything people log into. Once one is on the page, the sidebar has a sign-in box. */
const ACCOUNT_FEATURES: readonly FeatureId[] = ['forum', 'guestbook', 'social-login'];

function isPasswordLeaked(state: GameState): boolean {
  return state.infections.some((infection) => infection.kind === 'password-leak');
}

/** Sign in with… is on the page and its networks still let it work. */
function hasWorkingSocialLogin(context: SiteContext): boolean {
  return ownedFeatures(context, ['social-login']).length > 0 && !isFeaturePluginDead(context.state, 'social-login');
}

/** The navbar keeps a short link: it has to fit beside the menu at every width. */
function renderNavbarSignIn(context: SiteContext): string {
  return `<span class="bs-signin">${hasWorkingSocialLogin(context) ? 'Sign in with Facespace' : 'Sign in'}</span>`;
}

/** The buttons under the form, or what's left of them once Facespace switched off its API. */
function renderSignInWithOptions(context: SiteContext): string {
  return isFeaturePluginDead(context.state, 'social-login') ? renderDeadNotice('social-login') : renderSignInWithButtons(context);
}

/**
 * The tell every site gave away: if it can email you your password, it stores your password. After bcrypt
 * it can't, so it sends a reset link instead.
 */
function renderForgotPassword(state: GameState): string {
  return knows(state, 'learn-bcrypt') ? 'Forgot your password? We’ll email you a link to reset it.' : 'Forgot your password? We’ll email it to you.';
}

function renderLeakAlert(state: GameState): string {
  return isPasswordLeaked(state) ? '<p class="bs-alert is-error"><b>Our user list was leaked.</b> Please reset your password.</p>' : '';
}

/** The form itself: drawn fields, because typing belongs to the code editor. */
function renderSignInForm(state: GameState): string {
  return `<h2 class="feature-heading">Sign in</h2>${renderLeakAlert(state)}<span class="bs-input">Email</span><span class="bs-input">Password</span><span class="bs-button is-primary">Sign in</span><p class="bs-forgot">${renderForgotPassword(state)}</p>`;
}

/** With Sign in with… built, the box is that feature: its buttons under the form, after an "or". */
function renderSignInBox(context: SiteContext): string {
  const form = renderSignInForm(context.state);
  return ownedFeatures(context, ['social-login']).length > 0
    ? renderFeatureSection(context, 'social-login', `${form}<p class="bs-or">or</p>${renderSignInWithOptions(context)}`, ' bs-signin-box')
    : `<section class="feature-block bs-signin-box">${form}</section>`;
}

/** A Bootstrap well at the top of the sidebar, once there is something to sign in to. */
function renderSignInSidebar(context: SiteContext): string {
  return ownedFeatures(context, ACCOUNT_FEATURES).length > 0 ? renderSignInBox(context) : '';
}

/** The one-pager gets the full width under the hero, where it can take over the page's scrolling. */
function renderStoryBand(context: SiteContext): string {
  const story = renderFeatureBlocks(context, ['one-pager']).join('');
  return story === '' ? '' : `<div class="bs-story">${story}</div>`;
}

/** "Get our app!": across the top of the page, above even the navbar. */
function renderAppBanner(context: SiteContext): string {
  const name = escapeHtml(siteName(context.state));
  return knows(context.state, 'app-banner')
    ? `<div class="bs-app-banner"><span class="bs-app-close" aria-hidden="true">×</span><span class="bs-app-icon" aria-hidden="true">${name.charAt(0).toUpperCase()}</span><span class="bs-app-text"><b>${name}</b>Get our app! FREE</span><span class="bs-app-view">VIEW</span></div>`
    : '';
}

/** The right-hand column's sponsored posts: a picture, a headline and the small print, one per ad placed. */
function renderSponsoredWell(context: SiteContext): string {
  const ads = listAds(context);
  const items = ads.map((ad, index) => `<li class="bs-ad">${renderAdPicture(index)}<span class="bs-ad-text">${renderAdText(ad)}</span></li>`).join('');
  return ads.length === 0 ? '' : `<section class="feature-block bs-sponsored"><h2 class="feature-heading">Sponsored</h2><ul class="bs-ad-list">${items}</ul></section>`;
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
    <header class="bs-navbar"><span class="bs-brand">${escapeHtml(siteName(context.state))}</span><nav class="bs-nav">${nav}</nav><span class="bs-menu" aria-hidden="true">☰</span>${renderNavbarSignIn(context)}</header>
    <section class="bs-hero"><span class="bs-hero-far" aria-hidden="true"></span><span class="bs-hero-near" aria-hidden="true"></span><h1>Hello, world!</h1><p>This is a template for a simple website. It has a big callout called a hero unit and three supporting pieces of content. Use it as a starting point to make something unique.</p><span class="bs-button is-large">Learn more »</span></section>
    ${renderStoryBand(context)}
    <div class="bs-row"><div class="bs-main">${main === '' ? `<div class="bs-columns">${renderPlaceholderColumns()}</div>` : main}</div><aside class="bs-sidebar">${renderSignInSidebar(context)}${renderSponsoredWell(context)}${sidebar}</aside></div>
    <footer class="bs-footer">© ${siteName(context.state)} ${ERAS_BY_ID[context.eraId].year} · Built with Bootstrap · Follow us everywhere</footer>
    ${renderFeatureBlocks(context, ['live-chat']).join('')}
  </div>`;
}

/** The relaunch keeps your 2005 site until you learn Bootstrap. The browser's phone view shows how either looks on a phone. */
export function render2011Site(context: SiteContext): string {
  return knows(context.state, 'learn-bootstrap') ? renderBootstrapSite(context) : render2005Site(context);
}
