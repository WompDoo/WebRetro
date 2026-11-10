import { POPUP_SCAM_MONEY_SHARE } from './constants';
import { DEFENSES_BY_ID } from './content/defenses';
import { ERAS_BY_ID } from './content/eras';
import { getFeatureDisplayName } from './content/features';
import { UPGRADES_BY_ID } from './content/upgrades';
import {
  calculateBugChance,
  calculateKeystrokeValue,
  calculateNextAdCost,
  calculateNextFeatureCost,
  canUseAds,
  isEraUnlocked,
  isFeatureBuildable,
  isUpgradeAvailable,
} from './economy';
import { isEraGateComplete } from './era-gate';
import { findVirus } from './hazards';
import { drawRandoms } from './random';
import type {
  CodeInputResult,
  DefenseId,
  EraId,
  FeatureId,
  GameEvent,
  GameState,
  GameStep,
  Infection,
  UpgradeId,
} from './types';

const SINGLE_ROLL = 1;
const NOTHING_EARNED = 0;

function earn(state: GameState, amount: number): GameState {
  return { ...state, money: state.money + amount, lifetimeEarnings: state.lifetimeEarnings + amount };
}

function spend(state: GameState, amount: number): GameState {
  return { ...state, money: state.money - amount };
}

function rewriteBuggedLine(state: GameState): CodeInputResult {
  const earned = calculateKeystrokeValue(state);
  const written = { ...earn(state, earned), hasPendingBug: false, keystrokes: state.keystrokes + 1 };
  return { state: written, outcome: 'fixed-bug', earned };
}

function writeFreshLine(state: GameState): CodeInputResult {
  const draws = drawRandoms(state.randomSeed, SINGLE_ROLL);
  const isBug = (draws.values[0] ?? 1) < calculateBugChance(state);
  const earned = isBug ? NOTHING_EARNED : calculateKeystrokeValue(state);
  const written = {
    ...earn(state, earned),
    hasPendingBug: isBug,
    keystrokes: state.keystrokes + 1,
    randomSeed: draws.nextSeed,
  };
  return { state: written, outcome: isBug ? 'bugged-line' : 'clean-line', earned };
}

/** One keystroke or click in the editor. A typo earns nothing; the next keystroke rewrites it and earns. */
export function writeCode(state: GameState): CodeInputResult {
  return state.hasPendingBug ? rewriteBuggedLine(state) : writeFreshLine(state);
}

export function canBuyFeature(state: GameState, featureId: FeatureId): boolean {
  return isFeatureBuildable(state, featureId) && state.money >= calculateNextFeatureCost(state, featureId);
}

export function buyFeature(state: GameState, featureId: FeatureId): GameState {
  if (!canBuyFeature(state, featureId)) return state;
  const levels = { ...state.featureLevels, [featureId]: state.featureLevels[featureId] + 1 };
  return { ...spend(state, calculateNextFeatureCost(state, featureId)), featureLevels: levels };
}

export function canPlaceAd(state: GameState): boolean {
  return canUseAds(state) && state.adCount < ERAS_BY_ID[state.eraId].maxAds && state.money >= calculateNextAdCost(state);
}

export function placeAd(state: GameState): GameState {
  if (!canPlaceAd(state)) return state;
  return { ...spend(state, calculateNextAdCost(state)), adCount: state.adCount + 1 };
}

export function removeAd(state: GameState): GameState {
  return state.adCount > 0 ? { ...state, adCount: state.adCount - 1 } : state;
}

export function canBuyUpgrade(state: GameState, upgradeId: UpgradeId): boolean {
  return isUpgradeAvailable(state, upgradeId) && state.money >= UPGRADES_BY_ID[upgradeId].cost;
}

export function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  if (!canBuyUpgrade(state, upgradeId)) return state;
  const purchased = [...state.purchasedUpgradeIds, upgradeId];
  return { ...spend(state, UPGRADES_BY_ID[upgradeId].cost), purchasedUpgradeIds: purchased };
}

export function canBuyDefense(state: GameState, defenseId: DefenseId): boolean {
  const definition = DEFENSES_BY_ID[defenseId];
  return (
    !state.ownedDefenseIds.includes(defenseId) &&
    isEraUnlocked(state, definition.eraId) &&
    state.money >= definition.cost
  );
}

export function buyDefense(state: GameState, defenseId: DefenseId): GameState {
  if (!canBuyDefense(state, defenseId)) return state;
  return {
    ...spend(state, DEFENSES_BY_ID[defenseId].cost),
    ownedDefenseIds: [...state.ownedDefenseIds, defenseId],
    enabledDefenseIds: [...state.enabledDefenseIds, defenseId],
  };
}

function withoutDefense(state: GameState, defenseId: DefenseId): GameState {
  return { ...state, enabledDefenseIds: state.enabledDefenseIds.filter((id) => id !== defenseId) };
}

function withDefense(state: GameState, defenseId: DefenseId): GameState {
  return { ...state, enabledDefenseIds: [...state.enabledDefenseIds, defenseId] };
}

export function toggleDefense(state: GameState, defenseId: DefenseId): GameState {
  if (!state.ownedDefenseIds.includes(defenseId)) return state;
  return state.enabledDefenseIds.includes(defenseId) ? withoutDefense(state, defenseId) : withDefense(state, defenseId);
}

export function closePopup(state: GameState, popupId: number): GameState {
  return { ...state, popups: state.popups.filter((popup) => popup.id !== popupId) };
}

export interface PopupScamResult {
  readonly state: GameState;
  readonly moneyLost: number;
}

/** The player clicked the tempting button instead of closing the pop-up. */
export function fallForPopupScam(state: GameState, popupId: number): PopupScamResult {
  if (!state.popups.some((popup) => popup.id === popupId)) return { state, moneyLost: 0 };
  const moneyLost = state.money * POPUP_SCAM_MONEY_SHARE;
  return { state: closePopup(spend(state, moneyLost), popupId), moneyLost };
}

const CLEANUP_MESSAGES: Readonly<Record<Infection['kind'], (featureName: string) => string>> = {
  virus: (featureName) => `Your snake ate the virus in your ${featureName}.`,
  spam: (featureName) => `You deleted the spam from your ${featureName}.`,
};

function describeCleanup(infection: Infection, eraId: EraId): GameEvent {
  const featureName = getFeatureDisplayName(infection.featureId, eraId).toLowerCase();
  return { kind: 'cleanup', message: CLEANUP_MESSAGES[infection.kind](featureName) };
}

function scrubIfTargetedSpam(infection: Infection, infectionId: number): Infection {
  return infection.id === infectionId && infection.kind === 'spam'
    ? { ...infection, cleanClicksRemaining: infection.cleanClicksRemaining - 1 }
    : infection;
}

function isCleanedSpam(infection: Infection): boolean {
  return infection.kind === 'spam' && infection.cleanClicksRemaining <= 0;
}

/** One click on a spam flood. Viruses ignore clicks: they need the snake minigame. */
export function scrubInfection(state: GameState, infectionId: number): GameStep {
  const scrubbed = state.infections.map((infection) => scrubIfTargetedSpam(infection, infectionId));
  return {
    state: { ...state, infections: scrubbed.filter((infection) => !isCleanedSpam(infection)) },
    events: scrubbed.filter(isCleanedSpam).map((infection) => describeCleanup(infection, state.eraId)),
  };
}

/** Called when the player wins the snake minigame for this virus. */
export function removeVirus(state: GameState, infectionId: number): GameStep {
  const virus = findVirus(state, infectionId);
  if (virus === null) return { state, events: [] };
  return {
    state: { ...state, infections: state.infections.filter((infection) => infection.id !== infectionId) },
    events: [describeCleanup(virus, state.eraId)],
  };
}

function enterEra(state: GameState, eraId: EraId): GameState {
  return { ...state, eraId, hasPendingBug: false, popups: [] };
}

/** Moving to the next era is always the player's choice. It never happens on its own, even offline. */
export function advanceEra(state: GameState): GameState {
  if (!isEraGateComplete(state)) return state;
  const era = ERAS_BY_ID[state.eraId];
  return era.nextEraId === null
    ? { ...state, prototypeComplete: true }
    : enterEra(spend(state, era.migrationCost), era.nextEraId);
}
