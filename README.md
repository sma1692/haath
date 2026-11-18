# @treefour/haath

Zero-dependency WebXR 25-joint hand kinematics, combat strike, swipe, and 3D gesture recognition engine by [Tree Four Studio](https://treefour.studio). Battle-tested at 90 Hz in **DunJun** on Meta Quest.

```bash
npm i @treefour/haath
```

- **Documentation & Live Browser Demo:** [haath.treefour.studio](https://haath.treefour.studio)
- **LLM-Ready Docs Index:** [haath.treefour.studio/llms.txt](https://haath.treefour.studio/llms.txt) · [Full single-file docs](https://haath.treefour.studio/llms-full.txt)
- **Runnable Examples:** [`examples/`](./examples) (run `npm run examples`)

---

**Contents:** [Entry points](#entry-points) · [Quick start](#quick-start) · [Reading hand state](#reading-hand-state) · [Recipes](#recipes) · [Configuration](#configuration) · [Feeding your own poses](#feeding-your-own-poses) · [v2 compositional engine](#v2-compositional-engine) · [Debug overlay](#debug-overlay) · [PC hand emulator](#pc-hand-emulator-experimental) · [Performance rules](#performance-rules) · [Why haath](#why-haath)

---

## Entry points

- `@treefour/haath`: the `Haath` engine (single-hand signs incl. `peace` & `gun`, velocity-gated `punch` / `slap` strikes, two-finger `swipe` brush recognizer, 3D `circle` solver, two-hand `clap` / `triangle` / `blast`), `HoldRecognizer`, `TwoFingerSwipeRecognizer`, colliders, vector math, constants, and types.
- `@treefour/haath/v2`: compositional engine (static pose packs incl. ASL alphabet, motion states, trajectory shapes, micro-gestures, bimanual compounds).
- `@treefour/haath/debug`: DOM overlay that shows live signs, kinematics, and spells.
- `@treefour/haath/emulator`: PC hand emulator & programmatic bot driver for IWER (desktop play, automated sims, and debugging).

Everything ships as ESM and CJS with TypeScript types. There are zero runtime dependencies: haath reads the standard WebXR `XRFrame` / `XRHand` API, so it works with Three.js, IWSDK, Babylon.js, React Three Fiber, PlayCanvas, or a raw WebXR loop.

---

## Quick start

Create one `Haath` per app and call `update()` once per XR frame, before your game logic reads gestures.

```ts
import { Haath } from '@treefour/haath';

const haath = new Haath();

// Three.js: renderer.setAnimationLoop((time, frame) => { ... })
let last = performance.now();
renderer.setAnimationLoop((_time, frame) => {
  const now = performance.now();
  const dt = (now - last) / 1000; // seconds
  last = now;

  const session = renderer.xr.getSession();
  const refSpace = renderer.xr.getReferenceSpace();
  const state = haath.update(frame, refSpace, session?.inputSources, dt, now);

  if (state.right.tracked && state.right.gesture === 'punch') {
    console.log('right punch at', state.right.motionSpeed.toFixed(2), 'm/s');
  }
  if (state.twoHand.clap.doubleClap) openPauseMenu();

  renderer.render(scene, camera);
});
```

Your session must request hand tracking:

```ts
navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['hand-tracking'] });
```

### IWSDK (ECS system)

This mirrors how DunJun runs haath. Keep one instance on a system and let other systems read `haath.state`.

```ts
import { createSystem } from '@iwsdk/core';
import { Haath } from '@treefour/haath';

export class HandSystem extends createSystem({}) {
  haath = new Haath({ punchSpeed: 1.3, slapSpeed: 1.8 });

  update(delta: number) {
    const xr = this.world.renderer.xr;
    if (!xr.isPresenting) return;
    const frame = xr.getFrame();
    const session = xr.getSession();
    if (!frame || !session) return;
    // delta is seconds (IWSDK clock), which is what haath expects
    this.haath.update(frame, xr.getReferenceSpace(), session.inputSources, delta);
  }
}

// elsewhere: this.world.getSystem(HandSystem).haath.state.left.gesture
```

Do not create a second `Haath` for another system: velocity, circle history, and clap timing live inside the instance.

---

## Reading hand state

`haath.update()` returns `haath.state` (the same object every frame, mutated in place). All positions are in the reference space you pass in, in metres. Forward is `-Z`.

### Per hand: `state.left` / `state.right`

- `tracked`: false when the hand is missing or fails the anatomical sanity check. Other fields keep their last values.
- `sign`: static hand shape, one of `open`, `fist`, `thehro` (open palm up), `niche` (open palm down), `gun`, `peace`, `poke`, `pinch`, `thumb`, `thumbsup`, `thumbsdown`, `telephone` (shaka), `rock-horns`, `birdie-1`, `birdie-2`, `pinkie-out`, `unknown`, `idle`.
- `gesture`: `sign`, promoted to `punch` (fist faster than `punchSpeed`) or `slap` (open hand faster than `slapSpeed`). Use this for combat.
- `fingers`: `{ thumb, index, middle, ring, pinky, count }` extension booleans plus a 0..5 count.
- `motionSpeed`: scalar speed in m/s (ring-finger-tip, captures arm swing and wrist whip).
- `velocity`: `[vx, vy, vz]` in m/s.
- `wristPosition`, `palmPosition`, `palmCenter`, `indexTipPosition`: `Float32Array` positions.
- `palmQuaternion`: `[x, y, z, w]` at the index proximal joint.
- `palmForward`: unit vector out of the fingers.
- `aimOrigin`, `aimDirection`: a stable aim ray from the XR target ray, stabilized during pinch and curl so it does not dip to the floor. Use it for guns and pointers.
- `circle`: `{ triggered, centroid, normal, meanRadius, revolutions }`. `triggered` is true on the frame a circle completes.
- `swipe`: `{ posed, fired, direction, distance, velocity, deltaUp, deltaRight }`. Two-finger brush/swipe state (`direction`: `'up' | 'down' | 'left' | 'right' | 'none'`).

Sign table (thumb, index, middle, ring, pinky; `*` = any):

- `fist` (*, 0, 0, 0, 0)
- `open` / `thehro` / `niche` (*, 1, 1, 1, 1), split by palm direction
- `gun` (1, 1, 0, 0, 0) or (1, 1, 1, 0, 0) — thumb extended with index (or index + middle)
- `peace` (0, 1, 1, 0, 0) — index + middle extended, thumb tucked
- `poke` (0, 1, 0, 0, 0)
- `rock-horns` (1, 1, 0, 0, 1)
- `telephone` (1, 0, 0, 0, 1)
- `pinkie-out` (0, 0, 0, 0, 1)
- `birdie-1` (0, 0, 1, 0, 0), `birdie-2` (1, 0, 1, 0, 0)
- `pinch`: index curled and thumb tip within `pinchDist` of index tip
- `thumbsup` / `thumbsdown` / `thumb`: only the thumb out, split by thumb direction

### Two hands: `state.twoHand`

- `fingerCount`: 0..10 extended fingers across tracked hands (finger-count menus).
- `handsCrossed`, `wristDistance`.
- `clap`: `{ state, singleClap, doubleClap }`. `singleClap` / `doubleClap` are true for one frame.
- `triangle`: `{ active, centroid, normal }` index tips together and thumbs together; `normal` always points away from the player (`z <= 0`).
- `blast`: `{ active, triggered, charge, origin, direction }` two palms pushed forward together, charge 0..1.

---

## Recipes

### Punch / slap with momentum

```ts
const hand = haath.state.right;
if (hand.gesture === 'punch' || hand.gesture === 'slap') {
  const mass = 1.5; // kg, tune per game
  const impulse = [hand.velocity[0] * mass, hand.velocity[1] * mass, hand.velocity[2] * mass];
  applyHit(enemy, impulse);
}
```

### Hit enemies with the whole hand (palm, wrist, fingertip, swept)

`testHandSphere()` checks a target sphere against the palm, wrist, and index-tip spheres, plus a swept palm segment so fast hands cannot tunnel through targets. Pre-allocate the options object.

```ts
import { CollisionCooldownTracker, type HandSphereTestOptions } from '@treefour/haath';

const cooldown = new CollisionCooldownTracker(200); // ms per (target, hand, gesture)
const opts: HandSphereTestOptions = {
  mode: 'combat',                         // needs a non-idle gesture
  requiredGesture: ['punch', 'slap', 'poke'],
  cooldown,
};

for (const enemy of enemies) {
  opts.targetId = enemy.id;
  opts.prevTargetX = enemy.prev.x; opts.prevTargetY = enemy.prev.y; opts.prevTargetZ = enemy.prev.z;
  const part = haath.testHandSphere('right', enemy.pos.x, enemy.pos.y, enemy.pos.z, enemy.radius, opts);
  if (part !== 'none') damage(enemy, part); // 'palm' | 'wrist' | 'indexTip' | 'sweep'
}
```

Use `mode: 'touch'` (any tracked pose) for buttons and pickups.

### Hold a sign to confirm (menus)

```ts
import { HoldRecognizer } from '@treefour/haath';

const confirm = new HoldRecognizer<string>({ holdDurationMs: 1000, stabilityFrames: 10, cooldownMs: 800 });

// per frame (dt in seconds or ms, both accepted)
const hold = confirm.update(haath.state.right.sign === 'thumbsup' ? 'thumbsup' : null, dt);
progressRing.value = hold.progress;      // 0..1 for a loading ring
if (hold.triggered) startGame();
```

It also works with numbers, for example `confirm.update(haath.state.twoHand.fingerCount, dt)` for finger-count selection.

### Gun / pointer

```ts
const r = haath.state.right;
if (r.sign === 'gun') fireBullet(r.aimOrigin, r.aimDirection);
```

### Circle spell and triangle laser

```ts
import { intersectLaserSphere, intersectDiscSphere } from '@treefour/haath';

const c = haath.state.right.circle;
if (c.triggered) {
  spawnDisc(c.centroid, c.normal, c.meanRadius);
  haath.resetCircle('right'); // clear history so it cannot re-fire
}

const tri = haath.state.twoHand.triangle;
if (tri.active) {
  for (const e of enemies) {
    // origin, direction, length (m), beam width (m), target, target radius
    if (intersectLaserSphere(tri.centroid, tri.normal, 12, 0.25, e.posArray, e.radius)) burn(e);
  }
}

// Spinning disc vs enemy: position, normal, disc radius, tube thickness, target, radius
intersectDiscSphere(disc.pos, disc.normal, 0.3, 0.05, e.posArray, e.radius);
```

### Two-palm blast

```ts
const b = haath.state.twoHand.blast;
chargeBar.value = b.charge;
if (b.triggered) fireBlast(b.origin, b.direction);
```

### Two-finger swipe & continuous scroll

Hold index + middle fingers together (thumb tucked) to enter the brush pose (`swipe.posed`). Flicking triggers a directional swipe (`up`, `down`, `left`, `right`), while `deltaUp` and `deltaRight` give smooth per-frame scroll deltas in metres:

```ts
const s = haath.state.right.swipe;
if (s.posed) {
  scrollPanelBy(s.deltaRight, s.deltaUp);
}
if (s.fired) {
  onPageSwipe(s.direction, s.velocity); // 'up' | 'down' | 'left' | 'right'
}
```

---

## Configuration

Every threshold is optional. Defaults are the values DunJun ships with.

```ts
const haath = new Haath({
  punchSpeed: 1.3,       // m/s, fist promoted to 'punch'
  slapSpeed: 1.8,        // m/s, open hand promoted to 'slap'
  pinchDist: 0.03,       // m, thumb tip to index tip
  curlDot: 0.6,          // bone-segment dot product above which a finger counts as extended
  useCurlDetection: true,// false = legacy wrist-to-tip distance mode
  thumbOpenDist: 0.07,   // legacy mode only
  fingerOpenDist: 0.10,  // legacy mode only
  directionThreshold: 0.72, // thumbs up/down, palm up/down split
  minBoneLength: 0.03,   // m, rejects collapsed / garbage tracking frames
  // two-hand
  triangleTipDist: 0.12, triangleThumbDist: 0.14, triangleFingerDot: 0.35,
  clapContactDist: 0.17, clapSeparationDist: 0.195, clapOriginMinDist: 0.05,
  clapDoubleMinMs: 90, clapDoubleMaxMs: 1100,
  // circle
  circleHistoryFrames: 90, circleMinSamples: 30, circleMinRadius: 0.06,
  circleMaxIrregularity: 0.55, circleMinRevolutions: 1.2, discFireCooldownMs: 800,
  // blast
  blastPalmDist: 0.30, blastForwardDot: -0.4, blastChargeDurationMs: 600,
  blastThrustSpeed: 1.0, blastCooldownMs: 800,
});
```

All defaults are also exported as constants (`PUNCH_SPEED`, `PINCH_DIST`, `CLAP_CONTACT_DIST`, and so on), together with `XR_HAND_JOINTS` and `JOINT_INDEX` for the 25-joint layout.

---

## Feeding your own poses

`updateFromPoses()` runs the same pipeline without an `XRFrame`. Use it for recorded playback, non-WebXR trackers, server-side validation, and tests.

```ts
import { Haath, XR_HAND_JOINTS, JOINT_COUNT, FLOATS_PER_JOINT } from '@treefour/haath';

const haath = new Haath();

// Option A: flat Float32Array, 25 joints x 7 floats (x, y, z, qx, qy, qz, qw) in XR_HAND_JOINTS order.
// Positions-only buffers (25 x 3) are accepted too.
const left = new Float32Array(JOINT_COUNT * FLOATS_PER_JOINT);

// Option B: joint name map with { position, orientation? } or plain { x, y, z }
const right = { wrist: { x: 0.2, y: 1.2, z: -0.3 }, 'index-finger-tip': { x: 0.25, y: 1.3, z: -0.45 } /* ... */ };

const state = haath.updateFromPoses(left, right, 1 / 90);
```

Pass `null` for a hand that is not present. The stateless helpers (`classifyHandSign`, `evaluateFingerExtensions`, `promoteStrikeGesture`, `evaluateTriangleFromPoses`, `evaluateBlastFromPoses`) are exported for custom pipelines.

---

## v2 compositional engine

`@treefour/haath/v2` layers richer recognition on the same 25-joint buffers: named static poses with confidence (core pack and an ASL alphabet pack), motion states, 3D trajectory shapes, micro-gestures, and two-hand compound gestures.

```ts
import { Haath } from '@treefour/haath';
import { CompositionalGestureEngine, CoreStaticPosePack, ASLStaticPosePack } from '@treefour/haath/v2';

const haath = new Haath();
// Register a pose pack: the classifier starts empty.
const v2 = new CompositionalGestureEngine({ pose: { poses: [...CoreStaticPosePack, ...ASLStaticPosePack] } });

// per frame, after haath.update(...): reuse haath's joint buffers
const L = haath.leftRecognizer, R = haath.rightRecognizer;
const res = v2.update(
  haath.state.left.tracked ? L.getHistoryBuffer() : null, L.getFrameOffset(0),
  haath.state.right.tracked ? R.getHistoryBuffer() : null, R.getFrameOffset(0),
  dt,
);

res.right.pose?.name;              // 'peace', 'asl_v', ... with res.right.pose.confidence
res.right.motion.state;            // 'STATIONARY' | 'MICRO_MOVING' | 'TRANSLATING' | 'BALLISTIC'
res.right.trajectory.gesture;      // 'circle_cw', 'line_swipe', 'infinity', 'star', ... or null
res.right.micro.active;            // 'money_rub', 'thumb_index_tap', 'finger_snap', ...
res.bimanual.kamehameha.triggered; // also: bow, portal, timeout (T sign), dial
```

Custom poses use finger requirements and an optional `match()` scorer:

```ts
v2.pose.right.registerPose({
  name: 'spidey',
  category: 'custom',
  fingers: { thumb: 'extended', index: 'extended', middle: 'curled', ring: 'curled', pinky: 'extended' },
  priority: 1.1,
});
```

v2 is newer than the core engine and has not shipped in a production game yet.

---

## Debug overlay

```ts
import { initGesturePreview } from '@treefour/haath/debug';

const preview = initGesturePreview({ position: 'top-right', showKinematics: true, showSigns: true, showSpells: true });
// per frame
preview.update(haath.state);
// later
preview.setVisible(false);
preview.destroy();
```

---

## Why haath

Most WebXR hand libraries stop at static pose detection. haath solves four layers that nothing else on the market touches.

### 1. Algorithmic Complexity

**haath: O(1) pose math + O(N) analytic bounding primitives**

Per-hand classification is strictly O(1): a fixed pass over 25 joints, 8 vector dot products for curl, 1 anatomical ratio for the thumb, and a deterministic boolean lookup table.

Collision is O(N) in active enemies (N = 5-20):
- Hand vs. enemy: 1 sphere-to-sphere distance check per enemy (`Math.hypot` against `index-finger-phalanx-proximal`). At 20 enemies and 2 hands, that is 40 distance checks per frame (~0.005 ms).
- Triangle laser and circle disc: closed-form axial/lateral vector projection (`dot + lengthSq`), zero raycasting or mesh triangles.

**Market alternatives (three-mesh-bvh, THREE.Raycaster): O(J * N * log T)**

Testing J hand joints against N enemies by traversing a BVH tree of T mesh triangles (T = 1,500-5,000 per GLTF model). Even with O(log T) pruning, transforming rays into local mesh space, traversing bounding boxes, and running Moller-Trumbore triangle intersections costs 50x-200x more CPU per frame on a Quest mobile Snapdragon chip - with zero extra gameplay accuracy for arcade combat.

---

### 2. Zero-Frame Input Latency

**Market physics engines (Havok WebAssembly Worker):**

Run asynchronously in a Web Worker. Main thread sends hand transforms at frame `t`, worker steps physics, worker copies back transforms via `SharedArrayBuffer` / `postMessage` at frame `t+1` or `t+2`. IWSDK's `PhysicsRuntime.writeResults()` only copies back position, quaternion, and linear/angular velocity - it drops collision contact events across the worker boundary. Kinematic bodies do not trigger collisions against each other.

**haath:**

Runs synchronously on the main thread in the exact same `XRFrame` before rendering:

1. Sample `frame.getPose()` and compute velocity from ring-finger-tip displacement.
2. Snap the palm sphere to `index-finger-phalanx-proximal`.
3. Resolve hits and record momentum (`mass * velocity`) in the same 11ms frame (90Hz).

Result: zero-frame input lag and exact strike velocity at the millisecond of impact.

---

### 3. Orientation, Scale, and Reference-Frame Invariance

**Market libraries (handy-work, handy.js, fingerpose):**

Compare live joint positions against recorded 3D template snapshots (saved X, Y, Z wrist-relative coordinates). If a player has smaller or larger hands, tilts their wrist sideways, or punches at an angle, Euclidean template distance drifts and causes false negatives. They also require shipping binary pose files and async Web Workers.

**haath uses pure intrinsic geometry:**

- **Intra-finger collinearity** (`_fingerExtendedCurl`): checks if consecutive bone vectors (`metacarpal -> proximal -> intermediate -> tip`) point in the same direction (`dot > 0.6`). 100% invariant to hand rotation, camera angle, and arm reach.
- **Self-normalizing thumb ratio** (`isThumbReallyOut`): measures `dist(thumbTip, middleInter) > dist(pinkyInter, indexInter)`. The player's own palm width acts as the ruler - works for any hand size.
- **Mutual-exclusion guard** (pinch vs. gun/poke): requires `!indexOpen` for pinch, so an extended pointing or gun finger can never accidentally misfire as a pinch when the thumb is tucked.

---

### 4. Dynamic Kinematics and 3D Trajectory Math

Static pose libraries detect "is this a fist or a peace sign?" haath solves four layers on top of that:

- **Ballistic velocity gate** (punch/slap): samples `ring-finger-tip` (which captures both arm translation and wrist whip torque) to promote a static `fist` into a `punch` (> 1.3 m/s) and `open` into a `slap` (> 1.8 m/s).
- **Bimanual 3D vector extraction** (triangle laser): extracts the live 3D centroid and definite 3-point plane normal (`v1_across x v2_down` across both index tips and left thumb tip, sign-locked to -Z) so the player can physically aim a beam by tilting their hands together without noise collapse.
- **Occlusion-proof double-clap hysteresis**: fast claps cause Quest cameras to lose tracking on an occluded palm and misclassify it as a `fist`. haath uses a dual-distance Schmitt trigger (<= 0.17m contact, >= 0.195m separation) and only rejects when both hands are fists - rock-solid even under Quest camera occlusion.
- **Plane-agnostic 3D circle solver** (Newell's Method): instead of projecting onto a 2D screen plane (which fails if the user draws a circle horizontally or at an angle), a 90-frame rolling buffer fits a 3D plane normal via Newell's Method, checks radial standard deviation (`sigma_r / r_bar <= 0.55`), and integrates unwrapped polar angle (`>= 1.2 * 2pi`) in any 3D plane.

---

## PC hand emulator (experimental)

`@treefour/haath/emulator` lets you play and debug hand-tracked WebXR apps on a desktop through [IWER](https://github.com/meta-quest/immersive-web-emulation-runtime) emulated hands (IWSDK enables IWER in dev via `@iwsdk/vite-plugin-iwer`). It adds a floating panel per hand (combat stances, signs, all static poses, move pad), keyboard control, and finger poses IWER does not ship (fist, horns, thumbs up, two-finger gun, and more).

Real recognition still runs: the emulator poses IWER's joints, so `haath.update()` classifies them like real hands. Hooks let your app react to emulator intent directly, which is useful when your game logic needs a gesture faster than velocity promotion would give it.

```ts
import { createHandEmulator } from '@treefour/haath/emulator';

if (import.meta.env.DEV) {
  const emu = createHandEmulator({
    getSession: () => renderer.xr.getSession(),
    debug: false,
    hooks: {
      onPose: (target, pose, gesture, fingerCount) => { /* target: 'left' | 'right' | 'both' */ },
      onStrike: (hand, kind, velocity) => { /* animated strike started (triggerStrike / keyMap.strike) */ },
      onStrikeEnd: (hand, gesture) => { /* hand returned to its held pose */ },
      onClap: () => { /* Double Clap button */ },
      onCircleStart: (hand) => {},
      onCircle: (hand, gesture) => { /* circle trace finished */ },
      onResetToOpen: () => {},
    },
  });
  // emu.setPose('thumbs_up', 'right'); emu.triggerClap(); emu.resetToOpenPalm(); emu.destroy();
}
```

The panels show only while the session has hand input sources. A full app adapter (DunJun) maps `onPose` to its gesture component, `onClap` to its pause overlay, and `onCircle` to its spell system.

### Keys

Keys are `KeyboardEvent.code` values. Override any map with `keyMap: { move, hold, strike }`.

- Left hand: `W A S D` move, hold `1` punch, `2` slap, `3` poke, `4` gun, `Q` thumbs up, `E` thumbs down, `R` horns, `T` shaka
- Right hand: arrows move, hold `U` punch, `I` slap, `O` poke, `P` gun, `J` thumbs up, `K` thumbs down, `L` horns, `;` shaka
- Hold a key to keep a pose; releasing restores the previous pose. Clicking a chip in the panel sticks the pose until clicked again
- Punch, slap, and poke are static stances: the hand holds a fist / open palm / pointed finger and reports the strike gesture, so you steer it into targets with the move keys. Animated lunges are available via `triggerStrike()` or the `keyMap.strike` map
- Moving a hand starts at 0.3 m/s and eases up to 1.5 m/s while the key is held (`moveSpeed: { min, max, rampSeconds }`, travel clamp `moveLimit`, default 0.8 m)
- Shift+WASD and Shift+arrows are left to IWER DevUI (headset movement)

### Options

- `getSession()` (required): returns the active `XRSession` or null. Used for visibility and input source events.
- `hooks`: callbacks listed above, all optional.
- `gestureMap`: override the gesture string reported per pose (defaults follow haath sign names, see `DEFAULT_EMULATOR_GESTURE_MAP`).
- `keyMap`: partial `{ move, hold, strike }` maps (see `DEFAULT_EMULATOR_KEYMAP`).
- `moveSpeed`, `moveLimit`: movement tuning.
- `debug`: log `[HaathEmu]` lines to the console.

Hands move by driving the IWER DevUI transform handle, so the gizmo, target ray, and IWER Pos readout move with the hand. Finger poses are synthesized from IWER's built-in `default` and `point` poses, including a two-finger gun (`double_gun`, index + middle out) that `classifyHandSign` reads as `gun`.

**Experimental:** the emulator duck-types IWER internals that are not public API (private symbol fields, DevUI `inputLayer.transformHandles`). It never imports IWER and guards every access, so an IWER change degrades to a no-op rather than a crash. Load it only in development builds.

---

## Performance rules

haath is built for 72-120 Hz loops on Quest-class mobile chips:

- `update()` and `updateFromPoses()` allocate nothing per frame. `haath.state` and all its arrays are reused: copy values out if you need to keep them past the frame.
- Reuse option objects passed to per-frame calls (`HandSphereTestOptions`) instead of creating literals in the loop.
- Call `update()` exactly once per XR frame with a real `deltaSeconds`; velocity, clap timing, and circle history depend on it.
- One-frame flags (`clap.singleClap`, `clap.doubleClap`, `circle.triggered`, `blast.triggered`, `hold.triggered`) are true for a single frame: read them in the same frame.

---

## Roadmap

- Generated API reference (TypeDoc) on the docs site
- More examples: Babylon.js and React Three Fiber
- Full gesture catalogue with recorded pose fixtures
- v2: built-in core pose pack by default, zero-allocation `classify()`

---

## License

MIT - Tree Four Studio (S.M:A)
