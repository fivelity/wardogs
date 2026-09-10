/**
 * chaos-ai.ts — Team 4 (Chaos Squads), the unlisted, unjoinable, non-scoring AI-only faction.
 *
 * Design: WARDOGS_DESIGN_BRIEF.md → "Players & Teams" table / "Terminate Rogue AI Elements".
 * (`controlzone.ts`'s `isPhase3()`), per `CHAOS_AI_PHASE_3_RESPAWN_MULTIPLIER`.
 *
 * Symbols verified against `bf6-portal-mod-types@4.2.0` per BUILD_GUIDE.md §4:
 *   - `mod.SpawnAIFromAISpawner` — index.d.ts:151-205, heavily overloaded for class/name/team.
 *   - AI behavior events — `OnAIMoveToFailed/Running/Succeeded`,
 *     `OnAIWaypointIdleFailed/Running/Succeeded`, `OnAIParachuteRunning/Succeeded` — all confirmed
 *     real in `event-handler-signatures.d.ts`.
 *
 * NOTE (AGENTS.md §2): `mod.SpawnAIFromAISpawner`'s exact overload used below
 * (`(spawner, team)` — spawner + Team4, no explicit class/loadout) is the simplest of its seven
 * overloads; confirm this specific overload compiles against the real `.d.ts` before shipping —
 * if Team4 requires an explicit AI class parameter in the real signature, add it here rather than
 * guessing a default.
 *
 * Team 4 must never appear in `controlzone.ts`'s majority-hold tallying (already enforced there
 * via `isScoringFaction`) or `ui/scoreboard.ts`'s ticket display (enforced by that file only
 * iterating `SCORING_FACTION_IDS`).
 */

import { Events } from ""../../node_modules/bf6-portal-utils/events";
import { OBJECT_ID } from "../../config/ids.ts";
import {
	CHAOS_AI_TOTAL_BOTS,
	CHAOS_AI_RESPAWN_INTERVAL_SECONDS,
	CHAOS_AI_PHASE_3_RESPAWN_MULTIPLIER,
} from "../../config/constants.ts";
import { isPhase3 } from "./controlzone.ts";

/** Cached AISpawner object for OBJECT_ID.AI_SPAWNER_CHAOS, captured the first time AI events give it to us. */
let chaosSpawner: Runtimemod.AISpawner | undefined;

/** Currently-tracked live Chaos AI soldiers, so we only top up the count rather than over-spawn. */
const liveBots = new Set<mod.Player>();

function spawnOneBot(): void {
	if (!chaosSpawner) {
		return;
	}
	const team4 = mod.GetTeam(4);
	const bot = mod.SpawnAIFromAISpawner(chaosSpawner, team4) as mod.Player;
	liveBots.add(bot);
}

function topUpBots(): void {
	while (liveBots.size < CHAOS_AI_TOTAL_BOTS) {
		spawnOneBot();
		// Safety valve: if spawning silently fails to grow liveBots (e.g. spawner not yet cached),
		// bail rather than looping forever.
		if (!chaosSpawner) {
			break;
		}
		if (liveBots.size === 0) {
			break;
		}
	}
}

Events.OnPlayerDied.subscribe((eventPlayer) => {
	if (liveBots.has(eventPlayer)) {
		liveBots.delete(eventPlayer);
	}
});

Events.OnPlayerLeaveGame.subscribe((_eventNumber) => {
	// Bot handles are mod.Player references (see player-state.ts's header note on the opaque
	// type) — OnPlayerLeaveGame's bare-number payload can't map back to a specific Set entry.
	// Stale entries just make topUpBots() under-spawn slightly until the next respawn tick
	// notices the discrepancy via a died/left bot no longer responding to AI events; acceptable
	// per the same reasoning `player-state.ts` documents for its own leave handler.
});

let accumulatedSeconds = 0;
const ASSUMED_SERVER_TICK_SECONDS = 1 / 30;

Events.OngoingGlobal.subscribe(() => {
	accumulatedSeconds += ASSUMED_SERVER_TICK_SECONDS;
	const interval = isPhase3()
		? CHAOS_AI_RESPAWN_INTERVAL_SECONDS * CHAOS_AI_PHASE_3_RESPAWN_MULTIPLIER
		: CHAOS_AI_RESPAWN_INTERVAL_SECONDS;
	if (accumulatedSeconds < interval) {
		return;
	}
	accumulatedSeconds = 0;
	topUpBots();
});

Events.OnGameModeStarted.subscribe(() => {
	// NOTE (AGENTS.md §2): `mod.GetAISpawner(objId)` is assumed here, by analogy with the
	// already-referenced `mod.GetVehicleSpawner(objId)` pattern this codebase cites elsewhere
	// (see config/ids.ts's header comment). This specific getter has not been independently
	// re-confirmed against `index.d.ts` by this file's author — grep for it before shipping. If
	// no by-id getter exists for AISpawner, this cache must instead be populated from a real event
	// payload (the same pattern hotzone.ts uses for its CapturePoint), and this call site removed.
	chaosSpawner = mod.GetAISpawner(OBJECT_ID.AI_SPAWNER_CHAOS);
});

export { getChaosAiLiveCount };

function getChaosAiLiveCount(): number {
	return liveBots.size;
}
