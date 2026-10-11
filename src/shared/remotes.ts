// Typed handles to the RemoteEvents declared in default.project.json.
// The server receives arguments as `unknown` regardless, so it must validate them.

import { OnboardingKey } from "./progression";
import { Standing } from "./standings";

const folder = game.GetService("ReplicatedStorage").WaitForChild("Remotes");

function remote<T extends Callback>(name: string) {
	return folder.WaitForChild(name) as RemoteEvent<T>;
}

export type HitKind = "kill" | "body";

export const Remotes = {
	Fire: remote<(origin: Vector3, hitPosition: Vector3, hitPart: BasePart | undefined) => void>("Fire"),
	ShotFired: remote<(shooter: Player, origin: Vector3, hitPosition: Vector3) => void>("ShotFired"),
	HitConfirm: remote<(kind: HitKind) => void>("HitConfirm"),
	Knockback: remote<(impulse: Vector3) => void>("Knockback"),
	// Either player may have left by the time a client receives this.
	KillFeed: remote<(killer?: Player, victim?: Player) => void>("KillFeed"),
	// Client reports that the player has seen an onboarding step.
	MarkOnboarding: remote<(key: OnboardingKey) => void>("MarkOnboarding"),
	CastVote: remote<(optionIndex: number) => void>("CastVote"),
	// Client asks to leave the menu and join the match in progress.
	Deploy: remote<() => void>("Deploy"),
	Announce: remote<(text: string, duration: number) => void>("Announce"),
	MatchEnded: remote<(title: string, standings: Standing[], duration: number) => void>("MatchEnded"),
};
