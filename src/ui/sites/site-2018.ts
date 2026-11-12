import { ERAS_BY_ID, findChosenFramework, isMobileFriendly } from '../../engine';
import type { FeatureId, FrameworkId } from '../../engine';
import { escapeHtml } from '../dom';
import { describeBuiltWith, FRAMEWORK_PRESENTATION } from '../framework-presentation';
import { listAds, renderAdPicture, renderAdText } from './ads';
import { renderCornerDock } from './cookie-banner';
import { ownedFeatures, renderFeatureBlocks } from './features';
import { siteBrand } from './site-context';
import type { SiteContext } from './site-context';
import { render2011Site } from './site-2011';

/** Under the hero: what the old site still has, as sections of the landing page. */
const LANDING_SECTIONS: readonly FeatureId[] = ['video-player', 'blog', 'photo-gallery', 'activity-feed', 'comments', 'map-mashup', 'guestbook', 'midi-player'];
const NAV_ITEMS: readonly string[] = ['Product', 'Pricing', 'Blog', 'Careers'];
/** "Trusted by": made-up companies, as every landing page's were to everyone outside them. */
const TRUSTED_BY: readonly string[] = ['Brightloop', 'Quantly', 'Stackwise', 'Paperkite', 'Blinko'];

interface ValueCard {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

const VALUE_CARDS: readonly ValueCard[] = [
  { icon: '⚡', title: 'Blazing fast', text: 'Built on the latest JavaScript, so it loads in an instant. Once it loads.' },
  { icon: '🔒', title: 'Secure by default', text: 'Your data is encrypted, backed up and shared only with our 214 partners.' },
  { icon: '📈', title: 'Scales with you', text: 'From your first visitor to your billionth, on Kubernetes. Probably.' },
];

interface Testimonial {
  readonly quote: string;
  readonly author: string;
}

const TESTIMONIALS: readonly Testimonial[] = [
  { quote: 'This changed everything about how our team works.', author: 'Jo, Head of Growth at Brightloop' },
  { quote: 'We 10x’d our funnel in a week. I don’t know what that means.', author: 'Sam, VP of Something at Quantly' },
];

/** What a visitor sees while the bundle loads: an empty page, "Loading...", or the template before Vue compiles it. */
function renderBootScreen(framework: FrameworkId): string {
  return `<div class="spa-boot" aria-hidden="true"><div class="spa-boot-screen">${escapeHtml(FRAMEWORK_PRESENTATION[framework].bootScreen)}</div></div>`;
}

function renderValueCards(): string {
  return VALUE_CARDS.map((card) => `<div class="lp-card"><span class="lp-card-icon" aria-hidden="true">${card.icon}</span><b>${escapeHtml(card.title)}</b><p>${escapeHtml(card.text)}</p></div>`).join('');
}

function renderTestimonials(): string {
  return TESTIMONIALS.map((item) => `<figure class="lp-quote"><blockquote>“${escapeHtml(item.quote)}”</blockquote><figcaption><span class="lp-quote-face" aria-hidden="true"></span>${escapeHtml(item.author)}</figcaption></figure>`).join('');
}

/** A stock photo of people laughing at a laptop, the way every 2018 hero had one. Drawn, not downloaded. */
function renderHeroPhoto(): string {
  return '<div class="lp-hero-photo" aria-hidden="true"><span class="lp-person lp-person--1"></span><span class="lp-person lp-person--2"></span><span class="lp-person lp-person--3"></span><span class="lp-laptop"></span></div>';
}

/** Growth hacking: the main button's colour is an A/B test, and you're in a different group every time. */
const AB_VARIANTS = 3;

function renderAbVariant(context: SiteContext): string {
  return context.state.purchasedUpgradeIds.includes('growth-hacking') ? ` is-ab-${context.state.keystrokes % AB_VARIANTS}` : '';
}

function renderHero(context: SiteContext): string {
  return `<section class="lp-hero"><div class="lp-hero-text"><h1>The all-in-one platform for everything you do online.</h1><p>Join 2 million teams at ${escapeHtml(siteBrand(context.state))} who stopped worrying and started shipping.</p><span class="lp-button is-primary${renderAbVariant(context)}">Start free trial</span><span class="lp-button">Watch the demo ▶</span><p class="lp-fineprint">No credit card required*</p></div>${renderHeroPhoto()}</section>`;
}

function renderNav(context: SiteContext): string {
  const items = NAV_ITEMS.map((item) => `<span>${item}</span>`).join('');
  return `<header class="lp-nav"><span class="lp-logo"><i aria-hidden="true"></i>${escapeHtml(siteBrand(context.state))}</span><nav class="lp-links">${items}</nav><span class="lp-login">Log in</span><span class="lp-cta">Get started</span></header>`;
}

function renderSections(context: SiteContext): string {
  const sections = renderFeatureBlocks(context, LANDING_SECTIONS).join('');
  return sections === '' ? '' : `<div class="lp-sections">${sections}</div>`;
}

/** Where the comments were: switched off, the way sites did it, and the conversation sent to social media. */
function renderCommentsOff(context: SiteContext): string {
  return context.state.featureLevels.comments > 0 ? '<p class="lp-comments-off">💬 Comments are off. Join the conversation on Chirper →</p>' : '';
}

/**
 * 2018's ads: the first is a banner under the hero, the rest fill an "Around the web" grid of clickbait at the bottom.
 * They arrive after the page and push it down: the layout shift the speed score counts.
 */
function renderLeaderboard(context: SiteContext): string {
  const [first] = listAds(context);
  return first === undefined ? '' : `<aside class="lp-leaderboard"><span class="lp-ad-label">Advertisement</span>${renderAdPicture(0)}<span class="lp-ad-text">${renderAdText(first)}</span></aside>`;
}

function renderAroundTheWeb(context: SiteContext): string {
  const rest = listAds(context).slice(1);
  const cards = rest.map((ad, index) => `<li class="lp-chum">${renderAdPicture(index + 1)}${renderAdText(ad)}</li>`).join('');
  return rest.length === 0 ? '' : `<section class="lp-around"><h2 class="lp-around-title">Around the web <span>Sponsored links</span></h2><ul class="lp-chum-grid">${cards}</ul></section>`;
}

/** Your own login, or the error Facespace's shutdown left behind. */
function renderAccountBand(context: SiteContext): string {
  const block = renderFeatureBlocks(context, ['social-login']).join('');
  return block === '' ? '' : `<div class="lp-account">${block}</div>`;
}

function renderLookClasses(context: SiteContext, framework: FrameworkId): string {
  const responsive = isMobileFriendly(context.state) ? ' is-responsive' : '';
  const stories = ownedFeatures(context, ['stories']).length > 0 ? ' has-stories' : '';
  return ` fw-${framework}${responsive}${stories}`;
}

/** The single-page app a framework rewrote your site into: a SaaS landing page, like every other one. */
function renderLandingPage(context: SiteContext, framework: FrameworkId): string {
  return `<div class="site-2018${renderLookClasses(context, framework)}">
    ${renderBootScreen(framework)}
    ${renderNav(context)}
    ${renderFeatureBlocks(context, ['stories']).join('')}
    ${renderHero(context)}
    ${renderLeaderboard(context)}
    <section class="lp-logos"><span>Trusted by teams at</span>${TRUSTED_BY.map((name) => `<b>${name}</b>`).join('')}</section>
    <section class="lp-cards">${renderValueCards()}</section>
    ${renderSections(context)}
    ${renderCommentsOff(context)}
    ${renderFeatureBlocks(context, ['pricing-table']).join('')}
    <section class="lp-testimonials">${renderTestimonials()}</section>
    ${renderAccountBand(context)}
    ${renderAroundTheWeb(context)}
    <footer class="lp-footer">© ${ERAS_BY_ID[context.eraId].year} ${escapeHtml(siteBrand(context.state))}, Inc. · Made with ❤️ in a co-working space · ${escapeHtml(describeBuiltWith(context.state))} · Privacy · Terms</footer>
    ${renderCornerDock(context)}
  </div>`;
}

/**
 * The relaunch keeps your 2011 Bootstrap site until a framework rewrites it as a single-page app. The cookie
 * banner goes on whichever it is: the GDPR applies from the first day of 2018.
 */
export function render2018Site(context: SiteContext): string {
  const framework = findChosenFramework(context.state);
  return framework === null ? `${render2011Site(context)}${renderCornerDock(context)}` : renderLandingPage(context, framework);
}
