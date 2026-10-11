// Character setup on spawn: movement stats, spawn position, and spawn protection.

import { MatchConfig, MovementConfig } from "shared/config";
import { incrementStat } from "./stats";

const Debris = game.GetService("Debris");
const Players = game.GetService("Players");

export type SpawnPicker = (player: Player) => CFrame | undefined;
export type DeathHandler = (player: Player, character: Model) => void;

let pickSpawn: SpawnPicker = () => undefined;
let onDeath: DeathHandler = () => {};

export function setSpawnPicker(picker: SpawnPicker) {
	pickSpawn = picker;
}

export function setDeathHandler(handler: DeathHandler) {
	onDeath = handler;
}

function livingCharacterPositions(exclude: Player, isThreat: (other: Player) => boolean): Vector3[] {
	const positions: Vector3[] = [];
	for (const other of Players.GetPlayers()) {
		if (other === exclude || !isThreat(other)) continue;
		const humanoid = other.Character?.FindFirstChildOfClass("Humanoid");
		const root = other.Character?.FindFirstChild("HumanoidRootPart");
		if (humanoid && humanoid.Health > 0 && root?.IsA("BasePart")) positions.push(root.Position);
	}
	return positions;
}

// Picks the spawn whose nearest threat is furthest away, so players don't spawn into a fight.
export function pickSafestSpawn(
	player: Player,
	candidates: CFrame[],
	isThreat: (other: Player) => boolean,
): CFrame | undefined {
	if (candidates.size() === 0) return undefined;
	const threats = livingCharacterPositions(player, isThreat);
	if (threats.size() === 0) return candidates[math.random(0, candidates.size() - 1)];

	let best = candidates[0];
	let bestDistance = -1;
	for (const candidate of candidates) {
		let nearest = math.huge;
		for (const threat of threats) {
			nearest = math.min(nearest, candidate.Position.sub(threat).Magnitude);
		}
		if (nearest > bestDistance) {
			bestDistance = nearest;
			best = candidate;
		}
	}
	return best;
}

function onCharacterAdded(player: Player, character: Model) {
	const humanoid = character.WaitForChild("Humanoid") as Humanoid;
	humanoid.WalkSpeed = MovementConfig.walkSpeed;
	humanoid.UseJumpPower = false;
	humanoid.JumpHeight = MovementConfig.jumpHeight;

	character.WaitForChild("HumanoidRootPart");
	const spawn = pickSpawn(player);
	if (spawn) character.PivotTo(spawn);

	const forceField = new Instance("ForceField");
	forceField.Parent = character;
	Debris.AddItem(forceField, MatchConfig.spawnProtection);

	humanoid.Died.Connect(() => {
		incrementStat(player, "Deaths");
		onDeath(player, character);
	});
}

export function watchCharacters(player: Player) {
	player.CharacterAdded.Connect((character) => onCharacterAdded(player, character));
	if (player.Character) onCharacterAdded(player, player.Character);
}
