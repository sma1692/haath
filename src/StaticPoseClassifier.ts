// Static Hand Pose Classifier for haath v2 Compositional Pipeline
// Zero-dependency, zero-GC WebXR 25-joint rigid finger arrangement classifier.

import {
  CURL_DOT,
  DIRECTION_THRESHOLD,
  FLOATS_PER_JOINT,
  JOINT_COUNT,
  JOINT_INDEX,
  PINCH_DIST,
} from './constants.js';
import { v3Dist, v3Dot, v3Normalize, v3Sub } from './math/vec3.js';
import type { FingerExtensionState, Handedness } from './types.js';

export type FingerFlexion = 'extended' | 'curled' | 'half_curled';
export type FingerRequirement = 'extended' | 'curled' | 'half_curled' | 'any';

export interface SingleFingerAnalysis {
  extended: boolean;
  curled: boolean;
  halfCurled: boolean;
  curlScore: number; // 0.0 (fully curled) .. 1.0 (fully extended)
}

export interface HandFingerAnalysis {
  thumb: SingleFingerAnalysis;
  index: SingleFingerAnalysis;
  middle: SingleFingerAnalysis;
  ring: SingleFingerAnalysis;
  pinky: SingleFingerAnalysis;
  extensions: FingerExtensionState;
}

export interface PoseEvaluationContext {
  poses: Float32Array;
  frameOffset: number;
  handedness: Handedness;
  fingers: HandFingerAnalysis;
  pinchDist: number;
  directionThreshold: number;
  getJointPos: (jointIndex: number, out: Float32Array) => Float32Array;
  getDistance: (jointA: number, jointB: number) => number;
  getDirection: (fromJoint: number, toJoint: number, out: Float32Array) => Float32Array;
}

export interface StaticPoseDefinition {
  name: string;
  category?: 'core' | 'asl' | 'custom' | string;
  description?: string;
  fingers?: {
    thumb?: FingerRequirement;
    index?: FingerRequirement;
    middle?: FingerRequirement;
    ring?: FingerRequirement;
    pinky?: FingerRequirement;
  };
  // Returns confidence score in 0..1 (or boolean: true = 1.0, false = 0)
  match?: (ctx: PoseEvaluationContext) => number | boolean;
  priority?: number; // Higher values take precedence on tie/overlap (default 1.0)
}

export interface StaticPoseMatch {
  name: string;
  confidence: number;
  category?: string;
}

export interface StaticPoseClassifierOptions {
  poses?: StaticPoseDefinition[];
  minConfidence?: number;
  pinchDist?: number;
  directionThreshold?: number;
  curlDot?: number;
}

// Module-level pre-allocated scratch vectors for zero-GC evaluations
const _scratchV1 = new Float32Array(3);
const _scratchV2 = new Float32Array(3);
const _scratchV3 = new Float32Array(3);
const _scratchBone1 = new Float32Array(3);
const _scratchBone2 = new Float32Array(3);
const _scratchBone3 = new Float32Array(3);

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Evaluates 3-segment finger chain curl score:
 * Returns normalized score 0..1 (0 = fully curled into palm, 1 = collinear/extended).
 */
function evaluateChainCurl(
  poses: Float32Array,
  frameOffset: number,
  metaIdx: number,
  proxIdx: number,
  interIdx: number,
  tipIdx: number,
): number {
  const mOff = frameOffset + metaIdx * FLOATS_PER_JOINT;
  const pOff = frameOffset + proxIdx * FLOATS_PER_JOINT;
  const iOff = frameOffset + interIdx * FLOATS_PER_JOINT;
  const tOff = frameOffset + tipIdx * FLOATS_PER_JOINT;

  v3Sub(_scratchBone1, poses, poses, pOff, mOff);
  v3Normalize(_scratchBone1, _scratchBone1);

  v3Sub(_scratchBone2, poses, poses, iOff, pOff);
  v3Normalize(_scratchBone2, _scratchBone2);

  v3Sub(_scratchBone3, poses, poses, tOff, iOff);
  v3Normalize(_scratchBone3, _scratchBone3);

  const dot1 = v3Dot(_scratchBone1, _scratchBone2);
  const dot2 = v3Dot(_scratchBone2, _scratchBone3);

  const minDot = Math.min(dot1, dot2);
  return clamp01((minDot + 0.25) / 1.15);
}

/**
 * Scale-invariant anatomical thumb extension check.
 */
function evaluateThumbExtension(
  poses: Float32Array,
  frameOffset: number,
): SingleFingerAnalysis {
  const pinkyInterOff = frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT;
  const indexInterOff = frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const middleInterOff = frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;

  const dPalm = v3Dist(poses, poses, pinkyInterOff, indexInterOff);
  const dThumb = v3Dist(poses, poses, thumbTipOff, middleInterOff);

  const metaOff = frameOffset + JOINT_INDEX.THUMB_METACARPAL * FLOATS_PER_JOINT;
  const proxOff = frameOffset + JOINT_INDEX.THUMB_PROXIMAL * FLOATS_PER_JOINT;
  const distOff = frameOffset + JOINT_INDEX.THUMB_DISTAL * FLOATS_PER_JOINT;

  v3Sub(_scratchBone1, poses, poses, proxOff, metaOff);
  v3Normalize(_scratchBone1, _scratchBone1);

  v3Sub(_scratchBone2, poses, poses, distOff, proxOff);
  v3Normalize(_scratchBone2, _scratchBone2);

  v3Sub(_scratchBone3, poses, poses, thumbTipOff, distOff);
  v3Normalize(_scratchBone3, _scratchBone3);

  const dotAlign = Math.min(v3Dot(_scratchBone1, _scratchBone2), v3Dot(_scratchBone2, _scratchBone3));
  const spanRatio = dPalm > 0 ? dThumb / dPalm : 1.0;

  // Composite curl score: combines alignment and thumb clearance from middle knuckle
  const curlScore = clamp01(0.5 * spanRatio + 0.5 * clamp01((dotAlign + 0.2) / 1.1));

  const isExtended = dPalm > 0 && dThumb > dPalm && dotAlign > 0.45;
  const isCurled = dThumb < dPalm * 0.85 || dotAlign < 0.25;

  return {
    extended: isExtended,
    curled: isCurled,
    halfCurled: !isExtended && !isCurled,
    curlScore,
  };
}

/**
 * Analyzes curl and extension state across all 5 fingers for a single frame.
 */
export function analyzeFingers(
  poses: Float32Array,
  frameOffset = 0,
  curlDot = CURL_DOT,
): HandFingerAnalysis {
  const thumb = evaluateThumbExtension(poses, frameOffset);

  const indexScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.INDEX_METACARPAL,
    JOINT_INDEX.INDEX_PROXIMAL,
    JOINT_INDEX.INDEX_INTERMEDIATE,
    JOINT_INDEX.INDEX_TIP,
  );
  const middleScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.MIDDLE_METACARPAL,
    JOINT_INDEX.MIDDLE_PROXIMAL,
    JOINT_INDEX.MIDDLE_INTERMEDIATE,
    JOINT_INDEX.MIDDLE_TIP,
  );
  const ringScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.RING_METACARPAL,
    JOINT_INDEX.RING_PROXIMAL,
    JOINT_INDEX.RING_INTERMEDIATE,
    JOINT_INDEX.RING_TIP,
  );
  const pinkyScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.PINKY_METACARPAL,
    JOINT_INDEX.PINKY_PROXIMAL,
    JOINT_INDEX.PINKY_INTERMEDIATE,
    JOINT_INDEX.PINKY_TIP,
  );

  const index: SingleFingerAnalysis = {
    extended: indexScore >= 0.62,
    curled: indexScore <= 0.38,
    halfCurled: indexScore > 0.38 && indexScore < 0.62,
    curlScore: indexScore,
  };
  const middle: SingleFingerAnalysis = {
    extended: middleScore >= 0.62,
    curled: middleScore <= 0.38,
    halfCurled: middleScore > 0.38 && middleScore < 0.62,
    curlScore: middleScore,
  };
  const ring: SingleFingerAnalysis = {
    extended: ringScore >= 0.62,
    curled: ringScore <= 0.38,
    halfCurled: ringScore > 0.38 && ringScore < 0.62,
    curlScore: ringScore,
  };
  const pinky: SingleFingerAnalysis = {
    extended: pinkyScore >= 0.62,
    curled: pinkyScore <= 0.38,
    halfCurled: pinkyScore > 0.38 && pinkyScore < 0.62,
    curlScore: pinkyScore,
  };

  const count =
    (thumb.extended ? 1 : 0) +
    (index.extended ? 1 : 0) +
    (middle.extended ? 1 : 0) +
    (ring.extended ? 1 : 0) +
    (pinky.extended ? 1 : 0);

  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    extensions: {
      thumb: thumb.extended,
      index: index.extended,
      middle: middle.extended,
      ring: ring.extended,
      pinky: pinky.extended,
      count,
    },
  };
}

function matchRequirement(
  actual: SingleFingerAnalysis,
  req: FingerRequirement | undefined,
): { match: boolean; confidence: number } {
  if (!req || req === 'any') {
    return { match: true, confidence: 1.0 };
  }
  if (req === 'extended') {
    return {
      match: actual.extended,
      confidence: actual.curlScore,
    };
  }
  if (req === 'curled') {
    return {
      match: actual.curled,
      confidence: 1.0 - actual.curlScore,
    };
  }
  if (req === 'half_curled') {
    const distFromHalf = Math.abs(actual.curlScore - 0.5);
    const conf = Math.max(0, 1.0 - distFromHalf * 2.5);
    return {
      match: actual.halfCurled,
      confidence: conf,
    };
  }
  return { match: false, confidence: 0 };
}

/**
 * StaticPoseClassifier classifies rigid hand shapes against configured pose packs.
 * Zero external dependencies, pure TS math, and zero allocations during classification.
 */
export class StaticPoseClassifier {
  private readonly _poses: Map<string, StaticPoseDefinition> = new Map();
  private readonly _minConfidence: number;
  private readonly _pinchDist: number;
  private readonly _directionThreshold: number;
  private readonly _curlDot: number;

  constructor(options: StaticPoseClassifierOptions = {}) {
    this._minConfidence = options.minConfidence ?? 0.68;
    this._pinchDist = options.pinchDist ?? PINCH_DIST;
    this._directionThreshold = options.directionThreshold ?? DIRECTION_THRESHOLD;
    this._curlDot = options.curlDot ?? CURL_DOT;

    if (options.poses) {
      for (const pose of options.poses) {
        this.registerPose(pose);
      }
    }
  }

  registerPose(pose: StaticPoseDefinition): void {
    this._poses.set(pose.name, pose);
  }

  registerPack(pack: StaticPoseDefinition[]): void {
    for (const pose of pack) {
      this.registerPose(pose);
    }
  }

  unregisterPose(name: string): boolean {
    return this._poses.delete(name);
  }

  clear(): void {
    this._poses.clear();
  }

  getRegisteredPoses(): StaticPoseDefinition[] {
    return Array.from(this._poses.values());
  }

  /**
   * Evaluates all registered poses against the frame poses buffer and returns the single highest confidence match.
   */
  classify(
    poses: Float32Array,
    frameOffset = 0,
    handedness: Handedness = 'right',
  ): StaticPoseMatch | null {
    const matches = this.classifyAll(poses, frameOffset, handedness);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Evaluates all registered poses and returns matches above minConfidence, sorted by confidence * priority descending.
   */
  classifyAll(
    poses: Float32Array,
    frameOffset = 0,
    handedness: Handedness = 'right',
  ): StaticPoseMatch[] {
    if (!poses || poses.length < (frameOffset + JOINT_COUNT * FLOATS_PER_JOINT)) {
      return [];
    }

    const fingers = analyzeFingers(poses, frameOffset, this._curlDot);

    // Context helper functions bound to the current frame
    const ctx: PoseEvaluationContext = {
      poses,
      frameOffset,
      handedness,
      fingers,
      pinchDist: this._pinchDist,
      directionThreshold: this._directionThreshold,
      getJointPos: (jointIdx: number, out: Float32Array) => {
        const off = frameOffset + jointIdx * FLOATS_PER_JOINT;
        out[0] = poses[off];
        out[1] = poses[off + 1];
        out[2] = poses[off + 2];
        return out;
      },
      getDistance: (jointA: number, jointB: number) => {
        const offA = frameOffset + jointA * FLOATS_PER_JOINT;
        const offB = frameOffset + jointB * FLOATS_PER_JOINT;
        return v3Dist(poses, poses, offA, offB);
      },
      getDirection: (fromJoint: number, toJoint: number, out: Float32Array) => {
        const fromOff = frameOffset + fromJoint * FLOATS_PER_JOINT;
        const toOff = frameOffset + toJoint * FLOATS_PER_JOINT;
        v3Sub(out, poses, poses, toOff, fromOff);
        return v3Normalize(out, out);
      },
    };

    const results: StaticPoseMatch[] = [];

    for (const def of Array.from(this._poses.values())) {
      let fingerScore = 1.0;
      let fingerMatches = true;

      if (def.fingers) {
        const tMatch = matchRequirement(fingers.thumb, def.fingers.thumb);
        const iMatch = matchRequirement(fingers.index, def.fingers.index);
        const mMatch = matchRequirement(fingers.middle, def.fingers.middle);
        const rMatch = matchRequirement(fingers.ring, def.fingers.ring);
        const pMatch = matchRequirement(fingers.pinky, def.fingers.pinky);

        if (!tMatch.match || !iMatch.match || !mMatch.match || !rMatch.match || !pMatch.match) {
          fingerMatches = false;
        } else {
          fingerScore = (tMatch.confidence + iMatch.confidence + mMatch.confidence + rMatch.confidence + pMatch.confidence) / 5.0;
        }
      }

      if (!fingerMatches) {
        continue;
      }

      let customScore = 1.0;
      if (def.match) {
        const res = def.match(ctx);
        if (typeof res === 'boolean') {
          if (!res) continue;
          customScore = 1.0;
        } else if (typeof res === 'number') {
          if (res <= 0) continue;
          customScore = clamp01(res);
        }
      }

      const totalConfidence = def.fingers && def.match
        ? 0.5 * fingerScore + 0.5 * customScore
        : def.match
        ? customScore
        : fingerScore;

      if (totalConfidence >= this._minConfidence) {
        results.push({
          name: def.name,
          confidence: totalConfidence,
          category: def.category,
        });
      }
    }

    // Sort by weighted confidence * priority descending
    results.sort((a, b) => {
      const defA = this._poses.get(a.name);
      const defB = this._poses.get(b.name);
      const prioA = defA?.priority ?? 1.0;
      const prioB = defB?.priority ?? 1.0;
      return (b.confidence * prioB) - (a.confidence * prioA);
    });

    return results;
  }

  isPose(
    name: string,
    poses: Float32Array,
    frameOffset = 0,
    handedness: Handedness = 'right',
  ): boolean {
    const match = this.classify(poses, frameOffset, handedness);
    return match !== null && match.name === name;
  }

  getConfidence(
    name: string,
    poses: Float32Array,
    frameOffset = 0,
    handedness: Handedness = 'right',
  ): number {
    const matches = this.classifyAll(poses, frameOffset, handedness);
    const found = matches.find((m) => m.name === name);
    return found ? found.confidence : 0;
  }
}
