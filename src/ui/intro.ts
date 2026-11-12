import { cleanSiteName, DEFAULT_SITE_NAME, toSiteSlug } from '../engine';
import { INTRO_DURATION_MS, INTRO_LINE_COUNT, pickRandomSiteName, revealIntroLines } from './intro-script';

export interface IntroElements {
  readonly overlay: HTMLElement;
  readonly story: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly random: HTMLElement;
  readonly address: HTMLElement;
}

export interface Intro {
  /** A new game: the typed lines, then the wizard. */
  readonly show: () => void;
  readonly isOpen: () => boolean;
}

type IntroPhase = 'story' | 'wizard';

/** The address the name will have, as the 1997 free host gave it: what the wizard shows as you type. */
function describeAddress(raw: string): string {
  const name = cleanSiteName(raw);
  return `http://members.freewebspace.net/~${toSiteSlug(name === '' ? DEFAULT_SITE_NAME : name)}/`;
}

/**
 * The opening of a new game. It owns its own listeners, like the code editor: the rest of the game only hears
 * the name it settles on. An empty box keeps the placeholder name: nameSite ignores a name with nothing in it.
 */
export function createIntro(elements: IntroElements, onNamed: (name: string) => void): Intro {
  let frameRequest: number | null = null;
  let startedAt = 0;
  elements.story.innerHTML = Array.from({ length: INTRO_LINE_COUNT }, () => '<p class="intro-line"></p>').join('');
  const lines = [...elements.story.querySelectorAll<HTMLElement>('.intro-line')];

  const setPhase = (phase: IntroPhase): void => {
    elements.overlay.dataset['phase'] = phase;
  };
  const updateAddress = (): void => {
    elements.address.textContent = describeAddress(elements.input.value);
  };
  const stopFrames = (): void => {
    if (frameRequest !== null) window.cancelAnimationFrame(frameRequest);
    frameRequest = null;
  };
  const openWizard = (): void => {
    stopFrames();
    window.removeEventListener('keydown', skipOnKey);
    setPhase('wizard');
    updateAddress();
    elements.input.focus();
  };
  // Hoisted on purpose: openWizard removes it, and it calls openWizard.
  function skipOnKey(event: KeyboardEvent): void {
    event.preventDefault();
    openWizard();
  }
  const typeLines = (now: number): void => {
    const elapsedMs = now - startedAt;
    revealIntroLines(elapsedMs).forEach((text, index) => {
      const line = lines[index];
      if (line !== undefined && line.textContent !== text) line.textContent = text;
    });
    frameRequest = elapsedMs >= INTRO_DURATION_MS ? null : window.requestAnimationFrame(typeLines);
    if (frameRequest === null) openWizard();
  };

  elements.overlay.addEventListener('pointerdown', () => {
    if (elements.overlay.dataset['phase'] === 'story') openWizard();
  });
  elements.input.addEventListener('input', updateAddress);
  elements.random.addEventListener('click', () => {
    elements.input.value = pickRandomSiteName(elements.input.value, Math.random());
    updateAddress();
  });
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.overlay.hidden = true;
    onNamed(elements.input.value);
  });

  return {
    isOpen: () => !elements.overlay.hidden,
    show: () => {
      elements.input.value = '';
      lines.forEach((line) => {
        line.textContent = '';
      });
      setPhase('story');
      elements.overlay.hidden = false;
      startedAt = performance.now();
      window.addEventListener('keydown', skipOnKey);
      frameRequest = window.requestAnimationFrame(typeLines);
    },
  };
}
