// Single-Hand Kinematics & Gesture Recognizer
// Extracted from DunJun GestureSystem & PhysicsHandSystem:
// - 25-joint pose ring buffer (POS_HISTORY_COUNT = 20)
// - Orientation-invariant intra-finger curl dot products + legacy Euclidean mode
// - Scale-invariant anatomical thumb-out ratio (isThumbReallyOut)
// - 13 static hand signs + cardinal directions (thehro/niche, thumbsup/thumbsdown)
// - Ballistic velocity gate on ring-finger-tip promoting fist -> punch and open/thehro -> slap
// - Index aim ray, palm forward vector, and palm collider anchor

import {
  CURL_DOT,
  DIRECTION_THRESHOLD,
  FINGEROPEN,
  FLOATS_PER_JOINT,
  JOINT_COUNT,
  JOINT_INDEX,
  PINCH_DIST,
  POS_HISTORY_COUNT,
  PUNCH_SPEED,
  SLAP_SPEED,
  THUMBOPEN,
} from '../constants.js';
import { v3Dist, v3Dot, v3Normalize, v3Sub } from '../math/vec3.js';
import type {
  ActiveGesture,
  FingerExtensionState,
  HaathConfig,
  Handedness,
  HandSign,
  SingleHandState,
} from '../types.js';
import { CircleTrajectoryRecognizer } from './trajectory.js';

const FRAME_STRIDE = JOINT_COUNT * FLOATS_PER_JOINT; // 25 * 7 = 175 floats per frame

// Pre-allocated module-level scratch vectors for pure stateless helpers
const _v1 = new Float32Array(3);
const _v2 = new Float32Array(3);
const _v3 = new Float32Array(3);
const _dir = new Float32Array(3);

export function createSingleHandState(): SingleHandState {
  return {
    tracked: false,
    sign: 'idle',
    gesture: 'idle',
    fingers: {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      count: 0,
    },
    motionSpeed: 0,
    wristPosition: new Float32Array(3),
    palmPosition: new Float32Array(3),
    palmQuaternion: new Float32Array([0, 0, 0, 1]),
    velocity: new Float32Array(3),
    aimOrigin: new Float32Array(3),
    aimDirection: new Float32Array([0, 0, -1]),
    palmForward: new Float32Array([0, 0, -1]),
    circle: {
      triggered: false,
      centroid: new Float32Array(3),
      normal: new Float32Array([0, 0, 1]),
      meanRadius: 0,
      revolutions: 0,
    },
  };
}

/**
 * Evaluates orientation-invariant intra-finger curl for a 4-joint chain:
 * v1 = normalize(prox - meta), v2 = normalize(inter - prox), v3 = normalize(tip - inter)
 * isExtended = (v1 . v2 > curlDot) && (v2 . v3 > curlDot)
 */
export function isFingerExtendedCurl(
  poses: Float32Array,
  frameOffset: number,
  metaIdx: number,
  proxIdx: number,
  interIdx: number,
  tipIdx: number,
  curlDot: number = CURL_DOT,
): boolean {
  const mOff = frameOffset + metaIdx * FLOATS_PER_JOINT;
  const pOff = frameOffset + proxIdx * FLOATS_PER_JOINT;
  const iOff = frameOffset + interIdx * FLOATS_PER_JOINT;
  const tOff = frameOffset + tipIdx * FLOATS_PER_JOINT;

  v3Sub(_v1, poses, poses, pOff, mOff);
  v3Normalize(_v1, _v1);

  v3Sub(_v2, poses, poses, iOff, pOff);
  v3Normalize(_v2, _v2);

  v3Sub(_v3, poses, poses, tOff, iOff);
  v3Normalize(_v3, _v3);

  return v3Dot(_v1, _v2) > curlDot && v3Dot(_v2, _v3) > curlDot;
}

/**
 * Scale-invariant anatomical thumb-out check:
 * Compares dist(thumb-tip, middle-inter) against palm knuckle span dist(pinky-inter, index-inter).
 */
export function isThumbReallyOut(poses: Float32Array, frameOffset = 0): boolean {
  const pinkyInterOff = frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT;
  const indexInterOff = frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const middleInterOff = frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;

  const dPalm = v3Dist(poses, poses, pinkyInterOff, indexInterOff);
  const dThumb = v3Dist(poses, poses, thumbTipOff, middleInterOff);
  return dPalm > 0 && dThumb > dPalm;
}

/**
 * Evaluates all 5 finger extensions into `out` using either orientation-invariant curl
 * (`useCurlDetection = true`) or legacy Euclidean wrist-to-tip distances (`useCurlDetection = false`).
 */
export function evaluateFingerExtensions(
  poses: Float32Array,
  frameOffset: number,
  out: FingerExtensionState,
  useCurlDetection = true,
  curlDot = CURL_DOT,
  thumbOpenDist = THUMBOPEN,
  fingerOpenDist = FINGEROPEN,
): FingerExtensionState {
  if (useCurlDetection) {
    out.thumb = isThumbReallyOut(poses, frameOffset);
    out.index = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.INDEX_METACARPAL,
      JOINT_INDEX.INDEX_PROXIMAL,
      JOINT_INDEX.INDEX_INTERMEDIATE,
      JOINT_INDEX.INDEX_TIP,
      curlDot,
    );
    out.middle = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.MIDDLE_METACARPAL,
      JOINT_INDEX.MIDDLE_PROXIMAL,
      JOINT_INDEX.MIDDLE_INTERMEDIATE,
      JOINT_INDEX.MIDDLE_TIP,
      curlDot,
    );
    out.ring = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.RING_METACARPAL,
      JOINT_INDEX.RING_PROXIMAL,
      JOINT_INDEX.RING_INTERMEDIATE,
      JOINT_INDEX.RING_TIP,
      curlDot,
    );
    out.pinky = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.PINKY_METACARPAL,
      JOINT_INDEX.PINKY_PROXIMAL,
      JOINT_INDEX.PINKY_INTERMEDIATE,
      JOINT_INDEX.PINKY_TIP,
      curlDot,
    );
  } else {
    const wristOff = frameOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    out.thumb =
      v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT) >
      thumbOpenDist;
    out.index =
      v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT) >
      fingerOpenDist;
    out.middle =
      v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT) >
      fingerOpenDist;
    out.ring =
      v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.RING_TIP * FLOATS_PER_JOINT) >
      fingerOpenDist;
    out.pinky =
      v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.PINKY_TIP * FLOATS_PER_JOINT) >
      fingerOpenDist;
  }

  out.count =
    (out.thumb ? 1 : 0) +
    (out.index ? 1 : 0) +
    (out.middle ? 1 : 0) +
    (out.ring ? 1 : 0) +
    (out.pinky ? 1 : 0);

  return out;
}

/**
 * Classifies static single-hand sign in exact DunJun priority order (1..11).
 */
export function classifyHandSign(
  poses: Float32Array,
  frameOffset: number,
  fingers: FingerExtensionState,
  pinchDist: number = PINCH_DIST,
  directionThreshold: number = DIRECTION_THRESHOLD,
): HandSign {
  const T = fingers.thumb;
  const I = fingers.index;
  const M = fingers.middle;
  const R = fingers.ring;
  const P = fingers.pinky;

  let sign: HandSign = 'unknown';

  // Priority 1: 'telephone' (1, 0, 0, 0, 1)
  if (T && !I && !M && !R && P) {
    sign = 'telephone';
  }
  // Priority 2: 'rock-horns' (1, 1, 0, 0, 1)
  if (T && I && !M && !R && P) {
    sign = 'rock-horns';
  }
  // Priority 3: 'birdie-1' (0, 0, 1, 0, 0)
  if (!T && !I && M && !R && !P) {
    sign = 'birdie-1';
  }
  // Priority 4: 'birdie-2' (1, 0, 1, 0, 0)
  if (T && !I && M && !R && !P) {
    sign = 'birdie-2';
  }
  // Priority 5: 'pinkie-out' (0, 0, 0, 0, 1)
  if (!T && !I && !M && !R && P) {
    sign = 'pinkie-out';
  }
  // Priority 6: 'fist' (*, 0, 0, 0, 0) - overridden by #10/#11 if pinching or thumb is out
  if (!I && !M && !R && !P) {
    sign = 'fist';
  }
  // Priority 7: 'open' / 'thehro' / 'niche' (*, 1, 1, 1, 1)
  if (I && M && R && P) {
    const wristOff = frameOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const midTipOff = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
    v3Sub(_dir, poses, poses, midTipOff, wristOff);
    v3Normalize(_dir, _dir);
    if (_dir[1] > directionThreshold) {
      sign = 'thehro';
    } else if (_dir[1] < -directionThreshold) {
      sign = 'niche';
    } else {
      sign = 'open';
    }
  }
  // Priority 8: 'gun' (*, 1, 1, 0, 0) or (1, 1, 0, 0, 0)
  if ((I && M && !R && !P) || (T && I && !M && !R && !P)) {
    sign = 'gun';
  }
  // Priority 9: 'poke' (0, 1, 0, 0, 0)
  if (!T && I && !M && !R && !P) {
    sign = 'poke';
  }
  // Priority 10: 'pinch' (I == 0 && dist(thumbTip, indexTip) < PINCH_DIST)
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const indexTipOff = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const isPinching = !I && v3Dist(poses, poses, thumbTipOff, indexTipOff) < pinchDist;
  if (isPinching) {
    sign = 'pinch';
  }
  // Priority 11: 'thumb' / 'thumbsup' / 'thumbsdown' (1, 0, 0, 0, 0) + isThumbReallyOut()
  if (!isPinching && T && !I && !M && !R && !P && isThumbReallyOut(poses, frameOffset)) {
    const thumbMetaOff = frameOffset + JOINT_INDEX.THUMB_METACARPAL * FLOATS_PER_JOINT;
    v3Sub(_dir, poses, poses, thumbTipOff, thumbMetaOff);
    v3Normalize(_dir, _dir);
    if (_dir[1] > directionThreshold) {
      sign = 'thumbsup';
    } else if (_dir[1] < -directionThreshold) {
      sign = 'thumbsdown';
    } else {
      sign = 'thumb';
    }
  }

  return sign;
}

/**
 * Promotes static hand sign to 'punch' or 'slap' when ballistic velocity gate is met.
 */
export function promoteStrikeGesture(
  sign: HandSign,
  motionSpeed: number,
  punchSpeed: number = PUNCH_SPEED,
  slapSpeed: number = SLAP_SPEED,
): ActiveGesture {
  if (sign === 'fist' && motionSpeed > punchSpeed) {
    return 'punch';
  }
  if ((sign === 'open' || sign === 'thehro') && motionSpeed > slapSpeed) {
    return 'slap';
  }
  return sign;
}

/**
 * Per-hand stateful tracker managing the 20-frame 25-joint pose ring buffer,
 * kinematics vectors, velocity gate, and Newell's 3D circle trajectory detector.
 */
export class SingleHandRecognizer {
  private readonly _handedness: Handedness;
  private readonly _historyBuffer = new Float32Array(POS_HISTORY_COUNT * FRAME_STRIDE);
  private _head = 0; // Next write slot (0..POS_HISTORY_COUNT-1)
  private _historyCount = 0;
  private readonly _circleRecognizer: CircleTrajectoryRecognizer;

  public readonly state: SingleHandState = createSingleHandState();

  constructor(handedness: Handedness, config: HaathConfig = {}) {
    this._handedness = handedness;
    this._circleRecognizer = new CircleTrajectoryRecognizer({
      historyFrames: config.circleHistoryFrames,
      minSamples: config.circleMinSamples,
      minRadius: config.circleMinRadius,
      maxIrregularity: config.circleMaxIrregularity,
      minRevolutions: config.circleMinRevolutions,
      cooldownMs: config.discFireCooldownMs,
    });
  }

  /**
   * Returns the flat history buffer and byte/element offset of the Nth most recent frame (0 = current).
   */
  getFrameOffset(age = 0): number {
    if (this._historyCount === 0 || age >= this._historyCount) return -1;
    const slot = (this._head - 1 - age + POS_HISTORY_COUNT) % POS_HISTORY_COUNT;
    return slot * FRAME_STRIDE;
  }

  getHistoryBuffer(): Float32Array {
    return this._historyBuffer;
  }

  /**
   * Marks the hand as untracked for the current frame and resets transient velocity/circle state.
   */
  markUntracked(): SingleHandState {
    this.state.tracked = false;
    this.state.sign = 'idle';
    this.state.gesture = 'idle';
    this.state.fingers.thumb = false;
    this.state.fingers.index = false;
    this.state.fingers.middle = false;
    this.state.fingers.ring = false;
    this.state.fingers.pinky = false;
    this.state.fingers.count = 0;
    this.state.motionSpeed = 0;
    this.state.velocity[0] = 0;
    this.state.velocity[1] = 0;
    this.state.velocity[2] = 0;
    this.state.circle.triggered = false;
    this.state.circle.revolutions = 0;
    this._historyCount = 0;
    this._head = 0;
    this._circleRecognizer.reset();
    return this.state;
  }

  /**
   * Begins writing a new tracked frame into the ring buffer and returns its float offset.
   */
  beginFrameSlot(): number {
    const offset = this._head * FRAME_STRIDE;
    this._head = (this._head + 1) % POS_HISTORY_COUNT;
    if (this._historyCount < POS_HISTORY_COUNT) {
      this._historyCount++;
    }
    return offset;
  }

  /**
   * Evaluates all single-hand kinematics, curl, sign, ballistic velocity, and circle trajectory
   * from the most recently written slot in `_historyBuffer`.
   */
  evaluateCurrentFrame(
    deltaSeconds: number,
    nowMs: number,
    config: Required<HaathConfig>,
  ): SingleHandState {
    const currOffset = this.getFrameOffset(0);
    if (currOffset < 0) {
      return this.markUntracked();
    }

    const buf = this._historyBuffer;
    this.state.tracked = true;

    // 1. Extract key joint positions & orientations (zero allocation)
    const wristOff = currOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    this.state.wristPosition[0] = buf[wristOff];
    this.state.wristPosition[1] = buf[wristOff + 1];
    this.state.wristPosition[2] = buf[wristOff + 2];

    const indexProxOff = currOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
    this.state.palmPosition[0] = buf[indexProxOff];
    this.state.palmPosition[1] = buf[indexProxOff + 1];
    this.state.palmPosition[2] = buf[indexProxOff + 2];
    this.state.palmQuaternion[0] = buf[indexProxOff + 3];
    this.state.palmQuaternion[1] = buf[indexProxOff + 4];
    this.state.palmQuaternion[2] = buf[indexProxOff + 5];
    this.state.palmQuaternion[3] = buf[indexProxOff + 6];

    const indexInterOff = currOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
    const indexTipOff = currOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    this.state.aimOrigin[0] = buf[indexTipOff];
    this.state.aimOrigin[1] = buf[indexTipOff + 1];
    this.state.aimOrigin[2] = buf[indexTipOff + 2];

    v3Sub(this.state.aimDirection, buf, buf, indexTipOff, indexInterOff);
    v3Normalize(this.state.aimDirection, this.state.aimDirection);

    const middleInterOff = currOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
    const middleDistalOff = currOffset + JOINT_INDEX.MIDDLE_DISTAL * FLOATS_PER_JOINT;
    v3Sub(this.state.palmForward, buf, buf, middleDistalOff, middleInterOff);
    v3Normalize(this.state.palmForward, this.state.palmForward);

    // 2. Per-finger extension solver
    evaluateFingerExtensions(
      buf,
      currOffset,
      this.state.fingers,
      config.useCurlDetection,
      config.curlDot,
      config.thumbOpenDist,
      config.fingerOpenDist,
    );

    // 3. Static sign classification
    const sign = classifyHandSign(
      buf,
      currOffset,
      this.state.fingers,
      config.pinchDist,
      config.directionThreshold,
    );
    this.state.sign = sign;

    // 4. Ballistic velocity gate on ring-finger-tip (frame[0] - frame[1])
    const prevOffset = this.getFrameOffset(1);
    if (prevOffset >= 0 && deltaSeconds > 0) {
      const currRingTipOff = currOffset + JOINT_INDEX.RING_TIP * FLOATS_PER_JOINT;
      const prevRingTipOff = prevOffset + JOINT_INDEX.RING_TIP * FLOATS_PER_JOINT;

      const vx = buf[currRingTipOff] - buf[prevRingTipOff];
      const vy = buf[currRingTipOff + 1] - buf[prevRingTipOff + 1];
      const vz = buf[currRingTipOff + 2] - buf[prevRingTipOff + 2];

      this.state.velocity[0] = vx;
      this.state.velocity[1] = vy;
      this.state.velocity[2] = vz;

      const disp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      this.state.motionSpeed = disp / deltaSeconds;
    } else {
      this.state.velocity[0] = 0;
      this.state.velocity[1] = 0;
      this.state.velocity[2] = 0;
      this.state.motionSpeed = 0;
    }

    // 5. Strike promotion
    this.state.gesture = promoteStrikeGesture(
      sign,
      this.state.motionSpeed,
      config.punchSpeed,
      config.slapSpeed,
    );

    // 6. Newell's 3D Circle Trajectory Solver
    this._circleRecognizer.update(
      this.state.wristPosition[0],
      this.state.wristPosition[1],
      this.state.wristPosition[2],
      nowMs,
      this.state.circle,
      this._handedness,
    );

    return this.state;
  }

  /**
   * Resets the Newell's 3D circle trajectory recognizer ring buffer and transient state.
   */
  resetCircle(): void {
    this._circleRecognizer.reset();
    this.state.circle.triggered = false;
    this.state.circle.revolutions = 0;
    this.state.circle.meanRadius = 0;
  }

  reset(): void {
    this.markUntracked();
  }
}
