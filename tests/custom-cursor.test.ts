import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { advanceEra, createPlaytestState, getUnlockedFeatureIds, isFeatureRetired } from '../src/engine';
import type { GameState } from '../src/engine';
import { CURSOR_TIERS, describeNextCursorTier, findCursorTier, findShownCursorTier } from '../src/ui/cursors';
import { renderSite } from '../src/ui/sites';

/** Custom cursors: a second run's 1997 buildable, five pointers, each worse than the last, until phones end it. */

const SEED = 71;
const NOW = 0;
const SECOND_RUN = 2;

const withCursor = (state: GameState, level: number): GameState => ({ ...state, runNumber: SECOND_RUN, featureLevels: { ...state.featureLevels, 'custom-cursor': level }, infections: [], popups: [] });

describe('the five cursors', () => {
  it('change at levels 1, 5, 15, 30 and 60', () => {
    assert.deepEqual(CURSOR_TIERS.map((tier) => tier.level), [1, 5, 15, 30, 60]);
    assert.equal(findCursorTier(0), null);
    assert.deepEqual([1, 4, 5, 14, 15, 29, 30, 59, 60, 200].map((level) => findCursorTier(level)?.name), [
      'Lime arrow', 'Lime arrow', 'Magic wand', 'Magic wand', 'Glitter arrow', 'Glitter arrow', 'Flaming sword', 'Flaming sword', 'Rainbow cat', 'Rainbow cat',
    ]);
  });

  it('get more outrageous: a trail from the third on, and the cat tops them all', () => {
    assert.deepEqual(CURSOR_TIERS.map((tier) => tier.trail), ['none', 'none', 'sparkles', 'fire', 'rainbow']);
    assert.equal(describeNextCursorTier(12), 'Level 15: Glitter arrow');
    assert.equal(describeNextCursorTier(60), 'Nothing could top this.');
    assert.equal(findShownCursorTier(0).name, 'Lime arrow');
  });
});

describe('the custom cursor feature', () => {
  it('only exists from the second run on', () => {
    const firstRun = createPlaytestState('homepage-1997', 'end', SEED, 'react');
    assert.ok(!getUnlockedFeatureIds(firstRun).includes('custom-cursor'));
    assert.ok(getUnlockedFeatureIds({ ...firstRun, runNumber: SECOND_RUN }).includes('custom-cursor'));
  });

  it('offers itself on the page, with what the next levels turn it into', () => {
    const page = renderSite(withCursor(createPlaytestState('homepage-1997', 'end', SEED, 'react'), 7), NOW);
    assert.match(page, /data-feature="custom-cursor"/);
    assert.match(page, /Get this cursor!/);
    assert.match(page, /Magic wand/);
    assert.match(page, /Level 15: Glitter arrow/);
  });

  it('retires in 2011: phones don’t have a cursor', () => {
    const end2005 = withCursor(createPlaytestState('web2-2005', 'end', SEED, 'react'), 60);
    assert.ok(!isFeatureRetired(end2005, 'custom-cursor'));
    assert.ok(isFeatureRetired(advanceEra(end2005), 'custom-cursor'));
  });
});
