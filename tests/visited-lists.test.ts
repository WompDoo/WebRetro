import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, ERAS_BY_ID, FEATURES_BY_ID, FEATURE_IDS, formatPercent, getFeatureDisplayName } from '../src/engine';
import type { GameState } from '../src/engine';
import { LEARN_LINKS } from '../src/ui/learn-links';
import { describeWhatItDid, renderShopBody } from '../src/ui/render-shop';

const SEED = 21;
const VIEW = { buyAmount: 1, isScrollJackingOn: false } as const;

const endOf1997 = (): GameState => createPlaytestState('homepage-1997', 'end', SEED, 'react');
const startOf2005 = (): GameState => createPlaytestState('web2-2005', 'start', SEED, 'react');

describe('what everything you have did', () => {
  it('keeps every bought link exactly as it was', () => {
    const shop = renderShopBody(endOf1997(), 'upgrades', VIEW);
    assert.ok(shop.includes(`<a class="visited-link" href="${LEARN_LINKS['view-source'] ?? ''}" target="_blank" rel="noopener noreferrer"`));
  });

  it('says under each one what its shop row said: effects and what it unlocked', () => {
    const shop = renderShopBody(endOf1997(), 'upgrades', VIEW);
    assert.match(shop, /View Source on cool sites<\/a><span class="visited-effect">Typing earns ×2 this era<\/span>/);
    const unlocked = FEATURE_IDS.filter((featureId) => FEATURES_BY_ID[featureId].requiredSkillId === 'img-tag').map((featureId) => getFeatureDisplayName(featureId, 'homepage-1997'));
    const imgTag = describeWhatItDid(endOf1997(), 'img-tag');
    assert.ok(imgTag.startsWith(`Unlocks: ${unlocked.join(', ')}, ${ERAS_BY_ID['homepage-1997'].adLabel}s · `), imgTag);
    assert.ok(imgTag.endsWith('Typing earns ×1.5 this era'), imgTag);
  });

  it('keeps this era open and folds earlier eras under their year', () => {
    const learn = renderShopBody({ ...startOf2005(), purchasedUpgradeIds: [...startOf2005().purchasedUpgradeIds, 'learn-css'] }, 'learn', VIEW);
    assert.match(learn, /<details class="visited-era"><summary>From 1997 · \d+<\/summary>/);
    assert.ok(learn.indexOf('Learn CSS') < learn.indexOf('<details class="visited-era">'), 'this era comes first, outside the fold');
  });

  it('says what has gone out of fashion since', () => {
    assert.match(describeWhatItDid(startOf2005(), 'animated-gif-pack'), /All traffic ×1\.05 · out of fashion now$/);
    assert.doesNotMatch(describeWhatItDid(endOf1997(), 'animated-gif-pack'), /out of fashion/);
  });

  it('never rounds a small share away: JavaScript’s 0.15% of revenue says 0.15%, not 0%', () => {
    assert.equal(formatPercent(0.0015), '0.15%');
    assert.equal(formatPercent(0.004), '0.4%');
    assert.equal(formatPercent(0.15), '15%');
    assert.equal(formatPercent(0), '0%');
    assert.match(describeWhatItDid(endOf1997(), 'learn-javascript'), /earns 0\.15% of your revenue/);
  });
});
