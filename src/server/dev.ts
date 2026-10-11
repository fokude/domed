// Chat commands for testing in Studio. They do nothing in live servers.
//   /map <MapId> [Deathmatch|CTF]   switch to that map right away
//   /end                            end the match, then show results and the vote

import { allMatchOptions, endMatch, forceMatch } from "./match/controller";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

function switchMap(mapId: string | undefined, mode: string | undefined) {
	const options = allMatchOptions();
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

function onChatted(message: string) {
	const [command, mapId, mode] = message.split(" ");
	if (command === "/map") switchMap(mapId, mode);
	else if (command === "/end") endMatch();
}

export function startDevCommands() {
	if (!RunService.IsStudio()) return;
	print("[dev] Chat commands: /map <MapId> [Deathmatch|CTF], /end");
	const watch = (player: Player) => player.Chatted.Connect(onChatted);
	Players.PlayerAdded.Connect(watch);
	Players.GetPlayers().forEach(watch);
}
