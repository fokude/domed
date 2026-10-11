// Client entry point: sets up the first-person camera and wires modules to server events.

import { MatchConfig } from "shared/config";
import { Remotes } from "shared/remotes";
import { addKill, HudColors, initHud, showBanner } from "./hud";
import { initMapVote } from "./mapVote";
import { initMatchBar } from "./matchBar";
import { initMenu } from "./menu";
import { getSpeed, initMovement, launchCharacter } from "./movement";
import { initObjectives } from "./objectives";
import { initPodium, showMatchEnd } from "./podium";
import { initSpeedometer, setSpeed } from "./speedometer";
import { initTeammates } from "./teammates";
import { initWeapon } from "./weapon";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const StarterGui = game.GetService("StarterGui");

const player = Players.LocalPlayer;

player.CameraMode = Enum.CameraMode.LockFirstPerson;
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Health, false);

initHud();
initMatchBar();
initObjectives();
initPodium();
initSpeedometer();
initMovement();
initWeapon();
initMenu();
initMapVote();
initTeammates();

Remotes.Knockback.OnClientEvent.Connect((impulse) => launchCharacter(impulse, true));

Remotes.KillFeed.OnClientEvent.Connect((killer, victim) => {
	const killerName = killer?.DisplayName ?? "?";
	const victimName = victim?.DisplayName ?? "?";
	addKill(killerName, victimName);
	if (victim === player) showBanner(`DOMED BY ${killerName}`, HudColors.Red, MatchConfig.respawnTime);
});

Remotes.MatchEnded.OnClientEvent.Connect(showMatchEnd);

Remotes.Announce.OnClientEvent.Connect((text, duration) => showBanner(text, HudColors.White, duration));

RunService.RenderStepped.Connect(() => setSpeed(getSpeed()));
