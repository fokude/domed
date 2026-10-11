// Kills characters that touch hazard parts (lava) or fall below the map's kill height.

import { MapTag } from "./maps/markers";

const CollectionService = game.GetService("CollectionService");
const Players = game.GetService("Players");

const VOID_CHECK_INTERVAL = 0.25;

let killHeight = -math.huge;

function killCharacterOf(part: BasePart) {
	const character = part.Parent;
	if (!character?.IsA("Model") || !Players.GetPlayerFromCharacter(character)) return;
	const humanoid = character.FindFirstChildOfClass("Humanoid");
	if (humanoid && humanoid.Health > 0) humanoid.Health = 0;
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
				const root = player.Character?.FindFirstChild("HumanoidRootPart");
				if (root?.IsA("BasePart") && root.Position.Y < killHeight) killCharacterOf(root);
			}
		}
	});
}
