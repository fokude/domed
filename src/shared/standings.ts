export interface Standing {
	name: string;
	userId: number;
	kills: number;
	deaths: number;
}

function readStat(player: Player, name: string): number {
	const stat = player.FindFirstChild("leaderstats")?.FindFirstChild(name);
	return stat?.IsA("IntValue") ? stat.Value : 0;
}

// Most kills first. Fewer deaths breaks ties, then name, so equal players keep a stable order.
export function getStandings(players: Player[]): Standing[] {
	const standings = players.map((player) => ({
		name: player.DisplayName,
		userId: player.UserId,
		kills: readStat(player, "Kills"),
		deaths: readStat(player, "Deaths"),
	}));
	standings.sort((a, b) => {
		if (a.kills !== b.kills) return a.kills > b.kills;
		if (a.deaths !== b.deaths) return a.deaths < b.deaths;
		return a.name < b.name;
	});
	return standings;
}
