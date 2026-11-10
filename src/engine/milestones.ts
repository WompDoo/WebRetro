import { FREELANCE_REFERENCE_KEYSTROKES_PER_SECOND } from './constants';
import { calculateKeystrokeValue, calculateNetRevenuePerSecond } from './economy';
import type { GameState, GameStep, MilestoneId } from './types';

interface MilestoneDefinition {
  readonly id: MilestoneId;
  readonly message: string;
  readonly isReached: (state: GameState) => boolean;
}

const FIRST_VISITOR = 1;

const MILESTONES: readonly MilestoneDefinition[] = [
  {
    id: 'first-visitor',
    message: 'Your first visitor arrived. It was probably you.',
    isReached: (state) => state.lifetimeVisitors >= FIRST_VISITOR,
  },
  {
    id: 'first-revenue',
    message: 'Your site earned its first cent.',
    isReached: (state) => calculateNetRevenuePerSecond(state) > 0,
  },
  {
    id: 'quit-day-job',
    message: 'Your site now earns more than freelancing. Time to quit your day job.',
    isReached: (state) =>
      calculateNetRevenuePerSecond(state) >
      calculateKeystrokeValue(state) * FREELANCE_REFERENCE_KEYSTROKES_PER_SECOND,
  },
];

export function checkMilestones(state: GameState): GameStep {
  const newlyReached = MILESTONES.filter(
    (milestone) => !state.reachedMilestoneIds.includes(milestone.id) && milestone.isReached(state),
  );
  return {
    state: {
      ...state,
      reachedMilestoneIds: [...state.reachedMilestoneIds, ...newlyReached.map((milestone) => milestone.id)],
    },
    events: newlyReached.map((milestone) => ({ kind: 'milestone', message: milestone.message })),
  };
}
