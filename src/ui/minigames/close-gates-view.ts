import {
  advanceCloseGates,
  CLOSE_GATES_MAX_BOTS_THROUGH,
  CLOSE_GATES_MAX_TURNED_AWAY,
  createCloseGatesGame,
  GATE_POSITION,
  MS_PER_SECOND,
  toggleGate,
} from '../../engine';
import type { CloseGatesGame, GateRequest, MinigameStatus } from '../../engine';
import { setTextIfChanged } from '../dom';
import { plural } from './canvas';
import type { MinigameView } from './types';

const LANE_KEYS: readonly string[] = ['1', '2', '3'];
const PERCENT = 100;
/** Requests travel across this much of the lane; the rest is the server. */
const TRACK_SHARE = 0.9;
/** Bots wear an address from the documentation range: no real network gets blamed. */
const BOT_ADDRESS_PREFIX = '203.0.113.';
const ADDRESS_RANGE = 254;

const STATUS_TEXTS: Readonly<Record<MinigameStatus, (game: CloseGatesGame) => string>> = {
  waiting: () => 'Click a lane to close its gate. The attack starts when you do.',
  running: () => 'Red bots: close the gate. Green visitors: open it.',
  won: () => 'The botnet gave up. Real visitors are getting through again.',
  lost: (game) =>
    game.botsThrough >= CLOSE_GATES_MAX_BOTS_THROUGH ? 'Too many bots reached the server. It went down.' : 'You turned away too many real visitors.',
};

function placeOnTrack(position: number): string {
  return `${Math.min(position, 1) * TRACK_SHARE * PERCENT}%`;
}

function createRequestChip(request: GateRequest): HTMLElement {
  const chip = document.createElement('span');
  chip.className = `ddos-request ${request.isBot ? 'is-bot' : 'is-visitor'}`;
  chip.textContent = request.isBot ? `${BOT_ADDRESS_PREFIX}${1 + (request.id % ADDRESS_RANGE)}` : 'visitor';
  return chip;
}

function renderLane(lane: number): string {
  return `<button type="button" class="ddos-lane" data-ddos-lane="${lane}">
    <span class="ddos-key">${lane + 1}</span>
    <span class="ddos-gate" style="left:${placeOnTrack(GATE_POSITION)}"></span>
    <span class="ddos-server" aria-hidden="true"></span>
  </button>`;
}

/** Lanes of incoming requests and a gate on each: shut out the bots, let the visitors through. */
export const closeGatesView: MinigameView = (stage, target, seed) => {
  let game = createCloseGatesGame(target.difficulty, seed);
  const lanesElement = document.createElement('div');
  lanesElement.className = 'ddos-lanes';
  lanesElement.innerHTML = Array.from({ length: game.laneCount }, (_, lane) => renderLane(lane)).join('');
  const tally = document.createElement('p');
  tally.className = 'ddos-tally';
  stage.append(lanesElement, tally);
  const lanes = [...lanesElement.querySelectorAll<HTMLElement>('[data-ddos-lane]')];
  const chips = new Map<number, HTMLElement>();

  const addChip = (request: GateRequest): HTMLElement => {
    const chip = createRequestChip(request);
    lanes[request.lane]?.append(chip);
    chips.set(request.id, chip);
    return chip;
  };
  const syncChips = (): void => {
    const liveIds = new Set(game.requests.map((request) => request.id));
    chips.forEach((chip, id) => {
      if (liveIds.has(id)) return;
      chip.remove();
      chips.delete(id);
    });
    game.requests.forEach((request) => {
      const chip = chips.get(request.id) ?? addChip(request);
      chip.style.left = placeOnTrack(request.position);
    });
  };
  const render = (): void => {
    lanes.forEach((lane, index) => lane.classList.toggle('is-closed', game.closedLanes[index] === true));
    syncChips();
    setTextIfChanged(
      tally,
      `${plural(game.botsBlocked, 'bot')} blocked · ${game.botsThrough}/${CLOSE_GATES_MAX_BOTS_THROUGH} got through · ${game.visitorsTurnedAway}/${CLOSE_GATES_MAX_TURNED_AWAY} visitors turned away`,
    );
  };
  const flip = (lane: number): void => {
    game = toggleGate(game, lane);
    render();
  };
  lanes.forEach((lane, index) => {
    lane.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      flip(index);
    });
  });
  render();

  return {
    brief: `A botnet is flooding your ${target.featureName}. Close a lane's gate to drop what reaches it and open it for real visitors. ${CLOSE_GATES_MAX_BOTS_THROUGH} bots through, or ${CLOSE_GATES_MAX_TURNED_AWAY} visitors turned away, and you lose.`,
    hint: 'Click or tap a lane · keys 1–3',
    tick: (elapsedMs) => {
      game = advanceCloseGates(game, elapsedMs);
      render();
    },
    handleKey: (event) => {
      const lane = LANE_KEYS.indexOf(event.key);
      if (lane < 0) return false;
      event.preventDefault();
      flip(lane);
      return true;
    },
    progress: () => `${Math.ceil(Math.max(0, game.durationMs - game.elapsedMs) / MS_PER_SECOND)} s until the attack stops`,
    status: () => game.status,
    statusText: () => STATUS_TEXTS[game.status](game),
    destroy: () => stage.replaceChildren(),
  };
};
