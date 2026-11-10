// Mulberry32: a tiny seeded generator, so a run with the same seed is reproducible.
const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 2 ** 32;
const FIRST_SHIFT = 15;
const SECOND_SHIFT = 7;
const FINAL_SHIFT = 14;
const FIRST_ODD_MASK = 1;
const SECOND_ODD_MASK = 61;

export interface RandomDraws {
  readonly values: readonly number[];
  readonly nextSeed: number;
}

interface RandomDraw {
  readonly value: number;
  readonly nextSeed: number;
}

function drawRandom(seed: number): RandomDraw {
  const nextSeed = (seed + MULBERRY_INCREMENT) | 0;
  let mixed = Math.imul(nextSeed ^ (nextSeed >>> FIRST_SHIFT), nextSeed | FIRST_ODD_MASK);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> SECOND_SHIFT), mixed | SECOND_ODD_MASK);
  return { value: ((mixed ^ (mixed >>> FINAL_SHIFT)) >>> 0) / UINT32_RANGE, nextSeed };
}

export function drawRandoms(seed: number, count: number): RandomDraws {
  const initial: RandomDraws = { values: [], nextSeed: seed };
  return Array.from({ length: count }).reduce<RandomDraws>((draws) => {
    const draw = drawRandom(draws.nextSeed);
    return { values: [...draws.values, draw.value], nextSeed: draw.nextSeed };
  }, initial);
}

export function interpolateRange(range: readonly [number, number], roll: number): number {
  const [minimum, maximum] = range;
  return minimum + roll * (maximum - minimum);
}
