import { areSpecializationsOn, ERAS_BY_ID, isSpecializedEra } from '../../engine';
import type { EraId, GameState, SpecializationId, SpecializedEraId } from '../../engine';
import { escapeHtml } from '../dom';
import { siteBrand } from './site-context';

/**
 * How a specialization looks: the page is still the era's (2011's Bootstrap, 2018's landing page, 2024's AI site),
 * but the navigation, the hero and a block at the top say what the site is now. A video site leads with what's
 * trending; a shop with today's deals. A Homepage (no specialization) keeps the era's page as it was.
 */
export interface HeroCopy {
  readonly title: string;
  /** "{brand}" becomes the site's name. */
  readonly text: string;
  readonly cta: string;
}

interface SignatureItem {
  readonly icon: string;
  readonly title: string;
  readonly meta: string;
}

interface SpecializationLook {
  /** Four short links: they share the header with the site's name, which shortens with an ellipsis when crowded. */
  readonly nav: readonly string[];
  readonly heroes: Readonly<Record<SpecializedEraId, HeroCopy>>;
  readonly blockTitle: string;
  readonly items: readonly SignatureItem[];
  /** The site's color when you haven't picked your own: what a site like this tends to look like. */
  readonly accent: string;
}

type LookedSpecializationId = Exclude<SpecializationId, 'homepage'>;

const LOOKS: Readonly<Record<LookedSpecializationId, SpecializationLook>> = {
  photos: {
    nav: ['Feed', 'Explore', 'Upload', 'Profile'],
    heroes: {
      'social-2011': { title: 'Share the moment.', text: 'Snap it, filter it, post it. {brand} is where your photos live.', cta: 'Upload a photo' },
      'platform-2018': { title: 'Every moment, beautifully shared.', text: 'Stories, filters, and half a billion people double-tapping.', cta: 'Join {brand}' },
      'ai-2024': { title: 'Your photos, perfected by AI.', text: 'Erase the stranger, add the sunset, keep the memory. Mostly.', cta: 'Try AI edit' },
    },
    blockTitle: 'Popular now',
    items: [
      { icon: '🌅', title: 'Sunset, no filter', meta: '♥ 1,204' },
      { icon: '🐈', title: 'Mr. Whiskers, again', meta: '♥ 8,812' },
      { icon: '🍜', title: 'Lunch', meta: '♥ 312' },
      { icon: '🏔️', title: 'Made it to the top', meta: '♥ 2,407' },
    ],
    accent: '#D6336C',
  },
  video: {
    nav: ['Home', 'Trending', 'Library', 'Upload'],
    heroes: {
      'social-2011': { title: 'Upload. Watch. Repeat.', text: 'The web’s videos in one place, from cats to tutorials.', cta: 'Upload a video' },
      'platform-2018': { title: 'Watch what everyone’s watching.', text: 'Creators, playlists, and autoplay you never asked for.', cta: 'Start watching' },
      'ai-2024': { title: 'Short videos. Endless scroll.', text: 'Swipe up for the next one. And the next one. It’s 3 a.m.', cta: 'Open the app' },
    },
    blockTitle: 'Trending now',
    items: [
      { icon: '▶', title: 'Cat plays the keyboard (HD)', meta: '2.1M views · 3:12' },
      { icon: '▶', title: 'How to fix your modem', meta: '880K views · 12:40' },
      { icon: '▶', title: 'Unboxing a box', meta: '4.4M views · 8:03' },
      { icon: '▶', title: 'Top 10 web fails', meta: '1.2M views · 10:10' },
    ],
    accent: '#E03131',
  },
  microblog: {
    nav: ['Home', 'Explore', 'Alerts', 'Profile'],
    heroes: {
      'social-2011': { title: 'What’s happening?', text: 'Say it in 140 characters. Everyone else is.', cta: 'Post an update' },
      'platform-2018': { title: 'Join the conversation.', text: 'Trending topics, hot takes, and a thread about it.', cta: 'Sign up' },
      'ai-2024': { title: 'Everything, everyone, all at once.', text: 'Posts, replies, badges, and bots replying to bots.', cta: 'Get verified' },
    },
    blockTitle: 'Latest posts',
    items: [
      { icon: '@kevin', title: 'just set up my account. hello??', meta: '2m' },
      { icon: '@priya', title: 'launch day! #shipit', meta: '5m' },
      { icon: '@sam', title: 'the site is down. no wait, it’s my wifi', meta: '9m' },
      { icon: '@alex', title: 'hot take: tabs > spaces', meta: '14m · 2,031 replies' },
    ],
    accent: '#1C7ED6',
  },
  news: {
    nav: ['Latest', 'World', 'Tech', 'Opinion'],
    heroes: {
      'social-2011': { title: 'Breaking news, all day.', text: 'Live updates, the stories that matter, and a comment section to regret.', cta: 'Read the latest' },
      'platform-2018': { title: 'Quality journalism. Three free articles.', text: 'Subscribe for the rest. Or open it in a private window.', cta: 'Subscribe' },
      'ai-2024': { title: 'The news, summarized.', text: 'Every story in three bullet points, by an AI that read it for you.', cta: 'Read the summary' },
    },
    blockTitle: 'Top stories',
    items: [
      { icon: 'LIVE', title: 'Local website relaunches, again', meta: 'Updated 2 min ago' },
      { icon: 'Tech', title: 'Experts: the web is “probably fine”', meta: '4 min read' },
      { icon: 'Weather', title: 'Cloudy, with a chance of outages', meta: '1 min read' },
      { icon: 'Opinion', title: 'Why I’m quitting social media (1/47)', meta: '23 min read' },
    ],
    accent: '#343A40',
  },
  reviews: {
    nav: ['Hotels', 'Food', 'Sights', 'Reviews'],
    heroes: {
      'social-2011': { title: 'Where to next?', text: 'Real reviews from real travelers. Mostly real.', cta: 'Find a place' },
      'platform-2018': { title: 'Book the best, for less.', text: 'Hotels, restaurants and things to do, rated by millions.', cta: 'Search deals' },
      'ai-2024': { title: 'Ask where to go.', text: 'Tell the AI what you like. It books the place with the best deal for {brand}.', cta: 'Plan my trip' },
    },
    blockTitle: 'Top rated near you',
    items: [
      { icon: '★★★★★', title: 'Café Cache', meta: '1,204 reviews' },
      { icon: '★★★★☆', title: 'The Dial-Up Diner', meta: '880 reviews' },
      { icon: '★★★☆☆', title: 'Hotel 404', meta: '“Couldn’t find my room.”' },
      { icon: '★★★★★', title: 'Ping Pong Bar', meta: '61 ms away' },
    ],
    accent: '#2B8A3E',
  },
  social: {
    nav: ['Feed', 'Friends', 'Groups', 'Messages'],
    heroes: {
      'social-2011': { title: 'Everyone you know is here.', text: 'Share what’s new and see what your friends are up to.', cta: 'Sign up, it’s free' },
      'platform-2018': { title: 'Bringing everyone closer together.', text: 'Friends, groups, events, and ads that know you a little too well.', cta: 'Create an account' },
      'ai-2024': { title: 'Your feed, chosen for you.', text: 'An algorithm picks what you see, so you never have to.', cta: 'Open your feed' },
    },
    blockTitle: 'News feed',
    items: [
      { icon: '👤', title: 'Kevin changed his profile picture.', meta: 'Just now · 4 likes' },
      { icon: '👤', title: 'Priya is going to Launch Party.', meta: '1 h · 12 going' },
      { icon: '👤', title: 'Sam and 12 others like your post.', meta: '3 h' },
      { icon: '👤', title: 'Alex poked you.', meta: 'Yesterday' },
    ],
    accent: '#3B5BDB',
  },
  streaming: {
    nav: ['Live', 'Browse', 'Following', 'Go live'],
    heroes: {
      'social-2011': { title: 'Live now. Chat now.', text: 'Watch people do things, live, and talk about it while they do.', cta: 'Go live' },
      'platform-2018': { title: 'Watch your favorite streamers.', text: 'Subs, emotes, raids, and a chat that never stops.', cta: 'Start streaming' },
      'ai-2024': { title: 'Live, with an AI co-host.', text: 'It reads the chat, so you don’t have to.', cta: 'Go live' },
    },
    blockTitle: 'Live channels',
    items: [
      { icon: '🔴 LIVE', title: 'speedrun_steve', meta: '12.4K watching' },
      { icon: '🔴 LIVE', title: 'cozy_coding', meta: '3.1K watching' },
      { icon: '🔴 LIVE', title: 'just_chatting_jen', meta: '48K watching' },
      { icon: '🔴 LIVE', title: 'modem_noises_asmr', meta: '220 watching' },
    ],
    accent: '#7048E8',
  },
  shop: {
    nav: ['Deals', 'Shop', 'Orders', 'Cart (2)'],
    heroes: {
      'social-2011': { title: 'Everything. Delivered tomorrow.', text: 'Millions of products, and free shipping on orders you’ll regret.', cta: 'Shop deals' },
      'platform-2018': { title: 'One click, and it’s yours.', text: 'Same-day delivery, a membership for shipping, and reviews from strangers.', cta: 'Start shopping' },
      'ai-2024': { title: 'Ask, and it’s in your cart.', text: 'The {brand} assistant finds what you need, and three things you don’t.', cta: 'Ask the assistant' },
    },
    blockTitle: 'Today’s deals',
    items: [
      { icon: '⌨️', title: 'Mechanical keyboard', meta: '$49' },
      { icon: '🦆', title: 'Rubber duck (for debugging)', meta: '$2' },
      { icon: '🔌', title: 'Yet another cable', meta: '$4' },
      { icon: '🖱️', title: 'A quieter mouse', meta: '$19' },
    ],
    accent: '#F76707',
  },
};

function isLooked(specializationId: SpecializationId): specializationId is LookedSpecializationId {
  return specializationId !== 'homepage';
}

function isLookShownIn(state: GameState, eraId: EraId): eraId is SpecializedEraId {
  return areSpecializationsOn(state) && isSpecializedEra(eraId);
}

interface ShownLook {
  readonly look: SpecializationLook;
  /** The era whose words the hero uses: 2018's, on a 2011 page a framework hasn't rewritten yet. */
  readonly eraId: SpecializedEraId;
}

/** The look for this page: a specialized era of the test build, on anything but a Homepage. Archived pages keep theirs. */
function findLook(state: GameState): ShownLook | null {
  const eraId = ERAS_BY_ID[state.eraId].baseEraId;
  const { specializationId } = state;
  if (!isLookShownIn(state, eraId) || !isLooked(specializationId)) return null;
  return { look: LOOKS[specializationId], eraId };
}

function fillBrand(text: string, state: GameState): string {
  return escapeHtml(text.replaceAll('{brand}', siteBrand(state)));
}

/** The navigation: the specialization's, or the era's own. */
export function pickNavItems(state: GameState, eraItems: readonly string[]): readonly string[] {
  const shown = findLook(state);
  return shown === null ? eraItems : shown.look.nav;
}

/** The hero's words for this era, or null to keep the era's own. Escaped, with the site's name filled in. */
export function findHeroCopy(state: GameState): HeroCopy | null {
  const shown = findLook(state);
  if (shown === null) return null;
  const hero = shown.look.heroes[shown.eraId];
  return { title: fillBrand(hero.title, state), text: fillBrand(hero.text, state), cta: fillBrand(hero.cta, state) };
}

/** The accent a site like this tends to have, or null for a Homepage and before 2011. */
export function findSpecializationAccent(state: GameState): string | null {
  const shown = findLook(state);
  return shown === null ? null : shown.look.accent;
}

/** A class on the page's root, for anything the specialization changes in the era's own styles. */
export function specializationClass(state: GameState): string {
  return findLook(state) === null ? '' : ` is-spec-${state.specializationId}`;
}

function renderItem(item: SignatureItem): string {
  return `<li class="spec-item"><span class="spec-item-icon">${escapeHtml(item.icon)}</span><span class="spec-item-title">${escapeHtml(item.title)}</span><span class="spec-item-meta">${escapeHtml(item.meta)}</span></li>`;
}

/** What the site is, at the top of the page: what's trending, today's deals, who's live. */
export function renderSignatureBlock(state: GameState): string {
  const shown = findLook(state);
  if (shown === null) return '';
  const { look } = shown;
  return `<section class="feature-block spec-block spec-block--${state.specializationId}"><h2 class="feature-heading">${escapeHtml(look.blockTitle)}</h2><ul class="spec-items">${look.items.map(renderItem).join('')}</ul></section>`;
}

/** The navigation's links, the first marked as the page you're on. */
export function renderNavLinks(state: GameState, eraItems: readonly string[], activeClass: string): string {
  return pickNavItems(state, eraItems).map((item, index) => `<span${index === 0 ? activeClass : ''}>${escapeHtml(item)}</span>`).join('');
}
