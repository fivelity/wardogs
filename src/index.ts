/**
 * WARDOGS entrypoint (bf6.config.ts → entrypoint: "src/index.ts").
 *
 * Per AGENTS.md §4: this file NEVER exports raw Portal event handlers
 * (no `export function OnPlayerDied`, `export function OngoingGlobal`, etc.).
 * `bf6-portal-utils/events`'s `Events` module owns every handler once,
 * project-wide, and `bf6-portal-utils/ui` depends on that ownership for
 * `OnPlayerUIButtonEvent`. A raw export here would silently break it.
 *
 * Instead, every game/UI module below subscribes to what it needs via
 * `Events.OnX.subscribe(...)` at its own top level. Importing each module
 * here is what causes those subscriptions to register when the mod loads —
 * so this file's only job is to be the complete, ordered import list.
 */

// Config (data only — no side effects, safe to import first)
import "./config/ids";
import "./config/constants";
import "./config/teams";
import "./config/economy";

// Player state
import "./player/player-state";
import "./player/wallet";
import "./player/progression";

// Core gameplay mechanics (generic, reusable primitives)
import "./game/core";

// WARDOGS mode-specific rules (HotZone, ControlZone, FOB, win condition, Chaos AI)
import "./game/mode";

// UI (SolidUI-composed: scoreboard, HUD, buy menu)
import "./ui/scoreboard";
import "./ui/hud";
import "./ui/buy-menu";
