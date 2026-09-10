# AGENTS.md — WARDOGS (BF6 Portal Mod)

Single authoritative rule source for any agent (human or LLM) working in this repo.

---

## 1. Project

WARDOGS is a 3-faction + 1 AI-faction King-of-the-Hill mod for Battlefield 6 Portal, built on
`bf6-portal-mod-types` (SDK type defs) and `bf6-portal-utils` (helper library), bundled with
`@bf6mods/cli`, package-managed with **npm**.

Repo: `fivelity/wardogs`, branch `wardogs-v1.0`.
Design contract: `WARDOGS_DESIGN_BRIEF.md` (formerly `brief.md` — renamed for clarity;
if you see a stale reference to `brief.md` elsewhere in the docs, treat it as this file). No
gameplay-logic code is written for a rule that isn't reflected in the brief first — it already
covers the full ruleset as of this writing; treat any future change to core rules as a brief
update before a code change.

## 2. Hard rule: source of truth for the SDK

- The **only** valid `mod.*` and `bf6-portal-utils` symbols are the ones that literally appear in:
  - `node_modules/bf6-portal-mod-types/index.d.ts` (+ `enums.d.ts`, `types.d.ts`, `event-handler-signatures.d.ts`)
  - `node_modules/bf6-portal-utils/*/index.d.ts`
- **Never invent, assume, or "recall" a function.** If a capability seems missing, grep the actual
  `.d.ts` files first. If it truly isn't there, say so and propose a workaround built from real
  primitives — do not fabricate a plausible-sounding function name.
- There is **no undocumented/"extended" runtime namespace**. Do not create a `mod-extended.d.ts`
  or any `declare namespace mod {}` merge. If a needed capability doesn't exist in the real
  `.d.ts`, it doesn't exist in Portal — build around it, don't declare it into existence.
- Confirmed by direct inspection of `bf6-portal-mod-types@4.2.0`: there is **no currency/wallet
  API** (`AddPlayerCurrency`, `GetPlayerCurrency`, etc. do not exist). WARDOGS's economy is
  entirely custom-tracked in `player/wallet.ts` against the `JsPlayer` state object — never assume
  a native money function exists.
- Native scoring **does** exist: `SetGameModeScore`, `SetGameModeInitialScore`,
  `SetGameModeCriteria`, `ScoreCriteria`, `EndGameMode`. Ticket/score tracking uses these, not a
  custom scoreboard number.
- `mod.SpawnObject` / `mod.UnspawnObject` are confirmed real (used in `game/mode/fob.ts`,
  already built) and are the pattern for any future runtime-placed object — deploy points,
  emplacements, cover props, loot spawners. Don't assume an object must be pre-placed in Godot.

## 3. Package manager

**npm only.** `package-lock.json` is the committed lockfile. Do not introduce `pnpm-lock.yaml` or
`yarn.lock`. Install with `npm install`, run scripts with `npm run <script>`.

> Note for agents defaulting to pnpm: this project is npm-only regardless of what tooling you
> reach for by habit elsewhere. If you see a `pnpm-lock.yaml` appear, delete it and regenerate
> `package-lock.json` with `npm install`.

## 4. Event handling — single-owner rule

`bf6-portal-utils/events`'s `Events` module owns every Portal event hook
(`OnPlayerDied`, `OngoingGlobal`, `OnPlayerUIButtonEvent`, etc.) once, project-wide, and the `UI`
module depends on this (it subscribes to `OnPlayerUIButtonEvent` internally).

**Consequence — this is a hard rule:**

- **Never** `export function OnPlayerDied(...)` / `export function Ongoing...(...)` etc. directly
  from any file, including `index.ts`. Portal only allows one implementation of each handler per
  project; a second raw export silently breaks the `Events`-registered one (this breaks UI clicks
  in particular, since `UI` owns `OnPlayerUIButtonEvent`).
- Every system subscribes via the channel API:
  ```ts
  import { Events } from 'bf6-portal-utils/events';
  Events.OnPlayerDied.subscribe(async (eventPlayer, eventOtherPlayer, eventDeathType, eventWeaponUnlock) => { ... });
  ```
- `src/index.ts` is the mod's entrypoint (per `bf6.config.ts` → `entrypoint: "src/index.ts"`) and
  is the **one file that imports every game/UI module**, guaranteeing all `Events.*.subscribe()`
  calls at the top of those modules execute at load time. It is import-wiring, not handler logic.
  This file is already built — do not add logic to it; add a new module and one import line.

## 5. `bf6-portal-utils` usage — canonical modules

Use these subpath imports (verified against the extracted package, no root import):

| Need | Import |
|---|---|
| Event subscription | `bf6-portal-utils/events` → `Events` |
| Reactive UI (signals, effects) | `bf6-portal-utils/solid-ui` → `SolidUI` |
| UI primitives (containers, buttons, text) | `bf6-portal-utils/ui` and `bf6-portal-utils/ui/components/*` → `UI`, `UIContainer`, `UITextButton`, etc. |
| Timers / intervals | `bf6-portal-utils/timers` |
| Portal gadget helpers | `bf6-portal-utils/portal-gadget` |
| Vector math | `bf6-portal-utils/vectors` |
| Sounds | `bf6-portal-utils/sounds` |
| Raycasting | `bf6-portal-utils/raycast` |
| Logging | `bf6-portal-utils/logging` or `bf6-portal-utils/logger` |

Rules:

- **UI must use `UIContainer`/component classes composed with `SolidUI.h()`.** Never call raw
  `mod.ParseUI`, `mod.AddUIText`, `SolidUI.render()`, or `SolidUI.For()` — those either don't exist
  or aren't the supported pattern (`SolidUI.h()` / `SolidUI.Index()` are correct).
  - All three WARDOGS UI surfaces (buy menu, HUD, 3-faction scoreboard) are `SolidUI.h(UI.X, {...})`
    trees, driven by `SolidUI.createSignal()` state, not manual per-frame widget mutation.
- **Every subscribable Portal event goes through `Events`**, never a raw exported handler (see §4).
- Before using any `bf6-portal-utils` helper, confirm the exact export name/signature against its
  real `index.d.ts` under `node_modules/bf6-portal-utils/<module>/`. READMEs are accurate reference
  material but the `.d.ts` is authoritative for signatures.
- `bf6-portal-utils/portal-gadget`'s `PortalGadget.onFireStart` callback's `getTarget()` is
  **async** — always `await` it and handle the `undefined` (no raycast hit) case before acting on
  the result. See `game/mode/fob.ts` for the reference implementation.

## 6. Source layout

```
src/
  index.ts                # entrypoint: imports every module below so their Events.*.subscribe() run
  config/
    ids.ts                 # SINGLE source of truth for every ObjId (HQs, capture points, VFX, SFX, UI anchors)
    constants.ts             # tick cadences, timers, non-economy tuning values
    teams.ts                  # faction definitions (Lonestar/Manticore/Valkyra/Chaos), team-number mapping
    economy.ts                 # price tables, XP tables — data only, no logic
  player/
    player-state.ts             # JsPlayer class: wallet, mastery tracks, zone-occupancy state
    wallet.ts                    # custom currency add/deduct/payout (no native API — see §2)
    progression.ts                 # mastery track XP/level logic
  game/
    core/                          # generic, reusable gameplay primitives (state machines, zone tracking helpers)
    mode/                            # WARDOGS-specific rules: HotZone drift, ControlZone ticks, FOB, win condition, Chaos AI
  ui/
    scoreboard.ts                     # 3-faction SolidUI overlay
    hud.ts                              # wallet/track/zone HUD
    buy-menu.ts                          # SolidUI-composed buy station UI
    buy-validator.ts                      # affordability / eligibility checks (pure functions, no UI)
  types/
    (none — bf6-portal-mod-types + @bf6mods/sdk cover the full surface; do not add ambient merges)
```

`game/core` vs `game/mode`: `core` holds mechanics that could theoretically serve another mode
(generic capture-point tick tracking, generic construction-progress state machine); `mode` holds
WARDOGS-specific rule wiring that calls into `core` (HotZone drift amount, FOB cost table, Chaos AI
spawn cadence). This separation exists so future modes can reuse `core` without dragging WARDOGS
rules with it.

See `BUILD_GUIDE.md` for the current status (✅ built / 🚧 next up / ⬜ not started) of every file
in this layout and file-by-file guidance on how to build each one correctly.

## 7. ObjId management

All ObjIds live in `config/ids.ts` as a single flat, namespaced object, e.g.:

```ts
export const OBJECT_ID = {
  HQ_LONESTAR: 100,
  HQ_MANTICORE: 2,
  HQ_VALKYRA: 3,
  CP_CONTROLZONE: 9000,
  AT_HOTZONE: 901,
  IP_BUY_MENU_LONESTAR: 112,
  // ...
} as const;
```

No numeric ObjId literal appears anywhere outside this file. Cross-check against the actual Godot
`.tscn`/`.spatial.json` scene files under `levels/` before adding or renaming an entry — a value in
`ids.ts` with no matching placed object in Godot is a silent runtime failure, not a compile error.

**Known open scene defect:** five separate `VehicleSpawner` nodes in the current scene
(`VehicleSpawner_Bike_104`, `_0_2`, `_0_3`, `_0_4`, `_0_5`) all share ObjId `104`. Only one is
addressable via `mod.GetVehicleSpawner(104)`. Do not write logic that assumes more than one of
them is individually addressable until this is fixed on the Godot/spatial-JSON side.

## 8. State-transition discipline

Use a one-shot condition-state pattern (`TransitionState` in `game/core/transition-state.ts`,
already built: fires only on the `false → true` transition, not while a condition remains true)
for anything that must not re-fire every tick — capture completion, FOB build completion, HotZone
entry/exit. Check `bf6-portal-utils` for an existing primitive before hand-rolling a second boolean
flag; if none exists, reuse `TransitionState` rather than duplicating it.

## 9. Documentation tree

- `AGENTS.md` (this file) — canonical rules, human- and agent-facing.
- `WARDOGS_DESIGN_BRIEF.md` — WARDOGS design contract: rules, win conditions, economy, teams.
  Gate for all gameplay-logic work (see §1).
- `BUILD_GUIDE.md` — per-file build map and status legend; consult before starting or resuming
  work on any `src/` file.

- `.claude/agents/wardogs-bf6-portal-agent.md` — Claude Code agent definition.


If `BUILD_GUIDE.md` and the design brief ever disagree on a gameplay rule (not an SDK-capability
fact), the brief wins and `BUILD_GUIDE.md` needs updating to match.

## 10. Build & validate

```
npm install
npm run build       # @bf6mods/cli bundle → dist/
npm run typecheck   # tsc --noEmit
```

CI (`.github/workflows/*`) runs `npm run typecheck` and the bundler build on every push; no gameplay
PR merges with either failing.

## 10.1 What's built vs. what's next

Current status on `wardogs-v1.0` (see `BUILD_GUIDE.md` for full detail per file):

**Built (✅):** `AGENTS.md` (this file), `src/config/ids.ts`, `src/index.ts` wiring,
`game/core/transition-state.ts`, `game/core/index.ts`, `game/mode/index.ts`,
`game/mode/fob.ts` (FOB placement — still missing its material-cost deduction, blocked on
`player/wallet.ts`; see BUILD_GUIDE.md §4 for the exact gap).

**Not yet implemented** — deliberately, to avoid fabricating SDK calls under time pressure:
`config/constants.ts`, `config/teams.ts`, `config/economy.ts`, `player/player-state.ts`,
`player/wallet.ts`, `player/progression.ts`, `game/mode/controlzone.ts`, `game/mode/hotzone.ts`,
`game/mode/towers.ts`, `game/mode/salvage.ts`, `game/mode/chaos-ai.ts`,
`game/mode/win-condition.ts`, `ui/scoreboard.ts`, `ui/hud.ts`, `ui/buy-menu.ts`,
`ui/buy-validator.ts`. Each of these must be built against the real `.d.ts` files per §2 before
being marked done — see `.llm/WARDOGS_DESIGN_BRIEF.md` for the rules each one must implement and
`BUILD_GUIDE.md` for how to build it correctly.

Recommended build order (dependency-driven, per `BUILD_GUIDE.md`): `player/player-state.ts` →
`player/wallet.ts` (unblocks the FOB material-cost gap above) → `player/progression.ts` →
`config/constants.ts` / `config/teams.ts` / `config/economy.ts` (as each becomes needed) →
`game/mode/controlzone.ts` → `game/mode/hotzone.ts` → `game/mode/towers.ts` →
`game/mode/salvage.ts` → `game/mode/chaos-ai.ts` → `game/mode/win-condition.ts` → UI layer last,
since every UI surface reads state the above files produce.

## 11. Non-negotiables recap

1. No fabricated SDK symbols — grep the real `.d.ts` or don't write the call.
2. No raw exported Portal event handlers anywhere — `Events.*.subscribe()` only.
3. No manual `ParseUI`/`AddUIText` — `SolidUI.h(UI.X, ...)` only.
4. No numeric ObjId literals outside `config/ids.ts`.
5. No gameplay logic before `WARDOGS_DESIGN_BRIEF.md` reflects the rule being implemented.
6. npm only — no pnpm/yarn lockfiles, regardless of tooling preferences used elsewhere.