/** A typo on screen: the garbled chunk shown, and the code it should have been. */
export interface PendingTypo {
  readonly correct: string;
  readonly garbled: string;
}

/** One file's typing progress. Switching tabs puts it away; coming back picks it up where you left off. */
export interface FileBuffer {
  /** The code being typed out. */
  readonly source: string;
  /** Where in the source the next chunk starts. */
  readonly cursor: number;
  /** What's on screen, minus a pending typo. Only the last lines are kept. */
  readonly committed: string;
  readonly typo: PendingTypo | null;
  readonly totalLines: number;
}

export interface EditorBuffers {
  readonly activeFile: string;
  readonly active: FileBuffer;
  /** Every file opened in this era, as it was when it was put away. */
  readonly stored: ReadonlyMap<string, FileBuffer>;
}

export interface TakenChunk {
  readonly buffer: FileBuffer;
  readonly chunk: string;
}

export const EMPTY_FILE_BUFFER: FileBuffer = { source: '', cursor: 0, committed: '', typo: null, totalLines: 1 };
const CHARS_PER_KEYSTROKE = 4;
/** An AI suggestion runs to the next blank line, and never past this many lines. */
const MAX_SUGGESTION_LINES = 8;

/** How much one keystroke types: a few characters by hand, a pasted line, or (2024) a whole AI suggestion. */
export type TypingChunk = 'characters' | 'line' | 'suggestion';
export const MAX_KEPT_LINES = 40;

export function createEditorBuffers(): EditorBuffers {
  return { activeFile: '', active: EMPTY_FILE_BUFFER, stored: new Map() };
}

/** A pasted chunk: the rest of the current line, newline included. */
function measureRestOfLine(text: string, start: number): number {
  const newline = text.indexOf('\n', start);
  return newline === -1 ? text.length - start : newline - start + 1;
}

/** An AI suggestion: the next lines up to a blank one, a block of code at a time, newline included. */
function measureSuggestion(text: string, start: number): number {
  const lines = text.slice(start).split('\n').slice(0, MAX_SUGGESTION_LINES);
  const blank = lines.findIndex((line, index) => index > 0 && line.trim() === '');
  const kept = blank === -1 ? lines : lines.slice(0, blank + 1);
  return Math.min(kept.join('\n').length + 1, text.length - start);
}

const CHUNK_MEASURES: Readonly<Record<TypingChunk, (text: string, start: number) => number>> = {
  characters: () => CHARS_PER_KEYSTROKE,
  line: measureRestOfLine,
  suggestion: measureSuggestion,
};

function measureNextChunk(buffer: FileBuffer, chunk: TypingChunk): number {
  return CHUNK_MEASURES[chunk](buffer.source, buffer.cursor);
}

function countNewlines(text: string): number {
  return text.split('\n').length - 1;
}

/** The next piece of code to type: a few characters, a line, or a suggestion. Starts over at the end. */
export function takeChunk(buffer: FileBuffer, chunk: TypingChunk): TakenChunk {
  const end = buffer.cursor + measureNextChunk(buffer, chunk);
  const taken = buffer.source.slice(buffer.cursor, end);
  const cursor = end >= buffer.source.length ? 0 : end;
  return { chunk: taken, buffer: { ...buffer, cursor, totalLines: buffer.totalLines + countNewlines(taken) } };
}

/** What the next keystroke would type, without typing it: the AI's suggestion, shown greyed out ahead of time. */
export function peekChunk(buffer: FileBuffer, chunk: TypingChunk): string {
  return takeChunk(buffer, chunk).chunk;
}

export function commitText(buffer: FileBuffer, text: string): FileBuffer {
  const lines = (buffer.committed + text).split('\n');
  return { ...buffer, committed: lines.slice(-MAX_KEPT_LINES).join('\n') };
}

export function typeCleanChunk(buffer: FileBuffer, chunk: TypingChunk): FileBuffer {
  const taken = takeChunk(buffer, chunk);
  return commitText(taken.buffer, taken.chunk);
}

export function typeBuggedChunk(buffer: FileBuffer, chunk: TypingChunk, garble: (chunk: string) => string): FileBuffer {
  const taken = takeChunk(buffer, chunk);
  return { ...taken.buffer, typo: { correct: taken.chunk, garbled: garble(taken.chunk) } };
}

/**
 * The typo on screen gets its correct code. Also done on the way out of a tab: the engine fixes the bug on the
 * next keystroke wherever it lands, so a typo left behind would otherwise stay garbled on screen.
 */
function settleTypo(buffer: FileBuffer): FileBuffer {
  return buffer.typo === null ? buffer : { ...commitText(buffer, buffer.typo.correct), typo: null };
}

/** The fix keystroke. With no typo in this tab (it was fixed on the way out of another), it types on. */
export function fixTypo(buffer: FileBuffer, chunk: TypingChunk): FileBuffer {
  return buffer.typo === null ? typeCleanChunk(buffer, chunk) : settleTypo(buffer);
}

/** New code for the same file (after learning a skill): what's on screen stays, typing restarts at the top of the new code. */
export function replaceSource(buffer: FileBuffer, source: string): FileBuffer {
  return source === buffer.source ? buffer : { ...buffer, source, cursor: 0 };
}

function switchFile(buffers: EditorBuffers, fileName: string): EditorBuffers {
  const stored = new Map(buffers.stored).set(buffers.activeFile, settleTypo(buffers.active));
  return { activeFile: fileName, active: stored.get(fileName) ?? EMPTY_FILE_BUFFER, stored };
}

/** Shows a file. Another file is put away as it is; this one comes back where it was left, or starts empty. */
export function showFile(buffers: EditorBuffers, fileName: string, source: string): EditorBuffers {
  const shown = fileName === buffers.activeFile ? buffers : switchFile(buffers, fileName);
  return { ...shown, active: replaceSource(shown.active, source) };
}
