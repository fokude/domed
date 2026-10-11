import { MatchConfig } from "shared/config";
import { startCombat } from "./combat";
import { startHazards } from "./hazards";
import { startMatchLoop } from "./match/controller";
import { watchCharacters } from "./spawning";
import { createLeaderstats } from "./stats";

const Players = game.GetService("Players");

Players.RespawnTime = MatchConfig.respawnTime;

function onPlayerAdded(player: Player) {
	createLeaderstats(player);
	watchCharacters(player);
}

Players.PlayerAdded.Connect(onPlayerAdded);
for (const player of Players.GetPlayers()) {
	onPlayerAdded(player);
}

startCombat();
startHazards();
startMatchLoop();
