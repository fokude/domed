// Main menu, shown whenever the player isn't deployed: on joining, and between matches. The
// camera slowly orbits the current map behind it.

import { DEPLOYED_ATTRIBUTE, getMatchState, onMatchStateChanged } from "shared/matchState";
import { MODE_NAMES } from "shared/modes";
import { Remotes } from "shared/remotes";
import { create } from "./ui";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const ORBIT_RADIUS = 170;
const ORBIT_HEIGHT = 70;
const ORBIT_SPEED = 0.04;
const ORBIT_FOCUS = new Vector3(0, 10, 0);

const WHITE = new Color3(1, 1, 1);
const MUTED = Color3.fromRGB(170, 175, 185);
const ACCENT = Color3.fromRGB(255, 60, 40);
const PANEL = Color3.fromRGB(20, 22, 28);

// In-game HUD that would clutter the menu.
const GAMEPLAY_GUIS = ["DomedHud", "Speedometer"];

const player = Players.LocalPlayer;

let gui: ScreenGui;
let matchInfo: TextLabel;
let status: TextLabel;
let playButton: TextButton;
let buttonList: Frame;
let menuOpen = false;

// Content area other menu features (map voting, loadout) render into.
let menuContent: Frame;

// Adds a button to the menu's list; `order` sorts it among the others (Play is 1).
export function addMenuButton(text: string, order: number, onClick: () => void): TextButton {
	const button = menuButton(buttonList, text, order);
	button.Activated.Connect(onClick);
	return button;
}

export function getMenuContent(): Frame {
	return menuContent;
}

function isDeployed(): boolean {
	return player.GetAttribute(DEPLOYED_ATTRIBUTE) === true;
}

function menuButton(parent: Instance, text: string, order: number): TextButton {
	const button = create(
		"TextButton",
		{
			LayoutOrder: order,
			Size: UDim2.fromOffset(280, 52),
			BackgroundColor3: PANEL,
			BackgroundTransparency: 0.15,
			AutoButtonColor: true,
			Font: Enum.Font.GothamBlack,
			TextSize: 22,
			TextColor3: WHITE,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: `   ${text}`,
		},
		parent,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, button);
	return button;
}

function refresh() {
	const phase = getMatchState("Phase");
	const mode = getMatchState("Mode");
	const mapName = getMatchState("MapName") ?? "";
	matchInfo.Text = mode ? `${MODE_NAMES[mode]}  ·  ${mapName}` : "";

	playButton.Visible = phase === "Playing";
	if (phase === "Playing") status.Text = "MATCH IN PROGRESS";
	else if (phase === "Results") status.Text = "MATCH ENDING";
	else status.Text = "NEXT MATCH STARTING SOON";
}

function setOpen(open: boolean) {
	menuOpen = open;
	gui.Enabled = open;
	UserInputService.MouseIconEnabled = open;

	const playerGui = player.FindFirstChild("PlayerGui");
	for (const name of GAMEPLAY_GUIS) {
		const hud = playerGui?.FindFirstChild(name);
		if (hud?.IsA("ScreenGui")) hud.Enabled = !open;
	}

	const camera = Workspace.CurrentCamera;
	if (camera) camera.CameraType = open ? Enum.CameraType.Scriptable : Enum.CameraType.Custom;
}

function updateOrbit() {
	const camera = Workspace.CurrentCamera;
	if (!menuOpen || !camera) return;
	const angle = os.clock() * ORBIT_SPEED;
	const position = new Vector3(math.cos(angle) * ORBIT_RADIUS, ORBIT_HEIGHT, math.sin(angle) * ORBIT_RADIUS);
	camera.CFrame = CFrame.lookAt(position, ORBIT_FOCUS);
}

function buildMenu() {
	gui = create(
		"ScreenGui",
		{ Name: "Menu", ResetOnSpawn: false, IgnoreGuiInset: true, DisplayOrder: 5, Enabled: false },
		player.WaitForChild("PlayerGui"),
	);

	const sidebar = create(
		"Frame",
		{ Size: new UDim2(0, 460, 1, 0), BackgroundColor3: new Color3(0, 0, 0), BorderSizePixel: 0 },
		gui,
	);
	create(
		"UIGradient",
		{
			Transparency: new NumberSequence([
				new NumberSequenceKeypoint(0, 0.2),
				new NumberSequenceKeypoint(0.7, 0.45),
				new NumberSequenceKeypoint(1, 1),
			]),
		},
		sidebar,
	);

	create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(48, 70),
			Size: UDim2.fromOffset(380, 80),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 76,
			TextColor3: ACCENT,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: "DOMED",
		},
		sidebar,
	);
	create(
		"TextLabel",
		{
			Position: UDim2.fromOffset(52, 148),
			Size: UDim2.fromOffset(380, 20),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 16,
			TextColor3: WHITE,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: "HEADSHOT ARENA",
		},
		sidebar,
	);

	const buttons = create(
		"Frame",
		{ Position: UDim2.fromOffset(48, 220), Size: UDim2.fromOffset(300, 320), BackgroundTransparency: 1 },
		sidebar,
	);
	buttonList = buttons;
	create("UIListLayout", { Padding: new UDim(0, 10), SortOrder: Enum.SortOrder.LayoutOrder }, buttons);

	playButton = menuButton(buttons, "PLAY", 1);
	playButton.BackgroundColor3 = ACCENT;
	playButton.Activated.Connect(() => Remotes.Deploy.FireServer());

	const loadout = menuButton(buttons, "LOADOUT", 10);
	loadout.AutoButtonColor = false;
	loadout.TextColor3 = MUTED;
	create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(1, 0.5),
			Position: new UDim2(1, -14, 0.5, 0),
			Size: UDim2.fromOffset(110, 20),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 12,
			TextColor3: MUTED,
			TextXAlignment: Enum.TextXAlignment.Right,
			Text: "COMING SOON",
		},
		loadout,
	);

	status = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0, 1),
			Position: new UDim2(0, 52, 1, -78),
			Size: UDim2.fromOffset(380, 22),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 18,
			TextColor3: WHITE,
			TextXAlignment: Enum.TextXAlignment.Left,
		},
		sidebar,
	);
	matchInfo = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0, 1),
			Position: new UDim2(0, 52, 1, -52),
			Size: UDim2.fromOffset(380, 20),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBold,
			TextSize: 14,
			TextColor3: MUTED,
			TextXAlignment: Enum.TextXAlignment.Left,
		},
		sidebar,
	);

	// A visible Modal button frees the mouse even in first-person camera mode. This one is
	// invisible and always shown with the menu, so the cursor works in every phase.
	create("TextButton", { Size: UDim2.fromOffset(0, 0), BackgroundTransparency: 1, Text: "", Modal: true }, gui);

	menuContent = create(
		"Frame",
		{
			AnchorPoint: new Vector2(1, 0.5),
			Position: new UDim2(1, -48, 0.5, 0),
			Size: new UDim2(1, -560, 0, 360),
			BackgroundTransparency: 1,
		},
		gui,
	);
}

export function initMenu() {
	buildMenu();
	onMatchStateChanged(["Phase", "Mode", "MapName"], refresh);
	refresh();

	player.GetAttributeChangedSignal(DEPLOYED_ATTRIBUTE).Connect(() => setOpen(!isDeployed()));
	setOpen(!isDeployed());
	RunService.RenderStepped.Connect(updateOrbit);
}
