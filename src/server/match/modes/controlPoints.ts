// Domination and Hardpoint: teams score by holding zones rather than by kills.
//
// Domination: every point is live. A team captures a point by standing in it with no enemies
// present (faster with more teammates), and each point it owns scores every second.
// Hardpoint: one point is live at a time, moving to the next every so often. A team scores
// every second it has the live point to itself.

import { DominationConfig, HardpointConfig, MatchConfig } from "shared/config";
import { getLiveRoot } from "shared/characters";
import { ControlPointState, getMatchState, setMatchState } from "shared/matchState";
import { TEAM_IDS, TeamId } from "shared/modes";
import { Remotes } from "shared/remotes";
import { ControlPoint, LoadedMap } from "../../maps/loader";
import { TeamRoster } from "../teams";
import { GameMode, MatchResult } from "./types";

const HttpService = game.GetService("HttpService");
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

const TICK_INTERVAL = 0.1;
const SCORE_INTERVAL = 1;
// Players count as on a point from slightly below its floor to this far above it.
const ZONE_HEIGHT = 10;
const MAX_CAPTURE_MULTIPLIER = 3;
const ANNOUNCE_TIME = 2.5;
const NEUTRAL_COLOR = Color3.fromRGB(230, 230, 230);
const CONTESTED_COLOR = Color3.fromRGB(255, 210, 60);

type Kind = "Domination" | "Hardpoint";

interface Zone {
	point: ControlPoint;
	state: ControlPointState;
	ring: Part[];
	marker: BillboardGui;
	letter: TextLabel;
}

function isInside(point: ControlPoint, position: Vector3): boolean {
	const offset = position.sub(point.position);
	const flat = new Vector3(offset.X, 0, offset.Z).Magnitude;
	return flat <= point.radius && offset.Y >= -2 && offset.Y <= ZONE_HEIGHT;
}

export class ControlPointMode implements GameMode {
	readonly id: Kind;
	readonly timeLimit: number;
	readonly scoreTarget: number;
	readonly respawnTime = MatchConfig.objectiveRespawnTime;

	private readonly roster: TeamRoster;
	private readonly zones: Zone[] = [];
	private readonly folder: Folder;
	private readonly heartbeat: RBXScriptConnection;
	private sinceTick = 0;
	private sinceScore = 0;
	private activeIndex = 0;
	private activeSince = os.clock();

	constructor(map: LoadedMap, kind: Kind) {
		this.id = kind;
		const config = kind === "Domination" ? DominationConfig : HardpointConfig;
		this.timeLimit = config.timeLimit;
		this.scoreTarget = config.scoreTarget;
		this.roster = new TeamRoster(map.spawns);
		const points = map.controlPoints.filter((point) => point.mode === undefined || point.mode === kind);
		if (points.size() === 0) error(`Map ${map.info.id} has no ${kind} ControlPoint markers`);

		this.folder = new Instance("Folder");
		this.folder.Name = "ControlPoints";
		points.forEach((point, index) => {
			const zone = this.buildZone(point);
			zone.state.active = kind === "Domination" || index === 0;
			this.zones.push(zone);
		});
		this.folder.Parent = map.arena;
		this.publish();

		this.heartbeat = RunService.Heartbeat.Connect((dt) => {
			this.sinceTick += dt;
			if (this.sinceTick < TICK_INTERVAL) return;
			const elapsed = this.sinceTick;
			this.sinceTick = 0;
			if (getMatchState("Phase") === "Playing") this.tick(elapsed);
		});
	}

	// Floor ring and floating letter, recolored as the point changes hands.
	private buildZone(point: ControlPoint): Zone {
		const ring: Part[] = [];
		const segments = 24;
		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * 2 * math.pi;
			const part = new Instance("Part");
			part.Anchored = true;
			part.CanCollide = false;
			part.CanQuery = false;
			part.CanTouch = false;
			part.CastShadow = false;
			part.Material = Enum.Material.Neon;
			part.Size = new Vector3(2 * point.radius * math.tan(math.pi / segments) + 0.2, 0.2, 0.8);
			part.CFrame = new CFrame(point.position.add(new Vector3(0, 0.15, 0)))
				.mul(CFrame.Angles(0, angle, 0))
				.mul(new CFrame(0, 0, -point.radius));
			part.Parent = this.folder;
			ring.push(part);
		}

		const anchor = new Instance("Part");
		anchor.Anchored = true;
		anchor.CanCollide = false;
		anchor.CanQuery = false;
		anchor.Transparency = 1;
		anchor.Size = Vector3.one;
		anchor.Position = point.position.add(new Vector3(0, 9, 0));
		anchor.Parent = this.folder;

		const marker = new Instance("BillboardGui");
		marker.Size = UDim2.fromOffset(48, 48);
		marker.AlwaysOnTop = true;
		marker.LightInfluence = 0;
		marker.Parent = anchor;
		const letter = new Instance("TextLabel");
		letter.Size = UDim2.fromScale(1, 1);
		letter.BackgroundTransparency = 1;
		letter.Font = Enum.Font.GothamBlack;
		letter.TextScaled = true;
		letter.TextStrokeTransparency = 0;
		letter.Text = point.label;
		letter.Parent = marker;

		const state: ControlPointState = { label: point.label, progress: 0, contested: false, active: true };
		return { point, state, ring, marker, letter };
	}

	private occupants(point: ControlPoint): Map<TeamId, number> {
		const counts = new Map<TeamId, number>();
		for (const player of Players.GetPlayers()) {
			const root = getLiveRoot(player);
			const team = this.roster.teamOf(player);
			if (root && team && isInside(point, root.Position)) counts.set(team, (counts.get(team) ?? 0) + 1);
		}
		return counts;
	}

	// The single team on a point, or undefined if it's empty or contested.
	private holder(counts: Map<TeamId, number>): TeamId | undefined {
		const present = TEAM_IDS.filter((team) => (counts.get(team) ?? 0) > 0);
		return present.size() === 1 ? present[0] : undefined;
	}

	private updateCapture(zone: Zone, counts: Map<TeamId, number>, dt: number) {
		const state = zone.state;
		const team = this.holder(counts);
		state.contested = counts.size() > 1;
		if (state.contested) return;

		if (!team) {
			state.progress = math.max(0, state.progress - dt / DominationConfig.captureTime);
			if (state.progress === 0) state.capturing = undefined;
			return;
		}
		if (team === state.owner) {
			state.progress = 0;
			state.capturing = undefined;
			return;
		}
		if (state.capturing !== team) {
			state.capturing = team;
			state.progress = 0;
		}
		const multiplier = math.min(counts.get(team)!, MAX_CAPTURE_MULTIPLIER);
		state.progress += (dt / DominationConfig.captureTime) * multiplier;
		if (state.progress >= 1) {
			state.owner = team;
			state.capturing = undefined;
			state.progress = 0;
			Remotes.Announce.FireAllClients(`${team.upper()} CAPTURED ${zone.point.label}`, ANNOUNCE_TIME);
		}
	}

	private rotateHardpoint() {
		if (os.clock() - this.activeSince < HardpointConfig.rotateEvery) return;
		this.activeIndex = (this.activeIndex + 1) % this.zones.size();
		this.activeSince = os.clock();
		Remotes.Announce.FireAllClients(
			`HARDPOINT MOVED TO ${this.zones[this.activeIndex].point.label}`,
			ANNOUNCE_TIME,
		);
	}

	private tick(dt: number) {
		if (this.id === "Hardpoint") this.rotateHardpoint();

		const scorers: TeamId[] = [];
		this.zones.forEach((zone, index) => {
			const counts = this.occupants(zone.point);
			if (this.id === "Domination") {
				this.updateCapture(zone, counts, dt);
				if (zone.state.owner) scorers.push(zone.state.owner);
				return;
			}
			zone.state.active = index === this.activeIndex;
			zone.state.contested = zone.state.active && counts.size() > 1;
			zone.state.owner = zone.state.active ? this.holder(counts) : undefined;
			if (zone.state.owner) scorers.push(zone.state.owner);
		});

		this.sinceScore += dt;
		if (this.sinceScore >= SCORE_INTERVAL) {
			this.sinceScore -= SCORE_INTERVAL;
			for (const team of scorers) this.roster.addScore(team);
		}
		this.publish();
	}

	private publish() {
		for (const zone of this.zones) {
			const { state } = zone;
			const color = state.contested
				? CONTESTED_COLOR
				: state.owner
					? this.roster.color(state.owner)
					: NEUTRAL_COLOR;
			const visible = state.active;
			for (const part of zone.ring) {
				part.Color = color;
				part.Transparency = visible ? 0 : 1;
			}
			zone.letter.TextColor3 = color;
			zone.marker.Enabled = visible;
		}
		setMatchState("ControlPoints", HttpService.JSONEncode(this.zones.map((zone) => zone.state)));
	}

	canDamage(shooter: Player, victim: Player) {
		return this.roster.isEnemy(shooter, victim);
	}

	onKill() {}

	addPlayer(player: Player) {
		this.roster.assign(player);
	}

	removePlayer() {}

	pickSpawn(player: Player) {
		return this.roster.pickSpawn(player);
	}

	onDeath() {}

	checkWinner(): MatchResult | undefined {
		return this.roster.winner(this.scoreTarget);
	}

	timeUpResult(): MatchResult {
		return this.roster.timeUpResult();
	}

	stop() {
		this.heartbeat.Disconnect();
		this.folder.Destroy();
		setMatchState("ControlPoints", "[]");
		this.roster.destroy();
	}
}
