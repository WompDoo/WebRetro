import type { FrameworkId, UpgradeId } from '../types';

/** What rendering in the browser costs a framework, until it renders on the server. */
export interface ClientRenderingCost {
  /** Pages take this much longer: the bundle has to download and run before anything shows. */
  readonly loadTimeFactor: number;
  /** Share of visitors who come from search engines, which index the blank page instead and send nobody. */
  readonly searchVisitorsLost: number;
}

/** What a framework makes cheaper: React's npm has a package for it, Angular has it built in. */
export interface PriceBreak {
  readonly upgradeIds: readonly UpgradeId[];
  readonly factor: number;
  /** Why, as the shop says it. */
  readonly reason: string;
}

/**
 * 2018's framework wars. A site picks one framework, and only one: its skill rewrites the site as a single-page
 * app, and its own server rendering fixes the blank page that comes with it. What sets them apart is in their
 * skills (price, bundle weight, typos, keystrokes) and, from later updates, in what they're exposed to.
 */
export interface FrameworkDefinition {
  readonly id: FrameworkId;
  readonly name: string;
  /** Learning it picks it, and rules out the others. */
  readonly skillId: UpgradeId;
  /** Its own server-side rendering: Next.js, Angular Universal, Nuxt. */
  readonly ssrSkillId: UpgradeId;
  /**
   * How fast its builds break, against the usual pace (1). React's npm tree is the biggest target for typosquats
   * and hijacked packages; Angular's breaks come with each major version, twice a year, softened by ng update's
   * automatic migrations; Vue's from plugins that nobody maintains any more.
   */
  readonly buildBreakageRate: number;
  /**
   * The signatures, one each. React: the ecosystem, so 2018's other skills and boosts cost less. Angular: batteries
   * included, so the skills that unlock 2018's features cost less, and its strict compiler cuts typos. Vue: progressive,
   * so before server rendering it loses fewer visitors than the others and shows content sooner.
   */
  readonly clientRendering: ClientRenderingCost;
  readonly priceBreak: PriceBreak | null;
}

/** Everything 2018 sells apart from the frameworks themselves and the other frameworks' server rendering. */
const REACT_ECOSYSTEM_UPGRADES: readonly UpgradeId[] = [
  'nextjs-ssr',
  'mobile-first',
  'learn-payments',
  'learn-oauth',
  'learn-websockets',
  'ci-pipeline',
  'lazy-loading',
  'code-splitting',
  'growth-hacking',
];

/** Forms for the checkout, HttpClient for the tokens, RxJS for the live updates, and the CLI's ng test and ng build: all in the box. */
const ANGULAR_BUILT_INS: readonly UpgradeId[] = ['learn-payments', 'learn-oauth', 'learn-websockets', 'ci-pipeline'];

/** The cost of rendering only in the browser, as React and Angular pay it. */
const FULL_CLIENT_RENDERING: ClientRenderingCost = { loadTimeFactor: 1.5, searchVisitorsLost: 0.3 };

export const FRAMEWORK_IDS: readonly FrameworkId[] = ['react', 'angular', 'vue'];

export const FRAMEWORKS_BY_ID: Readonly<Record<FrameworkId, FrameworkDefinition>> = {
  react: {
    id: 'react',
    name: 'React',
    skillId: 'learn-react',
    ssrSkillId: 'nextjs-ssr',
    buildBreakageRate: 1.3,
    clientRendering: FULL_CLIENT_RENDERING,
    priceBreak: { upgradeIds: REACT_ECOSYSTEM_UPGRADES, factor: 0.8, reason: 'React: npm has a package for it' },
  },
  angular: {
    id: 'angular',
    name: 'Angular',
    skillId: 'learn-angular',
    ssrSkillId: 'angular-universal',
    buildBreakageRate: 0.9,
    clientRendering: FULL_CLIENT_RENDERING,
    priceBreak: { upgradeIds: ANGULAR_BUILT_INS, factor: 0.5, reason: 'Angular: built in already' },
  },
  // Vue mounts onto the page progressively: its template shows (as raw {{ braces }}) while the bundle runs, and
  // crawlers that run a little JavaScript get further with it.
  vue: {
    id: 'vue',
    name: 'Vue',
    skillId: 'learn-vue',
    ssrSkillId: 'nuxt-ssr',
    buildBreakageRate: 0.8,
    clientRendering: { loadTimeFactor: 1.25, searchVisitorsLost: 0.15 },
    priceBreak: null,
  },
};

export function findFrameworkPickedBy(upgradeId: UpgradeId): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => FRAMEWORKS_BY_ID[frameworkId].skillId === upgradeId) ?? null;
}

export function findFrameworkRenderedBy(upgradeId: UpgradeId): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => FRAMEWORKS_BY_ID[frameworkId].ssrSkillId === upgradeId) ?? null;
}
