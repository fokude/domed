// Red and Blue teams for team modes: creates the Team instances, balances players between
// them, keeps team scores, and picks team spawns.

import { TeamBalanceConfig } from "shared/config";
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

// Team of each player (by UserId) in the previous split, so the next one can rotate teammates.
let lastSplit = new Map<number, TeamId>();

type Split = TeamId[];

function imbalance(split: Split, skills: number[]): number {
	let difference = 0;
	split.forEach((team, index) => (difference += team === "Red" ? skills[index] : -skills[index]));
	return math.abs(difference);
}

// Pairs of players who were teammates last match and would be again.
function repeatedPairs(players: Player[], split: Split): number {
	let repeats = 0;
	for (let i = 0; i < players.size(); i++) {
		for (let j = i + 1; j < players.size(); j++) {
			const [a, b] = [lastSplit.get(players[i].UserId), lastSplit.get(players[j].UserId)];
			if (a !== undefined && a === b && split[i] === split[j]) repeats += 1;
		}
	}
	return repeats;
}

// Strongest first, each to the team that keeps sizes within one and has less total skill.
function greedySplit(skills: number[]): Split {
	const order = skills.map((_, index) => index).sort((a, b) => skills[a] > skills[b]);
	const split: Split = skills.map(() => "Red");
	const [count, total] = [
		{ Red: 0, Blue: 0 },
		{ Red: 0, Blue: 0 },
	];
	for (const index of order) {
		let team: TeamId;
		if (count.Red !== count.Blue) team = count.Red < count.Blue ? "Red" : "Blue";
		else team = total.Red <= total.Blue ? "Red" : "Blue";
		split[index] = team;
		count[team] += 1;
		total[team] += skills[index];
	}
	return split;
}

// Random split with team sizes within one.
function randomSplit(size: number): Split {
	const order = new Array<number>(size, 0).map((_, index) => index);
	for (let i = size - 1; i > 0; i--) {
		const j = math.random(0, i);
		[order[i], order[j]] = [order[j], order[i]];
	}
	const split: Split = new Array<TeamId>(size, "Red");
	order.forEach((index, position) => (split[index] = position % 2 === 0 ? "Red" : "Blue"));
	return split;
}

// Splits players into fair teams that rotate between matches: of all splits close to the most
// balanced, picks one that repeats the fewest teammate pairs from last time.
function splitTeams(players: Player[]): Map<Player, TeamId> {
	const skills = players.map((player) => getRating(player).mu);
	const candidates: Split[] = [greedySplit(skills)];
	for (let i = 0; i < TeamBalanceConfig.candidates; i++) candidates.push(randomSplit(players.size()));

	const best = math.min(...candidates.map((split) => imbalance(split, skills)));
	const fair = candidates.filter((split) => imbalance(split, skills) <= best + TeamBalanceConfig.tolerance);
	const fewestRepeats = math.min(...fair.map((split) => repeatedPairs(players, split)));
	const finalists = fair.filter((split) => repeatedPairs(players, split) === fewestRepeats);
	const chosen = finalists[math.random(0, finalists.size() - 1)];

	const result = new Map<Player, TeamId>();
	lastSplit = new Map();
	players.forEach((player, index) => {
		result.set(player, chosen[index]);
		lastSplit.set(player.UserId, chosen[index]);
	});
	return result;
}

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

		for (const [player, team] of splitTeams(Players.GetPlayers())) {
			player.Neutral = false;
			player.Team = this.teams.get(team);
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
