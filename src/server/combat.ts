// Server-side validation of railgun shots.
//
// Hit detection is client-authoritative: the shooter's client says what it hit and the
// server checks the claim is plausible (fire rate, shooter position, target position,
// line of sight). With fast movement and tiny head hitboxes, server-side raycasts would
// miss constantly because of latency.

import { flatSpeed, getLiveRoot } from "shared/characters";
import { WeaponConfig } from "shared/config";
import { railCooldown } from "shared/perks";
import { DeathCause, Remotes } from "shared/remotes";
import { getBotName, isBot, killBot, livingBotHeads, pushBot } from "./bots";
import { hitDummy, isDummy, livingDummyHeads } from "./dummies";
import { hitShield } from "./perks";
import { recordKill } from "./progression";
import { incrementStat } from "./stats";

const Players = game.GetService("Players");
const Workspace = game.GetService("Workspace");

// Seconds of client clock drift allowed when checking fire rate.
const COOLDOWN_LENIENCY = 0.15;
// Positional slack for lag checks: a fixed margin plus distance covered in this many seconds.
const LAG_BASE_STUDS = 6;
const LAG_SECONDS = 0.35;
// Widest angle between where the shooter's character faces and the shot's direction. The
// character turns with the camera in first person, but its rotation replicates late and players
// flick fast, so this only catches hits claimed well behind or beside the shooter (silent aim).
const MAX_AIM_ANGLE = math.rad(100);
// Rejections are logged on the first one and then every this many, per player.
const REJECTION_LOG_EVERY = 10;
// A miss passing this close to the center of a head it could have hit counts as a near miss.
const NEAR_MISS_STUDS = 2.5;
// A player who dies to a hazard or the void this soon after a body shot counts as the
// shooter's kill. See docs/SKILL_FLOOR.md.
const KNOCKBACK_CREDIT_SECONDS = 4;

export interface CombatRules {
	canDamage(shooter: Player, victim: Player): boolean;
	onKill(shooter: Player, victim: Player): void;
}

// Undefined between matches: shots still fire and show, but hurt no one.
let rules: CombatRules | undefined;
const lastShotAt = new Map<Player, number>();
const rejections = new Map<Player, number>();
// The last body shot that pushed each player or bot (keyed by its character), for knockback
// kill credit.
const lastPush = new Map<Player | Model, { shooter: Player; character: Model; at: number; distance: number }>();

const lineOfSightParams = new RaycastParams();
lineOfSightParams.FilterType = Enum.RaycastFilterType.Include;

export function setCombatRules(newRules: CombatRules | undefined) {
	rules = newRules;
}

export function setCombatArena(arena: Instance) {
	lineOfSightParams.FilterDescendantsInstances = [arena];
}

function lagTolerance(character: Model): number {
	const root = character.FindFirstChild("HumanoidRootPart");
	const speed = root?.IsA("BasePart") ? root.AssemblyLinearVelocity.Magnitude : 0;
	return LAG_BASE_STUDS + speed * LAG_SECONDS;
}

// Logs shots that fail a plausibility check: a handful is lag, a steady stream is a cheat.
function reject(shooter: Player, reason: string) {
	const count = (rejections.get(shooter) ?? 0) + 1;
	rejections.set(shooter, count);
	if (count === 1 || count % REJECTION_LOG_EVERY === 0) {
		warn(`[anticheat] ${shooter.Name} (${shooter.UserId}): shot rejected (${reason}), ${count} so far`);
	}
}

function isAimedAlong(character: Model, shot: Vector3): boolean {
	const root = character.FindFirstChild("HumanoidRootPart");
	if (!root?.IsA("BasePart")) return false;
	const flatShot = new Vector3(shot.X, 0, shot.Z);
	// Shots straight up or down say nothing about facing.
	if (flatShot.Magnitude < 1) return true;
	const look = root.CFrame.LookVector;
	const facing = new Vector3(look.X, 0, look.Z);
	if (facing.Magnitude < 0.01) return true;
	return facing.Unit.Dot(flatShot.Unit) >= math.cos(MAX_AIM_ANGLE);
}

// Checks a claimed hit against where the server sees the target and the shooter. Returns why it's
// implausible, or undefined if it holds up.
function implausibleHit(
	shooterCharacter: Model,
	targetCharacter: Model,
	hitPart: BasePart,
	origin: Vector3,
	hitPosition: Vector3,
): string | undefined {
	if (hitPosition.sub(hitPart.Position).Magnitude > hitPart.Size.Magnitude + lagTolerance(targetCharacter)) {
		return "target position";
	}
	const shotVector = hitPosition.sub(origin);
	if (!isAimedAlong(shooterCharacter, shotVector)) return "aim";
	const obstruction = Workspace.Raycast(origin, shotVector, lineOfSightParams);
	if (obstruction && obstruction.Position.sub(hitPosition).Magnitude > 1.5) return "line of sight";
	return undefined;
}

export function sendDeathRecap(victim: Player, killer: Player, cause: DeathCause, distance: number) {
	const speed = flatSpeed(getLiveRoot(killer)?.AssemblyLinearVelocity ?? Vector3.zero);
	Remotes.DeathRecap.FireClient(victim, killer.Character, cause, math.floor(distance), speed);
}

function distanceToSegment(point: Vector3, from: Vector3, to: Vector3): number {
	const segment = to.sub(from);
	const length = segment.Dot(segment);
	const along = length > 0 ? math.clamp(point.sub(from).Dot(segment) / length, 0, 1) : 0;
	return from.add(segment.mul(along)).sub(point).Magnitude;
}

// Tells the shooter when a miss just passed a head: encouragement for new players, and a
// reminder that only heads count. Purely cosmetic, so it uses server positions without lag
// allowance. See docs/SKILL_FLOOR.md.
function checkNearMiss(shooter: Player, origin: Vector3, hitPosition: Vector3, currentRules: CombatRules) {
	const heads = [...livingDummyHeads(), ...livingBotHeads()];
	for (const other of Players.GetPlayers()) {
		const otherCharacter = other.Character;
		const otherHumanoid = otherCharacter?.FindFirstChildOfClass("Humanoid");
		const otherHead = otherCharacter?.FindFirstChild("Head");
		if (other === shooter || !otherHumanoid || otherHumanoid.Health <= 0 || !otherHead?.IsA("BasePart")) continue;
		if (currentRules.canDamage(shooter, other)) heads.push(otherHead);
	}
	if (heads.some((head) => distanceToSegment(head.Position, origin, hitPosition) <= NEAR_MISS_STUDS)) {
		Remotes.NearMiss.FireClient(shooter);
	}
}

function onFire(shooter: Player, origin: unknown, hitPosition: unknown, claimedHitPart: unknown) {
	if (!typeIs(origin, "Vector3") || !typeIs(hitPosition, "Vector3")) return;
	if (claimedHitPart !== undefined && !(typeIs(claimedHitPart, "Instance") && claimedHitPart.IsA("BasePart"))) {
		return;
	}
	const hitPart = claimedHitPart as BasePart | undefined;

	const character = shooter.Character;
	const humanoid = character?.FindFirstChildOfClass("Humanoid");
	const head = character?.FindFirstChild("Head");
	if (!character || !humanoid || humanoid.Health <= 0 || !head?.IsA("BasePart")) return;

	const now = os.clock();
	if (now - (lastShotAt.get(shooter) ?? -math.huge) < railCooldown(shooter) - COOLDOWN_LENIENCY) return;
	lastShotAt.set(shooter, now);

	if (origin.sub(head.Position).Magnitude > lagTolerance(character)) return reject(shooter, "origin");
	if (hitPosition.sub(origin).Magnitude > WeaponConfig.range + 1) return reject(shooter, "range");

	Remotes.ShotFired.FireAllClients(shooter, origin, hitPosition);

	// Only clean misses count: hitting anyone (a body shot, say) already has its own feedback.
	const hitSomeone = hitPart?.Parent?.FindFirstChildOfClass("Humanoid") !== undefined;
	if (rules && !hitSomeone) checkNearMiss(shooter, origin, hitPosition, rules);
	if (!hitPart || !rules) return;

	const victimCharacter = hitPart.Parent;
	if (!victimCharacter?.IsA("Model")) return;
	const shotVector = hitPosition.sub(origin);

	// Training dummies take hits through the same validation as players.
	if (isDummy(victimCharacter)) {
		const reason = implausibleHit(character, victimCharacter, hitPart, origin, hitPosition);
		if (reason !== undefined) return reject(shooter, reason);
		const kind = hitDummy(victimCharacter, hitPart.Name === "Head");
		if (kind === undefined) return;
		Remotes.HitConfirm.FireClient(shooter, kind, true);
		if (kind === "kill") Remotes.HeadBurst.FireAllClients(hitPart.Position);
		return;
	}

	// Bots take hits through the same validation as players, and count as real kills.
	if (isBot(victimCharacter)) {
		const reason = implausibleHit(character, victimCharacter, hitPart, origin, hitPosition);
		if (reason !== undefined) return reject(shooter, reason);
		if (hitPart.Name === "Head") {
			if (!killBot(victimCharacter)) return;
			Remotes.HeadBurst.FireAllClients(hitPart.Position);
			awardKill(shooter, victimCharacter, rules, "headshot", shotVector.Magnitude);
		} else {
			pushBot(victimCharacter, shotVector);
			lastPush.set(victimCharacter, {
				shooter,
				character: victimCharacter,
				at: os.clock(),
				distance: shotVector.Magnitude,
			});
			Remotes.HitConfirm.FireClient(shooter, "body", false);
		}
		return;
	}

	const victim = Players.GetPlayerFromCharacter(victimCharacter);
	if (!victim || victim === shooter || !rules.canDamage(shooter, victim)) return;

	const victimHumanoid = victimCharacter.FindFirstChildOfClass("Humanoid");
	if (!victimHumanoid || victimHumanoid.Health <= 0) return;
	if (victimCharacter.FindFirstChildOfClass("ForceField")) return;
	const reason = implausibleHit(character, victimCharacter, hitPart, origin, hitPosition);
	if (reason !== undefined) return reject(shooter, reason);

	const isHead = hitPart.Name === "Head";
	if (hitShield(victim, isHead) === "broken") {
		// A breaking shield absorbs the hit, pushing the target back like a body shot.
		push(shooter, victim, victimCharacter, shotVector);
		Remotes.HitConfirm.FireClient(shooter, "shield", false);
	} else if (isHead) {
		victimHumanoid.Health = 0;
		Remotes.HeadBurst.FireAllClients(hitPart.Position);
		awardKill(shooter, victim, rules, "headshot", shotVector.Magnitude);
	} else {
		push(shooter, victim, victimCharacter, shotVector);
		Remotes.HitConfirm.FireClient(shooter, "body", false);
	}
}

function push(shooter: Player, victim: Player, victimCharacter: Model, shotVector: Vector3) {
	const knockback = WeaponConfig.bodyShotKnockback;
	Remotes.Knockback.FireClient(victim, shotVector.Unit.mul(knockback).add(new Vector3(0, knockback * 0.35, 0)));
	lastPush.set(victim, { shooter, character: victimCharacter, at: os.clock(), distance: shotVector.Magnitude });
}

// Everything a kill earns: stats, XP, feedback, the kill feed, and for player victims their
// recap and the mode's scoring (bots stay out of ratings). Only headshots on players count
// toward the longest-headshot record. `victim` is a player, or a bot's character.
function awardKill(
	shooter: Player,
	victim: Player | Model,
	currentRules: CombatRules,
	cause: DeathCause,
	distance: number,
) {
	lastPush.delete(victim);
	incrementStat(shooter, "Kills");
	Remotes.HitConfirm.FireClient(shooter, "kill", false);
	if (victim.IsA("Player")) {
		recordKill(shooter, cause === "headshot" ? distance : undefined);
		Remotes.KillFeed.FireAllClients(shooter, victim);
		sendDeathRecap(victim, shooter, cause, distance);
		currentRules.onKill(shooter, victim);
	} else {
		recordKill(shooter, undefined);
		Remotes.KillFeed.FireAllClients(shooter, getBotName(victim));
	}
}

// Called when a hazard or the void kills a player or a bot (`victim` is the bot's character).
// Credits whoever knocked them there with a body shot in the last few seconds, as long as they
// could hurt each other.
export function creditEnvironmentalKill(victim: Player | Model, character: Model) {
	const pushed = lastPush.get(victim);
	lastPush.delete(victim);
	if (!pushed || !rules || pushed.character !== character) return;
	if (os.clock() - pushed.at > KNOCKBACK_CREDIT_SECONDS || pushed.shooter.Parent !== Players) return;
	if (victim.IsA("Player") && !rules.canDamage(pushed.shooter, victim)) return;
	awardKill(pushed.shooter, victim, rules, "knockback", pushed.distance);
}

export function startCombat() {
	Remotes.Fire.OnServerEvent.Connect(onFire);
	Players.PlayerRemoving.Connect((player) => {
		lastShotAt.delete(player);
		rejections.delete(player);
		lastPush.delete(player);
	});
}
