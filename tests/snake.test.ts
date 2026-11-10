import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { advanceSnake, createSnakeGame, steerSnake } from '../src/engine/snake';
import type { SnakeGame } from '../src/engine/snake';

const COLUMNS = 14;
const ROWS = 10;
const SEED = 42;

function advanceTimes(game: SnakeGame, steps: number): SnakeGame {
  return Array.from({ length: steps }).reduce<SnakeGame>((current) => advanceSnake(current), game);
}

function withFoodAhead(game: SnakeGame, distance: number): SnakeGame {
  const head = game.body[0] ?? { x: 0, y: 0 };
  return { ...game, food: { x: head.x + distance, y: head.y } };
}

describe('snake minigame', () => {
  it('waits until the player picks a direction', () => {
    const game = createSnakeGame(COLUMNS, ROWS, 1, SEED);
    assert.equal(advanceSnake(game), game);
    assert.equal(game.status, 'waiting');
  });

  it('ignores a first move straight back into its own body', () => {
    const game = steerSnake(createSnakeGame(COLUMNS, ROWS, 1, SEED), 'left');
    assert.equal(game.status, 'waiting');
  });

  it('never places food on the snake', () => {
    const game = createSnakeGame(COLUMNS, ROWS, 1, SEED);
    assert.ok(!game.body.some((segment) => segment.x === game.food.x && segment.y === game.food.y));
  });

  it('wins once it has eaten the required food', () => {
    const running = withFoodAhead(steerSnake(createSnakeGame(COLUMNS, ROWS, 1, SEED), 'right'), 2);
    const finished = advanceTimes(running, 2);
    assert.equal(finished.status, 'won');
    assert.equal(finished.eaten, 1);
  });

  it('grows and keeps going until the requirement is met', () => {
    const running = withFoodAhead(steerSnake(createSnakeGame(COLUMNS, ROWS, 2, SEED), 'right'), 1);
    const afterFirstFood = advanceSnake(running);
    assert.equal(afterFirstFood.status, 'running');
    assert.equal(afterFirstFood.eaten, 1);
    assert.equal(afterFirstFood.body.length, running.body.length + 1);
  });

  it('crashes into the wall', () => {
    const running = steerSnake(createSnakeGame(COLUMNS, ROWS, 3, SEED), 'up');
    const away = { ...running, food: { x: 0, y: ROWS - 1 } };
    assert.equal(advanceTimes(away, ROWS).status, 'crashed');
  });

  it('applies quick turns one step at a time', () => {
    const running = steerSnake(steerSnake(createSnakeGame(COLUMNS, ROWS, 3, SEED), 'up'), 'left');
    assert.deepEqual(running.queuedTurns, ['up', 'left']);
    const afterOneStep = advanceSnake({ ...running, food: { x: 0, y: 0 } });
    assert.equal(afterOneStep.direction, 'up');
    assert.deepEqual(afterOneStep.queuedTurns, ['left']);
  });

  it('ignores input after the game is over', () => {
    const crashed: SnakeGame = { ...createSnakeGame(COLUMNS, ROWS, 1, SEED), status: 'crashed' };
    assert.equal(steerSnake(crashed, 'up'), crashed);
  });
});
