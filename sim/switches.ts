import { isSpecializedEra, SPECIALIZATION_IDS, UPGRADES_BY_ID } from '../src/engine';
import type { BuffId, GameState, SpecializationId, UpgradeId } from '../src/engine';

/**
 * Switches for measuring what a system is worth: SIM_WITHOUT=fire,offers,hires plays the same game without them, so
 * the difference in era times is what they buy. Read from the environment, so worker threads see the same switches.
 */
export type SimSystem = 'fire' | 'offers' | 'hires';

const SYSTEMS: readonly SimSystem[] = ['fire', 'offers', 'hires'];
/** Far beyond any game: an offer that never comes. */
const NEVER_MS = Number.MAX_SAFE_INTEGER;

function isSimSystem(value: string): value is SimSystem {
  return (SYSTEMS as readonly string[]).includes(value);
}

export function readSwitchedOff(value: string | undefined): ReadonlySet<SimSystem> {
  return new Set((value ?? '').split(',').map((part) => part.trim()).filter(isSimSystem));
}

export const SWITCHED_OFF: ReadonlySet<SimSystem> = readSwitchedOff(process.env['SIM_WITHOUT']);

const OFFER_BUFFS: readonly BuffId[] = ['sponsor-slot', 'launch-day'];

function withoutBuffs(state: GameState, buffIds: readonly BuffId[]): GameState {
  return { ...state, buffs: state.buffs.filter((buff) => !buffIds.includes(buff.id)) };
}

const REMOVERS: Readonly<Record<SimSystem, (state: GameState) => GameState>> = {
  fire: (state) => ({ ...withoutBuffs(state, ['on-fire']), typingHeat: 0 }),
  offers: (state) => ({ ...withoutBuffs(state, OFFER_BUFFS), opportunity: null, opportunityCountdownMs: NEVER_MS }),
  // Hires are kept off the shopping list instead: see isSwitchedOffPurchase.
  hires: (state) => state,
};

/** Each tick: whatever is switched off never happens. */
export function applySwitches(state: GameState, switchedOff: ReadonlySet<SimSystem>): GameState {
  return [...switchedOff].reduce((current, system) => REMOVERS[system](current), state);
}

/** With hires switched off, the bot never sees them in the shop. */
export function isSwitchedOffPurchase(upgradeId: UpgradeId, switchedOff: ReadonlySet<SimSystem>): boolean {
  return switchedOff.has('hires') && UPGRADES_BY_ID[upgradeId].effects.some((effect) => effect.kind === 'auto-keystrokes');
}

/**
 * SIM_SPECIALIZATION=video plays the game as a video site from 2011 on, unlocked or not: what each specialization's
 * money model does to an era's length. Unset, or unknown, the game stays a Homepage.
 */
export function readSimSpecialization(value: string | undefined): SpecializationId {
  return SPECIALIZATION_IDS.find((id) => id === value) ?? 'homepage';
}

export const SIM_SPECIALIZATION: SpecializationId = readSimSpecialization(process.env['SIM_SPECIALIZATION']);

/** Specializations exist only in the test build: a forced one plays it. */
export function applySimSpecialization(state: GameState, specializationId: SpecializationId): GameState {
  const isDue = isSpecializedEra(state.eraId) && state.specializationId !== specializationId;
  return isDue ? { ...state, edition: 'webspecialization', specializationId } : state;
}
