import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  calculateAdValuePerAd,
  calculateDirectRevenuePerVisitor,
  calculateGateChecks,
  calculateServerLoad,
  calculateSpecializationProgress,
  calculateVisitorsPerSecond,
  canSpecializeInto,
  checkSpecializationUnlocks,
  createEraRecord,
  createInitialGameState,
  createPlaytestState,
  ERAS_BY_ID,
  listGateRequirements,
  listSpecializationChoices,
  listSpecializationEffects,
  SPECIALIZATION_IDS,
  SPECIALIZATIONS_BY_ID,
  specialize,
} from '../src/engine';
import type { GameState, SpecializationId } from '../src/engine';
import { describeSpecializationPath, renderSpecializationChoice, renderSpecializationPanel } from '../src/ui/render-specializations';
import { renderSite } from '../src/ui/sites';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 77;
const testBuild = (state: GameState): GameState => ({ ...state, edition: 'webspecialization' });
const at = (eraId: 'web2-2005' | 'social-2011' | 'platform-2018' | 'ai-2024', stage: 'start' | 'end' = 'end'): GameState =>
  testBuild({ ...createPlaytestState(eraId, stage, SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [] });
const as = (state: GameState, specializationId: SpecializationId): GameState => ({ ...state, specializationId });
const withLevels = (state: GameState, levels: Partial<GameState['featureLevels']>): GameState => ({ ...state, featureLevels: { ...state.featureLevels, ...levels } });

describe('unlocking a specialization', () => {
  it('happens this run, by building, with a news line', () => {
    const photos = withLevels(at('web2-2005'), { 'photo-gallery': 15, comments: 10 });
    const step = checkSpecializationUnlocks(photos);
    assert.ok(step.state.unlockedSpecializationIds.includes('photos'));
    assert.match(step.events.map((event) => event.message).join(' '), /New specialization unlocked: Photo sharing/);
    assert.deepEqual(checkSpecializationUnlocks(step.state).events, [], 'once');
  });

  it('shows how far along each condition is', () => {
    const progress = calculateSpecializationProgress(withLevels(at('web2-2005'), { 'photo-gallery': 9 }), 'photos');
    assert.deepEqual(progress.map((condition) => [condition.label, condition.current, condition.target, condition.isMet]), [['Photo gallery', 9, 15, false], ['Comments', 5, 10, false]]);
  });

  it('never happens in the classic game, and a new run starts with none', () => {
    const classic = { ...withLevels(at('web2-2005'), { 'photo-gallery': 15, comments: 10 }), edition: 'classic' as const };
    assert.deepEqual(checkSpecializationUnlocks(classic).state.unlockedSpecializationIds, []);
    assert.deepEqual(createInitialGameState(1).unlockedSpecializationIds, []);
  });

  it('is checked as the game runs', () => {
    const ready = withLevels(at('web2-2005'), { 'map-mashup': 10, comments: 10 });
    assert.ok(advanceSimulation(ready, 100, 'live').state.unlockedSpecializationIds.includes('reviews'));
  });
});

describe('specializing', () => {
  it('is offered at the relaunches into 2011, 2018 and 2024, in the test build', () => {
    assert.equal(canSpecializeInto(at('web2-2005'), 'social-2011'), true);
    assert.equal(canSpecializeInto(at('web2-2005'), 'web2-2005'), false, 'not before 2011');
    assert.equal(canSpecializeInto({ ...at('web2-2005'), edition: 'classic' }, 'social-2011'), false);
  });

  it('offers Homepage (no specialization) and whatever this run unlocked', () => {
    const state = { ...at('web2-2005'), unlockedSpecializationIds: ['video', 'news'] as const };
    assert.deepEqual(listSpecializationChoices(state), ['homepage', 'video', 'news']);
    assert.equal(specialize(state, 'video').specializationId, 'video');
    assert.equal(specialize(state, 'shop').specializationId, 'homepage', 'not unlocked');
  });

  it('asks the checklist for the specialization’s focus from 2011 on', () => {
    const focus = (state: GameState): string => calculateGateChecks(state).find((check) => check.requirement.kind === 'feature-level')?.requirement.label ?? '';
    assert.equal(focus(as(at('social-2011'), 'video')), 'Video player level 15');
    assert.equal(focus(as(at('social-2011'), 'homepage')), 'Like and share buttons level 15');
    assert.equal(focus(as(at('web2-2005'), 'video')), 'Blog level 15', 'before 2011 every site is a homepage');
  });

  it('gives every specialization a focus feature of its era for every era it shapes', () => {
    SPECIALIZATION_IDS.forEach((id) => Object.entries(SPECIALIZATIONS_BY_ID[id].eras).forEach(([, plan]) => assert.ok(plan.focus.length > 0)));
  });
});

describe('how a specialization makes money', () => {
  const base = at('social-2011');

  it('a video site pays more per ad and costs more to serve', () => {
    assert.ok(calculateAdValuePerAd(as(base, 'video')) > calculateAdValuePerAd(base));
    assert.ok(calculateServerLoad(as(base, 'video')) > calculateServerLoad(base));
  });

  it('a shop sells: money per visitor without ads', () => {
    assert.equal(calculateDirectRevenuePerVisitor(base), 0);
    assert.ok(calculateDirectRevenuePerVisitor(as(base, 'shop')) > 0);
  });

  it('a social network starts slow and pays off later', () => {
    assert.ok(calculateAdValuePerAd(as(base, 'social')) < calculateAdValuePerAd(base));
    const later = at('ai-2024');
    assert.ok(calculateAdValuePerAd(as(later, 'social')) > calculateAdValuePerAd(later));
  });

  it('a microblog brings the most visitors', () => {
    assert.ok(calculateVisitorsPerSecond(as(base, 'microblog')) > calculateVisitorsPerSecond(base));
  });
});

describe('specializations on screen', () => {
  it('list every one with its progress in the test build, and nothing in the classic game', () => {
    const html = renderSpecializationPanel(at('web2-2005'), true);
    SPECIALIZATION_IDS.forEach((id) => assert.ok(html.includes(SPECIALIZATIONS_BY_ID[id].name), id));
    assert.match(html, /Photo gallery 5\/15/);
    assert.match(html, /Builds in 2011/, 'the routes 2011 unlocks say when');
    assert.equal(renderSpecializationPanel({ ...at('web2-2005'), edition: 'classic' }, true), '');
  });

  it('offer only what this run unlocked at the relaunch, and say how many more there are', () => {
    const html = renderSpecializationChoice({ ...at('web2-2005'), unlockedSpecializationIds: ['photos'] }, 'social-2011', 'photos');
    assert.match(html, /data-id="photos" aria-pressed="true"/);
    assert.match(html, /data-id="homepage" aria-pressed="false"/);
    assert.doesNotMatch(html, /data-id="video"/);
    assert.match(html, /7 more you haven’t unlocked/);
  });

  it('end with what the homepage became', () => {
    const photos2011 = createEraRecord(as(at('social-2011'), 'photos'));
    const social2018 = createEraRecord(as(at('platform-2018'), 'social'));
    const ending = { ...as(at('ai-2024'), 'social'), eraRecords: [photos2011, social2018] };
    assert.equal(describeSpecializationPath(ending), 'Your homepage became a photo-sharing site, then a social network.');
    assert.equal(describeSpecializationPath(at('ai-2024')), '', 'a site that stayed a homepage says nothing');
  });
});

describe('staying a homepage', () => {
  const classic = (state: GameState): GameState => ({ ...state, edition: 'classic' });
  const shapedEras = ['social-2011', 'platform-2018', 'ai-2024'] as const;

  it('is the classic game: the same checklist, the same money and the same page in every era a route could change', () => {
    shapedEras.forEach((eraId) => {
      const homepage = as(at(eraId), 'homepage');
      assert.deepEqual(listGateRequirements(homepage), ERAS_BY_ID[eraId].gateRequirements, eraId);
      assert.deepEqual(listSpecializationEffects(homepage), [], eraId);
      assert.equal(calculateVisitorsPerSecond(homepage), calculateVisitorsPerSecond(classic(homepage)), eraId);
      assert.equal(calculateAdValuePerAd(homepage), calculateAdValuePerAd(classic(homepage)), eraId);
      assert.equal(calculateServerLoad(homepage), calculateServerLoad(classic(homepage)), eraId);
      assert.equal(renderSite(homepage, 0), `<div class="site-theme">${renderSite(classic(homepage), 0)}</div>`, `${eraId}: the page, unthemed`);
    });
  });

  it('is always offered, first, and a specialized site can go back to it', () => {
    assert.equal(listSpecializationChoices(at('web2-2005'))[0], 'homepage');
    assert.equal(specialize(as(at('platform-2018'), 'video'), 'homepage').specializationId, 'homepage');
    assert.match(renderSpecializationChoice(at('web2-2005'), 'social-2011', 'homepage'), /data-id="homepage" aria-pressed="true"[\s\S]*Homepage[\s\S]*No specialization/);
  });

  it('ends the story as a homepage again, after being something else', () => {
    const video2011 = createEraRecord(as(at('social-2011'), 'video'));
    const ending = { ...as(at('ai-2024'), 'homepage'), eraRecords: [createEraRecord(at('web2-2005')), video2011] };
    assert.equal(describeSpecializationPath(ending), 'Your homepage became a video site, then a homepage again.');
  });
});
