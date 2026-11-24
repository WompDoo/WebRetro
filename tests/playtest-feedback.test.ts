import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { advanceSimulation, calculateNetRevenuePerSecond, calculateNextAdGain, closeOpportunity, createPlaytestState, openOpportunity } from '../src/engine';
import type { GameState } from '../src/engine';
import { countAffordable, listAffordableKeys } from '../src/ui/render-shop';
import { findNavSelector } from '../src/ui/site-nav';
import { QUIET_HAZARDS } from './quiet-hazards';

/**
 * What a human playtest found: offers that vanished mid-minigame, badges that nagged about what you'd chosen not to
 * buy, a menu that did nothing, and an ad card that only said what a banner costs.
 */

const SEED = 41;
const TICK_MS = 1_000;
const at = (eraId: Parameters<typeof createPlaytestState>[0]): GameState => ({ ...createPlaytestState(eraId, 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS });

describe('an offer while its window is open', () => {
  const withOffer = (state: GameState): GameState => ({ ...state, opportunity: { id: 99, kind: 'sponsor-slot', remainingMs: TICK_MS, isOpen: false } });

  it('waits for the player: the clock stops while the minigame is open, and runs again once it closes', () => {
    const open = openOpportunity(withOffer(at('web2-2005')), 99);
    const later = advanceSimulation(open, TICK_MS * 5, 'live').state;
    assert.equal(later.opportunity?.id, 99, 'still there');
    assert.equal(later.opportunity?.remainingMs, TICK_MS);
    const closed = advanceSimulation(closeOpportunity(later, 99), TICK_MS * 2, 'live').state;
    assert.equal(closed.opportunity, null, 'gone once it ran out with the window shut');
  });

  it('leaves anything that isn’t the offer alone', () => {
    const state = withOffer(at('web2-2005'));
    assert.equal(openOpportunity(state, 7), state);
  });
});

describe('the ad card’s verdict', () => {
  it('says what one more banner adds, after the visitors it drives away', () => {
    const state = { ...at('web2-2005'), adCount: 0 };
    const gain = calculateNextAdGain(state);
    assert.equal(gain, calculateNetRevenuePerSecond({ ...state, adCount: 1 }) - calculateNetRevenuePerSecond(state));
  });
});

describe('the shop’s tab badges', () => {
  it('count what you could buy and haven’t seen while you could', () => {
    const state = { ...at('web2-2005'), money: 1e15 };
    const keys = listAffordableKeys(state, 'security');
    assert.ok(keys.includes('place-ad:ad'), keys.join(', '));
    assert.equal(countAffordable(state, 'security'), keys.length);
    assert.equal(countAffordable(state, 'security', new Set(keys)), 0, 'seen once, never nagged about again');
    assert.equal(countAffordable(state, 'security', new Set(['place-ad:ad'])), keys.length - 1);
  });
});

describe('the site’s menu', () => {
  it('takes each link to what it names, Home to the top, and anything else to the specialization', () => {
    assert.equal(findNavSelector('Home'), null);
    assert.equal(findNavSelector('Blog'), '[data-feature="blog"]');
    assert.equal(findNavSelector('Pricing'), '[data-feature="pricing-table"]');
    assert.equal(findNavSelector('Careers'), 'footer, .site-footer');
    assert.equal(findNavSelector('Top charts'), '.spec-block');
  });
});
