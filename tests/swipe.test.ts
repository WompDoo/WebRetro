import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decaySwipeVelocity, isSwipeSettled, isTap, releaseSwipeVelocity, smoothSwipeVelocity, TAP_SLOP_PX } from '../src/ui/swipe';

describe('swiping the phone', () => {
  it('follows the finger’s speed, smoothed, and ignores a move with no time between', () => {
    const fromRest = smoothSwipeVelocity(0, 20, 10);
    assert.ok(fromRest > 1 && fromRest < 2);
    assert.ok(smoothSwipeVelocity(fromRest, 20, 10) > fromRest);
    assert.equal(smoothSwipeVelocity(1.5, 20, 0), 1.5);
  });

  it('flicks on release, but not after the finger stopped', () => {
    assert.equal(releaseSwipeVelocity(2, 16), 2);
    assert.equal(releaseSwipeVelocity(2, 300), 0);
  });

  it('glides on and slows down until it settles, in either direction', () => {
    const halfSecond = 500;
    const fullSecond = 1_000;
    assert.ok(decaySwipeVelocity(2, halfSecond) < 2 && decaySwipeVelocity(2, halfSecond) > 0);
    assert.ok(decaySwipeVelocity(-2, halfSecond) < 0);
    assert.ok(!isSwipeSettled(decaySwipeVelocity(2, 0)));
    assert.ok(isSwipeSettled(decaySwipeVelocity(2, fullSecond)));
  });

  it('counts a press that barely moved as a tap', () => {
    assert.ok(isTap(0));
    assert.ok(isTap(TAP_SLOP_PX - 1));
    assert.ok(!isTap(TAP_SLOP_PX));
  });
});
