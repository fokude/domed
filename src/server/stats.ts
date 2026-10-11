export type StatName = "Kills" | "Deaths";

const STAT_NAMES: StatName[] = ["Kills", "Deaths"];

function getStat(player: Player, name: StatName): IntValue | undefined {
	const stat = player.FindFirstChild("leaderstats")?.FindFirstChild(name);
	return stat?.IsA("IntValue") ? stat : undefined;
}

export function createLeaderstats(player: Player) {
	const leaderstats = new Instance("Folder");
	leaderstats.Name = "leaderstats";
	for (const name of STAT_NAMES) {
		const stat = new Instance("IntValue");
		stat.Name = name;
		stat.Parent = leaderstats;
	}
	leaderstats.Parent = player;
}

export function readStat(player: Player, name: StatName): number {
	return getStat(player, name)?.Value ?? 0;
}

export function incrementStat(player: Player, name: StatName) {
	const stat = getStat(player, name);
	if (stat) stat.Value += 1;
}

export function resetStats(player: Player) {
	for (const name of STAT_NAMES) {
		const stat = getStat(player, name);
		if (stat) stat.Value = 0;
	}
}
