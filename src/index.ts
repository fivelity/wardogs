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
import "./config/ids.ts";
import "./config/constants.ts";
import "./config/teams.ts";
import "./config/economy.ts";

// Player state
import "./player/player-state.ts";
import "./player/wallet.ts";
import "./player/progression.ts";

// Core gameplay mechanics (generic, reusable primitives)
import "./game/core/transition-state.ts";

// WARDOGS mode-specific rules (HotZone, ControlZone, FOB, win condition, Chaos AI)
import "./game/mode/chaos-ai.ts";
import "./game/mode/controlzone.ts";
import "./game/mode/hotzone.ts";
import "./game/mode/fob.ts";
import "./game/mode/win-condition.ts";

// UI (SolidUI-composed: scoreboard, HUD, buy menu)
import "./ui/scoreboard.ts";
import "./ui/hud.ts";
import "./ui/buy-menu.ts";
import "./ui/buy-validator.ts";