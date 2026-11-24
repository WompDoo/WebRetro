import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  buyFeature,
  calculateAdsGain,
  calculateNetRevenuePerSecond,
  calculateNextAdGain,
  canChooseSpecialization,
  closeOpportunity,
  createPlaytestState,
  findAdRoom,
  hasSupportersToLose,
  isSpecializationInView,
  openOpportunity,
  TREE_IDS,
} from '../src/engine';
import type { GameState } from '../src/engine';
import { countAffordable, findSeenKeys, listAffordableKeys, renderShopBody } from '../src/ui/render-shop';
import { rememberSeenKey } from '../src/ui/shop-seen';
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
  const NO_ADS = 0;
  const VIEW = { isScrollJackingOn: true, foundSpecializationIds: [] };

  it('says what one more banner adds, after the visitors it drives away', () => {
    const state = { ...at('web2-2005'), adCount: NO_ADS };
    const gain = calculateNextAdGain(state);
    assert.equal(gain, calculateNetRevenuePerSecond({ ...state, adCount: 1 }) - calculateNetRevenuePerSecond(state));
    assert.equal(calculateAdsGain(state, 1), gain);
  });

  it('says when it’s the supporters a banner drives off, and what a full page would do once they’ve gone', () => {
    const supported = { ...at('web2-2005'), adCount: NO_ADS };
    assert.ok(hasSupportersToLose(supported), 'a 2005 site with its tip jar and pro accounts');
    assert.ok(calculateNextAdGain(supported) < 0);
    const card = renderShopBody(supported, 'security', VIEW);
    assert.match(card, /Next banner: −\$[^:]+: each one drives off 25% of your supporters/);
    const room = findAdRoom(supported);
    assert.match(card, new RegExp(`A full page \\(${room} more\\): [+−]\\$`));
    assert.equal(hasSupportersToLose({ ...supported, adCount: 4 }), false, 'four banners, and they’re all gone');
  });
});

describe('the shop’s tab badges', () => {
  const rich = (): GameState => ({ ...at('web2-2005'), money: 1e15 });

  it('count what you could buy and haven’t seen while you could', () => {
    const state = rich();
    const keys = listAffordableKeys(state, 'security');
    const nextBanner = `place-ad:ad#${state.adCount}`;
    assert.ok(keys.includes(nextBanner), keys.join(', '));
    assert.equal(countAffordable(state, 'security'), keys.length);
    assert.equal(countAffordable(state, 'security', new Set(keys)), 0, 'seen once, not nagged about again');
    assert.equal(countAffordable(state, 'security', new Set([nextBanner])), keys.length - 1);
  });

  it('count the next level of a feature again once the last one is bought', () => {
    const state = rich();
    const seen = new Set(listAffordableKeys(state, 'build'));
    assert.equal(countAffordable(state, 'build', seen), 0);
    assert.equal(countAffordable(buyFeature(state, 'blog'), 'build', seen), 1, 'the blog’s next level is news');
  });

  it('see a card on screen only as what can be bought right now', () => {
    const state = rich();
    assert.deepEqual(findSeenKeys(state, 'build', ['buy-feature:blog']), [`buy-feature:blog#${state.featureLevels.blog}`]);
    assert.deepEqual(findSeenKeys({ ...state, money: 0 }, 'build', ['buy-feature:blog']), [], 'can’t afford it: not seen as anything yet');
  });

  it('keep one seen key per card, the latest', () => {
    const seen = new Set(['buy-feature:blog#3', 'buy-upgrade:learn-css']);
    assert.ok(rememberSeenKey(seen, 'buy-feature:blog#4'));
    assert.deepEqual([...seen].sort(), ['buy-feature:blog#4', 'buy-upgrade:learn-css']);
    assert.equal(rememberSeenKey(seen, 'buy-feature:blog#4'), false);
  });

  it('count a specialization card coming into view, and again when it can be chosen', () => {
    const state: GameState = { ...at('web2-2005'), runNumber: 2, unlockedSpecializationIds: ['photos'] };
    const inView = TREE_IDS.filter((id) => isSpecializationInView(state, id, []));
    assert.deepEqual(inView, ['photos'], 'an unlocked specialization is in view');
    const keys = listAffordableKeys(state, 'specialize');
    inView.forEach((id) => assert.ok(keys.includes(`spec-card:${id}`), id));
    TREE_IDS.filter((id) => canChooseSpecialization(state, id)).forEach((id) => assert.ok(keys.includes(`open-specialization:${id}`), id));
    assert.deepEqual(findSeenKeys(state, 'specialize', inView.map((id) => `spec-card:${id}`)).length, inView.length);
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
