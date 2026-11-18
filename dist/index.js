import { PINCH_DIST, DIRECTION_THRESHOLD, CURL_DOT, THUMBOPEN, FINGEROPEN, TRIANGLE_TIP_DIST, TRIANGLE_THUMB_DIST, TRIANGLE_FINGER_DOT, MIN_ANATOMICAL_BONE_LENGTH, SWIPE_TIP_GAP, PUNCH_SPEED, SLAP_SPEED, COLLISION_DURATION, PALM_COLLIDER_RADIUS, WRIST_COLLIDER_RADIUS, FINGERTIP_COLLIDER_RADIUS, HOLD_SIGN_STABILITY_FRAMES, HOLD_DEFAULT_DURATION_MS, HOLD_COOLDOWN_MS, CIRCLE_HISTORY_FRAMES, CIRCLE_MIN_SAMPLES, CIRCLE_MIN_RADIUS, CIRCLE_MAX_IRREGULARITY, CIRCLE_MIN_REVOLUTIONS, DISC_FIRE_COOLDOWN_MS, JOINT_INDEX, FLOATS_PER_JOINT, SWIPE_MIN_DIST, SWIPE_WINDOW_MS, SWIPE_AXIS_DOMINANCE, SWIPE_MAX_FINGER_DOT, SWIPE_COOLDOWN_MS, SWIPE_POSE_GRACE_FRAMES, SWIPE_SAMPLE_CAPACITY, THUMBS_ALIGN_MIN_DOT, THUMBS_ENTER_ALIGN_MIN_DOT, GUN_INDEX_LEAD_RATIO, THUMB_OUT_RATIO, v3Sub, v3Normalize, v3Dot, v3Dist, THUMBS_ENTER_THUMB_OUT_RATIO, POS_HISTORY_COUNT, v3Cross, CLAP_ORIGIN_MIN_DIST, CLAP_SEPARATION_DIST, CLAP_CONTACT_DIST, CLAP_DOUBLE_MIN_MS, CLAP_DOUBLE_MAX_MS, CLAP_PALM_OPPOSE_DOT, CLAP_FACING_TOLERANCE_FRAMES, BLAST_PALM_DIST, BLAST_FORWARD_DOT, BLAST_CHARGE_DURATION_MS, BLAST_THRUST_SPEED, BLAST_COOLDOWN_MS, v3Len, STRIKE_LATCH_MS, JOINT_COUNT, XR_HAND_JOINTS, THUMBS_DIRECTION_THRESHOLD, THUMBS_ENTER_DIRECTION_THRESHOLD, SIGN_CURL_MAX_RATIO, SIGN_CURL_ENTER_MAX_RATIO, SIGN_EXTEND_MIN_RATIO, SIGN_EXTEND_ENTER_MIN_RATIO, PEACE_MIN_SPREAD_DEG, PEACE_ENTER_MIN_SPREAD_DEG, GUN_TUCK_MAX_RATIO, GUN_TUCK_ENTER_MAX_RATIO } from './chunk-7PZTNO2N.js';
export { BLAST_CHARGE_DURATION_MS, BLAST_CONFIG, BLAST_COOLDOWN_MS, BLAST_FORWARD_DOT, BLAST_PALM_DIST, BLAST_THRUST_SPEED, CIRCLE_HISTORY_FRAMES, CIRCLE_MAX_IRREGULARITY, CIRCLE_MIN_RADIUS, CIRCLE_MIN_REVOLUTIONS, CIRCLE_MIN_SAMPLES, CLAP_CONTACT_DIST, CLAP_DOUBLE_MAX_MS, CLAP_DOUBLE_MIN_MS, CLAP_ORIGIN_MIN_DIST, CLAP_SEPARATION_DIST, COLLISION_DURATION, CURL_DOT, DIRECTION_THRESHOLD, DISC_FIRE_COOLDOWN_MS, FINGEROPEN, FINGERTIP_COLLIDER_RADIUS, FLOATS_PER_JOINT, GUN_INDEX_LEAD_RATIO, GUN_TUCK_ENTER_MAX_RATIO, HAND_CONTACT_MODES, HOLD_COOLDOWN_MS, HOLD_COUNT_DURATION_MS, HOLD_COUNT_STABILITY_FRAMES, HOLD_DEFAULT_DURATION_MS, HOLD_NAV_DURATION_MS, HOLD_PAUSE_DURATION_MS, HOLD_SIGN_STABILITY_FRAMES, HOLD_SIGN_STABILITY_MS, JOINT_COUNT, JOINT_INDEX, MIN_ANATOMICAL_BONE_LENGTH, PALM_COLLIDER_RADIUS, PEACE_ENTER_MIN_SPREAD_DEG, PHALANGES, PINCH_DIST, POS_HISTORY_COUNT, PUNCH_SPEED, SIGN_CURL_ENTER_MAX_RATIO, SIGN_EXTEND_ENTER_MIN_RATIO, SLAP_SPEED, SPELL_CONFIG, STRIKE_LATCH_MS, SWIPE_AXIS_DOMINANCE, SWIPE_COOLDOWN_MS, SWIPE_MAX_FINGER_DOT, SWIPE_MIN_DIST, SWIPE_POSE_GRACE_FRAMES, SWIPE_SAMPLE_CAPACITY, SWIPE_TIP_GAP, SWIPE_WINDOW_MS, THUMBOPEN, THUMBS_ENTER_ALIGN_MIN_DOT, THUMBS_ENTER_DIRECTION_THRESHOLD, THUMBS_ENTER_THUMB_OUT_RATIO, TRIANGLE_FINGER_DOT, TRIANGLE_THUMB_DIST, TRIANGLE_TIP_DIST, WRIST_COLLIDER_RADIUS, XR_HAND_JOINTS, add, cross, dist, distSq, dot, hypot, normalize, scale, sub, v3Add, v3Copy, v3Cross, v3Dist, v3DistSq, v3Dot, v3Len, v3LenSq, v3Normalize, v3Scale, v3Set, v3Sub } from './chunk-7PZTNO2N.js';

// src/math/colliders.ts
function getX(v) {
  return "x" in v ? v.x : v[0];
}
function getY(v) {
  return "y" in v ? v.y : v[1];
}
function getZ(v) {
  return "z" in v ? v.z : v[2];
}
function intersectSphereSphere(ax, ay, az, ar, bx, by, bz, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  const r = ar + br;
  return dx * dx + dy * dy + dz * dz < r * r;
}
function intersectLaserSphere(origin, normal, length, width, targetPos, targetRadius) {
  const rx = getX(targetPos) - getX(origin);
  const ry = getY(targetPos) - getY(origin);
  const rz = getZ(targetPos) - getZ(origin);
  const nx = getX(normal);
  const ny = getY(normal);
  const nz = getZ(normal);
  const a = rx * nx + ry * ny + rz * nz;
  if (a < 0 || a > length) return false;
  const rSq = rx * rx + ry * ry + rz * rz;
  const lateralSq = Math.max(0, rSq - a * a);
  const hitRadius = width * 0.5 + targetRadius;
  return lateralSq < hitRadius * hitRadius;
}
function intersectDiscSphere(discPos, discNormal, discRadius, discTube, targetPos, targetRadius) {
  const rx = getX(targetPos) - getX(discPos);
  const ry = getY(targetPos) - getY(discPos);
  const rz = getZ(targetPos) - getZ(discPos);
  const nx = getX(discNormal);
  const ny = getY(discNormal);
  const nz = getZ(discNormal);
  const a = rx * nx + ry * ny + rz * nz;
  if (Math.abs(a) >= discTube + targetRadius) return false;
  const rSq = rx * rx + ry * ry + rz * rz;
  const lateralSq = Math.max(0, rSq - a * a);
  const radialThreshold = discRadius + targetRadius;
  return lateralSq < radialThreshold * radialThreshold;
}
var CollisionCooldownTracker = class {
  _cooldownMs;
  _lastHitTime = /* @__PURE__ */ new Map();
  constructor(cooldownMs = COLLISION_DURATION) {
    this._cooldownMs = cooldownMs;
  }
  _key(targetId, hand, gesture) {
    return `${targetId}:${hand}:${gesture}`;
  }
  /**
   * Returns true if the collision for (targetId, hand, gesture) is currently inside its cooldown window.
   */
  isActiveCollision(targetId, hand, gesture, nowMs = performance.now()) {
    const prev = this._lastHitTime.get(this._key(targetId, hand, gesture));
    if (prev === void 0) return false;
    return nowMs - prev < this._cooldownMs;
  }
  /**
   * Returns true if the cooldown has elapsed (ready to trigger again).
   */
  isTimeOutCollision(targetId, hand, gesture, nowMs = performance.now()) {
    return !this.isActiveCollision(targetId, hand, gesture, nowMs);
  }
  /**
   * Checks if (targetId, hand, gesture) can trigger at nowMs; if so, records the timestamp and returns true.
   */
  tryTrigger(targetId, hand, gesture, nowMs = performance.now()) {
    const key = this._key(targetId, hand, gesture);
    const prev = this._lastHitTime.get(key);
    if (prev !== void 0 && nowMs - prev < this._cooldownMs) {
      return false;
    }
    this._lastHitTime.set(key, nowMs);
    return true;
  }
  reset() {
    this._lastHitTime.clear();
  }
};
function sphereSphere(centerA, radiusA, centerB, radiusB) {
  return intersectSphereSphere(
    centerA.x,
    centerA.y,
    centerA.z,
    radiusA,
    centerB.x,
    centerB.y,
    centerB.z,
    radiusB
  );
}
function cylinderSphere(origin, dir, length, radius, sphereCenter, sphereRadius) {
  return intersectLaserSphere(origin, dir, length, radius * 2, sphereCenter, sphereRadius);
}
function discSphere(discCenter, discNormal, discRadius, sphereCenter, sphereRadius) {
  return intersectDiscSphere(discCenter, discNormal, discRadius, 0, sphereCenter, sphereRadius);
}
function sphereHitSq(hx, hy, hz, tx, ty, tz, r) {
  const dx = hx - tx;
  const dy = hy - ty;
  const dz = hz - tz;
  return dx * dx + dy * dy + dz * dz < r * r;
}
function gestureMatches(gesture, required) {
  if (typeof required === "string") return gesture === required;
  for (let i = 0; i < required.length; i++) {
    if (required[i] === gesture) return true;
  }
  return false;
}
function testHandSphereCollision(hand, targetX, targetY, targetZ, targetRadius, options, handedness = "") {
  if (!hand || !hand.tracked) return "none";
  const mode = options?.mode ?? "touch";
  const gesture = options?.gesture ?? hand.gesture;
  if (mode === "combat") {
    if (!gesture || gesture === "idle") return "none";
    const required = options?.requiredGesture;
    if (required !== void 0 && !gestureMatches(gesture, required)) return "none";
  }
  const pad = options?.radiusPadding ?? 0;
  const palmR = (options?.palmRadius ?? PALM_COLLIDER_RADIUS) + pad + targetRadius;
  const wristR = (options?.wristRadius ?? WRIST_COLLIDER_RADIUS) + pad + targetRadius;
  const tipR = (options?.fingertipRadius ?? FINGERTIP_COLLIDER_RADIUS) + pad + targetRadius;
  const pc = hand.palmCenter;
  const wr = hand.wristPosition;
  const tp = hand.indexTipPosition;
  let part = "none";
  if (sphereHitSq(pc[0], pc[1], pc[2], targetX, targetY, targetZ, palmR)) {
    part = "palm";
  } else if (sphereHitSq(tp[0], tp[1], tp[2], targetX, targetY, targetZ, tipR)) {
    part = "indexTip";
  } else if (sphereHitSq(wr[0], wr[1], wr[2], targetX, targetY, targetZ, wristR)) {
    part = "wrist";
  } else if ((options?.swept ?? true) && hand.hasPrevPalm) {
    const ptx = options?.prevTargetX ?? targetX;
    const pty = options?.prevTargetY ?? targetY;
    const ptz = options?.prevTargetZ ?? targetZ;
    const pp = hand.prevPalmCenter;
    const r0x = pp[0] - ptx;
    const r0y = pp[1] - pty;
    const r0z = pp[2] - ptz;
    const dx = pc[0] - targetX - r0x;
    const dy = pc[1] - targetY - r0y;
    const dz = pc[2] - targetZ - r0z;
    const dd = dx * dx + dy * dy + dz * dz;
    if (dd > 1e-12) {
      let t = -(r0x * dx + r0y * dy + r0z * dz) / dd;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const cx = r0x + t * dx;
      const cy = r0y + t * dy;
      const cz = r0z + t * dz;
      if (cx * cx + cy * cy + cz * cz < palmR * palmR) part = "sweep";
    }
  }
  if (part === "none") return "none";
  if (mode === "combat" && options?.cooldown && options.targetId !== void 0) {
    const handKey = options.handedness ?? handedness;
    if (!options.cooldown.tryTrigger(options.targetId, handKey, gesture, options.nowMs)) {
      return "none";
    }
  }
  return part;
}

// src/recognizers/hold.ts
var HoldRecognizer = class {
  _stabilityFrames;
  _stabilityMs;
  _holdDurationMs;
  _cooldownMs;
  _rawCandidate = null;
  _stableFrames = 0;
  _stableMs = 0;
  _lockedCandidate = null;
  _elapsedMs = 0;
  _lastTriggerMs = -Infinity;
  state = {
    active: false,
    candidate: null,
    progress: 0,
    triggered: false
  };
  constructor(config = {}) {
    this._stabilityFrames = config.stabilityFrames ?? HOLD_SIGN_STABILITY_FRAMES;
    this._stabilityMs = config.stabilityMs ?? 0;
    this._holdDurationMs = config.holdDurationMs ?? HOLD_DEFAULT_DURATION_MS;
    this._cooldownMs = config.cooldownMs ?? HOLD_COOLDOWN_MS;
  }
  _isIdleCandidate(candidate) {
    return candidate === null || candidate === void 0 || candidate === "idle" || candidate === "unknown" || candidate === "none" || candidate === 0;
  }
  /**
   * Advances the stability + dwell state machine.
   * Accepts `delta` in either milliseconds (>= 1) or seconds (< 1).
   */
  update(candidate, delta, nowMs = performance.now()) {
    this.state.triggered = false;
    const dtMs = delta > 0 && delta < 1 ? delta * 1e3 : Math.max(0, delta);
    if (nowMs - this._lastTriggerMs < this._cooldownMs) {
      this.state.active = false;
      this.state.candidate = null;
      this.state.progress = 0;
      return this.state;
    }
    if (this._isIdleCandidate(candidate)) {
      this._rawCandidate = null;
      this._stableFrames = 0;
      this._stableMs = 0;
      this._lockedCandidate = null;
      this._elapsedMs = 0;
      this.state.active = false;
      this.state.candidate = null;
      this.state.progress = 0;
      return this.state;
    }
    if (candidate === this._rawCandidate) {
      this._stableFrames++;
      this._stableMs += dtMs;
    } else {
      this._rawCandidate = candidate;
      this._stableFrames = 1;
      this._stableMs = dtMs;
      if (this._lockedCandidate !== candidate) {
        this._lockedCandidate = null;
        this._elapsedMs = 0;
      }
    }
    const unstable = this._stabilityMs > 0 ? this._stableMs < this._stabilityMs : this._stableFrames < this._stabilityFrames;
    if (unstable) {
      this.state.active = false;
      this.state.candidate = candidate;
      this.state.progress = 0;
      return this.state;
    }
    if (this._lockedCandidate !== candidate) {
      this._lockedCandidate = candidate;
      this._elapsedMs = dtMs;
    } else {
      this._elapsedMs += dtMs;
    }
    this.state.active = true;
    this.state.candidate = this._lockedCandidate;
    this.state.progress = this._holdDurationMs > 0 ? Math.min(1, this._elapsedMs / this._holdDurationMs) : 1;
    if (this._elapsedMs >= this._holdDurationMs) {
      this.state.triggered = true;
      this.state.progress = 1;
      this._lastTriggerMs = nowMs;
      this._rawCandidate = null;
      this._stableFrames = 0;
      this._stableMs = 0;
      this._lockedCandidate = null;
      this._elapsedMs = 0;
    }
    return this.state;
  }
  reset() {
    this._rawCandidate = null;
    this._stableFrames = 0;
    this._stableMs = 0;
    this._lockedCandidate = null;
    this._elapsedMs = 0;
    this._lastTriggerMs = -Infinity;
    this.state.active = false;
    this.state.candidate = null;
    this.state.progress = 0;
    this.state.triggered = false;
  }
};

// src/recognizers/trajectory.ts
var CircleTrajectoryRecognizer = class {
  _maxFrames;
  _minSamples;
  _minRadius;
  _maxIrregularity;
  _minRevolutions;
  _cooldownMs;
  // Pre-allocated ring buffer of (x, y, z) samples and per-sample radial distances
  _buffer;
  _radii;
  _head = 0;
  _count = 0;
  _lastFireMs = -Infinity;
  // Pre-allocated scratch vectors for basis projection
  _u = new Float32Array(3);
  _v = new Float32Array(3);
  constructor(config = {}) {
    this._maxFrames = config.historyFrames ?? CIRCLE_HISTORY_FRAMES;
    this._minSamples = config.minSamples ?? CIRCLE_MIN_SAMPLES;
    this._minRadius = config.minRadius ?? CIRCLE_MIN_RADIUS;
    this._maxIrregularity = config.maxIrregularity ?? CIRCLE_MAX_IRREGULARITY;
    this._minRevolutions = config.minRevolutions ?? CIRCLE_MIN_REVOLUTIONS;
    this._cooldownMs = config.cooldownMs ?? DISC_FIRE_COOLDOWN_MS;
    this._buffer = new Float32Array(this._maxFrames * 3);
    this._radii = new Float32Array(this._maxFrames);
  }
  reset() {
    this._head = 0;
    this._count = 0;
  }
  resetCircle() {
    this.reset();
  }
  /**
   * Appends wrist position (x, y, z) and evaluates Newell's 3D circle trajectory.
   * Mutates `out` in-place with zero heap allocations.
   */
  update(wristX, wristY, wristZ, nowMs, out, _hand) {
    out.triggered = false;
    const writeBase = this._head * 3;
    this._buffer[writeBase] = wristX;
    this._buffer[writeBase + 1] = wristY;
    this._buffer[writeBase + 2] = wristZ;
    this._head = (this._head + 1) % this._maxFrames;
    if (this._count < this._maxFrames) {
      this._count++;
    }
    const N = this._count;
    if (N < this._minSamples) {
      out.meanRadius = 0;
      out.revolutions = 0;
      return out;
    }
    const startIdx = (this._head - N + this._maxFrames) % this._maxFrames;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < N; i++) {
      const idx = (startIdx + i) % this._maxFrames * 3;
      cx += this._buffer[idx];
      cy += this._buffer[idx + 1];
      cz += this._buffer[idx + 2];
    }
    const invN = 1 / N;
    cx *= invN;
    cy *= invN;
    cz *= invN;
    let sumR = 0;
    for (let i = 0; i < N; i++) {
      const idx = (startIdx + i) % this._maxFrames * 3;
      const dx = this._buffer[idx] - cx;
      const dy = this._buffer[idx + 1] - cy;
      const dz = this._buffer[idx + 2] - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      this._radii[i] = d;
      sumR += d;
    }
    const meanRadius = sumR * invN;
    out.centroid[0] = cx;
    out.centroid[1] = cy;
    out.centroid[2] = cz;
    out.meanRadius = meanRadius;
    if (meanRadius < this._minRadius) {
      out.revolutions = 0;
      return out;
    }
    let sumSqDiff = 0;
    for (let i = 0; i < N; i++) {
      const diff = this._radii[i] - meanRadius;
      sumSqDiff += diff * diff;
    }
    const stdDev = Math.sqrt(sumSqDiff * invN);
    const irregularity = stdDev / meanRadius;
    if (irregularity > this._maxIrregularity) {
      out.revolutions = 0;
      return out;
    }
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < N; i++) {
      const idxA = (startIdx + i) % this._maxFrames * 3;
      const idxB = (startIdx + (i + 1) % N) % this._maxFrames * 3;
      const xi = this._buffer[idxA];
      const yi = this._buffer[idxA + 1];
      const zi = this._buffer[idxA + 2];
      const xj = this._buffer[idxB];
      const yj = this._buffer[idxB + 1];
      const zj = this._buffer[idxB + 2];
      nx += (yi - yj) * (zi + zj);
      ny += (zi - zj) * (xi + xj);
      nz += (xi - xj) * (yi + yj);
    }
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nLen < 1e-8) {
      out.revolutions = 0;
      return out;
    }
    const invNLen = 1 / nLen;
    nx *= invNLen;
    ny *= invNLen;
    nz *= invNLen;
    out.normal[0] = nx;
    out.normal[1] = ny;
    out.normal[2] = nz;
    let ux;
    let uy;
    let uz;
    if (Math.abs(nx) < 0.9) {
      ux = 0;
      uy = nz;
      uz = -ny;
    } else {
      ux = -nz;
      uy = 0;
      uz = nx;
    }
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    const invULen = uLen > 0 ? 1 / uLen : 0;
    ux *= invULen;
    uy *= invULen;
    uz *= invULen;
    const vx = ny * uz - nz * uy;
    const vy = nz * ux - nx * uz;
    const vz = nx * uy - ny * ux;
    this._u[0] = ux;
    this._u[1] = uy;
    this._u[2] = uz;
    this._v[0] = vx;
    this._v[1] = vy;
    this._v[2] = vz;
    let totalAngle = 0;
    let prevTheta = 0;
    for (let i = 0; i < N; i++) {
      const idx = (startIdx + i) % this._maxFrames * 3;
      const rx = this._buffer[idx] - cx;
      const ry = this._buffer[idx + 1] - cy;
      const rz = this._buffer[idx + 2] - cz;
      const projU = rx * ux + ry * uy + rz * uz;
      const projV = rx * vx + ry * vy + rz * vz;
      const theta = Math.atan2(projV, projU);
      if (i > 0) {
        let dTheta = theta - prevTheta;
        if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        else if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
        totalAngle += Math.abs(dTheta);
      }
      prevTheta = theta;
    }
    const revolutions = totalAngle / (2 * Math.PI);
    out.revolutions = revolutions;
    if (totalAngle >= this._minRevolutions * 2 * Math.PI && nowMs - this._lastFireMs > this._cooldownMs) {
      out.triggered = true;
      this._lastFireMs = nowMs;
      this.reset();
    }
    return out;
  }
};

// src/recognizers/swipe.ts
function createSwipeState() {
  return {
    posed: false,
    fired: false,
    direction: "none",
    distance: 0,
    velocity: 0,
    deltaUp: 0,
    deltaRight: 0
  };
}
function isTwoFingerBrushPose(poses, frameOffset, fingers, tipGap = SWIPE_TIP_GAP, requireThumbTucked = true) {
  if (!fingers.index || !fingers.middle || fingers.ring || fingers.pinky) return false;
  if (requireThumbTucked && fingers.thumb && isThumbReallyOut(poses, frameOffset)) return false;
  const io = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const mo = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
  const dx = poses[io] - poses[mo];
  const dy = poses[io + 1] - poses[mo + 1];
  const dz = poses[io + 2] - poses[mo + 2];
  return dx * dx + dy * dy + dz * dz <= tipGap * tipGap;
}
var TwoFingerSwipeRecognizer = class {
  _tipGap;
  _minDist;
  _windowMs;
  _axisDominance;
  _maxFingerDot;
  _cooldownMs;
  _graceFrames;
  _requireThumbTucked;
  // Ring buffer of [x, y, z, tMs] samples of the index/middle tip midpoint
  _cap;
  _samples;
  _times;
  _head = 0;
  _count = 0;
  _lostFrames = 0;
  _lastFireMs = -Infinity;
  _hasPrev = false;
  _prevX = 0;
  _prevY = 0;
  _prevZ = 0;
  constructor(config = {}) {
    this._tipGap = config.tipGap ?? SWIPE_TIP_GAP;
    this._minDist = config.minDist ?? SWIPE_MIN_DIST;
    this._windowMs = config.windowMs ?? SWIPE_WINDOW_MS;
    this._axisDominance = config.axisDominance ?? SWIPE_AXIS_DOMINANCE;
    this._maxFingerDot = config.maxFingerDot ?? SWIPE_MAX_FINGER_DOT;
    this._cooldownMs = config.cooldownMs ?? SWIPE_COOLDOWN_MS;
    this._graceFrames = config.poseGraceFrames ?? SWIPE_POSE_GRACE_FRAMES;
    this._requireThumbTucked = config.requireThumbTucked ?? true;
    this._cap = SWIPE_SAMPLE_CAPACITY;
    this._samples = new Float32Array(this._cap * 3);
    this._times = new Float64Array(this._cap);
  }
  /**
   * @param headRight Horizontal head-right unit vector [x, y, z] (y should be ~0).
   */
  update(poses, frameOffset, fingers, aimDirection, headRight, nowMs, out) {
    out.fired = false;
    out.deltaUp = 0;
    out.deltaRight = 0;
    const posedNow = isTwoFingerBrushPose(poses, frameOffset, fingers, this._tipGap, this._requireThumbTucked);
    if (!posedNow) {
      this._lostFrames++;
      if (this._lostFrames > this._graceFrames) {
        this._clearStroke();
        out.posed = false;
      }
      return out;
    }
    this._lostFrames = 0;
    out.posed = true;
    const io = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const mo = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
    const x = 0.5 * (poses[io] + poses[mo]);
    const y = 0.5 * (poses[io + 1] + poses[mo + 1]);
    const z = 0.5 * (poses[io + 2] + poses[mo + 2]);
    const rx = headRight[0];
    const ry = headRight[1];
    const rz = headRight[2];
    if (this._hasPrev) {
      out.deltaUp = y - this._prevY;
      out.deltaRight = (x - this._prevX) * rx + (y - this._prevY) * ry + (z - this._prevZ) * rz;
    }
    this._prevX = x;
    this._prevY = y;
    this._prevZ = z;
    this._hasPrev = true;
    const slot = this._head;
    this._samples[slot * 3] = x;
    this._samples[slot * 3 + 1] = y;
    this._samples[slot * 3 + 2] = z;
    this._times[slot] = nowMs;
    this._head = (this._head + 1) % this._cap;
    if (this._count < this._cap) this._count++;
    if (nowMs - this._lastFireMs < this._cooldownMs) return out;
    let oldest = -1;
    for (let age = this._count - 1; age >= 1; age--) {
      const s = (this._head - 1 - age + this._cap * 2) % this._cap;
      if (nowMs - this._times[s] <= this._windowMs) {
        oldest = s;
        break;
      }
    }
    if (oldest < 0) return out;
    const dx = x - this._samples[oldest * 3];
    const dy = y - this._samples[oldest * 3 + 1];
    const dz = z - this._samples[oldest * 3 + 2];
    const total = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (total < this._minDist) return out;
    const up = dy;
    const right = dx * rx + dy * ry + dz * rz;
    const absUp = up < 0 ? -up : up;
    const absRight = right < 0 ? -right : right;
    const primary = absUp >= absRight ? absUp : absRight;
    if (primary < this._minDist) return out;
    if (primary / total < this._axisDominance) return out;
    const along = (dx * aimDirection[0] + dy * aimDirection[1] + dz * aimDirection[2]) / total;
    if ((along < 0 ? -along : along) > this._maxFingerDot) return out;
    const dt = nowMs - this._times[oldest];
    out.fired = true;
    out.direction = absUp >= absRight ? up > 0 ? "up" : "down" : right > 0 ? "right" : "left";
    out.distance = primary;
    out.velocity = dt > 0 ? primary / (dt / 1e3) : 0;
    this._lastFireMs = nowMs;
    this._count = 0;
    this._head = 0;
    return out;
  }
  _clearStroke() {
    this._count = 0;
    this._head = 0;
    this._hasPrev = false;
    this._lostFrames = 0;
  }
  reset(out) {
    this._clearStroke();
    if (out) {
      out.posed = false;
      out.fired = false;
      out.direction = "none";
      out.distance = 0;
      out.velocity = 0;
      out.deltaUp = 0;
      out.deltaRight = 0;
    }
  }
};

// src/recognizers/singleHand.ts
var FRAME_STRIDE = JOINT_COUNT * FLOATS_PER_JOINT;
var _v1 = new Float32Array(3);
var _v2 = new Float32Array(3);
var _v3 = new Float32Array(3);
var _dir = new Float32Array(3);
var _gA = new Float32Array(3);
var _gB = new Float32Array(3);
var _PEACE_MAX_COS = Math.cos(PEACE_MIN_SPREAD_DEG * Math.PI / 180);
var _PEACE_ENTER_MAX_COS = Math.cos(PEACE_ENTER_MIN_SPREAD_DEG * Math.PI / 180);
function fingerReach(poses, frameOffset, proximal, tip) {
  const span = v3Dist(
    poses,
    poses,
    frameOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT,
    frameOffset + JOINT_INDEX.PINKY_PROXIMAL * FLOATS_PER_JOINT
  );
  if (!(span > 0.02)) return -1;
  return v3Dist(poses, poses, frameOffset + tip * FLOATS_PER_JOINT, frameOffset + proximal * FLOATS_PER_JOINT) / span;
}
function fingerCurled(poses, frameOffset, proximal, tip, holding = false) {
  const r = fingerReach(poses, frameOffset, proximal, tip);
  return r >= 0 && r <= (holding ? SIGN_CURL_MAX_RATIO : SIGN_CURL_ENTER_MAX_RATIO);
}
function fingerOutstretched(poses, frameOffset, proximal, tip, holding = false) {
  return fingerReach(poses, frameOffset, proximal, tip) >= (holding ? SIGN_EXTEND_MIN_RATIO : SIGN_EXTEND_ENTER_MIN_RATIO);
}
function thumbOutRatio(poses, frameOffset) {
  const dPalm = v3Dist(
    poses,
    poses,
    frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT,
    frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT
  );
  if (!(dPalm > 0)) return -1;
  return v3Dist(
    poses,
    poses,
    frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT,
    frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT
  ) / dPalm;
}
function jointDirCos(poses, frameOffset, a0, a1, b0, b1) {
  v3Sub(_gA, poses, poses, frameOffset + a1 * FLOATS_PER_JOINT, frameOffset + a0 * FLOATS_PER_JOINT);
  v3Sub(_gB, poses, poses, frameOffset + b1 * FLOATS_PER_JOINT, frameOffset + b0 * FLOATS_PER_JOINT);
  const la = Math.hypot(_gA[0], _gA[1], _gA[2]);
  const lb = Math.hypot(_gB[0], _gB[1], _gB[2]);
  if (!(la > 1e-4) || !(lb > 1e-4)) return NaN;
  return v3Dot(_gA, _gB) / (la * lb);
}
function isThumbsShape(poses, frameOffset = 0, holding = false) {
  const J = JOINT_INDEX;
  if (!fingerCurled(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP, holding)) return false;
  const cUp = jointDirCos(poses, frameOffset, J.PINKY_TIP, J.INDEX_TIP, J.THUMB_PROXIMAL, J.THUMB_TIP);
  const cDown = jointDirCos(poses, frameOffset, J.INDEX_TIP, J.PINKY_TIP, J.THUMB_PROXIMAL, J.THUMB_TIP);
  return Math.max(cUp, cDown) >= (holding ? THUMBS_ALIGN_MIN_DOT : THUMBS_ENTER_ALIGN_MIN_DOT);
}
function isPeaceShape(poses, frameOffset = 0, holding = false) {
  const J = JOINT_INDEX;
  if (!fingerCurled(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP, holding)) return false;
  if (!fingerCurled(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP, holding)) return false;
  if (!fingerOutstretched(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP, holding)) return false;
  if (!fingerOutstretched(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP, holding)) return false;
  const c = jointDirCos(poses, frameOffset, J.INDEX_PROXIMAL, J.INDEX_TIP, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP);
  return c < (holding ? _PEACE_MAX_COS : _PEACE_ENTER_MAX_COS);
}
function isGunTucked(poses, frameOffset, ringOut, pinkyOut, middleOut = false, holding = false) {
  const J = JOINT_INDEX;
  const tuck = holding ? GUN_TUCK_MAX_RATIO : GUN_TUCK_ENTER_MAX_RATIO;
  if (middleOut) {
    const m = fingerReach(poses, frameOffset, J.MIDDLE_PROXIMAL, J.MIDDLE_TIP);
    if (!(m >= 0 && m <= tuck)) return false;
  }
  if (ringOut) {
    const r = fingerReach(poses, frameOffset, J.RING_PROXIMAL, J.RING_TIP);
    if (!(r >= 0 && r <= tuck)) return false;
  }
  if (pinkyOut) {
    const p = fingerReach(poses, frameOffset, J.PINKY_PROXIMAL, J.PINKY_TIP);
    if (!(p >= 0 && p <= tuck)) return false;
  }
  return true;
}
function isOneFingerGunShape(poses, frameOffset, fingers, holding = false) {
  if (!fingers.index) return false;
  let middleOut = fingers.middle;
  if (middleOut) {
    const m = fingerReach(poses, frameOffset, JOINT_INDEX.MIDDLE_PROXIMAL, JOINT_INDEX.MIDDLE_TIP);
    const i = fingerReach(poses, frameOffset, JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_TIP);
    if (m >= 0 && i > 0 && i - m >= GUN_INDEX_LEAD_RATIO) middleOut = false;
  }
  if (!isGunTucked(poses, frameOffset, fingers.ring, fingers.pinky, middleOut, holding)) return false;
  if (fingers.thumb) return true;
  if (!holding) return false;
  const t = thumbOutRatio(poses, frameOffset);
  return t >= 0 && t >= THUMB_OUT_RATIO * 0.85;
}
var _defaultHeadRight = new Float32Array([1, 0, 0]);
function createSingleHandState() {
  return {
    tracked: false,
    sign: "idle",
    gesture: "idle",
    fingers: {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      count: 0
    },
    motionSpeed: 0,
    wristPosition: new Float32Array(3),
    palmPosition: new Float32Array(3),
    palmQuaternion: new Float32Array([0, 0, 0, 1]),
    velocity: new Float32Array(3),
    aimOrigin: new Float32Array(3),
    aimDirection: new Float32Array([0, 0, -1]),
    palmForward: new Float32Array([0, 0, -1]),
    palmCenter: new Float32Array(3),
    prevPalmCenter: new Float32Array(3),
    hasPrevPalm: false,
    indexTipPosition: new Float32Array(3),
    circle: {
      triggered: false,
      centroid: new Float32Array(3),
      normal: new Float32Array([0, 0, 1]),
      meanRadius: 0,
      revolutions: 0
    },
    swipe: createSwipeState()
  };
}
function isFingerExtendedCurl(poses, frameOffset, metaIdx, proxIdx, interIdx, tipIdx, curlDot = CURL_DOT) {
  const mOff = frameOffset + metaIdx * FLOATS_PER_JOINT;
  const pOff = frameOffset + proxIdx * FLOATS_PER_JOINT;
  const iOff = frameOffset + interIdx * FLOATS_PER_JOINT;
  const tOff = frameOffset + tipIdx * FLOATS_PER_JOINT;
  v3Sub(_v1, poses, poses, pOff, mOff);
  v3Normalize(_v1, _v1);
  v3Sub(_v2, poses, poses, iOff, pOff);
  v3Normalize(_v2, _v2);
  v3Sub(_v3, poses, poses, tOff, iOff);
  v3Normalize(_v3, _v3);
  return v3Dot(_v1, _v2) > curlDot && v3Dot(_v2, _v3) > curlDot;
}
function isThumbReallyOut(poses, frameOffset = 0) {
  const pinkyInterOff = frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT;
  const indexInterOff = frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const middleInterOff = frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
  const dPalm = v3Dist(poses, poses, pinkyInterOff, indexInterOff);
  const dThumb = v3Dist(poses, poses, thumbTipOff, middleInterOff);
  return dPalm > 0 && dThumb > dPalm * THUMB_OUT_RATIO;
}
function isHandAnatomicallyValid(poses, frameOffset = 0, minBoneLength = MIN_ANATOMICAL_BONE_LENGTH) {
  const wristOff = frameOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
  const indexProxOff = frameOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
  const middleProxOff = frameOffset + JOINT_INDEX.MIDDLE_PROXIMAL * FLOATS_PER_JOINT;
  const ringProxOff = frameOffset + JOINT_INDEX.RING_PROXIMAL * FLOATS_PER_JOINT;
  const middleTipOff = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
  if (v3Dist(poses, poses, wristOff, middleProxOff) < minBoneLength) return false;
  if (v3Dist(poses, poses, wristOff, indexProxOff) < minBoneLength) return false;
  if (v3Dist(poses, poses, wristOff, ringProxOff) < minBoneLength) return false;
  if (v3Dist(poses, poses, wristOff, middleTipOff) < minBoneLength) return false;
  return true;
}
function evaluateFingerExtensions(poses, frameOffset, out, useCurlDetection = true, curlDot = CURL_DOT, thumbOpenDist = THUMBOPEN, fingerOpenDist = FINGEROPEN) {
  if (useCurlDetection) {
    out.thumb = isThumbReallyOut(poses, frameOffset);
    out.index = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.INDEX_METACARPAL,
      JOINT_INDEX.INDEX_PROXIMAL,
      JOINT_INDEX.INDEX_INTERMEDIATE,
      JOINT_INDEX.INDEX_TIP,
      curlDot
    );
    out.middle = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.MIDDLE_METACARPAL,
      JOINT_INDEX.MIDDLE_PROXIMAL,
      JOINT_INDEX.MIDDLE_INTERMEDIATE,
      JOINT_INDEX.MIDDLE_TIP,
      curlDot
    );
    out.ring = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.RING_METACARPAL,
      JOINT_INDEX.RING_PROXIMAL,
      JOINT_INDEX.RING_INTERMEDIATE,
      JOINT_INDEX.RING_TIP,
      curlDot
    );
    out.pinky = isFingerExtendedCurl(
      poses,
      frameOffset,
      JOINT_INDEX.PINKY_METACARPAL,
      JOINT_INDEX.PINKY_PROXIMAL,
      JOINT_INDEX.PINKY_INTERMEDIATE,
      JOINT_INDEX.PINKY_TIP,
      curlDot
    );
  } else {
    const wristOff = frameOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    out.thumb = v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT) > thumbOpenDist;
    out.index = v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT) > fingerOpenDist;
    out.middle = v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT) > fingerOpenDist;
    out.ring = v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.RING_TIP * FLOATS_PER_JOINT) > fingerOpenDist;
    out.pinky = v3Dist(poses, poses, wristOff, frameOffset + JOINT_INDEX.PINKY_TIP * FLOATS_PER_JOINT) > fingerOpenDist;
  }
  out.count = (out.thumb ? 1 : 0) + (out.index ? 1 : 0) + (out.middle ? 1 : 0) + (out.ring ? 1 : 0) + (out.pinky ? 1 : 0);
  return out;
}
function classifyHandSign(poses, frameOffset, fingers, pinchDist = PINCH_DIST, directionThreshold = DIRECTION_THRESHOLD, prevSign = "unknown") {
  const holdingPeace = prevSign === "peace";
  const holdingGun = prevSign === "gun";
  const holdingThumbs = prevSign === "thumbsup" || prevSign === "thumbsdown" || prevSign === "thumb";
  const T = fingers.thumb;
  const I = fingers.index;
  const M = fingers.middle;
  const R = fingers.ring;
  const P = fingers.pinky;
  let sign = "unknown";
  if (T && !I && !M && !R && P) {
    sign = "telephone";
  }
  if (I && !M && !R && P) {
    sign = "rock-horns";
  }
  if (!T && !I && M && !R && !P) {
    sign = "birdie-1";
  }
  if (T && !I && M && !R && !P) {
    sign = "birdie-2";
  }
  if (!T && !I && !M && !R && P) {
    sign = "pinkie-out";
  }
  if (!I && !M && !R && !P) {
    sign = "fist";
  }
  if (I && M && R && P) {
    const wristOff = frameOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const midTipOff = frameOffset + JOINT_INDEX.MIDDLE_TIP * FLOATS_PER_JOINT;
    v3Sub(_dir, poses, poses, midTipOff, wristOff);
    v3Normalize(_dir, _dir);
    if (_dir[1] > directionThreshold) {
      sign = "thehro";
    } else if (_dir[1] < -directionThreshold) {
      sign = "niche";
    } else {
      sign = "open";
    }
  }
  if (I && M && !R && !P) {
    sign = isPeaceShape(poses, frameOffset, holdingPeace) ? "peace" : "unknown";
  }
  if (sign !== "rock-horns" && sign !== "peace" && (isOneFingerGunShape(poses, frameOffset, fingers, holdingGun) || T && I && isGunTucked(poses, frameOffset, R, P, false, holdingGun) && (!M || !isPeaceShape(poses, frameOffset, true)))) {
    sign = "gun";
  }
  if (sign !== "gun" && !T && I && !M && !R && !P) {
    sign = "poke";
  }
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const indexTipOff = frameOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const isPinching = !I && v3Dist(poses, poses, thumbTipOff, indexTipOff) < pinchDist;
  if (isPinching) {
    sign = "pinch";
  }
  const thumbsCandidate = holdingThumbs ? (sign === "fist" || sign === "unknown") && (T || isThumbReallyOut(poses, frameOffset)) : (sign === "fist" || sign === "unknown" && !I) && thumbOutRatio(poses, frameOffset) > THUMBS_ENTER_THUMB_OUT_RATIO;
  if (thumbsCandidate && !isPinching && isThumbsShape(poses, frameOffset, true)) {
    const thumbMetaOff = frameOffset + JOINT_INDEX.THUMB_METACARPAL * FLOATS_PER_JOINT;
    v3Sub(_dir, poses, poses, thumbTipOff, thumbMetaOff);
    v3Normalize(_dir, _dir);
    const thumbsDir = Math.min(directionThreshold, holdingThumbs ? THUMBS_DIRECTION_THRESHOLD : THUMBS_ENTER_DIRECTION_THRESHOLD);
    const upDownShape = holdingThumbs || isThumbsShape(poses, frameOffset, false);
    if (upDownShape && _dir[1] > thumbsDir) {
      sign = "thumbsup";
    } else if (upDownShape && _dir[1] < -thumbsDir) {
      sign = "thumbsdown";
    } else if (!I && !M && !R && !P) {
      sign = "thumb";
    }
  }
  return sign;
}
function promoteStrikeGesture(sign, motionSpeed, punchSpeed = PUNCH_SPEED, slapSpeed = SLAP_SPEED) {
  if (isFistFamily(sign) && motionSpeed > punchSpeed) {
    return "punch";
  }
  if (isOpenFamily(sign) && motionSpeed > slapSpeed) {
    return "slap";
  }
  return sign;
}
function isFistFamily(sign) {
  return sign === "fist" || sign === "thumb" || sign === "thumbsup" || sign === "thumbsdown";
}
function isOpenFamily(sign) {
  return sign === "open" || sign === "thehro";
}
var SingleHandRecognizer = class {
  _handedness;
  _historyBuffer = new Float32Array(POS_HISTORY_COUNT * FRAME_STRIDE);
  _head = 0;
  // Next write slot (0..POS_HISTORY_COUNT-1)
  _historyCount = 0;
  // Last time (ms) each strike passed its speed gate, for the STRIKE_LATCH_MS grace window.
  _lastPunchMs = -Infinity;
  _lastSlapMs = -Infinity;
  _palmCenterValid = false;
  // palmCenter holds a value from a previous tracked frame
  _circleRecognizer;
  _swipeRecognizer;
  state = createSingleHandState();
  constructor(handedness, config = {}) {
    this._handedness = handedness;
    this._circleRecognizer = new CircleTrajectoryRecognizer({
      historyFrames: config.circleHistoryFrames,
      minSamples: config.circleMinSamples,
      minRadius: config.circleMinRadius,
      maxIrregularity: config.circleMaxIrregularity,
      minRevolutions: config.circleMinRevolutions,
      cooldownMs: config.discFireCooldownMs
    });
    this._swipeRecognizer = new TwoFingerSwipeRecognizer({
      tipGap: config.swipeTipGap,
      minDist: config.swipeMinDist,
      windowMs: config.swipeWindowMs,
      axisDominance: config.swipeAxisDominance,
      maxFingerDot: config.swipeMaxFingerDot,
      cooldownMs: config.swipeCooldownMs,
      requireThumbTucked: config.swipeRequireThumbTucked
    });
  }
  /**
   * Returns the flat history buffer and byte/element offset of the Nth most recent frame (0 = current).
   */
  getFrameOffset(age = 0) {
    if (this._historyCount === 0 || age >= this._historyCount) return -1;
    const slot = (this._head - 1 - age + POS_HISTORY_COUNT) % POS_HISTORY_COUNT;
    return slot * FRAME_STRIDE;
  }
  getHistoryBuffer() {
    return this._historyBuffer;
  }
  /**
   * Marks the hand as untracked for the current frame and resets transient velocity/circle state.
   */
  markUntracked() {
    this.state.tracked = false;
    this.state.sign = "idle";
    this.state.gesture = "idle";
    this.state.fingers.thumb = false;
    this.state.fingers.index = false;
    this.state.fingers.middle = false;
    this.state.fingers.ring = false;
    this.state.fingers.pinky = false;
    this.state.fingers.count = 0;
    this.state.motionSpeed = 0;
    this.state.velocity[0] = 0;
    this.state.velocity[1] = 0;
    this.state.velocity[2] = 0;
    this.state.circle.triggered = false;
    this.state.circle.revolutions = 0;
    this.state.hasPrevPalm = false;
    this._palmCenterValid = false;
    this._historyCount = 0;
    this._head = 0;
    this._circleRecognizer.reset();
    this._swipeRecognizer.reset(this.state.swipe);
    return this.state;
  }
  /**
   * Begins writing a new tracked frame into the ring buffer and returns its float offset.
   */
  beginFrameSlot() {
    const offset = this._head * FRAME_STRIDE;
    this._head = (this._head + 1) % POS_HISTORY_COUNT;
    if (this._historyCount < POS_HISTORY_COUNT) {
      this._historyCount++;
    }
    return offset;
  }
  /**
   * Evaluates all single-hand kinematics, curl, sign, ballistic velocity, and circle trajectory
   * from the most recently written slot in `_historyBuffer`.
   */
  evaluateCurrentFrame(deltaSeconds, nowMs, config, headRight = _defaultHeadRight) {
    const currOffset = this.getFrameOffset(0);
    if (currOffset < 0) {
      return this.markUntracked();
    }
    const buf = this._historyBuffer;
    if (!isHandAnatomicallyValid(buf, currOffset, config.minBoneLength)) {
      return this.markUntracked();
    }
    this.state.tracked = true;
    const wristOff = currOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    this.state.wristPosition[0] = buf[wristOff];
    this.state.wristPosition[1] = buf[wristOff + 1];
    this.state.wristPosition[2] = buf[wristOff + 2];
    const indexProxOff = currOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
    this.state.palmPosition[0] = buf[indexProxOff];
    this.state.palmPosition[1] = buf[indexProxOff + 1];
    this.state.palmPosition[2] = buf[indexProxOff + 2];
    this.state.palmQuaternion[0] = buf[indexProxOff + 3];
    this.state.palmQuaternion[1] = buf[indexProxOff + 4];
    this.state.palmQuaternion[2] = buf[indexProxOff + 5];
    this.state.palmQuaternion[3] = buf[indexProxOff + 6];
    const indexInterOff = currOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
    const indexTipOff = currOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    this.state.aimOrigin[0] = buf[indexTipOff];
    this.state.aimOrigin[1] = buf[indexTipOff + 1];
    this.state.aimOrigin[2] = buf[indexTipOff + 2];
    this.state.indexTipPosition[0] = buf[indexTipOff];
    this.state.indexTipPosition[1] = buf[indexTipOff + 1];
    this.state.indexTipPosition[2] = buf[indexTipOff + 2];
    if (this._palmCenterValid) {
      this.state.prevPalmCenter[0] = this.state.palmCenter[0];
      this.state.prevPalmCenter[1] = this.state.palmCenter[1];
      this.state.prevPalmCenter[2] = this.state.palmCenter[2];
      this.state.hasPrevPalm = true;
    } else {
      this.state.hasPrevPalm = false;
    }
    const midMetaOff = currOffset + JOINT_INDEX.MIDDLE_METACARPAL * FLOATS_PER_JOINT;
    const midProxOff = currOffset + JOINT_INDEX.MIDDLE_PROXIMAL * FLOATS_PER_JOINT;
    const pcx = 0.5 * (buf[midMetaOff] + buf[midProxOff]);
    const pcy = 0.5 * (buf[midMetaOff + 1] + buf[midProxOff + 1]);
    const pcz = 0.5 * (buf[midMetaOff + 2] + buf[midProxOff + 2]);
    if (Number.isFinite(pcx) && Number.isFinite(pcy) && Number.isFinite(pcz) && (pcx !== 0 || pcy !== 0 || pcz !== 0)) {
      this.state.palmCenter[0] = pcx;
      this.state.palmCenter[1] = pcy;
      this.state.palmCenter[2] = pcz;
    } else {
      this.state.palmCenter[0] = this.state.wristPosition[0];
      this.state.palmCenter[1] = this.state.wristPosition[1];
      this.state.palmCenter[2] = this.state.wristPosition[2];
    }
    this._palmCenterValid = true;
    v3Sub(this.state.aimDirection, buf, buf, indexTipOff, indexInterOff);
    v3Normalize(this.state.aimDirection, this.state.aimDirection);
    const middleInterOff = currOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
    const middleDistalOff = currOffset + JOINT_INDEX.MIDDLE_DISTAL * FLOATS_PER_JOINT;
    v3Sub(this.state.palmForward, buf, buf, middleDistalOff, middleInterOff);
    v3Normalize(this.state.palmForward, this.state.palmForward);
    evaluateFingerExtensions(
      buf,
      currOffset,
      this.state.fingers,
      config.useCurlDetection,
      config.curlDot,
      config.thumbOpenDist,
      config.fingerOpenDist
    );
    const sign = classifyHandSign(
      buf,
      currOffset,
      this.state.fingers,
      config.pinchDist,
      config.directionThreshold,
      this.state.sign
      // previous frame's sign: enter / hold hysteresis
    );
    this.state.sign = sign;
    const prevOffset = this.getFrameOffset(1);
    if (prevOffset >= 0 && deltaSeconds > 0) {
      const currRingTipOff = currOffset + JOINT_INDEX.RING_TIP * FLOATS_PER_JOINT;
      const prevRingTipOff = prevOffset + JOINT_INDEX.RING_TIP * FLOATS_PER_JOINT;
      const vx = buf[currRingTipOff] - buf[prevRingTipOff];
      const vy = buf[currRingTipOff + 1] - buf[prevRingTipOff + 1];
      const vz = buf[currRingTipOff + 2] - buf[prevRingTipOff + 2];
      const invDt = 1 / deltaSeconds;
      this.state.velocity[0] = vx * invDt;
      this.state.velocity[1] = vy * invDt;
      this.state.velocity[2] = vz * invDt;
      const disp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      this.state.motionSpeed = disp / deltaSeconds;
    } else {
      this.state.velocity[0] = 0;
      this.state.velocity[1] = 0;
      this.state.velocity[2] = 0;
      this.state.motionSpeed = 0;
    }
    this.state.gesture = promoteStrikeGesture(
      sign,
      this.state.motionSpeed,
      config.punchSpeed,
      config.slapSpeed
    );
    const g = this.state.gesture;
    if (g === "punch") this._lastPunchMs = nowMs;
    else if (g === "slap") this._lastSlapMs = nowMs;
    else if (isFistFamily(sign) && nowMs - this._lastPunchMs < config.strikeLatchMs) {
      this.state.gesture = "punch";
    } else if (isOpenFamily(sign) && nowMs - this._lastSlapMs < config.strikeLatchMs) {
      this.state.gesture = "slap";
    }
    this._circleRecognizer.update(
      this.state.wristPosition[0],
      this.state.wristPosition[1],
      this.state.wristPosition[2],
      nowMs,
      this.state.circle,
      this._handedness
    );
    if (config.swipeEnabled) {
      this._swipeRecognizer.update(
        buf,
        currOffset,
        this.state.fingers,
        this.state.aimDirection,
        headRight,
        nowMs,
        this.state.swipe
      );
    } else {
      this.state.swipe.posed = false;
      this.state.swipe.fired = false;
    }
    return this.state;
  }
  /**
   * Clears the in-progress two-finger swipe stroke (does not reset the cooldown).
   */
  resetSwipe() {
    this._swipeRecognizer.reset(this.state.swipe);
  }
  /**
   * Resets the Newell's 3D circle trajectory recognizer ring buffer and transient state.
   */
  resetCircle() {
    this._circleRecognizer.reset();
    this.state.circle.triggered = false;
    this.state.circle.revolutions = 0;
    this.state.circle.meanRadius = 0;
  }
  reset() {
    this.markUntracked();
  }
};

// src/recognizers/twoHand.ts
var _dL = new Float32Array(3);
var _dR = new Float32Array(3);
var _apex = new Float32Array(3);
var _base = new Float32Array(3);
var _v12 = new Float32Array(3);
var _v22 = new Float32Array(3);
var _nL = new Float32Array(3);
var _nR = new Float32Array(3);
var _palmEdgeA = new Float32Array(3);
var _palmEdgeB = new Float32Array(3);
var _centerDelta = new Float32Array(3);
var PALM_NORMAL_SIGN_LEFT = 1;
var PALM_NORMAL_SIGN_RIGHT = -1;
function createTwoHandState() {
  return {
    fingerCount: 0,
    handsCrossed: false,
    wristDistance: Infinity,
    clap: {
      state: "separated",
      singleClap: false,
      doubleClap: false
    },
    triangle: {
      active: false,
      centroid: new Float32Array(3),
      normal: new Float32Array([0, 0, -1])
    },
    blast: {
      active: false,
      triggered: false,
      charge: 0,
      origin: new Float32Array(3),
      direction: new Float32Array([0, 0, -1])
    }
  };
}
function evaluateTriangleFromPoses(leftBuf, leftOffset, rightBuf, rightOffset, out, tipDistThreshold = TRIANGLE_TIP_DIST, thumbDistThreshold = TRIANGLE_THUMB_DIST, fingerDotThreshold = TRIANGLE_FINGER_DOT) {
  const lIndexTipOff = leftOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const rIndexTipOff = rightOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
  const lThumbTipOff = leftOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const rThumbTipOff = rightOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const tipDist = v3Dist(leftBuf, rightBuf, lIndexTipOff, rIndexTipOff);
  if (tipDist > tipDistThreshold) {
    out.active = false;
    return out;
  }
  const thumbDist = v3Dist(leftBuf, rightBuf, lThumbTipOff, rThumbTipOff);
  if (thumbDist > thumbDistThreshold) {
    out.active = false;
    return out;
  }
  const lIndexInterOff = leftOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  const rIndexInterOff = rightOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  v3Sub(_dL, leftBuf, leftBuf, lIndexTipOff, lIndexInterOff);
  v3Normalize(_dL, _dL);
  v3Sub(_dR, rightBuf, rightBuf, rIndexTipOff, rIndexInterOff);
  v3Normalize(_dR, _dR);
  if (v3Dot(_dL, _dR) > fingerDotThreshold) {
    out.active = false;
    return out;
  }
  const lIx = leftBuf[lIndexTipOff];
  const lIy = leftBuf[lIndexTipOff + 1];
  const lIz = leftBuf[lIndexTipOff + 2];
  const rIx = rightBuf[rIndexTipOff];
  const rIy = rightBuf[rIndexTipOff + 1];
  const rIz = rightBuf[rIndexTipOff + 2];
  const lTx = leftBuf[lThumbTipOff];
  const lTy = leftBuf[lThumbTipOff + 1];
  const lTz = leftBuf[lThumbTipOff + 2];
  const rTx = rightBuf[rThumbTipOff];
  const rTy = rightBuf[rThumbTipOff + 1];
  const rTz = rightBuf[rThumbTipOff + 2];
  _apex[0] = 0.5 * (lIx + rIx);
  _apex[1] = 0.5 * (lIy + rIy);
  _apex[2] = 0.5 * (lIz + rIz);
  _base[0] = 0.5 * (lTx + rTx);
  _base[1] = 0.5 * (lTy + rTy);
  _base[2] = 0.5 * (lTz + rTz);
  out.centroid[0] = 0.5 * (_apex[0] + _base[0]);
  out.centroid[1] = 0.5 * (_apex[1] + _base[1]);
  out.centroid[2] = 0.5 * (_apex[2] + _base[2]);
  _v12[0] = rIx - lIx;
  _v12[1] = rIy - lIy;
  _v12[2] = rIz - lIz;
  _v22[0] = lTx - lIx;
  _v22[1] = lTy - lIy;
  _v22[2] = lTz - lIz;
  v3Cross(out.normal, _v12, _v22);
  const nLen = Math.sqrt(out.normal[0] * out.normal[0] + out.normal[1] * out.normal[1] + out.normal[2] * out.normal[2]);
  if (nLen > 1e-4) {
    out.normal[0] /= nLen;
    out.normal[1] /= nLen;
    out.normal[2] /= nLen;
  } else {
    out.normal[0] = 0;
    out.normal[1] = 0;
    out.normal[2] = -1;
  }
  if (out.normal[2] > 0) {
    out.normal[0] = -out.normal[0];
    out.normal[1] = -out.normal[1];
    out.normal[2] = -out.normal[2];
  }
  out.active = true;
  return out;
}
function _extractPalm(hand) {
  const p = hand.palmCenter ?? hand.palmPosition;
  if (!p) return [0, 0, 0];
  if (Array.isArray(p) || p instanceof Float32Array) return [p[0], p[1], p[2]];
  return [p.x ?? 0, p.y ?? 0, p.z ?? 0];
}
function _extractForward(hand) {
  const f = hand.palmForward;
  if (!f) return [0, 0, -1];
  if (Array.isArray(f) || f instanceof Float32Array) return [f[0], f[1], f[2]];
  return [f.x ?? 0, f.y ?? 0, f.z ?? -1];
}
function evaluateBlastFromPoses(...args) {
  let left;
  let right;
  let deltaSeconds;
  let nowMs;
  let out;
  let lastFireMsRef;
  let palmDistThreshold = BLAST_PALM_DIST;
  let forwardDotThreshold = BLAST_FORWARD_DOT;
  let chargeDurationMs = BLAST_CHARGE_DURATION_MS;
  let thrustSpeedThreshold = BLAST_THRUST_SPEED;
  let cooldownMs = BLAST_COOLDOWN_MS;
  if (args.length >= 7 && (args[0] instanceof Float32Array || typeof args[1] === "number")) {
    left = args[4];
    right = args[5];
    out = args[6];
    deltaSeconds = args[7] ?? 0.016;
    nowMs = args[8] ?? 0;
    lastFireMsRef = args[9] ?? { lastFireMs: -Infinity };
    if (args[10] !== void 0) palmDistThreshold = args[10];
    if (args[11] !== void 0) forwardDotThreshold = args[11];
    if (args[12] !== void 0) chargeDurationMs = args[12];
    if (args[13] !== void 0) thrustSpeedThreshold = args[13];
    if (args[14] !== void 0) cooldownMs = args[14];
  } else {
    left = args[0];
    right = args[1];
    deltaSeconds = args[2] ?? 0.016;
    nowMs = args[3] ?? 0;
    out = args[4];
    lastFireMsRef = args[5] ?? { lastFireMs: -Infinity };
    if (args[6] !== void 0) palmDistThreshold = args[6];
    if (args[7] !== void 0) forwardDotThreshold = args[7];
    if (args[8] !== void 0) chargeDurationMs = args[8];
    if (args[9] !== void 0) thrustSpeedThreshold = args[9];
    if (args[10] !== void 0) cooldownMs = args[10];
  }
  out.triggered = false;
  if (!left || !right || !left.tracked || !right.tracked) {
    out.active = false;
    out.charge = 0;
    return out;
  }
  const leftOpen = left.sign === "open" || left.sign === "thehro" || left.fingers && left.fingers.count >= 4;
  const rightOpen = right.sign === "open" || right.sign === "thehro" || right.fingers && right.fingers.count >= 4;
  if (!leftOpen || !rightOpen) {
    out.active = false;
    out.charge = 0;
    return out;
  }
  const leftPalm = _extractPalm(left);
  const rightPalm = _extractPalm(right);
  const leftForward = _extractForward(left);
  const rightForward = _extractForward(right);
  const palmDist = Math.hypot(leftPalm[0] - rightPalm[0], leftPalm[1] - rightPalm[1], leftPalm[2] - rightPalm[2]);
  if (palmDist > palmDistThreshold) {
    out.active = false;
    out.charge = 0;
    return out;
  }
  if (leftForward[2] > forwardDotThreshold || rightForward[2] > forwardDotThreshold) {
    out.active = false;
    out.charge = 0;
    return out;
  }
  out.active = true;
  out.origin[0] = 0.5 * (leftPalm[0] + rightPalm[0]);
  out.origin[1] = 0.5 * (leftPalm[1] + rightPalm[1]);
  out.origin[2] = 0.5 * (leftPalm[2] + rightPalm[2]);
  out.direction[0] = 0.5 * (leftForward[0] + rightForward[0]);
  out.direction[1] = 0.5 * (leftForward[1] + rightForward[1]);
  out.direction[2] = 0.5 * (leftForward[2] + rightForward[2]);
  v3Normalize(out.direction, out.direction);
  if (out.direction[2] > 0) {
    out.direction[0] = -out.direction[0];
    out.direction[1] = -out.direction[1];
    out.direction[2] = -out.direction[2];
  }
  if (chargeDurationMs > 0 && deltaSeconds > 0) {
    out.charge = Math.min(1, out.charge + deltaSeconds * 1e3 / chargeDurationMs);
  } else {
    out.charge = 1;
  }
  const lSpeed = left.motionSpeed ?? (left.wristSpeed ?? 0);
  const rSpeed = right.motionSpeed ?? (right.wristSpeed ?? 0);
  const avgSpeed = 0.5 * (lSpeed + rSpeed);
  const lVelZ = left.velocity ? Array.isArray(left.velocity) || left.velocity instanceof Float32Array ? left.velocity[2] : left.velocity.z ?? 0 : 0;
  const rVelZ = right.velocity ? Array.isArray(right.velocity) || right.velocity instanceof Float32Array ? right.velocity[2] : right.velocity.z ?? 0 : 0;
  const thrustingForward = avgSpeed >= thrustSpeedThreshold && (lVelZ < 0 || rVelZ < 0);
  const canFire = nowMs - lastFireMsRef.lastFireMs > cooldownMs;
  if (canFire && (thrustingForward || out.charge >= 1)) {
    out.triggered = true;
    lastFireMsRef.lastFireMs = nowMs;
  }
  return out;
}
function palmNormalFromJoints(buf, offset, sign, out) {
  const thumbOff = offset + JOINT_INDEX.THUMB_PROXIMAL * FLOATS_PER_JOINT;
  const middleOff = offset + JOINT_INDEX.MIDDLE_PROXIMAL * FLOATS_PER_JOINT;
  const pinkyOff = offset + JOINT_INDEX.PINKY_PROXIMAL * FLOATS_PER_JOINT;
  v3Sub(_palmEdgeA, buf, buf, pinkyOff, thumbOff);
  v3Sub(_palmEdgeB, buf, buf, middleOff, thumbOff);
  v3Cross(out, _palmEdgeA, _palmEdgeB);
  const len = v3Len(out);
  if (len < 1e-6) return false;
  const inv = sign / len;
  out[0] *= inv;
  out[1] *= inv;
  out[2] *= inv;
  return true;
}
var TwoHandRecognizer = class {
  _lastClapTimeMs = -Infinity;
  _frame = 0;
  _lastPalmFacingFrame = -Infinity;
  _blastFireRef = { lastFireMs: -Infinity };
  state = createTwoHandState();
  update(left, right, leftBuf, leftOffset, rightBuf, rightOffset, nowMs, config = {}, deltaSeconds = 0) {
    const clapOriginMinDist = config.clapOriginMinDist ?? CLAP_ORIGIN_MIN_DIST;
    const clapSeparationDist = config.clapSeparationDist ?? CLAP_SEPARATION_DIST;
    const clapContactDist = config.clapContactDist ?? CLAP_CONTACT_DIST;
    const clapDoubleMinMs = config.clapDoubleMinMs ?? CLAP_DOUBLE_MIN_MS;
    const clapDoubleMaxMs = config.clapDoubleMaxMs ?? CLAP_DOUBLE_MAX_MS;
    const clapPalmOpposeDot = config.clapPalmOpposeDot ?? CLAP_PALM_OPPOSE_DOT;
    const clapFacingToleranceFrames = config.clapFacingToleranceFrames ?? CLAP_FACING_TOLERANCE_FRAMES;
    const triangleTipDist = config.triangleTipDist ?? TRIANGLE_TIP_DIST;
    const triangleThumbDist = config.triangleThumbDist ?? TRIANGLE_THUMB_DIST;
    const triangleFingerDot = config.triangleFingerDot ?? TRIANGLE_FINGER_DOT;
    const blastPalmDist = config.blastPalmDist ?? BLAST_PALM_DIST;
    const blastForwardDot = config.blastForwardDot ?? BLAST_FORWARD_DOT;
    const blastChargeDurationMs = config.blastChargeDurationMs ?? BLAST_CHARGE_DURATION_MS;
    const blastThrustSpeed = config.blastThrustSpeed ?? BLAST_THRUST_SPEED;
    const blastCooldownMs = config.blastCooldownMs ?? BLAST_COOLDOWN_MS;
    this.state.clap.singleClap = false;
    this.state.clap.doubleClap = false;
    this.state.fingerCount = (left.tracked ? left.fingers.count : 0) + (right.tracked ? right.fingers.count : 0);
    if (!left.tracked || !right.tracked) {
      this.state.handsCrossed = false;
      this.state.wristDistance = Infinity;
      this.state.triangle.active = false;
      this.state.blast.active = false;
      this.state.blast.triggered = false;
      this.state.blast.charge = 0;
      return this.state;
    }
    this.state.handsCrossed = left.wristPosition[0] > right.wristPosition[0];
    const wristDist = v3Dist(left.wristPosition, right.wristPosition);
    this.state.wristDistance = wristDist;
    const leftOriginDist = v3Len(left.wristPosition);
    const rightOriginDist = v3Len(right.wristPosition);
    const validOrigin = leftOriginDist >= clapOriginMinDist && rightOriginDist >= clapOriginMinDist;
    this._frame++;
    let palmFacing = false;
    if (leftBuf && leftOffset >= 0 && rightBuf && rightOffset >= 0 && palmNormalFromJoints(leftBuf, leftOffset, PALM_NORMAL_SIGN_LEFT, _nL) && palmNormalFromJoints(rightBuf, rightOffset, PALM_NORMAL_SIGN_RIGHT, _nR)) {
      const opposed = v3Dot(_nL, _nR) < clapPalmOpposeDot;
      v3Sub(_centerDelta, right.palmCenter, left.palmCenter);
      const leftFaces = v3Dot(_nL, _centerDelta) > 0;
      const rightFaces = v3Dot(_nR, _centerDelta) < 0;
      palmFacing = opposed && leftFaces && rightFaces;
    }
    if (palmFacing) this._lastPalmFacingFrame = this._frame;
    const palmFacingRecent = this._frame - this._lastPalmFacingFrame <= clapFacingToleranceFrames;
    if (validOrigin) {
      if (this.state.clap.state === "contact") {
        if (wristDist >= clapSeparationDist) {
          this.state.clap.state = "separated";
        }
      } else {
        const dualFist = left.sign === "fist" && right.sign === "fist";
        if (wristDist <= clapContactDist && !dualFist && palmFacingRecent) {
          this.state.clap.state = "contact";
          this.state.clap.singleClap = true;
          const elapsed = nowMs - this._lastClapTimeMs;
          if (this._lastClapTimeMs > -Infinity && elapsed >= clapDoubleMinMs && elapsed <= clapDoubleMaxMs) {
            this.state.clap.doubleClap = true;
            this._lastClapTimeMs = -Infinity;
          } else {
            this._lastClapTimeMs = nowMs;
          }
        }
      }
    }
    if (leftBuf && leftOffset >= 0 && rightBuf && rightOffset >= 0) {
      evaluateTriangleFromPoses(
        leftBuf,
        leftOffset,
        rightBuf,
        rightOffset,
        this.state.triangle,
        triangleTipDist,
        triangleThumbDist,
        triangleFingerDot
      );
    } else {
      this.state.triangle.active = false;
    }
    evaluateBlastFromPoses(
      left,
      right,
      deltaSeconds,
      nowMs,
      this.state.blast,
      this._blastFireRef,
      blastPalmDist,
      blastForwardDot,
      blastChargeDurationMs,
      blastThrustSpeed,
      blastCooldownMs
    );
    return this.state;
  }
  reset() {
    this._lastClapTimeMs = -Infinity;
    this._frame = 0;
    this._lastPalmFacingFrame = -Infinity;
    this._blastFireRef.lastFireMs = -Infinity;
    this.state.fingerCount = 0;
    this.state.handsCrossed = false;
    this.state.wristDistance = Infinity;
    this.state.clap.state = "separated";
    this.state.clap.singleClap = false;
    this.state.clap.doubleClap = false;
    this.state.triangle.active = false;
    this.state.blast.active = false;
    this.state.blast.triggered = false;
    this.state.blast.charge = 0;
  }
};

// src/index.ts
var FRAME_STRIDE2 = JOINT_COUNT * FLOATS_PER_JOINT;
var Haath = class {
  _config;
  _left;
  _right;
  _twoHand;
  _stagingSlot = new Float32Array(FRAME_STRIDE2);
  // Horizontal head-right basis for two-finger swipe left/right (auto-updated from the viewer pose in update())
  _headRight = new Float32Array([1, 0, 0]);
  state;
  constructor(config = {}) {
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
      swipeRequireThumbTucked: config.swipeRequireThumbTucked ?? true
    };
    this._left = new SingleHandRecognizer("left", this._config);
    this._right = new SingleHandRecognizer("right", this._config);
    this._twoHand = new TwoHandRecognizer();
    this.state = {
      left: this._left.state,
      right: this._right.state,
      twoHand: this._twoHand.state
    };
  }
  /**
   * Main per-frame WebXR update entrypoint - zero heap allocations.
   */
  update(frame, referenceSpace, inputSources, deltaSeconds, nowMs = performance.now()) {
    let leftHand = null;
    let rightHand = null;
    let leftSource = null;
    let rightSource = null;
    if (frame && referenceSpace && inputSources) {
      for (const source of inputSources) {
        if (!source || !source.hand) continue;
        if (source.handedness === "left") {
          leftHand = source.hand;
          leftSource = source;
        } else if (source.handedness === "right") {
          rightHand = source.hand;
          rightSource = source;
        }
      }
    }
    if (frame && referenceSpace && frame.getViewerPose) {
      const viewer = frame.getViewerPose(referenceSpace);
      if (viewer) {
        const m = viewer.transform.matrix;
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
      deltaSeconds
    );
    return this.state;
  }
  /**
   * Updates the engine directly from flat Float32Array buffers or JointName->pose maps.
   * Useful for custom engines, recorded pose playback, and unit testing.
   */
  updateFromPoses(leftInput, rightInput, deltaSeconds, nowMs = performance.now()) {
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
      deltaSeconds
    );
    return this.state;
  }
  reset() {
    this._left.reset();
    this._right.reset();
    this._twoHand.reset();
  }
  /**
   * Sets the head-right vector used to resolve two-finger swipe left/right. Projected onto the
   * horizontal plane and normalized; ignored if degenerate. update() calls this from the viewer
   * pose automatically, updateFromPoses() consumers call it themselves (default world +X).
   */
  setHeadRight(x, _y, z) {
    const len = Math.sqrt(x * x + z * z);
    if (len < 1e-4) return;
    this._headRight[0] = x / len;
    this._headRight[1] = 0;
    this._headRight[2] = z / len;
  }
  /**
   * Clears any in-progress two-finger swipe stroke (cooldowns are kept).
   */
  resetSwipe(hand) {
    if (!hand || hand === "both" || hand === "left") this._left.resetSwipe();
    if (!hand || hand === "both" || hand === "right") this._right.resetSwipe();
  }
  resetCircle(hand) {
    if (!hand || hand === "both") {
      this._left.resetCircle();
      this._right.resetCircle();
    } else if (hand === "left") {
      this._left.resetCircle();
    } else if (hand === "right") {
      this._right.resetCircle();
    }
  }
  get leftRecognizer() {
    return this._left;
  }
  get rightRecognizer() {
    return this._right;
  }
  get twoHandRecognizer() {
    return this._twoHand;
  }
  /**
   * Tests a target sphere against the current palm center, wrist, and index fingertip of one hand
   * (plus swept palm motion). See testHandSphereCollision for modes and options. Allocation-free.
   */
  testHandSphere(handedness, targetX, targetY, targetZ, targetRadius, options) {
    const hand = handedness === "left" ? this._left.state : this._right.state;
    return testHandSphereCollision(hand, targetX, targetY, targetZ, targetRadius, options, handedness);
  }
  _ingestXRHand(frame, referenceSpace, source, hand, recognizer, deltaSeconds, nowMs) {
    const getJointPose = frame.getJointPose?.bind(frame);
    if (!getJointPose) {
      recognizer.markUntracked();
      return;
    }
    for (let i = 0; i < JOINT_COUNT; i++) {
      const jointName = XR_HAND_JOINTS[i];
      const jointSpace = hand.get(jointName);
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
    const wristOff = JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const indexMcpOff = JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
    const indexTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const thumbTipOff = JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
    const pinchDist = Math.hypot(
      this._stagingSlot[indexTipOff] - this._stagingSlot[thumbTipOff],
      this._stagingSlot[indexTipOff + 1] - this._stagingSlot[thumbTipOff + 1],
      this._stagingSlot[indexTipOff + 2] - this._stagingSlot[thumbTipOff + 2]
    );
    const isPinchingOrCurled = pinchDist <= PINCH_DIST * 1.5 || recognizer.state.gesture === "pinch" || !recognizer.state.fingers.index;
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
          recognizer.state.aimOrigin[0] = 0.5 * (this._stagingSlot[indexTipOff] + this._stagingSlot[thumbTipOff]);
          recognizer.state.aimOrigin[1] = 0.5 * (this._stagingSlot[indexTipOff + 1] + this._stagingSlot[thumbTipOff + 1]);
          recognizer.state.aimOrigin[2] = 0.5 * (this._stagingSlot[indexTipOff + 2] + this._stagingSlot[thumbTipOff + 2]);
        }
      }
    }
  }
  _populateStagingFromInput(input) {
    if (input instanceof Float32Array) {
      if (input.length >= FRAME_STRIDE2) {
        for (let i = 0; i < FRAME_STRIDE2; i++) {
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
      if ("position" in entry) {
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
};

export { CircleTrajectoryRecognizer, CollisionCooldownTracker, Haath, HoldRecognizer, SingleHandRecognizer, TwoFingerSwipeRecognizer, TwoHandRecognizer, classifyHandSign, createSingleHandState, createSwipeState, createTwoHandState, cylinderSphere, discSphere, evaluateBlastFromPoses, evaluateFingerExtensions, evaluateTriangleFromPoses, intersectDiscSphere, intersectLaserSphere, intersectSphereSphere, isFingerExtendedCurl, isFistFamily, isHandAnatomicallyValid, isOneFingerGunShape, isOpenFamily, isPeaceShape, isThumbReallyOut, isThumbsShape, isTwoFingerBrushPose, promoteStrikeGesture, sphereSphere, testHandSphereCollision };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map