// TypeScript interfaces for haath public surface

export type HandSide = 'left' | 'right';

// Subset of XRHandJoint names used internally
export type JointName =
  | 'wrist'
  | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
  | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
  | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
  | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
  | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';

export type HandSign =
  | 'fist' | 'open' | 'thehro' | 'niche' | 'poke'
  | 'gun' | 'gun-double'
  | 'pinch'
  | 'thumbsup' | 'thumbsdown'
  | 'rock-horns' | 'telephone' | 'pinkie-out'
  | 'birdie-1' | 'birdie-2'
  | 'none';

export type StrikeType = 'punch' | 'slap' | 'poke' | 'none';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CurlState {
  index: number;   // 0.0 (straight) -> 1.0 (fully curled)
  middle: number;
  ring: number;
  pinky: number;
  thumb: number;
  thumbOut: boolean;
}

export interface StrikeResult {
  type: StrikeType;
  velocity: Vec3;
  speed: number;
  momentum: Vec3;
}

export interface HandState {
  tracked: boolean;
  curl: CurlState;
  sign: HandSign;
  strike: StrikeResult;
}

export interface TriangleResult {
  active: boolean;
  centroid: Vec3;
  normal: Vec3;
  apex: Vec3;
  base: Vec3;
}

export interface CircleResult {
  active: boolean;
  centroid: Vec3;
  normal: Vec3;
  radius: number;
  progress: number; // 0.0 -> 1.0 swept fraction of full revolution
}

export interface TwoHandState {
  triangle: TriangleResult;
  clap: { active: boolean; count: number };
  prayerHold: { active: boolean; progress: number };
  crossChest: { active: boolean; progress: number };
}

export interface HaathUpdateResult {
  left: HandState;
  right: HandState;
  twoHand: TwoHandState;
  circle: CircleResult;
}

export interface HaathConfig {
  curlDot?: number;
  pinchDist?: number;
  punchSpeed?: number;
  slapSpeed?: number;
  circleMinRevolutions?: number;
  prayerHoldMs?: number;
  crossChestHoldMs?: number;
}
