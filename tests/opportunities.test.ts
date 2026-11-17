import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  BUFFS_BY_ID,
  calculateAdValuePerAd,
  claimOpportunity,
  codeEntryStatus,
  createPlaytestState,
  isBuffActive,
  listCodeKeys,
  OPPORTUNITY_WINDOW_MS,
  startCodeEntry,
  tickCodeEntry,
  typeCodeKey,
} from '../src/engine';
import type { CodeEntry, GameState } from '../src/engine';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 68;
const playing = (): GameState => ({ ...createPlaytestState('web2-2005', 'end', SEED, 'react'), hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [] });
const typeAll = (entry: CodeEntry, keys: readonly string[]): CodeEntry => keys.reduce(typeCodeKey, entry);

describe('opportunities', () => {
  it('turn up while you play, and wait their window out', () => {
    const due = { ...playing(), opportunityCountdownMs: 1 };
    const offered = advanceSimulation(due, 10, 'live').state;
    assert.equal(offered.opportunity?.kind, 'sponsor-slot');
    const gone = advanceSimulation(offered, OPPORTUNITY_WINDOW_MS, 'live');
    assert.equal(gone.state.opportunity, null);
    assert.ok(gone.events.some((event) => event.message === 'The sponsor went with someone else.'));
  });

  it('never turn up offline', () => {
    const due = { ...playing(), opportunityCountdownMs: 1 };
    assert.equal(advanceSimulation(due, 60_000, 'offline').state.opportunity, null);
  });

  it('only offer a sponsor when there are banners to sponsor', () => {
    const due = { ...playing(), adCount: 0, opportunityCountdownMs: 1 };
    assert.equal(advanceSimulation(due, 10, 'live').state.opportunity, null);
  });

  it("start their buff when won: a sponsor multiplies what a banner pays", () => {
    const offered = advanceSimulation({ ...playing(), opportunityCountdownMs: 1 }, 10, 'live').state;
    const id = offered.opportunity?.id ?? -1;
    const won = claimOpportunity(offered, id).state;
    assert.ok(isBuffActive(won, 'sponsor-slot'));
    assert.equal(won.opportunity, null);
    assert.ok(Math.abs(calculateAdValuePerAd(won) - calculateAdValuePerAd(offered) * BUFFS_BY_ID["sponsor-slot"].factor) < 1e-12);
    assert.equal(claimOpportunity(won, id).state, won, 'an offer is won once');
  });
});

describe('code entry', () => {
  it('asks for the letters and digits, not the spaces and dashes, in any case', () => {
    assert.deepEqual(listCodeKeys('sk-live 7Q'), ['S', 'K', 'L', 'I', 'V', 'E', '7', 'Q']);
    assert.equal(codeEntryStatus(typeAll(startCodeEntry('ab-1'), ['a', 'B', '1'])), 'won');
  });

  it('starts you over on a wrong key, stratagem style', () => {
    const wrong = typeAll(startCodeEntry('ABC'), ['A', 'B', 'X']);
    assert.equal(wrong.typed, 0);
    assert.equal(wrong.mistakes, 1);
  });

  it('starts the clock on the first key, and runs out', () => {
    const fresh = startCodeEntry('ABC');
    assert.equal(tickCodeEntry(fresh, 60_000).elapsedMs, 0);
    const started = typeCodeKey(fresh, 'A');
    assert.equal(codeEntryStatus(tickCodeEntry(started, started.limitMs)), 'lost');
  });
});
