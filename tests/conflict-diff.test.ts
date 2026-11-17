import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { markDifference } from '../src/ui/minigames/conflict-diff';

describe('the part of a line that differs', () => {
  it('marks a typo, and leaves the rest plain', () => {
    assert.deepEqual(markDifference('My Hompage', 'My Homepage'), { first: 'My Hompage', second: 'My Hom<mark>e</mark>page' });
  });

  it('marks a changed word on both sides', () => {
    assert.deepEqual(markDifference('text="white"', 'text="black"'), { first: 'text=&quot;<mark>white</mark>&quot;', second: 'text=&quot;<mark>black</mark>&quot;' });
  });

  it('escapes the code around the marks', () => {
    assert.equal(markDifference('<b>a</b>', '<b>b</b>').second, '&lt;b&gt;<mark>b</mark>&lt;/b&gt;');
  });

  it('marks nothing when the lines are the same', () => {
    assert.deepEqual(markDifference('same', 'same'), { first: 'same', second: 'same' });
  });
});
