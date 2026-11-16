import { findFrameworkPickedBy, findFrameworkRenderedBy } from './content/frameworks';
import { UPGRADES_BY_ID } from './content/upgrades';
import { getAvailableSkillIds } from './economy';
import type { GameState, HazardKind, UpgradeId } from './types';

/**
 * Perks that act once, when a site or an era starts, rather than all the time: skills already known, and trouble
 * that takes longer to find you. Called at every relaunch and when a new site starts.
 */

/** Each level of Early warning holds every hazard back this much longer at an era's start. */
const EARLY_WARNING_MS = 2 * 60_000;
/** Each level of Old savings: what a new site starts with. */
export const OLD_SAVINGS_PER_LEVEL = 1_000;

/** The framework is a choice, never a perk. */
function isFrameworkSkill(upgradeId: UpgradeId): boolean {
  return findFrameworkPickedBy(upgradeId) !== null || findFrameworkRenderedBy(upgradeId) !== null;
}

/** This era's cheapest skill not yet known: the one every player learns first anyway. */
function findCheapestEraSkill(state: GameState): UpgradeId | null {
  const candidates = getAvailableSkillIds(state).filter((upgradeId) => UPGRADES_BY_ID[upgradeId].eraId === state.eraId && !isFrameworkSkill(upgradeId));
  const [cheapest] = [...candidates].sort((first, second) => UPGRADES_BY_ID[first].cost - UPGRADES_BY_ID[second].cost);
  return cheapest ?? null;
}

function learnCheapestSkill(state: GameState): GameState {
  const skill = findCheapestEraSkill(state);
  return skill === null ? state : { ...state, purchasedUpgradeIds: [...state.purchasedUpgradeIds, skill] };
}

/** Known tags: one skill a level, each the cheapest left, so a level-2 perk knows the two an era opens with. */
function learnKnownTags(state: GameState): GameState {
  return Array.from({ length: state.legacyPerkLevels['known-tags'] }).reduce<GameState>(learnCheapestSkill, state);
}

/** Early warning: every hazard's countdown starts this era a little further away. */
function delayFirstTrouble(state: GameState): GameState {
  const delayMs = state.legacyPerkLevels['early-warning'] * EARLY_WARNING_MS;
  const delayed = Object.fromEntries(Object.entries(state.hazardCountdownsMs).map(([kind, remainingMs]) => [kind, remainingMs + delayMs])) as Record<HazardKind, number>;
  return { ...state, hazardCountdownsMs: delayed };
}

export function applyEraStartPerks(state: GameState): GameState {
  return delayFirstTrouble(learnKnownTags(state));
}
