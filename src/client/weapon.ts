// The railgun: hitscan from the camera, one shot per cooldown, hold to keep firing.

import { isAlive } from "shared/characters";
import { WeaponConfig as Config } from "shared/config";
import { HitKind, Remotes } from "shared/remotes";
import { HudColors, setCooldown, showBanner, showHitmarker } from "./hud";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const TweenService = game.GetService("TweenService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const LOCAL_BEAM_COLOR = Color3.fromRGB(0, 220, 255);
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

function fire() {
	const character = player.Character;
	const camera = Workspace.CurrentCamera;
	if (!character || !camera || !isAlive(character)) return;

	const now = os.clock();
	if (now - lastShotAt < Config.cooldown) return;
	lastShotAt = now;

	const cameraCFrame = camera.CFrame;
	const origin = cameraCFrame.Position;
	const direction = cameraCFrame.LookVector.mul(Config.range);

	rayParams.FilterDescendantsInstances = [character, effects];
	const result = Workspace.Raycast(origin, direction, rayParams);
	const hitPosition = result ? result.Position : origin.add(direction);
	const hitPart = result?.Instance.IsA("BasePart") ? resolveHitPart(result.Instance) : undefined;

	drawBeam(cameraCFrame.PointToWorldSpace(MUZZLE_OFFSET), hitPosition, LOCAL_BEAM_COLOR);

	const hitCharacter = hitPart?.Parent;
	const hitPlayer = hitCharacter?.IsA("Model") ? Players.GetPlayerFromCharacter(hitCharacter) : undefined;
	const isTeammate = hitPlayer !== undefined && player.Team !== undefined && hitPlayer.Team === player.Team;
	if (hitPart && hitCharacter?.IsA("Model") && isAlive(hitCharacter) && !isTeammate) {
		showHitmarker(hitPart.Name === "Head");
	}

	Remotes.Fire.FireServer(origin, hitPosition, hitPart);
}

function onShotFired(shooter: Player, origin: Vector3, hitPosition: Vector3) {
	if (shooter === player) return;
	const color = shooter.Team ? shooter.TeamColor.Color : ENEMY_BEAM_COLOR;
	drawBeam(origin.sub(new Vector3(0, 0.5, 0)), hitPosition, color);
}

function onHitConfirm(kind: HitKind) {
	if (kind === "kill") showBanner("DOMED", HudColors.Red, 0.8);
}

export function initWeapon() {
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (input.UserInputType === Enum.UserInputType.MouseButton1 && !gameProcessed) triggerHeld = true;
	});
	UserInputService.InputEnded.Connect((input) => {
		if (input.UserInputType === Enum.UserInputType.MouseButton1) triggerHeld = false;
	});

	RunService.RenderStepped.Connect(() => {
		if (triggerHeld) fire();
		setCooldown(math.clamp((os.clock() - lastShotAt) / Config.cooldown, 0, 1));
	});

	Remotes.ShotFired.OnClientEvent.Connect(onShotFired);
	Remotes.HitConfirm.OnClientEvent.Connect(onHitConfirm);
}
