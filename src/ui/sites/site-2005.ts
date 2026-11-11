import type { FeatureId, GameState, UpgradeId } from '../../engine';
import { escapeHtml, pickCyclic } from '../dom';
import { TEXT_ADS } from '../presentation';
import { renderFeatureBlocks } from './features';
import { siteName } from './site-context';
import type { SiteContext } from './site-context';
import { renderOldSchoolPage } from './site-1997';
import type { HomepageContent, HomepageSkills } from './site-1997';

// 2011 features land here too while the 2011 site still wears its 2005 look.
const WEB2_MAIN_FEATURES: readonly FeatureId[] = ['flash-intro', 'one-pager', 'video-player', 'blog', 'activity-feed', 'comments', 'forum', 'photo-gallery', 'map-mashup'];
const WEB2_SIDEBAR_FEATURES: readonly FeatureId[] = ['share-buttons', 'hit-counter', 'under-construction', 'guestbook', 'tag-cloud', 'midi-player', 'webring'];
const LEGACY_SIDEBAR_FEATURES: readonly FeatureId[] = ['midi-player', 'hit-counter', 'webring', 'tag-cloud', 'share-buttons'];
const LEGACY_MAIN_FEATURES: readonly FeatureId[] = ['flash-intro', 'one-pager', 'video-player', 'blog', 'activity-feed', 'comments', 'forum', 'photo-gallery', 'map-mashup', 'under-construction', 'guestbook'];
const STANDARDS_BADGES: readonly string[] = ['W3C XHTML 1.0', 'W3C CSS', 'RSS 2.0', 'PHP powered', 'MySQL', 'Get the fox browser'];

/** 2005 content crammed into a 1997 page: what you get before you learn CSS. */
function legacy2005Content(skills: HomepageSkills, state: GameState): HomepageContent {
  return {
    title: skills.font ? `Welcome to ${siteName(state)} 2.0!!!` : `${siteName(state)} 2.0`,
    sidebarFeatures: LEGACY_SIDEBAR_FEATURES,
    mainFeatures: LEGACY_MAIN_FEATURES,
  };
}

function web2Classes(state: GameState): string {
  const knows = (upgradeId: UpgradeId): boolean => state.purchasedUpgradeIds.includes(upgradeId);
  return [
    'site-2005',
    knows('web2-design') ? 'is-glossy' : 'is-plain',
    knows('ie6-hacks') ? '' : 'needs-ie6-fix',
    knows('glitter-text') ? 'has-glitter' : '',
    knows('learn-jquery') ? 'has-jquery' : '',
  ].filter((name) => name !== '').join(' ');
}

function renderStandardsBadges(state: GameState): string {
  if (!state.purchasedUpgradeIds.includes('xhtml-badges')) return '';
  return `<p class="w2-badges">${STANDARDS_BADGES.map((badge) => `<span class="badge-80x15">${escapeHtml(badge)}</span>`).join('')}</p>`;
}

function renderSponsoredLinks(adCount: number): string {
  if (adCount === 0) return '';
  const items = Array.from({ length: adCount }, (_, index) => pickCyclic(TEXT_ADS, index, { title: 'Ad', url: 'example', text: '' }))
    .map((ad) => `<li><span class="ad-title">${escapeHtml(ad.title)}</span><span class="ad-url">${escapeHtml(ad.url)}</span><span class="ad-text">${escapeHtml(ad.text)}</span></li>`)
    .join('');
  return `<section class="feature-block sponsored"><h2 class="feature-heading">Sponsored links</h2><ul class="sponsored-list">${items}</ul></section>`;
}

function render2005DivSite(context: SiteContext): string {
  const main = renderFeatureBlocks(context, WEB2_MAIN_FEATURES).join('');
  const sidebar = renderFeatureBlocks(context, WEB2_SIDEBAR_FEATURES).join('');
  const intro = main === '' ? '<section class="feature-block w2-intro"><h2 class="feature-heading">Welcome to the new myhomepage!</h2><p>We relaunched. Start a blog to fill this space.</p></section>' : main;
  return `<div class="${web2Classes(context.state)}"><header class="w2-header"><span class="w2-logo">${siteName(context.state)}</span><span class="w2-beta"><span>beta</span></span><nav class="w2-nav"><span class="is-active">Home</span><span>Blog</span><span>Tags</span><span>About</span></nav></header><div class="w2-columns"><div class="w2-main">${intro}</div><aside class="w2-sidebar">${renderSponsoredLinks(context.state.adCount)}${sidebar}</aside></div><footer class="w2-footer">${renderStandardsBadges(context.state)}© 2005 ${siteName(context.state)} · Powered by PHP · Valid XHTML 1.0 (mostly)</footer></div>`;
}

/** The relaunch keeps the old hand-written page until you learn CSS; then it becomes a div layout. */
export function render2005Site(context: SiteContext): string {
  const knowsCss = context.state.purchasedUpgradeIds.includes('learn-css');
  return knowsCss ? render2005DivSite(context) : renderOldSchoolPage(context, legacy2005Content);
}
