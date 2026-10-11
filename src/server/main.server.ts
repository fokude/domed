import { MatchConfig } from "shared/config";
import { Remotes } from "shared/remotes";
import { getStandings } from "shared/standings";
import { setCombatArena, setCombatRules, startCombat } from "./combat";
import { setKillHeight, startHazards } from "./hazards";
import { getMapModel, listMaps } from "./maps/library";
import { loadMap } from "./maps/loader";
import { pickSafestSpawn, setSpawnPicker, watchCharacters } from "./spawning";
import { createLeaderstats, readStat, resetStats } from "./stats";

const Players = game.GetService("Players");

Players.RespawnTime = MatchConfig.respawnTime;

const deathmatchMaps = listMaps().filter((info) => info.modes.includes("Deathmatch"));
const firstMap = deathmatchMaps[math.random(0, deathmatchMaps.size() - 1)];
const loaded = loadMap(getMapModel(firstMap.id)!);
const spawnFrames = loaded.spawns.map((spawn) => spawn.cframe);
setCombatArena(loaded.arena);
setKillHeight(loaded.killHeight);
setSpawnPicker((player) => pickSafestSpawn(player, spawnFrames, () => true));

let roundOver = false;

function endRound() {
	roundOver = true;
	setCombatRules(undefined);
	Remotes.MatchEnded.FireAllClients(getStandings(Players.GetPlayers()), MatchConfig.intermissionTime);
	task.wait(MatchConfig.intermissionTime);

	for (const player of Players.GetPlayers()) {
		resetStats(player);
		player.LoadCharacter();
	}

	roundOver = false;
	setCombatRules(deathmatchRules);
	Remotes.Announce.FireAllClients("FIGHT", 1.5);
}

const deathmatchRules = {
	canDamage: () => true,
	onKill: (shooter: Player) => {
		if (!roundOver && readStat(shooter, "Kills") >= MatchConfig.killsToWin) task.spawn(endRound);
	},
};
setCombatRules(deathmatchRules);

function onPlayerAdded(player: Player) {
	createLeaderstats(player);
	watchCharacters(player);
}

startCombat();
startHazards();
Players.PlayerAdded.Connect(onPlayerAdded);
for (const player of Players.GetPlayers()) {
	onPlayerAdded(player);
}
