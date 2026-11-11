import { escapeHtml } from './dom';
import type { Issue, IssueButton } from './issues';

/** More than this and the banners would cover the page: the rest is a count. */
export const MAX_PHONE_NOTIFICATIONS = 3;

interface FixableIssue extends Issue {
  readonly fix: IssueButton;
}

function isFixableHere(issue: Issue): issue is FixableIssue {
  return issue.fix !== null && issue.fix.action === 'open-minigame';
}

function renderBanner(issue: FixableIssue): string {
  return `<button type="button" class="phone-notification" data-action="${issue.fix.action}" data-id="${escapeHtml(issue.fix.id)}">
    <span class="phone-notification-icon" aria-hidden="true">!</span>
    <span class="phone-notification-text"><b>${escapeHtml(issue.title)}</b><span>Tap to fix · ${escapeHtml(issue.summary)}</span></span>
  </button>`;
}

function renderOverflow(hiddenCount: number, trackerName: string): string {
  return hiddenCount > 0 ? `<p class="phone-notification-more">${hiddenCount} more in ${escapeHtml(trackerName)}</p>` : '';
}

/**
 * Phone view: infections as notification banners across the top of the phone's screen. They are drawn at the
 * phone's size, not the page's, so they stay big enough to tap while the desktop page is shrunk to fit.
 */
export function renderPhoneNotifications(issues: readonly Issue[], trackerName: string): string {
  const fixable = issues.filter(isFixableHere);
  const banners = fixable.slice(0, MAX_PHONE_NOTIFICATIONS).map(renderBanner).join('');
  return banners + renderOverflow(fixable.length - MAX_PHONE_NOTIFICATIONS, trackerName);
}
