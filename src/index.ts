// Public API barrel & Haath orchestrator class
// Zero-dependency, zero-GC WebXR 25-joint hand kinematics, combat strike, and 3D gesture engine.

import {
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
  CLAP_CONTACT_DIST,
  CLAP_DOUBLE_MAX_MS,
  CLAP_PALM_OPPOSE_DOT,
  CLAP_FACING_TOLERANCE_FRAMES,
  CLAP_DOUBLE_MIN_MS,
  CLAP_ORIGIN_MIN_DIST,
  CLAP_SEPARATION_DIST,
  COLLISION_DURATION,
  CURL_DOT,
  DIRECTION_THRESHOLD,
  DISC_FIRE_COOLDOWN_MS,
  FINGEROPEN,
  FLOATS_PER_JOINT,
  HOLD_COOLDOWN_MS,
  HOLD_COUNT_STABILITY_FRAMES,
  HOLD_DEFAULT_DURATION_MS,
  HOLD_SIGN_STABILITY_FRAMES,
  HOLD_NAV_DURATION_MS,
  HOLD_COUNT_DURATION_MS,
  HOLD_PAUSE_DURATION_MS,
  HOLD_SIGN_STABILITY_MS,
  SIGN_CURL_ENTER_MAX_RATIO,
  SIGN_EXTEND_ENTER_MIN_RATIO,
  THUMBS_ENTER_ALIGN_MIN_DOT,
  THUMBS_ENTER_DIRECTION_THRESHOLD,
  THUMBS_ENTER_THUMB_OUT_RATIO,
  GUN_TUCK_ENTER_MAX_RATIO,
  GUN_INDEX_LEAD_RATIO,
  PEACE_ENTER_MIN_SPREAD_DEG,
  JOINT_COUNT,
  JOINT_INDEX,
  MIN_ANATOMICAL_BONE_LENGTH,
  PALM_COLLIDER_RADIUS,
  WRIST_COLLIDER_RADIUS,
  FINGERTIP_COLLIDER_RADIUS,
  HAND_CONTACT_MODES,
  PHALANGES,
  PINCH_DIST,
  POS_HISTORY_COUNT,
  PUNCH_SPEED,
  SLAP_SPEED,
  STRIKE_LATCH_MS,
  SPELL_CONFIG,
  SWIPE_AXIS_DOMINANCE,
  SWIPE_COOLDOWN_MS,
  SWIPE_MAX_FINGER_DOT,
  SWIPE_MIN_DIST,
  SWIPE_POSE_GRACE_FRAMES,
  SWIPE_SAMPLE_CAPACITY,
  SWIPE_TIP_GAP,
  SWIPE_WINDOW_MS,
  THUMBOPEN,
  TRIANGLE_FINGER_DOT,
  TRIANGLE_THUMB_DIST,
  TRIANGLE_TIP_DIST,
  XR_HAND_JOINTS,
} from './constants.js';
import {
  CollisionCooldownTracker,
  cylinderSphere,
  discSphere,
  intersectDiscSphere,
  intersectLaserSphere,
  intersectSphereSphere,
  sphereSphere,
  testHandSphereCollision,
  type HandSphereTestOptions,
} from './math/colliders.js';
import {
  add,
  cross,
  dist,
  distSq,
  dot,
  hypot,
  normalize,
  scale,
  sub,
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
} from './math/vec3.js';
import { HoldRecognizer } from './recognizers/hold.js';
import {
  classifyHandSign,
  createSingleHandState,
  evaluateFingerExtensions,
  isFingerExtendedCurl,
  isHandAnatomicallyValid,
  isThumbReallyOut,
  isThumbsShape,
  isPeaceShape,
  isOneFingerGunShape,
  isFistFamily,
  isOpenFamily,
  promoteStrikeGesture,
  SingleHandRecognizer,
} from './recognizers/singleHand.js';
import { CircleTrajectoryRecognizer } from './recognizers/trajectory.js';
import { createSwipeState, isTwoFingerBrushPose, TwoFingerSwipeRecognizer } from './recognizers/swipe.js';
import type { TwoFingerSwipeConfig } from './recognizers/swipe.js';
import {
  createTwoHandState,
  evaluateBlastFromPoses,
  evaluateTriangleFromPoses,
  TwoHandRecognizer,
} from './recognizers/twoHand.js';
import type {
  ActiveGesture,
  BlastResult,
  BlastState,
  CircleResult,
  CircleState,
  ClapState,
  CurlState,
  FingerExtensionState,
  HaathConfig,
  HaathFrameState,
  HaathUpdateResult,
  Handedness,
  HandPoseInput,
  HandSide,
  HandSign,
  HandState,
  HandContactMode,
  HandContactPart,
  HoldConfig,
  HoldState,
  JointName,
  JointPoseData,
  Quat,
  SingleHandState,
  SpellArchetype,
  StrikeResult,
  StrikeType,
  SwipeState,
  TriangleResult,
  TriangleState,
  TwoFingerSwipeDirection,
  TwoHandState,
  Vec3,
} from './types.js';

const FRAME_STRIDE = JOINT_COUNT * FLOATS_PER_JOINT; // 175 floats

export class Haath {
  private readonly _config: Required<HaathConfig>;
  private readonly _left: SingleHandRecognizer;
  private readonly _right: SingleHandRecognizer;
  private readonly _twoHand: TwoHandRecognizer;
  private readonly _stagingSlot = new Float32Array(FRAME_STRIDE);
  // Horizontal head-right basis for two-finger swipe left/right (auto-updated from the viewer pose in update())
  private readonly _headRight = new Float32Array([1, 0, 0]);

  public readonly state: HaathFrameState;

  constructor(config: HaathConfig = {}) {
    this._config = {
      minBoneLength: config.minBoneLength ?? MIN_ANATOMICAL_BONE_LENGTH,
      useCurlDetection: config.useCurlDetection ?? true,
      curlDot: config.curlDot ?? CURL_DOT,
      thumbOpenDist: config.thumbOpenDist ?? THUMBOPEN,
      fingerOpenDist: config.fingerOpenDist ?? FINGEROPEN,
      directionThreshold: config.directionThreshold ?? DIRECTION_THRESHOLD,
      pinchDist: config.pinchDist ?? PINCH_DIST,
      punchSpeed: config.punchSpeed ?? PUNCH_SPEED,
      slapSpeed: config.slapSpeed ?? SLAP_SPEED,
      strikeLatchMs: config.strikeLatchMs ?? STRIKE_LATCH_MS,
      triangleTipDist: config.triangleTipDist ?? TRIANGLE_TIP_DIST,
      triangleThumbDist: config.triangleThumbDist ?? TRIANGLE_THUMB_DIST,
      triangleFingerDot: config.triangleFingerDot ?? TRIANGLE_FINGER_DOT,
      clapOriginMinDist: config.clapOriginMinDist ?? CLAP_ORIGIN_MIN_DIST,
      clapContactDist: config.clapContactDist ?? CLAP_CONTACT_DIST,
      clapSeparationDist: config.clapSeparationDist ?? CLAP_SEPARATION_DIST,
      clapDoubleMinMs: config.clapDoubleMinMs ?? CLAP_DOUBLE_MIN_MS,
      clapDoubleMaxMs: config.clapDoubleMaxMs ?? CLAP_DOUBLE_MAX_MS,
      clapPalmOpposeDot: config.clapPalmOpposeDot ?? CLAP_PALM_OPPOSE_DOT,
      clapFacingToleranceFrames: config.clapFacingToleranceFrames ?? CLAP_FACING_TOLERANCE_FRAMES,
      circleHistoryFrames: config.circleHistoryFrames ?? CIRCLE_HISTORY_FRAMES,
      circleMinSamples: config.circleMinSamples ?? CIRCLE_MIN_SAMPLES,
      circleMinRadius: config.circleMinRadius ?? CIRCLE_MIN_RADIUS,
      circleMaxIrregularity: config.circleMaxIrregularity ?? CIRCLE_MAX_IRREGULARITY,
      circleMinRevolutions: config.circleMinRevolutions ?? CIRCLE_MIN_REVOLUTIONS,
      discFireCooldownMs: config.discFireCooldownMs ?? DISC_FIRE_COOLDOWN_MS,
      blastPalmDist: config.blastPalmDist ?? BLAST_PALM_DIST,
      blastForwardDot: config.blastForwardDot ?? BLAST_FORWARD_DOT,
      blastChargeDurationMs: config.blastChargeDurationMs ?? BLAST_CHARGE_DURATION_MS,
      blastThrustSpeed: config.blastThrustSpeed ?? BLAST_THRUST_SPEED,
      blastCooldownMs: config.blastCooldownMs ?? BLAST_COOLDOWN_MS,
      swipeEnabled: config.swipeEnabled ?? true,
      swipeTipGap: config.swipeTipGap ?? SWIPE_TIP_GAP,
      swipeMinDist: config.swipeMinDist ?? SWIPE_MIN_DIST,
      swipeWindowMs: config.swipeWindowMs ?? SWIPE_WINDOW_MS,
      swipeAxisDominance: config.swipeAxisDominance ?? SWIPE_AXIS_DOMINANCE,
      swipeMaxFingerDot: config.swipeMaxFingerDot ?? SWIPE_MAX_FINGER_DOT,
      swipeCooldownMs: config.swipeCooldownMs ?? SWIPE_COOLDOWN_MS,
      swipeRequireThumbTucked: config.swipeRequireThumbTucked ?? true,
    };

    this._left = new SingleHandRecognizer('left', this._config);
    this._right = new SingleHandRecognizer('right', this._config);
    this._twoHand = new TwoHandRecognizer();

    this.state = {
      left: this._left.state,
      right: this._right.state,
      twoHand: this._twoHand.state,
    };
  }

  /**
   * Main per-frame WebXR update entrypoint - zero heap allocations.
   */
  update(
    frame: XRFrame | null | undefined,
    referenceSpace: XRReferenceSpace | null | undefined,
    inputSources: Iterable<XRInputSource> | null | undefined,
    deltaSeconds: number,
    nowMs: number = performance.now(),
  ): HaathFrameState {
    let leftHand: XRHand | null = null;
    let rightHand: XRHand | null = null;
    let leftSource: XRInputSource | null = null;
    let rightSource: XRInputSource | null = null;

    if (frame && referenceSpace && inputSources) {
      for (const source of inputSources) {
        if (!source || !source.hand) continue;
        if (source.handedness === 'left') {
          leftHand = source.hand;
          leftSource = source;
        } else if (source.handedness === 'right') {
          rightHand = source.hand;
          rightSource = source;
        }
      }
    }

    if (frame && referenceSpace && frame.getViewerPose) {
      const viewer = frame.getViewerPose(referenceSpace);
      if (viewer) {
        const m = viewer.transform.matrix; // column 0 = head right
        this.setHeadRight(m[0], m[1], m[2]);
      }
    }

    if (leftHand && frame && referenceSpace) {
      this._ingestXRHand(frame, referenceSpace, leftSource, leftHand, this._left, deltaSeconds, nowMs);
    } else {
      this._left.markUntracked();
    }

    if (rightHand && frame && referenceSpace) {
      this._ingestXRHand(frame, referenceSpace, rightSource, rightHand, this._right, deltaSeconds, nowMs);
    } else {
      this._right.markUntracked();
    }

    this._twoHand.update(
      this._left.state,
      this._right.state,
      this._left.getHistoryBuffer(),
      this._left.getFrameOffset(0),
      this._right.getHistoryBuffer(),
      this._right.getFrameOffset(0),
      nowMs,
      this._config,
      deltaSeconds,
    );

    return this.state;
  }

  /**
   * Updates the engine directly from flat Float32Array buffers or JointName->pose maps.
   * Useful for custom engines, recorded pose playback, and unit testing.
   */
  updateFromPoses(
    leftInput: HandPoseInput,
    rightInput: HandPoseInput,
    deltaSeconds: number,
    nowMs: number = performance.now(),
  ): HaathFrameState {
    if (leftInput && this._populateStagingFromInput(leftInput)) {
      if (!isHandAnatomicallyValid(this._stagingSlot, 0, this._config.minBoneLength)) {
        this._left.markUntracked();
      } else {
        const slotOffset = this._left.beginFrameSlot();
        this._left.getHistoryBuffer().set(this._stagingSlot, slotOffset);
        this._left.evaluateCurrentFrame(deltaSeconds, nowMs, this._config, this._headRight);
      }
    } else {
      this._left.markUntracked();
    }

    if (rightInput && this._populateStagingFromInput(rightInput)) {
      if (!isHandAnatomicallyValid(this._stagingSlot, 0, this._config.minBoneLength)) {
        this._right.markUntracked();
      } else {
        const slotOffset = this._right.beginFrameSlot();
        this._right.getHistoryBuffer().set(this._stagingSlot, slotOffset);
        this._right.evaluateCurrentFrame(deltaSeconds, nowMs, this._config, this._headRight);
      }
    } else {
      this._right.markUntracked();
    }

    this._twoHand.update(
      this._left.state,
      this._right.state,
      this._left.getHistoryBuffer(),
      this._left.getFrameOffset(0),
      this._right.getHistoryBuffer(),
      this._right.getFrameOffset(0),
      nowMs,
      this._config,
      deltaSeconds,
    );

    return this.state;
  }

  reset(): void {
    this._left.reset();
    this._right.reset();
    this._twoHand.reset();
  }

  /**
   * Sets the head-right vector used to resolve two-finger swipe left/right. Projected onto the
   * horizontal plane and normalized; ignored if degenerate. update() calls this from the viewer
   * pose automatically, updateFromPoses() consumers call it themselves (default world +X).
   */
  setHeadRight(x: number, _y: number, z: number): void {
    const len = Math.sqrt(x * x + z * z);
    if (len < 1e-4) return;
    this._headRight[0] = x / len;
    this._headRight[1] = 0;
    this._headRight[2] = z / len;
  }

  /**
   * Clears any in-progress two-finger swipe stroke (cooldowns are kept).
   */
  resetSwipe(hand?: Handedness | 'both'): void {
    if (!hand || hand === 'both' || hand === 'left') this._left.resetSwipe();
    if (!hand || hand === 'both' || hand === 'right') this._right.resetSwipe();
  }

  resetCircle(hand?: Handedness | 'both'): void {
    if (!hand || hand === 'both') {
      this._left.resetCircle();
      this._right.resetCircle();
    } else if (hand === 'left') {
      this._left.resetCircle();
    } else if (hand === 'right') {
      this._right.resetCircle();
    }
  }

  get leftRecognizer(): SingleHandRecognizer {
    return this._left;
  }

  get rightRecognizer(): SingleHandRecognizer {
    return this._right;
  }

  get twoHandRecognizer(): TwoHandRecognizer {
    return this._twoHand;
  }

  /**
   * Tests a target sphere against the current palm center, wrist, and index fingertip of one hand
   * (plus swept palm motion). See testHandSphereCollision for modes and options. Allocation-free.
   */
  testHandSphere(
    handedness: Handedness,
    targetX: number,
    targetY: number,
    targetZ: number,
    targetRadius: number,
    options?: HandSphereTestOptions,
  ): HandContactPart {
    const hand = handedness === 'left' ? this._left.state : this._right.state;
    return testHandSphereCollision(hand, targetX, targetY, targetZ, targetRadius, options, handedness);
  }

  private _ingestXRHand(
    frame: XRFrame,
    referenceSpace: XRReferenceSpace,
    source: XRInputSource | null,
    hand: XRHand,
    recognizer: SingleHandRecognizer,
    deltaSeconds: number,
    nowMs: number,
  ): void {
    const getJointPose = frame.getJointPose?.bind(frame);
    if (!getJointPose) {
      recognizer.markUntracked();
      return;
    }

    for (let i = 0; i < JOINT_COUNT; i++) {
      const jointName = XR_HAND_JOINTS[i];
      const jointSpace = hand.get(jointName as XRHandJoint);
      if (!jointSpace) {
        recognizer.markUntracked();
        return;
      }
      const pose = getJointPose(jointSpace, referenceSpace);
      if (!pose) {
        recognizer.markUntracked();
        return;
      }
      const pos = pose.transform.position;
      const ori = pose.transform.orientation;
      const base = i * FLOATS_PER_JOINT;
      this._stagingSlot[base] = pos.x;
      this._stagingSlot[base + 1] = pos.y;
      this._stagingSlot[base + 2] = pos.z;
      this._stagingSlot[base + 3] = ori.x;
      this._stagingSlot[base + 4] = ori.y;
      this._stagingSlot[base + 5] = ori.z;
      this._stagingSlot[base + 6] = ori.w;
    }

    if (!isHandAnatomicallyValid(this._stagingSlot, 0, this._config.minBoneLength)) {
      recognizer.markUntracked();
      return;
    }

    const slotOffset = recognizer.beginFrameSlot();
    recognizer.getHistoryBuffer().set(this._stagingSlot, slotOffset);
    recognizer.evaluateCurrentFrame(deltaSeconds, nowMs, this._config, this._headRight);

    // Stable targetRaySpace + Pinch-Safe Aim Ray
    let targetRayApplied = false;
    if (source && source.targetRaySpace && frame.getPose) {
      const rayPose = frame.getPose(source.targetRaySpace, referenceSpace);
      if (rayPose && rayPose.transform) {
        const m = rayPose.transform.matrix;
        if (m && m.length >= 16) {
          const mLen = Math.hypot(m[8], m[9], m[10]);
          if (mLen > 1e-5) {
            recognizer.state.aimDirection[0] = -m[8] / mLen;
            recognizer.state.aimDirection[1] = -m[9] / mLen;
            recognizer.state.aimDirection[2] = -m[10] / mLen;
            recognizer.state.aimOrigin[0] = rayPose.transform.position ? rayPose.transform.position.x : m[12];
            recognizer.state.aimOrigin[1] = rayPose.transform.position ? rayPose.transform.position.y : m[13];
            recognizer.state.aimOrigin[2] = rayPose.transform.position ? rayPose.transform.position.z : m[14];
            targetRayApplied = true;
          }
        }
        if (!targetRayApplied && rayPose.transform.orientation) {
          const q = rayPose.transform.orientation;
          const dx = -2 * (q.x * q.z + q.w * q.y);
          const dy = -2 * (q.y * q.z - q.w * q.x);
          const dz = -(1 - 2 * (q.x * q.x + q.y * q.y));
          const qLen = Math.hypot(dx, dy, dz);
          if (qLen > 1e-5) {
            recognizer.state.aimDirection[0] = dx / qLen;
            recognizer.state.aimDirection[1] = dy / qLen;
            recognizer.state.aimDirection[2] = dz / qLen;
            recognizer.state.aimOrigin[0] = rayPose.transform.position.x;
            recognizer.state.aimOrigin[1] = rayPose.transform.position.y;
            recognizer.state.aimOrigin[2] = rayPose.transform.position.z;
            targetRayApplied = true;
          }
        }
      }
    }

    // Joint-based fallback or pinch stabilization:
    // When pinching or index curls, prevent aimDirection from pitching downward toward floor
    const wristOff = JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const indexMcpOff = JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
    const indexTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const thumbTipOff = JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;

    const pinchDist = Math.hypot(
      this._stagingSlot[indexTipOff] - this._stagingSlot[thumbTipOff],
      this._stagingSlot[indexTipOff + 1] - this._stagingSlot[thumbTipOff + 1],
      this._stagingSlot[indexTipOff + 2] - this._stagingSlot[thumbTipOff + 2],
    );
    const isPinchingOrCurled = pinchDist <= PINCH_DIST * 1.5 ||
      recognizer.state.gesture === 'pinch' ||
      !recognizer.state.fingers.index;

    if (!targetRayApplied || isPinchingOrCurled) {
      const stableDx = this._stagingSlot[indexMcpOff] - this._stagingSlot[wristOff];
      const stableDy = this._stagingSlot[indexMcpOff + 1] - this._stagingSlot[wristOff + 1];
      const stableDz = this._stagingSlot[indexMcpOff + 2] - this._stagingSlot[wristOff + 2];
      const stableLen = Math.hypot(stableDx, stableDy, stableDz);

      if (stableLen > 1e-5) {
        if (!targetRayApplied) {
          recognizer.state.aimDirection[0] = stableDx / stableLen;
          recognizer.state.aimDirection[1] = stableDy / stableLen;
          recognizer.state.aimDirection[2] = stableDz / stableLen;
          recognizer.state.aimOrigin[0] = this._stagingSlot[indexMcpOff];
          recognizer.state.aimOrigin[1] = this._stagingSlot[indexMcpOff + 1];
          recognizer.state.aimOrigin[2] = this._stagingSlot[indexMcpOff + 2];
        } else if (isPinchingOrCurled) {
          // If targetRay is applied and pinch is active, anchor origin to pinch midpoint
          recognizer.state.aimOrigin[0] = 0.5 * (this._stagingSlot[indexTipOff] + this._stagingSlot[thumbTipOff]);
          recognizer.state.aimOrigin[1] = 0.5 * (this._stagingSlot[indexTipOff + 1] + this._stagingSlot[thumbTipOff + 1]);
          recognizer.state.aimOrigin[2] = 0.5 * (this._stagingSlot[indexTipOff + 2] + this._stagingSlot[thumbTipOff + 2]);
        }
      }
    }
  }

  private _populateStagingFromInput(input: NonNullable<HandPoseInput>): boolean {
    if (input instanceof Float32Array) {
      if (input.length >= FRAME_STRIDE) {
        for (let i = 0; i < FRAME_STRIDE; i++) {
          this._stagingSlot[i] = input[i];
        }
        return true;
      }
      if (input.length >= JOINT_COUNT * 3) {
        for (let i = 0; i < JOINT_COUNT; i++) {
          const src = i * 3;
          const dst = i * FLOATS_PER_JOINT;
          this._stagingSlot[dst] = input[src];
          this._stagingSlot[dst + 1] = input[src + 1];
          this._stagingSlot[dst + 2] = input[src + 2];
          this._stagingSlot[dst + 3] = 0;
          this._stagingSlot[dst + 4] = 0;
          this._stagingSlot[dst + 5] = 0;
          this._stagingSlot[dst + 6] = 1;
        }
        return true;
      }
      return false;
    }

    for (let i = 0; i < JOINT_COUNT; i++) {
      const jointName = XR_HAND_JOINTS[i];
      const entry = input[jointName];
      const dst = i * FLOATS_PER_JOINT;
      if (!entry) {
        this._stagingSlot[dst] = 0;
        this._stagingSlot[dst + 1] = 0;
        this._stagingSlot[dst + 2] = 0;
        this._stagingSlot[dst + 3] = 0;
        this._stagingSlot[dst + 4] = 0;
        this._stagingSlot[dst + 5] = 0;
        this._stagingSlot[dst + 6] = 1;
        continue;
      }
      if ('position' in entry) {
        this._stagingSlot[dst] = entry.position.x;
        this._stagingSlot[dst + 1] = entry.position.y;
        this._stagingSlot[dst + 2] = entry.position.z;
        const q = entry.orientation;
        this._stagingSlot[dst + 3] = q ? q.x : 0;
        this._stagingSlot[dst + 4] = q ? q.y : 0;
        this._stagingSlot[dst + 5] = q ? q.z : 0;
        this._stagingSlot[dst + 6] = q ? q.w : 1;
      } else {
        this._stagingSlot[dst] = entry.x;
        this._stagingSlot[dst + 1] = entry.y;
        this._stagingSlot[dst + 2] = entry.z;
        this._stagingSlot[dst + 3] = 0;
        this._stagingSlot[dst + 4] = 0;
        this._stagingSlot[dst + 5] = 0;
        this._stagingSlot[dst + 6] = 1;
      }
    }
    return true;
  }
}

export {
  // Constants
  XR_HAND_JOINTS,
  JOINT_COUNT,
  FLOATS_PER_JOINT,
  POS_HISTORY_COUNT,
  JOINT_INDEX,
  CURL_DOT,
  THUMBOPEN,
  FINGEROPEN,
  DIRECTION_THRESHOLD,
  PINCH_DIST,
  PUNCH_SPEED,
  SLAP_SPEED,
  STRIKE_LATCH_MS,
  MIN_ANATOMICAL_BONE_LENGTH,
  PALM_COLLIDER_RADIUS,
  WRIST_COLLIDER_RADIUS,
  FINGERTIP_COLLIDER_RADIUS,
  HAND_CONTACT_MODES,
  TRIANGLE_TIP_DIST,
  TRIANGLE_THUMB_DIST,
  TRIANGLE_FINGER_DOT,
  CLAP_ORIGIN_MIN_DIST,
  CLAP_CONTACT_DIST,
  CLAP_SEPARATION_DIST,
  CLAP_DOUBLE_MIN_MS,
  CLAP_DOUBLE_MAX_MS,
  CIRCLE_HISTORY_FRAMES,
  CIRCLE_MIN_SAMPLES,
  CIRCLE_MIN_RADIUS,
  CIRCLE_MAX_IRREGULARITY,
  CIRCLE_MIN_REVOLUTIONS,
  DISC_FIRE_COOLDOWN_MS,
  BLAST_PALM_DIST,
  BLAST_FORWARD_DOT,
  BLAST_CHARGE_DURATION_MS,
  BLAST_THRUST_SPEED,
  BLAST_COOLDOWN_MS,
  BLAST_CONFIG,
  HOLD_SIGN_STABILITY_FRAMES,
  HOLD_NAV_DURATION_MS,
  HOLD_COUNT_DURATION_MS,
  HOLD_PAUSE_DURATION_MS,
  HOLD_SIGN_STABILITY_MS,
  SIGN_CURL_ENTER_MAX_RATIO,
  SIGN_EXTEND_ENTER_MIN_RATIO,
  THUMBS_ENTER_ALIGN_MIN_DOT,
  THUMBS_ENTER_DIRECTION_THRESHOLD,
  THUMBS_ENTER_THUMB_OUT_RATIO,
  GUN_TUCK_ENTER_MAX_RATIO,
  GUN_INDEX_LEAD_RATIO,
  PEACE_ENTER_MIN_SPREAD_DEG,
  HOLD_COUNT_STABILITY_FRAMES,
  HOLD_DEFAULT_DURATION_MS,
  HOLD_COOLDOWN_MS,
  COLLISION_DURATION,
  SPELL_CONFIG,
  PHALANGES,
  SWIPE_TIP_GAP,
  SWIPE_MIN_DIST,
  SWIPE_WINDOW_MS,
  SWIPE_AXIS_DOMINANCE,
  SWIPE_MAX_FINGER_DOT,
  SWIPE_COOLDOWN_MS,
  SWIPE_POSE_GRACE_FRAMES,
  SWIPE_SAMPLE_CAPACITY,
  // Math & Colliders
  dot,
  cross,
  sub,
  add,
  normalize,
  hypot,
  scale,
  distSq,
  dist,
  v3Set,
  v3Copy,
  v3Sub,
  v3Add,
  v3Scale,
  v3Dot,
  v3Cross,
  v3LenSq,
  v3Len,
  v3DistSq,
  v3Dist,
  v3Normalize,
  intersectSphereSphere,
  intersectLaserSphere,
  intersectDiscSphere,
  CollisionCooldownTracker,
  sphereSphere,
  testHandSphereCollision,
  cylinderSphere,
  discSphere,
  // Recognizers & Stateless Helpers
  SingleHandRecognizer,
  TwoHandRecognizer,
  CircleTrajectoryRecognizer,
  HoldRecognizer,
  TwoFingerSwipeRecognizer,
  createSwipeState,
  isTwoFingerBrushPose,
  createSingleHandState,
  createTwoHandState,
  isFingerExtendedCurl,
  isHandAnatomicallyValid,
  isThumbReallyOut,
  isThumbsShape,
  isPeaceShape,
  isOneFingerGunShape,
  isFistFamily,
  isOpenFamily,
  evaluateFingerExtensions,
  classifyHandSign,
  promoteStrikeGesture,
  evaluateTriangleFromPoses,
  evaluateBlastFromPoses,
};

export type {
  Handedness,
  HandSide,
  JointName,
  HandSign,
  ActiveGesture,
  StrikeType,
  Vec3,
  Quat,
  JointPoseData,
  HandPoseInput,
  FingerExtensionState,
  CircleState,
  SingleHandState,
  ClapState,
  TriangleState,
  BlastState,
  TwoHandState,
  HaathFrameState,
  HaathConfig,
  HoldConfig,
  HoldState,
  HandState,
  HandContactMode,
  HandContactPart,
  HandSphereTestOptions,
  HaathUpdateResult,
  CircleResult,
  TriangleResult,
  BlastResult,
  SpellArchetype,
  CurlState,
  StrikeResult,
  SwipeState,
  TwoFingerSwipeDirection,
  TwoFingerSwipeConfig,
};

// v2 compositional gesture engine: import from '@treefour/haath/v2'.
// Debug overlay: import from '@treefour/haath/debug'.
