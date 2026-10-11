// Runs matches back to back: load a map, play the mode until someone wins or time runs out,
// show results, then send everyone to the menu to vote on the next map.

import { MatchConfig } from "shared/config";
import { setMatchState } from "shared/matchState";
import { ModeId } from "shared/modes";
import { Remotes } from "shared/remotes";
import { getStandings } from "shared/standings";
import { setCombatArena, setCombatRules } from "../combat";
import { setKillHeight } from "../hazards";
import { getMapModel, listMaps } from "../maps/library";
import { LoadedMap, loadMap } from "../maps/loader";
import {
	closeSpawning,
	deploy,
	deployAll,
	forgetPlayer,
	returnAllToMenu,
	setDeathHandler,
	setDeployHandler,
	setSpawnPicker,
} from "../spawning";
import { resetStats } from "../stats";
import { CaptureTheFlag } from "./modes/ctf";
import { Deathmatch } from "./modes/deathmatch";
import { GameMode, MatchResult } from "./modes/types";
import { pickVoteOptions, runVote, startVoting } from "./voting";

const Players = game.GetService("Players");
const Workspace = game.GetService("Workspace");

const POLL_INTERVAL = 0.25;

const MODE_FACTORIES: Partial<Record<ModeId, (map: LoadedMap) => GameMode>> = {
	Deathmatch: (map) => new Deathmatch(map),
	CTF: (map) => new CaptureTheFlag(map),
};

export interface MatchOption {
	mapId: string;
	mode: ModeId;
}

let currentMode: GameMode | undefined;

export function allMatchOptions(): MatchOption[] {
	const options: MatchOption[] = [];
	for (const info of listMaps()) {
		for (const mode of info.modes) {
			if (MODE_FACTORIES[mode]) options.push({ mapId: info.id, mode });
		}
	}
	return options;
}

function randomOption(): MatchOption {
	const options = allMatchOptions();
	return options[math.random(0, options.size() - 1)];
}

function startMatch(option: MatchOption): GameMode {
	const map = loadMap(getMapModel(option.mapId)!);
	const mode = MODE_FACTORIES[option.mode]!(map);
	currentMode = mode;

	setCombatArena(map.arena);
	setKillHeight(map.killHeight);
	setSpawnPicker((player) => mode.pickSpawn(player));
	setDeathHandler((player, character) => mode.onDeath(player, character));
	setDeployHandler((player) => mode.addPlayer(player));

	setMatchState("Phase", "Playing");
	setMatchState("Mode", mode.id);
	setMatchState("MapName", map.info.name);
	setMatchState("ScoreTarget", mode.scoreTarget);
	setMatchState("EndsAt", Workspace.GetServerTimeNow() + mode.timeLimit);

	for (const player of Players.GetPlayers()) {
		resetStats(player);
	}
	deployAll();
	setCombatRules(mode);
	Remotes.Announce.FireAllClients("FIGHT", 1.5);
	return mode;
}

function waitForResult(mode: GameMode): MatchResult {
	const endsAt = Workspace.GetServerTimeNow() + mode.timeLimit;
	for (;;) {
		task.wait(POLL_INTERVAL);
		const winner = mode.checkWinner();
		if (winner) return winner;
		if (Workspace.GetServerTimeNow() >= endsAt) return mode.timeUpResult();
	}
}

function showResults(result: MatchResult) {
	setMatchState("Phase", "Results");
	setMatchState("EndsAt", Workspace.GetServerTimeNow() + MatchConfig.resultsTime);
	Remotes.MatchEnded.FireAllClients(result.title, getStandings(Players.GetPlayers()), MatchConfig.resultsTime);
	task.wait(MatchConfig.resultsTime);
}

function voteForNext(previous: MatchOption): MatchOption {
	const choices = pickVoteOptions(allMatchOptions(), previous);
	setMatchState("Phase", "Voting");
	setMatchState("EndsAt", Workspace.GetServerTimeNow() + MatchConfig.intermissionTime);
	return runVote(choices, MatchConfig.intermissionTime);
}

function runMatch(option: MatchOption) {
	const mode = startMatch(option);
	const result = waitForResult(mode);
	setCombatRules(undefined);
	closeSpawning();
	showResults(result);
	mode.stop();
	currentMode = undefined;
	returnAllToMenu();
}

export function startMatchLoop() {
	Players.PlayerRemoving.Connect((player) => {
		currentMode?.removePlayer(player);
		forgetPlayer(player);
	});
	Remotes.Deploy.OnServerEvent.Connect((player) => deploy(player));
	startVoting();

	task.spawn(() => {
		let option = randomOption();
		for (;;) {
			runMatch(option);
			option = voteForNext(option);
		}
	});
}
