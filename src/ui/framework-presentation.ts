import { findChosenFramework, FRAMEWORKS_BY_ID, UPGRADES_BY_ID } from '../engine';
import type { FrameworkId, GameState } from '../engine';
import { ERA_PRESENTATION } from './presentation';
import type { TypingStyle } from './presentation';

/**
 * How each 2018 framework shows itself. The site looks the same whichever you pick; the editor, the typing,
 * the footer and the way the page fails before its JavaScript has run are where they differ.
 */
export interface FrameworkPresentation {
  readonly mainFile: string;
  readonly editorTabs: readonly string[];
  readonly typing: TypingStyle;
  /**
   * What visitors see while the bundle loads, until the framework renders on the server: React's empty
   * root div, Angular's "Loading...", Vue's template before it's compiled.
   */
  readonly bootScreen: string;
  /** Whichever framework you pick, somebody posts that it's dead. */
  readonly deathNotice: string;
}

export const FRAMEWORK_PRESENTATION: Readonly<Record<FrameworkId, FrameworkPresentation>> = {
  react: {
    mainFile: 'App.jsx',
    editorTabs: ['App.jsx', 'terminal'],
    // React leaves the router, the state and the forms to npm: every keystroke installs something.
    typing: { pastesWholeLines: true, typoLabel: 'typosquat!', fixLabel: 'uninstalled' },
    bootScreen: '',
    deathNotice: 'Top post on Hacker Mews today: “Why we’re leaving React for Vue.” You picked React this morning.',
  },
  angular: {
    mainFile: 'app.component.ts',
    editorTabs: ['app.component.ts', 'app.component.html', 'app.module.ts', 'terminal'],
    // ng generate writes four files per component; strict TypeScript stops the typos before they ship.
    typing: { pastesWholeLines: true, typoLabel: 'TS2322!', fixLabel: 'compiles' },
    bootScreen: 'Loading...',
    deathNotice: 'A conference talk goes viral: “Angular is dead, long live React.” It’s the fourth this year. You picked Angular this morning.',
  },
  vue: {
    mainFile: 'App.vue',
    editorTabs: ['App.vue', 'terminal'],
    typing: { pastesWholeLines: true, typoLabel: 'v-if + v-for!', fixLabel: 'linted' },
    bootScreen: '{{ hero.title }} {{ hero.subtitle }} {{ story.author }} {{ plan.price }}/mo {{ post.excerpt }}',
    deathNotice: 'A blog post asks: “Is Vue just a toy? No enterprise uses it.” Several enterprises reply that they do. You picked Vue this morning.',
  },
};

/**
 * How long the bundle takes to run on a 2018 phone before anything shows: the heavier the framework, the longer.
 * Angular's "Loading..." lasts about three seconds, React's empty page two, Vue's raw template one and a half.
 */
const BOOT_BASE_MS = 600;
const BOOT_MS_PER_BUNDLE_KB = 3.75;

export function calculateBootMs(framework: FrameworkId): number {
  return BOOT_BASE_MS + UPGRADES_BY_ID[FRAMEWORKS_BY_ID[framework].skillId].pageWeightKb * BOOT_MS_PER_BUNDLE_KB;
}

export function findFrameworkPresentation(state: GameState): FrameworkPresentation | null {
  const framework = findChosenFramework(state);
  return framework === null ? null : FRAMEWORK_PRESENTATION[framework];
}

/** The editor's title: the framework's main file once picked, the era's file before. */
export function resolveEditorTitle(state: GameState): string {
  const framework = findFrameworkPresentation(state);
  return framework === null ? ERA_PRESENTATION[state.eraId].editorTitle : framework.mainFile;
}

export function resolveEditorTabs(state: GameState): readonly string[] {
  const framework = findFrameworkPresentation(state);
  return framework === null ? ERA_PRESENTATION[state.eraId].editorTabs : framework.editorTabs;
}

export function resolveTyping(state: GameState): TypingStyle {
  const framework = findFrameworkPresentation(state);
  return framework === null ? ERA_PRESENTATION[state.eraId].typing : framework.typing;
}

/** "Built with Angular": the one place on the page that says which side you took. */
export function describeBuiltWith(state: GameState): string {
  const framework = findChosenFramework(state);
  return framework === null ? 'Built with Bootstrap' : `Built with ${FRAMEWORKS_BY_ID[framework].name}`;
}
