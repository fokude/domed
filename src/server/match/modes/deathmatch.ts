import { DeathmatchConfig, RatingConfig } from "shared/config";
import { getStandings } from "shared/standings";
import { LoadedMap } from "../../maps/loader";
import { DuelRecord, rateHeadToHead } from "../../rating";
import { pickSafestSpawn } from "../../spawning";
import { GameMode, MatchResult } from "./types";

const Players = game.GetService("Players");

export class Deathmatch implements GameMode {
	readonly id = "Deathmatch";
	readonly timeLimit: number;
	readonly scoreTarget: number;
	private readonly spawns: CFrame[];
	private readonly duels: DuelRecord = new Map();

	constructor(map: LoadedMap) {
		const small = Players.GetPlayers().size() <= DeathmatchConfig.smallLobbyMaxPlayers;
		this.timeLimit = small ? DeathmatchConfig.smallLobbyTimeLimit : DeathmatchConfig.timeLimit;
		this.scoreTarget = small ? DeathmatchConfig.smallLobbyKillTarget : DeathmatchConfig.killTarget;
		this.spawns = map.spawns.map((spawn) => spawn.cframe);
	}

	canDamage() {
		return true;
	}

	onKill(shooter: Player, victim: Player) {
		const record = this.duels.get(shooter) ?? new Map<Player, number>();
		record.set(victim, (record.get(victim) ?? 0) + 1);
		this.duels.set(shooter, record);
	}

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
		if (!leader) return { title: "MATCH OVER", winners: [] };
		const winner = Players.GetPlayers().find((player) => player.UserId === leader.userId);
		return { title: `${leader.name} WINS`, winners: winner ? [winner] : [] };
	}

	rateMatch(participants: Player[]) {
		rateHeadToHead(participants, this.duels, RatingConfig.freeForAllWeight);
	}

	stop() {}
}
