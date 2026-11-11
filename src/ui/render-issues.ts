import type { EraId, GameState } from '../engine';
import { escapeHtml } from './dom';
import type { Issue, IssueButton } from './issues';
import { renderLiveSlotText } from './sites';

interface TrackerStyle {
  readonly panelTitle: string;
  readonly emptyText: string;
  readonly renderIssue: (issue: Issue, state: GameState, nowMs: number) => string;
}

function renderButton(button: IssueButton | null, className: string): string {
  if (button === null) return '';
  return `<button type="button" class="${className}" data-action="${button.action}" data-id="${escapeHtml(button.id)}">${escapeHtml(button.label)}</button>`;
}

function renderActions(issue: Issue): string {
  const buttons = `${renderButton(issue.fix, 'issue-fix')}${renderButton(issue.prevention, 'issue-prevent')}`;
  return buttons === '' ? '' : `<span class="issue-actions">${buttons}</span>`;
}

/** The static summary plus the live part (countdown, load, time left) that updates in place. */
function renderMeta(issue: Issue, state: GameState, nowMs: number): string {
  const live = renderLiveSlotText(issue.liveSlot, issue.liveId, state, nowMs);
  return `<span class="issue-meta">${escapeHtml(issue.summary)} · <span data-live="${issue.liveSlot}" data-id="${issue.liveId}">${escapeHtml(live)}</span></span>`;
}

/** 1997: problems arrive as email from your visitors. */
function renderEmail(issue: Issue, state: GameState, nowMs: number): string {
  return `<li class="issue issue--email" data-severity="${issue.severity}">
    <span class="issue-from">From: ${escapeHtml(issue.sender)}</span>
    <span class="issue-subject">${escapeHtml(issue.subject)}</span>
    ${renderMeta(issue, state, nowMs)}${renderActions(issue)}
  </li>`;
}

/** 2005: a bug tracker with numbers, severities and statuses nobody updates. */
function renderBug(issue: Issue, state: GameState, nowMs: number): string {
  return `<li class="issue issue--bug" data-severity="${issue.severity}">
    <span class="issue-head"><span class="issue-number">#${issue.number}</span><span class="issue-severity">${issue.severity.toUpperCase()}</span><span class="issue-status">NEW · assigned to you</span></span>
    <span class="issue-title">${escapeHtml(issue.title)}</span>
    ${renderMeta(issue, state, nowMs)}${renderActions(issue)}
  </li>`;
}

/** 2011: your problems arrive as public posts, aimed at you, for everyone to see. */
function renderMention(issue: Issue, state: GameState, nowMs: number): string {
  const handle = issue.sender.split('@')[0] ?? 'someone';
  return `<li class="issue issue--mention" data-severity="${issue.severity}">
    <span class="issue-from">@${escapeHtml(handle)} · ${issue.severity === 'critical' ? 'now' : 'just now'}</span>
    <span class="issue-subject">@myhomepage ${escapeHtml(issue.title.toLowerCase())} ${issue.severity === 'critical' ? '#fail' : '#annoyed'}</span>
    ${renderMeta(issue, state, nowMs)}${renderActions(issue)}
  </li>`;
}

/** 2018: a board of tickets with keys, priorities and story points, all assigned to you. */
function renderTicket(issue: Issue, state: GameState, nowMs: number): string {
  const priority = issue.severity === 'critical' ? 'Highest' : 'High';
  return `<li class="issue issue--ticket" data-severity="${issue.severity}">
    <span class="issue-head"><span class="ticket-key">MYH-${issue.number}</span><span class="ticket-priority">${priority}</span><span class="ticket-status">To do</span></span>
    <span class="issue-title">${escapeHtml(issue.title)}</span>
    ${renderMeta(issue, state, nowMs)}${renderActions(issue)}
  </li>`;
}

const TRACKER_STYLES: Readonly<Record<EraId, TrackerStyle>> = {
  'homepage-1997': { panelTitle: 'Inbox', emptyText: 'No new mail.', renderIssue: renderEmail },
  'web2-2005': { panelTitle: 'Issues', emptyText: 'No open bugs. Ship it!', renderIssue: renderBug },
  'social-2011': { panelTitle: 'Mentions', emptyText: 'Nobody is complaining about you. For now.', renderIssue: renderMention },
  'platform-2018': { panelTitle: 'Board', emptyText: 'Board is clear. Time for a retro.', renderIssue: renderTicket },
};

export function issuePanelTitle(eraId: EraId): string {
  return TRACKER_STYLES[eraId].panelTitle;
}

export function renderIssueList(issues: readonly Issue[], state: GameState, nowMs: number): string {
  const style = TRACKER_STYLES[state.eraId];
  if (issues.length === 0) return `<p class="issue-empty">${escapeHtml(style.emptyText)}</p>`;
  return `<ul class="issue-list">${issues.map((issue) => style.renderIssue(issue, state, nowMs)).join('')}</ul>`;
}

/** What the tracker's markup depends on. Countdowns and load update through live slots instead. */
export function calculateIssueSignature(issues: readonly Issue[], state: GameState): string {
  const tickets = issues.map((issue) => `${issue.key}:${issue.severity}:${issue.summary}:${issue.fix?.label ?? '-'}:${issue.prevention?.label ?? '-'}`);
  return `${state.eraId}|${tickets.join(',')}`;
}
