import type { EraId, MinigameId, MinigameStatus } from '../../engine';

/** What a minigame needs to know about the infection it fixes. */
export interface MinigameTarget {
  readonly minigameId: MinigameId;
  readonly difficulty: number;
  readonly featureName: string;
  readonly eraId: EraId;
}

/** One attempt at one minigame, mounted into the shell's stage. The shell owns the clock and the outcome. */
export interface MinigameSession {
  readonly brief: string;
  readonly hint: string;
  readonly tick: (elapsedMs: number) => void;
  /** True when the minigame used the key. */
  readonly handleKey: (event: KeyboardEvent) => boolean;
  readonly progress: () => string;
  readonly status: () => MinigameStatus;
  readonly statusText: () => string;
  readonly destroy: () => void;
}

export type MinigameView = (stage: HTMLElement, target: MinigameTarget, seed: number) => MinigameSession;
