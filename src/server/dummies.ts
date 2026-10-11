// Training dummies for the Test Range: standard R15 characters that move in set patterns and
// can be shot like players, triggering the shooter's real kill feedback. They give no XP or
// stats. Each respawns shortly after it dies.

import { PerkConfig } from "shared/config";
import { HitKind } from "shared/remotes";
import { DummySpawn, LoadedMap } from "./maps/loader";
import { addShieldBubble, setShieldBubbleStrength, shieldHitsAfter } from "./perks";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

const DUMMY_TAG = "TrainingDummy";
const RESPAWN_DELAY = 2;

interface Dummy {
	spawn: DummySpawn;
	model: Model;
	root: BasePart;
	// Shield hits left, as for players; 0 without a shield.
	shieldHits: number;
	alive: boolean;
	startedAt: number;
	lastPosition: Vector3;
}

const dummies = new Map<Model, Dummy>();
let folder: Folder | undefined;
let heartbeat: RBXScriptConnection | undefined;
// Bumped whenever dummies are cleared, so a respawn queued on an old map is dropped.
let generation = 0;

// Offset from the dummy's spot at time `t`, relative to the way it faces.
function patternOffset(pattern: string, t: number): Vector3 {
	if (pattern === "Strafe") return new Vector3(math.sin(t * 1.5) * 8, 0, 0);
	if (pattern === "Circle") return new Vector3(math.cos(t * 1.2) * 8, 0, math.sin(t * 1.2) * 8);
	if (pattern === "Fast") return new Vector3(math.sin(t * 3) * 20, 0, 0);
	// Hopping while strafing, like a player bunny hopping.
	if (pattern === "Hop") return new Vector3(math.sin(t * 2.2) * 14, math.abs(math.sin(t * 3.5)) * 6, 0);
	return Vector3.zero;
}

function spawnDummy(spawn: DummySpawn) {
	if (!folder) return;
	const model = Players.CreateHumanoidModelFromDescription(
		new Instance("HumanoidDescription"),
		Enum.HumanoidRigType.R15,
	);
	model.Name = `${spawn.pattern}Dummy`;
	const humanoid = model.FindFirstChildOfClass("Humanoid")!;
	humanoid.DisplayName = spawn.shielded ? `${spawn.pattern} (shield)` : spawn.pattern;
	const root = model.FindFirstChild("HumanoidRootPart") as BasePart;
	root.Anchored = true;
	model.PivotTo(spawn.cframe.add(new Vector3(0, 3, 0)));
	model.AddTag(DUMMY_TAG);
	if (spawn.shielded) addShieldBubble(model);
	model.Parent = folder;

	dummies.set(model, {
		spawn,
		model,
		root,
		shieldHits: spawn.shielded ? PerkConfig.shieldHits : 0,
		alive: true,
		startedAt: os.clock(),
		lastPosition: root.Position,
	});
}

function step(dt: number) {
	for (const [, dummy] of dummies) {
		if (!dummy.alive) continue;
		const t = os.clock() - dummy.startedAt;
		const base = dummy.spawn.cframe.add(new Vector3(0, 3, 0));
		const position = base.PointToWorldSpace(patternOffset(dummy.spawn.pattern, t));
		dummy.root.CFrame = new CFrame(position).mul(base.Rotation);
		// Anchored parts don't move by physics, so report the real speed for the lag allowance
		// in shot validation.
		if (dt > 0) dummy.root.AssemblyLinearVelocity = position.sub(dummy.lastPosition).div(dt);
		dummy.lastPosition = position;
	}
}

// Heads of the dummies currently standing.
export function livingDummyHeads(): BasePart[] {
	const heads: BasePart[] = [];
	for (const [model, dummy] of dummies) {
		const head = model.FindFirstChild("Head");
		if (dummy.alive && head?.IsA("BasePart")) heads.push(head);
	}
	return heads;
}

export function isDummy(model: Model): boolean {
	return model.HasTag(DUMMY_TAG);
}

// Applies a validated hit to a dummy. Returns what happened, for the shooter's feedback, or
// undefined if the dummy was already down.
export function hitDummy(model: Model, isHead: boolean): HitKind | undefined {
	const dummy = dummies.get(model);
	if (!dummy || !dummy.alive) return undefined;
	// Shields work as on players: a headshot breaks one, body shots wear it down.
	if (dummy.shieldHits > 0) {
		dummy.shieldHits = shieldHitsAfter(dummy.shieldHits, isHead);
		setShieldBubbleStrength(model, dummy.shieldHits);
		return dummy.shieldHits === 0 ? "shield" : "body";
	}
	if (!isHead) return "body";

	dummy.alive = false;
	dummy.root.Anchored = false;
	model.FindFirstChildOfClass("Humanoid")!.Health = 0;
	const spawnedIn = generation;
	task.delay(RESPAWN_DELAY, () => {
		if (generation !== spawnedIn) return;
		dummies.delete(model);
		model.Destroy();
		spawnDummy(dummy.spawn);
	});
	return "kill";
}

export function startDummies(map: LoadedMap) {
	stopDummies();
	if (map.dummies.size() === 0) return;
	folder = new Instance("Folder");
	folder.Name = "Dummies";
	folder.Parent = map.arena;
	map.dummies.forEach(spawnDummy);
	heartbeat = RunService.Heartbeat.Connect(step);
}

export function stopDummies() {
	generation += 1;
	heartbeat?.Disconnect();
	heartbeat = undefined;
	folder?.Destroy();
	folder = undefined;
	dummies.clear();
}
