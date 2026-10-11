// Client entry point: sets up the first-person camera and wires modules to server events.

import { MatchConfig } from "shared/config";
import { Remotes } from "shared/remotes";
import { addKill, HudColors, initHud, setSpeed, showBanner } from "./hud";
import { getSpeed, initMovement, launchCharacter } from "./movement";
import { initWeapon } from "./weapon";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const StarterGui = game.GetService("StarterGui");
const UserInputService = game.GetService("UserInputService");

const player = Players.LocalPlayer;

player.CameraMode = Enum.CameraMode.LockFirstPerson;
UserInputService.MouseIconEnabled = false;
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Health, false);

initHud();
initMovement();
initWeapon();

Remotes.Knockback.OnClientEvent.Connect((impulse) => launchCharacter(impulse, true));

Remotes.KillFeed.OnClientEvent.Connect((killer, victim) => {
	const killerName = killer?.DisplayName ?? "?";
	const victimName = victim?.DisplayName ?? "?";
	addKill(killerName, victimName);
	if (victim === player) showBanner(`DOMED BY ${killerName}`, HudColors.Red, MatchConfig.respawnTime);
});

Remotes.Announce.OnClientEvent.Connect((text, duration) => showBanner(text, HudColors.White, duration));

RunService.RenderStepped.Connect(() => setSpeed(getSpeed()));

showBanner(`FIRST TO ${MatchConfig.killsToWin} HEADSHOTS`, HudColors.White, 3);
