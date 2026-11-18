import { setTextIfChanged } from './dom';

/**
 * Somebody opened the developer tools. The game can't stop that, and doesn't try: every browser has a menu item for it,
 * and blocking F12 or right-click only gets in the way of everyone else. Instead it notices, and makes it part of the
 * joke: a note in the console, a secret achievement, and a number edited on the page goes back to what it really is.
 *
 * What it notices: the developer-tools shortcuts while the page has focus, and a number in the top bar that changed
 * without the game writing it. The menu item itself can't be seen from a page.
 */

/** The keys of a keyboard event this needs. */
type ShortcutKeys = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

const DEV_TOOLS_KEY = 'F12';
/** Inspect, console and element picker: with Ctrl+Shift on Windows and Linux, Cmd+Option on a Mac. */
const INSPECTOR_CODES: readonly string[] = ['KeyI', 'KeyJ', 'KeyC'];

function hasInspectorModifiers(keys: ShortcutKeys): boolean {
  return [keys.ctrlKey, keys.metaKey].some(Boolean) && [keys.shiftKey, keys.altKey].some(Boolean);
}

export function isDevToolsShortcut(keys: ShortcutKeys): boolean {
  return keys.code === DEV_TOOLS_KEY || (hasInspectorModifiers(keys) && INSPECTOR_CODES.includes(keys.code));
}

const GREETING_TITLE_STYLE = 'font: 700 18px/1.4 monospace; color: #FFB020; background: #1D1F2B; padding: 6px 10px; border-radius: 4px;';
const GREETING_TEXT_STYLE = 'font: 13px/1.5 sans-serif; color: inherit;';

/** Chrome keeps what was logged before the console opened, so this is waiting there when someone looks. */
export function greetInConsole(): void {
  console.info(
    '%c🚧 Under Construction%c\n\nHi, webmaster. Poking around? Everything you see on the page is only the page: change a number and see what happens.',
    GREETING_TITLE_STYLE,
    GREETING_TEXT_STYLE,
  );
}

/** What the game last wrote into each number it watches, so an edit from outside stands out. */
const writtenTexts = new WeakMap<Element, string>();

/** Writes a watched number, and remembers it: on the next frame an edited one is put back. */
export function setWatchedText(element: HTMLElement, text: string): void {
  writtenTexts.set(element, text);
  setTextIfChanged(element, text);
}

function wasEditedOutsideTheGame(element: Element): boolean {
  const written = writtenTexts.get(element);
  return written !== undefined && element.textContent !== written;
}

export interface DevToolsPokes {
  /** The shortcut to open them. */
  readonly onShortcut: () => void;
  /** A number on the page edited with them. */
  readonly onEditedNumber: () => void;
}

/** Watches the keyboard and the given numbers; the game puts an edited number back on its next frame. */
export function watchForDevTools(numbers: readonly HTMLElement[], pokes: DevToolsPokes): void {
  document.addEventListener('keydown', (event) => {
    if (isDevToolsShortcut(event)) pokes.onShortcut();
  }, true);
  const observer = new MutationObserver(() => {
    if (numbers.some(wasEditedOutsideTheGame)) pokes.onEditedNumber();
  });
  numbers.forEach((element) => observer.observe(element, { characterData: true, childList: true, subtree: true }));
}
