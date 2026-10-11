// Red and Blue teams for team modes: creates the Team instances, balances players between
// them, keeps team scores, and picks team spawns.

import { setMatchState } from "shared/matchState";
import { TEAM_IDS, TeamId } from "shared/modes";
import { SpawnPoint } from "../maps/loader";
import { pickSafestSpawn } from "../spawning";
import { MatchResult } from "./modes/types";

const Players = game.GetService("Players");
const Teams = game.GetService("Teams");

const TEAM_BRICK_COLORS: Record<TeamId, BrickColor> = {
	Red: new BrickColor("Bright red"),
	Blue: new BrickColor("Bright blue"),
};

export class TeamRoster {
	private readonly teams = new Map<TeamId, Team>();
	private readonly scores = new Map<TeamId, number>();

	constructor(private readonly spawns: SpawnPoint[]) {
		for (const id of TEAM_IDS) {
			const team = new Instance("Team");
			team.Name = id;
			team.TeamColor = TEAM_BRICK_COLORS[id];
			team.AutoAssignable = false;
			team.Parent = Teams;
			this.teams.set(id, team);
			this.scores.set(id, 0);
			this.publishScore(id);
		}
	}

	teamOf(player: Player): TeamId | undefined {
		return TEAM_IDS.find((id) => this.teams.get(id) === player.Team);
	}

	color(team: TeamId): Color3 {
		return this.teams.get(team)!.TeamColor.Color;
	}

	isEnemy(a: Player, b: Player): boolean {
		return this.teamOf(a) !== this.teamOf(b);
	}

	// Puts a player without a team on the smaller one.
	assign(player: Player) {
		if (this.teamOf(player)) return;
		const counts = TEAM_IDS.map((id) =>
			Players.GetPlayers()
				.filter((other) => other.Team === this.teams.get(id))
				.size(),
		);
		player.Neutral = false;
		player.Team = this.teams.get(counts[0] <= counts[1] ? TEAM_IDS[0] : TEAM_IDS[1]);
	}

	// Team spawns when the map has them, otherwise any spawn, away from enemies.
	pickSpawn(player: Player): CFrame | undefined {
		const team = this.teamOf(player);
		const own = this.spawns.filter((spawn) => spawn.team === team).map((spawn) => spawn.cframe);
		const candidates = own.size() > 0 ? own : this.spawns.map((spawn) => spawn.cframe);
		return pickSafestSpawn(player, candidates, (other) => this.teamOf(other) !== team);
	}

	addScore(team: TeamId) {
		this.scores.set(team, this.scores.get(team)! + 1);
		this.publishScore(team);
	}

	winner(target: number): MatchResult | undefined {
		const team = TEAM_IDS.find((id) => this.scores.get(id)! >= target);
		return team ? { title: `${team.upper()} TEAM WINS` } : undefined;
	}

	timeUpResult(): MatchResult {
		const red = this.scores.get("Red")!;
		const blue = this.scores.get("Blue")!;
		if (red === blue) return { title: "DRAW" };
		return { title: `${red > blue ? "RED" : "BLUE"} TEAM WINS` };
	}

	destroy() {
		for (const player of Players.GetPlayers()) {
			player.Team = undefined;
			player.Neutral = true;
		}
		for (const [, team] of this.teams) {
			team.Destroy();
		}
	}

	private publishScore(team: TeamId) {
		setMatchState(team === "Red" ? "RedScore" : "BlueScore", this.scores.get(team)!);
	}
}
