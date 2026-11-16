import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState } from '../src/engine';
import { ERA_PRESENTATION, listEntryStories } from '../src/ui/presentation';
import { renderRelaunchStory, renderYearOdometer } from '../src/ui/relaunch-story';

/**
 * The relaunch used to be three paragraphs and seven two-line bullets, and on a laptop the Relaunch button sat below
 * the screen. These keep it short enough to read at a glance; the CSS keeps the button in view.
 */

const SEED = 58;
const MAX_HOOK_CHARACTERS = 140;
const MAX_CARD_TITLE_WORDS = 5;
const MAX_CARD_TEXT_CHARACTERS = 80;
const MIN_CARDS = 4;
const MAX_CARDS = 6;

const stories = listEntryStories().map((story) => ({ eraId: story.heading, story }));

describe('every relaunch reads at a glance', () => {
  it('has a one-line hook and four to six short cards', () => {
    stories.forEach(({ eraId, story }) => {
      assert.ok(story.hook.length <= MAX_HOOK_CHARACTERS, `${eraId} hook: ${story.hook.length} characters`);
      assert.ok(story.highlights.length >= MIN_CARDS && story.highlights.length <= MAX_CARDS, `${eraId}: ${story.highlights.length} cards`);
      story.highlights.forEach((card) => {
        assert.ok(card.title.split(' ').length <= MAX_CARD_TITLE_WORDS, `${eraId}: "${card.title}"`);
        assert.ok(card.text.length <= MAX_CARD_TEXT_CHARACTERS, `${eraId}: "${card.text}" is ${card.text.length} characters`);
      });
    });
  });
});

describe('the relaunch card', () => {
  const preset2018 = createPlaytestState('platform-2018', 'end', SEED, 'react');
  // Stories retire in 2024: what they earned comes back as the trade-in.
  const end2018 = { ...preset2018, featureEarnings: { ...preset2018.featureEarnings, stories: 2_000_000 } };
  const story = ERA_PRESENTATION['ai-2024'].entryStory;

  it('rolls the year over from the era you leave to the one you enter', () => {
    const odometer = renderYearOdometer(2018, 2024);
    assert.equal((odometer.match(/class="odometer-digit"/g) ?? []).length, 4);
    assert.match(odometer, /--from:1;--to:2;--index:2/);
    assert.match(odometer, /--from:8;--to:14;--index:3/);
  });

  it('shows the cards, strikes through what retires, folds the story away, and offers a way out', () => {
    assert.ok(story !== null);
    const html = renderRelaunchStory(end2018, 'ai-2024', story);
    assert.equal((html.match(/class="relaunch-card"/g) ?? []).length, story.highlights.length);
    assert.match(html, /<s class="retiring-chip"[^>]*>Stories<\/s>/);
    assert.match(html, /Trade-in \$1\.00M/);
    assert.match(html, /<details class="relaunch-story"><summary>Read the story<\/summary>/);
    assert.match(html, /data-action="cancel-migration">Not yet/);
    assert.match(html, /data-action="confirm-migration">Relaunch with AI/);
    assert.match(html, /data-era-to="2024"/);
  });
});
