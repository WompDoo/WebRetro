import { SAVE_VERSION } from './constants';
import type { FeatureId, GameState, HazardKind } from './types';

const FIRST_ENTITY_ID = 1;

/** The first pop-up and the first virus arrive a little sooner than later ones, so the player meets them early. */
export const INITIAL_HAZARD_COUNTDOWNS_MS: Readonly<Record<HazardKind, number>> = {
  popup: 12_000,
  virus: 35_000,
  spam: 30_000,
};

const EMPTY_FEATURE_LEVELS: Readonly<Record<FeatureId, number>> = {
  'hit-counter': 0,
  'under-construction': 0,
  guestbook: 0,
  'midi-player': 0,
  webring: 0,
  blog: 0,
  comments: 0,
  'tag-cloud': 0,
};

export function createInitialGameState(randomSeed: number): GameState {
  return {
    saveVersion: SAVE_VERSION,
    eraId: 'homepage-1997',
    money: 0,
    lifetimeEarnings: 0,
    lifetimeVisitors: 0,
    keystrokes: 0,
    hasPendingBug: false,
    featureLevels: EMPTY_FEATURE_LEVELS,
    adCount: 0,
    purchasedUpgradeIds: [],
    ownedDefenseIds: [],
    enabledDefenseIds: [],
    popups: [],
    infections: [],
    hazardCountdownsMs: INITIAL_HAZARD_COUNTDOWNS_MS,
    nextEntityId: FIRST_ENTITY_ID,
    randomSeed,
    playTimeMs: 0,
    reachedMilestoneIds: [],
    prototypeComplete: false,
  };
}
