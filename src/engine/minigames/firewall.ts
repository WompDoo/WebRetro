import type { MinigameStatus } from './status';

/** Viruses march down toward your files. Slide the firewall under them and fire before they arrive. */
export interface Vector {
  readonly x: number;
  readonly y: number;
}

export interface FirewallGame {
  readonly turretX: number;
  /** Top-left corners of the viruses still marching, relative to the formation. */
  readonly viruses: readonly Vector[];
  readonly virusesTotal: number;
  readonly formation: Vector;
  /** +1 marching right, -1 marching left. */
  readonly marchDirection: number;
  /** One shot in the air at a time, or null. */
  readonly shot: Vector | null;
  readonly status: MinigameStatus;
}

export const FIREWALL_WIDTH = 240;
export const FIREWALL_HEIGHT = 180;
export const FIREWALL_TURRET_Y = 164;
export const FIREWALL_TURRET_WIDTH = 22;
export const FIREWALL_VIRUS_WIDTH = 20;
export const FIREWALL_VIRUS_HEIGHT = 14;
const COLUMNS = 5;
const COLUMN_GAP = 10;
const ROW_GAP = 8;
const FORMATION_TOP = 16;
const FORMATION_WIDTH = COLUMNS * FIREWALL_VIRUS_WIDTH + (COLUMNS - 1) * COLUMN_GAP;
/** Each time the formation reaches a wall it steps down this far. */
const STEP_DOWN = 9;
const BASE_MARCH_SPEED = 32;
/** The last viruses march faster, so the end of a round doesn't drag. */
const SPEED_UP_WHEN_CLEARED = 0.8;
const SHOT_SPEED = 600;
/** Reaching this line means the viruses got to your files. */
const BREACH_Y = FIREWALL_TURRET_Y - 6;
const STEP_MS = 8;
const MS_PER_SECOND = 1_000;

/** One row of viruses per difficulty level. */
export function createFirewallGame(difficulty: number): FirewallGame {
  const viruses = Array.from({ length: difficulty * COLUMNS }, (_, index) => ({
    x: (index % COLUMNS) * (FIREWALL_VIRUS_WIDTH + COLUMN_GAP),
    y: Math.floor(index / COLUMNS) * (FIREWALL_VIRUS_HEIGHT + ROW_GAP),
  }));
  return {
    turretX: FIREWALL_WIDTH / 2,
    viruses,
    virusesTotal: viruses.length,
    formation: { x: (FIREWALL_WIDTH - FORMATION_WIDTH) / 2, y: FORMATION_TOP },
    marchDirection: 1,
    shot: null,
    status: 'waiting',
  };
}

export function moveFirewallTurret(game: FirewallGame, x: number): FirewallGame {
  const half = FIREWALL_TURRET_WIDTH / 2;
  return { ...game, turretX: Math.min(FIREWALL_WIDTH - half, Math.max(half, x)) };
}

/** Fires when no shot is in the air. The first shot starts the round. */
export function fireFirewall(game: FirewallGame): FirewallGame {
  const canFire = (game.status === 'waiting' || game.status === 'running') && game.shot === null;
  return canFire ? { ...game, status: 'running', shot: { x: game.turretX, y: FIREWALL_TURRET_Y } } : game;
}

/** Where a virus is on the field, not in the formation. */
export function placeFirewallVirus(game: FirewallGame, virus: Vector): Vector {
  return { x: game.formation.x + virus.x, y: game.formation.y + virus.y };
}

function formationEdges(game: FirewallGame): { readonly left: number; readonly right: number; readonly bottom: number } {
  const placed = game.viruses.map((virus) => placeFirewallVirus(game, virus));
  return {
    left: Math.min(...placed.map((virus) => virus.x)),
    right: Math.max(...placed.map((virus) => virus.x + FIREWALL_VIRUS_WIDTH)),
    bottom: Math.max(...placed.map((virus) => virus.y + FIREWALL_VIRUS_HEIGHT)),
  };
}

function marchSpeed(game: FirewallGame): number {
  const clearedShare = 1 - game.viruses.length / game.virusesTotal;
  return BASE_MARCH_SPEED * (1 + SPEED_UP_WHEN_CLEARED * clearedShare);
}

/** Sideways until a wall, then one step down and back the other way. */
function march(game: FirewallGame, seconds: number): FirewallGame {
  const moved = { ...game, formation: { x: game.formation.x + game.marchDirection * marchSpeed(game) * seconds, y: game.formation.y } };
  const edges = formationEdges(moved);
  const hitsWall = (game.marchDirection > 0 && edges.right >= FIREWALL_WIDTH) || (game.marchDirection < 0 && edges.left <= 0);
  return hitsWall ? { ...game, marchDirection: -game.marchDirection, formation: { x: game.formation.x, y: game.formation.y + STEP_DOWN } } : moved;
}

function isHit(game: FirewallGame, shot: Vector, virus: Vector): boolean {
  const placed = placeFirewallVirus(game, virus);
  return shot.x >= placed.x && shot.x <= placed.x + FIREWALL_VIRUS_WIDTH && shot.y >= placed.y && shot.y <= placed.y + FIREWALL_VIRUS_HEIGHT;
}

function moveShot(game: FirewallGame, seconds: number): FirewallGame {
  if (game.shot === null) return game;
  const shot = { x: game.shot.x, y: game.shot.y - SHOT_SPEED * seconds };
  return { ...game, shot: shot.y < 0 ? null : shot };
}

function resolveHit(game: FirewallGame): FirewallGame {
  const shot = game.shot;
  const hit = shot === null ? undefined : game.viruses.find((virus) => isHit(game, shot, virus));
  if (hit === undefined) return game;
  const viruses = game.viruses.filter((virus) => virus !== hit);
  return { ...game, viruses, shot: null, status: viruses.length === 0 ? 'won' : game.status };
}

function checkBreach(game: FirewallGame): FirewallGame {
  return game.status === 'running' && formationEdges(game).bottom >= BREACH_Y ? { ...game, status: 'lost' } : game;
}

function step(game: FirewallGame, stepMs: number): FirewallGame {
  if (game.status !== 'running') return game;
  const seconds = stepMs / MS_PER_SECOND;
  return checkBreach(resolveHit(moveShot(march(game, seconds), seconds)));
}

export function advanceFirewall(game: FirewallGame, elapsedMs: number): FirewallGame {
  const steps = Math.ceil(elapsedMs / STEP_MS);
  return Array.from({ length: steps }).reduce<FirewallGame>((current) => step(current, elapsedMs / steps), game);
}
