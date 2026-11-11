import { ERA_IDS, ERAS_BY_ID, formatMoney, FRAMEWORK_IDS, FRAMEWORKS_BY_ID, MINIGAME_IDS, UPGRADES_BY_ID } from '../engine';
import type { EraId, GameState } from '../engine';
import { escapeHtml } from './dom';
import { MINIGAME_NAMES } from './minigame-names';

/** Game speed for idle testing: one real second runs this many game seconds. */
export type PlaytestSpeed = 1 | 10 | 60;
export const PLAYTEST_SPEEDS: readonly PlaytestSpeed[] = [1, 10, 60];
export const PLAYTEST_INCOME_SECONDS = 600;
export const PLAYTEST_MONEY_FACTOR = 10;


/** The tap gesture: five taps on the money within this long. */
const UNLOCK_TAPS = 5;
const UNLOCK_WINDOW_MS = 2_000;

export interface PlaytestView {
  readonly speed: PlaytestSpeed;
  readonly hasBackup: boolean;
}

/** On when the address asks for it: ?playtest or #playtest. */
export function isPlaytestRequested(location: Location): boolean {
  return new URLSearchParams(location.search).has('playtest') || location.hash === '#playtest';
}

/** Counts quick taps on the money. Returns true on the fifth tap within two seconds. */
export function createTapCounter(now: () => number): () => boolean {
  let taps: readonly number[] = [];
  return () => {
    const at = now();
    taps = [...taps.filter((tap) => at - tap < UNLOCK_WINDOW_MS), at];
    const isUnlocked = taps.length >= UNLOCK_TAPS;
    if (isUnlocked) taps = [];
    return isUnlocked;
  };
}

function button(action: string, id: string, label: string, extra = ''): string {
  return `<button type="button" class="ghost-button" data-action="${action}" data-id="${escapeHtml(id)}"${extra}>${escapeHtml(label)}</button>`;
}

/** An era whose skills include the framework wars: its end comes in one flavour per framework. */
function hasFrameworkChoice(eraId: EraId): boolean {
  return FRAMEWORK_IDS.some((frameworkId) => UPGRADES_BY_ID[FRAMEWORKS_BY_ID[frameworkId].skillId].eraId === eraId);
}

function renderEndJumps(eraId: EraId): string {
  return hasFrameworkChoice(eraId)
    ? FRAMEWORK_IDS.map((frameworkId) => button('playtest-jump', `${eraId}:end:${frameworkId}`, `End: ${FRAMEWORKS_BY_ID[frameworkId].name}`)).join('')
    : button('playtest-jump', `${eraId}:end`, 'End: ready to relaunch');
}

function renderEraJumps(state: GameState): string {
  const rows = ERA_IDS.map((eraId) => {
    const era = ERAS_BY_ID[eraId];
    const current = state.eraId === eraId ? ' <span class="playtest-here">you are here</span>' : '';
    return `<li class="playtest-era"><span><b>${era.year}</b> ${escapeHtml(era.name)}${current}</span><span class="playtest-buttons">${button('playtest-jump', `${eraId}:start`, 'Start')}${renderEndJumps(eraId)}</span></li>`;
  }).join('');
  return `<h3 class="playtest-heading">Jump to an era</h3><ul class="playtest-eras">${rows}</ul>`;
}

function renderBackup(view: PlaytestView): string {
  return view.hasBackup
    ? `<p class="playtest-note">Your own game is backed up. ${button('playtest-restore', 'own', 'Back to my own game')}</p>`
    : '<p class="playtest-note">Jumping replaces the game you’re playing; the first jump backs it up so you can come back.</p>';
}

function renderMoney(state: GameState): string {
  return `<h3 class="playtest-heading">Money</h3><p class="playtest-buttons">${button('playtest-income', 'ten-minutes', '+10 minutes of income')}${button('playtest-money', 'times-ten', `Money ×${PLAYTEST_MONEY_FACTOR} (now ${formatMoney(state.money)})`)}</p>`;
}

function renderMinigames(): string {
  const buttons = MINIGAME_IDS.map((minigameId) => button('playtest-minigame', minigameId, MINIGAME_NAMES[minigameId])).join('');
  return `<h3 class="playtest-heading">Play a minigame</h3><p class="playtest-buttons">${buttons}</p>`;
}

function renderHazards(state: GameState): string {
  const noServer = ERAS_BY_ID[state.eraId].hasServerLoad ? '' : ' disabled title="1997 has no server to overload"';
  return `<h3 class="playtest-heading">Hazards</h3><p class="playtest-buttons">${button('playtest-popup', 'popup', 'Pop-up')}${button('playtest-spike', 'spike', 'Traffic spike', noServer)}</p>`;
}

function renderSpeed(view: PlaytestView): string {
  const buttons = PLAYTEST_SPEEDS.map((speed) => button('playtest-speed', String(speed), `${speed}×`, speed === view.speed ? ' aria-pressed="true"' : ' aria-pressed="false"')).join('');
  return `<h3 class="playtest-heading">Game speed</h3><p class="playtest-buttons">${buttons}</p>`;
}

export function renderPlaytestPanel(state: GameState, view: PlaytestView): string {
  return [renderEraJumps(state), renderBackup(view), renderMoney(state), renderMinigames(), renderHazards(state), renderSpeed(view)].join('');
}
