// Red and Blue teams for team modes: creates the Team instances, balances players between
// them, keeps team scores, and picks team spawns.

import { setMatchState } from "shared/matchState";
import { TEAM_IDS, TeamId } from "shared/modes";
import { SpawnPoint } from "../maps/loader";
import { getRating } from "../rating";
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

		// Split everyone already here by skill before the match starts: strongest first, each to
		// whichever team keeps sizes within one and has less total skill.
		const bySkill = [...Players.GetPlayers()].sort((a, b) => getRating(a).mu > getRating(b).mu);
		for (const player of bySkill) this.assign(player);
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

	members(team: TeamId): Player[] {
		return Players.GetPlayers().filter((player) => player.Team === this.teams.get(team));
	}

	// Puts a player without a team on the smaller team, or if they're level, the one with less
	// total hidden skill.
	assign(player: Player) {
		if (this.teamOf(player)) return;
		const [red, blue] = TEAM_IDS.map((id) => this.members(id));
		let team: TeamId;
		if (red.size() !== blue.size()) {
			team = red.size() < blue.size() ? "Red" : "Blue";
		} else {
			const skill = (members: Player[]) => members.reduce((sum, member) => sum + getRating(member).mu, 0);
			team = skill(red) <= skill(blue) ? "Red" : "Blue";
		}
		player.Neutral = false;
		player.Team = this.teams.get(team);
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
		return team ? this.teamWin(team) : undefined;
	}

	timeUpResult(): MatchResult {
		const red = this.scores.get("Red")!;
		const blue = this.scores.get("Blue")!;
		if (red === blue) return { title: "DRAW", winners: [] };
		return this.teamWin(red > blue ? "Red" : "Blue");
	}

	private teamWin(team: TeamId): MatchResult {
		const winners = this.members(team);
		return { title: `${team.upper()} TEAM WINS`, winners };
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
