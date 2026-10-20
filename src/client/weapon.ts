// The railgun: hitscan from the camera, one shot per cooldown, hold to keep firing. Right-click
// fires a rocket-jump shot on the same cooldown: it hurts no one, and blasts the shooter away
// from where it lands if that's close enough (see docs/MOVEMENT.md).

import { isAlive } from "shared/characters";
import { MovementConfig, WeaponConfig as Config } from "shared/config";
import { PERK_INFO, PerkAttribute, railCooldown, timeLeft } from "shared/perks";
import { Remotes } from "shared/remotes";
import { setCooldown, showHitmarker } from "./hud";
import { rocketJumpCharacter } from "./movement";
import { playSound } from "./sounds";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const TweenService = game.GetService("TweenService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const LOCAL_BEAM_COLOR = Color3.fromRGB(0, 220, 255);
const ROCKET_BEAM_COLOR = Color3.fromRGB(255, 150, 40);
const ENEMY_BEAM_COLOR = Color3.fromRGB(255, 70, 40);
const BEAM_FADE_TIME = 0.5;
// Where the beam appears to leave the gun, relative to the camera (right, up, forward).
const MUZZLE_OFFSET = new Vector3(0.7, -0.6, -1.2);

const player = Players.LocalPlayer;

const effects = new Instance("Folder");
effects.Name = "RailEffects";
effects.Parent = Workspace;

const rayParams = new RaycastParams();
rayParams.FilterType = Enum.RaycastFilterType.Exclude;

let lastShotAt = -math.huge;
let triggerHeld = false;
let rocketTriggerHeld = false;

function drawBeam(from: Vector3, to: Vector3, color: Color3) {
	const length = to.sub(from).Magnitude;
	if (length < 0.1) return;

	const beam = new Instance("Part");
	beam.Anchored = true;
	beam.CanCollide = false;
	beam.CanQuery = false;
	beam.CanTouch = false;
	beam.CastShadow = false;
	beam.Material = Enum.Material.Neon;
	beam.Color = color;
	beam.Size = new Vector3(0.2, 0.2, length);
	beam.CFrame = CFrame.lookAt(from.add(to).div(2), to);
	beam.Parent = effects;

	const fade = TweenService.Create(beam, new TweenInfo(BEAM_FADE_TIME), {
		Transparency: 1,
		Size: new Vector3(0.02, 0.02, length),
	});
	fade.Completed.Connect(() => beam.Destroy());
	fade.Play();
}

// Hats sit over the head, so a hit on an accessory counts as a hit on the body part
// it is welded to. Unattached accessories count as misses.
function resolveHitPart(part: BasePart): BasePart | undefined {
	const accessory = part.FindFirstAncestorOfClass("Accessory");
	if (!accessory) return part;

	const handle = accessory.FindFirstChild("Handle");
	const weld = handle?.FindFirstChild("AccessoryWeld");
	if (weld?.IsA("Weld")) return weld.Part0 === handle ? weld.Part1 : weld.Part0;
	return undefined;
}

// A rocket-jump shot landing at `blastPoint`: blasts the shooter away from it, full strength
// within rocketJumpFullRadius of their root and fading to nothing at rocketJumpRadius.
function rocketBlast(character: Model, blastPoint: Vector3) {
	const root = character.FindFirstChild("HumanoidRootPart");
	if (!root?.IsA("BasePart")) return;
	const offset = root.Position.sub(blastPoint);
	const distance = offset.Magnitude;
	if (distance > MovementConfig.rocketJumpRadius || distance < 0.01) return;

	const full = MovementConfig.rocketJumpFullRadius;
	const falloff = 1 - math.max(0, distance - full) / (MovementConfig.rocketJumpRadius - full);
	rocketJumpCharacter(offset.Unit.mul(MovementConfig.rocketJumpVelocity * falloff));

	// Purely visual: no pressure, no broken joints, and only this client sees it.
	const explosion = new Instance("Explosion");
	explosion.Position = blastPoint;
	explosion.BlastPressure = 0;
	explosion.BlastRadius = 4;
	explosion.DestroyJointRadiusPercent = 0;
	explosion.Parent = effects;
	playSound("rocketJump");
}

// `rocket` fires the right-click rocket-jump shot, which never claims a hit.
function fire(rocket: boolean) {
	const character = player.Character;
	const camera = Workspace.CurrentCamera;
	if (!character || !camera || !isAlive(character)) return;

	const now = os.clock();
	if (now - lastShotAt < railCooldown(player)) return;
	lastShotAt = now;

	const cameraCFrame = camera.CFrame;
	const origin = cameraCFrame.Position;
	const direction = cameraCFrame.LookVector.mul(Config.range);

	rayParams.FilterDescendantsInstances = [character, effects];
	const result = Workspace.Raycast(origin, direction, rayParams);
	const hitPosition = result ? result.Position : origin.add(direction);
	const hitPart = result?.Instance.IsA("BasePart") ? resolveHitPart(result.Instance) : undefined;

	const color = rocket ? ROCKET_BEAM_COLOR : beamColor(player, LOCAL_BEAM_COLOR);
	drawBeam(cameraCFrame.PointToWorldSpace(MUZZLE_OFFSET), hitPosition, color);

	// The server sees a rocket shot as a miss, so others still see the beam and the shared
	// cooldown is enforced there too.
	if (rocket) {
		Remotes.Fire.FireServer(origin, hitPosition, undefined);
		if (result) rocketBlast(character, hitPosition);
		return;
	}

	const hitCharacter = hitPart?.Parent;
	const hitPlayer = hitCharacter?.IsA("Model") ? Players.GetPlayerFromCharacter(hitCharacter) : undefined;
	const isTeammate = hitPlayer !== undefined && player.Team !== undefined && hitPlayer.Team === player.Team;
	if (hitPart && hitCharacter?.IsA("Model") && isAlive(hitCharacter) && !isTeammate) {
		showHitmarker(hitPart.Name === "Head");
	}

	Remotes.Fire.FireServer(origin, hitPosition, hitPart);
}

function onShotFired(shooter: Player | undefined, origin: Vector3, hitPosition: Vector3) {
	if (shooter === player) return;
	// Bots (no shooter) are always enemies.
	if (!shooter) return drawBeam(origin.sub(new Vector3(0, 0.5, 0)), hitPosition, ENEMY_BEAM_COLOR);
	const color = shooter.Team ? shooter.TeamColor.Color : ENEMY_BEAM_COLOR;
	drawBeam(origin.sub(new Vector3(0, 0.5, 0)), hitPosition, beamColor(shooter, color));
}

// Overcharged shots are gold for everyone, so the boost is visible and can be played around.
function beamColor(shooter: Player, normal: Color3): Color3 {
	return timeLeft(shooter, PerkAttribute.OverchargeUntil) > 0 ? PERK_INFO.Overcharge.color : normal;
}

export function initWeapon() {
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return;
		if (input.UserInputType === Enum.UserInputType.MouseButton1) triggerHeld = true;
		if (input.UserInputType === Enum.UserInputType.MouseButton2) rocketTriggerHeld = true;
	});
	UserInputService.InputEnded.Connect((input) => {
		if (input.UserInputType === Enum.UserInputType.MouseButton1) triggerHeld = false;
		if (input.UserInputType === Enum.UserInputType.MouseButton2) rocketTriggerHeld = false;
	});

	RunService.RenderStepped.Connect(() => {
		if (triggerHeld) fire(false);
		else if (rocketTriggerHeld) fire(true);
		setCooldown(math.clamp((os.clock() - lastShotAt) / railCooldown(player), 0, 1));
	});

	Remotes.ShotFired.OnClientEvent.Connect(onShotFired);
}
