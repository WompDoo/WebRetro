import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitialGameState, TRAFFIC_SPIKE_DURATION_MS } from '../src/engine';
import type { GameState, Infection } from '../src/engine';
import { listIssues } from '../src/ui/issues';
import { pickStartingMobileTab } from '../src/ui/store';
import { QUIET_HAZARDS } from './quiet-hazards';

const base = createInitialGameState(1);
const virus: Infection = { id: 5, kind: 'virus', featureId: 'guestbook', ageMs: 0, minigameId: 'firewall' };
const spam: Infection = { id: 6, kind: 'spam', featureId: 'comments', ageMs: 0, minigameId: 'spam-sort' };
const sql: Infection = { id: 7, kind: 'sql-injection', featureId: 'blog', ageMs: 0, minigameId: 'backup-restore' };

const homepage = (extra: Partial<GameState> = {}): GameState => ({
  ...base,
  hazardCountdownsMs: QUIET_HAZARDS,
  featureLevels: { ...base.featureLevels, 'hit-counter': 5, guestbook: 3 },
  ...extra,
});
/** A small 2005 blog on shared hosting, comfortably under capacity. */
const blog = (extra: Partial<GameState> = {}): GameState => ({
  ...homepage(),
  eraId: 'web2-2005',
  purchasedUpgradeIds: ['learn-php', 'learn-ajax'],
  featureLevels: { ...base.featureLevels, blog: 1 },
  lifetimeEarnings: 1e9,
  ...extra,
});

describe('the issue tracker', () => {
  it('is empty when nothing needs you', () => {
    assert.deepEqual(listIssues(homepage()), []);
    assert.deepEqual(listIssues(blog()), []);
  });

  it('opens a ticket per infection whose fix opens its minigame', () => {
    const [ticket] = listIssues(homepage({ infections: [virus] }));
    assert.equal(ticket?.fix?.action, 'open-minigame');
    assert.equal(ticket?.fix?.id, '5');
    assert.match(ticket?.summary ?? '', /Firewall, level 1/);
  });

  it('lists the most urgent first: virus, then SQL injection, then spam', () => {
    const issues = listIssues(blog({ infections: [spam, sql, virus] }));
    assert.deepEqual(issues.map((issue) => issue.severity), ['critical', 'major', 'minor']);
  });

  it('offers the defense that would prevent it, until you have it on', () => {
    const [unprotected] = listIssues(blog({ infections: [spam] }));
    assert.equal(unprotected?.prevention?.label, 'Prevent: CAPTCHA');
    assert.equal(unprotected?.prevention?.id, 'security');
    const [switchedOff] = listIssues(blog({ infections: [spam], ownedDefenseIds: ['captcha'] }));
    assert.equal(switchedOff?.prevention?.label, 'Turn on CAPTCHA');
    const [protectedSite] = listIssues(blog({ infections: [spam], ownedDefenseIds: ['captcha'], enabledDefenseIds: ['captcha'] }));
    assert.equal(protectedSite?.prevention, null);
  });

  it('opens a server ticket when the server is overloaded, critical once the site is down', () => {
    const overloaded = listIssues(blog({ featureLevels: { ...base.featureLevels, blog: 8, comments: 0 } }));
    const down = listIssues(blog({ featureLevels: { ...base.featureLevels, blog: 30, comments: 0 } }));
    assert.equal(overloaded[0]?.key, 'server');
    assert.equal(overloaded[0]?.severity, 'major');
    assert.equal(down[0]?.severity, 'critical');
    assert.equal(down[0]?.fix?.label, 'Upgrade hosting');
  });

  it('has no server tickets in 1997, when hosting is someone else’s problem', () => {
    const busy = homepage({ featureLevels: { ...base.featureLevels, 'hit-counter': 500 } });
    assert.deepEqual(listIssues(busy), []);
  });

  it('shows a traffic spike only while it can hurt you', () => {
    const spiking = blog({ trafficSpikeRemainingMs: TRAFFIC_SPIKE_DURATION_MS });
    assert.ok(listIssues(spiking).some((issue) => issue.key === 'spike'));
    const cached = { ...spiking, purchasedUpgradeIds: [...spiking.purchasedUpgradeIds, 'page-cache' as const] };
    assert.ok(!listIssues(cached).some((issue) => issue.key === 'spike'));
  });
});

describe('the phone layout', () => {
  it('starts a new game on the code tab and a returning player on their site', () => {
    assert.equal(pickStartingMobileTab(base), 'code');
    assert.equal(pickStartingMobileTab({ ...base, lifetimeEarnings: 10 }), 'site');
  });
});
