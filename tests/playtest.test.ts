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
} from '../src/engine';

const SEED = 7;

describe('playtest presets', () => {
  ERA_IDS.forEach((eraId) => {
    it(`${eraId}: the end preset passes the era's checklist without overloading the server`, () => {
      const state = createPlaytestState(eraId, 'end', SEED);
      assert.equal(state.eraId, eraId);
      assert.ok(isEraGateComplete(state), `gate not complete for ${eraId}`);
      assert.ok(calculateServerLoad(state) < 1, `server overloaded for ${eraId}`);
    });

    it(`${eraId}: the start preset knows every earlier skill and none of this era's`, () => {
      const state = createPlaytestState(eraId, 'start', SEED);
      assert.equal(state.eraId, eraId);
      state.purchasedUpgradeIds.forEach((upgradeId) => assert.ok(getEraIndex(UPGRADES_BY_ID[upgradeId].eraId) < getEraIndex(eraId), upgradeId));
      assert.ok(!isEraGateComplete(state));
    });
  });

  it('starts 1997 as a brand new game', () => {
    const state = createPlaytestState('homepage-1997', 'start', SEED);
    assert.deepEqual(state.purchasedUpgradeIds, []);
    assert.equal(state.money, 0);
  });

  it('gives a later era a minute of income to start with', () => {
    const state = createPlaytestState('web2-2005', 'start', SEED);
    assert.ok(state.money > 0);
    assert.ok(Math.abs(state.money - calculateNetRevenuePerSecond(state) * 60) < 1);
  });

  it('leaves the end preset exactly enough money to relaunch', () => {
    ERA_IDS.forEach((eraId) => assert.equal(createPlaytestState(eraId, 'end', SEED).money, ERAS_BY_ID[eraId].migrationCost));
  });
});

describe('playtest cheats', () => {
  it('adds the income of the given time', () => {
    const state = createPlaytestState('web2-2005', 'start', SEED);
    const ahead = addPlaytestIncome(state, 600);
    assert.ok(Math.abs(ahead.money - state.money - calculateNetRevenuePerSecond(state) * 600) < 1);
  });

  it('spawns an infection with exactly the minigame asked for, on a built feature', () => {
    const state = createPlaytestState('social-2011', 'start', SEED);
    MINIGAME_IDS.forEach((minigameId) => {
      const result = addPlaytestInfection(state, minigameId);
      const infection = result.state.infections.find((candidate) => candidate.id === result.infectionId);
      assert.equal(infection?.minigameId, minigameId);
      assert.ok((result.state.featureLevels[infection?.featureId ?? 'hit-counter'] ?? 0) > 0);
    });
  });

  it('cannot infect a site with nothing built', () => {
    assert.equal(addPlaytestInfection(createPlaytestState('homepage-1997', 'start', SEED), 'snake').infectionId, null);
  });

  it('adds pop-ups, and traffic spikes only where there is a server', () => {
    assert.equal(addPlaytestPopup(createPlaytestState('homepage-1997', 'start', SEED), 0.3).popups.length, 1);
    assert.equal(startPlaytestTrafficSpike(createPlaytestState('homepage-1997', 'end', SEED)).trafficSpikeRemainingMs, 0);
    assert.ok(startPlaytestTrafficSpike(createPlaytestState('web2-2005', 'start', SEED)).trafficSpikeRemainingMs > 0);
  });
});
