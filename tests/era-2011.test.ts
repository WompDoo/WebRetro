import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateDemandVisitorsPerSecond,
  calculateFeatureVisitorsPerSecond,
  calculateMobileTrafficFactor,
  calculatePageWeightKb,
  createInitialGameState,
  ERAS_BY_ID,
  isFeaturePluginDead,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { buildEditorSource } from '../src/ui/skill-code';
import { calculateMobileScore, gradePageSpeed } from '../src/ui/browser-chrome';

const QUIET_HAZARDS = { popup: 9e9, virus: 9e9, spam: 9e9, 'sql-injection': 9e9, 'traffic-spike': 9e9 };
const base = createInitialGameState(1);
const in2011 = (skills: readonly UpgradeId[] = []): GameState => ({
  ...base,
  eraId: 'social-2011',
  hazardCountdownsMs: QUIET_HAZARDS,
  purchasedUpgradeIds: ['learn-php', 'learn-flash', ...skills],
  featureLevels: { ...base.featureLevels, blog: 10, 'flash-intro': 2, 'midi-player': 5 },
});

describe('2011: phones', () => {
  it('sends most phone visitors away until the page fits their screen', () => {
    assert.ok(calculateMobileTrafficFactor(in2011()) < 1);
    assert.equal(calculateMobileTrafficFactor(in2011(['responsive-design'])), 1);
    assert.ok(calculateDemandVisitorsPerSecond(in2011(['responsive-design'])) > calculateDemandVisitorsPerSecond(in2011()));
  });

  it('had no phone visitors to lose in 1997 and 2005', () => {
    assert.equal(ERAS_BY_ID['homepage-1997'].mobileShare, 0);
    assert.equal(ERAS_BY_ID['web2-2005'].mobileShare, 0);
    assert.equal(calculateMobileTrafficFactor({ ...in2011(), eraId: 'web2-2005' }), 1);
  });

  it('scores the page on a phone low until it fits, then by speed', () => {
    assert.ok(calculateMobileScore(in2011(), 1) < 30);
    assert.ok(calculateMobileScore(in2011(['responsive-design']), 1) > 80);
    assert.ok(calculateMobileScore(in2011(['responsive-design']), 6) < calculateMobileScore(in2011(['responsive-design']), 1));
  });

  it('grades page speed A to F', () => {
    assert.deepEqual([0.5, 1.5, 2.5, 4, 7, 12].map(gradePageSpeed), ['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('2011: Flash is dead', () => {
  it('kills the Flash intro and the podcast player until HTML5 rebuilds them', () => {
    const dead = in2011();
    assert.ok(isFeaturePluginDead(dead, 'flash-intro'));
    assert.ok(isFeaturePluginDead(dead, 'midi-player'));
    assert.equal(calculateFeatureVisitorsPerSecond(dead, 'flash-intro'), 0);
    const rebuilt = in2011(['html5-media']);
    assert.ok(!isFeaturePluginDead(rebuilt, 'flash-intro'));
    assert.ok(calculateFeatureVisitorsPerSecond(rebuilt, 'flash-intro') > 0);
  });

  it('a dead plugin adds no page weight: browsers don’t download it', () => {
    assert.ok(calculatePageWeightKb(in2011()) < calculatePageWeightKb(in2011(['html5-media'])));
  });

  it('was alive in 2005', () => {
    assert.ok(!isFeaturePluginDead({ ...in2011(), eraId: 'web2-2005' }, 'flash-intro'));
  });
});

describe('2011: the era itself', () => {
  it('follows 2005 and is the last era of the prototype for now', () => {
    assert.equal(ERAS_BY_ID['web2-2005'].nextEraId, 'social-2011');
    assert.equal(ERAS_BY_ID['social-2011'].nextEraId, null);
  });

  it('types an HTML5 page that turns into Bootstrap, with media queries in style.css', () => {
    assert.match(buildEditorSource(in2011(), 'index.html'), /<!DOCTYPE html>/);
    assert.match(buildEditorSource(in2011(['learn-bootstrap']), 'index.html'), /Hello, world!/);
    assert.match(buildEditorSource(in2011(['responsive-design']), 'style.css'), /@media \(max-width: 767px\)/);
  });
});
