import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findFirstOpenBlock,
  mergeConflictStatus,
  pickConflictBlocks,
  pickResolution,
  startMergeConflict,
  tickMergeConflict,
  WRONG_PICK_PENALTY_MS,
} from '../src/engine';
import type { ConflictPick, MergeConflict } from '../src/engine';

const ANSWERS: readonly ConflictPick[] = ['theirs', 'both', 'ours'];
const fresh = (): MergeConflict => startMergeConflict(ANSWERS);
const solve = (game: MergeConflict): MergeConflict => ANSWERS.reduce((current, answer, index) => pickResolution(current, index, answer), game);

describe('merge conflicts', () => {
  it('run from the moment they open: reading is the game', () => {
    assert.equal(mergeConflictStatus(fresh()), 'running');
    assert.ok(tickMergeConflict(fresh(), 1_000).elapsedMs > 0);
  });

  it('are won by the right pick for every block, in any order', () => {
    const backwards = [2, 1, 0].reduce((game, index) => pickResolution(game, index, ANSWERS[index] ?? 'ours'), fresh());
    assert.equal(mergeConflictStatus(backwards), 'won');
    assert.equal(mergeConflictStatus(solve(fresh())), 'won');
  });

  it('charge time for a wrong pick, and leave the block open', () => {
    const wrong = pickResolution(fresh(), 0, 'ours');
    assert.equal(wrong.elapsedMs, WRONG_PICK_PENALTY_MS);
    assert.equal(wrong.mistakes, 1);
    assert.equal(wrong.resolved[0], false);
  });

  it('are lost when the clock runs out, and take no picks after', () => {
    const late = tickMergeConflict(fresh(), fresh().limitMs);
    assert.equal(mergeConflictStatus(late), 'lost');
    assert.equal(pickResolution(late, 0, 'theirs'), late);
  });

  it('ignore a second pick on a block that is already merged', () => {
    const once = pickResolution(fresh(), 0, 'theirs');
    assert.equal(pickResolution(once, 0, 'ours'), once);
  });

  it('send the keyboard to the first open block', () => {
    assert.equal(findFirstOpenBlock(pickResolution(fresh(), 0, 'theirs')), 1);
  });

  it('show a few different blocks from the pool, the same ones for the same seed', () => {
    const picked = pickConflictBlocks(6, 3, 42);
    assert.equal(new Set(picked).size, 3);
    assert.ok(picked.every((index) => index >= 0 && index < 6));
    assert.deepEqual(pickConflictBlocks(6, 3, 42), picked);
    const variety = new Set(Array.from({ length: 20 }, (_, seed) => pickConflictBlocks(6, 3, seed + 1).join(',')));
    assert.ok(variety.size > 10, `only ${variety.size} different sets`);
  });
});
