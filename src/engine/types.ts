/** The eras in order. 2000 is a half-era: the dot-com crash, from the third run on. */
export type EraId = 'homepage-1997' | 'crash-2000' | 'web2-2005' | 'social-2011' | 'platform-2018' | 'ai-2024';

/** 2018's framework wars: a site picks one, and it shapes everything after. */
export type FrameworkId = 'react' | 'angular' | 'vue';

export type FeatureId =
  | 'hit-counter'
  | 'under-construction'
  | 'guestbook'
  | 'midi-player'
  | 'webring'
  | 'e-cards'
  | 'free-email'
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
  | 'newsletter'
  | 'ai-chatbot'
  | 'ai-articles'
  | 'ai-search'
  | 'ai-images'
  | 'for-you-feed'
  | 'webcam'
  | 'custom-cursor'
  | 'wiki'
  | 'deal-of-the-day'
  | 'community-chat'
  | 'agent-store'
  | SpecializationFeatureId;

/** Each specialization's own feature: built only while you hold that specialization. */
export type SpecializationFeatureId =
  | 'member-blogs'
  | 'photo-groups'
  | 'channels'
  | 'subforums'
  | 'talk-pages'
  | 'groups'
  | 'trending-topics'
  | 'emotes-and-raids'
  | 'listicles'
  | 'check-ins'
  | 'product-listings'
  | 'filters-and-lenses'
  | 'originals'
  | 'paid-newsletters'
  | 'seller-dashboards'
  | 'job-board'
  | 'servers'
  | 'duets-and-remixes'
  | 'sources-panel'
  | 'prompt-gallery'
  | 'characters'
  | 'agent-listings';

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
  | 'retargeting-cookies'
  | 'ai-pair-programmer'
  | 'learn-llm-api'
  | 'prompt-engineering'
  | 'learn-rag'
  | 'diffusion-models'
  | 'learn-recommender'
  | 'ai-everything'
  | 'llms-txt'
  | 'dark-mode'
  | 'paywall'
  | 'observability'
  | 'spot-gpus'
  | 'learn-sendmail'
  | 'donate-button'
  | 'affiliate-links'
  | 'dancing-hamsters'
  | 'fixed-width-800'
  | 'css-sprites'
  | 'cufon'
  | 'vendor-prefixes'
  | 'every-font-weight'
  | 'blockchain-guestbook'
  | 'status-page'
  | 'hire-little-brother'
  | 'hire-unpaid-intern'
  | 'hire-junior-developer'
  | 'hire-gig-freelancer'
  | 'hire-bootcamp-team'
  | 'hire-ai-agent'
  | SpecializationUpgradeId;

/** Each specialization's own skill and boosts: offered only while you hold that specialization. */
export type SpecializationUpgradeId =
  | 'learn-multi-user-blogs'
  | 'write-every-day'
  | 'long-tail'
  | 'learn-exif'
  | 'users-upload'
  | 'explore-page'
  | 'learn-flash-video'
  | 'going-viral'
  | 'embed-anywhere'
  | 'learn-mod-tools'
  | 'volunteer-mods'
  | 'post-counts'
  | 'learn-wiki-markup'
  | 'edit-a-thon'
  | 'donation-drive'
  | 'learn-social-graph'
  | 'network-effect'
  | 'people-you-may-know'
  | 'learn-hashtags'
  | 'live-posting'
  | 'fail-whale'
  | 'learn-live-video'
  | 'live-events'
  | 'subs-and-tips'
  | 'learn-headline-testing'
  | 'clickbait'
  | 'breaking-news'
  | 'learn-geolocation'
  | 'elite-reviewers'
  | 'fake-review-filter'
  | 'learn-shopping-cart'
  | 'customers-also-bought'
  | 'black-friday'
  | 'learn-vertical-video'
  | 'disappearing-stories'
  | 'influencers'
  | 'learn-adaptive-streaming'
  | 'subscriptions'
  | 'binge-autoplay'
  | 'learn-deliverability'
  | 'writers-fund'
  | 'tracking-pixels'
  | 'learn-escrow'
  | 'take-rate'
  | 'surge-pricing'
  | 'learn-recruiting-tools'
  | 'endorsements'
  | 'premium-messages'
  | 'learn-bots-and-webhooks'
  | 'server-boosts'
  | 'mod-bots'
  | 'learn-remixing'
  | 'the-algorithm'
  | 'infinite-scroll'
  | 'learn-citations'
  | 'answer-dont-link'
  | 'sponsored-answers'
  | 'learn-style-models'
  | 'gpu-farm'
  | 'credits'
  | 'learn-fine-tuning'
  | 'it-remembers-you'
  | 'talks-while-you-sleep'
  | 'learn-tool-calling'
  | 'agents-buy-for-you'
  | 'tool-use-fees';

/** Skills are what the developer learns: they unlock features and change the page. Boosts are multipliers. */
/** Skills are learned, boosts are bought, ops are how you run the site: they live in the Ops tab. */
export type UpgradeKind = 'skill' | 'boost' | 'ops';

export type DefenseId = 'antivirus' | 'premium-ad-network' | 'captcha' | 'ddos-protection' | 'no-popups' | 'bot-shield' | 'guardrails';
export type HazardKind = 'popup' | 'virus' | 'spam' | 'sql-injection' | 'traffic-spike' | 'password-leak' | 'ddos' | 'broken-build' | 'privacy-fine' | 'certificate-expiry' | 'scraper-swarm' | 'hallucination';
export type InfectionKind = 'virus' | 'spam' | 'sql-injection' | 'password-leak' | 'ddos' | 'broken-build' | 'scraper-swarm';
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
  | `pods-${number}`
  | `gpus-${number}`;
/** A defense stops a hazard, cleans it up on its own, or makes it rarer. */
export type DefenseCounterMode = 'prevents-spawn' | 'auto-cleans' | 'slows-spawn';
export type CodeInputOutcome = 'clean-line' | 'bugged-line' | 'fixed-bug';
export type SimulationMode = 'live' | 'offline';
export type GameEventKind = 'hazard' | 'defense' | 'milestone' | 'cleanup' | 'opportunity';
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
  /** Every feature level costs this much of its price (a perk: Templates). */
  | { readonly kind: 'feature-cost-multiplier'; readonly factor: number }
  /** Every Ops item costs this much of its price (a perk: Ops runbook). */
  | { readonly kind: 'ops-cost-multiplier'; readonly factor: number }
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
  | { readonly kind: 'privacy-fine-multiplier'; readonly factor: number }
  /** How much of the AI-answers loss is left: writing for AI answers gets you quoted, with a link. */
  | { readonly kind: 'ai-answer-share-multiplier'; readonly factor: number }
  /** Money a visitor brings without an ad: a donation, a cut of a sale. Ads don't have to be on the page for it. */
  | { readonly kind: 'direct-revenue-per-visitor'; readonly amount: number }
  /**
   * Someone else types for you: this many keystrokes a second, paid like yours (typos included, the on-fire bonus
   * not), offline too. Era-bound like typing skills: each era hires its own help.
   */
  | { readonly kind: 'auto-keystrokes'; readonly perSecond: number }
  // ---------- Specializations' own mechanics: nothing else in the game does these. ----------
  /** Users build it: every so often a feature gains a level for free. Null: whichever built feature has the fewest. */
  | { readonly kind: 'auto-level'; readonly featureId: FeatureId | null; readonly everyMs: number }
  /** Typing publishes: every so many of your keystrokes, the feature gains a level. */
  | { readonly kind: 'keystrokes-level'; readonly featureId: FeatureId; readonly keystrokes: number }
  /** The long tail: the feature's traffic grows minute by minute through the era, up to a cap. */
  | { readonly kind: 'traffic-growth'; readonly featureId: FeatureId; readonly perMinute: number; readonly cap: number }
  /** Network effect: all traffic grows with each doubling of the site since the era began, up to a cap. */
  | { readonly kind: 'network-effect'; readonly perDoubling: number; readonly cap: number }
  /** Every level of one feature adds a share to all traffic. */
  | { readonly kind: 'traffic-per-level'; readonly sourceFeatureId: FeatureId; readonly perLevel: number }
  /** The algorithm: the feature that brings the most visitors gets more, every other one gets less. */
  | { readonly kind: 'algorithm'; readonly topFactor: number; readonly restFactor: number }
  /** Traffic that depends on the moment: on fire, typing, idle, in a spike. Null: all traffic. */
  | { readonly kind: 'moment-traffic'; readonly featureId: FeatureId | null; readonly factor: number; readonly moment: SiteMoment }
  /** Revenue per visitor that depends on the moment. */
  | { readonly kind: 'moment-revenue'; readonly factor: number; readonly moment: SiteMoment }
  /** Traffic spikes come this many times as often. */
  | { readonly kind: 'spike-frequency-multiplier'; readonly factor: number }
  /** Catching fire starts a traffic spike, if none is running. */
  | { readonly kind: 'spike-on-fire' }
  /** Moderation pays: each infection of this kind cleaned up (null: any kind) gives the feature levels. */
  | { readonly kind: 'levels-per-clean'; readonly infection: InfectionKind | null; readonly featureId: FeatureId; readonly levels: number }
  /** Donations: money per visitor, less a share for every ad on the page. */
  | { readonly kind: 'donations'; readonly amount: number; readonly lostSharePerAd: number }
  /** Subscribers: this share of visitors pays every second, like an ad would. The pool grows slowly and churns slowly. */
  | { readonly kind: 'subscribers'; readonly share: number }
  /** Subscribers leave this many times as fast. */
  | { readonly kind: 'subscriber-churn-multiplier'; readonly factor: number }
  /** Every so often, a buff starts by itself: a live event, a sale. */
  | { readonly kind: 'scheduled-buff'; readonly buffId: BuffId; readonly everyMs: number }
  /** Phone visitors pay this many times as much. */
  | { readonly kind: 'phone-revenue-multiplier'; readonly factor: number }
  /** Breadth pays: revenue per visitor grows with every feature level on the page. */
  | { readonly kind: 'revenue-per-feature-level'; readonly share: number }
  /** Ads pay more for every specialization the site has held. */
  | { readonly kind: 'ad-value-per-specialization'; readonly share: number }
  /** Offers turn up this many times as often. */
  | { readonly kind: 'offer-frequency-multiplier'; readonly factor: number }
  /** The visitors AI answers keep away pay you this share of what they would have paid. */
  | { readonly kind: 'ai-answers-pay'; readonly share: number }
  /** Hired help types this many times as fast. */
  | { readonly kind: 'auto-keystroke-multiplier'; readonly factor: number }
  /** Agents buy for you: every so often, the cheapest feature level you can afford. */
  | { readonly kind: 'auto-buyer'; readonly everyMs: number };

/** A moment some specializations' traffic or revenue depends on. */
export type SiteMoment = 'on-fire' | 'typing' | 'idle' | 'spike';

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
  /**
   * The first run the era is part of. Every run plays the big eras; a half-era between them (the 2000 crash) comes
   * with a later run, so which era comes next depends on the run.
   */
  readonly fromRun: number;
  /**
   * The big era this one belongs to: itself, or for a half-era the one it sits in. The 2000 crash is still 1997's
   * web, so it types with 1997's editor and skills and keeps 1997's ops.
   */
  readonly baseEraId: EraId;
  /** The button that relaunches the site into this era. */
  readonly relaunchLabel: string;
  /** What leaving this era costs: the gate asks you to save it first. */
  readonly migrationCost: number;
  /** An era finished faster than this earns a Backlink: 45 minutes for a big era, less for a half-era. */
  readonly fastFinishMinutes: number;
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
  /**
   * 2024: the share of searchers an AI answer satisfies before they'd ever click through to you. They read your
   * content in someone else's summary and never visit. 0 before AI search.
   */
  readonly aiAnswerShare: number;
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

/**
 * Which game this is: the classic one, or the test build where a site becomes something (routes, site colors). The
 * engine reads it where the two differ; the classic game never sees the test build's systems.
 */
export type Edition = 'classic' | 'webspecialization';

/** What the site becomes, era by era from 2005. Homepage is no specialization: the classic game's only path. */
export type SpecializationId =
  | 'homepage'
  | 'blog-network'
  | 'photos'
  | 'video'
  | 'forum'
  | 'wiki'
  | 'social'
  | 'microblog'
  | 'live-streaming'
  | 'news'
  | 'reviews'
  | 'shop'
  | 'stories'
  | 'streaming-service'
  | 'newsletter'
  | 'marketplace'
  | 'professional'
  | 'chat-community'
  | 'short-video'
  | 'ai-answers'
  | 'ai-studio'
  | 'ai-companion'
  | 'agent-store';
/** The eras with specializations of their own, from 2005. */
export type SpecializedEraId = 'web2-2005' | 'social-2011' | 'platform-2018' | 'ai-2024';

/** What an era counts for unlocks that ask for something done rather than bought. Starts over at every relaunch. */
export interface EraStats {
  /** Times the editor caught fire. */
  readonly onFireStarts: number;
  /** Traffic spikes that ended with the site still up. */
  readonly spikesRiddenOut: number;
  readonly cleanedByKind: Readonly<Partial<Record<InfectionKind, number>>>;
  /** How long the site has run without a single ad, right up to now. */
  readonly adFreeMs: number;
  /** Everything spent this era, and what of it went into each feature: the lean a specialization asks for. */
  readonly spent: number;
  readonly spentByFeature: Readonly<Partial<Record<FeatureId, number>>>;
  /** How long the era has run, offline too: what grows all era grows with this. */
  readonly elapsedMs: number;
  /** Visitors the features brought when the era began: what a network effect counts doublings from. */
  readonly startBaseVisitors: number;
}

/** Behind the page: plain white, a whisper of your accent color, or warm cream. Each keeps every era readable. */
export type SiteBackground = 'white' | 'tint' | 'cream';

/** Your site's colors: an accent from anywhere on the color wheel (#RRGGBB) and a background. */
export interface SiteColors {
  readonly accent: string;
  readonly background: SiteBackground;
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
  /** What's boosting the site right now: on fire, a quick fix. They run down only while you play. */
  readonly buffs: readonly ActiveBuff[];
  /** The heat meter, 0 to 1: typing without typos fills it, and full sets you on fire. */
  readonly typingHeat: number;
  /** Since the last keystroke: after a short pause the heat meter starts to cool. */
  readonly msSinceKeystroke: number;
  /** The offer waiting for you right now, if any. */
  readonly opportunity: Opportunity | null;
  readonly opportunityCountdownMs: number;
  readonly consentBanner: ConsentBanner;
  /** You answered the banner on your own site: it stays closed until you pick another banner. */
  readonly isCookieBannerDismissed: boolean;
  /** HTTPS without automatic renewal: the certificate ran out, and browsers warn every visitor. */
  readonly isCertificateExpired: boolean;
  /** What the player named the site, as typed (cleaned). Addresses and logos use forms made from it. */
  readonly siteName: string;
  readonly reachedMilestoneIds: readonly MilestoneId[];
  /** One for every era the site has left, the last era included once the game is finished. */
  readonly eraRecords: readonly EraRecord[];
  /** The last era's checklist was finished and the ending played. Play can go on afterwards. */
  readonly isGameFinished: boolean;
  /** Which site this is: 1 for the first, one more for every finished run before it. */
  readonly runNumber: number;
  /** The perks this run was started with, bought with Backlinks from earlier runs. */
  readonly legacyPerkLevels: Readonly<Record<PerkId, number>>;
  /** This run's Backlinks are in the legacy already: a finished run pays out once. */
  readonly areBacklinksBanked: boolean;
  readonly edition: Edition;
  /** What the site has become, oldest first: at most one per era from 2005. Empty is a homepage. */
  readonly specializationIds: readonly SpecializationId[];
  /** Unlocked this run, each during its own era: a new run starts with none. */
  readonly unlockedSpecializationIds: readonly SpecializationId[];
  readonly eraStats: EraStats;
  /** How far each specialization upgrade with a schedule is towards its next go: a level, a buff, a purchase. */
  readonly itemClocksMs: Readonly<Partial<Record<UpgradeId, number>>>;
  /** What subscribers pay a second. It follows the site slowly: up as it grows, down as subscribers churn. */
  readonly subscriptionRevenuePerSecond: number;
  /** Null: the era's own look. The test build lets you pick; the classic game never does. */
  readonly siteColors: SiteColors | null;
}

/** Bought with Backlinks, kept across runs. */
export type PerkId = 'muscle-memory' | 'regulars' | 'known-tags' | 'early-warning' | 'templates' | 'ops-runbook' | 'old-savings' | 'serial-founder';

/**
 * What survives from one site to the next: unspent Backlinks, the perks bought with them, and how many runs were
 * finished. Saved on its own, apart from the game: Start over clears a game, never the legacy.
 */
export interface LegacyState {
  readonly version: number;
  readonly backlinks: number;
  readonly perkLevels: Readonly<Record<PerkId, number>>;
  readonly finishedRuns: number;
  /** Every specialization ever unlocked, in any run: their cards show from the start next time. */
  readonly foundSpecializationIds: readonly SpecializationId[];
}

/** The parts of the game that decide how the page looks: enough to show an old page again. */
export type SiteSnapshot = Pick<
  GameState,
  'featureLevels' | 'purchasedUpgradeIds' | 'switchedOffFeatureIds' | 'ownedDefenseIds' | 'enabledDefenseIds' | 'adCount' | 'hostingTier' | 'consentBanner' | 'lifetimeVisitors' | 'specializationIds' | 'siteColors'
>;

/** The site the day it left an era. */
export interface EraRecord {
  readonly eraId: EraId;
  readonly endedAtPlayTimeMs: number;
  readonly visitorsPerSecond: number;
  readonly revenuePerSecond: number;
  readonly lifetimeEarnings: number;
  readonly site: SiteSnapshot;
}

export interface GameEvent {
  readonly kind: GameEventKind;
  readonly message: string;
}

export interface GameStep {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/** A short boost: what it multiplies, by how much, for how long. */
export type BuffId = 'on-fire' | 'quick-fix' | 'sponsor-slot' | 'launch-day' | 'live-event' | 'black-friday';
export type BuffTarget = 'typing' | 'traffic' | 'ad-value';

export interface BuffDefinition {
  readonly id: BuffId;
  readonly name: string;
  readonly icon: string;
  readonly target: BuffTarget;
  readonly factor: number;
  readonly durationMs: number;
}

/** An offer that turns up while you play: win its minigame for a buff. */
export type OpportunityKind = 'sponsor-slot' | 'launch-day';
/** The minigames that win buffs, apart from the ones that fix infections. */
export type BuffMinigameId = 'code-entry' | 'launch-window';
export type AnyMinigameId = MinigameId | BuffMinigameId;

export interface Opportunity {
  readonly id: number;
  readonly kind: OpportunityKind;
  readonly remainingMs: number;
}

export interface ActiveBuff {
  readonly id: BuffId;
  readonly remainingMs: number;
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
  /** This era's hired help: keystrokes a second, and what they earn a second. */
  readonly autoKeystrokesPerSecond: number;
  readonly hiredTypingPerSecond: number;
}

export interface GateCheck {
  readonly requirement: EraGateRequirement;
  readonly current: number;
  readonly isMet: boolean;
}
