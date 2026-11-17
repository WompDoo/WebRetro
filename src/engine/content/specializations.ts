import type { FeatureId, SpecializationId, SpecializedEraId, UpgradeEffect, UpgradeId } from '../types';

/**
 * Specializations: what your site becomes. 1997 is a homepage for everyone; from the relaunch out of 2005 on, each
 * relaunch lets you specialize, or specialize again, into any route you've unlocked this run. Unlocks are feature
 * levels (sometimes a skill) well above what an era's checklist asks, so a route is something you build towards.
 * They form a ladder: the routes 2005 unlocks lead to the ones 2011 unlocks (photo sharing to a social network, a
 * video site to live streaming, reviews to a shop).
 *
 * A route changes, era by era:
 * - the checklist's focus: the feature the era asks for at level 15 (a video site's is the video player);
 * - how it makes money, as effects like any upgrade's: room for more ads, a bigger bandwidth bill, sales instead of
 *   ads, a slow start that pays off later;
 * - the page (hero, names, its own block) and the ending's story.
 *
 * Only the web specialization test build has them: the classic game is always a Homepage, with no specialization.
 */
export type SpecializationCondition =
  | { readonly kind: 'feature-level'; readonly featureId: FeatureId; readonly level: number }
  | { readonly kind: 'skill'; readonly upgradeId: UpgradeId };

export interface SpecializationEraPlan {
  /** The checklist's focus feature this era, in place of the era's own feature-level item. */
  readonly focus: FeatureId;
  /**
   * The level it asks for: about as much on purpose as the era's own item is, judged from what a player builds anyway
   * by the era's end (the balance sim logs it). 2011 and 2018 ask for a few levels above that, as their own items do;
   * not the usual 15 for every feature, since the video player ends 2011 around 5 and stories around 15.
   */
  readonly level: number;
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
  readonly unlock: readonly SpecializationCondition[];
  readonly eras: Readonly<Record<SpecializedEraId, SpecializationEraPlan>>;
}

export const SPECIALIZATION_IDS: readonly SpecializationId[] = ['homepage', 'photos', 'video', 'microblog', 'news', 'reviews', 'social', 'streaming', 'shop'];

/** The eras a specialization shapes: everything after the relaunch out of 2005. */
export const SPECIALIZED_ERA_IDS: readonly SpecializedEraId[] = ['social-2011', 'platform-2018', 'ai-2024'];

const feature = (featureId: FeatureId, level: number): SpecializationCondition => ({ kind: 'feature-level', featureId, level });
const skill = (upgradeId: UpgradeId): SpecializationCondition => ({ kind: 'skill', upgradeId });
const adValue = (factor: number): UpgradeEffect => ({ kind: 'ad-value-multiplier', factor });
const adAnnoyance = (factor: number): UpgradeEffect => ({ kind: 'ad-annoyance-multiplier', factor });
const traffic = (factor: number): UpgradeEffect => ({ kind: 'global-traffic-multiplier', factor });
const serverLoad = (factor: number): UpgradeEffect => ({ kind: 'server-load-multiplier', factor });
/** Money a visitor brings without an ad (a sale, a booking, a subscription), in the units every era divides by its pace. */
const perVisitor = (amount: number): UpgradeEffect => ({ kind: 'direct-revenue-per-visitor', amount });

/**
 * 2024's focus levels: about what a player has by the end of the game anyway (the balance sim's "levels at the end"),
 * as the era's own AI chatbot 15 is: players finish with it at 27, so it never costs the era time. A route's focus
 * shouldn't either.
 */
const AI_IMAGES_LEVEL = 12;
const FOR_YOU_FEED_LEVEL = 12;
const AI_ARTICLES_LEVEL = 20;
const AI_SEARCH_LEVEL = 15;

export const SPECIALIZATIONS_BY_ID: Readonly<Record<SpecializationId, SpecializationDefinition>> = {
  homepage: {
    id: 'homepage',
    name: 'Homepage',
    icon: '🏠',
    pitch: 'A bit of everything, the way it’s always been: the classic game’s path.',
    money: 'No specialization: ads, steady all the way, like the classic game.',
    unlock: [],
    eras: {
      'social-2011': { focus: 'share-buttons', level: 15, effects: [] },
      'platform-2018': { focus: 'stories', level: 15, effects: [] },
      'ai-2024': { focus: 'ai-chatbot', level: 15, effects: [] },
    },
  },
  photos: {
    id: 'photos',
    name: 'Photo sharing',
    icon: '📷',
    pitch: 'Everyone’s pictures, in one endless feed.',
    money: 'Ads sit between the photos and annoy less. Photos are heavy on the servers.',
    unlock: [feature('photo-gallery', 35), feature('comments', 20)],
    eras: {
      'social-2011': { focus: 'share-buttons', level: 15, effects: [adAnnoyance(0.6), serverLoad(1.25)] },
      'platform-2018': { focus: 'stories', level: 15, effects: [adAnnoyance(0.75), serverLoad(1.25)] },
      'ai-2024': { focus: 'ai-images', level: AI_IMAGES_LEVEL, effects: [adAnnoyance(0.8), serverLoad(1.25)] },
    },
  },
  video: {
    id: 'video',
    name: 'Video site',
    icon: '🎬',
    pitch: 'Anyone can upload; everyone watches.',
    money: 'An ad before every video pays very well. The bandwidth bill is enormous.',
    unlock: [feature('flash-intro', 30), skill('embed-tag')],
    eras: {
      'social-2011': { focus: 'video-player', level: 8, effects: [adValue(1.3), adAnnoyance(1.2), serverLoad(1.6)] },
      'platform-2018': { focus: 'stories', level: 15, effects: [adValue(1.45), adAnnoyance(1.2), serverLoad(1.6)] },
      'ai-2024': { focus: 'for-you-feed', level: FOR_YOU_FEED_LEVEL, effects: [adValue(1.15), adAnnoyance(1.2), serverLoad(1.6)] },
    },
  },
  microblog: {
    id: 'microblog',
    name: 'Microblog',
    icon: '💬',
    pitch: 'Short posts, all day long, from everyone.',
    money: 'Enormous traffic, and not much money per visitor.',
    unlock: [feature('guestbook', 90), feature('comments', 20)],
    eras: {
      'social-2011': { focus: 'activity-feed', level: 9, effects: [traffic(1.4), adValue(0.8)] },
      'platform-2018': { focus: 'live-chat', level: 10, effects: [traffic(1.5), adValue(0.85)] },
      'ai-2024': { focus: 'for-you-feed', level: FOR_YOU_FEED_LEVEL, effects: [traffic(1.4), adValue(0.75)] },
    },
  },
  news: {
    id: 'news',
    name: 'News site',
    icon: '📰',
    pitch: 'Headlines, updated all day.',
    money: 'Ads pay best early on. Later a paywall helps, and in 2024 AI answers take more of the clicks.',
    unlock: [feature('blog', 60), feature('tag-cloud', 5), skill('learn-rss')],
    eras: {
      'social-2011': { focus: 'activity-feed', level: 9, effects: [adValue(1.15)] },
      'platform-2018': { focus: 'newsletter', level: 13, effects: [adValue(1.0), perVisitor(0.2)] },
      'ai-2024': { focus: 'ai-articles', level: AI_ARTICLES_LEVEL, effects: [adValue(0.95), perVisitor(0.35), { kind: 'ai-answer-share-multiplier', factor: 1.3 }] },
    },
  },
  reviews: {
    id: 'reviews',
    name: 'Reviews',
    icon: '⭐',
    pitch: 'Where to eat, where to sleep, where to go.',
    money: 'A cut of every booking: steady money per visitor, ads or not.',
    unlock: [feature('map-mashup', 20), feature('comments', 20)],
    eras: {
      'social-2011': { focus: 'social-login', level: 5, effects: [adValue(0.9), perVisitor(0.3)] },
      'platform-2018': { focus: 'language-switcher', level: 14, effects: [adValue(1.0), perVisitor(0.45)] },
      'ai-2024': { focus: 'ai-search', level: AI_SEARCH_LEVEL, effects: [adValue(1.0), perVisitor(0.5)] },
    },
  },
  social: {
    id: 'social',
    name: 'Social network',
    icon: '👥',
    pitch: 'Everyone you know, and everything they’re up to.',
    money: 'A slow start: growth first, money later. Then ads that pay off, and the biggest privacy fines.',
    unlock: [feature('activity-feed', 18), feature('share-buttons', 25)],
    eras: {
      'social-2011': { focus: 'activity-feed', level: 9, effects: [adValue(0.75), traffic(1.2)] },
      'platform-2018': { focus: 'stories', level: 15, effects: [adValue(1.0), { kind: 'privacy-fine-multiplier', factor: 1.5 }] },
      'ai-2024': { focus: 'for-you-feed', level: FOR_YOU_FEED_LEVEL, effects: [adValue(1.1)] },
    },
  },
  streaming: {
    id: 'streaming',
    name: 'Live streaming',
    icon: '📡',
    pitch: 'Live channels, a chat beside every one, and tips.',
    money: 'Subscriptions and tips on top of the ads. Live video is heavy on the servers.',
    unlock: [feature('video-player', 25), feature('activity-feed', 10)],
    eras: {
      'social-2011': { focus: 'video-player', level: 8, effects: [adValue(0.95), serverLoad(1.3), perVisitor(0.3)] },
      'platform-2018': { focus: 'live-chat', level: 10, effects: [adValue(0.9), serverLoad(1.3), perVisitor(0.4)] },
      'ai-2024': { focus: 'ai-chatbot', level: 15, effects: [adValue(0.85), serverLoad(1.3), perVisitor(0.35)] },
    },
  },
  shop: {
    id: 'shop',
    name: 'Online shop',
    icon: '🛒',
    pitch: 'Buy anything, delivered tomorrow.',
    money: 'Sales instead of ads: every visitor might buy. Ads pay less and drive shoppers away.',
    unlock: [feature('social-login', 13), feature('photo-gallery', 35)],
    eras: {
      'social-2011': { focus: 'social-login', level: 5, effects: [adValue(0.8), adAnnoyance(1.15), perVisitor(0.8)] },
      'platform-2018': { focus: 'pricing-table', level: 14, effects: [adValue(0.8), adAnnoyance(1.15), perVisitor(1.0)] },
      'ai-2024': { focus: 'ai-chatbot', level: 15, effects: [adValue(0.8), adAnnoyance(1.15), perVisitor(0.8)] },
    },
  },
};
