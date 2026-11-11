import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceHazards,
  calculateDemandVisitorsPerSecond,
  calculateInfectionDifficulty,
  calculateMsUntilHarder,
  cleanInfection,
  createInitialGameState,
  INFECTION_DIFFICULTY_STEP_MS,
  INFECTION_MINIGAMES,
  pickMinigame,
  QUICK_FIX_BONUS_MS,
  QUICK_FIX_WINDOW_MS,
  restoreGameState,
  SAVE_VERSION,
} from '../src/engine';
import type { GameState, Infection } from '../src/engine';
import { QUIET_HAZARDS } from './quiet-hazards';

const virusAged = (ageMs: number): Infection => ({ id: 7, kind: 'virus', featureId: 'guestbook', ageMs, minigameId: 'snake' });
const spamAged = (ageMs: number): Infection => ({ id: 8, kind: 'spam', featureId: 'comments', ageMs, minigameId: 'spam-sort' });
const withInfections = (infections: GameState['infections']): GameState => ({
  ...createInitialGameState(1),
  hazardCountdownsMs: QUIET_HAZARDS,
  featureLevels: { ...createInitialGameState(1).featureLevels, 'hit-counter': 5, guestbook: 3 },
  infections,
});

describe('infection difficulty', () => {
  it('starts at 1', () => assert.equal(calculateInfectionDifficulty(virusAged(0)), 1));
  it('reaches 2 after 2:30', () => assert.equal(calculateInfectionDifficulty(virusAged(INFECTION_DIFFICULTY_STEP_MS)), 2));
  it('reaches 3 after 5:00', () => assert.equal(calculateInfectionDifficulty(virusAged(INFECTION_DIFFICULTY_STEP_MS * 2)), 3));
  it('never goes past 3', () => assert.equal(calculateInfectionDifficulty(virusAged(INFECTION_DIFFICULTY_STEP_MS * 10)), 3));
  it('grows the same way for spam', () => assert.equal(calculateInfectionDifficulty(spamAged(INFECTION_DIFFICULTY_STEP_MS)), 2));
  it('counts down to the next step', () => assert.equal(calculateMsUntilHarder(virusAged(1_000)), INFECTION_DIFFICULTY_STEP_MS - 1_000));
  it('stops counting at the hardest', () => assert.equal(calculateMsUntilHarder(virusAged(INFECTION_DIFFICULTY_STEP_MS * 2)), null));
});

describe('which game a botnet loads', () => {
  it('rolls between closing the gates and crossing the traffic', () => {
    assert.deepEqual([0, 0.99].map((roll) => pickMinigame('ddos', roll)), ['close-gates', 'cross-traffic']);
  });

  it('always gives the single-game kinds their game', () => {
    assert.deepEqual([0, 0.5, 0.99].map((roll) => pickMinigame('spam', roll)), ['spam-sort', 'spam-sort', 'spam-sort']);
  });
});

describe('which game a virus loads', () => {
  it('spreads the roll evenly over the three games', () => {
    const picks = [0, 0.34, 0.67, 0.99].map((roll) => pickMinigame('virus', roll));
    assert.deepEqual(picks, ['snake', 'virus-scan', 'firewall', 'firewall']);
    assert.equal(new Set(INFECTION_MINIGAMES.virus).size, 3);
  });

  it('rolls a game when a virus appears, and every game shows up over many viruses', () => {
    const seen = new Set<string>();
    let state: GameState = { ...withInfections([]), hazardCountdownsMs: { ...QUIET_HAZARDS, virus: 1 } };
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const step = advanceHazards({ ...state, infections: [], hazardCountdownsMs: { ...QUIET_HAZARDS, virus: 1 } }, 10);
      step.state.infections.forEach((infection) => seen.add(infection.minigameId));
      state = step.state;
    }
    assert.deepEqual([...seen].sort(), [...INFECTION_MINIGAMES.virus].sort());
  });
});

describe('cleaning an infection', () => {
  it('removes it and posts what happened', () => {
    const step = cleanInfection(withInfections([virusAged(QUICK_FIX_WINDOW_MS + 1)]), 7);
    assert.equal(step.state.infections.length, 0);
    assert.equal(step.events.length, 1);
    assert.equal(step.state.quickFixBonusRemainingMs, 0);
  });

  it('does nothing for an unknown infection', () => {
    const state = withInfections([spamAged(0)]);
    assert.equal(cleanInfection(state, 99).state, state);
  });

  it('rewards a quick fix with a short traffic bonus', () => {
    const before = withInfections([virusAged(QUICK_FIX_WINDOW_MS - 1)]);
    const step = cleanInfection(before, 7);
    assert.equal(step.state.quickFixBonusRemainingMs, QUICK_FIX_BONUS_MS);
    assert.ok(step.events.some((event) => event.message.startsWith('Quick fix')));
    assert.ok(calculateDemandVisitorsPerSecond(step.state) > calculateDemandVisitorsPerSecond({ ...step.state, quickFixBonusRemainingMs: 0 }));
  });

  it('the bonus runs out', () => {
    const boosted = { ...withInfections([]), quickFixBonusRemainingMs: QUICK_FIX_BONUS_MS };
    assert.equal(advanceHazards(boosted, QUICK_FIX_BONUS_MS).state.quickFixBonusRemainingMs, 0);
  });
});

describe('loading a save from before the minigames', () => {
  it('gives an old virus the snake and an old spam flood the sorter, and drops unknown upgrades', () => {
    const oldSave = {
      ...withInfections([]),
      saveVersion: SAVE_VERSION,
      purchasedUpgradeIds: ['img-tag', 'renamed-long-ago'],
      infections: [
        { id: 1, kind: 'virus', featureId: 'guestbook', ageMs: 0 },
        { id: 2, kind: 'spam', featureId: 'comments', ageMs: 0, cleanClicksRemaining: 4 },
      ],
    };
    const restored = restoreGameState(JSON.parse(JSON.stringify(oldSave)), 1);
    assert.deepEqual(restored?.infections.map((infection) => infection.minigameId), ['snake', 'spam-sort']);
    assert.deepEqual(restored?.purchasedUpgradeIds, ['img-tag']);
  });
});
