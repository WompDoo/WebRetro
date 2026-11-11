import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialGameState } from '../src/engine';
import type { GameState } from '../src/engine';
import { parsePreferences } from '../src/ui/persistence';
import { calculateShopSignature, renderShopBody } from '../src/ui/render-shop';
import type { ShopView } from '../src/ui/render-shop';
import { QUIET_HAZARDS } from './quiet-hazards';

const base = createInitialGameState(1);
const withOnePager = (level: number, switchedOff: boolean): GameState => ({
  ...base,
  eraId: 'social-2011',
  hazardCountdownsMs: QUIET_HAZARDS,
  purchasedUpgradeIds: ['learn-php', 'parallax-scrolling'],
  featureLevels: { ...base.featureLevels, 'one-pager': level },
  switchedOffFeatureIds: switchedOff ? ['one-pager'] : [],
});
const jacking: ShopView = { buyAmount: 1, isScrollJackingOn: true };
const reading: ShopView = { buyAmount: 1, isScrollJackingOn: false };
const SWITCH = 'data-action="toggle-scroll-jacking"';

describe('the scroll-jacking switch', () => {
  it('sits in the one-pager row while the story is on the page, showing which way it is', () => {
    const state = withOnePager(1, false);
    assert.match(renderShopBody(state, 'build', jacking), /data-action="toggle-scroll-jacking" data-id="one-pager" aria-pressed="true">On</);
    assert.match(renderShopBody(state, 'build', reading), /data-action="toggle-scroll-jacking" data-id="one-pager" aria-pressed="false">Off</);
    assert.ok(renderShopBody(state, 'build', reading).includes('normal scrolling, same visitors'));
  });

  it('keeps the story itself running when the scrolling is off: the feature switch stays on', () => {
    assert.match(renderShopBody(withOnePager(1, false), 'build', reading), /data-action="toggle-feature" data-id="one-pager" aria-pressed="true"/);
  });

  it('is gone while there is no story on the page: not built, or switched off', () => {
    assert.ok(!renderShopBody(withOnePager(0, false), 'build', jacking).includes(SWITCH));
    assert.ok(!renderShopBody(withOnePager(1, true), 'build', jacking).includes(SWITCH));
  });

  it('re-renders the shop when it is flipped', () => {
    const state = withOnePager(1, false);
    assert.notEqual(calculateShopSignature(state, 'build', jacking), calculateShopSignature(state, 'build', reading));
  });
});

describe('saved preferences', () => {
  it('reads back what was saved', () => {
    assert.deepEqual(parsePreferences('{"isScrollJackingOn":false}'), { isScrollJackingOn: false });
  });

  it('ignores anything of the wrong shape, so the defaults stand', () => {
    assert.equal(parsePreferences('{"isScrollJackingOn":"no"}'), null);
    assert.equal(parsePreferences('null'), null);
    assert.equal(parsePreferences('[]'), null);
  });
});
