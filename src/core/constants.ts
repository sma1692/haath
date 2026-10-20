// Tuned default thresholds - extracted from DunJun Constants in Phase 2

// Finger curl: dot-product threshold below which a phalanx segment is considered "curled"
export const CURL_DOT = 0.5;

// Pinch: distance (meters) between index-tip and thumb-tip for active pinch
export const PINCH_DIST = 0.03;

// Strike velocity thresholds (meters per second)
export const PUNCH_SPEED = 2.5;
export const SLAP_SPEED = 1.8;

// Newell's method circle detector config
export const SPELL_CONFIG = {
  HISTORY_FRAMES: 90,
  MIN_RADIUS: 0.08,
  MAX_RADIUS: 0.45,
  MAX_PLANE_VARIANCE: 0.015,
  CIRCLE_MIN_REVOLUTIONS: 1.0,
} as const;

// Phalanx joint-name chains per finger (metacarpal -> tip)
// Used by curl recognizer to walk the bone segments
export const PHALANGES = {
  thumb:  ['thumb-metacarpal',       'thumb-phalanx-proximal',         'thumb-phalanx-distal',                                   'thumb-tip'],
  index:  ['index-finger-metacarpal', 'index-finger-phalanx-proximal',  'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal',  'index-finger-tip'],
  middle: ['middle-finger-metacarpal','middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate','middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring:   ['ring-finger-metacarpal',  'ring-finger-phalanx-proximal',   'ring-finger-phalanx-intermediate',  'ring-finger-phalanx-distal',   'ring-finger-tip'],
  pinky:  ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal',  'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal',  'pinky-finger-tip'],
} as const;
