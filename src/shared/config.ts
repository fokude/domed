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

	doubleJumpVelocity: 55,

	// Roblox FieldOfView is vertical; 80 is roughly 110 horizontal at 16:9.
	baseFov: 80,
	speedFovBoost: 12,
};

export const WeaponConfig = {
	cooldown: 0.9,
	range: 1000,
	bodyShotKnockback: 70,
};

export const MatchConfig = {
	respawnTime: 1.5,
	spawnProtection: 1.5,
	// Seconds the end-of-match podium stays up.
	resultsTime: 8,
	// Seconds in the menu between matches.
	intermissionTime: 15,
};

export const DeathmatchConfig = {
	timeLimit: 600,
	killTarget: 40,
};
