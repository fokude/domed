// Vote cards in the menu between matches. Click a card or press 1-3.

import { getMatchState, getMatchStateJson, onMatchStateChanged, VoteOption } from "shared/matchState";
import { MODE_NAMES } from "shared/modes";
import { Remotes } from "shared/remotes";
import { getMenuContent } from "./menu";
import { create } from "./ui";

const UserInputService = game.GetService("UserInputService");

const WHITE = new Color3(1, 1, 1);
const MUTED = Color3.fromRGB(170, 175, 185);
const PANEL = Color3.fromRGB(20, 22, 28);
const VOTE_KEYS: Enum.KeyCode[] = [Enum.KeyCode.One, Enum.KeyCode.Two, Enum.KeyCode.Three];

interface Card {
	stroke: UIStroke;
	votes: TextLabel;
}

let panel: Frame;
let cardRow: Frame;
let cards: Card[] = [];
let choice: number | undefined;

function vote(index: number) {
	if (getMatchState("Phase") !== "Voting" || index >= cards.size()) return;
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
	cards = getMatchStateJson<VoteOption[]>("VoteOptions", []).map(buildCard);
	refreshCounts();
}

function refreshPhase() {
	panel.Visible = getMatchState("Phase") === "Voting";
}

export function initMapVote() {
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
	rebuildCards();
	refreshPhase();

	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return;
		const index = VOTE_KEYS.indexOf(input.KeyCode);
		if (index !== -1) vote(index);
	});
}
