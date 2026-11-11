export type EraId = 'homepage-1997' | 'web2-2005' | 'social-2011';

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
  | 'map-mashup'
  | 'share-buttons'
  | 'video-player'
  | 'activity-feed'
  | 'one-pager'
  | 'social-login';

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
  | 'cdn'
  | 'page-cache'
  | 'j2ee'
  | 'rails'
  | 'learn-php'
  | 'syntax-highlighting'
  | 'perpetual-beta'
  | 'contextual-text-ads'
  | 'permalinks'
  | 'ajax-everything'
  | 'threaded-replies'
  | 'folksonomy'
  | 'responsive-design'
  | 'learn-bootstrap'
  | 'html5-media'
  | 'social-plugins'
  | 'learn-nodejs'
  | 'learn-bcrypt'
  | 'learn-masonry'
  | 'parallax-scrolling'
  | 'retina-images'
  | 'app-banner'
  | 'learn-rest-apis'
  | 'learn-sass'
  | 'mongodb'
  | 'git-push-deploys'
  | 'autoscaling';

/** Skills are what the developer learns: they unlock features and change the page. Boosts are multipliers. */
export type UpgradeKind = 'skill' | 'boost';

export type DefenseId = 'antivirus' | 'premium-ad-network' | 'captcha' | 'ddos-protection';
export type HazardKind = 'popup' | 'virus' | 'spam' | 'sql-injection' | 'traffic-spike' | 'password-leak' | 'ddos';
export type InfectionKind = 'virus' | 'spam' | 'sql-injection' | 'password-leak' | 'ddos';
/** 2005: the named 2001–2009 steps, then extra racks one at a time. 2011: cloud instances, one at a time. */
export type HostingTierId =
  | 'shared-hosting'
  | 'business-hosting'
  | 'vps'
  | 'dedicated-server'
  | 'database-server'
  | 'load-balancer'
  | 'database-replicas'
  | 'colocation'
  | 'sharded-database'
  | 'second-data-center'
  | `extra-racks-${number}`
  | `cloud-${number}`;
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
  /**
   * Built on a browser plugin that dies in a later era (Flash). From that era on the feature shows a
   * "missing plugin" box and brings nothing, until you rebuild it with the skill named here.
   */
  readonly pluginDiesIn: { readonly eraId: EraId; readonly rebuiltWith: UpgradeId } | null;
  /**
   * The era in which this goes out of fashion. At that relaunch it is retired: it leaves the page and the shop,
   * brings no visitors and adds no page weight. Keeps pages from filling up with dead web trends.
   */
  readonly sunsetIn: EraId | null;
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
  | { readonly kind: 'load-time-multiplier'; readonly factor: number }
  /** Share of each visit that still reaches your server; caches and CDNs answer the rest. */
  | { readonly kind: 'server-load-multiplier'; readonly factor: number }
  /** Traffic spikes are served from a static copy and put no load on the server. */
  | { readonly kind: 'traffic-spike-cache' }
  /** The page fits on phones, so phone visitors stop bouncing. */
  | { readonly kind: 'mobile-friendly' };

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly kind: UpgradeKind;
  /** Kilobytes this adds to every page load: background images, script files, glossy PNGs. */
  readonly pageWeightKb: number;
  readonly eraId: EraId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly effects: readonly UpgradeEffect[];
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
  /** The one feature whose visitors pay trafficFactor, or null when every visitor does. */
  readonly penalizedFeatureId: FeatureId | null;
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
  /** Share of visitors on phones. Until your page fits on a phone, most of them leave. */
  readonly mobileShare: number;
}

export interface HostingTierDefinition {
  readonly id: HostingTierId;
  readonly eraId: EraId;
  /** When this setup became the usual next step for a growing site. */
  readonly year: number;
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

/** The games that fix infections. Which kind each one fixes is in INFECTION_MINIGAMES. */
export type MinigameId = 'snake' | 'virus-scan' | 'firewall' | 'spam-sort' | 'backup-restore' | 'reset-passwords' | 'close-gates' | 'cross-traffic';

/** Something broke a feature: it brings in nothing until you win its minigame. */
export interface Infection {
  readonly id: number;
  readonly kind: InfectionKind;
  readonly featureId: FeatureId;
  /** Grows only while the player is watching, so offline time never makes an infection harder. */
  readonly ageMs: number;
  /** Rolled when the infection appears, so closing and reopening it gives the same game. */
  readonly minigameId: MinigameId;
}

export interface GameState {
  readonly saveVersion: number;
  readonly eraId: EraId;
  readonly money: number;
  readonly lifetimeEarnings: number;
  readonly lifetimeVisitors: number;
  readonly keystrokes: number;
  readonly hasPendingBug: boolean;
  readonly featureLevels: Readonly<Record<FeatureId, number>>;
  /**
   * What each feature has earned so far: visitor revenue, split by the visitors each one brings in.
   * When a feature retires, the relaunch pays back a share of it.
   */
  readonly featureEarnings: Readonly<Record<FeatureId, number>>;
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
  /** Fixing an infection quickly earns a short traffic bonus. */
  readonly quickFixBonusRemainingMs: number;
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
