// What a kill feels like. Layered audio and visual feedback ("juice") on the killer's screen,
// escalating with multi-kills and streaks in Unreal Tournament's style, plus a burst at the
// victim's head that everyone sees. Nothing shakes the camera or covers the middle of the
// screen, so feedback never costs the next fight. See docs/FEEDBACK.md.

import { XpConfig } from "shared/config";
import { HitKind, Remotes } from "shared/remotes";
import { playSound } from "./sounds";
import { create, Palette } from "./ui";

const Players = game.GetService("Players");
const TweenService = game.GetService("TweenService");
const Workspace = game.GetService("Workspace");

// Kills within this many seconds of each other chain into a multi-kill.
const MULTI_KILL_WINDOW = 4;
// The first kill reads GIBBED, or DOMED for a headshot; chained kills escalate from there.
const MULTI_KILL_NAMES = ["GIBBED", "DOUBLE DOME", "TRIPLE DOME", "QUAD DOME", "UNSTOPPABLE"];
// Kill streak milestones (kills without dying) and their callouts.
const STREAK_CALLOUTS = new Map<number, string>([
	[3, "ON A ROLL"],
	[5, "KILLING SPREE"],
	[10, "RAMPAGE"],
	[15, "GODLIKE"],
]);
// Each multi-kill step raises the kill sound's pitch by this much, up to the cap.
const PITCH_STEP = 0.12;
const PITCH_CAP = 1.5;

const KILL_RED = Color3.fromRGB(255, 60, 40);
const MULTI_GOLD = Color3.fromRGB(255, 200, 40);
const STREAK_PURPLE = Color3.fromRGB(200, 120, 255);
const SHIELD_BLUE = Color3.fromRGB(80, 200, 255);

const player = Players.LocalPlayer;

let gui: ScreenGui;
let headline: TextLabel;
let headlineScale: UIScale;
let streakLabel: TextLabel;
const edges: Frame[] = [];
let headlineToken = 0;
let streakToken = 0;
let multiKill = 0;
let lastKillAt = -math.huge;
let streak = 0;

function tween(instance: Instance, seconds: number, goals: object, style: Enum.EasingStyle = Enum.EasingStyle.Quad) {
	const animation = TweenService.Create(instance, new TweenInfo(seconds, style), goals as never);
	animation.Play();
	return animation;
}

// Big text that pops in oversized and settles, then fades. `pop` is how oversized it starts.
function showHeadline(text: string, color: Color3, pop = 1.6) {
	const token = ++headlineToken;
	headline.Text = text;
	headline.TextColor3 = color;
	headline.TextTransparency = 0;
	headline.TextStrokeTransparency = 0.2;
	headlineScale.Scale = pop;
	tween(headlineScale, 0.18, { Scale: 1 }, Enum.EasingStyle.Back);
	task.delay(0.9, () => {
		if (headlineToken !== token) return;
		tween(headline, 0.3, { TextTransparency: 1, TextStrokeTransparency: 1 });
	});
}

// Callouts under the headline: streak milestones and personal bests.
function showStreak(text: string, color = STREAK_PURPLE) {
	const token = ++streakToken;
	streakLabel.Text = text;
	streakLabel.TextColor3 = color;
	streakLabel.TextTransparency = 0;
	task.delay(1.6, () => {
		if (streakToken === token) tween(streakLabel, 0.4, { TextTransparency: 1 });
	});
}

// A ring that bursts outward from the crosshair, to `size` pixels across.
function crosshairBurst(color: Color3, size = 56) {
	const ring = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromScale(0.5, 0.5),
			Size: UDim2.fromOffset(12, 12),
			BackgroundTransparency: 1,
		},
		gui,
	);
	create("UICorner", { CornerRadius: new UDim(1, 0) }, ring);
	const stroke = create("UIStroke", { Color: color, Thickness: 3 }, ring);
	tween(ring, 0.25, { Size: UDim2.fromOffset(size, size) });
	tween(stroke, 0.25, { Transparency: 1 }).Completed.Connect(() => ring.Destroy());
}

// A brief color flash at the screen edges, leaving the middle clear.
function edgeFlash(color: Color3) {
	for (const edge of edges) {
		edge.BackgroundColor3 = color;
		edge.BackgroundTransparency = 0.55;
		tween(edge, 0.35, { BackgroundTransparency: 1 });
	}
}

// "CLOSE" under the crosshair when a miss only just missed someone.
function nearMiss() {
	const label = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0.5, 30),
			Size: UDim2.fromOffset(120, 20),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 16,
			TextColor3: Palette.White,
			TextStrokeTransparency: 0.4,
			Text: "CLOSE",
		},
		gui,
	);
	tween(label, 0.6, {
		Position: new UDim2(0.5, 0, 0.5, 44),
		TextTransparency: 1,
		TextStrokeTransparency: 1,
	}).Completed.Connect(() => label.Destroy());
}

// "+XP" drifting up beside the crosshair.
function xpPopup(amount: number) {
	const label = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0, 0.5),
			Position: new UDim2(0.5, 34, 0.5, 0),
			Size: UDim2.fromOffset(80, 22),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 18,
			TextColor3: MULTI_GOLD,
			TextStrokeTransparency: 0.4,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: `+${amount} XP`,
		},
		gui,
	);
	tween(label, 0.7, {
		Position: new UDim2(0.5, 34, 0.5, -36),
		TextTransparency: 1,
		TextStrokeTransparency: 1,
	}).Completed.Connect(() => label.Destroy());
}

// A burst of particles where the victim was hit. Everyone sees it; headshots burst bigger, in
// the headshot color.
function headBurst(position: Vector3, headshot: boolean) {
	const anchor = new Instance("Part");
	anchor.Anchored = true;
	anchor.CanCollide = false;
	anchor.CanQuery = false;
	anchor.CanTouch = false;
	anchor.Transparency = 1;
	anchor.Size = Vector3.one;
	anchor.Position = position;
	anchor.Parent = Workspace;

	const emitter = new Instance("ParticleEmitter");
	emitter.Color = new ColorSequence(headshot ? Palette.Headshot : KILL_RED, Palette.White);
	emitter.LightEmission = 1;
	const startSize = headshot ? 0.9 : 0.6;
	emitter.Size = new NumberSequence([new NumberSequenceKeypoint(0, startSize), new NumberSequenceKeypoint(1, 0)]);
	emitter.Speed = headshot ? new NumberRange(26, 48) : new NumberRange(18, 34);
	emitter.SpreadAngle = new Vector2(180, 180);
	emitter.Lifetime = new NumberRange(0.25, 0.45);
	emitter.Enabled = false;
	emitter.Parent = anchor;
	emitter.Emit(headshot ? 60 : 28);
	task.delay(1, () => anchor.Destroy());
}

// Practice kills (training dummies) escalate multi-kills, so they can be tried out, but earn no
// XP and don't count toward streaks. Headshots read DOMED in the headshot color, pop bigger,
// and add the headshot sound.
function onKill(practice: boolean, headshot: boolean) {
	const now = os.clock();
	multiKill = now - lastKillAt <= MULTI_KILL_WINDOW ? multiKill + 1 : 1;
	lastKillAt = now;
	if (!practice) streak += 1;

	const step = math.min(multiKill, MULTI_KILL_NAMES.size()) - 1;
	const pitch = math.min(1 + step * PITCH_STEP, PITCH_CAP);
	playSound("kill", pitch);
	playSound("killThump");
	if (headshot) playSound("headshot");

	const killColor = headshot ? Palette.Headshot : KILL_RED;
	const name = step === 0 && headshot ? "DOMED" : MULTI_KILL_NAMES[step];
	showHeadline(name, multiKill > 1 ? MULTI_GOLD : killColor, headshot ? 2.2 : 1.6);
	crosshairBurst(multiKill > 1 ? MULTI_GOLD : killColor, headshot ? 80 : 56);
	edgeFlash(killColor);
	if (practice) return;
	xpPopup(XpConfig.kill);

	const callout = STREAK_CALLOUTS.get(streak);
	if (callout !== undefined) showStreak(callout);
}

function onHitConfirm(kind: HitKind, practice: boolean) {
	if (kind === "kill" || kind === "headshot") onKill(practice, kind === "headshot");
	else if (kind === "absorbed") playSound("shieldHit");
	else {
		playSound("shieldBreak");
		showHeadline("SHIELD BROKEN", SHIELD_BLUE);
		crosshairBurst(SHIELD_BLUE);
	}
}

function build() {
	gui = create(
		"ScreenGui",
		{ Name: "KillFeedback", ResetOnSpawn: false, IgnoreGuiInset: true, DisplayOrder: 2 },
		player.WaitForChild("PlayerGui"),
	);

	headline = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: UDim2.fromScale(0.5, 0.36),
			Size: UDim2.fromOffset(700, 70),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 56,
			TextTransparency: 1,
			TextStrokeTransparency: 1,
		},
		gui,
	);
	headlineScale = create("UIScale", {}, headline);
	streakLabel = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0.5),
			Position: new UDim2(0.5, 0, 0.36, 48),
			Size: UDim2.fromOffset(500, 32),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 26,
			TextColor3: STREAK_PURPLE,
			TextStrokeTransparency: 0.4,
			TextTransparency: 1,
		},
		gui,
	);

	// Four edge strips, each fading toward the middle of the screen.
	const sides: [UDim2, UDim2, number][] = [
		[UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.12), 90],
		[UDim2.fromScale(0, 0.88), UDim2.fromScale(1, 0.12), -90],
		[UDim2.fromScale(0, 0), UDim2.fromScale(0.08, 1), 0],
		[UDim2.fromScale(0.92, 0), UDim2.fromScale(0.08, 1), 180],
	];
	for (const [position, size, rotation] of sides) {
		const edge = create(
			"Frame",
			{ Position: position, Size: size, BackgroundTransparency: 1, BorderSizePixel: 0 },
			gui,
		);
		create(
			"UIGradient",
			{
				Rotation: rotation,
				Transparency: new NumberSequence([new NumberSequenceKeypoint(0, 0), new NumberSequenceKeypoint(1, 1)]),
			},
			edge,
		);
		edges.push(edge);
	}
}

export function initKillFeedback() {
	build();
	Remotes.HitConfirm.OnClientEvent.Connect(onHitConfirm);
	Remotes.HeadBurst.OnClientEvent.Connect(headBurst);
	Remotes.NearMiss.OnClientEvent.Connect(nearMiss);
	Remotes.KillFeed.OnClientEvent.Connect((_, victim) => {
		if (victim === player) playSound("death");
	});
	Remotes.PersonalBest.OnClientEvent.Connect((record, value) => {
		playSound("personalBest");
		showStreak(record === "topSpeed" ? `NEW TOP SPEED: ${value}` : `LONGEST KILL: ${value} STUDS`, MULTI_GOLD);
	});
	Remotes.PerkTaken.OnClientEvent.Connect((taker) => {
		if (taker === player) playSound("perkPickup");
	});
	// A streak ends when you die.
	player.CharacterAdded.Connect((character) => {
		const humanoid = character.WaitForChild("Humanoid") as Humanoid;
		humanoid.Died.Connect(() => (streak = 0));
	});
}
