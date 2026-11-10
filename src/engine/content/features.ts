import type { EraId, FeatureDefinition, FeatureId } from '../types';

export const FEATURE_IDS: readonly FeatureId[] = [
  'hit-counter',
  'under-construction',
  'guestbook',
  'midi-player',
  'webring',
  'blog',
  'comments',
  'tag-cloud',
];

export const FEATURES_BY_ID: Readonly<Record<FeatureId, FeatureDefinition>> = {
  'hit-counter': {
    id: 'hit-counter',
    eraId: 'homepage-1997',
    name: 'Hit counter',
    laterEraNames: { 'web2-2005': 'Visitor stats' },
    description: 'Proof that people visit. Or that you hit refresh a lot.',
    baseCost: 15,
    visitorsPerSecondPerLevel: 1,
    synergy: null,
    requiredSkillId: 'img-tag',
  },
  'under-construction': {
    id: 'under-construction',
    eraId: 'homepage-1997',
    name: 'Under construction GIF',
    laterEraNames: { 'web2-2005': 'Beta sticker' },
    description: 'Tells visitors to come back later. Some of them do.',
    baseCost: 110,
    visitorsPerSecondPerLevel: 6,
    synergy: null,
    requiredSkillId: 'img-tag',
  },
  guestbook: {
    id: 'guestbook',
    eraId: 'homepage-1997',
    name: 'Guestbook',
    laterEraNames: { 'web2-2005': 'Shoutbox' },
    description: 'Visitors leave messages. Also links. Mostly links.',
    baseCost: 1_200,
    visitorsPerSecondPerLevel: 40,
    synergy: null,
    requiredSkillId: 'cgi-forms',
  },
  'midi-player': {
    id: 'midi-player',
    eraId: 'homepage-1997',
    name: 'MIDI player',
    laterEraNames: { 'web2-2005': 'Podcast player' },
    description: 'Background music that starts on its own. Nobody can find the mute button.',
    baseCost: 3_200,
    visitorsPerSecondPerLevel: 110,
    synergy: null,
    requiredSkillId: 'embed-tag',
  },
  webring: {
    id: 'webring',
    eraId: 'homepage-1997',
    name: 'Webring',
    laterEraNames: { 'web2-2005': 'Blogroll' },
    description: 'Join a ring of similar sites and pass visitors around.',
    baseCost: 24_000,
    visitorsPerSecondPerLevel: 600,
    synergy: null,
    requiredSkillId: 'hyperlinks',
  },
  blog: {
    id: 'blog',
    eraId: 'web2-2005',
    name: 'Blog',
    laterEraNames: {},
    description: 'Post your thoughts every day. People subscribe with RSS.',
    baseCost: 90_000,
    visitorsPerSecondPerLevel: 2_500,
    synergy: null,
    requiredSkillId: 'learn-php',
  },
  comments: {
    id: 'comments',
    eraId: 'web2-2005',
    name: 'Comments',
    laterEraNames: {},
    description: 'Readers talk back. Every blog level makes them busier.',
    baseCost: 1_500_000,
    visitorsPerSecondPerLevel: 16_000,
    synergy: { sourceFeatureId: 'blog', bonusPerSourceLevel: 0.05 },
    requiredSkillId: 'learn-ajax',
  },
  'tag-cloud': {
    id: 'tag-cloud',
    eraId: 'web2-2005',
    name: 'Tag cloud',
    laterEraNames: {},
    description: 'Every word you ever used, in random sizes.',
    baseCost: 12_000_000,
    visitorsPerSecondPerLevel: 80_000,
    synergy: null,
    requiredSkillId: 'learn-rss',
  },
};

export const FEATURES: readonly FeatureDefinition[] = FEATURE_IDS.map((id) => FEATURES_BY_ID[id]);

export function getFeatureIdsOfEra(eraId: EraId): readonly FeatureId[] {
  return FEATURE_IDS.filter((id) => FEATURES_BY_ID[id].eraId === eraId);
}

export function getFeatureDisplayName(featureId: FeatureId, eraId: EraId): string {
  const definition = FEATURES_BY_ID[featureId];
  return definition.laterEraNames[eraId] ?? definition.name;
}
