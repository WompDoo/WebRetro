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
  advanceSimulation,
  creditFeatureEarnings,
  formatMoney,
  RETIREMENT_PAYOUT_SHARE,
  formatPercent,
  getFeaturesRetiringIn,
  getRetiredFeatureName,
  getUnlockedFeatureIds,
  isFeatureBuildable,
  isFeaturePluginDead,
  isFeatureRetired,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { listIssues } from '../src/ui/issues';
import { MAX_PHONE_NOTIFICATIONS, renderPhoneNotifications } from '../src/ui/render-notifications';
import { describeRetirement } from '../src/ui/retirement';
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

  it('shows infections as tappable phone notifications, a few at a time, and nothing when all is well', () => {
    const extra = 2;
    const infections = Array.from({ length: MAX_PHONE_NOTIFICATIONS + extra }, (_, index) => ({ id: index + 1, kind: 'virus' as const, featureId: 'blog' as const, ageMs: 0, minigameId: 'snake' as const }));
    const html = renderPhoneNotifications(listIssues({ ...in2011(), infections }), 'Mentions');
    assert.equal(html.split('class="phone-notification"').length - 1, MAX_PHONE_NOTIFICATIONS);
    assert.ok(html.includes('data-action="open-minigame" data-id="1"'));
    assert.ok(html.includes(`${extra} more in Mentions`));
    assert.equal(renderPhoneNotifications(listIssues(in2011()), 'Mentions'), '');
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

describe('2011: a trade-in for what retires', () => {
  const in2005: GameState = { ...base, eraId: 'web2-2005', hazardCountdownsMs: QUIET_HAZARDS, purchasedUpgradeIds: ['learn-php', 'learn-rss'], featureLevels: { ...base.featureLevels, blog: 10, 'tag-cloud': 5 } };
  const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

  it('credits visitor revenue to the features that brought the visitors, by how many each brought', () => {
    const credited = creditFeatureEarnings(in2005, 100);
    const blogShare = calculateFeatureVisitorsPerSecond(in2005, 'blog') / (calculateFeatureVisitorsPerSecond(in2005, 'blog') + calculateFeatureVisitorsPerSecond(in2005, 'tag-cloud'));
    assert.ok(Math.abs(credited.blog - 100 * blogShare) < 1e-9);
    assert.ok(Math.abs(sum(Object.values(credited)) - 100) < 1e-9);
    assert.equal(credited.guestbook, 0);
  });

  it('credits nothing when the site loses money', () => {
    assert.deepEqual(creditFeatureEarnings(in2005, -50), in2005.featureEarnings);
  });

  it('keeps the tally as the game runs: every dollar visitors bring is some feature’s', () => {
    const after = advanceSimulation(in2005, 10_000, 'offline').state;
    assert.ok(Math.abs(sum(Object.values(after.featureEarnings)) - (after.lifetimeEarnings - in2005.lifetimeEarnings)) < 1e-6);
  });

  it('pays back a share of what the retiring features earned at the relaunch, and nothing for the rest', () => {
    const everyFeatureBuilt = Object.fromEntries(Object.keys(base.featureLevels).map((featureId) => [featureId, 30])) as GameState['featureLevels'];
    const finished2005: GameState = {
      ...base,
      eraId: 'web2-2005',
      hostingTier: 9,
      money: 2e9,
      featureLevels: { ...everyFeatureBuilt, 'share-buttons': 0, 'video-player': 0, 'activity-feed': 0 },
      featureEarnings: { ...base.featureEarnings, 'tag-cloud': 1e8, webring: 2e7, blog: 5e9 },
    };
    const relaunched = advanceEra(finished2005);
    const tradeIn = (1e8 + 2e7) * RETIREMENT_PAYOUT_SHARE;
    assert.equal(relaunched.money, finished2005.money - ERAS_BY_ID['web2-2005'].migrationCost + tradeIn);
    const news = describeRetirement(finished2005, 'social-2011');
    assert.ok(news.includes('Blogroll'), news);
    assert.ok(news.includes(`Trade-in: ${formatMoney(tradeIn)} (50% of what they earned).`), news);
  });

  it('pays nothing when nothing retires: 2005 retired nothing from 1997', () => {
    const finished1997: GameState = { ...base, money: 1e6, featureEarnings: { ...base.featureEarnings, 'hit-counter': 1e5 } };
    assert.equal(describeRetirement(finished1997, 'web2-2005'), '');
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
