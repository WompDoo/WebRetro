export type EraId = 'homepage-1997' | 'web2-2005';

export type FeatureId =
  | 'hit-counter'
  | 'under-construction'
  | 'guestbook'
  | 'midi-player'
  | 'webring'
  | 'blog'
  | 'comments'
  | 'tag-cloud';

export type UpgradeId =
  | 'img-tag'
  | 'font-tags'
  | 'body-background'
  | 'hyperlinks'
  | 'marquee-blink'
  | 'cgi-forms'
  | 'table-layouts'
  | 'embed-tag'
  | 'learn-ajax'
  | 'learn-rss'
  | 'counter-starts-at-ten-thousand'
  | 'html-validator'
  | 'animated-gif-pack'
  | 'view-source'
  | 'banner-exchange'
  | 'web-directories'
  | 'guestbook-smileys'
  | 'bigger-monitor'
  | 'learn-javascript'
  | 'meta-keywords'
  | 'animated-banners'
  | 'more-midi-files'
  | 'bigger-webring'
  | 'learn-php'
  | 'syntax-highlighting'
  | 'perpetual-beta'
  | 'contextual-text-ads'
  | 'permalinks'
  | 'ajax-everything'
  | 'threaded-replies'
  | 'folksonomy';

/** Skills are what the developer learns: they unlock features and change the page. Boosts are multipliers. */
export type UpgradeKind = 'skill' | 'boost';

export type DefenseId = 'antivirus' | 'premium-ad-network' | 'captcha';
export type HazardKind = 'popup' | 'virus' | 'spam';
export type InfectionKind = Exclude<HazardKind, 'popup'>;
export type DefenseCounterMode = 'prevents-spawn' | 'auto-cleans';
export type CodeInputOutcome = 'clean-line' | 'bugged-line' | 'fixed-bug';
export type SimulationMode = 'live' | 'offline';
export type GameEventKind = 'hazard' | 'defense' | 'milestone' | 'cleanup';
export type MilestoneId = 'first-visitor' | 'first-revenue' | 'quit-day-job';
export type GateRequirementKind =
  | 'era-features-built'
  | 'feature-level'
  | 'visitors-per-second'
  | 'migration-budget';

export interface FeatureSynergy {
  readonly sourceFeatureId: FeatureId;
  readonly bonusPerSourceLevel: number;
}

export interface FeatureDefinition {
  readonly id: FeatureId;
  readonly eraId: EraId;
  readonly name: string;
  readonly laterEraNames: Readonly<Partial<Record<EraId, string>>>;
  readonly description: string;
  readonly baseCost: number;
  readonly visitorsPerSecondPerLevel: number;
  readonly synergy: FeatureSynergy | null;
  /** The skill you must learn before you can build this. */
  readonly requiredSkillId: UpgradeId | null;
}

export type UpgradeEffect =
  | { readonly kind: 'keystroke-value-multiplier'; readonly factor: number }
  | { readonly kind: 'keystroke-revenue-share'; readonly share: number }
  | { readonly kind: 'bug-chance-reduction'; readonly amount: number }
  | {
      readonly kind: 'feature-traffic-multiplier';
      readonly featureId: FeatureId;
      readonly factor: number;
    }
  | { readonly kind: 'global-traffic-multiplier'; readonly factor: number }
  | { readonly kind: 'ad-value-multiplier'; readonly factor: number }
  | { readonly kind: 'ad-annoyance-multiplier'; readonly factor: number };

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly kind: UpgradeKind;
  readonly eraId: EraId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly effect: UpgradeEffect;
  readonly requiredFeatureId: FeatureId | null;
}

export interface DefenseDefinition {
  readonly id: DefenseId;
  readonly eraId: EraId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly countersHazard: HazardKind;
  readonly counterMode: DefenseCounterMode;
  readonly autoCleanDelayMs: number;
  readonly trafficFactor: number;
  readonly adValueFactor: number;
  readonly revenueUpkeepShare: number;
}

export interface EraGateRequirement {
  readonly kind: GateRequirementKind;
  readonly label: string;
  readonly target: number;
  readonly featureId: FeatureId | null;
}

export interface EraDefinition {
  readonly id: EraId;
  readonly year: number;
  readonly name: string;
  readonly nextEraId: EraId | null;
  readonly nextEraName: string;
  readonly nextEraYear: number;
  readonly migrationLabel: string;
  readonly migrationCost: number;
  readonly gateRequirements: readonly EraGateRequirement[];
  readonly adLabel: string;
  /** The skill needed before you can place ads in this era (banners are just images). */
  readonly adSkillId: UpgradeId | null;
  readonly adValuePerVisitor: number;
  readonly adAnnoyancePerAd: number;
  readonly maxAds: number;
  readonly keystrokeValueMultiplier: number;
}

export interface Popup {
  readonly id: number;
  readonly variantRoll: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

interface InfectionBase {
  readonly id: number;
  readonly featureId: FeatureId;
  /** Grows only while the player is watching, so offline time never makes a virus harder. */
  readonly ageMs: number;
}

/** Removed by winning the snake minigame. Needs more food the longer it stays. */
export interface VirusInfection extends InfectionBase {
  readonly kind: 'virus';
}

/** Removed by clicking it a few times. */
export interface SpamInfection extends InfectionBase {
  readonly kind: 'spam';
  readonly cleanClicksRemaining: number;
}

export type Infection = VirusInfection | SpamInfection;

export interface GameState {
  readonly saveVersion: number;
  readonly eraId: EraId;
  readonly money: number;
  readonly lifetimeEarnings: number;
  readonly lifetimeVisitors: number;
  readonly keystrokes: number;
  readonly hasPendingBug: boolean;
  readonly featureLevels: Readonly<Record<FeatureId, number>>;
  readonly adCount: number;
  readonly purchasedUpgradeIds: readonly UpgradeId[];
  readonly ownedDefenseIds: readonly DefenseId[];
  readonly enabledDefenseIds: readonly DefenseId[];
  readonly popups: readonly Popup[];
  readonly infections: readonly Infection[];
  readonly hazardCountdownsMs: Readonly<Record<HazardKind, number>>;
  readonly nextEntityId: number;
  readonly randomSeed: number;
  readonly playTimeMs: number;
  readonly reachedMilestoneIds: readonly MilestoneId[];
  readonly prototypeComplete: boolean;
}

export interface GameEvent {
  readonly kind: GameEventKind;
  readonly message: string;
}

export interface GameStep {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export interface CodeInputResult {
  readonly state: GameState;
  readonly outcome: CodeInputOutcome;
  readonly earned: number;
}

export interface EconomySnapshot {
  readonly visitorsPerSecond: number;
  readonly revenuePerVisitor: number;
  readonly adValuePerAd: number;
  readonly adAnnoyancePerAd: number;
  readonly adTrafficFactor: number;
  readonly popupTrafficFactor: number;
  readonly upkeepShare: number;
  readonly netRevenuePerSecond: number;
  readonly keystrokeValue: number;
  readonly bugChance: number;
}

export interface GateCheck {
  readonly requirement: EraGateRequirement;
  readonly current: number;
  readonly isMet: boolean;
}
