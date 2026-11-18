// TypeScript interfaces & canonical gesture union types for haath

import type { XR_HAND_JOINTS } from './constants.js';

export type Handedness = 'left' | 'right';
export type HandSide = Handedness;

export type JointName = (typeof XR_HAND_JOINTS)[number];

export type HandSign =
  | 'idle'
  | 'unknown'
  | 'open'
  | 'fist'
  | 'thehro'
  | 'niche'
  | 'gun'
  | 'peace'
  | 'poke'
  | 'pinch'
  | 'thumb'
  | 'thumbsup'
  | 'thumbsdown'
  | 'telephone'
  | 'rock-horns'
  | 'birdie-1'
  | 'birdie-2'
  | 'pinkie-out';

export type ActiveGesture = HandSign | 'punch' | 'slap';

export type StrikeType = 'punch' | 'slap' | 'poke' | 'none';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface JointPoseData {
  position: Vec3;
  orientation?: Quat;
}

export type HandPoseInput =
  | Float32Array
  | Partial<Record<JointName, JointPoseData | Vec3>>
  | null
  | undefined;

export interface FingerExtensionState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  count: number; // 0..5
}

export interface CircleState {
  triggered: boolean;        // True on the exact frame a circle completes
  centroid: Float32Array;    // [cx, cy, cz]
  normal: Float32Array;      // [nx, ny, nz] via Newell's method
  meanRadius: number;
  revolutions: number;
}

export type TwoFingerSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface SwipeState {
  posed: boolean;               // Two-finger brush pose held (index + middle together, thumb tucked)
  fired: boolean;               // True on the exact frame a swipe completes
  direction: TwoFingerSwipeDirection; // Last fired direction (up/down = world up, left/right = head right)
  distance: number;             // Travel along the dominant axis for the last fired swipe (m)
  velocity: number;             // Average speed of the last fired swipe (m/s)
  deltaUp: number;              // Per-frame travel along world up while posed (m), for smooth scrolling
  deltaRight: number;           // Per-frame travel along head right while posed (m)
}

export interface SingleHandState {
  tracked: boolean;
  sign: HandSign;
  gesture: ActiveGesture;       // Promotes to 'punch' or 'slap' when velocity gate is met
  fingers: FingerExtensionState;
  motionSpeed: number;          // Scalar speed of ring-finger-tip (m/s)
  wristPosition: Float32Array;  // [x, y, z]
  palmPosition: Float32Array;   // [x, y, z] at index-finger-phalanx-proximal
  palmQuaternion: Float32Array; // [x, y, z, w] at index-finger-phalanx-proximal
  velocity: Float32Array;       // [vx, vy, vz] velocity vector (m/s)
  aimOrigin: Float32Array;      // [x, y, z] at index-finger-tip
  aimDirection: Float32Array;   // [dx, dy, dz] normalized (index-inter -> index-tip)
  palmForward: Float32Array;    // [fx, fy, fz] normalized (middle-inter -> middle-distal)
  palmCenter: Float32Array;     // [x, y, z] true palm center: midpoint(middle-finger-metacarpal, middle-finger-phalanx-proximal), wrist fallback
  prevPalmCenter: Float32Array; // [x, y, z] palmCenter from the previous tracked frame (swept collision)
  hasPrevPalm: boolean;         // True when prevPalmCenter holds a valid previous tracked frame
  indexTipPosition: Float32Array; // [x, y, z] raw index-finger-tip (aimOrigin may be re-anchored to the target ray / pinch)
  circle: CircleState;
  swipe: SwipeState;
}

// Hand-to-environment contact modes for testHandSphereCollision
// 'touch' / 'consumable': any tracked hand pose counts (idle, open, fist...)
// 'combat': requires a non-idle gesture, optional requiredGesture match and cooldown
export type HandContactMode = 'touch' | 'consumable' | 'combat';

// Which part of the hand volume registered the contact ('none' on miss)
export type HandContactPart = 'none' | 'palm' | 'wrist' | 'indexTip' | 'sweep';

export interface ClapState {
  state: 'separated' | 'contact';
  singleClap: boolean;        // True on frame of contact transition
  doubleClap: boolean;        // True on frame 2nd clap completes within [90ms, 1100ms]
}

export type SpellArchetype = 'triangle' | 'circle' | 'blast';

export interface TriangleState {
  active: boolean;
  centroid: Float32Array;     // [cx, cy, cz]
  normal: Float32Array;       // [nx, ny, nz] guaranteed nz <= 0
}

export interface BlastState {
  active: boolean;            // True when hands maintain dual-palm blast formation
  triggered: boolean;         // True on pulse frame when burst thrust or full charge fires
  charge: number;             // Normalized charge level (0..1)
  origin: Float32Array;       // [ox, oy, oz] midpoint between palms
  direction: Float32Array;    // [dx, dy, dz] forward burst normal (nz <= 0)
}

export interface TwoHandState {
  fingerCount: number;          // 0..10 summed across both hands
  handsCrossed: boolean;        // leftWrist.x > rightWrist.x
  wristDistance: number;        // Euclidean distance between wrists (Infinity if untracked)
  clap: ClapState;
  triangle: TriangleState;
  blast: BlastState;
}

export interface HaathFrameState {
  left: SingleHandState;
  right: SingleHandState;
  twoHand: TwoHandState;
}

export interface HaathConfig {
  minBoneLength?: number;
  useCurlDetection?: boolean;
  curlDot?: number;
  thumbOpenDist?: number;
  fingerOpenDist?: number;
  directionThreshold?: number;
  pinchDist?: number;
  punchSpeed?: number;
  slapSpeed?: number;
  /** Grace window (ms) a fist / open hand keeps its punch / slap after the last fast frame. */
  strikeLatchMs?: number;
  triangleTipDist?: number;
  triangleThumbDist?: number;
  triangleFingerDot?: number;
  clapOriginMinDist?: number;
  clapContactDist?: number;
  clapSeparationDist?: number;
  clapDoubleMinMs?: number;
  clapDoubleMaxMs?: number;
  clapPalmOpposeDot?: number;
  clapFacingToleranceFrames?: number;
  circleHistoryFrames?: number;
  circleMinSamples?: number;
  circleMinRadius?: number;
  circleMaxIrregularity?: number;
  circleMinRevolutions?: number;
  discFireCooldownMs?: number;
  blastPalmDist?: number;
  blastForwardDot?: number;
  blastChargeDurationMs?: number;
  blastThrustSpeed?: number;
  blastCooldownMs?: number;
  swipeEnabled?: boolean;
  swipeTipGap?: number;
  swipeMinDist?: number;
  swipeWindowMs?: number;
  swipeAxisDominance?: number;
  swipeMaxFingerDot?: number;
  swipeCooldownMs?: number;
  swipeRequireThumbTucked?: boolean;
}

export interface HoldConfig {
  stabilityFrames?: number;
  /** Time based stability (ms). When > 0 it replaces stabilityFrames, so 72 / 90 / 120 Hz behave the same. */
  stabilityMs?: number;
  holdDurationMs?: number;
  cooldownMs?: number;
}

export interface HoldState<T = string | number> {
  active: boolean;
  candidate: T | null;
  progress: number; // 0..1
  triggered: boolean;
}

// Legacy / Phase 1 compatibility aliases
export type HandState = SingleHandState;
export type HaathUpdateResult = HaathFrameState;
export type CircleResult = CircleState;
export type TriangleResult = TriangleState;
export type BlastResult = BlastState;
export type CurlState = FingerExtensionState;
export interface StrikeResult {
  type: StrikeType;
  velocity: Vec3;
  speed: number;
  momentum: Vec3;
}

