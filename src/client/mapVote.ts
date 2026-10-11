// Map vote during the warm-up between matches: cards in the menu, and a compact list on screen
// for players in the warm-up arena. Click a card or press 1-3.

import {
	DEPLOYED_ATTRIBUTE,
	getMatchState,
	getMatchStateJson,
	onMatchStateChanged,
	VoteOption,
} from "shared/matchState";
import { MODE_NAMES } from "shared/modes";
import { Remotes } from "shared/remotes";
import { getMenuContent } from "./menu";
import { create } from "./ui";

const Players = game.GetService("Players");
const UserInputService = game.GetService("UserInputService");

const WHITE = new Color3(1, 1, 1);
const MUTED = Color3.fromRGB(170, 175, 185);
const PANEL = Color3.fromRGB(20, 22, 28);
const VOTE_KEYS: Enum.KeyCode[] = [Enum.KeyCode.One, Enum.KeyCode.Two, Enum.KeyCode.Three];

interface Card {
	stroke: UIStroke;
	votes: TextLabel;
}

interface ListRow {
	frame: Frame;
	votes: TextLabel;
}

let panel: Frame;
let cardRow: Frame;
let cards: Card[] = [];
let list: Frame;
let listGui: ScreenGui;
let rows: ListRow[] = [];
let choice: number | undefined;

function vote(index: number) {
	if (getMatchState("Phase") !== "Warmup" || index >= cards.size()) return;
	choice = index;
	Remotes.CastVote.FireServer(index);
	refreshCounts();
}

function refreshCounts() {
	const counts = getMatchStateJson<number[]>("VoteCounts", []);
	cards.forEach((card, index) => {
		const count = counts[index] ?? 0;
		card.votes.Text = `${count} ${count === 1 ? "VOTE" : "VOTES"}`;
		card.stroke.Enabled = index === choice;
	});
	rows.forEach((row, index) => {
		const count = counts[index] ?? 0;
		row.votes.Text = tostring(count);
		row.frame.BackgroundTransparency = index === choice ? 0.05 : 0.45;
	});
}

function buildCard(option: VoteOption, index: number): Card {
	const theme = Color3.fromHex(option.themeColor);
	const card = create(
		"TextButton",
		{
			LayoutOrder: index,
			Size: new UDim2(1 / 3, -11, 1, 0),
			BackgroundColor3: PANEL,
			BackgroundTransparency: 0.1,
			AutoButtonColor: true,
			Text: "",
		},
		cardRow,
	);
	create("UICorner", { CornerRadius: new UDim(0, 8) }, card);
	const stroke = create("UIStroke", { Color: theme, Thickness: 3, Enabled: false }, card);
	card.Activated.Connect(() => vote(index));

	const accent = create("Frame", { Size: new UDim2(1, 0, 0, 8), BackgroundColor3: theme, BorderSizePixel: 0 }, card);
	create("UICorner", { CornerRadius: new UDim(0, 8) }, accent);

	const text = (props: Partial<WritableInstanceProperties<TextLabel>>) =>
		create(
			"TextLabel",
			{
				BackgroundTransparency: 1,
				TextXAlignment: Enum.TextXAlignment.Left,
				TextYAlignment: Enum.TextYAlignment.Top,
				...props,
			},
			card,
		);

	text({
		Position: UDim2.fromOffset(18, 28),
		Size: new UDim2(1, -36, 0, 64),
		Font: Enum.Font.GothamBlack,
		TextSize: 26,
		TextWrapped: true,
		TextColor3: WHITE,
		Text: option.mapName.upper(),
	});
	text({
		Position: UDim2.fromOffset(18, 96),
		Size: new UDim2(1, -36, 0, 18),
		Font: Enum.Font.GothamBold,
		TextSize: 14,
		TextColor3: theme,
		Text: MODE_NAMES[option.mode],
	});
	text({
		Position: UDim2.fromOffset(18, 124),
		Size: new UDim2(1, -36, 0, 60),
		Font: Enum.Font.Gotham,
		TextSize: 14,
		TextWrapped: true,
		TextColor3: MUTED,
		Text: option.tagline,
	});
	const votes = text({
		AnchorPoint: new Vector2(0, 1),
		Position: new UDim2(0, 18, 1, -18),
		Size: new UDim2(1, -36, 0, 24),
		Font: Enum.Font.GothamBlack,
		TextSize: 20,
		TextColor3: WHITE,
	});
	text({
		AnchorPoint: new Vector2(1, 1),
		Position: new UDim2(1, -18, 1, -18),
		Size: UDim2.fromOffset(40, 24),
		Font: Enum.Font.GothamBold,
		TextSize: 16,
		TextColor3: MUTED,
		TextXAlignment: Enum.TextXAlignment.Right,
		Text: `[${index + 1}]`,
	});

	return { stroke, votes };
}

// One row per option in the on-screen list: key, map and mode, votes.
function buildRow(option: VoteOption, index: number): ListRow {
	const theme = Color3.fromHex(option.themeColor);
	const frame = create(
		"Frame",
		{ LayoutOrder: index, Size: new UDim2(1, 0, 0, 34), BackgroundColor3: PANEL, BorderSizePixel: 0 },
		list,
	);
	create("UICorner", { CornerRadius: new UDim(0, 6) }, frame);
	create("Frame", { Size: new UDim2(0, 4, 1, 0), BackgroundColor3: theme, BorderSizePixel: 0 }, frame);
	const text = { BackgroundTransparency: 1, Font: Enum.Font.GothamBold, TextSize: 15, TextColor3: WHITE };
	create(
		"TextLabel",
		{
			...text,
			Position: UDim2.fromOffset(14, 0),
			Size: new UDim2(1, -60, 1, 0),
			TextXAlignment: Enum.TextXAlignment.Left,
			TextTruncate: Enum.TextTruncate.AtEnd,
			Text: `[${index + 1}]  ${option.mapName.upper()}  ·  ${MODE_NAMES[option.mode]}`,
		},
		frame,
	);
	const votes = create(
		"TextLabel",
		{
			...text,
			AnchorPoint: new Vector2(1, 0),
			Position: new UDim2(1, -12, 0, 0),
			Size: new UDim2(0, 40, 1, 0),
			Font: Enum.Font.GothamBlack,
			TextXAlignment: Enum.TextXAlignment.Right,
		},
		frame,
	);
	return { frame, votes };
}

function rebuildList(options: VoteOption[]) {
	list.ClearAllChildren();
	create("UIListLayout", { Padding: new UDim(0, 6), SortOrder: Enum.SortOrder.LayoutOrder }, list);
	create(
		"TextLabel",
		{
			LayoutOrder: -1,
			Size: new UDim2(1, 0, 0, 20),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 15,
			TextColor3: MUTED,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: "NEXT MAP: PRESS 1-3 TO VOTE",
		},
		list,
	);
	rows = options.map(buildRow);
}

function buildList() {
	listGui = create(
		"ScreenGui",
		{ Name: "WarmupVote", ResetOnSpawn: false, IgnoreGuiInset: true, Enabled: false },
		Players.LocalPlayer.WaitForChild("PlayerGui"),
	);
	list = create(
		"Frame",
		{
			AnchorPoint: new Vector2(0, 0.5),
			Position: new UDim2(0, 24, 0.45, 0),
			Size: UDim2.fromOffset(340, 140),
			BackgroundTransparency: 1,
		},
		listGui,
	);
}

function rebuildCards() {
	cardRow.ClearAllChildren();
	create(
		"UIListLayout",
		{
			FillDirection: Enum.FillDirection.Horizontal,
			Padding: new UDim(0, 16),
			SortOrder: Enum.SortOrder.LayoutOrder,
		},
		cardRow,
	);
	choice = undefined;
	const options = getMatchStateJson<VoteOption[]>("VoteOptions", []);
	cards = options.map(buildCard);
	rebuildList(options);
	refreshCounts();
}

function refreshPhase() {
	const warmup = getMatchState("Phase") === "Warmup";
	panel.Visible = warmup;
	listGui.Enabled = warmup && Players.LocalPlayer.GetAttribute(DEPLOYED_ATTRIBUTE) === true;
}

export function initMapVote() {
	buildList();
	panel = create("Frame", { Size: UDim2.fromScale(1, 1), BackgroundTransparency: 1 }, getMenuContent());
	create(
		"TextLabel",
		{
			Size: new UDim2(1, 0, 0, 32),
			BackgroundTransparency: 1,
			Font: Enum.Font.GothamBlack,
			TextSize: 24,
			TextColor3: WHITE,
			TextXAlignment: Enum.TextXAlignment.Left,
			Text: "VOTE FOR THE NEXT MAP",
		},
		panel,
	);
	cardRow = create(
		"Frame",
		{ Position: UDim2.fromOffset(0, 48), Size: new UDim2(1, 0, 1, -48), BackgroundTransparency: 1 },
		panel,
	);

	onMatchStateChanged(["VoteOptions"], rebuildCards);
	onMatchStateChanged(["VoteCounts"], refreshCounts);
	onMatchStateChanged(["Phase"], refreshPhase);
	Players.LocalPlayer.GetAttributeChangedSignal(DEPLOYED_ATTRIBUTE).Connect(refreshPhase);
	rebuildCards();
	refreshPhase();

	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return;
		const index = VOTE_KEYS.indexOf(input.KeyCode);
		if (index !== -1) vote(index);
	});
}
