// Teaches new players in the first minute. A first-time player skips the menu (the server
// deploys them straight in) and gets one short lesson at a time on screen: shoot, bunny hop,
// air strafe, double jump. Each lesson clears as soon as the player does it, in any order, and
// is saved in their profile. A one-time body-shot tip shows on their first body hit, and the
// how-to-play card stays in the menu for reference. See docs/SKILL_FLOOR.md.

import { MovementConfig } from "shared/config";
import { DEPLOYED_ATTRIBUTE } from "shared/matchState";
import { OnboardingKey } from "shared/progression";
import { Remotes } from "shared/remotes";
import { addMenuButton, getMenuContent, openMenuPanel, registerMenuPanel, toggleMenuPanel } from "./menu";
import { getSpeed, onMovementEvent } from "./movement";
import { getMyProfile } from "./profileData";
import { create, Palette } from "./ui";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const TweenService = game.GetService("TweenService");
const UserInputService = game.GetService("UserInputService");

const DONE_GREEN = Color3.fromRGB(80, 230, 120);

const TIP_DURATION = 8;
// Chained hops before the bunny hop lesson counts as learned.
const BHOPS_TO_LEARN = 3;
// Speed that proves air strafing: above what chained hops alone reach.
const STRAFE_SPEED = MovementConfig.hopBoostMaxSpeed + 5;
// Pause between finishing one lesson and showing the next.
const LESSON_GAP = 1.2;

const LESSONS: [OnboardingKey, string][] = [
	["shootTip", "CLICK TO SHOOT. HEADSHOTS ONLY."],
	["bhopTip", "HOLD SPACE TO BUNNY HOP: JUMP AGAIN THE MOMENT YOU LAND."],
	["strafeTip", "IN THE AIR, HOLD A AND TURN YOUR MOUSE LEFT TO GAIN SPEED."],
	["doubleJumpTip", "PRESS SPACE AGAIN IN THE AIR TO DOUBLE JUMP."],
];

const PANEL_ID = "howToPlay";

const STEPS: [string, string][] = [
	["ONE SHOT. HEADSHOTS ONLY.", "Click to fire. Body shots don't kill."],
	["BUNNY HOP", "Hold SPACE, or spin the scroll wheel, to jump again the moment you land."],
	["AIR STRAFE", "In the air, hold A and turn your mouse left (or D and right) to gain speed."],
	["DOUBLE JUMP", "Press SPACE again in the air."],
	["MENU", "Press M to open the menu any time. Leaving mid-match counts as a death."],
];

const player = Players.LocalPlayer;

let panel: Frame;
let tipLabel: TextLabel;
let lessonLabel: TextLabel;
const marked = new Set<OnboardingKey>();
let bhops = 0;
// Hides the lesson briefly after one is finished, so "NICE" shows before the next.
let lessonPausedUntil = 0;

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
		{ Size: UDim2.fromScale(1, 1), BackgroundColor3: Palette.Panel, BackgroundTransparency: 0.15 },
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
			TextColor3: Palette.White,
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
				TextColor3: Palette.Accent,
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
				TextColor3: Palette.Muted,
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
			BackgroundColor3: Palette.Accent,
			Font: Enum.Font.GothamBlack,
			TextSize: 18,
			TextColor3: Palette.White,
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
			TextColor3: Palette.White,
			TextStrokeTransparency: 0.4,
			Visible: false,
		},
		gui,
	);
	lessonLabel = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 1),
			Position: new UDim2(0.5, 0, 1, -150),
			Size: UDim2.fromOffset(800, 30),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 22,
			TextColor3: Palette.White,
			TextStrokeTransparency: 0.3,
			Visible: false,
		},
		gui,
	);
}

function isDeployed(): boolean {
	return player.GetAttribute(DEPLOYED_ATTRIBUTE) === true;
}

// Marks a lesson learned, whether or not it was on screen: players who already know a move
// skip its lesson.
function learn(key: OnboardingKey) {
	if (hasSeen(key)) return;
	const wasShowing = currentLesson()?.[0] === key;
	markSeen(key);
	if (!wasShowing) return;
	lessonLabel.Text = "NICE";
	lessonLabel.TextColor3 = DONE_GREEN;
	lessonPausedUntil = os.clock() + LESSON_GAP;
}

function currentLesson(): [OnboardingKey, string] | undefined {
	return LESSONS.find(([key]) => !hasSeen(key));
}

function updateLesson() {
	const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
	const alive = humanoid !== undefined && humanoid.Health > 0;
	if (alive && getSpeed() >= STRAFE_SPEED) learn("strafeTip");

	// Lessons wait for the profile, so a returning player never sees one they've done.
	const lesson = getMyProfile() ? currentLesson() : undefined;
	const paused = os.clock() < lessonPausedUntil;
	lessonLabel.Visible = isDeployed() && alive && (paused || lesson !== undefined);
	if (paused || !lesson) return;
	lessonLabel.Text = lesson[1];
	lessonLabel.TextColor3 = Palette.White;
}

export function initOnboarding() {
	buildPanel();
	buildTip();
	addMenuButton("HOW TO PLAY", 5, () => toggleMenuPanel(PANEL_ID));

	player.GetAttributeChangedSignal(DEPLOYED_ATTRIBUTE).Connect(() => {
		if (!isDeployed()) return;
		// The card closes when the player deploys, and the first deploy is their intro.
		openMenuPanel(undefined);
		markSeen("intro");
	});
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton1 && isDeployed()) {
			learn("shootTip");
		}
	});
	onMovementEvent((event) => {
		if (event === "doubleJump") learn("doubleJumpTip");
		else if (++bhops >= BHOPS_TO_LEARN) learn("bhopTip");
	});
	Remotes.HitConfirm.OnClientEvent.Connect((kind) => {
		if (kind !== "body" || hasSeen("bodyShotTip")) return;
		showTip("Body shots don't kill. Aim for the head.");
		markSeen("bodyShotTip");
	});
	RunService.Heartbeat.Connect(updateLesson);
}
