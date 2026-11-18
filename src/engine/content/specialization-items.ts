import type {
  EraId,
  FeatureDefinition,
  FeatureId,
  SpecializationFeatureId,
  SpecializationId,
  SpecializationUpgradeId,
  UpgradeDefinition,
  UpgradeEffect,
  UpgradeId,
} from '../types';

/**
 * Every specialization's own Learn, Build and Upgrade items. They show only while you hold the specialization, and
 * they stay for the rest of the run once you do: a stack of specializations keeps all of their items, which is where
 * the combos come from. The boosts use mechanics nothing else in the game has: features that level themselves,
 * typing that publishes, subscribers, scheduled events, the algorithm, agents that shop for you.
 *
 * Prices sit at the era's middle: a specialization unlocks halfway through its era, so its items are bought then.
 */

/** A specialization in the tree: every one but the plain homepage has items. */
export type TreeSpecializationId = Exclude<SpecializationId, 'homepage'>;

export interface SpecializationItems {
  readonly learn: SpecializationUpgradeId;
  readonly build: SpecializationFeatureId;
  readonly upgrades: readonly SpecializationUpgradeId[];
}

/** Each level of the specialization's parent feature makes its own feature this much busier. */
const SYNERGY_PER_LEVEL = 0.02;
const NO_PAGE_WEIGHT = 0;

interface FeatureSpec {
  readonly id: SpecializationFeatureId;
  readonly eraId: EraId;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly visitorsPerSecondPerLevel: number;
  readonly synergyWith: FeatureId;
  readonly pageWeightKb: number;
  readonly pageWeightKbPerLevel: number;
  readonly requiredSkillId: SpecializationUpgradeId;
}

function exclusiveFeature(spec: FeatureSpec): FeatureDefinition {
  return {
    id: spec.id,
    eraId: spec.eraId,
    name: spec.name,
    laterEraNames: {},
    description: spec.description,
    baseCost: spec.baseCost,
    visitorsPerSecondPerLevel: spec.visitorsPerSecondPerLevel,
    synergy: { sourceFeatureId: spec.synergyWith, bonusPerSourceLevel: SYNERGY_PER_LEVEL },
    pageWeightKb: spec.pageWeightKb,
    pageWeightKbPerLevel: spec.pageWeightKbPerLevel,
    requiredSkillId: spec.requiredSkillId,
    isSwitchable: false,
    pluginDiesIn: null,
    sunsetIn: null,
  };
}

function skill(id: SpecializationUpgradeId, eraId: EraId, name: string, description: string, cost: number): UpgradeDefinition {
  return { id, kind: 'skill', eraId, name, description, cost, pageWeightKb: NO_PAGE_WEIGHT, effects: [], requiredFeatureId: null };
}

interface BoostSpec {
  readonly id: SpecializationUpgradeId;
  readonly eraId: EraId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly effects: readonly UpgradeEffect[];
  readonly requiredFeatureId: FeatureId;
}

function boost(spec: BoostSpec): UpgradeDefinition {
  return { ...spec, kind: 'boost', pageWeightKb: NO_PAGE_WEIGHT };
}

const MINUTE_MS = 60_000;

// ---------- 2005 ----------

const BLOG_NETWORK_FEATURES = [
  exclusiveFeature({
    id: 'member-blogs',
    eraId: 'web2-2005',
    name: 'Member blogs',
    description: 'Anyone can start a blog on your site. Most write two posts and an apology for not posting more.',
    baseCost: 1_500_000,
    visitorsPerSecondPerLevel: 13_000,
    synergyWith: 'blog',
    pageWeightKb: 40,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-multi-user-blogs',
  }),
];
const BLOG_NETWORK_UPGRADES = [
  skill('learn-multi-user-blogs', 'web2-2005', 'Learn multi-user blogs', 'One install, a thousand blogs, each with its own theme and its own drama. Unlocks member blogs.', 1_500_000),
  boost({
    id: 'write-every-day',
    eraId: 'web2-2005',
    name: 'Write every day',
    description: 'A post a day, every day. Your keystrokes stop being freelance work and start being your blog.',
    cost: 3_000_000,
    effects: [{ kind: 'keystrokes-level', featureId: 'blog', keystrokes: 300 }],
    requiredFeatureId: 'blog',
  }),
  boost({
    id: 'long-tail',
    eraId: 'web2-2005',
    name: 'The long tail',
    description: 'Old posts keep getting found. Every minute of the era, search engines send a few more readers to the archive.',
    cost: 8_000_000,
    effects: [{ kind: 'traffic-growth', featureId: 'member-blogs', perMinute: 0.05, cap: 3 }],
    requiredFeatureId: 'member-blogs',
  }),
];

const PHOTOS_FEATURES = [
  exclusiveFeature({
    id: 'photo-groups',
    eraId: 'web2-2005',
    name: 'Groups and pools',
    description: 'Twelve thousand people pooling photos of rusty doors. Every one of them checks back daily.',
    baseCost: 3_000_000,
    visitorsPerSecondPerLevel: 24_000,
    synergyWith: 'photo-gallery',
    pageWeightKb: 60,
    pageWeightKbPerLevel: 4,
    requiredSkillId: 'learn-exif',
  }),
];
const PHOTOS_UPGRADES = [
  skill('learn-exif', 'web2-2005', 'Learn thumbnails and EXIF', 'Read the camera model, aperture and the GPS of someone’s living room out of every upload. Unlocks groups and pools.', 2_000_000),
  boost({
    id: 'users-upload',
    eraId: 'web2-2005',
    name: 'Users upload',
    description: 'You stop adding photos. They do. The gallery grows by itself, one level every half minute, offline too.',
    cost: 10_000_000,
    effects: [{ kind: 'auto-level', featureId: 'photo-gallery', everyMs: 30_000 }],
    requiredFeatureId: 'photo-gallery',
  }),
  boost({
    id: 'explore-page',
    eraId: 'web2-2005',
    name: 'Explore page',
    description: 'A page of the most interesting things on the site, picked by a formula nobody understands. Your busiest feature gets busier.',
    cost: 5_000_000,
    effects: [{ kind: 'algorithm', topFactor: 1.3, restFactor: 1 }],
    requiredFeatureId: 'photo-groups',
  }),
];

const VIDEO_FEATURES = [
  exclusiveFeature({
    id: 'channels',
    eraId: 'web2-2005',
    name: 'Channels',
    description: 'Everyone gets a channel, a subscribe button and a profile picture of their cat. Heavy, but people stay.',
    baseCost: 4_000_000,
    visitorsPerSecondPerLevel: 32_000,
    synergyWith: 'flash-intro',
    pageWeightKb: 300,
    pageWeightKbPerLevel: 20,
    requiredSkillId: 'learn-flash-video',
  }),
];
const VIDEO_UPGRADES = [
  skill('learn-flash-video', 'web2-2005', 'Learn Flash video', 'Every format on Earth goes in, one blurry .flv comes out, and it plays in every browser. Unlocks channels.', 2_000_000),
  boost({
    id: 'going-viral',
    eraId: 'web2-2005',
    name: 'Going viral',
    description: 'A dancing baby, a sneezing panda: traffic spikes come twice as often, and while one lasts every visitor pays double.',
    cost: 10_000_000,
    effects: [
      { kind: 'spike-frequency-multiplier', factor: 2 },
      { kind: 'moment-revenue', factor: 2, moment: 'spike' },
    ],
    requiredFeatureId: 'channels',
  }),
  boost({
    id: 'embed-anywhere',
    eraId: 'web2-2005',
    name: 'Embed anywhere',
    description: 'A snippet anyone can paste into their own page. Your player shows up on a million blogs, with your logo on it.',
    cost: 20_000_000,
    effects: [
      { kind: 'feature-traffic-multiplier', featureId: 'channels', factor: 2 },
      { kind: 'global-traffic-multiplier', factor: 1.1 },
    ],
    requiredFeatureId: 'channels',
  }),
];

const FORUM_FEATURES = [
  exclusiveFeature({
    id: 'subforums',
    eraId: 'web2-2005',
    name: 'Subforums',
    description: 'A board for every topic, and a board for complaining about the boards. Regulars visit all of them.',
    baseCost: 2_000_000,
    visitorsPerSecondPerLevel: 17_000,
    synergyWith: 'forum',
    pageWeightKb: 30,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-mod-tools',
  }),
];
const FORUM_UPGRADES = [
  skill('learn-mod-tools', 'web2-2005', 'Learn mod tools', 'Ban, lock, move, merge, and the mighty sticky. Unlocks subforums.', 1_000_000),
  boost({
    id: 'volunteer-mods',
    eraId: 'web2-2005',
    name: 'Volunteer mods',
    description: 'Regulars who clean up for a coloured username. Spam clears itself, and every mess cleaned up makes the forum stronger.',
    cost: 6_000_000,
    effects: [
      { kind: 'auto-cleans-infection', infection: 'spam', afterMs: 20_000 },
      { kind: 'levels-per-clean', infection: null, featureId: 'forum', levels: 2 },
    ],
    requiredFeatureId: 'forum',
  }),
  boost({
    id: 'post-counts',
    eraId: 'web2-2005',
    name: 'Post counts',
    description: 'A number under every name, and ranks for it. While you’re on fire, the whole forum posts along.',
    cost: 4_000_000,
    effects: [
      { kind: 'moment-traffic', featureId: 'forum', factor: 2, moment: 'on-fire' },
      { kind: 'moment-traffic', featureId: 'subforums', factor: 2, moment: 'on-fire' },
    ],
    requiredFeatureId: 'subforums',
  }),
];

const WIKI_FEATURES = [
  exclusiveFeature({
    id: 'talk-pages',
    eraId: 'web2-2005',
    name: 'Talk pages',
    description: 'Behind every article, a page of people arguing about the article. Forty thousand words on the spelling of yoghurt.',
    baseCost: 1_500_000,
    visitorsPerSecondPerLevel: 13_000,
    synergyWith: 'wiki',
    pageWeightKb: 20,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-wiki-markup',
  }),
];
const WIKI_UPGRADES = [
  skill('learn-wiki-markup', 'web2-2005', 'Learn wiki markup', 'Two apostrophes for italics, three for bold, and templates nobody dares to touch. Unlocks talk pages.', 1_000_000),
  boost({
    id: 'edit-a-thon',
    eraId: 'web2-2005',
    name: 'Edit-a-thon',
    description: 'Volunteers fill the gaps: every twenty seconds, whichever of your features is smallest gains a level, offline too.',
    cost: 8_000_000,
    effects: [{ kind: 'auto-level', featureId: null, everyMs: 20_000 }],
    requiredFeatureId: 'talk-pages',
  }),
  boost({
    id: 'donation-drive',
    eraId: 'web2-2005',
    name: 'Donation drive',
    description: 'A banner with your face asking for $3. It works best on a site with no other banners.',
    cost: 5_000_000,
    effects: [{ kind: 'donations', amount: 0.3, lostSharePerAd: 0.25 }],
    requiredFeatureId: 'wiki',
  }),
];

// ---------- 2011 ----------

const SOCIAL_FEATURES = [
  exclusiveFeature({
    id: 'groups',
    eraId: 'social-2011',
    name: 'Groups',
    description: 'Your school year, your street, people who hate the new layout. Everyone is in eleven groups and reads two.',
    baseCost: 12_000_000_000,
    visitorsPerSecondPerLevel: 3_600_000,
    synergyWith: 'activity-feed',
    pageWeightKb: 40,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-social-graph',
  }),
];
const SOCIAL_UPGRADES = [
  skill('learn-social-graph', 'social-2011', 'Learn the social graph', 'Who knows whom, who likes what, and who looked at whose photos at 2 a.m. Unlocks groups.', 2_000_000_000),
  boost({
    id: 'network-effect',
    eraId: 'social-2011',
    name: 'Network effect',
    description: 'Everyone joins because everyone is there. Each time the site doubles in size this era, all traffic grows again.',
    cost: 10_000_000_000,
    effects: [{ kind: 'network-effect', perDoubling: 0.1, cap: 1.5 }],
    requiredFeatureId: 'groups',
  }),
  boost({
    id: 'people-you-may-know',
    eraId: 'social-2011',
    name: 'People you may know',
    description: 'Your dentist, your ex, a man you sat next to on a train once. Every level of share buttons brings more of them.',
    cost: 6_000_000_000,
    effects: [{ kind: 'traffic-per-level', sourceFeatureId: 'share-buttons', perLevel: 0.005 }],
    requiredFeatureId: 'share-buttons',
  }),
];

const MICROBLOG_FEATURES = [
  exclusiveFeature({
    id: 'trending-topics',
    eraId: 'social-2011',
    name: 'Trending topics',
    description: 'The ten things everyone is shouting about right now. By tonight, eight of them will be a celebrity’s sandwich.',
    baseCost: 8_000_000_000,
    visitorsPerSecondPerLevel: 2_400_000,
    synergyWith: 'share-buttons',
    pageWeightKb: 20,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-hashtags',
  }),
];
const MICROBLOG_UPGRADES = [
  skill('learn-hashtags', 'social-2011', 'Learn hashtags', 'A # in front of a word, and the word becomes a place everyone shouts into. Unlocks trending topics.', 1_500_000_000),
  boost({
    id: 'live-posting',
    eraId: 'social-2011',
    name: 'Live-posting',
    description: 'Post as it happens, 140 characters at a time. While you’re on fire, the whole site reads along.',
    cost: 5_000_000_000,
    effects: [{ kind: 'moment-traffic', featureId: null, factor: 1.5, moment: 'on-fire' }],
    requiredFeatureId: 'trending-topics',
  }),
  boost({
    id: 'fail-whale',
    eraId: 'social-2011',
    name: 'Fail whale',
    description: 'A cute whale for the error page. The site stays up longer under load, and a spike makes trending topics everyone’s topic.',
    cost: 8_000_000_000,
    effects: [
      { kind: 'overload-tolerance-multiplier', factor: 1.5 },
      { kind: 'moment-traffic', featureId: 'trending-topics', factor: 3, moment: 'spike' },
    ],
    requiredFeatureId: 'trending-topics',
  }),
];

const LIVE_STREAMING_FEATURES = [
  exclusiveFeature({
    id: 'emotes-and-raids',
    eraId: 'social-2011',
    name: 'Emotes and raids',
    description: 'Custom faces for the chat, and a button that sends your whole audience to someone else’s stream. They come back with friends.',
    baseCost: 15_000_000_000,
    visitorsPerSecondPerLevel: 4_500_000,
    synergyWith: 'video-player',
    pageWeightKb: 80,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-live-video',
  }),
];
const LIVE_STREAMING_UPGRADES = [
  skill('learn-live-video', 'social-2011', 'Learn live video', 'An encoder, an ingest server and a delay of twelve seconds you’ll spend your whole career fighting. Unlocks emotes and raids.', 2_000_000_000),
  boost({
    id: 'live-events',
    eraId: 'social-2011',
    name: 'Live events',
    description: 'A scheduled stream every two minutes, with a countdown. For half a minute, twice the visitors.',
    cost: 8_000_000_000,
    effects: [{ kind: 'scheduled-buff', buffId: 'live-event', everyMs: 2 * MINUTE_MS }],
    requiredFeatureId: 'emotes-and-raids',
  }),
  boost({
    id: 'subs-and-tips',
    eraId: 'social-2011',
    name: 'Subs and tips',
    description: 'A quarter of your viewers pay monthly, ads or not. Subscribers come slowly and leave slowly, even when the site is down.',
    cost: 12_000_000_000,
    effects: [{ kind: 'subscribers', share: 0.25 }],
    requiredFeatureId: 'emotes-and-raids',
  }),
];

const NEWS_FEATURES = [
  exclusiveFeature({
    id: 'listicles',
    eraId: 'social-2011',
    name: 'Listicles',
    description: '17 things only 2011 kids will understand. Number 9 will restore your faith in humanity, number 12 is an ad.',
    baseCost: 6_000_000_000,
    visitorsPerSecondPerLevel: 1_800_000,
    synergyWith: 'one-pager',
    pageWeightKb: 60,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-headline-testing',
  }),
];
const NEWS_UPGRADES = [
  skill('learn-headline-testing', 'social-2011', 'Learn headline testing', 'Two headlines, half the readers each, and the one with “You won’t believe” wins every time. Unlocks listicles.', 1_500_000_000),
  boost({
    id: 'clickbait',
    eraId: 'social-2011',
    name: 'Clickbait',
    description: 'Headlines nobody can resist and everybody regrets. Spikes come twice as often, and ads pay half again while one lasts.',
    cost: 8_000_000_000,
    effects: [
      { kind: 'spike-frequency-multiplier', factor: 2 },
      { kind: 'moment-revenue', factor: 1.5, moment: 'spike' },
    ],
    requiredFeatureId: 'listicles',
  }),
  boost({
    id: 'breaking-news',
    eraId: 'social-2011',
    name: 'Breaking news',
    description: 'A red banner and the word BREAKING. Every time you catch fire, a traffic spike starts.',
    cost: 10_000_000_000,
    effects: [{ kind: 'spike-on-fire' }],
    requiredFeatureId: 'listicles',
  }),
];

const REVIEWS_FEATURES = [
  exclusiveFeature({
    id: 'check-ins',
    eraId: 'social-2011',
    name: 'Check-ins',
    description: 'Tell everyone you’re at a coffee shop. Do it forty times and you’re its mayor.',
    baseCost: 10_000_000_000,
    visitorsPerSecondPerLevel: 3_000_000,
    synergyWith: 'map-mashup',
    pageWeightKb: 50,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-geolocation',
  }),
];
const REVIEWS_UPGRADES = [
  skill('learn-geolocation', 'social-2011', 'Learn geolocation', 'The browser asks “Allow this site to know your location?” and everyone says yes. Unlocks check-ins.', 2_000_000_000),
  boost({
    id: 'elite-reviewers',
    eraId: 'social-2011',
    name: 'Elite reviewers',
    description: 'A badge for the people who review everything, from their phones, standing in the restaurant. Phone visitors pay half again.',
    cost: 8_000_000_000,
    effects: [{ kind: 'phone-revenue-multiplier', factor: 1.5 }],
    requiredFeatureId: 'check-ins',
  }),
  boost({
    id: 'fake-review-filter',
    eraId: 'social-2011',
    name: 'Fake-review filter',
    description: 'Every spam flood you clean up teaches the filter something. Each one adds three levels of check-ins.',
    cost: 5_000_000_000,
    effects: [{ kind: 'levels-per-clean', infection: 'spam', featureId: 'check-ins', levels: 3 }],
    requiredFeatureId: 'check-ins',
  }),
];

const SHOP_FEATURES = [
  exclusiveFeature({
    id: 'product-listings',
    eraId: 'social-2011',
    name: 'Product listings',
    description: 'A photo, a price, four and a half stars, and “Only 3 left in stock” that has said 3 since March.',
    baseCost: 10_000_000_000,
    visitorsPerSecondPerLevel: 3_000_000,
    synergyWith: 'photo-gallery',
    pageWeightKb: 120,
    pageWeightKbPerLevel: 3,
    requiredSkillId: 'learn-shopping-cart',
  }),
];
const SHOP_UPGRADES = [
  skill('learn-shopping-cart', 'social-2011', 'Learn the shopping cart', 'A cart that remembers what you left in it and emails you about it until one of you gives in. Unlocks product listings.', 2_000_000_000),
  boost({
    id: 'customers-also-bought',
    eraId: 'social-2011',
    name: 'Customers also bought',
    description: 'Bought a tent? Here are 40 more tents. The more there is on the site, the more every visitor spends.',
    cost: 10_000_000_000,
    effects: [{ kind: 'revenue-per-feature-level', share: 0.002 }],
    requiredFeatureId: 'product-listings',
  }),
  boost({
    id: 'black-friday',
    eraId: 'social-2011',
    name: 'Black Friday',
    description: 'Now every five minutes. For 45 seconds, every ad pays triple.',
    cost: 8_000_000_000,
    effects: [{ kind: 'scheduled-buff', buffId: 'black-friday', everyMs: 5 * MINUTE_MS }],
    requiredFeatureId: 'product-listings',
  }),
];

// ---------- 2018 ----------

const STORIES_FEATURES = [
  exclusiveFeature({
    id: 'filters-and-lenses',
    eraId: 'platform-2018',
    name: 'Filters and lenses',
    description: 'Dog ears, flower crowns and a face swap with your fridge. Nobody posts a story without one.',
    baseCost: 600_000_000_000,
    visitorsPerSecondPerLevel: 240_000_000,
    synergyWith: 'stories',
    pageWeightKb: 200,
    pageWeightKbPerLevel: 5,
    requiredSkillId: 'learn-vertical-video',
  }),
];
const STORIES_UPGRADES = [
  skill('learn-vertical-video', 'platform-2018', 'Learn vertical video', 'Hold the phone the wrong way, on purpose. Unlocks filters and lenses.', 400_000_000_000),
  boost({
    id: 'disappearing-stories',
    eraId: 'platform-2018',
    name: 'Disappearing stories',
    description: 'Gone in 24 hours, so people check in all the time. Filters and lenses triple while you keep typing, and halve when you stop.',
    cost: 600_000_000_000,
    effects: [
      { kind: 'moment-traffic', featureId: 'filters-and-lenses', factor: 3, moment: 'typing' },
      { kind: 'moment-traffic', featureId: 'filters-and-lenses', factor: 0.5, moment: 'idle' },
    ],
    requiredFeatureId: 'filters-and-lenses',
  }),
  boost({
    id: 'influencers',
    eraId: 'platform-2018',
    name: 'Influencers',
    description: 'People whose job is holding up a tea. Sponsors and launches offer themselves twice as often.',
    cost: 500_000_000_000,
    effects: [{ kind: 'offer-frequency-multiplier', factor: 2 }],
    requiredFeatureId: 'filters-and-lenses',
  }),
];

const STREAMING_FEATURES = [
  exclusiveFeature({
    id: 'originals',
    eraId: 'platform-2018',
    name: 'Originals',
    description: 'Your own shows: a true-crime series, a cooking contest, and a sci-fi drama cancelled after the cliffhanger.',
    baseCost: 1_200_000_000_000,
    visitorsPerSecondPerLevel: 480_000_000,
    synergyWith: 'video-player',
    pageWeightKb: 250,
    pageWeightKbPerLevel: 5,
    requiredSkillId: 'learn-adaptive-streaming',
  }),
];
const STREAMING_UPGRADES = [
  skill('learn-adaptive-streaming', 'platform-2018', 'Learn adaptive streaming', 'Twelve copies of every show at twelve qualities, switched as the connection wobbles. Unlocks originals.', 500_000_000_000),
  boost({
    id: 'subscriptions',
    eraId: 'platform-2018',
    name: 'Subscriptions',
    description: 'Four in ten visitors pay every month, ads or not, and forget to cancel. Subscribers come slowly and leave slowly.',
    cost: 1_200_000_000_000,
    effects: [{ kind: 'subscribers', share: 0.4 }],
    requiredFeatureId: 'originals',
  }),
  boost({
    id: 'binge-autoplay',
    eraId: 'platform-2018',
    name: 'Binge autoplay',
    description: 'The next episode starts in 5, 4, 3… Nobody waits for a page that never stops playing.',
    cost: 800_000_000_000,
    effects: [{ kind: 'load-time-multiplier', factor: 0.5 }],
    requiredFeatureId: 'originals',
  }),
];

const NEWSLETTER_FEATURES = [
  exclusiveFeature({
    id: 'paid-newsletters',
    eraId: 'platform-2018',
    name: 'Paid newsletters',
    description: 'Writers who left their papers, now writing for 3,000 people at $5 a month. Most of them about having left their papers.',
    baseCost: 900_000_000_000,
    visitorsPerSecondPerLevel: 360_000_000,
    synergyWith: 'newsletter',
    pageWeightKb: 30,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-deliverability',
  }),
];
const NEWSLETTER_UPGRADES = [
  skill('learn-deliverability', 'platform-2018', 'Learn email deliverability', 'SPF, DKIM, DMARC, and the dark art of staying out of the Promotions tab. Unlocks paid newsletters.', 400_000_000_000),
  boost({
    id: 'writers-fund',
    eraId: 'platform-2018',
    name: 'Writers’ fund',
    description: 'Pay writers to move here. Every 250 keystrokes you type is another paid newsletter, and some readers subscribe.',
    cost: 1_000_000_000_000,
    effects: [
      { kind: 'keystrokes-level', featureId: 'paid-newsletters', keystrokes: 250 },
      { kind: 'subscribers', share: 0.15 },
    ],
    requiredFeatureId: 'paid-newsletters',
  }),
  boost({
    id: 'tracking-pixels',
    eraId: 'platform-2018',
    name: 'Tracking pixels',
    description: 'A 1×1 image in every email tells advertisers who opened what, and when. Ads pay more; the regulators notice.',
    cost: 600_000_000_000,
    effects: [
      { kind: 'ad-value-multiplier', factor: 1.5 },
      { kind: 'privacy-fine-multiplier', factor: 2 },
    ],
    requiredFeatureId: 'paid-newsletters',
  }),
];

const MARKETPLACE_FEATURES = [
  exclusiveFeature({
    id: 'seller-dashboards',
    eraId: 'platform-2018',
    name: 'Seller dashboards',
    description: 'Charts for people selling knitted cat hats: views, sales, and a graph that goes up every December.',
    baseCost: 800_000_000_000,
    visitorsPerSecondPerLevel: 320_000_000,
    synergyWith: 'language-switcher',
    pageWeightKb: 90,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-escrow',
  }),
];
const MARKETPLACE_UPGRADES = [
  skill('learn-escrow', 'platform-2018', 'Learn escrow payments', 'Hold the money until the parcel arrives, and keep a little for your trouble. Unlocks seller dashboards.', 400_000_000_000),
  boost({
    id: 'take-rate',
    eraId: 'platform-2018',
    name: 'Take rate',
    description: 'A cut of every sale, and of every fee you pay to build: sellers pay for the shelves. Every feature costs less.',
    cost: 1_000_000_000_000,
    effects: [{ kind: 'feature-cost-multiplier', factor: 0.85 }],
    requiredFeatureId: 'seller-dashboards',
  }),
  boost({
    id: 'surge-pricing',
    eraId: 'platform-2018',
    name: 'Surge pricing',
    description: 'Busy? Prices go up. During a traffic spike, every visitor pays triple.',
    cost: 600_000_000_000,
    effects: [{ kind: 'moment-revenue', factor: 3, moment: 'spike' }],
    requiredFeatureId: 'seller-dashboards',
  }),
];

const PROFESSIONAL_FEATURES = [
  exclusiveFeature({
    id: 'job-board',
    eraId: 'platform-2018',
    name: 'Job board',
    description: 'Entry-level jobs that want five years of experience, posted by recruiters who want to connect.',
    baseCost: 1_000_000_000_000,
    visitorsPerSecondPerLevel: 400_000_000,
    synergyWith: 'pricing-table',
    pageWeightKb: 60,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-recruiting-tools',
  }),
];
const PROFESSIONAL_UPGRADES = [
  skill('learn-recruiting-tools', 'platform-2018', 'Learn recruiting tools', 'Search everyone by job title, and message them about an exciting opportunity. Unlocks the job board.', 500_000_000_000),
  boost({
    id: 'endorsements',
    eraId: 'platform-2018',
    name: 'Endorsements',
    description: 'Your aunt endorses you for Kubernetes. Ads pay 15% more for every specialization your site has held.',
    cost: 800_000_000_000,
    effects: [{ kind: 'ad-value-per-specialization', share: 0.15 }],
    requiredFeatureId: 'job-board',
  }),
  boost({
    id: 'premium-messages',
    eraId: 'platform-2018',
    name: 'Premium messages',
    description: 'Pay to message people who didn’t ask. A quarter of visitors subscribe, just in case.',
    cost: 1_000_000_000_000,
    effects: [{ kind: 'subscribers', share: 0.25 }],
    requiredFeatureId: 'job-board',
  }),
];

const CHAT_COMMUNITY_FEATURES = [
  exclusiveFeature({
    id: 'servers',
    eraId: 'platform-2018',
    name: 'Servers',
    description: 'Anyone can start a server: a guild, a fan club, a study group that is mostly memes. Each one brings its own crowd.',
    baseCost: 900_000_000_000,
    visitorsPerSecondPerLevel: 360_000_000,
    synergyWith: 'community-chat',
    pageWeightKb: 100,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-bots-and-webhooks',
  }),
];
const CHAT_COMMUNITY_UPGRADES = [
  skill('learn-bots-and-webhooks', 'platform-2018', 'Learn bots and webhooks', 'Little programs that join the chat, roll dice, play music and ban people for saying “hello”. Unlocks servers.', 400_000_000_000),
  boost({
    id: 'server-boosts',
    eraId: 'platform-2018',
    name: 'Server boosts',
    description: 'Members pay to make their server shinier, and invite friends to help. Each time the site doubles this era, all traffic grows again.',
    cost: 1_000_000_000_000,
    effects: [{ kind: 'network-effect', perDoubling: 0.1, cap: 1.5 }],
    requiredFeatureId: 'servers',
  }),
  boost({
    id: 'mod-bots',
    eraId: 'platform-2018',
    name: 'Mod bots',
    description: 'A bot that kicks attackers at 3 a.m. A DDoS clears itself, and every mess cleaned up adds servers.',
    cost: 700_000_000_000,
    effects: [
      { kind: 'auto-cleans-infection', infection: 'ddos', afterMs: 30_000 },
      { kind: 'levels-per-clean', infection: null, featureId: 'servers', levels: 2 },
    ],
    requiredFeatureId: 'servers',
  }),
];

// ---------- 2024 ----------

const SHORT_VIDEO_FEATURES = [
  exclusiveFeature({
    id: 'duets-and-remixes',
    eraId: 'ai-2024',
    name: 'Duets and remixes',
    description: 'Your video, next to someone’s reaction to your video, next to someone’s reaction to that.',
    baseCost: 150_000_000_000_000,
    visitorsPerSecondPerLevel: 30_000_000_000,
    synergyWith: 'for-you-feed',
    pageWeightKb: 150,
    pageWeightKbPerLevel: 3,
    requiredSkillId: 'learn-remixing',
  }),
];
const SHORT_VIDEO_UPGRADES = [
  skill('learn-remixing', 'ai-2024', 'Learn video remixing', 'Split screens, green screens, and a sound everyone uses for a week. Unlocks duets and remixes.', 60_000_000_000_000),
  boost({
    id: 'the-algorithm',
    eraId: 'ai-2024',
    name: 'The algorithm',
    description: 'It knows what you want before you do. Your busiest feature gets three times the visitors; everything else gets less.',
    cost: 120_000_000_000_000,
    effects: [{ kind: 'algorithm', topFactor: 3, restFactor: 0.7 }],
    requiredFeatureId: 'duets-and-remixes',
  }),
  boost({
    id: 'infinite-scroll',
    eraId: 'ai-2024',
    name: 'Infinite scroll',
    description: 'There is no bottom. The next video is already loaded before this one ends.',
    cost: 80_000_000_000_000,
    effects: [{ kind: 'load-time-multiplier', factor: 0.4 }],
    requiredFeatureId: 'duets-and-remixes',
  }),
];

const AI_ANSWERS_FEATURES = [
  exclusiveFeature({
    id: 'sources-panel',
    eraId: 'ai-2024',
    name: 'Sources panel',
    description: 'Five little numbered links beside every answer. Almost nobody clicks them, but they look very responsible.',
    baseCost: 100_000_000_000_000,
    visitorsPerSecondPerLevel: 20_000_000_000,
    synergyWith: 'ai-search',
    pageWeightKb: 40,
    pageWeightKbPerLevel: 1,
    requiredSkillId: 'learn-citations',
  }),
];
const AI_ANSWERS_UPGRADES = [
  skill('learn-citations', 'ai-2024', 'Learn citations', 'Make the model say where it read things, and check that the place exists. Unlocks the sources panel.', 50_000_000_000_000),
  boost({
    id: 'answer-dont-link',
    eraId: 'ai-2024',
    name: 'Answer, don’t link',
    description: 'You are the answer engine now. The visitors AI answers keep from other sites’ links still pay you most of what they would have.',
    cost: 120_000_000_000_000,
    effects: [{ kind: 'ai-answers-pay', share: 0.6 }],
    requiredFeatureId: 'sources-panel',
  }),
  boost({
    id: 'sponsored-answers',
    eraId: 'ai-2024',
    name: 'Sponsored answers',
    description: 'The best hiking boots? A brand paid to be the answer. Every visitor pays, but answers keep more of them from clicking.',
    cost: 100_000_000_000_000,
    effects: [
      { kind: 'direct-revenue-per-visitor', amount: 0.15 },
      { kind: 'ai-answer-share-multiplier', factor: 1.3 },
    ],
    requiredFeatureId: 'sources-panel',
  }),
];

const AI_STUDIO_FEATURES = [
  exclusiveFeature({
    id: 'prompt-gallery',
    eraId: 'ai-2024',
    name: 'Prompt gallery',
    description: 'Ten thousand pictures of an astronaut riding a horse, and the exact words that made each one.',
    baseCost: 120_000_000_000_000,
    visitorsPerSecondPerLevel: 24_000_000_000,
    synergyWith: 'ai-images',
    pageWeightKb: 250,
    pageWeightKbPerLevel: 6,
    requiredSkillId: 'learn-style-models',
  }),
];
const AI_STUDIO_UPGRADES = [
  skill('learn-style-models', 'ai-2024', 'Learn style models', 'A small add-on model trained on forty pictures, so everything comes out in one style. Unlocks the prompt gallery.', 60_000_000_000_000),
  boost({
    id: 'gpu-farm',
    eraId: 'ai-2024',
    name: 'GPU farm',
    description: 'Rent a warehouse of GPUs and let them build: every eight seconds your smallest feature gains a level, offline too. The power bill takes a quarter of revenue.',
    cost: 150_000_000_000_000,
    effects: [
      { kind: 'auto-level', featureId: null, everyMs: 8_000 },
      { kind: 'revenue-upkeep-share', share: 0.25 },
    ],
    requiredFeatureId: 'prompt-gallery',
  }),
  boost({
    id: 'credits',
    eraId: 'ai-2024',
    name: 'Credits',
    description: '200 images a month, then buy more. Three in ten visitors subscribe; subscribers come and go slowly.',
    cost: 100_000_000_000_000,
    effects: [{ kind: 'subscribers', share: 0.3 }],
    requiredFeatureId: 'prompt-gallery',
  }),
];

const AI_COMPANION_FEATURES = [
  exclusiveFeature({
    id: 'characters',
    eraId: 'ai-2024',
    name: 'Characters',
    description: 'A wizard, a detective, a version of your old maths teacher who is finally nice to you.',
    baseCost: 100_000_000_000_000,
    visitorsPerSecondPerLevel: 20_000_000_000,
    synergyWith: 'ai-chatbot',
    pageWeightKb: 80,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-fine-tuning',
  }),
];
const AI_COMPANION_UPGRADES = [
  skill('learn-fine-tuning', 'ai-2024', 'Learn fine-tuning', 'A few thousand example chats, and the model talks like a pirate forever. Unlocks characters.', 50_000_000_000_000),
  boost({
    id: 'it-remembers-you',
    eraId: 'ai-2024',
    name: 'It remembers you',
    description: 'Your name, your dog’s name, the thing you said in March. Two in ten visitors subscribe, and subscribers almost never leave.',
    cost: 120_000_000_000_000,
    effects: [
      { kind: 'subscribers', share: 0.2 },
      { kind: 'subscriber-churn-multiplier', factor: 0.1 },
    ],
    requiredFeatureId: 'characters',
  }),
  boost({
    id: 'talks-while-you-sleep',
    eraId: 'ai-2024',
    name: 'Talks while you sleep',
    description: 'The characters chat all night without you. Whoever you hired types twice as fast.',
    cost: 80_000_000_000_000,
    effects: [{ kind: 'auto-keystroke-multiplier', factor: 2 }],
    requiredFeatureId: 'characters',
  }),
];

const AGENT_STORE_FEATURES = [
  exclusiveFeature({
    id: 'agent-listings',
    eraId: 'ai-2024',
    name: 'Agent listings',
    description: 'A storefront of agents with five-star ratings from other agents.',
    baseCost: 150_000_000_000_000,
    visitorsPerSecondPerLevel: 30_000_000_000,
    synergyWith: 'agent-store',
    pageWeightKb: 100,
    pageWeightKbPerLevel: 2,
    requiredSkillId: 'learn-tool-calling',
  }),
];
const AGENT_STORE_UPGRADES = [
  skill('learn-tool-calling', 'ai-2024', 'Learn tool calling', 'Let the model press buttons: search, book, pay. Mostly the right buttons. Unlocks agent listings.', 60_000_000_000_000),
  boost({
    id: 'agents-buy-for-you',
    eraId: 'ai-2024',
    name: 'Agents buy for you',
    description: 'An agent with your card: every five seconds it buys the feature level with the most visitors for the money. It never asks first.',
    cost: 120_000_000_000_000,
    effects: [{ kind: 'auto-buyer', everyMs: 5_000 }],
    requiredFeatureId: 'agent-listings',
  }),
  boost({
    id: 'tool-use-fees',
    eraId: 'ai-2024',
    name: 'Tool-use fees',
    description: 'A fraction of a cent every time an agent uses a feature. The more there is on the site, the more every visitor brings in.',
    cost: 100_000_000_000_000,
    effects: [{ kind: 'revenue-per-feature-level', share: 0.0015 }],
    requiredFeatureId: 'agent-listings',
  }),
];

/** Every specialization's items, in the tree's order. */
export const SPECIALIZATION_ITEMS: Readonly<Record<TreeSpecializationId, SpecializationItems>> = {
  'blog-network': { learn: 'learn-multi-user-blogs', build: 'member-blogs', upgrades: ['write-every-day', 'long-tail'] },
  photos: { learn: 'learn-exif', build: 'photo-groups', upgrades: ['users-upload', 'explore-page'] },
  video: { learn: 'learn-flash-video', build: 'channels', upgrades: ['going-viral', 'embed-anywhere'] },
  forum: { learn: 'learn-mod-tools', build: 'subforums', upgrades: ['volunteer-mods', 'post-counts'] },
  wiki: { learn: 'learn-wiki-markup', build: 'talk-pages', upgrades: ['edit-a-thon', 'donation-drive'] },
  social: { learn: 'learn-social-graph', build: 'groups', upgrades: ['network-effect', 'people-you-may-know'] },
  microblog: { learn: 'learn-hashtags', build: 'trending-topics', upgrades: ['live-posting', 'fail-whale'] },
  'live-streaming': { learn: 'learn-live-video', build: 'emotes-and-raids', upgrades: ['live-events', 'subs-and-tips'] },
  news: { learn: 'learn-headline-testing', build: 'listicles', upgrades: ['clickbait', 'breaking-news'] },
  reviews: { learn: 'learn-geolocation', build: 'check-ins', upgrades: ['elite-reviewers', 'fake-review-filter'] },
  shop: { learn: 'learn-shopping-cart', build: 'product-listings', upgrades: ['customers-also-bought', 'black-friday'] },
  stories: { learn: 'learn-vertical-video', build: 'filters-and-lenses', upgrades: ['disappearing-stories', 'influencers'] },
  'streaming-service': { learn: 'learn-adaptive-streaming', build: 'originals', upgrades: ['subscriptions', 'binge-autoplay'] },
  newsletter: { learn: 'learn-deliverability', build: 'paid-newsletters', upgrades: ['writers-fund', 'tracking-pixels'] },
  marketplace: { learn: 'learn-escrow', build: 'seller-dashboards', upgrades: ['take-rate', 'surge-pricing'] },
  professional: { learn: 'learn-recruiting-tools', build: 'job-board', upgrades: ['endorsements', 'premium-messages'] },
  'chat-community': { learn: 'learn-bots-and-webhooks', build: 'servers', upgrades: ['server-boosts', 'mod-bots'] },
  'short-video': { learn: 'learn-remixing', build: 'duets-and-remixes', upgrades: ['the-algorithm', 'infinite-scroll'] },
  'ai-answers': { learn: 'learn-citations', build: 'sources-panel', upgrades: ['answer-dont-link', 'sponsored-answers'] },
  'ai-studio': { learn: 'learn-style-models', build: 'prompt-gallery', upgrades: ['gpu-farm', 'credits'] },
  'ai-companion': { learn: 'learn-fine-tuning', build: 'characters', upgrades: ['it-remembers-you', 'talks-while-you-sleep'] },
  'agent-store': { learn: 'learn-tool-calling', build: 'agent-listings', upgrades: ['agents-buy-for-you', 'tool-use-fees'] },
};

const ALL_FEATURES: readonly FeatureDefinition[] = [
  ...BLOG_NETWORK_FEATURES,
  ...PHOTOS_FEATURES,
  ...VIDEO_FEATURES,
  ...FORUM_FEATURES,
  ...WIKI_FEATURES,
  ...SOCIAL_FEATURES,
  ...MICROBLOG_FEATURES,
  ...LIVE_STREAMING_FEATURES,
  ...NEWS_FEATURES,
  ...REVIEWS_FEATURES,
  ...SHOP_FEATURES,
  ...STORIES_FEATURES,
  ...STREAMING_FEATURES,
  ...NEWSLETTER_FEATURES,
  ...MARKETPLACE_FEATURES,
  ...PROFESSIONAL_FEATURES,
  ...CHAT_COMMUNITY_FEATURES,
  ...SHORT_VIDEO_FEATURES,
  ...AI_ANSWERS_FEATURES,
  ...AI_STUDIO_FEATURES,
  ...AI_COMPANION_FEATURES,
  ...AGENT_STORE_FEATURES,
];

const ALL_UPGRADES: readonly UpgradeDefinition[] = [
  ...BLOG_NETWORK_UPGRADES,
  ...PHOTOS_UPGRADES,
  ...VIDEO_UPGRADES,
  ...FORUM_UPGRADES,
  ...WIKI_UPGRADES,
  ...SOCIAL_UPGRADES,
  ...MICROBLOG_UPGRADES,
  ...LIVE_STREAMING_UPGRADES,
  ...NEWS_UPGRADES,
  ...REVIEWS_UPGRADES,
  ...SHOP_UPGRADES,
  ...STORIES_UPGRADES,
  ...STREAMING_UPGRADES,
  ...NEWSLETTER_UPGRADES,
  ...MARKETPLACE_UPGRADES,
  ...PROFESSIONAL_UPGRADES,
  ...CHAT_COMMUNITY_UPGRADES,
  ...SHORT_VIDEO_UPGRADES,
  ...AI_ANSWERS_UPGRADES,
  ...AI_STUDIO_UPGRADES,
  ...AI_COMPANION_UPGRADES,
  ...AGENT_STORE_UPGRADES,
];

export const SPECIALIZATION_FEATURE_IDS: readonly SpecializationFeatureId[] = Object.values(SPECIALIZATION_ITEMS).map((items) => items.build);

export const SPECIALIZATION_UPGRADE_IDS: readonly SpecializationUpgradeId[] = Object.values(SPECIALIZATION_ITEMS).flatMap((items) => [items.learn, ...items.upgrades]);

export const SPECIALIZATION_FEATURES = Object.fromEntries(ALL_FEATURES.map((definition) => [definition.id, definition])) as Readonly<Record<SpecializationFeatureId, FeatureDefinition>>;

export const SPECIALIZATION_UPGRADES = Object.fromEntries(ALL_UPGRADES.map((definition) => [definition.id, definition])) as Readonly<Record<SpecializationUpgradeId, UpgradeDefinition>>;

const OWNERS: ReadonlyMap<FeatureId | UpgradeId, TreeSpecializationId> = new Map(
  (Object.entries(SPECIALIZATION_ITEMS) as readonly (readonly [TreeSpecializationId, SpecializationItems])[]).flatMap(([owner, items]) =>
    [items.build, items.learn, ...items.upgrades].map((itemId) => [itemId, owner] as const),
  ),
);

/** The specialization an item belongs to, or null for everything everyone can buy. */
export function findItemOwner(itemId: FeatureId | UpgradeId): TreeSpecializationId | null {
  return OWNERS.get(itemId) ?? null;
}
