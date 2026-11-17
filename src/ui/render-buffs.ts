import { BUFFS_BY_ID, calculateBuffFactor, formatPercent, MS_PER_SECOND } from '../engine';
import type { ActiveBuff, BuffTarget, GameState } from '../engine';
import { escapeHtml } from './dom';

/**
 * Every buff looks the same way: a burning chip hanging from the top bar with what it does and how long it lasts,
 * and whatever it boosts on fire (the editor, the visitors count, the revenue).
 */

const TARGET_NAMES: Readonly<Record<BuffTarget, string>> = {
  typing: 'typing',
  traffic: 'visitors',
  'ad-value': 'ad revenue',
};

/** Doubling and more read as ×3; small boosts as +15%. */
const MULTIPLIER_FROM = 2;

function describeFactor(factor: number): string {
  return factor >= MULTIPLIER_FROM ? `×${factor}` : `+${formatPercent(factor - 1)}`;
}

function renderChip(buff: ActiveBuff): string {
  const definition = BUFFS_BY_ID[buff.id];
  const seconds = Math.ceil(buff.remainingMs / MS_PER_SECOND);
  return `<span class="buff-chip" data-buff="${buff.id}"><span class="buff-icon" aria-hidden="true">${definition.icon}</span><b>${escapeHtml(definition.name)}</b> ${describeFactor(definition.factor)} ${TARGET_NAMES[definition.target]} · ${seconds} s</span>`;
}

export function renderBuffChips(state: GameState): string {
  return state.buffs.map(renderChip).join('');
}

/** Whether this number is being boosted right now: its stat burns along with the chip. */
export function isTargetBuffed(state: GameState, target: BuffTarget): boolean {
  return calculateBuffFactor(state, target) > 1;
}

/** What's left of the fire, for the editor's countdown: 0 when you aren't on fire. */
export function findFireRemainingMs(state: GameState): number {
  return state.buffs.find((buff) => buff.id === 'on-fire')?.remainingMs ?? 0;
}
