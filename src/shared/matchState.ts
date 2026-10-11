// Match state replicated to clients as attributes on ReplicatedStorage.MatchState. The server
// writes; clients read and listen. Attributes also reach players who join mid-match, which
// one-off remote events would miss.

import { ModeId } from "./modes";

export type Phase = "Playing" | "Results" | "Voting";
export type FlagStatus = "Home" | "Taken" | "Dropped";

export interface MatchStateValues {
	Phase: Phase;
	Mode: ModeId;
	MapName: string;
	// Server time (Workspace.GetServerTimeNow) when the current phase ends.
	EndsAt: number;
	// Kills to win in deathmatch, captures to win in CTF.
	ScoreTarget: number;
	RedScore: number;
	BlueScore: number;
	RedFlag: FlagStatus;
	BlueFlag: FlagStatus;
	// JSON-encoded VoteOption[] and number[] during the Voting phase.
	VoteOptions: string;
	VoteCounts: string;
}

export interface VoteOption {
	mapName: string;
	tagline: string;
	mode: ModeId;
	// Hex color, since Color3 doesn't survive JSON.
	themeColor: string;
}

export type MatchStateKey = keyof MatchStateValues;

// Player attribute: true while the player is in the match rather than the menu.
export const DEPLOYED_ATTRIBUTE = "Deployed";
// Player attribute: true while carrying a flag in CTF.
export const CARRYING_FLAG_ATTRIBUTE = "CarryingFlag";

const folder = game.GetService("ReplicatedStorage").WaitForChild("MatchState");

export function getMatchState<K extends MatchStateKey>(key: K): MatchStateValues[K] | undefined {
	return folder.GetAttribute(key) as MatchStateValues[K] | undefined;
}

export function setMatchState<K extends MatchStateKey>(key: K, value: MatchStateValues[K]) {
	folder.SetAttribute(key, value);
}

export function onMatchStateChanged(keys: MatchStateKey[], callback: () => void): RBXScriptConnection[] {
	return keys.map((key) => folder.GetAttributeChangedSignal(key).Connect(callback));
}
