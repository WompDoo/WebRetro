/**
 * The opening: three lines typed out on a black screen, about five seconds, then the wizard that names the site.
 * Pure timing, so it's testable; intro.ts draws it.
 */
const INTRO_TEXTS: readonly string[] = [
  'CONNECT 28800',
  'It’s 1997, and everyone is getting on the Internet.',
  'You’re getting a homepage. Build it, keep it running, and take it through thirty years of the web.',
];
const MS_PER_CHARACTER = 22;
const PAUSE_BETWEEN_LINES_MS = 350;
/** The last line stays on screen a moment before the wizard opens. */
const HOLD_AFTER_LAST_LINE_MS = 700;

interface TimedLine {
  readonly text: string;
  readonly startsAtMs: number;
}

function typingMs(text: string): number {
  return text.length * MS_PER_CHARACTER;
}

const INTRO_LINES: readonly TimedLine[] = INTRO_TEXTS.reduce<readonly TimedLine[]>((lines, text) => {
  const previous = lines[lines.length - 1];
  const startsAtMs = previous === undefined ? 0 : previous.startsAtMs + typingMs(previous.text) + PAUSE_BETWEEN_LINES_MS;
  return [...lines, { text, startsAtMs }];
}, []);

const LAST_LINE = INTRO_LINES[INTRO_LINES.length - 1];

/** When the wizard opens on its own, if nobody skips. */
export const INTRO_DURATION_MS = (LAST_LINE?.startsAtMs ?? 0) + typingMs(LAST_LINE?.text ?? '') + HOLD_AFTER_LAST_LINE_MS;

export const INTRO_LINE_COUNT = INTRO_LINES.length;

/** How much of each line is typed out after this long: empty before it starts, whole once it's done. */
export function revealIntroLines(elapsedMs: number): readonly string[] {
  return INTRO_LINES.map((line) => line.text.slice(0, Math.max(0, Math.floor((elapsedMs - line.startsAtMs) / MS_PER_CHARACTER))));
}

/** 1997 names, for the wizard's random button. Made up, like every homepage's. */
export const RANDOM_SITE_NAMES: readonly string[] = [
  'Cyber Corner',
  'Planet Pixel',
  'The Cool Zone',
  'Kevin’s Kool Page',
  'Rad Webzone',
  'Starlight Dreams',
  'Surf City',
  'The Funhouse',
  'Net Nexus',
  'Mega Page 2000',
  'Dragon’s Lair',
  'Pixel Paradise',
  'Groovy Galaxy',
  'Cosmic Cafe',
  'Totally Tubular',
  'Hamster Heaven',
  'Neon Nights',
  'Captain Web',
  'Electric Dreams',
  'The Info Highway',
];

/** A random name, never the one already in the box: the button always changes something. */
export function pickRandomSiteName(current: string, roll: number): string {
  const choices = RANDOM_SITE_NAMES.filter((name) => name !== current);
  return choices[Math.floor(roll * choices.length)] ?? RANDOM_SITE_NAMES[0] ?? current;
}
