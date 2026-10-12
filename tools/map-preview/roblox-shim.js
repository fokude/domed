// A minimal stand-in for the parts of Roblox's API that map builders use (Vector3, CFrame,
// Color3, Enum, Instance, math, CollectionService), so a map's code can run in Node and its
// geometry can be exported for previews. Only what the maps need: extend it when a map uses
// something new, and keep the math identical to Roblox's.

class Vector3 {
	constructor(x = 0, y = 0, z = 0) {
		this.X = x;
		this.Y = y;
		this.Z = z;
	}
	get Magnitude() {
		return Math.hypot(this.X, this.Y, this.Z);
	}
	get Unit() {
		const m = this.Magnitude;
		return m === 0 ? new Vector3(NaN, NaN, NaN) : new Vector3(this.X / m, this.Y / m, this.Z / m);
	}
	add(v) {
		return new Vector3(this.X + v.X, this.Y + v.Y, this.Z + v.Z);
	}
	sub(v) {
		return new Vector3(this.X - v.X, this.Y - v.Y, this.Z - v.Z);
	}
	mul(v) {
		return typeof v === "number"
			? new Vector3(this.X * v, this.Y * v, this.Z * v)
			: new Vector3(this.X * v.X, this.Y * v.Y, this.Z * v.Z);
	}
	div(v) {
		return typeof v === "number"
			? new Vector3(this.X / v, this.Y / v, this.Z / v)
			: new Vector3(this.X / v.X, this.Y / v.Y, this.Z / v.Z);
	}
	Dot(v) {
		return this.X * v.X + this.Y * v.Y + this.Z * v.Z;
	}
	Cross(v) {
		return new Vector3(this.Y * v.Z - this.Z * v.Y, this.Z * v.X - this.X * v.Z, this.X * v.Y - this.Y * v.X);
	}
	Lerp(v, t) {
		return this.add(v.sub(this).mul(t));
	}
	Abs() {
		return new Vector3(Math.abs(this.X), Math.abs(this.Y), Math.abs(this.Z));
	}
}
Vector3.zero = new Vector3(0, 0, 0);
Vector3.one = new Vector3(1, 1, 1);
Vector3.xAxis = new Vector3(1, 0, 0);
Vector3.yAxis = new Vector3(0, 1, 0);
Vector3.zAxis = new Vector3(0, 0, 1);

// Rotation stored row-major as Roblox's R00..R22; columns are the right, up and back vectors.
class CFrame {
	constructor(a, b, c, ...rest) {
		this.p = new Vector3();
		this.r = [1, 0, 0, 0, 1, 0, 0, 0, 1];
		if (a instanceof Vector3 && b instanceof Vector3) {
			const looked = CFrame.lookAt(a, b);
			this.p = looked.p;
			this.r = looked.r;
		} else if (a instanceof Vector3) {
			this.p = a;
		} else if (typeof a === "number" && rest.length === 9) {
			this.p = new Vector3(a, b, c);
			this.r = rest;
		} else if (typeof a === "number") {
			this.p = new Vector3(a, b ?? 0, c ?? 0);
		}
	}
	static fromParts(p, r) {
		const cf = new CFrame();
		cf.p = p;
		cf.r = r;
		return cf;
	}
	static lookAt(at, target, up = Vector3.yAxis) {
		const back = at.sub(target).Unit;
		let right = up.Cross(back);
		if (right.Magnitude < 1e-6) right = Vector3.xAxis.Cross(back);
		right = right.Unit;
		const realUp = back.Cross(right).Unit;
		return CFrame.fromParts(at, [right.X, realUp.X, back.X, right.Y, realUp.Y, back.Y, right.Z, realUp.Z, back.Z]);
	}
	// Same as Roblox's fromEulerAnglesXYZ: X, then Y, then Z, applied in that order of composition.
	static Angles(rx, ry, rz) {
		return CFrame.rx(rx).mul(CFrame.ry(ry)).mul(CFrame.rz(rz));
	}
	static fromEulerAnglesXYZ(rx, ry, rz) {
		return CFrame.Angles(rx, ry, rz);
	}
	static rx(a) {
		const c = Math.cos(a),
			s = Math.sin(a);
		return CFrame.fromParts(Vector3.zero, [1, 0, 0, 0, c, -s, 0, s, c]);
	}
	static ry(a) {
		const c = Math.cos(a),
			s = Math.sin(a);
		return CFrame.fromParts(Vector3.zero, [c, 0, s, 0, 1, 0, -s, 0, c]);
	}
	static rz(a) {
		const c = Math.cos(a),
			s = Math.sin(a);
		return CFrame.fromParts(Vector3.zero, [c, -s, 0, s, c, 0, 0, 0, 1]);
	}
	get Position() {
		return this.p;
	}
	get X() {
		return this.p.X;
	}
	get Y() {
		return this.p.Y;
	}
	get Z() {
		return this.p.Z;
	}
	get RightVector() {
		return new Vector3(this.r[0], this.r[3], this.r[6]);
	}
	get UpVector() {
		return new Vector3(this.r[1], this.r[4], this.r[7]);
	}
	get LookVector() {
		return new Vector3(-this.r[2], -this.r[5], -this.r[8]);
	}
	get Rotation() {
		return CFrame.fromParts(Vector3.zero, this.r);
	}
	rotate(v) {
		const r = this.r;
		return new Vector3(
			r[0] * v.X + r[1] * v.Y + r[2] * v.Z,
			r[3] * v.X + r[4] * v.Y + r[5] * v.Z,
			r[6] * v.X + r[7] * v.Y + r[8] * v.Z,
		);
	}
	mul(other) {
		if (other instanceof Vector3) return this.p.add(this.rotate(other));
		const a = this.r,
			b = other.r;
		const r = [];
		for (let i = 0; i < 3; i++)
			for (let j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
		return CFrame.fromParts(this.p.add(this.rotate(other.p)), r);
	}
	add(v) {
		return CFrame.fromParts(this.p.add(v), this.r);
	}
	sub(v) {
		return CFrame.fromParts(this.p.sub(v), this.r);
	}
	Inverse() {
		const r = this.r;
		const t = [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
		const inv = CFrame.fromParts(Vector3.zero, t);
		return CFrame.fromParts(inv.rotate(this.p).mul(-1), t);
	}
	PointToWorldSpace(v) {
		return this.mul(v);
	}
	ToWorldSpace(cf) {
		return this.mul(cf);
	}
	PointToObjectSpace(v) {
		return this.Inverse().mul(v);
	}
	GetComponents() {
		return [this.p.X, this.p.Y, this.p.Z, ...this.r];
	}
}

class Color3 {
	constructor(r = 0, g = 0, b = 0) {
		this.R = r;
		this.G = g;
		this.B = b;
	}
	static fromRGB(r, g, b) {
		return new Color3(r / 255, g / 255, b / 255);
	}
	static fromHex(hex) {
		const h = hex.replace("#", "");
		return Color3.fromRGB(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
	}
	static fromHSV(h, s, v) {
		const i = Math.floor(h * 6),
			f = h * 6 - i,
			p = v * (1 - s),
			q = v * (1 - f * s),
			t = v * (1 - (1 - f) * s);
		const [r, g, b] = [
			[v, t, p],
			[q, v, p],
			[p, v, t],
			[p, q, v],
			[t, p, v],
			[v, p, q],
		][((i % 6) + 6) % 6];
		return new Color3(r, g, b);
	}
	Lerp(c, t) {
		return new Color3(this.R + (c.R - this.R) * t, this.G + (c.G - this.G) * t, this.B + (c.B - this.B) * t);
	}
	ToHex() {
		const h = (x) =>
			Math.round(x * 255)
				.toString(16)
				.padStart(2, "0");
		return h(this.R) + h(this.G) + h(this.B);
	}
}

// Enum.Material.Neon and friends become { Name, EnumType } records.
const Enum = new Proxy(
	{},
	{
		get: (_, enumType) =>
			new Proxy({}, { get: (__, name) => ({ Name: String(name), EnumType: String(enumType) }) }),
	},
);

const BASE_PARTS = new Set(["Part", "WedgePart", "CornerWedgePart", "TrussPart", "MeshPart", "SpawnLocation"]);

class Instance {
	constructor(className) {
		this.ClassName = className;
		this.Name = className;
		this._children = [];
		this._attributes = {};
		this._tags = new Set();
		this._parent = undefined;
	}
	get Parent() {
		return this._parent;
	}
	set Parent(parent) {
		if (this._parent) this._parent._children = this._parent._children.filter((c) => c !== this);
		this._parent = parent;
		if (parent) parent._children.push(this);
	}
	IsA(className) {
		if (className === this.ClassName || className === "Instance") return true;
		if (className === "BasePart") return BASE_PARTS.has(this.ClassName);
		return false;
	}
	SetAttribute(name, value) {
		if (value === undefined) delete this._attributes[name];
		else this._attributes[name] = value;
	}
	GetAttribute(name) {
		return this._attributes[name];
	}
	AddTag(tag) {
		this._tags.add(tag);
	}
	RemoveTag(tag) {
		this._tags.delete(tag);
	}
	HasTag(tag) {
		return this._tags.has(tag);
	}
	GetChildren() {
		return [...this._children];
	}
	GetDescendants() {
		return this._children.flatMap((c) => [c, ...c.GetDescendants()]);
	}
	FindFirstChild(name) {
		return this._children.find((c) => c.Name === name);
	}
	FindFirstChildOfClass(className) {
		return this._children.find((c) => c.ClassName === className);
	}
	IsDescendantOf(other) {
		for (let p = this._parent; p; p = p._parent) if (p === other) return true;
		return false;
	}
	Destroy() {
		this.Parent = undefined;
	}
	Clone() {
		throw new Error("Clone isn't supported in the map preview shim");
	}
}

const CollectionService = {
	AddTag: (instance, tag) => instance.AddTag(tag),
	RemoveTag: (instance, tag) => instance.RemoveTag(tag),
	HasTag: (instance, tag) => instance.HasTag(tag),
};

// Services the maps don't really use resolve to inert stubs.
function stub() {
	return new Proxy(function () {}, { get: () => stub(), apply: () => stub(), construct: () => stub() });
}

const game = {
	GetService: (name) => (name === "CollectionService" ? CollectionService : stub()),
};

// Deterministic, so previews are stable between runs.
let seed = 12345;
function random() {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
}

const math = {
	pi: Math.PI,
	huge: Infinity,
	rad: (d) => (d * Math.PI) / 180,
	deg: (r) => (r * 180) / Math.PI,
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	atan2: Math.atan2,
	asin: Math.asin,
	acos: Math.acos,
	floor: Math.floor,
	ceil: Math.ceil,
	abs: Math.abs,
	sqrt: Math.sqrt,
	min: Math.min,
	max: Math.max,
	sign: Math.sign,
	round: Math.round,
	clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
	random: (m, n) =>
		m === undefined
			? random()
			: n === undefined
				? 1 + Math.floor(random() * m)
				: m + Math.floor(random() * (n - m + 1)),
};

// roblox-ts array and string helpers the maps use.
Object.defineProperty(Array.prototype, "size", {
	value: function () {
		return this.length;
	},
	configurable: true,
});
Object.defineProperty(Array.prototype, "isEmpty", {
	value: function () {
		return this.length === 0;
	},
	configurable: true,
});
Object.defineProperty(String.prototype, "size", {
	value: function () {
		return this.length;
	},
	configurable: true,
});
Object.defineProperty(String.prototype, "upper", {
	value: function () {
		return this.toUpperCase();
	},
	configurable: true,
});
Object.defineProperty(String.prototype, "lower", {
	value: function () {
		return this.toLowerCase();
	},
	configurable: true,
});

module.exports = {
	Vector3,
	CFrame,
	Color3,
	Enum,
	Instance,
	game,
	math,
	tostring: (v) => String(v),
	tonumber: (v) => (Number.isNaN(Number(v)) ? undefined : Number(v)),
	typeIs: (v, t) => (t === "number" ? typeof v === "number" : t === "string" ? typeof v === "string" : false),
	print: (...args) => console.log(...args),
	warn: (...args) => console.warn(...args),
	task: stub(),
	// UI types (labels on test maps) don't affect geometry.
	UDim2: stub(),
	UDim: stub(),
	Vector2: stub(),
	NumberSequence: stub(),
	NumberSequenceKeypoint: stub(),
	ColorSequence: stub(),
	NumberRange: stub(),
	os: { clock: () => performance.now() / 1000 },
};
