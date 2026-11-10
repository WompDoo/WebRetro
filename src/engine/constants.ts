/** Bump to discard old saves when the game state changes shape. */
export const SAVE_VERSION = 3;
export const MS_PER_SECOND = 1000;

export const BASE_KEYSTROKE_VALUE = 1;
export const BASE_BUG_CHANCE = 0.25;
export const MIN_BUG_CHANCE = 0.03;

export const FEATURE_COST_GROWTH = 1.15;
export const AD_BASE_COST = 40;
export const AD_COST_GROWTH = 2.4;

export const POPUP_TRAFFIC_PENALTY = 0.1;
export const MAX_OPEN_POPUPS = 5;
export const POPUP_FREQUENCY_PER_EXTRA_AD = 0.3;
/** Clicking the shiny button on a pop-up costs this share of your money. */
export const POPUP_SCAM_MONEY_SHARE = 0.1;

export const SPAM_CLEAN_CLICKS = 4;
export const SQL_INJECTION_RESTORE_CLICKS = 3;
export const MAX_VIRUS_INFECTIONS = 2;

/** A virus starts at 1 food, needs 2 after 2:30 and 3 after 5:00. */
export const MIN_VIRUS_FOOD = 1;
export const MAX_VIRUS_FOOD = 3;
export const VIRUS_FOOD_STEP_MS = 150_000;

/** At twice your hosting capacity the server gives up: the whole site is a 503 page. */
export const SITE_DOWN_SERVER_LOAD = 2;
/** A front page mention multiplies the visitors trying to reach you. */
export const TRAFFIC_SPIKE_DEMAND_FACTOR = 5;
export const TRAFFIC_SPIKE_DURATION_MS = 45_000;

/** An upgrade shows up in the shop once lifetime earnings reach this share of its price. */
export const UPGRADE_REVEAL_EARNINGS_SHARE = 0.35;

/** A steady freelancer's typing speed. Used for the "quit your day job" milestone. */
export const FREELANCE_REFERENCE_KEYSTROKES_PER_SECOND = 5;
