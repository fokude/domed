// Death recap: after being killed, a line under the respawn countdown says how (distance, and
// how fast the killer was moving), and the killer is outlined through walls until respawn.
// Deaths should feel fair and learnable; see docs/SKILL_FLOOR.md.

import { MatchConfig } from "shared/config";
import { getMatchState } from "shared/matchState";
import { DeathCause, Remotes } from "shared/remotes";
import { showDeathDetail } from "./hud";

const Players = game.GetService("Players");

const KILLER_HIGHLIGHT = "KillerHighlight";
const KILLER_COLOR = Color3.fromRGB(255, 60, 40);

const player = Players.LocalPlayer;

function describe(cause: DeathCause, distance: number, killerSpeed: number): string {
	const how = cause === "knockback" ? `KNOCKED OUT FROM ${distance} STUDS` : `${distance} STUDS`;
	return `${how}  ·  THEY WERE MOVING AT ${killerSpeed}`;
}

function outlineKiller(character: Model, seconds: number) {
	if (!character.Parent || character.FindFirstChild(KILLER_HIGHLIGHT)) return;
	const highlight = new Instance("Highlight");
	highlight.Name = KILLER_HIGHLIGHT;
	highlight.FillTransparency = 1;
	highlight.OutlineColor = KILLER_COLOR;
	highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop;
	highlight.Parent = character;
	task.delay(seconds, () => highlight.Destroy());
	// Respawning ends the recap early.
	const connection = player.CharacterAdded.Connect(() => {
		connection.Disconnect();
		highlight.Destroy();
	});
}

export function initDeathRecap() {
	Remotes.DeathRecap.OnClientEvent.Connect((killerCharacter, cause, distance, killerSpeed) => {
		showDeathDetail(describe(cause, distance, killerSpeed));
		if (killerCharacter) outlineKiller(killerCharacter, getMatchState("RespawnTime") ?? MatchConfig.respawnTime);
	});
}
