// Server-side validation of railgun shots.
//
// Hit detection is client-authoritative: the shooter's client says what it hit and the
// server checks the claim is plausible (fire rate, shooter position, target position,
// line of sight). With fast movement and tiny head hitboxes, server-side raycasts would
// miss constantly because of latency.

import { WeaponConfig } from "shared/config";
import { Remotes } from "shared/remotes";
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

export interface CombatRules {
	canDamage(shooter: Player, victim: Player): boolean;
	onKill(shooter: Player, victim: Player): void;
}

// Undefined between matches: shots still fire and show, but hurt no one.
let rules: CombatRules | undefined;
const lastShotAt = new Map<Player, number>();
const rejections = new Map<Player, number>();

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
	if (now - (lastShotAt.get(shooter) ?? -math.huge) < WeaponConfig.cooldown - COOLDOWN_LENIENCY) return;
	lastShotAt.set(shooter, now);

	if (origin.sub(head.Position).Magnitude > lagTolerance(character)) return reject(shooter, "origin");
	if (hitPosition.sub(origin).Magnitude > WeaponConfig.range + 1) return reject(shooter, "range");

	Remotes.ShotFired.FireAllClients(shooter, origin, hitPosition);

	if (!hitPart || !rules) return;

	const victimCharacter = hitPart.Parent;
	if (!victimCharacter?.IsA("Model")) return;
	const victim = Players.GetPlayerFromCharacter(victimCharacter);
	if (!victim || victim === shooter || !rules.canDamage(shooter, victim)) return;

	const victimHumanoid = victimCharacter.FindFirstChildOfClass("Humanoid");
	if (!victimHumanoid || victimHumanoid.Health <= 0) return;
	if (victimCharacter.FindFirstChildOfClass("ForceField")) return;
	if (hitPosition.sub(hitPart.Position).Magnitude > hitPart.Size.Magnitude + lagTolerance(victimCharacter)) {
		return reject(shooter, "target position");
	}

	const shotVector = hitPosition.sub(origin);
	if (!isAimedAlong(character, shotVector)) return reject(shooter, "aim");
	const obstruction = Workspace.Raycast(origin, shotVector, lineOfSightParams);
	if (obstruction && obstruction.Position.sub(hitPosition).Magnitude > 1.5) return reject(shooter, "line of sight");

	if (hitPart.Name === "Head") {
		victimHumanoid.Health = 0;
		incrementStat(shooter, "Kills");
		recordKill(shooter, shotVector.Magnitude);
		Remotes.HitConfirm.FireClient(shooter, "kill");
		Remotes.KillFeed.FireAllClients(shooter, victim);
		rules.onKill(shooter, victim);
	} else {
		const knockback = WeaponConfig.bodyShotKnockback;
		Remotes.Knockback.FireClient(victim, shotVector.Unit.mul(knockback).add(new Vector3(0, knockback * 0.35, 0)));
		Remotes.HitConfirm.FireClient(shooter, "body");
	}
}

export function startCombat() {
	Remotes.Fire.OnServerEvent.Connect(onFire);
	Players.PlayerRemoving.Connect((player) => {
		lastShotAt.delete(player);
		rejections.delete(player);
	});
}
