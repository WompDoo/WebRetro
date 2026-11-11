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
}

export const FRAMEWORK_IDS: readonly FrameworkId[] = ['react', 'angular', 'vue'];

export const FRAMEWORKS_BY_ID: Readonly<Record<FrameworkId, FrameworkDefinition>> = {
  react: { id: 'react', name: 'React', skillId: 'learn-react', ssrSkillId: 'nextjs-ssr' },
  angular: { id: 'angular', name: 'Angular', skillId: 'learn-angular', ssrSkillId: 'angular-universal' },
  vue: { id: 'vue', name: 'Vue', skillId: 'learn-vue', ssrSkillId: 'nuxt-ssr' },
};

export function findFrameworkPickedBy(upgradeId: UpgradeId): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => FRAMEWORKS_BY_ID[frameworkId].skillId === upgradeId) ?? null;
}

export function findFrameworkRenderedBy(upgradeId: UpgradeId): FrameworkId | null {
  return FRAMEWORK_IDS.find((frameworkId) => FRAMEWORKS_BY_ID[frameworkId].ssrSkillId === upgradeId) ?? null;
}
