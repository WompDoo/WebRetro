import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  buyUpgrade,
  calculateNetRevenuePerSecond,
  calculateRetirementPayout,
  createInitialGameState,
  createPlaytestState,
  findNextEraId,
  getErasOfGame,
  getUnlockedFeatureIds,
  isEraUnlocked,
  isFeatureRetired,
  isUpgradeAvailable,
  isUpgradeRetired,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { EraId, GameState, UpgradeId } from '../src/engine';
import { findEntryStory } from '../src/ui/presentation';
import { describeRetirement } from '../src/ui/retirement';
import { renderSite } from '../src/ui/sites';

/**
 * The 2000 crash isn't played as an era of its own: its content (e-cards, free email, the donate button, affiliate
 * links, the dancing hamsters) arrives with the third run, folded into 1997, and retires in 2005 without a trade-in.
 */

const SEED = 2000;
const NOW = 0;
const THIRD_RUN = 3;
const CRASH_ERA: EraId = 'crash-2000';
const E_CARDS_LEVEL = 25;
const FREE_EMAIL_LEVEL = 5;
const inEra = (eraId: EraId, runNumber: number): GameState => ({ ...createInitialGameState(SEED), eraId, runNumber });
const CRASH_BOOSTS: readonly UpgradeId[] = ['donate-button', 'affiliate-links', 'dancing-hamsters'];
const SUPPORT_KINDS: readonly string[] = ['support', 'donations'];
/** A site without 1997's own ways to ask visitors to chip in: only the crash's buttons are left to pay without ads. */
const withoutSupport = (state: GameState): GameState => ({
  ...state,
  purchasedUpgradeIds: state.purchasedUpgradeIds.filter((upgradeId) => !UPGRADES_BY_ID[upgradeId].effects.some((effect) => SUPPORT_KINDS.includes(effect.kind))),
});

/** A third run's 1997 at its end, with the crash's features built. */
function thirdRunEnd1997(): GameState {
  const end = createPlaytestState('homepage-1997', 'end', SEED, 'react');
  return { ...end, runNumber: THIRD_RUN, featureLevels: { ...end.featureLevels, 'e-cards': E_CARDS_LEVEL, 'free-email': FREE_EMAIL_LEVEL } };
}

describe('the crash, folded into 1997', () => {
  it('is never an era of its own: every run relaunches 1997 straight into 2005', () => {
    [1, 2, THIRD_RUN].forEach((runNumber) => {
      assert.equal(findNextEraId(inEra('homepage-1997', runNumber)), 'web2-2005', `run ${runNumber}`);
      assert.ok(!getErasOfGame({ runNumber }).includes(CRASH_ERA), `run ${runNumber}`);
    });
  });

  it('brings its content into a third run’s 1997, and nothing of it into a first run', () => {
    const third = inEra('homepage-1997', THIRD_RUN);
    assert.ok(isEraUnlocked(third, CRASH_ERA));
    assert.ok(getUnlockedFeatureIds(third).includes('e-cards'));
    assert.ok(isUpgradeAvailable(third, 'donate-button'));
    const firstRun2005 = createPlaytestState('web2-2005', 'start', SEED, 'react');
    assert.equal(firstRun2005.runNumber, 1);
    assert.ok(!isEraUnlocked(firstRun2005, CRASH_ERA));
    assert.ok(!getUnlockedFeatureIds(firstRun2005).includes('e-cards'));
    assert.ok(!isUpgradeAvailable(firstRun2005, 'learn-sendmail'));
  });

  it('earns from the donate button and affiliate links with no ad on the page', () => {
    const adFree: GameState = { ...withoutSupport(thirdRunEnd1997()), adCount: 0, money: Number.MAX_SAFE_INTEGER };
    const before = calculateNetRevenuePerSecond(adFree);
    const donating = buyUpgrade(adFree, 'donate-button');
    const both = buyUpgrade(donating, 'affiliate-links');
    assert.ok(calculateNetRevenuePerSecond(donating) > before);
    assert.ok(calculateNetRevenuePerSecond(both) > calculateNetRevenuePerSecond(donating));
  });

  it('retires everything it added in 2005, without a trade-in: they were stopgaps', () => {
    const end = thirdRunEnd1997();
    const in2005 = advanceEra({ ...end, purchasedUpgradeIds: [...end.purchasedUpgradeIds, ...CRASH_BOOSTS] });
    assert.equal(in2005.eraId, 'web2-2005');
    assert.ok(isFeatureRetired(in2005, 'e-cards'));
    assert.ok(isFeatureRetired(in2005, 'free-email'));
    CRASH_BOOSTS.forEach((upgradeId) => assert.ok(isUpgradeRetired(in2005, upgradeId), upgradeId));
    const earned = { ...end, featureEarnings: { ...end.featureEarnings, 'e-cards': 1_000_000, 'free-email': 1_000_000 } };
    assert.equal(calculateRetirementPayout(earned, 'web2-2005'), 0);
    assert.match(describeRetirement(earned, 'web2-2005'), /Free e-cards, Free email\. Trade-in: \$0 .* The crash’s stopgaps pay none\./);
  });

  it('tells 2005’s story the way the game is played: straight from 1997', () => {
    assert.match(findEntryStory('homepage-1997', 'web2-2005')?.hook ?? '', /took the ad money with it/);
  });

  it('puts its features on the 1997 page', () => {
    const page = renderSite({ ...thirdRunEnd1997(), popups: [], infections: [] }, NOW);
    assert.match(page, /class="site-1997/);
    assert.match(page, /class="ecard-grid"/);
    assert.match(page, /class="webmail-box"/);
  });
});
