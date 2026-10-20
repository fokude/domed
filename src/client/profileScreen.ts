// Profile panel in the menu: level, progress to the next level, and lifetime stats.

import { LifetimeStats, levelForXp } from "shared/progression";
import { addMenuButton, getMenuContent, registerMenuPanel, toggleMenuPanel } from "./menu";
import { getMyProfile, onMyProfileChanged } from "./profileData";
import { create, Palette } from "./ui";

const PANEL_ID = "profile";
const TRACK = Color3.fromRGB(45, 48, 56);

function formatDuration(seconds: number): string {
	const minutes = math.floor(seconds / 60);
	return minutes >= 60 ? `${math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

// Label and formatted value for each stat, in display order.
function statRows(stats: LifetimeStats): [string, string][] {
	const ratio = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;
	return [
		["KILLS", tostring(stats.kills)],
		["DEATHS", tostring(stats.deaths)],
		["K/D", string.format("%.2f", ratio)],
		["WINS", tostring(stats.wins)],
		["MATCHES", tostring(stats.matches)],
		["FLAG CAPTURES", tostring(stats.flagCaptures)],
		["POINT CAPTURES", tostring(stats.pointCaptures)],
		["HARDPOINT TIME", formatDuration(stats.hardpointSeconds)],
		["TOP SPEED", tostring(stats.topSpeed)],
		["LONGEST KILL", `${stats.longestHeadshot} studs`],
		["TIME PLAYED", formatDuration(stats.playSeconds)],
	];
}

let levelLabel: TextLabel;
let xpLabel: TextLabel;
let xpFill: Frame;
let grid: Frame;

function refresh() {
	const profile = getMyProfile();
	if (!profile) {
		levelLabel.Text = "LOADING...";
		return;
	}
	const progress = levelForXp(profile.xp);
	levelLabel.Text = `LEVEL ${progress.level}`;
	xpLabel.Text = `${progress.into} / ${progress.needed} XP`;
	xpFill.Size = UDim2.fromScale(progress.into / progress.needed, 1);

	grid.ClearAllChildren();
	create(
		"UIGridLayout",
		{
			CellSize: new UDim2(0.5, -8, 0, 22),
			CellPadding: UDim2.fromOffset(16, 6),
			SortOrder: Enum.SortOrder.LayoutOrder,
		},
		grid,
	);
	statRows(profile.stats).forEach(([label, value], index) => {
		const cell = create("Frame", { LayoutOrder: index, BackgroundTransparency: 1 }, grid);
		const text = { BackgroundTransparency: 1, Size: UDim2.fromScale(1, 1), TextSize: 15 };
		create(
			"TextLabel",
			{
				...text,
				Font: Enum.Font.GothamBold,
				TextColor3: Palette.Muted,
				TextXAlignment: Enum.TextXAlignment.Left,
				Text: label,
			},
			cell,
		);
		create(
			"TextLabel",
			{
				...text,
				Font: Enum.Font.GothamBlack,
				TextColor3: Palette.White,
				TextXAlignment: Enum.TextXAlignment.Right,
				Text: value,
			},
			cell,
		);
	});
}

function build() {
	const panel = create(
		"Frame",
		{ Size: UDim2.fromScale(1, 1), BackgroundColor3: Palette.Panel, BackgroundTransparency: 0.15 },
		getMenuContent(),
	);
	create("UICorner", { CornerRadius: new UDim(0, 8) }, panel);
	create(
		"UIPadding",
		{ PaddingLeft: new UDim(0, 24), PaddingRight: new UDim(0, 24), PaddingTop: new UDim(0, 20) },
		panel,
	);

	levelLabel = create(
		"TextLabel",
		{
			Size: new UDim2(1, 0, 0, 34),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 30,
			TextColor3: Palette.White,
			TextXAlignment: Enum.TextXAlignment.Left,
		},
		panel,
	);
	xpLabel = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(1, 0),
			Position: new UDim2(1, 0, 0, 8),
			Size: UDim2.fromOffset(200, 20),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 15,
			TextColor3: Palette.Muted,
			TextXAlignment: Enum.TextXAlignment.Right,
		},
		panel,
	);
	const track = create(
		"Frame",
		{ Position: UDim2.fromOffset(0, 42), Size: new UDim2(1, 0, 0, 8), BackgroundColor3: TRACK, BorderSizePixel: 0 },
		panel,
	);
	create("UICorner", { CornerRadius: new UDim(1, 0) }, track);
	xpFill = create(
		"Frame",
		{ Size: UDim2.fromScale(0, 1), BackgroundColor3: Palette.Accent, BorderSizePixel: 0 },
		track,
	);
	create("UICorner", { CornerRadius: new UDim(1, 0) }, xpFill);

	grid = create(
		"Frame",
		{ Position: UDim2.fromOffset(0, 68), Size: new UDim2(1, 0, 1, -88), BackgroundTransparency: 1 },
		panel,
	);
	registerMenuPanel(PANEL_ID, panel);
}

export function initProfileScreen() {
	build();
	addMenuButton("PROFILE", 6, () => toggleMenuPanel(PANEL_ID));
	onMyProfileChanged(refresh);
	refresh();
}
