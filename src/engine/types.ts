export type EraId = 'homepage-1997' | 'web2-2005' | 'social-2011' | 'platform-2018';

/** 2018's framework wars: a site picks one, and it shapes everything after. */
export type FrameworkId = 'react' | 'angular' | 'vue';

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
  | 'social-login'
  | 'stories'
  | 'pricing-table'
  | 'live-chat'
  | 'language-switcher'
  | 'newsletter';

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
  | 'autoscaling'
  | 'learn-react'
  | 'learn-angular'
  | 'learn-vue'
  | 'nextjs-ssr'
  | 'angular-universal'
  | 'nuxt-ssr'
  | 'mobile-first'
  | 'learn-payments'
  | 'learn-websockets'
  | 'learn-oauth'
  | 'code-splitting'
  | 'lazy-loading'
  | 'growth-hacking'
  | 'ci-pipeline'
  | 'own-domain'
  | 'learn-ftp'
  | 'nightly-backups'
  | 'database-indexes'
  | 'ssl-certificate'
  | 'staging-environment'
  | 'uptime-monitoring'
  | 'process-manager'
  | 'certificate-automation'
  | 'blue-green-deploys'
  | 'learn-i18n'
  | 'learn-email-marketing'
  | 'scroll-animations'
  | 'legal-pages'
  | 'retargeting-cookies';

/** Skills are what the developer learns: they unlock features and change the page. Boosts are multipliers. */
/** Skills are learned, boosts are bought, ops are how you run the site: they live in the Ops tab. */
export type UpgradeKind = 'skill' | 'boost' | 'ops';

export type DefenseId = 'antivirus' | 'premium-ad-network' | 'captcha' | 'ddos-protection' | 'no-popups';
export type HazardKind = 'popup' | 'virus' | 'spam' | 'sql-injection' | 'traffic-spike' | 'password-leak' | 'ddos' | 'broken-build' | 'privacy-fine' | 'certificate-expiry';
export type InfectionKind = 'virus' | 'spam' | 'sql-injection' | 'password-leak' | 'ddos' | 'broken-build';
/**
 * 2018's cookie banner, under the GDPR. None risks complaints and fines; an honest one asks, and many say no to
 * ad tracking; a dark pattern makes "Accept all" the easy button, and gets fined less often, but harder.
 */
export type ConsentBanner = 'none' | 'honest' | 'dark-pattern';
/** 2005: the named 2001–2009 steps, then extra racks one at a time. 2011: cloud instances. 2018: Kubernetes pods. */
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
  | `cloud-${number}`
  | `pods-${number}`;
/** A defense stops a hazard, cleans it up on its own, or makes it rarer. */
export type DefenseCounterMode = 'prevents-spawn' | 'auto-cleans' | 'slows-spawn';
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
  | { readonly kind: 'mobile-friendly' }
  /**
   * A single-page app: the browser gets an empty page and builds it with JavaScript. Until the server renders
   * it too, the page is blank while the bundle loads and runs, and search engines index the blank page.
   */
  | { readonly kind: 'client-side-rendering' }
  /** The server sends the page already rendered: it shows at once, and search engines can read it. */
  | { readonly kind: 'server-side-rendering' }
  /** A passive fix for one kind of infection: it clears up on its own after a while. */
  | { readonly kind: 'auto-cleans-infection'; readonly infection: InfectionKind; readonly afterMs: number }
  /** You hear about problems sooner, so the window for a quick fix is longer. */
  | { readonly kind: 'quick-fix-window-multiplier'; readonly factor: number }
  /** The server keeps serving past the load that used to take it down. */
  | { readonly kind: 'overload-tolerance-multiplier'; readonly factor: number }
  /** A share of revenue spent on running it, every second. */
  | { readonly kind: 'revenue-upkeep-share'; readonly share: number }
  /** Served over HTTPS: a padlock, and a certificate that has to be renewed. */
  | { readonly kind: 'secure-connection' }
  /** The certificate renews itself: it never expires on you. */
  | { readonly kind: 'automatic-certificate-renewal' }
  /** How big the GDPR's fines are: lawyers shrink them, tracking everyone grows them. */
  | { readonly kind: 'privacy-fine-multiplier'; readonly factor: number };

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
  /** For a defense that slows a hazard: how often it still comes, against the usual pace. 1 for the others. */
  readonly spawnRateFactor: number;
  readonly autoCleanDelayMs: number;
  readonly trafficFactor: number;
  /** The one feature whose visitors pay trafficFactor, or null when every visitor does. */
  readonly penalizedFeatureId: FeatureId | null;
  readonly adValueFactor: number;
  readonly revenueUpkeepShare: number;
  /** The defense this one upgrades: it's offered once you own that one, and buying it replaces it. */
  readonly upgradesFrom: DefenseId | null;
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
  /**
   * The game's pace. An era is meant to take 45–60 minutes: visitor revenue in it is divided by this, so everything
   * takes that much longer to afford, while prices, goals and how the eras relate stay as they are.
   */
  readonly revenuePace: number;
  /** The same for typing. 1997 keeps typing at full speed: a new player's first minutes are all typing. */
  readonly typingPace: number;
  /** What desktop visitors browse with. The page weight divided by this is the load time. */
  readonly connectionLabel: string;
  readonly connectionKbPerSecond: number;
  /** What phone visitors browse with, from the first era with phones: much slower than a desktop's line. */
  readonly mobileConnectionLabel: string;
  readonly mobileConnectionKbPerSecond: number;
  /** How long visitors wait before leaving. Shrinks every era. */
  readonly patienceSeconds: number;
  readonly basePageWeightKb: number;
  readonly adPageWeightKb: number;
  /** From 2005 on you pay for hosting, and the server can be overloaded. */
  readonly hasServerLoad: boolean;
  /**
   * Whether visitors wait for the page or leave. 1997 keeps it simple: build, place ads, fight viruses. Page weight
   * and load times arrive with 2005, a system per era.
   */
  readonly hasPageWeight: boolean;
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
export type MinigameId = 'snake' | 'virus-scan' | 'firewall' | 'spam-sort' | 'backup-restore' | 'reset-passwords' | 'reroute-traffic' | 'cross-traffic' | 'fix-build';

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
  readonly consentBanner: ConsentBanner;
  /** You answered the banner on your own site: it stays closed until you pick another banner. */
  readonly isCookieBannerDismissed: boolean;
  /** HTTPS without automatic renewal: the certificate ran out, and browsers warn every visitor. */
  readonly isCertificateExpired: boolean;
  /** What the player named the site, as typed (cleaned). Addresses and logos use forms made from it. */
  readonly siteName: string;
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
  /** On a desktop connection, and on a phone's. */
  readonly loadTimeSeconds: number;
  readonly phoneLoadTimeSeconds: number;
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
