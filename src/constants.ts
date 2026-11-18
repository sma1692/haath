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
// export const PUNCH_SPEED = 1.3;
// export const SLAP_SPEED = 1.8;
export const PUNCH_SPEED = 1.0; // playtest 2: short jabs never reached 1.3 m/s (moved here from DunJun)
export const SLAP_SPEED = 1.4;  // playtest 3: short slaps never reached 1.8 m/s
// export const SLAP_SPEED = 1.5;  // gesture overlap pass: 1.4 let fast open-hand reaches fire slaps; the strike latch covers short slaps
// Playtest 18 Nov: 1.5 made slaps buggy on headset, back to 1.4.
// Strike grace window: a fist (punch) or open hand (slap) keeps its strike for this long after the
// last frame above the speed gate, so short strikes that are already slowing at contact still land.
export const STRIKE_LATCH_MS = 180;

// Minimum anatomical bone length / joint span (meters) below which WebXR tracking is considered collapsed
export const MIN_ANATOMICAL_BONE_LENGTH = 0.03;

// Palm sphere collider radius (anchored at index-finger-phalanx-proximal)
export const PALM_COLLIDER_RADIUS = 0.05;

// Multi-sphere hand volume radii for testHandSphereCollision (meters)
// Palm sphere uses PALM_COLLIDER_RADIUS anchored at palmCenter (middle metacarpal midpoint)
export const WRIST_COLLIDER_RADIUS = 0.04;
export const FINGERTIP_COLLIDER_RADIUS = 0.025;

// Hand-to-environment contact modes
export const HAND_CONTACT_MODES = {
  TOUCH: 'touch',
  CONSUMABLE: 'consumable',
  COMBAT: 'combat',
} as const;

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
// Palm-opposition gate: dot(nL, nR) must be below this (palms facing each other, nL and nR near -1)
export const CLAP_PALM_OPPOSE_DOT = -0.6;
// Palm-facing gate tolerance: facing may have held within this many tracked frames of the contact frame
export const CLAP_FACING_TOLERANCE_FRAMES = 2;
// Static sign shape gates (scale invariant: distances are divided by the knuckle span,
// dist(indexProximal, pinkyProximal), which is ~55-65mm on an adult hand).
// A finger is curled when dist(tip, ownProximal) / span <= SIGN_CURL_MAX_RATIO (curled ~0.4-0.6, relaxed ~0.9+).
// export const SIGN_CURL_MAX_RATIO = 0.85;
// export const SIGN_CURL_MAX_RATIO = 1.0; // playtest 2: 0.85 needed a really tight fist for thumbs up/down
// export const SIGN_CURL_MAX_RATIO = 1.15; // playtest 3: 1.0 still needed a tight fist for thumbs up/down
export const SIGN_CURL_MAX_RATIO = 1.30; // playtest 4: looser curl gate for relaxed fist in thumbs up/down
// A finger is outstretched when dist(tip, ownProximal) / span >= SIGN_EXTEND_MIN_RATIO (straight ~1.3).
// export const SIGN_EXTEND_MIN_RATIO = 1.1;
export const SIGN_EXTEND_MIN_RATIO = 0.92; // playtest 4: slightly looser outstretched finger reach
// Thumbs up/down: cos angle between pinkyTip->indexTip and thumbProximal->thumbTip must be >= this (~60 deg).
// export const THUMBS_ALIGN_MIN_DOT = 0.5;
// export const THUMBS_ALIGN_MIN_DOT = 0.3; // ~72 deg; playtest: 0.5 (60 deg) needed a hard-stretched thumb
// export const THUMBS_ALIGN_MIN_DOT = 0.1; // ~84 deg; playtest 3: 0.3 still rejected relaxed thumbs
export const THUMBS_ALIGN_MIN_DOT = -0.15; // ~98 deg; playtest 4: allow tilted/angled thumbs up/down without rigid stack alignment
// Thumbs up/down direction gate (thumb Y component), looser than DIRECTION_THRESHOLD (0.72, ~44 deg).
// export const THUMBS_DIRECTION_THRESHOLD = 0.6; // ~53 deg from vertical
export const THUMBS_DIRECTION_THRESHOLD = 0.42; // ~65 deg from vertical; playtest 4: natural angled thumbs up/down
// isThumbReallyOut: thumb tip must reach this fraction of the palm width away from the middle knuckle.
// export const THUMB_OUT_RATIO = 1.0;
// export const THUMB_OUT_RATIO = 0.85; // playtest 2: 1.0 needed a fully outstretched thumb
// export const THUMB_OUT_RATIO = 0.78; // playtest 3: slightly less thumb stretch
export const THUMB_OUT_RATIO = 0.68; // playtest 4: relaxed thumb extension for thumbs up/down & 1-finger gun
// Gun: ring + pinky count as curled at this reach ratio (looser than the curl-dot finger state).
// export const GUN_TUCK_MAX_RATIO = 1.05;
export const GUN_TUCK_MAX_RATIO = 1.22; // playtest 4: generous tuck tolerance for tendon-coupled fingers in gun pose
// Peace: angle between indexProximal->indexTip and middleProximal->middleTip must exceed this (degrees).
// Fingers held together (two-finger gun / swipe pose) sit below it.
// export const PEACE_MIN_SPREAD_DEG = 15;
export const PEACE_MIN_SPREAD_DEG = 5; // playtest: 15 needed a wide V

// Sign hysteresis (gesture overlap pass). The playtest 4 values above stay as the HOLD (exit) gates:
// a sign that is already showing keeps them, so a held pose never flickers out. A NEW sign must pass the
// stricter ENTER gates below. This leaves a dead zone between neighbouring signs, so one loose pose can no
// longer match fist, thumbs, gun and peace at once (e.g. a finger at reach 1.0 was both curled <= 1.30 and
// outstretched >= 0.92).
// Curled to enter a sign (hold: SIGN_CURL_MAX_RATIO 1.30). Between playtest 3 (1.15 felt tight) and 4.
export const SIGN_CURL_ENTER_MAX_RATIO = 1.15;
// Outstretched to enter a sign (hold: SIGN_EXTEND_MIN_RATIO 0.92). Kept clear of SIGN_CURL_ENTER_MAX_RATIO.
export const SIGN_EXTEND_ENTER_MIN_RATIO = 1.05;
// Thumbs up/down to enter (hold: THUMBS_ALIGN_MIN_DOT -0.15, THUMBS_DIRECTION_THRESHOLD 0.42, THUMB_OUT_RATIO 0.68).
export const THUMBS_ENTER_ALIGN_MIN_DOT = 0.2;      // ~78 deg: the thumb must run along the fist, not across it
export const THUMBS_ENTER_DIRECTION_THRESHOLD = 0.5; // ~60 deg from vertical
export const THUMBS_ENTER_THUMB_OUT_RATIO = 0.78;    // thumb clearly away from the fist
// Gun tuck to enter (hold: GUN_TUCK_MAX_RATIO 1.22).
export const GUN_TUCK_ENTER_MAX_RATIO = 1.1;
// 1-finger gun: middle still counts as tucked when the index reaches this much further (tendon coupling).
export const GUN_INDEX_LEAD_RATIO = 0.18;
// Peace V spread to enter (hold: PEACE_MIN_SPREAD_DEG 5).
export const PEACE_ENTER_MIN_SPREAD_DEG = 10;

// Newell's method 3D circle trajectory thresholds
export const CIRCLE_HISTORY_FRAMES = 90;
export const CIRCLE_MIN_SAMPLES = 30;
export const CIRCLE_MIN_RADIUS = 0.06;
export const CIRCLE_MAX_IRREGULARITY = 0.55;
export const CIRCLE_MIN_REVOLUTIONS = 1.2;
export const DISC_FIRE_COOLDOWN_MS = 800;

// Dwell / Hold recognizer defaults
// export const HOLD_SIGN_STABILITY_FRAMES = 10;
export const HOLD_SIGN_STABILITY_FRAMES = 6; // playtest 3: 10 frames reset on every tracking flicker (moved here from DunJun)
export const HOLD_COUNT_STABILITY_FRAMES = 6;
export const HOLD_DEFAULT_DURATION_MS = 1000;
// Tuned dwell presets (moved here from DunJun): menu navigation, finger-count selection, quick pause.
// export const HOLD_NAV_DURATION_MS = 562;
// export const HOLD_COUNT_DURATION_MS = 281;
// Gesture overlap pass: 562 / 281 let the in-between pose (while forming the real sign) complete a hold.
export const HOLD_NAV_DURATION_MS = 650;
export const HOLD_COUNT_DURATION_MS = 350;
// Time based sign stability (ms). Frame counts mean different times at 72 / 90 / 120 Hz;
// 70 ms is ~5 frames at 72 Hz and ~6 at 90 Hz. Opt in via HoldConfig.stabilityMs.
export const HOLD_SIGN_STABILITY_MS = 70;
export const HOLD_PAUSE_DURATION_MS = 281;
export const HOLD_COOLDOWN_MS = 800;

// Two-finger swipe ("brush") thresholds
export const SWIPE_TIP_GAP = 0.03;            // Max index/middle tip gap (m) for the held-together pose
export const SWIPE_MIN_DIST = 0.07;           // Min travel (m) along the dominant axis
export const SWIPE_WINDOW_MS = 300;           // Travel must happen within this window
export const SWIPE_AXIS_DOMINANCE = 0.75;     // Dominant axis share of total travel
export const SWIPE_MAX_FINGER_DOT = 0.5;      // Max |cos| between travel and finger direction (rejects gun aim / recoil)
export const SWIPE_COOLDOWN_MS = 400;         // Min gap between two fired swipes on the same hand
export const SWIPE_POSE_GRACE_FRAMES = 3;     // Tracking dropout frames tolerated mid-stroke
export const SWIPE_SAMPLE_CAPACITY = 48;      // Ring buffer size (covers 300ms at 120Hz with headroom)

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
  ARCHETYPES: {
    TRIANGLE: 'triangle',
    CIRCLE: 'circle',
    BLAST: 'blast',
  },
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
