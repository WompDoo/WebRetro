import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, FEATURE_IDS, findFrameworkPickedBy, findFrameworkRenderedBy, isFeatureOnPage } from '../src/engine';
import type { EraId, FrameworkId, GameState, UpgradeId } from '../src/engine';
import { renderSite } from '../src/ui/sites';

/**
 * Every era keeps the last era's page until a skill rebuilds it: the 2005 page until Bootstrap, the Bootstrap page
 * until a framework, the hand-written one until CSS. Whatever you've built must show on whichever page you have.
 * This found 2018's features missing from the 2005 page you keep if you never learned Bootstrap.
 */

const SEED = 21;
const NOW = 0;

interface Layout {
  readonly name: string;
  readonly eraId: EraId;
  readonly framework: FrameworkId;
  /** The skills taken away to get this page: the ones that would have rebuilt it. */
  readonly without: (upgradeId: UpgradeId) => boolean;
}

const isFrameworkSkill = (upgradeId: UpgradeId): boolean => findFrameworkPickedBy(upgradeId) !== null || findFrameworkRenderedBy(upgradeId) !== null;
const nothing = (): boolean => false;
const either = (...tests: readonly ((upgradeId: UpgradeId) => boolean)[]) => (upgradeId: UpgradeId): boolean => tests.some((test) => test(upgradeId));
const is = (skill: UpgradeId) => (upgradeId: UpgradeId): boolean => upgradeId === skill;

const LAYOUTS: readonly Layout[] = [
  { name: 'homepage', eraId: 'homepage-1997', framework: 'react', without: nothing },
  { name: 'div layout', eraId: 'web2-2005', framework: 'react', without: nothing },
  { name: 'hand-written', eraId: 'web2-2005', framework: 'react', without: is('learn-css') },
  { name: 'bootstrap', eraId: 'social-2011', framework: 'react', without: nothing },
  { name: 'div layout', eraId: 'social-2011', framework: 'react', without: is('learn-bootstrap') },
  { name: 'hand-written', eraId: 'social-2011', framework: 'react', without: either(is('learn-bootstrap'), is('learn-css')) },
  { name: 'react', eraId: 'platform-2018', framework: 'react', without: nothing },
  { name: 'angular', eraId: 'platform-2018', framework: 'angular', without: nothing },
  { name: 'vue', eraId: 'platform-2018', framework: 'vue', without: nothing },
  { name: 'bootstrap', eraId: 'platform-2018', framework: 'react', without: isFrameworkSkill },
  { name: 'div layout', eraId: 'platform-2018', framework: 'react', without: either(isFrameworkSkill, is('learn-bootstrap')) },
  { name: 'hand-written', eraId: 'platform-2018', framework: 'react', without: either(isFrameworkSkill, is('learn-bootstrap'), is('learn-css')) },
  { name: 'react', eraId: 'ai-2024', framework: 'react', without: nothing },
  { name: 'vue', eraId: 'ai-2024', framework: 'vue', without: nothing },
  { name: 'no framework', eraId: 'ai-2024', framework: 'react', without: isFrameworkSkill },
];

function buildState(layout: Layout): GameState {
  const state = createPlaytestState(layout.eraId, 'end', SEED, layout.framework);
  return { ...state, popups: [], purchasedUpgradeIds: state.purchasedUpgradeIds.filter((upgradeId) => !layout.without(upgradeId)) };
}

describe('every built feature has a place on every page you can have', () => {
  LAYOUTS.forEach((layout) => {
    it(`${layout.eraId}, ${layout.name} page`, () => {
      const state = buildState(layout);
      const html = renderSite(state, NOW);
      const missing = FEATURE_IDS.filter((featureId) => isFeatureOnPage(state, featureId)).filter((featureId) => !html.includes(`data-feature="${featureId}"`));
      assert.deepEqual(missing, []);
    });
  });
});
