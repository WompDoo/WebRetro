export type EraId = 'homepage-1997' | 'web2-2005';

export type FeatureId =
  | 'hit-counter'
  | 'under-construction'
  | 'guestbook'
  | 'midi-player'
  | 'webring'
  | 'blog'
  | 'comments'
  | 'tag-cloud'
  | 'forum'
  | 'flash-intro'
  | 'photo-gallery'
  | 'map-mashup';

export type UpgradeId =
  | 'img-tag'
  | 'font-tags'
  | 'body-background'
  | 'hyperlinks'
  | 'marquee-blink'
  | 'cgi-forms'
  | 'table-layouts'
  | 'embed-tag'
  | 'learn-css'
  | 'web2-design'
  | 'learn-flash'
  | 'learn-url-rewriting'
  | 'learn-jquery'
  | 'learn-web-apis'
  | 'prepared-statements'
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
  | 'optimize-gifs'
  | 'ie6-hacks'
  | 'xhtml-badges'
  | 'glitter-text'
  | 'drop-vowels'
  | 'svn'
  | 'gzip'
  | 'memcached'
  | 'j2ee'
  | 'rails'
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
export type HazardKind = 'popup' | 'virus' | 'spam' | 'sql-injection' | 'traffic-spike';
export type InfectionKind = 'virus' | 'spam' | 'sql-injection';
export type HostingTierId = 'shared-hosting' | 'vps' | 'dedicated-server' | 'the-cloud';
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
  /** Kilobytes this feature adds to the page once built, plus a little per level. */
  readonly pageWeightKb: number;
  readonly pageWeightKbPerLevel: number;
  /** The skill you must learn before you can build this. */
  readonly requiredSkillId: UpgradeId | null;
  /** Trade-off features you can switch off again (the Flash intro). Off: no visitors, no page weight. */
  readonly isSwitchable: boolean;
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
  | { readonly kind: 'ad-annoyance-multiplier'; readonly factor: number }
  | { readonly kind: 'page-weight-multiplier'; readonly factor: number }
  | { readonly kind: 'load-time-multiplier'; readonly factor: number };

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly kind: UpgradeKind;
  /** Kilobytes this adds to every page load: background images, script files, glossy PNGs. */
  readonly pageWeightKb: number;
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
  /** What visitors browse with. The page weight divided by this is the load time. */
  readonly connectionLabel: string;
  readonly connectionKbPerSecond: number;
  /** How long visitors wait before leaving. Shrinks every era. */
  readonly patienceSeconds: number;
  readonly basePageWeightKb: number;
  readonly adPageWeightKb: number;
  /** From 2005 on you pay for hosting, and the server can be overloaded. */
  readonly hasServerLoad: boolean;
}

export interface HostingTierDefinition {
  readonly id: HostingTierId;
  readonly eraId: EraId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly capacityVisitorsPerSecond: number;
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

/** Spam floods and SQL injections: removed by clicking them a few times. */
export interface ClickInfection extends InfectionBase {
  readonly kind: 'spam' | 'sql-injection';
  readonly cleanClicksRemaining: number;
}

export type Infection = VirusInfection | ClickInfection;

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
  /** Built features the player has switched off. They keep their levels. */
  readonly switchedOffFeatureIds: readonly FeatureId[];
  readonly ownedDefenseIds: readonly DefenseId[];
  readonly enabledDefenseIds: readonly DefenseId[];
  readonly popups: readonly Popup[];
  readonly infections: readonly Infection[];
  readonly hazardCountdownsMs: Readonly<Record<HazardKind, number>>;
  readonly nextEntityId: number;
  readonly randomSeed: number;
  readonly playTimeMs: number;
  /** Index into HOSTING_TIERS. Only matters in eras with server load. */
  readonly hostingTier: number;
  /** Time left on a front-page traffic spike; 0 when there is none. */
  readonly trafficSpikeRemainingMs: number;
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
  /** Visitors who try to reach the site, before slow loading and server trouble send some away. */
  readonly demandVisitorsPerSecond: number;
  readonly visitorsPerSecond: number;
  readonly pageWeightKb: number;
  readonly loadTimeSeconds: number;
  /** Demand divided by hosting capacity; 0 in eras without server load. */
  readonly serverLoad: number;
  readonly isSiteDown: boolean;
  readonly performanceTrafficFactor: number;
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
