import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceHazards,
  calculateAdValuePerAd,
  calculatePrivacyFine,
  chooseConsentBanner,
  createInitialGameState,
  createPlaytestState,
  dismissCookieBanner,
  getDefenseCopy,
  getUnlockedDefenseIds,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 5;
const NOW = 0;
const TOLERANCE = 1e-9;

function end2018(extra: readonly UpgradeId[] = []): GameState {
  const state = createPlaytestState('platform-2018', 'end', SEED, 'react');
  const without = state.purchasedUpgradeIds.filter((upgradeId) => !['legal-pages', 'retargeting-cookies', 'scroll-animations'].includes(upgradeId));
  return { ...state, hazardCountdownsMs: QUIET_HAZARDS, popups: [], infections: [], purchasedUpgradeIds: [...without, ...extra] };
}

describe('2018: legal pages and retargeting cookies', () => {
  const fined = (state: GameState): number => calculatePrivacyFine({ ...state, consentBanner: 'none' });

  it('a lawyer shrinks the fines to 40%', () => {
    assert.ok(Math.abs(fined(end2018(['legal-pages'])) / fined(end2018()) - 0.4) < TOLERANCE);
  });

  it('retargeting pays 30% more per ad, makes fines half as big again, and shows ads for what visitors already looked at', () => {
    const plain = end2018();
    const tracking = end2018(['retargeting-cookies']);
    assert.ok(Math.abs(calculateAdValuePerAd(tracking) / calculateAdValuePerAd(plain) - 1.3) < TOLERANCE);
    // Revenue is higher too, so the fine grows by more than the factor alone.
    assert.ok(fined(tracking) / fined(plain) > 1.5);
    assert.match(renderSite(tracking, NOW), /Still thinking about these shoes\?/);
    assert.doesNotMatch(renderSite(plain, NOW), /Still thinking about these shoes\?/);
  });

  it('puts the lawyer’s wall of links under the footer, and animates sections only once bought', () => {
    assert.match(renderSite(end2018(['legal-pages']), NOW), /Modern Slavery Statement/);
    assert.match(renderSite(end2018(['scroll-animations']), NOW), /has-scroll-reveal/);
    assert.doesNotMatch(renderSite(end2018(), NOW), /has-scroll-reveal/);
  });
});

describe('2018: the language switcher and the newsletter', () => {
  it('speaks one more language per level, and puts a globe in the menu', () => {
    const state = end2018();
    const at = (level: number): string => renderSite({ ...state, featureLevels: { ...state.featureLevels, 'language-switcher': level } }, NOW);
    assert.match(at(3), /4 languages/);
    assert.match(at(3), /🌐 EN ▾/);
    assert.doesNotMatch(at(0), /🌐 EN ▾/);
  });

  it('counts its readers by level', () => {
    const state = end2018();
    assert.match(renderSite({ ...state, featureLevels: { ...state.featureLevels, newsletter: 10 } }, NOW), /Join 12\.0K readers/);
  });
});

describe('switching pop-ups off completely', () => {
  const withAds: GameState = { ...createInitialGameState(SEED), eraId: 'web2-2005', adCount: 6, hazardCountdownsMs: { ...QUIET_HAZARDS, popup: 1 } };

  it('is on offer from 2005, under each era’s name', () => {
    assert.ok(!getUnlockedDefenseIds(createInitialGameState(SEED)).includes('no-popups'));
    assert.ok(getUnlockedDefenseIds(withAds).includes('no-popups'));
    assert.equal(getDefenseCopy('no-popups', 'social-2011').name, 'No-overlays clause');
    assert.equal(getDefenseCopy('no-popups', 'platform-2018').name, 'Better-ads pledge');
  });

  it('stops every pop-up while it is on, for a cut of what ads pay', () => {
    const banned = { ...withAds, ownedDefenseIds: ['no-popups' as const], enabledDefenseIds: ['no-popups' as const] };
    assert.equal(advanceHazards(withAds, 60_000).state.popups.length, 1);
    assert.equal(advanceHazards(banned, 60_000).state.popups.length, 0);
    assert.ok(Math.abs(calculateAdValuePerAd(banned) / calculateAdValuePerAd(withAds) - 0.8) < TOLERANCE);
  });
});

describe('the cookie banner on your own site', () => {
  const in2018: GameState = { ...createInitialGameState(SEED), eraId: 'platform-2018', consentBanner: 'honest' };

  it('closes once answered, stays closed for the same banner, and asks again for a new one', () => {
    const answered = dismissCookieBanner(in2018);
    assert.equal(answered.isCookieBannerDismissed, true);
    assert.equal(chooseConsentBanner(answered, 'honest').isCookieBannerDismissed, true);
    assert.equal(chooseConsentBanner(answered, 'dark-pattern').isCookieBannerDismissed, false);
  });
});
