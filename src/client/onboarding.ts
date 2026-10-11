// Teaches new players to move. A "how to play" card shows in the menu on first join (the menu is
// safe; a popup mid-match would get them shot) and can be reopened from the menu. Two one-time
// tips appear in game when they'd help. Seen steps are saved in the player's profile.

import { DEPLOYED_ATTRIBUTE } from "shared/matchState";
import { OnboardingKey } from "shared/progression";
import { Remotes } from "shared/remotes";
import { addMenuButton, getMenuContent, openMenuPanel, registerMenuPanel, toggleMenuPanel } from "./menu";
import { getSpeed } from "./movement";
import { getMyProfile, onMyProfileChanged } from "./profileData";
import { create } from "./ui";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const TweenService = game.GetService("TweenService");

const WHITE = new Color3(1, 1, 1);
const MUTED = Color3.fromRGB(170, 175, 185);
const ACCENT = Color3.fromRGB(255, 60, 40);
const PANEL = Color3.fromRGB(20, 22, 28);

// The strafing tip shows once a player has been alive this long without reaching the speed.
const STRAFE_TIP_DELAY = 45;
const STRAFE_TIP_SPEED = 40;
const TIP_DURATION = 8;

const PANEL_ID = "howToPlay";

const STEPS: [string, string][] = [
	["ONE SHOT. HEADSHOTS ONLY.", "Click to fire. Body shots only knock enemies back."],
	["BUNNY HOP", "Hold SPACE, or spin the scroll wheel, to jump again the moment you land."],
	["AIR STRAFE", "In the air, hold A and turn your mouse left (or D and right) to gain speed."],
	["DOUBLE JUMP", "Press SPACE again in the air."],
	["MENU", "Press M to open the menu any time. Leaving mid-match counts as a death."],
];

const player = Players.LocalPlayer;

let panel: Frame;
let tipLabel: TextLabel;
let introChecked = false;
const marked = new Set<OnboardingKey>();
let aliveTime = 0;
let topSpeed = 0;

function hasSeen(key: OnboardingKey): boolean {
	return marked.has(key) || getMyProfile()?.onboarding[key] === true;
}

function markSeen(key: OnboardingKey) {
	if (hasSeen(key)) return;
	marked.add(key);
	Remotes.MarkOnboarding.FireServer(key);
}

function showTip(text: string) {
	tipLabel.Text = text;
	tipLabel.TextTransparency = 0;
	tipLabel.TextStrokeTransparency = 0.4;
	tipLabel.Visible = true;
	task.delay(TIP_DURATION, () => {
		const fade = TweenService.Create(tipLabel, new TweenInfo(0.6), {
			TextTransparency: 1,
			TextStrokeTransparency: 1,
		});
		fade.Play();
	});
}

function buildPanel() {
	panel = create(
		"Frame",
		{ Size: UDim2.fromScale(1, 1), BackgroundColor3: PANEL, BackgroundTransparency: 0.15 },
		getMenuContent(),
	);
	create("UICorner", { CornerRadius: new UDim(0, 8) }, panel);
	create(
		"UIPadding",
		{ PaddingLeft: new UDim(0, 24), PaddingRight: new UDim(0, 24), PaddingTop: new UDim(0, 20) },
		panel,
	);
	create("UIListLayout", { Padding: new UDim(0, 12), SortOrder: Enum.SortOrder.LayoutOrder }, panel);

	create(
		"TextLabel",
		{
			LayoutOrder: 0,
			Size: new UDim2(1, 0, 0, 30),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 26,
			TextColor3: WHITE,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: "HOW TO PLAY",
		},
		panel,
	);
	STEPS.forEach(([title, body], index) => {
		const row = create(
			"Frame",
			{ LayoutOrder: index + 1, Size: new UDim2(1, 0, 0, 48), BackgroundTransparency: 1 },
			panel,
		);
		create(
			"TextLabel",
			{
				Size: new UDim2(1, 0, 0, 22),
				BackgroundTransparency: 1,
				Font: Enum.Font.GothamBlack,
				TextSize: 18,
				TextColor3: ACCENT,
				TextXAlignment: Enum.TextXAlignment.Left,
				Text: title,
			},
			row,
		);
		create(
			"TextLabel",
			{
				Position: UDim2.fromOffset(0, 24),
				Size: new UDim2(1, 0, 0, 22),
				BackgroundTransparency: 1,
				Font: Enum.Font.Gotham,
				TextSize: 16,
				TextColor3: MUTED,
				TextXAlignment: Enum.TextXAlignment.Left,
				TextWrapped: true,
				Text: body,
			},
			row,
		);
	});
	const close = create(
		"TextButton",
		{
			LayoutOrder: STEPS.size() + 1,
			Size: UDim2.fromOffset(140, 40),
			BackgroundColor3: ACCENT,
			Font: Enum.Font.GothamBlack,
			TextSize: 18,
			TextColor3: WHITE,
			Text: "GOT IT",
		},
		panel,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, close);
	close.Activated.Connect(() => openMenuPanel(undefined));
	registerMenuPanel(PANEL_ID, panel);
}

function buildTip() {
	const gui = create(
		"ScreenGui",
		{ Name: "Tips", ResetOnSpawn: false, IgnoreGuiInset: true },
		player.WaitForChild("PlayerGui"),
	);
	tipLabel = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 1),
			Position: new UDim2(0.5, 0, 1, -110),
			Size: UDim2.fromOffset(700, 28),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 20,
			TextColor3: WHITE,
			TextStrokeTransparency: 0.4,
			Visible: false,
		},
		gui,
	);
}

// Opens the card automatically the first time the profile shows it hasn't been seen.
function checkIntro() {
	if (introChecked || !getMyProfile()) return;
	introChecked = true;
	if (hasSeen("intro")) return;
	openMenuPanel(PANEL_ID);
	markSeen("intro");
}

function trackStrafeTip(dt: number) {
	const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
	if (!humanoid || humanoid.Health <= 0 || hasSeen("strafeTip")) return;
	aliveTime += dt;
	topSpeed = math.max(topSpeed, getSpeed());
	if (aliveTime < STRAFE_TIP_DELAY) return;
	if (topSpeed < STRAFE_TIP_SPEED) showTip("TIP: In the air, hold A and turn your mouse left to gain speed.");
	markSeen("strafeTip");
}

export function initOnboarding() {
	buildPanel();
	buildTip();
	addMenuButton("HOW TO PLAY", 5, () => toggleMenuPanel(PANEL_ID));

	onMyProfileChanged(checkIntro);
	checkIntro();
	// The card closes when the player deploys; they've seen it.
	player.GetAttributeChangedSignal(DEPLOYED_ATTRIBUTE).Connect(() => {
		if (player.GetAttribute(DEPLOYED_ATTRIBUTE) === true) openMenuPanel(undefined);
	});

	Remotes.HitConfirm.OnClientEvent.Connect((kind) => {
		if (kind !== "body" || hasSeen("bodyShotTip")) return;
		showTip("Body shots only knock enemies back. Aim for the head.");
		markSeen("bodyShotTip");
	});
	RunService.Heartbeat.Connect(trackStrafeTip);
}
