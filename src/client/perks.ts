// Client side of perks: a panel listing the player's active perks, Radar's through-wall enemy
// outlines, and pickup announcements in the kill feed. See docs/PERKS.md.

import { PERK_INFO, PerkAttribute, PerkId, timeLeft } from "shared/perks";
import { Remotes } from "shared/remotes";
import { addPerkTaken } from "./hud";
import { create } from "./ui";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

const RADAR_HIGHLIGHT = "RadarHighlight";
const REFRESH_INTERVAL = 0.1;

const player = Players.LocalPlayer;

let panel: Frame;
let elapsed = 0;

function isEnemy(other: Player): boolean {
	if (other === player) return false;
	// Free-for-all has no teams: everyone else is an enemy.
	return player.Team === undefined || other.Team !== player.Team;
}

// Outlines enemies through walls while Radar lasts. Shooting still needs real line of sight.
function updateRadar(active: boolean) {
	for (const other of Players.GetPlayers()) {
		const character = other.Character;
		if (!character) continue;
		const existing = character.FindFirstChild(RADAR_HIGHLIGHT);
		if (!active || !isEnemy(other)) {
			existing?.Destroy();
			continue;
		}
		if (existing) continue;
		const highlight = new Instance("Highlight");
		highlight.Name = RADAR_HIGHLIGHT;
		highlight.FillTransparency = 0.7;
		highlight.FillColor = PERK_INFO.Radar.color;
		highlight.OutlineColor = PERK_INFO.Radar.color;
		highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop;
		highlight.Parent = character;
	}
}

// Text for each perk the player has right now.
function activePerks(): [PerkId, string][] {
	const lines: [PerkId, string][] = [];
	if (player.GetAttribute(PerkAttribute.SuperJump) === true) lines.push(["SuperJump", "SUPER JUMP READY"]);
	if (player.GetAttribute(PerkAttribute.Shield) === true) lines.push(["Shield", "SHIELD"]);
	const overcharge = timeLeft(player, PerkAttribute.OverchargeUntil);
	if (overcharge > 0) lines.push(["Overcharge", `OVERCHARGE ${math.ceil(overcharge)}`]);
	const radar = timeLeft(player, PerkAttribute.RadarUntil);
	if (radar > 0) lines.push(["Radar", `RADAR ${math.ceil(radar)}`]);
	return lines;
}

function refresh() {
	panel.ClearAllChildren();
	create("UIListLayout", { Padding: new UDim(0, 4), VerticalAlignment: Enum.VerticalAlignment.Bottom }, panel);
	for (const [perk, text] of activePerks()) {
		create(
			"TextLabel",
			{
				Size: new UDim2(1, 0, 0, 24),
				BackgroundTransparency: 1,
				Font: Enum.Font.GothamBlack,
				TextSize: 20,
				TextColor3: PERK_INFO[perk].color,
				TextStrokeTransparency: 0.4,
				TextXAlignment: Enum.TextXAlignment.Left,
				Text: text,
			},
			panel,
		);
	}
	updateRadar(timeLeft(player, PerkAttribute.RadarUntil) > 0);
}

export function initPerks() {
	const gui = create(
		"ScreenGui",
		{ Name: "Perks", ResetOnSpawn: false, IgnoreGuiInset: true },
		player.WaitForChild("PlayerGui"),
	);
	panel = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0, 1),
			Position: new UDim2(0, 24, 1, -40),
			Size: UDim2.fromOffset(300, 120),
			BackgroundTransparency: 1,
		},
		gui,
	);

	RunService.Heartbeat.Connect((dt) => {
		elapsed += dt;
		if (elapsed < REFRESH_INTERVAL) return;
		elapsed = 0;
		refresh();
	});
	Remotes.PerkTaken.OnClientEvent.Connect((taker, perk) => {
		addPerkTaken(taker.DisplayName, PERK_INFO[perk].name, PERK_INFO[perk].color);
	});
}
