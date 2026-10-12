// Typed handles to the RemoteEvents declared in default.project.json.
// The server receives arguments as `unknown` regardless, so it must validate them.

import { PerkId } from "./perks";
import { OnboardingKey } from "./progression";
import { PlayerSettings } from "./settings";
import { Standing } from "./standings";

const folder = game.GetService("ReplicatedStorage").WaitForChild("Remotes");

function remote<T extends Callback>(name: string) {
	return folder.WaitForChild(name) as RemoteEvent<T>;
}

export type HitKind = "kill" | "body" | "shield";
// Someone in a fight: a player, or a bot by display name.
export type Combatant = Player | string;
export type PersonalBestRecord = "topSpeed" | "longestHeadshot";
// How a player was killed, for their death recap.
// Server-wide moments the whole lobby hears about (see server/streaks.ts).
export type BroadcastKind = "KillingSpree" | "Rampage" | "Godlike" | "Shutdown";
export type DeathCause = "headshot" | "knockback";

export const Remotes = {
	Fire: remote<(origin: Vector3, hitPosition: Vector3, hitPart: BasePart | undefined) => void>("Fire"),
	// The shooter is undefined for bots.
	ShotFired: remote<(shooter: Player | undefined, origin: Vector3, hitPosition: Vector3) => void>("ShotFired"),
	// `practice` is true for hits on training dummies, which earn no XP and don't count toward streaks.
	HitConfirm: remote<(kind: HitKind, practice: boolean) => void>("HitConfirm"),
	Knockback: remote<(impulse: Vector3) => void>("Knockback"),
	// Either player may have left by the time a client receives this.
	// `cause` "knockback" is a ring-out: knocked into a hazard or off the map.
	KillFeed: remote<(killer?: Combatant, victim?: Combatant, cause?: DeathCause) => void>("KillFeed"),
	// Client reports that the player has seen an onboarding step.
	MarkOnboarding: remote<(key: OnboardingKey) => void>("MarkOnboarding"),
	// Sent to each player as a match ends: XP earned this match, and the level they're now on.
	MatchXp: remote<(earned: number, level: number, leveledUp: boolean) => void>("MatchXp"),
	// Sent to a player who was just killed: how, from how far, and how fast the killer was moving.
	// The killer's character (a player's or a bot's) may be gone by the time it arrives.
	DeathRecap:
		remote<(killerCharacter: Model | undefined, cause: DeathCause, distance: number, killerSpeed: number) => void>(
			"DeathRecap",
		),
	// To everyone: a streak worth announcing (`subject` is on it), or a Shutdown (`other` ended
	// `subject`'s streak).
	Broadcast: remote<(kind: BroadcastKind, subject: Combatant, other?: Combatant) => void>("Broadcast"),
	// Sent to a shooter whose miss passed close to a head they could have hit.
	NearMiss: remote<() => void>("NearMiss"),
	// Sent to a player who just beat one of their saved records.
	PersonalBest: remote<(record: PersonalBestRecord, value: number) => void>("PersonalBest"),
	// Everyone is told when a player takes a perk, so there's counterplay.
	PerkTaken: remote<(taker: Player, perk: PerkId) => void>("PerkTaken"),
	// Client shoves in the direction it's looking. The server picks who, if anyone, is hit.
	Shove: remote<(direction: Vector3) => void>("Shove"),
	// Client reports it used a held perk (the Super Jump is triggered by client movement).
	UsePerk: remote<(perk: PerkId) => void>("UsePerk"),
	// Particle burst at a killed target's head, shown to everyone (players and training dummies).
	HeadBurst: remote<(position: Vector3) => void>("HeadBurst"),
	// Client saves the player's settings. The server sanitizes them.
	SaveSettings: remote<(settings: PlayerSettings) => void>("SaveSettings"),
	CastVote: remote<(optionIndex: number) => void>("CastVote"),
	// Client asks to leave the menu and join the match in progress.
	Deploy: remote<() => void>("Deploy"),
	// Client asks to leave the match for the menu.
	LeaveToMenu: remote<() => void>("LeaveToMenu"),
	Announce: remote<(text: string, duration: number) => void>("Announce"),
	MatchEnded: remote<(title: string, standings: Standing[], duration: number) => void>("MatchEnded"),
};
