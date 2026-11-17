import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addKeystrokePay,
  describeIncomeSources,
  describeTypingBoost,
  drainTypingIncome,
  isTypingIdle,
  readTypingIncomePerSecond,
  sumIncome,
  TYPING_INCOME_FADE_MS,
} from '../src/ui/typing-income';

const KEYSTROKES_PER_SECOND = 6;
const PAY_PER_KEYSTROKE = 10;
const STEADY_RATE = KEYSTROKES_PER_SECOND * PAY_PER_KEYSTROKE;
const MS_BETWEEN_KEYSTROKES = 1_000 / KEYSTROKES_PER_SECOND;

/** Typing for this long at a steady pace: drain between keystrokes, the way the tick and the keyboard take turns. */
function typeSteadily(pool: number, keystrokes: number): number {
  return Array.from({ length: keystrokes }).reduce<number>((current) => addKeystrokePay(drainTypingIncome(current, MS_BETWEEN_KEYSTROKES), PAY_PER_KEYSTROKE), pool);
}

describe('typing income', () => {
  it('reads your real rate once you type steadily', () => {
    const settled = typeSteadily(0, KEYSTROKES_PER_SECOND * 20);
    const rate = readTypingIncomePerSecond(settled);
    assert.ok(Math.abs(rate - STEADY_RATE) / STEADY_RATE < 0.1, `read ${rate}, typed ${STEADY_RATE}`);
  });

  it('climbs while you start typing', () => {
    const oneSecond = readTypingIncomePerSecond(typeSteadily(0, KEYSTROKES_PER_SECOND));
    const fiveSeconds = readTypingIncomePerSecond(typeSteadily(0, KEYSTROKES_PER_SECOND * 5));
    assert.ok(oneSecond > 0 && oneSecond < fiveSeconds);
  });

  it('drains away once you stop, to exactly nothing', () => {
    const settled = typeSteadily(0, KEYSTROKES_PER_SECOND * 20);
    assert.ok(drainTypingIncome(settled, TYPING_INCOME_FADE_MS) < settled / 2);
    assert.equal(drainTypingIncome(settled, TYPING_INCOME_FADE_MS * 20), 0);
  });
});

describe('the Income stat', () => {
  const sources = (site: number, typing: number, hired = 0): { site: number; hired: number; typing: number } => ({ site, hired, typing });

  it('adds up the site, hired help and your typing', () => {
    assert.equal(sumIncome(sources(100, 60, 40)), 200);
  });

  it('shows what your typing adds while you type', () => {
    assert.equal(describeTypingBoost(sources(100, 60)), '⌨ +$60');
    assert.equal(describeTypingBoost(sources(0, 0.5)), '⌨ +$0.50', 'the first keystrokes, before the site earns anything');
    assert.equal(isTypingIdle(sources(100, 60)), false);
  });

  it('reads zero while you don’t, rather than disappearing and moving the label', () => {
    assert.equal(describeTypingBoost(sources(100, 0)), '⌨ +$0.00');
    assert.equal(isTypingIdle(sources(100, 0)), true);
  });

  it('says where the money comes from, hired help once there is some', () => {
    assert.equal(describeIncomeSources(sources(100, 60)), 'Your site: $100/s · Your typing: $60/s');
    assert.equal(describeIncomeSources(sources(100, 60, 40)), 'Your site: $100/s · Your hires: $40/s · Your typing: $60/s');
  });
});
