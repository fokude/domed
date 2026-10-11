// Timer and score strip at the top of the screen. In team modes it shows team scores either side of
// the timer, with each flag's status underneath.

import { FlagStatus, getMatchState, onMatchStateChanged } from "shared/matchState";
import { MODE_NAMES, TEAM_COLORS, TeamId } from "shared/modes";
import { create } from "./ui";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const Workspace = game.GetService("Workspace");

const PANEL_COLOR = Color3.fromRGB(20, 22, 28);
const WHITE = new Color3(1, 1, 1);
const MUTED = Color3.fromRGB(170, 175, 185);

const FLAG_LABELS: Record<FlagStatus, string> = { Home: "FLAG HOME", Taken: "FLAG TAKEN", Dropped: "FLAG DROPPED" };

interface TeamBox {
	frame: Frame;
	score: TextLabel;
	flag: TextLabel;
}

let timer: TextLabel;
let subtitle: TextLabel;
const teamBoxes = new Map<TeamId, TeamBox>();

function formatTime(seconds: number): string {
	const clamped = math.max(0, math.ceil(seconds));
	return string.format("%d:%02d", math.floor(clamped / 60), clamped % 60);
}

function buildTeamBox(parent: Frame, team: TeamId, side: number): TeamBox {
	const frame = create(
		"Frame",
		{
			AnchorPoint: new Vector2(side < 0 ? 1 : 0, 0),
			Position: new UDim2(0.5, side * 56, 0, 0),
			Size: UDim2.fromOffset(84, 44),
			BackgroundColor3: TEAM_COLORS[team],
			BackgroundTransparency: 0.2,
			Visible: false,
		},
		parent,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, frame);
	const score = create(
		"TextLabel",
		{
			Size: new UDim2(1, 0, 0, 30),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 26,
			TextColor3: WHITE,
			Text: "0",
		},
		frame,
	);
	const flag = create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(0, 28),
			Size: new UDim2(1, 0, 0, 14),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 10,
			TextColor3: WHITE,
		},
		frame,
	);
	return { frame, score, flag };
}

function refresh() {
	const mode = getMatchState("Mode");
	const phase = getMatchState("Phase");
	const isTeamMode = mode !== undefined && mode !== "Deathmatch" && phase === "Playing";

	for (const [team, box] of teamBoxes) {
		box.frame.Visible = isTeamMode;
		box.flag.Visible = mode === "CTF";
		box.score.Text = tostring(getMatchState(team === "Red" ? "RedScore" : "BlueScore") ?? 0);
		box.flag.Text = FLAG_LABELS[getMatchState(team === "Red" ? "RedFlag" : "BlueFlag") ?? "Home"];
	}

	const target = getMatchState("ScoreTarget") ?? 0;
	if (phase === "Results") {
		subtitle.Text = "MATCH OVER";
	} else if (phase === "Warmup") {
		subtitle.Text = "WARM-UP  ·  PRESS 1, 2 OR 3 TO VOTE FOR THE NEXT MAP";
	} else if (mode) {
		const goal =
			mode === "CTF"
				? `${target} CAPTURES`
				: mode === "Deathmatch" || mode === "TeamDeathmatch"
					? `${target} KILLS`
					: `${target} POINTS`;
		subtitle.Text = `${MODE_NAMES[mode]}  ·  ${getMatchState("MapName") ?? ""}  ·  FIRST TO ${goal}`;
	}
}

export function initMatchBar() {
	const gui = create(
		"ScreenGui",
		{ Name: "MatchBar", ResetOnSpawn: false, IgnoreGuiInset: true },
		Players.LocalPlayer.WaitForChild("PlayerGui"),
	);
	const bar = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0, 8),
			Size: UDim2.fromOffset(600, 62),
			BackgroundTransparency: 1,
		},
		gui,
	);

	const timerBox = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: UDim2.fromScale(0.5, 0),
			Size: UDim2.fromOffset(100, 44),
			BackgroundColor3: PANEL_COLOR,
			BackgroundTransparency: 0.25,
		},
		bar,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, timerBox);
	timer = create(
		"TextLabel",
		{
			Size: UDim2.fromScale(1, 1),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 24,
			TextColor3: WHITE,
			Text: "",
		},
		timerBox,
	);
	subtitle = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0, 46),
			Size: new UDim2(1, 0, 0, 16),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 12,
			TextColor3: MUTED,
			TextStrokeTransparency: 0.6,
		},
		bar,
	);

	teamBoxes.set("Red", buildTeamBox(bar, "Red", -1));
	teamBoxes.set("Blue", buildTeamBox(bar, "Blue", 1));

	onMatchStateChanged(
		["Phase", "Mode", "MapName", "ScoreTarget", "RedScore", "BlueScore", "RedFlag", "BlueFlag"],
		refresh,
	);
	refresh();

	RunService.RenderStepped.Connect(() => {
		const endsAt = getMatchState("EndsAt");
		timer.Text = endsAt !== undefined ? formatTime(endsAt - Workspace.GetServerTimeNow()) : "";
	});
}
