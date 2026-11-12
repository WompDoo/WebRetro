import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BASE_BUG_CHANCE, calculateBugChance, calculateKeystrokeValue, calculateNetRevenuePerSecond, createPlaytestState } from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';

const SEED = 5;
const PRECISION = 9;
const with2018 = (skills: readonly UpgradeId[]): GameState => {
  const start = createPlaytestState('platform-2018', 'start', SEED, 'react');
  const earlier = start.purchasedUpgradeIds.filter((id) => !['learn-react', 'learn-angular', 'learn-vue', 'learn-oauth', 'ci-pipeline'].includes(id));
  return { ...start, purchasedUpgradeIds: [...earlier, ...skills] };
};
const ratio = (after: GameState, before: GameState): number => calculateKeystrokeValue(after) / calculateKeystrokeValue(before);

describe('typing: every era has its own tools', () => {
  it('multiplies a keystroke’s whole value, revenue share included, by this era’s typing skills', () => {
    const end2005 = createPlaytestState('web2-2005', 'end', SEED, 'react');
    const withoutJ2ee = { ...end2005, purchasedUpgradeIds: end2005.purchasedUpgradeIds.filter((id) => id !== 'j2ee') };
    assert.equal(ratio(end2005, withoutJ2ee).toFixed(PRECISION), (1.3).toFixed(PRECISION));
  });

  it('leaves earlier eras’ typing skills behind: a 1997 trick does nothing in a 2018 editor', () => {
    const plain = with2018([]);
    const withViewSource = { ...plain, purchasedUpgradeIds: [...plain.purchasedUpgradeIds.filter((id) => id !== 'view-source'), 'view-source' as const] };
    const withoutViewSource = { ...plain, purchasedUpgradeIds: plain.purchasedUpgradeIds.filter((id) => id !== 'view-source') };
    assert.equal(calculateKeystrokeValue(withViewSource), calculateKeystrokeValue(withoutViewSource));
  });

  it('makes the frameworks type differently: per dollar of revenue, React’s keystrokes pay most and Vue’s least', () => {
    const value = (skill: UpgradeId): number => calculateKeystrokeValue(with2018([skill])) / calculateNetRevenuePerSecond(with2018([skill]));
    assert.ok(value('learn-react') > value('learn-angular'));
    assert.ok(value('learn-angular') > value('learn-vue'));
  });
});

describe('typos: every era starts over with new tools', () => {
  it('starts each era at the base typo chance, and only this era’s tools cut it', () => {
    assert.equal(calculateBugChance(with2018([])), BASE_BUG_CHANCE);
    assert.ok(calculateBugChance(with2018(['learn-angular'])) < calculateBugChance(with2018(['learn-react'])));
  });

  it('never lets an earlier era’s typo tools push a new era to the floor', () => {
    const end2005 = createPlaytestState('web2-2005', 'end', SEED, 'react');
    const start2011 = createPlaytestState('social-2011', 'start', SEED, 'react');
    assert.ok(calculateBugChance(end2005) < BASE_BUG_CHANCE);
    assert.equal(calculateBugChance(start2011), BASE_BUG_CHANCE);
  });
});
