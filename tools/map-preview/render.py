# Renders a map exported by export.js, so a layout can be looked at without Studio:
#   plan.png       top-down plan in the map's colors, with markers highlighted
#   heights.png    top-down plan colored by height (blue low, red high)
#   cut_<h>.png    floor plans with everything above height h (studs) cut away, one per level
#   exposure.png   plan with sampled standing spots: red can see a spawn, green can't
#   metrics.json   openness and spawn exposure, measured like the game's /openness
#   overview.png   angled view of the whole map
#   spawn_N.png    eye-level views from spawns, at the game's field of view
# Run through Blender:
#   blender -b -P tools/map-preview/render.py -- <map.json> <output dir> [resolution]
#
# Roblox is Y-up and Blender is Z-up, so Roblox (x, y, z) becomes Blender (x, -z, y).

import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1 :]
json_path, out_dir = argv[0], os.path.abspath(argv[1])
resolution = int(argv[2]) if len(argv) > 2 else 1200
os.makedirs(out_dir, exist_ok=True)

with open(json_path) as f:
    data = json.load(f)

# Marker colors, matching what the game shows.
TEAM_COLORS = {"Red": (1.0, 0.25, 0.2), "Blue": (0.2, 0.45, 1.0)}
MARKER_COLORS = {
    "JumpPad": (0.0, 0.9, 1.0),
    "PadTarget": (0.0, 0.9, 1.0),
    "Perk": (1.0, 0.8, 0.1),
    "ControlPoint": (1.0, 1.0, 1.0),
    "Dummy": (1.0, 0.5, 0.0),
}
P = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))


def to_blender(v):
    return Vector((v[0], -v[2], v[1]))


def part_matrix(cframe):
    x, y, z = cframe[0:3]
    r = cframe[3:12]
    rot = Matrix(((r[0], r[1], r[2]), (r[3], r[4], r[5]), (r[6], r[7], r[8])))
    m = (P @ rot @ P.transposed()).to_4x4()
    m.translation = to_blender((x, y, z))
    return m


def local_geometry(part):
    """Vertices (Roblox local space) and faces for a part's shape."""
    sx, sy, sz = (s / 2 for s in part["size"])
    if part["className"] == "WedgePart":
        # Full height at the back (+Z), sloping down to the front (-Z).
        verts = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, -sy, sz), (-sx, -sy, sz), (-sx, sy, sz), (sx, sy, sz)]
        faces = [(0, 1, 2, 3), (3, 2, 5, 4), (0, 4, 5, 1), (0, 3, 4), (1, 5, 2)]
        return verts, faces
    if part["shape"] == "Cylinder":
        radius, segments = min(sy, sz), 20
        verts = []
        for side in (-sx, sx):
            for i in range(segments):
                a = 2 * math.pi * i / segments
                verts.append((side, math.cos(a) * radius, math.sin(a) * radius))
        faces = [tuple(range(segments)), tuple(range(2 * segments - 1, segments - 1, -1))]
        for i in range(segments):
            j = (i + 1) % segments
            faces.append((i, j, segments + j, segments + i))
        return verts, faces
    if part["shape"] == "Ball":
        radius, rings, segments = min(sx, sy, sz), 8, 16
        verts = [(0, radius, 0)]
        for ring in range(1, rings):
            phi = math.pi * ring / rings
            for i in range(segments):
                a = 2 * math.pi * i / segments
                verts.append((math.sin(phi) * math.cos(a) * radius, math.cos(phi) * radius, math.sin(phi) * math.sin(a) * radius))
        verts.append((0, -radius, 0))
        faces = []
        for i in range(segments):
            faces.append((0, 1 + (i + 1) % segments, 1 + i))
        for ring in range(rings - 2):
            for i in range(segments):
                a = 1 + ring * segments + i
                b = 1 + ring * segments + (i + 1) % segments
                faces.append((a, b, b + segments, a + segments))
        bottom = len(verts) - 1
        for i in range(segments):
            base = 1 + (rings - 2) * segments
            faces.append((base + i, base + (i + 1) % segments, bottom))
        return verts, faces
    verts = [(x, y, z) for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return verts, faces


def marker_kind(part):
    for tag in ("Spawn", "JumpPad", "PadTarget", "Perk", "ControlPoint", "FlagBase", "Dummy"):
        if tag in part["tags"]:
            return tag
    return None


def color_for(part, kind):
    if kind in ("Spawn", "FlagBase"):
        return TEAM_COLORS.get(part["attributes"].get("Team"), (0.3, 1.0, 0.4))
    if kind in MARKER_COLORS:
        return MARKER_COLORS[kind]
    r, g, b = part["color"]
    if part["material"] == "Neon":
        return (min(1, r * 1.3), min(1, g * 1.3), min(1, b * 1.3))
    return (r, g, b)


def add_object(name, verts, faces, matrix, color, alpha=1.0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([P @ Vector(v) for v in verts], [], faces)
    # Bake the placement into the vertices, so section cuts can work in world space.
    mesh.transform(matrix)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.color = (*color, alpha)
    bpy.context.scene.collection.objects.link(obj)
    return obj


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Playable geometry frames the views; scenery (backdrops shots pass through) is drawn but
# doesn't count toward bounds or the height map.
geometry, scenery, markers, spawns = [], [], [], []
for index, part in enumerate(data["parts"]):
    kind = marker_kind(part)
    if kind is None and part["transparency"] >= 0.95:
        continue  # invisible barriers and labels
    verts, faces = local_geometry(part)
    matrix = part_matrix(part["cframe"])
    alpha = 1.0 if kind else max(0.25, 1.0 - part["transparency"])
    obj = add_object(f"{kind or 'Part'}_{index}", verts, faces, matrix, color_for(part, kind), alpha)
    obj["top"] = max((matrix @ (P @ Vector(v))).z for v in verts)
    if kind:
        markers.append(obj)
    elif part["canQuery"] and "Art" not in part["ancestors"]:
        geometry.append(obj)
    else:
        scenery.append(obj)
    if kind == "Spawn":
        cf = part["cframe"]
        look = Vector((-cf[5], -cf[8], -cf[11]))  # -back column
        spawns.append((to_blender(cf[0:3]), Vector((look.x, -look.z, look.y)), part["attributes"].get("Team")))
    if kind == "ControlPoint":
        radius = part["attributes"].get("Radius", 12)
        center = to_blender(part["cframe"][0:3])
        ring = bpy.data.meshes.new("Zone")
        segs = 32
        ring.from_pydata(
            [(math.cos(2 * math.pi * i / segs) * radius, math.sin(2 * math.pi * i / segs) * radius, 0) for i in range(segs)],
            [],
            [tuple(range(segs))],
        )
        zone = bpy.data.objects.new("Zone", ring)
        zone.location = center + Vector((0, 0, 0.6))
        zone.color = (1, 1, 1, 0.35)
        scene.collection.objects.link(zone)
        markers.append(zone)

# Spawn arrows: a flat triangle on the floor pointing where the spawn faces, big enough to read
# on the plan.
for position, look, team in spawns:
    flat = Vector((look.x, look.y, 0)).normalized()
    side = Vector((-flat.y, flat.x, 0))
    base = position - Vector((0, 0, 2.3))
    tip = base + flat * 7
    verts = [tuple(tip), tuple(base + side * 3 - flat * 2), tuple(base - side * 3 - flat * 2)]
    arrow = add_object("SpawnArrow", verts, [(0, 1, 2)], Matrix.Identity(4), TEAM_COLORS.get(team, (0.3, 1.0, 0.4)))
    arrow.matrix_world = Matrix.Identity(4)
    arrow.data.vertices.foreach_set("co", [c for v in verts for c in v])
    markers.append(arrow)

# Bounds of solid geometry, for framing.
points = [obj.matrix_world @ v.co for obj in geometry for v in obj.data.vertices]
lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
center = (lo + hi) / 2
extent = max(hi.x - lo.x, hi.y - lo.y)

# --- Openness and spawn exposure, measured the same way as the game's /openness command ---
# (server/maps/openness.ts): sample standing spots on every floor, then check which pairs can
# see each other, and which spots can see a spawn. Rays hit what the game's raycasts hit: every
# queryable part except markers, which are removed when a map loads, and Art.
REMOVED_AT_LOAD = {"Spawn", "FlagBase", "PadTarget", "ControlPoint", "Perk", "Dummy"}
SAMPLE_COUNT, EYE_HEIGHT, HEADROOM = 250, 5, 6

ray_verts, ray_faces, face_part = [], [], []
for part in data["parts"]:
    if not part["canQuery"] or "Art" in part["ancestors"] or REMOVED_AT_LOAD & set(part["tags"]):
        continue
    verts, faces = local_geometry(part)
    matrix = part_matrix(part["cframe"])
    offset = len(ray_verts)
    ray_verts.extend(matrix @ (P @ Vector(v)) for v in verts)
    for face in faces:
        ray_faces.append(tuple(offset + i for i in face))
        face_part.append(part)
bvh = BVHTree.FromPolygons(ray_verts, ray_faces)

# Art is made visual only when a map loads, so it isn't playable space.
solid = [
    p
    for p in data["parts"]
    if p["canQuery"] and p["canCollide"] and "Art" not in p["ancestors"] and not REMOVED_AT_LOAD & set(p["tags"])
]
solid_points = []
for part in solid:
    verts, _ = local_geometry(part)
    matrix = part_matrix(part["cframe"])
    solid_points.extend(matrix @ (P @ Vector(v)) for v in verts)
p_lo = Vector((min(p.x for p in solid_points), min(p.y for p in solid_points), min(p.z for p in solid_points)))
p_hi = Vector((max(p.x for p in solid_points), max(p.y for p in solid_points), max(p.z for p in solid_points)))
kill_height = data["attributes"].get("KillHeight", -50)
playable_top = data["attributes"].get("PlayableTop", math.inf)


def floors_in_column(x, y):
    floors, start = [], Vector((x, y, p_hi.z + 5))
    for _ in range(12):
        hit, normal, index, distance = bvh.ray_cast(start, Vector((0, 0, -1)), start.z - (p_lo.z - 5))
        if hit is None:
            break
        part = face_part[index]
        standable = (
            normal.z > 0.7
            and hit.z > kill_height
            and hit.z <= playable_top
            and "Hazard" not in part["tags"]
            and bvh.ray_cast(hit + Vector((0, 0, 0.1)), Vector((0, 0, 1)), HEADROOM)[0] is None
        )
        if standable:
            floors.append(hit)
        start = hit - Vector((0, 0, 0.5))
    return floors


def can_see(a, b):
    direction = b - a
    return bvh.ray_cast(a, direction.normalized(), direction.length - 0.05)[0] is None


rng = random.Random(7)
spots = []
for _ in range(SAMPLE_COUNT * 20):
    if len(spots) >= SAMPLE_COUNT:
        break
    floors = floors_in_column(rng.uniform(p_lo.x, p_hi.x), rng.uniform(p_lo.y, p_hi.y))
    if floors:
        spots.append(rng.choice(floors) + Vector((0, 0, EYE_HEIGHT)))

visible = sum(1 for i in range(len(spots)) for j in range(i + 1, len(spots)) if can_see(spots[i], spots[j]))
pairs = len(spots) * (len(spots) - 1) // 2
spawn_eyes = [position + Vector((0, 0, 1.5)) for position, _, _ in spawns]
exposed = [any(can_see(spot, eye) for eye in spawn_eyes) for spot in spots]
metrics = {
    "spots": len(spots),
    "openness": round(visible / pairs, 3) if pairs else 0,
    "spawnExposure": round(sum(exposed) / len(spots), 3) if spots else 0,
    "targets": {"openness": [0.35, 0.5], "spawnExposure": 0.2},
}
with open(os.path.join(out_dir, "metrics.json"), "w") as f:
    json.dump(metrics, f, indent=2)
print(f"Openness {metrics['openness']:.0%} (target 35 to 50%), spawn exposure {metrics['spawnExposure']:.0%} (target <20%)")

# Exposure dots for the exposure plan: red spots can see a spawn, green can't.
exposure_dots = []
for spot, seen in zip(spots, exposed):
    s = 2.2
    base = spot - Vector((0, 0, EYE_HEIGHT - 0.8))
    verts = [tuple(base + Vector(o)) for o in ((-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0))]
    dot = add_object("ExposureDot", verts, [(0, 1, 2, 3)], Matrix.Identity(4), (1, 0.15, 0.1) if seen else (0.2, 1, 0.3))
    dot.matrix_world = Matrix.Identity(4)
    dot.data.vertices.foreach_set("co", [c for v in verts for c in v])
    dot.hide_render = True
    exposure_dots.append(dot)

# Workbench: fast, flat-shaded and readable, which is what a layout review needs.
scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light = "STUDIO"
shading.color_type = "OBJECT"
shading.show_shadows = True
shading.shadow_intensity = 0.4
shading.show_cavity = True
shading.cavity_type = "WORLD"
shading.show_object_outline = True
shading.object_outline_color = (0.05, 0.05, 0.05)
scene.display.light_direction = (0.4, -0.3, 0.85)
world = bpy.data.worlds.new("World")
world.color = (0.08, 0.09, 0.11)
scene.world = world
scene.view_settings.view_transform = "Standard"
scene.view_settings.exposure = 0.7


def render(name, camera, width, height):
    scene.camera = camera
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = os.path.join(out_dir, name)
    bpy.ops.render.render(write_still=True)


def make_camera(name, location, target=None, ortho_scale=None, fov_degrees=None, rotation=None):
    cam_data = bpy.data.cameras.new(name)
    cam_data.clip_end = 5000
    if ortho_scale:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = ortho_scale
    if fov_degrees:
        cam_data.sensor_fit = "VERTICAL"
        cam_data.angle_y = math.radians(fov_degrees)
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = location
    if target is not None:
        cam.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
    if rotation is not None:
        cam.rotation_euler = rotation
    scene.collection.objects.link(cam)
    return cam


# Plan: straight down, north (Roblox -Z) up.
plan = make_camera("Plan", Vector((center.x, center.y, hi.z + 200)), ortho_scale=extent * 1.08, rotation=(0, 0, 0))
render("plan.png", plan, resolution, resolution)

# Heights: recolor geometry by the height of each part's top surface; scenery fades out.
for obj in scenery:
    obj.hide_render = True
originals = {obj.name: tuple(obj.color) for obj in geometry}
span = max(1e-3, hi.z - lo.z)
for obj in geometry:
    t = max(0.0, min(1.0, (obj["top"] - lo.z) / span))
    # Blue (low) through green to red (high).
    color = (min(1, 2 * t), min(1, 2 - 2 * t) if t > 0.5 else 2 * t, max(0, 1 - 2 * t))
    obj.color = (*color, 1)
shading.show_shadows = False
render("heights.png", plan, resolution, resolution)
for obj in geometry:
    obj.color = originals[obj.name]
for obj in scenery:
    obj.hide_render = False
shading.show_shadows = True

# Section cuts, like an architect's floor plan: everything above the cut height is hidden and
# anything crossing it is flattened to it, so walls show as solid outlines. One cut 8 studs
# above each distinct floor level.
floor_tops = sorted({round(obj["top"]) for obj in geometry if obj.dimensions.x * obj.dimensions.y > 400})
levels = []
for top in floor_tops:
    if not levels or top - levels[-1] >= 10:
        levels.append(top)
def render_cut(cut, name):
    hidden, flattened = [], {}
    for obj in geometry + scenery + markers:
        heights = [v.co.z for v in obj.data.vertices]
        if min(heights) > cut:
            obj.hide_render = True
            hidden.append(obj)
        elif max(heights) > cut:
            # Cut walls are drawn near-black, as architects shade them, so they stand out from
            # the floors.
            flattened[obj] = ([v.co.copy() for v in obj.data.vertices], tuple(obj.color))
            for v in obj.data.vertices:
                v.co.z = min(v.co.z, cut)
            obj.color = (0.05, 0.05, 0.06, 1)
    cut_cam = make_camera(f"Cut{cut}", Vector((center.x, center.y, cut + 100)), ortho_scale=extent * 1.08, rotation=(0, 0, 0))
    render(name, cut_cam, resolution, resolution)
    for obj in hidden:
        obj.hide_render = False
    for obj, (coords, color) in flattened.items():
        for v, co in zip(obj.data.vertices, coords):
            v.co = co
        obj.color = color


for level in levels[:5]:
    render_cut(level + 8, f"cut_{level + 8}.png")

# Exposure plan: a cut through the main floor (the height most standing spots are at), with
# the sampled spots drawn on top, including those on upper floors.
spot_floors = [round(spot.z - EYE_HEIGHT) for spot in spots] or [0]
main_floor = max(set(spot_floors), key=spot_floors.count)
for dot in exposure_dots:
    dot.hide_render = False
render_cut(round(main_floor) + 8, "exposure.png")
for dot in exposure_dots:
    dot.hide_render = True

# Overview: from a corner, above.
eye = center + Vector((extent * 0.55, -extent * 0.75, extent * 0.55))
render("overview.png", make_camera("Overview", eye, target=center, fov_degrees=40), resolution, int(resolution * 0.66))

# Spawn views at eye height, at the game's vertical field of view (80 degrees), one per spawn
# up to six, picked across teams.
for marker in markers:
    if marker.name.startswith("Spawn"):
        marker.hide_render = True
# Alternate teams so both sides get looked at.
by_team = {}
for spawn in spawns:
    by_team.setdefault(spawn[2], []).append(spawn)
chosen = []
while len(chosen) < 6 and any(by_team.values()):
    for team_spawns in by_team.values():
        if team_spawns and len(chosen) < 6:
            chosen.append(team_spawns.pop(0))
for i, (position, look, team) in enumerate(chosen):
    eye = position + Vector((0, 0, 2.0))
    flat = Vector((look.x, look.y, 0)).normalized()
    cam = make_camera(f"Spawn{i}", eye, target=eye + flat * 10, fov_degrees=80)
    render(f"spawn_{i + 1}_{team or 'any'}.png", cam, int(resolution * 0.8), int(resolution * 0.45))

print(f"Rendered {data['id']} to {out_dir}")
