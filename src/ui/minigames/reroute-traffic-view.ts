import { createRerouteGame, findConnectedTiles, positionKey, turnRouteTile } from '../../engine';
import type { MinigameStatus, RerouteGame, RouteTile, TilePosition } from '../../engine';
import type { MinigameView } from './types';

/** The grid has a column of labels on each side of the tiles. */
const LABEL_COLUMNS = 1;

const STATUS_TEXTS: Readonly<Record<MinigameStatus, (game: RerouteGame) => string>> = {
  waiting: () => 'Click a tile to turn it.',
  running: (game) => (game.moves === 0 ? 'Click a tile to turn it. Lit cable carries traffic from the Internet.' : 'Keep going: the lit cable shows how far the traffic gets.'),
  won: () => 'Traffic flows through the scrubbing centre. The flood is filtered out.',
  lost: () => 'The route is broken.',
};

function renderTile(tile: RouteTile, position: TilePosition): string {
  const arms = tile.openings.map((side) => `<i class="route-arm is-side-${side}"></i>`).join('');
  const place = `grid-row:${position.row + 1};grid-column:${position.column + 1 + LABEL_COLUMNS}`;
  return `<button type="button" class="route-tile" data-route-tile="${positionKey(position)}" style="${place};--turns:${tile.rotation}" aria-label="Turn this cable"><span class="route-cable">${arms}</span></button>`;
}

function renderBoard(game: RerouteGame): string {
  const tiles = game.tiles.flatMap((row, rowIndex) => row.map((tile, column) => renderTile(tile, { column, row: rowIndex }))).join('');
  const exitColumn = game.columns + 1 + LABEL_COLUMNS;
  return `<span class="route-edge is-entry" style="grid-row:${game.entryRow + 1};grid-column:1">Internet</span>${tiles}<span class="route-edge is-exit" style="grid-row:${game.exitRow + 1};grid-column:${exitColumn}">Scrubbing centre</span>`;
}

function readPosition(button: HTMLElement): TilePosition {
  const [column = 0, row = 0] = (button.dataset['routeTile'] ?? '').split(',').map(Number);
  return { column, row };
}

/** Turn the cable tiles until the Internet's traffic runs through the scrubbing centre to your server. */
export const rerouteTrafficView: MinigameView = (stage, target, seed) => {
  let game = createRerouteGame(target.difficulty, seed);
  const board = document.createElement('div');
  board.className = 'route-board';
  board.style.setProperty('--columns', String(game.columns));
  board.innerHTML = renderBoard(game);
  stage.append(board);
  const buttons = [...board.querySelectorAll<HTMLElement>('[data-route-tile]')];
  // Turns only ever add up, so a tile spins on clockwise instead of snapping back from three quarters to none.
  const turns = new Map(buttons.map((button) => [button.dataset['routeTile'] ?? '', Number(button.style.getPropertyValue('--turns'))]));

  const render = (): void => {
    const lit = findConnectedTiles(game);
    buttons.forEach((button) => {
      const key = button.dataset['routeTile'] ?? '';
      button.classList.toggle('is-lit', lit.has(key));
      button.style.setProperty('--turns', String(turns.get(key) ?? 0));
    });
    board.classList.toggle('is-complete', game.status === 'won');
  };
  // A click (not a pointer press) so the keyboard works too: tab to a tile, Enter or Space turns it.
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset['routeTile'] ?? '';
      game = turnRouteTile(game, readPosition(button));
      turns.set(key, (turns.get(key) ?? 0) + 1);
      render();
    });
  });
  render();

  return {
    brief: `A botnet is flooding your ${target.featureName}. Turn the cables so the traffic runs from the Internet through the scrubbing centre, which filters the attack out. No clock: the page is down while you think.`,
    hint: 'Click or tap a tile to turn it · Tab and Enter work too',
    tick: () => undefined,
    handleKey: () => false,
    progress: () => `${game.moves} ${game.moves === 1 ? 'turn' : 'turns'}`,
    status: () => game.status,
    statusText: () => STATUS_TEXTS[game.status](game),
    destroy: () => stage.replaceChildren(),
  };
};
