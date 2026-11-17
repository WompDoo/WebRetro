import { formatMoney, MS_PER_SECOND } from '../engine';
import type { EraId } from '../engine';

/**
 * Hired help typing where you can see it. Their pay comes by the second in the simulation, offline too; this only
 * shows the keystrokes happening in the editor. No faster than a person can follow: an AI agent at twelve a second
 * would be a blur, so the editor shows four, and each floater carries a share of the pay big enough that they still
 * add up to what the hire really earns.
 */
export const MAX_SHOWN_AUTO_KEYSTROKES_PER_SECOND = 4;
/** After a hidden tab or a long frame, a few keystrokes catch up, not a minute's worth at once. */
const MAX_PENDING_KEYSTROKES = 3;

export interface AutoTypingStep {
  /** Keystrokes to show this frame. */
  readonly keystrokes: number;
  /** The part of a keystroke carried over to the next frame. */
  readonly pending: number;
}

function showRate(perSecond: number): number {
  return Math.min(perSecond, MAX_SHOWN_AUTO_KEYSTROKES_PER_SECOND);
}

export function accrueAutoKeystrokes(pending: number, perSecond: number, elapsedMs: number): AutoTypingStep {
  const accrued = Math.min(pending + (showRate(perSecond) * elapsedMs) / MS_PER_SECOND, MAX_PENDING_KEYSTROKES);
  const keystrokes = Math.floor(accrued);
  return { keystrokes, pending: accrued - keystrokes };
}

/** Who's at the keyboard, era by era: their floaters carry their face. The crash's intern fetches the coffee. */
const HIRE_ICONS: Readonly<Record<EraId, string>> = {
  'homepage-1997': '👦',
  'crash-2000': '☕',
  'web2-2005': '🤓',
  'social-2011': '🌍',
  'platform-2018': '🎓',
  'ai-2024': '🤖',
};

/** "🤖 +$1.2B" over one of their shown keystrokes: the pay per second spread over the keystrokes the editor shows. */
export function describeHiredKeystroke(eraId: EraId, hiredPerSecond: number, keystrokesPerSecond: number): string {
  return `${HIRE_ICONS[eraId]} +${formatMoney(hiredPerSecond / showRate(keystrokesPerSecond))}`;
}
