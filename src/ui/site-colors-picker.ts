import type { SiteBackground, SiteColors } from '../engine';
import { hexToHsl, hslToHex } from './color-math';
import type { Hsl } from './color-math';
import { clampLightness, describeMarkerStyle, describeWheelStyle, readWheelPoint } from './render-site-colors';
import { buildThemeVariables } from './site-theme';

/**
 * The wheel and the lightness slider, live: while you drag, the wheel's marker, the preview and the page itself change
 * on the spot; the color is picked (and the page re-rendered) when you let go. The panel's markup can be replaced at
 * any time, so everything is looked up afresh.
 */

export interface SiteColorsPickerHooks {
  /** The colors the picker starts a drag from. */
  readonly readColors: () => SiteColors;
  /** Keeps a color: the game state changes and the page re-renders. */
  readonly pick: (colors: SiteColors) => void;
}

interface Draft {
  readonly hsl: Hsl;
  readonly background: SiteBackground;
}

const PERCENT = 100;

function withElement<T extends Element>(root: ParentNode, selector: string, apply: (element: T) => void): void {
  const element = root.querySelector<T>(selector);
  if (element !== null) apply(element);
}

function toColors(draft: Draft): SiteColors {
  return { accent: hslToHex(draft.hsl), background: draft.background };
}

function startDraft(colors: SiteColors): Draft {
  const hsl = hexToHsl(colors.accent);
  return { hsl: { ...hsl, lightness: clampLightness(hsl.lightness) }, background: colors.background };
}

/** The wheel, its marker, the swatch and the hex code: what the panel shows of the color being dragged. */
function previewInPanel(panel: HTMLElement, draft: Draft): void {
  const { accent } = toColors(draft);
  withElement<HTMLElement>(panel, '.colors-custom', (custom) => custom.setAttribute('style', describeWheelStyle(draft.hsl)));
  withElement<HTMLElement>(panel, '.color-wheel-marker', (element) => element.setAttribute('style', describeMarkerStyle(draft.hsl, accent)));
  withElement<HTMLElement>(panel, '.colors-preview', (element) => element.setAttribute('style', `background:${accent}`));
  withElement<HTMLElement>(panel, '.colors-hex', (element) => {
    element.textContent = accent;
  });
}

/** The page in the color being dragged, before it's picked: the theme wrapper takes the new variables. */
function previewOnPage(site: HTMLElement, draft: Draft): void {
  withElement<HTMLElement>(site, '.site-theme', (theme) => {
    theme.classList.add('is-themed');
    theme.setAttribute('style', buildThemeVariables(toColors(draft)));
  });
}

function findSlider(event: Event): HTMLInputElement | null {
  const { target } = event;
  return target instanceof HTMLInputElement && target.matches('[data-color-lightness]') ? target : null;
}

export function installSiteColorsPicker(panel: HTMLElement, site: HTMLElement, hooks: SiteColorsPickerHooks): void {
  let drag: Draft | null = null;

  const show = (draft: Draft): void => {
    previewInPanel(panel, draft);
    previewOnPage(site, draft);
  };

  const dragTo = (event: PointerEvent, from: Draft): void => {
    withElement<HTMLElement>(panel, '[data-color-wheel]', (wheel) => {
      const point = readWheelPoint(wheel.getBoundingClientRect(), event.clientX, event.clientY);
      drag = { ...from, hsl: { ...from.hsl, ...point } };
      show(drag);
    });
  };

  panel.addEventListener('pointerdown', (event) => {
    const isOnWheel = event.target instanceof Element && event.target.closest('[data-color-wheel]') !== null;
    if (!isOnWheel) return;
    event.preventDefault();
    dragTo(event, startDraft(hooks.readColors()));
  });
  window.addEventListener('pointermove', (event) => {
    if (drag !== null) dragTo(event, drag);
  });
  const release = (): void => {
    if (drag !== null) hooks.pick(toColors(drag));
    drag = null;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  const readSlider = (event: Event): Draft | null => {
    const slider = findSlider(event);
    if (slider === null) return null;
    const draft = startDraft(hooks.readColors());
    return { ...draft, hsl: { ...draft.hsl, lightness: Number(slider.value) / PERCENT } };
  };
  panel.addEventListener('input', (event) => {
    const draft = readSlider(event);
    if (draft !== null) show(draft);
  });
  panel.addEventListener('change', (event) => {
    const draft = readSlider(event);
    if (draft !== null) hooks.pick(toColors(draft));
  });
}
