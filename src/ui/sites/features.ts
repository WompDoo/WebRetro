import { FEATURES_BY_ID, formatCompactNumber, isFeatureOnPage, isFeaturePluginDead, UPGRADES_BY_ID } from '../../engine';
import type { EraId, FeatureId, GameState } from '../../engine';
import { escapeHtml, pickCyclic } from '../dom';
import { BLOG_POSTS, BLOGROLL, COMMENTS, ERA_PRESENTATION, TAGS } from '../presentation';
import type { MessageCopy } from '../presentation';
import { renderInfectionOverlay } from './infections';
import { formatMinutesAndSeconds, heading, is1997, levelOf, siteName, toWholeSeconds } from './site-context';
import type { FeatureRenderer, SiteContext } from './site-context';

const COUNTER_DIGITS = 7;
const MAX_CONSTRUCTION_SIGNS = 4;
const MAX_GUESTBOOK_ENTRIES = 5;
const GUESTBOOK_ROTATION_MS = 7_000;
const MAX_BLOG_POSTS = 4;
const MAX_COMMENTS = 5;
const BASE_TAG_COUNT = 6;
const TAGS_PER_LEVEL = 2;
const TRACK_DURATION_SECONDS = 95;
const WEBRING_SITES_PER_LEVEL = 12;
const BLOGROLL_BASE_LINKS = 2;
const EQUALIZER_BARS = 5;
const AVATAR_COLORS: readonly string[] = ['#5C9E2E', '#2A6FB0', '#E07A00', '#9B4DCA', '#C9342E'];
const FALLBACK_AVATAR_COLOR = '#2A6FB0';
const TAG_SIZES_PX: readonly number[] = [11, 13, 15, 18, 22];
const FALLBACK_MESSAGE: MessageCopy = { author: 'someone', text: 'hi' };

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
  const elapsedSeconds = toWholeSeconds(nowMs);
  const trackIndex = Math.floor(elapsedSeconds / TRACK_DURATION_SECONDS);
  const track = pickCyclic(ERA_PRESENTATION[eraId].musicTracks, trackIndex, 'song.mid');
  return `${escapeHtml(track)} · ${formatMinutesAndSeconds(elapsedSeconds % TRACK_DURATION_SECONDS)}`;
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

const renderBlogroll: FeatureRenderer = (context) => {
  const count = Math.min(levelOf(context, 'webring') + BLOGROLL_BASE_LINKS, BLOGROLL.length);
  const links = BLOGROLL.slice(0, count).map((name) => `<li><span class="fake-link">${escapeHtml(name)}</span></li>`).join('');
  return `${heading(context, 'webring')}<ul class="blogroll">${links}</ul>`;
};

const renderWebring: FeatureRenderer = (context) => {
  if (!is1997(context)) return renderBlogroll(context);
  const members = levelOf(context, 'webring') * WEBRING_SITES_PER_LEVEL;
  return `<p class="webring-intro">This site is a proud member of the</p><p class="webring-name">★ Cool Homepages Webring ★</p><p class="webring-nav"><span class="fake-link">&lt;&lt; Prev</span> | <span class="fake-link">Random</span> | <span class="fake-link">Next &gt;&gt;</span></p><p class="webring-count">${members} member sites</p>`;
};

const renderBlog: FeatureRenderer = (context) => {
  const posts = BLOG_POSTS.slice(0, Math.min(levelOf(context, 'blog'), MAX_BLOG_POSTS))
    .map((post) => `<article class="blog-post"><h3>${escapeHtml(post.title)}</h3><p class="post-meta">${post.date} · permalink · ${levelOf(context, 'comments')} comments</p><p>${escapeHtml(post.excerpt)}</p></article>`)
    .join('');
  return `${heading(context, 'blog', 'Latest posts')}${posts}`;
};

const CAPTCHA_WORDS: readonly string[] = ['xK7pQ', 'overlooks', 'w4bT9', 'inquest', 'mR2zV', 'gl0ssy'];

/** The visible half of the CAPTCHA defense: commenters have to get past this box. */
function renderCaptchaBox(context: SiteContext): string {
  if (!context.state.enabledDefenseIds.includes('captcha')) return '';
  const word = pickCyclic(CAPTCHA_WORDS, levelOf(context, 'comments'), 'xK7pQ');
  return `<div class="captcha-box"><span class="captcha-word" aria-hidden="true">${escapeHtml(word)}</span><span class="captcha-input">Type the letters above to post</span><span class="captcha-note">Spam bots: blocked</span></div>`;
}

const renderComments: FeatureRenderer = (context) => {
  const count = Math.min(levelOf(context, 'comments') + 1, MAX_COMMENTS);
  const items = COMMENTS.slice(0, count)
    .map((comment, index) => {
      const color = pickCyclic(AVATAR_COLORS, index, '#5C9E2E');
      return `<li class="comment"><span class="avatar" style="background:${color}">${escapeHtml(comment.author.charAt(0).toUpperCase())}</span><span><b>${escapeHtml(comment.author)}</b> ${escapeHtml(comment.text)}</span></li>`;
    })
    .join('');
  return `${heading(context, 'comments', `Comments (${levelOf(context, 'comments')})`)}<ul class="comment-list">${items}<li class="comment-loading"><span class="spinner" aria-hidden="true"></span>Loading new comments…</li></ul>${renderCaptchaBox(context)}`;
};

const renderTagCloud: FeatureRenderer = (context) => {
  const count = Math.min(BASE_TAG_COUNT + levelOf(context, 'tag-cloud') * TAGS_PER_LEVEL, TAGS.length);
  const tags = TAGS.slice(0, count)
    .map((tag, index) => `<span class="tag" style="font-size:${pickCyclic(TAG_SIZES_PX, index * 3 + tag.length, 13)}px">${escapeHtml(tag)}</span>`)
    .join(' ');
  return `${heading(context, 'tag-cloud', 'Tags')}<p class="tag-cloud">${tags}</p>`;
};

const FORUM_THREADS: readonly string[] = [
  '[STICKY] Read this before posting!!',
  'Re: Re: Re: help!!',
  'Post your desktop screenshots',
  'Is AJAX a fad? (poll)',
  'Which PHP framework should I use? (3 pages)',
  'My site got hacked :(',
  'Introduce yourself here',
  'Signature test, please ignore',
];
const MAX_FORUM_THREADS = 6;
const BASE_FORUM_THREADS = 2;
const FORUM_REPLY_STEP = 7;
const FORUM_REPLY_BASE = 3;
const FORUM_VIEWS_PER_REPLY = 13;
const FORUM_MEMBERS_PER_LEVEL = 140;
const FORUM_ONLINE_PER_LEVEL = 3;
const FLASH_INTRO_SECONDS_PER_LEVEL = 40;
const BASE_THUMBNAILS = 4;
/** Two rows on a laptop; the rest of the album sits behind "View all". */
const MAX_THUMBNAILS = 8;
const THUMBNAIL_STYLES = 6;
const PHOTOS_PER_LEVEL = 12;
const PHOTO_NAMES: readonly string[] = ['beach.jpg', 'garden.jpg', 'office.jpg', 'cat.jpg', 'party.jpg', 'flag.jpg'];
const LIGHTBOX_CYCLE_MS = 9_000;
const LIGHTBOX_OPEN_MS = 3_000;
const BASE_MAP_PINS = 3;
const MAX_MAP_PINS = 12;
const PIN_SPREAD_X = 37;
const PIN_SPREAD_Y = 53;
const PIN_MARGIN = 8;
const PIN_RANGE = 84;
const MAP_PLACES: readonly string[] = ['Best pizza in town ★★★★☆', 'Free Wi-Fi café', 'Where I parked', 'Office (no AJAX here)'];

const renderForum: FeatureRenderer = (context) => {
  const level = levelOf(context, 'forum');
  const count = Math.min(level + BASE_FORUM_THREADS, MAX_FORUM_THREADS);
  const rows = FORUM_THREADS.slice(0, count)
    .map((thread, index) => {
      const replies = (index * FORUM_REPLY_STEP + FORUM_REPLY_BASE) * level;
      return `<tr><td><span class="fake-link">${escapeHtml(thread)}</span></td><td>${replies}</td><td>${replies * FORUM_VIEWS_PER_REPLY}</td></tr>`;
    })
    .join('');
  return `${heading(context, 'forum')}<table class="forum-table"><thead><tr><th>Topic</th><th>Replies</th><th>Views</th></tr></thead><tbody>${rows}</tbody></table><p class="forum-note">${level * FORUM_MEMBERS_PER_LEVEL} members · ${level * FORUM_ONLINE_PER_LEVEL} online</p>`;
};

const renderFlashIntro: FeatureRenderer = (context) =>
  `${heading(context, 'flash-intro', 'Intro')}<div class="flash-intro"><div class="flash-stage"><span class="flash-swoosh"></span><span class="flash-logo">${escapeHtml(siteName(context.state))}</span></div><div class="flash-bar"><span></span></div><p class="flash-caption">Loading intro… <span class="fake-link">SKIP INTRO &gt;&gt;</span></p><p class="flash-note">Requires Flash Player 8 · ${levelOf(context, 'flash-intro') * FLASH_INTRO_SECONDS_PER_LEVEL} seconds of intro</p></div>`;

function countVisibleThumbnails(level: number): number {
  return Math.min(BASE_THUMBNAILS + level, MAX_THUMBNAILS);
}

export function renderGalleryLightbox(level: number, nowMs: number): string {
  const count = countVisibleThumbnails(level);
  const cycle = Math.floor(nowMs / LIGHTBOX_CYCLE_MS);
  const isOpen = nowMs % LIGHTBOX_CYCLE_MS < LIGHTBOX_OPEN_MS;
  const photo = cycle % count;
  return isOpen
    ? `<div class="lightbox"><span class="thumb thumb--${photo % THUMBNAIL_STYLES} is-large"></span><span class="lightbox-caption">IMG_00${photo + 1}.JPG · ${photo + 1} of ${count} · ×</span></div>`
    : '';
}

function renderThumbnail(index: number): string {
  const style = index % THUMBNAIL_STYLES;
  return `<figure class="photo"><span class="thumb thumb--${style}"></span><figcaption class="photo-name">${pickCyclic(PHOTO_NAMES, style, 'photo.jpg')}</figcaption></figure>`;
}

const renderPhotoGallery: FeatureRenderer = (context) => {
  const level = levelOf(context, 'photo-gallery');
  const count = countVisibleThumbnails(level);
  const albumSize = BASE_THUMBNAILS + level * PHOTOS_PER_LEVEL;
  const thumbs = Array.from({ length: count }, (_, index) => renderThumbnail(index)).join('');
  return `${heading(context, 'photo-gallery', 'Photos')}<p class="gallery-meta">${count} of ${albumSize} photos · <span class="fake-link">View all</span> · <span class="fake-link">Slideshow ▶</span></p><div class="gallery">${thumbs}</div><div data-live="gallery-lightbox">${renderGalleryLightbox(level, context.nowMs)}</div>`;
};

const renderMapMashup: FeatureRenderer = (context) => {
  const level = levelOf(context, 'map-mashup');
  const count = Math.min(BASE_MAP_PINS + level, MAX_MAP_PINS);
  const pins = Array.from({ length: count }, (_, index) => {
    const left = PIN_MARGIN + ((index * PIN_SPREAD_X) % PIN_RANGE);
    const top = PIN_MARGIN + ((index * PIN_SPREAD_Y) % PIN_RANGE);
    return `<span class="map-pin" style="left:${left}%;top:${top}%"></span>`;
  }).join('');
  const place = pickCyclic(MAP_PLACES, level, 'Here');
  return `${heading(context, 'map-mashup', 'Mashup')}<div class="map">${pins}<span class="map-bubble">${escapeHtml(place)}</span></div><p class="map-note">Map from someone else’s API · ${count} pins</p>`;
};

const SHARE_NETWORKS: readonly string[] = ['Like', 'Chirp', '+1', 'Pin it'];
const SHARES_PER_LEVEL = 240;
const SHARE_SPREAD = 0.55;
const MAX_FEED_ITEMS = 7;
const BASE_FEED_ITEMS = 3;
const VIEWS_PER_VIDEO_LEVEL = 380_000;
const FEED_ACTIONS: readonly string[] = [
  'Sam liked “My first post”',
  'Ana shared a photo from your album',
  'Jo checked in at your Check-in map',
  'Theo commented: “is this on the app?”',
  'mel_b is now following you',
  'Rik shared the cat video (again)',
  'Grandma Rose liked everything',
];
const VIDEOS: readonly string[] = ['cat_vs_printer.mp4', 'unboxing_my_new_phone.mp4', 'double_rainbow_reaction.mp4'];

const renderShareButtons: FeatureRenderer = (context) => {
  const level = levelOf(context, 'share-buttons');
  const buttons = SHARE_NETWORKS.map((network, index) => {
    const count = Math.round(level * SHARES_PER_LEVEL * SHARE_SPREAD ** index);
    return `<span class="share-button share-button--${index}"><b>${escapeHtml(network)}</b><span class="share-count">${formatCompactNumber(count)}</span></span>`;
  }).join('');
  return `${heading(context, 'share-buttons', 'Share this')}<div class="share-row">${buttons}</div>`;
};

/** HTML5 video: no plugin, a native-looking player, and a view count that only goes up. */
const renderVideoPlayer: FeatureRenderer = (context) => {
  const level = levelOf(context, 'video-player');
  const title = pickCyclic(VIDEOS, level, 'video.mp4');
  return `${heading(context, 'video-player', 'Video')}<div class="video-player"><span class="video-play" aria-hidden="true">▶</span><span class="video-bar"><span></span></span></div><p class="video-note">${escapeHtml(title)} · ${formatCompactNumber(level * VIEWS_PER_VIDEO_LEVEL)} views · no plugin needed</p>`;
};

/** Infinite scroll: it always says it's loading more. */
const renderActivityFeed: FeatureRenderer = (context) => {
  const count = Math.min(BASE_FEED_ITEMS + levelOf(context, 'activity-feed'), MAX_FEED_ITEMS);
  const items = FEED_ACTIONS.slice(0, count).map((action) => `<li class="feed-item">${escapeHtml(action)}</li>`).join('');
  return `${heading(context, 'activity-feed', 'Live activity')}<ul class="feed-list">${items}<li class="feed-more"><span class="spinner" aria-hidden="true"></span>Loading more…</li></ul>`;
};

const SIGN_IN_NETWORKS: readonly string[] = ['Facespace', 'Chirper'];
const SIGNUPS_PER_LEVEL = 1_200;

/** One button per parody network, and how many people joined without a new password. The 2011 sign-in box uses these too. */
export function renderSignInWithButtons(context: SiteContext): string {
  const buttons = SIGN_IN_NETWORKS.map((network, index) => `<span class="signin-button signin-button--${index}">Sign in with ${escapeHtml(network)}</span>`).join('');
  const joined = formatCompactNumber(levelOf(context, 'social-login') * SIGNUPS_PER_LEVEL);
  return `<div class="signin-buttons">${buttons}</div><p class="post-meta">${joined} joined this week · no new password</p>`;
}

/** "Sign in with…" on its own, for layouts without a sign-in box. */
const renderSocialLogin: FeatureRenderer = (context) => `${heading(context, 'social-login', 'Join with one click')}${renderSignInWithButtons(context)}`;

const ONE_PAGER_CHAPTERS: readonly string[] = ['Who we are', 'What we make', 'Why it matters', 'Where we’re going', 'Say hello'];
const BASE_CHAPTERS = 2;
const AWARDS_PER_LEVEL = 3;

/**
 * The scroll-jacking one-pager: scrolling down stops moving the page and slides the chapters sideways instead,
 * until the last one; then the page moves on. The section is as tall as that scrolling; the band inside sticks.
 * With scroll-jacking switched off in the shop, the same markup is a band in the page's flow that a click reads on.
 */
const renderOnePager: FeatureRenderer = (context) => {
  const level = levelOf(context, 'one-pager');
  const chapters = ONE_PAGER_CHAPTERS.slice(0, BASE_CHAPTERS + level);
  const sections = chapters
    .map((title, index) => `<section class="one-pager-chapter one-pager-chapter--${index % ONE_PAGER_CHAPTERS.length}"><span class="one-pager-number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><span class="one-pager-scroll" aria-hidden="true">Scroll ↓</span><span class="one-pager-next" aria-hidden="true">Next →</span></section>`)
    .join('');
  const dots = chapters.map((_, index) => `<i${index === 0 ? ' class="is-current"' : ''}></i>`).join('');
  return `${heading(context, 'one-pager', 'Our story')}<div class="one-pager" style="--chapters:${chapters.length}"><div class="one-pager-pin"><div class="one-pager-track">${sections}</div><nav class="one-pager-dots" aria-hidden="true">${dots}</nav></div></div><p class="post-meta">Site of the Day · ${level * AWARDS_PER_LEVEL} design awards</p>`;
};

const STORY_AUTHORS: readonly string[] = ['Your story', 'jess.codes', 'mike_t', 'priya', 'dev_dan', 'anna.k', 'growth_guru', 'sam.k', 'leo', 'nina'];
const BASE_STORIES = 3;

/** A row of faces in coloured rings at the top: tap one, watch it, it's gone tomorrow. */
const renderStories: FeatureRenderer = (context) => {
  const count = Math.min(BASE_STORIES + levelOf(context, 'stories'), STORY_AUTHORS.length);
  const stories = STORY_AUTHORS.slice(0, count)
    .map((author, index) => `<span class="story${index === 0 ? ' is-yours' : ''}"><span class="story-ring"><span class="story-face" style="--avatar:${pickCyclic(AVATAR_COLORS, index, FALLBACK_AVATAR_COLOR)}">${escapeHtml(author.charAt(0).toUpperCase())}</span></span><span class="story-name">${escapeHtml(author)}</span></span>`)
    .join('');
  return `${heading(context, 'stories')}<div class="stories">${stories}</div>`;
};

interface PricingPlan {
  readonly name: string;
  readonly price: string;
  readonly perks: readonly string[];
  readonly isHighlighted: boolean;
}

const PRICING_PLANS: readonly PricingPlan[] = [
  { name: 'Free', price: '$0', perks: ['1 project', 'Community support', 'Our logo on your page'], isHighlighted: false },
  { name: 'Pro', price: '$12/mo', perks: ['Unlimited projects', 'Priority support', 'Dark mode'], isHighlighted: true },
  { name: 'Enterprise', price: 'Contact us', perks: ['Single sign-on', 'A person who answers', 'An invoice'], isHighlighted: false },
];
const TEAMS_PER_LEVEL = 340;

function renderPricingPlan(plan: PricingPlan): string {
  const badge = plan.isHighlighted ? '<span class="plan-badge">Most popular</span>' : '';
  const perks = plan.perks.map((perk) => `<li>${escapeHtml(perk)}</li>`).join('');
  return `<div class="plan${plan.isHighlighted ? ' is-highlighted' : ''}">${badge}<b class="plan-name">${escapeHtml(plan.name)}</b><span class="plan-price">${escapeHtml(plan.price)}</span><ul class="plan-perks">${perks}</ul><span class="plan-button">Start free trial</span></div>`;
}

/** Free, Pro, Enterprise. The middle one is highlighted: it's the one they want you to pick. */
const renderPricingTable: FeatureRenderer = (context) =>
  `${heading(context, 'pricing-table', 'Pricing')}<div class="pricing">${PRICING_PLANS.map(renderPricingPlan).join('')}</div><p class="post-meta">${formatCompactNumber(levelOf(context, 'pricing-table') * TEAMS_PER_LEVEL)} teams started a trial this week</p>`;

/** The bubble in the corner. Its count of unread messages only goes up. */
const renderLiveChat: FeatureRenderer = (context) =>
  `<span class="chat-bubble"><span class="chat-avatar" aria-hidden="true">S</span><span class="chat-text"><b>Sam from ${escapeHtml(siteName(context.state))}</b>Hi! 👋 Any questions?</span><span class="chat-unread">${levelOf(context, 'live-chat')}</span></span>`;

/** One renderer per feature. Each era's layout decides where the blocks go; the blocks themselves are shared. */
const FEATURE_RENDERERS: Readonly<Record<FeatureId, FeatureRenderer>> = {
  'hit-counter': renderHitCounter,
  'under-construction': renderConstruction,
  guestbook: renderGuestbook,
  'midi-player': renderMusicPlayer,
  webring: renderWebring,
  blog: renderBlog,
  comments: renderComments,
  'tag-cloud': renderTagCloud,
  forum: renderForum,
  'flash-intro': renderFlashIntro,
  'photo-gallery': renderPhotoGallery,
  'map-mashup': renderMapMashup,
  'share-buttons': renderShareButtons,
  'video-player': renderVideoPlayer,
  'activity-feed': renderActivityFeed,
  'one-pager': renderOnePager,
  'social-login': renderSocialLogin,
  stories: renderStories,
  'pricing-table': renderPricingTable,
  'live-chat': renderLiveChat,
};

interface DeadFeatureCopy {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

/** Flash in 2011: the browser no longer runs the plugin. */
const MISSING_PLUGIN_COPY: DeadFeatureCopy = { icon: '🧩', title: 'Missing plug-in', body: 'This content needs a plug-in your browser doesn’t support.' };

/** Features that died some other way than a browser plugin. */
const DEAD_FEATURE_COPY: Readonly<Partial<Record<FeatureId, DeadFeatureCopy>>> = {
  'social-login': { icon: '⚠️', title: 'This app is no longer available', body: 'Facespace switched off the login API this site used.' },
};

function findDeadCopy(featureId: FeatureId): DeadFeatureCopy {
  return DEAD_FEATURE_COPY[featureId] ?? MISSING_PLUGIN_COPY;
}

function describeRebuild(featureId: FeatureId): string {
  const plugin = FEATURES_BY_ID[featureId].pluginDiesIn;
  return plugin === null ? 'a newer version' : UPGRADES_BY_ID[plugin.rebuiltWith].name;
}

/** The box a dead feature leaves on the page, and the skill that rebuilds it. Layouts with their own block use it too. */
export function renderDeadNotice(featureId: FeatureId): string {
  const copy = findDeadCopy(featureId);
  return `<div class="plugin-missing"><span class="plugin-icon" aria-hidden="true">${copy.icon}</span><b>${escapeHtml(copy.title)}</b><span>${escapeHtml(copy.body)}</span><span class="plugin-fix">Rebuild it: ${escapeHtml(describeRebuild(featureId))}</span></div>`;
}

/** Still built, still on the page, but whatever it ran on is gone. */
function renderMissingPlugin(context: SiteContext, featureId: FeatureId): string {
  return `${heading(context, featureId)}${renderDeadNotice(featureId)}`;
}

/** A feature's section around any content, with the overlay when the feature is infected. Layouts can bring their own content. */
export function renderFeatureSection(context: SiteContext, featureId: FeatureId, content: string, extraClass = ''): string {
  const infection = context.state.infections.find((candidate) => candidate.featureId === featureId);
  const overlay = infection === undefined ? '' : renderInfectionOverlay(infection);
  return `<section class="feature-block${extraClass}" data-feature="${featureId}">${content}${overlay}</section>`;
}

export function renderFeatureBlock(context: SiteContext, featureId: FeatureId): string {
  const content = isFeaturePluginDead(context.state, featureId) ? renderMissingPlugin(context, featureId) : FEATURE_RENDERERS[featureId](context);
  return renderFeatureSection(context, featureId, content);
}

/** Built, still in fashion and switched on, in the order the layout lists them. */
export function ownedFeatures(context: SiteContext, order: readonly FeatureId[]): readonly FeatureId[] {
  return order.filter((featureId) => isFeatureOnPage(context.state, featureId) && !context.state.switchedOffFeatureIds.includes(featureId));
}

export function renderFeatureBlocks(context: SiteContext, order: readonly FeatureId[]): readonly string[] {
  return ownedFeatures(context, order).map((featureId) => renderFeatureBlock(context, featureId));
}
