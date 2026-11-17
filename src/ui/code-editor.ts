import { BUFFS_BY_ID, formatMoney, formatPercent, MS_PER_SECOND } from '../engine';
import type { CodeInputOutcome, EraId } from '../engine';
import { escapeHtml } from './dom';
import { createEditorBuffers, fixTypo, peekChunk, showFile as showFileIn, typeBuggedChunk, typeCleanChunk } from './editor-buffers';
import type { FileBuffer } from './editor-buffers';
import { ERA_PRESENTATION } from './presentation';
import type { TypingMistake, TypingStyle } from './presentation';

export interface KeystrokeFeedback {
  readonly outcome: CodeInputOutcome;
  readonly earned: number;
}

export interface CodeEditorElements {
  readonly window: HTMLElement;
  readonly surface: HTMLElement;
  readonly code: HTMLElement;
  readonly floaters: HTMLElement;
  readonly prompt: HTMLElement;
  readonly title: HTMLElement;
  readonly menu: HTMLElement;
  readonly tabs: HTMLElement;
  readonly position: HTMLElement;
  readonly rate: HTMLElement;
  /** The heat meter in the status bar, and the fire it lights. */
  readonly heat: HTMLElement;
}

export interface CodeEditor {
  /** A new era starts every file over. */
  readonly setEra: (eraId: EraId) => void;
  /**
   * Shows a file with the code to type into it. Another tab comes back as it was left; the same tab with new
   * code (after learning a skill) keeps what's on screen and types the new code.
   */
  readonly showFile: (fileName: string, fileSource: string) => void;
  readonly setTitle: (title: string) => void;
  readonly setTabs: (files: readonly string[], hiddenCount: number, activeFile: string, hiddenTitle: string) => void;
  /** How code arrives can change mid-era: picking a 2018 framework changes what a typo is. */
  readonly setTyping: (style: TypingStyle) => void;
  /** Syntax colours can arrive mid-era too: 2005 buys them. */
  readonly setHighlights: (isOn: boolean) => void;
  readonly updateRate: (keystrokeValue: number, bugChance: number) => void;
  /** The heat meter, 0 to 1, and how long you're still on fire (0 when you aren't). */
  readonly updateHeat: (heat: number, fireRemainingMs: number) => void;
}

/** Counted keystrokes per second are capped, so mashing the keyboard can't outrun a mouse. */
const MIN_KEYSTROKE_INTERVAL_MS = 100;
const MAX_FLOATERS = 10;
const TYPO_LETTERS = 'qwertyuiopasdfghjklzxcvbnm';
const FLOATER_MIN_LEFT_PERCENT = 8;
const FLOATER_LEFT_SPAN_PERCENT = 70;
const ACCEPTED_SPECIAL_KEYS = new Set(['Enter', 'Backspace']);

const TOKEN_PATTERN =
  /(\/\/.*$|\/\*.*?(?:\*\/|$)|<!--.*?(?:-->|$))|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(<\?php|\?>|<\/?[A-Za-z][\w:-]*|\/?>)|(\$[A-Za-z_]\w*)|\b(function|var|if|while|echo|include|return|new|null|true|false)\b/g;
const TOKEN_CLASSES: readonly string[] = ['tok-comment', 'tok-string', 'tok-tag', 'tok-variable', 'tok-keyword'];

function highlightLine(line: string): string {
  let html = '';
  let cursor = 0;
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    const groupIndex = match.slice(1).findIndex((group) => group !== undefined);
    html += escapeHtml(line.slice(cursor, start));
    html += `<span class="${TOKEN_CLASSES[groupIndex] ?? ''}">${escapeHtml(match[0])}</span>`;
    cursor = start + match[0].length;
  }
  return html + escapeHtml(line.slice(cursor));
}

function garble(chunk: string): string {
  const letterPositions = [...chunk].flatMap((character, index) => (/[A-Za-z]/.test(character) ? [index] : []));
  const position = letterPositions[Math.floor(Math.random() * letterPositions.length)];
  if (position === undefined) return `${chunk};;`;
  const replacement = TYPO_LETTERS.charAt(Math.floor(Math.random() * TYPO_LETTERS.length));
  return chunk.slice(0, position) + replacement + chunk.slice(position + 1);
}

/**
 * What the AI writes when it's wrong: code that reads fine and calls things that don't exist, with total confidence.
 * Each line of the real suggestion gets one of these, at the same indentation, so the block looks right at a glance.
 */
const HALLUCINATED_LINES: readonly string[] = [
  "import { useRevenue } from 'react-money'; // a package that doesn't exist",
  'await site.makeItGoViral({ guaranteed: true });',
  'const users = await db.users.findAllHappy();',
  '// As an AI model I have optimized this function for you.',
  'traffic = traffic * 1000; // fixes low traffic',
  "fetch('/api/v9/endpoint-i-am-sure-exists');",
  'return Promise.resolveEverything();',
  'if (bug) { bug = false; }',
  "document.querySelector('#profit').click();",
  'const config = { scale: "web", mode: "magic" };',
];

function leadingWhitespace(line: string): string {
  return /^\s*/.exec(line)?.[0] ?? '';
}

/** Every line of the suggestion swapped for a confident wrong one; blank lines stay blank, so the shape holds. */
export function hallucinate(chunk: string): string {
  const start = Math.floor(Math.random() * HALLUCINATED_LINES.length);
  return chunk
    .split('\n')
    .map((line, index) => (line.trim() === '' ? line : `${leadingWhitespace(line)}${HALLUCINATED_LINES[(start + index) % HALLUCINATED_LINES.length] ?? ''}`))
    .join('\n');
}

const MISTAKES: Readonly<Record<TypingMistake, (chunk: string) => string>> = {
  typo: garble,
  hallucination: hallucinate,
};

const CARET = '<span class="code-caret"></span>';
/** The editor is small: a long suggestion shows its first lines, so the code just written stays in view. */
const MAX_SUGGESTION_PREVIEW_LINES = 3;

/** The suggestion as shown after the caret: its first lines, then how many more a keystroke would accept. */
export function previewSuggestion(suggestion: string): string {
  const lines = suggestion.replace(/\n$/, '').split('\n');
  const hidden = lines.length - MAX_SUGGESTION_PREVIEW_LINES;
  return hidden > 0 ? [...lines.slice(0, MAX_SUGGESTION_PREVIEW_LINES), `… ${hidden} more ${hidden === 1 ? 'line' : 'lines'}: any key accepts`].join('\n') : lines.join('\n');
}

/** More text that carries on from the end of the last line, then runs over lines of its own. */
function continueLines(lines: readonly string[], more: readonly string[]): readonly string[] {
  const [head, ...tail] = more;
  return head === undefined ? lines : [...lines.slice(0, -1), `${lines[lines.length - 1] ?? ''}${head}`, ...tail];
}

function wrapEach(text: string, className: string): readonly string[] {
  return text === '' ? [] : text.split('\n').map((part) => `<span class="${className}">${escapeHtml(part)}</span>`);
}

function renderCodeLine(html: string, lineNumber: number | null, className: string): string {
  const number = lineNumber === null ? '' : ` data-line="${lineNumber}"`;
  return `<span class="${className}"${number}>${html}</span>`;
}

/**
 * The editor's lines: what's typed, then a pending mistake (which may run over several lines), the caret, and in
 * 2024 the AI's next suggestion greyed out after it. Suggestion lines have no numbers: they aren't written yet.
 */
function pendingMistake(buffer: FileBuffer): string {
  return buffer.typo === null ? '' : buffer.typo.garbled;
}

export function renderEditorLines(buffer: FileBuffer, renderLine: (line: string) => string, suggestion: string): string {
  const written = continueLines(buffer.committed.split('\n').map(renderLine), wrapEach(pendingMistake(buffer), 'code-typo'));
  const firstLineNumber = Math.max(1, buffer.totalLines - written.length + 1);
  const withCaret = [...written.slice(0, -1), `${written[written.length - 1] ?? ''}${CARET}`];
  const ghost = wrapEach(suggestion, 'code-ghost');
  const lastWritten = continueLines(withCaret, ghost.slice(0, 1));
  const writtenHtml = lastWritten.map((html, index) => renderCodeLine(html, firstLineNumber + index, 'code-line'));
  const ghostHtml = ghost.slice(1).map((html) => renderCodeLine(html, null, 'code-line is-suggestion'));
  return [...writtenHtml, ...ghostHtml].join('');
}

function isCodeKey(event: KeyboardEvent): boolean {
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
  return !hasModifier && !event.repeat && (event.key.length === 1 || ACCEPTED_SPECIAL_KEYS.has(event.key));
}

/** Scrolls the tab bar just far enough to show the active tab whole. Never scrolls the page. */
function revealActiveTab(tabs: HTMLElement): void {
  const active = tabs.querySelector<HTMLElement>('.editor-tab.is-active');
  if (active === null) return;
  const rightEdge = active.offsetLeft + active.offsetWidth - tabs.clientWidth;
  tabs.scrollLeft = Math.min(active.offsetLeft, Math.max(tabs.scrollLeft, rightEdge));
}

/** An up-and-down wheel over a tab bar with more tabs than fit. A trackpad's sideways swipe scrolls it already. */
function isSidewaysWheelNeeded(tabs: HTMLElement, event: WheelEvent): boolean {
  return Math.abs(event.deltaY) > Math.abs(event.deltaX) && tabs.scrollWidth > tabs.clientWidth;
}

/** A mouse wheel only scrolls up and down; over the tab bar, it scrolls the tabs sideways instead. */
function scrollTabsWithWheel(tabs: HTMLElement, event: WheelEvent): void {
  if (!isSidewaysWheelNeeded(tabs, event)) return;
  event.preventDefault();
  tabs.scrollLeft += event.deltaY;
}

/** How far a keystroke knocks the editor while you're on fire, at most, each way. */
const NUDGE_PX = 2;

export function createCodeEditor(elements: CodeEditorElements, onKeystroke: () => KeystrokeFeedback): CodeEditor {
  let buffers = createEditorBuffers();
  let isOnFire = false;
  let nudgeTurn = false;
  let highlights = false;
  let typing = ERA_PRESENTATION['homepage-1997'].typing;
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;

  /** In 2024 the AI's next block waits after the caret; not while it's wrong. */
  const findSuggestion = (): string => (typing.chunk === 'suggestion' && buffers.active.typo === null ? previewSuggestion(peekChunk(buffers.active, typing.chunk)) : '');

  const render = (): void => {
    const { committed, totalLines } = buffers.active;
    const renderLine = highlights ? highlightLine : escapeHtml;
    elements.code.innerHTML = renderEditorLines(buffers.active, renderLine, findSuggestion());
    const lines = committed.split('\n');
    const column = (lines[lines.length - 1] ?? '').length + 1;
    elements.position.textContent = `Ln ${totalLines}, Col ${column}`;
  };

  const showFloater = (feedback: KeystrokeFeedback): void => {
    if (elements.floaters.childElementCount >= MAX_FLOATERS) elements.floaters.firstElementChild?.remove();
    const floater = document.createElement('span');
    const texts: Readonly<Record<CodeInputOutcome, string>> = {
      'clean-line': `+${formatMoney(feedback.earned)}`,
      'bugged-line': typing.typoLabel,
      'fixed-bug': `${typing.fixLabel} +${formatMoney(feedback.earned)}`,
    };
    floater.className = `floater floater--${feedback.outcome}${isOnFire ? ' floater--fire' : ''}`;
    if (isOnFire) nudge();
    floater.textContent = texts[feedback.outcome];
    floater.style.left = `${FLOATER_MIN_LEFT_PERCENT + Math.random() * FLOATER_LEFT_SPAN_PERCENT}%`;
    floater.addEventListener('animationend', () => floater.remove());
    elements.floaters.append(floater);
  };

  const applyOutcomes: Readonly<Record<CodeInputOutcome, (buffer: FileBuffer) => FileBuffer>> = {
    'clean-line': (buffer) => typeCleanChunk(buffer, typing.chunk),
    'bugged-line': (buffer) => typeBuggedChunk(buffer, typing.chunk, MISTAKES[typing.mistake]),
    'fixed-bug': (buffer) => fixTypo(buffer, typing.chunk),
  };

  const handleKeystroke = (): void => {
    const now = performance.now();
    if (now - lastAcceptedAt < MIN_KEYSTROKE_INTERVAL_MS) return;
    lastAcceptedAt = now;
    const feedback = onKeystroke();
    buffers = { ...buffers, active: applyOutcomes[feedback.outcome](buffers.active) };
    elements.prompt.hidden = true;
    render();
    showFloater(feedback);
  };

  elements.tabs.addEventListener('wheel', (event) => scrollTabsWithWheel(elements.tabs, event), { passive: false });

  elements.surface.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    elements.surface.focus({ preventScroll: true });
    handleKeystroke();
  });
  elements.surface.addEventListener('keydown', (event) => {
    if (!isCodeKey(event)) return;
    event.preventDefault();
    handleKeystroke();
  });

  const setEra = (eraId: EraId): void => {
    const presentation = ERA_PRESENTATION[eraId];
    buffers = createEditorBuffers();
    highlights = presentation.editorHighlightsSyntax;
    typing = presentation.typing;
    elements.window.dataset['era'] = String(presentation.year);
    elements.title.textContent = presentation.editorTitle;
    elements.menu.innerHTML = presentation.editorMenu.map((item) => `<span><u>${escapeHtml(item.charAt(0))}</u>${escapeHtml(item.slice(1))}</span>`).join('');
    elements.menu.hidden = presentation.editorMenu.length === 0;
    elements.tabs.innerHTML = presentation.editorTabs.map((tab, index) => `<span class="editor-tab${index === 0 ? ' is-active' : ''}">${escapeHtml(tab)}</span>`).join('');
    elements.tabs.hidden = presentation.editorTabs.length === 0;
    render();
  };

  /**
   * On fire, every keystroke knocks the editor a pixel or two, a different way each time, the way clickers shake on a
   * big click. Two identical animations take turns, so each keystroke restarts it without forcing a layout.
   */
  const nudge = (): void => {
    nudgeTurn = !nudgeTurn;
    elements.window.style.setProperty('--nudge-x', `${(Math.random() * 2 - 1) * NUDGE_PX}px`);
    elements.window.style.setProperty('--nudge-y', `${(Math.random() * 2 - 1) * NUDGE_PX}px`);
    elements.window.classList.toggle('is-nudged-a', nudgeTurn);
    elements.window.classList.toggle('is-nudged-b', !nudgeTurn);
  };

  /** The meter fills in the status bar; on fire, the editor burns and the meter becomes a countdown. */
  const updateHeat = (heat: number, fireRemainingMs: number): void => {
    isOnFire = fireRemainingMs > 0;
    elements.window.classList.toggle('is-on-fire', isOnFire);
    elements.heat.style.setProperty('--heat', String(heat));
    elements.heat.classList.toggle('is-burning', isOnFire);
    const label = isOnFire ? `🔥 ON FIRE ×${BUFFS_BY_ID['on-fire'].factor} · ${Math.ceil(fireRemainingMs / MS_PER_SECOND)} s` : '';
    const labelElement = elements.heat.querySelector<HTMLElement>('.heat-label');
    if (labelElement !== null && labelElement.textContent !== label) labelElement.textContent = label;
  };

  const updateRate = (keystrokeValue: number, bugChance: number): void => {
    const text = `${formatMoney(keystrokeValue)} per keystroke · ${formatPercent(bugChance)} typos`;
    if (elements.rate.textContent !== text) elements.rate.textContent = text;
  };

  const setTitle = (title: string): void => {
    if (elements.title.textContent !== title) elements.title.textContent = title;
  };

  const showFile = (fileName: string, fileSource: string): void => {
    const isSwitch = fileName !== buffers.activeFile;
    buffers = showFileIn(buffers, fileName, fileSource);
    if (isSwitch) render();
  };

  /** Tabs are real buttons: players click them, so they have to switch files. The active one scrolls into view. */
  const setTabs = (files: readonly string[], hiddenCount: number, activeFile: string, hiddenTitle: string): void => {
    const tabs = files.map(
      (file) => `<button type="button" class="editor-tab${file === activeFile ? ' is-active' : ''}" data-action="editor-tab" data-id="${escapeHtml(file)}" aria-pressed="${file === activeFile}">${escapeHtml(file)}</button>`,
    );
    const more = hiddenCount > 0 ? [`<span class="editor-tab is-more" title="${escapeHtml(hiddenTitle)}">+${hiddenCount} more</span>`] : [];
    elements.tabs.innerHTML = [...tabs, ...more].join('');
    elements.tabs.hidden = files.length === 0;
    revealActiveTab(elements.tabs);
  };

  /** A new style can change what's waiting after the caret (2024's suggestion), so the code redraws. */
  const setTyping = (style: TypingStyle): void => {
    if (style === typing) return;
    typing = style;
    render();
  };

  const setHighlights = (isOn: boolean): void => {
    if (highlights === isOn) return;
    highlights = isOn;
    render();
  };

  return { setEra, showFile, setTitle, setTabs, updateRate, updateHeat, setTyping, setHighlights };
}
