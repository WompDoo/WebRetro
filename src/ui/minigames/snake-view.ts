import { advanceSnake, createSnakeGame, steerSnake } from '../../engine';
import type { GridPoint, MinigameStatus, SnakeDirection, SnakeGame } from '../../engine';
import { createFieldCanvas, plural } from './canvas';
import type { MinigameView } from './types';

const COLUMNS = 14;
const ROWS = 10;
const STEP_INTERVAL_MS = 140;
const SWIPE_THRESHOLD_PX = 24;
const SEGMENT_INSET = 0.1;
const FOOD_INSET = 0.11;
const FOOD_CORE_INSET = 0.35;
const EYE_SIZE = 0.16;
const COLORS = {
  board: '#0B1022',
  grid: 'rgba(120, 140, 255, 0.08)',
  snake: '#3DDC84',
  head: '#9BFFC2',
  eye: '#0B1022',
  food: '#FF4D5E',
  foodCore: '#FFD25A',
} as const;

const KEY_DIRECTIONS: Readonly<Record<string, SnakeDirection>> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

const STATUS_TEXT: Readonly<Record<SnakeGame['status'], string>> = {
  waiting: 'Press an arrow key, WASD or swipe to start.',
  running: 'Eat the virus fragments. Don’t hit the walls or yourself.',
  won: 'Virus removed!',
  crashed: 'Crashed! The virus is still there.',
};

const SNAKE_TO_MINIGAME_STATUS: Readonly<Record<SnakeGame['status'], MinigameStatus>> = { waiting: 'waiting', running: 'running', won: 'won', crashed: 'lost' };

function isSnakeDirection(value: string | undefined): value is SnakeDirection {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right';
}

function swipeDirection(deltaX: number, deltaY: number): SnakeDirection | null {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_THRESHOLD_PX) return null;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX > 0 ? 'right' : 'left';
  return deltaY > 0 ? 'down' : 'up';
}

function drawCell(context: CanvasRenderingContext2D, point: GridPoint, color: string, inset: number): void {
  context.fillStyle = color;
  context.fillRect(point.x + inset, point.y + inset, 1 - inset * 2, 1 - inset * 2);
}

function drawBoard(context: CanvasRenderingContext2D): void {
  context.fillStyle = COLORS.board;
  context.fillRect(0, 0, COLUMNS, ROWS);
  context.fillStyle = COLORS.grid;
  Array.from({ length: COLUMNS * ROWS }, (_, index) => ({ x: index % COLUMNS, y: Math.floor(index / COLUMNS) }))
    .filter((cell) => (cell.x + cell.y) % 2 === 0)
    .forEach((cell) => context.fillRect(cell.x, cell.y, 1, 1));
}

function drawSnake(context: CanvasRenderingContext2D, game: SnakeGame): void {
  drawBoard(context);
  drawCell(context, game.food, COLORS.food, FOOD_INSET);
  drawCell(context, game.food, COLORS.foodCore, FOOD_CORE_INSET);
  game.body.forEach((segment, index) => drawCell(context, segment, index === 0 ? COLORS.head : COLORS.snake, SEGMENT_INSET));
  const head = game.body[0];
  if (head === undefined) return;
  context.fillStyle = COLORS.eye;
  context.fillRect(head.x + 0.3, head.y + 0.3, EYE_SIZE, EYE_SIZE);
  context.fillRect(head.x + 0.55, head.y + 0.3, EYE_SIZE, EYE_SIZE);
}

function createPad(): HTMLElement {
  const pad = document.createElement('div');
  pad.className = 'snake-pad';
  pad.setAttribute('aria-label', 'Direction buttons');
  pad.innerHTML = [['up', '▲'], ['left', '◀'], ['down', '▼'], ['right', '▶']]
    .map(([direction, arrow]) => `<button type="button" data-snake-direction="${direction}" aria-label="${direction}">${arrow}</button>`)
    .join('');
  return pad;
}

/** The original: steer into the virus fragments without hitting the walls or yourself. */
export const snakeView: MinigameView = (stage, target, seed) => {
  let game = createSnakeGame(COLUMNS, ROWS, target.difficulty, seed);
  let sinceStepMs = 0;
  let swipeStart: { readonly x: number; readonly y: number } | null = null;
  const field = createFieldCanvas('snake-canvas', 'Snake board', COLUMNS, ROWS);
  const pad = createPad();
  stage.append(field.canvas, pad);

  const draw = (): void => {
    const context = field.prepare();
    if (context !== null) drawSnake(context, game);
  };
  const steer = (direction: SnakeDirection): void => {
    game = steerSnake(game, direction);
  };
  pad.addEventListener('pointerdown', (event) => {
    const direction = (event.target instanceof Element ? event.target.closest<HTMLElement>('[data-snake-direction]') : null)?.dataset['snakeDirection'];
    if (!isSnakeDirection(direction)) return;
    event.preventDefault();
    steer(direction);
  });
  field.canvas.addEventListener('pointerdown', (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  field.canvas.addEventListener('pointerup', (event) => {
    if (swipeStart === null) return;
    const direction = swipeDirection(event.clientX - swipeStart.x, event.clientY - swipeStart.y);
    swipeStart = null;
    if (direction !== null) steer(direction);
  });
  field.canvas.focus({ preventScroll: true });
  draw();

  return {
    brief: `Eat ${plural(target.difficulty, 'virus fragment')} to clean your ${target.featureName}.`,
    hint: 'Arrow keys · WASD · swipe',
    tick: (elapsedMs) => {
      sinceStepMs += elapsedMs;
      const steps = Math.floor(sinceStepMs / STEP_INTERVAL_MS);
      sinceStepMs -= steps * STEP_INTERVAL_MS;
      game = Array.from({ length: steps }).reduce<SnakeGame>((current) => advanceSnake(current), game);
      draw();
    },
    handleKey: (event) => {
      const direction = KEY_DIRECTIONS[event.key];
      if (direction === undefined) return false;
      event.preventDefault();
      steer(direction);
      return true;
    },
    progress: () => `${game.eaten} / ${game.required} eaten`,
    status: () => SNAKE_TO_MINIGAME_STATUS[game.status],
    statusText: () => STATUS_TEXT[game.status],
    destroy: () => stage.replaceChildren(),
  };
};
