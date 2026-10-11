// Movement layered on top of the default Humanoid: Quake-style air strafing and bunny
// hopping, double jump, wall jump, and slide.
//
// On the ground the Humanoid moves the character as usual, except while sliding. While
// airborne this module owns horizontal velocity: the Humanoid's built-in air control would
// otherwise drag the player back toward WalkSpeed and make bunny hopping impossible.
//
// docs/MOVEMENT.md explains each move and the engine quirks this code works around.

import { MovementConfig as Config, CtfConfig } from "shared/config";
import { CARRYING_FLAG_ATTRIBUTE } from "shared/matchState";

const CollectionService = game.GetService("CollectionService");
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const Workspace = game.GetService("Workspace");

const WALL_PROBE_RADIUS = 1.4;
const JUMP_PAD_DEBOUNCE = 0.4;
// How far below the root to look for a jump pad. The root sits about 3 studs above the feet;
// the extra catches players landing on a pad from above.
const PAD_PROBE_DEPTH = 5;
// A scroll tick counts as a jump press for this long, so scrolling just before landing still hops.
const SCROLL_JUMP_BUFFER = 0.1;
// If physics leaves us below this fraction of our intended speed, something blocked us.
const BLOCKED_SPEED_RATIO = 0.3;
const SLIDE_KEYS: Enum.KeyCode[] = [Enum.KeyCode.LeftControl, Enum.KeyCode.C];

const player = Players.LocalPlayer;

let humanoid: Humanoid | undefined;
let root: BasePart | undefined;

let airVelocity = Vector3.zero;
let groundTime = math.huge;
let wasAirborne = false;
let keepVelocityOnTakeoff = false;
// Vertical speed to apply on the first airborne frame of a launch from the ground.
let pendingVerticalVelocity: number | undefined;
let doubleJumpUsed = false;
let wallJumpsUsed = 0;
let lastWallNormal: Vector3 | undefined;
// MoveDirection is zeroed while airborne, so input handlers read the last real value here.
let wishDirection = Vector3.zero;
let lastPadLaunch = 0;
const jumpPads: BasePart[] = [];
const padProbeParams = new RaycastParams();
padProbeParams.FilterType = Enum.RaycastFilterType.Include;
padProbeParams.FilterDescendantsInstances = [];
let lastScrollAt = -math.huge;

let sliding = false;
let slideDirection = Vector3.zero;
let slideSpeed = 0;
let slideStartedAt = 0;
let lastSlideEndedAt = -math.huge;

const wallProbeParams = new RaycastParams();
wallProbeParams.FilterType = Enum.RaycastFilterType.Exclude;

function flatten(vector: Vector3): Vector3 {
	return new Vector3(vector.X, 0, vector.Z);
}

function isAirborne(target: Humanoid): boolean {
	const state = target.GetState();
	return state === Enum.HumanoidStateType.Freefall || state === Enum.HumanoidStateType.Jumping;
}

function isJumpHeld(): boolean {
	if (UserInputService.GetFocusedTextBox()) return false;
	return (
		UserInputService.IsKeyDown(Enum.KeyCode.Space) ||
		UserInputService.IsGamepadButtonDown(Enum.UserInputType.Gamepad1, Enum.KeyCode.ButtonA)
	);
}

function isSlideHeld(): boolean {
	return SLIDE_KEYS.some((key) => UserInputService.IsKeyDown(key));
}

function wantsToJump(): boolean {
	return isJumpHeld() || os.clock() - lastScrollAt <= SCROLL_JUMP_BUFFER;
}

function getLiveBody(): [Humanoid, BasePart] | undefined {
	if (humanoid && root && humanoid.Health > 0) return [humanoid, root];
	return undefined;
}

// Half-Life's PM_AirAccelerate: only the component of velocity along the wish direction
// is capped, so steering perpendicular to your motion keeps adding speed.
function airAccelerate(velocity: Vector3, wishDirection: Vector3, dt: number): Vector3 {
	const flatWish = flatten(wishDirection);
	if (flatWish.Magnitude < 0.01) return velocity;
	const wish = flatWish.Unit;

	const addSpeed = Config.airSpeedCap - velocity.Dot(wish);
	if (addSpeed <= 0) return velocity;

	const accelSpeed = math.min(Config.airAccelerate * Config.walkSpeed * dt, addSpeed);
	const result = velocity.add(wish.mul(accelSpeed));
	return result;
}

// Removes the part of our velocity that points into a wall, so we slide along it.
function clipToWalls(velocity: Vector3, rootPart: BasePart, dt: number): Vector3 {
	const speed = velocity.Magnitude;
	if (speed < 0.1) return velocity;

	const hit = Workspace.Spherecast(
		rootPart.Position,
		WALL_PROBE_RADIUS,
		velocity.Unit.mul(speed * dt + 1),
		wallProbeParams,
	);
	if (!hit) return velocity;

	const flatNormal = flatten(hit.Normal);
	if (flatNormal.Magnitude < 0.1) return velocity;
	const normal = flatNormal.Unit;

	const intoWall = velocity.Dot(normal);
	return intoWall < 0 ? velocity.sub(normal.mul(intoWall)) : velocity;
}

function startSlide(currentHumanoid: Humanoid, horizontal: Vector3): boolean {
	if (!Config.slideEnabled || sliding || os.clock() - lastSlideEndedAt < Config.slideCooldown) return false;
	const speed = horizontal.Magnitude;
	if (speed < Config.slideMinSpeed) return false;

	sliding = true;
	slideStartedAt = os.clock();
	slideDirection = horizontal.Unit;
	slideSpeed = math.max(speed, Config.slideStartSpeed);
	currentHumanoid.CameraOffset = new Vector3(0, -Config.slideCameraDrop, 0);
	return true;
}

function endSlide() {
	if (!sliding) return;
	sliding = false;
	lastSlideEndedAt = os.clock();
	if (humanoid) {
		humanoid.CameraOffset = Vector3.zero;
		humanoid.WalkSpeed = Config.walkSpeed;
	}
}

// A grounded slide keeps momentum with light friction. On the ground the Humanoid brakes any
// velocity it didn't choose, so the slide is driven through it: it walks in the slide
// direction at the slide speed.
function updateSlide(currentHumanoid: Humanoid, rootPart: BasePart, dt: number) {
	slideSpeed *= math.max(0, 1 - Config.slideFriction * dt);
	const velocity = clipToWalls(slideDirection.mul(slideSpeed), rootPart, dt);
	if (velocity.Magnitude < Config.walkSpeed * 0.75 || os.clock() - slideStartedAt > Config.slideMaxTime) {
		endSlide();
		return;
	}
	slideDirection = velocity.Unit;
	slideSpeed = velocity.Magnitude;
	currentHumanoid.WalkSpeed = slideSpeed;
	currentHumanoid.Move(slideDirection, false);
	airVelocity = velocity;
}

function onPreSimulation(dt: number) {
	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
	checkJumpPad(rootPart);
	const actualVelocity = rootPart.AssemblyLinearVelocity;

	if (!isAirborne(currentHumanoid)) {
		if (wasAirborne) {
			wasAirborne = false;
			groundTime = 0;
			doubleJumpUsed = false;
			wallJumpsUsed = 0;
			lastWallNormal = undefined;
			// Re-jump on the landing frame itself; waiting for the Humanoid's own auto-jump
			// leaves us on the ground long enough for friction to eat the hop.
			// Holding slide on landing turns air speed straight into a slide.
			if (wantsToJump()) currentHumanoid.ChangeState(Enum.HumanoidStateType.Jumping);
			else if (isSlideHeld()) startSlide(currentHumanoid, airVelocity);
		}
		groundTime += dt;
		if (sliding) updateSlide(currentHumanoid, rootPart, dt);
		return;
	}
	endSlide();

	// The control script has already set this frame's MoveDirection. Read it as our wish
	// direction, then zero it so the Humanoid's air control doesn't fight our velocity.
	wishDirection = currentHumanoid.MoveDirection;
	currentHumanoid.Move(Vector3.zero);

	const justTookOff = !wasAirborne;
	if (justTookOff) {
		wasAirborne = true;
		if (keepVelocityOnTakeoff) {
			keepVelocityOnTakeoff = false;
		} else if (groundTime <= Config.bhopWindow) {
			airVelocity = airVelocity.mul(1 - Config.bhopSpeedLoss);
		} else {
			airVelocity = flatten(actualVelocity);
		}
	}

	airVelocity = airAccelerate(airVelocity, wishDirection, dt);
	const maxSpeed =
		player.GetAttribute(CARRYING_FLAG_ATTRIBUTE) === true ? CtfConfig.carrierMaxSpeed : Config.maxAirSpeed;
	if (airVelocity.Magnitude > maxSpeed) airVelocity = airVelocity.Unit.mul(maxSpeed);
	airVelocity = clipToWalls(airVelocity, rootPart, dt);

	// Ground friction during a bhop legitimately lowers the takeoff frame's speed, so only
	// trust the physics reading after we've been airborne for a frame.
	const actualFlat = flatten(actualVelocity);
	if (!justTookOff && actualFlat.Magnitude < airVelocity.Magnitude * BLOCKED_SPEED_RATIO) {
		airVelocity = actualFlat;
	}

	let verticalVelocity = actualVelocity.Y;
	if (justTookOff && pendingVerticalVelocity !== undefined) {
		verticalVelocity = pendingVerticalVelocity;
		pendingVerticalVelocity = undefined;
	}

	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, verticalVelocity, airVelocity.Z);
}

function onRenderStepped(dt: number) {
	const camera = Workspace.CurrentCamera;
	if (!camera) return;
	const range = Config.maxAirSpeed - Config.walkSpeed;
	const speedFraction = math.clamp((getSpeed() - Config.walkSpeed) / range, 0, 1);
	const targetFov = Config.baseFov + Config.speedFovBoost * speedFraction;
	camera.FieldOfView += (targetFov - camera.FieldOfView) * math.min(1, dt * 8);
}

// Nearest wall within reach, probed in eight directions at root height.
function findWall(rootPart: BasePart): Vector3 | undefined {
	// The root is about a stud from the body's edge, so reach is measured from there.
	const reach = Config.wallJumpRange + 1;
	let nearest: RaycastResult | undefined;
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * 2 * math.pi;
		const direction = new Vector3(math.sin(angle), 0, math.cos(angle)).mul(reach);
		const hit = Workspace.Raycast(rootPart.Position, direction, wallProbeParams);
		if (hit && math.abs(hit.Normal.Y) < 0.3 && (!nearest || hit.Distance < nearest.Distance)) nearest = hit;
	}
	return nearest ? flatten(nearest.Normal).Unit : undefined;
}

// Kicks off a nearby wall: speed along the wall is kept, and the player is pushed away from it
// and up. The same wall can't be used twice in a row, so chimneys can be climbed but single
// walls can't.
function tryWallJump(rootPart: BasePart): boolean {
	if (!Config.wallJumpEnabled || wallJumpsUsed >= Config.maxWallJumps) return false;
	const normal = findWall(rootPart);
	if (!normal || (lastWallNormal && normal.Dot(lastWallNormal) > 0.9)) return false;

	wallJumpsUsed += 1;
	lastWallNormal = normal;
	const alongWall = airVelocity.sub(normal.mul(airVelocity.Dot(normal)));
	airVelocity = alongWall.add(normal.mul(Config.wallJumpPush));
	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, Config.wallJumpVelocity, airVelocity.Z);
	return true;
}

function onInputBegan(input: InputObject) {
	if (UserInputService.GetFocusedTextBox()) return;
	if (SLIDE_KEYS.includes(input.KeyCode)) {
		const body = getLiveBody();
		if (body && !isAirborne(body[0])) startSlide(body[0], flatten(body[1].AssemblyLinearVelocity));
		return;
	}
	if (input.KeyCode !== Enum.KeyCode.Space && input.KeyCode !== Enum.KeyCode.ButtonA) return;

	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;
	if (!isAirborne(currentHumanoid)) return;
	if (tryWallJump(rootPart) || doubleJumpUsed) return;
	doubleJumpUsed = true;

	// Like UT's double jump, the second jump redirects momentum toward the input direction.
	const wish = flatten(wishDirection);
	if (wish.Magnitude > 0.01) {
		airVelocity = wish.Unit.mul(math.max(airVelocity.Magnitude, Config.walkSpeed));
	}
	rootPart.AssemblyLinearVelocity = new Vector3(airVelocity.X, Config.doubleJumpVelocity, airVelocity.Z);
}

// Scroll wheel jumps on the ground only; in the air it buffers a hop and never spends the double jump.
function onInputChanged(input: InputObject, gameProcessed: boolean) {
	if (input.UserInputType !== Enum.UserInputType.MouseWheel || gameProcessed) return;
	lastScrollAt = os.clock();

	const body = getLiveBody();
	if (body && !isAirborne(body[0])) body[0].ChangeState(Enum.HumanoidStateType.Jumping);
}

function onInputEnded(input: InputObject) {
	if (SLIDE_KEYS.includes(input.KeyCode)) endSlide();
}

function onCharacterAdded(newCharacter: Model) {
	humanoid = newCharacter.WaitForChild("Humanoid") as Humanoid;
	root = newCharacter.WaitForChild("HumanoidRootPart") as BasePart;
	wallProbeParams.FilterDescendantsInstances = [newCharacter];

	airVelocity = Vector3.zero;
	groundTime = math.huge;
	wasAirborne = false;
	keepVelocityOnTakeoff = false;
	doubleJumpUsed = false;
	wallJumpsUsed = 0;
	lastWallNormal = undefined;
	sliding = false;
}

function trackJumpPad(pad: Instance) {
	if (!pad.IsA("BasePart")) return;
	jumpPads.push(pad);
	padProbeParams.FilterDescendantsInstances = jumpPads;
}

function untrackJumpPad(pad: Instance) {
	const index = jumpPads.indexOf(pad as BasePart);
	if (index === -1) return;
	jumpPads.remove(index);
	padProbeParams.FilterDescendantsInstances = jumpPads;
}

// Pads are found by probing under the feet every frame rather than with Touched: R15
// characters hover on their HipHeight, so their feet often never touch the pad.
function checkJumpPad(rootPart: BasePart) {
	if (os.clock() - lastPadLaunch < JUMP_PAD_DEBOUNCE) return;
	const hit = Workspace.Raycast(rootPart.Position, new Vector3(0, -PAD_PROBE_DEPTH, 0), padProbeParams);
	const launch = hit?.Instance.GetAttribute("Launch");
	if (!typeIs(launch, "Vector3")) return;
	lastPadLaunch = os.clock();

	// The pad sets vertical speed and adds its push to the player's own momentum, so they keep
	// the direction they were moving in rather than being redirected onto a fixed path.
	const momentum = flatten(rootPart.AssemblyLinearVelocity);
	launchCharacter(new Vector3(momentum.X + launch.X, launch.Y, momentum.Z + launch.Z), false);
}

export function getSpeed(): number {
	return root ? flatten(root.AssemblyLinearVelocity).Magnitude : 0;
}

// Sets (or adds to) the character's velocity in a way the air controller won't undo.
export function launchCharacter(velocity: Vector3, additive: boolean) {
	const body = getLiveBody();
	if (!body) return;
	const [currentHumanoid, rootPart] = body;

	const newVelocity = additive ? rootPart.AssemblyLinearVelocity.add(velocity) : velocity;
	airVelocity = flatten(newVelocity);
	if (!additive) doubleJumpUsed = false;

	if (!isAirborne(currentHumanoid)) {
		// A real jump is the only reliable way off the ground: in any other state the Humanoid
		// sees the floor and snaps back to walking. The jump's own vertical speed is replaced on
		// the first airborne frame.
		keepVelocityOnTakeoff = true;
		pendingVerticalVelocity = newVelocity.Y;
		currentHumanoid.ChangeState(Enum.HumanoidStateType.Jumping);
	}
	rootPart.AssemblyLinearVelocity = newVelocity;
}

export function initMovement() {
	player.CharacterAdded.Connect(onCharacterAdded);
	if (player.Character) task.spawn(onCharacterAdded, player.Character);

	CollectionService.GetTagged("JumpPad").forEach(trackJumpPad);
	CollectionService.GetInstanceAddedSignal("JumpPad").Connect(trackJumpPad);
	CollectionService.GetInstanceRemovedSignal("JumpPad").Connect(untrackJumpPad);

	RunService.PreSimulation.Connect(onPreSimulation);
	RunService.RenderStepped.Connect(onRenderStepped);
	UserInputService.InputBegan.Connect(onInputBegan);
	UserInputService.InputEnded.Connect(onInputEnded);
	UserInputService.InputChanged.Connect(onInputChanged);
}
