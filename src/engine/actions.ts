import { POPUP_SCAM_MONEY_SHARE, QUICK_FIX_BONUS_MS, QUICK_FIX_TRAFFIC_FACTOR } from './constants';
import { formatPercent } from './format';
import { DEFENSES_BY_ID } from './content/defenses';
import { ERAS_BY_ID } from './content/eras';
import { FEATURES_BY_ID, getFeatureDisplayName } from './content/features';
import {
  calculateBugChance,
  calculateKeystrokeValue,
  calculateNextAdCost,
  calculateFeatureLevelsCost,
  calculateNextFeatureCost,
  calculateNetRevenuePerSecond,
  calculateQuickFixWindowMs,
  calculateUpgradeCost,
  canUseAds,
  getNextHostingTier,
  isCertificateRenewedAutomatically,
  isEraUnlocked,
  isFeatureBuildable,
  calculateRetirementPayout,
  isFeatureRetired,
  isUpgradeAvailable,
} from './economy';
import { isEraGateComplete } from './era-gate';
import { findInfection } from './hazards';
import { drawRandoms } from './random';
import type {
  CodeInputResult,
  ConsentBanner,
  DefenseId,
  EraId,
  FeatureId,
  GameEvent,
  GameState,
  GameStep,
  Infection,
  MinigameId,
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

export function canBuyFeatureLevels(state: GameState, featureId: FeatureId, count: number): boolean {
  return isFeatureBuildable(state, featureId) && state.money >= calculateFeatureLevelsCost(state, featureId, count);
}

/** Multi-buy (5×, 10×): all the levels or none, so the button never buys fewer than it says. */
export function buyFeatureLevels(state: GameState, featureId: FeatureId, count: number): GameState {
  if (!canBuyFeatureLevels(state, featureId, count)) return state;
  return Array.from({ length: count }).reduce<GameState>((current) => buyFeature(current, featureId), state);
}

export function canUpgradeHosting(state: GameState): boolean {
  const next = getNextHostingTier(state);
  return next !== null && state.money >= next.cost;
}

export function upgradeHosting(state: GameState): GameState {
  const next = getNextHostingTier(state);
  if (next === null || state.money < next.cost) return state;
  return { ...spend(state, next.cost), hostingTier: state.hostingTier + 1 };
}

/** Switch a trade-off feature off or back on. It keeps its levels either way. */
export function toggleFeature(state: GameState, featureId: FeatureId): GameState {
  const canSwitch = FEATURES_BY_ID[featureId].isSwitchable && state.featureLevels[featureId] > 0;
  if (!canSwitch) return state;
  const isOff = state.switchedOffFeatureIds.includes(featureId);
  return {
    ...state,
    switchedOffFeatureIds: isOff
      ? state.switchedOffFeatureIds.filter((id) => id !== featureId)
      : [...state.switchedOffFeatureIds, featureId],
  };
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
  return isUpgradeAvailable(state, upgradeId) && state.money >= calculateUpgradeCost(state, upgradeId);
}

export function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  if (!canBuyUpgrade(state, upgradeId)) return state;
  const purchased = [...state.purchasedUpgradeIds, upgradeId];
  const bought = { ...spend(state, calculateUpgradeCost(state, upgradeId)), purchasedUpgradeIds: purchased };
  // Automating renewal issues a fresh certificate right away: an expired one doesn't wait for a manual renewal.
  return { ...bought, isCertificateExpired: bought.isCertificateExpired && !isCertificateRenewedAutomatically(bought) };
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

/** The cookie banner can be changed any time once the GDPR applies, for free: it's a choice, not a purchase. */
export function chooseConsentBanner(state: GameState, banner: ConsentBanner): GameState {
  if (!isEraUnlocked(state, 'platform-2018')) return state;
  // A new banner asks again; picking the one you have changes nothing.
  return { ...state, consentBanner: banner, isCookieBannerDismissed: state.isCookieBannerDismissed && state.consentBanner === banner };
}

/** Accept or reject, the banner goes away: on your own site you only need to answer it once. */
export function dismissCookieBanner(state: GameState): GameState {
  return { ...state, isCookieBannerDismissed: true };
}

/** Renewing by hand: a fee, and the fax. Ten seconds of what visitors bring in. */
const CERTIFICATE_RENEWAL_REVENUE_SECONDS = 10;

/** Rounded up to two significant figures, so the price on the button holds still while revenue wobbles. */
const FEE_SIGNIFICANT_FIGURES = 2;
const DECIMAL_BASE = 10;
const MIN_FEE = 1;

function roundUpToSignificantFigures(amount: number): number {
  const atLeastMin = Math.max(amount, MIN_FEE);
  const scale = DECIMAL_BASE ** Math.max(0, Math.floor(Math.log10(atLeastMin)) - (FEE_SIGNIFICANT_FIGURES - 1));
  return Math.ceil(atLeastMin / scale) * scale;
}

export function calculateCertificateRenewalFee(state: GameState): number {
  return roundUpToSignificantFigures(calculateNetRevenuePerSecond(state) * CERTIFICATE_RENEWAL_REVENUE_SECONDS);
}

export function canRenewCertificate(state: GameState): boolean {
  return state.isCertificateExpired && state.money >= calculateCertificateRenewalFee(state);
}

export function renewCertificate(state: GameState): GameState {
  if (!canRenewCertificate(state)) return state;
  return { ...spend(state, calculateCertificateRenewalFee(state)), isCertificateExpired: false };
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

const CLEANUP_MESSAGES: Readonly<Record<MinigameId, (featureName: string) => string>> = {
  snake: (featureName) => `Your snake ate the virus in your ${featureName}.`,
  'virus-scan': (featureName) => `Your scan zapped the virus in your ${featureName}.`,
  firewall: (featureName) => `Your firewall smashed the virus out of your ${featureName}.`,
  'spam-sort': (featureName) => `You sorted the spam out of your ${featureName}.`,
  'backup-restore': (featureName) => `You restored your ${featureName} from the right backup.`,
  'reset-passwords': (featureName) => `Every leaked ${featureName} password is reset. The crackers gave up.`,
  'reroute-traffic': (featureName) => `You rerouted the flood through the scrubbing centre. Your ${featureName} is back.`,
  'cross-traffic': (featureName) => `You got through the flood and switched on rate limiting. Your ${featureName} is back.`,
  'fix-build': (featureName) => `The build is green again. Your ${featureName} is back.`,
};

function describeCleanup(infection: Infection, eraId: EraId): GameEvent {
  const featureName = getFeatureDisplayName(infection.featureId, eraId).toLowerCase();
  return { kind: 'cleanup', message: CLEANUP_MESSAGES[infection.minigameId](featureName) };
}

export function isQuickFix(state: GameState, infection: Infection): boolean {
  return infection.ageMs <= calculateQuickFixWindowMs(state);
}

function withQuickFixBonus(state: GameState, infection: Infection): GameStep {
  if (!isQuickFix(state, infection)) return { state, events: [] };
  return {
    state: { ...state, quickFixBonusRemainingMs: QUICK_FIX_BONUS_MS },
    events: [{ kind: 'cleanup', message: `Quick fix! Visitors noticed: +${formatPercent(QUICK_FIX_TRAFFIC_FACTOR - 1)} traffic for a minute.` }],
  };
}

/** Called when the player wins this infection's minigame. A quick win also earns a short traffic bonus. */
export function cleanInfection(state: GameState, infectionId: number): GameStep {
  const infection = findInfection(state, infectionId);
  if (infection === null) return { state, events: [] };
  const cleaned = { ...state, infections: state.infections.filter((candidate) => candidate.id !== infectionId) };
  const bonus = withQuickFixBonus(cleaned, infection);
  return { state: bonus.state, events: [describeCleanup(infection, state.eraId), ...bonus.events] };
}

/**
 * A relaunch: the new era's world, and the bottom of its hosting ladder. Skills and features come along,
 * except the features that went out of fashion: those retire, and so does anything wrong with them.
 */
function enterEra(state: GameState, eraId: EraId): GameState {
  const entered: GameState = { ...state, eraId, hasPendingBug: false, popups: [], hostingTier: 0 };
  return {
    ...entered,
    infections: entered.infections.filter((infection) => !isFeatureRetired(entered, infection.featureId)),
    switchedOffFeatureIds: entered.switchedOffFeatureIds.filter((featureId) => !isFeatureRetired(entered, featureId)),
  };
}

/** The relaunch pays for itself, and pays back a share of what the retiring features earned. */
function relaunch(state: GameState, migrationCost: number, nextEraId: EraId): GameState {
  const payout = calculateRetirementPayout(state, nextEraId);
  return earn(enterEra(spend(state, migrationCost), nextEraId), payout);
}

/** Moving to the next era is always the player's choice. It never happens on its own, even offline. */
export function advanceEra(state: GameState): GameState {
  if (!isEraGateComplete(state)) return state;
  const era = ERAS_BY_ID[state.eraId];
  return era.nextEraId === null ? { ...state, prototypeComplete: true } : relaunch(state, era.migrationCost, era.nextEraId);
}
