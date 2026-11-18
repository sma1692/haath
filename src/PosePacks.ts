// Static Hand Pose Packs for haath v2 Compositional Pipeline
// Core gesture library + opt-in American Sign Language (ASL) Static Alphabet pack.

import { JOINT_INDEX, PINCH_DIST } from './constants.js';
import { v3Dot } from './math/vec3.js';
import type { StaticPoseDefinition } from './StaticPoseClassifier.js';

// Scratch vectors for math inside pose match predicates
const _scratchDir1 = new Float32Array(3);
const _scratchDir2 = new Float32Array(3);

export type CorePoseName =
  | 'fist'
  | 'open_palm'
  | 'point'
  | 'pinch'
  | 'peace'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'horns'
  | 'shaka'
  | 'finger_gun'
  | 'ok_sign';

export type ASLPoseName =
  | 'asl_a'
  | 'asl_b'
  | 'asl_c'
  | 'asl_d'
  | 'asl_e'
  | 'asl_f'
  | 'asl_g'
  | 'asl_h'
  | 'asl_i'
  | 'asl_k'
  | 'asl_l'
  | 'asl_o'
  | 'asl_s'
  | 'asl_u'
  | 'asl_v'
  | 'asl_w'
  | 'asl_x'
  | 'asl_y';

export type PoseName = CorePoseName | ASLPoseName;

// --- Core Poses ---

export const FIST_POSE: StaticPoseDefinition = {
  name: 'fist',
  category: 'core',
  description: 'All 5 fingers curled tightly into palm',
  fingers: {
    thumb: 'curled',
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  priority: 1.0,
};

export const OPEN_PALM_POSE: StaticPoseDefinition = {
  name: 'open_palm',
  category: 'core',
  description: 'All 5 fingers extended outward',
  fingers: {
    thumb: 'extended',
    index: 'extended',
    middle: 'extended',
    ring: 'extended',
    pinky: 'extended',
  },
  priority: 1.0,
};

export const POINT_POSE: StaticPoseDefinition = {
  name: 'point',
  category: 'core',
  description: 'Index finger extended forward, other fingers curled',
  fingers: {
    index: 'extended',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    // When thumb is extended or half-extended outward, defer to finger_gun
    if (ctx.fingers.thumb.extended || ctx.fingers.thumb.curlScore >= 0.48) return 0;
    // Index tip should be notably farther from wrist than curled fingers
    const wristDist = ctx.getDistance(JOINT_INDEX.WRIST, JOINT_INDEX.INDEX_TIP);
    const midDist = ctx.getDistance(JOINT_INDEX.WRIST, JOINT_INDEX.MIDDLE_TIP);
    return wristDist > midDist ? 1.0 : 0.0;
  },
  priority: 1.1,
};

export const PINCH_POSE: StaticPoseDefinition = {
  name: 'pinch',
  category: 'core',
  description: 'Thumb tip and index tip in near contact',
  match: (ctx) => {
    const d = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_TIP);
    if (d > ctx.pinchDist) return 0;
    // If middle, ring, pinky are extended, defer to ok_sign
    if (
      ctx.fingers.middle.extended &&
      ctx.fingers.ring.extended &&
      ctx.fingers.pinky.extended
    ) {
      return 0;
    }
    return Math.max(0.1, 1.0 - d / ctx.pinchDist);
  },
  priority: 1.2,
};

export const PEACE_POSE: StaticPoseDefinition = {
  name: 'peace',
  category: 'core',
  description: 'Index and middle fingers extended in a V-shape, others curled',
  fingers: {
    index: 'extended',
    middle: 'extended',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    const tipDist = ctx.getDistance(JOINT_INDEX.INDEX_TIP, JOINT_INDEX.MIDDLE_TIP);
    // V-shape separation threshold: tips separated by at least 2.5cm
    return tipDist >= 0.025 ? Math.min(1.0, tipDist / 0.045) : 0;
  },
  priority: 1.15,
};

export const THUMBS_UP_POSE: StaticPoseDefinition = {
  name: 'thumbs_up',
  category: 'core',
  description: 'Thumb extended pointing upward, all other fingers curled',
  fingers: {
    thumb: 'extended',
    index: 'any',
    middle: 'any',
    ring: 'any',
    pinky: 'any',
  },
  match: (ctx) => {
    // Allow curled or half-curled fingers (curlScore < 0.78) so relaxed fists still trigger thumbs_up
    if (
      ctx.fingers.index.curlScore > 0.78 ||
      ctx.fingers.middle.curlScore > 0.78 ||
      ctx.fingers.ring.curlScore > 0.78 ||
      ctx.fingers.pinky.curlScore > 0.78
    ) {
      return 0;
    }
    const dir = _scratchDir1;
    ctx.getDirection(JOINT_INDEX.THUMB_METACARPAL, JOINT_INDEX.THUMB_TIP, dir);
    if (dir[1] < ctx.directionThreshold * 0.55) return 0;
    return Math.min(1.0, (dir[1] - 0.25) / 0.5);
  },
  priority: 1.25,
};

export const THUMBS_DOWN_POSE: StaticPoseDefinition = {
  name: 'thumbs_down',
  category: 'core',
  description: 'Thumb extended pointing downward, all other fingers curled',
  fingers: {
    thumb: 'extended',
    index: 'any',
    middle: 'any',
    ring: 'any',
    pinky: 'any',
  },
  match: (ctx) => {
    // Allow curled or half-curled fingers (curlScore < 0.78) so relaxed fists still trigger thumbs_down
    if (
      ctx.fingers.index.curlScore > 0.78 ||
      ctx.fingers.middle.curlScore > 0.78 ||
      ctx.fingers.ring.curlScore > 0.78 ||
      ctx.fingers.pinky.curlScore > 0.78
    ) {
      return 0;
    }
    const dir = _scratchDir1;
    ctx.getDirection(JOINT_INDEX.THUMB_METACARPAL, JOINT_INDEX.THUMB_TIP, dir);
    if (dir[1] > -ctx.directionThreshold * 0.55) return 0;
    return Math.min(1.0, (-dir[1] - 0.25) / 0.5);
  },
  priority: 1.25,
};

export const HORNS_POSE: StaticPoseDefinition = {
  name: 'horns',
  category: 'core',
  description: 'Index and pinky extended, middle and ring curled (Rock-on / Corna)',
  fingers: {
    index: 'extended',
    pinky: 'extended',
    middle: 'curled',
    ring: 'curled',
  },
  priority: 1.15,
};

export const SHAKA_POSE: StaticPoseDefinition = {
  name: 'shaka',
  category: 'core',
  description: 'Thumb and pinky extended outward, index/middle/ring curled (Hang loose)',
  fingers: {
    thumb: 'extended',
    pinky: 'extended',
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
  },
  priority: 1.2,
};

export const FINGER_GUN_POSE: StaticPoseDefinition = {
  name: 'finger_gun',
  category: 'core',
  description: 'Index extended forward and thumb extended upward forming an L gun, others curled',
  fingers: {
    thumb: 'any',
    index: 'extended',
    middle: 'any',
    ring: 'any',
    pinky: 'any',
  },
  match: (ctx) => {
    if (ctx.fingers.thumb.curlScore < 0.35) return 0;
    const span = ctx.getDistance(JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.PINKY_PROXIMAL);
    const midRatio = span > 0.02 ? ctx.getDistance(JOINT_INDEX.MIDDLE_PROXIMAL, JOINT_INDEX.MIDDLE_TIP) / span : 2;
    const ringRatio = span > 0.02 ? ctx.getDistance(JOINT_INDEX.RING_PROXIMAL, JOINT_INDEX.RING_TIP) / span : 2;
    const pinkyRatio = span > 0.02 ? ctx.getDistance(JOINT_INDEX.PINKY_PROXIMAL, JOINT_INDEX.PINKY_TIP) / span : 2;
    // Allow middle, ring, pinky to be curled or loosely half-extended (<= 1.22 ratio) due to tendon coupling when index is extended
    if (
      (ctx.fingers.middle.curlScore > 0.82 && midRatio > 1.22) ||
      (ctx.fingers.ring.curlScore > 0.78 && ringRatio > 1.22) ||
      (ctx.fingers.pinky.curlScore > 0.78 && pinkyRatio > 1.22)
    ) {
      return 0;
    }
    const thumbDir = _scratchDir1;
    const indexDir = _scratchDir2;
    ctx.getDirection(JOINT_INDEX.THUMB_PROXIMAL, JOINT_INDEX.THUMB_TIP, thumbDir);
    ctx.getDirection(JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_TIP, indexDir);
    const alignment = v3Dot(thumbDir, indexDir);
    // Relaxed thumb-index angle: alignment dot in (-0.55, 0.82)
    return alignment < 0.82 && alignment > -0.55 ? 1.0 : 0;
  },
  priority: 1.2,
};

export const OK_SIGN_POSE: StaticPoseDefinition = {
  name: 'ok_sign',
  category: 'core',
  description: 'Thumb tip and index tip form a circle, middle/ring/pinky extended',
  fingers: {
    middle: 'extended',
    ring: 'extended',
    pinky: 'extended',
  },
  match: (ctx) => {
    const d = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_TIP);
    if (d > ctx.pinchDist) return 0;
    return Math.max(0.1, 1.0 - d / ctx.pinchDist);
  },
  priority: 1.35,
};

export const CoreStaticPosePack: StaticPoseDefinition[] = [
  FIST_POSE,
  OPEN_PALM_POSE,
  POINT_POSE,
  PINCH_POSE,
  PEACE_POSE,
  THUMBS_UP_POSE,
  THUMBS_DOWN_POSE,
  HORNS_POSE,
  SHAKA_POSE,
  FINGER_GUN_POSE,
  OK_SIGN_POSE,
];

// --- Opt-in ASL Static Pose Pack ---

export const ASL_A_POSE: StaticPoseDefinition = {
  name: 'asl_a',
  category: 'asl',
  description: 'ASL letter A: fist with thumb upright alongside index finger',
  fingers: {
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    // Thumb rests alongside index knuckle
    const dir = _scratchDir1;
    ctx.getDirection(JOINT_INDEX.THUMB_METACARPAL, JOINT_INDEX.THUMB_TIP, dir);
    const dThumbIndex = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_PROXIMAL);
    return dir[1] > 0.2 && dThumbIndex < 0.05 ? 1.0 : 0;
  },
  priority: 1.05,
};

export const ASL_B_POSE: StaticPoseDefinition = {
  name: 'asl_b',
  category: 'asl',
  description: 'ASL letter B: four fingers straight together, thumb folded across palm',
  fingers: {
    thumb: 'curled',
    index: 'extended',
    middle: 'extended',
    ring: 'extended',
    pinky: 'extended',
  },
  match: (ctx) => {
    const dIM = ctx.getDistance(JOINT_INDEX.INDEX_TIP, JOINT_INDEX.MIDDLE_TIP);
    const dMR = ctx.getDistance(JOINT_INDEX.MIDDLE_TIP, JOINT_INDEX.RING_TIP);
    // Fingers held close together (flat palm)
    return dIM < 0.035 && dMR < 0.035 ? 1.0 : 0.5;
  },
  priority: 1.1,
};

export const ASL_C_POSE: StaticPoseDefinition = {
  name: 'asl_c',
  category: 'asl',
  description: 'ASL letter C: curved hand with all fingers half-curled forming C arc',
  fingers: {
    index: 'half_curled',
    middle: 'half_curled',
    ring: 'half_curled',
    pinky: 'half_curled',
  },
  match: (ctx) => {
    const dThumbIndex = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_TIP);
    // Clear opening gap between thumb tip and index tip (4cm..11cm)
    return dThumbIndex >= 0.04 && dThumbIndex <= 0.12 ? 1.0 : 0;
  },
  priority: 1.05,
};

export const ASL_D_POSE: StaticPoseDefinition = {
  name: 'asl_d',
  category: 'asl',
  description: 'ASL letter D: index finger pointing up, thumb touching middle/ring tips forming O',
  fingers: {
    index: 'extended',
    pinky: 'curled',
  },
  match: (ctx) => {
    const dThumbMiddle = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.MIDDLE_TIP);
    return dThumbMiddle < ctx.pinchDist * 1.3 ? 1.0 : 0;
  },
  priority: 1.15,
};

export const ASL_E_POSE: StaticPoseDefinition = {
  name: 'asl_e',
  category: 'asl',
  description: 'ASL letter E: fingers curled tightly with tips resting over tucked thumb',
  fingers: {
    thumb: 'curled',
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    const dThumbIndex = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_DISTAL);
    return dThumbIndex < 0.04 ? 1.0 : 0;
  },
  priority: 1.02,
};

export const ASL_F_POSE: StaticPoseDefinition = {
  name: 'asl_f',
  category: 'asl',
  description: 'ASL letter F: thumb and index form a circle, middle/ring/pinky extended',
  fingers: {
    middle: 'extended',
    ring: 'extended',
    pinky: 'extended',
  },
  match: (ctx) => {
    const d = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_TIP);
    return d < ctx.pinchDist ? 1.0 : 0;
  },
  priority: 1.15,
};

export const ASL_G_POSE: StaticPoseDefinition = {
  name: 'asl_g',
  category: 'asl',
  description: 'ASL letter G: index and thumb extended parallel horizontally, others curled',
  fingers: {
    thumb: 'extended',
    index: 'extended',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    const thumbDir = _scratchDir1;
    const indexDir = _scratchDir2;
    ctx.getDirection(JOINT_INDEX.THUMB_PROXIMAL, JOINT_INDEX.THUMB_TIP, thumbDir);
    ctx.getDirection(JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_TIP, indexDir);
    const alignment = v3Dot(thumbDir, indexDir);
    // Parallel index & thumb: alignment > 0.6
    return alignment > 0.6 ? 1.0 : 0;
  },
  priority: 1.15,
};

export const ASL_H_POSE: StaticPoseDefinition = {
  name: 'asl_h',
  category: 'asl',
  description: 'ASL letter H: index and middle extended parallel horizontally, others curled',
  fingers: {
    index: 'extended',
    middle: 'extended',
    ring: 'curled',
    pinky: 'curled',
    thumb: 'curled',
  },
  match: (ctx) => {
    const tipDist = ctx.getDistance(JOINT_INDEX.INDEX_TIP, JOINT_INDEX.MIDDLE_TIP);
    // Touching or parallel (unlike Peace pose)
    return tipDist < 0.025 ? 1.0 : 0;
  },
  priority: 1.12,
};

export const ASL_I_POSE: StaticPoseDefinition = {
  name: 'asl_i',
  category: 'asl',
  description: 'ASL letter I: pinky extended straight up, all other fingers curled',
  fingers: {
    pinky: 'extended',
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
    thumb: 'curled',
  },
  priority: 1.2,
};

export const ASL_K_POSE: StaticPoseDefinition = {
  name: 'asl_k',
  category: 'asl',
  description: 'ASL letter K: index up, middle forward, thumb between them, ring/pinky curled',
  fingers: {
    index: 'extended',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    const dThumbMid = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.MIDDLE_PROXIMAL);
    return dThumbMid < 0.045 ? 1.0 : 0;
  },
  priority: 1.1,
};

export const ASL_L_POSE: StaticPoseDefinition = {
  name: 'asl_l',
  category: 'asl',
  description: 'ASL letter L: index up and thumb out forming perpendicular L shape, others curled',
  fingers: {
    thumb: 'extended',
    index: 'extended',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    const thumbDir = _scratchDir1;
    const indexDir = _scratchDir2;
    ctx.getDirection(JOINT_INDEX.THUMB_PROXIMAL, JOINT_INDEX.THUMB_TIP, thumbDir);
    ctx.getDirection(JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_TIP, indexDir);
    const dot = v3Dot(thumbDir, indexDir);
    return Math.abs(dot) < 0.4 ? 1.0 : 0;
  },
  priority: 1.2,
};

export const ASL_O_POSE: StaticPoseDefinition = {
  name: 'asl_o',
  category: 'asl',
  description: 'ASL letter O: all fingertips touching thumb tip forming an O ring',
  match: (ctx) => {
    const dTI = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_TIP);
    const dTM = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.MIDDLE_TIP);
    return dTI < ctx.pinchDist * 1.2 && dTM < ctx.pinchDist * 1.2 ? 1.0 : 0;
  },
  priority: 1.2,
};

export const ASL_S_POSE: StaticPoseDefinition = {
  name: 'asl_s',
  category: 'asl',
  description: 'ASL letter S: tight fist with thumb crossed in front of fingers',
  fingers: {
    thumb: 'curled',
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
  },
  match: (ctx) => {
    // Thumb crosses over index/middle proximal phalanges
    const dThumbIndex = ctx.getDistance(JOINT_INDEX.THUMB_TIP, JOINT_INDEX.INDEX_INTERMEDIATE);
    return dThumbIndex < 0.04 ? 1.0 : 0;
  },
  priority: 1.05,
};

export const ASL_U_POSE: StaticPoseDefinition = {
  name: 'asl_u',
  category: 'asl',
  description: 'ASL letter U: index and middle fingers extended straight up touching each other',
  fingers: {
    index: 'extended',
    middle: 'extended',
    ring: 'curled',
    pinky: 'curled',
    thumb: 'curled',
  },
  match: (ctx) => {
    const tipDist = ctx.getDistance(JOINT_INDEX.INDEX_TIP, JOINT_INDEX.MIDDLE_TIP);
    return tipDist < 0.022 ? 1.0 : 0;
  },
  priority: 1.18,
};

export const ASL_V_POSE: StaticPoseDefinition = {
  name: 'asl_v',
  category: 'asl',
  description: 'ASL letter V: index and middle extended straight up spread in a V, others curled',
  fingers: {
    index: 'extended',
    middle: 'extended',
    ring: 'curled',
    pinky: 'curled',
    thumb: 'curled',
  },
  match: (ctx) => {
    const tipDist = ctx.getDistance(JOINT_INDEX.INDEX_TIP, JOINT_INDEX.MIDDLE_TIP);
    return tipDist >= 0.025 ? 1.0 : 0;
  },
  priority: 1.15,
};

export const ASL_W_POSE: StaticPoseDefinition = {
  name: 'asl_w',
  category: 'asl',
  description: 'ASL letter W: index, middle, ring extended spread apart forming W / 3',
  fingers: {
    index: 'extended',
    middle: 'extended',
    ring: 'extended',
    pinky: 'curled',
    thumb: 'curled',
  },
  priority: 1.15,
};

export const ASL_X_POSE: StaticPoseDefinition = {
  name: 'asl_x',
  category: 'asl',
  description: 'ASL letter X: index finger hooked (half-curled), others curled',
  fingers: {
    index: 'half_curled',
    middle: 'curled',
    ring: 'curled',
    pinky: 'curled',
    thumb: 'curled',
  },
  priority: 1.1,
};

export const ASL_Y_POSE: StaticPoseDefinition = {
  name: 'asl_y',
  category: 'asl',
  description: 'ASL letter Y: thumb and pinky extended outward, index/middle/ring curled',
  fingers: {
    thumb: 'extended',
    pinky: 'extended',
    index: 'curled',
    middle: 'curled',
    ring: 'curled',
  },
  priority: 1.15,
};

export const ASLStaticPosePack: StaticPoseDefinition[] = [
  ASL_A_POSE,
  ASL_B_POSE,
  ASL_C_POSE,
  ASL_D_POSE,
  ASL_E_POSE,
  ASL_F_POSE,
  ASL_G_POSE,
  ASL_H_POSE,
  ASL_I_POSE,
  ASL_K_POSE,
  ASL_L_POSE,
  ASL_O_POSE,
  ASL_S_POSE,
  ASL_U_POSE,
  ASL_V_POSE,
  ASL_W_POSE,
  ASL_X_POSE,
  ASL_Y_POSE,
];
