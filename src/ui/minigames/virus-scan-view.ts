import { advanceVirusScan, clickVirusScanCell, createVirusScanGame, VIRUS_SCAN_MAX_WRONG_CLICKS } from '../../engine';
import type { VirusScanGame } from '../../engine';
import { escapeHtml, setTextIfChanged } from '../dom';
import { plural } from './canvas';
import type { MinigameView } from './types';

const FILE_NAMES: readonly string[] = ['index.html', 'guestbook.cgi', 'counter.gif', 'links.htm', 'song.mid', 'me.jpg', 'style.css', 'blog.php', 'stars.gif'];
const NUMBER_KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function describeStatus(game: VirusScanGame): string {
  if (game.status === 'won') return 'Virus removed!';
  if (game.status === 'lost') return 'You deleted too many clean files. The virus is still there.';
  return game.wrongClicks === 0 ? 'Click the virus while it peeks out of a file.' : `Careful: ${plural(game.wrongClicks, 'clean file')} hit.`;
}

/** Whack the virus: it peeks out of one of your files for a moment at a time. */
export const virusScanView: MinigameView = (stage, target, seed) => {
  let game = createVirusScanGame(target.difficulty, seed);
  const grid = document.createElement('div');
  grid.className = 'scan-grid';
  grid.innerHTML = Array.from({ length: game.cellCount }, (_, cell) => `<button type="button" class="scan-file" data-scan-cell="${cell}">${escapeHtml(FILE_NAMES[cell] ?? 'file')}</button>`).join('');
  stage.append(grid);
  const cells = [...grid.querySelectorAll<HTMLButtonElement>('[data-scan-cell]')];

  const render = (): void => {
    cells.forEach((button, cell) => {
      const isInfected = cell === game.virusCell;
      button.classList.toggle('is-infected', isInfected);
      setTextIfChanged(button, isInfected ? 'VIRUS!' : FILE_NAMES[cell] ?? 'file');
    });
  };
  const click = (cell: number): void => {
    game = clickVirusScanCell(game, cell);
    render();
  };
  grid.addEventListener('pointerdown', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-scan-cell]') : null;
    if (button === null) return;
    event.preventDefault();
    click(Number(button.dataset['scanCell']));
  });
  render();

  return {
    brief: `Zap the virus ${plural(game.required, 'time')} to clean your ${target.featureName}. Clicking a clean file ${VIRUS_SCAN_MAX_WRONG_CLICKS} times fails the scan.`,
    hint: 'Click or tap · keys 1–9',
    tick: (elapsedMs) => {
      game = advanceVirusScan(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      const cell = NUMBER_KEYS.indexOf(event.key);
      if (cell < 0) return false;
      event.preventDefault();
      click(cell);
      return true;
    },
    progress: () => `${game.hits} / ${game.required} zapped`,
    status: () => game.status,
    statusText: () => describeStatus(game),
    destroy: () => stage.replaceChildren(),
  };
};
