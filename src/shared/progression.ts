import { PlayerSettings } from "./settings";

// Saved player progression: lifetime stats, XP and levels. The server saves it; each player's
// client reads it from the PROFILE_ATTRIBUTE player attribute (JSON).

export interface LifetimeStats {
	kills: number;
	deaths: number;
	wins: number;
	matches: number;
	flagCaptures: number;
	pointCaptures: number;
	hardpointSeconds: number;
	playSeconds: number;
	topSpeed: number;
	longestHeadshot: number;
}

// "intro" marks a player's first deploy; the tip keys mark each first-minute lesson as done.
export type OnboardingKey = "intro" | "shootTip" | "bhopTip" | "strafeTip" | "doubleJumpTip" | "bodyShotTip";
export const ONBOARDING_KEYS: OnboardingKey[] = [
	"intro",
	"shootTip",
	"bhopTip",
	"strafeTip",
	"doubleJumpTip",
	"bodyShotTip",
];

// Hidden team-mode skill: estimate and uncertainty. Saved, but never sent to clients.
export interface PlayerRating {
	mu: number;
	sigma: number;
}

export interface PlayerProfile {
	xp: number;
	stats: LifetimeStats;
	onboarding: Partial<Record<OnboardingKey, boolean>>;
	rating: PlayerRating;
	settings: PlayerSettings;
}

// What the client receives: everything except the hidden rating.
export type VisibleProfile = Omit<PlayerProfile, "rating">;

// Player attribute holding the player's own profile as JSON.
export const PROFILE_ATTRIBUTE = "Profile";

// XP needed to go from `level` to `level + 1`. Grows slowly so early levels come quickly.
export function xpToNextLevel(level: number): number {
	return 100 + 50 * (level - 1);
}

// Level for a total XP amount, and progress through that level.
export function levelForXp(xp: number): { level: number; into: number; needed: number } {
	let level = 1;
	let remaining = xp;
	while (remaining >= xpToNextLevel(level)) {
		remaining -= xpToNextLevel(level);
		level += 1;
	}
	return { level, into: remaining, needed: xpToNextLevel(level) };
}
