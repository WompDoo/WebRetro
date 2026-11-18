import { ERAS_BY_ID } from './eras';
import { SPECIALIZATION_IDS, SPECIALIZATIONS_BY_ID } from './specializations';
import type { AchievementId, GameState, LegacyState, SpecializationId } from '../types';

/**
 * Achievements: what a player has done, across every run in this browser. Each is checked against the game and the
 * legacy as the game runs, and once earned it stays. A secret one shows only its icon and "???" until it's earned:
 * finding out what it asks is part of it.
 */
export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly name: string;
  readonly icon: string;
  /** What it asks, once known: secret ones keep it to themselves until earned. */
  readonly description: string;
  readonly isSecret: boolean;
  readonly isEarned: (state: GameState, legacy: LegacyState) => boolean;
}

const CLEANUPS_FOR_A_SWEEP = 10;
const AD_FREE_MINUTES = 10;
const MS_PER_MINUTE = 60_000;
/** One from every era that has them: 2005, 2011, 2018 and 2024. */
const FULL_STACK = 4;
const TRILLION = 1e12;
const SECOND_RUN = 2;
const WEB2_YEAR = 2005;

function countCleanups(state: GameState): number {
  return Object.values(state.eraStats.cleanedByKind).reduce((total, cleaned) => total + cleaned, 0);
}

/** Held without the specialization it grows from: only Serial founder lets a site do that. */
function isHeldWithoutLineage(state: GameState, specializationId: SpecializationId): boolean {
  const { parents } = SPECIALIZATIONS_BY_ID[specializationId];
  return parents.length > 0 && !parents.some((parent) => state.specializationIds.includes(parent));
}

export const ACHIEVEMENT_IDS: readonly AchievementId[] = [
  'first-visitor',
  'quit-day-job',
  'on-fire',
  'rode-it-out',
  'clean-sweep',
  'no-ads-no-problem',
  'web-2-0',
  'the-whole-web',
  'second-site',
  'specialist',
  'full-stack',
  'secret-door',
  'collector',
  'serial-founder',
  'broken-combo',
  'trillionaire',
];

export const ACHIEVEMENTS_BY_ID: Readonly<Record<AchievementId, AchievementDefinition>> = {
  'first-visitor': {
    id: 'first-visitor',
    name: 'Someone came',
    icon: '👀',
    description: 'Your first visitor. Probably you, refreshing.',
    isSecret: false,
    isEarned: (state) => state.lifetimeVisitors >= 1,
  },
  'quit-day-job': {
    id: 'quit-day-job',
    name: 'Quit the day job',
    icon: '💼',
    description: 'The site pays more than your old job did.',
    isSecret: false,
    isEarned: (state) => state.reachedMilestoneIds.includes('quit-day-job'),
  },
  'on-fire': {
    id: 'on-fire',
    name: 'On fire',
    icon: '🔥',
    description: 'Type without typos until the editor catches fire.',
    isSecret: false,
    isEarned: (state) => state.eraStats.onFireStarts > 0,
  },
  'rode-it-out': {
    id: 'rode-it-out',
    name: 'Rode it out',
    icon: '🌊',
    description: 'A traffic spike ends, and the site never went down.',
    isSecret: false,
    isEarned: (state) => state.eraStats.spikesRiddenOut > 0,
  },
  'clean-sweep': {
    id: 'clean-sweep',
    name: 'Clean sweep',
    icon: '🧹',
    description: `Clean up ${CLEANUPS_FOR_A_SWEEP} infections in one era.`,
    isSecret: false,
    isEarned: (state) => countCleanups(state) >= CLEANUPS_FOR_A_SWEEP,
  },
  'no-ads-no-problem': {
    id: 'no-ads-no-problem',
    name: 'No ads, no problem',
    icon: '🕊️',
    description: `Run the site for ${AD_FREE_MINUTES} minutes without a single ad.`,
    isSecret: true,
    isEarned: (state) => state.eraStats.adFreeMs >= AD_FREE_MINUTES * MS_PER_MINUTE,
  },
  'web-2-0': {
    id: 'web-2-0',
    name: 'Web 2.0',
    icon: '🌐',
    description: 'Relaunch into 2005: rounded corners, beta badges, and a reflection under everything.',
    isSecret: false,
    isEarned: (state) => ERAS_BY_ID[state.eraId].year >= WEB2_YEAR,
  },
  'the-whole-web': {
    id: 'the-whole-web',
    name: 'The whole web',
    icon: '🏁',
    description: 'From a homepage in 1997 to an AI site in 2024: finish a run.',
    isSecret: false,
    isEarned: (state, legacy) => state.isGameFinished || legacy.finishedRuns > 0,
  },
  'second-site': {
    id: 'second-site',
    name: 'Second site',
    icon: '🔁',
    description: 'Start over with everything you learned the first time.',
    isSecret: false,
    isEarned: (state) => state.runNumber >= SECOND_RUN,
  },
  specialist: {
    id: 'specialist',
    name: 'Specialist',
    icon: '🎯',
    description: 'Make your site something more: choose a specialization.',
    isSecret: false,
    isEarned: (state) => state.specializationIds.length > 0,
  },
  'full-stack': {
    id: 'full-stack',
    name: 'Full stack',
    icon: '🥞',
    description: 'One specialization from every era, on one site.',
    isSecret: false,
    isEarned: (state) => state.specializationIds.length >= FULL_STACK,
  },
  'secret-door': {
    id: 'secret-door',
    name: 'Secret door',
    icon: '🗝️',
    description: 'Unlock a specialization nobody told you about.',
    isSecret: true,
    isEarned: (state) => state.unlockedSpecializationIds.some((id) => SPECIALIZATIONS_BY_ID[id].isSecret),
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    icon: '📚',
    description: 'Find every specialization, across all your runs.',
    isSecret: false,
    isEarned: (_state, legacy) => SPECIALIZATION_IDS.every((id) => id === 'homepage' || legacy.foundSpecializationIds.includes(id)),
  },
  'serial-founder': {
    id: 'serial-founder',
    name: 'Serial founder',
    icon: '🦄',
    description: 'Buy the Backlink perk that ignores where a site came from.',
    isSecret: false,
    isEarned: (_state, legacy) => legacy.perkLevels['serial-founder'] > 0,
  },
  'broken-combo': {
    id: 'broken-combo',
    name: 'Broken combo',
    icon: '🧨',
    description: 'Hold a specialization your site never grew into. It works. Nobody knows why.',
    isSecret: true,
    isEarned: (state) => state.specializationIds.some((id) => isHeldWithoutLineage(state, id)),
  },
  trillionaire: {
    id: 'trillionaire',
    name: 'Trillionaire',
    icon: '💎',
    description: 'Earn a trillion dollars in one run. Most of it in the last ten minutes.',
    isSecret: false,
    isEarned: (state) => state.lifetimeEarnings >= TRILLION,
  },
};
