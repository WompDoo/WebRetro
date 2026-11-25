import { escapeHtml } from './dom';

/**
 * The real tip jar, outside the game: a plain link to the developer's Ko-fi page, opened in a new tab. No widget, so no
 * script from anywhere else and nothing tracking the player; and never on the in-game site, where a real link among the
 * fake banners and tip jars would read as part of the joke.
 */
export const KO_FI_URL = 'https://ko-fi.com/wompdoo';

export function renderSupportLink(label: string, className: string): string {
  return `<a class="${className}" href="${KO_FI_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}
