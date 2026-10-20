export interface Standing {
	name: string;
	// 0 for bots, which have no avatar.
	userId: number;
	kills: number;
	deaths: number;
}

// Folder in ReplicatedStorage holding one folder per bot in the current match, named by its
// display name, with Kills and Deaths values like a player's leaderstats (see server/bots.ts).
export const BOT_STANDINGS_FOLDER = "BotStandings";

function readStat(holder: Instance, name: string): number {
	const stat = holder.FindFirstChild(name);
	return stat?.IsA("IntValue") ? stat.Value : 0;
}

function botStandings(): Standing[] {
	const folder = game.GetService("ReplicatedStorage").FindFirstChild(BOT_STANDINGS_FOLDER);
	if (!folder) return [];
	return folder.GetChildren().map((bot) => ({
		name: bot.Name,
		userId: 0,
		kills: readStat(bot, "Kills"),
		deaths: readStat(bot, "Deaths"),
	}));
}

// Most kills first. Fewer deaths breaks ties, then name, so equal players keep a stable order.
// Bots in the current match are ranked alongside players.
export function getStandings(players: Player[]): Standing[] {
	const standings = players.map((player) => {
		const leaderstats = player.FindFirstChild("leaderstats");
		return {
			name: player.DisplayName,
			userId: player.UserId,
			kills: leaderstats ? readStat(leaderstats, "Kills") : 0,
			deaths: leaderstats ? readStat(leaderstats, "Deaths") : 0,
		};
	});
	for (const bot of botStandings()) standings.push(bot);
	standings.sort((a, b) => {
		if (a.kills !== b.kills) return a.kills > b.kills;
		if (a.deaths !== b.deaths) return a.deaths < b.deaths;
		return a.name < b.name;
	});
	return standings;
}
