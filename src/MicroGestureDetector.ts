// Micro-gesture detection engine for localized joint interactions
// Detects:
// - money_rub (oscillating friction between thumb and index/middle tips)
// - thumb_index_tap and thumb_index_double_tap (discrete contact impacts & timing)
// - thumb_slide (longitudinal stroke along the index finger axis)
// - finger_flick (ballistic release from thumb hold)
// - finger_snap (rapid shear release from thumb into palm impact)

import { FLOATS_PER_JOINT, JOINT_INDEX } from './constants.js';
import { v3Dist, v3Dot, v3Len, v3Normalize, v3Sub } from './math/vec3.js';

export type MicroGestureType =
  | 'none'
  | 'money_rub'
  | 'thumb_index_tap'
  | 'thumb_index_double_tap'
  | 'thumb_slide'
  | 'finger_flick'
  | 'finger_snap';

export interface MoneyRubState {
  active: boolean;
  rubCount: number;
  reversals: number;
  intensity: number; // 0..1 based on frequency and stroke distance
}

export interface ThumbIndexTapState {
  tapped: boolean; // True on exact frame of contact impact
  doubleTapped: boolean; // True on second tap within doubleTap window
  tapCount: number;
  lastTapTimeMs: number;
  contactDistance: number;
}

export interface ThumbSlideState {
  active: boolean;
  direction: 'proximal_to_distal' | 'distal_to_proximal' | 'none';
  displacement: number; // Total distance traveled along index axis in current stroke (meters)
  velocity: number; // Sliding velocity (m/s, positive = towards tip)
  progress: number; // Normalized position along index finger (0=proximal, 1=tip)
}

export interface FingerFlickState {
  triggered: boolean; // True on exact frame ballistic extension fires
  finger: 'index' | 'middle' | 'none';
  speed: number; // Ballistic opening speed (m/s)
}

export interface FingerSnapState {
  triggered: boolean; // True on frame of release + palm impact closure
  finger: 'middle' | 'index' | 'none';
  intensity: number; // 0..1 based on release velocity
  speed: number;
}

export interface MicroGestureState {
  active: MicroGestureType;
  moneyRub: MoneyRubState;
  thumbIndexTap: ThumbIndexTapState;
  thumbSlide: ThumbSlideState;
  fingerFlick: FingerFlickState;
  fingerSnap: FingerSnapState;
}

export interface MicroGestureConfig {
  // Tap thresholds
  tapContactDist?: number; // Distance in meters considered in contact (default 0.022)
  tapSeparationDist?: number; // Distance in meters considered separated (default 0.035)
  doubleTapMinMs?: number; // Min duration for double tap (default 50)
  doubleTapMaxMs?: number; // Max duration for double tap (default 450)

  // Thumb slide thresholds
  slideContactDist?: number; // Max distance to index finger axis to be in slide (default 0.028)
  slideMinDisplacement?: number; // Min stroke length along index axis to activate (default 0.015)
  slideMinVelocity?: number; // Min velocity along axis to be active (default 0.03 m/s)

  // Money rub thresholds
  rubContactDist?: number; // Proximity required between thumb and index/middle tip (default 0.028)
  rubWindowMs?: number; // Rolling time window for oscillation counting (default 750)
  rubMinReversals?: number; // Reversals required in window to activate (default 3)
  rubMinStrokeDist?: number; // Min amplitude of each stroke before reversal (default 0.005)

  // Finger flick thresholds
  flickHoldDist?: number; // Max distance between finger tip and thumb tip while loaded (default 0.025)
  flickMinHoldFrames?: number; // Minimum frames loaded before flick release (default 2)
  flickReleaseSpeed?: number; // Radial separation speed threshold (default 0.75 m/s)
  flickExtensionSpeed?: number; // Tip-to-wrist expansion speed threshold (default 0.35 m/s)

  // Finger snap thresholds
  snapPreLoadDist?: number; // Proximity required between thumb and middle tip while loaded (default 0.025)
  snapMinHoldFrames?: number; // Minimum frames loaded before snap release (default 2)
  snapReleaseSpeed?: number; // Relative separation speed between thumb and middle (default 0.80 m/s)
  snapPalmImpactDist?: number; // Proximity to palm considered palm impact (default 0.045)
  snapPalmApproachSpeed?: number; // Velocity approaching palm (default 0.40 m/s)
}

export const DEFAULT_MICRO_GESTURE_CONFIG: Required<MicroGestureConfig> = {
  tapContactDist: 0.022,
  tapSeparationDist: 0.035,
  doubleTapMinMs: 50,
  doubleTapMaxMs: 450,

  slideContactDist: 0.028,
  slideMinDisplacement: 0.015,
  slideMinVelocity: 0.03,

  rubContactDist: 0.028,
  rubWindowMs: 750,
  rubMinReversals: 3,
  rubMinStrokeDist: 0.005,

  flickHoldDist: 0.025,
  flickMinHoldFrames: 2,
  flickReleaseSpeed: 0.75,
  flickExtensionSpeed: 0.35,

  snapPreLoadDist: 0.025,
  snapMinHoldFrames: 2,
  snapReleaseSpeed: 0.80,
  snapPalmImpactDist: 0.045,
  snapPalmApproachSpeed: 0.40,
};

export function createMicroGestureState(): MicroGestureState {
  return {
    active: 'none',
    moneyRub: {
      active: false,
      rubCount: 0,
      reversals: 0,
      intensity: 0,
    },
    thumbIndexTap: {
      tapped: false,
      doubleTapped: false,
      tapCount: 0,
      lastTapTimeMs: 0,
      contactDistance: 0,
    },
    thumbSlide: {
      active: false,
      direction: 'none',
      displacement: 0,
      velocity: 0,
      progress: 0,
    },
    fingerFlick: {
      triggered: false,
      finger: 'none',
      speed: 0,
    },
    fingerSnap: {
      triggered: false,
      finger: 'none',
      intensity: 0,
      speed: 0,
    },
  };
}

interface ReversalRecord {
  timeMs: number;
  dist: number;
}

/**
 * Stateful micro-gesture detector evaluating fine-grained joint kinematics:
 * money rub, thumb-index tap/double-tap, thumb slide, finger flick, and finger snap.
 * Zero heap allocations during update loop.
 */
export class MicroGestureDetector {
  private readonly _config: Required<MicroGestureConfig>;
  public readonly state: MicroGestureState = createMicroGestureState();

  // Scratch vectors for zero-allocation math
  private readonly _vTemp1 = new Float32Array(3);
  private readonly _vTemp2 = new Float32Array(3);
  private readonly _vDir = new Float32Array(3);
  private readonly _vRel = new Float32Array(3);
  private readonly _vPrevRel = new Float32Array(3);
  private readonly _rubStrokeAcc = new Float32Array(3);
  private readonly _palmPos = new Float32Array(3);

  // Thumb-index tap state
  private _tapInContact = false;
  private _lastTapTimeMs = 0;

  // Thumb slide state
  private _slideTracking = false;
  private _lastSlideProj = 0;
  private _slideDirSign = 0;
  private _accumulatedSlideDisplacement = 0;

  // Money rub state
  private _hasPrevRel = false;
  private _rubReversals: ReversalRecord[] = [];
  private _lastRubContactMs = 0;

  // Finger flick state
  private _flickHoldFramesIndex = 0;
  private _flickHoldFramesMiddle = 0;
  private _prevFlickThumbDistIndex = 0;
  private _prevFlickWristDistIndex = 0;
  private _prevFlickThumbDistMiddle = 0;
  private _prevFlickWristDistMiddle = 0;

  // Finger snap state
  private _snapHoldFramesMiddle = 0;
  private _snapHoldFramesIndex = 0;
  private _prevSnapThumbDistMiddle = 0;
  private _prevSnapPalmDistMiddle = 0;
  private _prevSnapThumbDistIndex = 0;
  private _prevSnapPalmDistIndex = 0;

  constructor(config: MicroGestureConfig = {}) {
    this._config = {
      ...DEFAULT_MICRO_GESTURE_CONFIG,
      ...config,
    };
  }

  reset(): void {
    const s = this.state;
    s.active = 'none';

    s.moneyRub.active = false;
    s.moneyRub.rubCount = 0;
    s.moneyRub.reversals = 0;
    s.moneyRub.intensity = 0;

    s.thumbIndexTap.tapped = false;
    s.thumbIndexTap.doubleTapped = false;
    s.thumbIndexTap.tapCount = 0;
    s.thumbIndexTap.lastTapTimeMs = 0;
    s.thumbIndexTap.contactDistance = 0;

    s.thumbSlide.active = false;
    s.thumbSlide.direction = 'none';
    s.thumbSlide.displacement = 0;
    s.thumbSlide.velocity = 0;
    s.thumbSlide.progress = 0;

    s.fingerFlick.triggered = false;
    s.fingerFlick.finger = 'none';
    s.fingerFlick.speed = 0;

    s.fingerSnap.triggered = false;
    s.fingerSnap.finger = 'none';
    s.fingerSnap.intensity = 0;
    s.fingerSnap.speed = 0;

    this._tapInContact = false;
    this._lastTapTimeMs = 0;

    this._slideTracking = false;
    this._lastSlideProj = 0;
    this._slideDirSign = 0;
    this._accumulatedSlideDisplacement = 0;

    this._hasPrevRel = false;
    this._rubReversals.length = 0;
    this._lastRubContactMs = 0;
    this._rubStrokeAcc.fill(0);

    this._flickHoldFramesIndex = 0;
    this._flickHoldFramesMiddle = 0;
    this._prevFlickThumbDistIndex = 0;
    this._prevFlickWristDistIndex = 0;
    this._prevFlickThumbDistMiddle = 0;
    this._prevFlickWristDistMiddle = 0;

    this._snapHoldFramesMiddle = 0;
    this._snapHoldFramesIndex = 0;
    this._prevSnapThumbDistMiddle = 0;
    this._prevSnapPalmDistMiddle = 0;
    this._prevSnapThumbDistIndex = 0;
    this._prevSnapPalmDistIndex = 0;
  }

  /**
   * Updates micro-gesture evaluation from a 25-joint XR poses buffer.
   * @param poses Float32Array containing 25-joint pose data.
   * @param frameOffset Starting float offset in poses buffer (default 0).
   * @param deltaSeconds Time elapsed since last frame in seconds (default 1/60).
   * @param nowMs Current monotonic timestamp in milliseconds.
   * @param stride Floats per joint in buffer (default FLOATS_PER_JOINT = 7).
   */
  update(
    poses: Float32Array,
    frameOffset = 0,
    deltaSeconds = 1 / 60,
    nowMs: number = typeof performance !== 'undefined' ? performance.now() : Date.now(),
    stride = FLOATS_PER_JOINT,
  ): MicroGestureState {
    const cfg = this._config;
    const s = this.state;

    // Reset frame-pulse triggers
    s.thumbIndexTap.tapped = false;
    s.thumbIndexTap.doubleTapped = false;
    s.fingerFlick.triggered = false;
    s.fingerFlick.finger = 'none';
    s.fingerFlick.speed = 0;
    s.fingerSnap.triggered = false;
    s.fingerSnap.finger = 'none';
    s.fingerSnap.intensity = 0;
    s.fingerSnap.speed = 0;

    // Joint offsets
    const wristOff = frameOffset + JOINT_INDEX.WRIST * stride;
    const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * stride;
    const indexProxOff = frameOffset + JOINT_INDEX.INDEX_PROXIMAL * stride;
    const indexTipOff = frameOffset + JOINT_INDEX.INDEX_TIP * stride;
    const middleProxOff = frameOffset + JOINT_INDEX.MIDDLE_PROXIMAL * stride;
    const middleTipOff = frameOffset + JOINT_INDEX.MIDDLE_TIP * stride;

    // Palm anchor: midpoint between wrist and index proximal
    this._palmPos[0] = (poses[wristOff] + poses[indexProxOff]) * 0.5;
    this._palmPos[1] = (poses[wristOff + 1] + poses[indexProxOff + 1]) * 0.5;
    this._palmPos[2] = (poses[wristOff + 2] + poses[indexProxOff + 2]) * 0.5;

    // -------------------------------------------------------------
    // 1. THUMB-INDEX TAP & DOUBLE TAP
    // -------------------------------------------------------------
    const dThumbIndex = v3Dist(poses, poses, thumbTipOff, indexTipOff);
    s.thumbIndexTap.contactDistance = dThumbIndex;

    if (dThumbIndex < cfg.tapContactDist) {
      if (!this._tapInContact) {
        this._tapInContact = true;
        s.thumbIndexTap.tapped = true;
        const elapsed = nowMs - this._lastTapTimeMs;
        if (elapsed >= cfg.doubleTapMinMs && elapsed <= cfg.doubleTapMaxMs) {
          s.thumbIndexTap.doubleTapped = true;
          s.thumbIndexTap.tapCount++;
        } else {
          s.thumbIndexTap.doubleTapped = false;
          s.thumbIndexTap.tapCount++;
        }
        this._lastTapTimeMs = nowMs;
        s.thumbIndexTap.lastTapTimeMs = nowMs;
      }
    } else if (dThumbIndex > cfg.tapSeparationDist) {
      this._tapInContact = false;
    }

    // -------------------------------------------------------------
    // 2. THUMB SLIDE ALONG INDEX FINGER
    // -------------------------------------------------------------
    // Axis vector from index proximal to index tip
    v3Sub(this._vDir, poses, poses, indexTipOff, indexProxOff);
    const indexAxisLen = v3Len(this._vDir);

    if (indexAxisLen > 0.005) {
      v3Normalize(this._vDir, this._vDir);
      v3Sub(this._vTemp1, poses, poses, thumbTipOff, indexProxOff);
      const proj = v3Dot(this._vTemp1, this._vDir);

      // Perpendicular vector component
      this._vTemp2[0] = this._vTemp1[0] - proj * this._vDir[0];
      this._vTemp2[1] = this._vTemp1[1] - proj * this._vDir[1];
      this._vTemp2[2] = this._vTemp1[2] - proj * this._vDir[2];
      const perpDist = v3Len(this._vTemp2);

      const inSlideProximity =
        perpDist < cfg.slideContactDist &&
        proj > -0.015 &&
        proj < indexAxisLen + 0.02;

      const progress = Math.max(0, Math.min(1, proj / indexAxisLen));
      s.thumbSlide.progress = progress;

      if (inSlideProximity) {
        if (this._slideTracking) {
          const dProj = proj - this._lastSlideProj;
          const vSlide = deltaSeconds > 0 ? dProj / deltaSeconds : 0;

          if (Math.abs(dProj) > 0.0004) {
            const dirSign = Math.sign(dProj);
            if (this._slideDirSign === 0 || dirSign === this._slideDirSign) {
              this._slideDirSign = dirSign;
              this._accumulatedSlideDisplacement += Math.abs(dProj);
            } else {
              this._slideDirSign = dirSign;
              this._accumulatedSlideDisplacement = Math.abs(dProj);
            }
          }

          s.thumbSlide.displacement = this._accumulatedSlideDisplacement;
          s.thumbSlide.velocity = vSlide;

          if (
            this._accumulatedSlideDisplacement >= cfg.slideMinDisplacement &&
            Math.abs(vSlide) >= cfg.slideMinVelocity
          ) {
            s.thumbSlide.active = true;
            s.thumbSlide.direction =
              this._slideDirSign > 0 ? 'proximal_to_distal' : 'distal_to_proximal';
          } else {
            s.thumbSlide.active = false;
            s.thumbSlide.direction = 'none';
          }
        } else {
          this._slideTracking = true;
          this._slideDirSign = 0;
          this._accumulatedSlideDisplacement = 0;
          s.thumbSlide.active = false;
          s.thumbSlide.direction = 'none';
          s.thumbSlide.displacement = 0;
          s.thumbSlide.velocity = 0;
        }
        this._lastSlideProj = proj;
      } else {
        this._slideTracking = false;
        this._slideDirSign = 0;
        this._accumulatedSlideDisplacement = 0;
        s.thumbSlide.active = false;
        s.thumbSlide.direction = 'none';
        s.thumbSlide.displacement = 0;
        s.thumbSlide.velocity = 0;
      }
    } else {
      this._slideTracking = false;
      s.thumbSlide.active = false;
      s.thumbSlide.direction = 'none';
      s.thumbSlide.displacement = 0;
      s.thumbSlide.velocity = 0;
      s.thumbSlide.progress = 0;
    }

    // -------------------------------------------------------------
    // 3. MONEY RUB (THUMB OSCILLATING ON INDEX / MIDDLE TIPS)
    // -------------------------------------------------------------
    const dThumbMiddle = v3Dist(poses, poses, thumbTipOff, middleTipOff);
    const inRubRange = dThumbIndex < cfg.rubContactDist || dThumbMiddle < cfg.rubContactDist;

    // Relative displacement vector of thumb tip with respect to index tip
    v3Sub(this._vRel, poses, poses, thumbTipOff, indexTipOff);

    if (inRubRange) {
      this._lastRubContactMs = nowMs;
      if (this._hasPrevRel) {
        this._vTemp1[0] = this._vRel[0] - this._vPrevRel[0];
        this._vTemp1[1] = this._vRel[1] - this._vPrevRel[1];
        this._vTemp1[2] = this._vRel[2] - this._vPrevRel[2];

        const stepLen = v3Len(this._vTemp1);
        const strokeLen = v3Len(this._rubStrokeAcc);

        if (stepLen > 0.0004) {
          const strokeDot =
            strokeLen > 1e-4
              ? v3Dot(this._vTemp1, this._rubStrokeAcc) / (stepLen * strokeLen)
              : 1;

          if (strokeDot < -0.2 && strokeLen >= cfg.rubMinStrokeDist) {
            // Reversal of motion detected
            this._rubReversals.push({ timeMs: nowMs, dist: strokeLen });
            this._rubStrokeAcc[0] = this._vTemp1[0];
            this._rubStrokeAcc[1] = this._vTemp1[1];
            this._rubStrokeAcc[2] = this._vTemp1[2];
          } else {
            this._rubStrokeAcc[0] += this._vTemp1[0];
            this._rubStrokeAcc[1] += this._vTemp1[1];
            this._rubStrokeAcc[2] += this._vTemp1[2];
          }
        }
      } else {
        this._hasPrevRel = true;
        this._rubStrokeAcc.fill(0);
      }
      this._vPrevRel[0] = this._vRel[0];
      this._vPrevRel[1] = this._vRel[1];
      this._vPrevRel[2] = this._vRel[2];
    } else {
      if (nowMs - this._lastRubContactMs > 250) {
        this._hasPrevRel = false;
        this._rubReversals.length = 0;
        this._rubStrokeAcc.fill(0);
      }
    }

    // Prune stale reversals outside the time window
    const rubCutoff = nowMs - cfg.rubWindowMs;
    while (this._rubReversals.length > 0 && this._rubReversals[0].timeMs < rubCutoff) {
      this._rubReversals.shift();
    }

    const revCount = this._rubReversals.length;
    s.moneyRub.reversals = revCount;
    if (revCount >= cfg.rubMinReversals) {
      s.moneyRub.active = true;
      s.moneyRub.rubCount = Math.floor(revCount / 2);
      let totalDist = 0;
      for (let i = 0; i < revCount; i++) {
        totalDist += this._rubReversals[i].dist;
      }
      const avgDist = totalDist / revCount;
      s.moneyRub.intensity = Math.min(1, Math.max(0, (revCount / 6) * (avgDist / 0.007)));
    } else {
      s.moneyRub.active = false;
      s.moneyRub.intensity = 0;
    }

    // -------------------------------------------------------------
    // 4. FINGER FLICK (BALLISTIC EXTENSION AFTER THUMB HOLD)
    // -------------------------------------------------------------
    // Evaluate index finger
    const dIndexWrist = v3Dist(poses, poses, indexTipOff, wristOff);
    const isIndexHeld = dThumbIndex < cfg.flickHoldDist;

    if (isIndexHeld) {
      this._flickHoldFramesIndex++;
    } else {
      if (this._flickHoldFramesIndex >= cfg.flickMinHoldFrames && deltaSeconds > 0) {
        const vSep = (dThumbIndex - this._prevFlickThumbDistIndex) / deltaSeconds;
        const vExt = (dIndexWrist - this._prevFlickWristDistIndex) / deltaSeconds;

        if (vSep >= cfg.flickReleaseSpeed && vExt >= cfg.flickExtensionSpeed) {
          s.fingerFlick.triggered = true;
          s.fingerFlick.finger = 'index';
          s.fingerFlick.speed = Math.max(vSep, vExt);
        }
      }
      this._flickHoldFramesIndex = 0;
    }
    this._prevFlickThumbDistIndex = dThumbIndex;
    this._prevFlickWristDistIndex = dIndexWrist;

    // Evaluate middle finger flick if index didn't trigger
    const dMiddleWrist = v3Dist(poses, poses, middleTipOff, wristOff);
    const isMiddleHeld = dThumbMiddle < cfg.flickHoldDist;

    if (isMiddleHeld) {
      this._flickHoldFramesMiddle++;
    } else {
      if (
        !s.fingerFlick.triggered &&
        this._flickHoldFramesMiddle >= cfg.flickMinHoldFrames &&
        deltaSeconds > 0
      ) {
        const vSep = (dThumbMiddle - this._prevFlickThumbDistMiddle) / deltaSeconds;
        const vExt = (dMiddleWrist - this._prevFlickWristDistMiddle) / deltaSeconds;

        if (vSep >= cfg.flickReleaseSpeed && vExt >= cfg.flickExtensionSpeed) {
          s.fingerFlick.triggered = true;
          s.fingerFlick.finger = 'middle';
          s.fingerFlick.speed = Math.max(vSep, vExt);
        }
      }
      this._flickHoldFramesMiddle = 0;
    }
    this._prevFlickThumbDistMiddle = dThumbMiddle;
    this._prevFlickWristDistMiddle = dMiddleWrist;

    // -------------------------------------------------------------
    // 5. FINGER SNAP (RAPID SHEAR RELEASE + PALM IMPACT CLOSURE)
    // -------------------------------------------------------------
    // Evaluate middle finger snap (standard anatomy)
    const dMiddlePalm = v3Dist(poses, this._palmPos, middleTipOff, 0);
    const isMiddleSnapPreLoaded =
      dThumbMiddle < cfg.snapPreLoadDist && dMiddlePalm > cfg.snapPalmImpactDist;

    if (isMiddleSnapPreLoaded) {
      this._snapHoldFramesMiddle++;
    } else {
      if (this._snapHoldFramesMiddle >= cfg.snapMinHoldFrames && deltaSeconds > 0) {
        const vSep = (dThumbMiddle - this._prevSnapThumbDistMiddle) / deltaSeconds;
        const vPalmApproach = (this._prevSnapPalmDistMiddle - dMiddlePalm) / deltaSeconds;

        if (
          vSep >= cfg.snapReleaseSpeed &&
          (vPalmApproach >= cfg.snapPalmApproachSpeed || dMiddlePalm <= cfg.snapPalmImpactDist)
        ) {
          s.fingerSnap.triggered = true;
          s.fingerSnap.finger = 'middle';
          s.fingerSnap.speed = vSep;
          s.fingerSnap.intensity = Math.min(1, Math.max(0, (vSep - 0.4) / 1.6));
        }
      }
      if (dThumbMiddle > cfg.snapPreLoadDist * 1.5) {
        this._snapHoldFramesMiddle = 0;
      }
    }
    this._prevSnapThumbDistMiddle = dThumbMiddle;
    this._prevSnapPalmDistMiddle = dMiddlePalm;

    // Evaluate index finger snap if middle did not trigger
    const dIndexPalm = v3Dist(poses, this._palmPos, indexTipOff, 0);
    const isIndexSnapPreLoaded =
      dThumbIndex < cfg.snapPreLoadDist && dIndexPalm > cfg.snapPalmImpactDist;

    if (isIndexSnapPreLoaded) {
      this._snapHoldFramesIndex++;
    } else {
      if (
        !s.fingerSnap.triggered &&
        this._snapHoldFramesIndex >= cfg.snapMinHoldFrames &&
        deltaSeconds > 0
      ) {
        const vSep = (dThumbIndex - this._prevSnapThumbDistIndex) / deltaSeconds;
        const vPalmApproach = (this._prevSnapPalmDistIndex - dIndexPalm) / deltaSeconds;

        if (
          vSep >= cfg.snapReleaseSpeed &&
          (vPalmApproach >= cfg.snapPalmApproachSpeed || dIndexPalm <= cfg.snapPalmImpactDist)
        ) {
          s.fingerSnap.triggered = true;
          s.fingerSnap.finger = 'index';
          s.fingerSnap.speed = vSep;
          s.fingerSnap.intensity = Math.min(1, Math.max(0, (vSep - 0.4) / 1.6));
        }
      }
      if (dThumbIndex > cfg.snapPreLoadDist * 1.5) {
        this._snapHoldFramesIndex = 0;
      }
    }
    this._prevSnapThumbDistIndex = dThumbIndex;
    this._prevSnapPalmDistIndex = dIndexPalm;

    // -------------------------------------------------------------
    // PRIMARY ACTIVE GESTURE RESOLUTION
    // -------------------------------------------------------------
    if (s.fingerSnap.triggered) {
      s.active = 'finger_snap';
    } else if (s.fingerFlick.triggered) {
      s.active = 'finger_flick';
    } else if (s.thumbIndexTap.doubleTapped) {
      s.active = 'thumb_index_double_tap';
    } else if (s.thumbIndexTap.tapped) {
      s.active = 'thumb_index_tap';
    } else if (s.moneyRub.active) {
      s.active = 'money_rub';
    } else if (s.thumbSlide.active) {
      s.active = 'thumb_slide';
    } else {
      s.active = 'none';
    }

    return s;
  }
}
