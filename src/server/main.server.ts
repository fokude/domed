import { startAnalytics } from "./analytics";
import { startCombat } from "./combat";
import { startProfiles } from "./data/profiles";
import { startDevCommands } from "./dev";
import { startHazards } from "./hazards";
import { startMatchLoop } from "./match/controller";
import { startMovementCheck } from "./movementCheck";
import { startPerkSystem } from "./perks";
import { startProgression } from "./progression";
import { watchCharacters } from "./spawning";
import { createLeaderstats } from "./stats";

const Players = game.GetService("Players");

// Spawning is server-controlled; see spawning.ts.
Players.CharacterAutoLoads = false;

function onPlayerAdded(player: Player) {
	createLeaderstats(player);
	watchCharacters(player);
}

Players.PlayerAdded.Connect(onPlayerAdded);
for (const player of Players.GetPlayers()) {
	onPlayerAdded(player);
}

startAnalytics();
startProfiles();
startProgression();
startCombat();
startMovementCheck();
startPerkSystem();
startHazards();
startMatchLoop();
startDevCommands();
