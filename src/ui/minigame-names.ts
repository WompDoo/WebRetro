import type { AnyMinigameId } from '../engine';

/** What each minigame is called on the page, in the tracker and in the playtest panel. */
export const MINIGAME_NAMES: Readonly<Record<AnyMinigameId, string>> = {
  snake: 'Snake',
  'virus-scan': 'Virus scan',
  firewall: 'Firewall',
  'spam-sort': 'Sort the comments',
  'backup-restore': 'Restore a backup',
  'reset-passwords': 'Reset the passwords',
  'reroute-traffic': 'Reroute the traffic',
  'cross-traffic': 'Cross the traffic',
  'fix-build': 'Fix the build',
  'code-entry': 'Enter the code',
};
