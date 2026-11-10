import { advanceSnake, createSnakeGame, isSnakeFinished, steerSnake } from '../engine';
import type { GridPoint, SnakeDirection, SnakeGame } from '../engine';

export interface SnakeModalElements {
  readonly overlay: HTMLElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly progress: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly status: HTMLElement;
  readonly pad: HTMLElement;
  readonly retry: HTMLElement;
}

export interface SnakeTarget {
  readonly requiredFood: number;
  readonly featureName: string;
}

export interface SnakeModalCallbacks {
  /** Null when the virus is gone (cleaned by antivirus, or the game was reset). */
  readonly findTarget: (infectionId: number) => SnakeTarget | null;
  readonly onWin: (infectionId: number) => void;
}

export interface SnakeModal {
  readonly open: (infectionId: number) => void;
  readonly close: () => void;
  readonly retry: () => void;
  readonly isOpen: () => boolean;
  /** Returns true when the minigame used the key, so the rest of the game should ignore it. */
  readonly handleKey: (event: KeyboardEvent) => boolean;
}

const COLUMNS = 14;
const ROWS = 10;
const STEP_INTERVAL_MS = 140;
const CLOSE_AFTER_WIN_MS = 900;
const SWIPE_THRESHOLD_PX = 24;
const SEED_RANGE = 2 ** 31;
const SEGMENT_INSET_RATIO = 0.1;
const EYE_SIZE_RATIO = 0.16;
const FOOD_INSET_RATIO = 0.22;
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

function isSnakeDirection(value: string | undefined): value is SnakeDirection {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right';
}

function swipeDirection(deltaX: number, deltaY: number): SnakeDirection | null {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_THRESHOLD_PX) return null;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX > 0 ? 'right' : 'left';
  return deltaY > 0 ? 'down' : 'up';
}

export function createSnakeModal(elements: SnakeModalElements, callbacks: SnakeModalCallbacks): SnakeModal {
  let game: SnakeGame | null = null;
  let infectionId: number | null = null;
  let stepTimer: number | null = null;
  let swipeStart: { readonly x: number; readonly y: number } | null = null;

  const cellSize = (): number => elements.canvas.width / COLUMNS;

  const resizeCanvas = (): void => {
    const pixelRatio = window.devicePixelRatio || 1;
    const width = elements.canvas.clientWidth;
    elements.canvas.width = Math.round(width * pixelRatio);
    elements.canvas.height = Math.round(((width * ROWS) / COLUMNS) * pixelRatio);
  };

  const drawCell = (context: CanvasRenderingContext2D, point: GridPoint, color: string, insetRatio: number): void => {
    const size = cellSize();
    const inset = size * insetRatio;
    context.fillStyle = color;
    context.fillRect(point.x * size + inset, point.y * size + inset, size - inset * 2, size - inset * 2);
  };

  const drawGrid = (context: CanvasRenderingContext2D): void => {
    const size = cellSize();
    context.fillStyle = COLORS.board;
    context.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    context.fillStyle = COLORS.grid;
    for (let x = 0; x < COLUMNS; x += 1) for (let y = 0; y < ROWS; y += 1) if ((x + y) % 2 === 0) context.fillRect(x * size, y * size, size, size);
  };

  const drawHeadEyes = (context: CanvasRenderingContext2D, head: GridPoint): void => {
    const size = cellSize();
    const eye = size * EYE_SIZE_RATIO;
    context.fillStyle = COLORS.eye;
    context.fillRect(head.x * size + size * 0.3, head.y * size + size * 0.3, eye, eye);
    context.fillRect(head.x * size + size * 0.55, head.y * size + size * 0.3, eye, eye);
  };

  const draw = (): void => {
    const context = elements.canvas.getContext('2d');
    if (context === null || game === null) return;
    drawGrid(context);
    drawCell(context, game.food, COLORS.food, FOOD_INSET_RATIO / 2);
    drawCell(context, game.food, COLORS.foodCore, FOOD_INSET_RATIO * 1.6);
    game.body.forEach((segment, index) => drawCell(context, segment, index === 0 ? COLORS.head : COLORS.snake, SEGMENT_INSET_RATIO));
    const head = game.body[0];
    if (head !== undefined) drawHeadEyes(context, head);
  };

  const renderHud = (): void => {
    if (game === null) return;
    elements.progress.textContent = `${game.eaten} / ${game.required} eaten`;
    elements.status.textContent = STATUS_TEXT[game.status];
    elements.status.dataset['status'] = game.status;
    elements.retry.hidden = game.status !== 'crashed';
  };

  const stopTimer = (): void => {
    if (stepTimer !== null) window.clearInterval(stepTimer);
    stepTimer = null;
  };

  const close = (): void => {
    stopTimer();
    game = null;
    infectionId = null;
    elements.overlay.hidden = true;
  };

  const finishIfOver = (): void => {
    if (game === null || !isSnakeFinished(game)) return;
    stopTimer();
    if (game.status !== 'won' || infectionId === null) return;
    callbacks.onWin(infectionId);
    window.setTimeout(close, CLOSE_AFTER_WIN_MS);
  };

  const step = (): void => {
    if (game === null || infectionId === null) return;
    if (callbacks.findTarget(infectionId) === null) {
      close();
      return;
    }
    game = advanceSnake(game);
    draw();
    renderHud();
    finishIfOver();
  };

  const startAttempt = (): void => {
    if (infectionId === null) return;
    const target = callbacks.findTarget(infectionId);
    if (target === null) {
      close();
      return;
    }
    game = createSnakeGame(COLUMNS, ROWS, target.requiredFood, Math.floor(Math.random() * SEED_RANGE));
    elements.brief.textContent = `Eat ${target.requiredFood} virus fragment${target.requiredFood === 1 ? '' : 's'} to clean your ${target.featureName}. The longer a virus stays, the more you need (up to 3).`;
    stopTimer();
    stepTimer = window.setInterval(step, STEP_INTERVAL_MS);
    resizeCanvas();
    draw();
    renderHud();
    elements.canvas.focus({ preventScroll: true });
  };

  const steer = (direction: SnakeDirection): void => {
    if (game !== null) game = steerSnake(game, direction);
    renderHud();
  };

  elements.pad.addEventListener('pointerdown', (event) => {
    const direction = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-snake-direction]')?.dataset['snakeDirection'];
    if (!isSnakeDirection(direction)) return;
    event.preventDefault();
    steer(direction);
  });
  elements.canvas.addEventListener('pointerdown', (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  elements.canvas.addEventListener('pointerup', (event) => {
    if (swipeStart === null) return;
    const direction = swipeDirection(event.clientX - swipeStart.x, event.clientY - swipeStart.y);
    swipeStart = null;
    if (direction !== null) steer(direction);
  });
  window.addEventListener('resize', () => {
    if (game === null) return;
    resizeCanvas();
    draw();
  });

  const handleKey = (event: KeyboardEvent): boolean => {
    if (game === null) return false;
    if (event.key === 'Escape') {
      close();
      return true;
    }
    const direction = KEY_DIRECTIONS[event.key];
    if (direction === undefined) return false;
    event.preventDefault();
    steer(direction);
    return true;
  };

  return {
    open: (id: number) => {
      infectionId = id;
      elements.overlay.hidden = false;
      startAttempt();
    },
    close,
    retry: startAttempt,
    isOpen: () => game !== null,
    handleKey,
  };
}
