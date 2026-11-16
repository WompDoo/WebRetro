import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState, ERA_IDS, ERAS_BY_ID, FEATURE_IDS, FEATURES_BY_ID, getEraIndex } from '../src/engine';
import type { EraId, GameState } from '../src/engine';
import { escapeHtml } from '../src/ui/dom';
import { resolveTyping } from '../src/ui/framework-presentation';
import { ERA_PRESENTATION } from '../src/ui/presentation';
import { renderTip } from '../src/ui/render-goal';
import { renderSite } from '../src/ui/sites';
import { SITE_CONTENT } from '../src/ui/site-content';

/**
 * Found by reading every era's page as text: a feature keeps its place through every relaunch, and its content used
 * to come along unchanged, so 2005's "Why AJAX changes everything" was still the latest post on the AI-era page.
 */

const SEED = 55;
const NOW = 0;
const DATE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, (\d{4})\b/g;

function pageOf(eraId: EraId): string {
  return renderSite({ ...createPlaytestState(eraId, 'end', SEED, 'react'), popups: [], infections: [] }, NOW);
}

function earliestYear(eraId: EraId): number {
  const previous = ERA_IDS[getEraIndex(eraId) - 1];
  return previous === undefined ? 0 : ERAS_BY_ID[previous].year + 1;
}

describe('every era’s page is of its era', () => {
  ERA_IDS.forEach((eraId) => {
    it(`${eraId}: nothing on the page is dated before the era began or after it`, () => {
      const years = [...pageOf(eraId).matchAll(DATE)].map((match) => Number(match[1]));
      const outOfEra = years.filter((year) => year < earliestYear(eraId) || year > ERAS_BY_ID[eraId].year);
      assert.deepEqual(outOfEra, []);
    });
  });

  it('gives every era its own posts, and the blog shows them', () => {
    const eras: readonly EraId[] = ['web2-2005', 'social-2011', 'platform-2018', 'ai-2024'];
    eras.forEach((eraId) => {
      const titles = SITE_CONTENT[eraId].blogPosts.map((post) => escapeHtml(post.title));
      assert.ok(titles.some((title) => pageOf(eraId).includes(title)), eraId);
    });
  });

  it('has enough photo names for a full gallery row without repeats', () => {
    ERA_IDS.forEach((eraId) => assert.equal(new Set(SITE_CONTENT[eraId].photoNames).size, SITE_CONTENT[eraId].photoNames.length));
    ERA_IDS.forEach((eraId) => assert.ok(SITE_CONTENT[eraId].photoNames.length >= 8, eraId));
  });
});

describe('tips quote the game’s own numbers', () => {
  it('tells a Vue player their real search loss, not React’s', () => {
    const blank = (framework: 'react' | 'vue'): GameState => {
      const state = createPlaytestState('platform-2018', 'end', SEED, framework);
      const skill = framework === 'vue' ? 'learn-vue' : 'learn-react';
      return { ...state, popups: [], infections: [], purchasedUpgradeIds: [...state.purchasedUpgradeIds.filter((id) => !['nextjs-ssr', 'nuxt-ssr'].includes(id)), skill] };
    };
    assert.match(renderTip(blank('vue')), /15% of visitors/);
    assert.match(renderTip(blank('react')), /30% of visitors/);
  });
});

describe('content says only what can happen', () => {
  /** The audit found five features renamed for 2011, the era they retire in: names no player could ever see. */
  it('never names a feature for an era it has already retired in', () => {
    const deadNames = FEATURE_IDS.flatMap((featureId) => {
      const { sunsetIn, laterEraNames } = FEATURES_BY_ID[featureId];
      const named = Object.keys(laterEraNames) as EraId[];
      return sunsetIn === null ? [] : named.filter((eraId) => getEraIndex(eraId) >= getEraIndex(sunsetIn)).map((eraId) => `${featureId} in ${eraId}`);
    });
    assert.deepEqual(deadNames, []);
  });

  it('tells each relaunch the truth about how code arrives', () => {
    assert.match(ERA_PRESENTATION['ai-2024'].entryStory?.whatsNew.join(' ') ?? '', /accepts a whole block/);
    assert.equal(resolveTyping(createPlaytestState('ai-2024', 'start', SEED, 'react')).chunk, 'suggestion');
    assert.match(ERA_PRESENTATION['social-2011'].entryStory?.whatsNew.join(' ') ?? '', /pastes a line/);
    assert.equal(ERA_PRESENTATION['social-2011'].typing.chunk, 'line');
  });
});
