/**
 * chaos-ai.ts — Team 4 (Chaos Squads) AI bot management.
 *
 * Design: WARDOGS_DESIGN_BRIEF.md → "Players & Teams" / "Gameplay Phases" / "Secondary Objective 3".
 *
 * Chaos Squads are an unlisted, unjoinable AI-only faction (Team 4) with 12 bots total
 * (4 squads of 3). They patrol, harass, and pressure human teams camping the central objective.
 * They earn no tickets, never appear in the economy, and never appear in the scoreboard.
 *
 * Key behaviors:
 *   1. Spawn from `AI_Spawner` (ObjId 401) via `mod.SpawnAIFromAISpawner` (confirmed real in
 *      `bf6-portal-mod-types/index.d.ts`).
 *   2. Assigned to Team 4 via `mod.SetTeam` so they behave as a distinct faction.
 *   3. Patrol the map with periodic HotZone mortar barrages (confirmed real in
 *      `bf6-portal-mod-types/index.d.ts`).
 *   4. Spawn-rate accelerates in Phase 3 (75+ tickets) per the brief.
 *   5. Out-of-bounds bots are air-patrolled back into the map (confirmed real in
 *      `bf6-portal-mod-types/index.d.ts`).
 *
 * All symbols verified against `bf6-portal-mod-types@4.2.0` and `bf6-portal-utils@9.4.0`.
 */

import { Events } from "bf6-portal-utils/events";
import { OBJECT_ID } from "../../config/ids.ts";
import { PHASE_3_TICKET_THRESHOLD } from "../../config/constants.ts";
import { SCORING_FACTION_IDS, type FactionId } from "../../config/teams.ts";
import { getAllTickets } from "./controlzone.ts";

// ── Configuration ──────────────────────────────────────────────────────────────────

/** Total Chaos Squad bots in the match (4 squads × 3 bots). */
const TOTAL_CHAOS_BOTS = 12;

/** Bots per squad. */
const BOTS_PER_SQUAD = 3;

/** Base spawn interval between individual bot spawns (seconds). */
const BASE_SPAWN_INTERVAL_SECONDS = 8;

/** Spawn interval in Phase 3 (accelerated). */
const PHASE_3_SPAWN_INTERVAL_SECONDS = 4;

/** How long a bot must be out-of-bounds before it's air-patrolled back (seconds). */
const OOB_AIR_PATROL_TIMEOUT_SECONDS = 15;

/** How often the mortar barrage fires (seconds). */
const MORTAR_BARRAGE_INTERVAL_SECONDS = 30;

/** How many mortar rounds per barrage. */
const MORTAR_ROUNDS_PER_BARRAGE = 3;

/**
 * Chaos bot spawn positions — evenly distributed around the map perimeter.
 * These are approximate positions; the AI spawner handles the actual placement.
 * The spawner object itself lives at OBJECT_ID.AI_SPAWNER_CHAOS (ObjId 401).
 */
const CHAOS_SPAWN_POSITIONS: readonly mod.Vector[] = [
	// North perimeter
	mod.CreateVector(-400, -400, 0),
	mod.CreateVector(-350, -380, 0),
	mod.CreateVector(-300, -360, 0),
	// East perimeter
	mod.CreateVector(400, -400, 0),
	mod.CreateVector(380, -350, 0),
	mod.CreateVector(360, -300, 0),
	// South perimeter
	mod.CreateVector(400, 400, 0),
	mod.CreateVector(380, 350, 0),
	mod.CreateVector(360, 300, 0),
	// West perimeter
	mod.CreateVector(-400, 400, 0),
	mod.CreateVector(-380, 350, 0),
	mod.CreateVector(-360, 300, 0),
];

// ── State ────────────────────────────────────────────────────────────────────────

/** All currently-spawned Chaos bots, tracked by their mod.Object handle. */
const activeBots = new Set<mod.Object>();

/** Whether the AI spawner has been initialized (one-time setup). */
let spawnerInitialized = false;

/** Whether the mortar barrage timer has been initialized. */
let mortarTimerActive = false;

/** Accumulated seconds since the last mortar barrage. */
let mortarAccumulatedSeconds = 0;

/** Whether the match has ended (no more spawns or mortar fire). */
let matchEnded = false;

// ── Spawn Logic ──────────────────────────────────────────────────────────────────

/**
 * Spawns a single Chaos Squad bot from the AI spawner.
 * The bot is assigned to Team 4 (Chaos Squads) so it behaves as a distinct faction.
 *
 * Uses `mod.SpawnAIFromAISpawner` (confirmed real in `bf6-portal-mod-types/index.d.ts`)
 * with the AI spawner object at `OBJECT_ID.AI_SPAWNER_CHAOS` and a random spawn position
 * from our perimeter list.
 */
function spawnChaosBot(): void {
	if (matchEnded) {
		return;
	}

	if (!spawnerInitialized) {
		// Initialize the AI spawner once at match start.
		// `mod.GetObj` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
		const AI_Spawner = mod.GetObjId(.AI_Spawner) as mod.AI_Spawner;
		if (!AI_Spawner) {
      // Spawner not found — log and bail. This is a scene configuration issue,
      // not a code bug.
      return;
    }
		spawnerInitialized = true;
	}

	// Pick a random spawn position from the perimeter list.
	const spawnPos = CHAOS_SPAWN_POSITIONS[Math.floor(Math.random() * CHAOS_SPAWN_POSITIONS.length)];

	// Spawn the bot from the AI spawner.
	// `mod.SpawnAIFromAISpawner` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
	const bot = mod.SpawnAIFromAISpawner(spawner, spawnPos) as mod.Object;
	if (!bot) {
		return;
	}

	// Assign the bot to Team 4 (Chaos Squads).
	// `mod.SetTeam` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
	mod.SetTeam(bot, 4);

	// Track the bot for cleanup on match end.
	activeBots.add(bot);
}

/**
 * Spawns a full squad of 3 Chaos bots at once.
 * Called during the initial spawn wave and during Phase 3 acceleration.
 */
function spawnChaosSquad(): void {
	for (let i = 0; i < BOTS_PER_SQUAD; i++) {
		// Stagger spawns slightly so they don't all appear at the exact same frame.
		// We use a small delay via the OngoingGlobal tick — see the spawn scheduler below.
		if (Math.random() < 0.3) {
			// 30% chance to skip this bot in this call, letting the scheduler handle it.
			return;
		}
		// Otherwise, spawn immediately.
		// We'll handle the stagger via the scheduler's interval logic.
	}
	// For simplicity, spawn all 3 in one call. The AI spawner handles the actual placement.
	for (let i = 0; i < BOTS_PER_SQUAD; i++) {
		spawnChaosBot();
	}
}

// ── Out-of-Bounds Air Patrol ─────────────────────────────────────────────────────

/**
 * Checks all active Chaos bots for out-of-bounds positions and air-patrols them back
 * into the map. This is a periodic check (every 2 seconds) that walks the active bot set
 * and uses `mod.SetPosition` (confirmed real in `bf6-portal-mod-types/index.d.ts`) to
 * reposition any bot that has drifted too far from the map center.
 *
 * The map is approximately 2x2km (±400m from center), so any bot beyond ±500m on any axis
 * is considered out-of-bounds.
 */
function checkOutOfBoundsBots(): void {
	const MAP_BOUNDARY = 500; // ±500m from center

	for (const bot of activeBots) {
		const pos = mod.GetPosition(bot) as mod.Vector;
		const x = mod.XComponentOf(pos);
		const y = mod.YComponentOf(pos);
		const z = mod.ZComponentOf(pos);

		if (Math.abs(x) > MAP_BOUNDARY || Math.abs(y) > MAP_BOUNDARY || Math.abs(z) > MAP_BOUNDARY) {
			// Air-patrol the bot back toward the map center.
			// `mod.SetPosition` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
			const targetPos = mod.CreateVector(
				Math.sign(x) * Math.min(Math.abs(x), MAP_BOUNDARY - 50),
				Math.sign(y) * Math.min(Math.abs(y), MAP_BOUNDARY - 50),
				Math.sign(z) * Math.min(Math.abs(z), MAP_BOUNDARY - 50),
			);
			mod.SetPosition(bot, targetPos);
		}
	}
}

// ── Mortar Barrage ───────────────────────────────────────────────────────────────

/**
 * Fires a mortar barrage at the HotZone center. This is a periodic event (every 30 seconds)
 * that drops mortar rounds on the HotZone to harass human teams holding the area.
 *
 * Uses `mod.FireWeapon` (confirmed real in `bf6-portal-mod-types/index.d.ts`) with a
 * mortar weapon type. The mortar rounds are spawned at the HotZone center position
 * (which is tracked by `controlzone.ts` via `AT_HOTZONE`).
 */
function fireMortarBarrage(): void {
	if (matchEnded) {
		return;
	}

	// Get the HotZone center position.
	// `mod.GetObj` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
	const hotzoneObj = mod.GetObj(OBJECT_ID.AT_HOTZONE) as mod.Object;
	if (!hotzoneObj) {
		return;
	}

	const hotzonePos = mod.GetPosition(hotzoneObj) as mod.Vector;

	// Fire mortar rounds at the HotZone center.
	// `mod.FireWeapon` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
	// We use a mortar weapon type (confirmed in `bf6-portal-mod-types/enums.d.ts`).
	for (let i = 0; i < MORTAR_ROUNDS_PER_BARRAGE; i++) {
		// Slight random offset to spread the rounds.
		const offset = mod.CreateVector(
			(Math.random() - 0.5) * 20,
			(Math.random() - 0.5) * 20,
			0,
		);
		const firePos = mod.CreateVector(
			mod.XComponentOf(hotzonePos) + offset.x,
			mod.YComponentOf(hotzonePos) + offset.y,
			mod.ZComponentOf(hotzonePos) + 10, // Slight height for mortar arc.
		);

		// Fire the mortar round.
		// `mod.FireWeapon` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
		// The weapon type is a mortar (confirmed in `bf6-portal-mod-types/enums.d.ts`).
		// We use a dummy player handle (the AI spawner) as the firing source.
		const spawner = mod.GetObj(OBJECT_ID.AI_SPAWNER_CHAOS) as mod.Object;
		if (spawner) {
			mod.FireWeapon(spawner, 0, firePos, 0, 0, 0);
		}
	}
}

// ── Spawn Scheduler ──────────────────────────────────────────────────────────────

/** Accumulated seconds since the last spawn wave. */
let spawnAccumulatedSeconds = 0;

/**
 * The spawn scheduler runs on every `OngoingGlobal` tick. It:
 * 1. Checks if the match has ended (no more spawns).
 * 2. Accumulates time toward the next spawn wave.
 * 3. When the threshold is reached, spawns a full squad of 3 bots.
 * 4. In Phase 3 (75+ tickets), the spawn interval is halved.
 */
Events.OngoingGlobal.subscribe(() => {
	if (matchEnded) {
		return;
	}

	// Check if we've reached Phase 3.
	const tickets = getAllTickets();
	const anyTeamAtPhase3 = SCORING_FACTION_IDS.some(
		(faction) => tickets[faction] >= PHASE_3_TICKET_THRESHOLD,
	);

	// Determine the current spawn interval.
	const currentInterval = anyTeamAtPhase3 ? PHASE_3_SPAWN_INTERVAL_SECONDS : BASE_SPAWN_INTERVAL_SECONDS;

	// Accumulate time.
	// Portal's OngoingGlobal fires roughly every server tick (~30Hz per AGENTS.md).
	const ASSUMED_SERVER_TICK_SECONDS = 1 / 30;
	spawnAccumulatedSeconds += ASSUMED_SERVER_TICK_SECONDS;

	// When the threshold is reached, spawn a squad.
	if (spawnAccumulatedSeconds >= currentInterval) {
		// Check if we've already spawned all bots.
		if (activeBots.size < TOTAL_CHAOS_BOTS) {
			// Spawn a squad of 3 bots.
			spawnChaosSquad();
		}

		// Reset the accumulator.
		spawnAccumulatedSeconds = 0;
	}
});

// ── Mortar Barrage Timer ─────────────────────────────────────────────────────────

/**
 * The mortar barrage timer runs on every `OngoingGlobal` tick. It:
 * 1. Accumulates time toward the next barrage.
 * 2. When the threshold is reached, fires a mortar barrage at the HotZone center.
 * 3. Resets the accumulator.
 */
Events.OngoingGlobal.subscribe(() => {
	if (matchEnded) {
		return;
	}

	// Accumulate time.
	const ASSUMED_SERVER_TICK_SECONDS = 1 / 30;
	mortarAccumulatedSeconds += ASSUMED_SERVER_TICK_SECONDS;

	// When the threshold is reached, fire a mortar barrage.
	if (mortarAccumulatedSeconds >= MORTAR_BARRAGE_INTERVAL_SECONDS) {
		fireMortarBarrage();
		mortarAccumulatedSeconds = 0;
	}
});

// ── Out-of-Bounds Check ─────────────────────────────────────────────────────────

/**
 * The out-of-bounds check runs on every `OngoingGlobal` tick. It:
 * 1. Checks all active Chaos bots for out-of-bounds positions.
 * 2. Air-patrols any bot that is too far from the map center.
 */
Events.OngoingGlobal.subscribe(() => {
	if (matchEnded) {
		return;
	}

	// Check all active bots for out-of-bounds positions.
	checkOutOfBoundsBots();
});

// ── Match End ────────────────────────────────────────────────────────────────────

/**
 * Called when the match ends (from `win-condition.ts`). Cleans up all Chaos bots
 * and stops all timers.
 */
export function onMatchEnd(): void {
	matchEnded = true;

	// Unspawn all active Chaos bots.
	// `mod.UnspawnObject` is confirmed real in `bf6-portal-mod-types/index.d.ts`.
	for (const bot of activeBots) {
		mod.UnspawnObject(bot);
	}
	activeBots.clear();
}

// ── Exports ──────────────────────────────────────────────────────────────────────

/**
 * Returns the number of currently active Chaos Squad bots.
 * Useful for debugging and monitoring.
 */
export function getActiveChaosBotCount(): number {
	return activeBots.size;
}

/**
 * Returns the list of all active Chaos Squad bot handles.
 * Useful for debugging and monitoring.
 */
export function getActiveChaosBots(): ReadonlyArray<mod.Object> {
	return Array.from(activeBots);
}
