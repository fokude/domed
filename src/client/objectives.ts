// Control point strip under the match bar in Domination and Hardpoint: one box per point,
// colored by owner, outlined when contested, with a bar showing capture progress.

import { ControlPointState, getMatchState, getMatchStateJson, onMatchStateChanged } from "shared/matchState";
import { TEAM_COLORS } from "shared/modes";
import { create } from "./ui";

const Players = game.GetService("Players");

const BOX_SIZE = 40;
const PANEL = Color3.fromRGB(20, 22, 28);
const WHITE = new Color3(1, 1, 1);
const CONTESTED = Color3.fromRGB(255, 210, 60);

let strip: Frame;

function buildBox(state: ControlPointState, order: number) {
	const box = create(
		"Frame",
		{
			LayoutOrder: order,
			Size: UDim2.fromOffset(BOX_SIZE, BOX_SIZE),
			BackgroundColor3: state.owner ? TEAM_COLORS[state.owner] : PANEL,
			BackgroundTransparency: state.owner ? 0.1 : 0.25,
		},
		strip,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, box);
	create("UIStroke", { Color: CONTESTED, Thickness: 3, Enabled: state.contested }, box);
	create(
		"TextLabel",
		{
			Size: UDim2.fromScale(1, 1),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 22,
			TextColor3: WHITE,
			Text: state.label,
		},
		box,
	);
	if (state.capturing && state.progress > 0) {
		create(
			"Frame",
			{
				AnchorPoint: new Vector2(0, 1),
				Position: UDim2.fromScale(0, 1),
				Size: new UDim2(state.progress, 0, 0, 4),
				BackgroundColor3: TEAM_COLORS[state.capturing],
				BorderSizePixel: 0,
			},
			box,
		);
	}
}

function refresh() {
	strip.ClearAllChildren();
	create(
		"UIListLayout",
		{
			FillDirection: Enum.FillDirection.Horizontal,
			HorizontalAlignment: Enum.HorizontalAlignment.Center,
			Padding: new UDim(0, 8),
			SortOrder: Enum.SortOrder.LayoutOrder,
		},
		strip,
	);
	const mode = getMatchState("Mode");
	const objectiveMode = (mode === "Domination" || mode === "Hardpoint") && getMatchState("Phase") === "Playing";
	if (!objectiveMode) return;
	getMatchStateJson<ControlPointState[]>("ControlPoints", [])
		.filter((state) => state.active)
		.forEach(buildBox);
}

export function initObjectives() {
	const gui = create(
		"ScreenGui",
		{ Name: "Objectives", ResetOnSpawn: false, IgnoreGuiInset: true },
		Players.LocalPlayer.WaitForChild("PlayerGui"),
	);
	strip = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0, 78),
			Size: UDim2.fromOffset(300, BOX_SIZE),
			BackgroundTransparency: 1,
		},
		gui,
	);
	onMatchStateChanged(["ControlPoints", "Mode", "Phase"], refresh);
	refresh();
}
