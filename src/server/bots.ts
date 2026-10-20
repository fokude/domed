// Bots fill near-empty free-for-all matches so a lone player still has someone to fight, and new
// players get early wins (see docs/BOTS.md). They're server-controlled R15 characters that walk
// the map by pathfinding, hop and strafe in fights, and shoot with aim error that grows with
// distance and target speed. They fight players and each other, and are ranked in the match
// standings, but never affect ratings or records. They leave as real players join.

import { flatSpeed } from "shared/characters";
import { BotConfig, MatchConfig, MovementConfig, WeaponConfig } from "shared/config";
import { MapTag } from "shared/mapMarkers";
import { DEPLOYED_ATTRIBUTE } from "shared/matchState";
import { Remotes } from "shared/remotes";
import { BOT_STANDINGS_FOLDER } from "shared/standings";
import { LoadedMap } from "./maps/loader";
import { hitShield } from "./perks";
import { addThreatSource, pickSpawnAwayFrom } from "./spawning";

const CollectionService = game.GetService("CollectionService");
const ReplicatedStorage = game.GetService("ReplicatedStorage");
const PathfindingService = game.GetService("PathfindingService");
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const Workspace = game.GetService("Workspace");

const BOT_TAG = "Bot";
const NAMES = ["Volt", "Rook", "Nova", "Echo", "Jinx", "Blitz", "Kite", "Dash", "Onyx", "Sable"];
const THINK_INTERVAL = 0.1;
const REPATH_INTERVAL = 2;
const MEMBERSHIP_INTERVAL = 1;
// Hops while roaming, for a bit of life; strafes sideways this far while fighting.
const HOP_INTERVAL = 1.2;
const STRAFE_STUDS = 10;
const STRAFE_SWITCH = 0.8;
const HAZARD_LABEL = "Hazard";

interface Bot {
	name: string;
	model: Model;
	humanoid: Humanoid;
	root: BasePart;
	head: BasePart;
	alive: boolean;
	target?: Model;
	targetSince: number;
	lastShot: number;
	waypoints: Vector3[];
	jumpAt: Set<number>;
	waypointIndex: number;
	pathAt: number;
	pathing: boolean;
	nextHop: number;
	strafeSign: number;
	strafeSwitch: number;
}

const bots = new Map<Model, Bot>();
let folder: Folder | undefined;
let map: LoadedMap | undefined;
let spawns: CFrame[] = [];
let heartbeat: RBXScriptConnection | undefined;
let sinceThink = 0;
let sinceMembership = 0;
// Bumped when bots stop, so respawns queued for an old match are dropped.
let generation = 0;
// Studio override for testing; undefined uses BotConfig.fillTo.
let fillOverride: number | undefined;
// Bots being built: building a character waits on Roblox, so they're counted until they exist.
let spawning = 0;

// Per-bot kills and deaths for this match, replicated so clients can rank bots with players.
const botStandingsFolder = new Instance("Folder");
botStandingsFolder.Name = BOT_STANDINGS_FOLDER;
botStandingsFolder.Parent = ReplicatedStorage;

function botStat(displayName: string, stat: "Kills" | "Deaths"): IntValue {
	let entry = botStandingsFolder.FindFirstChild(displayName);
	if (!entry) {
		entry = new Instance("Folder");
		entry.Name = displayName;
		for (const name of ["Kills", "Deaths"]) {
			const value = new Instance("IntValue");
			value.Name = name;
			value.Parent = entry;
		}
		entry.Parent = botStandingsFolder;
	}
	return entry.FindFirstChild(stat) as IntValue;
}

// Clears every bot's score, at the start of each match.
export function resetBotStandings() {
	botStandingsFolder.ClearAllChildren();
}

const rayParams = new RaycastParams();
rayParams.FilterType = Enum.RaycastFilterType.Exclude;

function living(bot: Bot): boolean {
	return bot.alive && bot.humanoid.Health > 0;
}

function deployedPlayers(): Player[] {
	return Players.GetPlayers().filter((player) => player.GetAttribute(DEPLOYED_ATTRIBUTE) === true);
}

// Characters a bot can fight: players and other bots, alive and past spawn protection.
function targetCharacters(seeker?: Bot): Model[] {
	const targets: Model[] = [];
	for (const player of deployedPlayers()) {
		const character = player.Character;
		const humanoid = character?.FindFirstChildOfClass("Humanoid");
		if (!character || !humanoid || humanoid.Health <= 0) continue;
		if (character.FindFirstChildOfClass("ForceField")) continue;
		targets.push(character);
	}
	for (const [model, other] of bots) {
		if (other === seeker || !living(other) || model.FindFirstChildOfClass("ForceField")) continue;
		targets.push(model);
	}
	return targets;
}

function livingPositions(): Vector3[] {
	const positions: Vector3[] = [];
	for (const [, bot] of bots) if (living(bot)) positions.push(bot.root.Position);
	return positions;
}

function spawnPoint(): CFrame | undefined {
	const threats = livingPositions();
	for (const character of targetCharacters()) threats.push(character.GetPivot().Position);
	return pickSpawnAwayFrom(spawns, threats);
}

function unusedName(): string {
	const taken = new Set<string>();
	for (const [, bot] of bots) taken.add(bot.name);
	return NAMES.find((name) => !taken.has(name)) ?? `Bot${math.random(100, 999)}`;
}

function randomDescription(): HumanoidDescription {
	const description = new Instance("HumanoidDescription");
	const shirt = Color3.fromHSV(math.random(), 0.6, 0.8);
	const skin = Color3.fromHSV(0.08, math.random(20, 60) / 100, math.random(45, 95) / 100);
	description.HeadColor = skin;
	description.LeftArmColor = skin;
	description.RightArmColor = skin;
	description.TorsoColor = shirt;
	description.LeftLegColor = Color3.fromRGB(40, 42, 50);
	description.RightLegColor = Color3.fromRGB(40, 42, 50);
	return description;
}

function spawnBot(name: string) {
	if (!folder) return;
	const cframe = spawnPoint();
	if (!cframe) {
		warn("[bots] No spawn points on this map");
		return;
	}
	const spawnedIn = generation;
	spawning += 1;
	const [ok, result] = pcall(() =>
		Players.CreateHumanoidModelFromDescription(randomDescription(), Enum.HumanoidRigType.R15),
	);
	spawning -= 1;
	if (!ok) {
		warn(`[bots] Couldn't build a bot character: ${result}`);
		return;
	}
	const model = result;
	// The match may have ended while the character was being built.
	if (generation !== spawnedIn || !folder) {
		model.Destroy();
		return;
	}
	model.Name = name;
	model.AddTag(BOT_TAG);
	const humanoid = model.FindFirstChildOfClass("Humanoid")!;
	humanoid.DisplayName = `[BOT] ${name}`;
	humanoid.WalkSpeed = MovementConfig.walkSpeed;
	humanoid.UseJumpPower = false;
	humanoid.JumpHeight = MovementConfig.jumpHeight;
	const root = model.FindFirstChild("HumanoidRootPart") as BasePart;
	const head = model.FindFirstChild("Head") as BasePart;
	model.PivotTo(cframe.add(new Vector3(0, 3, 0)));
	model.Parent = folder;
	root.SetNetworkOwner(undefined);
	// Spawn protection, as players get: no one can hit or target a bot that just spawned.
	const shield = new Instance("ForceField");
	shield.Parent = model;
	task.delay(MatchConfig.spawnProtection, () => shield.Destroy());
	botStat(humanoid.DisplayName, "Kills");

	const bot: Bot = {
		name,
		model,
		humanoid,
		root,
		head,
		alive: true,
		targetSince: 0,
		lastShot: 0,
		waypoints: [],
		jumpAt: new Set(),
		waypointIndex: 0,
		pathAt: -math.huge,
		pathing: false,
		nextHop: os.clock() + HOP_INTERVAL,
		strafeSign: 1,
		strafeSwitch: 0,
	};
	bots.set(model, bot);
	humanoid.Died.Connect(() => onBotDied(bot));
}

function onBotDied(bot: Bot) {
	bot.alive = false;
	botStat(bot.humanoid.DisplayName, "Deaths").Value += 1;
	const spawnedIn = generation;
	task.delay(MatchConfig.respawnTime, () => {
		if (generation !== spawnedIn) return;
		bots.delete(bot.model);
		bot.model.Destroy();
		// Only come back if the server still needs filling.
		if (bots.size() < desiredCount()) spawnBot(bot.name);
	});
}

function desiredCount(): number {
	return math.max(0, (fillOverride ?? BotConfig.fillTo) - deployedPlayers().size());
}

// Adds or removes one bot at a time toward the number the server needs.
function updateMembership() {
	const desired = desiredCount();
	if (bots.size() + spawning < desired) {
		spawnBot(unusedName());
		return;
	}
	if (bots.size() > desired) {
		// Prefer removing a dead bot, so nobody sees one vanish mid-fight.
		let victim: Bot | undefined;
		for (const [, bot] of bots) if (!victim || !living(bot)) victim = bot;
		if (victim) {
			bots.delete(victim.model);
			victim.model.Destroy();
		}
	}
}

function canSee(bot: Bot, character: Model): boolean {
	const head = character.FindFirstChild("Head");
	if (!head?.IsA("BasePart")) return false;
	rayParams.FilterDescendantsInstances = [bot.model];
	const result = Workspace.Raycast(bot.head.Position, head.Position.sub(bot.head.Position), rayParams);
	return result !== undefined && result.Instance.IsDescendantOf(character);
}

function chooseTarget(bot: Bot): Model | undefined {
	let best: Model | undefined;
	let bestDistance = BotConfig.sightRange;
	for (const character of targetCharacters(bot)) {
		const distance = character.GetPivot().Position.sub(bot.root.Position).Magnitude;
		if (distance < bestDistance && canSee(bot, character)) {
			best = character;
			bestDistance = distance;
		}
	}
	return best;
}

// A point spread evenly through a ball, by rejection sampling. Scaling a random direction by a
// uniform random length would bunch points near the center and make bots far more accurate than
// their spread says.
function randomInSphere(radius: number): Vector3 {
	for (;;) {
		const point = new Vector3(math.random() * 2 - 1, math.random() * 2 - 1, math.random() * 2 - 1);
		if (point.Magnitude <= 1) return point.mul(radius);
	}
}

// A bot's shot killed another bot.
function killBotWithShot(bot: Bot, victim: Bot, hit: RaycastResult) {
	if (victim.model.FindFirstChildOfClass("ForceField") || !killBot(victim.model)) return;
	const cause = hit.Instance.Name === "Head" ? "headshot" : "rail";
	botStat(bot.humanoid.DisplayName, "Kills").Value += 1;
	Remotes.HeadBurst.FireAllClients(hit.Position, cause === "headshot");
	Remotes.KillFeed.FireAllClients(bot.humanoid.DisplayName, victim.humanoid.DisplayName, cause);
}

// Fires at the target's torso with aim error, wider against other bots. Hits are resolved by a
// server raycast against the aimed point, through the same shield rules as player shots.
function shoot(bot: Bot, target: Model) {
	const targetRoot = target.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (!targetRoot) return;
	const origin = bot.head.Position;
	const distance = targetRoot.Position.sub(origin).Magnitude;
	const spread =
		BotConfig.baseSpread +
		distance * BotConfig.spreadPerStud +
		flatSpeed(targetRoot.AssemblyLinearVelocity) * BotConfig.spreadPerSpeed;
	const scale = bots.has(target) ? BotConfig.botTargetSpreadScale : 1;
	const aim = targetRoot.Position.add(randomInSphere(spread * scale));
	const direction = aim.sub(origin).Unit.mul(WeaponConfig.range);

	rayParams.FilterDescendantsInstances = [bot.model];
	const result = Workspace.Raycast(origin, direction, rayParams);
	Remotes.ShotFired.FireAllClients(undefined, origin, result?.Position ?? origin.add(direction));
	if (!result) return;

	const hitModel = result.Instance.Parent;
	const hitBot = hitModel?.IsA("Model") ? bots.get(hitModel) : undefined;
	if (hitBot) return killBotWithShot(bot, hitBot, result);

	const victim = Players.GetPlayerFromCharacter(result.Instance.Parent);
	const victimHumanoid = result.Instance.Parent?.FindFirstChildOfClass("Humanoid");
	if (!victim || !victimHumanoid || victimHumanoid.Health <= 0) return;
	if (victim.Character?.FindFirstChildOfClass("ForceField")) return;

	// A shield takes the hit whole: no kill.
	if (hitShield(victim) !== undefined) return;
	victimHumanoid.Health = 0;
	botStat(bot.humanoid.DisplayName, "Kills").Value += 1;
	const cause = result.Instance.Name === "Head" ? "headshot" : "rail";
	Remotes.HeadBurst.FireAllClients(result.Position, cause === "headshot");
	Remotes.KillFeed.FireAllClients(bot.humanoid.DisplayName, victim, cause);
	Remotes.DeathRecap.FireClient(
		victim,
		bot.model,
		cause,
		math.floor(distance),
		flatSpeed(bot.root.AssemblyLinearVelocity),
	);
}

function requestPath(bot: Bot, goal: Vector3) {
	if (bot.pathing) return;
	bot.pathing = true;
	bot.pathAt = os.clock();
	task.spawn(() => {
		const path = PathfindingService.CreatePath({
			AgentRadius: 2,
			AgentHeight: 5,
			AgentCanJump: true,
			Costs: { [HAZARD_LABEL]: math.huge },
		});
		const [ok] = pcall(() => path.ComputeAsync(bot.root.Position, goal));
		bot.pathing = false;
		if (!ok || path.Status !== Enum.PathStatus.Success) return;
		const waypoints = path.GetWaypoints();
		bot.waypoints = waypoints.map((waypoint) => waypoint.Position);
		bot.jumpAt = new Set();
		waypoints.forEach((waypoint, index) => {
			if (waypoint.Action === Enum.PathWaypointAction.Jump) bot.jumpAt.add(index);
		});
		bot.waypointIndex = math.min(1, bot.waypoints.size() - 1);
	});
}

function roam(bot: Bot, now: number) {
	const done = bot.waypointIndex >= bot.waypoints.size();
	if ((done || now - bot.pathAt > REPATH_INTERVAL * 3) && map) {
		const goal = map.spawns[math.random(0, map.spawns.size() - 1)]?.cframe.Position;
		if (goal) requestPath(bot, goal);
	}
	const waypoint = bot.waypoints[bot.waypointIndex];
	if (!waypoint) return;
	bot.humanoid.MoveTo(waypoint);
	if (bot.jumpAt.has(bot.waypointIndex)) bot.humanoid.Jump = true;
	const flat = new Vector3(waypoint.X - bot.root.Position.X, 0, waypoint.Z - bot.root.Position.Z);
	if (flat.Magnitude < 3) bot.waypointIndex += 1;
}

// Strafes sideways relative to the target and hops, so bots aren't free kills.
function fight(bot: Bot, target: Model, now: number) {
	if (now > bot.strafeSwitch) {
		bot.strafeSign = -bot.strafeSign;
		bot.strafeSwitch = now + STRAFE_SWITCH * (0.5 + math.random());
	}
	const toTarget = target.GetPivot().Position.sub(bot.root.Position);
	const flat = new Vector3(toTarget.X, 0, toTarget.Z);
	if (flat.Magnitude > 0.1) {
		const side = flat.Unit.Cross(Vector3.yAxis).mul(STRAFE_STUDS * bot.strafeSign);
		bot.humanoid.MoveTo(bot.root.Position.add(side));
	}
	if (now - bot.targetSince >= BotConfig.reactionTime) {
		const cooldown = WeaponConfig.cooldown * BotConfig.cooldownScale;
		if (now - bot.lastShot >= cooldown) {
			bot.lastShot = now;
			shoot(bot, target);
		}
	}
}

function think() {
	const now = os.clock();
	for (const [, bot] of bots) {
		if (!living(bot)) continue;
		const target = chooseTarget(bot);
		if (target !== bot.target) {
			bot.target = target;
			bot.targetSince = now;
		}
		if (now > bot.nextHop) {
			bot.humanoid.Jump = true;
			bot.nextHop = now + HOP_INTERVAL * (0.6 + math.random() * 0.8);
		}
		if (target) fight(bot, target, now);
		else roam(bot, now);
	}
}

// Hazards are non-collidable, so pathfinding would walk straight into lava without this.
function markHazards(arena: Instance) {
	for (const hazard of CollectionService.GetTagged(MapTag.Hazard)) {
		if (!hazard.IsDescendantOf(arena) || hazard.FindFirstChildOfClass("PathfindingModifier")) continue;
		const modifier = new Instance("PathfindingModifier");
		modifier.Label = HAZARD_LABEL;
		modifier.Parent = hazard;
	}
}

export function isBot(model: Model): boolean {
	return model.HasTag(BOT_TAG);
}

export function getBotName(model: Model): string {
	return bots.get(model)?.humanoid.DisplayName ?? model.Name;
}

export function livingBotRoots(): BasePart[] {
	const roots: BasePart[] = [];
	for (const [, bot] of bots) if (living(bot)) roots.push(bot.root);
	return roots;
}

// Kills a bot (by hazard, the void, or a rail hit). Returns false if it was already down.
export function killBot(model: Model): boolean {
	const bot = bots.get(model);
	if (!bot || !living(bot)) return false;
	bot.humanoid.Health = 0;
	return true;
}

// Studio only: sets how many players and bots to fill to, or undefined for the default.
export function setBotFill(count: number | undefined) {
	fillOverride = count;
	const target = count ?? BotConfig.fillTo;
	if (heartbeat) print(`[bots] Filling to ${target} players and bots (${bots.size()} bots now)`);
	else print(`[bots] Will fill to ${target}. Bots only join Deathmatch matches; this isn't one.`);
}

export function startBots(loaded: LoadedMap) {
	stopBots();
	map = loaded;
	spawns = loaded.spawns.map((spawn) => spawn.cframe);
	markHazards(loaded.arena);
	folder = new Instance("Folder");
	folder.Name = "Bots";
	folder.Parent = loaded.arena;
	sinceThink = 0;
	sinceMembership = MEMBERSHIP_INTERVAL;
	heartbeat = RunService.Heartbeat.Connect((dt) => {
		sinceThink += dt;
		sinceMembership += dt;
		if (sinceMembership >= MEMBERSHIP_INTERVAL) {
			sinceMembership = 0;
			updateMembership();
		}
		if (sinceThink >= THINK_INTERVAL) {
			sinceThink = 0;
			think();
		}
	});
}

export function stopBots() {
	generation += 1;
	heartbeat?.Disconnect();
	heartbeat = undefined;
	folder?.Destroy();
	folder = undefined;
	map = undefined;
	bots.clear();
	spawning = 0;
}

export function startBotSystem() {
	addThreatSource(() => livingBotRoots().map((root) => root.Position));
}
