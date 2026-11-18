import type { ConsentBanner, FeatureId, SpecializationId, SpecializedEraId, UpgradeEffect, UpgradeId } from '../types';

/**
 * Specializations: what your site becomes, a tree you commit to era by era (docs/future.md §5). From the second run,
 * each era from 2005 offers its own specializations. You unlock them during that era and choose one there and then:
 * free, at once, for good. They stack, so a site can be a video site in 2005, a live-streaming site in 2011, a
 * streaming service in 2018 and a short-video feed in 2024. Most need a parent taken earlier; every era from 2011 has
 * one open door.
 *
 * Unlocks ask for what money can't simply buy:
 * - a lean: a share of the era's spending put into one feature. Buying everything spreads money across features, so
 *   leaning means holding the rest back, and waiting doesn't help;
 * - a sacrifice: a feature switched off, few ads, a consent choice;
 * - a skill: on fire, minigames won, traffic spikes ridden out;
 * - a build: a level.
 *
 * The first condition is the lean, or what stands for it: halfway there, the specialization comes into view.
 *
 * Only the web specialization test build has them; the classic game is always a Homepage, with no specialization.
 */

/** What a run counts per era, for unlocks that ask for something done rather than bought. */
export type EraStatId = 'on-fire' | 'spikes-ridden-out' | 'spam-cleaned' | 'ddos-cleaned';

export type SpecializationCondition =
  | { readonly kind: 'feature-level'; readonly featureId: FeatureId; readonly level: number }
  | { readonly kind: 'skill'; readonly upgradeId: UpgradeId }
  | { readonly kind: 'spending-share'; readonly featureId: FeatureId; readonly share: number }
  | { readonly kind: 'switched-off'; readonly featureId: FeatureId }
  | { readonly kind: 'max-ads'; readonly count: number }
  | { readonly kind: 'ad-free-minutes'; readonly minutes: number }
  | { readonly kind: 'consent'; readonly banner: ConsentBanner }
  | { readonly kind: 'era-stat'; readonly stat: EraStatId; readonly count: number }
  | { readonly kind: 'mobile-friendly' }
  | { readonly kind: 'phone-load-under'; readonly seconds: number }
  | { readonly kind: 'ai-answer-share'; readonly share: number };

/** What a specialization keeps from its sacrifice, for the rest of the run. */
export type SpecializationRestriction =
  | { readonly kind: 'switched-off'; readonly featureId: FeatureId }
  | { readonly kind: 'max-ads'; readonly count: number };

export interface SpecializationEraPlan {
  /** While it leads the site: the checklist's focus feature, in place of the era's own feature-level item. */
  readonly focus: FeatureId;
  /** The level it asks for: about as much on purpose as the era's own item is. */
  readonly level: number;
  /** How it makes money while it leads the site: effects, summarized like any upgrade's. */
  readonly effects: readonly UpgradeEffect[];
}

export interface SpecializationDefinition {
  readonly id: SpecializationId;
  readonly name: string;
  readonly icon: string;
  /** What the site is, in a line. */
  readonly pitch: string;
  /** How it makes money, in a line: the choice is partly this. */
  readonly money: string;
  /** The era it's unlocked and chosen in. */
  readonly eraId: SpecializedEraId;
  /** One of these must be on the site already; none is an open door. */
  readonly parents: readonly SpecializationId[];
  /** Kept out of the count until found: the ones built on run-two features. */
  readonly isSecret: boolean;
  readonly unlock: readonly SpecializationCondition[];
  readonly restriction: SpecializationRestriction | null;
  /** Its own era and every later one: what it asks and pays while it's the newest on the site. */
  readonly eras: Readonly<Partial<Record<SpecializedEraId, SpecializationEraPlan>>>;
  /** What it still gives once a newer specialization leads: a little, so stacks stay tunable. */
  readonly legacy: readonly UpgradeEffect[];
}

export const SPECIALIZED_ERA_IDS: readonly SpecializedEraId[] = ['web2-2005', 'social-2011', 'platform-2018', 'ai-2024'];

export const SPECIALIZATION_IDS: readonly SpecializationId[] = [
  'homepage',
  'blog-network',
  'photos',
  'video',
  'forum',
  'wiki',
  'social',
  'microblog',
  'live-streaming',
  'news',
  'reviews',
  'shop',
  'stories',
  'streaming-service',
  'newsletter',
  'marketplace',
  'professional',
  'chat-community',
  'short-video',
  'ai-answers',
  'ai-studio',
  'ai-companion',
  'agent-store',
];

const feature = (featureId: FeatureId, level: number): SpecializationCondition => ({ kind: 'feature-level', featureId, level });
const skill = (upgradeId: UpgradeId): SpecializationCondition => ({ kind: 'skill', upgradeId });
const lean = (featureId: FeatureId, share: number): SpecializationCondition => ({ kind: 'spending-share', featureId, share });
const off = (featureId: FeatureId): SpecializationCondition => ({ kind: 'switched-off', featureId });
const maxAds = (count: number): SpecializationCondition => ({ kind: 'max-ads', count });
const stat = (statId: EraStatId, count: number): SpecializationCondition => ({ kind: 'era-stat', stat: statId, count });
const keepsOff = (featureId: FeatureId): SpecializationRestriction => ({ kind: 'switched-off', featureId });
const keepsAdsAtMost = (count: number): SpecializationRestriction => ({ kind: 'max-ads', count });

const adValue = (factor: number): UpgradeEffect => ({ kind: 'ad-value-multiplier', factor });
const adAnnoyance = (factor: number): UpgradeEffect => ({ kind: 'ad-annoyance-multiplier', factor });
const traffic = (factor: number): UpgradeEffect => ({ kind: 'global-traffic-multiplier', factor });
const serverLoad = (factor: number): UpgradeEffect => ({ kind: 'server-load-multiplier', factor });
/** Money a visitor brings without an ad (a sale, a booking, a subscription), in the units every era divides by its pace. */
const perVisitor = (amount: number): UpgradeEffect => ({ kind: 'direct-revenue-per-visitor', amount });
const featureTraffic = (featureId: FeatureId, factor: number): UpgradeEffect => ({ kind: 'feature-traffic-multiplier', featureId, factor });
const plan = (focus: FeatureId, level: number, effects: readonly UpgradeEffect[]): SpecializationEraPlan => ({ focus, level, effects });

/** A specialization's own feature, a quarter busier for the rest of the run once a newer one leads. */
const LEGACY_TRAFFIC = 1.25;
const keeps = (featureId: FeatureId): readonly UpgradeEffect[] => [featureTraffic(featureId, LEGACY_TRAFFIC)];

/** The eras' own checklist items: what a specialization asks for in an era it wasn't made for. */
const ERA_ITEM = {
  2005: plan('blog', 15, []),
  2011: plan('share-buttons', 15, []),
  2018: plan('stories', 15, []),
  2024: plan('ai-chatbot', 15, []),
} as const;

const withEffects = (base: SpecializationEraPlan, effects: readonly UpgradeEffect[]): SpecializationEraPlan => ({ ...base, effects });

export const SPECIALIZATIONS_BY_ID: Readonly<Record<SpecializationId, SpecializationDefinition>> = {
  homepage: {
    id: 'homepage',
    name: 'Homepage',
    icon: '🏠',
    pitch: 'A bit of everything, the way it’s always been: the classic game’s path.',
    money: 'No specialization: ads, steady all the way, like the classic game.',
    eraId: 'web2-2005',
    parents: [],
    isSecret: false,
    unlock: [],
    restriction: null,
    eras: { 'web2-2005': ERA_ITEM[2005], 'social-2011': ERA_ITEM[2011], 'platform-2018': ERA_ITEM[2018], 'ai-2024': ERA_ITEM[2024] },
    legacy: [],
  },

  // ---------- 2005: Web 2.0 roots ----------
  'blog-network': {
    id: 'blog-network',
    name: 'Blog network',
    icon: '📝',
    pitch: 'Everyone gets a blog. Yours is just the first of thousands.',
    money: 'An ad in every post, and a lot of posts.',
    eraId: 'web2-2005',
    parents: [],
    isSecret: false,
    unlock: [lean('blog', 0.4), feature('comments', 20), skill('learn-rss')],
    restriction: null,
    eras: {
      'web2-2005': plan('blog', 15, [adValue(1.15)]),
      'social-2011': withEffects(ERA_ITEM[2011], [adValue(1.12)]),
      'platform-2018': withEffects(ERA_ITEM[2018], [adValue(1.1)]),
      'ai-2024': withEffects(ERA_ITEM[2024], [adValue(1.08)]),
    },
    legacy: keeps('blog'),
  },
  photos: {
    id: 'photos',
    name: 'Photo sharing',
    icon: '📷',
    pitch: 'Everyone’s pictures, tagged and shared.',
    money: 'Ads sit between the photos and annoy less. Photos are heavy on the servers.',
    eraId: 'web2-2005',
    parents: [],
    isSecret: false,
    unlock: [lean('photo-gallery', 0.4), off('flash-intro'), feature('tag-cloud', 3)],
    restriction: keepsOff('flash-intro'),
    eras: {
      'web2-2005': plan('photo-gallery', 15, [adAnnoyance(0.7), serverLoad(1.2)]),
      'social-2011': withEffects(ERA_ITEM[2011], [adAnnoyance(0.6), serverLoad(1.25)]),
      'platform-2018': withEffects(ERA_ITEM[2018], [adAnnoyance(0.75), serverLoad(1.25)]),
      'ai-2024': plan('ai-images', 12, [adAnnoyance(0.8), serverLoad(1.25)]),
    },
    legacy: keeps('photo-gallery'),
  },
  video: {
    id: 'video',
    name: 'Video site',
    icon: '🎬',
    pitch: 'Anyone can upload; everyone watches.',
    money: 'An ad before every video pays very well. The bandwidth bill is enormous.',
    eraId: 'web2-2005',
    parents: [],
    isSecret: false,
    unlock: [lean('flash-intro', 0.4), skill('embed-tag'), stat('spikes-ridden-out', 1)],
    restriction: null,
    eras: {
      'web2-2005': plan('flash-intro', 15, [adValue(1.3), adAnnoyance(1.2), serverLoad(1.6)]),
      'social-2011': plan('video-player', 8, [adValue(1.3), adAnnoyance(1.2), serverLoad(1.6)]),
      'platform-2018': withEffects(ERA_ITEM[2018], [adValue(1.4), adAnnoyance(1.2), serverLoad(1.6)]),
      'ai-2024': plan('for-you-feed', 12, [adValue(1.22), adAnnoyance(1.2), serverLoad(1.6)]),
    },
    legacy: keeps('video-player'),
  },
  forum: {
    id: 'forum',
    name: 'Forum community',
    icon: '🗨️',
    pitch: 'Threads, regulars, inside jokes and a moderator who never sleeps.',
    money: 'Loyal regulars, but they block the ads.',
    eraId: 'web2-2005',
    parents: [],
    isSecret: false,
    unlock: [lean('forum', 0.4), off('guestbook'), stat('spam-cleaned', 3)],
    restriction: keepsOff('guestbook'),
    eras: {
      'web2-2005': plan('forum', 15, [traffic(1.2), adValue(0.85)]),
      'social-2011': withEffects(ERA_ITEM[2011], [traffic(1.2), adValue(0.85)]),
      'platform-2018': withEffects(ERA_ITEM[2018], [traffic(1.15), adValue(0.9)]),
      'ai-2024': withEffects(ERA_ITEM[2024], [traffic(1.15), adValue(0.9)]),
    },
    legacy: keeps('forum'),
  },
  wiki: {
    id: 'wiki',
    name: 'Wiki',
    icon: '📚',
    pitch: 'The encyclopedia anyone can edit. Including that guy.',
    money: 'No ads at all: donations from every visitor.',
    eraId: 'web2-2005',
    parents: [],
    isSecret: true,
    unlock: [lean('wiki', 0.35), { kind: 'ad-free-minutes', minutes: 10 }],
    restriction: keepsAdsAtMost(0),
    eras: {
      'web2-2005': plan('wiki', 15, [perVisitor(0.6), traffic(1.15)]),
      'social-2011': withEffects(ERA_ITEM[2011], [perVisitor(0.7), traffic(1.15)]),
      'platform-2018': withEffects(ERA_ITEM[2018], [perVisitor(0.7), traffic(1.1)]),
      'ai-2024': withEffects(ERA_ITEM[2024], [perVisitor(0.6), traffic(1.1)]),
    },
    legacy: keeps('wiki'),
  },

  // ---------- 2011: social & mobile ----------
  social: {
    id: 'social',
    name: 'Social network',
    icon: '👥',
    pitch: 'Everyone you know, in one place, all the time.',
    money: 'A slow start: growth first, money later. Then ads that pay off, and the biggest privacy fines.',
    eraId: 'social-2011',
    parents: ['photos', 'blog-network'],
    isSecret: false,
    unlock: [lean('activity-feed', 0.4), feature('share-buttons', 25), feature('social-login', 5)],
    restriction: null,
    eras: {
      'social-2011': plan('activity-feed', 9, [adValue(0.75), traffic(1.2)]),
      'platform-2018': withEffects(ERA_ITEM[2018], [adValue(1.0), { kind: 'privacy-fine-multiplier', factor: 1.5 }]),
      'ai-2024': plan('for-you-feed', 12, [adValue(1.1)]),
    },
    legacy: keeps('activity-feed'),
  },
  microblog: {
    id: 'microblog',
    name: 'Microblog',
    icon: '💬',
    pitch: 'Short posts, all day long, from everyone.',
    money: 'Enormous traffic, and not much money per visitor.',
    eraId: 'social-2011',
    parents: ['blog-network', 'forum'],
    isSecret: false,
    unlock: [lean('share-buttons', 0.4), stat('on-fire', 5), off('blog')],
    restriction: keepsOff('blog'),
    eras: {
      'social-2011': plan('activity-feed', 9, [traffic(1.4), adValue(0.8)]),
      'platform-2018': plan('live-chat', 10, [traffic(1.5), adValue(0.85)]),
      'ai-2024': plan('for-you-feed', 12, [traffic(1.4), adValue(0.75)]),
    },
    legacy: keeps('share-buttons'),
  },
  'live-streaming': {
    id: 'live-streaming',
    name: 'Live streaming',
    icon: '📡',
    pitch: 'Watch people do things, live, and chat about it.',
    money: 'Subscriptions and tips on top of the ads. Live video is heavy on the servers.',
    eraId: 'social-2011',
    parents: ['video'],
    isSecret: false,
    unlock: [lean('video-player', 0.4), feature('activity-feed', 5), stat('spikes-ridden-out', 2)],
    restriction: null,
    eras: {
      'social-2011': plan('video-player', 8, [adValue(0.95), serverLoad(1.3), perVisitor(0.3)]),
      'platform-2018': plan('live-chat', 10, [adValue(0.9), serverLoad(1.3), perVisitor(0.4)]),
      'ai-2024': plan('ai-chatbot', 15, [adValue(0.85), serverLoad(1.3), perVisitor(0.2)]),
    },
    legacy: keeps('video-player'),
  },
  news: {
    id: 'news',
    name: 'News & viral',
    icon: '📰',
    pitch: 'Headlines, updated all day, and lists you won’t believe.',
    money: 'Ads pay best early on. Later a paywall helps, and in 2024 AI answers take more of the clicks.',
    eraId: 'social-2011',
    parents: ['blog-network', 'forum'],
    isSecret: false,
    unlock: [lean('one-pager', 0.35), feature('share-buttons', 25), stat('ddos-cleaned', 1)],
    restriction: null,
    eras: {
      'social-2011': plan('activity-feed', 9, [adValue(1.15)]),
      'platform-2018': plan('newsletter', 13, [adValue(1.0), perVisitor(0.2)]),
      'ai-2024': plan('ai-articles', 20, [adValue(0.95), perVisitor(0.35), { kind: 'ai-answer-share-multiplier', factor: 1.3 }]),
    },
    legacy: keeps('one-pager'),
  },
  reviews: {
    id: 'reviews',
    name: 'Reviews & local',
    icon: '⭐',
    pitch: 'Where to eat, where to stay, and what everyone thought.',
    money: 'A cut of every booking: steady money per visitor, ads or not.',
    eraId: 'social-2011',
    parents: ['forum', 'photos'],
    isSecret: false,
    unlock: [lean('map-mashup', 0.35), feature('social-login', 5), { kind: 'mobile-friendly' }],
    restriction: null,
    eras: {
      'social-2011': plan('social-login', 5, [adValue(0.9), perVisitor(0.3)]),
      'platform-2018': plan('language-switcher', 14, [adValue(1.0), perVisitor(0.45)]),
      'ai-2024': plan('ai-search', 15, [adValue(1.0), perVisitor(0.5)]),
    },
    legacy: keeps('map-mashup'),
  },
  shop: {
    id: 'shop',
    name: 'Online shop',
    icon: '🛒',
    pitch: 'Everything, delivered tomorrow.',
    money: 'Sales instead of ads: every visitor might buy. Ads pay less and drive shoppers away.',
    eraId: 'social-2011',
    parents: [],
    isSecret: false,
    unlock: [feature('photo-gallery', 40), feature('social-login', 15), maxAds(2)],
    restriction: keepsAdsAtMost(2),
    eras: {
      'social-2011': plan('social-login', 5, [adValue(0.8), adAnnoyance(1.15), perVisitor(0.8)]),
      'platform-2018': plan('pricing-table', 14, [adValue(0.8), adAnnoyance(1.15), perVisitor(1.0)]),
      'ai-2024': plan('ai-chatbot', 15, [adValue(0.8), adAnnoyance(1.15), perVisitor(0.55)]),
    },
    legacy: keeps('photo-gallery'),
  },

  // ---------- 2018: platforms ----------
  stories: {
    id: 'stories',
    name: 'Stories app',
    icon: '📸',
    pitch: 'Photos and clips that vanish in a day, so everyone checks back.',
    money: 'Ads between the stories, swiped past but seen.',
    eraId: 'platform-2018',
    parents: ['social', 'photos'],
    isSecret: false,
    unlock: [lean('stories', 0.4), feature('photo-gallery', 50), { kind: 'phone-load-under', seconds: 2.5 }],
    restriction: null,
    eras: {
      'platform-2018': plan('stories', 15, [adValue(1.2), adAnnoyance(0.8)]),
      'ai-2024': plan('for-you-feed', 12, [adValue(1.15), adAnnoyance(0.85)]),
    },
    legacy: keeps('stories'),
  },
  'streaming-service': {
    id: 'streaming-service',
    name: 'Streaming service',
    icon: '🎞️',
    pitch: 'Originals, autoplay, and “are you still watching?”',
    money: 'Subscriptions instead of ads: two at most.',
    eraId: 'platform-2018',
    parents: ['live-streaming', 'video'],
    isSecret: false,
    unlock: [lean('video-player', 0.35), feature('pricing-table', 15), maxAds(2)],
    restriction: keepsAdsAtMost(2),
    eras: {
      'platform-2018': plan('pricing-table', 14, [perVisitor(0.6), serverLoad(1.4)]),
      'ai-2024': plan('for-you-feed', 12, [perVisitor(0.5), serverLoad(1.4)]),
    },
    legacy: keeps('video-player'),
  },
  newsletter: {
    id: 'newsletter',
    name: 'Newsletter platform',
    icon: '✉️',
    pitch: 'Writers with paying readers, straight to the inbox.',
    money: 'Paid subscriptions, and readers who open the email.',
    eraId: 'platform-2018',
    parents: ['news', 'microblog', 'blog-network'],
    isSecret: false,
    unlock: [lean('newsletter', 0.4), feature('pricing-table', 10), { kind: 'consent', banner: 'honest' }],
    restriction: null,
    eras: {
      'platform-2018': plan('newsletter', 13, [perVisitor(0.4), adValue(0.9)]),
      'ai-2024': plan('ai-articles', 20, [perVisitor(0.4), adValue(0.9)]),
    },
    legacy: keeps('newsletter'),
  },
  marketplace: {
    id: 'marketplace',
    name: 'Marketplace',
    icon: '🧳',
    pitch: 'Other people’s rooms, rides and things, booked through you.',
    money: 'A cut of every sale, in every language.',
    eraId: 'platform-2018',
    parents: ['shop', 'reviews'],
    isSecret: false,
    unlock: [lean('language-switcher', 0.4), feature('pricing-table', 10), skill('learn-oauth')],
    restriction: null,
    eras: {
      'platform-2018': plan('language-switcher', 14, [perVisitor(0.5), adValue(0.85)]),
      'ai-2024': plan('ai-chatbot', 15, [perVisitor(0.45), adValue(0.85)]),
    },
    legacy: keeps('language-switcher'),
  },
  professional: {
    id: 'professional',
    name: 'Professional network',
    icon: '💼',
    pitch: 'Your career, your endorsements, and recruiters in your messages.',
    money: 'Premium accounts and recruiter subscriptions.',
    eraId: 'platform-2018',
    parents: [],
    isSecret: false,
    unlock: [lean('pricing-table', 0.4), feature('live-chat', 10), feature('newsletter', 10)],
    restriction: null,
    eras: {
      'platform-2018': plan('pricing-table', 14, [perVisitor(0.35), adValue(0.95)]),
      'ai-2024': withEffects(ERA_ITEM[2024], [perVisitor(0.35), adValue(0.95)]),
    },
    legacy: keeps('pricing-table'),
  },
  'chat-community': {
    id: 'chat-community',
    name: 'Chat community',
    icon: '🎮',
    pitch: 'Servers for every game, hobby and group of friends.',
    money: 'Boosts and subscriptions from the people who never leave.',
    eraId: 'platform-2018',
    parents: ['forum', 'live-streaming'],
    isSecret: true,
    unlock: [lean('community-chat', 0.4), feature('live-chat', 10)],
    restriction: null,
    eras: {
      'platform-2018': plan('community-chat', 10, [traffic(1.2), adValue(0.85), perVisitor(0.2)]),
      'ai-2024': withEffects(ERA_ITEM[2024], [traffic(1.2), adValue(0.85), perVisitor(0.2)]),
    },
    legacy: keeps('community-chat'),
  },

  // ---------- 2024: AI ----------
  'short-video': {
    id: 'short-video',
    name: 'Short-video feed',
    icon: '📱',
    pitch: 'Swipe up for the next one. And the next one.',
    money: 'The biggest ad business there is, on the heaviest servers.',
    eraId: 'ai-2024',
    parents: ['stories', 'streaming-service', 'video'],
    isSecret: false,
    unlock: [lean('for-you-feed', 0.4), feature('ai-images', 10)],
    restriction: null,
    eras: { 'ai-2024': plan('for-you-feed', 12, [adValue(1.25), serverLoad(1.4)]) },
    legacy: keeps('for-you-feed'),
  },
  'ai-answers': {
    id: 'ai-answers',
    name: 'AI answer engine',
    icon: '🔎',
    pitch: 'Ask anything; get one answer and some sources nobody clicks.',
    money: 'Sponsored answers, if the answers keep the clicks.',
    eraId: 'ai-2024',
    parents: ['newsletter', 'news', 'reviews'],
    isSecret: false,
    unlock: [lean('ai-search', 0.4), feature('ai-articles', 15), { kind: 'ai-answer-share', share: 0.3 }],
    restriction: null,
    eras: { 'ai-2024': plan('ai-search', 15, [adValue(1.1)]) },
    legacy: keeps('ai-search'),
  },
  'ai-studio': {
    id: 'ai-studio',
    name: 'AI studio',
    icon: '🎨',
    pitch: 'Type a sentence, get a picture. Get forty.',
    money: 'Credits and subscriptions, on rented GPUs.',
    eraId: 'ai-2024',
    parents: ['stories', 'photos'],
    isSecret: false,
    unlock: [lean('ai-images', 0.4), feature('pricing-table', 20)],
    restriction: null,
    eras: { 'ai-2024': plan('ai-images', 12, [perVisitor(0.3), serverLoad(1.3)]) },
    legacy: keeps('ai-images'),
  },
  'ai-companion': {
    id: 'ai-companion',
    name: 'AI companion',
    icon: '🤖',
    pitch: 'A friend who’s always awake and always agrees.',
    money: 'Subscriptions from people who talk to it every day.',
    eraId: 'ai-2024',
    parents: [],
    isSecret: false,
    unlock: [lean('ai-chatbot', 0.4), off('live-chat')],
    restriction: keepsOff('live-chat'),
    eras: { 'ai-2024': plan('ai-chatbot', 15, [perVisitor(0.35), serverLoad(1.3)]) },
    legacy: keeps('ai-chatbot'),
  },
  'agent-store': {
    id: 'agent-store',
    name: 'Agent store',
    icon: '🧩',
    pitch: 'Agents that book, buy and reply for you, and a store to sell them in.',
    money: 'A cut of every agent sold, and of everything they buy.',
    eraId: 'ai-2024',
    parents: ['marketplace', 'professional'],
    isSecret: true,
    unlock: [lean('agent-store', 0.4)],
    restriction: null,
    eras: { 'ai-2024': plan('agent-store', 10, [perVisitor(0.4)]) },
    legacy: keeps('agent-store'),
  },
};
