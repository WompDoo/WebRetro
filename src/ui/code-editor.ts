import { formatMoney, formatPercent } from '../engine';
import type { CodeInputOutcome, EraId } from '../engine';
import { escapeHtml } from './dom';
import { createEditorBuffers, fixTypo, showFile as showFileIn, typeBuggedChunk, typeCleanChunk } from './editor-buffers';
import type { FileBuffer } from './editor-buffers';
import { ERA_PRESENTATION } from './presentation';
import type { TypingStyle } from './presentation';

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

export function createCodeEditor(elements: CodeEditorElements, onKeystroke: () => KeystrokeFeedback): CodeEditor {
  let buffers = createEditorBuffers();
  let highlights = false;
  let typing = ERA_PRESENTATION['homepage-1997'].typing;
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;

  const render = (): void => {
    const { committed, totalLines, typo } = buffers.active;
    const lines = committed.split('\n');
    const firstLineNumber = Math.max(1, totalLines - lines.length + 1);
    const renderLine = highlights ? highlightLine : escapeHtml;
    const typoHtml = typo === null ? '' : `<span class="code-typo">${escapeHtml(typo.garbled)}</span>`;
    const caret = '<span class="code-caret"></span>';
    elements.code.innerHTML = lines
      .map((line, index) => {
        const isLast = index === lines.length - 1;
        return `<span class="code-line" data-line="${firstLineNumber + index}">${renderLine(line)}${isLast ? typoHtml + caret : ''}</span>`;
      })
      .join('');
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
    floater.className = `floater floater--${feedback.outcome}`;
    floater.textContent = texts[feedback.outcome];
    floater.style.left = `${FLOATER_MIN_LEFT_PERCENT + Math.random() * FLOATER_LEFT_SPAN_PERCENT}%`;
    floater.addEventListener('animationend', () => floater.remove());
    elements.floaters.append(floater);
  };

  const applyOutcomes: Readonly<Record<CodeInputOutcome, (buffer: FileBuffer) => FileBuffer>> = {
    'clean-line': (buffer) => typeCleanChunk(buffer, typing.pastesWholeLines),
    'bugged-line': (buffer) => typeBuggedChunk(buffer, typing.pastesWholeLines, garble),
    'fixed-bug': (buffer) => fixTypo(buffer, typing.pastesWholeLines),
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

  const setTyping = (style: TypingStyle): void => {
    typing = style;
  };

  const setHighlights = (isOn: boolean): void => {
    if (highlights === isOn) return;
    highlights = isOn;
    render();
  };

  return { setEra, showFile, setTitle, setTabs, updateRate, setTyping, setHighlights };
}
