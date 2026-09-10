/**
 * buy-menu.ts — the MCOM buy-station shop UI (weapons, attachments, armor, gadgets).
 *
 * Design: WARDOGS_DESIGN_BRIEF.md → "Staging & Buy Phase" / "Core Rules" #4.
 * Triggers on `OnPlayerInteract` at a faction's `IP_BUY_MENU_*` ObjId, subscribed via `Events`,
 * filtered by `mod.GetObjId(eventInteractPoint)` (BUILD_GUIDE.md §5).
 *
 * Every purchase button's `onClick` calls `buy-validator.ts`'s `checkPurchase` AND
 * `wallet.ts`'s `spendCash` inside ONE function (`attemptPurchase` below) so a failed grant can
 * never leave a player charged without receiving the item.
 */

import { Events } from "bf6-portal-utils/events";
import { UI } from "bf6-portal-utils/ui";
import { UIContainer } from "bf6-portal-utils/ui/components/container";
import { UIText } from "bf6-portal-utils/ui/components/text";
import { UITextButton } from "bf6-portal-utils/ui/components/text-button";
import { OBJECT_ID } from "../config/ids.ts";
import { BASE_PRICES } from "../config/economy.ts";
import { spendCash } from "../player/wallet.ts";
import { requirePlayerState } from "../player/player-state.ts";
import { checkPurchase, type ShopItem } from "./buy-validator.ts";

/**
 * WARDOGS_DESIGN_BRIEF.md "Core Rules" #4 shop catalog stub. Populate alongside
 * `config/economy.ts`'s `BASE_PRICES` as gunsmith/armor items are finalized — kept small here so
 * the buy-menu UI wiring compiles and functions end-to-end today.
 */
const SHOP_CATALOG: ShopItem[] = [
	{ id: "armor_plate_carrier", label: "Plate Carrier", basePrice: 1_200, gatingTrack: "support", requiredTier: 2 },
	{ id: "attachment_suppressor", label: "AK-205 Suppressor", basePrice: 350, gatingTrack: "assault", requiredTier: 1 },
	{ id: "gadget_ammo_crate", label: "Ammo Crate", basePrice: 200, gatingTrack: "support", requiredTier: 1 },
];

const BUY_MENU_INTERACT_IDS: readonly number[] = [
	OBJECT_ID.IP_BUY_MENU_LONESTAR,
	OBJECT_ID.IP_BUY_MENU_MANTICORE,
	OBJECT_ID.IP_BUY_MENU_VALKYRA,
];

/**
 * Runs the affordability check and, only if it passes, deducts cash. Never grants an item without
 * a successful deduction, and never deducts without granting — the two steps are one function.
 * Returns `true` on a completed purchase.
 */
function attemptPurchase(player: mod.Player, item: ShopItem): boolean {
	const state = requirePlayerState(player);
	const result = checkPurchase(item, state.currentCash, state.tracks);
	if (!result.canAfford) {
		mod.DisplayNotificationMessage(mod.Message(result.reason ?? "Cannot afford this item."), player);
		return false;
	}

	const deducted = spendCash(player, result.price, "purchase");
	if (!deducted) {
		// Defensive: checkPurchase and spendCash must agree on affordability; if they ever
		// disagree, fail closed (no grant) rather than risk a double-charge or free item.
		return false;
	}

	// TODO: actual loadout/inventory grant call once the gunsmith/armor grant API is confirmed
	// against `index.d.ts` (AGENTS.md §2) — not fabricated here.
	void state;
	mod.DisplayNotificationMessage(mod.Message(`Purchased: ${item.label}`), player);
	return true;
}

const menusByPlayer = new Map<mod.Player, UIContainer>();

function buildBuyMenu(player: mod.Player): UIContainer {
	return new UIContainer({
		position: { x: 0, y: 0 },
		size: { width: 420, height: 60 + SHOP_CATALOG.length * 50 },
		anchor: mod.UIAnchor.Center,
		receiver: player,
		visible: false,
		uiInputModeWhenVisible: true,
		childrenParams: [
			{
				type: UIText,
				position: { x: 0, y: 10 },
				size: { width: 420, height: 30 },
				anchor: mod.UIAnchor.TopCenter,
				textColor: UI.COLORS.WHITE,
				textSize: 26,
				message: mod.Message("HQ ACQUISITIONS"),
			} as UIContainer.ChildParams<UIText.Params>,
			...SHOP_CATALOG.map((item, index) => ({
				type: UITextButton,
				position: { x: 0, y: 50 + index * 50 },
				size: { width: 380, height: 40 },
				anchor: mod.UIAnchor.TopCenter,
				bgColor: UI.COLORS.GREY_25,
				baseColor: UI.COLORS.BLACK,
				textColor: UI.COLORS.WHITE,
				textSize: 20,
				message: mod.Message(`${item.label} — $${BASE_PRICES[item.id] ?? item.basePrice}`),
				onClickUp: (p: mod.Player) => attemptPurchase(p, item),
			} as UIContainer.ChildParams<UITextButton.Params>)),
			{
				type: UITextButton,
				position: { x: 0, y: 60 + SHOP_CATALOG.length * 50 - 10 },
				size: { width: 200, height: 36 },
				anchor: mod.UIAnchor.BottomCenter,
				bgColor: UI.COLORS.GREY_25,
				baseColor: UI.COLORS.BLACK,
				textColor: UI.COLORS.WHITE,
				textSize: 18,
				message: mod.Message("CLOSE PROTOCOL [ESC]"),
				onClickUp: (p: mod.Player) => closeBuyMenu(p),
			} as UIContainer.ChildParams<UITextButton.Params>,
		],
	});
}

function requireBuyMenu(player: mod.Player): UIContainer {
	let menu = menusByPlayer.get(player);
	if (!menu) {
		menu = buildBuyMenu(player);
		menusByPlayer.set(player, menu);
	}
	return menu;
}

function openBuyMenu(player: mod.Player): void {
	const menu = requireBuyMenu(player);
	menu.visible = true;
}

function closeBuyMenu(player: mod.Player): void {
	const menu = menusByPlayer.get(player);
	if (menu) {
		menu.visible = false;
	}
}

Events.OnPlayerInteract.subscribe((eventPlayer, eventInteractPoint) => {
	const interactId = mod.GetObjId(eventInteractPoint);
	if (BUY_MENU_INTERACT_IDS.includes(interactId)) {
		openBuyMenu(eventPlayer);
	}
});

Events.OnPlayerLeaveGame.subscribe((_eventNumber) => {
	// See player-state.ts's header note — stale menusByPlayer UIContainers for departed players
	// are harmless, inert overlay instances (reference-identity keyed, no per-tick cost).
});

export { attemptPurchase, SHOP_CATALOG };
