import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  advanceHazards,
  calculateAiAnswerShare,
  calculateDemandVisitorsPerSecond,
  calculateEconomySnapshot,
  calculateHallucinationRefund,
  createPlaytestState,
  ERAS_BY_ID,
  getEraHostingTiers,
  getFeaturesRetiringIn,
  getUnlockedDefenseIds,
  isEraGateComplete,
} from '../src/engine';
import type { GameState, UpgradeId } from '../src/engine';
import { buildPerformanceReadout, buildSiteUrl } from '../src/ui/browser-chrome';
import { renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 24;
const NOW = 0;
const TOLERANCE = 1e-9;
/** Purchases that change what the page shows: each test turns on the ones it's about. */
const AI_ONLY: readonly UpgradeId[] = ['llms-txt', 'dark-mode', 'paywall', 'ai-everything', 'retargeting-cookies'];

/** The end of 2024 with React, quiet, and without the looks a test turns on itself. */
function end2024(extra: readonly UpgradeId[] = []): GameState {
  const state = createPlaytestState('ai-2024', 'end', SEED, 'react');
  const kept = state.purchasedUpgradeIds.filter((upgradeId) => !AI_ONLY.includes(upgradeId));
  return { ...state, hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [], ownedDefenseIds: [], enabledDefenseIds: [], purchasedUpgradeIds: [...kept, ...extra] };
}

describe('2024: the era itself', () => {
  it('follows 2018 and is the last era', () => {
    assert.equal(ERAS_BY_ID['platform-2018'].nextEraId, 'ai-2024');
    assert.equal(ERAS_BY_ID['ai-2024'].nextEraId, null);
  });

  it('retires stories and the human live chat at the relaunch, and pays some of what they earned back', () => {
    const end2018 = createPlaytestState('platform-2018', 'end', SEED, 'react');
    assert.deepEqual([...getFeaturesRetiringIn(end2018, 'ai-2024')].sort(), ['live-chat', 'stories']);
    assert.ok(isEraGateComplete(end2018));
    const entered = advanceEra(end2018);
    assert.equal(entered.eraId, 'ai-2024');
    assert.equal(entered.hostingTier, 0);
  });

  it('runs on rented GPUs, starting with eight', () => {
    assert.equal(getEraHostingTiers('ai-2024')[0]?.name, 'GPU cluster: 8 GPUs');
  });

  it('has its end preset pass its own gate', () => {
    assert.ok(isEraGateComplete(createPlaytestState('ai-2024', 'end', SEED, 'react')));
  });
});

describe('2024: AI answers keep some of your visitors', () => {
  it('keeps three in ten, and writing for AI answers halves that', () => {
    const plain = end2024();
    const written = end2024(['llms-txt']);
    assert.ok(Math.abs(calculateAiAnswerShare(plain) - 0.3) < TOLERANCE);
    assert.ok(Math.abs(calculateAiAnswerShare(written) - 0.15) < TOLERANCE);
    assert.ok(Math.abs(calculateDemandVisitorsPerSecond(written) / calculateDemandVisitorsPerSecond(plain) - 0.85 / 0.7) < TOLERANCE);
  });

  it('never applies before 2024', () => {
    assert.equal(calculateAiAnswerShare(createPlaytestState('platform-2018', 'end', SEED, 'react')), 0);
  });

  it('says so in the status bar, next to INP, which replaced FID in 2024', () => {
    const readout = buildPerformanceReadout(end2024(), calculateEconomySnapshot(end2024()));
    assert.match(readout, /AI answers −30%/);
    assert.match(readout, /INP \d+ ms/);
    assert.match(readout, /GPU cluster/);
  });
});

describe('2024: new trouble', () => {
  it('has the AI assistant promise a refund now and then, until guardrails check it', () => {
    const due = { ...end2024(), hazardCountdownsMs: { ...QUIET_HAZARDS, hallucination: 1 } };
    const refund = calculateHallucinationRefund(due);
    const step = advanceHazards(due, 10);
    assert.ok(refund > 0);
    assert.ok(Math.abs(step.state.money - (due.money - refund)) < Math.max(1, refund * 1e-9));
    assert.match(step.events.map((event) => event.message).join(' '), /refund/);
    const guarded = { ...due, ownedDefenseIds: ['guardrails' as const], enabledDefenseIds: ['guardrails' as const] };
    assert.equal(advanceHazards(guarded, 10).state.money, due.money);
  });

  it('sends AI crawlers to the busiest page, until a bot shield turns them away', () => {
    const due = { ...end2024(), hazardCountdownsMs: { ...QUIET_HAZARDS, 'scraper-swarm': 1 } };
    const swarmed = advanceHazards(due, 10).state.infections;
    assert.equal(swarmed.length, 1);
    assert.equal(swarmed[0]?.kind, 'scraper-swarm');
    const shielded = { ...due, ownedDefenseIds: ['bot-shield' as const], enabledDefenseIds: ['bot-shield' as const] };
    assert.equal(advanceHazards(shielded, 10).state.infections.length, 0);
    assert.ok(getUnlockedDefenseIds(due).includes('bot-shield') && getUnlockedDefenseIds(due).includes('guardrails'));
  });
});

describe('2024: the page', () => {
  it('is an AI-designed bento-grid landing page, at the bare domain', () => {
    const html = renderSite(end2024(), NOW);
    assert.match(html, /class="site-2024/);
    assert.match(html, /class="ai-bento"/);
    assert.match(html, /The AI-native platform/);
    assert.match(html, /AI can make mistakes/);
    assert.match(buildSiteUrl(end2024()), /^https:\/\/[a-z0-9]+\.com\//);
  });

  it('puts the assistant in the corner where the live chat was, and the "Ask AI" box in the hero', () => {
    const html = renderSite(end2024(), NOW);
    assert.match(html, /chat-bubble is-ai/);
    assert.match(html, /class="ai-hero">.*Ask myhmpg anything/s);
  });

  it('goes dark, sparkles and puts up the wall only once each is bought', () => {
    assert.doesNotMatch(renderSite(end2024(), NOW), /is-dark|has-sparkles|has-paywall/);
    assert.match(renderSite(end2024(['dark-mode']), NOW), /site-2024[^"]*is-dark/);
    assert.match(renderSite(end2024(['ai-everything']), NOW), /has-sparkles/);
    assert.match(renderSite(end2024(['paywall']), NOW), /has-paywall/);
  });

  it('sells AI-everything ads, and prices in AI credits', () => {
    const html = renderSite(end2024(), NOW);
    assert.match(html, /Write like a human/);
    assert.match(html, /500 AI credits/);
  });
});
