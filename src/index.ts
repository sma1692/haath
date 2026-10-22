// Public API barrel & Haath orchestrator class
// Zero-dependency, zero-GC WebXR 25-joint hand kinematics, combat strike, and 3D gesture engine.

import {
  CIRCLE_HISTORY_FRAMES,
  CIRCLE_MAX_IRREGULARITY,
  CIRCLE_MIN_RADIUS,
  CIRCLE_MIN_REVOLUTIONS,
  CIRCLE_MIN_SAMPLES,
  CLAP_CONTACT_DIST,
  CLAP_DOUBLE_MAX_MS,
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
  JOINT_COUNT,
  JOINT_INDEX,
  PALM_COLLIDER_RADIUS,
  PHALANGES,
  PINCH_DIST,
  POS_HISTORY_COUNT,
  PUNCH_SPEED,
  SLAP_SPEED,
  SPELL_CONFIG,
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
  isThumbReallyOut,
  promoteStrikeGesture,
  SingleHandRecognizer,
} from './recognizers/singleHand.js';
import { CircleTrajectoryRecognizer } from './recognizers/trajectory.js';
import {
  createTwoHandState,
  evaluateTriangleFromPoses,
  TwoHandRecognizer,
} from './recognizers/twoHand.js';
import type {
  ActiveGesture,
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
  HoldConfig,
  HoldState,
  JointName,
  JointPoseData,
  Quat,
  SingleHandState,
  StrikeResult,
  StrikeType,
  TriangleResult,
  TriangleState,
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

  public readonly state: HaathFrameState;

  constructor(config: HaathConfig = {}) {
    this._config = {
      useCurlDetection: config.useCurlDetection ?? true,
      curlDot: config.curlDot ?? CURL_DOT,
      thumbOpenDist: config.thumbOpenDist ?? THUMBOPEN,
      fingerOpenDist: config.fingerOpenDist ?? FINGEROPEN,
      directionThreshold: config.directionThreshold ?? DIRECTION_THRESHOLD,
      pinchDist: config.pinchDist ?? PINCH_DIST,
      punchSpeed: config.punchSpeed ?? PUNCH_SPEED,
      slapSpeed: config.slapSpeed ?? SLAP_SPEED,
      triangleTipDist: config.triangleTipDist ?? TRIANGLE_TIP_DIST,
      triangleThumbDist: config.triangleThumbDist ?? TRIANGLE_THUMB_DIST,
      triangleFingerDot: config.triangleFingerDot ?? TRIANGLE_FINGER_DOT,
      clapOriginMinDist: config.clapOriginMinDist ?? CLAP_ORIGIN_MIN_DIST,
      clapContactDist: config.clapContactDist ?? CLAP_CONTACT_DIST,
      clapSeparationDist: config.clapSeparationDist ?? CLAP_SEPARATION_DIST,
      clapDoubleMinMs: config.clapDoubleMinMs ?? CLAP_DOUBLE_MIN_MS,
      clapDoubleMaxMs: config.clapDoubleMaxMs ?? CLAP_DOUBLE_MAX_MS,
      circleHistoryFrames: config.circleHistoryFrames ?? CIRCLE_HISTORY_FRAMES,
      circleMinSamples: config.circleMinSamples ?? CIRCLE_MIN_SAMPLES,
      circleMinRadius: config.circleMinRadius ?? CIRCLE_MIN_RADIUS,
      circleMaxIrregularity: config.circleMaxIrregularity ?? CIRCLE_MAX_IRREGULARITY,
      circleMinRevolutions: config.circleMinRevolutions ?? CIRCLE_MIN_REVOLUTIONS,
      discFireCooldownMs: config.discFireCooldownMs ?? DISC_FIRE_COOLDOWN_MS,
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

    if (frame && referenceSpace && inputSources) {
      for (const source of inputSources) {
        if (!source || !source.hand) continue;
        if (source.handedness === 'left') {
          leftHand = source.hand;
        } else if (source.handedness === 'right') {
          rightHand = source.hand;
        }
      }
    }

    if (leftHand && frame && referenceSpace) {
      this._ingestXRHand(frame, referenceSpace, leftHand, this._left, deltaSeconds, nowMs);
    } else {
      this._left.markUntracked();
    }

    if (rightHand && frame && referenceSpace) {
      this._ingestXRHand(frame, referenceSpace, rightHand, this._right, deltaSeconds, nowMs);
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
      const slotOffset = this._left.beginFrameSlot();
      this._left.getHistoryBuffer().set(this._stagingSlot, slotOffset);
      this._left.evaluateCurrentFrame(deltaSeconds, nowMs, this._config);
    } else {
      this._left.markUntracked();
    }

    if (rightInput && this._populateStagingFromInput(rightInput)) {
      const slotOffset = this._right.beginFrameSlot();
      this._right.getHistoryBuffer().set(this._stagingSlot, slotOffset);
      this._right.evaluateCurrentFrame(deltaSeconds, nowMs, this._config);
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
    );

    return this.state;
  }

  reset(): void {
    this._left.reset();
    this._right.reset();
    this._twoHand.reset();
  }

  private _ingestXRHand(
    frame: XRFrame,
    referenceSpace: XRReferenceSpace,
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

    const slotOffset = recognizer.beginFrameSlot();
    recognizer.getHistoryBuffer().set(this._stagingSlot, slotOffset);
    recognizer.evaluateCurrentFrame(deltaSeconds, nowMs, this._config);
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
  PALM_COLLIDER_RADIUS,
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
  HOLD_SIGN_STABILITY_FRAMES,
  HOLD_COUNT_STABILITY_FRAMES,
  HOLD_DEFAULT_DURATION_MS,
  HOLD_COOLDOWN_MS,
  COLLISION_DURATION,
  SPELL_CONFIG,
  PHALANGES,
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
  cylinderSphere,
  discSphere,
  // Recognizers & Stateless Helpers
  SingleHandRecognizer,
  TwoHandRecognizer,
  CircleTrajectoryRecognizer,
  HoldRecognizer,
  createSingleHandState,
  createTwoHandState,
  isFingerExtendedCurl,
  isThumbReallyOut,
  evaluateFingerExtensions,
  classifyHandSign,
  promoteStrikeGesture,
  evaluateTriangleFromPoses,
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
  TwoHandState,
  HaathFrameState,
  HaathConfig,
  HoldConfig,
  HoldState,
  HandState,
  HaathUpdateResult,
  CircleResult,
  TriangleResult,
  CurlState,
  StrikeResult,
};
