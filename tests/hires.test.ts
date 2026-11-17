import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceSimulation,
  calculateAutoKeystrokesPerSecond,
  calculateBugChance,
  calculateHiredTypingPerSecond,
  calculateKeystrokeValue,
  createPlaytestState,
  ERA_IDS,
  startBuff,
  UPGRADE_IDS,
  UPGRADES_BY_ID,
} from '../src/engine';
import type { EraId, GameState, UpgradeId } from '../src/engine';
import { accrueAutoKeystrokes, describeHiredKeystroke, MAX_SHOWN_AUTO_KEYSTROKES_PER_SECOND } from '../src/ui/auto-typing';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 74;
const HOUR_MS = 60 * 60_000;
const SECONDS_PER_HOUR = 3_600;
const ACTIVE_PLAYER_KEYSTROKES_PER_SECOND = 6;
const CRASH_RUN = 3;

const hiresOf = (eraId: EraId): readonly UpgradeId[] =>
  UPGRADE_IDS.filter((id) => UPGRADES_BY_ID[id].eraId === eraId && UPGRADES_BY_ID[id].effects.some((effect) => effect.kind === 'auto-keystrokes'));

function withHires(state: GameState, hires: readonly UpgradeId[], isHired: boolean): GameState {
  const others = state.purchasedUpgradeIds.filter((id) => !hires.includes(id));
  return { ...state, purchasedUpgradeIds: isHired ? [...others, ...hires] : others };
}

/** The end of an era, quiet, with or without its own hire. The crash only comes with the third run. */
function atEnd(eraId: EraId, isHired: boolean): GameState {
  const preset = createPlaytestState(eraId, 'end', SEED, 'react');
  const state = { ...preset, runNumber: eraId === 'crash-2000' ? CRASH_RUN : preset.runNumber, hazardCountdownsMs: QUIET_HAZARDS, infections: [], popups: [] };
  return withHires(state, hiresOf(eraId), isHired);
}

function hireRate(eraId: EraId): number {
  return calculateAutoKeystrokesPerSecond(atEnd(eraId, true)) - calculateAutoKeystrokesPerSecond(atEnd(eraId, false));
}

describe('hired help', () => {
  it('one hire per era, each faster than the last, until the AI out-types you', () => {
    ERA_IDS.forEach((eraId) => assert.equal(hiresOf(eraId).length, 1, `${eraId} needs exactly one hire`));
    const rates = ERA_IDS.map(hireRate);
    rates.slice(1).forEach((rate, index) => assert.ok(rate > (rates[index] ?? 0), `${ERA_IDS[index + 1] ?? ''} is no faster`));
    assert.ok((rates[rates.length - 1] ?? 0) > ACTIVE_PLAYER_KEYSTROKES_PER_SECOND, 'the AI types faster than an active player');
  });

  it('earn what their keystrokes are worth, typos included', () => {
    const state = atEnd('web2-2005', true);
    const expected = (calculateAutoKeystrokesPerSecond(state) * calculateKeystrokeValue(state)) / (1 + calculateBugChance(state));
    assert.ok(Math.abs(calculateHiredTypingPerSecond(state) - expected) / expected < 1e-9);
    assert.equal(calculateHiredTypingPerSecond(atEnd('web2-2005', false)), 0, 'nobody hired, nothing earned');
  });

  it('are this era’s help: 1997’s little brother doesn’t come to 2005, but he stays through the crash', () => {
    const brother = hiresOf('homepage-1997');
    assert.equal(calculateAutoKeystrokesPerSecond(withHires(atEnd('web2-2005', false), brother, true)), 0);
    assert.ok(calculateAutoKeystrokesPerSecond(withHires(atEnd('crash-2000', false), brother, true)) > 0);
  });

  it('aren’t on fire: being on fire is yours alone', () => {
    const state = atEnd('social-2011', true);
    assert.equal(calculateHiredTypingPerSecond(startBuff(state, 'on-fire')), calculateHiredTypingPerSecond(state));
  });

  it('keep typing while you’re away, and their pay isn’t the features’', () => {
    const hired = atEnd('platform-2018', true);
    const alone = atEnd('platform-2018', false);
    const away = advanceSimulation(hired, HOUR_MS, 'offline').state;
    const awayAlone = advanceSimulation(alone, HOUR_MS, 'offline').state;
    const hiredPay = calculateHiredTypingPerSecond(hired) * SECONDS_PER_HOUR;
    assert.ok(Math.abs(away.money - awayAlone.money - hiredPay) / hiredPay < 1e-6);
    assert.deepEqual(away.featureEarnings, awayAlone.featureEarnings);
  });
});

describe('hired help in the editor', () => {
  it('types at their pace, and no faster than you can follow', () => {
    const slow = accrueAutoKeystrokes(0, 0.2, 4_000);
    assert.equal(slow.keystrokes, 0);
    assert.ok(Math.abs(slow.pending - 0.8) < 1e-9);
    assert.equal(accrueAutoKeystrokes(slow.pending, 0.2, 1_000).keystrokes, 1);
    assert.equal(accrueAutoKeystrokes(0, 12, 500).keystrokes, MAX_SHOWN_AUTO_KEYSTROKES_PER_SECOND / 2);
  });

  it('catches up a few keystrokes after a hidden tab, not a minute’s worth', () => {
    assert.ok(accrueAutoKeystrokes(0, 12, 60_000).keystrokes <= 3);
    assert.equal(accrueAutoKeystrokes(0, 0, 60_000).keystrokes, 0, 'nobody hired, nobody types');
  });

  it('floats what each shown keystroke is worth, so the floaters add up to the real pay', () => {
    assert.equal(describeHiredKeystroke('ai-2024', 400, 12), `🤖 +$${400 / MAX_SHOWN_AUTO_KEYSTROKES_PER_SECOND}`);
    assert.equal(describeHiredKeystroke('homepage-1997', 1, 0.2), '👦 +$5');
  });
});
