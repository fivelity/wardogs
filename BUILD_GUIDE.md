# WARDOGS Build Guide

Companion to `AGENTS.md` (rules) and `WARDOGS_DESIGN_BRIEF.md` (design contract). This file
is the map of every source file the mod needs, what each one is responsible for, and — for each —
concrete guidance on building it correctly the first time. Status legend: ✅ built · 🚧 next up ·
⬜ not started.

Read `AGENTS.md` §2 before touching any file below: every `mod.*` / `bf6-portal-utils` symbol you
use must exist verbatim in the real `.d.ts` files under `node_modules/`. This doc cites the exact
lines/files that were checked as of this writing; if the packages get upgraded, re-check before
trusting a citation here.

---

## 1. Entry & config

### `src/index.ts` — ✅ built
**Responsibility:** the mod's sole entrypoint (per `bf6.config.ts` → `entrypoint`). Imports every
game/UI module so their top-level `Events.*.subscribe()` calls register at load time.
**How to build it correctly:** this file must never grow logic. If you find yourself writing an
`if` statement here, that logic belongs in one of the imported modules instead. Every time a new
`game/mode/*.ts` or `ui/*.ts` file is added, add one import line here — nothing else. Do **not**
add `export function OnX(...)` here (AGENTS.md §4); that silently fights the `Events` module.

### `src/config/ids.ts` — ✅ built (verify before extending)
**Responsibility:** the only file in the repo allowed to contain a numeric ObjId literal.
**How to build it correctly:**
1. Before adding a key, open the actual scene file —
   `levels/MP_Granite_MilitaryStorage/MP_Granite_MilitaryStorage_Portal-ModBuilderCustom0.spatial.json`
   — and find the object's `"ObjId"` field yourself. Never guess or reuse a number "because it
   looked free."
2. Group new keys under a `// ── Comment ──` banner matching the design-brief section they serve,
   so the file stays legible as it grows past ~50 entries.
3. If you add or renumber an ObjId in code, the corresponding Godot placement (or a re-imported
   spatial JSON — see §9 below) must change too, or the mapping silently breaks at runtime with no
   compile error.
4. Known open defect: five `VehicleSpawner` nodes share ObjId `104` in the current scene. Don't
   add code that assumes more than one of them is individually addressable until that's fixed on
   the Godot/spatial-JSON side.

### `src/config/constants.ts` — ⬜ started
**Responsibility:** pure data — tick cadences, timer durations, non-economy tuning numbers (e.g.
ControlZone tick interval `4.0`s, HotZone drift speed, endgame trigger threshold `75` tickets,
staging duration `60`s, respawn delay `10`s).
**How to build it correctly:** every constant here should trace to a specific line in
`WARDOGS_DESIGN_BRIEF.md` — put the section name in a comment next to it. No function bodies, no
`mod.*` calls — if a value needs a Portal API to compute, it doesn't belong here. Export as
`as const` objects, not loose `let`/`var`, so consumers get literal types.

### `src/config/teams.ts` — ⬜ started
**Responsibility:** faction definitions — Team1=Lonestar, Team2=Manticore, Team3=Valkyra,
Team4=Chaos Squads (AI-only, non-scoring) — and any helper for going from a `mod.Team` to a
faction identity.
**How to build it correctly:** `mod.Team` is an opaque type (confirmed in
`bf6-portal-mod-types/types.d.ts`); the only legal way to get a stable numeric key from it is
`mod.GetObjId(team)` (verified: `Team` is part of the real `mod.Object` union) or
`mod.GetTeam(teamId: number)` in the other direction (`index.d.ts:2710`). Do not invent a
`GetTeamId`/`modlib.getTeamId`-style helper name — that came from a different, older `modlib`
package in the SDK book reference and does **not** exist in `bf6-portal-utils@9.4.0`. Build your
own small `getFactionId(team: mod.Team): number` wrapper around `mod.GetObjId` here once, and
have every other file import it instead of calling `GetObjId` on a team ad hoc.

### `src/config/economy.ts` — ⬜ started
**Responsibility:** pure data tables — starting cash ($10,000), price tables per weapon/attachment/
armor tier, the pro-rated surcharge curve (up to 200% markup scaling to 0% as mastery tier
unlocks), XP-per-action table (kill +150, revive +200, cargo delivery +300, build hit +120).
**How to build it correctly:** confirmed by direct grep of `bf6-portal-mod-types@4.2.0` —
**there is no native currency API** (no `AddPlayerCurrency`/`GetPlayerCurrency`/equivalent exists
anywhere in `index.d.ts`). Every number in this file is consumed entirely by your own
`player/wallet.ts` logic, never passed to a `mod.*` currency call, because there isn't one. Keep
this file pure data (objects/tables), no logic — the surcharge *calculation* belongs in
`player/wallet.ts` or `ui/buy-validator.ts`, not here.

---

## 2. Player state

### `src/player/player-state.ts` — 🚧 started
**Responsibility:** the `JsPlayer` class — one instance per connected `mod.Player`, holding
`currentCash: number`, `tracks: Record<TrackId, { level: number; xp: number }>`,
`insideControl: boolean`, `insideHot: boolean` (shape specified in the design brief's Player
State Variables table).
**How to build it correctly:**
- Maintain a `Map<mod.Player, JsPlayer>` at module scope. Populate it on
  `Events.OnPlayerJoinGame.subscribe(...)` (real event, confirmed against
  `event-handler-signatures.d.ts`) and clean it up on `Events.OnPlayerLeaveGame.subscribe(...)`.
- `mod.Player` is an opaque type — it can be used as a `Map` key directly (reference identity),
  but do **not** try to serialize it, hash it into a plain number, or store it in a plain object
  keyed by string; there is no `mod.GetPlayerId`-style stable primitive-key function in the SDK.
  If you need a stable numeric key for a player, you don't have one — design around Map-by-object
  identity instead, and confirm against `index.d.ts` before assuming otherwise.
- Cash starts at $10,000 exactly once per player, on first join, and is never reset on redeploy —
  don't reset it in any `OnPlayerDeployed`/`OnPlayerDied` handler.
- Export accessor functions (`getPlayerState(player)`, `requirePlayerState(player)`) rather than
  exporting the `Map` directly, so every consumer goes through one choke point that can assert
  the player is tracked.

### `src/player/wallet.ts` — 🚧 started (depends on player-state.ts)
**Responsibility:** all cash mutation — add/deduct, transaction-flash trigger for the HUD, the
pro-rated surcharge calculation, Salvage Pack payout on pickup.
**How to build it correctly:**
- Every mutation goes through one function (e.g. `addCash(player, amount, reason)` /
  `spendCash(player, amount): boolean`) that also fires whatever event/signal `ui/hud.ts` listens
  on for the flash animation — don't let UI code reach into `player-state.ts` directly and mutate
  `currentCash` itself.
- `spendCash` must return a boolean (or throw a typed error) rather than silently going negative —
  every caller (buy-validator, FOB placement cost, etc.) needs to branch on affordability.
- Surcharge formula: re-read the design brief's "Pro-Rated Shop Surcharges" rule exactly — the
  markup scales from 200% down to 0% as the *specific track* required for that item approaches its
  unlock tier, not a flat global multiplier. Write this as a pure function
  `getSurcharge(playerTrackLevel, itemRequiredTier): number` that's independently testable.

### `src/player/progression.ts` — 🚧 started (depends on player-state.ts)
**Responsibility:** XP/level logic for the six mastery tracks (Assault, Medic, Support, Recon,
Driver/Pilot, Engineer per the brief), levels 1–5.
**How to build it correctly:** XP thresholds per level should live in `config/economy.ts` as data;
this file is the pure logic that reads that table (`addXp(player, track, amount)`, and internally
computes level-up, firing whatever event the HUD progress bar and rank-up VFX/SFX subscribe to).
Keep the XP-table lookup and the level-up side effects (VFX spawn, notification) in clearly
separate functions so progression math stays unit-testable without needing a live Portal runtime.

---

## 3. Core gameplay primitives

### `src/game/core/transition-state.ts` — ✅ built
**Responsibility:** `TransitionState` — fires only on the false→true edge of a boolean condition.
**How to build it correctly (reference for anything else added to `game/core`):** this class is
intentionally tiny and has zero `mod.*` dependencies — that's the pattern for everything in
`game/core`: generic primitives that don't know about WARDOGS-specific rules and could be reused
by a different mode. If a "core" file starts importing `config/ids.ts` or `config/teams.ts`, it's
actually mode logic and belongs in `game/mode` instead.

### `src/game/core/index.ts` — ✅ built
**Responsibility:** barrel re-export for everything in `game/core`. Add one `export * from` line
per new core primitive; no logic.

### Future `game/core` candidates (add here as they're needed, not preemptively)
- A generic "zone occupancy" tracker (enter/exit bookkeeping for any `AreaTrigger`) if
  `game/mode/controlzone.ts` and `game/mode/hotzone.ts` end up duplicating that logic —
  extract it here only once duplication is real, not before.

---

## 4. WARDOGS mode rules

### `src/game/mode/index.ts` — ✅ built
**Responsibility:** barrel import for every mode-rule module, same pattern as `src/index.ts` one
level down. Add one `import "./x";` line per new mode file.

### `src/game/mode/fob.ts` — ✅ built
**Responsibility:** freely-placeable FOBs — deploy point + emplacement + sandbag ring, placed via
Portal Gadget PDA aim, spawned/torn down via `mod.SpawnObject`/`mod.UnspawnObject`.
**How to build it correctly (already applied, keep doing this for every future file):**
- `PortalGadget.onFireStart`'s `getTarget()` is `async` — always `await` it and handle the
  `undefined` case (no valid raycast target) before spawning anything.
- Guard against holding the trigger down spamming placements — that's what `TransitionState` from
  `game/core` is for; don't hand-roll a second boolean flag for this.
- **Still missing, needed before this is "done":** the material-cost deduction. `placeFob()`
  currently builds unconditionally; it must call into `player/wallet.ts` (once that exists) to
  verify and deduct `FOB_MATERIAL_COST` *before* spawning anything, and abort with a
  UI/notification message on insufficient materials rather than a silent no-op.
- Also still missing: a placement-distance/count cap per team (the brief doesn't currently specify
  a hard number — decide and document this in the design brief before enforcing it in code, per
  AGENTS.md §1's gate rule).

### `src/game/mode/controlzone.ts` — ⬜ started
**Responsibility:** majority-hold tick logic for the static Control Zone (`AT_CONTROLZONE`,
`CP_CONTROLZONE`). +1 ticket per faction per 4.0s tick while that faction holds majority presence.
**How to build it correctly:**
- Subscribe to `Events.OnPlayerEnterAreaTrigger` / `OnPlayerExitAreaTrigger` (both real, confirmed
  in `event-handler-signatures.d.ts`) filtered to `OBJECT_ID.AT_CONTROLZONE`, and maintain a
  per-team occupant count — don't recompute occupancy by iterating `mod.AllPlayers()` every tick
  if enter/exit events already give you the delta.
- Drive the actual 4-second cadence from `Events.OngoingGlobal` (fires every server tick, ~30Hz)
  gated by an accumulated-time check, or from `bf6-portal-utils/timers` if it exposes an interval
  helper — check that module's real `.d.ts` before assuming the exact function name.
- Ticket increment must go through `mod.SetGameModeScore(team, newScore)` (confirmed real,
  `index.d.ts:810`) reading the previous value from your own tracked score state — there's no
  native "add to score" call, only set-absolute, confirmed by grep (`index.d.ts` search for
  `Score` shows only `SetGameModeScore`/`SetGameModeInitialScore`/`SetGameModeCriteria`, no
  `AddGameModeScore`).
- Call `mod.SetGameModeCriteria(...)` and `mod.SetGameModeInitialScore(...)` once, at
  `OnGameModeStarted`, forcing the native win-target to `1` per the design brief's win-condition
  workaround — don't scatter that setup across multiple files.

### `src/game/mode/hotzone.ts` — ⬜ not started
**Responsibility:** the drifting 60m HotZone (`AT_HOTZONE`, `CP_HOTZONE`) — 2x presence weight,
random drift vector, Phase 3 (75+ tickets) drift-speed +50%.
**How to build it correctly:**
- The flag pole's movement uses `mod.MoveObjectOverTime` (confirmed real, `index.d.ts:1204`) — read
  its exact parameter list from the `.d.ts` before calling it; do not assume it matches
  `MoveObjectOverTime(obj, targetPos, duration)` without checking, since overloaded Portal
  functions frequently have more parameters (easing, rotation) than the name implies.
- "2x presence weight" means: when computing `controlzone.ts`'s majority-hold occupant counts, a
  player who is `insideHot === true` (per `player-state.ts`) should count as 2 toward their team's
  total, not that HotZone runs an entirely separate ticket track. Re-read the design brief's Point
  System table to confirm this interpretation before implementing — if it's ambiguous, that's a
  brief gap to close (AGENTS.md §1), not something to guess silently.
- The Secondary-Objective-1 tower-unlock ("lock the HotZone's drift vector onto a fortified tower")
  needs a toggle this file exposes (e.g. `lockDriftTarget(position | null)`) that
  `game/mode/towers.ts` (see below) calls once a tower's decryption segments are complete.

### `src/game/mode/towers.ts` — ⬜ not started (design decision already made — see brief)
**Responsibility:** the two Control Towers (`CP_TOWER_A`/`CP_TOWER_B`, ObjIds `1001`/`2001`) —
capturable by any team, each holding a preplaced `StationaryEmplacementSpawner`, each contributing
a decryption segment toward HotZone-drift locking.
**How to build it correctly:**
- Capture-point capture/lost/capturing events are real and already used elsewhere in the base
  template (`OnCapturePointCaptured`, `OnCapturePointCapturing`, `OnCapturePointLost` — confirmed
  in `event-handler-signatures.d.ts`); subscribe to these via `Events`, filtered by
  `mod.GetObjId(eventCapturePoint)` against `OBJECT_ID.CP_TOWER_A`/`CP_TOWER_B`.
- "Decryption segment" progress is custom application state (no native SDK concept) — model it
  as a simple counter per team, incremented on `OnCapturePointCaptured` for each tower, and call
  `hotzone.ts`'s `lockDriftTarget()` once a team holds both towers (confirm the exact "both towers"
  vs "either tower" threshold against the brief before implementing — currently reads as
  ambiguous and should be tightened there first).

### `src/game/mode/salvage.ts` — ⬜ not started
**Responsibility:** Salvage Pack drop-on-undeploy (not on death — see Known Issues #1 in the
brief, the "ragdoll limbo bug" workaround) containing loose cash and ammo, lootable by any player.
**How to build it correctly:**
- Subscribe to `Events.OnPlayerUndeploy` specifically, **not** `OnPlayerDied` — this is the
  brief's explicit workaround for players who die without a revive and never get a clean death
  callback. Spawning the pack on `OnPlayerDied` instead will double-spawn or spawn at the wrong
  moment for revived players.
- Use `mod.SpawnLoot(lootSpawner, ...)` (confirmed real, `index.d.ts:897-906`, overloaded for ammo/
  weapon/gadget/armor) against a `LootSpawner` you place via `SpawnObject` at the player's last
  position — check `RuntimeSpawn_Common` for the correct loot-spawner prefab name before using it,
  don't assume a name.
- The cash portion of a Salvage Pack has no native representation (see economy.ts note — no
  currency API) — it's tracked as data on your own pack object and paid out through
  `player/wallet.ts`'s `addCash` when another player's pickup event fires, not through any
  `mod.*` currency mechanism.

### `src/game/mode/chaos-ai.ts` — ⬜ not started
**Responsibility:** Team 4 (Chaos Squads) — 12 AI bots (4 squads of 3), patrol/harass, spawn-rate
acceleration in Phase 3, out-of-bounds air-patrol behavior, periodic HotZone mortar barrages.
**How to build it correctly:**
- Bot spawning goes through `mod.SpawnAIFromAISpawner(spawner, ...)` (confirmed real,
  `index.d.ts:151-205`, heavily overloaded for class/name/team combos) against
  `OBJECT_ID.AI_SPAWNER_CHAOS`. Read the exact overload list before picking one — there are 7
  overloads with different optional-parameter combinations.
- AI movement/behavior state comes from the dedicated AI event group
  (`OnAIMoveToFailed/Running/Succeeded`, `OnAIWaypointIdleFailed/Running/Succeeded`,
  `OnAIParachuteRunning/Succeeded`) — all confirmed real in `event-handler-signatures.d.ts`. Don't
  try to drive AI state machines purely from `OngoingPlayer` polling when a purpose-built event
  exists.
- Team 4 must never appear in `game/mode/controlzone.ts`'s majority-hold tallying or
  `ui/scoreboard.ts`'s ticket display — filter it out explicitly at the point where you enumerate
  teams, don't rely on it happening to have zero tickets to look inert.

### `src/game/mode/win-condition.ts` — ⬜ started
**Responsibility:** the 100-ticket win check and the `EndGameMode` workaround.
**How to build it correctly:**
- Check ticket totals from your own tracked score state (the same state `controlzone.ts` writes
  to via `SetGameModeScore`), not by re-reading anything back from `mod.*` — there's no
  `GetGameModeScore` getter in the confirmed API surface, only setters. If you need the current
  score elsewhere, get it from your own state, not the SDK.
- On any team crossing 100, call `mod.EndGameMode(team)` (confirmed real, overloaded for both
  `Player` and `Team`, `index.d.ts:783/786`) — per the design brief this is a deliberate bypass of
  a native end-game lobby bug, not a bug in this codebase; don't "simplify" it away later without
  re-reading why it's there.
- Tiebreaker (simultaneous 100+ for two teams) reads cumulative wallet totals across all players
  on each team — this needs a `player-state.ts` iteration helper (e.g. `getAllPlayersOnTeam`) that
  doesn't currently exist; add it there when this file needs it, not by reaching into the player
  Map directly from here.

---

## 5. UI (all SolidUI-composed — AGENTS.md §5)

### `src/ui/scoreboard.ts` — ⬜ not started
**Responsibility:** the custom 3-faction scoreboard overlay (native BF6 overlays only support 2
teams — brief's Known Issue #3).
**How to build it correctly:**
- Build with `SolidUI.h(UI.Container, {...})` trees, reactive ticket counts driven by
  `SolidUI.createSignal()` — re-read the `solid-ui/README.md` Quick Start example verbatim before
  writing this, it's short and shows the exact pattern (signal → `h(UI.Text, { message: () =>
  ...accessor... })`).
- Do **not** subscribe to a raw `OnPlayerUIButtonEvent` here — the `UI` module already owns that
  hook internally (AGENTS.md §4); this file only needs to *display* state, not handle button
  clicks unless the scoreboard itself has an interactive element.
- Use `deferTicks` on any signal binding that updates from `OngoingGlobal`-driven state (ticket
  counts don't need to repaint 30 times/second) — coalesce to something like every 15–30 ticks per
  the SolidUI README's own example for exactly this kind of use case.

### `src/ui/hud.ts` — ⬜ not started
**Responsibility:** wallet flash (`+$X` fade-in), active-track progress bar, construction/FOB
status overlays.
**How to build it correctly:** same SolidUI pattern as scoreboard.ts. The wallet flash specifically
needs a *transient* signal (set true → auto-reset after N ticks) rather than a persistent one —
model it as its own small reusable helper if `progression.ts`'s rank-up flash needs the identical
transient-then-reset pattern, rather than duplicating the timer logic twice.

### `src/ui/buy-menu.ts` — ⬜ not started
**Responsibility:** the MCOM buy-station shop UI (weapons, attachments, armor, gadgets), gated by
`ui/buy-validator.ts`.
**How to build it correctly:**
- Trigger on `OnPlayerInteract` at the faction's `IP_BUY_MENU_*` ObjId, subscribed via `Events`,
  filtered by `mod.GetObjId(eventInteractPoint)`.
- Every purchase button's `onClick` must call `buy-validator.ts`'s check *and*
  `wallet.ts`'s `spendCash` — never deduct cash and grant the item in two separate,
  independently-failable steps; wrap both in one function so a failed grant can't silently still
  have charged the player.

### `src/ui/buy-validator.ts` — ⬜ not started
**Responsibility:** pure affordability/eligibility checks — no UI code, no `SolidUI` import.
**How to build it correctly:** this file should be importable and unit-testable with zero Portal
runtime — every function takes plain data (`JsPlayer` state, item price, required tier) and
returns a plain boolean/result object. If a function here needs to call `mod.*` or `SolidUI.*`,
that logic has drifted into `buy-menu.ts`'s territory and should move there.

---

## 6. Types

**No `src/types/` directory.** `bf6-portal-mod-types` (global `mod` namespace, via `tsconfig.json`
`"types"`) and `@bf6mods/sdk` cover the entire surface WARDOGS needs. Per AGENTS.md §2, do not
recreate a `mod-extended.d.ts` or any `declare namespace mod {}` merge — if a capability seems
missing, it's a `game/core` or `game/mode` design problem to solve with real primitives, not a
types problem to solve by declaring new ones into existence.

---

## 7. Build tooling & CI

### `package.json` — done (pnpm → npm)
Switch `packageManager`/scripts to npm equivalents; regenerate `package-lock.json` with
`npm install` (deleting any `pnpm-lock.yaml` first). Scripts stay the same
(`build`, `dev`, `log`, `postinstall`, `typecheck`) — only the lockfile and install command change.

### `.github/workflows/ci.yml` — ⬜ not started
**Responsibility:** run `npm ci && npm run typecheck && npm run build` on every push/PR.
**How to build it correctly:** pin a Node version matching the packages' `engines` field —
`bf6-portal-mod-types` requires Node `>=23.0.0`, `bf6-portal-utils` requires `>=24.0.0`
(both confirmed from their real `package.json`s) — use `>=24` in the workflow's `node-version` to
satisfy both. Fail the job on either step failing; don't let `build` run if `typecheck` fails.

---

## 8. Documentation cross-references

- `AGENTS.md` — read first, always current for hard rules.
- `WARDOGS_DESIGN_BRIEF.md` — the rules gate; if this build guide and the brief ever disagree
  on a gameplay rule (not an SDK-capability fact), the brief wins and this doc needs updating.

---

## 9. Non-code reconciliation

### Godot scene / spatial JSON
The two known scene defects (duplicate ObjId `104` across five vehicle spawners; the now-resolved
CP A/B repurposing to Control Towers) should be applied via the EA-documented Portal website
workflow — **Draft → Map Rotation → Import (spatial JSON) → Publish → Save** — without needing to
reopen Godot, as long as internal references (`ext_resource` paths, `linked` node paths, parent/
child hierarchy) stay consistent in the edited JSON. Re-verify `config/ids.ts` against the
re-imported file afterward; nothing here is caught by TypeScript's compiler.
