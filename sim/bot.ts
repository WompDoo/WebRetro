/**
 * The scripted player: what it can buy, how it scores each purchase, and how it reacts to trouble. The balance
 * sim plays it with neutral policies; the player-types sim plays the same bot as different kinds of people.
 */
import {
  buyDefense,
  buyFeature,
  buyUpgrade,
  calculateBugChance,
  calculateInfectionDifficulty,
  calculateKeystrokeValue,
  calculateNetRevenuePerSecond,
  calculateNextAdCost,
  calculateNextFeatureCost,
  calculateUpgradeCost,
  canBuyDefense,
  canBuyFeature,
  canBuyUpgrade,
  canPlaceAd,
  canUpgradeHosting,
  canUseAds,
  cleanInfection,
  closePopup,
  DEFENSES_BY_ID,
  ERAS_BY_ID,
  FEATURE_IDS,
  FEATURES_BY_ID,
  findFrameworkPickedBy,
  findFrameworkRenderedBy,
  getAvailableOpsIds,
  getAvailableSkillIds,
  getFeatureIdsOfEra,
  getNextHostingTier,
  getRevealedBoostIds,
  getUnlockedDefenseIds,
  getUnlockedFeatureIds,
  isEraUnlocked,
  isFeatureBuildable,
  isOnlySavingForMigration,
  placeAd,
  renewCertificate,
  toggleFeature,
  upgradeHosting,
  writeCode,
  type ConsentBanner,
  type FrameworkId,
  type GameState,
  type Infection,
  type UpgradeId,
} from '../src/engine';


/**
 * How a kind of player plays, beyond speed: what they never buy, what they lean towards, which problems they bother
 * to fix, and how they choose. Profiles name their policy by id: a profile crosses into a worker thread, and a
 * function can't be copied across (structured clone), so the functions stay here, looked up on each side.
 */
export interface PlayerPolicy {
  /** Purchases this player never makes: ads for a purist, a framework for a holdout. */
  readonly avoids: (option: PurchaseOption, state: GameState) => boolean;
  /** Multiplies a purchase's score; below 1 makes it more likely, above 1 less. */
  readonly bias: (option: PurchaseOption, state: GameState) => number;
  readonly closesPopups: boolean;
  readonly fixesInfections: boolean;
  readonly renewsCertificate: boolean;
  /** Best payback first (the balance bot), or whatever is cheapest right now (a player who buys everything). */
  readonly choosing: 'best-payback' | 'cheapest-first';
}

export type PolicyId = 'neutral' | 'ad-free' | 'ad-heavy' | 'ignores-trouble' | 'skips-minigames' | 'no-framework' | 'buys-everything';

const AD_HEAVY_BIAS = 0.1;
const NEUTRAL: PlayerPolicy = { avoids: () => false, bias: () => 1, closesPopups: true, fixesInfections: true, renewsCertificate: true, choosing: 'best-payback' };
const isFrameworkSkill = (option: PurchaseOption): boolean => option.label.startsWith('skill:') && findFrameworkOfSkill(option.label.slice('skill:'.length) as UpgradeId) !== null;

export const PLAYER_POLICIES: Readonly<Record<PolicyId, PlayerPolicy>> = {
  /** The balance players: changes nothing. */
  neutral: NEUTRAL,
  /** Never places an ad: lives on typing and whatever else pays. */
  'ad-free': { ...NEUTRAL, avoids: (option) => option.label === 'ad' },
  /** Fills every ad slot before anything else. */
  'ad-heavy': { ...NEUTRAL, bias: (option) => (option.label === 'ad' ? AD_HEAVY_BIAS : 1) },
  /** Never closes a pop-up, plays a minigame or renews a certificate; still buys what helps. */
  'ignores-trouble': { ...NEUTRAL, closesPopups: false, fixesInfections: false, renewsCertificate: false },
  /** Does the one-click chores, never plays a minigame: counts on defenses, the passive fix every hazard promises. */
  'skips-minigames': { ...NEUTRAL, fixesInfections: false },
  /** Sits out the framework wars: keeps the Bootstrap page through 2018 and 2024. */
  'no-framework': { ...NEUTRAL, avoids: isFrameworkSkill },
  /** Buys whatever is cheapest, useful or not. */
  'buys-everything': { ...NEUTRAL, choosing: 'cheapest-first' },
};

function findFrameworkOfSkill(upgradeId: UpgradeId): FrameworkId | null {
  return findFrameworkPickedBy(upgradeId) ?? findFrameworkRenderedBy(upgradeId);
}

export interface PlayerProfile {
  readonly name: string;
  readonly keystrokesPerSecond: number;
  readonly reactionMs: number;
  readonly buysDefenses: boolean;
  /** 2018's framework wars: the bot would always pick the best payback, so each run is told which one. */
  readonly framework: FrameworkId;
  /** 2018's cookie banner, chosen on arrival: the hurried player takes the dark pattern, the careful one asks honestly. */
  readonly consentBanner: ConsentBanner;
  readonly policy: PolicyId;
}

export interface PurchaseOption {
  readonly label: string;
  readonly cost: number;
  readonly isRequiredForGate: boolean;
  readonly apply: (state: GameState) => GameState;
  readonly canApply: (state: GameState) => boolean;
  /** What the purchase is worth: for a skill, learning it plus building the first thing it unlocks. */
  readonly valueCost: number;
  readonly valueApply: (state: GameState) => GameState;
}

export interface HazardReaction {
  readonly state: GameState;
  readonly minigameMs: number;
}

const REQUIRED_PURCHASE_PRIORITY = 0.25;

/** Rough time a player needs per difficulty level in any minigame (about 5, 10 or 15 seconds). */

const MINIGAME_MS_PER_DIFFICULTY = 5_000;

/** Only the profile's framework is on its shopping list. */
export function isOtherFramework(skillId: UpgradeId, profile: PlayerProfile): boolean {
  const framework = findFrameworkPickedBy(skillId);
  return framework !== null && framework !== profile.framework;
}

/**
 * Income without the passing hazards (infections, pop-ups, traffic spikes, the quick-fix bonus). Growth is
 * measured on this, so cleaning an infection doesn't read as a snowball.
 */
export function underlyingIncome(state: GameState, profile: PlayerProfile): number {
  return effectiveIncome({ ...state, infections: [], popups: [], trafficSpikeRemainingMs: 0, quickFixBonusRemainingMs: 0 }, profile);
}

export function effectiveIncome(state: GameState, profile: PlayerProfile): number {
  const typingIncome =
    (calculateKeystrokeValue(state) * profile.keystrokesPerSecond) / (1 + calculateBugChance(state));
  return calculateNetRevenuePerSecond(state) + typingIncome;
}

export function isGateFeature(state: GameState, featureId: string): boolean {
  const era = ERAS_BY_ID[state.eraId];
  const isEraFeature = getFeatureIdsOfEra(state.eraId).some((id) => id === featureId);
  const levelRequirement = era.gateRequirements.find((requirement) => requirement.featureId === featureId);
  const levelMissing =
    levelRequirement !== undefined &&
    state.featureLevels[levelRequirement.featureId ?? 'hit-counter'] < levelRequirement.target;
  const notBuiltYet = isEraFeature && state.featureLevels[featureId as keyof GameState['featureLevels']] === 0;
  return notBuiltYet || levelMissing;
}

export function listOptions(state: GameState, profile: PlayerProfile): readonly PurchaseOption[] {
  const features = getUnlockedFeatureIds(state)
    .filter((featureId) => isFeatureBuildable(state, featureId))
    .map<PurchaseOption>((featureId) => {
      const apply = (current: GameState): GameState => buyFeature(current, featureId);
      const cost = calculateNextFeatureCost(state, featureId);
      // A first feature earns nothing without an ad, and an ad earns nothing without visitors: value them together.
      const needsFirstAd = state.adCount === 0 && canUseAds(state);
      const adCost = needsFirstAd ? calculateNextAdCost(state) : 0;
      const valueApply = (current: GameState): GameState => {
        const built = apply(current);
        return needsFirstAd ? placeAd({ ...built, money: built.money + adCost }) : built;
      };
      return { label: `feature:${featureId}`, cost, isRequiredForGate: isGateFeature(state, featureId), apply, canApply: (current) => canBuyFeature(current, featureId), valueCost: cost + adCost, valueApply };
    });
  const skills = getAvailableSkillIds(state).filter((skillId) => !isOtherFramework(skillId, profile)).map<PurchaseOption>((skillId) => {
    const learn = (current: GameState): GameState => buyUpgrade(current, skillId);
    const unlocked = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].requiredSkillId === skillId && isEraUnlocked(state, FEATURES_BY_ID[featureId].eraId));
    const firstFeature = unlocked[0];
    const cost = calculateUpgradeCost(state, skillId);
    const featureCost = firstFeature === undefined ? 0 : calculateNextFeatureCost(state, firstFeature);
    const valueApply = (current: GameState): GameState => {
      const learned = learn(current);
      return firstFeature === undefined ? learned : buyFeature({ ...learned, money: learned.money + featureCost }, firstFeature);
    };
    const unlocksGateFeature = unlocked.some((featureId) => isGateFeature(state, featureId));
    return { label: `skill:${skillId}`, cost, isRequiredForGate: unlocksGateFeature, apply: learn, canApply: (current) => canBuyUpgrade(current, skillId), valueCost: cost + featureCost, valueApply };
  });
  const boosts = getRevealedBoostIds(state).map<PurchaseOption>((upgradeId) => {
    const apply = (current: GameState): GameState => buyUpgrade(current, upgradeId);
    const cost = calculateUpgradeCost(state, upgradeId);
    return { label: `boost:${upgradeId}`, cost, isRequiredForGate: false, apply, canApply: (current) => canBuyUpgrade(current, upgradeId), valueCost: cost, valueApply: apply };
  });
  const ops = getAvailableOpsIds(state).map<PurchaseOption>((upgradeId) => {
    const apply = (current: GameState): GameState => buyUpgrade(current, upgradeId);
    const cost = calculateUpgradeCost(state, upgradeId);
    return { label: `ops:${upgradeId}`, cost, isRequiredForGate: false, apply, canApply: (current) => canBuyUpgrade(current, upgradeId), valueCost: cost, valueApply: apply };
  });
  const adCost = calculateNextAdCost(state);
  const ads: PurchaseOption[] =
    canUseAds(state) && state.adCount < ERAS_BY_ID[state.eraId].maxAds
      ? [{ label: 'ad', cost: adCost, isRequiredForGate: false, apply: placeAd, canApply: canPlaceAd, valueCost: adCost, valueApply: placeAd }]
      : [];
  const defenses = profile.buysDefenses
    ? getUnlockedDefenseIds(state)
        .filter((defenseId) => !state.ownedDefenseIds.includes(defenseId))
        .map<PurchaseOption>((defenseId) => {
          const apply = (current: GameState): GameState => buyDefense(current, defenseId);
          const cost = DEFENSES_BY_ID[defenseId].cost;
          return { label: `defense:${defenseId}`, cost, isRequiredForGate: false, apply, canApply: (current) => canBuyDefense(current, defenseId), valueCost: cost, valueApply: apply };
        })
    : [];
  const nextTier = getNextHostingTier(state);
  const hosting: PurchaseOption[] = nextTier === null
    ? []
    : [{ label: `hosting:${nextTier.id}`, cost: nextTier.cost, isRequiredForGate: false, apply: upgradeHosting, canApply: canUpgradeHosting, valueCost: nextTier.cost, valueApply: upgradeHosting }];
  const switches = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].isSwitchable && state.featureLevels[featureId] > 0).map<PurchaseOption>((featureId) => {
    const apply = (current: GameState): GameState => toggleFeature(current, featureId);
    return { label: `switch:${featureId}`, cost: 0, isRequiredForGate: false, apply, canApply: () => true, valueCost: 0, valueApply: apply };
  });
  return [...features, ...skills, ...boosts, ...ops, ...ads, ...defenses, ...hosting, ...switches].filter((option) => !PLAYER_POLICIES[profile.policy].avoids(option, state));
}

export function scoreOption(state: GameState, option: PurchaseOption, profile: PlayerProfile): number {
  const income = effectiveIncome(state, profile);
  const gain = effectiveIncome(option.valueApply({ ...state, money: option.valueCost }), profile) - income;
  const waitSeconds = Math.max(0, option.cost - state.money) / Math.max(income, Number.EPSILON);
  // Like a human reading the checklist, the bot buys what the gate requires even when it adds no income.
  const paybackSeconds = gain > 0 ? option.valueCost / gain : option.isRequiredForGate ? 0 : Number.POSITIVE_INFINITY;
  // A free switch is worth flipping only when it actually helps.
  if (option.cost === 0) return gain > 0 ? 0 : Number.POSITIVE_INFINITY;
  const priority = option.isRequiredForGate ? REQUIRED_PURCHASE_PRIORITY : 1;
  const defenseBonus = option.label.startsWith('defense:') ? REQUIRED_PURCHASE_PRIORITY : 1;
  return (waitSeconds + paybackSeconds) * priority * defenseBonus * PLAYER_POLICIES[profile.policy].bias(option, state);
}

export function improvesTimeToBudget(state: GameState, option: PurchaseOption, profile: PlayerProfile): boolean {
  const budget = ERAS_BY_ID[state.eraId].migrationCost;
  const income = effectiveIncome(state, profile);
  const after = option.apply(state);
  const remaining = budget - state.money;
  return (remaining + option.cost) / effectiveIncome(after, profile) < remaining / income;
}

function decideByPayback(state: GameState, profile: PlayerProfile): GameState {
  const savingOnly = isOnlySavingForMigration(state);
  const options = listOptions(state, profile).filter(
    (option) => !savingOnly || (option.canApply(state) && improvesTimeToBudget(state, option, profile)),
  );
  const ranked = [...options].sort((a, b) => scoreOption(state, a, profile) - scoreOption(state, b, profile));
  const best = ranked[0];
  if (best === undefined) return state;
  if (best.canApply(state)) return best.apply(state);
  // Saving up for the best option: meanwhile buy anything that pays for itself before that is affordable.
  const waitSeconds = Math.max(0, best.cost - state.money) / Math.max(effectiveIncome(state, profile), Number.EPSILON);
  const filler = ranked.find((option) => option.canApply(state) && option.cost > 0 && scoreOption(state, option, profile) < waitSeconds);
  return filler === undefined ? state : filler.apply(state);
}

/** Whatever is cheapest and affordable, useful or not. Feature switches are left alone: they're not purchases. */
function decideCheapestFirst(state: GameState, profile: PlayerProfile): GameState {
  const affordable = listOptions(state, profile).filter((option) => !option.label.startsWith('switch:') && option.canApply(state));
  const [cheapest] = [...affordable].sort((first, second) => first.cost - second.cost);
  return cheapest === undefined ? state : cheapest.apply(state);
}

/** Once only the savings are left on the checklist, everyone saves: the shopaholic reads it too. */
export function decide(state: GameState, profile: PlayerProfile): GameState {
  const isShopping = PLAYER_POLICIES[profile.policy].choosing === 'cheapest-first' && !isOnlySavingForMigration(state);
  return isShopping ? decideCheapestFirst(state, profile) : decideByPayback(state, profile);
}

export function minigameDurationMs(infection: Infection): number {
  return calculateInfectionDifficulty(infection) * MINIGAME_MS_PER_DIFFICULTY;
}

/** Closes pop-ups after the reaction time, and plays each infection's minigame once noticed. */
export function reactToHazards(state: GameState, seenAt: Map<number, number>, now: number, profile: PlayerProfile): HazardReaction {
  const ids = [...state.popups.map((popup) => popup.id), ...state.infections.map((infection) => infection.id)];
  ids.forEach((id) => (seenAt.has(id) ? undefined : seenAt.set(id, now)));
  const waitedMs = (id: number): number => now - (seenAt.get(id) ?? now);
  const policy = PLAYER_POLICIES[profile.policy];
  const closing = policy.closesPopups ? state.popups : [];
  const withoutPopups = closing.filter((popup) => waitedMs(popup.id) >= profile.reactionMs).reduce((current, popup) => closePopup(current, popup.id), state);
  const fixing = policy.fixesInfections ? withoutPopups.infections : [];
  const finished = fixing.filter((infection) => waitedMs(infection.id) >= profile.reactionMs + minigameDurationMs(infection));
  return {
    state: finished.reduce<GameState>((current, infection) => cleanInfection(current, infection.id).state, withoutPopups),
    minigameMs: finished.reduce((total, infection) => total + minigameDurationMs(infection), 0),
  };
}

/** The expired certificate's id in seenAt: hazards count up from 1. */
const CERTIFICATE_SEEN_ID = -1;

/** Renews an expired certificate once the player has noticed it, like closing a pop-up. */
export function renewWhenNoticed(state: GameState, seenAt: Map<number, number>, now: number, profile: PlayerProfile): GameState {
  if (!state.isCertificateExpired) {
    seenAt.delete(CERTIFICATE_SEEN_ID);
    return state;
  }
  const noticedAt = seenAt.get(CERTIFICATE_SEEN_ID) ?? now;
  seenAt.set(CERTIFICATE_SEEN_ID, noticedAt);
  return now - noticedAt >= profile.reactionMs && PLAYER_POLICIES[profile.policy].renewsCertificate ? renewCertificate(state) : state;
}

export function typeKeystrokes(state: GameState, count: number): GameState {
  return Array.from({ length: count }).reduce<GameState>((current) => writeCode(current).state, state);
}
