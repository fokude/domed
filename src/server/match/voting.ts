// Map vote between matches. Players pick one of a few map and mode combinations; the most
// votes wins, ties are broken at random, and no votes at all picks at random.

import { setMatchState, VoteOption } from "shared/matchState";
import { Remotes } from "shared/remotes";
import { getMapModel } from "../maps/library";
import { readMapInfo } from "../maps/loader";
import type { MatchOption } from "./controller";

const HttpService = game.GetService("HttpService");
const Players = game.GetService("Players");

const OPTION_COUNT = 3;

let options: MatchOption[] = [];
const votes = new Map<Player, number>();

function publishCounts() {
	const counts = options.map(() => 0);
	for (const [, choice] of votes) counts[choice] += 1;
	setMatchState("VoteCounts", HttpService.JSONEncode(counts));
}

function describe(option: MatchOption): VoteOption {
	const info = readMapInfo(getMapModel(option.mapId)!);
	return { mapName: info.name, tagline: info.tagline, mode: option.mode, themeColor: info.themeColor.ToHex() };
}

function shuffle<T>(items: T[]): T[] {
	const result = [...items];
	for (let i = result.size() - 1; i > 0; i--) {
		const j = math.random(0, i);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

// Prefers distinct maps and leaves out the match that just ended when there's enough choice.
export function pickVoteOptions(all: MatchOption[], previous: MatchOption | undefined): MatchOption[] {
	const fresh = all.filter((option) => !(option.mapId === previous?.mapId && option.mode === previous?.mode));
	const pool = shuffle(fresh.size() >= OPTION_COUNT ? fresh : all);

	const picked: MatchOption[] = [];
	for (const option of pool) {
		if (picked.size() < OPTION_COUNT && !picked.some((other) => other.mapId === option.mapId)) picked.push(option);
	}
	for (const option of pool) {
		if (picked.size() < OPTION_COUNT && !picked.includes(option)) picked.push(option);
	}
	return picked;
}

// Runs a vote for `duration` seconds and returns the winning option.
export function runVote(choices: MatchOption[], duration: number): MatchOption {
	options = choices;
	votes.clear();
	setMatchState("VoteOptions", HttpService.JSONEncode(choices.map(describe)));
	publishCounts();

	task.wait(duration);

	const counts = choices.map(() => 0);
	for (const [player, choice] of votes) {
		if (player.Parent) counts[choice] += 1;
	}
	const best = math.max(...counts);
	const leaders = choices.filter((_, index) => counts[index] === best);
	options = [];
	return leaders[math.random(0, leaders.size() - 1)];
}

export function startVoting() {
	Remotes.CastVote.OnServerEvent.Connect((player, index) => {
		if (!typeIs(index, "number") || index % 1 !== 0 || index < 0 || index >= options.size()) return;
		votes.set(player, index);
		publishCounts();
	});
	Players.PlayerRemoving.Connect((player) => {
		if (votes.delete(player)) publishCounts();
	});
}
