// Capture the Flag. Touch the enemy flag to take it, bring it to your own base while your
// flag is home to score. Carriers drop the flag when they die; a teammate touching a dropped
// flag returns it, and it returns on its own after a while.

import { CtfConfig, MatchConfig } from "shared/config";
import { getLiveRoot } from "shared/characters";
import { CARRYING_FLAG_ATTRIBUTE, FlagStatus, getMatchState, setMatchState } from "shared/matchState";
import { TEAM_IDS, TeamId } from "shared/modes";
import { Remotes } from "shared/remotes";
import { LoadedMap } from "../../maps/loader";
import { recordObjective } from "../../progression";
import { TeamRoster } from "../teams";
import { GameMode, MatchResult } from "./types";

const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const Workspace = game.GetService("Workspace");

const TICK_INTERVAL = 0.1;
const POLE_HEIGHT = 10;
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
	readonly respawnTime = MatchConfig.objectiveRespawnTime;

	private readonly roster: TeamRoster;
	private readonly flags = new Map<TeamId, Flag>();
	private readonly arena: Model;
	private readonly heartbeat: RBXScriptConnection;
	private sinceTick = 0;

	constructor(map: LoadedMap) {
		this.roster = new TeamRoster(map.spawns);
		this.arena = map.arena;

		for (const teamId of TEAM_IDS) {
			const home = map.flagBases.get(teamId);
			if (!home) error(`Map ${map.info.id} has no ${teamId} FlagBase marker`);
			this.flags.set(teamId, this.buildFlag(teamId, home));
			this.publishFlag(teamId);
		}

		this.heartbeat = RunService.Heartbeat.Connect((dt) => {
			this.sinceTick += dt;
			if (this.sinceTick < TICK_INTERVAL) return;
			this.sinceTick = 0;
			if (getMatchState("Phase") === "Playing") this.tick();
		});
	}

	private buildFlag(team: TeamId, home: Vector3): Flag {
		const color = this.roster.color(team);
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

	private publishFlag(team: TeamId) {
		setMatchState(team === "Red" ? "RedFlag" : "BlueFlag", this.flags.get(team)?.status ?? "Home");
	}

	private setStatus(flag: Flag, status: FlagStatus) {
		flag.status = status;
		this.publishFlag(flag.team);
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
		this.roster.addScore(team);
		recordObjective(player, "flagCapture");
		Remotes.Announce.FireAllClients(`${player.DisplayName} CAPTURED THE ${flag.team.upper()} FLAG`, ANNOUNCE_TIME);
	}

	private tick() {
		for (const [, flag] of this.flags) {
			if (flag.status === "Taken") {
				const carrier = flag.carrier;
				const root = carrier && getLiveRoot(carrier);
				const team = carrier && this.roster.teamOf(carrier);
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
				const root = getLiveRoot(player);
				const team = this.roster.teamOf(player);
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
		return this.roster.isEnemy(shooter, victim);
	}

	onKill() {}

	addPlayer(player: Player) {
		this.roster.assign(player);
	}

	removePlayer(player: Player) {
		this.dropCarriedBy(player, undefined);
	}

	pickSpawn(player: Player) {
		return this.roster.pickSpawn(player);
	}

	onDeath(player: Player, character: Model) {
		const root = character.FindFirstChild("HumanoidRootPart");
		this.dropCarriedBy(player, root?.IsA("BasePart") ? root.Position : undefined);
	}

	checkWinner(): MatchResult | undefined {
		return this.roster.winner(this.scoreTarget);
	}

	timeUpResult(): MatchResult {
		return this.roster.timeUpResult();
	}

	rateMatch(participants: Player[], result: MatchResult) {
		this.roster.rateMatch(participants, result);
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
		}
		this.roster.destroy();
	}
}
