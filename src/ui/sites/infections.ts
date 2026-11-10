import { calculateMsUntilVirusGrows, calculateRequiredVirusFood, MS_PER_SECOND } from '../../engine';
import type { ClickInfection, Infection, VirusInfection } from '../../engine';
import { escapeHtml } from '../dom';
import { formatMinutesAndSeconds } from './site-context';

const SPAM_LINES: readonly string[] = ['BUY CHEAP RINGTONES!!!', 'cl1ck h3re for fr33 $$$', 'great post. visit my site', 'V1AGR... [deleted]'];

export function renderVirusTimer(virus: VirusInfection): string {
  const msUntilGrowth = calculateMsUntilVirusGrows(virus);
  return msUntilGrowth === null
    ? 'Fully grown'
    : `Needs ${calculateRequiredVirusFood(virus) + 1} food in ${formatMinutesAndSeconds(Math.ceil(msUntilGrowth / MS_PER_SECOND))}`;
}

function renderVirusOverlay(virus: VirusInfection): string {
  const food = calculateRequiredVirusFood(virus);
  return `<button type="button" class="infection" data-action="open-snake" data-id="${virus.id}" data-kind="virus"><span class="infection-title">☣ VIRUS DETECTED</span><span class="infection-hint">Click to remove it · ${food} food needed</span><span class="infection-timer" data-live="virus-timer" data-id="${virus.id}">${renderVirusTimer(virus)}</span></button>`;
}

function renderSpamOverlay(spam: ClickInfection): string {
  return `<button type="button" class="infection" data-action="scrub-infection" data-id="${spam.id}" data-kind="spam"><span class="infection-spam">${SPAM_LINES.map(escapeHtml).join('<br>')}</span><span class="infection-title">SPAM FLOOD</span><span class="infection-hint">Click to delete the spam · ${spam.cleanClicksRemaining} left</span></button>`;
}

function renderSqlInjectionOverlay(injection: ClickInfection): string {
  return `<button type="button" class="infection" data-action="scrub-infection" data-id="${injection.id}" data-kind="sql-injection"><span class="infection-error"><b>Warning</b>: mysql_fetch_array(): supplied argument is not a valid MySQL result resource in <b>/home/you/public_html/${injection.featureId}.php</b> on line <b>42</b></span><span class="infection-sql">Latest comment: '; DROP TABLE ${injection.featureId};--</span><span class="infection-hint">Click to restore from backup · ${injection.cleanClicksRemaining} left</span></button>`;
}

function renderClickInfectionOverlay(infection: ClickInfection): string {
  return infection.kind === 'spam' ? renderSpamOverlay(infection) : renderSqlInjectionOverlay(infection);
}

/** Infections sit on top of the feature they took over, as a button that starts the cleanup. */
export function renderInfectionOverlay(infection: Infection): string {
  return infection.kind === 'virus' ? renderVirusOverlay(infection) : renderClickInfectionOverlay(infection);
}
