import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPlaytestState } from '../src/engine';
import { hallucinate, previewSuggestion, renderEditorLines } from '../src/ui/code-editor';
import { EMPTY_FILE_BUFFER } from '../src/ui/editor-buffers';
import { escapeHtml } from '../src/ui/dom';
import { FRAMEWORK_PRESENTATION, resolveTyping } from '../src/ui/framework-presentation';

/**
 * The 2024 editor was meant to be an AI pair programmer and was only labelled one: a chosen framework's typing won
 * over the era's, so a 2024 player still pasted 2018's npm lines. These pin what it does now.
 */

const SEED = 24;

describe('2024: the AI writes the code, whatever the framework', () => {
  it('types whole suggestions and hallucinates in 2024, with any framework', () => {
    (['react', 'angular', 'vue'] as const).forEach((framework) => {
      const typing = resolveTyping(createPlaytestState('ai-2024', 'end', SEED, framework));
      assert.equal(typing.chunk, 'suggestion', framework);
      assert.equal(typing.mistake, 'hallucination', framework);
      assert.equal(typing.typoLabel, 'hallucinated!', framework);
    });
  });

  it('keeps each framework’s own typing in its own era, 2018', () => {
    assert.equal(resolveTyping(createPlaytestState('platform-2018', 'end', SEED, 'angular')).typoLabel, FRAMEWORK_PRESENTATION.angular.typing.typoLabel);
  });

  it('hallucinates a block the same shape as the real one: same lines, same indentation, blank lines kept', () => {
    const real = 'function App() {\n  const user = useUser();\n\n  return user;\n';
    const wrong = hallucinate(real);
    assert.equal(wrong.split('\n').length, real.split('\n').length);
    assert.equal(wrong.split('\n')[2], '');
    assert.match(wrong.split('\n')[1] ?? '', /^ {2}\S/);
    assert.notEqual(wrong, real);
  });
});

describe('2024: the editor shows the next suggestion greyed out', () => {
  const buffer = { ...EMPTY_FILE_BUFFER, committed: 'import React;\n', totalLines: 2 };

  it('puts the suggestion after the caret, its extra lines unnumbered: they aren’t written yet', () => {
    const html = renderEditorLines(buffer, escapeHtml, 'function App() {\n  return null;\n}');
    assert.match(html, /code-caret"><\/span><span class="code-ghost">function App\(\) \{<\/span>/);
    assert.equal((html.match(/class="code-line is-suggestion"/g) ?? []).length, 2);
    assert.equal((html.match(/data-line=/g) ?? []).length, 2);
  });

  it('runs a hallucination over several lines, numbered, as code that was really typed', () => {
    const wrong = { ...buffer, totalLines: 4, typo: { correct: 'a();\nb();\n', garbled: 'magic();\nmore();\n' } };
    const html = renderEditorLines(wrong, escapeHtml, '');
    assert.equal((html.match(/class="code-typo"/g) ?? []).length, 3);
    assert.match(html, /data-line="4"/);
  });
});

describe('2024: a long suggestion is previewed, not dumped', () => {
  it('shows the first three lines and how many more a keystroke accepts, so the caret stays in view', () => {
    const preview = previewSuggestion('a();\nb();\nc();\nd();\ne();\n');
    assert.equal(preview, 'a();\nb();\nc();\n… 2 more lines: any key accepts');
    assert.equal(previewSuggestion('a();\nb();\n'), 'a();\nb();');
  });
});
