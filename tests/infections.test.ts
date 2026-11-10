import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateMsUntilVirusGrows,
  calculateRequiredVirusFood,
  createInitialGameState,
  removeVirus,
  scrubInfection,
  SPAM_CLEAN_CLICKS,
  VIRUS_FOOD_STEP_MS,
} from '../src/engine';
import type { GameState, ClickInfection, VirusInfection } from '../src/engine';

const virusAged = (ageMs: number): VirusInfection => ({ id: 7, kind: 'virus', featureId: 'guestbook', ageMs });
const spam: ClickInfection = { id: 8, kind: 'spam', featureId: 'comments', cleanClicksRemaining: SPAM_CLEAN_CLICKS, ageMs: 0 };
const withInfections = (infections: GameState['infections']): GameState => ({ ...createInitialGameState(1), infections });

describe('virus growth', () => {
  it('starts at one food', () => assert.equal(calculateRequiredVirusFood(virusAged(0)), 1));
  it('needs two food after 2:30', () => assert.equal(calculateRequiredVirusFood(virusAged(VIRUS_FOOD_STEP_MS)), 2));
  it('needs three food after 5:00', () => assert.equal(calculateRequiredVirusFood(virusAged(VIRUS_FOOD_STEP_MS * 2)), 3));
  it('never needs more than three', () => assert.equal(calculateRequiredVirusFood(virusAged(VIRUS_FOOD_STEP_MS * 10)), 3));
  it('counts down to the next growth step', () => assert.equal(calculateMsUntilVirusGrows(virusAged(1_000)), VIRUS_FOOD_STEP_MS - 1_000));
  it('stops counting once fully grown', () => assert.equal(calculateMsUntilVirusGrows(virusAged(VIRUS_FOOD_STEP_MS * 2)), null));
});

describe('cleaning infections', () => {
  it('removes a virus when the snake wins', () => {
    const step = removeVirus(withInfections([virusAged(0)]), 7);
    assert.equal(step.state.infections.length, 0);
    assert.equal(step.events.length, 1);
  });

  it('does nothing for an unknown virus', () => {
    const state = withInfections([spam]);
    assert.equal(removeVirus(state, 8).state, state);
  });

  it('ignores clicks on a virus', () => {
    const step = scrubInfection(withInfections([virusAged(0)]), 7);
    assert.equal(step.state.infections.length, 1);
  });

  it('removes spam after enough clicks', () => {
    const clicks = Array.from({ length: SPAM_CLEAN_CLICKS });
    const cleaned = clicks.reduce<GameState>((state) => scrubInfection(state, 8).state, withInfections([spam]));
    assert.equal(cleaned.infections.length, 0);
  });
});
