import { findChosenFramework, isMobileFriendly } from '../../engine';
import type { FeatureId, GameState } from '../../engine';
import { escapeHtml } from '../dom';
import { describeBuiltWith } from '../framework-presentation';
import { listAds, renderAdPicture, renderAdText } from './ads';
import { renderCornerDock } from './cookie-banner';
import { renderFeatureBlocks } from './features';
import { siteBrand } from './site-context';
import type { SiteContext } from './site-context';
import { renderBootScreen, renderLegalWall } from './site-2018';

/**
 * 2024: the relaunch asked an AI for a redesign, and got the page every 2024 startup had. Big type with a gradient,
 * a sparkle badge, an "Ask AI" box in the hero, and everything else in a bento grid of rounded tiles.
 */

/** The grid: 2024's AI tiles first, then what the old site still has, a tile each. */
const BENTO_TILES: readonly FeatureId[] = ['ai-images', 'for-you-feed', 'ai-articles', 'video-player', 'blog', 'photo-gallery', 'activity-feed', 'map-mashup', 'guestbook', 'midi-player'];
const NAV_ITEMS: readonly string[] = ['Product', 'Pricing', 'Changelog', 'Docs'];
const TRUSTED_BY: readonly string[] = ['Brightloop', 'Quantly', 'Stackwise', 'Paperkite', 'Blinko', 'Promptly'];

interface Look {
  readonly applies: (state: GameState) => boolean;
  readonly className: string;
}

const knows = (upgradeId: GameState['purchasedUpgradeIds'][number]) => (state: GameState): boolean => state.purchasedUpgradeIds.includes(upgradeId);

/** Purchases that change how the whole page looks. */
const LOOKS: readonly Look[] = [
  { applies: isMobileFriendly, className: 'is-responsive' },
  { applies: knows('dark-mode'), className: 'is-dark' },
  { applies: knows('ai-everything'), className: 'has-sparkles' },
  { applies: knows('paywall'), className: 'has-paywall' },
  { applies: knows('scroll-animations'), className: 'has-scroll-reveal' },
];

function renderLookClasses(state: GameState): string {
  const framework = findChosenFramework(state);
  const frameworkClass = framework === null ? [] : [`fw-${framework}`];
  return ['site-2024', ...frameworkClass, ...LOOKS.filter((look) => look.applies(state)).map((look) => look.className)].join(' ');
}

function renderNav(context: SiteContext): string {
  const items = NAV_ITEMS.map((item) => `<span>${item}</span>`).join('');
  return `<header class="ai-nav"><span class="ai-logo"><i aria-hidden="true"></i>${escapeHtml(siteBrand(context.state))}</span><nav class="ai-links">${items}</nav>${renderFeatureBlocks(context, ['language-switcher']).join('')}<span class="ai-cmdk">⌘K</span><span class="ai-login">Sign in</span><span class="ai-cta">Get started</span></header>`;
}

/** The hero: a sparkle badge, a gradient headline, and the "Ask AI" box once you've built it. */
function renderHero(context: SiteContext): string {
  const brand = escapeHtml(siteBrand(context.state));
  return `<section class="ai-hero"><span class="ai-badge">✨ New: ${brand} AI is here</span><h1>The AI-native platform for <span class="ai-gradient">everything</span>.</h1><p>Built for humans. Loved by agents. Join 40 million people who let ${brand} do the thinking.</p>${renderFeatureBlocks(context, ['ai-search']).join('')}<div class="ai-hero-buttons"><span class="ai-button is-primary">Start for free</span><span class="ai-button">Book a demo</span></div></section>`;
}

/** The first ad sits in the grid as a tile marked "Sponsored", as if it were one of yours. */
function renderSponsoredTile(context: SiteContext): string {
  const [first] = listAds(context);
  return first === undefined ? '' : `<aside class="ai-sponsored-tile"><span class="ai-ad-label">Sponsored</span>${renderAdPicture(0)}<span class="ai-ad-text">${renderAdText(first)}</span></aside>`;
}

function renderBento(context: SiteContext): string {
  const tiles = `${renderFeatureBlocks(context, BENTO_TILES).join('')}${renderSponsoredTile(context)}`;
  return tiles === '' ? '' : `<section class="ai-bento">${tiles}</section>`;
}

/** The rest of the ads: a row of "Sponsored results", shaped like the AI answer's sources. */
function renderSponsoredResults(context: SiteContext): string {
  const rest = listAds(context).slice(1);
  const cards = rest.map((ad, index) => `<li class="ai-result">${renderAdPicture(index + 1)}${renderAdText(ad)}</li>`).join('');
  return rest.length === 0 ? '' : `<section class="ai-results"><h2 class="ai-results-title">Sponsored results</h2><ul class="ai-result-grid">${cards}</ul></section>`;
}

function renderAccountBand(context: SiteContext): string {
  const block = renderFeatureBlocks(context, ['social-login']).join('');
  return block === '' ? '' : `<div class="ai-account">${block}</div>`;
}

function renderBoot(state: GameState): string {
  const framework = findChosenFramework(state);
  return framework === null ? '' : renderBootScreen(framework);
}

export function render2024Site(context: SiteContext): string {
  const brand = escapeHtml(siteBrand(context.state));
  return `<div class="${renderLookClasses(context.state)}">
    ${renderBoot(context.state)}
    ${renderNav(context)}
    ${renderHero(context)}
    <section class="ai-logos"><span>Trusted by 10,000+ AI-native teams</span>${TRUSTED_BY.map((name) => `<b>${name}</b>`).join('')}</section>
    ${renderBento(context)}
    ${renderFeatureBlocks(context, ['pricing-table']).join('')}
    <section class="ai-quotes"><figure class="ai-quote"><blockquote>“We replaced our whole support team with ${brand} AI. Then we hired them back.”</blockquote><figcaption>Jo, Head of AI at Brightloop</figcaption></figure><figure class="ai-quote"><blockquote>“It wrote this testimonial.”</blockquote><figcaption>Sam, Founder of Quantly</figcaption></figure></section>
    ${renderFeatureBlocks(context, ['newsletter']).join('')}
    ${renderAccountBand(context)}
    ${renderSponsoredResults(context)}
    <footer class="ai-footer">© 2024 ${brand}, Inc. · ${escapeHtml(describeBuiltWith(context.state))} · AI can make mistakes. Check important info.</footer>
    ${renderLegalWall(context)}
    ${renderCornerDock(context)}
  </div>`;
}
