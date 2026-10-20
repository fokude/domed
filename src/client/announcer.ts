// Server-wide announcements: the tournament broadcast calling out streaks and shutdowns to the
// whole lobby, in a banner under the match bar. Moments can arrive in bursts, so they go
// through a small priority queue: one shows at a time, bigger moments jump ahead, the queue
// holds a few, and anything stale is dropped. Your own streaks aren't repeated to you (your
// personal callout covers them). See docs/FEEDBACK.md.

import { BroadcastKind, Combatant, Remotes } from "shared/remotes";
import { playSound, playSoundThrottled } from "./sounds";
import { create, Palette } from "./ui";

const Players = game.GetService("Players");
const TweenService = game.GetService("TweenService");

const SHOW_SECONDS = 2.2;
const MAX_QUEUED = 3;
// Hype that's this old is worse than none.
const STALE_SECONDS = 4;
// Seconds before another crowd roar can start, so crowd sounds never stack.
const CROWD_COOLDOWN = 2;

const PRIORITY: Record<BroadcastKind, number> = { KillingSpree: 1, Rampage: 2, Godlike: 3, Shutdown: 3 };
const GOLD = Color3.fromRGB(255, 200, 40);

interface Announcement {
	text: string;
	priority: number;
	crowd: boolean;
	at: number;
}

const player = Players.LocalPlayer;
const queue: Announcement[] = [];
let banner: TextLabel;
let showing = false;

function nameOf(combatant: Combatant | undefined): string {
	if (combatant === player) return "YOU";
	return (typeIs(combatant, "string") ? combatant : (combatant?.DisplayName ?? "?")).upper();
}

function describe(kind: BroadcastKind, subject: Combatant, other: Combatant | undefined): string | undefined {
	const name = nameOf(subject);
	if (kind === "Shutdown") {
		if (other === player) return `YOU SHUT DOWN ${name}!`;
		return `${nameOf(other)} SHUT DOWN ${subject === player ? "YOU" : name}!`;
	}
	// Your own streak is already your personal callout.
	if (subject === player) return undefined;
	if (kind === "KillingSpree") return `${name} IS ON A KILLING SPREE`;
	if (kind === "Rampage") return `${name} IS ON A RAMPAGE`;
	return `${name} IS GODLIKE`;
}

function showNext() {
	const now = os.clock();
	// Drop stale entries, then take the highest priority (oldest first among equals).
	for (let i = queue.size() - 1; i >= 0; i--) {
		if (now - queue[i].at > STALE_SECONDS) queue.remove(i);
	}
	if (queue.isEmpty()) {
		showing = false;
		return;
	}
	let best = 0;
	queue.forEach((entry, i) => {
		if (entry.priority > queue[best].priority) best = i;
	});
	const entry = queue.remove(best)!;
	showing = true;
	banner.Text = entry.text;
	banner.TextTransparency = 0;
	banner.TextStrokeTransparency = 0.3;
	if (entry.crowd) playSoundThrottled("crowdRoar", CROWD_COOLDOWN);
	else playSound("announce");
	task.delay(SHOW_SECONDS, () => {
		const fade = TweenService.Create(banner, new TweenInfo(0.3), {
			TextTransparency: 1,
			TextStrokeTransparency: 1,
		});
		fade.Completed.Connect(showNext);
		fade.Play();
	});
}

function announce(kind: BroadcastKind, subject: Combatant, other: Combatant | undefined) {
	const text = describe(kind, subject, other);
	if (text === undefined) return;
	queue.push({ text, priority: PRIORITY[kind], crowd: PRIORITY[kind] >= 3, at: os.clock() });
	// Over capacity: drop the lowest-priority, oldest entry.
	while (queue.size() > MAX_QUEUED) {
		let worst = 0;
		queue.forEach((entry, i) => {
			if (entry.priority < queue[worst].priority) worst = i;
		});
		queue.remove(worst);
	}
	if (!showing) showNext();
}

export function initAnnouncer() {
	const gui = create(
		"ScreenGui",
		{ Name: "Announcer", ResetOnSpawn: false, IgnoreGuiInset: true, DisplayOrder: 3 },
		player.WaitForChild("PlayerGui"),
	);
	banner = create(
		"TextLabel",
		{
			AnchorPoint: new Vector2(0.5, 0),
			Position: new UDim2(0.5, 0, 0, 92),
			Size: UDim2.fromOffset(700, 30),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 24,
			TextColor3: GOLD,
			TextStrokeColor3: Palette.Black,
			TextStrokeTransparency: 1,
			TextTransparency: 1,
		},
		gui,
	);
	Remotes.Broadcast.OnClientEvent.Connect(announce);
}
