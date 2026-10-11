import { ModeId } from "./modes";

// Gameplay tuning shared by server and client.

export const MovementConfig = {
	walkSpeed: 26,
	jumpHeight: 7.5,

	// Air strafing follows the Quake/Half-Life model: the air speed cap is tiny,
	// so speed is only gained by strafing while turning the camera.
	airAccelerate: 30,
	airSpeedCap: 6,
	maxAirSpeed: 140,

	// Seconds you can touch the ground after landing and still keep air speed.
	bhopWindow: 0.2,
	bhopSpeedLoss: 0,
	// Low-speed strafing gains little because each push swings the velocity a long way, so
	// chained hops get a boost until hopBoostMaxSpeed. 0 turns it off.
	hopBoost: 0.12,
	hopBoostMaxSpeed: 50,

	doubleJumpVelocity: 55,

	// Roblox FieldOfView is vertical; 80 is roughly 110 horizontal at 16:9.
	baseFov: 80,
	speedFovBoost: 12,
};

export const XpConfig = {
	kill: 10,
	flagCapture: 50,
	pointCapture: 25,
	hardpointSecond: 2,
	// Finishing a match only pays if the player did something: a kill or objective play.
	matchCompleted: 40,
	win: 60,
	// Most XP one player can earn in a match, so idle servers and farming don't pay off.
	matchCap: 800,
};

// Hidden team-mode skill rating (see server/rating.ts). Defaults follow OpenSkill.
export const RatingConfig = {
	initialMu: 25,
	initialSigma: 25 / 3,
	// Skill gap that gives the stronger side roughly a 75% chance to win.
	beta: 25 / 6,
	// Floor on how far one match can shrink a player's uncertainty.
	kappa: 0.0001,
};

export const TeamBalanceConfig = {
	// Random team splits tried at match start, alongside the most balanced one.
	candidates: 64,
	// Splits within this much total skill (mu) of the most balanced count as fair; among them the
	// one that repeats the fewest teammate pairs from last match is picked, so teams rotate.
	tolerance: 4,
};

export const WeaponConfig = {
	cooldown: 0.9,
	range: 1000,
	bodyShotKnockback: 70,
};

export const MatchConfig = {
	respawnTime: 1.5,
	// Objective modes (CTF, Domination, Hardpoint) respawn slower, so killing defenders opens
	// a window to make progress.
	objectiveRespawnTime: 5,
	spawnProtection: 1.5,
	// Seconds the end-of-match podium stays up.
	resultsTime: 8,
	// Seconds in the menu between matches.
	intermissionTime: 15,
};

export const DeathmatchConfig = {
	timeLimit: 600,
	killTarget: 40,
	// Small lobbies get a shorter match with a lower target, so a near-empty server still plays well.
	smallLobbyMaxPlayers: 3,
	smallLobbyTimeLimit: 300,
	smallLobbyKillTarget: 15,
};

// Players needed before a mode is offered in rotation and votes. Below this the server sticks to
// free-for-all. Studio's /map command ignores these.
export const ModeMinPlayers: Record<ModeId, number> = {
	Deathmatch: 1,
	TeamDeathmatch: 4,
	Domination: 4,
	Hardpoint: 4,
	CTF: 6,
};

export const TeamDeathmatchConfig = {
	timeLimit: 600,
	killTarget: 50,
};

export const DominationConfig = {
	timeLimit: 600,
	scoreTarget: 200,
	// Seconds for one player to capture a point; each extra teammate (up to 3) speeds it up.
	captureTime: 12,
};

export const HardpointConfig = {
	timeLimit: 600,
	scoreTarget: 150,
	// Seconds before the hardpoint moves to the next location.
	rotateEvery: 60,
};

export const CtfConfig = {
	timeLimit: 900,
	captureTarget: 3,
	// Seconds a dropped flag waits before returning home on its own.
	flagReturnTime: 20,
	// Top air speed while carrying a flag, so defenders can catch runners.
	carrierMaxSpeed: 55,
	pickupRadius: 5,
	captureRadius: 7,
};
