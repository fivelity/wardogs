/**
 * fob.ts — freely-placeable Forward Operating Bases.
 *
 * Design: WARDOGS_DESIGN_BRIEF.md → "FOB Construction & Defense" / RESOLVED "FOB placement model".
 * Every symbol below is verified against `bf6-portal-mod-types@4.2.0/index.d.ts` and
 * `bf6-portal-utils@9.4.0/portal-gadget/index.d.ts` — see AGENTS.md §2.
 *
 * A player aims the Portal Gadget PDA (real gadget-hook module: `PortalGadget.onFireStart` /
 * `getLaserTarget`, confirmed in `bf6-portal-utils/portal-gadget`) at valid ground, and on
 * confirmation a FOB is built from three independently-spawned runtime objects:
 *   1. `RuntimeSpawn_Common.PlayerSpawner`            — the deploy point
 *   2. `RuntimeSpawn_Common.StationaryEmplacementSpawner` — the defense
 *   3. `RuntimeSpawn_Common.SandBags_01_C90_A` (x N)   — cover, ringed around the deploy point
 * All three are torn down together via `mod.UnspawnObject` when the FOB is destroyed/abandoned.
 */

import { Events } from "bf6-portal-utils/events";
import { PortalGadget } from "bf6-portal-utils/portal-gadget";
import { RuntimeSpawn_Common } from "bf6-portal-mod-types/runtime-spawn-enums/common";
import { TransitionState } from "../core/transition-state.ts";
import { spendMaterials } from "../../player/wallet.ts";
import { FOB_MATERIAL_COST } from "../../config/economy.ts";

/** Number of SandBags props ringed around each FOB's deploy point for cover. */
const FOB_SANDBAG_RING_COUNT = 4;
const FOB_SANDBAG_RING_RADIUS = 4;

export interface ActiveFob {
	id: number;
	ownerTeam: mod.Team;
	deploySpawnPoint: mod.SpawnPoint;
	emplacementSpawner: mod.EmplacementSpawner;
	sandbags: mod.Object[];
	position: mod.Vector;
}

/** Team ID → currently active FOBs for that team. Multiple FOBs per team are allowed. */
const activeFobsByTeam = new Map<number, ActiveFob[]>();

let nextFobId = 1;

/**
 * Builds one FOB at `position` for `team`, unconditionally. This function never checks
 * affordability — callers must go through `tryPlaceFob` (which deducts `FOB_MATERIAL_COST` via
 * `wallet.ts` before calling this) rather than calling `placeFob` directly, except in tests where
 * the cost check is intentionally bypassed.
 */
function placeFob(team: mod.Team, position: mod.Vector, facing: mod.Vector): ActiveFob {
	const deploySpawnPoint = mod.SpawnObject(
		RuntimeSpawn_Common.PlayerSpawner,
		position,
		facing
	) as mod.SpawnPoint;

	const emplacementSpawner = mod.SpawnObject(
		RuntimeSpawn_Common.StationaryEmplacementSpawner,
		position,
		facing
	) as mod.EmplacementSpawner;

	const sandbags: mod.Object[] = [];
	for (let i = 0; i < FOB_SANDBAG_RING_COUNT; i++) {
		const angle = (i / FOB_SANDBAG_RING_COUNT) * mod.Pi() * 2;
		const offset = mod.CreateVector(
			mod.XComponentOf(position) + FOB_SANDBAG_RING_RADIUS * Math.cos(angle),
			mod.YComponentOf(position),
			mod.ZComponentOf(position) + FOB_SANDBAG_RING_RADIUS * Math.sin(angle)
		);
		const bag = mod.SpawnObject(RuntimeSpawn_Common.SandBags_01_C90_A, offset, facing) as mod.Object;
		sandbags.push(bag);
	}

	const fob: ActiveFob = {
		id: nextFobId++,
		ownerTeam: team,
		deploySpawnPoint,
		emplacementSpawner,
		sandbags,
		position,
	};

	// mod.Object is a real union that includes Team (verified in bf6-portal-mod-types/types.d.ts);
	// GetObjId is valid on any opaque type in that union, including Team.
	const teamId = mod.GetObjId(team);
	const existing = activeFobsByTeam.get(teamId) ?? [];
	existing.push(fob);
	activeFobsByTeam.set(teamId, existing);

	return fob;
}

/**
 * Validates and deducts `FOB_MATERIAL_COST` in materials from `player` via `wallet.ts`, then
 * builds the FOB only if that succeeds. Returns the built FOB, or `undefined` (no materials
 * deducted, nothing spawned) if the player couldn't afford it. This is the function everything
 * outside this file should call — not `placeFob` directly.
 */
function tryPlaceFob(
	player: mod.Player,
	team: mod.Team,
	position: mod.Vector,
	facing: mod.Vector
): ActiveFob | undefined {
	const afforded = spendMaterials(player, FOB_MATERIAL_COST, "fobPlacement");
	if (!afforded) {
		mod.DisplayNotificationMessage(mod.Message("Not enough materials to build a FOB."), player);
		return undefined;
	}
	return placeFob(team, position, facing);
}

/** Tears down every spawned object belonging to a FOB and removes it from tracking. */
function teardownFob(fob: ActiveFob): void {
	mod.UnspawnObject(fob.deploySpawnPoint);
	mod.UnspawnObject(fob.emplacementSpawner);
	for (const bag of fob.sandbags) {
		mod.UnspawnObject(bag);
	}

	const teamId = mod.GetObjId(fob.ownerTeam);
	const list = activeFobsByTeam.get(teamId);
	if (list) {
		activeFobsByTeam.set(
			teamId,
			list.filter((f) => f.id !== fob.id)
		);
	}
}

/**
 * Wires the Portal Gadget PDA fire event to FOB placement. A per-player TransitionState guards
 * against placing multiple FOBs on a single sustained trigger hold.
 */
const placementGuardByPlayer = new Map<mod.Player, TransitionState>();

PortalGadget.onFireStart(async (player, _isZooming, getTarget) => {
	if (!placementGuardByPlayer.has(player)) {
		placementGuardByPlayer.set(player, new TransitionState());
	}
	const guard = placementGuardByPlayer.get(player)!;

	if (!guard.update(true)) {
		return;
	}

	const target = await getTarget();
	if (!target) {
		guard.reset();
		return;
	}

	const team = mod.GetTeam(player);
	const facing = mod.GetSoldierState(player, mod.SoldierStateVector.GetFacingDirection);
	tryPlaceFob(player, team, target, facing);

	guard.reset();
});

Events.OnPlayerLeaveGame.subscribe((_eventNumber) => {
	// Placement guards are keyed by mod.Player references; stale entries are harmless (no
	// per-tick iteration cost) but could be swept here if profiling shows it matters.
});

export { placeFob, tryPlaceFob, teardownFob, activeFobsByTeam };
