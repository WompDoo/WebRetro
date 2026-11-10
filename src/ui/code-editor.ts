import { formatMoney, formatPercent } from '../engine';
import type { CodeInputOutcome, EraId } from '../engine';
import { escapeHtml } from './dom';
import { ERA_PRESENTATION } from './presentation';

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
  readonly setEra: (eraId: EraId) => void;
  /** Swap in new code to type (after learning a skill). What's already on screen stays. */
  readonly setSource: (nextSource: string) => void;
  readonly setTitle: (title: string) => void;
  /** Switches to another file: the screen clears and the new file is typed from the top. */
  readonly openFile: (fileSource: string) => void;
  readonly setTabs: (files: readonly string[], hiddenCount: number, activeFile: string) => void;
  readonly updateRate: (keystrokeValue: number, bugChance: number) => void;
}

interface PendingTypo {
  readonly correct: string;
  readonly garbled: string;
}

const CHARS_PER_KEYSTROKE = 4;
const MAX_KEPT_LINES = 40;
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

export function createCodeEditor(elements: CodeEditorElements, onKeystroke: () => KeystrokeFeedback): CodeEditor {
  let source = '';
  let cursor = 0;
  let committed = '';
  let typo: PendingTypo | null = null;
  let totalLines = 1;
  let highlights = false;
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;

  const takeChunk = (): string => {
    const chunk = source.slice(cursor, cursor + CHARS_PER_KEYSTROKE);
    cursor = cursor + CHARS_PER_KEYSTROKE >= source.length ? 0 : cursor + CHARS_PER_KEYSTROKE;
    totalLines += (chunk.match(/\n/g) ?? []).length;
    return chunk;
  };

  const commit = (text: string): void => {
    const lines = (committed + text).split('\n');
    committed = lines.slice(-MAX_KEPT_LINES).join('\n');
  };

  const render = (): void => {
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
      'bugged-line': 'typo!',
      'fixed-bug': `fixed +${formatMoney(feedback.earned)}`,
    };
    floater.className = `floater floater--${feedback.outcome}`;
    floater.textContent = texts[feedback.outcome];
    floater.style.left = `${FLOATER_MIN_LEFT_PERCENT + Math.random() * FLOATER_LEFT_SPAN_PERCENT}%`;
    floater.addEventListener('animationend', () => floater.remove());
    elements.floaters.append(floater);
  };

  const applyOutcomes: Readonly<Record<CodeInputOutcome, () => void>> = {
    'clean-line': () => commit(takeChunk()),
    'bugged-line': () => {
      const correct = takeChunk();
      typo = { correct, garbled: garble(correct) };
    },
    'fixed-bug': () => {
      commit(typo?.correct ?? takeChunk());
      typo = null;
    },
  };

  const handleKeystroke = (): void => {
    const now = performance.now();
    if (now - lastAcceptedAt < MIN_KEYSTROKE_INTERVAL_MS) return;
    lastAcceptedAt = now;
    const feedback = onKeystroke();
    applyOutcomes[feedback.outcome]();
    elements.prompt.hidden = true;
    render();
    showFloater(feedback);
  };

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
    cursor = 0;
    committed = '';
    typo = null;
    totalLines = 1;
    highlights = presentation.editorHighlightsSyntax;
    elements.window.dataset['era'] = String(presentation.year);
    elements.title.textContent = presentation.editorTitle;
    elements.menu.innerHTML = presentation.editorMenu.map((item) => `<span><u>${escapeHtml(item.charAt(0))}</u>${escapeHtml(item.slice(1))}</span>`).join('');
    elements.menu.hidden = presentation.editorMenu.length === 0;
    elements.tabs.innerHTML = presentation.editorTabs.map((tab, index) => `<span class="editor-tab${index === 0 ? ' is-active' : ''}">${escapeHtml(tab)}</span>`).join('');
    elements.tabs.hidden = presentation.editorTabs.length === 0;
    render();
  };

  const updateRate = (keystrokeValue: number, bugChance: number): void => {
    const text = `${formatMoney(keystrokeValue)} per keystroke · ${formatPercent(bugChance)} typo chance`;
    if (elements.rate.textContent !== text) elements.rate.textContent = text;
  };

  const setSource = (nextSource: string): void => {
    if (nextSource === source) return;
    source = nextSource;
    cursor = 0;
  };

  const setTitle = (title: string): void => {
    if (elements.title.textContent !== title) elements.title.textContent = title;
  };

  const openFile = (fileSource: string): void => {
    source = fileSource;
    cursor = 0;
    committed = '';
    typo = null;
    totalLines = 1;
    render();
  };

  /** Tabs are real buttons: players click them, so they have to switch files. */
  const setTabs = (files: readonly string[], hiddenCount: number, activeFile: string): void => {
    const tabs = files.map(
      (file) => `<button type="button" class="editor-tab${file === activeFile ? ' is-active' : ''}" data-action="editor-tab" data-id="${escapeHtml(file)}" aria-pressed="${file === activeFile}">${escapeHtml(file)}</button>`,
    );
    const more = hiddenCount > 0 ? [`<span class="editor-tab is-more" title="Enterprise Java: ${hiddenCount} more XML files">+${hiddenCount} more</span>`] : [];
    elements.tabs.innerHTML = [...tabs, ...more].join('');
    elements.tabs.hidden = files.length === 0;
  };

  return { setEra, setSource, openFile, setTitle, setTabs, updateRate };
}
