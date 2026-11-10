import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buyFeature,
  buyUpgrade,
  canBuyFeature,
  canPlaceAd,
  createInitialGameState,
  getAvailableSkillIds,
  placeAd,
} from '../src/engine';
import type { GameState } from '../src/engine';

const RICH = 1_000_000;
const richGame = (): GameState => ({ ...createInitialGameState(1), money: RICH });

describe('learning skills', () => {
  it('starts with nothing learned and the whole 1997 curriculum visible', () => {
    const fresh = createInitialGameState(1);
    assert.equal(fresh.purchasedUpgradeIds.length, 0);
    assert.ok(getAvailableSkillIds(fresh).includes('img-tag'));
    assert.ok(!getAvailableSkillIds(fresh).includes('learn-php'), '2005 skills stay hidden in 1997');
  });

  it('locks a feature until its skill is learned', () => {
    const game = richGame();
    assert.equal(canBuyFeature(game, 'hit-counter'), false);
    assert.equal(buyFeature(game, 'hit-counter'), game);
    const learned = buyUpgrade(game, 'img-tag');
    assert.equal(canBuyFeature(learned, 'hit-counter'), true);
    assert.equal(buyFeature(learned, 'hit-counter').featureLevels['hit-counter'], 1);
  });

  it('needs CGI forms for the guestbook, not just pictures', () => {
    const withImages = buyUpgrade(richGame(), 'img-tag');
    assert.equal(canBuyFeature(withImages, 'guestbook'), false);
    assert.equal(canBuyFeature(buyUpgrade(withImages, 'cgi-forms'), 'guestbook'), true);
  });

  it('locks banner ads until you know the <IMG> tag', () => {
    const game = richGame();
    assert.equal(canPlaceAd(game), false);
    assert.equal(placeAd(game), game);
    assert.equal(placeAd(buyUpgrade(game, 'img-tag')).adCount, 1);
  });

  it('removes a learned skill from the curriculum', () => {
    const learned = buyUpgrade(richGame(), 'img-tag');
    assert.ok(!getAvailableSkillIds(learned).includes('img-tag'));
  });
});
