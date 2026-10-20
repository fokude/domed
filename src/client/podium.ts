// Top-three podium: a compact live version at the top of the screen, and a full-screen
// version shown during the intermission after a match.

import { getMatchState, onMatchStateChanged } from "shared/matchState";
import { BOT_STANDINGS_FOLDER, getStandings, Standing } from "shared/standings";
import { create, Palette } from "./ui";

const Players = game.GetService("Players");

const RANK_COLORS = [Color3.fromRGB(255, 196, 0), Color3.fromRGB(200, 205, 215), Color3.fromRGB(205, 127, 50)];
const PANEL_COLOR = Color3.fromRGB(20, 22, 28);
const LOCAL_HIGHLIGHT = Color3.fromRGB(0, 220, 255);

// Screen order is 2nd, 1st, 3rd. Index into these with the rank (0 = first place).
const LIVE_SLOT_LAYOUT = [
	{ anchor: new Vector2(0.5, 0), position: new UDim2(0.5, 0, 0, 0), size: UDim2.fromOffset(150, 52), textSize: 18 },
	{ anchor: new Vector2(1, 0), position: new UDim2(0.5, -81, 0, 6), size: UDim2.fromOffset(124, 40), textSize: 14 },
	{ anchor: new Vector2(0, 0), position: new UDim2(0.5, 81, 0, 6), size: UDim2.fromOffset(124, 40), textSize: 14 },
];
const FINAL_COLUMN_OFFSETS = [0, -230, 230];
const FINAL_PILLAR_HEIGHTS = [170, 125, 90];

interface LiveSlot {
	frame: Frame;
	stroke: UIStroke;
	name: TextLabel;
	kills: TextLabel;
}

const player = Players.LocalPlayer;
const liveSlots: LiveSlot[] = [];
let finalScreen: Frame;
let finalTitle: TextLabel;
let xpLabel: TextLabel;
let finalColumns: Frame;
let finalToken = 0;

// Bots (user id 0) have no avatar.
function avatarImage(userId: number): string {
	if (userId === 0) return "";
	return `rbxthumb://type=AvatarHeadShot&id=${userId}&w=150&h=150`;
}

function buildLiveSlot(parent: Frame, rank: number): LiveSlot {
	const layout = LIVE_SLOT_LAYOUT[rank];
	const frame = create(
		"Frame",
		{
			AnchorPoint: layout.anchor,
			Position: layout.position,
			Size: layout.size,
			BackgroundColor3: PANEL_COLOR,
			BackgroundTransparency: 0.25,
			Visible: false,
		},
		parent,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, frame);
	const stroke = create("UIStroke", { Color: RANK_COLORS[rank], Thickness: 2 }, frame);

	create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(8, 0),
			Size: new UDim2(0, 18, 1, 0),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: layout.textSize,
			TextColor3: RANK_COLORS[rank],
			Text: tostring(rank + 1),
		},
		frame,
	);
	const name = create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(30, 0),
			Size: new UDim2(1, -72, 1, 0),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: layout.textSize - 2,
			TextColor3: Palette.White,
			TextXAlignment: Enum.TextXAlignment.Left,
			TextTruncate: Enum.TextTruncate.AtEnd,
		},
		frame,
	);
	const kills = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(1, 0),
			Position: new UDim2(1, -8, 0, 0),
			Size: new UDim2(0, 36, 1, 0),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: layout.textSize,
			TextColor3: Palette.White,
			TextXAlignment: Enum.TextXAlignment.Right,
		},
		frame,
	);
	return { frame, stroke, name, kills };
}

function refreshLive() {
	const standings = getStandings(Players.GetPlayers());
	// Individual rankings matter in free-for-all; team modes show team scores instead.
	const freeForAll = getMatchState("Mode") === "Deathmatch";
	liveSlots.forEach((slot, rank) => {
		const standing = standings[rank];
		slot.frame.Visible = freeForAll && standing !== undefined;
		if (!standing) return;
		slot.name.Text = standing.name;
		slot.kills.Text = tostring(standing.kills);
		slot.stroke.Color = standing.userId === player.UserId ? LOCAL_HIGHLIGHT : RANK_COLORS[rank];
	});
}

function watchStat(stat: Instance) {
	if (stat.IsA("IntValue")) stat.Changed.Connect(refreshLive);
}

function watchLeaderstats(leaderstats: Instance) {
	leaderstats.GetChildren().forEach(watchStat);
	leaderstats.ChildAdded.Connect((stat) => {
		watchStat(stat);
		refreshLive();
	});
	refreshLive();
}

// Bots' standings live in a replicated folder; refresh when any bot's score changes.
function watchBotStandings() {
	const ReplicatedStorage = game.GetService("ReplicatedStorage");
	const watchFolder = (folder: Instance) => {
		folder.DescendantAdded.Connect((child) => {
			watchStat(child);
			refreshLive();
		});
		folder.DescendantRemoving.Connect(() => task.defer(refreshLive));
		folder.GetDescendants().forEach(watchStat);
		refreshLive();
	};
	const existing = ReplicatedStorage.FindFirstChild(BOT_STANDINGS_FOLDER);
	if (existing) watchFolder(existing);
	else {
		ReplicatedStorage.ChildAdded.Connect((child) => {
			if (child.Name === BOT_STANDINGS_FOLDER) watchFolder(child);
		});
	}
}

function watchPlayer(target: Player) {
	const leaderstats = target.FindFirstChild("leaderstats");
	if (leaderstats) {
		watchLeaderstats(leaderstats);
	} else {
		target.ChildAdded.Connect((child) => {
			if (child.Name === "leaderstats") watchLeaderstats(child);
		});
	}
}

function buildFinalScreen(gui: ScreenGui) {
	finalScreen = create(
		"Frame",
		{
			Size: UDim2.fromScale(1, 1),
			BackgroundColor3: new Color3(0, 0, 0),
			BackgroundTransparency: 0.35,
			Visible: false,
		},
		gui,
	);
	finalTitle = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: UDim2.fromScale(0.5, 0.1),
			Size: UDim2.fromOffset(800, 70),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 56,
			TextColor3: Palette.White,
			Text: "MATCH OVER",
		},
		finalScreen,
	);
	xpLabel = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0.1, 74),
			Size: UDim2.fromOffset(800, 30),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 24,
			TextColor3: RANK_COLORS[0],
			Text: "",
		},
		finalScreen,
	);
	finalColumns = create("Frame", { Size: UDim2.fromScale(1, 1), BackgroundTransparency: 1 }, finalScreen);
}

// Shown under the title on the next end-of-match screen. The server sends it just before the
// match results.
export function setMatchXp(earned: number, level: number, leveledUp: boolean) {
	xpLabel.Text = leveledUp ? `+${earned} XP  ·  LEVEL UP! LEVEL ${level}` : `+${earned} XP  ·  LEVEL ${level}`;
}

function buildFinalColumn(standing: Standing, rank: number) {
	const pillarHeight = FINAL_PILLAR_HEIGHTS[rank];
	const column = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 1),
			Position: new UDim2(0.5, FINAL_COLUMN_OFFSETS[rank], 0.85, 0),
			Size: UDim2.fromOffset(200, pillarHeight + 190),
			BackgroundTransparency: 1,
		},
		finalColumns,
	);

	const avatar = create(
		"ImageLabel",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: UDim2.fromScale(0.5, 0),
			Size: UDim2.fromOffset(100, 100),
			BackgroundColor3: PANEL_COLOR,
			Image: avatarImage(standing.userId),
		},
		column,
	);
	create("UICorner", { CornerRadius: new UDim(1, 0) }, avatar);
	create("UIStroke", { Color: RANK_COLORS[rank], Thickness: 3 }, avatar);

	create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(0, 108),
			Size: new UDim2(1, 0, 0, 30),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: rank === 0 ? 26 : 20,
			TextColor3: Palette.White,
			TextTruncate: Enum.TextTruncate.AtEnd,
			Text: standing.name,
		},
		column,
	);
	create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(0, 140),
			Size: new UDim2(1, 0, 0, 24),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 18,
			TextColor3: RANK_COLORS[rank],
			Text: `${standing.kills} kills  ·  ${standing.deaths} deaths`,
		},
		column,
	);

	const pillar = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0, 1),
			Position: UDim2.fromScale(0, 1),
			Size: new UDim2(1, 0, 0, pillarHeight),
			BackgroundColor3: RANK_COLORS[rank],
		},
		column,
	);
	create("UICorner", { CornerRadius: new UDim(0, 8) }, pillar);
	create(
		"TextLabel",
		{
			Size: UDim2.fromScale(1, 1),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 64,
			TextColor3: PANEL_COLOR,
			Text: tostring(rank + 1),
		},
		pillar,
	);
}

export function showMatchEnd(title: string, standings: Standing[], duration: number) {
	finalTitle.Text = title;
	const token = ++finalToken;
	finalColumns.ClearAllChildren();
	for (let rank = 0; rank < math.min(3, standings.size()); rank++) {
		buildFinalColumn(standings[rank], rank);
	}
	finalScreen.Visible = true;
	task.delay(duration, () => {
		if (finalToken !== token) return;
		finalScreen.Visible = false;
		xpLabel.Text = "";
	});
}

export function initPodium() {
	const gui = create(
		"ScreenGui",
		{ Name: "Podium", ResetOnSpawn: false, IgnoreGuiInset: true, DisplayOrder: 10 },
		player.WaitForChild("PlayerGui"),
	);

	const live = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0),
			// Sits below the match bar.
			Position: new UDim2(0.5, 0, 0, 78),
			Size: UDim2.fromOffset(420, 52),
			BackgroundTransparency: 1,
		},
		gui,
	);
	for (let rank = 0; rank < 3; rank++) {
		liveSlots.push(buildLiveSlot(live, rank));
	}
	buildFinalScreen(gui);

	Players.GetPlayers().forEach(watchPlayer);
	Players.PlayerAdded.Connect(watchPlayer);
	// The leaving player is still listed during PlayerRemoving, so refresh after it's gone.
	Players.PlayerRemoving.Connect(() => task.defer(refreshLive));
	watchBotStandings();
	onMatchStateChanged(["Mode"], refreshLive);
	refreshLive();
}
