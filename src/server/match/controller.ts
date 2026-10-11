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
import { ControlPointMode } from "./modes/controlPoints";
import { CaptureTheFlag } from "./modes/ctf";
import { Deathmatch } from "./modes/deathmatch";
import { TeamDeathmatch } from "./modes/teamDeathmatch";
import { GameMode, MatchResult } from "./modes/types";
import { pickVoteOptions, runVote, startVoting } from "./voting";

const Players = game.GetService("Players");
const Workspace = game.GetService("Workspace");

const POLL_INTERVAL = 0.25;

const MODE_FACTORIES: Partial<Record<ModeId, (map: LoadedMap) => GameMode>> = {
	Deathmatch: (map) => new Deathmatch(map),
	TeamDeathmatch: (map) => new TeamDeathmatch(map),
	CTF: (map) => new CaptureTheFlag(map),
	Domination: (map) => new ControlPointMode(map, "Domination"),
	Hardpoint: (map) => new ControlPointMode(map, "Hardpoint"),
};

export interface MatchOption {
	mapId: string;
	mode: ModeId;
}

let currentMode: GameMode | undefined;
let currentMap: LoadedMap | undefined;
// Set by dev commands to cut the current match short.
let endRequested = false;
let forcedOption: MatchOption | undefined;

// Dev-only test maps are left out unless asked for.
export function allMatchOptions(includeDevOnly = false): MatchOption[] {
	const options: MatchOption[] = [];
	for (const info of listMaps()) {
		if (info.devOnly && !includeDevOnly) continue;
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
	currentMap = map;
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
		if (endRequested || Workspace.GetServerTimeNow() >= endsAt) return mode.timeUpResult();
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
	return runVote(choices, MatchConfig.intermissionTime, () => forcedOption !== undefined);
}

function runMatch(option: MatchOption) {
	endRequested = false;
	const mode = startMatch(option);
	const result = waitForResult(mode);
	setCombatRules(undefined);
	closeSpawning();
	if (!forcedOption) showResults(result);
	mode.stop();
	currentMode = undefined;
	returnAllToMenu();
}

// Ends the current match now, with normal results and voting.
export function endMatch() {
	endRequested = true;
}

// Skips straight to `option`, cutting short whatever is happening.
export function forceMatch(option: MatchOption) {
	forcedOption = option;
	endRequested = true;
}

export function getCurrentMap(): LoadedMap | undefined {
	return currentMap;
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
			if (!forcedOption) option = voteForNext(option);
			// A dev command during the match or the vote overrides the vote.
			option = forcedOption ?? option;
			forcedOption = undefined;
		}
	});
}
