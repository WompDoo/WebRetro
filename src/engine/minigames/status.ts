/** Shared by every minigame. Waiting means it shows the board and starts on the first input. */
export type MinigameStatus = 'waiting' | 'running' | 'won' | 'lost';

export function isMinigameOver(status: MinigameStatus): boolean {
  return status === 'won' || status === 'lost';
}
