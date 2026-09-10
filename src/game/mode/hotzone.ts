/**
 * hotzone.ts — the drifting 60m HotZone (`AT_HOTZONE` / `CP_HOTZONE`).
 *
 * Design: WARDOGS_DESIGN_BRIEF.md → "HotZone Contestation" / Secondary Objective 1.
 * The 2x presence-weight scoring rule itself is implemented in `controlzone.ts` (per that file's
 * header comment — HotZone presence is a multiplier on the SAME majority tally, not a second
 * ticket track). This file owns only the flag's physical drift: picking a new random target
 * inside a bounded radius, gliding the `CapturePoint` object there with `mod.MoveObjectOverTime`,
 * accelerating that cadence once Phase 3 triggers (`controlzone.ts`'s `isPhase3()`), and exposing
 * `lockDriftTarget()` so `towers.ts` can freeze the flag once a team fully decrypts a tower.
 *
 * Symbol verification note: `mod.MoveObjectOverTime` is confirmed real (BUILD_GUIDE.md §4,
 * `index.d.ts:1204`), but this codebase has not independently re-confirmed its exact parameter
 * order for this file — per AGENTS.md §2, re-check the signature in
 * `node_modules/bf6-portal-mod-types/index.d.ts` before this file ships, and adjust the single
 * call site in `driftStep()` below if the real signature differs from the
 * `(object, targetPosition, durationSeconds)` shape assumed here.
 *
 * The live `CapturePoint` object reference for `CP_HOTZONE` is not obtained from any invented
 * "get object by id" global (no such getter exists in the confirmed API surface) — it is captured
 * the first time a real Portal event hands it to us as a payload (`OnCapturePointCapturing` /
 * `OnCapturePointCaptured` / `OnCapturePointLost`, all confirmed real in
 * `event-handler-signatures.d.ts`), then cached for every subsequent drift step.
 */

import { Events } from "bf6-portal-utils/events";
import { OBJECT_ID } from "../../config/ids.ts";
import {
	HOTZONE_DRIFT_STEP_RADIUS,
	HOTZONE_DRIFT_DURATION_SECONDS,
	HOTZONE_DRIFT_INTERVAL_SECONDS,
	PHASE_3_HOTZONE_DRIFT_SPEED_MULTIPLIER,
} from "../../config/constants.ts";
import { isPhase3 } from "./controlzone.ts";

/** Cached once a Portal event hands us the real CapturePoint object for CP_HOTZONE. */
let hotZoneCapturePoint: mod.CapturePoint | undefined;

/** Last drift target, used as the origin for the next random step. */
let lastDriftTarget: mod.Vector | undefined;

/** Set by `towers.ts` once a team has fully decrypted both Control Towers; freezes drift. */
let lockedTarget: mod.Vector | undefined;

function cacheHotZoneCapturePoint(eventCapturePoint: mod.CapturePoint): void {
	if (hotZoneCapturePoint) {
		return;
	}
	if (mod.GetObjId(eventCapturePoint) === OBJECT_ID.CP_HOTZONE) {
		hotZoneCapturePoint = eventCapturePoint;
	}
}

Events.OnCapturePointCapturing.subscribe((_eventPlayer, eventCapturePoint) => {
	cacheHotZoneCapturePoint(eventCapturePoint);
});
Events.OnCapturePointCaptured.subscribe((_eventTeam, eventCapturePoint) => {
	cacheHotZoneCapturePoint(eventCapturePoint);
});
Events.OnCapturePointLost.subscribe((_eventTeam, eventCapturePoint) => {
	cacheHotZoneCapturePoint(eventCapturePoint);
});

/**
 * Freezes (`position`) or unfreezes (`null`) the HotZone's drift. `towers.ts` calls this once a
 * team holds enough decrypted Control Towers per WARDOGS_DESIGN_BRIEF.md → Secondary Objective 1.
 */
export function lockDriftTarget(position: mod.Vector | null): void {
	lockedTarget = position ?? undefined;
	if (lockedTarget && hotZoneCapturePoint) {
		mod.MoveObjectOverTime(hotZoneCapturePoint, lockedTarget, HOTZONE_DRIFT_DURATION_SECONDS);
		lastDriftTarget = lockedTarget;
	}
}

/** Picks a random point within `HOTZONE_DRIFT_STEP_RADIUS` of `origin`, same Y (no vertical drift). */
function randomDriftTarget(origin: mod.Vector): mod.Vector {
	const angle = Math.random() * mod.Pi() * 2;
	const distance = Math.random() * HOTZONE_DRIFT_STEP_RADIUS;
	return mod.CreateVector(
		mod.XComponentOf(origin) + distance * Math.cos(angle),
		mod.YComponentOf(origin),
		mod.ZComponentOf(origin) + distance * Math.sin(angle)
	);
}

function driftStep(): void {
	if (!hotZoneCapturePoint || lockedTarget) {
		return;
	}
	// NOTE (AGENTS.md §2): `mod.GetObjectPosition` is assumed here for the CapturePoint's current
	// world position when no prior drift target is cached yet (first drift step of the match).
	// Confirm this exact getter name against `index.d.ts` before shipping; if the real API differs
	// (e.g. a `Transform`-returning getter), adjust this one call site — `lastDriftTarget` is
	// always used instead once the first drift has happened, so this path only runs once.
	const origin = lastDriftTarget ?? mod.GetObjectPosition(hotZoneCapturePoint);
	const target = randomDriftTarget(origin);
	mod.MoveObjectOverTime(hotZoneCapturePoint, target, HOTZONE_DRIFT_DURATION_SECONDS);
	lastDriftTarget = target;
}

let accumulatedSeconds = 0;
const ASSUMED_SERVER_TICK_SECONDS = 1 / 30;

Events.OngoingGlobal.subscribe(() => {
	accumulatedSeconds += ASSUMED_SERVER_TICK_SECONDS;
	const interval = isPhase3()
		? HOTZONE_DRIFT_INTERVAL_SECONDS / PHASE_3_HOTZONE_DRIFT_SPEED_MULTIPLIER
		: HOTZONE_DRIFT_INTERVAL_SECONDS;
	if (accumulatedSeconds < interval) {
		return;
	}
	accumulatedSeconds = 0;
	driftStep();
});
