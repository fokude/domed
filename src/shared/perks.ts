// Perks: one-time or short effects from orbs on the map. The server grants them and stores
// them as player attributes; clients read the attributes to apply movement, weapon and HUD
// effects. See docs/PERKS.md.

import { PerkConfig, WeaponConfig } from "./config";

const Workspace = game.GetService("Workspace");

export type PerkId = "SuperJump" | "Shield" | "Overcharge" | "Radar";
export const PERK_IDS: PerkId[] = ["SuperJump", "Shield", "Overcharge", "Radar"];

export const PERK_INFO: Record<PerkId, { name: string; color: Color3 }> = {
	SuperJump: { name: "SUPER JUMP", color: Color3.fromRGB(120, 255, 120) },
	Shield: { name: "SHIELD", color: Color3.fromRGB(80, 200, 255) },
	Overcharge: { name: "OVERCHARGE", color: Color3.fromRGB(255, 200, 40) },
	Radar: { name: "RADAR", color: Color3.fromRGB(255, 80, 200) },
};

// Player attributes holding perk effects. SuperJump and Shield are true while held; the others
// hold the server time their effect ends.
export const PerkAttribute = {
	SuperJump: "PerkSuperJump",
	Shield: "PerkShield",
	OverchargeUntil: "PerkOverchargeUntil",
	RadarUntil: "PerkRadarUntil",
} as const;

// Seconds left on a timed perk, or 0.
export function timeLeft(player: Player, attribute: string): number {
	const endsAt = player.GetAttribute(attribute);
	return typeIs(endsAt, "number") ? math.max(0, endsAt - Workspace.GetServerTimeNow()) : 0;
}

// Rail cooldown for a player, shortened while overcharged. Used by both client and server.
export function railCooldown(player: Player): number {
	const overcharged = timeLeft(player, PerkAttribute.OverchargeUntil) > 0;
	return overcharged ? WeaponConfig.cooldown * PerkConfig.overchargeCooldownScale : WeaponConfig.cooldown;
}
