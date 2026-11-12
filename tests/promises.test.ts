import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateBugChance,
  calculateEconomySnapshot,
  calculateKeystrokeValue,
  createPlaytestState,
  FEATURE_IDS,
  FEATURES_BY_ID,
  findFrameworkPickedBy,
  findFrameworkRenderedBy,
  UPGRADE_IDS,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { FeatureId, FrameworkId, GameState, UpgradeId } from '../src/engine';
import { buildBrowserTitle, buildEditorTabs, buildSiteUrl } from '../src/ui/browser-chrome';
import { renderSite } from '../src/ui/sites';
import { buildEditorSource } from '../src/ui/skill-code';

/**
 * The four-era audit as a standing check: every buyable thing does something you can measure or see, in its own era.
 * It found twenty-odd skills that did nothing, a boost that did literally nothing, and promises nobody could see.
 */

const SEED = 13;
const NOW = 0;
/** Allowed to look idle in an ordinary end-of-era state, and why. */
const CONDITIONAL_UPGRADES: Readonly<Partial<Record<UpgradeId, string>>> = {
  'page-cache': 'acts only during a traffic spike, and the spike’s news says the cache is serving it',
};
const TYPING_TOLERANCE = 0.9;

function frameworkFor(upgradeId: UpgradeId): FrameworkId {
  return findFrameworkPickedBy(upgradeId) ?? findFrameworkRenderedBy(upgradeId) ?? 'react';
}

function endOfEra(upgradeId: UpgradeId): GameState {
  return createPlaytestState(UPGRADES_BY_ID[upgradeId].eraId, 'end', SEED, frameworkFor(upgradeId));
}

function withUpgrade(state: GameState, upgradeId: UpgradeId, isBought: boolean): GameState {
  const others = state.purchasedUpgradeIds.filter((id) => id !== upgradeId);
  return { ...state, purchasedUpgradeIds: isBought ? [...others, upgradeId] : others };
}

/** Everything a purchase could change that a player could notice, as one string per kind. */
function observe(state: GameState): readonly string[] {
  const economy = calculateEconomySnapshot(state);
  const tabs = buildEditorTabs(state);
  return [
    [economy.visitorsPerSecond, economy.netRevenuePerSecond, economy.pageWeightKb, economy.loadTimeSeconds, economy.serverLoad].join(','),
    `${calculateKeystrokeValue(state)},${calculateBugChance(state)}`,
    renderSite(state, NOW),
    `${tabs.files.join(',')}+${tabs.hiddenCount}|${tabs.files.map((file) => buildEditorSource(state, file)).join('\n')}`,
    `${buildSiteUrl(state)}|${buildBrowserTitle(state)}`,
  ];
}

describe('every buyable thing keeps its promise', () => {
  UPGRADE_IDS.filter((upgradeId) => CONDITIONAL_UPGRADES[upgradeId] === undefined).forEach((upgradeId) => {
    it(`${upgradeId} changes something you can measure or see in its own era`, () => {
      const end = endOfEra(upgradeId);
      const before = observe(withUpgrade(end, upgradeId, false));
      const after = observe(withUpgrade(end, upgradeId, true));
      assert.ok(after.some((value, index) => value !== before[index]), `${upgradeId} did nothing`);
    });
  });

  it('never sells a boost that makes its own era worse in both visitors and revenue', () => {
    const harmful = UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind === 'boost').filter((upgradeId) => {
      const end = endOfEra(upgradeId);
      const before = calculateEconomySnapshot(withUpgrade(end, upgradeId, false));
      const after = calculateEconomySnapshot(withUpgrade(end, upgradeId, true));
      return after.visitorsPerSecond < before.visitorsPerSecond && after.netRevenuePerSecond < before.netRevenuePerSecond;
    });
    assert.deepEqual(harmful, []);
  });

  UPGRADE_IDS.forEach((upgradeId) => {
    const typing = UPGRADES_BY_ID[upgradeId].effects.flatMap((effect) => (effect.kind === 'keystroke-value-multiplier' ? [effect.factor] : []));
    typing.forEach((factor) => {
      it(`${upgradeId} really pays its typing ×${factor} in its own era`, () => {
        const end = endOfEra(upgradeId);
        const gain = calculateKeystrokeValue(withUpgrade(end, upgradeId, true)) / calculateKeystrokeValue(withUpgrade(end, upgradeId, false));
        assert.ok(gain - 1 >= (factor - 1) * TYPING_TOLERANCE, `${upgradeId}: ×${gain.toFixed(3)}`);
      });
    });
  });

  UPGRADE_IDS.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].effects.some((effect) => effect.kind === 'bug-chance-reduction')).forEach((upgradeId) => {
    it(`${upgradeId} really cuts the typo chance in its own era`, () => {
      const end = endOfEra(upgradeId);
      assert.ok(calculateBugChance(withUpgrade(end, upgradeId, true)) < calculateBugChance(withUpgrade(end, upgradeId, false)));
    });
  });

  FEATURE_IDS.forEach((featureId: FeatureId) => {
    it(`${featureId} shows on the page from its first level`, () => {
      const end = createPlaytestState(FEATURES_BY_ID[featureId].eraId, 'end', SEED, 'react');
      const at = (level: number): string => renderSite({ ...end, featureLevels: { ...end.featureLevels, [featureId]: level } }, NOW);
      assert.notEqual(at(1), at(0));
    });
  });
});
