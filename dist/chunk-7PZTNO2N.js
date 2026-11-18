// src/constants.ts
var XR_HAND_JOINTS = [
  "wrist",
  "thumb-metacarpal",
  "thumb-phalanx-proximal",
  "thumb-phalanx-distal",
  "thumb-tip",
  "index-finger-metacarpal",
  "index-finger-phalanx-proximal",
  "index-finger-phalanx-intermediate",
  "index-finger-phalanx-distal",
  "index-finger-tip",
  "middle-finger-metacarpal",
  "middle-finger-phalanx-proximal",
  "middle-finger-phalanx-intermediate",
  "middle-finger-phalanx-distal",
  "middle-finger-tip",
  "ring-finger-metacarpal",
  "ring-finger-phalanx-proximal",
  "ring-finger-phalanx-intermediate",
  "ring-finger-phalanx-distal",
  "ring-finger-tip",
  "pinky-finger-metacarpal",
  "pinky-finger-phalanx-proximal",
  "pinky-finger-phalanx-intermediate",
  "pinky-finger-phalanx-distal",
  "pinky-finger-tip"
];
var JOINT_COUNT = 25;
var FLOATS_PER_JOINT = 7;
var POS_HISTORY_COUNT = 20;
var JOINT_INDEX = {
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
  PINKY_TIP: 24
};
var CURL_DOT = 0.6;
var THUMBOPEN = 0.07;
var FINGEROPEN = 0.1;
var DIRECTION_THRESHOLD = 0.72;
var PINCH_DIST = 0.03;
var PUNCH_SPEED = 1;
var SLAP_SPEED = 1.4;
var STRIKE_LATCH_MS = 180;
var MIN_ANATOMICAL_BONE_LENGTH = 0.03;
var PALM_COLLIDER_RADIUS = 0.05;
var WRIST_COLLIDER_RADIUS = 0.04;
var FINGERTIP_COLLIDER_RADIUS = 0.025;
var HAND_CONTACT_MODES = {
  TOUCH: "touch",
  CONSUMABLE: "consumable",
  COMBAT: "combat"
};
var TRIANGLE_TIP_DIST = 0.12;
var TRIANGLE_THUMB_DIST = 0.14;
var TRIANGLE_FINGER_DOT = 0.35;
var CLAP_ORIGIN_MIN_DIST = 0.05;
var CLAP_CONTACT_DIST = 0.17;
var CLAP_SEPARATION_DIST = 0.195;
var CLAP_DOUBLE_MIN_MS = 90;
var CLAP_DOUBLE_MAX_MS = 1100;
var CLAP_PALM_OPPOSE_DOT = -0.6;
var CLAP_FACING_TOLERANCE_FRAMES = 2;
var SIGN_CURL_MAX_RATIO = 1.3;
var SIGN_EXTEND_MIN_RATIO = 0.92;
var THUMBS_ALIGN_MIN_DOT = -0.15;
var THUMBS_DIRECTION_THRESHOLD = 0.42;
var THUMB_OUT_RATIO = 0.68;
var GUN_TUCK_MAX_RATIO = 1.22;
var PEACE_MIN_SPREAD_DEG = 5;
var SIGN_CURL_ENTER_MAX_RATIO = 1.15;
var SIGN_EXTEND_ENTER_MIN_RATIO = 1.05;
var THUMBS_ENTER_ALIGN_MIN_DOT = 0.2;
var THUMBS_ENTER_DIRECTION_THRESHOLD = 0.5;
var THUMBS_ENTER_THUMB_OUT_RATIO = 0.78;
var GUN_TUCK_ENTER_MAX_RATIO = 1.1;
var GUN_INDEX_LEAD_RATIO = 0.18;
var PEACE_ENTER_MIN_SPREAD_DEG = 10;
var CIRCLE_HISTORY_FRAMES = 90;
var CIRCLE_MIN_SAMPLES = 30;
var CIRCLE_MIN_RADIUS = 0.06;
var CIRCLE_MAX_IRREGULARITY = 0.55;
var CIRCLE_MIN_REVOLUTIONS = 1.2;
var DISC_FIRE_COOLDOWN_MS = 800;
var HOLD_SIGN_STABILITY_FRAMES = 6;
var HOLD_COUNT_STABILITY_FRAMES = 6;
var HOLD_DEFAULT_DURATION_MS = 1e3;
var HOLD_NAV_DURATION_MS = 650;
var HOLD_COUNT_DURATION_MS = 350;
var HOLD_SIGN_STABILITY_MS = 70;
var HOLD_PAUSE_DURATION_MS = 281;
var HOLD_COOLDOWN_MS = 800;
var SWIPE_TIP_GAP = 0.03;
var SWIPE_MIN_DIST = 0.07;
var SWIPE_WINDOW_MS = 300;
var SWIPE_AXIS_DOMINANCE = 0.75;
var SWIPE_MAX_FINGER_DOT = 0.5;
var SWIPE_COOLDOWN_MS = 400;
var SWIPE_POSE_GRACE_FRAMES = 3;
var SWIPE_SAMPLE_CAPACITY = 48;
var COLLISION_DURATION = 200;
var BLAST_PALM_DIST = 0.3;
var BLAST_FORWARD_DOT = -0.4;
var BLAST_CHARGE_DURATION_MS = 600;
var BLAST_THRUST_SPEED = 1;
var BLAST_COOLDOWN_MS = 800;
var BLAST_CONFIG = {
  PALM_DIST: BLAST_PALM_DIST,
  FORWARD_DOT: BLAST_FORWARD_DOT,
  CHARGE_DURATION_MS: BLAST_CHARGE_DURATION_MS,
  THRUST_SPEED: BLAST_THRUST_SPEED,
  COOLDOWN_MS: BLAST_COOLDOWN_MS
};
var SPELL_CONFIG = {
  HISTORY_FRAMES: CIRCLE_HISTORY_FRAMES,
  MIN_SAMPLES: CIRCLE_MIN_SAMPLES,
  MIN_RADIUS: CIRCLE_MIN_RADIUS,
  MAX_RADIUS: 0.45,
  MAX_IRREGULARITY: CIRCLE_MAX_IRREGULARITY,
  MAX_PLANE_VARIANCE: 0.015,
  CIRCLE_MIN_REVOLUTIONS,
  DISC_FIRE_COOLDOWN_MS,
  ARCHETYPES: {
    TRIANGLE: "triangle",
    CIRCLE: "circle",
    BLAST: "blast"
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
  BLAST_COOLDOWN_MS
};
var PHALANGES = {
  thumb: ["thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip"],
  index: ["index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip"],
  middle: ["middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip"],
  ring: ["ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip"],
  pinky: ["pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"]
};

// src/math/vec3.ts
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b, out) {
  const ax = a.x, ay = a.y, az = a.z;
  const bx = b.x, by = b.y, bz = b.z;
  out.x = ay * bz - az * by;
  out.y = az * bx - ax * bz;
  out.z = ax * by - ay * bx;
  return out;
}
function sub(a, b, out) {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;
  return out;
}
function add(a, b, out) {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}
function normalize(v, out) {
  const len = hypot(v);
  if (len === 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }
  const inv = 1 / len;
  out.x = v.x * inv;
  out.y = v.y * inv;
  out.z = v.z * inv;
  return out;
}
function hypot(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function scale(v, s, out) {
  out.x = v.x * s;
  out.y = v.y * s;
  out.z = v.z * s;
  return out;
}
function distSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
function dist(a, b) {
  return Math.sqrt(distSq(a, b));
}
function v3Set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
function v3Copy(out, a, offset = 0) {
  out[0] = a[offset];
  out[1] = a[offset + 1];
  out[2] = a[offset + 2];
  return out;
}
function v3Sub(out, a, b, aOffset = 0, bOffset = 0) {
  out[0] = a[aOffset] - b[bOffset];
  out[1] = a[aOffset + 1] - b[bOffset + 1];
  out[2] = a[aOffset + 2] - b[bOffset + 2];
  return out;
}
function v3Add(out, a, b, aOffset = 0, bOffset = 0) {
  out[0] = a[aOffset] + b[bOffset];
  out[1] = a[aOffset + 1] + b[bOffset + 1];
  out[2] = a[aOffset + 2] + b[bOffset + 2];
  return out;
}
function v3Scale(out, a, s, aOffset = 0) {
  out[0] = a[aOffset] * s;
  out[1] = a[aOffset + 1] * s;
  out[2] = a[aOffset + 2] * s;
  return out;
}
function v3Dot(a, b, aOffset = 0, bOffset = 0) {
  return a[aOffset] * b[bOffset] + a[aOffset + 1] * b[bOffset + 1] + a[aOffset + 2] * b[bOffset + 2];
}
function v3Cross(out, a, b, aOffset = 0, bOffset = 0) {
  const ax = a[aOffset], ay = a[aOffset + 1], az = a[aOffset + 2];
  const bx = b[bOffset], by = b[bOffset + 1], bz = b[bOffset + 2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
function v3LenSq(a, offset = 0) {
  const x = a[offset], y = a[offset + 1], z = a[offset + 2];
  return x * x + y * y + z * z;
}
function v3Len(a, offset = 0) {
  return Math.sqrt(v3LenSq(a, offset));
}
function v3DistSq(a, b, aOffset = 0, bOffset = 0) {
  const dx = a[aOffset] - b[bOffset];
  const dy = a[aOffset + 1] - b[bOffset + 1];
  const dz = a[aOffset + 2] - b[bOffset + 2];
  return dx * dx + dy * dy + dz * dz;
}
function v3Dist(a, b, aOffset = 0, bOffset = 0) {
  return Math.sqrt(v3DistSq(a, b, aOffset, bOffset));
}
function v3Normalize(out, a, aOffset = 0) {
  const x = a[aOffset], y = a[aOffset + 1], z = a[aOffset + 2];
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len === 0) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  const inv = 1 / len;
  out[0] = x * inv;
  out[1] = y * inv;
  out[2] = z * inv;
  return out;
}

export { BLAST_CHARGE_DURATION_MS, BLAST_CONFIG, BLAST_COOLDOWN_MS, BLAST_FORWARD_DOT, BLAST_PALM_DIST, BLAST_THRUST_SPEED, CIRCLE_HISTORY_FRAMES, CIRCLE_MAX_IRREGULARITY, CIRCLE_MIN_RADIUS, CIRCLE_MIN_REVOLUTIONS, CIRCLE_MIN_SAMPLES, CLAP_CONTACT_DIST, CLAP_DOUBLE_MAX_MS, CLAP_DOUBLE_MIN_MS, CLAP_FACING_TOLERANCE_FRAMES, CLAP_ORIGIN_MIN_DIST, CLAP_PALM_OPPOSE_DOT, CLAP_SEPARATION_DIST, COLLISION_DURATION, CURL_DOT, DIRECTION_THRESHOLD, DISC_FIRE_COOLDOWN_MS, FINGEROPEN, FINGERTIP_COLLIDER_RADIUS, FLOATS_PER_JOINT, GUN_INDEX_LEAD_RATIO, GUN_TUCK_ENTER_MAX_RATIO, GUN_TUCK_MAX_RATIO, HAND_CONTACT_MODES, HOLD_COOLDOWN_MS, HOLD_COUNT_DURATION_MS, HOLD_COUNT_STABILITY_FRAMES, HOLD_DEFAULT_DURATION_MS, HOLD_NAV_DURATION_MS, HOLD_PAUSE_DURATION_MS, HOLD_SIGN_STABILITY_FRAMES, HOLD_SIGN_STABILITY_MS, JOINT_COUNT, JOINT_INDEX, MIN_ANATOMICAL_BONE_LENGTH, PALM_COLLIDER_RADIUS, PEACE_ENTER_MIN_SPREAD_DEG, PEACE_MIN_SPREAD_DEG, PHALANGES, PINCH_DIST, POS_HISTORY_COUNT, PUNCH_SPEED, SIGN_CURL_ENTER_MAX_RATIO, SIGN_CURL_MAX_RATIO, SIGN_EXTEND_ENTER_MIN_RATIO, SIGN_EXTEND_MIN_RATIO, SLAP_SPEED, SPELL_CONFIG, STRIKE_LATCH_MS, SWIPE_AXIS_DOMINANCE, SWIPE_COOLDOWN_MS, SWIPE_MAX_FINGER_DOT, SWIPE_MIN_DIST, SWIPE_POSE_GRACE_FRAMES, SWIPE_SAMPLE_CAPACITY, SWIPE_TIP_GAP, SWIPE_WINDOW_MS, THUMBOPEN, THUMBS_ALIGN_MIN_DOT, THUMBS_DIRECTION_THRESHOLD, THUMBS_ENTER_ALIGN_MIN_DOT, THUMBS_ENTER_DIRECTION_THRESHOLD, THUMBS_ENTER_THUMB_OUT_RATIO, THUMB_OUT_RATIO, TRIANGLE_FINGER_DOT, TRIANGLE_THUMB_DIST, TRIANGLE_TIP_DIST, WRIST_COLLIDER_RADIUS, XR_HAND_JOINTS, add, cross, dist, distSq, dot, hypot, normalize, scale, sub, v3Add, v3Copy, v3Cross, v3Dist, v3DistSq, v3Dot, v3Len, v3LenSq, v3Normalize, v3Scale, v3Set, v3Sub };
//# sourceMappingURL=chunk-7PZTNO2N.js.map
//# sourceMappingURL=chunk-7PZTNO2N.js.map