// The shove: F or right mouse pushes whoever is right in front of you, with its own cooldown.
// The server decides who gets pushed. See docs/WEAPON.md.

import { WeaponConfig } from "shared/config";
import { DEPLOYED_ATTRIBUTE } from "shared/matchState";
import { Remotes } from "shared/remotes";
import { setShoveCooldown } from "./hud";
import { playSound } from "./sounds";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const player = Players.LocalPlayer;
let lastShoveAt = -math.huge;

function isShoveInput(input: InputObject): boolean {
	return input.KeyCode === Enum.KeyCode.F || input.UserInputType === Enum.UserInputType.MouseButton2;
}

function shove() {
	const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
	const camera = Workspace.CurrentCamera;
	if (!humanoid || humanoid.Health <= 0 || !camera || player.GetAttribute(DEPLOYED_ATTRIBUTE) !== true) return;
	const now = os.clock();
	if (now - lastShoveAt < WeaponConfig.shoveCooldown) return;
	lastShoveAt = now;
	playSound("shove");
	Remotes.Shove.FireServer(camera.CFrame.LookVector);
}

export function initShove() {
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (!gameProcessed && isShoveInput(input)) shove();
	});
	RunService.RenderStepped.Connect(() =>
		setShoveCooldown(math.clamp((os.clock() - lastShoveAt) / WeaponConfig.shoveCooldown, 0, 1)),
	);
}
