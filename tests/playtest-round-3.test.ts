import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceEra,
  calculateSpecializationProgress,
  canSwitchFeature,
  createPlaytestState,
  EMPTY_LEGACY,
  isFeatureRetired,
  SPECIALIZATIONS_BY_ID,
  TREE_IDS,
} from '../src/engine';
import type { GameState, LegacyState } from '../src/engine';
import { renderEndingAct } from '../src/ui/ending';
import { renderShopBody } from '../src/ui/render-shop';
import { QUIET_HAZARDS } from './quiet-hazards';

/**
 * A third playtest round: a sacrifice the era made impossible, an unlocked specialization that looked locked again,
 * Backlinks you couldn't find, and an ad line nobody could parse.
 */

const SEED = 53;
const SECOND_RUN = 2;
const VIEW = { isScrollJackingOn: true, foundSpecializationIds: [] };
const endOf = (eraId: Parameters<typeof createPlaytestState>[0]): GameState => ({
  ...createPlaytestState(eraId, 'end', SEED, 'react'),
  hazardCountdownsMs: QUIET_HAZARDS,
  runNumber: SECOND_RUN,
});

describe('giving something up for a specialization', () => {
  it('counts a feature the era retired as given up: 2024 retires the live chat its AI companion asks you to switch off', () => {
    const state = endOf('ai-2024');
    assert.ok(isFeatureRetired(state, 'live-chat'));
    const condition = calculateSpecializationProgress(state, 'ai-companion').find((progress) => progress.condition.kind === 'switched-off');
    assert.ok(condition !== undefined);
    assert.ok(condition.isMet);
    assert.equal(condition.label, 'Live chat bubble retired');
  });

  it('is always possible in the specialization’s own era: switchable there, or already retired', () => {
    TREE_IDS.forEach((id) => {
      const definition = SPECIALIZATIONS_BY_ID[id];
      const state = endOf(definition.eraId);
      definition.unlock.forEach((condition) => {
        if (condition.kind !== 'switched-off') return;
        const built = { ...state, featureLevels: { ...state.featureLevels, [condition.featureId]: Math.max(1, state.featureLevels[condition.featureId]) } };
        assert.ok(canSwitchFeature(built, condition.featureId) || isFeatureRetired(built, condition.featureId), `${id}: ${condition.featureId}`);
      });
    });
  });
});

describe('an unlocked specialization', () => {
  it('says it stays yours this era, instead of conditions that may have slipped since', () => {
    const state: GameState = { ...endOf('web2-2005'), unlockedSpecializationIds: ['photos'] };
    const tab = renderShopBody(state, 'specialize', VIEW);
    const card = tab.slice(tab.indexOf('data-specialization="photos"'));
    assert.match(card, /Unlocked\. It stays yours to choose this era, whatever you build next/);
    assert.ok(card.indexOf('spec-conditions') === -1 || card.indexOf('spec-conditions') > card.indexOf('</article>'), 'no live conditions on its card');
  });
});

describe('the legacy screen', () => {
  it('shows the Backlinks left to spend on a line of its own, above the perks', () => {
    const finished = advanceEra({ ...endOf('ai-2024') });
    const legacy: LegacyState = { ...EMPTY_LEGACY, backlinks: 3, finishedRuns: SECOND_RUN };
    const page = renderEndingAct(finished, 'legacy', null, legacy);
    assert.match(page, /<p class="backlinks-balance">🔗 <b>3 Backlinks<\/b> left to spend<\/p>\s*<ul class="perk-list">/);
  });
});

describe('the ad card', () => {
  it('says what the next banner does overall, in plain words', () => {
    const card = renderShopBody({ ...endOf('web2-2005'), adCount: 6 }, 'security', VIEW);
    assert.match(card, /Next banner: [+−]\$[^ ]+ overall/);
    assert.doesNotMatch(card, /after the visitors it costs/);
  });
});
