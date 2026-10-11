// Kills characters that touch hazard parts (lava) or fall below the map's kill height, crediting
// whoever knocked them there (see combat.ts).

import { getLiveRoot } from "shared/characters";
import { MapTag } from "shared/mapMarkers";
import { isBot, killBot, livingBotRoots } from "./bots";
import { creditEnvironmentalKill } from "./combat";

const CollectionService = game.GetService("CollectionService");
const Players = game.GetService("Players");

const VOID_CHECK_INTERVAL = 0.25;

let killHeight = -math.huge;

function killCharacterOf(part: BasePart) {
	const character = part.Parent;
	if (!character?.IsA("Model")) return;
	if (isBot(character)) {
		if (killBot(character)) creditEnvironmentalKill(character, character);
		return;
	}
	const player = Players.GetPlayerFromCharacter(character);
	const humanoid = character.FindFirstChildOfClass("Humanoid");
	if (!player || !humanoid || humanoid.Health <= 0) return;
	humanoid.Health = 0;
	creditEnvironmentalKill(player, character);
}

function watchHazard(instance: Instance) {
	if (instance.IsA("BasePart")) instance.Touched.Connect(killCharacterOf);
}

export function setKillHeight(height: number) {
	killHeight = height;
}

export function startHazards() {
	CollectionService.GetTagged(MapTag.Hazard).forEach(watchHazard);
	CollectionService.GetInstanceAddedSignal(MapTag.Hazard).Connect(watchHazard);

	task.spawn(() => {
		for (;;) {
			task.wait(VOID_CHECK_INTERVAL);
			for (const player of Players.GetPlayers()) {
				const root = getLiveRoot(player);
				if (root && root.Position.Y < killHeight) killCharacterOf(root);
			}
			for (const root of livingBotRoots()) {
				if (root.Position.Y < killHeight) killCharacterOf(root);
			}
		}
	});
}
