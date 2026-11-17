import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState } from '../src/engine';
import type { GameState } from '../src/engine';
import { captureSiteSeen, countNewOnSite } from '../src/ui/site-news';

const SEED = 31;
const start1997 = (): GameState => createPlaytestState('homepage-1997', 'start', SEED, 'react');
const build = (state: GameState, featureId: 'guestbook' | 'hit-counter', level: number): GameState => ({ ...state, featureLevels: { ...state.featureLevels, [featureId]: level } });

describe('what’s new on the site, for the phone’s Site tab', () => {
  it('nothing, right after you’ve looked', () => {
    const state = build(start1997(), 'hit-counter', 3);
    assert.equal(countNewOnSite(state, captureSiteSeen(state)), 0);
  });

  it('counts each feature built and each banner added since', () => {
    const seen = captureSiteSeen(start1997());
    const later = { ...build(build(start1997(), 'hit-counter', 1), 'guestbook', 1), adCount: start1997().adCount + 2 };
    assert.equal(countNewOnSite(later, seen), 4);
  });

  it('doesn’t count another level of something already there, or taking a banner down', () => {
    const built = { ...build(start1997(), 'hit-counter', 1), adCount: 3 };
    const seen = captureSiteSeen(built);
    assert.equal(countNewOnSite({ ...build(built, 'hit-counter', 9), adCount: 1 }, seen), 0);
  });
});
