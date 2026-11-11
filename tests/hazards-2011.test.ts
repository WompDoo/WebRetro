import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceCloseGates,
  advanceCrossTraffic,
  createCrossTrafficGame,
  CROSS_TRAFFIC_MAX_HITS,
  isCrossTrafficHit,
  moveCrossTraffic,
  serverRow,
  advanceHazards,
  advanceResetPasswords,
  calculateFeatureVisitorsPerSecond,
  CLOSE_GATES_MAX_BOTS_THROUGH,
  CLOSE_GATES_MAX_TURNED_AWAY,
  createCloseGatesGame,
  createInitialGameState,
  createResetPasswordsGame,
  GATE_POSITION,
  MINIGAME_IDS,
  resetAccountPassword,
  toggleGate,
} from '../src/engine';
import type { CloseGatesGame, CrossMove, CrossTrafficGame, GameState, HazardKind, ResetPasswordsGame } from '../src/engine';
import { QUIET_HAZARDS } from './quiet-hazards';

const SEED = 42;
const FRAME_MS = 50;
const base = createInitialGameState(1);
const in2011: GameState = {
  ...base,
  eraId: 'social-2011',
  hazardCountdownsMs: QUIET_HAZARDS,
  featureLevels: { ...base.featureLevels, blog: 20, forum: 10, guestbook: 5, 'share-buttons': 3 },
};
const dueNow = (state: GameState, kind: HazardKind): GameState => ({ ...state, hazardCountdownsMs: { ...QUIET_HAZARDS, [kind]: 1 } });

describe('2011 hazards', () => {
  it('leaks the passwords of something people log into, until bcrypt ends it', () => {
    const leaked = advanceHazards(dueNow(in2011, 'password-leak'), FRAME_MS).state.infections;
    assert.equal(leaked.length, 1);
    assert.equal(leaked[0]?.kind, 'password-leak');
    assert.equal(leaked[0]?.minigameId, 'reset-passwords');
    assert.ok(['forum', 'guestbook'].includes(leaked[0]?.featureId ?? ''));
    const hashed = { ...dueNow(in2011, 'password-leak'), purchasedUpgradeIds: ['learn-bcrypt' as const] };
    assert.equal(advanceHazards(hashed, FRAME_MS).state.infections.length, 0);
  });

  it('sends the botnet at the busiest page, unless DDoS protection is on', () => {
    const busiest = (['blog', 'forum', 'guestbook', 'share-buttons'] as const).reduce((best, featureId) =>
      calculateFeatureVisitorsPerSecond(in2011, featureId) > calculateFeatureVisitorsPerSecond(in2011, best) ? featureId : best,
    );
    const attacked = advanceHazards(dueNow(in2011, 'ddos'), FRAME_MS).state.infections;
    assert.equal(attacked[0]?.kind, 'ddos');
    assert.equal(attacked[0]?.featureId, busiest);
    const protectedSite = { ...dueNow(in2011, 'ddos'), ownedDefenseIds: ['ddos-protection' as const], enabledDefenseIds: ['ddos-protection' as const] };
    assert.equal(advanceHazards(protectedSite, FRAME_MS).state.infections.length, 0);
  });

  it('never happens before 2011', () => {
    const in2005 = { ...in2011, eraId: 'web2-2005' as const };
    assert.equal(advanceHazards(dueNow(in2005, 'password-leak'), FRAME_MS).state.infections.length, 0);
    assert.equal(advanceHazards(dueNow(in2005, 'ddos'), FRAME_MS).state.infections.length, 0);
  });

  it('lists every minigame once, the new ones included', () => {
    assert.equal(new Set(MINIGAME_IDS).size, MINIGAME_IDS.length);
    assert.ok(MINIGAME_IDS.includes('reset-passwords') && MINIGAME_IDS.includes('close-gates'));
  });
});

function runFor(game: ResetPasswordsGame, totalMs: number, play: (current: ResetPasswordsGame) => ResetPasswordsGame): ResetPasswordsGame {
  return Array.from({ length: Math.ceil(totalMs / FRAME_MS) }).reduce<ResetPasswordsGame>((current) => play(advanceResetPasswords(current, FRAME_MS)), game);
}

/** The winning habit: always reset whichever account is closest to cracked. */
function resetTheFullest(game: ResetPasswordsGame): ResetPasswordsGame {
  const fullest = game.accounts.reduce((best, account, index) => (account.progress > (game.accounts[best]?.progress ?? 0) ? index : best), 0);
  return resetAccountPassword(game, fullest);
}

describe('Reset the passwords', () => {
  it('waits for the first reset, then the crackers start', () => {
    const game = createResetPasswordsGame(1, SEED);
    assert.equal(game.status, 'waiting');
    assert.deepEqual(advanceResetPasswords(game, 1_000), game);
    assert.equal(resetAccountPassword(game, 0).status, 'running');
  });

  it('loses when a password gets cracked', () => {
    const started = resetAccountPassword(createResetPasswordsGame(1, SEED), 0);
    assert.equal(runFor(started, started.durationMs, (current) => current).status, 'lost');
  });

  it('is won by resetting the fullest bar every so often, at every difficulty', () => {
    [1, 2, 3].forEach((difficulty) => {
      const started = resetAccountPassword(createResetPasswordsGame(difficulty, SEED), 0);
      const clicksEveryMs = 250;
      const clicks = Math.round(clicksEveryMs / FRAME_MS);
      let frame = 0;
      const played = runFor(started, started.durationMs + FRAME_MS, (current) => (++frame % clicks === 0 ? resetTheFullest(current) : current));
      assert.equal(played.status, 'won', `difficulty ${difficulty}`);
    });
  });

  it('gets harder: more accounts, faster crackers, longer to hold out', () => {
    const easy = createResetPasswordsGame(1, SEED);
    const hard = createResetPasswordsGame(3, SEED);
    assert.ok(hard.accounts.length > easy.accounts.length);
    assert.ok(hard.durationMs > easy.durationMs);
    assert.ok(Math.max(...hard.accounts.map((account) => account.crackMs)) < Math.max(...easy.accounts.map((account) => account.crackMs)));
  });
});

function runGates(game: CloseGatesGame, totalMs: number, play: (current: CloseGatesGame) => CloseGatesGame): CloseGatesGame {
  return Array.from({ length: Math.ceil(totalMs / FRAME_MS) }).reduce<CloseGatesGame>((current) => play(advanceCloseGates(current, FRAME_MS)), game);
}

/** The winning habit: each lane's gate is shut exactly when the next thing coming at it is a bot. */
function gateForWhatsNext(game: CloseGatesGame): CloseGatesGame {
  return game.closedLanes.reduce<CloseGatesGame>((current, isClosed, lane) => {
    const next = current.requests.filter((request) => request.lane === lane && !request.hasPassedGate).sort((first, second) => second.position - first.position)[0];
    const shouldClose = next?.isBot ?? false;
    return shouldClose === isClosed ? current : toggleGate(current, lane);
  }, game);
}

describe('Close the gates', () => {
  it('waits for the first click, then the attack starts', () => {
    const game = createCloseGatesGame(1, SEED);
    assert.equal(game.status, 'waiting');
    assert.deepEqual(advanceCloseGates(game, 1_000), game);
    assert.equal(toggleGate(game, 0).status, 'running');
  });

  it('loses to the bots with every gate left open', () => {
    const started = toggleGate(toggleGate(createCloseGatesGame(1, SEED), 0), 0);
    const played = runGates(started, started.durationMs, (current) => current);
    assert.equal(played.status, 'lost');
    assert.ok(played.botsThrough >= CLOSE_GATES_MAX_BOTS_THROUGH);
  });

  it('loses the visitors with every gate shut', () => {
    const shut = [0, 1, 2].reduce((current, lane) => toggleGate(current, lane), createCloseGatesGame(1, SEED));
    const played = runGates(shut, shut.durationMs, (current) => current);
    assert.equal(played.status, 'lost');
    assert.ok(played.visitorsTurnedAway >= CLOSE_GATES_MAX_TURNED_AWAY);
  });

  it('is won by shutting each gate just for the bots, at every difficulty', () => {
    [1, 2, 3].forEach((difficulty) => {
      const started = toggleGate(toggleGate(createCloseGatesGame(difficulty, SEED), 0), 0);
      const played = runGates(started, started.durationMs + FRAME_MS, gateForWhatsNext);
      assert.equal(played.status, 'won', `difficulty ${difficulty}`);
      assert.ok(played.botsBlocked > 0);
    });
  });

  it('decides each request at the gate, never twice', () => {
    const started = toggleGate(toggleGate(createCloseGatesGame(1, SEED), 0), 0);
    const played = runGates(started, 2_000, gateForWhatsNext);
    played.requests.filter((request) => request.position >= GATE_POSITION).forEach((request) => assert.ok(request.hasPassedGate));
  });
});

function advanceTraffic(game: CrossTrafficGame, totalMs: number): CrossTrafficGame {
  return Array.from({ length: Math.ceil(totalMs / FRAME_MS) }).reduce<CrossTrafficGame>((current) => advanceCrossTraffic(current, FRAME_MS), game);
}

const LOOKAHEAD_MS = 500;
const HOP_EVERY_MS = 150;

/**
 * Safe means: the hop doesn't land on a bot, and then either staying put survives the next half second or
 * the next hop up does. Like a person, it may hop into a lane only to hop straight out of it.
 */
function survivesStaying(before: CrossTrafficGame, after: CrossTrafficGame): boolean {
  return advanceTraffic(after, LOOKAHEAD_MS).hits === before.hits;
}

function survivesNextHop(before: CrossTrafficGame, after: CrossTrafficGame, hopsAhead: number): boolean {
  return hopsAhead > 0 && isSafe(before, moveCrossTraffic(advanceTraffic(after, HOP_EVERY_MS), 'up'), hopsAhead - 1);
}

function isSafe(before: CrossTrafficGame, after: CrossTrafficGame, hopsAhead: number): boolean {
  if (after.hits !== before.hits) return false;
  return survivesStaying(before, after) || survivesNextHop(before, after, hopsAhead);
}

/** A careful player: hops up when it's safe, otherwise stays, dodges sideways or steps back. */
function hopCarefully(game: CrossTrafficGame): CrossTrafficGame {
  const choices: readonly (CrossMove | 'stay')[] = ['up', 'stay', 'left', 'right', 'down'];
  const outcomes = choices.map((choice) => (choice === 'stay' ? game : moveCrossTraffic(game, choice)));
  return outcomes.find((outcome) => isSafe(game, outcome, 1)) ?? game;
}

describe('Cross the traffic', () => {
  it('waits for the first hop, then the traffic starts', () => {
    const game = createCrossTrafficGame(1, SEED);
    assert.equal(game.status, 'waiting');
    assert.deepEqual(advanceCrossTraffic(game, 1_000), game);
    assert.equal(moveCrossTraffic(game, 'up').status, 'running');
  });

  it('sends you back to your laptop when a bot catches you, and cuts you off after three', () => {
    const inFirstLane = moveCrossTraffic(createCrossTrafficGame(1, SEED), 'up');
    const caught = Array.from({ length: 400 }).reduce<CrossTrafficGame>((current) => (current.row === 0 && current.status === 'running' ? moveCrossTraffic(current, 'up') : advanceCrossTraffic(current, FRAME_MS)), inFirstLane);
    assert.equal(caught.status, 'lost');
    assert.equal(caught.hits, CROSS_TRAFFIC_MAX_HITS);
    assert.equal(caught.row, 0);
  });

  it('counts a crossing at the server and starts you over, and the laptop and server rows are safe', () => {
    const game = createCrossTrafficGame(2, SEED);
    const atServer = moveCrossTraffic({ ...game, status: 'running', row: serverRow(game) - 1, lanes: game.lanes.map((lane) => ({ ...lane, bots: [] })) }, 'up');
    assert.equal(atServer.crossings, 1);
    assert.equal(atServer.row, 0);
    assert.ok(!isCrossTrafficHit({ ...game, row: 0 }));
    assert.ok(!isCrossTrafficHit({ ...game, row: serverRow(game) }));
  });

  it('is won by a careful player at every difficulty, across seeds', () => {
    [1, 2, 3].forEach((difficulty) => {
      [SEED, 7, 1234].forEach((seed) => {
        let current = moveCrossTraffic(createCrossTrafficGame(difficulty, seed), 'left');
        for (let elapsed = 0; elapsed < 60_000 && current.status === 'running'; elapsed += HOP_EVERY_MS) current = hopCarefully(advanceTraffic(current, HOP_EVERY_MS));
        assert.equal(current.status, 'won', `difficulty ${difficulty}, seed ${seed}`);
      });
    });
  });

  it('gets harder: more lanes, faster bots, more crossings', () => {
    const easy = createCrossTrafficGame(1, SEED);
    const hard = createCrossTrafficGame(3, SEED);
    assert.ok(hard.lanes.length > easy.lanes.length);
    assert.ok(hard.required > easy.required);
  });
});
