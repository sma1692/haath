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
  MIN_ANATOMICAL_BONE_LENGTH,
  PINCH_DIST,
  PEACE_MIN_SPREAD_DEG,
  POS_HISTORY_COUNT,
  PUNCH_SPEED,
  SIGN_CURL_MAX_RATIO,
  SIGN_EXTEND_MIN_RATIO,
  SLAP_SPEED,
  THUMBOPEN,
  THUMBS_ALIGN_MIN_DOT,
  THUMBS_DIRECTION_THRESHOLD,
  THUMB_OUT_RATIO,
  GUN_TUCK_MAX_RATIO,
  SIGN_CURL_ENTER_MAX_RATIO,
  SIGN_EXTEND_ENTER_MIN_RATIO,
  THUMBS_ENTER_ALIGN_MIN_DOT,
  THUMBS_ENTER_DIRECTION_THRESHOLD,
  THUMBS_ENTER_THUMB_OUT_RATIO,
  GUN_TUCK_ENTER_MAX_RATIO,
  GUN_INDEX_LEAD_RATIO,
  PEACE_ENTER_MIN_SPREAD_DEG,
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
import { TwoFingerSwipeRecognizer, createSwipeState } from './swipe.js';

const FRAME_STRIDE = JOINT_COUNT * FLOATS_PER_JOINT; // 25 * 7 = 175 floats per frame

// Pre-allocated module-level scratch vectors for pure stateless helpers
const _v1 = new Float32Array(3);
const _v2 = new Float32Array(3);
const _v3 = new Float32Array(3);
const _dir = new Float32Array(3);
const _gA = new Float32Array(3);
const _gB = new Float32Array(3);
const _PEACE_MAX_COS = Math.cos((PEACE_MIN_SPREAD_DEG * Math.PI) / 180);
const _PEACE_ENTER_MAX_COS = Math.cos((PEACE_ENTER_MIN_SPREAD_DEG * Math.PI) / 180);

/** dist(tip, proximal) / knuckle span for one finger, or -1 when the span is degenerate. */
function fingerReach(poses: Float32Array, frameOffset: number, proximal: number, tip: number): number {
  const span = v3Dist(
    poses, poses,
    frameOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT,
    frameOffset + JOINT_INDEX.PINKY_PROXIMAL * FLOATS_PER_JOINT,
  );
  if (!(span > 0.02)) return -1;
  return v3Dist(poses, poses, frameOffset + tip * FLOATS_PER_JOINT, frameOffset + proximal * FLOATS_PER_JOINT) / span;
}

// holding = the sign being tested is already the current sign (looser HOLD gate); otherwise the stricter ENTER gate.
function fingerCurled(poses: Float32Array, frameOffset: number, proximal: number, tip: number, holding = false): boolean {
  const r = fingerReach(poses, frameOffset, proximal, tip);
  // return r >= 0 && r <= SIGN_CURL_MAX_RATIO;
  return r >= 0 && r <= (holding ? SIGN_CURL_MAX_RATIO : SIGN_CURL_ENTER_MAX_RATIO);
}

function fingerOutstretched(poses: Float32Array, frameOffset: number, proximal: number, tip: number, holding = false): boolean {
  // return fingerReach(poses, frameOffset, proximal, tip) >= SIGN_EXTEND_MIN_RATIO;
  return fingerReach(poses, frameOffset, proximal, tip) >= (holding ? SIGN_EXTEND_MIN_RATIO : SIGN_EXTEND_ENTER_MIN_RATIO);
}

/** dist(thumbTip, middleInter) / dist(pinkyInter, indexInter), the isThumbReallyOut ratio, or -1 when degenerate. */
function thumbOutRatio(poses: Float32Array, frameOffset: number): number {
  const dPalm = v3Dist(
    poses, poses,
    frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT,
    frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT,
  );
  if (!(dPalm > 0)) return -1;
  return v3Dist(
    poses, poses,
    frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT,
    frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT,
  ) / dPalm;
}

/** Cosine of the angle between (a0 -> a1) and (b0 -> b1), or NaN when either is degenerate. */
function jointDirCos(poses: Float32Array, frameOffset: number, a0: number, a1: number, b0: number, b1: number): number {
  v3Sub(_gA, poses, poses, frameOffset + a1 * FLOATS_PER_JOINT, frameOffset + a0 * FLOATS_PER_JOINT);
  v3Sub(_gB, poses, poses, frameOffset + b1 * FLOATS_PER_JOINT, frameOffset + b0 * FLOATS_PER_JOINT);
  const la = Math.hypot(_gA[0], _gA[1], _gA[2]);
  const lb = Math.hypot(_gB[0], _gB[1], _gB[2]);
  if (!(la > 1e-4) || !(lb > 1e-4)) return NaN;
  return v3Dot(_gA, _gB) / (la * lb);
}

/**
 * Thumbs up / down shape gate: all four fingers curled (tip near its own proximal joint) and the
 * thumb outstretched along the fist, i.e. pinkyTip -> indexTip roughly parallel to
 * thumbProximal -> thumbTip. A relaxed fist with the thumb lying across the fingers fails it.
 * holding = the hand already shows thumb / thumbsup / thumbsdown (playtest 4 HOLD gates); otherwise
 * the stricter ENTER gates apply (SIGN_CURL_ENTER_MAX_RATIO, THUMBS_ENTER_ALIGN_MIN_DOT).
 */
export function isThumbsShape(poses: Float32Array, frameOffset = 0, holding = false): boolean {
  const J = JOINT_INDEX;
  // if (!fingerCurled(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP)) return false;
  // if (!fingerCurled(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP)) return false;
  // if (!fingerCurled(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP)) return false;
  // if (!fingerCurled(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP)) return false;
  if (!fingerCurled(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP, holding)) return false;
  const cUp = jointDirCos(poses, frameOffset, J.PINKY_TIP, J.INDEX_TIP, J.THUMB_PROXIMAL, J.THUMB_TIP);
  const cDown = jointDirCos(poses, frameOffset, J.INDEX_TIP, J.PINKY_TIP, J.THUMB_PROXIMAL, J.THUMB_TIP);
  // return Math.max(cUp, cDown) >= THUMBS_ALIGN_MIN_DOT;
  return Math.max(cUp, cDown) >= (holding ? THUMBS_ALIGN_MIN_DOT : THUMBS_ENTER_ALIGN_MIN_DOT);
}

/**
 * Peace shape gate: ring and pinky curled, index and middle outstretched, and the two fingers
 * spread in a V: angle(indexProximal -> indexTip, middleProximal -> middleTip) > PEACE_MIN_SPREAD_DEG.
 * Fingers held together (two-finger gun / swipe pose) and a relaxed open hand both fail it.
 * holding = the hand already shows peace (HOLD gates); otherwise the stricter ENTER gates apply.
 */
export function isPeaceShape(poses: Float32Array, frameOffset = 0, holding = false): boolean {
  const J = JOINT_INDEX;
  // if (!fingerCurled(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP)) return false;
  // if (!fingerCurled(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP)) return false;
  // if (!fingerOutstretched(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP)) return false;
  // if (!fingerOutstretched(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP)) return false;
  if (!fingerCurled(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP, holding)) return false;
  if (!fingerOutstretched(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP, holding)) return false;
  if (!fingerOutstretched(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP, holding)) return false;
  const c = jointDirCos(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP);
  // return c < _PEACE_MAX_COS;
  return c < (holding ? _PEACE_MAX_COS : _PEACE_ENTER_MAX_COS);
}
/**
 * Gun tuck gate: ring and pinky (plus middle for 1-finger gun) either read as curled by the finger
 * state, or sit within GUN_TUCK_MAX_RATIO reach (a loose tuck), so tendon coupling when extending
 * the index finger does not reject the gun pose.
 * holding = the hand already shows gun (GUN_TUCK_MAX_RATIO); otherwise GUN_TUCK_ENTER_MAX_RATIO.
 */
function isGunTucked(
  poses: Float32Array,
  frameOffset: number,
  ringOut: boolean,
  pinkyOut: boolean,
  middleOut = false,
  holding = false,
): boolean {
  const J = JOINT_INDEX;
  const tuck = holding ? GUN_TUCK_MAX_RATIO : GUN_TUCK_ENTER_MAX_RATIO;
  if (middleOut) {
    const m = fingerReach(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP);
    // if (!(m >= 0 && m <= GUN_TUCK_MAX_RATIO)) return false;
    if (!(m >= 0 && m <= tuck)) return false;
  }
  if (ringOut) {
    const r = fingerReach(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP);
    // if (!(r >= 0 && r <= GUN_TUCK_MAX_RATIO)) return false;
    if (!(r >= 0 && r <= tuck)) return false;
  }
  if (pinkyOut) {
    const p = fingerReach(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP);
    // if (!(p >= 0 && p <= GUN_TUCK_MAX_RATIO)) return false;
    if (!(p >= 0 && p <= tuck)) return false;
  }
  return true;
}
/**
 * 1-finger gun shape check: translated from 2-finger gun logic onto a single index finger.
 * Index is extended, middle/ring/pinky are tucked within the gun tuck gate (accounting for tendon
 * coupling pulling the middle finger partially open: the middle also counts as tucked when the index
 * reaches GUN_INDEX_LEAD_RATIO further), and the thumb is out.
 * Entering a gun needs the thumb flagged out (THUMB_OUT_RATIO); a held gun keeps it down to
 * THUMB_OUT_RATIO * 0.85, so a thumb drifting in mid-aim does not drop to poke.
 * (Merged from DunJun thumbPose.classifyThumbHand so there is one gun / peace / poke classifier.)
 */
export function isOneFingerGunShape(
  poses: Float32Array,
  frameOffset: number,
  fingers: FingerExtensionState,
  holding = false,
): boolean {
  if (!fingers.index) return false;
  // if (!isGunTucked(poses, frameOffset, fingers.ring, fingers.pinky, fingers.middle)) return false;
  // if (fingers.thumb) return true;
  // const pinkyInterOff = frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT;
  // const indexInterOff = frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  // const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  // const middleInterOff = frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
  // const dPalm = v3Dist(poses, poses, pinkyInterOff, indexInterOff);
  // const dThumb = v3Dist(poses, poses, thumbTipOff, middleInterOff);
  // return dPalm > 0 && dThumb >= dPalm * (THUMB_OUT_RATIO * 0.85);
  let middleOut = fingers.middle;
  if (middleOut) {
    const m = fingerReach(poses, frameOffset, JOINT_INDEX.MIDDLE_PROXIMAL, JOINT_INDEX.MIDDLE_TIP);
    const i = fingerReach(poses, frameOffset, JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_TIP);
    if (m >= 0 && i > 0 && i - m >= GUN_INDEX_LEAD_RATIO) middleOut = false;
  }
  if (!isGunTucked(poses, frameOffset, fingers.ring, fingers.pinky, middleOut, holding)) return false;
  if (fingers.thumb) return true;
  if (!holding) return false;
  const t = thumbOutRatio(poses, frameOffset);
  return t >= 0 && t >= THUMB_OUT_RATIO * 0.85;
}
const _defaultHeadRight = new Float32Array([1, 0, 0]);

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
    palmCenter: new Float32Array(3),
    prevPalmCenter: new Float32Array(3),
    hasPrevPalm: false,
    indexTipPosition: new Float32Array(3),
    circle: {
      triggered: false,
      centroid: new Float32Array(3),
      normal: new Float32Array([0, 0, 1]),
      meanRadius: 0,
      revolutions: 0,
    },
    swipe: createSwipeState(),
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
  // return dPalm > 0 && dThumb > dPalm;
  return dPalm > 0 && dThumb > dPalm * THUMB_OUT_RATIO;
}

/**
 * Verifies anatomical validity of tracked joints.
 * Prevents collapsed WebXR tracking poses (< 0.03m bone lengths / knuckle spans)
 * from spiking velocity and triggering punch / slap strikes.
 */
export function isHandAnatomicallyValid(
  poses: Float32Array,
  frameOffset = 0,
  minBoneLength: number = MIN_ANATOMICAL_BONE_LENGTH,
): boolean {
  const wristOff = frameOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
  const indexProxOff = frameOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
  const middleProxOff = frameOffset + JOINT_INDEX.MIDDLE_PROXIMAL * FLOATS_PER_JOINT;
  const ringProxOff = frameOffset + JOINT_INDEX.RING_PROXIMAL * FLOATS_PER_JOINT;
  const middleTipOff = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;

  if (v3Dist(poses, poses, wristOff, middleProxOff) < minBoneLength) return false;
  if (v3Dist(poses, poses, wristOff, indexProxOff) < minBoneLength) return false;
  if (v3Dist(poses, poses, wristOff, ringProxOff) < minBoneLength) return false;
  if (v3Dist(poses, poses, wristOff, middleTipOff) < minBoneLength) return false;

  return true;
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
  // Sign hysteresis: the sign shown last frame. That sign is tested with the looser HOLD gates,
  // every other shape-gated sign with the stricter ENTER gates. 'unknown' (default) = all ENTER gates.
  prevSign: HandSign = 'unknown',
): HandSign {
  const holdingPeace = prevSign === 'peace';
  const holdingGun = prevSign === 'gun';
  const holdingThumbs = prevSign === 'thumbsup' || prevSign === 'thumbsdown' || prevSign === 'thumb';
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
  // if (T && I && !M && !R && P) {
  //   sign = 'rock-horns';
  // }
  // Playtest 3: most players tuck the thumb over middle / ring for horns, so the thumb is ignored (*, 1, 0, 0, 1).
  if (I && !M && !R && P) {
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
  // Priority 8: 'peace' (*, 1, 1, 0, 0)
  // if (I && M && !R && !P) {
  //   sign = 'peace';
  // }
  // Shape gated: a relaxed hand often flags index+middle out and ring+pinky in.
  if (I && M && !R && !P) {
    // sign = isPeaceShape(poses, frameOffset) ? 'peace' : 'unknown';
    sign = isPeaceShape(poses, frameOffset, holdingPeace) ? 'peace' : 'unknown';
  }
  // Priority 8b: 'gun' (1, 1, 0, 0, 0) - single finger + thumb out only
  // if (T && I && !M && !R && !P) {
  //   sign = 'gun';
  // }
  // Playtest 2 & 4: both 1-finger gun (index out, middle/ring/pinky loosely tucked within GUN_TUCK_MAX_RATIO,
  // relaxed thumb out) and 2-finger gun (index + middle held together, ring/pinky loosely tucked) count.
  // A spread V stays 'peace' (isPeaceShape), so menu navigation is unaffected.
  // if (
  //   sign !== 'rock-horns' &&
  //   (isOneFingerGunShape(poses, frameOffset, fingers) ||
  //     (T && I && isGunTucked(poses, frameOffset, R, P) && (!M || !isPeaceShape(poses, frameOffset))))
  // ) {
  //   sign = 'gun';
  // }
  // Gesture overlap pass: a held peace stays peace (gun never steals it), and both gun paths use the
  // enter / hold tuck gates. The peace check here uses the HOLD gate so a loose V never reads as a 2-finger gun.
  if (
    sign !== 'rock-horns' &&
    sign !== 'peace' &&
    (isOneFingerGunShape(poses, frameOffset, fingers, holdingGun) ||
      (T && I && isGunTucked(poses, frameOffset, R, P, false, holdingGun) && (!M || !isPeaceShape(poses, frameOffset, true))))
  ) {
    sign = 'gun';
  }
  // Priority 9: 'poke' (0, 1, 0, 0, 0) - only when not already classified as a 1-finger gun
  if (sign !== 'gun' && !T && I && !M && !R && !P) {
    sign = 'poke';
  }
  // Priority 10: 'pinch' (I == 0 && dist(thumbTip, indexTip) < PINCH_DIST)
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const indexTipOff = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const isPinching = !I && v3Dist(poses, poses, thumbTipOff, indexTipOff) < pinchDist;
  if (isPinching) {
    sign = 'pinch';
  }
  // Priority 11: 'thumb' / 'thumbsup' / 'thumbsdown'
  // Playtest 4: allow thumbsup/thumbsdown when the hand is in a fist or unknown (e.g. a slightly loose finger
  // that prevented 'fist'), as long as the scale-invariant isThumbsShape(poses) curl & alignment check passes!
  // if ((sign === 'fist' || sign === 'unknown') && !isPinching && (T || isThumbReallyOut(poses, frameOffset)) && isThumbsShape(poses, frameOffset)) {
  // Gesture overlap pass: ENTERING thumbs needs a real fist ('fist', or 'unknown' with the index curled),
  // the thumb clearly out (THUMBS_ENTER_THUMB_OUT_RATIO) and the ENTER shape gates. A HELD thumbs keeps the
  // playtest 4 gates, so a relaxed thumbs up stays up once shown, but a pointing hand can no longer slide into it.
  const thumbsCandidate = holdingThumbs
    ? (sign === 'fist' || sign === 'unknown') && (T || isThumbReallyOut(poses, frameOffset))
    : (sign === 'fist' || (sign === 'unknown' && !I)) && thumbOutRatio(poses, frameOffset) > THUMBS_ENTER_THUMB_OUT_RATIO;
  // The plain sideways 'thumb' keeps the playtest 4 shape gate; the stricter ENTER shape gate only guards
  // thumbsup / thumbsdown (the signs that drive navigation).
  if (thumbsCandidate && !isPinching && isThumbsShape(poses, frameOffset, true)) {
    const thumbMetaOff = frameOffset + JOINT_INDEX.THUMB_METACARPAL * FLOATS_PER_JOINT;
    v3Sub(_dir, poses, poses, thumbTipOff, thumbMetaOff);
    v3Normalize(_dir, _dir);
    // Playtest 2 & 4: thumbs need less of a vertical thumb (THUMBS_DIRECTION_THRESHOLD, ~65 deg).
    // const thumbsDir = Math.min(directionThreshold, THUMBS_DIRECTION_THRESHOLD);
    const thumbsDir = Math.min(directionThreshold, holdingThumbs ? THUMBS_DIRECTION_THRESHOLD : THUMBS_ENTER_DIRECTION_THRESHOLD);
    const upDownShape = holdingThumbs || isThumbsShape(poses, frameOffset, false);
    if (upDownShape && _dir[1] > thumbsDir) {
      sign = 'thumbsup';
    } else if (upDownShape && _dir[1] < -thumbsDir) {
      sign = 'thumbsdown';
    } else if (!I && !M && !R && !P) {
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
  // if (sign === 'fist' && motionSpeed > punchSpeed) {
  //   return 'punch';
  // }
  // if ((sign === 'open' || sign === 'thehro') && motionSpeed > slapSpeed) {
  //   return 'slap';
  // }
  // Gesture overlap pass: a vertical (thumb-up) fist read as thumbs / thumb used to swallow the punch,
  // and a palm-down slap read as 'niche' never slapped. Punch uses the whole fist family (slap reverted to open / thehro after playtest 18 Nov).
  if (isFistFamily(sign) && motionSpeed > punchSpeed) {
    return 'punch';
  }
  if (isOpenFamily(sign) && motionSpeed > slapSpeed) {
    return 'slap';
  }
  return sign;
}

/** Signs that are a closed hand for strike purposes (punch, punch latch). */
export function isFistFamily(sign: HandSign): boolean {
  return sign === 'fist' || sign === 'thumb' || sign === 'thumbsup' || sign === 'thumbsdown';
}

/** Signs that are an open hand for strike purposes (slap, slap latch). */
export function isOpenFamily(sign: HandSign): boolean {
  // return sign === 'open' || sign === 'thehro' || sign === 'niche';
  // Playtest 18 Nov: 'niche' (palm-down) fired accidental slaps when the hand dropped. Back to open / thehro only.
  return sign === 'open' || sign === 'thehro';
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
  // Last time (ms) each strike passed its speed gate, for the STRIKE_LATCH_MS grace window.
  private _lastPunchMs = -Infinity;
  private _lastSlapMs = -Infinity;
  private _palmCenterValid = false; // palmCenter holds a value from a previous tracked frame
  private readonly _circleRecognizer: CircleTrajectoryRecognizer;
  private readonly _swipeRecognizer: TwoFingerSwipeRecognizer;

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
    this._swipeRecognizer = new TwoFingerSwipeRecognizer({
      tipGap: config.swipeTipGap,
      minDist: config.swipeMinDist,
      windowMs: config.swipeWindowMs,
      axisDominance: config.swipeAxisDominance,
      maxFingerDot: config.swipeMaxFingerDot,
      cooldownMs: config.swipeCooldownMs,
      requireThumbTucked: config.swipeRequireThumbTucked,
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
    // Drop the swept-collision history so a re-acquired hand cannot sweep across the scene
    this.state.hasPrevPalm = false;
    this._palmCenterValid = false;
    this._historyCount = 0;
    this._head = 0;
    this._circleRecognizer.reset();
    this._swipeRecognizer.reset(this.state.swipe);
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
    headRight: Float32Array = _defaultHeadRight,
  ): SingleHandState {
    const currOffset = this.getFrameOffset(0);
    if (currOffset < 0) {
      return this.markUntracked();
    }

    const buf = this._historyBuffer;
    if (!isHandAnatomicallyValid(buf, currOffset, config.minBoneLength)) {
      return this.markUntracked();
    }

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
    this.state.indexTipPosition[0] = buf[indexTipOff];
    this.state.indexTipPosition[1] = buf[indexTipOff + 1];
    this.state.indexTipPosition[2] = buf[indexTipOff + 2];

    // True palm center for environment collision: midpoint of the middle metacarpal bone.
    // Previous frame value is kept for the swept (anti-tunneling) test.
    if (this._palmCenterValid) {
      this.state.prevPalmCenter[0] = this.state.palmCenter[0];
      this.state.prevPalmCenter[1] = this.state.palmCenter[1];
      this.state.prevPalmCenter[2] = this.state.palmCenter[2];
      this.state.hasPrevPalm = true;
    } else {
      this.state.hasPrevPalm = false;
    }
    const midMetaOff = currOffset + JOINT_INDEX.MIDDLE_METACARPAL * FLOATS_PER_JOINT;
    const midProxOff = currOffset + JOINT_INDEX.MIDDLE_PROXIMAL * FLOATS_PER_JOINT;
    const pcx = 0.5 * (buf[midMetaOff] + buf[midProxOff]);
    const pcy = 0.5 * (buf[midMetaOff + 1] + buf[midProxOff + 1]);
    const pcz = 0.5 * (buf[midMetaOff + 2] + buf[midProxOff + 2]);
    if (Number.isFinite(pcx) && Number.isFinite(pcy) && Number.isFinite(pcz) && (pcx !== 0 || pcy !== 0 || pcz !== 0)) {
      this.state.palmCenter[0] = pcx;
      this.state.palmCenter[1] = pcy;
      this.state.palmCenter[2] = pcz;
    } else {
      this.state.palmCenter[0] = this.state.wristPosition[0];
      this.state.palmCenter[1] = this.state.wristPosition[1];
      this.state.palmCenter[2] = this.state.wristPosition[2];
    }
    this._palmCenterValid = true;

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
      this.state.sign, // previous frame's sign: enter / hold hysteresis
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

      const invDt = 1 / deltaSeconds;
      this.state.velocity[0] = vx * invDt;
      this.state.velocity[1] = vy * invDt;
      this.state.velocity[2] = vz * invDt;

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
    // 5b. Strike latch (playtest 2 punch, playtest 3 slap): short strikes peak above the speed gate
    // for a frame or two and are already slowing at contact. The same pose keeps its strike for
    // strikeLatchMs after the last fast frame.
    const g = this.state.gesture;
    if (g === 'punch') this._lastPunchMs = nowMs;
    else if (g === 'slap') this._lastSlapMs = nowMs;
    // else if ((sign === 'fist' || sign === 'thumb') && nowMs - this._lastPunchMs < config.strikeLatchMs) {
    //   this.state.gesture = 'punch';
    // } else if ((sign === 'open' || sign === 'thehro') && nowMs - this._lastSlapMs < config.strikeLatchMs) {
    //   this.state.gesture = 'slap';
    // }
    else if (isFistFamily(sign) && nowMs - this._lastPunchMs < config.strikeLatchMs) {
      this.state.gesture = 'punch';
    } else if (isOpenFamily(sign) && nowMs - this._lastSlapMs < config.strikeLatchMs) {
      this.state.gesture = 'slap';
    }

    // 6. Newell's 3D Circle Trajectory Solver
    this._circleRecognizer.update(
      this.state.wristPosition[0],
      this.state.wristPosition[1],
      this.state.wristPosition[2],
      nowMs,
      this.state.circle,
      this._handedness,
    );

    // 7. Two-finger swipe ("brush"): pose gate + sideways stroke gate
    if (config.swipeEnabled) {
      this._swipeRecognizer.update(
        buf,
        currOffset,
        this.state.fingers,
        this.state.aimDirection,
        headRight,
        nowMs,
        this.state.swipe,
      );
    } else {
      this.state.swipe.posed = false;
      this.state.swipe.fired = false;
    }

    return this.state;
  }

  /**
   * Clears the in-progress two-finger swipe stroke (does not reset the cooldown).
   */
  resetSwipe(): void {
    this._swipeRecognizer.reset(this.state.swipe);
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
