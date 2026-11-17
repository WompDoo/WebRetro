import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addPlaytestIncome,
  addPlaytestInfection,
  addPlaytestPopup,
  calculateNetRevenuePerSecond,
  calculateServerLoad,
  ERA_IDS,
  ERAS_BY_ID,
  getEraIndex,
  isEraGateComplete,
  startPlaytestTrafficSpike,
  UPGRADES_BY_ID,
  createPlaytestState,
  MINIGAME_IDS,
  claimOpportunity,
  isBuffActive,
  offerPlaytestOpportunity,
  setPlaytestCursorLevel,
} from '../src/engine';
import { renderPlaytestPanel } from '../src/ui/playtest';

const SEED = 7;

describe('playtest presets', () => {
  ERA_IDS.forEach((eraId) => {
    it(`${eraId}: the end preset passes the era's checklist without overloading the server`, () => {
      const state = createPlaytestState(eraId, 'end', SEED, 'react');
      assert.equal(state.eraId, eraId);
      assert.ok(isEraGateComplete(state), `gate not complete for ${eraId}`);
      assert.ok(calculateServerLoad(state) < 1, `server overloaded for ${eraId}`);
    });

    it(`${eraId}: the start preset knows every earlier skill and none of this era's`, () => {
      const state = createPlaytestState(eraId, 'start', SEED, 'react');
      assert.equal(state.eraId, eraId);
      state.purchasedUpgradeIds.forEach((upgradeId) => assert.ok(getEraIndex(UPGRADES_BY_ID[upgradeId].eraId) < getEraIndex(eraId), upgradeId));
      assert.ok(!isEraGateComplete(state));
    });
  });

  it('starts 1997 as a brand new game', () => {
    const state = createPlaytestState('homepage-1997', 'start', SEED, 'react');
    assert.deepEqual(state.purchasedUpgradeIds, []);
    assert.equal(state.money, 0);
  });

  it('gives a later era a minute of income to start with', () => {
    const state = createPlaytestState('web2-2005', 'start', SEED, 'react');
    assert.ok(state.money > 0);
    assert.ok(Math.abs(state.money - calculateNetRevenuePerSecond(state) * 60) < 1);
  });

  it('leaves the end preset exactly enough money to relaunch', () => {
    ERA_IDS.forEach((eraId) => assert.equal(createPlaytestState(eraId, 'end', SEED, 'react').money, ERAS_BY_ID[eraId].migrationCost));
  });
});

describe('playtest cheats', () => {
  it('adds the income of the given time', () => {
    const state = createPlaytestState('web2-2005', 'start', SEED, 'react');
    const ahead = addPlaytestIncome(state, 600);
    assert.ok(Math.abs(ahead.money - state.money - calculateNetRevenuePerSecond(state) * 600) < 1);
  });

  it('spawns an infection with exactly the minigame asked for, on a built feature', () => {
    const state = createPlaytestState('social-2011', 'start', SEED, 'react');
    MINIGAME_IDS.forEach((minigameId) => {
      const result = addPlaytestInfection(state, minigameId);
      const infection = result.state.infections.find((candidate) => candidate.id === result.infectionId);
      assert.equal(infection?.minigameId, minigameId);
      assert.ok((result.state.featureLevels[infection?.featureId ?? 'hit-counter'] ?? 0) > 0);
    });
  });

  it('cannot infect a site with nothing built', () => {
    assert.equal(addPlaytestInfection(createPlaytestState('homepage-1997', 'start', SEED, 'react'), 'snake').infectionId, null);
  });

  it('adds pop-ups, and traffic spikes only where there is a server', () => {
    assert.equal(addPlaytestPopup(createPlaytestState('homepage-1997', 'start', SEED, 'react'), 0.3).popups.length, 1);
    assert.equal(startPlaytestTrafficSpike(createPlaytestState('homepage-1997', 'end', SEED, 'react')).trafficSpikeRemainingMs, 0);
    assert.ok(startPlaytestTrafficSpike(createPlaytestState('web2-2005', 'start', SEED, 'react')).trafficSpikeRemainingMs > 0);
  });

  it('brings an offer now, and winning it starts its buff like a real one', () => {
    const offered = offerPlaytestOpportunity(createPlaytestState('web2-2005', 'end', SEED, 'react'), 'sponsor-slot');
    assert.equal(offered.opportunity?.kind, 'sponsor-slot');
    const won = claimOpportunity(offered, offered.opportunity?.id ?? -1).state;
    assert.ok(isBuffActive(won, 'sponsor-slot'));
  });

  it('sets the custom cursor’s level, and makes a first run the second the cursor needs', () => {
    const cursor = setPlaytestCursorLevel(createPlaytestState('homepage-1997', 'start', SEED, 'react'), 30);
    assert.equal(cursor.featureLevels['custom-cursor'], 30);
    assert.equal(cursor.runNumber, 2);
    assert.equal(setPlaytestCursorLevel({ ...cursor, runNumber: 3 }, 5).runNumber, 3, 'never back to an earlier run');
  });
});

describe('the playtest panel', () => {
  const view = { speed: 1, hasBackup: false } as const;

  it('starts every buff, and offers a sponsor only to a site with banners', () => {
    const noAds = renderPlaytestPanel(createPlaytestState('homepage-1997', 'start', SEED, 'react'), view);
    assert.match(noAds, /data-action="playtest-buff" data-id="on-fire"/);
    assert.match(noAds, /data-action="playtest-offer" data-id="sponsor-slot" disabled title="No banners to sponsor yet/);
    const ads = renderPlaytestPanel(createPlaytestState('web2-2005', 'end', SEED, 'react'), view);
    assert.doesNotMatch(ads, /data-id="sponsor-slot" disabled/);
  });

  it('has a button per cursor tier, the current one pressed', () => {
    const html = renderPlaytestPanel(setPlaytestCursorLevel(createPlaytestState('homepage-1997', 'start', SEED, 'react'), 15), view);
    ['0', '1', '5', '15', '30', '60'].forEach((level) => assert.match(html, new RegExp(`data-action="playtest-cursor" data-id="${level}"`)));
    assert.match(html, /data-id="15" aria-pressed="true">15: Glitter arrow/);
  });
});
