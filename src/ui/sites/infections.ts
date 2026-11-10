import { calculateInfectionDifficulty, calculateMsUntilHarder, MS_PER_SECOND } from '../../engine';
import type { Infection, MinigameId } from '../../engine';
import { escapeHtml } from '../dom';
import { formatMinutesAndSeconds } from './site-context';

const SPAM_LINES: readonly string[] = ['BUY CHEAP RINGTONES!!!', 'cl1ck h3re for fr33 $$$', 'great post. visit my site', 'V1AGR... [deleted]'];

/** What the player is about to play, so the overlay can say it. */
const MINIGAME_NAMES: Readonly<Record<MinigameId, string>> = {
  snake: 'Snake',
  'virus-scan': 'Virus scan',
  firewall: 'Firewall',
  'spam-sort': 'Sort the comments',
  'backup-restore': 'Restore a backup',
};

export function renderInfectionTimer(infection: Infection): string {
  const msUntilHarder = calculateMsUntilHarder(infection);
  return msUntilHarder === null ? 'At its worst' : `Gets harder in ${formatMinutesAndSeconds(Math.ceil(msUntilHarder / MS_PER_SECOND))}`;
}

function renderButton(infection: Infection, body: string, hint: string): string {
  const level = calculateInfectionDifficulty(infection);
  return `<button type="button" class="infection" data-action="open-minigame" data-id="${infection.id}" data-kind="${infection.kind}">${body}<span class="infection-hint">${escapeHtml(hint)} · ${escapeHtml(MINIGAME_NAMES[infection.minigameId])}, level ${level}</span><span class="infection-timer" data-live="infection-timer" data-id="${infection.id}">${renderInfectionTimer(infection)}</span></button>`;
}

const OVERLAY_BODIES: Readonly<Record<Infection['kind'], (infection: Infection) => string>> = {
  virus: () => '<span class="infection-title">☣ VIRUS DETECTED</span>',
  spam: () => `<span class="infection-spam">${SPAM_LINES.map(escapeHtml).join('<br>')}</span><span class="infection-title">SPAM FLOOD</span>`,
  'sql-injection': (infection) =>
    `<span class="infection-error"><b>Warning</b>: mysql_fetch_array(): supplied argument is not a valid MySQL result resource in <b>/home/you/public_html/${infection.featureId}.php</b> on line <b>42</b></span><span class="infection-sql">Latest comment: '; DROP TABLE ${infection.featureId};--</span>`,
};

const OVERLAY_HINTS: Readonly<Record<Infection['kind'], string>> = {
  virus: 'Click to remove it',
  spam: 'Click to clean up',
  'sql-injection': 'Click to restore it',
};

/** Infections sit on top of the feature they took over, as a button that opens their minigame. */
export function renderInfectionOverlay(infection: Infection): string {
  return renderButton(infection, OVERLAY_BODIES[infection.kind](infection), OVERLAY_HINTS[infection.kind]);
}
