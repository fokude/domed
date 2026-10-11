import { DeathmatchConfig } from "shared/config";
import { getStandings } from "shared/standings";
import { LoadedMap } from "../../maps/loader";
import { pickSafestSpawn } from "../../spawning";
import { GameMode, MatchResult } from "./types";

const Players = game.GetService("Players");

export class Deathmatch implements GameMode {
	readonly id = "Deathmatch";
	readonly timeLimit = DeathmatchConfig.timeLimit;
	readonly scoreTarget = DeathmatchConfig.killTarget;
	private readonly spawns: CFrame[];

	constructor(map: LoadedMap) {
		this.spawns = map.spawns.map((spawn) => spawn.cframe);
	}

	canDamage() {
		return true;
	}

	onKill() {}

	addPlayer() {}

	removePlayer() {}

	pickSpawn(player: Player) {
		return pickSafestSpawn(player, this.spawns, () => true);
	}

	onDeath() {}

	checkWinner(): MatchResult | undefined {
		const leader = getStandings(Players.GetPlayers())[0];
		return leader && leader.kills >= this.scoreTarget ? this.timeUpResult() : undefined;
	}

	timeUpResult(): MatchResult {
		const leader = getStandings(Players.GetPlayers())[0];
		return { title: leader ? `${leader.name} WINS` : "MATCH OVER" };
	}

	stop() {}
}
