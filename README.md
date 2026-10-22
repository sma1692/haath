# @treefour/haath

Zero-dependency WebXR hand kinematics, combat strike, and 3D gesture recognition engine by Tree Four Studio. Battle-tested in DunJun.

```bash
npm i @treefour/haath
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
- **Bimanual 3D vector extraction** (triangle laser): extracts the live 3D centroid and cross-product plane normal (`u_up x w_across`, sign-locked to -Z) so the player can physically aim a beam by tilting their hands together.
- **Occlusion-proof double-clap hysteresis**: fast claps cause Quest cameras to lose tracking on an occluded palm and misclassify it as a `fist`. haath uses a dual-distance Schmitt trigger (<= 0.17m contact, >= 0.195m separation) and only rejects when both hands are fists - rock-solid even under Quest camera occlusion.
- **Plane-agnostic 3D circle solver** (Newell's Method): instead of projecting onto a 2D screen plane (which fails if the user draws a circle horizontally or at an angle), a 90-frame rolling buffer fits a 3D plane normal via Newell's Method, checks radial standard deviation (`sigma_r / r_bar <= 0.55`), and integrates unwrapped polar angle (`>= 1.2 * 2pi`) in any 3D plane.

---

## TODO

- API reference
- Integration examples (Three.js, Babylon.js, React Three Fiber, IWSDK)
- Full gesture catalogue

---

## License

MIT - Tree Four Studio (S.M:A)
