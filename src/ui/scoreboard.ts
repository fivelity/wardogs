/**
 * scoreboard.ts — the custom 3-faction scoreboard overlay.
 *
 * Design: WARDOGS_DESIGN_BRIEF.md → "UI Elements" (native BF6 overlays only support 2 teams —
 * Known Issue #3). Built with `SolidUI.h(UI.X, {...})` trees per AGENTS.md §5, driven by
 * `SolidUI.createSignal()` state that's coalesced from `controlzone.ts`'s tracked ticket totals
 * on a throttled cadence (`deferTicks`) rather than repainting 30x/second.
 *
 * This file only *displays* state — it never subscribes to `OnPlayerUIButtonEvent` itself, since
 * the `UI` module already owns that hook internally (AGENTS.md §4).
 *
 * NOTE (AGENTS.md §2): the exact `SolidUI` export names/signatures used below
 * (`createSignal`, `h`, `deferTicks`) are per BUILD_GUIDE.md §5's own citation of the
 * `solid-ui/README.md` Quick Start pattern; re-read that README verbatim against
 * `node_modules/bf6-portal-utils/solid-ui/` before shipping and adjust call shapes if they differ.
 */

import { Events } from "bf6-portal-utils/events";
import { SolidUI } from "bf6-portal-utils/solid-ui";
import { UI } from "bf6-portal-utils/ui";
import { UIContainer } from "bf6-portal-utils/ui/components/container";
import { UIText } from "bf6-portal-utils/ui/components/text";
import { getAllTickets } from "../game/mode/controlzone.ts";
import { FACTIONS, SCORING_FACTION_IDS } from "../config/teams.ts";

/** Ticket count signal per scoring faction — updated on a throttled cadence, not every tick. */
const [tickets1, setTickets1] = SolidUI.createSignal(0);
const [tickets2, setTickets2] = SolidUI.createSignal(0);
const [tickets3, setTickets3] = SolidUI.createSignal(0);

const ticketSetters: Record<number, (value: number) => void> = {
	1: setTickets1,
	2: setTickets2,
	3: setTickets3,
};
const ticketSignals: Record<number, () => number> = {
	1: tickets1,
	2: tickets2,
	3: tickets3,
};

const FACTION_COLORS: Record<number, string> = {
	1: UI.COLORS.CYAN ?? "#22D3EE",
	2: UI.COLORS.ORANGE ?? "#FB923C",
	3: UI.COLORS.WHITE,
};

/** Refreshes the ticket signals from `controlzone.ts`'s tracked state. Coalesced via deferTicks. */
function refreshTicketSignals(): void {
	const tickets = getAllTickets();
	for (const faction of SCORING_FACTION_IDS) {
		ticketSetters[faction](tickets[faction]);
	}
}

// Coalesce to roughly every 20 ticks (~0.66s at 30Hz) — tickets only change every 4s anyway
// (CONTROL_ZONE_TICK_SECONDS), so this cadence is already generous.
SolidUI.deferTicks(20, () => {
	Events.OngoingGlobal.subscribe(refreshTicketSignals);
});

/** Builds and shows the 3-faction scoreboard overlay for `player`. */
function buildScoreboard(player: mod.Player): UIContainer {
	return new UIContainer({
		position: { x: 0, y: 20 },
		size: { width: 240, height: 140 },
		anchor: mod.UIAnchor.TopCenter,
		receiver: player,
		visible: true,
		uiInputModeWhenVisible: false,
		childrenParams: SCORING_FACTION_IDS.map((faction, index) => ({
			type: UIContainer,
			position: { x: 0, y: index * 44 },
			size: { width: 240, height: 40 },
			anchor: mod.UIAnchor.TopCenter,
			childrenParams: factionRowChildren(faction),
		})) as UIContainer.ChildParams<UIContainer.Params>[],
	});
}

/** Child params for a single faction's ticket row (short-name label + live ticket count). */
function factionRowChildren(faction: number): UIContainer.ChildParams<UIText.Params>[] {
	const definition = FACTIONS[faction as 1 | 2 | 3];
	return [
		{
			type: UIText,
			position: { x: 10, y: 0 },
			size: { width: 100, height: 40 },
			anchor: mod.UIAnchor.TopLeft,
			textColor: FACTION_COLORS[faction],
			textSize: 22,
			message: mod.Message(definition.shortName),
		} as UIContainer.ChildParams<UIText.Params>,
		{
			type: UIText,
			position: { x: 0, y: 0 },
			size: { width: 100, height: 40 },
			anchor: mod.UIAnchor.TopRight,
			textColor: UI.COLORS.WHITE,
			textSize: 22,
			message: () => mod.Message(String(ticketSignals[faction]())),
		} as UIContainer.ChildParams<UIText.Params>,
	];
}

const scoreboardsByPlayer = new Map<mod.Player, UIContainer>();

Events.OnPlayerDeployed.subscribe((eventPlayer) => {
	if (!scoreboardsByPlayer.has(eventPlayer)) {
		scoreboardsByPlayer.set(eventPlayer, buildScoreboard(eventPlayer));
	}
});

Events.OnPlayerLeaveGame.subscribe((_eventNumber) => {
	// See player-state.ts's header note: OnPlayerLeaveGame's bare-number payload can't map back
	// to a specific scoreboardsByPlayer entry. Stale UIContainers are harmless overlay instances
	// that simply stop receiving updates once their owning player's client disconnects.
});

export { factionRowChildren };
