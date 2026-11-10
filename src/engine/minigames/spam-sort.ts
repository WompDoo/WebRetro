import { drawRandoms } from '../random';
import type { MinigameStatus } from './status';

export type SpamDecision = 'trash' | 'keep';

export interface SpamCard {
  readonly isSpam: boolean;
  /** Picks the comment's text. The words live in the UI; the engine only knows spam from not. */
  readonly textRoll: number;
}

/** One comment at a time: spam to the trash, real comments onto the page. */
export interface SpamSortGame {
  /** Still to sort; the first one is showing. */
  readonly cards: readonly SpamCard[];
  readonly total: number;
  readonly mistakes: number;
  /** What the last wrong move was, so the UI can say what went wrong. */
  readonly lastMistake: SpamDecision | null;
  readonly status: MinigameStatus;
}

const BASE_CARDS = 4;
const CARDS_PER_DIFFICULTY = 2;
const SPAM_SHARE = 0.6;
const ROLLS_PER_CARD = 2;
export const SPAM_SORT_MAX_MISTAKES = 3;

export function createSpamSortGame(difficulty: number, seed: number): SpamSortGame {
  const total = BASE_CARDS + CARDS_PER_DIFFICULTY * difficulty;
  const rolls = drawRandoms(seed, total * ROLLS_PER_CARD).values;
  const cards = Array.from({ length: total }, (_, index) => ({
    isSpam: (rolls[index * ROLLS_PER_CARD] ?? 0) < SPAM_SHARE,
    textRoll: rolls[index * ROLLS_PER_CARD + 1] ?? 0,
  }));
  return { cards, total, mistakes: 0, lastMistake: null, status: 'running' };
}

function isRightCall(card: SpamCard, decision: SpamDecision): boolean {
  return (decision === 'trash') === card.isSpam;
}

function recordMistake(game: SpamSortGame, decision: SpamDecision): SpamSortGame {
  const mistakes = game.mistakes + 1;
  return { ...game, mistakes, lastMistake: decision, status: mistakes >= SPAM_SORT_MAX_MISTAKES ? 'lost' : game.status };
}

/** Every card moves on, right or wrong. Sorting them all wins; too many wrong calls loses. */
export function sortSpamCard(game: SpamSortGame, decision: SpamDecision): SpamSortGame {
  const [card, ...rest] = game.cards;
  if (card === undefined || game.status !== 'running') return game;
  const judged = isRightCall(card, decision) ? { ...game, lastMistake: null } : recordMistake(game, decision);
  return { ...judged, cards: rest, status: judged.status === 'running' && rest.length === 0 ? 'won' : judged.status };
}
