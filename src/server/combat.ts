// Server-side validation of railgun shots.
//
// Hit detection is client-authoritative: the shooter's client says what it hit and the
// server checks the claim is plausible (fire rate, shooter position, target position,
// line of sight). With fast movement and tiny head hitboxes, server-side raycasts would
// miss constantly because of latency.

import { WeaponConfig } from "shared/config";
import { Remotes } from "shared/remotes";
import { incrementStat } from "./stats";

const Players = game.GetService("Players");
const Workspace = game.GetService("Workspace");

// Seconds of client clock drift allowed when checking fire rate.
const COOLDOWN_LENIENCY = 0.15;
// Positional slack for lag checks: a fixed margin plus distance covered in this many seconds.
const LAG_BASE_STUDS = 6;
const LAG_SECONDS = 0.35;

export interface CombatRules {
	canDamage(shooter: Player, victim: Player): boolean;
	onKill(shooter: Player, victim: Player): void;
}

// Undefined between matches: shots still fire and show, but hurt no one.
let rules: CombatRules | undefined;
const lastShotAt = new Map<Player, number>();

const lineOfSightParams = new RaycastParams();
lineOfSightParams.FilterType = Enum.RaycastFilterType.Include;

export function setCombatRules(newRules: CombatRules | undefined) {
	rules = newRules;
}

export function setCombatArena(arena: Folder) {
	lineOfSightParams.FilterDescendantsInstances = [arena];
}

function lagTolerance(character: Model): number {
	const root = character.FindFirstChild("HumanoidRootPart");
	const speed = root?.IsA("BasePart") ? root.AssemblyLinearVelocity.Magnitude : 0;
	return LAG_BASE_STUDS + speed * LAG_SECONDS;
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

	if (origin.sub(head.Position).Magnitude > lagTolerance(character)) return;
	if (hitPosition.sub(origin).Magnitude > WeaponConfig.range + 1) return;

	Remotes.ShotFired.FireAllClients(shooter, origin, hitPosition);

	if (!hitPart || !rules) return;

	const victimCharacter = hitPart.Parent;
	if (!victimCharacter?.IsA("Model")) return;
	const victim = Players.GetPlayerFromCharacter(victimCharacter);
	if (!victim || victim === shooter || !rules.canDamage(shooter, victim)) return;

	const victimHumanoid = victimCharacter.FindFirstChildOfClass("Humanoid");
	if (!victimHumanoid || victimHumanoid.Health <= 0) return;
	if (victimCharacter.FindFirstChildOfClass("ForceField")) return;
	if (hitPosition.sub(hitPart.Position).Magnitude > hitPart.Size.Magnitude + lagTolerance(victimCharacter)) return;

	const shotVector = hitPosition.sub(origin);
	const obstruction = Workspace.Raycast(origin, shotVector, lineOfSightParams);
	if (obstruction && obstruction.Position.sub(hitPosition).Magnitude > 1.5) return;

	if (hitPart.Name === "Head") {
		victimHumanoid.Health = 0;
		incrementStat(shooter, "Kills");
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
	Players.PlayerRemoving.Connect((player) => lastShotAt.delete(player));
}
