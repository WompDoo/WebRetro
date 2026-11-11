import { advanceCrossTraffic, createCrossTrafficGame, CROSS_TRAFFIC_MAX_HITS, moveCrossTraffic, serverRow } from '../../engine';
import type { CrossMove, CrossTrafficGame, MinigameStatus, TrafficLane } from '../../engine';
import { plural } from './canvas';
import type { MinigameView } from './types';

const PERCENT = 100;
const KEY_MOVES: Readonly<Record<string, CrossMove>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};
const PAD_BUTTONS: readonly (readonly [CrossMove, string])[] = [
  ['up', '▲'],
  ['left', '◀'],
  ['right', '▶'],
  ['down', '▼'],
];

const STATUS_TEXTS: Readonly<Record<MinigameStatus, (game: CrossTrafficGame) => string>> = {
  waiting: () => 'Hop up to start. The traffic starts moving when you do.',
  running: (game) => (game.hits === 0 ? 'Wait for a gap, then hop.' : `Hit by ${plural(game.hits, 'bot')}. Back to your laptop.`),
  won: () => 'You got through and switched on rate limiting. The flood is over.',
  lost: () => 'The bots kept knocking you off the network. Try again.',
};

const COUNTED_TIMES: readonly string[] = ['once', 'twice'];

function describeTimes(count: number): string {
  return COUNTED_TIMES[count - 1] ?? `${count} times`;
}

function percentOf(cells: number, total: number): string {
  return `${(cells / total) * PERCENT}%`;
}

function renderLane(lane: TrafficLane, laneIndex: number): string {
  const bots = lane.bots.map(() => '<span class="cross-bot">BOT</span>').join('');
  return `<div class="cross-row cross-lane" data-cross-lane="${laneIndex}">${bots}</div>`;
}

function renderBoard(game: CrossTrafficGame): string {
  const lanesTopDown = game.lanes.map(renderLane).reverse().join('');
  return `<div class="cross-row is-server">Server: switch on rate limiting</div>${lanesTopDown}<div class="cross-row is-laptop">Your laptop</div><span class="cross-packet" aria-label="Your connection"></span>`;
}

/** Hop your admin connection across lanes of botnet traffic to the server, as many times as it takes. */
export const crossTrafficView: MinigameView = (stage, target, seed) => {
  let game = createCrossTrafficGame(target.difficulty, seed);
  const rows = serverRow(game) + 1;
  const board = document.createElement('div');
  board.className = 'cross-board';
  board.style.setProperty('--rows', String(rows));
  board.innerHTML = renderBoard(game);
  const pad = document.createElement('div');
  pad.className = 'cross-pad';
  stage.append(board, pad);
  const packet = board.querySelector<HTMLElement>('.cross-packet');
  // Looked up once: lanes and their bots never change in number during an attempt.
  const botElements = game.lanes.map((_, laneIndex) => [...board.querySelectorAll<HTMLElement>(`[data-cross-lane="${laneIndex}"] .cross-bot`)]);

  const render = (): void => {
    game.lanes.forEach((lane, laneIndex) => {
      (botElements[laneIndex] ?? []).forEach((bot, botIndex) => {
        bot.style.left = percentOf(lane.bots[botIndex] ?? 0, game.columns);
        bot.style.width = percentOf(lane.botLength, game.columns);
      });
    });
    packet?.style.setProperty('left', percentOf(game.column, game.columns));
    packet?.style.setProperty('bottom', percentOf(game.row, rows));
  };
  const hop = (move: CrossMove): void => {
    game = moveCrossTraffic(game, move);
    render();
  };
  // Each pad button knows its own hop: nothing to look up when it's pressed.
  PAD_BUTTONS.forEach(([move, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cross-pad-button is-${move}`;
    button.textContent = label;
    button.setAttribute('aria-label', `Hop ${move}`);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      hop(move);
    });
    pad.append(button);
  });
  render();

  return {
    brief: `A botnet is flooding the network in front of your ${target.featureName}. Hop your admin connection across the bot traffic to the server ${describeTimes(game.required)}. Get hit ${CROSS_TRAFFIC_MAX_HITS} times and you're cut off.`,
    hint: 'Arrow keys or WASD · or the pad',
    tick: (elapsedMs) => {
      game = advanceCrossTraffic(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      const move = KEY_MOVES[event.key];
      if (move === undefined) return false;
      event.preventDefault();
      hop(move);
      return true;
    },
    progress: () => `${game.crossings} / ${game.required} through · ${game.hits}/${CROSS_TRAFFIC_MAX_HITS} hits`,
    status: () => game.status,
    statusText: () => STATUS_TEXTS[game.status](game),
    destroy: () => stage.replaceChildren(),
  };
};
