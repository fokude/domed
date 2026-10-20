// Watches for speed hacks and teleports. Clients simulate their own characters, so the server
// samples each character's position and flags horizontal movement far beyond anything the game
// allows. Thresholds are lenient: a lag spike can look like a short teleport, and kicking an
// innocent player is worse than missing a mild cheat.

import { getLiveRoot } from "shared/characters";
import { MovementConfig } from "shared/config";

const Players = game.GetService("Players");

const SAMPLE_INTERVAL = 0.5;
// Fastest legitimate horizontal speed: the air speed cap plus a rocket jump's blast, with
// headroom for a jump pad's push.
const MAX_HORIZONTAL_SPEED = MovementConfig.maxAirSpeed + MovementConfig.rocketJumpVelocity + 80;
// Kick after this many violations within the window.
const STRIKES_TO_KICK = 4;
const STRIKE_WINDOW = 20;

interface Track {
	character: Model;
	position: Vector3;
	strikes: number[];
}

const tracks = new Map<Player, Track>();

function sample(player: Player) {
	const root = getLiveRoot(player);
	const character = player.Character;
	if (!root || !character) {
		tracks.delete(player);
		return;
	}

	const track = tracks.get(player);
	// A new character spawns somewhere else entirely, so start tracking afresh.
	if (!track || track.character !== character) {
		tracks.set(player, { character, position: root.Position, strikes: [] });
		return;
	}

	const moved = root.Position.sub(track.position);
	track.position = root.Position;
	const horizontalSpeed = new Vector3(moved.X, 0, moved.Z).Magnitude / SAMPLE_INTERVAL;
	if (horizontalSpeed <= MAX_HORIZONTAL_SPEED) return;

	const now = os.clock();
	track.strikes = track.strikes.filter((time) => now - time < STRIKE_WINDOW);
	track.strikes.push(now);
	warn(
		`[anticheat] ${player.Name} (${player.UserId}): moved ${math.floor(horizontalSpeed)} studs/s, ` +
			`strike ${track.strikes.size()} of ${STRIKES_TO_KICK}`,
	);
	if (track.strikes.size() >= STRIKES_TO_KICK) {
		player.Kick("Disconnected for unusual movement. If this was a mistake, please rejoin.");
	}
}

export function startMovementCheck() {
	Players.PlayerRemoving.Connect((player) => tracks.delete(player));
	task.spawn(() => {
		for (;;) {
			task.wait(SAMPLE_INTERVAL);
			for (const player of Players.GetPlayers()) sample(player);
		}
	});
}
