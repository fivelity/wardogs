/**
 * constants.ts — pure tuning data. No `mod.*` calls, no logic, no side effects.
 * Every value below traces to a specific section of WARDOGS_DESIGN_BRIEF.md (noted inline).
 */

/** WARDOGS_DESIGN_BRIEF.md → "Core Rules" #1: every player is issued exactly this once. */
export const STARTING_CASH = 10_000;

/** WARDOGS_DESIGN_BRIEF.md → "Point System": Control Zone majority-hold tick cadence. */
export const CONTROL_ZONE_TICK_SECONDS = 4.0;

/** WARDOGS_DESIGN_BRIEF.md → "Point System": +1 ticket per faction per tick while holding majority. */
export const CONTROL_ZONE_TICKET_REWARD = 1;

/**
 * WARDOGS_DESIGN_BRIEF.md → "HotZone Contestation": presence inside the HotZone counts as this
 * multiplier toward a faction's majority-hold occupant count (2x, i.e. one HotZone occupant
 * counts the same as two ControlZone-only occupants).
 */
export const HOTZONE_PRESENCE_WEIGHT = 2;

/** WARDOGS_DESIGN_BRIEF.md → "Gameplay Phases", Phase 3 trigger threshold. */
export const PHASE_3_TICKET_THRESHOLD = 75;

/** WARDOGS_DESIGN_BRIEF.md → "Gameplay Phases", Phase 3: HotZone drift speed multiplier. */
export const PHASE_3_HOTZONE_DRIFT_SPEED_MULTIPLIER = 1.5;

/** WARDOGS_DESIGN_BRIEF.md → "Gameplay Phases", Phase 1 duration. */
export const STAGING_DURATION_SECONDS = 60;

/** WARDOGS_DESIGN_BRIEF.md → "Death & Respawning": respawn delay before deploy becomes available. */
export const RESPAWN_DELAY_SECONDS = 10;

/** WARDOGS_DESIGN_BRIEF.md → "Win Conditions": first faction to this many tickets wins. */
export const VICTORY_TICKET_TARGET = 100;

/** WARDOGS_DESIGN_BRIEF.md → "Death & Respawning": ticket penalty on absolute undeploy. */
export const UNDEPLOY_TICKET_PENALTY = 1;

/**
 * WARDOGS_DESIGN_BRIEF.md → "Match Duration". Not currently enforced in code (no timer-expiry
 * handler wired yet) — kept here so the value exists in one place once that handler is built.
 */
export const MATCH_DURATION_SECONDS = 30 * 60;
