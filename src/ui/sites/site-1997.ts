import { ERAS_BY_ID, FEATURE_IDS, getActiveUpgradeIds } from '../../engine';
import type { FeatureId, GameState, UpgradeId } from '../../engine';
import { escapeHtml, pickCyclic } from '../dom';
import { BANNER_ADS } from '../presentation';
import { renderFeatureBlocks } from './features';
import type { SiteContext } from './site-context';

const BANNER_STYLES = 4;
const MARQUEE_TEXT = '*** Best viewed with Web Navigator 3.0 *** Sign my guestbook!!! *** You are LIVE on the World Wide Web ***';
/** With tables, the music player sits right under the navigation, where every 1997 sidebar kept it. */
const TABLE_SIDEBAR_FEATURES: readonly FeatureId[] = ['midi-player', 'hit-counter', 'webring'];
const TABLE_MAIN_FEATURES: readonly FeatureId[] = ['under-construction', 'guestbook'];
// Stacked 1997 pages list the sidebar features first, the way they were built.
const STACKED_1997_ORDER: readonly FeatureId[] = FEATURE_IDS;
const NAV_LINKS: readonly string[] = ['Home', 'About me', 'My cat', 'Cool links', 'Guestbook', 'Email me'];
const WEEKDAYS: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS: readonly string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** What the developer knows decides what the 1997 page looks like. */
export interface HomepageSkills {
  readonly font: boolean;
  readonly background: boolean;
  readonly links: boolean;
  readonly marquee: boolean;
  readonly tables: boolean;
  readonly javascript: boolean;
}

/** Which features go where. 1997 and the pre-CSS 2005 page share the layout and differ in content. */
export interface HomepageContent {
  readonly title: string;
  readonly sidebarFeatures: readonly FeatureId[];
  readonly mainFeatures: readonly FeatureId[];
}

export type HomepageContentProvider = (skills: HomepageSkills, state: GameState) => HomepageContent;

function readHomepageSkills(state: GameState): HomepageSkills {
  const knows = (skillId: UpgradeId): boolean => state.purchasedUpgradeIds.includes(skillId);
  return {
    font: knows('font-tags'),
    background: knows('body-background'),
    links: knows('hyperlinks'),
    marquee: knows('marquee-blink'),
    tables: knows('table-layouts'),
    javascript: knows('learn-javascript'),
  };
}

/** Boosts that change how the whole page looks: blinking banners, the GIF pack. */
const BOOST_CLASSES: Readonly<Partial<Record<UpgradeId, string>>> = {
  'animated-banners': 'has-animated-banners',
  'animated-gif-pack': 'has-gif-pack',
  'fixed-width-800': 'is-800-wide',
};

/** Only boosts still in fashion: a retired one leaves the page with its effect. */
function boostClasses(state: GameState): readonly string[] {
  return getActiveUpgradeIds(state).flatMap((upgradeId) => {
    const className = BOOST_CLASSES[upgradeId];
    return className === undefined ? [] : [className];
  });
}

function homepageClasses(skills: HomepageSkills, state: GameState): string {
  const modifiers = [
    skills.font ? 'has-font' : '',
    skills.background ? 'has-background' : '',
    skills.links ? 'has-links' : '',
    skills.tables ? 'is-table-layout' : '',
    skills.javascript ? 'has-javascript' : '',
  ].filter((modifier) => modifier !== '');
  return ['site-1997', ...modifiers, ...boostClasses(state)].join(' ');
}

function homepage1997Content(skills: HomepageSkills, state: GameState): HomepageContent {
  const title = skills.font ? `Welcome to ${state.siteName}!!!` : 'Hello World!';
  return skills.tables
    ? { title, sidebarFeatures: TABLE_SIDEBAR_FEATURES, mainFeatures: TABLE_MAIN_FEATURES }
    : { title, sidebarFeatures: [], mainFeatures: STACKED_1997_ORDER };
}

/** document.write(new Date()), the way every 1997 homepage did it. The year stays in the era's year. */
export function renderJavaScriptClock(nowMs: number, year: number): string {
  const now = new Date(nowMs);
  const time = now.toLocaleTimeString('en-US');
  return `Today is ${pickCyclic(WEEKDAYS, now.getDay(), 'Monday')}, ${pickCyclic(MONTHS, now.getMonth(), 'January')} ${now.getDate()}, ${year} · ${time}`;
}

function renderHomepageTitle(context: SiteContext, skills: HomepageSkills, title: string): string {
  const marquee = skills.marquee ? `<div class="site-marquee"><span>${MARQUEE_TEXT}</span></div>` : '';
  const clock = skills.javascript ? `<p class="js-clock" data-live="js-clock">${renderJavaScriptClock(context.nowMs, ERAS_BY_ID[context.eraId].year)}</p>` : '';
  return `<h1 class="site-title">${escapeHtml(title)}</h1>${marquee}${clock}`;
}

function renderHomepageIntro(skills: HomepageSkills): string {
  if (!skills.font) return '';
  const blink = skills.marquee ? ' <span class="blink">NEW!</span>' : '';
  return `<p class="site-intro">Hi!! I like computers, my cat, and pizza.${blink} This is my first web page. Hope you like it!!</p>`;
}

/** Little 88×31 buttons at the bottom of every 1997 page: what you signed up for, and what you validated. */
const FOOTER_BADGES: readonly (readonly [UpgradeId, string])[] = [
  ['html-validator', '<span class="badge97 is-valid">✓ HTML 3.2 checked!</span>'],
  ['web-directories', '<span class="badge97 is-listed">★ Listed in Webcrawlr ★</span>'],
  ['banner-exchange', '<span class="badge97 is-swap">BannerSwap: your banner here!</span>'],
  ['fixed-width-800', '<span class="badge97 is-800">Best viewed at 800×600</span>'],
];

function renderBadges(state: GameState): string {
  const badges = FOOTER_BADGES.filter(([upgradeId]) => state.purchasedUpgradeIds.includes(upgradeId)).map(([, badge]) => badge);
  return badges.length === 0 ? '' : `<p class="site-badges">${badges.join('')}</p>`;
}

function renderHomepageFooter(skills: HomepageSkills, state: GameState): string {
  const email = skills.links ? ' · <span class="fake-link">Email me!</span>' : '';
  const footer = skills.font ? `<p class="site-footer">Last updated 10/31/97 · Made with a text editor${email}</p>` : '';
  return `${footer}${renderBadges(state)}`;
}

function renderNavLinks(skills: HomepageSkills): string {
  const linkClass = skills.links ? 'fake-link' : 'plain-link';
  return NAV_LINKS.map((link) => `<li><span class="${linkClass}">${link}</span></li>`).join('');
}

function renderBanner(index: number): string {
  const headline = pickCyclic(BANNER_ADS, index, 'CLICK HERE');
  return `<div class="banner-ad banner-ad--${index % BANNER_STYLES}"><span class="banner-headline">${escapeHtml(headline)}</span><span class="banner-cta">CLICK HERE</span></div>`;
}

/** A banner after every second block, the rest at the bottom, all separated by rainbow rules. */
function interleaveBanners(blocks: readonly string[], adCount: number): string {
  const banners = Array.from({ length: adCount }, (_, index) => renderBanner(index));
  const merged = blocks.flatMap((block, index) => (index % 2 === 0 && banners.length > index / 2 ? [block, banners[index / 2] ?? ''] : [block]));
  const placedBanners = Math.min(Math.ceil(blocks.length / 2), adCount);
  return [...merged, ...banners.slice(placedBanners)].join('<hr class="rainbow">');
}

/** A banner after every block, separated by rainbow rules: one more banner than blocks fits, ending the column. */
function bannerAfterEveryBlock(blocks: readonly string[], banners: readonly string[]): string {
  const interleaved = blocks.flatMap((block, index) => [block, ...banners.slice(index, index + 1)]);
  return [...interleaved, ...banners.slice(blocks.length, mainColumnBanners(blocks))].join('<hr class="rainbow">');
}

function mainColumnBanners(blocks: readonly string[]): number {
  return blocks.length + 1;
}

/**
 * After "Learn <TABLE> layouts": the classic navigation column on the left, content on the right. Banners go
 * after each content block; the rest run down the navigation column, the way 1997 sites filled theirs.
 */
function render1997TableSite(context: SiteContext, skills: HomepageSkills, content: HomepageContent): string {
  const sidebar = renderFeatureBlocks(context, content.sidebarFeatures).join('');
  const mainBlocks = renderFeatureBlocks(context, content.mainFeatures);
  const intro = renderHomepageIntro(skills);
  const about = intro === '' ? [] : [`<section class="feature-block t97-about"><h2 class="feature-heading">About me</h2>${intro}</section>`];
  const blocks = [...about, ...mainBlocks];
  const banners = Array.from({ length: context.state.adCount }, (_, index) => renderBanner(index));
  return `<div class="${homepageClasses(skills, context.state)}">
    <div class="t97-header">${renderHomepageTitle(context, skills, content.title)}</div>
    <div class="t97-table">
      <nav class="t97-nav"><div class="t97-menu"><p class="t97-nav-title">~ Navigation ~</p><ul class="t97-links">${renderNavLinks(skills)}</ul></div>${sidebar}${banners.slice(mainColumnBanners(blocks)).join('')}</nav>
      <div class="t97-main">${bannerAfterEveryBlock(blocks, banners)}</div>
    </div>
    ${renderHomepageFooter(skills, context.state)}
  </div>`;
}

/** Before tables: everything stacks under the previous thing, which is exactly how it was. */
function render1997StackedSite(context: SiteContext, skills: HomepageSkills, content: HomepageContent): string {
  const blocks = renderFeatureBlocks(context, [...content.mainFeatures, ...content.sidebarFeatures]);
  const body = blocks.length === 0 && context.state.adCount === 0 ? '' : interleaveBanners(blocks, context.state.adCount);
  return `<div class="${homepageClasses(skills, context.state)}">${renderHomepageTitle(context, skills, content.title)}${renderHomepageIntro(skills)}${body}${renderHomepageFooter(skills, context.state)}</div>`;
}

/** The hand-written page: stacked until you learn tables. 2005 keeps using it until you learn CSS. */
export function renderOldSchoolPage(context: SiteContext, content: HomepageContentProvider): string {
  const skills = readHomepageSkills(context.state);
  const page = content(skills, context.state);
  return skills.tables ? render1997TableSite(context, skills, page) : render1997StackedSite(context, skills, page);
}

export function render1997Site(context: SiteContext): string {
  return renderOldSchoolPage(context, homepage1997Content);
}
