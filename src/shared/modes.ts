export type ModeId = "Deathmatch" | "TeamDeathmatch" | "CTF";
export type TeamId = "Red" | "Blue";

export const MODE_IDS: ModeId[] = ["Deathmatch", "TeamDeathmatch", "CTF"];
export const TEAM_IDS: TeamId[] = ["Red", "Blue"];

export const TEAM_COLORS: Record<TeamId, Color3> = {
	Red: Color3.fromRGB(255, 70, 60),
	Blue: Color3.fromRGB(40, 140, 255),
};

export const MODE_NAMES: Record<ModeId, string> = {
	Deathmatch: "DEATHMATCH",
	TeamDeathmatch: "TEAM DEATHMATCH",
	CTF: "CAPTURE THE FLAG",
};
