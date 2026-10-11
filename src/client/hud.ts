// Crosshair, hitmarker, rail cooldown, kill feed, and center-screen banner.

import { create } from "./ui";

const Players = game.GetService("Players");

const MAX_FEED_ENTRIES = 5;
const FEED_LIFETIME = 6;
const HITMARKER_TIME = 0.15;

export const HudColors = {
	White: new Color3(1, 1, 1),
	Black: new Color3(0, 0, 0),
	Red: Color3.fromRGB(255, 60, 40),
	Cyan: Color3.fromRGB(0, 220, 255),
};

let hitmarker: Frame;
let cooldownFill: Frame;
let feed: Frame;
let banner: TextLabel;
let respawnLabel: TextLabel;

let hitmarkerToken = 0;
let bannerToken = 0;
let respawnToken = 0;
let feedCount = 0;
const feedEntries: TextLabel[] = [];

function escapeRichText(text: string): string {
	return text.gsub("&", "&amp;")[0].gsub("<", "&lt;")[0].gsub(">", "&gt;")[0];
}

function buildCrosshair(gui: ScreenGui) {
	const dot = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromScale(0.5, 0.5),
			Size: UDim2.fromOffset(4, 4),
			BackgroundColor3: HudColors.White,
			BorderSizePixel: 0,
		},
		gui,
	);
	create("UIStroke", { Color: HudColors.Black, Thickness: 1 }, dot);

	hitmarker = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromScale(0.5, 0.5),
			Size: UDim2.fromOffset(22, 22),
			BackgroundTransparency: 1,
			Visible: false,
		},
		gui,
	);
	for (const rotation of [45, -45]) {
		create(
			"Frame",
			{
				AnchorPoint: new Vector2(0.5, 0.5),
				Position: UDim2.fromScale(0.5, 0.5),
				Size: new UDim2(1, 0, 0, 2),
				Rotation: rotation,
				BackgroundColor3: HudColors.White,
				BorderSizePixel: 0,
			},
			hitmarker,
		);
	}

	const cooldownTrack = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0.5, 18),
			Size: UDim2.fromOffset(40, 3),
			BackgroundColor3: HudColors.Black,
			BackgroundTransparency: 0.5,
			BorderSizePixel: 0,
		},
		gui,
	);
	cooldownFill = create(
		"Frame",
		{ Size: UDim2.fromScale(1, 1), BackgroundColor3: HudColors.Cyan, BorderSizePixel: 0 },
		cooldownTrack,
	);
}

function buildPanels(gui: ScreenGui) {
	feed = create(
		"Frame",
		{
			AnchorPoint: new Vector2(1, 0),
			Position: new UDim2(1, -20, 0, 60),
			Size: UDim2.fromOffset(320, 200),
			BackgroundTransparency: 1,
		},
		gui,
	);
	create(
		"UIListLayout",
		{
			HorizontalAlignment: Enum.HorizontalAlignment.Right,
			SortOrder: Enum.SortOrder.LayoutOrder,
			Padding: new UDim(0, 4),
		},
		feed,
	);

	banner = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromScale(0.5, 0.3),
			Size: UDim2.fromOffset(800, 80),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 64,
			TextColor3: HudColors.White,
			TextStrokeTransparency: 0.3,
			Visible: false,
		},
		gui,
	);

	respawnLabel = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: new UDim2(0.5, 0, 0.3, 56),
			Size: UDim2.fromOffset(400, 32),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 24,
			TextColor3: HudColors.White,
			TextStrokeTransparency: 0.3,
			Visible: false,
		},
		gui,
	);
}

export function initHud() {
	const gui = create(
		"ScreenGui",
		{ Name: "DomedHud", ResetOnSpawn: false, IgnoreGuiInset: true },
		Players.LocalPlayer.WaitForChild("PlayerGui"),
	);
	buildCrosshair(gui);
	buildPanels(gui);
}

export function showHitmarker(isHeadshot: boolean) {
	const token = ++hitmarkerToken;
	for (const bar of hitmarker.GetChildren()) {
		if (bar.IsA("Frame")) bar.BackgroundColor3 = isHeadshot ? HudColors.Red : HudColors.White;
	}
	hitmarker.Visible = true;
	task.delay(HITMARKER_TIME, () => {
		if (hitmarkerToken === token) hitmarker.Visible = false;
	});
}

// Counts down whole seconds until respawn, or until hideRespawnCountdown is called.
export function showRespawnCountdown(seconds: number) {
	const token = ++respawnToken;
	task.spawn(() => {
		for (let remaining = math.ceil(seconds); remaining > 0 && respawnToken === token; remaining--) {
			respawnLabel.Text = `RESPAWNING IN ${remaining}`;
			respawnLabel.Visible = true;
			task.wait(1);
		}
		if (respawnToken === token) respawnLabel.Visible = false;
	});
}

export function hideRespawnCountdown() {
	respawnToken += 1;
	respawnLabel.Visible = false;
}

export function showBanner(text: string, color: Color3, duration: number) {
	const token = ++bannerToken;
	banner.Text = text;
	banner.TextColor3 = color;
	banner.Visible = true;
	task.delay(duration, () => {
		if (bannerToken === token) banner.Visible = false;
	});
}

export function setCooldown(fraction: number) {
	cooldownFill.Size = UDim2.fromScale(fraction, 1);
}

// Adds a line to the kill feed; `richText` may use <font> tags.
function addFeedLine(richText: string) {
	if (feedEntries.size() >= MAX_FEED_ENTRIES) {
		feedEntries.shift()?.Destroy();
	}

	const entry = create(
		"TextLabel",
		{
			LayoutOrder: ++feedCount,
			Size: UDim2.fromOffset(320, 24),
			BackgroundColor3: HudColors.Black,
			BackgroundTransparency: 0.5,
			BorderSizePixel: 0,
			Font: Enum.Font.GothamBold,
			TextSize: 16,
			TextColor3: HudColors.White,
			TextXAlignment: Enum.TextXAlignment.Right,
			RichText: true,
			Text: richText,
		},
		feed,
	);
	feedEntries.push(entry);

	task.delay(FEED_LIFETIME, () => {
		const index = feedEntries.indexOf(entry);
		if (index !== -1) feedEntries.remove(index);
		entry.Destroy();
	});
}

export function addKill(killerName: string, victimName: string) {
	addFeedLine(`${escapeRichText(killerName)}  <font color="#ff3c28">DOMED</font>  ${escapeRichText(victimName)} `);
}

export function addPerkTaken(playerName: string, perkName: string, color: Color3) {
	addFeedLine(`${escapeRichText(playerName)}  took  <font color="#${color.ToHex()}">${perkName}</font> `);
}
