import { codeEntryStatus, listCodeKeys, startCodeEntry, tickCodeEntry, typeCodeKey } from '../../engine';
import type { CodeEntry, EraId, MinigameStatus } from '../../engine';
import { escapeHtml } from '../dom';
import type { MinigameView } from './types';

/**
 * The sponsor's code, era by era. The same code every time in the same era, like a stratagem: the second deal is
 * faster than the first.
 */
interface SponsorCode {
  readonly brief: string;
  readonly code: string;
}

const SPONSOR_CODES: Readonly<Record<EraId, SponsorCode>> = {
  'homepage-1997': { brief: 'A sponsor wants your banner slot. Dial their modem before they hang up.', code: 'ATDT 555-0199' },
  'crash-2000': { brief: 'One of the last dot-coms wants your banner. Enter their coupon code before they fold.', code: 'FREESHIP-2000' },
  'web2-2005': { brief: 'A sponsor sent their ad software. It wants a product key.', code: 'XJ4KQ-9PL22' },
  'social-2011': { brief: 'The sponsor’s dashboard texted you a login code. It expires any second.', code: '482 913' },
  'platform-2018': { brief: 'The sponsor needs their tracking ID on the page. Paste it in. By hand.', code: 'UA-4471-2' },
  'ai-2024': { brief: 'The sponsor sent their API key. Never share it with anyone. Type it in here.', code: 'sk-live-7Q2X' },
};

const STATUS_TEXTS: Readonly<Record<MinigameStatus, string>> = {
  waiting: 'Type the code. The clock starts on your first key.',
  running: 'One wrong key and you start over.',
  won: 'Deal! Your banners are sponsored.',
  lost: 'Too slow: they went with someone else. Try again while the offer lasts.',
};

/** A few wrong keys among the right ones, so the keypad isn't the answer. */
const DECOYS: readonly string[] = ['7', 'Q', 'Z', '3', 'M', 'K'];
const MISTAKE_SHAKE: readonly Keyframe[] = [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }];
const MISTAKE_SHAKE_MS = 220;
const PERCENT = 100;

function renderKeycaps(code: string): string {
  let index = 0;
  return [...code]
    .map((character) => {
      if (/[\s-]/.test(character)) return `<span class="code-sep">${character === '-' ? '–' : '&nbsp;'}</span>`;
      const cap = `<span class="code-cap" data-code-index="${index}">${escapeHtml(character.toUpperCase())}</span>`;
      index += 1;
      return cap;
    })
    .join('');
}

/** For phones: the code's own keys and a few decoys, shuffled by the seed so the layout changes every time. */
function renderKeypad(code: string, seed: number): string {
  const keys = [...new Set([...listCodeKeys(code), ...DECOYS])];
  const shuffled = keys.map((key, index) => ({ key, order: (seed * (index + 7)) % 97 })).sort((first, second) => first.order - second.order);
  return shuffled.map(({ key }) => `<button type="button" class="code-pad-key" data-code-key="${escapeHtml(key)}">${escapeHtml(key)}</button>`).join('');
}

function findPadButton(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target.closest<HTMLElement>('[data-code-key]') : null;
}

function readPadKey(target: EventTarget | null): string | null {
  const button = findPadButton(target);
  return button === null ? null : (button.dataset['codeKey'] ?? null);
}

/** A letter, digit or symbol typed on its own: shortcuts and named keys (Escape, Tab) aren't part of a code. */
function isCodeCharacter(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
}

export const codeEntryView: MinigameView = (stage, target, seed) => {
  const copy = SPONSOR_CODES[target.eraId];
  let entry: CodeEntry = startCodeEntry(copy.code);
  const box = document.createElement('div');
  box.className = 'code-entry';
  box.innerHTML = `<div class="code-caps">${renderKeycaps(copy.code)}</div><div class="code-timer"><i></i></div><div class="code-pad">${renderKeypad(copy.code, seed)}</div>`;
  stage.append(box);
  const caps = [...box.querySelectorAll<HTMLElement>('.code-cap')];
  const timer = box.querySelector<HTMLElement>('.code-timer i');

  const render = (): void => {
    caps.forEach((cap, index) => {
      cap.classList.toggle('is-typed', index < entry.typed);
      cap.classList.toggle('is-next', index === entry.typed);
    });
    timer?.style.setProperty('width', `${(1 - entry.elapsedMs / entry.limitMs) * PERCENT}%`);
    box.dataset['status'] = codeEntryStatus(entry);
  };

  const press = (key: string): void => {
    const before = entry.mistakes;
    entry = typeCodeKey(entry, key);
    if (entry.mistakes > before) box.querySelector('.code-caps')?.animate([...MISTAKE_SHAKE], MISTAKE_SHAKE_MS);
    render();
  };

  box.addEventListener('click', (event) => {
    const key = readPadKey(event.target);
    if (key !== null) press(key);
  });
  render();

  return {
    brief: copy.brief,
    hint: 'Type it, or tap the keys. Spaces and dashes don’t count.',
    tick: (elapsedMs) => {
      entry = tickCodeEntry(entry, elapsedMs);
      render();
    },
    handleKey: (event) => {
      if (!isCodeCharacter(event)) return false;
      press(event.key);
      return true;
    },
    progress: () => `${entry.typed}/${listCodeKeys(entry.code).length}`,
    status: () => codeEntryStatus(entry),
    statusText: () => STATUS_TEXTS[codeEntryStatus(entry)],
    destroy: () => box.remove(),
  };
};
