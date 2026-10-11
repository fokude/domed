// Runs matches back to back: warm up in the warm-up arena while voting on the next map, load
// that map, play the mode until someone wins or time runs out, show results, and repeat.

import { MatchConfig, ModeMinPlayers } from "shared/config";
import { DEPLOYED_ATTRIBUTE, setMatchState } from "shared/matchState";
import { ModeId } from "shared/modes";
import { Remotes } from "shared/remotes";
import { getStandings } from "shared/standings";
import { CombatRules, setCombatArena, setCombatRules } from "../combat";
import { setKillHeight } from "../hazards";
import { logMatchFinished, logOnboardingStep } from "../analytics";
import { onProfileLoaded } from "../data/profiles";
import { startBots, startBotSystem, stopBots } from "../bots";
import { startDummies, stopDummies } from "../dummies";
import { startPerks, stopPerks } from "../perks";
import { recordMatchEnd, startMatchXp } from "../progression";
import { getMapModel, listMaps } from "../maps/library";
import { LoadedMap, loadMap } from "../maps/loader";
import { WARMUP_MAP_ID } from "../maps/warmup";
import {
	closeSpawning,
	deploy,
	deployAll,
	forgetPlayer,
	leaveToMenu,
	pickSafestSpawn,
	returnAllToMenu,
	setDeathHandler,
	setDeployHandler,
	setRespawnTime,
	setSpawnPicker,
	DeathHandler,
	SpawnPicker,
} from "../spawning";
import { resetStats } from "../stats";
import { ControlPointMode } from "./modes/controlPoints";
import { CaptureTheFlag } from "./modes/ctf";
import { Deathmatch } from "./modes/deathmatch";
import { TeamDeathmatch } from "./modes/teamDeathmatch";
import { GameMode, MatchResult } from "./modes/types";
import { startFriendTracking } from "./teams";
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
// Options whose map or mode failed to start, kept out of rotation until the server restarts.
const brokenOptions = new Set<string>();

function optionKey(option: MatchOption): string {
	return `${option.mapId}/${option.mode}`;
}

// Options that work and suit the number of players in the server.
function playableOptions(): MatchOption[] {
	const playerCount = Players.GetPlayers().size();
	const working = allMatchOptions().filter((option) => !brokenOptions.has(optionKey(option)));
	const suitable = working.filter((option) => playerCount >= ModeMinPlayers[option.mode]);
	if (suitable.size() > 0) return suitable;
	return working.size() > 0 ? working : allMatchOptions();
}

// Players can't hurt each other in the warm-up; only training dummies take hits.
class WarmupRules implements CombatRules {
	canDamage() {
		return false;
	}

	onKill() {}
}

function waitForPlayers() {
	while (Players.GetPlayers().size() === 0) task.wait(1);
}

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
	const options = playableOptions();
	return options[math.random(0, options.size() - 1)];
}

interface ArenaRules {
	pickSpawn: SpawnPicker;
	onDeath: DeathHandler;
	onDeploy: (player: Player) => void;
	respawnTime: number;
}

// Readies everything that lives in a loaded map: perks, dummies, hazards, combat line of sight
// and spawning. Used for both the warm-up and matches; closeArena undoes it.
function openArena(map: LoadedMap, arenaRules: ArenaRules) {
	currentMap = map;
	startPerks(map);
	startDummies(map);
	setCombatArena(map.arena);
	setKillHeight(map.killHeight);
	setSpawnPicker(arenaRules.pickSpawn);
	setDeathHandler(arenaRules.onDeath);
	setDeployHandler(arenaRules.onDeploy);
	setRespawnTime(arenaRules.respawnTime);
	setMatchState("RespawnTime", arenaRules.respawnTime);
	setMatchState("MapName", map.info.name);
}

// Stops combat and respawns and clears what openArena (and bots) started. Safe to call after a
// failure, so each step is protected.
function closeArena() {
	setCombatRules(undefined);
	closeSpawning();
	pcall(stopPerks);
	pcall(stopDummies);
	pcall(stopBots);
}

function startMatch(option: MatchOption): GameMode {
	const map = loadMap(getMapModel(option.mapId)!);
	const mode = MODE_FACTORIES[option.mode]!(map);
	currentMode = mode;
	openArena(map, {
		pickSpawn: (player) => mode.pickSpawn(player),
		onDeath: (player, character) => mode.onDeath(player, character),
		onDeploy: (player) => mode.addPlayer(player),
		respawnTime: mode.respawnTime ?? MatchConfig.respawnTime,
	});
	// Bots only play free-for-all, which is what near-empty servers run (see docs/BOTS.md).
	if (mode.id === "Deathmatch") startBots(map);

	setMatchState("Phase", "Playing");
	setMatchState("Mode", mode.id);
	setMatchState("ScoreTarget", mode.scoreTarget);
	setMatchState("EndsAt", Workspace.GetServerTimeNow() + mode.timeLimit);

	for (const player of Players.GetPlayers()) {
		resetStats(player);
	}
	deployAll();
	startMatchXp();
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
		// Everyone left: end now rather than run out the clock on an empty server.
		if (Players.GetPlayers().size() === 0) return mode.timeUpResult();
	}
}

function showResults(result: MatchResult) {
	setMatchState("Phase", "Results");
	setMatchState("EndsAt", Workspace.GetServerTimeNow() + MatchConfig.resultsTime);
	Remotes.MatchEnded.FireAllClients(result.title, getStandings(Players.GetPlayers()), MatchConfig.resultsTime);
	task.wait(MatchConfig.resultsTime);
}

// The gap between matches: everyone is dropped into the warm-up arena to try movement and aim
// on training dummies while voting on the next map. Returns the vote's winner.
function warmUp(previous: MatchOption | undefined): MatchOption {
	const map = loadMap(getMapModel(WARMUP_MAP_ID)!);
	const spawns = map.spawns.map((spawn) => spawn.cframe);
	openArena(map, {
		pickSpawn: (player) => pickSafestSpawn(player, spawns, () => true),
		onDeath: () => {},
		onDeploy: () => {},
		respawnTime: MatchConfig.respawnTime,
	});
	setMatchState("Phase", "Warmup");
	setMatchState("EndsAt", Workspace.GetServerTimeNow() + MatchConfig.warmupTime);
	deployAll();
	setCombatRules(new WarmupRules());

	const choices = pickVoteOptions(playableOptions(), previous);
	const winner = runVote(choices, MatchConfig.warmupTime, () => forcedOption !== undefined);
	leaveWarmup();
	return winner;
}

function leaveWarmup() {
	closeArena();
	returnAllToMenu();
}

// Warms up, falling back to a random option if the warm-up arena fails to load, so a broken
// warm-up can't stall the server.
function warmUpSafely(previous: MatchOption | undefined): MatchOption {
	const [ok, result] = pcall(() => warmUp(previous));
	if (ok) return result;
	warn(`Warm-up failed: ${result}`);
	leaveWarmup();
	return randomOption();
}

function runMatch(option: MatchOption) {
	endRequested = false;
	const startedAt = os.clock();
	const mode = startMatch(option);
	const result = waitForResult(mode);
	closeArena();
	if (!forcedOption) {
		const participants = Players.GetPlayers().filter((player) => player.GetAttribute(DEPLOYED_ATTRIBUTE) === true);
		recordMatchEnd(participants, result.winners);
		mode.rateMatch(participants, result);
		for (const player of participants) {
			logOnboardingStep(player, "matchFinished");
			logMatchFinished(player, option.mode, option.mapId, os.clock() - startedAt);
		}
		showResults(result);
	}
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

// Runs a match, recovering if it errors (for example a map with broken markers) so one bad
// map can't stall the server. Returns false if the match failed.
function runMatchSafely(option: MatchOption): boolean {
	const [ok, err] = pcall(() => runMatch(option));
	if (ok) return true;
	warn(`Match ${optionKey(option)} failed and was taken out of rotation: ${err}`);
	brokenOptions.add(optionKey(option));
	closeArena();
	const mode = currentMode;
	if (mode) pcall(() => mode.stop());
	currentMode = undefined;
	returnAllToMenu();
	return false;
}

export function startMatchLoop() {
	Players.PlayerRemoving.Connect((player) => {
		currentMode?.removePlayer(player);
		forgetPlayer(player);
	});
	Remotes.Deploy.OnServerEvent.Connect((player) => deploy(player));
	Remotes.LeaveToMenu.OnServerEvent.Connect((player) => leaveToMenu(player));
	// First-time players skip the menu and drop straight into play, where the first-minute
	// lessons teach them (see docs/SKILL_FLOOR.md). Returning players start in the menu.
	onProfileLoaded((player, data) => {
		if (data.onboarding.intro !== true) deploy(player);
	});
	startVoting();
	startFriendTracking();
	startBotSystem();

	task.spawn(() => {
		// Nothing runs on an empty server, so the first player arrives to a fresh warm-up.
		let previous: MatchOption | undefined;
		for (;;) {
			waitForPlayers();
			// A dev command during the match skips the warm-up; one during the warm-up overrides
			// the vote.
			let option = forcedOption ?? warmUpSafely(previous);
			option = forcedOption ?? option;
			forcedOption = undefined;
			if (runMatchSafely(option)) {
				previous = option;
			} else {
				previous = undefined;
				task.wait(1);
			}
		}
	});
}
