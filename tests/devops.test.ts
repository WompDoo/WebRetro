import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceHazards,
  buyUpgrade,
  calculateAdValuePerAd,
  calculateCertificateRenewalFee,
  calculateDemandVisitorsPerSecond,
  calculateQuickFixWindowMs,
  calculateServerLoad,
  calculateUpkeepShare,
  canRenewCertificate,
  createInitialGameState,
  createPlaytestState,
  getAvailableOpsIds,
  getAvailableSkillIds,
  getRevealedBoostIds,
  HOSTING_TIERS,
  isQuickFix,
  isSiteDown,
  QUICK_FIX_WINDOW_MS,
  renewCertificate,
  SITE_DOWN_SERVER_LOAD,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { EraId, GameState, Infection, UpgradeId } from '../src/engine';
import { buildSiteUrl, describeConnectionSecurity } from '../src/ui/browser-chrome';
import { listIssues } from '../src/ui/issues';
import { renderShopBody } from '../src/ui/render-shop';
import { renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 11;
const NOW = 0;
const VIEW = { buyAmount: 1, isScrollJackingOn: false } as const;
const AD_BLOCKER_RATE = 0.2;
const EXPIRED_TRAFFIC = 0.4;
const NOT_SECURE_TRAFFIC = 0.9;
const TOLERANCE = 1e-9;

/** The end of an era with none of the ops running, plus the ones a test is about. */
function endOf(eraId: EraId, extra: readonly UpgradeId[] = []): GameState {
  const state = createPlaytestState(eraId, 'end', SEED, 'react');
  const withoutOps = state.purchasedUpgradeIds.filter((upgradeId) => UPGRADES_BY_ID[upgradeId].kind !== 'ops');
  return { ...state, hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [], purchasedUpgradeIds: [...withoutOps, ...extra] };
}

function without(state: GameState, upgradeIds: readonly UpgradeId[]): GameState {
  return { ...state, purchasedUpgradeIds: state.purchasedUpgradeIds.filter((upgradeId) => !upgradeIds.includes(upgradeId)) };
}

const expired = (state: GameState): GameState => ({ ...state, isCertificateExpired: true });

describe('the ad blocker makes pop-ups rare, not impossible', () => {
  const withAds: GameState = { ...createInitialGameState(SEED), adCount: 3, hazardCountdownsMs: { ...QUIET_HAZARDS, popup: 10_000 } };
  const blocked: GameState = { ...withAds, ownedDefenseIds: ['premium-ad-network'], enabledDefenseIds: ['premium-ad-network'] };
  const countdownUsed = (state: GameState): number => 10_000 - advanceHazards(state, 1_000).state.hazardCountdownsMs.popup;

  it('counts down to the next pop-up at a fifth of the pace', () => {
    assert.ok(Math.abs(countdownUsed(blocked) / countdownUsed(withAds) - AD_BLOCKER_RATE) < TOLERANCE);
  });

  it('still lets the odd one through', () => {
    const waitedLongEnough = advanceHazards(blocked, 10_000 / (countdownUsed(blocked) / 1_000)).state;
    assert.equal(waitedLongEnough.popups.length, 1);
  });
});

describe('DevOps lives in the Ops tab', () => {
  const start1997 = createInitialGameState(SEED);

  it('offers each era’s ops there, not as skills or boosts', () => {
    assert.deepEqual(getAvailableOpsIds(start1997), ['own-domain', 'learn-ftp']);
    assert.ok(getAvailableOpsIds(start1997).every((upgradeId) => !getAvailableSkillIds(start1997).includes(upgradeId)));
    assert.ok(getAvailableOpsIds(start1997).every((upgradeId) => !getRevealedBoostIds(start1997).includes(upgradeId)));
  });

  it('lists them under DevOps, and what is running once bought', () => {
    const shop = renderShopBody({ ...start1997, purchasedUpgradeIds: ['own-domain'] }, 'security', VIEW);
    assert.match(shop, /DevOps/);
    assert.match(shop, new RegExp(UPGRADES_BY_ID['learn-ftp'].name));
    assert.match(shop, /Running/);
  });

  it('keeps an ops multiplier to its own era, and the resilience for good', () => {
    const domain2005 = endOf('web2-2005', ['own-domain']);
    assert.equal(calculateAdValuePerAd(domain2005), calculateAdValuePerAd(without(domain2005, ['own-domain'])));
    const domain1997 = endOf('homepage-1997', ['own-domain']);
    assert.ok(calculateAdValuePerAd(domain1997) > calculateAdValuePerAd(without(domain1997, ['own-domain'])));
    const backed2011 = { ...endOf('social-2011', ['nightly-backups', 'ssl-certificate']), infections: [{ id: 3, kind: 'sql-injection' as const, featureId: 'blog' as const, ageMs: 24_500, minigameId: 'backup-restore' as const }] };
    assert.equal(advanceHazards(backed2011, 1_000).state.infections.length, 0);
    assert.equal(describeConnectionSecurity(backed2011), 'secure');
  });

  it('moves the 1997 page to its own domain', () => {
    assert.match(buildSiteUrl(start1997), /freewebspace/);
    assert.equal(buildSiteUrl({ ...start1997, purchasedUpgradeIds: ['own-domain'] }), 'http://www.myhomepage.com/index.htm');
  });
});

describe('certificates', () => {
  const secure2005 = endOf('web2-2005', ['ssl-certificate']);

  it('serves the site over https with a padlock once you have one', () => {
    assert.match(buildSiteUrl(secure2005), /^https:/);
    assert.equal(describeConnectionSecurity(secure2005), 'secure');
    assert.equal(describeConnectionSecurity(without(secure2005, ['ssl-certificate'])), 'plain');
  });

  it('runs out when renewed by hand, and never once renewal is automated', () => {
    const due = { ...secure2005, hazardCountdownsMs: { ...QUIET_HAZARDS, 'certificate-expiry': 1 } };
    const step = advanceHazards(due, 10);
    assert.equal(step.state.isCertificateExpired, true);
    assert.match(step.events.map((event) => event.message).join(' '), /Renew it under Ops/);
    assert.equal(advanceHazards({ ...due, purchasedUpgradeIds: [...due.purchasedUpgradeIds, 'certificate-automation'] }, 10).state.isCertificateExpired, false);
    assert.equal(advanceHazards(without(due, ['ssl-certificate']), 10).state.isCertificateExpired, false);
  });

  it('turns most visitors away while expired: a warning page, a ticket and a warning in the address bar', () => {
    const lapsed = expired(secure2005);
    assert.ok(Math.abs(calculateDemandVisitorsPerSecond(lapsed) / calculateDemandVisitorsPerSecond(secure2005) - EXPIRED_TRAFFIC) < TOLERANCE);
    assert.match(renderSite(lapsed, NOW), /There is a problem with this website’s security certificate/);
    assert.match(renderSite(expired(endOf('platform-2018', ['ssl-certificate'])), NOW), /Your connection is not private/);
    assert.ok(listIssues(lapsed).some((issue) => issue.key === 'certificate' && issue.fix !== null));
    assert.equal(describeConnectionSecurity(lapsed), 'expired');
  });

  it('renews for a fee rounded to two significant figures', () => {
    const lapsed = { ...expired(secure2005), money: 1e12 };
    const fee = calculateCertificateRenewalFee(lapsed);
    const digits = Math.floor(Math.log10(fee)) + 1;
    assert.equal(fee % 10 ** Math.max(0, digits - 2), 0);
    const renewed = renewCertificate(lapsed);
    assert.equal(renewed.isCertificateExpired, false);
    assert.equal(renewed.money, lapsed.money - fee);
    assert.equal(canRenewCertificate(secure2005), false);
    assert.deepEqual(renewCertificate({ ...lapsed, money: 0 }), { ...lapsed, money: 0 });
  });

  it('renews an expired certificate at once when renewal is automated', () => {
    const lapsed = { ...expired(endOf('platform-2018', ['ssl-certificate'])), money: 1e15 };
    assert.equal(buyUpgrade(lapsed, 'certificate-automation').isCertificateExpired, false);
  });

  it('marks plain http “Not secure” from 2018, and some visitors turn back', () => {
    const plain = endOf('platform-2018');
    const automated = endOf('platform-2018', ['certificate-automation']);
    assert.equal(describeConnectionSecurity(plain), 'not-secure');
    assert.equal(describeConnectionSecurity(automated), 'secure');
    assert.ok(Math.abs(calculateDemandVisitorsPerSecond(plain) / calculateDemandVisitorsPerSecond(automated) - NOT_SECURE_TRAFFIC) < TOLERANCE);
  });
});

describe('ops that fix things on their own', () => {
  const injection = (ageMs: number): Infection => ({ id: 3, kind: 'sql-injection', featureId: 'blog', ageMs, minigameId: 'backup-restore' });
  const brokenBuild = (ageMs: number): Infection => ({ id: 4, kind: 'broken-build', featureId: 'stories', ageMs, minigameId: 'fix-build' });

  it('restores a dropped table from last night’s backup', () => {
    const attacked = { ...endOf('web2-2005', ['nightly-backups']), infections: [injection(24_500)] };
    const step = advanceHazards(attacked, 1_000);
    assert.equal(step.state.infections.length, 0);
    assert.match(step.events.map((event) => event.message).join(' '), /backup/);
    assert.equal(advanceHazards(without(attacked, ['nightly-backups']), 1_000).state.infections.length, 1);
  });

  it('rolls a broken release back with blue-green, for a share of revenue', () => {
    const broken = { ...endOf('platform-2018', ['blue-green-deploys']), infections: [brokenBuild(14_500)] };
    assert.equal(advanceHazards(broken, 1_000).state.infections.length, 0);
    assert.ok(Math.abs(calculateUpkeepShare(broken) - calculateUpkeepShare(without(broken, ['blue-green-deploys'])) - 0.02) < TOLERANCE);
  });

  it('doubles the quick-fix window with uptime monitoring', () => {
    const monitored = endOf('social-2011', ['uptime-monitoring']);
    assert.equal(calculateQuickFixWindowMs(monitored), QUICK_FIX_WINDOW_MS * 2);
    assert.equal(isQuickFix(monitored, injection(QUICK_FIX_WINDOW_MS * 1.5)), true);
    assert.equal(isQuickFix(without(monitored, ['uptime-monitoring']), injection(QUICK_FIX_WINDOW_MS * 1.5)), false);
  });

  it('keeps the site up past the old breaking point with a process manager', () => {
    const base = endOf('social-2011');
    const candidates = HOSTING_TIERS.flatMap((_tier, index) => [0, 1].map((spike) => ({ ...base, hostingTier: index, trafficSpikeRemainingMs: spike * 60_000 })));
    const strained = candidates.find((state) => {
      const load = calculateServerLoad(state);
      return load >= SITE_DOWN_SERVER_LOAD && load < SITE_DOWN_SERVER_LOAD * 1.25;
    });
    assert.ok(strained !== undefined, 'no 2011 state between 200% and 250% load');
    assert.equal(isSiteDown(strained), true);
    assert.equal(isSiteDown({ ...strained, purchasedUpgradeIds: [...strained.purchasedUpgradeIds, 'process-manager'] }), false);
  });
});
