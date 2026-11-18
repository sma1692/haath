import { V as Vec3, a as HandContactMode, S as SingleHandState, b as HandContactPart, c as HoldState, d as HoldConfig, e as Handedness, f as HaathConfig, F as FingerExtensionState, g as HandSign, A as ActiveGesture, C as CircleState, h as SwipeState, T as TwoHandState, B as BlastState, i as TriangleState, H as HaathFrameState, j as HandPoseInput } from './types-TNkY3J3h.cjs';
export { k as BLAST_CHARGE_DURATION_MS, l as BLAST_CONFIG, m as BLAST_COOLDOWN_MS, n as BLAST_FORWARD_DOT, o as BLAST_PALM_DIST, p as BLAST_THRUST_SPEED, q as BlastResult, r as CIRCLE_HISTORY_FRAMES, s as CIRCLE_MAX_IRREGULARITY, t as CIRCLE_MIN_RADIUS, u as CIRCLE_MIN_REVOLUTIONS, v as CIRCLE_MIN_SAMPLES, w as CLAP_CONTACT_DIST, x as CLAP_DOUBLE_MAX_MS, y as CLAP_DOUBLE_MIN_MS, z as CLAP_ORIGIN_MIN_DIST, D as CLAP_SEPARATION_DIST, E as COLLISION_DURATION, G as CURL_DOT, I as CircleResult, J as ClapState, K as CurlState, L as DIRECTION_THRESHOLD, M as DISC_FIRE_COOLDOWN_MS, N as FINGEROPEN, O as FINGERTIP_COLLIDER_RADIUS, P as FLOATS_PER_JOINT, Q as GUN_INDEX_LEAD_RATIO, R as GUN_TUCK_ENTER_MAX_RATIO, U as HAND_CONTACT_MODES, W as HOLD_COOLDOWN_MS, X as HOLD_COUNT_DURATION_MS, Y as HOLD_COUNT_STABILITY_FRAMES, Z as HOLD_DEFAULT_DURATION_MS, _ as HOLD_NAV_DURATION_MS, $ as HOLD_PAUSE_DURATION_MS, a0 as HOLD_SIGN_STABILITY_FRAMES, a1 as HOLD_SIGN_STABILITY_MS, a2 as HaathUpdateResult, a3 as HandSide, a4 as HandState, a5 as JOINT_COUNT, a6 as JOINT_INDEX, a7 as JointName, a8 as JointPoseData, a9 as MIN_ANATOMICAL_BONE_LENGTH, aa as PALM_COLLIDER_RADIUS, ab as PEACE_ENTER_MIN_SPREAD_DEG, ac as PHALANGES, ad as PINCH_DIST, ae as POS_HISTORY_COUNT, af as PUNCH_SPEED, ag as Quat, ah as SIGN_CURL_ENTER_MAX_RATIO, ai as SIGN_EXTEND_ENTER_MIN_RATIO, aj as SLAP_SPEED, ak as SPELL_CONFIG, al as STRIKE_LATCH_MS, am as SWIPE_AXIS_DOMINANCE, an as SWIPE_COOLDOWN_MS, ao as SWIPE_MAX_FINGER_DOT, ap as SWIPE_MIN_DIST, aq as SWIPE_POSE_GRACE_FRAMES, ar as SWIPE_SAMPLE_CAPACITY, as as SWIPE_TIP_GAP, at as SWIPE_WINDOW_MS, au as SpellArchetype, av as StrikeResult, aw as StrikeType, ax as THUMBOPEN, ay as THUMBS_ENTER_ALIGN_MIN_DOT, az as THUMBS_ENTER_DIRECTION_THRESHOLD, aA as THUMBS_ENTER_THUMB_OUT_RATIO, aB as TRIANGLE_FINGER_DOT, aC as TRIANGLE_THUMB_DIST, aD as TRIANGLE_TIP_DIST, aE as TriangleResult, aF as TwoFingerSwipeDirection, aG as WRIST_COLLIDER_RADIUS, aH as XR_HAND_JOINTS } from './types-TNkY3J3h.cjs';

type Vec3Like = Vec3 | Float32Array | readonly number[];
declare function dot(a: Vec3, b: Vec3): number;
declare function cross(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function sub(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function add(a: Vec3, b: Vec3, out: Vec3): Vec3;
declare function normalize(v: Vec3, out: Vec3): Vec3;
declare function hypot(v: Vec3): number;
declare function scale(v: Vec3, s: number, out: Vec3): Vec3;
declare function distSq(a: Vec3, b: Vec3): number;
declare function dist(a: Vec3, b: Vec3): number;
declare function v3Set(out: Float32Array, x: number, y: number, z: number): Float32Array;
declare function v3Copy(out: Float32Array, a: ArrayLike<number>, offset?: number): Float32Array;
declare function v3Sub(out: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): Float32Array;
declare function v3Add(out: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): Float32Array;
declare function v3Scale(out: Float32Array, a: ArrayLike<number>, s: number, aOffset?: number): Float32Array;
declare function v3Dot(a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): number;
declare function v3Cross(out: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): Float32Array;
declare function v3LenSq(a: ArrayLike<number>, offset?: number): number;
declare function v3Len(a: ArrayLike<number>, offset?: number): number;
declare function v3DistSq(a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): number;
declare function v3Dist(a: ArrayLike<number>, b: ArrayLike<number>, aOffset?: number, bOffset?: number): number;
declare function v3Normalize(out: Float32Array, a: ArrayLike<number>, aOffset?: number): Float32Array;

/**
 * Fast squared-distance sphere-sphere overlap check:
 * (ax - bx)^2 + (ay - by)^2 + (az - bz)^2 < (ar + br)^2
 */
declare function intersectSphereSphere(ax: number, ay: number, az: number, ar: number, bx: number, by: number, bz: number, br: number): boolean;
/**
 * Cylinder-sphere (laser beam) intersection check:
 * Projects r = targetPos - origin onto laser unit normal n.
 * Rejects if axial projection a < 0 or a > length.
 * Hits when lateral distance squared ||r||^2 - a^2 < (width / 2 + targetRadius)^2.
 */
declare function intersectLaserSphere(origin: Vec3Like, normal: Vec3Like, length: number, width: number, targetPos: Vec3Like, targetRadius: number): boolean;
/**
 * Thin-disc-sphere intersection check:
 * Axial offset a = (targetPos - discPos) . discNormal, lateral squared ||r||^2 - a^2.
 * Hits when |a| < (discTube + targetRadius) and lateralSq < (discRadius + targetRadius)^2.
 */
declare function intersectDiscSphere(discPos: Vec3Like, discNormal: Vec3Like, discRadius: number, discTube: number, targetPos: Vec3Like, targetRadius: number): boolean;
/**
 * Encapsulates DunJun's isActiveCollision / isTimeOutCollision (COLLISION_DURATION = 200ms)
 * so a single strike against a target cannot double-trigger within 200ms for the same
 * (targetId, hand, gesture).
 */
declare class CollisionCooldownTracker {
    private readonly _cooldownMs;
    private readonly _lastHitTime;
    constructor(cooldownMs?: number);
    private _key;
    /**
     * Returns true if the collision for (targetId, hand, gesture) is currently inside its cooldown window.
     */
    isActiveCollision(targetId: string | number, hand: string, gesture: string, nowMs?: number): boolean;
    /**
     * Returns true if the cooldown has elapsed (ready to trigger again).
     */
    isTimeOutCollision(targetId: string | number, hand: string, gesture: string, nowMs?: number): boolean;
    /**
     * Checks if (targetId, hand, gesture) can trigger at nowMs; if so, records the timestamp and returns true.
     */
    tryTrigger(targetId: string | number, hand: string, gesture: string, nowMs?: number): boolean;
    reset(): void;
}
declare function sphereSphere(centerA: Vec3, radiusA: number, centerB: Vec3, radiusB: number): boolean;
declare function cylinderSphere(origin: Vec3, dir: Vec3, length: number, radius: number, sphereCenter: Vec3, sphereRadius: number): boolean;
declare function discSphere(discCenter: Vec3, discNormal: Vec3, discRadius: number, sphereCenter: Vec3, sphereRadius: number): boolean;
/**
 * Options for testHandSphereCollision. Callers in a render loop should pre-allocate one
 * options object and mutate its fields per call instead of passing a fresh literal.
 */
interface HandSphereTestOptions {
    /** 'touch' / 'consumable' (default 'touch'): any tracked pose. 'combat': non-idle gesture required. */
    mode?: HandContactMode;
    /** Host-resolved gesture override (emulator, game-specific promotion). Defaults to hand.gesture. */
    gesture?: string;
    /** Combat only: gesture (or list of gestures) the hand must be in to register. */
    requiredGesture?: string | readonly string[];
    /** Extra radius added to every hand sphere (meters). Default 0. */
    radiusPadding?: number;
    /** Palm sphere radius at palmCenter. Default PALM_COLLIDER_RADIUS (0.05). */
    palmRadius?: number;
    /** Wrist sphere radius at wristPosition. Default WRIST_COLLIDER_RADIUS (0.04). */
    wristRadius?: number;
    /** Index fingertip sphere radius at indexTipPosition. Default FINGERTIP_COLLIDER_RADIUS (0.025). */
    fingertipRadius?: number;
    /** Swept palm-vs-target test between previous and current frame. Default true. */
    swept?: boolean;
    /** Target world position on the previous frame. When omitted, the target is treated as static. */
    prevTargetX?: number;
    prevTargetY?: number;
    prevTargetZ?: number;
    /** Combat only: debounce repeated hits via CollisionCooldownTracker.tryTrigger. */
    cooldown?: CollisionCooldownTracker;
    /** Cooldown key: target id. Required for the cooldown to apply. */
    targetId?: string | number;
    /** Cooldown key: hand name. Defaults to the handedness passed by Haath.testHandSphere. */
    handedness?: string;
    /** Cooldown timestamp. Defaults to performance.now(). */
    nowMs?: number;
}
/**
 * Tests a target sphere against the full anatomical hand volume:
 * palm center, wrist, and index fingertip spheres, plus an optional swept palm segment
 * (relative motion of palm vs target between frames) so fast targets cannot tunnel.
 *
 * Returns the hand part that registered contact, or 'none'. Allocation-free.
 */
declare function testHandSphereCollision(hand: SingleHandState, targetX: number, targetY: number, targetZ: number, targetRadius: number, options?: HandSphereTestOptions, handedness?: string): HandContactPart;

declare class HoldRecognizer<T = string | number> {
    private readonly _stabilityFrames;
    private readonly _stabilityMs;
    private readonly _holdDurationMs;
    private readonly _cooldownMs;
    private _rawCandidate;
    private _stableFrames;
    private _stableMs;
    private _lockedCandidate;
    private _elapsedMs;
    private _lastTriggerMs;
    readonly state: HoldState<T>;
    constructor(config?: HoldConfig);
    private _isIdleCandidate;
    /**
     * Advances the stability + dwell state machine.
     * Accepts `delta` in either milliseconds (>= 1) or seconds (< 1).
     */
    update(candidate: T | null | undefined, delta: number, nowMs?: number): HoldState<T>;
    reset(): void;
}

/**
 * Thumbs up / down shape gate: all four fingers curled (tip near its own proximal joint) and the
 * thumb outstretched along the fist, i.e. pinkyTip -> indexTip roughly parallel to
 * thumbProximal -> thumbTip. A relaxed fist with the thumb lying across the fingers fails it.
 * holding = the hand already shows thumb / thumbsup / thumbsdown (playtest 4 HOLD gates); otherwise
 * the stricter ENTER gates apply (SIGN_CURL_ENTER_MAX_RATIO, THUMBS_ENTER_ALIGN_MIN_DOT).
 */
declare function isThumbsShape(poses: Float32Array, frameOffset?: number, holding?: boolean): boolean;
/**
 * Peace shape gate: ring and pinky curled, index and middle outstretched, and the two fingers
 * spread in a V: angle(indexProximal -> indexTip, middleProximal -> middleTip) > PEACE_MIN_SPREAD_DEG.
 * Fingers held together (two-finger gun / swipe pose) and a relaxed open hand both fail it.
 * holding = the hand already shows peace (HOLD gates); otherwise the stricter ENTER gates apply.
 */
declare function isPeaceShape(poses: Float32Array, frameOffset?: number, holding?: boolean): boolean;
/**
 * 1-finger gun shape check: translated from 2-finger gun logic onto a single index finger.
 * Index is extended, middle/ring/pinky are tucked within the gun tuck gate (accounting for tendon
 * coupling pulling the middle finger partially open: the middle also counts as tucked when the index
 * reaches GUN_INDEX_LEAD_RATIO further), and the thumb is out.
 * Entering a gun needs the thumb flagged out (THUMB_OUT_RATIO); a held gun keeps it down to
 * THUMB_OUT_RATIO * 0.85, so a thumb drifting in mid-aim does not drop to poke.
 * (Merged from DunJun thumbPose.classifyThumbHand so there is one gun / peace / poke classifier.)
 */
declare function isOneFingerGunShape(poses: Float32Array, frameOffset: number, fingers: FingerExtensionState, holding?: boolean): boolean;
declare function createSingleHandState(): SingleHandState;
/**
 * Evaluates orientation-invariant intra-finger curl for a 4-joint chain:
 * v1 = normalize(prox - meta), v2 = normalize(inter - prox), v3 = normalize(tip - inter)
 * isExtended = (v1 . v2 > curlDot) && (v2 . v3 > curlDot)
 */
declare function isFingerExtendedCurl(poses: Float32Array, frameOffset: number, metaIdx: number, proxIdx: number, interIdx: number, tipIdx: number, curlDot?: number): boolean;
/**
 * Scale-invariant anatomical thumb-out check:
 * Compares dist(thumb-tip, middle-inter) against palm knuckle span dist(pinky-inter, index-inter).
 */
declare function isThumbReallyOut(poses: Float32Array, frameOffset?: number): boolean;
/**
 * Verifies anatomical validity of tracked joints.
 * Prevents collapsed WebXR tracking poses (< 0.03m bone lengths / knuckle spans)
 * from spiking velocity and triggering punch / slap strikes.
 */
declare function isHandAnatomicallyValid(poses: Float32Array, frameOffset?: number, minBoneLength?: number): boolean;
/**
 * Evaluates all 5 finger extensions into `out` using either orientation-invariant curl
 * (`useCurlDetection = true`) or legacy Euclidean wrist-to-tip distances (`useCurlDetection = false`).
 */
declare function evaluateFingerExtensions(poses: Float32Array, frameOffset: number, out: FingerExtensionState, useCurlDetection?: boolean, curlDot?: number, thumbOpenDist?: number, fingerOpenDist?: number): FingerExtensionState;
/**
 * Classifies static single-hand sign in exact DunJun priority order (1..11).
 */
declare function classifyHandSign(poses: Float32Array, frameOffset: number, fingers: FingerExtensionState, pinchDist?: number, directionThreshold?: number, prevSign?: HandSign): HandSign;
/**
 * Promotes static hand sign to 'punch' or 'slap' when ballistic velocity gate is met.
 */
declare function promoteStrikeGesture(sign: HandSign, motionSpeed: number, punchSpeed?: number, slapSpeed?: number): ActiveGesture;
/** Signs that are a closed hand for strike purposes (punch, punch latch). */
declare function isFistFamily(sign: HandSign): boolean;
/** Signs that are an open hand for strike purposes (slap, slap latch). */
declare function isOpenFamily(sign: HandSign): boolean;
/**
 * Per-hand stateful tracker managing the 20-frame 25-joint pose ring buffer,
 * kinematics vectors, velocity gate, and Newell's 3D circle trajectory detector.
 */
declare class SingleHandRecognizer {
    private readonly _handedness;
    private readonly _historyBuffer;
    private _head;
    private _historyCount;
    private _lastPunchMs;
    private _lastSlapMs;
    private _palmCenterValid;
    private readonly _circleRecognizer;
    private readonly _swipeRecognizer;
    readonly state: SingleHandState;
    constructor(handedness: Handedness, config?: HaathConfig);
    /**
     * Returns the flat history buffer and byte/element offset of the Nth most recent frame (0 = current).
     */
    getFrameOffset(age?: number): number;
    getHistoryBuffer(): Float32Array;
    /**
     * Marks the hand as untracked for the current frame and resets transient velocity/circle state.
     */
    markUntracked(): SingleHandState;
    /**
     * Begins writing a new tracked frame into the ring buffer and returns its float offset.
     */
    beginFrameSlot(): number;
    /**
     * Evaluates all single-hand kinematics, curl, sign, ballistic velocity, and circle trajectory
     * from the most recently written slot in `_historyBuffer`.
     */
    evaluateCurrentFrame(deltaSeconds: number, nowMs: number, config: Required<HaathConfig>, headRight?: Float32Array): SingleHandState;
    /**
     * Clears the in-progress two-finger swipe stroke (does not reset the cooldown).
     */
    resetSwipe(): void;
    /**
     * Resets the Newell's 3D circle trajectory recognizer ring buffer and transient state.
     */
    resetCircle(): void;
    reset(): void;
}

interface CircleDetectorConfig {
    historyFrames?: number;
    minSamples?: number;
    minRadius?: number;
    maxIrregularity?: number;
    minRevolutions?: number;
    cooldownMs?: number;
}
declare class CircleTrajectoryRecognizer {
    private readonly _maxFrames;
    private readonly _minSamples;
    private readonly _minRadius;
    private readonly _maxIrregularity;
    private readonly _minRevolutions;
    private readonly _cooldownMs;
    private readonly _buffer;
    private readonly _radii;
    private _head;
    private _count;
    private _lastFireMs;
    private readonly _u;
    private readonly _v;
    constructor(config?: CircleDetectorConfig);
    reset(): void;
    resetCircle(): void;
    /**
     * Appends wrist position (x, y, z) and evaluates Newell's 3D circle trajectory.
     * Mutates `out` in-place with zero heap allocations.
     */
    update(wristX: number, wristY: number, wristZ: number, nowMs: number, out: CircleState, _hand?: Handedness): CircleState;
}

interface TwoFingerSwipeConfig {
    tipGap?: number;
    minDist?: number;
    windowMs?: number;
    axisDominance?: number;
    maxFingerDot?: number;
    cooldownMs?: number;
    poseGraceFrames?: number;
    requireThumbTucked?: boolean;
}
declare function createSwipeState(): SwipeState;
/**
 * True when the hand holds the two-finger brush pose (index + middle together, ring + pinky curled,
 * thumb tucked). Stateless and allocation free.
 */
declare function isTwoFingerBrushPose(poses: Float32Array, frameOffset: number, fingers: FingerExtensionState, tipGap?: number, requireThumbTucked?: boolean): boolean;
/**
 * Per-hand two-finger swipe tracker. Call update() once per tracked frame.
 */
declare class TwoFingerSwipeRecognizer {
    private readonly _tipGap;
    private readonly _minDist;
    private readonly _windowMs;
    private readonly _axisDominance;
    private readonly _maxFingerDot;
    private readonly _cooldownMs;
    private readonly _graceFrames;
    private readonly _requireThumbTucked;
    private readonly _cap;
    private readonly _samples;
    private readonly _times;
    private _head;
    private _count;
    private _lostFrames;
    private _lastFireMs;
    private _hasPrev;
    private _prevX;
    private _prevY;
    private _prevZ;
    constructor(config?: TwoFingerSwipeConfig);
    /**
     * @param headRight Horizontal head-right unit vector [x, y, z] (y should be ~0).
     */
    update(poses: Float32Array, frameOffset: number, fingers: FingerExtensionState, aimDirection: Float32Array, headRight: Float32Array, nowMs: number, out: SwipeState): SwipeState;
    private _clearStroke;
    reset(out?: SwipeState): void;
}

declare function createTwoHandState(): TwoHandState;
/**
 * Evaluates bimanual triangle / diamond formation from left and right joint pose buffers.
 * Ensures forward normal aims into -Z (nz <= 0).
 */
declare function evaluateTriangleFromPoses(leftBuf: Float32Array, leftOffset: number, rightBuf: Float32Array, rightOffset: number, out: TriangleState, tipDistThreshold?: number, thumbDistThreshold?: number, fingerDotThreshold?: number): TriangleState;
declare function evaluateBlastFromPoses(...args: any[]): BlastState;
declare class TwoHandRecognizer {
    private _lastClapTimeMs;
    private _frame;
    private _lastPalmFacingFrame;
    private readonly _blastFireRef;
    readonly state: TwoHandState;
    update(left: SingleHandState, right: SingleHandState, leftBuf: Float32Array | null, leftOffset: number, rightBuf: Float32Array | null, rightOffset: number, nowMs: number, config?: HaathConfig, deltaSeconds?: number): TwoHandState;
    reset(): void;
}

declare class Haath {
    private readonly _config;
    private readonly _left;
    private readonly _right;
    private readonly _twoHand;
    private readonly _stagingSlot;
    private readonly _headRight;
    readonly state: HaathFrameState;
    constructor(config?: HaathConfig);
    /**
     * Main per-frame WebXR update entrypoint - zero heap allocations.
     */
    update(frame: XRFrame | null | undefined, referenceSpace: XRReferenceSpace | null | undefined, inputSources: Iterable<XRInputSource> | null | undefined, deltaSeconds: number, nowMs?: number): HaathFrameState;
    /**
     * Updates the engine directly from flat Float32Array buffers or JointName->pose maps.
     * Useful for custom engines, recorded pose playback, and unit testing.
     */
    updateFromPoses(leftInput: HandPoseInput, rightInput: HandPoseInput, deltaSeconds: number, nowMs?: number): HaathFrameState;
    reset(): void;
    /**
     * Sets the head-right vector used to resolve two-finger swipe left/right. Projected onto the
     * horizontal plane and normalized; ignored if degenerate. update() calls this from the viewer
     * pose automatically, updateFromPoses() consumers call it themselves (default world +X).
     */
    setHeadRight(x: number, _y: number, z: number): void;
    /**
     * Clears any in-progress two-finger swipe stroke (cooldowns are kept).
     */
    resetSwipe(hand?: Handedness | 'both'): void;
    resetCircle(hand?: Handedness | 'both'): void;
    get leftRecognizer(): SingleHandRecognizer;
    get rightRecognizer(): SingleHandRecognizer;
    get twoHandRecognizer(): TwoHandRecognizer;
    /**
     * Tests a target sphere against the current palm center, wrist, and index fingertip of one hand
     * (plus swept palm motion). See testHandSphereCollision for modes and options. Allocation-free.
     */
    testHandSphere(handedness: Handedness, targetX: number, targetY: number, targetZ: number, targetRadius: number, options?: HandSphereTestOptions): HandContactPart;
    private _ingestXRHand;
    private _populateStagingFromInput;
}

export { ActiveGesture, BlastState, CircleState, CircleTrajectoryRecognizer, CollisionCooldownTracker, FingerExtensionState, Haath, HaathConfig, HaathFrameState, HandContactMode, HandContactPart, HandPoseInput, HandSign, type HandSphereTestOptions, Handedness, HoldConfig, HoldRecognizer, HoldState, SingleHandRecognizer, SingleHandState, SwipeState, TriangleState, type TwoFingerSwipeConfig, TwoFingerSwipeRecognizer, TwoHandRecognizer, TwoHandState, Vec3, add, classifyHandSign, createSingleHandState, createSwipeState, createTwoHandState, cross, cylinderSphere, discSphere, dist, distSq, dot, evaluateBlastFromPoses, evaluateFingerExtensions, evaluateTriangleFromPoses, hypot, intersectDiscSphere, intersectLaserSphere, intersectSphereSphere, isFingerExtendedCurl, isFistFamily, isHandAnatomicallyValid, isOneFingerGunShape, isOpenFamily, isPeaceShape, isThumbReallyOut, isThumbsShape, isTwoFingerBrushPose, normalize, promoteStrikeGesture, scale, sphereSphere, sub, testHandSphereCollision, v3Add, v3Copy, v3Cross, v3Dist, v3DistSq, v3Dot, v3Len, v3LenSq, v3Normalize, v3Scale, v3Set, v3Sub };
