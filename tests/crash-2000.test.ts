import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  buyUpgrade,
  calculateAdValuePerAd,
  calculateBacklinkSources,
  calculateKeystrokeValue,
  calculateNetRevenuePerSecond,
  calculateRetirementPayout,
  createEraRecord,
  createInitialGameState,
  createPlaytestState,
  describeNextEra,
  ERAS_BY_ID,
  findNextEraId,
  getErasOfRun,
  getUnlockedFeatureIds,
  isEraGateComplete,
  isEraUnlocked,
  isFeatureRetired,
  isUpgradeAvailable,
  isUpgradeRetired,
} from '../src/engine';
import type { EraId, EraRecord, GameState, UpgradeId } from '../src/engine';
import { findEntryStory } from '../src/ui/presentation';
import { describeRetirement } from '../src/ui/retirement';
import { renderSite } from '../src/ui/sites';

/**
 * The 2000 crash: a half-era between 1997 and 2005 that only the third run plays. Ads pay a fifth of what they did,
 * the site lives on donations, affiliate cuts and e-cards, and all of it retires in 2005 with a trade-in.
 */

const SEED = 2000;
const NOW = 0;
const THIRD_RUN = 3;
const MS_PER_MINUTE = 60_000;

const startOfCrash = (): GameState => createPlaytestState('crash-2000', 'start', SEED, 'react');
const endOfCrash = (): GameState => createPlaytestState('crash-2000', 'end', SEED, 'react');
const inEra = (eraId: EraId, runNumber: number): GameState => ({ ...createInitialGameState(SEED), eraId, runNumber });
const CRASH_BOOSTS: readonly UpgradeId[] = ['donate-button', 'affiliate-links', 'dancing-hamsters'];

describe('the crash belongs to the third run', () => {
  it('is skipped by the first two runs and played by the third, between 1997 and 2005', () => {
    assert.equal(findNextEraId(inEra('homepage-1997', 1)), 'web2-2005');
    assert.equal(findNextEraId(inEra('homepage-1997', 2)), 'web2-2005');
    assert.equal(findNextEraId(inEra('homepage-1997', THIRD_RUN)), 'crash-2000');
    assert.equal(findNextEraId(inEra('crash-2000', THIRD_RUN)), 'web2-2005');
    assert.deepEqual(getErasOfRun(THIRD_RUN), ['homepage-1997', 'crash-2000', 'web2-2005', 'social-2011', 'platform-2018', 'ai-2024']);
  });

  it('points the goal bar at 2000 in a third run’s 1997, and at 2005 in a first run’s', () => {
    assert.deepEqual(describeNextEra(inEra('homepage-1997', THIRD_RUN)), { year: 2000, name: 'The dot-com crash', label: 'Relaunch for 2000' });
    assert.deepEqual(describeNextEra(inEra('homepage-1997', 1)), { year: 2005, name: 'Web 2.0', label: 'Launch Web 2.0' });
  });

  it('never unlocks in a run that skips it: nothing of it shows up in a first run’s 2005', () => {
    const firstRun2005 = createPlaytestState('web2-2005', 'start', SEED, 'react');
    assert.equal(firstRun2005.runNumber, 1);
    assert.ok(!isEraUnlocked(firstRun2005, 'crash-2000'));
    assert.ok(!getUnlockedFeatureIds(firstRun2005).includes('e-cards'));
    assert.ok(!isUpgradeAvailable(firstRun2005, 'learn-sendmail'));
  });

  it('relaunches a third run’s 1997 into the crash, and the crash into 2005', () => {
    const end1997 = { ...createPlaytestState('homepage-1997', 'end', SEED, 'react'), runNumber: THIRD_RUN };
    assert.equal(advanceEra(end1997).eraId, 'crash-2000');
    const end = endOfCrash();
    assert.ok(isEraGateComplete(end));
    assert.equal(advanceEra(end).eraId, 'web2-2005');
  });
});

describe('the crash itself', () => {
  it('pays a fifth for a banner', () => {
    assert.equal(ERAS_BY_ID['crash-2000'].adValuePerVisitor * 5, ERAS_BY_ID['homepage-1997'].adValuePerVisitor);
    const crash = startOfCrash();
    assert.ok(calculateAdValuePerAd(crash) < calculateAdValuePerAd({ ...crash, eraId: 'homepage-1997' }));
  });

  it('earns from the donate button and affiliate links with no ad on the page', () => {
    const adFree: GameState = { ...startOfCrash(), adCount: 0, money: Number.MAX_SAFE_INTEGER };
    assert.equal(calculateNetRevenuePerSecond(adFree), 0);
    const donating = buyUpgrade(adFree, 'donate-button');
    const both = buyUpgrade(donating, 'affiliate-links');
    assert.ok(calculateNetRevenuePerSecond(donating) > 0);
    assert.ok(calculateNetRevenuePerSecond(both) > calculateNetRevenuePerSecond(donating));
  });

  it('types with 1997’s editor and skills: typing pays the same as at the end of 1997', () => {
    const adFree: GameState = { ...startOfCrash(), adCount: 0 };
    assert.equal(calculateKeystrokeValue(adFree), calculateKeystrokeValue({ ...adFree, eraId: 'homepage-1997' }));
  });

  it('retires everything it added in 2005, without a trade-in: they were stopgaps', () => {
    const end = endOfCrash();
    const in2005 = advanceEra({ ...end, purchasedUpgradeIds: [...end.purchasedUpgradeIds, ...CRASH_BOOSTS] });
    assert.ok(isFeatureRetired(in2005, 'e-cards'));
    assert.ok(isFeatureRetired(in2005, 'free-email'));
    CRASH_BOOSTS.forEach((upgradeId) => assert.ok(isUpgradeRetired(in2005, upgradeId), upgradeId));
    const earned = { ...end, featureEarnings: { ...end.featureEarnings, 'e-cards': 1_000_000, 'free-email': 1_000_000 } };
    assert.equal(calculateRetirementPayout(earned, 'web2-2005'), 0);
    assert.match(describeRetirement(earned, 'web2-2005'), /Free e-cards, Free email\. Trade-in: \$0 .* The crash’s stopgaps pay none\./);
  });
});

describe('the crash’s Backlink', () => {
  const record = (eraId: EraId, endedAtMinutes: number): EraRecord => ({ ...createEraRecord(endOfCrash()), eraId, endedAtPlayTimeMs: endedAtMinutes * MS_PER_MINUTE });

  it('counts a half-era as fast under 20 minutes, not 45', () => {
    const quick = { ...endOfCrash(), eraRecords: [record('homepage-1997', 50), record('crash-2000', 69)] };
    const slow = { ...endOfCrash(), eraRecords: [record('homepage-1997', 50), record('crash-2000', 71)] };
    assert.equal(calculateBacklinkSources(quick).fromFastEras, 1);
    assert.equal(calculateBacklinkSources(slow).fromFastEras, 0);
  });
});

describe('the crash’s story and page', () => {
  it('tells the crash on the way into 2000, and 2005 after it starts once the crash is over', () => {
    assert.match(findEntryStory('homepage-1997', 'crash-2000')?.hook ?? '', /bubble burst/);
    assert.match(findEntryStory('crash-2000', 'web2-2005')?.hook ?? '', /made it through the crash/);
    assert.match(findEntryStory('homepage-1997', 'web2-2005')?.hook ?? '', /took the ad money with it/);
  });

  it('is still the 1997 homepage, with the crash’s news, its banners, e-cards and free email on it', () => {
    const end = endOfCrash();
    const page = renderSite({ ...end, popups: [], infections: [], purchasedUpgradeIds: [...end.purchasedUpgradeIds, 'donate-button'] }, NOW);
    assert.match(page, /class="site-1997/);
    assert.match(page, /class="crash-ticker"/);
    assert.match(page, /is still here!!!/);
    assert.match(page, /class="ecard-grid"/);
    assert.match(page, /class="webmail-box"/);
    assert.match(page, /Keep this site alive!/);
    assert.match(page, /EVERYTHING MUST GO|dog food|Y2K survival kits|Work from home|While we last|running SLOW/);
  });
});
