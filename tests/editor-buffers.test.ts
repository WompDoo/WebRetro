import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEditorBuffers, fixTypo, MAX_KEPT_LINES, showFile, takeChunk, typeBuggedChunk, typeCleanChunk } from '../src/ui/editor-buffers';
import type { EditorBuffers } from '../src/ui/editor-buffers';

const HTML = '<html>\n<body>\n</body>\n</html>\n';
const CSS = 'body { color: red; }\n';
const TYPED_CHARACTERS = 4;
const garbleToX = (chunk: string): string => `x${chunk.slice(1)}`;

function typeKeystrokes(buffers: EditorBuffers, count: number): EditorBuffers {
  return Array.from({ length: count }).reduce<EditorBuffers>((current) => ({ ...current, active: typeCleanChunk(current.active, false) }), buffers);
}

describe('editor tabs keep what was typed in them', () => {
  it('starts a file empty, and brings it back as it was left after visiting another tab', () => {
    const typedHtml = typeKeystrokes(showFile(createEditorBuffers(), 'index.html', HTML), 2);
    const inCss = showFile(typedHtml, 'style.css', CSS);
    assert.equal(inCss.active.committed, '');
    const typedCss = typeKeystrokes(inCss, 1);
    const backInHtml = showFile(typedCss, 'index.html', HTML);
    assert.equal(backInHtml.active.committed, HTML.slice(0, 2 * TYPED_CHARACTERS));
    assert.equal(backInHtml.active.cursor, 2 * TYPED_CHARACTERS);
    assert.equal(showFile(backInHtml, 'style.css', CSS).active.committed, CSS.slice(0, TYPED_CHARACTERS));
  });

  it('keeps the screen when a skill changes the same file, and types the new code from its top', () => {
    const typed = typeKeystrokes(showFile(createEditorBuffers(), 'index.html', HTML), 2);
    const learned = showFile(typed, 'index.html', `<!-- new -->\n${HTML}`);
    assert.equal(learned.active.committed, typed.active.committed);
    assert.equal(learned.active.cursor, 0);
    assert.deepEqual(showFile(learned, 'index.html', `<!-- new -->\n${HTML}`), learned);
  });

  it('fixes a typo on the way out of a tab, so it isn’t left garbled', () => {
    const opened = showFile(createEditorBuffers(), 'index.html', HTML);
    const bugged = { ...opened, active: typeBuggedChunk(opened.active, false, garbleToX) };
    assert.equal(bugged.active.typo?.garbled, 'xhtm');
    const backAgain = showFile(showFile(bugged, 'style.css', CSS), 'index.html', HTML);
    assert.equal(backAgain.active.typo, null);
    assert.equal(backAgain.active.committed, '<htm');
  });

  it('the fix keystroke after a tab switch types on in the new tab', () => {
    const inCss = showFile(createEditorBuffers(), 'style.css', CSS);
    assert.equal(fixTypo(inCss.active, false).committed, CSS.slice(0, TYPED_CHARACTERS));
  });
});

describe('typing out a file', () => {
  it('pastes a whole line at a time when the era copies code instead of typing it', () => {
    const buffer = showFile(createEditorBuffers(), 'index.html', HTML).active;
    assert.deepEqual([takeChunk(buffer, true).chunk, takeChunk(buffer, true).buffer.totalLines], ['<html>\n', 2]);
  });

  it('starts over at the end of the code, and keeps only the last lines on screen', () => {
    const oneLine = showFile(createEditorBuffers(), 'a.txt', 'line\n');
    const lines = Array.from({ length: MAX_KEPT_LINES + 5 }).reduce<EditorBuffers>((current) => ({ ...current, active: typeCleanChunk(current.active, true) }), oneLine);
    assert.equal(lines.active.cursor, 0);
    assert.equal(lines.active.committed.split('\n').length, MAX_KEPT_LINES);
  });
});
