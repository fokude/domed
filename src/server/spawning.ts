// Who is in the match and when they spawn. Players start in the menu; deploying puts them in
// the match and spawns them, and they respawn after dying until everyone returns to the menu.
// Characters never load on their own (Players.CharacterAutoLoads is off).

import { getLiveRoot } from "shared/characters";
import { MatchConfig, MovementConfig } from "shared/config";
import { DEPLOYED_ATTRIBUTE } from "shared/matchState";
import { incrementStat } from "./stats";

const Debris = game.GetService("Debris");
const Players = game.GetService("Players");

export type SpawnPicker = (player: Player) => CFrame | undefined;
export type DeathHandler = (player: Player, character: Model) => void;

let pickSpawn: SpawnPicker = () => undefined;
let onDeath: DeathHandler = () => {};
let onDeploy: (player: Player) => void = () => {};
let spawningOpen = false;
let respawnTime = MatchConfig.respawnTime;
const deployed = new Set<Player>();

export function setSpawnPicker(picker: SpawnPicker) {
	pickSpawn = picker;
}

export function setDeathHandler(handler: DeathHandler) {
	onDeath = handler;
}

export function setRespawnTime(seconds: number) {
	respawnTime = seconds;
}

export function setDeployHandler(handler: (player: Player) => void) {
	onDeploy = handler;
}

function livingCharacterPositions(exclude: Player, isThreat: (other: Player) => boolean): Vector3[] {
	const positions: Vector3[] = [];
	for (const other of Players.GetPlayers()) {
		if (other === exclude || !isThreat(other)) continue;
		const root = getLiveRoot(other);
		if (root) positions.push(root.Position);
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
		task.delay(respawnTime, () => {
			if (spawningOpen && deployed.has(player) && player.Parent && player.Character === character) {
				player.LoadCharacter();
			}
		});
	});
}

export function deploy(player: Player) {
	if (!spawningOpen || deployed.has(player)) return;
	deployed.add(player);
	player.SetAttribute(DEPLOYED_ATTRIBUTE, true);
	onDeploy(player);
	player.LoadCharacter();
}

// Opens spawning for a new match and drops every player in.
export function deployAll() {
	spawningOpen = true;
	for (const player of Players.GetPlayers()) {
		deploy(player);
	}
}

// Stops respawns without removing anyone, for the results screen.
export function closeSpawning() {
	spawningOpen = false;
}

// Closes spawning and sends every player back to the menu.
export function returnAllToMenu() {
	spawningOpen = false;
	deployed.clear();
	for (const player of Players.GetPlayers()) {
		player.SetAttribute(DEPLOYED_ATTRIBUTE, false);
		player.Character?.Destroy();
		player.Character = undefined;
	}
}

export function forgetPlayer(player: Player) {
	deployed.delete(player);
}

export function watchCharacters(player: Player) {
	player.CharacterAdded.Connect((character) => onCharacterAdded(player, character));
}
