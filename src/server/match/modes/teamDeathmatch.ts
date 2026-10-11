// Red against Blue: every headshot on an enemy scores for your team.

import { TeamDeathmatchConfig } from "shared/config";
import { LoadedMap } from "../../maps/loader";
import { TeamRoster } from "../teams";
import { GameMode, MatchResult } from "./types";

export class TeamDeathmatch implements GameMode {
	readonly id = "TeamDeathmatch";
	readonly timeLimit = TeamDeathmatchConfig.timeLimit;
	readonly scoreTarget = TeamDeathmatchConfig.killTarget;
	private readonly roster: TeamRoster;

	constructor(map: LoadedMap) {
		this.roster = new TeamRoster(map.spawns);
	}

	canDamage(shooter: Player, victim: Player) {
		return this.roster.isEnemy(shooter, victim);
	}

	onKill(shooter: Player) {
		const team = this.roster.teamOf(shooter);
		if (team) this.roster.addScore(team);
	}

	addPlayer(player: Player) {
		this.roster.assign(player);
	}

	removePlayer() {}

	pickSpawn(player: Player) {
		return this.roster.pickSpawn(player);
	}

	onDeath() {}

	checkWinner(): MatchResult | undefined {
		return this.roster.winner(this.scoreTarget);
	}

	timeUpResult(): MatchResult {
		return this.roster.timeUpResult();
	}

	rateMatch(participants: Player[], result: MatchResult) {
		this.roster.rateMatch(participants, result);
	}

	stop() {
		this.roster.destroy();
	}
}
