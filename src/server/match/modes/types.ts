import { ModeId } from "shared/modes";
import { CombatRules } from "../../combat";

export interface MatchResult {
	// Shown above the end-of-match podium, e.g. "RED TEAM WINS".
	title: string;
	// Players credited with the win; empty for a draw.
	winners: Player[];
}

// One running match of a mode on a loaded map. Created when the match starts and stopped
// when it ends.
export interface GameMode extends CombatRules {
	readonly id: ModeId;
	readonly timeLimit: number;
	readonly scoreTarget: number;
	// Seconds before respawning; MatchConfig.respawnTime when not set.
	readonly respawnTime?: number;
	// A player entering the match: joining mid-game or deployed at the start.
	addPlayer(player: Player): void;
	removePlayer(player: Player): void;
	pickSpawn(player: Player): CFrame | undefined;
	onDeath(player: Player, character: Model): void;
	// Checked frequently; returns a result once a win condition is met.
	checkWinner(): MatchResult | undefined;
	timeUpResult(): MatchResult;
	stop(): void;
}
