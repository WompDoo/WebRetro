import { calculateMsUntilVirusGrows, calculateRequiredVirusFood, FEATURE_IDS, getFeatureDisplayName } from '../engine';
import type { EraId, FeatureId, GameState, Infection, SpamInfection, UpgradeId, VirusInfection } from '../engine';
import { escapeHtml, pickCyclic } from './dom';
import { BANNER_ADS, BLOG_POSTS, BLOGROLL, COMMENTS, ERA_PRESENTATION, TAGS, TEXT_ADS } from './presentation';
import type { MessageCopy } from './presentation';

const COUNTER_DIGITS = 7;
const MAX_CONSTRUCTION_SIGNS = 4;
const MAX_GUESTBOOK_ENTRIES = 5;
const GUESTBOOK_ROTATION_MS = 7_000;
const MAX_BLOG_POSTS = 4;
const MAX_COMMENTS = 5;
const BASE_TAG_COUNT = 6;
const TAGS_PER_LEVEL = 2;
const TRACK_DURATION_SECONDS = 95;
const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const WEBRING_SITES_PER_LEVEL = 12;
const BLOGROLL_BASE_LINKS = 2;
const EQUALIZER_BARS = 5;
const AVATAR_COLORS: readonly string[] = ['#5C9E2E', '#2A6FB0', '#E07A00', '#9B4DCA', '#C9342E'];
const TAG_SIZES_PX: readonly number[] = [11, 13, 15, 18, 22];
const SPAM_LINES: readonly string[] = ['BUY CHEAP RINGTONES!!!', 'cl1ck h3re for fr33 $$$', 'great post. visit my site', 'V1AGR... [deleted]'];
const FALLBACK_MESSAGE: MessageCopy = { author: 'someone', text: 'hi' };

interface SiteContext {
  readonly state: GameState;
  readonly eraId: EraId;
  readonly nowMs: number;
}

type FeatureRenderer = (context: SiteContext) => string;

const is1997 = (context: SiteContext): boolean => context.eraId === 'homepage-1997';
const levelOf = (context: SiteContext, featureId: FeatureId): number => context.state.featureLevels[featureId];
const heading = (context: SiteContext, featureId: FeatureId, override?: string): string =>
  `<h2 class="feature-heading">${escapeHtml(override ?? getFeatureDisplayName(featureId, context.eraId))}</h2>`;

/** "Start the counter at 10,000" is a lie the counter tells. Real visitor stats stay honest. */
const COUNTER_HEAD_START = 10_000;

export function calculateDisplayedCounter(state: GameState): number {
  const hasHeadStart = state.purchasedUpgradeIds.includes('counter-starts-at-ten-thousand');
  return state.lifetimeVisitors + (hasHeadStart ? COUNTER_HEAD_START : 0);
}

export function renderCounterDigits(visitors: number): string {
  return Math.floor(visitors)
    .toString()
    .padStart(COUNTER_DIGITS, '0')
    .split('')
    .map((digit) => `<span class="counter-digit">${digit}</span>`)
    .join('');
}

export function renderGuestbookEntries(eraId: EraId, level: number, nowMs: number): string {
  const pool = ERA_PRESENTATION[eraId].guestbook;
  const offset = Math.floor(nowMs / GUESTBOOK_ROTATION_MS);
  const count = Math.min(level + 1, MAX_GUESTBOOK_ENTRIES);
  return Array.from({ length: count }, (_, index) => pickCyclic(pool, offset + index, FALLBACK_MESSAGE))
    .map((entry) => `<li class="guestbook-entry"><b>${escapeHtml(entry.author)}</b> ${escapeHtml(entry.text)}</li>`)
    .join('');
}

export function renderMusicStatus(eraId: EraId, nowMs: number): string {
  const elapsedSeconds = Math.floor(nowMs / MS_PER_SECOND);
  const trackIndex = Math.floor(elapsedSeconds / TRACK_DURATION_SECONDS);
  const trackSeconds = elapsedSeconds % TRACK_DURATION_SECONDS;
  const minutes = Math.floor(trackSeconds / SECONDS_PER_MINUTE);
  const seconds = (trackSeconds % SECONDS_PER_MINUTE).toString().padStart(2, '0');
  const track = pickCyclic(ERA_PRESENTATION[eraId].musicTracks, trackIndex, 'song.mid');
  return `${escapeHtml(track)} · ${minutes}:${seconds}`;
}

const renderHitCounter: FeatureRenderer = (context) =>
  is1997(context)
    ? `<p class="counter-label">You are visitor number</p><div class="counter" data-live="counter">${renderCounterDigits(calculateDisplayedCounter(context.state))}</div>`
    : `${heading(context, 'hit-counter')}<div class="counter" data-live="counter">${renderCounterDigits(calculateDisplayedCounter(context.state))}</div><p class="counter-label">visits since launch</p>`;

const renderConstruction: FeatureRenderer = (context) => {
  const label = is1997(context) ? 'UNDER CONSTRUCTION' : 'beta';
  const count = Math.min(levelOf(context, 'under-construction'), MAX_CONSTRUCTION_SIGNS);
  const signs = Array.from({ length: count }, () => `<div class="construction-sign"><span>${label}</span></div>`).join('');
  return `<div class="construction-row">${signs}</div>`;
};

const renderGuestbook: FeatureRenderer = (context) => {
  const title = is1997(context) ? 'Sign my guestbook!' : undefined;
  const entries = renderGuestbookEntries(context.eraId, levelOf(context, 'guestbook'), context.nowMs);
  return `${heading(context, 'guestbook', title)}<ul class="guestbook-list" data-live="guestbook">${entries}</ul>`;
};

const renderMusicPlayer: FeatureRenderer = (context) => {
  const bars = Array.from({ length: EQUALIZER_BARS }, () => '<i></i>').join('');
  const note = is1997(context)
    ? `Playlist: ${levelOf(context, 'midi-player')} MIDI files · autoplay ON`
    : `${levelOf(context, 'midi-player')} episodes · subscribe with RSS`;
  const title = is1997(context) ? '' : heading(context, 'midi-player');
  return `${title}<div class="music-player"><span class="music-play" aria-hidden="true">▶</span><span class="music-status" data-live="music">${renderMusicStatus(context.eraId, context.nowMs)}</span><span class="music-eq" aria-hidden="true">${bars}</span></div><p class="music-note">${note}</p>`;
};

const renderWebring: FeatureRenderer = (context) => {
  if (!is1997(context)) {
    const count = Math.min(levelOf(context, 'webring') + BLOGROLL_BASE_LINKS, BLOGROLL.length);
    const links = BLOGROLL.slice(0, count).map((name) => `<li><span class="fake-link">${escapeHtml(name)}</span></li>`).join('');
    return `${heading(context, 'webring')}<ul class="blogroll">${links}</ul>`;
  }
  const members = levelOf(context, 'webring') * WEBRING_SITES_PER_LEVEL;
  return `<p class="webring-intro">This site is a proud member of the</p><p class="webring-name">★ Cool Homepages Webring ★</p><p class="webring-nav"><span class="fake-link">&lt;&lt; Prev</span> | <span class="fake-link">Random</span> | <span class="fake-link">Next &gt;&gt;</span></p><p class="webring-count">${members} member sites</p>`;
};

const renderBlog: FeatureRenderer = (context) => {
  const posts = BLOG_POSTS.slice(0, Math.min(levelOf(context, 'blog'), MAX_BLOG_POSTS))
    .map((post) => `<article class="blog-post"><h3>${escapeHtml(post.title)}</h3><p class="post-meta">${post.date} · permalink · ${levelOf(context, 'comments')} comments</p><p>${escapeHtml(post.excerpt)}</p></article>`)
    .join('');
  return `${heading(context, 'blog', 'Latest posts')}${posts}`;
};

const renderComments: FeatureRenderer = (context) => {
  const count = Math.min(levelOf(context, 'comments') + 1, MAX_COMMENTS);
  const items = COMMENTS.slice(0, count)
    .map((comment, index) => {
      const color = pickCyclic(AVATAR_COLORS, index, '#5C9E2E');
      return `<li class="comment"><span class="avatar" style="background:${color}">${escapeHtml(comment.author.charAt(0).toUpperCase())}</span><span><b>${escapeHtml(comment.author)}</b> ${escapeHtml(comment.text)}</span></li>`;
    })
    .join('');
  return `${heading(context, 'comments', `Comments (${levelOf(context, 'comments')})`)}<ul class="comment-list">${items}</ul>`;
};

const renderTagCloud: FeatureRenderer = (context) => {
  const count = Math.min(BASE_TAG_COUNT + levelOf(context, 'tag-cloud') * TAGS_PER_LEVEL, TAGS.length);
  const tags = TAGS.slice(0, count)
    .map((tag, index) => `<span class="tag" style="font-size:${pickCyclic(TAG_SIZES_PX, index * 3 + tag.length, 13)}px">${escapeHtml(tag)}</span>`)
    .join(' ');
  return `${heading(context, 'tag-cloud', 'Tags')}<p class="tag-cloud">${tags}</p>`;
};

const FEATURE_RENDERERS: Readonly<Record<FeatureId, FeatureRenderer>> = {
  'hit-counter': renderHitCounter,
  'under-construction': renderConstruction,
  guestbook: renderGuestbook,
  'midi-player': renderMusicPlayer,
  webring: renderWebring,
  blog: renderBlog,
  comments: renderComments,
  'tag-cloud': renderTagCloud,
};


function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / MS_PER_SECOND);
  return `${Math.floor(totalSeconds / SECONDS_PER_MINUTE)}:${(totalSeconds % SECONDS_PER_MINUTE).toString().padStart(2, '0')}`;
}

export function renderVirusTimer(virus: VirusInfection): string {
  const msUntilGrowth = calculateMsUntilVirusGrows(virus);
  return msUntilGrowth === null
    ? 'Fully grown'
    : `Needs ${calculateRequiredVirusFood(virus) + 1} food in ${formatCountdown(msUntilGrowth)}`;
}

function renderVirusOverlay(virus: VirusInfection): string {
  const food = calculateRequiredVirusFood(virus);
  return `<button type="button" class="infection" data-action="open-snake" data-id="${virus.id}" data-kind="virus"><span class="infection-title">☣ VIRUS DETECTED</span><span class="infection-hint">Click to remove it · ${food} food needed</span><span class="infection-timer" data-live="virus-timer" data-id="${virus.id}">${renderVirusTimer(virus)}</span></button>`;
}

function renderSpamOverlay(spam: SpamInfection): string {
  return `<button type="button" class="infection" data-action="scrub-infection" data-id="${spam.id}" data-kind="spam"><span class="infection-spam">${SPAM_LINES.map(escapeHtml).join('<br>')}</span><span class="infection-title">SPAM FLOOD</span><span class="infection-hint">Click to delete the spam · ${spam.cleanClicksRemaining} left</span></button>`;
}

function renderInfectionOverlay(infection: Infection): string {
  return infection.kind === 'virus' ? renderVirusOverlay(infection) : renderSpamOverlay(infection);
}

function renderFeatureBlock(context: SiteContext, featureId: FeatureId): string {
  const infection = context.state.infections.find((candidate) => candidate.featureId === featureId);
  const overlay = infection === undefined ? '' : renderInfectionOverlay(infection);
  return `<section class="feature-block" data-feature="${featureId}">${FEATURE_RENDERERS[featureId](context)}${overlay}</section>`;
}

function ownedFeatures(context: SiteContext, order: readonly FeatureId[]): readonly FeatureId[] {
  return order.filter((featureId) => levelOf(context, featureId) > 0);
}

function renderBanner(index: number): string {
  const headline = pickCyclic(BANNER_ADS, index, 'CLICK HERE');
  return `<div class="banner-ad banner-ad--${index % 4}"><span class="banner-headline">${escapeHtml(headline)}</span><span class="banner-cta">CLICK HERE</span></div>`;
}

function interleaveBanners(blocks: readonly string[], adCount: number): string {
  const banners = Array.from({ length: adCount }, (_, index) => renderBanner(index));
  const merged = blocks.flatMap((block, index) => (index % 2 === 0 && banners.length > index / 2 ? [block, banners[index / 2] ?? ''] : [block]));
  const placedBanners = Math.min(Math.ceil(blocks.length / 2), adCount);
  return [...merged, ...banners.slice(placedBanners)].join('<hr class="rainbow">');
}

const MARQUEE_TEXT = '*** Best viewed in 800x600 *** Sign my guestbook!!! *** You are LIVE on the World Wide Web ***';
const TABLE_SIDEBAR_FEATURES: readonly FeatureId[] = ['hit-counter', 'webring'];
const TABLE_MAIN_FEATURES: readonly FeatureId[] = ['under-construction', 'guestbook', 'midi-player'];
const NAV_LINKS: readonly string[] = ['Home', 'About me', 'My cat', 'Cool links', 'Guestbook', 'Email me'];

/** What the developer knows decides what the 1997 page looks like. */
interface HomepageSkills {
  readonly font: boolean;
  readonly background: boolean;
  readonly links: boolean;
  readonly marquee: boolean;
  readonly tables: boolean;
}

function readHomepageSkills(state: GameState): HomepageSkills {
  const knows = (skillId: UpgradeId): boolean => state.purchasedUpgradeIds.includes(skillId);
  return {
    font: knows('font-tags'),
    background: knows('body-background'),
    links: knows('hyperlinks'),
    marquee: knows('marquee-blink'),
    tables: knows('table-layouts'),
  };
}

function homepageClasses(skills: HomepageSkills): string {
  const modifiers = [
    skills.font ? 'has-font' : '',
    skills.background ? 'has-background' : '',
    skills.links ? 'has-links' : '',
    skills.tables ? 'is-table-layout' : '',
  ].filter((modifier) => modifier !== '');
  return ['site-1997', ...modifiers].join(' ');
}

function renderHomepageTitle(skills: HomepageSkills): string {
  const title = skills.font ? 'Welcome to My Homepage!!!' : 'Hello World!';
  const marquee = skills.marquee ? `<div class="site-marquee"><span>${MARQUEE_TEXT}</span></div>` : '';
  return `<h1 class="site-title">${title}</h1>${marquee}`;
}

function renderHomepageIntro(skills: HomepageSkills): string {
  if (!skills.font) return '';
  const blink = skills.marquee ? ' <span class="blink">NEW!</span>' : '';
  return `<p class="site-intro">Hi!! I like computers, my cat, and pizza.${blink} This is my first web page. Hope you like it!!</p>`;
}

function renderHomepageFooter(skills: HomepageSkills): string {
  if (!skills.font) return '';
  const email = skills.links ? ' · <span class="fake-link">Email me!</span>' : '';
  return `<p class="site-footer">Last updated 10/31/97 · Made with a text editor${email}</p>`;
}

function renderNavLinks(skills: HomepageSkills): string {
  const linkClass = skills.links ? 'fake-link' : 'plain-link';
  return NAV_LINKS.map((link) => `<li><span class="${linkClass}">${link}</span></li>`).join('');
}

/** After "Learn <TABLE> layouts": the classic navigation column on the left, content on the right. */
function render1997TableSite(context: SiteContext, skills: HomepageSkills): string {
  const sidebar = ownedFeatures(context, TABLE_SIDEBAR_FEATURES).map((featureId) => renderFeatureBlock(context, featureId)).join('');
  const mainBlocks = ownedFeatures(context, TABLE_MAIN_FEATURES).map((featureId) => renderFeatureBlock(context, featureId));
  const intro = renderHomepageIntro(skills);
  const about = intro === '' ? [] : [`<section class="feature-block t97-about"><h2 class="feature-heading">About me</h2>${intro}</section>`];
  return `<div class="${homepageClasses(skills)}">
    <div class="t97-header">${renderHomepageTitle(skills)}</div>
    <div class="t97-table">
      <nav class="t97-nav"><p class="t97-nav-title">~ Navigation ~</p><ul class="t97-links">${renderNavLinks(skills)}</ul>${sidebar}</nav>
      <div class="t97-main">${interleaveBanners([...about, ...mainBlocks], context.state.adCount)}</div>
    </div>
    ${renderHomepageFooter(skills)}
  </div>`;
}

/** Before tables: everything stacks under the previous thing, which is exactly how it was. */
function render1997StackedSite(context: SiteContext, skills: HomepageSkills): string {
  const blocks = ownedFeatures(context, FEATURE_IDS).map((featureId) => renderFeatureBlock(context, featureId));
  const content = blocks.length === 0 && context.state.adCount === 0 ? '' : interleaveBanners(blocks, context.state.adCount);
  return `<div class="${homepageClasses(skills)}">${renderHomepageTitle(skills)}${renderHomepageIntro(skills)}${content}${renderHomepageFooter(skills)}</div>`;
}

function render1997Site(context: SiteContext): string {
  const skills = readHomepageSkills(context.state);
  return skills.tables ? render1997TableSite(context, skills) : render1997StackedSite(context, skills);
}

const WEB2_MAIN_FEATURES: readonly FeatureId[] = ['blog', 'comments'];
const WEB2_SIDEBAR_FEATURES: readonly FeatureId[] = ['hit-counter', 'under-construction', 'guestbook', 'tag-cloud', 'midi-player', 'webring'];

function renderSponsoredLinks(adCount: number): string {
  if (adCount === 0) return '';
  const items = Array.from({ length: adCount }, (_, index) => pickCyclic(TEXT_ADS, index, { title: 'Ad', url: 'example', text: '' }))
    .map((ad) => `<li><span class="ad-title">${escapeHtml(ad.title)}</span><span class="ad-url">${escapeHtml(ad.url)}</span><span class="ad-text">${escapeHtml(ad.text)}</span></li>`)
    .join('');
  return `<section class="feature-block sponsored"><h2 class="feature-heading">Sponsored links</h2><ul class="sponsored-list">${items}</ul></section>`;
}

function render2005Site(context: SiteContext): string {
  const main = ownedFeatures(context, WEB2_MAIN_FEATURES).map((featureId) => renderFeatureBlock(context, featureId)).join('');
  const sidebar = ownedFeatures(context, WEB2_SIDEBAR_FEATURES).map((featureId) => renderFeatureBlock(context, featureId)).join('');
  const intro = main === '' ? '<section class="feature-block w2-intro"><h2 class="feature-heading">Welcome to the new myhomepage!</h2><p>We relaunched. Start a blog to fill this space.</p></section>' : main;
  return `<div class="site-2005"><header class="w2-header"><span class="w2-logo">myhomepage</span><span class="w2-beta"><span>beta</span></span><nav class="w2-nav"><span class="is-active">Home</span><span>Blog</span><span>Tags</span><span>About</span></nav></header><div class="w2-columns"><div class="w2-main">${intro}</div><aside class="w2-sidebar">${renderSponsoredLinks(context.state.adCount)}${sidebar}</aside></div><footer class="w2-footer">© 2005 myhomepage · Powered by PHP · Valid XHTML 1.0 (mostly)</footer></div>`;
}

const SITE_RENDERERS: Readonly<Record<EraId, (context: SiteContext) => string>> = {
  'homepage-1997': render1997Site,
  'web2-2005': render2005Site,
};

export function renderSite(state: GameState, nowMs: number): string {
  return SITE_RENDERERS[state.eraId]({ state, eraId: state.eraId, nowMs });
}

export function calculateSiteSignature(state: GameState): string {
  const levels = FEATURE_IDS.map((featureId) => state.featureLevels[featureId]).join(',');
  const infections = state.infections
    .map((infection) =>
      infection.kind === 'virus'
        ? `${infection.id}:food${calculateRequiredVirusFood(infection)}`
        : `${infection.id}:clicks${infection.cleanClicksRemaining}`,
    )
    .join(',');
  const skills = Object.values(readHomepageSkills(state)).map((known) => (known ? '1' : '0')).join('');
  return `${state.eraId}|${skills}|${levels}|${state.adCount}|${infections}`;
}
