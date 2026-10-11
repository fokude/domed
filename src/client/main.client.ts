// Client entry point: sets up the first-person camera and wires modules to server events.

import { MatchConfig } from "shared/config";
import { getMatchState } from "shared/matchState";
import { Remotes } from "shared/remotes";
import { addKill, hideRespawnCountdown, HudColors, initHud, showBanner, showRespawnCountdown } from "./hud";
import { initKillFeedback } from "./killFeedback";
import { initMapVote } from "./mapVote";
import { initMatchBar } from "./matchBar";
import { initMenu } from "./menu";
import { getSpeed, initMovement, launchCharacter } from "./movement";
import { initObjectives } from "./objectives";
import { initOnboarding } from "./onboarding";
import { initPerks } from "./perks";
import { initPodium, setMatchXp, showMatchEnd } from "./podium";
import { initProfileScreen } from "./profileScreen";
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
initKillFeedback();
initMenu();
initMapVote();
initOnboarding();
initPerks();
initProfileScreen();
initTeammates();

Remotes.Knockback.OnClientEvent.Connect((impulse) => launchCharacter(impulse, true));

function currentRespawnTime(): number {
	return getMatchState("RespawnTime") ?? MatchConfig.respawnTime;
}

// Every death shows the countdown, including falls and hazards that have no killer.
player.CharacterAdded.Connect((character) => {
	hideRespawnCountdown();
	const humanoid = character.WaitForChild("Humanoid") as Humanoid;
	humanoid.Died.Connect(() => {
		if (getMatchState("Phase") === "Playing") showRespawnCountdown(currentRespawnTime());
	});
});

Remotes.KillFeed.OnClientEvent.Connect((killer, victim) => {
	const killerName = killer?.DisplayName ?? "?";
	const victimName = victim?.DisplayName ?? "?";
	addKill(killerName, victimName);
	if (victim === player) showBanner(`DOMED BY ${killerName}`, HudColors.Red, currentRespawnTime());
});

Remotes.MatchEnded.OnClientEvent.Connect(showMatchEnd);
Remotes.MatchXp.OnClientEvent.Connect(setMatchXp);

Remotes.Announce.OnClientEvent.Connect((text, duration) => showBanner(text, HudColors.White, duration));

RunService.RenderStepped.Connect(() => setSpeed(getSpeed()));
