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

export const TeamDeathmatchConfig = {
	timeLimit: 600,
	killTarget: 50,
};

export const DominationConfig = {
	timeLimit: 600,
	scoreTarget: 200,
	// Seconds for one player to capture a point; each extra teammate (up to 3) speeds it up.
	captureTime: 6,
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
