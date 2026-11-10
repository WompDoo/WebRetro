import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advanceFirewall,
  advanceVirusScan,
  BACKUP_RESTORE_MAX_MISTAKES,
  chooseBackup,
  clickVirusScanCell,
  createBackupRestoreGame,
  createFirewallGame,
  createSpamSortGame,
  createVirusScanGame,
  FIREWALL_HEIGHT,
  FIREWALL_TURRET_WIDTH,
  FIREWALL_VIRUS_WIDTH,
  fireFirewall,
  moveFirewallTurret,
  placeFirewallVirus,
  sortSpamCard,
  SPAM_SORT_MAX_MISTAKES,
  VIRUS_SCAN_MAX_WRONG_CLICKS,
} from '../src/engine';
import type { FirewallGame, SpamSortGame, VirusScanGame } from '../src/engine';

const SEED = 42;
const LONG_WAIT_MS = 5_000;

describe('virus scan', () => {
  const visible = (game: VirusScanGame): VirusScanGame => (game.virusCell === null ? visible(advanceVirusScan(game, 50)) : game);

  it('needs more hits and gives less time as the virus ages', () => {
    const easy = createVirusScanGame(1, SEED);
    const hard = createVirusScanGame(3, SEED);
    assert.ok(hard.required > easy.required);
    assert.ok(hard.visibleMs < easy.visibleMs);
  });

  it('shows the virus in a file after a moment, then hides it again', () => {
    const shown = visible(createVirusScanGame(1, SEED));
    assert.notEqual(shown.virusCell, null);
    assert.equal(advanceVirusScan(shown, shown.visibleMs).virusCell, null);
  });

  it('never shows the virus in the same file twice in a row', () => {
    let game = visible(createVirusScanGame(1, SEED));
    for (let appearance = 0; appearance < 30; appearance += 1) {
      const cell = game.virusCell;
      game = visible(advanceVirusScan(game, game.visibleMs));
      assert.notEqual(game.virusCell, cell);
    }
  });

  it('is won by hitting the virus enough times', () => {
    let game = createVirusScanGame(1, SEED);
    for (let hit = 0; hit < game.required; hit += 1) {
      game = visible(game);
      game = clickVirusScanCell(game, game.virusCell ?? -1);
    }
    assert.equal(game.status, 'won');
  });

  it('is lost after too many clicks on clean files', () => {
    const shown = visible(createVirusScanGame(1, SEED));
    const cleanCell = ((shown.virusCell ?? 0) + 1) % shown.cellCount;
    const lost = Array.from({ length: VIRUS_SCAN_MAX_WRONG_CLICKS }).reduce<VirusScanGame>((game) => clickVirusScanCell(game, cleanCell), shown);
    assert.equal(lost.status, 'lost');
  });

  it('catches up on a long frame without getting stuck', () => {
    assert.equal(advanceVirusScan(createVirusScanGame(2, SEED), LONG_WAIT_MS).status, 'running');
  });
});

describe('firewall', () => {
  /** Slides under the lowest virus it can reach and fires whenever it can. */
  const playPerfectly = (start: FirewallGame, maxMs: number): FirewallGame => {
    let game = fireFirewall(start);
    for (let elapsed = 0; elapsed < maxMs && game.status === 'running'; elapsed += 16) {
      const target = [...game.viruses].map((virus) => placeFirewallVirus(game, virus)).sort((first, second) => second.y - first.y)[0];
      game = fireFirewall(advanceFirewall(moveFirewallTurret(game, (target?.x ?? 0) + FIREWALL_VIRUS_WIDTH / 2), 16));
    }
    return game;
  };

  it('has one row of viruses per difficulty level', () => {
    assert.equal(createFirewallGame(3).virusesTotal, createFirewallGame(1).virusesTotal * 3);
  });

  it('keeps the firewall inside the field, and waits for the first shot', () => {
    const moved = moveFirewallTurret(createFirewallGame(1), -500);
    assert.equal(moved.turretX, FIREWALL_TURRET_WIDTH / 2);
    assert.deepEqual(advanceFirewall(moved, 500).formation, moved.formation);
  });

  it('is won quickly by a player who aims, at every difficulty', () => {
    [1, 2, 3].forEach((difficulty) => assert.equal(playPerfectly(createFirewallGame(difficulty), 30_000).status, 'won', `difficulty ${difficulty}`));
  });

  it('allows one shot in the air at a time', () => {
    const fired = fireFirewall(createFirewallGame(1));
    assert.equal(fireFirewall(fired).shot, fired.shot);
  });

  it('is lost when the viruses reach your files', () => {
    const ignored = advanceFirewall(advanceFirewall(fireFirewall(createFirewallGame(1)), 100), 120_000);
    assert.equal(ignored.status, 'lost');
    assert.ok(ignored.formation.y < FIREWALL_HEIGHT);
  });
});

describe('spam sort', () => {
  const sortAllCorrectly = (game: SpamSortGame): SpamSortGame =>
    game.cards.reduce<SpamSortGame>((current, card) => sortSpamCard(current, card.isSpam ? 'trash' : 'keep'), game);

  it('has more comments to sort as the flood ages', () => {
    assert.ok(createSpamSortGame(3, SEED).total > createSpamSortGame(1, SEED).total);
  });

  it('is won by sorting every comment right', () => {
    assert.equal(sortAllCorrectly(createSpamSortGame(2, SEED)).status, 'won');
  });

  it('says what went wrong, and is lost after too many wrong calls', () => {
    const game = createSpamSortGame(3, SEED);
    const wrong = game.cards.slice(0, SPAM_SORT_MAX_MISTAKES).reduce<SpamSortGame>((current, card) => sortSpamCard(current, card.isSpam ? 'keep' : 'trash'), game);
    assert.equal(wrong.status, 'lost');
    assert.notEqual(wrong.lastMistake, null);
  });

  it('is the same flood for the same seed', () => {
    assert.deepEqual(createSpamSortGame(2, SEED), createSpamSortGame(2, SEED));
  });
});

describe('backup restore', () => {
  it('always has exactly one backup from after the attack and the right one just before it', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const game = createBackupRestoreGame(3, seed);
      const before = game.backups.filter((backup) => backup.minutesFromAttack < 0);
      const newestBefore = Math.max(...before.map((backup) => backup.minutesFromAttack));
      assert.equal(game.backups.filter((backup) => backup.minutesFromAttack > 0).length, 1);
      assert.equal(game.backups.find((backup) => backup.id === game.correctBackupId)?.minutesFromAttack, newestBefore);
    }
  });

  it('lists more backups, closer together, as the damage ages', () => {
    assert.ok(createBackupRestoreGame(3, SEED).backups.length > createBackupRestoreGame(1, SEED).backups.length);
  });

  it('is won by picking the newest backup from before the attack', () => {
    const game = createBackupRestoreGame(2, SEED);
    assert.equal(chooseBackup(game, game.correctBackupId).status, 'won');
  });

  it('explains a wrong pick, and is lost after too many', () => {
    const game = createBackupRestoreGame(2, SEED);
    const tooLate = game.backups.find((backup) => backup.minutesFromAttack > 0);
    const once = chooseBackup(game, tooLate?.id ?? -1);
    assert.equal(once.lastMistake, 'after-attack');
    const lost = Array.from({ length: BACKUP_RESTORE_MAX_MISTAKES - 1 }).reduce<typeof once>((current) => chooseBackup(current, tooLate?.id ?? -1), once);
    assert.equal(lost.status, 'lost');
  });
});
