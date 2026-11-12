import type { FrameworkId, UpgradeId } from '../types';

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
}

export const FRAMEWORK_IDS: readonly FrameworkId[] = ['react', 'angular', 'vue'];

export const FRAMEWORKS_BY_ID: Readonly<Record<FrameworkId, FrameworkDefinition>> = {
  react: { id: 'react', name: 'React', skillId: 'learn-react', ssrSkillId: 'nextjs-ssr', buildBreakageRate: 1.3 },
  angular: { id: 'angular', name: 'Angular', skillId: 'learn-angular', ssrSkillId: 'angular-universal', buildBreakageRate: 0.9 },
  vue: { id: 'vue', name: 'Vue', skillId: 'learn-vue', ssrSkillId: 'nuxt-ssr', buildBreakageRate: 0.8 },
};

export function findFrameworkPickedBy(upgradeId: UpgradeId): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => FRAMEWORKS_BY_ID[frameworkId].skillId === upgradeId) ?? null;
}

export function findFrameworkRenderedBy(upgradeId: UpgradeId): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => FRAMEWORKS_BY_ID[frameworkId].ssrSkillId === upgradeId) ?? null;
}
