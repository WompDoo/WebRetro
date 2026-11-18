import { calculateBacklinksEarned } from '../engine';
import type { GameState, LegacyState } from '../engine';
import { pluralizeBacklinks } from './ending';

/**
 * The options window: the game's settings in one place. Start over (a new site, the legacy kept), the playtest tools
 * when they're on, and the one that can't be undone, deleting everything this game keeps in this browser, behind a
 * second step that says exactly what goes.
 */

/** The window as shown, or with the delete step open. */
export type OptionsView = 'menu' | 'confirm-delete';

export interface OptionsContext {
  readonly state: GameState;
  readonly legacy: LegacyState;
  readonly isPlaytestEnabled: boolean;
  readonly isTestBuild: boolean;
}

function renderRow(title: string, text: string, action: string): string {
  return `<section class="options-row"><div class="options-text"><h3>${title}</h3><p>${text}</p></div>${action}</section>`;
}

function describeStartOver(context: OptionsContext): string {
  return context.isTestBuild
    ? 'A new site, back in 1997. Your Backlinks, perks and achievements stay.'
    : 'A new site, back in 1997. Your Backlinks and perks stay.';
}

function renderPlaytestRow(context: OptionsContext): string {
  if (!context.isPlaytestEnabled) return '';
  return renderRow(
    'Playtest tools',
    'On: the 🧪 button jumps eras and hands out money. A run they change earns no achievements; the next one does.',
    '<button type="button" class="ghost-button" data-action="options-playtest-off">Turn off</button>',
  );
}

function pluralizeAchievements(count: number): string {
  return count === 1 ? '1 achievement' : `${count} achievements`;
}

/** What deleting takes with it, in this player's own numbers. */
function describeWhatGoes(context: OptionsContext): string {
  const backlinks = context.legacy.backlinks + calculateBacklinksEarned(context.state);
  const achievements = context.isTestBuild ? `, ${pluralizeAchievements(context.legacy.achievementIds.length)}` : '';
  return `Your site, ${pluralizeBacklinks(backlinks)}, every perk${achievements} and your settings: everything this game keeps in this browser.`;
}

function renderDeleteRow(context: OptionsContext): string {
  return renderRow(
    'Delete all my data',
    `${describeWhatGoes(context)} You start from nothing, as on the first visit.`,
    '<button type="button" class="danger-button" data-action="ask-delete-data">Delete all my data…</button>',
  );
}

function renderDeleteConfirm(context: OptionsContext): string {
  return `<section class="options-row is-confirm" role="alert"><div class="options-text"><h3>Delete everything?</h3><p>${describeWhatGoes(context)} It can’t be undone.</p></div>
    <div class="options-confirm-actions"><button type="button" class="ghost-button" data-action="cancel-delete-data">Keep my data</button><button type="button" class="danger-button" data-action="confirm-delete-data">Delete everything</button></div></section>`;
}

const DELETE_ROWS: Readonly<Record<OptionsView, (context: OptionsContext) => string>> = {
  menu: renderDeleteRow,
  'confirm-delete': renderDeleteConfirm,
};

export function renderOptions(context: OptionsContext, view: OptionsView): string {
  const startOver = renderRow('Start over', describeStartOver(context), '<button type="button" class="ghost-button" data-action="open-reset">Start over…</button>');
  return `<header class="options-head"><h2 id="options-heading">Options</h2><button type="button" class="ghost-button" data-action="close-options">Close</button></header>
    ${startOver}${renderPlaytestRow(context)}${DELETE_ROWS[view](context)}`;
}
