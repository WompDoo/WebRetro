import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateStoryProgress, clampToGesture, createStoryZone, easeInOut, findJackedStop, findSettleStop, placeReader } from '../src/ui/scroll-jack';

const START = 500;
const TRAVEL = 1_200;
const CHAPTERS = 5;
const STEP = TRAVEL / (CHAPTERS - 1);
const VIEWPORT = 400;
const zone = createStoryZone(START, TRAVEL, CHAPTERS, VIEWPORT);
const SMALL_FLICK = 40;
const HUGE_FLICK = 5_000;

describe('scroll-jacking', () => {
  it('has one stop per chapter, from the first to the last', () => {
    assert.deepEqual(zone.stops, [START, START + STEP, START + 2 * STEP, START + 3 * STEP, START + TRAVEL]);
  });

  it('sets the pace inside the story: a huge flick moves exactly one chapter, the same as a small one', () => {
    assert.equal(findJackedStop(START, SMALL_FLICK, zone), START + STEP);
    assert.equal(findJackedStop(START, HUGE_FLICK, zone), START + STEP);
    assert.equal(findJackedStop(START + 2 * STEP, -HUGE_FLICK, zone), START + STEP);
  });

  it('brings the story into place once it is on screen, however small the flick, from above or below', () => {
    assert.equal(findJackedStop(START - 100, SMALL_FLICK, zone), START);
    assert.equal(findJackedStop(START - 100, HUGE_FLICK, zone), START);
    assert.equal(findJackedStop(START + TRAVEL + 100, -SMALL_FLICK, zone), START + TRAVEL);
  });

  it('leaves the page alone while the story is off screen, and lets it go after the last chapter or before the first', () => {
    assert.equal(findJackedStop(START - VIEWPORT - 10, HUGE_FLICK, zone), null);
    assert.equal(findJackedStop(START + TRAVEL + VIEWPORT + 10, -HUGE_FLICK, zone), null);
    assert.equal(findJackedStop(START + TRAVEL, SMALL_FLICK, zone), null);
    assert.equal(findJackedStop(START, -SMALL_FLICK, zone), null);
    assert.equal(findJackedStop(START + STEP, 0, zone), null);
  });

  it('holds any other scrolling to one chapter per gesture, however far it went', () => {
    assert.equal(clampToGesture(START, START + 3 * STEP, zone), START + STEP);
    assert.equal(clampToGesture(START + 3 * STEP, START, zone), START + 2 * STEP);
    assert.equal(clampToGesture(START + STEP, START + STEP + 50, zone), START + STEP + 50);
  });

  it('stops other scrolling at the edge of the story, from far above or below', () => {
    assert.equal(clampToGesture(0, START + 2 * STEP, zone), START);
    assert.equal(clampToGesture(START + TRAVEL + 2_000, START + STEP, zone), START + TRAVEL);
  });

  it('lets other scrolling go past the last chapter, before the first, and outside the story', () => {
    assert.equal(clampToGesture(START + TRAVEL, START + TRAVEL + 900, zone), START + TRAVEL + 900);
    assert.equal(clampToGesture(START, 0, zone), 0);
    assert.equal(clampToGesture(0, START - 10, zone), START - 10);
  });

  it('settles a page left between two chapters on the nearer one', () => {
    assert.equal(findSettleStop(START + STEP + 40, zone), START + STEP);
    assert.equal(findSettleStop(START + STEP + STEP - 40, zone), START + 2 * STEP);
  });

  it('leaves a page resting on a chapter, or outside the story, where it is', () => {
    assert.equal(findSettleStop(START + STEP, zone), null);
    assert.equal(findSettleStop(START - 40, zone), null);
    assert.equal(findSettleStop(START + TRAVEL + 40, zone), null);
  });

  it('keeps the reader before the story where they are when its layout changes', () => {
    const place = placeReader(START - 200, { top: START, height: 2_000 }, 0);
    assert.equal(place.kind, 'before');
    assert.equal(place.findTop(START - 200, { top: START, height: 280 }, createStoryZone(START, 0, CHAPTERS, VIEWPORT)), START - 200);
  });

  it('keeps a reader in the story on their chapter: its stop when scrolling, the band when not', () => {
    const place = placeReader(START + 2 * STEP, { top: START, height: 2_000 }, 2);
    assert.equal(place.kind, 'in-story');
    assert.equal(place.findTop(START + 2 * STEP, { top: START, height: 280 }, createStoryZone(START, 0, CHAPTERS, VIEWPORT)), START);
    assert.equal(place.findTop(START + 100, { top: START, height: 2_000 }, zone), START + 2 * STEP);
  });

  it('keeps what comes after the story where it was on screen for a reader past it', () => {
    const place = placeReader(START + 2_100, { top: START, height: 2_000 }, CHAPTERS - 1);
    assert.equal(place.kind, 'after');
    assert.equal(place.findTop(START + 2_100, { top: START, height: 280 }, createStoryZone(START, 0, CHAPTERS, VIEWPORT)), START + 280 + 100);
  });

  it('tracks progress from the first chapter to the last, clamped outside', () => {
    assert.equal(calculateStoryProgress(START - 50, zone), 0);
    assert.equal(calculateStoryProgress(START + TRAVEL / 2, zone), 0.5);
    assert.equal(calculateStoryProgress(START + TRAVEL + 50, zone), 1);
  });

  it('eases each step in and out', () => {
    assert.deepEqual([0, 0.5, 1].map(easeInOut), [0, 0.5, 1]);
    assert.ok(easeInOut(0.1) < 0.1 && easeInOut(0.9) > 0.9);
  });
});
