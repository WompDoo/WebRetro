import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateDemandVisitorsPerSecond,
  calculateFeatureVisitorsPerSecond,
  calculateMobileTrafficFactor,
  calculateMobileStayShare,
  calculatePageWeightKb,
  createInitialGameState,
  ERAS_BY_ID,
  advanceEra,
  formatPercent,
  getFeaturesRetiringIn,
  getRetiredFeatureName,
  getUnlockedFeatureIds,
  isFeatureBuildable,
  isFeaturePluginDead,
  isFeatureRetired,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { buildEditorSource } from '../src/ui/skill-code';
import { buildPhoneCaption, calculateMobileScore, gradePageSpeed, isPhoneViewOffered, resolveDeviceView } from '../src/ui/browser-chrome';

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

  it('offers the phone view only in eras with phone visitors, and shows desktop before them', () => {
    const in2005 = { ...in2011(), eraId: 'web2-2005' as const };
    assert.ok(isPhoneViewOffered(in2011()));
    assert.ok(!isPhoneViewOffered(in2005));
    assert.equal(resolveDeviceView(in2011(), 'phone'), 'phone');
    assert.equal(resolveDeviceView(in2005, 'phone'), 'desktop');
  });

  it('captions the phone with how many phone visitors give up, until the page fits', () => {
    const leaving = formatPercent(1 - calculateMobileStayShare(in2011()));
    assert.ok(buildPhoneCaption(in2011(), 1).detail.includes(`${leaving} of them give up`));
    assert.equal(buildPhoneCaption(in2011(['responsive-design']), 1).headline, 'Fits on phones');
    assert.ok(buildPhoneCaption(in2011(['responsive-design']), 1).detail.includes(`Mobile score ${calculateMobileScore(in2011(['responsive-design']), 1)}/100`));
  });

  it('grades page speed A to F', () => {
    assert.deepEqual([0.5, 1.5, 2.5, 4, 7, 12].map(gradePageSpeed), ['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('2011: Flash is dead', () => {
  it('kills the podcast player until HTML5 audio rebuilds it', () => {
    assert.ok(isFeaturePluginDead(in2011(), 'midi-player'));
    assert.equal(calculateFeatureVisitorsPerSecond(in2011(), 'midi-player'), 0);
    assert.ok(!isFeaturePluginDead(in2011(['html5-media']), 'midi-player'));
    assert.ok(calculateFeatureVisitorsPerSecond(in2011(['html5-media']), 'midi-player') > 0);
  });

  it('retires the Flash intro for good: HTML5 doesn’t bring it back', () => {
    assert.ok(isFeatureRetired(in2011(['html5-media']), 'flash-intro'));
    assert.equal(calculateFeatureVisitorsPerSecond(in2011(['html5-media']), 'flash-intro'), 0);
  });

  it('was alive in 2005', () => {
    assert.ok(!isFeaturePluginDead({ ...in2011(), eraId: 'web2-2005' }, 'midi-player'));
    assert.ok(!isFeatureRetired({ ...in2011(), eraId: 'web2-2005' }, 'flash-intro'));
  });
});

describe('2011: sunsetting what went out of fashion', () => {
  const retiring = ['hit-counter', 'under-construction', 'webring', 'tag-cloud', 'flash-intro'] as const;

  it('retires the hit counter, the badge, the webring, the tag cloud and the Flash intro', () => {
    const state = in2011();
    retiring.forEach((featureId) => assert.ok(isFeatureRetired(state, featureId), featureId));
    assert.ok(!isFeatureRetired(state, 'blog'));
    assert.ok(!isFeatureRetired(state, 'guestbook'));
  });

  it('a retired feature brings no visitors, adds no weight and can’t be bought or found in the shop', () => {
    const levels = { ...base.featureLevels, blog: 10, 'tag-cloud': 20 };
    const before = { ...in2011(), eraId: 'web2-2005' as const, featureLevels: levels, purchasedUpgradeIds: ['learn-php' as const, 'learn-rss' as const] };
    const after = { ...before, eraId: 'social-2011' as const };
    assert.ok(calculateFeatureVisitorsPerSecond(before, 'tag-cloud') > 0);
    assert.equal(calculateFeatureVisitorsPerSecond(after, 'tag-cloud'), 0);
    assert.equal(calculatePageWeightKb(after), calculatePageWeightKb({ ...after, featureLevels: { ...levels, 'tag-cloud': 0 } }));
    assert.ok(!isFeatureBuildable(after, 'tag-cloud'));
    assert.ok(!getUnlockedFeatureIds(after).includes('tag-cloud'));
  });

  it('names a retired feature the way it looked in its last era: the 2005 blogroll, not the 1997 webring', () => {
    assert.equal(getRetiredFeatureName('webring'), 'Blogroll');
    assert.equal(getRetiredFeatureName('flash-intro'), 'Flash intro');
  });

  it('lists only what you built as retiring', () => {
    const state = { ...in2011(), eraId: 'web2-2005' as const, featureLevels: { ...base.featureLevels, 'flash-intro': 3, webring: 2 } };
    assert.deepEqual([...getFeaturesRetiringIn(state, 'social-2011')].sort(), ['flash-intro', 'webring']);
  });

  it('can’t infect a retired feature, and the relaunch clears infections on retiring ones', () => {
    const virusOnWebring = { id: 9, kind: 'virus' as const, featureId: 'webring' as const, ageMs: 0, minigameId: 'snake' as const };
    const everyFeatureBuilt = Object.fromEntries(Object.keys(base.featureLevels).map((featureId) => [featureId, 30])) as GameState['featureLevels'];
    const finished2005: GameState = {
      ...base,
      eraId: 'web2-2005',
      hostingTier: 9,
      money: 2e9,
      featureLevels: { ...everyFeatureBuilt, 'share-buttons': 0, 'video-player': 0, 'activity-feed': 0 },
      infections: [virusOnWebring],
    };
    const relaunched = advanceEra(finished2005);
    assert.equal(relaunched.eraId, 'social-2011');
    assert.equal(relaunched.infections.length, 0);
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
