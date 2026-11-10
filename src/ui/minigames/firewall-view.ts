import {
  advanceFirewall,
  createFirewallGame,
  fireFirewall,
  FIREWALL_HEIGHT,
  FIREWALL_TURRET_WIDTH,
  FIREWALL_TURRET_Y,
  FIREWALL_VIRUS_HEIGHT,
  FIREWALL_VIRUS_WIDTH,
  FIREWALL_WIDTH,
  moveFirewallTurret,
  placeFirewallVirus,
} from '../../engine';
import type { FirewallGame, MinigameStatus } from '../../engine';
import { createFieldCanvas, plural } from './canvas';
import type { MinigameView } from './types';

const KEYBOARD_SPEED = 220;
const MS_PER_SECOND = 1_000;
const SHOT_LENGTH = 8;
const FILES_ROW_HEIGHT = 8;
const COLORS = {
  field: '#0B1022',
  files: '#2A3157',
  virus: '#3DDC84',
  virusEye: '#0B1022',
  turret: '#FF8A3D',
  turretMortar: '#7A2E00',
  shot: '#FFD25A',
} as const;

const STATUS_TEXT: Readonly<Record<MinigameStatus, string>> = {
  waiting: 'Fire to start. The viruses march toward your files.',
  running: 'Slide under a virus and fire. One shot in the air at a time.',
  won: 'Every virus blocked!',
  lost: 'The viruses reached your files. Try again.',
};

const MOVE_KEYS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1, a: -1, d: 1, A: -1, D: 1 };
const FIRE_KEYS: readonly string[] = [' ', 'ArrowUp', 'w', 'W'];

function drawVirus(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.fillStyle = COLORS.virus;
  context.beginPath();
  context.ellipse(x + FIREWALL_VIRUS_WIDTH / 2, y + FIREWALL_VIRUS_HEIGHT / 2, FIREWALL_VIRUS_WIDTH / 2, FIREWALL_VIRUS_HEIGHT / 2, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.virusEye;
  context.fillRect(x + 5, y + 4, 3, 3);
  context.fillRect(x + FIREWALL_VIRUS_WIDTH - 8, y + 4, 3, 3);
}

/** A little brick wall: it's a firewall. */
function drawTurret(context: CanvasRenderingContext2D, centerX: number): void {
  const left = centerX - FIREWALL_TURRET_WIDTH / 2;
  context.fillStyle = COLORS.turret;
  context.fillRect(left, FIREWALL_TURRET_Y, FIREWALL_TURRET_WIDTH, 8);
  context.fillStyle = COLORS.turretMortar;
  context.fillRect(left, FIREWALL_TURRET_Y + 4, FIREWALL_TURRET_WIDTH, 1);
  context.fillRect(centerX, FIREWALL_TURRET_Y, 1, 4);
  context.fillStyle = COLORS.turret;
  context.fillRect(centerX - 2, FIREWALL_TURRET_Y - 5, 4, 5);
}

function drawFirewall(context: CanvasRenderingContext2D, game: FirewallGame): void {
  context.fillStyle = COLORS.field;
  context.fillRect(0, 0, FIREWALL_WIDTH, FIREWALL_HEIGHT);
  context.fillStyle = COLORS.files;
  context.fillRect(0, FIREWALL_HEIGHT - FILES_ROW_HEIGHT, FIREWALL_WIDTH, FILES_ROW_HEIGHT);
  game.viruses.forEach((virus) => {
    const placed = placeFirewallVirus(game, virus);
    drawVirus(context, placed.x, placed.y);
  });
  drawTurret(context, game.turretX);
  if (game.shot === null) return;
  context.fillStyle = COLORS.shot;
  context.fillRect(game.shot.x - 1, game.shot.y - SHOT_LENGTH, 2, SHOT_LENGTH);
}

/** Shoot down the viruses before their formation reaches your files. */
export const firewallView: MinigameView = (stage, target) => {
  let game = createFirewallGame(target.difficulty);
  let keyboardDirection = 0;
  const field = createFieldCanvas('firewall-canvas', 'Firewall: shoot the viruses', FIREWALL_WIDTH, FIREWALL_HEIGHT);
  stage.append(field.canvas);

  const draw = (): void => {
    const context = field.prepare();
    if (context !== null) drawFirewall(context, game);
  };
  const aimAt = (clientX: number, clientY: number): void => {
    game = moveFirewallTurret(game, field.toField(clientX, clientY).x);
  };
  field.canvas.addEventListener('pointermove', (event) => aimAt(event.clientX, event.clientY));
  field.canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    aimAt(event.clientX, event.clientY);
    game = fireFirewall(game);
  });
  const releaseMoveKey = (event: KeyboardEvent): void => {
    if (MOVE_KEYS[event.key] !== undefined) keyboardDirection = 0;
  };
  window.addEventListener('keyup', releaseMoveKey);
  field.canvas.focus({ preventScroll: true });
  draw();

  return {
    brief: `Shoot down ${plural(game.virusesTotal, 'virus', 'viruses')} before they reach your ${target.featureName}.`,
    hint: 'Move the pointer and click · ← → and space',
    tick: (elapsedMs) => {
      const keyboardMove = (keyboardDirection * KEYBOARD_SPEED * elapsedMs) / MS_PER_SECOND;
      game = advanceFirewall(moveFirewallTurret(game, game.turretX + keyboardMove), elapsedMs);
      draw();
    },
    handleKey: (event) => {
      const direction = MOVE_KEYS[event.key];
      if (direction !== undefined) keyboardDirection = direction;
      if (FIRE_KEYS.includes(event.key)) game = fireFirewall(game);
      const isUsed = direction !== undefined || FIRE_KEYS.includes(event.key);
      if (isUsed) event.preventDefault();
      return isUsed;
    },
    progress: () => `${game.virusesTotal - game.viruses.length} / ${game.virusesTotal} blocked`,
    status: () => game.status,
    statusText: () => STATUS_TEXT[game.status],
    destroy: () => {
      window.removeEventListener('keyup', releaseMoveKey);
      stage.replaceChildren();
    },
  };
};
