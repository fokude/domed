// Capture the Flag. Touch the enemy flag to take it, bring it to your own base while your
// flag is home to score. Carriers drop the flag when they die; a teammate touching a dropped
// flag returns it, and it returns on its own after a while.

import { CtfConfig } from "shared/config";
import { CARRYING_FLAG_ATTRIBUTE, FlagStatus, getMatchState, setMatchState } from "shared/matchState";
import { TEAM_IDS, TeamId } from "shared/modes";
import { Remotes } from "shared/remotes";
import { LoadedMap } from "../../maps/loader";
import { pickSafestSpawn } from "../../spawning";
import { GameMode, MatchResult } from "./types";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const Teams = game.GetService("Teams");
const Workspace = game.GetService("Workspace");

const TICK_INTERVAL = 0.1;
const POLE_HEIGHT = 10;
const TEAM_BRICK_COLORS: Record<TeamId, BrickColor> = {
	Red: new BrickColor("Bright red"),
	Blue: new BrickColor("Bright blue"),
};
const ANNOUNCE_TIME = 2.5;

interface Flag {
	team: TeamId;
	home: Vector3;
	pole: Part;
	cloth: Part;
	clothOffset: CFrame;
	status: FlagStatus;
	carrier?: Player;
	carryWeld?: WeldConstraint;
	droppedAt: number;
}

function rootOf(player: Player): BasePart | undefined {
	const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
	const root = player.Character?.FindFirstChild("HumanoidRootPart");
	return humanoid && humanoid.Health > 0 && root?.IsA("BasePart") ? root : undefined;
}

function flagPart(size: Vector3, color: Color3, material: Enum.Material): Part {
	const part = new Instance("Part");
	part.Size = size;
	part.Color = color;
	part.Material = material;
	part.Anchored = true;
	part.CanCollide = false;
	part.CanQuery = false;
	part.CanTouch = false;
	part.Massless = true;
	part.CastShadow = false;
	return part;
}

export class CaptureTheFlag implements GameMode {
	readonly id = "CTF";
	readonly timeLimit = CtfConfig.timeLimit;
	readonly scoreTarget = CtfConfig.captureTarget;

	private readonly teams = new Map<TeamId, Team>();
	private readonly flags = new Map<TeamId, Flag>();
	private readonly scores = new Map<TeamId, number>();
	private readonly spawns: LoadedMap["spawns"];
	private readonly arena: Model;
	private readonly heartbeat: RBXScriptConnection;
	private sinceTick = 0;

	constructor(map: LoadedMap) {
		this.spawns = map.spawns;
		this.arena = map.arena;

		for (const teamId of TEAM_IDS) {
			const team = new Instance("Team");
			team.Name = teamId;
			team.TeamColor = TEAM_BRICK_COLORS[teamId];
			team.AutoAssignable = false;
			team.Parent = Teams;
			this.teams.set(teamId, team);

			const home = map.flagBases.get(teamId);
			if (!home) error(`Map ${map.info.id} has no ${teamId} FlagBase marker`);
			this.flags.set(teamId, this.buildFlag(teamId, home));
			this.scores.set(teamId, 0);
			this.publishTeam(teamId);
		}

		this.heartbeat = RunService.Heartbeat.Connect((dt) => {
			this.sinceTick += dt;
			if (this.sinceTick < TICK_INTERVAL) return;
			this.sinceTick = 0;
			if (getMatchState("Phase") === "Playing") this.tick();
		});
	}

	private buildFlag(team: TeamId, home: Vector3): Flag {
		const color = this.teams.get(team)!.TeamColor.Color;
		const pole = flagPart(new Vector3(0.4, POLE_HEIGHT, 0.4), Color3.fromRGB(60, 62, 70), Enum.Material.Metal);
		pole.Name = `${team}Flag`;
		const cloth = flagPart(new Vector3(0.2, 3, 4.5), color, Enum.Material.Neon);
		cloth.Name = `${team}FlagCloth`;

		const light = new Instance("PointLight");
		light.Color = color;
		light.Range = 16;
		light.Parent = cloth;

		const clothOffset = new CFrame(0, POLE_HEIGHT / 2 - 1.5, 2.25);
		const weld = new Instance("WeldConstraint");
		weld.Part0 = pole;
		weld.Part1 = cloth;
		weld.Parent = pole;

		const flag: Flag = { team, home, pole, cloth, clothOffset, status: "Home", droppedAt: 0 };
		this.placeFlag(flag, home);
		cloth.Parent = this.arena;
		pole.Parent = this.arena;
		return flag;
	}

	// Stands an anchored flag upright with its base at `position`.
	private placeFlag(flag: Flag, position: Vector3) {
		flag.pole.Anchored = true;
		flag.cloth.Anchored = true;
		flag.pole.CFrame = new CFrame(position.add(new Vector3(0, POLE_HEIGHT / 2, 0)));
		flag.cloth.CFrame = flag.pole.CFrame.mul(flag.clothOffset);
	}

	private flagBase(flag: Flag): Vector3 {
		return flag.pole.Position.sub(new Vector3(0, POLE_HEIGHT / 2, 0));
	}

	private teamOf(player: Player): TeamId | undefined {
		return TEAM_IDS.find((id) => this.teams.get(id) === player.Team);
	}

	private publishTeam(team: TeamId) {
		setMatchState(team === "Red" ? "RedScore" : "BlueScore", this.scores.get(team)!);
		setMatchState(team === "Red" ? "RedFlag" : "BlueFlag", this.flags.get(team)?.status ?? "Home");
	}

	private setStatus(flag: Flag, status: FlagStatus) {
		flag.status = status;
		this.publishTeam(flag.team);
	}

	private pickUp(flag: Flag, player: Player, root: BasePart) {
		flag.carrier = player;
		player.SetAttribute(CARRYING_FLAG_ATTRIBUTE, true);

		// Worn on the back, tilted, welded so it moves with the carrier's physics.
		flag.pole.CFrame = root.CFrame.mul(new CFrame(0, 1, 1)).mul(CFrame.Angles(0, 0, math.rad(-15)));
		flag.cloth.CFrame = flag.pole.CFrame.mul(flag.clothOffset);
		flag.pole.Anchored = false;
		flag.cloth.Anchored = false;
		const weld = new Instance("WeldConstraint");
		weld.Part0 = root;
		weld.Part1 = flag.pole;
		weld.Parent = flag.pole;
		flag.carryWeld = weld;

		this.setStatus(flag, "Taken");
		Remotes.Announce.FireAllClients(`${player.DisplayName} TOOK THE ${flag.team.upper()} FLAG`, ANNOUNCE_TIME);
	}

	private release(flag: Flag) {
		flag.carryWeld?.Destroy();
		flag.carryWeld = undefined;
		flag.carrier?.SetAttribute(CARRYING_FLAG_ATTRIBUTE, false);
		flag.carrier = undefined;
	}

	private returnHome(flag: Flag) {
		this.release(flag);
		this.placeFlag(flag, flag.home);
		this.setStatus(flag, "Home");
	}

	// Drops the flag on the ground below `position`, or sends it home if there's no ground.
	private drop(flag: Flag, position: Vector3) {
		this.release(flag);
		const params = new RaycastParams();
		params.FilterType = Enum.RaycastFilterType.Include;
		params.FilterDescendantsInstances = [this.arena];
		const ground = Workspace.Raycast(position, new Vector3(0, -60, 0), params);
		if (!ground) {
			this.returnHome(flag);
			Remotes.Announce.FireAllClients(`${flag.team.upper()} FLAG RETURNED`, ANNOUNCE_TIME);
			return;
		}
		this.placeFlag(flag, ground.Position);
		flag.droppedAt = os.clock();
		this.setStatus(flag, "Dropped");
		Remotes.Announce.FireAllClients(`${flag.team.upper()} FLAG DROPPED`, ANNOUNCE_TIME);
	}

	private dropCarriedBy(player: Player, position: Vector3 | undefined) {
		for (const [, flag] of this.flags) {
			if (flag.carrier !== player) continue;
			if (position) this.drop(flag, position);
			else this.returnHome(flag);
		}
	}

	private capture(flag: Flag, player: Player, team: TeamId) {
		this.returnHome(flag);
		this.scores.set(team, this.scores.get(team)! + 1);
		this.publishTeam(team);
		Remotes.Announce.FireAllClients(`${player.DisplayName} CAPTURED THE ${flag.team.upper()} FLAG`, ANNOUNCE_TIME);
	}

	private tick() {
		for (const [, flag] of this.flags) {
			if (flag.status === "Taken") {
				const carrier = flag.carrier;
				const root = carrier && rootOf(carrier);
				const team = carrier && this.teamOf(carrier);
				if (!carrier || !root || !team) continue;
				const ownFlag = this.flags.get(team)!;
				if (ownFlag.status === "Home" && root.Position.sub(ownFlag.home).Magnitude <= CtfConfig.captureRadius) {
					this.capture(flag, carrier, team);
				}
				continue;
			}

			if (flag.status === "Dropped" && os.clock() - flag.droppedAt >= CtfConfig.flagReturnTime) {
				this.returnHome(flag);
				Remotes.Announce.FireAllClients(`${flag.team.upper()} FLAG RETURNED`, ANNOUNCE_TIME);
				continue;
			}

			const base = this.flagBase(flag);
			for (const player of Players.GetPlayers()) {
				const root = rootOf(player);
				const team = this.teamOf(player);
				if (!root || !team || root.Position.sub(base).Magnitude > CtfConfig.pickupRadius) continue;

				if (team !== flag.team) {
					this.pickUp(flag, player, root);
					break;
				}
				if (flag.status === "Dropped") {
					this.returnHome(flag);
					Remotes.Announce.FireAllClients(
						`${player.DisplayName} RETURNED THE ${flag.team.upper()} FLAG`,
						ANNOUNCE_TIME,
					);
					break;
				}
			}
		}
	}

	canDamage(shooter: Player, victim: Player) {
		return this.teamOf(shooter) !== this.teamOf(victim);
	}

	onKill() {}

	addPlayer(player: Player) {
		if (this.teamOf(player)) return;
		const counts = TEAM_IDS.map((id) =>
			Players.GetPlayers()
				.filter((other) => other.Team === this.teams.get(id))
				.size(),
		);
		const team = counts[0] <= counts[1] ? TEAM_IDS[0] : TEAM_IDS[1];
		player.Neutral = false;
		player.Team = this.teams.get(team);
	}

	removePlayer(player: Player) {
		this.dropCarriedBy(player, undefined);
	}

	pickSpawn(player: Player) {
		const team = this.teamOf(player);
		const own = this.spawns.filter((spawn) => spawn.team === team).map((spawn) => spawn.cframe);
		const candidates = own.size() > 0 ? own : this.spawns.map((spawn) => spawn.cframe);
		return pickSafestSpawn(player, candidates, (other) => this.teamOf(other) !== team);
	}

	onDeath(player: Player, character: Model) {
		const root = character.FindFirstChild("HumanoidRootPart");
		this.dropCarriedBy(player, root?.IsA("BasePart") ? root.Position : undefined);
	}

	checkWinner(): MatchResult | undefined {
		for (const team of TEAM_IDS) {
			if (this.scores.get(team)! >= this.scoreTarget) return { title: `${team.upper()} TEAM WINS` };
		}
		return undefined;
	}

	timeUpResult(): MatchResult {
		const red = this.scores.get("Red")!;
		const blue = this.scores.get("Blue")!;
		if (red === blue) return { title: "DRAW" };
		return { title: `${red > blue ? "RED" : "BLUE"} TEAM WINS` };
	}

	stop() {
		this.heartbeat.Disconnect();
		for (const [, flag] of this.flags) {
			this.release(flag);
			flag.pole.Destroy();
			flag.cloth.Destroy();
		}
		for (const player of Players.GetPlayers()) {
			player.SetAttribute(CARRYING_FLAG_ATTRIBUTE, undefined);
			player.Team = undefined;
			player.Neutral = true;
		}
		for (const [, team] of this.teams) {
			team.Destroy();
		}
	}
}
