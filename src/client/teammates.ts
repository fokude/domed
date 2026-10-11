// Outlines teammates through walls in team modes so allies are easy to tell from enemies.

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

const HIGHLIGHT_NAME = "TeammateHighlight";
const REFRESH_INTERVAL = 0.5;

const player = Players.LocalPlayer;

function refresh() {
	for (const other of Players.GetPlayers()) {
		const character = other.Character;
		if (!character || other === player) continue;

		const isTeammate = player.Team !== undefined && other.Team === player.Team;
		const existing = character.FindFirstChild(HIGHLIGHT_NAME);
		if (!isTeammate) {
			existing?.Destroy();
			continue;
		}
		const highlight = existing?.IsA("Highlight") ? existing : new Instance("Highlight");
		highlight.Name = HIGHLIGHT_NAME;
		highlight.FillTransparency = 1;
		highlight.OutlineColor = other.TeamColor.Color;
		highlight.OutlineTransparency = 0.2;
		highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop;
		highlight.Parent = character;
	}
}

// Polling keeps this simple: teams, characters and respawns all change what should be outlined.
export function initTeammates() {
	let elapsed = 0;
	RunService.Heartbeat.Connect((dt) => {
		elapsed += dt;
		if (elapsed < REFRESH_INTERVAL) return;
		elapsed = 0;
		refresh();
	});
}
