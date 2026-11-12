import { cleanSiteName, DEFAULT_SITE_NAME, toSiteSlug } from '../engine';
import { escapeHtml } from './dom';
import { INTRO_LINE_COUNT, INTRO_TYPING_MS, LEAVE_MS, pickRandomSiteName, revealIntroLines, UPLOAD_MESSAGES, UPLOAD_MS } from './intro-script';

export interface IntroElements {
  readonly overlay: HTMLElement;
  readonly story: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly random: HTMLElement;
  readonly address: HTMLElement;
  readonly uploadTarget: HTMLElement;
  readonly uploadStatus: HTMLElement;
}

export interface Intro {
  /** A new game: the typed lines, then the wizard, then the upload. */
  readonly show: () => void;
  readonly isOpen: () => boolean;
}

/** The lines typing, then waiting for a key, the wizard, the upload after Finish, and the fade into the game. */
type IntroPhase = 'story' | 'told' | 'wizard' | 'upload' | 'leaving';

/** DOS's own words. Taps count too. */
const CONTINUE_PROMPT = '<p class="intro-continue">Press any key or tap to continue . . .</p>';

const FREE_HOST = 'members.freewebspace.net';

function describeHome(raw: string): string {
  const name = cleanSiteName(raw);
  return `${FREE_HOST}/~${toSiteSlug(name === '' ? DEFAULT_SITE_NAME : name)}`;
}

/** Every status line at once; CSS shows each in its own share of the upload (`--from` to `--to`). */
function renderUploadMessages(): string {
  return UPLOAD_MESSAGES.map((message) => `<span style="--from:${message.from};--to:${message.to}">${escapeHtml(message.text)}</span>`).join('');
}

/**
 * The opening of a new game. It owns its own listeners, like the code editor: the rest of the game only hears
 * the name it settles on. An empty box keeps the placeholder name: nameSite ignores a name with nothing in it.
 * TypeScript owns the timings and hands them to CSS, which draws the animations.
 */
export function createIntro(elements: IntroElements, onNamed: (name: string) => void): Intro {
  let phase: IntroPhase = 'story';
  let frameRequest: number | null = null;
  let phaseTimer: number | null = null;
  let startedAt = 0;
  elements.story.innerHTML = `${Array.from({ length: INTRO_LINE_COUNT }, () => '<p class="intro-line"></p>').join('')}${CONTINUE_PROMPT}`;
  elements.uploadStatus.innerHTML = renderUploadMessages();
  elements.overlay.style.setProperty('--upload-ms', `${UPLOAD_MS}ms`);
  elements.overlay.style.setProperty('--leave-ms', `${LEAVE_MS}ms`);
  const lines = [...elements.story.querySelectorAll<HTMLElement>('.intro-line')];

  const setPhase = (next: IntroPhase): void => {
    phase = next;
    elements.overlay.dataset['phase'] = next;
  };
  const updateAddress = (): void => {
    elements.address.textContent = `http://${describeHome(elements.input.value)}/`;
  };
  const stopTimers = (): void => {
    if (frameRequest !== null) window.cancelAnimationFrame(frameRequest);
    if (phaseTimer !== null) window.clearTimeout(phaseTimer);
    frameRequest = null;
    phaseTimer = null;
  };
  const close = (): void => {
    stopTimers();
    elements.overlay.hidden = true;
  };
  const leave = (): void => {
    setPhase('leaving');
    phaseTimer = window.setTimeout(close, LEAVE_MS);
  };
  const upload = (): void => {
    elements.uploadTarget.textContent = `'${describeHome(elements.input.value)}'`;
    setPhase('upload');
    phaseTimer = window.setTimeout(leave, UPLOAD_MS);
  };
  const openWizard = (): void => {
    stopTimers();
    setPhase('wizard');
    updateAddress();
    elements.input.focus();
  };
  const showLines = (elapsedMs: number): void => {
    revealIntroLines(elapsedMs).forEach((text, index) => {
      const line = lines[index];
      if (line !== undefined && line.textContent !== text) line.textContent = text;
    });
  };
  /** Every line in full, and the prompt to go on. */
  const finishTyping = (): void => {
    stopTimers();
    showLines(INTRO_TYPING_MS);
    setPhase('told');
  };
  const typeLines = (now: number): void => {
    const elapsedMs = now - startedAt;
    showLines(elapsedMs);
    frameRequest = elapsedMs >= INTRO_TYPING_MS ? null : window.requestAnimationFrame(typeLines);
    if (frameRequest === null) finishTyping();
  };

  /**
   * What a click or a key does in each phase: hurrying the typing finishes it rather than skipping it, so nobody
   * misses the story. In the wizard they belong to the form.
   */
  const skips: Readonly<Record<IntroPhase, (() => void) | null>> = { story: finishTyping, told: openWizard, wizard: null, upload: close, leaving: close };
  const skip = (event: Event): void => {
    const action = elements.overlay.hidden ? null : skips[phase];
    if (action === null) return;
    event.preventDefault();
    action();
  };
  window.addEventListener('keydown', skip);
  // A click, not a pointerdown: the wizard appears under the pointer, and the release mustn't land on its buttons.
  elements.overlay.addEventListener('click', skip);
  elements.input.addEventListener('input', updateAddress);
  elements.random.addEventListener('click', () => {
    elements.input.value = pickRandomSiteName(elements.input.value, Math.random());
    updateAddress();
  });
  // The site is named at once, so the page behind is ready when the desktop fades away.
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    onNamed(elements.input.value);
    upload();
  });

  return {
    isOpen: () => !elements.overlay.hidden,
    show: () => {
      stopTimers();
      elements.input.value = '';
      lines.forEach((line) => {
        line.textContent = '';
      });
      setPhase('story');
      elements.overlay.hidden = false;
      startedAt = performance.now();
      frameRequest = window.requestAnimationFrame(typeLines);
    },
  };
}
