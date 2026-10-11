// Funnel and engagement events for the Creator Dashboard's analytics.
//
// Onboarding funnel (each step counts once per player): joined, pressed Play, first kill,
// finished a match, reached level 2. The drop-off between steps shows where new players quit.
// Custom events: MatchFinished (match length, by mode and map) and SessionLength (minutes).

import { DEPLOYED_ATTRIBUTE } from "shared/matchState";

const AnalyticsService = game.GetService("AnalyticsService");
const Players = game.GetService("Players");

export type OnboardingStep = "joined" | "deployed" | "firstKill" | "matchFinished" | "level2";

const STEPS: Record<OnboardingStep, [number, string]> = {
	joined: [1, "Joined"],
	deployed: [2, "Pressed Play"],
	firstKill: [3, "First Kill"],
	matchFinished: [4, "Finished Match"],
	level2: [5, "Reached Level 2"],
};

// Steps already logged this session, so frequent events (every kill) don't spam the service.
const logged = new Map<Player, Set<OnboardingStep>>();
const joinedAt = new Map<Player, number>();

// Analytics must never break gameplay, so failures are only warned about.
function safely(log: () => void) {
	const [ok, err] = pcall(log);
	if (!ok) warn(`[analytics] ${err}`);
}

export function logOnboardingStep(player: Player, step: OnboardingStep) {
	const steps = logged.get(player) ?? new Set<OnboardingStep>();
	if (steps.has(step)) return;
	steps.add(step);
	logged.set(player, steps);
	const [number, name] = STEPS[step];
	safely(() => AnalyticsService.LogOnboardingFunnelStepEvent(player, number, name));
}

export function logMatchFinished(player: Player, mode: string, mapId: string, seconds: number) {
	safely(() =>
		AnalyticsService.LogCustomEvent(player, "MatchFinished", math.floor(seconds), {
			[Enum.AnalyticsCustomFieldKeys.CustomField01.Name]: mode,
			[Enum.AnalyticsCustomFieldKeys.CustomField02.Name]: mapId,
		}),
	);
}

export function startAnalytics() {
	const onJoin = (player: Player) => {
		joinedAt.set(player, os.clock());
		logOnboardingStep(player, "joined");
		player.GetAttributeChangedSignal(DEPLOYED_ATTRIBUTE).Connect(() => {
			if (player.GetAttribute(DEPLOYED_ATTRIBUTE) === true) logOnboardingStep(player, "deployed");
		});
	};
	Players.PlayerAdded.Connect(onJoin);
	Players.GetPlayers().forEach(onJoin);

	Players.PlayerRemoving.Connect((player) => {
		const start = joinedAt.get(player);
		if (start !== undefined) {
			const minutes = (os.clock() - start) / 60;
			safely(() => AnalyticsService.LogCustomEvent(player, "SessionLength", math.floor(minutes * 10) / 10));
		}
		joinedAt.delete(player);
		logged.delete(player);
	});
}
