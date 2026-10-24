// 25 WebXR joint names, default thresholds, spell/circle/clap/hold configs
// Extracted from DunJun Constants (src/global.js & systems)

export const XR_HAND_JOINTS = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
] as const;

export const JOINT_COUNT = 25;
export const FLOATS_PER_JOINT = 7; // x, y, z, qx, qy, qz, qw
export const POS_HISTORY_COUNT = 20;

// Numeric joint indices in XR_HAND_JOINTS for O(1) flat buffer lookup
export const JOINT_INDEX = {
  WRIST: 0,
  THUMB_METACARPAL: 1,
  THUMB_PROXIMAL: 2,
  THUMB_DISTAL: 3,
  THUMB_TIP: 4,
  INDEX_METACARPAL: 5,
  INDEX_PROXIMAL: 6,
  INDEX_INTERMEDIATE: 7,
  INDEX_DISTAL: 8,
  INDEX_TIP: 9,
  MIDDLE_METACARPAL: 10,
  MIDDLE_PROXIMAL: 11,
  MIDDLE_INTERMEDIATE: 12,
  MIDDLE_DISTAL: 13,
  MIDDLE_TIP: 14,
  RING_METACARPAL: 15,
  RING_PROXIMAL: 16,
  RING_INTERMEDIATE: 17,
  RING_DISTAL: 18,
  RING_TIP: 19,
  PINKY_METACARPAL: 20,
  PINKY_PROXIMAL: 21,
  PINKY_INTERMEDIATE: 22,
  PINKY_DISTAL: 23,
  PINKY_TIP: 24,
} as const;

// Finger curl: dot-product threshold above which collinear bone segments are considered extended
export const CURL_DOT = 0.6;

// Legacy Euclidean mode thresholds (meters from wrist to tip)
export const THUMBOPEN = 0.07;
export const FINGEROPEN = 0.10;

// Cardinal direction Y-component threshold for thehro/niche & thumbsup/thumbsdown
export const DIRECTION_THRESHOLD = 0.72;

// Pinch: distance (meters) between index-tip and thumb-tip for active pinch
export const PINCH_DIST = 0.03;

// Ballistic strike velocity thresholds (meters per second on ring-finger-tip)
export const PUNCH_SPEED = 1.3;
export const SLAP_SPEED = 1.8;

// Palm sphere collider radius (anchored at index-finger-phalanx-proximal)
export const PALM_COLLIDER_RADIUS = 0.05;

// Bimanual triangle / diamond thresholds
export const TRIANGLE_TIP_DIST = 0.12;
export const TRIANGLE_THUMB_DIST = 0.14;
export const TRIANGLE_FINGER_DOT = 0.35;

// Double-clap hysteresis & timing thresholds
export const CLAP_ORIGIN_MIN_DIST = 0.05;
export const CLAP_CONTACT_DIST = 0.17;
export const CLAP_SEPARATION_DIST = 0.195;
export const CLAP_DOUBLE_MIN_MS = 90;
export const CLAP_DOUBLE_MAX_MS = 1100;

// Newell's method 3D circle trajectory thresholds
export const CIRCLE_HISTORY_FRAMES = 90;
export const CIRCLE_MIN_SAMPLES = 30;
export const CIRCLE_MIN_RADIUS = 0.06;
export const CIRCLE_MAX_IRREGULARITY = 0.55;
export const CIRCLE_MIN_REVOLUTIONS = 1.2;
export const DISC_FIRE_COOLDOWN_MS = 800;

// Dwell / Hold recognizer defaults
export const HOLD_SIGN_STABILITY_FRAMES = 10;
export const HOLD_COUNT_STABILITY_FRAMES = 6;
export const HOLD_DEFAULT_DURATION_MS = 1000;
export const HOLD_COOLDOWN_MS = 800;

// Collision debounce duration (ms)
export const COLLISION_DURATION = 200;

// Dual-palm blast / burst spell thresholds (3rd core spell archetype)
export const BLAST_PALM_DIST = 0.30;
export const BLAST_FORWARD_DOT = -0.4;
export const BLAST_CHARGE_DURATION_MS = 600;
export const BLAST_THRUST_SPEED = 1.0;
export const BLAST_COOLDOWN_MS = 800;

export const BLAST_CONFIG = {
  PALM_DIST: BLAST_PALM_DIST,
  FORWARD_DOT: BLAST_FORWARD_DOT,
  CHARGE_DURATION_MS: BLAST_CHARGE_DURATION_MS,
  THRUST_SPEED: BLAST_THRUST_SPEED,
  COOLDOWN_MS: BLAST_COOLDOWN_MS,
} as const;

// Consolidated 3 core spell archetypes (Triangle, Circle, Blast) config object
export const SPELL_CONFIG = {
  HISTORY_FRAMES: CIRCLE_HISTORY_FRAMES,
  MIN_SAMPLES: CIRCLE_MIN_SAMPLES,
  MIN_RADIUS: CIRCLE_MIN_RADIUS,
  MAX_RADIUS: 0.45,
  MAX_IRREGULARITY: CIRCLE_MAX_IRREGULARITY,
  MAX_PLANE_VARIANCE: 0.015,
  CIRCLE_MIN_REVOLUTIONS: CIRCLE_MIN_REVOLUTIONS,
  DISC_FIRE_COOLDOWN_MS: DISC_FIRE_COOLDOWN_MS,
  // Triangle archetype
  TRIANGLE_TIP_DIST,
  TRIANGLE_THUMB_DIST,
  TRIANGLE_FINGER_DOT,
  // Blast archetype
  BLAST_PALM_DIST,
  BLAST_FORWARD_DOT,
  BLAST_CHARGE_DURATION_MS,
  BLAST_THRUST_SPEED,
  BLAST_COOLDOWN_MS,
} as const;

// Phalanx joint-name chains per finger (metacarpal -> tip)
export const PHALANGES = {
  thumb:  ['thumb-metacarpal',        'thumb-phalanx-proximal',          'thumb-phalanx-distal',                                    'thumb-tip'],
  index:  ['index-finger-metacarpal', 'index-finger-phalanx-proximal',   'index-finger-phalanx-intermediate',  'index-finger-phalanx-distal',  'index-finger-tip'],
  middle: ['middle-finger-metacarpal','middle-finger-phalanx-proximal',  'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring:   ['ring-finger-metacarpal',  'ring-finger-phalanx-proximal',    'ring-finger-phalanx-intermediate',   'ring-finger-phalanx-distal',   'ring-finger-tip'],
  pinky:  ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal',   'pinky-finger-phalanx-intermediate',  'pinky-finger-phalanx-distal',  'pinky-finger-tip'],
} as const;
