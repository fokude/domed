// Chat commands for testing in Studio. They do nothing in live servers.
//   /map <MapId> [mode]   switch to that map right away
//   /end                            end the match, then show results and the vote
//   /openness                       measure the current map's openness and spawn exposure
//   /bots [count]                   fill free-for-all to this many players and bots, or the default

import { setBotFill } from "./bots";
import { allMatchOptions, endMatch, forceMatch, getCurrentMap } from "./match/controller";
import { measureOpenness } from "./maps/openness";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

function switchMap(mapId: string | undefined, mode: string | undefined) {
	const options = allMatchOptions(true);
	const option = options.find(
		(candidate) =>
			candidate.mapId.lower() === mapId?.lower() &&
			(mode === undefined || candidate.mode.lower() === mode.lower()),
	);
	if (option) {
		forceMatch(option);
		return;
	}
	const available = options.map((candidate) => `${candidate.mapId} ${candidate.mode}`).join(", ");
	warn(`[dev] No map matches "${mapId ?? ""} ${mode ?? ""}". Available: ${available}`);
}

function reportOpenness() {
	const map = getCurrentMap();
	if (!map) return;
	print(`[dev] Measuring ${map.info.name}...`);
	const report = measureOpenness(map);
	const percent = (value: number) => `${math.round(value * 100)}%`;
	print(
		`[dev] ${map.info.name}: openness ${percent(report.openness)} (target ~25%), spawn exposure ` +
			`${percent(report.spawnExposure)} (target <20%), from ${report.spots} spots`,
	);
}

function onChatted(message: string) {
	const [command, mapId, mode] = message.split(" ");
	if (command === "/map") switchMap(mapId, mode);
	else if (command === "/end") endMatch();
	else if (command === "/openness") task.spawn(reportOpenness);
	else if (command === "/bots") setBotFill(tonumber(mapId));
}

export function startDevCommands() {
	if (!RunService.IsStudio()) return;
	print("[dev] Chat commands: /map <MapId> [mode], /end, /openness, /bots [count]");
	const watch = (player: Player) => player.Chatted.Connect(onChatted);
	Players.PlayerAdded.Connect(watch);
	Players.GetPlayers().forEach(watch);
}
