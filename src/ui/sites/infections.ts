import { calculateInfectionDifficulty, calculateMsUntilHarder, MS_PER_SECOND } from '../../engine';
import type { Infection } from '../../engine';
import { escapeHtml } from '../dom';
import { MINIGAME_NAMES } from '../minigame-names';
import { formatMinutesAndSeconds } from './site-context';

const SPAM_LINES: readonly string[] = ['BUY CHEAP RINGTONES!!!', 'cl1ck h3re for fr33 $$$', 'great post. visit my site', 'V1AGR... [deleted]'];
/** What the paste site shows: usernames and their passwords, unhashed. */
const LEAKED_ROWS: readonly string[] = ['mel_b : iloveponies', 'grandma_rose : password1', 'theo1987 : theo1987', 'sam.k : 123456'];


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
  'password-leak': () => `<span class="infection-leak">${LEAKED_ROWS.map(escapeHtml).join('<br>')}</span><span class="infection-title">PASSWORDS LEAKED</span>`,
  ddos: () => '<span class="infection-error"><b>503 Service Unavailable</b><br>The server is temporarily unable to service your request. Too many connections.</span><span class="infection-title">DDoS ATTACK</span>',
  'broken-build': () =>
    '<span class="infection-error"><b>Failed to compile.</b><br>Module not found: Error: Can\'t resolve \'left-pad\' in \'/app/node_modules/string-utils\'</span><span class="infection-title">BUILD FAILED</span>',
};

const OVERLAY_HINTS: Readonly<Record<Infection['kind'], string>> = {
  virus: 'Click to remove it',
  spam: 'Click to clean up',
  'sql-injection': 'Click to restore it',
  'password-leak': 'Click to reset them',
  ddos: 'Click to shut it out',
  'broken-build': 'Click to fix the build',
};

/** Infections sit on top of the feature they took over, as a button that opens their minigame. */
export function renderInfectionOverlay(infection: Infection): string {
  return renderButton(infection, OVERLAY_BODIES[infection.kind](infection), OVERLAY_HINTS[infection.kind]);
}
