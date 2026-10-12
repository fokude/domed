// Kill streaks (kills without dying), tracked on the server so the whole lobby hears about the
// big ones: a player on a long streak is announced to everyone, and whoever ends one gets a
// SHUTDOWN. Rare, server-wide moments make a lobby feel like one event, and tell everyone who
// to hunt. See docs/FEEDBACK.md.

import { BroadcastKind, Remotes } from "shared/remotes";

const Players = game.GetService("Players");

// Streak lengths announced to everyone. Shorter streaks only get the player's own callout.
const ANNOUNCED_STREAKS = new Map<number, BroadcastKind>([
	[5, "KillingSpree"],
	[10, "Rampage"],
	[15, "Godlike"],
]);
// Ending a streak at least this long is a SHUTDOWN.
const SHUTDOWN_STREAK = 5;

const streaks = new Map<Player, number>();

// A player scored a kill (on a player or a bot).
export function registerKill(killer: Player) {
	const streak = (streaks.get(killer) ?? 0) + 1;
	streaks.set(killer, streak);
	const kind = ANNOUNCED_STREAKS.get(streak);
	if (kind) Remotes.Broadcast.FireAllClients(kind, killer, undefined);
}

// A player was killed by another player, ending their streak.
export function registerKilledBy(victim: Player, killer: Player) {
	if ((streaks.get(victim) ?? 0) >= SHUTDOWN_STREAK) Remotes.Broadcast.FireAllClients("Shutdown", victim, killer);
	streaks.delete(victim);
}

// Any death (falls, bots, leaving to the menu) ends a streak quietly.
export function endStreak(player: Player) {
	streaks.delete(player);
}

export function resetStreaks() {
	streaks.clear();
}

export function startStreaks() {
	Players.PlayerRemoving.Connect((player) => streaks.delete(player));
}
