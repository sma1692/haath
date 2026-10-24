import { describe, expect, it } from 'vitest';
import {
  add,
  BLAST_CHARGE_DURATION_MS,
  BLAST_CONFIG,
  BLAST_COOLDOWN_MS,
  BLAST_FORWARD_DOT,
  BLAST_PALM_DIST,
  BLAST_THRUST_SPEED,
  CIRCLE_HISTORY_FRAMES,
  CIRCLE_MAX_IRREGULARITY,
  CIRCLE_MIN_RADIUS,
  CIRCLE_MIN_REVOLUTIONS,
  CIRCLE_MIN_SAMPLES,
  CircleTrajectoryRecognizer,
  CLAP_CONTACT_DIST,
  CLAP_DOUBLE_MAX_MS,
  CLAP_DOUBLE_MIN_MS,
  CLAP_ORIGIN_MIN_DIST,
  CLAP_SEPARATION_DIST,
  classifyHandSign,
  COLLISION_DURATION,
  CollisionCooldownTracker,
  createSingleHandState,
  createTwoHandState,
  cross,
  CURL_DOT,
  cylinderSphere,
  DIRECTION_THRESHOLD,
  DISC_FIRE_COOLDOWN_MS,
  discSphere,
  dist,
  distSq,
  dot,
  evaluateFingerExtensions,
  evaluateTriangleFromPoses,
  evaluateBlastFromPoses,
  FINGEROPEN,
  FLOATS_PER_JOINT,
  Haath,
  HOLD_COOLDOWN_MS,
  HOLD_COUNT_STABILITY_FRAMES,
  HOLD_DEFAULT_DURATION_MS,
  HOLD_SIGN_STABILITY_FRAMES,
  HoldRecognizer,
  hypot,
  intersectDiscSphere,
  intersectLaserSphere,
  intersectSphereSphere,
  isFingerExtendedCurl,
  isThumbReallyOut,
  JOINT_COUNT,
  JOINT_INDEX,
  normalize,
  PALM_COLLIDER_RADIUS,
  PHALANGES,
  PINCH_DIST,
  POS_HISTORY_COUNT,
  promoteStrikeGesture,
  PUNCH_SPEED,
  scale,
  SingleHandRecognizer,
  SLAP_SPEED,
  SPELL_CONFIG,
  sphereSphere,
  sub,
  THUMBOPEN,
  TRIANGLE_FINGER_DOT,
  TRIANGLE_THUMB_DIST,
  TRIANGLE_TIP_DIST,
  TwoHandRecognizer,
  v3Add,
  v3Copy,
  v3Cross,
  v3Dist,
  v3DistSq,
  v3Dot,
  v3Len,
  v3LenSq,
  v3Normalize,
  v3Scale,
  v3Set,
  v3Sub,
  XR_HAND_JOINTS,
  type HandPoseInput,
  type JointName,
} from '../src/index.js';

interface FingerBuildOpts {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  wrist?: [number, number, number];
  handDir?: [number, number, number]; // Direction of extended fingers (default [0, 0, -1])
  thumbDir?: [number, number, number]; // Direction of extended thumb (default [1, 0, 0])
  pinch?: boolean;
  scale?: number;
}

/**
 * Helper that builds a realistic 25-joint pose buffer (175 floats) with controllable
 * finger extension states, wrist position, hand orientation, and scale.
 */
function buildHandPoseBuffer(opts: FingerBuildOpts = {}): Float32Array {
  const buf = new Float32Array(JOINT_COUNT * FLOATS_PER_JOINT);
  const [wx, wy, wz] = opts.wrist ?? [-0.2, 1.2, -0.4];
  const scale = opts.scale ?? 1.0;

  // Normalize forward direction (default pointing forward -Z)
  let [fx, fy, fz] = opts.handDir ?? [0, 0, -1];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  // Orthogonal lateral axis for knuckle spread
  let rx = 1, ry = 0, rz = 0;
  if (Math.abs(fx) > 0.9) {
    rx = 0; ry = 1; rz = 0;
  }
  // Right = cross(f, r)
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;

  // Curl direction (perpendicular to finger forward and lateral)
  const cx = fy * uz - fz * uy;
  const cy = fz * ux - fx * uz;
  const cz = fx * uy - fy * ux;

  function setJoint(idx: number, x: number, y: number, z: number, qx = 0, qy = 0, qz = 0, qw = 1) {
    const base = idx * FLOATS_PER_JOINT;
    buf[base] = x;
    buf[base + 1] = y;
    buf[base + 2] = z;
    buf[base + 3] = qx;
    buf[base + 4] = qy;
    buf[base + 5] = qz;
    buf[base + 6] = qw;
  }

  setJoint(JOINT_INDEX.WRIST, wx, wy, wz);

  const fingers = [
    {
      open: opts.index ?? false,
      spread: -0.03 * scale,
      joints: [
        JOINT_INDEX.INDEX_METACARPAL,
        JOINT_INDEX.INDEX_PROXIMAL,
        JOINT_INDEX.INDEX_INTERMEDIATE,
        JOINT_INDEX.INDEX_DISTAL,
        JOINT_INDEX.INDEX_TIP,
      ],
    },
    {
      open: opts.middle ?? false,
      spread: -0.01 * scale,
      joints: [
        JOINT_INDEX.MIDDLE_METACARPAL,
        JOINT_INDEX.MIDDLE_PROXIMAL,
        JOINT_INDEX.MIDDLE_INTERMEDIATE,
        JOINT_INDEX.MIDDLE_DISTAL,
        JOINT_INDEX.MIDDLE_TIP,
      ],
    },
    {
      open: opts.ring ?? false,
      spread: 0.01 * scale,
      joints: [
        JOINT_INDEX.RING_METACARPAL,
        JOINT_INDEX.RING_PROXIMAL,
        JOINT_INDEX.RING_INTERMEDIATE,
        JOINT_INDEX.RING_DISTAL,
        JOINT_INDEX.RING_TIP,
      ],
    },
    {
      open: opts.pinky ?? false,
      spread: 0.03 * scale,
      joints: [
        JOINT_INDEX.PINKY_METACARPAL,
        JOINT_INDEX.PINKY_PROXIMAL,
        JOINT_INDEX.PINKY_INTERMEDIATE,
        JOINT_INDEX.PINKY_DISTAL,
        JOINT_INDEX.PINKY_TIP,
      ],
    },
  ];

  for (const f of fingers) {
    const [mIdx, pIdx, iIdx, dIdx, tIdx] = f.joints;
    const mx = wx + ux * f.spread + fx * 0.03 * scale;
    const my = wy + uy * f.spread + fy * 0.03 * scale;
    const mz = wz + uz * f.spread + fz * 0.03 * scale;

    const px = mx + fx * 0.04 * scale;
    const py = my + fy * 0.04 * scale;
    const pz = mz + fz * 0.04 * scale;

    setJoint(mIdx, mx, my, mz);
    setJoint(pIdx, px, py, pz);

    if (f.open) {
      // Collinear straight segments along f
      setJoint(iIdx, px + fx * 0.03 * scale, py + fy * 0.03 * scale, pz + fz * 0.03 * scale);
      setJoint(dIdx, px + fx * 0.05 * scale, py + fy * 0.05 * scale, pz + fz * 0.05 * scale);
      setJoint(tIdx, px + fx * 0.07 * scale, py + fy * 0.07 * scale, pz + fz * 0.07 * scale);
    } else {
      // Curled: intermediate bends 90 deg along c, tip bends back -f (dot product <= 0)
      const ix = px + cx * 0.025 * scale;
      const iy = py + cy * 0.025 * scale;
      const iz = pz + cz * 0.025 * scale;
      setJoint(iIdx, ix, iy, iz);
      setJoint(dIdx, ix - fx * 0.015 * scale, iy - fy * 0.015 * scale, iz - fz * 0.015 * scale);
      setJoint(tIdx, ix - fx * 0.025 * scale, iy - fy * 0.025 * scale, iz - fz * 0.025 * scale);
    }
  }

  // Thumb placement
  const tMetaX = wx + ux * (-0.035 * scale) + fx * 0.02 * scale;
  const tMetaY = wy + uy * (-0.035 * scale) + fy * 0.02 * scale;
  const tMetaZ = wz + uz * (-0.035 * scale) + fz * 0.02 * scale;
  setJoint(JOINT_INDEX.THUMB_METACARPAL, tMetaX, tMetaY, tMetaZ);

  if (opts.pinch) {
    // Place thumb tip within 1cm of index tip
    const idxTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const itx = buf[idxTipOff];
    const ity = buf[idxTipOff + 1];
    const itz = buf[idxTipOff + 2];
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, (tMetaX + itx) * 0.5, (tMetaY + ity) * 0.5, (tMetaZ + itz) * 0.5);
    setJoint(JOINT_INDEX.THUMB_DISTAL, itx - 0.01, ity, itz);
    setJoint(JOINT_INDEX.THUMB_TIP, itx - 0.005, ity, itz);
  } else if (opts.thumb) {
    // Extended outward far from middle-inter (> palm width ~0.06m * scale)
    let [tx, ty, tz] = opts.thumbDir ?? [-ux, -uy, -uz];
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX + tx * 0.03 * scale, tMetaY + ty * 0.03 * scale, tMetaZ + tz * 0.03 * scale);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX + tx * 0.06 * scale, tMetaY + ty * 0.06 * scale, tMetaZ + tz * 0.06 * scale);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX + tx * 0.095 * scale, tMetaY + ty * 0.095 * scale, tMetaZ + tz * 0.095 * scale);
  } else {
    // Tucked close to middle-finger-phalanx-intermediate (< palm width)
    const midInterOff = JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
    const mix = buf[midInterOff];
    const miy = buf[midInterOff + 1];
    const miz = buf[midInterOff + 2];
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, (tMetaX + mix) * 0.5, (tMetaY + miy) * 0.5, (tMetaZ + miz) * 0.5);
    setJoint(
      JOINT_INDEX.THUMB_DISTAL,
      mix - cx * 0.015 * scale - fx * 0.015 * scale,
      miy - cy * 0.015 * scale - fy * 0.015 * scale,
      miz - cz * 0.015 * scale - fz * 0.015 * scale,
    );
    setJoint(
      JOINT_INDEX.THUMB_TIP,
      mix - cx * 0.025 * scale - fx * 0.015 * scale,
      miy - cy * 0.025 * scale - fy * 0.015 * scale,
      miz - cz * 0.025 * scale - fz * 0.015 * scale,
    );
  }

  return buf;
}

describe('Phase 2: haath Gesture & Kinematics Engine', () => {
  describe('1. Per-Finger Curl & Scale-Invariant Thumb Detection', () => {
    it('detects orientation-invariant finger curl regardless of hand rotation', () => {
      const haath = new Haath();

      // Forward (-Z), Up (+Y), Down (-Y), Diagonal ([1, 1, 1])
      const directions: [number, number, number][] = [
        [0, 0, -1],
        [0, 1, 0],
        [0, -1, 0],
        [1, 1, 1],
      ];

      for (const handDir of directions) {
        const pose = buildHandPoseBuffer({
          thumb: false,
          index: true,
          middle: false,
          ring: true,
          pinky: false,
          handDir,
        });
        const state = haath.updateFromPoses(pose, null, 0.016, 100);
        expect(state.left.tracked).toBe(true);
        expect(state.left.fingers).toEqual({
          thumb: false,
          index: true,
          middle: false,
          ring: true,
          pinky: false,
          count: 2,
        });
      }
    });

    it('detects anatomical thumb extension across small and large hand scales', () => {
      const haath = new Haath();

      for (const scale of [0.6, 1.0, 1.5]) {
        const thumbOutPose = buildHandPoseBuffer({ thumb: true, scale });
        const s1 = haath.updateFromPoses(thumbOutPose, null, 0.016, 100);
        expect(s1.left.fingers.thumb).toBe(true);

        const thumbInPose = buildHandPoseBuffer({ thumb: false, scale });
        const s2 = haath.updateFromPoses(thumbInPose, null, 0.016, 116);
        expect(s2.left.fingers.thumb).toBe(false);
      }
    });

    it('supports legacy Euclidean wrist-to-tip mode when useCurlDetection is false', () => {
      const haath = new Haath({ useCurlDetection: false });
      const openPose = buildHandPoseBuffer({
        thumb: true,
        index: true,
        middle: true,
        ring: true,
        pinky: true,
      });
      const state = haath.updateFromPoses(openPose, null, 0.016, 100);
      expect(state.left.fingers.count).toBe(5);
    });
  });

  describe('2. Static Hand Sign Classification Matrix (13 Signs + Directions)', () => {
    const haath = new Haath();

    it('classifies telephone, rock-horns, birdie-1, birdie-2, pinkie-out, fist', () => {
      expect(
        haath.updateFromPoses(buildHandPoseBuffer({ thumb: true, pinky: true }), null, 0.016, 10).left.sign,
      ).toBe('telephone');

      expect(
        haath.updateFromPoses(buildHandPoseBuffer({ thumb: true, index: true, pinky: true }), null, 0.016, 20).left.sign,
      ).toBe('rock-horns');

      expect(
        haath.updateFromPoses(buildHandPoseBuffer({ middle: true }), null, 0.016, 30).left.sign,
      ).toBe('birdie-1');

      expect(
        haath.updateFromPoses(buildHandPoseBuffer({ thumb: true, middle: true }), null, 0.016, 40).left.sign,
      ).toBe('birdie-2');

      expect(
        haath.updateFromPoses(buildHandPoseBuffer({ pinky: true }), null, 0.016, 50).left.sign,
      ).toBe('pinkie-out');

      expect(
        haath.updateFromPoses(buildHandPoseBuffer({}), null, 0.016, 60).left.sign,
      ).toBe('fist');
    });

    it('classifies open, thehro (upward), and niche (downward) based on wrist->middle-tip Y direction', () => {
      const openForward = buildHandPoseBuffer({
        index: true,
        middle: true,
        ring: true,
        pinky: true,
        handDir: [0, 0, -1],
      });
      expect(haath.updateFromPoses(openForward, null, 0.016, 100).left.sign).toBe('open');

      const thehroUp = buildHandPoseBuffer({
        index: true,
        middle: true,
        ring: true,
        pinky: true,
        handDir: [0, 1, 0],
      });
      expect(haath.updateFromPoses(thehroUp, null, 0.016, 116).left.sign).toBe('thehro');

      const nicheDown = buildHandPoseBuffer({
        index: true,
        middle: true,
        ring: true,
        pinky: true,
        handDir: [0, -1, 0],
      });
      expect(haath.updateFromPoses(nicheDown, null, 0.016, 132).left.sign).toBe('niche');
    });

    it('classifies gun (single & double barrel), poke, and pinch (with !indexOpen guard)', () => {
      const gunDouble = buildHandPoseBuffer({ index: true, middle: true });
      expect(haath.updateFromPoses(gunDouble, null, 0.016, 200).left.sign).toBe('gun');

      const gunSingle = buildHandPoseBuffer({ thumb: true, index: true });
      expect(haath.updateFromPoses(gunSingle, null, 0.016, 216).left.sign).toBe('gun');

      const poke = buildHandPoseBuffer({ thumb: false, index: true });
      expect(haath.updateFromPoses(poke, null, 0.016, 232).left.sign).toBe('poke');

      const pinch = buildHandPoseBuffer({ index: false, pinch: true });
      expect(haath.updateFromPoses(pinch, null, 0.016, 248).left.sign).toBe('pinch');
    });

    it('classifies thumb, thumbsup, and thumbsdown based on thumb-meta -> thumb-tip Y direction', () => {
      const thumbSide = buildHandPoseBuffer({
        thumb: true,
        thumbDir: [1, 0, 0],
      });
      expect(haath.updateFromPoses(thumbSide, null, 0.016, 300).left.sign).toBe('thumb');

      const thumbsUp = buildHandPoseBuffer({
        thumb: true,
        thumbDir: [0, 1, 0],
      });
      expect(haath.updateFromPoses(thumbsUp, null, 0.016, 316).left.sign).toBe('thumbsup');

      const thumbsDown = buildHandPoseBuffer({
        thumb: true,
        thumbDir: [0, -1, 0],
      });
      expect(haath.updateFromPoses(thumbsDown, null, 0.016, 332).left.sign).toBe('thumbsdown');
    });
  });

  describe('3. Ballistic Strike Velocity Gate & Aiming Vectors', () => {
    it('promotes fist -> punch (> 1.3 m/s) and open/thehro -> slap (> 1.8 m/s)', () => {
      const haath = new Haath();

      // Frame 1: stationary fist at z = -0.3
      const fist1 = buildHandPoseBuffer({ wrist: [-0.2, 1.2, -0.3] });
      let state = haath.updateFromPoses(fist1, null, 0.016, 100);
      expect(state.left.sign).toBe('fist');
      expect(state.left.gesture).toBe('fist');
      expect(state.left.motionSpeed).toBe(0);

      // Frame 2: fist moves 0.04m forward in 0.02s => 2.0 m/s (> 1.3 m/s PUNCH_SPEED)
      const fist2 = buildHandPoseBuffer({ wrist: [-0.2, 1.2, -0.34] });
      state = haath.updateFromPoses(fist2, null, 0.02, 120);
      expect(state.left.sign).toBe('fist');
      expect(state.left.motionSpeed).toBeCloseTo(2.0, 3);
      expect(state.left.velocity[2]).toBeCloseTo(-0.04, 4);
      expect(state.left.gesture).toBe('punch');

      // Frame 3: open hand moves 0.05m in 0.02s => 2.5 m/s (> 1.8 m/s SLAP_SPEED)
      const open1 = buildHandPoseBuffer({
        index: true,
        middle: true,
        ring: true,
        pinky: true,
        wrist: [0.2, 1.2, -0.3],
      });
      haath.updateFromPoses(null, open1, 0.02, 140);

      const open2 = buildHandPoseBuffer({
        index: true,
        middle: true,
        ring: true,
        pinky: true,
        wrist: [0.25, 1.2, -0.3],
      });
      state = haath.updateFromPoses(null, open2, 0.02, 160);
      expect(state.right.sign).toBe('open');
      expect(state.right.motionSpeed).toBeCloseTo(2.5, 3);
      expect(state.right.gesture).toBe('slap');
    });

    it('computes normalized aimDirection, aimOrigin, palmForward, and palmPosition', () => {
      const haath = new Haath();
      const pose = buildHandPoseBuffer({
        index: true,
        middle: true,
        handDir: [0, 0, -1],
      });
      const state = haath.updateFromPoses(pose, null, 0.016, 100);
      expect(state.left.aimDirection[0]).toBeCloseTo(0, 4);
      expect(state.left.aimDirection[1]).toBeCloseTo(0, 4);
      expect(state.left.aimDirection[2]).toBeCloseTo(-1, 4);
      expect(state.left.palmForward[2]).toBeCloseTo(-1, 4);
    });
  });

  describe('4. Bimanual Triangle / Diamond Solver', () => {
    it('detects converged triangle, computes centroid, and enforces forward normal (nz <= 0)', () => {
      const haath = new Haath();
      const leftPose = buildHandPoseBuffer({ wrist: [-0.15, 1.2, -0.4] });
      const rightPose = buildHandPoseBuffer({ wrist: [0.15, 1.2, -0.4] });

      function setJoint(buf: Float32Array, idx: number, x: number, y: number, z: number) {
        const b = idx * FLOATS_PER_JOINT;
        buf[b] = x;
        buf[b + 1] = y;
        buf[b + 2] = z;
      }

      // Left index points up-right (+X, +Y), right index points up-left (-X, +Y)
      // dot([0.707, 0.707, 0], [-0.707, 0.707, 0]) = 0.0 <= 0.35
      setJoint(leftPose, JOINT_INDEX.INDEX_INTERMEDIATE, -0.06, 1.24, -0.4);
      setJoint(leftPose, JOINT_INDEX.INDEX_TIP, -0.02, 1.28, -0.4);
      setJoint(leftPose, JOINT_INDEX.THUMB_TIP, -0.03, 1.18, -0.4);

      setJoint(rightPose, JOINT_INDEX.INDEX_INTERMEDIATE, 0.06, 1.24, -0.4);
      setJoint(rightPose, JOINT_INDEX.INDEX_TIP, 0.02, 1.28, -0.4);
      setJoint(rightPose, JOINT_INDEX.THUMB_TIP, 0.03, 1.18, -0.4);

      const state = haath.updateFromPoses(leftPose, rightPose, 0.016, 100);
      expect(state.twoHand.triangle.active).toBe(true);
      expect(state.twoHand.triangle.centroid[0]).toBeCloseTo(0, 4);
      expect(state.twoHand.triangle.centroid[1]).toBeCloseTo(1.23, 4);
      expect(state.twoHand.triangle.centroid[2]).toBeCloseTo(-0.4, 4);
      expect(state.twoHand.triangle.normal[2]).toBeCloseTo(-1, 4);
      expect(state.twoHand.triangle.normal[2]).toBeLessThanOrEqual(0);

      // Parallel index fingers (dot = 1.0 > 0.35) should be rejected by convergence gate
      setJoint(leftPose, JOINT_INDEX.INDEX_INTERMEDIATE, -0.02, 1.24, -0.4);
      setJoint(rightPose, JOINT_INDEX.INDEX_INTERMEDIATE, 0.02, 1.24, -0.4);
      const rejected = haath.updateFromPoses(leftPose, rightPose, 0.016, 116);
      expect(rejected.twoHand.triangle.active).toBe(false);
    });
  });

  describe('5. Double-Clap Hysteresis & Hands-Crossed', () => {
    it('enforces origin guard, dual-fist guard, contact/separation hysteresis, and [90ms, 1100ms] double-clap window', () => {
      const haath = new Haath();

      // 1. Dual-fist guard: wrists within 0.10m but both hands are fists -> no clap
      const leftFist = buildHandPoseBuffer({ wrist: [-0.05, 1.2, -0.4] });
      const rightFist = buildHandPoseBuffer({ wrist: [0.05, 1.2, -0.4] });
      let s = haath.updateFromPoses(leftFist, rightFist, 0.016, 100);
      expect(s.twoHand.clap.singleClap).toBe(false);
      expect(s.twoHand.clap.state).toBe('separated');

      // 2. First clap with open hands (dist = 0.10m <= 0.17m) at t = 200ms
      const leftOpenNear = buildHandPoseBuffer({
        index: true, middle: true, ring: true, pinky: true,
        wrist: [-0.05, 1.2, -0.4],
      });
      const rightOpenNear = buildHandPoseBuffer({
        index: true, middle: true, ring: true, pinky: true,
        wrist: [0.05, 1.2, -0.4],
      });
      s = haath.updateFromPoses(leftOpenNear, rightOpenNear, 0.016, 200);
      expect(s.twoHand.clap.state).toBe('contact');
      expect(s.twoHand.clap.singleClap).toBe(true);
      expect(s.twoHand.clap.doubleClap).toBe(false);

      // 3. Partial separation (dist = 0.18m < 0.195m) stays in 'contact' due to hysteresis
      const leftMid = buildHandPoseBuffer({
        index: true, middle: true, ring: true, pinky: true,
        wrist: [-0.09, 1.2, -0.4],
      });
      const rightMid = buildHandPoseBuffer({
        index: true, middle: true, ring: true, pinky: true,
        wrist: [0.09, 1.2, -0.4],
      });
      s = haath.updateFromPoses(leftMid, rightMid, 0.016, 300);
      expect(s.twoHand.clap.state).toBe('contact');
      expect(s.twoHand.clap.singleClap).toBe(false);

      // 4. Full separation (dist = 0.24m >= 0.195m) transitions to 'separated'
      const leftFar = buildHandPoseBuffer({
        index: true, middle: true, ring: true, pinky: true,
        wrist: [-0.12, 1.2, -0.4],
      });
      const rightFar = buildHandPoseBuffer({
        index: true, middle: true, ring: true, pinky: true,
        wrist: [0.12, 1.2, -0.4],
      });
      s = haath.updateFromPoses(leftFar, rightFar, 0.016, 400);
      expect(s.twoHand.clap.state).toBe('separated');

      // 5. Second contact at t = 550ms (elapsed = 350ms within [90ms, 1100ms]) -> doubleClap!
      s = haath.updateFromPoses(leftOpenNear, rightOpenNear, 0.016, 550);
      expect(s.twoHand.clap.state).toBe('contact');
      expect(s.twoHand.clap.singleClap).toBe(true);
      expect(s.twoHand.clap.doubleClap).toBe(true);
    });

    it('detects handsCrossed when leftWrist.x > rightWrist.x', () => {
      const haath = new Haath();
      const leftCrossed = buildHandPoseBuffer({ wrist: [0.15, 1.2, -0.4] });
      const rightCrossed = buildHandPoseBuffer({ wrist: [-0.15, 1.2, -0.4] });
      const s = haath.updateFromPoses(leftCrossed, rightCrossed, 0.016, 100);
      expect(s.twoHand.handsCrossed).toBe(true);
    });
  });

  describe("6. Newell's Method 3D Circle Trajectory Solver", () => {
    it('detects 3D circular trajectory after 1.2 revolutions and enforces 800ms cooldown', () => {
      const recognizer = new CircleTrajectoryRecognizer();
      const out = {
        triggered: false,
        centroid: new Float32Array(3),
        normal: new Float32Array(3),
        meanRadius: 0,
        revolutions: 0,
      };

      const cx = 0.2, cy = 1.3, cz = -0.5;
      const radius = 0.15;
      // Sweep 1.3 revolutions across 50 frames
      const totalFrames = 50;
      const totalAngle = 1.3 * 2 * Math.PI;

      let triggeredFrame = -1;
      for (let i = 0; i < totalFrames; i++) {
        const theta = (i / (totalFrames - 1)) * totalAngle;
        const x = cx + radius * Math.cos(theta);
        const y = cy + radius * Math.sin(theta);
        const z = cz;
        recognizer.update(x, y, z, 1000 + i * 16, out, 'right');
        if (out.triggered) {
          triggeredFrame = i;
          break;
        }
      }

      expect(triggeredFrame).toBeGreaterThanOrEqual(29);
      expect(out.triggered).toBe(true);
      expect(out.meanRadius).toBeCloseTo(radius, 2);
      expect(out.centroid[0]).toBeCloseTo(cx, 1);
      expect(out.centroid[1]).toBeCloseTo(cy, 1);
      expect(out.centroid[2]).toBeCloseTo(cz, 2);
      expect(Math.abs(out.normal[2])).toBeCloseTo(1, 2);
      expect(out.revolutions).toBeGreaterThanOrEqual(1.2);

      // Immediate second circle within 800ms cooldown should not trigger
      for (let i = 0; i < totalFrames; i++) {
        const theta = (i / (totalFrames - 1)) * totalAngle;
        const x = cx + radius * Math.cos(theta);
        const y = cy + radius * Math.sin(theta);
        recognizer.update(x, y, cz, 1900 + i * 5, out, 'right');
        expect(out.triggered).toBe(false);
      }
    });

    it('rejects linear oscillation via radial coefficient-of-variation gate', () => {
      const recognizer = new CircleTrajectoryRecognizer();
      const out = {
        triggered: false,
        centroid: new Float32Array(3),
        normal: new Float32Array(3),
        meanRadius: 0,
        revolutions: 0,
      };

      for (let i = 0; i < 60; i++) {
        const x = Math.sin(i * 0.3) * 0.25;
        recognizer.update(x, 1.2, -0.4, 1000 + i * 16, out, 'left');
        expect(out.triggered).toBe(false);
      }
    });
  });

  describe('7. Dwell / Hold Stability Recognizer', () => {
    it('requires candidate frame stability before accumulating progress and enforces cooldown', () => {
      const hold = new HoldRecognizer<string>({
        stabilityFrames: HOLD_SIGN_STABILITY_FRAMES, // 10 frames
        holdDurationMs: 500,
        cooldownMs: 800,
      });

      let now = 1000;
      // First 9 frames: stabilizing (progress = 0, active = false)
      for (let i = 0; i < 9; i++) {
        const s = hold.update('thehro', 50, now);
        expect(s.active).toBe(false);
        expect(s.progress).toBe(0);
        expect(s.triggered).toBe(false);
        now += 50;
      }

      // 10th frame locks candidate and starts accumulating dwell time
      let s = hold.update('thehro', 100, now);
      expect(s.active).toBe(true);
      expect(s.candidate).toBe('thehro');
      expect(s.progress).toBeCloseTo(0.2, 3);

      // Accumulate remaining 400ms to reach 500ms
      now += 400;
      s = hold.update('thehro', 400, now);
      expect(s.triggered).toBe(true);
      expect(s.progress).toBe(1);

      // During 800ms cooldown, updates stay inactive
      now += 200;
      s = hold.update('thehro', 100, now);
      expect(s.active).toBe(false);
      expect(s.triggered).toBe(false);
      expect(HOLD_COUNT_STABILITY_FRAMES).toBe(6);
    });
  });

  describe('8. Analytical Collision & Cooldown Primitives', () => {
    it('evaluates intersectSphereSphere, intersectLaserSphere, and intersectDiscSphere accurately', () => {
      expect(intersectSphereSphere(0, 0, 0, 0.1, 0.15, 0, 0, 0.1)).toBe(true);
      expect(intersectSphereSphere(0, 0, 0, 0.1, 0.25, 0, 0, 0.1)).toBe(false);

      // Laser along -Z from origin, length 10m, width 0.2m (radius 0.1m)
      const origin = new Float32Array([0, 0, 0]);
      const normal = new Float32Array([0, 0, -1]);
      expect(intersectLaserSphere(origin, normal, 10, 0.2, [0.15, 0, -5], 0.1)).toBe(true);
      expect(intersectLaserSphere(origin, normal, 10, 0.2, [0.25, 0, -5], 0.1)).toBe(false);
      // Behind laser origin (a < 0) or beyond length (a > 10)
      expect(intersectLaserSphere(origin, normal, 10, 0.2, [0, 0, 1], 0.1)).toBe(false);
      expect(intersectLaserSphere(origin, normal, 10, 0.2, [0, 0, -11], 0.1)).toBe(false);

      // Disc at [0, 1, -2] with normal [0, 1, 0], radius 0.3m, tube 0.05m
      const discPos = new Float32Array([0, 1, -2]);
      const discNorm = new Float32Array([0, 1, 0]);
      expect(intersectDiscSphere(discPos, discNorm, 0.3, 0.05, [0.2, 1.08, -2], 0.1)).toBe(true);
      // Too far axially
      expect(intersectDiscSphere(discPos, discNorm, 0.3, 0.05, [0.2, 1.2, -2], 0.1)).toBe(false);
      // Too far radially
      expect(intersectDiscSphere(discPos, discNorm, 0.3, 0.05, [0.45, 1.0, -2], 0.1)).toBe(false);
    });

    it('debounces repeated hits within 200ms via CollisionCooldownTracker', () => {
      const tracker = new CollisionCooldownTracker(200);
      expect(tracker.tryTrigger('enemy-1', 'left', 'punch', 1000)).toBe(true);
      expect(tracker.isActiveCollision('enemy-1', 'left', 'punch', 1100)).toBe(true);
      expect(tracker.tryTrigger('enemy-1', 'left', 'punch', 1150)).toBe(false);
      // Different hand or gesture is not blocked
      expect(tracker.tryTrigger('enemy-1', 'right', 'punch', 1150)).toBe(true);
      // After 200ms, same key triggers again
      expect(tracker.isTimeOutCollision('enemy-1', 'left', 'punch', 1205)).toBe(true);
      expect(tracker.tryTrigger('enemy-1', 'left', 'punch', 1205)).toBe(true);
    });
  });

  describe('9. End-to-End WebXR XRFrame Ingestion', () => {
    it('ingests mock WebXR XRFrame + XRHand inputSources with zero errors', () => {
      const haath = new Haath();
      const leftBuf = buildHandPoseBuffer({
        thumb: true,
        index: true,
        pinky: true,
        wrist: [-0.2, 1.2, -0.4],
      });

      const jointSpaces = new Map<string, object>();
      const poseBySpace = new Map<object, XRJointPose>();

      for (let i = 0; i < XR_HAND_JOINTS.length; i++) {
        const name = XR_HAND_JOINTS[i];
        const space = { name };
        jointSpaces.set(name, space);
        const base = i * FLOATS_PER_JOINT;
        poseBySpace.set(space, {
          transform: {
            position: { x: leftBuf[base], y: leftBuf[base + 1], z: leftBuf[base + 2], w: 1 } as DOMPointReadOnly,
            orientation: {
              x: leftBuf[base + 3],
              y: leftBuf[base + 4],
              z: leftBuf[base + 5],
              w: leftBuf[base + 6],
            } as DOMPointReadOnly,
            matrix: new Float32Array(16),
            inverse: {} as XRRigidTransform,
          },
          radius: 0.01,
          emulatedPosition: false,
        } as unknown as XRJointPose);
      }

      const mockFrame = {
        getJointPose: (space: XRJointSpace) => poseBySpace.get(space) ?? null,
      } as unknown as XRFrame;

      const mockInputSources = [
        {
          handedness: 'left',
          hand: {
            get: (jointName: XRHandJoint) => jointSpaces.get(jointName),
          },
        },
      ] as unknown as XRInputSource[];

      const state = haath.update(mockFrame, {} as XRReferenceSpace, mockInputSources, 0.016, 500);
      expect(state.left.tracked).toBe(true);
      expect(state.left.sign).toBe('rock-horns');
      expect(state.right.tracked).toBe(false);
      expect(state.twoHand.fingerCount).toBe(3);
    });

    it('handles dual-hand XRFrame, non-hand controllers, missing getJointPose, missing jointSpace, and null pose', () => {
      const haath = new Haath();
      const leftBuf = buildHandPoseBuffer({ index: true, wrist: [-0.2, 1.2, -0.4] });
      const rightBuf = buildHandPoseBuffer({ thumb: true, pinky: true, wrist: [0.2, 1.2, -0.4] });

      const buildHandMap = (buf: Float32Array) => {
        const spaces = new Map<string, object>();
        const poses = new Map<object, XRJointPose>();
        for (let i = 0; i < XR_HAND_JOINTS.length; i++) {
          const name = XR_HAND_JOINTS[i];
          const space = { name };
          spaces.set(name, space);
          const base = i * FLOATS_PER_JOINT;
          poses.set(space, {
            transform: {
              position: { x: buf[base], y: buf[base + 1], z: buf[base + 2], w: 1 } as DOMPointReadOnly,
              orientation: {
                x: buf[base + 3],
                y: buf[base + 4],
                z: buf[base + 5],
                w: buf[base + 6],
              } as DOMPointReadOnly,
              matrix: new Float32Array(16),
              inverse: {} as XRRigidTransform,
            },
            radius: 0.01,
            emulatedPosition: false,
          } as unknown as XRJointPose);
        }
        return { spaces, poses };
      };

      const leftMap = buildHandMap(leftBuf);
      const rightMap = buildHandMap(rightBuf);

      const dualFrame = {
        getJointPose: (space: XRJointSpace) =>
          leftMap.poses.get(space) ?? rightMap.poses.get(space) ?? null,
      } as unknown as XRFrame;

      const dualSources = [
        null,
        { handedness: 'none', hand: null },
        { handedness: 'none', hand: { get: () => undefined } },
        {
          handedness: 'left',
          hand: { get: (j: XRHandJoint) => leftMap.spaces.get(j) },
        },
        {
          handedness: 'right',
          hand: { get: (j: XRHandJoint) => rightMap.spaces.get(j) },
        },
      ] as unknown as XRInputSource[];

      // Omit nowMs to cover default performance.now() parameter
      const s1 = haath.update(dualFrame, {} as XRReferenceSpace, dualSources, 0.016);
      expect(s1.left.tracked).toBe(true);
      expect(s1.left.sign).toBe('poke');
      expect(s1.right.tracked).toBe(true);
      expect(s1.right.sign).toBe('telephone');
      expect(s1.twoHand.fingerCount).toBe(3);

      // Frame missing getJointPose method
      const frameNoMethod = {} as unknown as XRFrame;
      const s2 = haath.update(frameNoMethod, {} as XRReferenceSpace, dualSources, 0.016, 600);
      expect(s2.left.tracked).toBe(false);
      expect(s2.right.tracked).toBe(false);

      // Hand missing a jointSpace (hand.get returns undefined)
      const incompleteSources = [
        {
          handedness: 'left',
          hand: {
            get: (j: XRHandJoint) => (j === 'index-finger-tip' ? undefined : leftMap.spaces.get(j)),
          },
        },
      ] as unknown as XRInputSource[];
      const s3 = haath.update(dualFrame, {} as XRReferenceSpace, incompleteSources, 0.016, 616);
      expect(s3.left.tracked).toBe(false);

      // Frame returning null pose for a jointSpace
      const nullPoseFrame = {
        getJointPose: (space: XRJointSpace) =>
          space === leftMap.spaces.get('wrist') ? null : (leftMap.poses.get(space) ?? null),
      } as unknown as XRFrame;
      const s4 = haath.update(nullPoseFrame, {} as XRReferenceSpace, dualSources, 0.016, 632);
      expect(s4.left.tracked).toBe(false);

      // Null frame / referenceSpace / inputSources
      const s5 = haath.update(null, null, null, 0.016, 648);
      expect(s5.left.tracked).toBe(false);
      expect(s5.right.tracked).toBe(false);
    });
  });

  describe('10. 3D Vector Math Primitives (src/math/vec3.ts)', () => {
    it('evaluates all Vec3 object operations including zero-vector normalization', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: -5, z: 6 };
      const out = { x: 0, y: 0, z: 0 };

      expect(dot(a, b)).toBe(1 * 4 + 2 * -5 + 3 * 6); // 12

      cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, out);
      expect(out).toEqual({ x: 0, y: 0, z: 1 });

      sub(a, b, out);
      expect(out).toEqual({ x: -3, y: 7, z: -3 });

      add(a, b, out);
      expect(out).toEqual({ x: 5, y: -3, z: 9 });

      scale(a, 2.5, out);
      expect(out).toEqual({ x: 2.5, y: 5, z: 7.5 });

      expect(hypot({ x: 3, y: 4, z: 0 })).toBe(5);
      expect(distSq({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBe(25);
      expect(dist({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBe(5);

      normalize({ x: 0, y: 3, z: 4 }, out);
      expect(out.x).toBeCloseTo(0, 5);
      expect(out.y).toBeCloseTo(0.6, 5);
      expect(out.z).toBeCloseTo(0.8, 5);

      // Zero-vector normalization guard
      normalize({ x: 0, y: 0, z: 0 }, out);
      expect(out).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('evaluates all Float32Array v3* operations with default and explicit offsets', () => {
      const out = new Float32Array(3);
      const buf = new Float32Array([1, 2, 3, 4, 5, 6]);

      v3Set(out, 7, 8, 9);
      expect(Array.from(out)).toEqual([7, 8, 9]);

      v3Copy(out, buf);
      expect(Array.from(out)).toEqual([1, 2, 3]);
      v3Copy(out, buf, 3);
      expect(Array.from(out)).toEqual([4, 5, 6]);

      v3Sub(out, [5, 7, 9], [1, 2, 3]);
      expect(Array.from(out)).toEqual([4, 5, 6]);
      v3Sub(out, buf, buf, 3, 0);
      expect(Array.from(out)).toEqual([3, 3, 3]);

      v3Add(out, [1, 2, 3], [4, 5, 6]);
      expect(Array.from(out)).toEqual([5, 7, 9]);
      v3Add(out, buf, buf, 0, 3);
      expect(Array.from(out)).toEqual([5, 7, 9]);

      v3Scale(out, [2, -3, 4], 2);
      expect(Array.from(out)).toEqual([4, -6, 8]);
      v3Scale(out, buf, 0.5, 3);
      expect(Array.from(out)).toEqual([2, 2.5, 3]);

      expect(v3Dot([1, 0, 0], [0, 1, 0])).toBe(0);
      expect(v3Dot(buf, buf, 0, 3)).toBe(1 * 4 + 2 * 5 + 3 * 6);

      v3Cross(out, [1, 0, 0], [0, 1, 0]);
      expect(Array.from(out)).toEqual([0, 0, 1]);
      v3Cross(out, [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1], 3, 3);
      expect(Array.from(out)).toEqual([1, 0, 0]);

      expect(v3LenSq([3, 4, 0])).toBe(25);
      expect(v3LenSq([0, 0, 0, 3, 4, 0], 3)).toBe(25);
      expect(v3Len([3, 4, 0])).toBe(5);
      expect(v3Len([0, 0, 0, 3, 4, 0], 3)).toBe(5);

      expect(v3DistSq([1, 2, 3], [4, 6, 3])).toBe(25);
      expect(v3DistSq(buf, buf, 0, 3)).toBe(27);
      expect(v3Dist([1, 2, 3], [4, 6, 3])).toBe(5);
      expect(v3Dist(buf, buf, 0, 3)).toBeCloseTo(Math.sqrt(27), 5);

      v3Normalize(out, [0, 3, 4]);
      expect(out[0]).toBeCloseTo(0, 5);
      expect(out[1]).toBeCloseTo(0.6, 5);
      expect(out[2]).toBeCloseTo(0.8, 5);

      // Zero-length vector normalization guard
      v3Normalize(out, [0, 0, 0, 0, 0, 0], 3);
      expect(Array.from(out)).toEqual([0, 0, 0]);
    });
  });

  describe('11. Collider Wrappers, Object Inputs & Cooldown Reset (src/math/colliders.ts)', () => {
    it('evaluates sphereSphere, cylinderSphere, discSphere, and Vec3 object inputs', () => {
      expect(sphereSphere({ x: 0, y: 0, z: 0 }, 0.1, { x: 0.15, y: 0, z: 0 }, 0.1)).toBe(true);
      expect(sphereSphere({ x: 0, y: 0, z: 0 }, 0.1, { x: 0.25, y: 0, z: 0 }, 0.1)).toBe(false);

      expect(
        cylinderSphere(
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: -1 },
          10,
          0.1,
          { x: 0.15, y: 0, z: -5 },
          0.1,
        ),
      ).toBe(true);
      expect(
        cylinderSphere(
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: -1 },
          10,
          0.1,
          { x: 0.25, y: 0, z: -5 },
          0.1,
        ),
      ).toBe(false);

      expect(
        discSphere(
          { x: 0, y: 1, z: -2 },
          { x: 0, y: 1, z: 0 },
          0.3,
          { x: 0.2, y: 1.05, z: -2 },
          0.1,
        ),
      ).toBe(true);
      expect(
        discSphere(
          { x: 0, y: 1, z: -2 },
          { x: 0, y: 1, z: 0 },
          0.3,
          { x: 0.2, y: 1.15, z: -2 },
          0.1,
        ),
      ).toBe(false);
    });

    it('supports default cooldown, default performance.now() timestamps, unseen keys, and reset()', () => {
      const tracker = new CollisionCooldownTracker();
      expect(tracker.isActiveCollision('unseen', 'left', 'punch')).toBe(false);
      expect(tracker.isTimeOutCollision('unseen', 'left', 'punch')).toBe(true);

      expect(tracker.tryTrigger('boss', 'left', 'slap')).toBe(true);
      expect(tracker.isActiveCollision('boss', 'left', 'slap')).toBe(true);
      expect(tracker.isTimeOutCollision('boss', 'left', 'slap')).toBe(false);

      tracker.reset();
      expect(tracker.isActiveCollision('boss', 'left', 'slap')).toBe(false);
      expect(tracker.tryTrigger('boss', 'left', 'slap')).toBe(true);
    });
  });

  describe('12. Stateless Recognizer Helpers & Ring Buffer Edge Cases', () => {
    it('covers default arguments, unknown sign, thehro->slap promotion, and ring buffer wrap-around', () => {
      const pose = buildHandPoseBuffer({ index: true, ring: true });
      const ext = createSingleHandState().fingers;
      evaluateFingerExtensions(pose, 0, ext);
      expect(ext.index).toBe(true);
      expect(ext.ring).toBe(true);
      expect(ext.count).toBe(2);

      // Index + Ring is not in the 11 sign rules -> 'unknown'
      expect(classifyHandSign(pose, 0, ext)).toBe('unknown');

      // Legacy Euclidean mode with closed hand (0 fingers)
      const closedPose = buildHandPoseBuffer({});
      evaluateFingerExtensions(closedPose, 0, ext, false);
      expect(ext.count).toBe(0);

      // Default parameter calls on isFingerExtendedCurl, isThumbReallyOut, promoteStrikeGesture
      expect(
        isFingerExtendedCurl(
          pose,
          0,
          JOINT_INDEX.INDEX_METACARPAL,
          JOINT_INDEX.INDEX_PROXIMAL,
          JOINT_INDEX.INDEX_INTERMEDIATE,
          JOINT_INDEX.INDEX_TIP,
        ),
      ).toBe(true);
      expect(isThumbReallyOut(pose)).toBe(false);
      expect(isThumbReallyOut(new Float32Array(JOINT_COUNT * FLOATS_PER_JOINT))).toBe(false);

      expect(promoteStrikeGesture('thehro', 2.2)).toBe('slap');
      expect(promoteStrikeGesture('thehro', 1.0)).toBe('thehro');
      expect(promoteStrikeGesture('fist', 1.5)).toBe('punch');
      expect(promoteStrikeGesture('gun', 5.0)).toBe('gun');

      // SingleHandRecognizer edge cases: empty history, wrap-around past 20 frames, deltaSeconds <= 0, reset()
      const single = new SingleHandRecognizer('left');
      expect(single.getFrameOffset()).toBe(-1);
      expect(single.getFrameOffset(1)).toBe(-1);

      const defaultConfig = new Haath()['_config'];
      // Calling evaluateCurrentFrame when no frame slot has been written marks untracked
      expect(single.evaluateCurrentFrame(0.016, 100, defaultConfig).tracked).toBe(false);

      // Push 25 frames to wrap ring buffer past POS_HISTORY_COUNT (20)
      for (let i = 0; i < POS_HISTORY_COUNT + 5; i++) {
        const slot = single.beginFrameSlot();
        single.getHistoryBuffer().set(pose, slot);
        // Test deltaSeconds = 0 on one frame to cover the else velocity branch
        single.evaluateCurrentFrame(i === 2 ? 0 : 0.016, 100 + i * 16, defaultConfig);
      }
      expect(single.getFrameOffset(0)).toBeGreaterThanOrEqual(0);
      expect(single.getFrameOffset(POS_HISTORY_COUNT)).toBe(-1);

      single.reset();
      expect(single.state.tracked).toBe(false);
      expect(single.getFrameOffset(0)).toBe(-1);
    });
  });

  describe('13. Bimanual Triangle, Clap Window & TwoHandRecognizer Edge Cases', () => {
    it('covers thumb-distance gate, naturally negative normal Z, clap timing windows, origin guard, and reset()', () => {
      const leftPose = buildHandPoseBuffer({ wrist: [-0.15, 1.2, -0.4] });
      const rightPose = buildHandPoseBuffer({ wrist: [0.15, 1.2, -0.4] });
      const tri = createTwoHandState().triangle;

      const setJoint = (buf: Float32Array, idx: number, x: number, y: number, z: number) => {
        const b = idx * FLOATS_PER_JOINT;
        buf[b] = x;
        buf[b + 1] = y;
        buf[b + 2] = z;
      };

      // 1. Index tips close (0.04m <= 0.12m), but thumbs far apart (0.30m > 0.14m) -> rejected
      setJoint(leftPose, JOINT_INDEX.INDEX_INTERMEDIATE, -0.06, 1.24, -0.4);
      setJoint(leftPose, JOINT_INDEX.INDEX_TIP, -0.02, 1.28, -0.4);
      setJoint(leftPose, JOINT_INDEX.THUMB_TIP, -0.15, 1.18, -0.4);

      setJoint(rightPose, JOINT_INDEX.INDEX_INTERMEDIATE, 0.06, 1.24, -0.4);
      setJoint(rightPose, JOINT_INDEX.INDEX_TIP, 0.02, 1.28, -0.4);
      setJoint(rightPose, JOINT_INDEX.THUMB_TIP, 0.15, 1.18, -0.4);

      evaluateTriangleFromPoses(leftPose, 0, rightPose, 0, tri);
      expect(tri.active).toBe(false);

      // 2. Converged thumbs with swapped lateral X so u x w naturally has nz <= 0 without negation
      setJoint(leftPose, JOINT_INDEX.THUMB_TIP, 0.03, 1.18, -0.4);
      setJoint(rightPose, JOINT_INDEX.THUMB_TIP, -0.03, 1.18, -0.4);
      setJoint(leftPose, JOINT_INDEX.INDEX_TIP, 0.02, 1.28, -0.4);
      setJoint(rightPose, JOINT_INDEX.INDEX_TIP, -0.02, 1.28, -0.4);
      setJoint(leftPose, JOINT_INDEX.INDEX_INTERMEDIATE, 0.06, 1.24, -0.4);
      setJoint(rightPose, JOINT_INDEX.INDEX_INTERMEDIATE, -0.06, 1.24, -0.4);

      evaluateTriangleFromPoses(leftPose, 0, rightPose, 0, tri);
      expect(tri.active).toBe(true);
      expect(tri.normal[2]).toBeLessThanOrEqual(0);

      // 3. TwoHandRecognizer origin guard, early/late clap windows, null buffer branch, and reset()
      const twoHand = new TwoHandRecognizer();
      const lState = createSingleHandState();
      const rState = createSingleHandState();
      lState.tracked = true;
      rState.tracked = true;
      lState.sign = 'open';
      rState.sign = 'open';

      // Origin guard: wrists at (0, 0, 0) (< 0.05m from origin) -> ignored
      lState.wristPosition.set([0.01, 0, 0]);
      rState.wristPosition.set([0.02, 0, 0]);
      twoHand.update(lState, rState, null, -1, null, -1, 100);
      expect(twoHand.state.clap.singleClap).toBe(false);
      expect(twoHand.state.triangle.active).toBe(false);

      // Valid origin: first clap at t = 100ms
      lState.wristPosition.set([-0.05, 1.2, -0.4]);
      rState.wristPosition.set([0.05, 1.2, -0.4]);
      twoHand.update(lState, rState, null, -1, null, -1, 100);
      expect(twoHand.state.clap.singleClap).toBe(true);
      expect(twoHand.state.clap.doubleClap).toBe(false);

      // Separate at t = 120ms
      lState.wristPosition.set([-0.15, 1.2, -0.4]);
      rState.wristPosition.set([0.15, 1.2, -0.4]);
      twoHand.update(lState, rState, null, -1, null, -1, 120);

      // Second contact too early at t = 150ms (elapsed = 50ms < 90ms) -> singleClap only, not doubleClap
      lState.wristPosition.set([-0.05, 1.2, -0.4]);
      rState.wristPosition.set([0.05, 1.2, -0.4]);
      twoHand.update(lState, rState, null, -1, null, -1, 150);
      expect(twoHand.state.clap.singleClap).toBe(true);
      expect(twoHand.state.clap.doubleClap).toBe(false);

      // Separate and contact too late at t = 2000ms (elapsed = 1850ms > 1100ms) -> singleClap only
      lState.wristPosition.set([-0.15, 1.2, -0.4]);
      rState.wristPosition.set([0.15, 1.2, -0.4]);
      twoHand.update(lState, rState, null, -1, null, -1, 500);
      lState.wristPosition.set([-0.05, 1.2, -0.4]);
      rState.wristPosition.set([0.05, 1.2, -0.4]);
      twoHand.update(lState, rState, null, -1, null, -1, 2000);
      expect(twoHand.state.clap.singleClap).toBe(true);
      expect(twoHand.state.clap.doubleClap).toBe(false);

      twoHand.reset();
      expect(twoHand.state.clap.state).toBe('separated');
      expect(twoHand.state.wristDistance).toBe(Infinity);
    });
  });

  describe('14. CircleTrajectoryRecognizer Degenerate, YZ-Plane & Wrap-Around Cases', () => {
    it('handles small radius, degenerate collinear points (nLen < 1e-8), YZ-plane basis, and ring buffer wrap-around', () => {
      const out = createSingleHandState().circle;

      // 1. Small radius (< 0.06m) rejection & ring buffer wrap-around past historyFrames
      const smallRec = new CircleTrajectoryRecognizer({ historyFrames: 32, minSamples: 30 });
      for (let i = 0; i < 40; i++) {
        const theta = (i / 30) * 2 * Math.PI;
        smallRec.update(0.01 * Math.cos(theta), 0.01 * Math.sin(theta), -0.4, 100 + i * 16, out);
      }
      expect(out.triggered).toBe(false);
      expect(out.revolutions).toBe(0);

      // 2. Degenerate alternating antipodal points: meanRadius = 0.10m, stdDev = 0, Newell nLen = 0 < 1e-8
      const degenRec = new CircleTrajectoryRecognizer();
      for (let i = 0; i < 35; i++) {
        const sign = i % 2 === 0 ? 1 : -1;
        degenRec.update(sign * 0.1, 0, 0, 1000 + i * 16, out);
      }
      expect(out.triggered).toBe(false);
      expect(out.revolutions).toBe(0);

      // 3. YZ-plane circle (normal along X axis: |nx| = 1.0 >= 0.9) swept clockwise to hit both angle wrap branches
      const yzRec = new CircleTrajectoryRecognizer();
      const totalFrames = 50;
      const totalAngle = -1.35 * 2 * Math.PI; // Negative sweep exercises dTheta > Math.PI wrap branch
      let triggered = false;
      for (let i = 0; i < totalFrames; i++) {
        const theta = (i / (totalFrames - 1)) * totalAngle;
        const y = 1.2 + 0.15 * Math.cos(theta);
        const z = -0.4 + 0.15 * Math.sin(theta);
        yzRec.update(0.25, y, z, 2000 + i * 16, out);
        if (out.triggered) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
      expect(Math.abs(out.normal[0])).toBeCloseTo(1, 2);
    });
  });

  describe('15. HoldRecognizer Idle Tokens, Candidate Switching & Seconds Delta', () => {
    it('handles default config, all idle tokens, fractional seconds delta, candidate switching, and reset()', () => {
      const hold = new HoldRecognizer<string | number>();

      // Fractional delta in seconds (0.05s = 50ms) and default nowMs
      for (let i = 0; i < HOLD_SIGN_STABILITY_FRAMES; i++) {
        hold.update('open', 0.05, 1000 + i * 50);
      }
      expect(hold.state.active).toBe(true);
      expect(hold.state.candidate).toBe('open');

      // Switching candidate while locked resets lock and elapsed progress
      hold.update('fist', 0.05, 1600);
      expect(hold.state.active).toBe(false);
      expect(hold.state.candidate).toBe('fist');
      expect(hold.state.progress).toBe(0);

      // All idle tokens reset state
      for (const idleVal of [null, undefined, 'idle', 'unknown', 'none', 0] as const) {
        hold.update('fist', 50, 1700);
        const s = hold.update(idleVal, 50, 1750);
        expect(s.active).toBe(false);
        expect(s.candidate).toBeNull();
        expect(s.progress).toBe(0);
      }

      // holdDurationMs = 0 triggers immediately once stable
      const instantHold = new HoldRecognizer<string>({ stabilityFrames: 1, holdDurationMs: 0 });
      const sInstant = instantHold.update('thehro', 0);
      expect(sInstant.triggered).toBe(true);
      expect(sInstant.progress).toBe(1);

      instantHold.reset();
      expect(instantHold.state.triggered).toBe(false);
      expect(instantHold.state.active).toBe(false);
    });
  });

  describe('16. Haath Pose Input Formats, Reset & Exported Constants', () => {
    it('accepts 75-float position buffers, JointPoseData/Vec3 maps, rejects short buffers, and resets cleanly', () => {
      const haath = new Haath();
      const full175 = buildHandPoseBuffer({ thumb: true, pinky: true });

      // 1. 75-float position-only Float32Array (25 * 3)
      const pos75 = new Float32Array(JOINT_COUNT * 3);
      for (let i = 0; i < JOINT_COUNT; i++) {
        pos75[i * 3] = full175[i * FLOATS_PER_JOINT];
        pos75[i * 3 + 1] = full175[i * FLOATS_PER_JOINT + 1];
        pos75[i * 3 + 2] = full175[i * FLOATS_PER_JOINT + 2];
      }
      // Omit nowMs to exercise default performance.now()
      let state = haath.updateFromPoses(pos75, pos75, 0.016);
      expect(state.left.tracked).toBe(true);
      expect(state.left.sign).toBe('telephone');
      expect(state.right.tracked).toBe(true);
      expect(state.right.sign).toBe('telephone');

      // 2. Undersized Float32Array (< 75 floats) marks hands untracked
      const shortBuf = new Float32Array(10);
      state = haath.updateFromPoses(shortBuf, shortBuf, 0.016, 200);
      expect(state.left.tracked).toBe(false);
      expect(state.right.tracked).toBe(false);

      // 3. Object map with mixed JointPoseData (with & without orientation), plain Vec3, and omitted joint
      const poseMap: Partial<Record<JointName, { position: { x: number; y: number; z: number }; orientation?: { x: number; y: number; z: number; w: number } } | { x: number; y: number; z: number }>> = {};
      for (let i = 0; i < JOINT_COUNT; i++) {
        const name = XR_HAND_JOINTS[i];
        const b = i * FLOATS_PER_JOINT;
        if (i === 0) {
          // JointPoseData with orientation
          poseMap[name] = {
            position: { x: full175[b], y: full175[b + 1], z: full175[b + 2] },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          };
        } else if (i === 1) {
          // JointPoseData without orientation
          poseMap[name] = {
            position: { x: full175[b], y: full175[b + 1], z: full175[b + 2] },
          };
        } else {
          // Plain Vec3
          poseMap[name] = { x: full175[b], y: full175[b + 1], z: full175[b + 2] };
        }
      }
      state = haath.updateFromPoses(poseMap as HandPoseInput, null, 0.016, 300);
      expect(state.left.tracked).toBe(true);
      expect(state.left.sign).toBe('telephone');

      // Object map with missing joint entries defaults missing joints to origin
      const sparseMap: HandPoseInput = { wrist: { x: 0, y: 1, z: -0.5 } };
      state = haath.updateFromPoses(sparseMap, null, 0.016, 316);
      expect(state.left.tracked).toBe(true);

      // Reset clears both hands and twoHand state
      haath.reset();
      expect(haath.state.left.tracked).toBe(false);
      expect(haath.state.right.tracked).toBe(false);
      expect(haath.state.twoHand.fingerCount).toBe(0);

      // Recognizer getters
      expect(haath.leftRecognizer).toBeDefined();
      expect(haath.rightRecognizer).toBeDefined();
      expect(haath.twoHandRecognizer).toBeDefined();

      // resetCircle clears circle recognition state on individual or both hands
      haath.resetCircle('left');
      haath.resetCircle('right');
      haath.resetCircle('both');
      haath.resetCircle();
    });

    it('exports all canonical constants and configuration structures', () => {
      expect(CURL_DOT).toBe(0.6);
      expect(THUMBOPEN).toBe(0.07);
      expect(FINGEROPEN).toBe(0.1);
      expect(DIRECTION_THRESHOLD).toBe(0.72);
      expect(PINCH_DIST).toBe(0.03);
      expect(PUNCH_SPEED).toBe(1.3);
      expect(SLAP_SPEED).toBe(1.8);
      expect(PALM_COLLIDER_RADIUS).toBe(0.05);
      expect(TRIANGLE_TIP_DIST).toBe(0.12);
      expect(TRIANGLE_THUMB_DIST).toBe(0.14);
      expect(TRIANGLE_FINGER_DOT).toBe(0.35);
      expect(CLAP_ORIGIN_MIN_DIST).toBe(0.05);
      expect(CLAP_CONTACT_DIST).toBe(0.17);
      expect(CLAP_SEPARATION_DIST).toBe(0.195);
      expect(CLAP_DOUBLE_MIN_MS).toBe(90);
      expect(CLAP_DOUBLE_MAX_MS).toBe(1100);
      expect(CIRCLE_HISTORY_FRAMES).toBe(90);
      expect(CIRCLE_MIN_SAMPLES).toBe(30);
      expect(CIRCLE_MIN_RADIUS).toBe(0.06);
      expect(CIRCLE_MAX_IRREGULARITY).toBe(0.55);
      expect(CIRCLE_MIN_REVOLUTIONS).toBe(1.2);
      expect(DISC_FIRE_COOLDOWN_MS).toBe(800);
      expect(BLAST_PALM_DIST).toBe(0.3);
      expect(BLAST_FORWARD_DOT).toBe(-0.4);
      expect(BLAST_CHARGE_DURATION_MS).toBe(600);
      expect(BLAST_THRUST_SPEED).toBe(1.0);
      expect(BLAST_COOLDOWN_MS).toBe(800);
      expect(BLAST_CONFIG.PALM_DIST).toBe(0.3);
      expect(HOLD_DEFAULT_DURATION_MS).toBe(1000);
      expect(HOLD_COOLDOWN_MS).toBe(800);
      expect(COLLISION_DURATION).toBe(200);
      expect(SPELL_CONFIG.HISTORY_FRAMES).toBe(90);
      expect(SPELL_CONFIG.ARCHETYPES.TRIANGLE).toBe('triangle');
      expect(SPELL_CONFIG.ARCHETYPES.CIRCLE).toBe('circle');
      expect(SPELL_CONFIG.ARCHETYPES.BLAST).toBe('blast');
      expect(PHALANGES.index.length).toBe(5);
    });

    it('evaluates blast / charge orb gesture from hand poses', () => {
      const leftPose = buildHandPoseBuffer({ wrist: [-0.1, 1.2, -0.4] });
      const rightPose = buildHandPoseBuffer({ wrist: [0.1, 1.2, -0.4] });
      const twoHand = createTwoHandState();
      const leftState = createSingleHandState('left');
      const rightState = createSingleHandState('right');

      // Both hands untracked -> blast active is false
      leftState.tracked = false;
      rightState.tracked = false;
      evaluateBlastFromPoses(leftPose, 0, rightPose, 0, leftState, rightState, twoHand.blast, 0.016, 100);
      expect(twoHand.blast.active).toBe(false);

      // Both hands open and forward-facing
      leftState.tracked = true;
      leftState.sign = 'open';
      leftState.palmForward = { x: 0, y: 0, z: -1 };
      leftState.palmCenter = { x: -0.1, y: 1.2, z: -0.4 };
      leftState.wristVelocity = { x: 0, y: 0, z: 0 };
      leftState.wristSpeed = 0;

      rightState.tracked = true;
      rightState.sign = 'open';
      rightState.palmForward = { x: 0, y: 0, z: -1 };
      rightState.palmCenter = { x: 0.1, y: 1.2, z: -0.4 };
      rightState.wristVelocity = { x: 0, y: 0, z: 0 };
      rightState.wristSpeed = 0;

      evaluateBlastFromPoses(leftPose, 0, rightPose, 0, leftState, rightState, twoHand.blast, 0.3, 100);
      expect(twoHand.blast.active).toBe(true);
      expect(twoHand.blast.charge).toBeCloseTo(0.5, 1);
      expect(twoHand.blast.triggered).toBe(false);

      // Advance charge to completion (charge >= 1.0 triggers blast)
      evaluateBlastFromPoses(leftPose, 0, rightPose, 0, leftState, rightState, twoHand.blast, 0.35, 400);
      expect(twoHand.blast.triggered).toBe(true);
      expect(twoHand.blast.charge).toBe(1.0);
    });
  });
});
