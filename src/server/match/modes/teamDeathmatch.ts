// Red against Blue: every kill on an enemy scores for your team.

import { RatingConfig, TeamDeathmatchConfig } from "shared/config";
import { LoadedMap } from "../../maps/loader";
import { DuelRecord, rateHeadToHead } from "../../rating";
import { TeamRoster } from "../teams";
import { GameMode, MatchResult } from "./types";

export class TeamDeathmatch implements GameMode {
	readonly id = "TeamDeathmatch";
	readonly timeLimit = TeamDeathmatchConfig.timeLimit;
	readonly scoreTarget = TeamDeathmatchConfig.killTarget;
	private readonly roster: TeamRoster;
	private readonly duels: DuelRecord = new Map();

	constructor(map: LoadedMap) {
		this.roster = new TeamRoster(map.spawns);
	}

	canDamage(shooter: Player, victim: Player) {
		return this.roster.isEnemy(shooter, victim);
	}

	onKill(shooter: Player, victim: Player) {
		const team = this.roster.teamOf(shooter);
		if (team) this.roster.addScore(team);
		const record = this.duels.get(shooter) ?? new Map<Player, number>();
		record.set(victim, (record.get(victim) ?? 0) + 1);
		this.duels.set(shooter, record);
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

	// The team result is the main signal; head-to-head kills add a smaller one. Kills are this
	// mode's objective, so this can't reward playing against the team. See docs/RATING.md.
	rateMatch(participants: Player[], result: MatchResult) {
		this.roster.rateMatch(participants, result);
		rateHeadToHead(participants, this.duels, RatingConfig.teamDeathmatchHeadToHeadWeight);
	}

	stop() {
		this.roster.destroy();
	}
}
