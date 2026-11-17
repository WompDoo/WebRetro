import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findCurrentStage, isInWindow, launchWindowStatus, pressLaunch, startLaunchWindow, tickLaunchWindow } from '../src/engine';
import type { LaunchWindow } from '../src/engine';

const SEED = 4242;

/** Moves the marker into the middle of the current window: a perfect press waits until then. */
function waitForWindow(game: LaunchWindow): LaunchWindow {
  const stage = findCurrentStage(game);
  if (stage === null) return game;
  const middle = stage.windowStart + stage.windowWidth / 2;
  return tickLaunchWindow(game, middle * stage.crossingMs);
}

const hit = (game: LaunchWindow): LaunchWindow => pressLaunch(waitForWindow(game));

describe('the launch window', () => {
  it('waits for the first press: looking first is free', () => {
    const game = tickLaunchWindow(startLaunchWindow(SEED), 2_000);
    assert.equal(launchWindowStatus(game), 'waiting');
    assert.ok(game.elapsedMs > 0, 'the clock still runs');
  });

  it('is won by three presses inside the window', () => {
    const won = hit(hit(hit(startLaunchWindow(SEED))));
    assert.equal(launchWindowStatus(won), 'won');
    assert.equal(won.misses, 0);
  });

  it('starts a stage over on a miss, and counts it', () => {
    const early = pressLaunch(tickLaunchWindow(startLaunchWindow(SEED), 1));
    assert.equal(early.stageIndex, 0);
    assert.equal(early.misses, 1);
    assert.equal(early.position, 0);
    assert.equal(launchWindowStatus(early), 'running');
  });

  it('sweeps back and forth across the bar', () => {
    const game = startLaunchWindow(SEED);
    const crossing = findCurrentStage(game)?.crossingMs ?? 0;
    const atTheEnd = tickLaunchWindow(game, crossing);
    assert.ok(Math.abs(atTheEnd.position - 1) < 1e-9);
    const comingBack = tickLaunchWindow(game, crossing * 1.25);
    assert.ok(Math.abs(comingBack.position - 0.75) < 1e-9);
    assert.equal(comingBack.isMovingRight, false);
  });

  it('gets faster with a smaller window, stage by stage, and keeps windows away from the ends', () => {
    const { stages } = startLaunchWindow(SEED);
    stages.slice(1).forEach((stage, index) => {
      const previous = stages[index];
      assert.ok(previous !== undefined && stage.windowWidth < previous.windowWidth && stage.crossingMs < previous.crossingMs);
    });
    stages.forEach((stage) => assert.ok(stage.windowStart > 0.1 && stage.windowStart + stage.windowWidth < 0.9));
  });

  it('is lost when the clock runs out, and takes no presses after', () => {
    const late = tickLaunchWindow(pressLaunch(startLaunchWindow(SEED)), 20_000);
    assert.equal(launchWindowStatus(late), 'lost');
    assert.equal(pressLaunch(late), late);
  });

  it('counts the edges of the window as inside', () => {
    const stage = { windowStart: 0.4, windowWidth: 0.2, crossingMs: 1_000 };
    assert.ok(isInWindow(stage, 0.4) && isInWindow(stage, 0.6));
    assert.ok(!isInWindow(stage, 0.39) && !isInWindow(stage, 0.61));
  });
});
