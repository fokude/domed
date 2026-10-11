// Speed readout at the bottom of the screen. Past a threshold it picks up an electric
// effect that intensifies with speed: a cyan glow, a moving shimmer, sparks, and jitter.

import { create, Palette } from "./ui";

const Players = game.GetService("Players");
const TweenService = game.GetService("TweenService");

// Speeds where the effect starts and where it reaches full strength.
const EFFECT_START_SPEED = 45;
const EFFECT_FULL_SPEED = 110;

const BASE_TEXT_SIZE = 32;
const MAX_TEXT_GROWTH = 10;
const MAX_SPARKS_PER_SECOND = 30;
const SPARK_LIFETIME = 0.15;
const SHIMMER_SPEED = 1.5;
// Jitter only kicks in at the top of the range.
const JITTER_START = 0.6;
const MAX_JITTER_PIXELS = 2;

const BLACK = new Color3(0, 0, 0);
const ELECTRIC = Color3.fromRGB(0, 220, 255);
const ELECTRIC_PALE = Color3.fromRGB(170, 240, 255);
const BASE_POSITION = new UDim2(0.5, 0, 1, -40);

let label: TextLabel;
let glow: UIStroke;
let shimmer: UIGradient;
let lastUpdate = os.clock();
let sparkBudget = 0;

function effectIntensity(speed: number): number {
	return math.clamp((speed - EFFECT_START_SPEED) / (EFFECT_FULL_SPEED - EFFECT_START_SPEED), 0, 1);
}

// A spark is one or two short line segments at a random point around the digits,
// which together read as a small lightning crack.
function spawnSpark() {
	const bounds = label.TextBounds;
	const angle = math.random() * 2 * math.pi;
	const radiusX = bounds.X / 2 + 6;
	const radiusY = bounds.Y / 2 + 4;
	let x = math.cos(angle) * radiusX;
	let y = math.sin(angle) * radiusY;
	let rotation = math.deg(angle) + 90 + math.random(-40, 40);
	const segments = math.random() < 0.5 ? 1 : 2;

	for (let i = 0; i < segments; i++) {
		const length = math.random(6, 14);
		const segment = create(
			"Frame",
			{
				AnchorPoint: new Vector2(0, 0.5),
				Position: new UDim2(0.5, x, 0.5, y),
				Size: UDim2.fromOffset(length, 2),
				Rotation: rotation,
				BackgroundColor3: math.random() < 0.5 ? ELECTRIC : Palette.White,
				BorderSizePixel: 0,
			},
			label,
		);
		const fade = TweenService.Create(segment, new TweenInfo(SPARK_LIFETIME), { BackgroundTransparency: 1 });
		fade.Completed.Connect(() => segment.Destroy());
		fade.Play();

		x += math.cos(math.rad(rotation)) * length;
		y += math.sin(math.rad(rotation)) * length;
		rotation += math.random() < 0.5 ? 70 : -70;
	}
}

export function setSpeed(speed: number) {
	const now = os.clock();
	const dt = now - lastUpdate;
	lastUpdate = now;

	const intensity = effectIntensity(speed);
	label.Text = tostring(math.round(speed));
	label.TextSize = BASE_TEXT_SIZE + MAX_TEXT_GROWTH * intensity;
	label.TextColor3 = Palette.White.Lerp(ELECTRIC_PALE, intensity);

	glow.Color = BLACK.Lerp(ELECTRIC, intensity);
	glow.Thickness = 1 + 2 * intensity;
	glow.Transparency = 0.5 - 0.4 * intensity;

	shimmer.Enabled = intensity > 0;
	shimmer.Offset = new Vector2(((now * SHIMMER_SPEED) % 2) - 1, 0);

	const jitter = math.max(0, (intensity - JITTER_START) / (1 - JITTER_START)) * MAX_JITTER_PIXELS;
	label.Position = BASE_POSITION.add(
		UDim2.fromOffset((math.random() * 2 - 1) * jitter, (math.random() * 2 - 1) * jitter),
	);

	sparkBudget += dt * MAX_SPARKS_PER_SECOND * intensity;
	while (sparkBudget >= 1) {
		sparkBudget -= 1;
		spawnSpark();
	}
}

export function initSpeedometer() {
	const gui = create(
		"ScreenGui",
		{ Name: "Speedometer", ResetOnSpawn: false, IgnoreGuiInset: true },
		Players.LocalPlayer.WaitForChild("PlayerGui"),
	);

	label = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 1),
			Position: BASE_POSITION,
			Size: UDim2.fromOffset(200, 50),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: BASE_TEXT_SIZE,
			TextColor3: Palette.White,
			Text: "0",
		},
		gui,
	);
	glow = create("UIStroke", { Color: BLACK, Thickness: 1, Transparency: 0.5 }, label);
	shimmer = create(
		"UIGradient",
		{
			Enabled: false,
			Color: new ColorSequence([
				new ColorSequenceKeypoint(0, Palette.White),
				new ColorSequenceKeypoint(0.5, ELECTRIC),
				new ColorSequenceKeypoint(1, Palette.White),
			]),
		},
		label,
	);
}
