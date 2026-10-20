// The rocket jump: right-click blasts you the way you're looking, so looking up sends you into
// the air. It shares the rail's cooldown time, works once per airtime, and never hurts anyone.
// See docs/MOVEMENT.md.

import { MovementConfig, WeaponConfig } from "shared/config";
import { DEPLOYED_ATTRIBUTE } from "shared/matchState";
import { setRocketJumpCooldown } from "./hud";
import { rocketJumpCharacter } from "./movement";
import { playSound } from "./sounds";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const player = Players.LocalPlayer;
let lastRocketJumpAt = -math.huge;

function rocketJump() {
	const camera = Workspace.CurrentCamera;
	if (!camera || player.GetAttribute(DEPLOYED_ATTRIBUTE) !== true) return;
	const now = os.clock();
	if (now - lastRocketJumpAt < WeaponConfig.cooldown) return;

	// Along the look direction, but never downward: aiming at the floor only pushes you sideways.
	const look = camera.CFrame.LookVector;
	const blast = new Vector3(look.X, math.max(look.Y, 0), look.Z).mul(MovementConfig.rocketJumpVelocity);
	if (!rocketJumpCharacter(blast)) return;
	lastRocketJumpAt = now;
	playSound("rocketJump");
}

export function initRocketJump() {
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton2) rocketJump();
	});
	RunService.RenderStepped.Connect(() =>
		setRocketJumpCooldown(math.clamp((os.clock() - lastRocketJumpAt) / WeaponConfig.cooldown, 0, 1)),
	);
}
