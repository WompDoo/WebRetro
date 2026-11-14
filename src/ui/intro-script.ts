/**
 * The opening: three lines typed out on a black screen, about four seconds, then "Press any key to continue": the
 * reader sets the pace. Pure timing, so it's testable; intro.ts draws it.
 */
const INTRO_TEXTS: readonly string[] = [
  'CONNECT 28800',
  'It’s 1997, and everyone is getting on the Internet.',
  'You’re getting a homepage. Build it, keep it running, and take it through almost thirty years of the web.',
];
const MS_PER_CHARACTER = 22;
const PAUSE_BETWEEN_LINES_MS = 350;

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

/** When the last line is typed out, if nobody hurries it. */
export const INTRO_TYPING_MS = (LAST_LINE?.startsAtMs ?? 0) + typingMs(LAST_LINE?.text ?? '');

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

/** After Finish: the wizard "uploads" the page, then the desktop fades into the game. Both skippable. */
export const UPLOAD_MS = 2_600;
export const LEAVE_MS = 450;

/**
 * The game doesn't pop in under the fading desktop: it assembles, panel by panel, each fading up a little after
 * the one before (the top bar, your site, the editor, the shop, the news; the tab bar too on phones).
 */
export const ENTER_PANEL_MS = 520;
export const ENTER_STEP_MS = 110;
const ENTER_PANELS = 5;
export const ENTER_MS = ENTER_PANEL_MS + ENTER_STEP_MS * (ENTER_PANELS - 1);

/** One line of the upload dialog's status, shown from one share of the upload to another. */
export interface UploadMessage {
  readonly text: string;
  readonly from: number;
  readonly to: number;
}

/** Windows' time estimates, as everyone remembers them. The last one stays. */
export const UPLOAD_MESSAGES: readonly UploadMessage[] = [
  { text: 'Connecting to members.freewebspace.net…', from: 0, to: 0.2 },
  { text: 'Estimating time remaining…', from: 0.2, to: 0.42 },
  { text: '3 hours remaining', from: 0.42, to: 0.64 },
  { text: '1 second remaining', from: 0.64, to: 0.88 },
  { text: 'Done! Your home page is on the Internet.', from: 0.88, to: 1 },
];
