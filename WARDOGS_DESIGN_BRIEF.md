# WARDOGS Design Brief

> Renamed from `brief.md` → `WARDOGS_DESIGN_BRIEF.md` for clarity now that the repo has multiple
> `.llm/*` docs. This is the gate referenced by `AGENTS.md` §1 and §9 — no gameplay logic is
> written for a rule that isn't reflected here first.

**Quick summary:** Gritty, high-stakes three-faction PMC King-of-the-Hill experience featuring a
mathematically drifting "HotZone" multiplier, persistent server-side wallets, modular weapon
assembly, and cooperative sandbag-excavation base building.

This revision reconciles every ObjId and technical claim below against
`levels/MP_Granite_MilitaryStorage/MP_Granite_MilitaryStorage_Portal-ModBuilderCustom0.spatial.json`
in `fivelity/wardogs`, and against the real `bf6-portal-mod-types@4.2.0` / `bf6-portal-utils@9.4.0`
`.d.ts` files. Corrections from the original draft are marked **[FIXED]**.

---

## 📋 Basic Information

- **Game Mode Name:** WARDOGS
- **Version:** 1.0.0
- **Author:** WARDOGS Development Team (fivelity, SECRET, MadSquirts, SackHurts)
- **Last Updated:** September 9, 2026
- **Development Status:** In Development — architecture/docs pass complete, gameplay systems not yet implemented.

---

## 🎮 Game Description

### Overview

WARDOGS is a hardcore, asymmetrical tactical skirmish taking place on a 2x2km sector of
**MP_Granite_MilitaryStorage**. Three human Private Military Corporations (PMCs) fight to secure a
central tactical sector. To prevent passive defensive stagnation and camping, a double-scoring
**HotZone** continuously drifts along randomized vectors inside the primary polygon boundary,
forcing teams to constantly relocate, defend, and adjust their positioning.

The core loop centers on a strict, punishing **match economy**. Players manage cash reserves
carefully; deploying with high-tier custom firearms carries real risk, since expensive primary
weapons are permanently lost on a full undeploy. Squads cooperate to construct physical
barricades, deploy tactical respawn nodes, ferry logistics supply crates, and pool cash to unlock
stationary heavy weapon platforms at their Forward Operating Bases (FOBs).

### Core Gameplay Loop

1. **Staging & Buy Phase** — Players spawn inside their protected Faction HQs, locked for 60
   seconds at match start. Operatives interact with MCOM Buy Station terminals to manage wallets,
   purchase progression-locked armor, or custom-assemble firearms at the gunsmith.
2. **Incursion & Recon** — Squads deploy via logistics trucks, light ATVs, or air insertions.
   Reaching the active Control Zone begins ticket accrual.
3. **HotZone Contestation** — Contractors fight to hold the shifting 60-meter circular HotZone.
   Operatives inside it count as double presence weight for majority-hold, ticking match points
   and cash flow at twice standard speed.
4. **FOB Construction & Defense** — Support players use Sledgehammers/Build Tools to hit buried
   Godot construction sockets, spending local materials to slide Sandbags, HESCO barriers, or
   Stationary AA platforms up through the terrain.
5. **Combat Elimination & Salvage** — Eliminated contractors drop their purchased primaries.
   Returning to the deploy screen drops a physical Salvage Pack containing ammunition and loose
   cash, lootable by other players.
6. **Ticket Bleed & Extraction** — Falling without a medic revive triggers ticket bleed for that
   player's faction. First faction to 100 victory tickets wins the contract.

### Game Mode Type

Team-based (3 human factions) · Cooperative (FOB pooled funding/building) · Competitive
(high-stakes economy) · Objective-based (drifting HotZone control).

---

## 👥 Players & Teams

- **Minimum:** 6 (2 per human team); 1 player can start the match, backfilled by bots.
- **Maximum:** 36 human players (12/team) + 12 programmatic Chaos bots (4 squads of 3).
- **Number of teams:** 4 — Team1/Team2/Team3 are human PMCs; Team4 (Chaos Squads) is an unlisted,
  unjoinable AI-only faction with no score participation.

| Team | Faction | Color | HQ | HQ ObjId |
|---|---|---|---|---|
| Team1 | Lonestar | Cyan | North-West | `100` |
| Team2 | Manticore | Orange | South-East | `2` |
| Team3 | Valkyra | Silver/White | South-West | `3` |
| Team4 | Chaos Squads (AI) | Red/Black | — (spawns from `AI_Spawner`, ObjId `401`) | n/a |

Chaos Squads patrol, harass, and pressure teams camping the central objective; they earn no
tickets and never appear in the economy or scoreboard.

### Team Balance

Fixed team sizes, strictly capped at 12/team. Interactive mannequin terminals at HQ allow limited
team-swaps within balance safety margins.

---

## 🎯 Objectives & Rules

### Primary Objective

Secure the central sector and accumulate **100 Victory Tickets** before opposing PMCs. Tickets
tick via majority presence in the Control Zone, accelerated by holding the drifting HotZone.

### Secondary Objectives

1. **Secure Concentric Towers** — Capture outlying radio towers to upload "decryption segments."
   Once fully decoded, Support players can lock the HotZone's drift vector onto their fortified
   tower.
2. **HQ Logistics Delivery** — Secure trucks/cargo helicopters, load heavy Supply Crates at HQ
   terminals, deliver to active FOB stockpiles for cash payoffs and fortification unlocks.
3. **Terminate Rogue AI Elements** — Neutralize Chaos Squad bots inside the HotZone to protect
   active capture units.

### Core Rules

1. **Strict match wallets** — every human player is issued exactly **$10,000** starting cash once
   on initial server connection. Cash never resets, multiplies, or wipes on redeploy.
2. **Death kit penalty** — on death or manual redeploy, the operative's custom-purchased Slot 1
   primary weapon package is wiped.
3. **Role specialty preservation** — class-defining equipment (Medic Defibrillator, Medic Healing
   Crate, Spawn Beacon, TUGS, Sledgehammer, Portal Gadget PDA) bypasses the death kit wipe.
   Players respawn with their specialty intact but baseline arms (AK-205 primary, P18 sidearm,
   mini frag).
4. **Pro-rated shop surcharges** — items from other progression tracks incur up to **200%**
   markup if the player's track level is deficient, scaling to baseline pricing once mastery tiers
   unlock.
5. **No native revive-loop exploits** — native Portal revives are blocked due to equipment array
   limits. Teamplay is preserved via Medic defibrillator actions (instant cash), while
   undeployed soldiers drop Salvage Packs.

### Gameplay Phases

| Phase | Duration | Description |
|---|---|---|
| 1. Preparation & Base Selection | 60s at match start | Spawns locked in HQ; shop/gunsmith access |
| 2. Tactical Incursion & FOB Setup | Dynamic, until any team hits 100 | Staging drops, capture outposts, FOB material lines |
| 3. Shifting Contestation (Endgame) | Dynamic, triggers at 75 tickets for any team | HotZone drift speed +50%, Chaos AI spawn rate accelerates |

---

## 🏆 Win Conditions

First team to **100 Victory Tickets** wins.

**[Portal workaround — confirmed against real SDK]** `SetGameModeCriteria`, `SetGameModeScore`,
and `SetGameModeInitialScore` (all real, verified in `bf6-portal-mod-types@4.2.0`) drive native
ticket tracking; the server's target-score criteria is forced to `1` so Portal's own win-detection
never fires prematurely. The moment a faction's tracked ticket count hits 100, code explicitly
calls `EndGameMode(team)` (also real, confirmed at `index.d.ts:783/786`) to end the match
programmatically and avoid the native end-game lobby-block bug.

### Point System

| Action | Reward |
|---|---|
| Control Zone majority hold | +1 ticket per 4.0s tick |
| HotZone hold | Counts as 2x presence weight toward majority hold |
| Contractor kill | +$500 cash, +150 active-track XP |
| Tactical field revive | +$300 cash to medic, +200 medic-track XP |
| Logistics cargo delivery | +$800 cash to transporter, +300 driver/pilot XP, +500 FOB materials |
| Sledgehammer build hit | +$100 cash to builder, +120 support-track XP, +5% construction progress |
| Undeployment (bleed penalty) | -1 ticket from the dead player's faction |

### Match Duration

30-minute time limit, single round.

### Tiebreaker

If two teams hit 100 simultaneously, the faction with the highest cumulative wallet total across
all active squad profiles wins.

---

## 💀 Death & Respawning

- **Death conditions:** combat death, environmental hazards, out-of-bounds (instant undeploy, zero
  Salvage Pack).
- **Respawn mode:** manual — wait for a medic revive, or deploy from an active spawn beacon.
- **Respawn delay:** 10s before deployment becomes available.
- **Respawn location:** HQ spawner nodes (ObjIds `100`, `2`, `3`), captured outposts, or
  squad-placed Spawn Beacons.
- **Restrictions:** spawn-on-squadmate disabled; tactical progress relies on vehicles/beacons.
- **Death penalties:** -1 team ticket on absolute undeploy; permanent loss of custom Slot 1
  primary.

---

## 🔫 Combat & Equipment

- **Weapon restrictions:** handguns/carbines/assault rifles generally accessible; heavy sniper
  rifles and rocket launchers progression-locked behind high mastery tiers.
- **Custom loadouts:** gunsmith subdomain compiles dynamic attachments onto native weapon enums.
- **Default spawn loadout:** Carbine AK-205 (iron sights, 20rd mag) · Sidearm P18 select-fire ·
  Gadget 1 = active specialty role · Gadget 2 empty (buy-station only) · Mini frag grenade if no
  specialty gadget equipped.
- **Equipment acquisition:** purchase system at Buy Stations; Salvage Pack drops for looted cash
  and ammo restock. No fixed loadouts, no free pickups.

---

## 🗺️ Map & Environment

**Supported map:** MP_Granite_MilitaryStorage (2x2km core tactical zone).

### Key Locations — reconciled against the real spatial.json

| Location | Coordinates | Notes |
|---|---|---|
| Lonestar HQ (NW) | `414.67, 151.46, 81.49` | Spawner ObjId `100`; Buy Station ObjId `111` |
| Manticore HQ (SE) | `822.82, 143.76, 714.70` | Spawner ObjId `2`; Buy Station ObjId `221` |
| Valkyra HQ (SW) | `285.91, 128.14, 513.31` | Spawner ObjId `3`; Buy Station ObjId `331` **[FIXED — original brief listed `221`, a duplicate of Manticore's; verified against `BuyStation_3_1` in the spatial.json, which is `331`]** |
| Central Control Zone | `903.11, 228.33, 203.79` | `AreaTrigger_ControlZone_1_1`, ObjId `900` |

### Environmental Hazards

Chaos Faction air patrols targeting out-of-bounds players; periodic mortar barrages deter static
HotZone camping.

### Interactive Objects

- Capture Point Towers (`ObjId 1001` — see Technical Requirements note on this pair)
- FOB Buy Station consoles (ObjIds `111`, `221`, `331`)
- Logistics cargo terminals at HQ

---

## 📊 Player Variables & Stats

**Tracked:** faction tickets (0–100, programmatically managed — no native currency stat exists to
piggyback on, see Technical Requirements); kills (+$500); deaths (wipes primaries, deducts
tickets); assists; FOB build-hit count.

### Player State Shape (`player/player-state.ts` → `JsPlayer`)

| Field | Type | Purpose |
|---|---|---|
| `currentCash` | `number` | Persistent transactional wallet balance |
| `tracks` | `Record<TrackId, { level: 1-5; xp: number }>` | Six mastery tracks (Assault, Medic, Support, Recon, Driver/Pilot, Engineer) |
| `insideControl` | `boolean` | Inside the outer ControlZone polygon |
| `insideHot` | `boolean` | Inside the 60m drifting HotZone |

**Persistence:** mastery progression persists for the match duration; no cross-match stats.

---

## 🖥️ UI Elements

All UI is built with `SolidUI.h(UI.X, {...})` compositions over `bf6-portal-utils/ui` component
classes (`UIContainer`, `UITextButton`, etc.) — never raw `ParseUI`/`AddUIText`. See `AGENTS.md`
§5.

- **Lobby/pre-game:** per-faction queue counts, 60s staging countdown, rules banner, team roster.
- **In-game HUD:**
  - Reactive 3-faction ticket bars (Cyan/Orange/Silver) — custom overlay, since native BF6 overlays
    only support 2 teams.
  - Wallet flash: `+$X` fade-in on transactions.
  - Active track progress bar (e.g. `Support Tier 3: 3,450 / 5,000 XP`).
  - Construction socket ghost overlays: `"Watchtower Socket — Hold [E] to build: 0%/100% [Materials Needed: 500]"`.
- **Messages:** staging start, kill (`+$500`), revive (`+$300`), materials deposited, HotZone
  redirection, victory banner.
- **End game:** final ticket counts, winning PMC, per-player stats (top contractor, most FOB
  builds, top healer).

---

## 🎨 Visual & Audio Design

- **VFX:** holographic scan ring on Portal Gadget PDA aim; FOB dust/spark burst on
  construction completion; rank-up spark on level-up.
- **SFX:** metallic hammer thud on sledgehammer hits; error alarm beep on insufficient-funds
  purchase attempt; digital lock-on click on track level-up.
- **World icons:** Salvage Pack (green cross, 0.8m hover); HotZone marker (red danger ping,
  "HOTZONE [2X POINTS]"); construction socket (yellow wrench + materials-needed text).

---

## 🔧 Technical Requirements

### Required Game Objects — verified against the real spatial.json

| Object | ObjId | Purpose | Verified? |
|---|---|---|---|
| HQ_PlayerSpawner (Lonestar) | `100` | NW spawn/base volume | ✅ matches `TEAM_1_HQ` |
| HQ_PlayerSpawner (Manticore) | `2` | SE spawn/base volume | ✅ matches `TEAM_2_HQ` |
| HQ_PlayerSpawner (Valkyra) | `3` | SW spawn/base volume | ✅ matches `TEAM_3_HQ` |
| AreaTrigger_ControlZone | `900` | Outer capture boundary | ✅ |
| AreaTrigger_HotZone | `901` | Mobile double-multiplier trigger | ✅ |
| CapturePoint_ControlZone | `9000` | Static center flag | ✅ |
| CapturePoint_HotZone | `9001` | Drifting flag, moved via `MoveObjectOverTime` (real, `index.d.ts:1204`) | ✅ |
| AI_Spawner (Chaos Squads) | `401` | Team4 bot seed node | ✅ |
| FOB Tower Sector | `3001` | Outpost fortification container (`TowerSector_1_1`) | ✅ |

**✅ RESOLVED — CapturePoint A/B (`1001`, `2001`) → Control Towers.** These become the two
"outlying tactical radio towers" from Secondary Objective 1: capturable by any team, each holding
a preplaced `StationaryEmplacementSpawner` the controlling team can use. Decryption-segment
progress accrues per tower held, per the existing Secondary Objective 1 rule.

**✅ RESOLVED — FOB placement model.** `mod.SpawnObject(RuntimeSpawn_Common.PlayerSpawner, pos, rot)`
(real, `index.d.ts:2320/2353`) returns a live `SpawnPoint` at any runtime-chosen coordinate — FOBs
are **not** limited to preplaced Godot sockets. A player-placed FOB is: a `SpawnObject`'d
`PlayerSpawner` (the deploy point) + a `SpawnObject`'d `StationaryEmplacementSpawner` (defense) +
`SandBags_*` prop spawns (cover), all torn down together via `mod.UnspawnObject` if the FOB is
destroyed or abandoned. This replaces the original buried-socket-slide-up concept entirely —
`game/mode/fob.ts` implements placement, not construction-reveal.

**⚠️ Scene defect found during reconciliation:** five separate `VehicleSpawner` nodes
(`VehicleSpawner_Bike_104`, `_0_2`, `_0_3`, `_0_4`, `_0_5`) all share ObjId `104`. Only one is
addressable by `mod.GetVehicleSpawner(104)`. Fix in Godot (unique ObjIds) before any dirt-bike
logistics logic depends on more than one of them.

### Performance Considerations

- 36 human players + 12 AI bots expected concurrently.
- Update cadence: 1Hz throttled loops for HUD sync/expiry checks; 10Hz for sledgehammer hit
  evaluation; 5Hz for Portal Gadget PDA raycast scanning.
- UI: fully SolidUI-driven fine-grained reactivity — no per-tick manual widget rebuilds.
- **FOB placement:** fully dynamic via `SpawnObject`/`UnspawnObject` (see Technical Requirements
  above) — no buried-socket/slide-up workaround needed; that limitation applied to earlier SDK
  eras, not the current one.

### No native currency API — confirmed by direct inspection

`bf6-portal-mod-types@4.2.0`'s `index.d.ts` has **no** `AddPlayerCurrency`, `GetPlayerCurrency`, or
any equivalent. The entire wallet system (`currentCash`, transaction flashes, surcharges) is
custom application state tracked per-`JsPlayer`, never a native SDK call. Do not write or accept
code that assumes such a function exists (see `AGENTS.md` §2).

---

## 🚧 Known Issues & Limitations

1. **Ragdoll limbo bug** — dead players occasionally don't fire native undeploy callbacks if not
   revived. Workaround: subscribe to `Events.OnPlayerUndeploy` and spawn Salvage Packs only on
   that callback, not on `OnPlayerDied`.
2. **~~Stationary emplacement movement~~ [SUPERSEDED]** — original workaround assumed emplacements
   could only exist at preplaced Godot sockets. Confirmed false:
   `SpawnObject(RuntimeSpawn_Common.StationaryEmplacementSpawner, pos, rot)` places one directly at
   the FOB location a Support player chooses. No slide-up phase needed.
3. **No native 3-faction scoreboard** — native overlays support 2 teams only. Fully custom
   fullscreen SolidUI overlay, parented to client HUD.
4. See the two **⚠️** scene-reconciliation items above (A/B capture points, duplicate ObjId `104`).

### Planned (Phase 3, not in current scope)

- Dynamic vehicle deconstruction (scrap salvage from wrecks → FOB materials).
- Tactical air drops (pilot-called logistics crates to smoke-designated points).

---

## 📝 Development Philosophy

WARDOGS merges the tactical decision-making of hardcore military-sim games (*Squad*,
*Project Reality*) with Battlefield's accessible vehicle/infantry sandbox. Separating transactional
cash (match utility) from permanent XP progression (mastery limits) creates a strategic battle of
attrition where team coordination and logistics are the primary vectors of victory.

**Inspiration:** *Project Reality* (cooperative logistics, FOB construction) · *Squad* (melee
shovel building, teamplay spawning) · *Escape from Tarkov* (gunsmithing, wallet progression,
high-risk equipment loss).

---

## 📚 Related Documentation

- `AGENTS.md` — canonical coding/architecture rules (this brief is downstream of it for
  SDK-capability questions, upstream of it for what to build).
- `.llm/dev_guidelines.md` — agent operating procedure.
- `.claude/agents/wardogs-bf6-portal-agent.agent.md` — Claude Code agent definition.
- `DOCS/BF6_SDK.md` — human-facing SDK usage notes.
- Real SDK source of truth: `node_modules/bf6-portal-mod-types/index.d.ts`,
  `node_modules/bf6-portal-utils/*/index.d.ts` (see `AGENTS.md` §2 — never substitute memory for
  these files).

---

**Developer contact:** WARDOGS Dev Team (BF6 Modding Guild Discord) · **Version:** 1.0.0
