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
var DIRECTION_THRESHOLD = 0.72;
var PINCH_DIST = 0.03;

// src/math/vec3.ts
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

// src/index.ts
var FRAME_STRIDE = JOINT_COUNT * FLOATS_PER_JOINT;

// src/MotionStateTracker.ts
var DEFAULT_MOTION_STATE_CONFIG = {
  stationarySpeedThreshold: 0.05,
  microMovingSpeedThreshold: 0.25,
  translatingSpeedThreshold: 1.8,
  ballisticSpeedThreshold: 1.8,
  ballisticAccelThreshold: 12,
  smoothingAlpha: 0.6,
  wristFlip: {
    minAngularSpeed: 4.5,
    minAngleDelta: Math.PI / 3,
    // ~60 deg
    maxLinearSpeed: 1.2,
    cooldownMs: 400,
    windowMs: 250
  }
};
function classifyMotionState(speed, accelMag, angularSpeed, config = DEFAULT_MOTION_STATE_CONFIG) {
  if (speed >= config.ballisticSpeedThreshold || accelMag >= config.ballisticAccelThreshold) {
    return "BALLISTIC";
  }
  if (speed >= config.microMovingSpeedThreshold) {
    return "TRANSLATING";
  }
  if (speed >= config.stationarySpeedThreshold || angularSpeed >= 1.2) {
    return "MICRO_MOVING";
  }
  return "STATIONARY";
}
var WristFlipTrigger = class {
  state;
  _config;
  _windowTimeMs = 0;
  constructor(config) {
    this._config = {
      minAngularSpeed: config?.minAngularSpeed ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.minAngularSpeed,
      minAngleDelta: config?.minAngleDelta ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.minAngleDelta,
      maxLinearSpeed: config?.maxLinearSpeed ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.maxLinearSpeed,
      cooldownMs: config?.cooldownMs ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.cooldownMs,
      windowMs: config?.windowMs ?? DEFAULT_MOTION_STATE_CONFIG.wristFlip.windowMs
    };
    this.state = {
      triggered: false,
      active: false,
      angularSpeed: 0,
      accumulatedAngle: 0,
      cooldownRemainingMs: 0,
      flipDirection: "neutral"
    };
  }
  get config() {
    return this._config;
  }
  setConfig(config) {
    if (config.minAngularSpeed !== void 0) this._config.minAngularSpeed = config.minAngularSpeed;
    if (config.minAngleDelta !== void 0) this._config.minAngleDelta = config.minAngleDelta;
    if (config.maxLinearSpeed !== void 0) this._config.maxLinearSpeed = config.maxLinearSpeed;
    if (config.cooldownMs !== void 0) this._config.cooldownMs = config.cooldownMs;
    if (config.windowMs !== void 0) this._config.windowMs = config.windowMs;
  }
  /**
   * Updates the trigger state per frame.
   * Zero allocation in update loop.
   */
  update(angularSpeed, deltaAngle, linearSpeed, orientationQuat, deltaMs) {
    this.state.triggered = false;
    this.state.angularSpeed = angularSpeed;
    if (this.state.cooldownRemainingMs > 0) {
      this.state.cooldownRemainingMs = Math.max(0, this.state.cooldownRemainingMs - deltaMs);
      if (this.state.cooldownRemainingMs === 0) {
        this.state.active = false;
      }
      this.state.accumulatedAngle = 0;
      this._windowTimeMs = 0;
      return this.state;
    }
    if (angularSpeed >= this._config.minAngularSpeed && linearSpeed <= this._config.maxLinearSpeed) {
      this.state.accumulatedAngle += deltaAngle;
      this._windowTimeMs += deltaMs;
      if (this.state.accumulatedAngle >= this._config.minAngleDelta) {
        this.state.triggered = true;
        this.state.active = true;
        this.state.cooldownRemainingMs = this._config.cooldownMs;
        this.state.flipDirection = this._computeDirection(orientationQuat);
        this.state.accumulatedAngle = 0;
        this._windowTimeMs = 0;
        return this.state;
      }
    } else {
      this._windowTimeMs += deltaMs;
      if (this._windowTimeMs >= this._config.windowMs) {
        this.state.accumulatedAngle = Math.max(0, this.state.accumulatedAngle - deltaAngle * 2);
        this._windowTimeMs = 0;
      }
    }
    return this.state;
  }
  _computeDirection(quat) {
    if (!quat || quat.length < 4) return "neutral";
    const x = quat[0], y = quat[1], z = quat[2], w = quat[3];
    const ny = -(1 - 2 * (x * x + z * z));
    const nx = -2 * (x * y - w * z);
    const nz = -2 * (y * z + w * x);
    if (ny > 0.45) return "palm-up";
    if (ny < -0.45) return "palm-down";
    if (nx > 0.45) return "inward";
    if (nx < -0.45) return "outward";
    if (nz < -0.45) return "outward";
    return "neutral";
  }
  reset() {
    this.state.triggered = false;
    this.state.active = false;
    this.state.angularSpeed = 0;
    this.state.accumulatedAngle = 0;
    this.state.cooldownRemainingMs = 0;
    this.state.flipDirection = "neutral";
    this._windowTimeMs = 0;
  }
};
var HandMotionTracker = class {
  handedness;
  data;
  wristFlip;
  config;
  // Internal history & scratch buffers (zero-GC)
  _hasPrev = false;
  _prevTimeMs = 0;
  _prevPos = new Float32Array(3);
  _prevVel = new Float32Array(3);
  _rawVel = new Float32Array(3);
  _prevAccel = new Float32Array(3);
  _rawAccel = new Float32Array(3);
  _prevQuat = new Float32Array([0, 0, 0, 1]);
  _currQuat = new Float32Array([0, 0, 0, 1]);
  _rawAngVel = new Float32Array(3);
  _prevAngVel = new Float32Array(3);
  _posScratch = new Float32Array(3);
  _quatScratch = new Float32Array(4);
  constructor(handedness, config) {
    this.handedness = handedness;
    this.config = {
      ...DEFAULT_MOTION_STATE_CONFIG,
      ...config,
      wristFlip: {
        ...DEFAULT_MOTION_STATE_CONFIG.wristFlip,
        ...config?.wristFlip || {}
      }
    };
    this.wristFlip = new WristFlipTrigger(this.config.wristFlip);
    this.data = {
      state: "STATIONARY",
      position: new Float32Array(3),
      velocity: new Float32Array(3),
      acceleration: new Float32Array(3),
      angularVelocity: new Float32Array(3),
      speed: 0,
      accelMagnitude: 0,
      angularSpeed: 0,
      angularSpeedDeg: 0,
      wristFlip: this.wristFlip.state,
      timestampMs: 0,
      tracked: false
    };
  }
  /**
   * Main kinematics update method.
   * Supports Vec3/Quat objects, Float32Arrays, or ArrayLike tuples.
   * Zero allocations per call.
   */
  update(position, orientation, timestampMs) {
    if (!position) {
      return this.markUntracked(timestampMs);
    }
    const hasPos = this._extractVec3(position, this._posScratch);
    if (!hasPos) {
      return this.markUntracked(timestampMs);
    }
    const hasQuat = orientation ? this._extractQuat(orientation, this._quatScratch) : false;
    const now = timestampMs !== void 0 ? timestampMs : typeof performance !== "undefined" ? performance.now() : Date.now();
    this.data.tracked = true;
    this.data.timestampMs = now;
    this.data.position[0] = this._posScratch[0];
    this.data.position[1] = this._posScratch[1];
    this.data.position[2] = this._posScratch[2];
    if (hasQuat) {
      this._currQuat[0] = this._quatScratch[0];
      this._currQuat[1] = this._quatScratch[1];
      this._currQuat[2] = this._quatScratch[2];
      this._currQuat[3] = this._quatScratch[3];
      this._normalizeQuat(this._currQuat);
    }
    if (!this._hasPrev) {
      this._prevPos[0] = this._posScratch[0];
      this._prevPos[1] = this._posScratch[1];
      this._prevPos[2] = this._posScratch[2];
      if (hasQuat) {
        this._prevQuat[0] = this._currQuat[0];
        this._prevQuat[1] = this._currQuat[1];
        this._prevQuat[2] = this._currQuat[2];
        this._prevQuat[3] = this._currQuat[3];
      }
      this._prevTimeMs = now;
      this._hasPrev = true;
      this._zeroOutputs();
      this.data.state = "STATIONARY";
      return this.data;
    }
    const dtMs = now - this._prevTimeMs;
    const dt = dtMs / 1e3;
    if (dt <= 0 || dt > 0.5) {
      this._prevTimeMs = now;
      this._prevPos[0] = this._posScratch[0];
      this._prevPos[1] = this._posScratch[1];
      this._prevPos[2] = this._posScratch[2];
      if (hasQuat) {
        this._prevQuat[0] = this._currQuat[0];
        this._prevQuat[1] = this._currQuat[1];
        this._prevQuat[2] = this._currQuat[2];
        this._prevQuat[3] = this._currQuat[3];
      }
      return this.data;
    }
    const alpha = Math.max(0.01, Math.min(1, this.config.smoothingAlpha));
    const invDt = 1 / dt;
    this._rawVel[0] = (this._posScratch[0] - this._prevPos[0]) * invDt;
    this._rawVel[1] = (this._posScratch[1] - this._prevPos[1]) * invDt;
    this._rawVel[2] = (this._posScratch[2] - this._prevPos[2]) * invDt;
    this.data.velocity[0] = alpha * this._rawVel[0] + (1 - alpha) * this._prevVel[0];
    this.data.velocity[1] = alpha * this._rawVel[1] + (1 - alpha) * this._prevVel[1];
    this.data.velocity[2] = alpha * this._rawVel[2] + (1 - alpha) * this._prevVel[2];
    const vx = this.data.velocity[0];
    const vy = this.data.velocity[1];
    const vz = this.data.velocity[2];
    this.data.speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    this._rawAccel[0] = (this.data.velocity[0] - this._prevVel[0]) * invDt;
    this._rawAccel[1] = (this.data.velocity[1] - this._prevVel[1]) * invDt;
    this._rawAccel[2] = (this.data.velocity[2] - this._prevVel[2]) * invDt;
    this.data.acceleration[0] = alpha * this._rawAccel[0] + (1 - alpha) * this._prevAccel[0];
    this.data.acceleration[1] = alpha * this._rawAccel[1] + (1 - alpha) * this._prevAccel[1];
    this.data.acceleration[2] = alpha * this._rawAccel[2] + (1 - alpha) * this._prevAccel[2];
    const ax = this.data.acceleration[0];
    const ay = this.data.acceleration[1];
    const az = this.data.acceleration[2];
    this.data.accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    let deltaAngle = 0;
    if (hasQuat) {
      deltaAngle = this._computeAngularVelocity(dt, invDt, alpha);
    } else {
      this.data.angularVelocity[0] = 0;
      this.data.angularVelocity[1] = 0;
      this.data.angularVelocity[2] = 0;
      this.data.angularSpeed = 0;
      this.data.angularSpeedDeg = 0;
    }
    this.data.state = classifyMotionState(
      this.data.speed,
      this.data.accelMagnitude,
      this.data.angularSpeed,
      this.config
    );
    this.wristFlip.update(
      this.data.angularSpeed,
      deltaAngle,
      this.data.speed,
      hasQuat ? this._currQuat : null,
      dtMs
    );
    this._prevPos[0] = this._posScratch[0];
    this._prevPos[1] = this._posScratch[1];
    this._prevPos[2] = this._posScratch[2];
    this._prevVel[0] = this.data.velocity[0];
    this._prevVel[1] = this.data.velocity[1];
    this._prevVel[2] = this.data.velocity[2];
    this._prevAccel[0] = this.data.acceleration[0];
    this._prevAccel[1] = this.data.acceleration[1];
    this._prevAccel[2] = this.data.acceleration[2];
    this._prevAngVel[0] = this.data.angularVelocity[0];
    this._prevAngVel[1] = this.data.angularVelocity[1];
    this._prevAngVel[2] = this.data.angularVelocity[2];
    if (hasQuat) {
      this._prevQuat[0] = this._currQuat[0];
      this._prevQuat[1] = this._currQuat[1];
      this._prevQuat[2] = this._currQuat[2];
      this._prevQuat[3] = this._currQuat[3];
    }
    this._prevTimeMs = now;
    return this.data;
  }
  /**
   * Updates state from a Haath SingleHandState (e.g. from SingleHandRecognizer).
   */
  updateFromHandState(handState, timestampMs) {
    if (!handState || !handState.tracked) {
      return this.markUntracked(timestampMs);
    }
    return this.update(handState.wristPosition, handState.palmQuaternion, timestampMs);
  }
  markUntracked(timestampMs) {
    this.data.tracked = false;
    this.data.timestampMs = timestampMs ?? (typeof performance !== "undefined" ? performance.now() : Date.now());
    this._zeroOutputs();
    this.data.state = "STATIONARY";
    this.wristFlip.reset();
    this._hasPrev = false;
    return this.data;
  }
  reset() {
    this._hasPrev = false;
    this._zeroOutputs();
    this.data.tracked = false;
    this.data.state = "STATIONARY";
    this.wristFlip.reset();
  }
  _computeAngularVelocity(dt, invDt, alpha) {
    const q0 = this._prevQuat;
    const q1 = this._currQuat;
    let dot = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];
    if (dot < 0) {
      q1[0] = -q1[0];
      q1[1] = -q1[1];
      q1[2] = -q1[2];
      q1[3] = -q1[3];
      dot = -dot;
    }
    const w0 = q0[3], x0 = q0[0], y0 = q0[1], z0 = q0[2];
    const w1 = q1[3], x1 = q1[0], y1 = q1[1], z1 = q1[2];
    const dw = Math.max(-1, Math.min(1, w1 * w0 + x1 * x0 + y1 * y0 + z1 * z0));
    const dx = w0 * x1 - w1 * x0 + y0 * z1 - z0 * y1;
    const dy = w0 * y1 - w1 * y0 + z0 * x1 - x0 * z1;
    const dz = w0 * z1 - w1 * z0 + x0 * y1 - y0 * x1;
    const deltaAngle = 2 * Math.acos(dw);
    if (deltaAngle < 1e-5) {
      this._rawAngVel[0] = 0;
      this._rawAngVel[1] = 0;
      this._rawAngVel[2] = 0;
    } else {
      const sinHalf = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const factor = sinHalf > 1e-6 ? deltaAngle * invDt / sinHalf : 2 * invDt;
      this._rawAngVel[0] = dx * factor;
      this._rawAngVel[1] = dy * factor;
      this._rawAngVel[2] = dz * factor;
    }
    this.data.angularVelocity[0] = alpha * this._rawAngVel[0] + (1 - alpha) * this._prevAngVel[0];
    this.data.angularVelocity[1] = alpha * this._rawAngVel[1] + (1 - alpha) * this._prevAngVel[1];
    this.data.angularVelocity[2] = alpha * this._rawAngVel[2] + (1 - alpha) * this._prevAngVel[2];
    const wx = this.data.angularVelocity[0];
    const wy = this.data.angularVelocity[1];
    const wz = this.data.angularVelocity[2];
    this.data.angularSpeed = Math.sqrt(wx * wx + wy * wy + wz * wz);
    this.data.angularSpeedDeg = this.data.angularSpeed * (180 / Math.PI);
    return deltaAngle;
  }
  _zeroOutputs() {
    this.data.velocity[0] = 0;
    this.data.velocity[1] = 0;
    this.data.velocity[2] = 0;
    this.data.acceleration[0] = 0;
    this.data.acceleration[1] = 0;
    this.data.acceleration[2] = 0;
    this.data.angularVelocity[0] = 0;
    this.data.angularVelocity[1] = 0;
    this.data.angularVelocity[2] = 0;
    this.data.speed = 0;
    this.data.accelMagnitude = 0;
    this.data.angularSpeed = 0;
    this.data.angularSpeedDeg = 0;
    this._prevVel[0] = 0;
    this._prevVel[1] = 0;
    this._prevVel[2] = 0;
    this._prevAccel[0] = 0;
    this._prevAccel[1] = 0;
    this._prevAccel[2] = 0;
    this._prevAngVel[0] = 0;
    this._prevAngVel[1] = 0;
    this._prevAngVel[2] = 0;
  }
  _extractVec3(v, out) {
    if ("x" in v && typeof v.x === "number") {
      out[0] = v.x;
      out[1] = v.y;
      out[2] = v.z;
      return true;
    }
    if (v.length >= 3) {
      out[0] = v[0];
      out[1] = v[1];
      out[2] = v[2];
      return true;
    }
    return false;
  }
  _extractQuat(q, out) {
    if ("w" in q && typeof q.w === "number") {
      out[0] = q.x;
      out[1] = q.y;
      out[2] = q.z;
      out[3] = q.w;
      return true;
    }
    if (q.length >= 4) {
      out[0] = q[0];
      out[1] = q[1];
      out[2] = q[2];
      out[3] = q[3];
      return true;
    }
    return false;
  }
  _normalizeQuat(q) {
    const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (len > 1e-6) {
      const inv = 1 / len;
      q[0] *= inv;
      q[1] *= inv;
      q[2] *= inv;
      q[3] *= inv;
    } else {
      q[0] = 0;
      q[1] = 0;
      q[2] = 0;
      q[3] = 1;
    }
  }
};
var MotionStateTracker = class {
  left;
  right;
  config;
  constructor(config) {
    this.config = {
      ...DEFAULT_MOTION_STATE_CONFIG,
      ...config,
      wristFlip: {
        ...DEFAULT_MOTION_STATE_CONFIG.wristFlip,
        ...config?.wristFlip || {}
      }
    };
    this.left = new HandMotionTracker("left", this.config);
    this.right = new HandMotionTracker("right", this.config);
  }
  /**
   * Updates kinematics for an individual hand.
   */
  updateHand(handedness, position, orientation, timestampMs) {
    return handedness === "left" ? this.left.update(position, orientation, timestampMs) : this.right.update(position, orientation, timestampMs);
  }
  /**
   * Shorthand update alias matching single/multi-hand signatures.
   */
  update(handedness, position, orientation, timestampMs) {
    return this.updateHand(handedness, position, orientation, timestampMs);
  }
  /**
   * Batch update from complete HaathFrameState.
   */
  updateFromFrame(frame, timestampMs) {
    return {
      left: this.left.updateFromHandState(frame.left, timestampMs),
      right: this.right.updateFromHandState(frame.right, timestampMs)
    };
  }
  /**
   * Resets both hands to initial stationary untracked states.
   */
  reset() {
    this.left.reset();
    this.right.reset();
  }
};

// src/MicroGestureDetector.ts
var DEFAULT_MICRO_GESTURE_CONFIG = {
  tapContactDist: 0.022,
  tapSeparationDist: 0.035,
  doubleTapMinMs: 50,
  doubleTapMaxMs: 450,
  slideContactDist: 0.028,
  slideMinDisplacement: 0.015,
  slideMinVelocity: 0.03,
  rubContactDist: 0.028,
  rubWindowMs: 750,
  rubMinReversals: 3,
  rubMinStrokeDist: 5e-3,
  flickHoldDist: 0.025,
  flickMinHoldFrames: 2,
  flickReleaseSpeed: 0.75,
  flickExtensionSpeed: 0.35,
  snapPreLoadDist: 0.025,
  snapMinHoldFrames: 2,
  snapReleaseSpeed: 0.8,
  snapPalmImpactDist: 0.045,
  snapPalmApproachSpeed: 0.4
};
function createMicroGestureState() {
  return {
    active: "none",
    moneyRub: {
      active: false,
      rubCount: 0,
      reversals: 0,
      intensity: 0
    },
    thumbIndexTap: {
      tapped: false,
      doubleTapped: false,
      tapCount: 0,
      lastTapTimeMs: 0,
      contactDistance: 0
    },
    thumbSlide: {
      active: false,
      direction: "none",
      displacement: 0,
      velocity: 0,
      progress: 0
    },
    fingerFlick: {
      triggered: false,
      finger: "none",
      speed: 0
    },
    fingerSnap: {
      triggered: false,
      finger: "none",
      intensity: 0,
      speed: 0
    }
  };
}
var MicroGestureDetector = class {
  _config;
  state = createMicroGestureState();
  // Scratch vectors for zero-allocation math
  _vTemp1 = new Float32Array(3);
  _vTemp2 = new Float32Array(3);
  _vDir = new Float32Array(3);
  _vRel = new Float32Array(3);
  _vPrevRel = new Float32Array(3);
  _rubStrokeAcc = new Float32Array(3);
  _palmPos = new Float32Array(3);
  // Thumb-index tap state
  _tapInContact = false;
  _lastTapTimeMs = 0;
  // Thumb slide state
  _slideTracking = false;
  _lastSlideProj = 0;
  _slideDirSign = 0;
  _accumulatedSlideDisplacement = 0;
  // Money rub state
  _hasPrevRel = false;
  _rubReversals = [];
  _lastRubContactMs = 0;
  // Finger flick state
  _flickHoldFramesIndex = 0;
  _flickHoldFramesMiddle = 0;
  _prevFlickThumbDistIndex = 0;
  _prevFlickWristDistIndex = 0;
  _prevFlickThumbDistMiddle = 0;
  _prevFlickWristDistMiddle = 0;
  // Finger snap state
  _snapHoldFramesMiddle = 0;
  _snapHoldFramesIndex = 0;
  _prevSnapThumbDistMiddle = 0;
  _prevSnapPalmDistMiddle = 0;
  _prevSnapThumbDistIndex = 0;
  _prevSnapPalmDistIndex = 0;
  constructor(config = {}) {
    this._config = {
      ...DEFAULT_MICRO_GESTURE_CONFIG,
      ...config
    };
  }
  reset() {
    const s = this.state;
    s.active = "none";
    s.moneyRub.active = false;
    s.moneyRub.rubCount = 0;
    s.moneyRub.reversals = 0;
    s.moneyRub.intensity = 0;
    s.thumbIndexTap.tapped = false;
    s.thumbIndexTap.doubleTapped = false;
    s.thumbIndexTap.tapCount = 0;
    s.thumbIndexTap.lastTapTimeMs = 0;
    s.thumbIndexTap.contactDistance = 0;
    s.thumbSlide.active = false;
    s.thumbSlide.direction = "none";
    s.thumbSlide.displacement = 0;
    s.thumbSlide.velocity = 0;
    s.thumbSlide.progress = 0;
    s.fingerFlick.triggered = false;
    s.fingerFlick.finger = "none";
    s.fingerFlick.speed = 0;
    s.fingerSnap.triggered = false;
    s.fingerSnap.finger = "none";
    s.fingerSnap.intensity = 0;
    s.fingerSnap.speed = 0;
    this._tapInContact = false;
    this._lastTapTimeMs = 0;
    this._slideTracking = false;
    this._lastSlideProj = 0;
    this._slideDirSign = 0;
    this._accumulatedSlideDisplacement = 0;
    this._hasPrevRel = false;
    this._rubReversals.length = 0;
    this._lastRubContactMs = 0;
    this._rubStrokeAcc.fill(0);
    this._flickHoldFramesIndex = 0;
    this._flickHoldFramesMiddle = 0;
    this._prevFlickThumbDistIndex = 0;
    this._prevFlickWristDistIndex = 0;
    this._prevFlickThumbDistMiddle = 0;
    this._prevFlickWristDistMiddle = 0;
    this._snapHoldFramesMiddle = 0;
    this._snapHoldFramesIndex = 0;
    this._prevSnapThumbDistMiddle = 0;
    this._prevSnapPalmDistMiddle = 0;
    this._prevSnapThumbDistIndex = 0;
    this._prevSnapPalmDistIndex = 0;
  }
  /**
   * Updates micro-gesture evaluation from a 25-joint XR poses buffer.
   * @param poses Float32Array containing 25-joint pose data.
   * @param frameOffset Starting float offset in poses buffer (default 0).
   * @param deltaSeconds Time elapsed since last frame in seconds (default 1/60).
   * @param nowMs Current monotonic timestamp in milliseconds.
   * @param stride Floats per joint in buffer (default FLOATS_PER_JOINT = 7).
   */
  update(poses, frameOffset = 0, deltaSeconds = 1 / 60, nowMs = typeof performance !== "undefined" ? performance.now() : Date.now(), stride = FLOATS_PER_JOINT) {
    const cfg = this._config;
    const s = this.state;
    s.thumbIndexTap.tapped = false;
    s.thumbIndexTap.doubleTapped = false;
    s.fingerFlick.triggered = false;
    s.fingerFlick.finger = "none";
    s.fingerFlick.speed = 0;
    s.fingerSnap.triggered = false;
    s.fingerSnap.finger = "none";
    s.fingerSnap.intensity = 0;
    s.fingerSnap.speed = 0;
    const wristOff = frameOffset + JOINT_INDEX.WRIST * stride;
    const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * stride;
    const indexProxOff = frameOffset + JOINT_INDEX.INDEX_PROXIMAL * stride;
    const indexTipOff = frameOffset + JOINT_INDEX.INDEX_TIP * stride;
    const middleProxOff = frameOffset + JOINT_INDEX.MIDDLE_PROXIMAL * stride;
    const middleTipOff = frameOffset + JOINT_INDEX.MIDDLE_TIP * stride;
    this._palmPos[0] = (poses[wristOff] + poses[indexProxOff]) * 0.5;
    this._palmPos[1] = (poses[wristOff + 1] + poses[indexProxOff + 1]) * 0.5;
    this._palmPos[2] = (poses[wristOff + 2] + poses[indexProxOff + 2]) * 0.5;
    const dThumbIndex = v3Dist(poses, poses, thumbTipOff, indexTipOff);
    s.thumbIndexTap.contactDistance = dThumbIndex;
    if (dThumbIndex < cfg.tapContactDist) {
      if (!this._tapInContact) {
        this._tapInContact = true;
        s.thumbIndexTap.tapped = true;
        const elapsed = nowMs - this._lastTapTimeMs;
        if (elapsed >= cfg.doubleTapMinMs && elapsed <= cfg.doubleTapMaxMs) {
          s.thumbIndexTap.doubleTapped = true;
          s.thumbIndexTap.tapCount++;
        } else {
          s.thumbIndexTap.doubleTapped = false;
          s.thumbIndexTap.tapCount++;
        }
        this._lastTapTimeMs = nowMs;
        s.thumbIndexTap.lastTapTimeMs = nowMs;
      }
    } else if (dThumbIndex > cfg.tapSeparationDist) {
      this._tapInContact = false;
    }
    v3Sub(this._vDir, poses, poses, indexTipOff, indexProxOff);
    const indexAxisLen = v3Len(this._vDir);
    if (indexAxisLen > 5e-3) {
      v3Normalize(this._vDir, this._vDir);
      v3Sub(this._vTemp1, poses, poses, thumbTipOff, indexProxOff);
      const proj = v3Dot(this._vTemp1, this._vDir);
      this._vTemp2[0] = this._vTemp1[0] - proj * this._vDir[0];
      this._vTemp2[1] = this._vTemp1[1] - proj * this._vDir[1];
      this._vTemp2[2] = this._vTemp1[2] - proj * this._vDir[2];
      const perpDist = v3Len(this._vTemp2);
      const inSlideProximity = perpDist < cfg.slideContactDist && proj > -0.015 && proj < indexAxisLen + 0.02;
      const progress = Math.max(0, Math.min(1, proj / indexAxisLen));
      s.thumbSlide.progress = progress;
      if (inSlideProximity) {
        if (this._slideTracking) {
          const dProj = proj - this._lastSlideProj;
          const vSlide = deltaSeconds > 0 ? dProj / deltaSeconds : 0;
          if (Math.abs(dProj) > 4e-4) {
            const dirSign = Math.sign(dProj);
            if (this._slideDirSign === 0 || dirSign === this._slideDirSign) {
              this._slideDirSign = dirSign;
              this._accumulatedSlideDisplacement += Math.abs(dProj);
            } else {
              this._slideDirSign = dirSign;
              this._accumulatedSlideDisplacement = Math.abs(dProj);
            }
          }
          s.thumbSlide.displacement = this._accumulatedSlideDisplacement;
          s.thumbSlide.velocity = vSlide;
          if (this._accumulatedSlideDisplacement >= cfg.slideMinDisplacement && Math.abs(vSlide) >= cfg.slideMinVelocity) {
            s.thumbSlide.active = true;
            s.thumbSlide.direction = this._slideDirSign > 0 ? "proximal_to_distal" : "distal_to_proximal";
          } else {
            s.thumbSlide.active = false;
            s.thumbSlide.direction = "none";
          }
        } else {
          this._slideTracking = true;
          this._slideDirSign = 0;
          this._accumulatedSlideDisplacement = 0;
          s.thumbSlide.active = false;
          s.thumbSlide.direction = "none";
          s.thumbSlide.displacement = 0;
          s.thumbSlide.velocity = 0;
        }
        this._lastSlideProj = proj;
      } else {
        this._slideTracking = false;
        this._slideDirSign = 0;
        this._accumulatedSlideDisplacement = 0;
        s.thumbSlide.active = false;
        s.thumbSlide.direction = "none";
        s.thumbSlide.displacement = 0;
        s.thumbSlide.velocity = 0;
      }
    } else {
      this._slideTracking = false;
      s.thumbSlide.active = false;
      s.thumbSlide.direction = "none";
      s.thumbSlide.displacement = 0;
      s.thumbSlide.velocity = 0;
      s.thumbSlide.progress = 0;
    }
    const dThumbMiddle = v3Dist(poses, poses, thumbTipOff, middleTipOff);
    const inRubRange = dThumbIndex < cfg.rubContactDist || dThumbMiddle < cfg.rubContactDist;
    v3Sub(this._vRel, poses, poses, thumbTipOff, indexTipOff);
    if (inRubRange) {
      this._lastRubContactMs = nowMs;
      if (this._hasPrevRel) {
        this._vTemp1[0] = this._vRel[0] - this._vPrevRel[0];
        this._vTemp1[1] = this._vRel[1] - this._vPrevRel[1];
        this._vTemp1[2] = this._vRel[2] - this._vPrevRel[2];
        const stepLen = v3Len(this._vTemp1);
        const strokeLen = v3Len(this._rubStrokeAcc);
        if (stepLen > 4e-4) {
          const strokeDot = strokeLen > 1e-4 ? v3Dot(this._vTemp1, this._rubStrokeAcc) / (stepLen * strokeLen) : 1;
          if (strokeDot < -0.2 && strokeLen >= cfg.rubMinStrokeDist) {
            this._rubReversals.push({ timeMs: nowMs, dist: strokeLen });
            this._rubStrokeAcc[0] = this._vTemp1[0];
            this._rubStrokeAcc[1] = this._vTemp1[1];
            this._rubStrokeAcc[2] = this._vTemp1[2];
          } else {
            this._rubStrokeAcc[0] += this._vTemp1[0];
            this._rubStrokeAcc[1] += this._vTemp1[1];
            this._rubStrokeAcc[2] += this._vTemp1[2];
          }
        }
      } else {
        this._hasPrevRel = true;
        this._rubStrokeAcc.fill(0);
      }
      this._vPrevRel[0] = this._vRel[0];
      this._vPrevRel[1] = this._vRel[1];
      this._vPrevRel[2] = this._vRel[2];
    } else {
      if (nowMs - this._lastRubContactMs > 250) {
        this._hasPrevRel = false;
        this._rubReversals.length = 0;
        this._rubStrokeAcc.fill(0);
      }
    }
    const rubCutoff = nowMs - cfg.rubWindowMs;
    while (this._rubReversals.length > 0 && this._rubReversals[0].timeMs < rubCutoff) {
      this._rubReversals.shift();
    }
    const revCount = this._rubReversals.length;
    s.moneyRub.reversals = revCount;
    if (revCount >= cfg.rubMinReversals) {
      s.moneyRub.active = true;
      s.moneyRub.rubCount = Math.floor(revCount / 2);
      let totalDist = 0;
      for (let i = 0; i < revCount; i++) {
        totalDist += this._rubReversals[i].dist;
      }
      const avgDist = totalDist / revCount;
      s.moneyRub.intensity = Math.min(1, Math.max(0, revCount / 6 * (avgDist / 7e-3)));
    } else {
      s.moneyRub.active = false;
      s.moneyRub.intensity = 0;
    }
    const dIndexWrist = v3Dist(poses, poses, indexTipOff, wristOff);
    const isIndexHeld = dThumbIndex < cfg.flickHoldDist;
    if (isIndexHeld) {
      this._flickHoldFramesIndex++;
    } else {
      if (this._flickHoldFramesIndex >= cfg.flickMinHoldFrames && deltaSeconds > 0) {
        const vSep = (dThumbIndex - this._prevFlickThumbDistIndex) / deltaSeconds;
        const vExt = (dIndexWrist - this._prevFlickWristDistIndex) / deltaSeconds;
        if (vSep >= cfg.flickReleaseSpeed && vExt >= cfg.flickExtensionSpeed) {
          s.fingerFlick.triggered = true;
          s.fingerFlick.finger = "index";
          s.fingerFlick.speed = Math.max(vSep, vExt);
        }
      }
      this._flickHoldFramesIndex = 0;
    }
    this._prevFlickThumbDistIndex = dThumbIndex;
    this._prevFlickWristDistIndex = dIndexWrist;
    const dMiddleWrist = v3Dist(poses, poses, middleTipOff, wristOff);
    const isMiddleHeld = dThumbMiddle < cfg.flickHoldDist;
    if (isMiddleHeld) {
      this._flickHoldFramesMiddle++;
    } else {
      if (!s.fingerFlick.triggered && this._flickHoldFramesMiddle >= cfg.flickMinHoldFrames && deltaSeconds > 0) {
        const vSep = (dThumbMiddle - this._prevFlickThumbDistMiddle) / deltaSeconds;
        const vExt = (dMiddleWrist - this._prevFlickWristDistMiddle) / deltaSeconds;
        if (vSep >= cfg.flickReleaseSpeed && vExt >= cfg.flickExtensionSpeed) {
          s.fingerFlick.triggered = true;
          s.fingerFlick.finger = "middle";
          s.fingerFlick.speed = Math.max(vSep, vExt);
        }
      }
      this._flickHoldFramesMiddle = 0;
    }
    this._prevFlickThumbDistMiddle = dThumbMiddle;
    this._prevFlickWristDistMiddle = dMiddleWrist;
    const dMiddlePalm = v3Dist(poses, this._palmPos, middleTipOff, 0);
    const isMiddleSnapPreLoaded = dThumbMiddle < cfg.snapPreLoadDist && dMiddlePalm > cfg.snapPalmImpactDist;
    if (isMiddleSnapPreLoaded) {
      this._snapHoldFramesMiddle++;
    } else {
      if (this._snapHoldFramesMiddle >= cfg.snapMinHoldFrames && deltaSeconds > 0) {
        const vSep = (dThumbMiddle - this._prevSnapThumbDistMiddle) / deltaSeconds;
        const vPalmApproach = (this._prevSnapPalmDistMiddle - dMiddlePalm) / deltaSeconds;
        if (vSep >= cfg.snapReleaseSpeed && (vPalmApproach >= cfg.snapPalmApproachSpeed || dMiddlePalm <= cfg.snapPalmImpactDist)) {
          s.fingerSnap.triggered = true;
          s.fingerSnap.finger = "middle";
          s.fingerSnap.speed = vSep;
          s.fingerSnap.intensity = Math.min(1, Math.max(0, (vSep - 0.4) / 1.6));
        }
      }
      if (dThumbMiddle > cfg.snapPreLoadDist * 1.5) {
        this._snapHoldFramesMiddle = 0;
      }
    }
    this._prevSnapThumbDistMiddle = dThumbMiddle;
    this._prevSnapPalmDistMiddle = dMiddlePalm;
    const dIndexPalm = v3Dist(poses, this._palmPos, indexTipOff, 0);
    const isIndexSnapPreLoaded = dThumbIndex < cfg.snapPreLoadDist && dIndexPalm > cfg.snapPalmImpactDist;
    if (isIndexSnapPreLoaded) {
      this._snapHoldFramesIndex++;
    } else {
      if (!s.fingerSnap.triggered && this._snapHoldFramesIndex >= cfg.snapMinHoldFrames && deltaSeconds > 0) {
        const vSep = (dThumbIndex - this._prevSnapThumbDistIndex) / deltaSeconds;
        const vPalmApproach = (this._prevSnapPalmDistIndex - dIndexPalm) / deltaSeconds;
        if (vSep >= cfg.snapReleaseSpeed && (vPalmApproach >= cfg.snapPalmApproachSpeed || dIndexPalm <= cfg.snapPalmImpactDist)) {
          s.fingerSnap.triggered = true;
          s.fingerSnap.finger = "index";
          s.fingerSnap.speed = vSep;
          s.fingerSnap.intensity = Math.min(1, Math.max(0, (vSep - 0.4) / 1.6));
        }
      }
      if (dThumbIndex > cfg.snapPreLoadDist * 1.5) {
        this._snapHoldFramesIndex = 0;
      }
    }
    this._prevSnapThumbDistIndex = dThumbIndex;
    this._prevSnapPalmDistIndex = dIndexPalm;
    if (s.fingerSnap.triggered) {
      s.active = "finger_snap";
    } else if (s.fingerFlick.triggered) {
      s.active = "finger_flick";
    } else if (s.thumbIndexTap.doubleTapped) {
      s.active = "thumb_index_double_tap";
    } else if (s.thumbIndexTap.tapped) {
      s.active = "thumb_index_tap";
    } else if (s.moneyRub.active) {
      s.active = "money_rub";
    } else if (s.thumbSlide.active) {
      s.active = "thumb_slide";
    } else {
      s.active = "none";
    }
    return s;
  }
};

// src/RollingTrajectoryBuffer.ts
var DEFAULT_MAX_DURATION_MS = 5e3;
var DEFAULT_CAPACITY = 500;
var DEFAULT_MIN_SAMPLES = 12;
var DEFAULT_MIN_PATH_LENGTH = 0.08;
var DEFAULT_MIN_CONFIDENCE = 0.65;
var RESAMPLE_POINTS = 32;
function generateCircleTemplate(clockwise) {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  const sign = clockwise ? -1 : 1;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const t = i / (RESAMPLE_POINTS - 1) * 2 * Math.PI * sign;
    pts[i * 2] = Math.cos(t);
    pts[i * 2 + 1] = Math.sin(t);
  }
  return normalizeTemplate(pts);
}
function generateTriangleTemplate() {
  const v = [
    [0, 1],
    [0.866, -0.5],
    [-0.866, -0.5],
    [0, 1]
  ];
  return samplePolyline(v, RESAMPLE_POINTS);
}
function generateSwipeTemplate(dir) {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const frac = -1 + 2 * i / (RESAMPLE_POINTS - 1);
    if (dir === "up") {
      pts[i * 2] = 0;
      pts[i * 2 + 1] = frac;
    } else if (dir === "down") {
      pts[i * 2] = 0;
      pts[i * 2 + 1] = -frac;
    } else if (dir === "right") {
      pts[i * 2] = frac;
      pts[i * 2 + 1] = 0;
    } else {
      pts[i * 2] = -frac;
      pts[i * 2 + 1] = 0;
    }
  }
  return normalizeTemplate(pts);
}
function generateLightningZTemplate() {
  const v = [
    [-0.8, 0.8],
    [0.8, 0.8],
    [-0.8, -0.8],
    [0.8, -0.8]
  ];
  return samplePolyline(v, RESAMPLE_POINTS);
}
function generateInfinityTemplate() {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const t = i / (RESAMPLE_POINTS - 1) * 2 * Math.PI;
    pts[i * 2] = Math.cos(t);
    pts[i * 2 + 1] = Math.sin(2 * t) * 0.5;
  }
  return normalizeTemplate(pts);
}
function generateSpiralTemplate(spiralIn) {
  const pts = new Float32Array(RESAMPLE_POINTS * 2);
  const turns = 1.6 * 2 * Math.PI;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const alpha = i / (RESAMPLE_POINTS - 1);
    const r = spiralIn ? 1 - 0.75 * alpha : 0.25 + 0.75 * alpha;
    const t = alpha * turns;
    pts[i * 2] = r * Math.cos(t);
    pts[i * 2 + 1] = r * Math.sin(t);
  }
  return normalizeTemplate(pts);
}
function generateStarTemplate() {
  const v = [];
  const vertexIndices = [0, 2, 4, 1, 3, 0];
  for (const idx of vertexIndices) {
    const angle = Math.PI / 2 + idx * 2 * Math.PI / 5;
    v.push([Math.cos(angle), Math.sin(angle)]);
  }
  return samplePolyline(v, RESAMPLE_POINTS);
}
function generateCrossTemplate() {
  const v = [
    [0, 1],
    [0, -1],
    [0, 0],
    [-1, 0],
    [1, 0]
  ];
  return samplePolyline(v, RESAMPLE_POINTS);
}
function samplePolyline(vertices, count) {
  let totalLen = 0;
  const segLens = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const dx = vertices[i + 1][0] - vertices[i][0];
    const dy = vertices[i + 1][1] - vertices[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    totalLen += len;
  }
  const out = new Float32Array(count * 2);
  const step = totalLen / (count - 1);
  let segIdx = 0;
  let segCovered = 0;
  for (let i = 0; i < count; i++) {
    const targetDist = i * step;
    while (segIdx < segLens.length - 1 && targetDist > segCovered + segLens[segIdx]) {
      segCovered += segLens[segIdx];
      segIdx++;
    }
    const rem = targetDist - segCovered;
    const t = segLens[segIdx] > 1e-6 ? Math.min(1, rem / segLens[segIdx]) : 0;
    const p0 = vertices[segIdx];
    const p1 = vertices[segIdx + 1];
    out[i * 2] = p0[0] + (p1[0] - p0[0]) * t;
    out[i * 2 + 1] = p0[1] + (p1[1] - p0[1]) * t;
  }
  return normalizeTemplate(out);
}
function normalizeTemplate(pts) {
  const N = pts.length / 2;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < N; i++) {
    cx += pts[i * 2];
    cy += pts[i * 2 + 1];
  }
  cx /= N;
  cy /= N;
  let maxR = 0;
  for (let i = 0; i < N; i++) {
    const x = pts[i * 2] - cx;
    const y = pts[i * 2 + 1] - cy;
    const r = Math.sqrt(x * x + y * y);
    if (r > maxR) maxR = r;
  }
  const invR = maxR > 1e-6 ? 1 / maxR : 1;
  const normalized = new Float32Array(pts.length);
  for (let i = 0; i < N; i++) {
    normalized[i * 2] = (pts[i * 2] - cx) * invR;
    normalized[i * 2 + 1] = (pts[i * 2 + 1] - cy) * invR;
  }
  return normalized;
}
var TEMPLATES = {
  circle_cw: generateCircleTemplate(true),
  circle_ccw: generateCircleTemplate(false),
  triangle: generateTriangleTemplate(),
  line_swipe_up: generateSwipeTemplate("up"),
  line_swipe_down: generateSwipeTemplate("down"),
  line_swipe_left: generateSwipeTemplate("left"),
  line_swipe_right: generateSwipeTemplate("right"),
  lightning_z: generateLightningZTemplate(),
  infinity: generateInfinityTemplate(),
  spiral_in: generateSpiralTemplate(true),
  spiral_out: generateSpiralTemplate(false),
  star: generateStarTemplate(),
  cross: generateCrossTemplate()
};
var RollingTrajectoryBuffer = class {
  _maxDurationMs;
  _capacity;
  _minSamples;
  _minPathLength;
  _anchorJoint;
  _minConfidence;
  // Ring buffer arrays
  _times;
  _positions;
  // [x0, y0, z0, x1, y1, z1, ...]
  _head = 0;
  _count = 0;
  // Scratch memory for plane calculation and projection
  _scratchCentroid = new Float32Array(3);
  _scratchNormal = new Float32Array(3);
  _scratchU = new Float32Array(3);
  _scratchV = new Float32Array(3);
  constructor(config = {}) {
    this._maxDurationMs = config.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
    this._capacity = config.bufferCapacity ?? DEFAULT_CAPACITY;
    this._minSamples = config.minSamples ?? DEFAULT_MIN_SAMPLES;
    this._minPathLength = config.minPathLength ?? DEFAULT_MIN_PATH_LENGTH;
    this._anchorJoint = config.anchorJoint ?? "index-finger-tip";
    this._minConfidence = config.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this._times = new Float64Array(this._capacity);
    this._positions = new Float32Array(this._capacity * 3);
  }
  get capacity() {
    return this._capacity;
  }
  get count() {
    return this._count;
  }
  get maxDurationMs() {
    return this._maxDurationMs;
  }
  clear() {
    this._head = 0;
    this._count = 0;
  }
  /**
   * Appends a raw 3D position sample with timestamp.
   */
  addSample(timeMs, x, y, z, _joint) {
    const slot = this._head;
    this._times[slot] = timeMs;
    const base = slot * 3;
    this._positions[base] = x;
    this._positions[base + 1] = y;
    this._positions[base + 2] = z;
    this._head = (this._head + 1) % this._capacity;
    if (this._count < this._capacity) {
      this._count++;
    }
  }
  /**
   * Ingests full HandPoseInput and automatically tracks the configured anchor joint.
   */
  addPose(timeMs, pose, jointName) {
    if (!pose) return false;
    const targetJoint = jointName ?? this._anchorJoint;
    if (pose instanceof Float32Array) {
      const jointIdx = this._getJointNumericIndex(targetJoint);
      if (jointIdx >= 0) {
        const offset = jointIdx * FLOATS_PER_JOINT;
        if (offset + 2 < pose.length) {
          this.addSample(timeMs, pose[offset], pose[offset + 1], pose[offset + 2], targetJoint);
          return true;
        }
      }
      return false;
    }
    const jointData = pose[targetJoint];
    if (jointData) {
      const pos = jointData.position ?? jointData;
      if (typeof pos?.x === "number" && typeof pos?.y === "number" && typeof pos?.z === "number") {
        this.addSample(timeMs, pos.x, pos.y, pos.z, targetJoint);
        return true;
      }
    }
    return false;
  }
  /**
   * Prunes samples strictly older than (nowMs - maxDurationMs).
   */
  prune(nowMs) {
    if (this._count === 0) return;
    const cutoff = nowMs - this._maxDurationMs;
    while (this._count > 0) {
      const oldestSlot = (this._head - this._count + this._capacity) % this._capacity;
      if (this._times[oldestSlot] < cutoff) {
        this._count--;
      } else {
        break;
      }
    }
  }
  /**
   * Retrieves active samples in chronological order within the specified window.
   */
  getSamples(windowMs = this._maxDurationMs) {
    if (this._count === 0) return [];
    const latestSlot = (this._head - 1 + this._capacity) % this._capacity;
    const latestTime = this._times[latestSlot];
    const cutoff = latestTime - windowMs;
    const result = [];
    const startIdx = (this._head - this._count + this._capacity) % this._capacity;
    for (let i = 0; i < this._count; i++) {
      const slot = (startIdx + i) % this._capacity;
      const t = this._times[slot];
      if (t >= cutoff) {
        const base = slot * 3;
        result.push({
          timeMs: t,
          x: this._positions[base],
          y: this._positions[base + 1],
          z: this._positions[base + 2],
          joint: this._anchorJoint
        });
      }
    }
    return result;
  }
  /**
   * Returns flat Float32Array [x0, y0, z0, x1, y1, z1, ...] of points in window.
   */
  getRawPoints(windowMs = this._maxDurationMs) {
    if (this._count === 0) return new Float32Array(0);
    const latestSlot = (this._head - 1 + this._capacity) % this._capacity;
    const latestTime = this._times[latestSlot];
    const cutoff = latestTime - windowMs;
    let validCount = 0;
    const startIdx = (this._head - this._count + this._capacity) % this._capacity;
    for (let i = 0; i < this._count; i++) {
      const slot = (startIdx + i) % this._capacity;
      if (this._times[slot] >= cutoff) {
        validCount++;
      }
    }
    const out = new Float32Array(validCount * 3);
    let outIdx = 0;
    for (let i = 0; i < this._count; i++) {
      const slot = (startIdx + i) % this._capacity;
      if (this._times[slot] >= cutoff) {
        const base = slot * 3;
        out[outIdx++] = this._positions[base];
        out[outIdx++] = this._positions[base + 1];
        out[outIdx++] = this._positions[base + 2];
      }
    }
    return out;
  }
  /**
   * Computes the dominant 3D plane for the given window using swept normal & Newell's method.
   */
  computeDominantPlane(windowMs = this._maxDurationMs) {
    const pts = this.getRawPoints(windowMs);
    return computeDominantPlaneFromPoints(pts);
  }
  /**
   * Evaluates the rolling buffer and recognizes trajectory gestures.
   */
  recognize(windowMs = this._maxDurationMs) {
    const pts = this.getRawPoints(windowMs);
    const N = pts.length / 3;
    if (N < this._minSamples) {
      return this._createEmptyResult();
    }
    const oldestSlot = (this._head - this._count + this._capacity) % this._capacity;
    const latestSlot = (this._head - 1 + this._capacity) % this._capacity;
    const durationMs = Math.max(0, this._times[latestSlot] - this._times[oldestSlot]);
    let pathLength = 0;
    for (let i = 0; i < N - 1; i++) {
      const dx = pts[(i + 1) * 3] - pts[i * 3];
      const dy = pts[(i + 1) * 3 + 1] - pts[i * 3 + 1];
      const dz = pts[(i + 1) * 3 + 2] - pts[i * 3 + 2];
      pathLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    if (pathLength < this._minPathLength) {
      return this._createEmptyResult(durationMs, pathLength, N);
    }
    return recognizeTrajectoryFrom3DPoints(pts, {
      durationMs,
      pathLength,
      minConfidence: this._minConfidence
    });
  }
  _getJointNumericIndex(joint) {
    switch (joint) {
      case "wrist":
        return JOINT_INDEX.WRIST;
      case "thumb-metacarpal":
        return JOINT_INDEX.THUMB_METACARPAL;
      case "thumb-phalanx-proximal":
        return JOINT_INDEX.THUMB_PROXIMAL;
      case "thumb-phalanx-distal":
        return JOINT_INDEX.THUMB_DISTAL;
      case "thumb-tip":
        return JOINT_INDEX.THUMB_TIP;
      case "index-finger-metacarpal":
        return JOINT_INDEX.INDEX_METACARPAL;
      case "index-finger-phalanx-proximal":
        return JOINT_INDEX.INDEX_PROXIMAL;
      case "index-finger-phalanx-intermediate":
        return JOINT_INDEX.INDEX_INTERMEDIATE;
      case "index-finger-phalanx-distal":
        return JOINT_INDEX.INDEX_DISTAL;
      case "index-finger-tip":
        return JOINT_INDEX.INDEX_TIP;
      case "middle-finger-metacarpal":
        return JOINT_INDEX.MIDDLE_METACARPAL;
      case "middle-finger-phalanx-proximal":
        return JOINT_INDEX.MIDDLE_PROXIMAL;
      case "middle-finger-phalanx-intermediate":
        return JOINT_INDEX.MIDDLE_INTERMEDIATE;
      case "middle-finger-phalanx-distal":
        return JOINT_INDEX.MIDDLE_DISTAL;
      case "middle-finger-tip":
        return JOINT_INDEX.MIDDLE_TIP;
      case "ring-finger-metacarpal":
        return JOINT_INDEX.RING_METACARPAL;
      case "ring-finger-phalanx-proximal":
        return JOINT_INDEX.RING_PROXIMAL;
      case "ring-finger-phalanx-intermediate":
        return JOINT_INDEX.RING_INTERMEDIATE;
      case "ring-finger-phalanx-distal":
        return JOINT_INDEX.RING_DISTAL;
      case "ring-finger-tip":
        return JOINT_INDEX.RING_TIP;
      case "pinky-finger-metacarpal":
        return JOINT_INDEX.PINKY_METACARPAL;
      case "pinky-finger-phalanx-proximal":
        return JOINT_INDEX.PINKY_PROXIMAL;
      case "pinky-finger-phalanx-intermediate":
        return JOINT_INDEX.PINKY_INTERMEDIATE;
      case "pinky-finger-phalanx-distal":
        return JOINT_INDEX.PINKY_DISTAL;
      case "pinky-finger-tip":
        return JOINT_INDEX.PINKY_TIP;
      default:
        return -1;
    }
  }
  _createEmptyResult(durationMs = 0, pathLength = 0, sampleCount = 0) {
    return {
      gesture: null,
      confidence: 0,
      durationMs,
      pathLength,
      sampleCount,
      dominantPlane: null,
      centroid: new Float32Array(3),
      scores: {}
    };
  }
};
function computeDominantPlaneFromPoints(pts) {
  const N = pts.length / 3;
  if (N < 3) return null;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < N; i++) {
    cx += pts[i * 3];
    cy += pts[i * 3 + 1];
    cz += pts[i * 3 + 2];
  }
  const invN = 1 / N;
  cx *= invN;
  cy *= invN;
  cz *= invN;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < N - 1; i++) {
    const ax = pts[i * 3] - cx;
    const ay = pts[i * 3 + 1] - cy;
    const az = pts[i * 3 + 2] - cz;
    const bx = pts[(i + 1) * 3] - cx;
    const by = pts[(i + 1) * 3 + 1] - cy;
    const bz = pts[(i + 1) * 3 + 2] - cz;
    nx += ay * bz - az * by;
    ny += az * bx - ax * bz;
    nz += ax * by - ay * bx;
  }
  let nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (nLen < 1e-4) {
    let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
    for (let i = 0; i < N; i++) {
      const rx = pts[i * 3] - cx;
      const ry = pts[i * 3 + 1] - cy;
      const rz = pts[i * 3 + 2] - cz;
      cxx += rx * rx;
      cyy += ry * ry;
      czz += rz * rz;
      cxy += rx * ry;
      cxz += rx * rz;
      cyz += ry * rz;
    }
    const powerStep = (mxx, myy, mzz, mxy, mxz, myz, ix, iy, iz) => {
      let x = ix, y = iy, z = iz;
      let len = Math.hypot(x, y, z) || 1;
      x /= len;
      y /= len;
      z /= len;
      for (let s = 0; s < 12; s++) {
        const px = mxx * x + mxy * y + mxz * z;
        const py = mxy * x + myy * y + myz * z;
        const pz = mxz * x + myz * y + mzz * z;
        len = Math.hypot(px, py, pz);
        if (len < 1e-12) break;
        x = px / len;
        y = py / len;
        z = pz / len;
      }
      return [x, y, z];
    };
    const [v1x, v1y, v1z] = powerStep(cxx, cyy, czz, cxy, cxz, cyz, 0.577, 0.577, 0.577);
    const lam1 = v1x * (cxx * v1x + cxy * v1y + cxz * v1z) + v1y * (cxy * v1x + cyy * v1y + cyz * v1z) + v1z * (cxz * v1x + cyz * v1y + czz * v1z);
    const dxx = cxx - lam1 * v1x * v1x;
    const dyy = cyy - lam1 * v1y * v1y;
    const dzz = czz - lam1 * v1z * v1z;
    const dxy = cxy - lam1 * v1x * v1y;
    const dxz = cxz - lam1 * v1x * v1z;
    const dyz = cyz - lam1 * v1y * v1z;
    let i2x = Math.abs(v1x) < 0.8 ? 1 : 0;
    let i2y = Math.abs(v1x) < 0.8 ? 0 : 1;
    let i2z = 0;
    const d = i2x * v1x + i2y * v1y + i2z * v1z;
    i2x -= d * v1x;
    i2y -= d * v1y;
    i2z -= d * v1z;
    const [v2x, v2y, v2z] = powerStep(dxx, dyy, dzz, dxy, dxz, dyz, i2x, i2y, i2z);
    nx = v1y * v2z - v1z * v2y;
    ny = v1z * v2x - v1x * v2z;
    nz = v1x * v2y - v1y * v2x;
    nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-6) {
      nx = 0;
      ny = 0;
      nz = 1;
      nLen = 1;
    }
  }
  const invNLen = 1 / nLen;
  nx *= invNLen;
  ny *= invNLen;
  nz *= invNLen;
  if (nz < 0 || Math.abs(nz) < 1e-4 && ny < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  let ux;
  let uy;
  let uz;
  if (Math.abs(ny) < 0.95) {
    ux = nz;
    uy = 0;
    uz = -nx;
  } else {
    ux = 1;
    uy = 0;
    uz = 0;
  }
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const invULen = uLen > 1e-6 ? 1 / uLen : 1;
  ux *= invULen;
  uy *= invULen;
  uz *= invULen;
  const vx = ny * uz - nz * uy;
  const vy = nz * ux - nx * uz;
  const vz = nx * uy - ny * ux;
  let residualSum = 0;
  for (let i = 0; i < N; i++) {
    const rx = pts[i * 3] - cx;
    const ry = pts[i * 3 + 1] - cy;
    const rz = pts[i * 3 + 2] - cz;
    residualSum += Math.abs(rx * nx + ry * ny + rz * nz);
  }
  const residual = residualSum * invN;
  return {
    centroid: new Float32Array([cx, cy, cz]),
    normal: new Float32Array([nx, ny, nz]),
    uAxis: new Float32Array([ux, uy, uz]),
    vAxis: new Float32Array([vx, vy, vz]),
    residual
  };
}
function projectPointsToPlane(pts, plane) {
  const N = pts.length / 3;
  const out = new Float32Array(N * 2);
  const cx = plane.centroid[0];
  const cy = plane.centroid[1];
  const cz = plane.centroid[2];
  const ux = plane.uAxis[0];
  const uy = plane.uAxis[1];
  const uz = plane.uAxis[2];
  const vx = plane.vAxis[0];
  const vy = plane.vAxis[1];
  const vz = plane.vAxis[2];
  for (let i = 0; i < N; i++) {
    const rx = pts[i * 3] - cx;
    const ry = pts[i * 3 + 1] - cy;
    const rz = pts[i * 3 + 2] - cz;
    out[i * 2] = rx * ux + ry * uy + rz * uz;
    out[i * 2 + 1] = rx * vx + ry * vy + rz * vz;
  }
  return out;
}
function resampleTrajectory(pts, dims, targetCount) {
  const N = pts.length / dims;
  if (N <= 1) {
    const out2 = new Float32Array(targetCount * dims);
    for (let i = 0; i < targetCount; i++) {
      for (let d = 0; d < dims; d++) {
        out2[i * dims + d] = pts[d] ?? 0;
      }
    }
    return out2;
  }
  let totalLen = 0;
  const segLens = new Float32Array(N - 1);
  for (let i = 0; i < N - 1; i++) {
    let sumSq = 0;
    for (let d = 0; d < dims; d++) {
      const delta = pts[(i + 1) * dims + d] - pts[i * dims + d];
      sumSq += delta * delta;
    }
    const len = Math.sqrt(sumSq);
    segLens[i] = len;
    totalLen += len;
  }
  const out = new Float32Array(targetCount * dims);
  if (totalLen < 1e-6) {
    for (let i = 0; i < targetCount; i++) {
      for (let d = 0; d < dims; d++) {
        out[i * dims + d] = pts[d];
      }
    }
    return out;
  }
  const step = totalLen / (targetCount - 1);
  let segIdx = 0;
  let segCovered = 0;
  for (let i = 0; i < targetCount; i++) {
    const targetDist = i * step;
    while (segIdx < N - 2 && targetDist > segCovered + segLens[segIdx]) {
      segCovered += segLens[segIdx];
      segIdx++;
    }
    const rem = targetDist - segCovered;
    const segL = segLens[segIdx];
    const t = segL > 1e-6 ? Math.min(1, rem / segL) : 0;
    for (let d = 0; d < dims; d++) {
      const a = pts[segIdx * dims + d];
      const b = pts[(segIdx + 1) * dims + d];
      out[i * dims + d] = a + (b - a) * t;
    }
  }
  return out;
}
function recognizeTrajectoryFrom3DPoints(pts, opts = {}) {
  const N = pts.length / 3;
  const minConf = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  let pathLength = opts.pathLength ?? 0;
  if (pathLength === 0) {
    for (let i = 0; i < N - 1; i++) {
      const dx = pts[(i + 1) * 3] - pts[i * 3];
      const dy = pts[(i + 1) * 3 + 1] - pts[i * 3 + 1];
      const dz = pts[(i + 1) * 3 + 2] - pts[i * 3 + 2];
      pathLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  const durationMs = opts.durationMs ?? 0;
  const startX = pts[0];
  const startY = pts[1];
  const startZ = pts[2];
  const endX = pts[(N - 1) * 3];
  const endY = pts[(N - 1) * 3 + 1];
  const endZ = pts[(N - 1) * 3 + 2];
  const netDx = endX - startX;
  const netDy = endY - startY;
  const netDz = endZ - startZ;
  const netDist = Math.sqrt(netDx * netDx + netDy * netDy + netDz * netDz);
  const straightness = pathLength > 1e-6 ? netDist / pathLength : 0;
  if (straightness >= 0.82 && netDist >= 0.08) {
    const invDist = 1 / netDist;
    const dirX = netDx * invDist;
    const dirY = netDy * invDist;
    const dirZ = netDz * invDist;
    let dir;
    if (dirZ < -0.65) {
      dir = "forward";
    } else if (Math.abs(dirY) > Math.abs(dirX)) {
      dir = dirY > 0 ? "up" : "down";
    } else {
      dir = dirX > 0 ? "right" : "left";
    }
    const specificGesture = `line_swipe_${dir}`;
    const confidence = Math.min(1, 0.7 + (straightness - 0.82) * 1.5);
    const centroid = new Float32Array([
      (startX + endX) * 0.5,
      (startY + endY) * 0.5,
      (startZ + endZ) * 0.5
    ]);
    const plane2 = computeDominantPlaneFromPoints(pts);
    return {
      gesture: specificGesture,
      direction: dir,
      confidence,
      durationMs,
      pathLength,
      sampleCount: N,
      dominantPlane: plane2,
      centroid,
      scores: {
        line_swipe: confidence,
        [specificGesture]: confidence
      }
    };
  }
  const plane = computeDominantPlaneFromPoints(pts);
  if (!plane) {
    return {
      gesture: null,
      confidence: 0,
      durationMs,
      pathLength,
      sampleCount: N,
      dominantPlane: null,
      centroid: new Float32Array(3),
      scores: {}
    };
  }
  const pts2D = projectPointsToPlane(pts, plane);
  const resampled = resampleTrajectory(pts2D, 2, RESAMPLE_POINTS);
  const normalized = normalizeTemplate(resampled);
  let totalAngle = 0;
  let prevTheta = Math.atan2(normalized[1], normalized[0]);
  let sumR = 0;
  const radii = new Float32Array(RESAMPLE_POINTS);
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const x = normalized[i * 2];
    const y = normalized[i * 2 + 1];
    const r = Math.sqrt(x * x + y * y);
    radii[i] = r;
    sumR += r;
    const theta = Math.atan2(y, x);
    if (i > 0) {
      let dTheta = theta - prevTheta;
      if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      else if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
      totalAngle += dTheta;
    }
    prevTheta = theta;
  }
  const meanR = sumR / RESAMPLE_POINTS;
  let sumSqDiff = 0;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const diff = radii[i] - meanR;
    sumSqDiff += diff * diff;
  }
  const stdDevR = Math.sqrt(sumSqDiff / RESAMPLE_POINTS);
  const circularity = meanR > 1e-6 ? stdDevR / meanR : 1;
  const dxClosure = normalized[(RESAMPLE_POINTS - 1) * 2] - normalized[0];
  const dyClosure = normalized[(RESAMPLE_POINTS - 1) * 2 + 1] - normalized[1];
  const closureDist = Math.sqrt(dxClosure * dxClosure + dyClosure * dyClosure);
  let rStart = 0;
  let rEnd = 0;
  const quarter = Math.floor(RESAMPLE_POINTS / 4);
  for (let i = 0; i < quarter; i++) {
    rStart += radii[i];
    rEnd += radii[RESAMPLE_POINTS - 1 - i];
  }
  rStart /= quarter;
  rEnd /= quarter;
  const scores = {};
  for (const [key, tpl] of Object.entries(TEMPLATES)) {
    if (key.startsWith("line_swipe_") && straightness < 0.78) {
      continue;
    }
    let distSum = 0;
    for (let i = 0; i < RESAMPLE_POINTS; i++) {
      const dx = normalized[i * 2] - tpl[i * 2];
      const dy = normalized[i * 2 + 1] - tpl[i * 2 + 1];
      distSum += Math.sqrt(dx * dx + dy * dy);
    }
    const avgDist = distSum / RESAMPLE_POINTS;
    scores[key] = Math.max(0, 1 - avgDist * 1.3);
  }
  const absAngle = Math.abs(totalAngle);
  if (circularity < 0.35 && closureDist < 0.65 && absAngle >= 1.6 * Math.PI) {
    const circleConf = Math.min(1, 1 - circularity * 1.5 - closureDist * 0.3);
    if (totalAngle < 0) {
      scores.circle_cw = Math.max(scores.circle_cw ?? 0, circleConf);
    } else {
      scores.circle_ccw = Math.max(scores.circle_ccw ?? 0, circleConf);
    }
  } else {
    if (scores.circle_cw) scores.circle_cw *= 0.5;
    if (scores.circle_ccw) scores.circle_ccw *= 0.5;
  }
  if (absAngle >= 2 * Math.PI) {
    if (rStart > 1.3 * rEnd) {
      scores.spiral_in = Math.max(scores.spiral_in ?? 0, 0.75 + rStart / (rEnd + 0.1) * 0.05);
    } else if (rEnd > 1.3 * rStart) {
      scores.spiral_out = Math.max(scores.spiral_out ?? 0, 0.75 + rEnd / (rStart + 0.1) * 0.05);
    }
  }
  if (absAngle < 1.4 * Math.PI && closureDist < 0.7 && !scores.circle_cw && !scores.circle_ccw) {
    const midIdx = Math.floor(RESAMPLE_POINTS / 2);
    const midDist = radii[midIdx];
    if (midDist < 0.35) {
      scores.infinity = Math.max(scores.infinity ?? 0, 0.72 + (0.35 - midDist));
    }
  }
  if (closureDist < 0.55 && circularity > 0.15 && absAngle >= 1.4 * Math.PI) {
    const triScore = scores.triangle ?? 0;
    scores.triangle = Math.max(triScore, 0.7);
  }
  if (closureDist > 0.75 && absAngle < 1.2 * Math.PI) {
    const zScore = scores.lightning_z ?? 0;
    if (zScore > 0.6) {
      scores.lightning_z = Math.min(1, zScore + 0.1);
    }
  }
  let bestGesture = null;
  let bestConfidence = 0;
  for (const [gest, conf] of Object.entries(scores)) {
    if (conf > bestConfidence) {
      bestConfidence = conf;
      bestGesture = gest;
    }
  }
  if (bestConfidence < minConf) {
    bestGesture = null;
  }
  let direction;
  if (bestGesture?.startsWith("line_swipe_")) {
    direction = bestGesture.replace("line_swipe_", "");
  }
  return {
    gesture: bestGesture,
    confidence: bestConfidence,
    direction,
    durationMs,
    pathLength,
    sampleCount: N,
    dominantPlane: plane,
    centroid: plane.centroid,
    scores
  };
}

// src/StaticPoseClassifier.ts
var _scratchV1 = new Float32Array(3);
var _scratchV2 = new Float32Array(3);
var _scratchV3 = new Float32Array(3);
var _scratchBone1 = new Float32Array(3);
var _scratchBone2 = new Float32Array(3);
var _scratchBone3 = new Float32Array(3);
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function evaluateChainCurl(poses, frameOffset, metaIdx, proxIdx, interIdx, tipIdx) {
  const mOff = frameOffset + metaIdx * FLOATS_PER_JOINT;
  const pOff = frameOffset + proxIdx * FLOATS_PER_JOINT;
  const iOff = frameOffset + interIdx * FLOATS_PER_JOINT;
  const tOff = frameOffset + tipIdx * FLOATS_PER_JOINT;
  v3Sub(_scratchBone1, poses, poses, pOff, mOff);
  v3Normalize(_scratchBone1, _scratchBone1);
  v3Sub(_scratchBone2, poses, poses, iOff, pOff);
  v3Normalize(_scratchBone2, _scratchBone2);
  v3Sub(_scratchBone3, poses, poses, tOff, iOff);
  v3Normalize(_scratchBone3, _scratchBone3);
  const dot1 = v3Dot(_scratchBone1, _scratchBone2);
  const dot2 = v3Dot(_scratchBone2, _scratchBone3);
  const minDot = Math.min(dot1, dot2);
  return clamp01((minDot + 0.25) / 1.15);
}
function evaluateThumbExtension(poses, frameOffset) {
  const pinkyInterOff = frameOffset + JOINT_INDEX.PINKY_INTERMEDIATE * FLOATS_PER_JOINT;
  const indexInterOff = frameOffset + JOINT_INDEX.INDEX_INTERMEDIATE * FLOATS_PER_JOINT;
  const thumbTipOff = frameOffset + JOINT_INDEX.THUMB_TIP * FLOATS_PER_JOINT;
  const middleInterOff = frameOffset + JOINT_INDEX.MIDDLE_INTERMEDIATE * FLOATS_PER_JOINT;
  const dPalm = v3Dist(poses, poses, pinkyInterOff, indexInterOff);
  const dThumb = v3Dist(poses, poses, thumbTipOff, middleInterOff);
  const metaOff = frameOffset + JOINT_INDEX.THUMB_METACARPAL * FLOATS_PER_JOINT;
  const proxOff = frameOffset + JOINT_INDEX.THUMB_PROXIMAL * FLOATS_PER_JOINT;
  const distOff = frameOffset + JOINT_INDEX.THUMB_DISTAL * FLOATS_PER_JOINT;
  v3Sub(_scratchBone1, poses, poses, proxOff, metaOff);
  v3Normalize(_scratchBone1, _scratchBone1);
  v3Sub(_scratchBone2, poses, poses, distOff, proxOff);
  v3Normalize(_scratchBone2, _scratchBone2);
  v3Sub(_scratchBone3, poses, poses, thumbTipOff, distOff);
  v3Normalize(_scratchBone3, _scratchBone3);
  const dotAlign = Math.min(v3Dot(_scratchBone1, _scratchBone2), v3Dot(_scratchBone2, _scratchBone3));
  const spanRatio = dPalm > 0 ? dThumb / dPalm : 1;
  const curlScore = clamp01(0.5 * spanRatio + 0.5 * clamp01((dotAlign + 0.2) / 1.1));
  const isExtended = dPalm > 0 && dThumb > dPalm && dotAlign > 0.45;
  const isCurled = dThumb < dPalm * 0.85 || dotAlign < 0.25;
  return {
    extended: isExtended,
    curled: isCurled,
    halfCurled: !isExtended && !isCurled,
    curlScore
  };
}
function analyzeFingers(poses, frameOffset = 0, curlDot = CURL_DOT) {
  const thumb = evaluateThumbExtension(poses, frameOffset);
  const indexScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.INDEX_METACARPAL,
    JOINT_INDEX.INDEX_PROXIMAL,
    JOINT_INDEX.INDEX_INTERMEDIATE,
    JOINT_INDEX.INDEX_TIP
  );
  const middleScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.MIDDLE_METACARPAL,
    JOINT_INDEX.MIDDLE_PROXIMAL,
    JOINT_INDEX.MIDDLE_INTERMEDIATE,
    JOINT_INDEX.MIDDLE_TIP
  );
  const ringScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.RING_METACARPAL,
    JOINT_INDEX.RING_PROXIMAL,
    JOINT_INDEX.RING_INTERMEDIATE,
    JOINT_INDEX.RING_TIP
  );
  const pinkyScore = evaluateChainCurl(
    poses,
    frameOffset,
    JOINT_INDEX.PINKY_METACARPAL,
    JOINT_INDEX.PINKY_PROXIMAL,
    JOINT_INDEX.PINKY_INTERMEDIATE,
    JOINT_INDEX.PINKY_TIP
  );
  const index = {
    extended: indexScore >= 0.62,
    curled: indexScore <= 0.38,
    halfCurled: indexScore > 0.38 && indexScore < 0.62,
    curlScore: indexScore
  };
  const middle = {
    extended: middleScore >= 0.62,
    curled: middleScore <= 0.38,
    halfCurled: middleScore > 0.38 && middleScore < 0.62,
    curlScore: middleScore
  };
  const ring = {
    extended: ringScore >= 0.62,
    curled: ringScore <= 0.38,
    halfCurled: ringScore > 0.38 && ringScore < 0.62,
    curlScore: ringScore
  };
  const pinky = {
    extended: pinkyScore >= 0.62,
    curled: pinkyScore <= 0.38,
    halfCurled: pinkyScore > 0.38 && pinkyScore < 0.62,
    curlScore: pinkyScore
  };
  const count = (thumb.extended ? 1 : 0) + (index.extended ? 1 : 0) + (middle.extended ? 1 : 0) + (ring.extended ? 1 : 0) + (pinky.extended ? 1 : 0);
  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    extensions: {
      thumb: thumb.extended,
      index: index.extended,
      middle: middle.extended,
      ring: ring.extended,
      pinky: pinky.extended,
      count
    }
  };
}
function matchRequirement(actual, req) {
  if (!req || req === "any") {
    return { match: true, confidence: 1 };
  }
  if (req === "extended") {
    return {
      match: actual.extended,
      confidence: actual.curlScore
    };
  }
  if (req === "curled") {
    return {
      match: actual.curled,
      confidence: 1 - actual.curlScore
    };
  }
  if (req === "half_curled") {
    const distFromHalf = Math.abs(actual.curlScore - 0.5);
    const conf = Math.max(0, 1 - distFromHalf * 2.5);
    return {
      match: actual.halfCurled,
      confidence: conf
    };
  }
  return { match: false, confidence: 0 };
}
var StaticPoseClassifier = class {
  _poses = /* @__PURE__ */ new Map();
  _minConfidence;
  _pinchDist;
  _directionThreshold;
  _curlDot;
  constructor(options = {}) {
    this._minConfidence = options.minConfidence ?? 0.68;
    this._pinchDist = options.pinchDist ?? PINCH_DIST;
    this._directionThreshold = options.directionThreshold ?? DIRECTION_THRESHOLD;
    this._curlDot = options.curlDot ?? CURL_DOT;
    if (options.poses) {
      for (const pose of options.poses) {
        this.registerPose(pose);
      }
    }
  }
  registerPose(pose) {
    this._poses.set(pose.name, pose);
  }
  registerPack(pack) {
    for (const pose of pack) {
      this.registerPose(pose);
    }
  }
  unregisterPose(name) {
    return this._poses.delete(name);
  }
  clear() {
    this._poses.clear();
  }
  getRegisteredPoses() {
    return Array.from(this._poses.values());
  }
  /**
   * Evaluates all registered poses against the frame poses buffer and returns the single highest confidence match.
   */
  classify(poses, frameOffset = 0, handedness = "right") {
    const matches = this.classifyAll(poses, frameOffset, handedness);
    return matches.length > 0 ? matches[0] : null;
  }
  /**
   * Evaluates all registered poses and returns matches above minConfidence, sorted by confidence * priority descending.
   */
  classifyAll(poses, frameOffset = 0, handedness = "right") {
    if (!poses || poses.length < frameOffset + JOINT_COUNT * FLOATS_PER_JOINT) {
      return [];
    }
    const fingers = analyzeFingers(poses, frameOffset, this._curlDot);
    const ctx = {
      poses,
      frameOffset,
      handedness,
      fingers,
      pinchDist: this._pinchDist,
      directionThreshold: this._directionThreshold,
      getJointPos: (jointIdx, out) => {
        const off = frameOffset + jointIdx * FLOATS_PER_JOINT;
        out[0] = poses[off];
        out[1] = poses[off + 1];
        out[2] = poses[off + 2];
        return out;
      },
      getDistance: (jointA, jointB) => {
        const offA = frameOffset + jointA * FLOATS_PER_JOINT;
        const offB = frameOffset + jointB * FLOATS_PER_JOINT;
        return v3Dist(poses, poses, offA, offB);
      },
      getDirection: (fromJoint, toJoint, out) => {
        const fromOff = frameOffset + fromJoint * FLOATS_PER_JOINT;
        const toOff = frameOffset + toJoint * FLOATS_PER_JOINT;
        v3Sub(out, poses, poses, toOff, fromOff);
        return v3Normalize(out, out);
      }
    };
    const results = [];
    for (const def of Array.from(this._poses.values())) {
      let fingerScore = 1;
      let fingerMatches = true;
      if (def.fingers) {
        const tMatch = matchRequirement(fingers.thumb, def.fingers.thumb);
        const iMatch = matchRequirement(fingers.index, def.fingers.index);
        const mMatch = matchRequirement(fingers.middle, def.fingers.middle);
        const rMatch = matchRequirement(fingers.ring, def.fingers.ring);
        const pMatch = matchRequirement(fingers.pinky, def.fingers.pinky);
        if (!tMatch.match || !iMatch.match || !mMatch.match || !rMatch.match || !pMatch.match) {
          fingerMatches = false;
        } else {
          fingerScore = (tMatch.confidence + iMatch.confidence + mMatch.confidence + rMatch.confidence + pMatch.confidence) / 5;
        }
      }
      if (!fingerMatches) {
        continue;
      }
      let customScore = 1;
      if (def.match) {
        const res = def.match(ctx);
        if (typeof res === "boolean") {
          if (!res) continue;
          customScore = 1;
        } else if (typeof res === "number") {
          if (res <= 0) continue;
          customScore = clamp01(res);
        }
      }
      const totalConfidence = def.fingers && def.match ? 0.5 * fingerScore + 0.5 * customScore : def.match ? customScore : fingerScore;
      if (totalConfidence >= this._minConfidence) {
        results.push({
          name: def.name,
          confidence: totalConfidence,
          category: def.category
        });
      }
    }
    results.sort((a, b) => {
      const defA = this._poses.get(a.name);
      const defB = this._poses.get(b.name);
      const prioA = defA?.priority ?? 1;
      const prioB = defB?.priority ?? 1;
      return b.confidence * prioB - a.confidence * prioA;
    });
    return results;
  }
  isPose(name, poses, frameOffset = 0, handedness = "right") {
    const match = this.classify(poses, frameOffset, handedness);
    return match !== null && match.name === name;
  }
  getConfidence(name, poses, frameOffset = 0, handedness = "right") {
    const matches = this.classifyAll(poses, frameOffset, handedness);
    const found = matches.find((m) => m.name === name);
    return found ? found.confidence : 0;
  }
};

// src/BimanualComposer.ts
var _scratchA = new Float32Array(3);
var _scratchB = new Float32Array(3);
var _scratchC = new Float32Array(3);
var _scratchLPos = new Float32Array(3);
var _scratchRPos = new Float32Array(3);
var _scratchLQuat = new Float32Array(4);
var _scratchRQuat = new Float32Array(4);
var BimanualComposer = class {
  _config;
  _kamehameha = {
    active: false,
    state: "idle",
    charge: 0,
    origin: new Float32Array(3),
    direction: new Float32Array([0, 0, -1]),
    triggered: false
  };
  _bow = {
    active: false,
    state: "idle",
    bowHand: "none",
    drawDistance: 0,
    aimDirection: new Float32Array([0, 0, -1]),
    arrowOrigin: new Float32Array(3),
    power: 0,
    triggered: false
  };
  _portal = {
    active: false,
    state: "idle",
    stretchDistance: 0,
    center: new Float32Array(3),
    normal: new Float32Array([0, 0, -1]),
    triggered: false
  };
  _timeout = {
    active: false,
    triggered: false,
    orientation: "none",
    holdDuration: 0,
    center: new Float32Array(3)
  };
  _dial = {
    active: false,
    angle: 0,
    deltaAngle: 0,
    center: new Float32Array(3),
    axis: new Float32Array([0, 0, 1])
  };
  _result = {
    wristDistance: Infinity,
    handsCrossed: false,
    kamehameha: this._kamehameha,
    bow: this._bow,
    portal: this._portal,
    timeout: this._timeout,
    dial: this._dial
  };
  // Internal state tracking
  _kamChargeTime = 0;
  _kamCooldownUntil = 0;
  _portalGripTime = 0;
  _portalCooldownUntil = 0;
  _timeoutHoldMs = 0;
  _prevDialAngle = 0;
  _hasPrevDialAngle = false;
  constructor(config = {}) {
    this._config = {
      kamehamehaChargeDist: config.kamehamehaChargeDist ?? 0.28,
      kamehamehaMinChargeMs: config.kamehamehaMinChargeMs ?? 350,
      kamehamehaThrustSpeed: config.kamehamehaThrustSpeed ?? 0.85,
      bowMinDrawDist: config.bowMinDrawDist ?? 0.15,
      bowMaxDrawDist: config.bowMaxDrawDist ?? 0.55,
      portalInitialGripDist: config.portalInitialGripDist ?? 0.22,
      portalStretchThreshold: config.portalStretchThreshold ?? 0.45,
      timeoutProximityDist: config.timeoutProximityDist ?? 0.1,
      timeoutMinDurationMs: config.timeoutMinDurationMs ?? 250
    };
  }
  reset() {
    this._kamehameha.active = false;
    this._kamehameha.state = "idle";
    this._kamehameha.charge = 0;
    this._kamehameha.triggered = false;
    this._bow.active = false;
    this._bow.state = "idle";
    this._bow.bowHand = "none";
    this._bow.drawDistance = 0;
    this._bow.power = 0;
    this._bow.triggered = false;
    this._portal.active = false;
    this._portal.state = "idle";
    this._portal.stretchDistance = 0;
    this._portal.triggered = false;
    this._timeout.active = false;
    this._timeout.triggered = false;
    this._timeout.orientation = "none";
    this._timeout.holdDuration = 0;
    this._dial.active = false;
    this._dial.angle = 0;
    this._dial.deltaAngle = 0;
    this._hasPrevDialAngle = false;
    this._kamChargeTime = 0;
    this._kamCooldownUntil = 0;
    this._portalGripTime = 0;
    this._portalCooldownUntil = 0;
    this._timeoutHoldMs = 0;
    this._result.wristDistance = Infinity;
    this._result.handsCrossed = false;
  }
  update(leftPoses, leftOffset, leftPose, leftMotion, rightPoses, rightOffset, rightPose, rightMotion, deltaMs = 11.11, nowMs = typeof performance !== "undefined" ? performance.now() : Date.now()) {
    this._kamehameha.triggered = false;
    this._bow.triggered = false;
    this._portal.triggered = false;
    this._timeout.triggered = false;
    const hasLeft = Boolean(leftPoses && leftPoses.length >= leftOffset + JOINT_COUNT * FLOATS_PER_JOINT);
    const hasRight = Boolean(rightPoses && rightPoses.length >= rightOffset + JOINT_COUNT * FLOATS_PER_JOINT);
    if (!hasLeft || !hasRight) {
      this.reset();
      return this._result;
    }
    const lJoints = leftPoses;
    const rJoints = rightPoses;
    const lWristOff = leftOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const rWristOff = rightOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
    const lIndexTipOff = leftOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const rIndexTipOff = rightOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const wristDist = v3Dist(lJoints, rJoints, lWristOff, rWristOff);
    this._result.wristDistance = wristDist;
    this._result.handsCrossed = lJoints[lWristOff] > rJoints[rWristOff];
    v3Add(_scratchC, lJoints, rJoints, lWristOff, rWristOff);
    v3Scale(_scratchC, _scratchC, 0.5);
    const lPoseName = leftPose ? leftPose.name : "unknown";
    const rPoseName = rightPose ? rightPose.name : "unknown";
    if (nowMs >= this._kamCooldownUntil) {
      const isClose = wristDist < this._config.kamehamehaChargeDist;
      const isCuppedOrFacing = lPoseName === "open_palm" || lPoseName === "fist" || lPoseName === "asl_c" || rPoseName === "open_palm" || rPoseName === "fist" || rPoseName === "asl_c";
      if (isClose && isCuppedOrFacing) {
        this._kamChargeTime += deltaMs;
        const chargeProgress = Math.min(1, this._kamChargeTime / this._config.kamehamehaMinChargeMs);
        this._kamehameha.charge = chargeProgress;
        this._kamehameha.active = true;
        this._kamehameha.state = chargeProgress >= 1 ? "charged" : "charging";
        v3Copy(this._kamehameha.origin, _scratchC);
        const lFwdSpeed = -leftMotion.velocity[2];
        const rFwdSpeed = -rightMotion.velocity[2];
        if (this._kamehameha.charge >= 0.55 && lFwdSpeed > this._config.kamehamehaThrustSpeed && rFwdSpeed > this._config.kamehamehaThrustSpeed) {
          this._kamehameha.state = "pushed";
          this._kamehameha.triggered = true;
          v3Set(this._kamehameha.direction, 0, 0, -1);
          this._kamCooldownUntil = nowMs + 800;
          this._kamChargeTime = 0;
        }
      } else {
        if (this._kamehameha.state === "charging" || this._kamehameha.state === "charged") {
          this._kamehameha.state = "idle";
          this._kamehameha.charge = 0;
          this._kamehameha.active = false;
        }
        this._kamChargeTime = 0;
      }
    }
    const lZ = lJoints[lWristOff + 2];
    const rZ = rJoints[rWristOff + 2];
    const bowIsLeft = lZ < rZ - 0.1;
    const bowIsRight = rZ < lZ - 0.1;
    if (bowIsLeft || bowIsRight) {
      const bowOff = bowIsLeft ? lWristOff : rWristOff;
      const drawOff = bowIsLeft ? rWristOff : lWristOff;
      const bowBuf = bowIsLeft ? lJoints : rJoints;
      const drawBuf = bowIsLeft ? rJoints : lJoints;
      const drawPoseName = bowIsLeft ? rPoseName : lPoseName;
      const drawMotion = bowIsLeft ? rightMotion : leftMotion;
      v3Sub(_scratchA, bowBuf, drawBuf, bowOff, drawOff);
      const drawDistance = v3Len(_scratchA);
      v3Normalize(_scratchB, _scratchA);
      const isGrip = drawPoseName === "fist" || drawPoseName === "pinch" || drawPoseName === "asl_a";
      if (isGrip && drawDistance >= this._config.bowMinDrawDist) {
        this._bow.active = true;
        this._bow.state = "drawing";
        this._bow.bowHand = bowIsLeft ? "left" : "right";
        this._bow.drawDistance = drawDistance;
        const span = Math.max(0.01, this._config.bowMaxDrawDist - this._config.bowMinDrawDist);
        this._bow.power = Math.min(1, Math.max(0, (drawDistance - this._config.bowMinDrawDist) / span));
        v3Copy(this._bow.aimDirection, _scratchB);
        v3Copy(this._bow.arrowOrigin, bowBuf, bowOff);
      } else if (this._bow.state === "drawing") {
        if (!isGrip || drawMotion.speed > 1.1) {
          this._bow.state = "released";
          this._bow.triggered = true;
        } else {
          this._bow.state = "idle";
          this._bow.active = false;
        }
      }
    } else if (this._bow.state !== "released") {
      this._bow.active = false;
      this._bow.state = "idle";
    }
    if (nowMs >= this._portalCooldownUntil) {
      const isGripping = (lPoseName === "fist" || lPoseName === "pinch" || lPoseName === "asl_a") && (rPoseName === "fist" || rPoseName === "pinch" || rPoseName === "asl_a");
      if (wristDist < this._config.portalInitialGripDist && isGripping) {
        this._portal.state = "gripping";
        this._portal.active = true;
        this._portalGripTime = nowMs;
      } else if (this._portal.state === "gripping" || this._portal.state === "stretching") {
        if (wristDist > this._config.portalStretchThreshold && nowMs - this._portalGripTime < 1e3) {
          this._portal.state = "ripped";
          this._portal.triggered = true;
          this._portal.stretchDistance = wristDist;
          v3Copy(this._portal.center, _scratchC);
          v3Set(this._portal.normal, 0, 0, -1);
          this._portalCooldownUntil = nowMs + 1e3;
        } else if (wristDist > this._config.portalInitialGripDist + 0.05) {
          this._portal.state = "stretching";
          this._portal.stretchDistance = wristDist;
        } else if (nowMs - this._portalGripTime > 1200) {
          this._portal.state = "idle";
          this._portal.active = false;
        }
      }
    }
    const lTipDistToRPalm = v3Dist(lJoints, rJoints, lIndexTipOff, rWristOff);
    const rTipDistToLPalm = v3Dist(rJoints, lJoints, rIndexTipOff, lWristOff);
    let isTimeout = false;
    let orientation = "none";
    if (rTipDistToLPalm < this._config.timeoutProximityDist && lPoseName === "open_palm") {
      isTimeout = true;
      orientation = "horizontal_left";
      v3Copy(this._timeout.center, lJoints, lWristOff);
    } else if (lTipDistToRPalm < this._config.timeoutProximityDist && rPoseName === "open_palm") {
      isTimeout = true;
      orientation = "horizontal_right";
      v3Copy(this._timeout.center, rJoints, rWristOff);
    }
    if (isTimeout) {
      this._timeoutHoldMs += deltaMs;
      this._timeout.active = true;
      this._timeout.orientation = orientation;
      this._timeout.holdDuration = this._timeoutHoldMs;
      if (this._timeoutHoldMs >= this._config.timeoutMinDurationMs && !this._timeout.triggered) {
        this._timeout.triggered = true;
      }
    } else {
      this._timeoutHoldMs = 0;
      this._timeout.active = false;
      this._timeout.orientation = "none";
      this._timeout.holdDuration = 0;
    }
    if (wristDist > 0.08 && wristDist < 0.75) {
      this._dial.active = true;
      v3Copy(this._dial.center, _scratchC);
      const dx = rJoints[rWristOff] - lJoints[lWristOff];
      const dy = rJoints[rWristOff + 1] - lJoints[lWristOff + 1];
      const angle = Math.atan2(dy, dx);
      this._dial.angle = angle;
      if (this._hasPrevDialAngle) {
        let delta = angle - this._prevDialAngle;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        this._dial.deltaAngle = delta;
      } else {
        this._dial.deltaAngle = 0;
        this._hasPrevDialAngle = true;
      }
      this._prevDialAngle = angle;
    } else {
      this._dial.active = false;
      this._hasPrevDialAngle = false;
      this._dial.deltaAngle = 0;
    }
    return this._result;
  }
};
var CompositionalGestureEngine = class {
  pose;
  motion;
  trajectory;
  micro;
  bimanual;
  _leftHandResult;
  _rightHandResult;
  _frameResult;
  constructor(options = {}) {
    this.pose = {
      left: new StaticPoseClassifier(options.pose),
      right: new StaticPoseClassifier(options.pose)
    };
    this.motion = new MotionStateTracker(options.motion);
    this.trajectory = {
      left: new RollingTrajectoryBuffer(options.trajectory),
      right: new RollingTrajectoryBuffer(options.trajectory)
    };
    this.micro = {
      left: new MicroGestureDetector(options.micro),
      right: new MicroGestureDetector(options.micro)
    };
    this.bimanual = new BimanualComposer(options.bimanual);
    this._leftHandResult = {
      tracked: false,
      pose: null,
      motion: this.motion.left.data,
      trajectory: this.trajectory.left.recognize(),
      micro: this.micro.left.state
    };
    this._rightHandResult = {
      tracked: false,
      pose: null,
      motion: this.motion.right.data,
      trajectory: this.trajectory.right.recognize(),
      micro: this.micro.right.state
    };
    this._frameResult = {
      left: this._leftHandResult,
      right: this._rightHandResult,
      bimanual: this.bimanual.update(
        null,
        0,
        null,
        this.motion.left.data,
        null,
        0,
        null,
        this.motion.right.data
      )
    };
  }
  reset() {
    this.motion.reset();
    this.trajectory.left.clear();
    this.trajectory.right.clear();
    this.micro.left.reset();
    this.micro.right.reset();
    this.bimanual.reset();
  }
  update(leftPoses, leftOffset = 0, rightPoses, rightOffset = 0, deltaSeconds = 1 / 90, nowMs = typeof performance !== "undefined" ? performance.now() : Date.now()) {
    const hasLeft = Boolean(leftPoses && leftPoses.length >= leftOffset + JOINT_COUNT * FLOATS_PER_JOINT);
    const hasRight = Boolean(rightPoses && rightPoses.length >= rightOffset + JOINT_COUNT * FLOATS_PER_JOINT);
    this._leftHandResult.tracked = hasLeft;
    this._rightHandResult.tracked = hasRight;
    const leftPoseMatch = hasLeft ? this.pose.left.classify(leftPoses, leftOffset, "left") : null;
    const rightPoseMatch = hasRight ? this.pose.right.classify(rightPoses, rightOffset, "right") : null;
    this._leftHandResult.pose = leftPoseMatch;
    this._rightHandResult.pose = rightPoseMatch;
    let leftMotion;
    let rightMotion;
    if (hasLeft) {
      const lWristOff = leftOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
      v3Copy(_scratchLPos, leftPoses, lWristOff);
      const lProxOff = leftOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
      _scratchLQuat[0] = leftPoses[lProxOff + 3];
      _scratchLQuat[1] = leftPoses[lProxOff + 4];
      _scratchLQuat[2] = leftPoses[lProxOff + 5];
      _scratchLQuat[3] = leftPoses[lProxOff + 6];
      leftMotion = this.motion.left.update(_scratchLPos, _scratchLQuat, nowMs);
    } else {
      leftMotion = this.motion.left.update(null, null, nowMs);
    }
    if (hasRight) {
      const rWristOff = rightOffset + JOINT_INDEX.WRIST * FLOATS_PER_JOINT;
      v3Copy(_scratchRPos, rightPoses, rWristOff);
      const rProxOff = rightOffset + JOINT_INDEX.INDEX_PROXIMAL * FLOATS_PER_JOINT;
      _scratchRQuat[0] = rightPoses[rProxOff + 3];
      _scratchRQuat[1] = rightPoses[rProxOff + 4];
      _scratchRQuat[2] = rightPoses[rProxOff + 5];
      _scratchRQuat[3] = rightPoses[rProxOff + 6];
      rightMotion = this.motion.right.update(_scratchRPos, _scratchRQuat, nowMs);
    } else {
      rightMotion = this.motion.right.update(null, null, nowMs);
    }
    this._leftHandResult.motion = leftMotion;
    this._rightHandResult.motion = rightMotion;
    if (hasLeft) {
      const lIndexTipOff = leftOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
      this.trajectory.left.addSample(nowMs, leftPoses[lIndexTipOff], leftPoses[lIndexTipOff + 1], leftPoses[lIndexTipOff + 2], "index-finger-tip");
      this.trajectory.left.prune(nowMs);
    }
    if (hasRight) {
      const rIndexTipOff = rightOffset + JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
      this.trajectory.right.addSample(nowMs, rightPoses[rIndexTipOff], rightPoses[rIndexTipOff + 1], rightPoses[rIndexTipOff + 2], "index-finger-tip");
      this.trajectory.right.prune(nowMs);
    }
    this._leftHandResult.trajectory = this.trajectory.left.recognize();
    this._rightHandResult.trajectory = this.trajectory.right.recognize();
    if (hasLeft) {
      this._leftHandResult.micro = this.micro.left.update(leftPoses, leftOffset, deltaSeconds, nowMs);
    } else {
      this.micro.left.reset();
      this._leftHandResult.micro = this.micro.left.state;
    }
    if (hasRight) {
      this._rightHandResult.micro = this.micro.right.update(rightPoses, rightOffset, deltaSeconds, nowMs);
    } else {
      this.micro.right.reset();
      this._rightHandResult.micro = this.micro.right.state;
    }
    const deltaMs = deltaSeconds * 1e3;
    this._frameResult.bimanual = this.bimanual.update(
      leftPoses,
      leftOffset,
      leftPoseMatch,
      leftMotion,
      rightPoses,
      rightOffset,
      rightPoseMatch,
      rightMotion,
      deltaMs,
      nowMs
    );
    return this._frameResult;
  }
};

// playground/app.ts
var STRIDE = JOINT_COUNT * FLOATS_PER_JOINT;
var SKELETON_CONNECTIONS = [
  // Thumb
  [JOINT_INDEX.WRIST, JOINT_INDEX.THUMB_METACARPAL],
  [JOINT_INDEX.THUMB_METACARPAL, JOINT_INDEX.THUMB_PROXIMAL],
  [JOINT_INDEX.THUMB_PROXIMAL, JOINT_INDEX.THUMB_DISTAL],
  [JOINT_INDEX.THUMB_DISTAL, JOINT_INDEX.THUMB_TIP],
  // Index
  [JOINT_INDEX.WRIST, JOINT_INDEX.INDEX_METACARPAL],
  [JOINT_INDEX.INDEX_METACARPAL, JOINT_INDEX.INDEX_PROXIMAL],
  [JOINT_INDEX.INDEX_PROXIMAL, JOINT_INDEX.INDEX_INTERMEDIATE],
  [JOINT_INDEX.INDEX_INTERMEDIATE, JOINT_INDEX.INDEX_DISTAL],
  [JOINT_INDEX.INDEX_DISTAL, JOINT_INDEX.INDEX_TIP],
  // Middle
  [JOINT_INDEX.WRIST, JOINT_INDEX.MIDDLE_METACARPAL],
  [JOINT_INDEX.MIDDLE_METACARPAL, JOINT_INDEX.MIDDLE_PROXIMAL],
  [JOINT_INDEX.MIDDLE_PROXIMAL, JOINT_INDEX.MIDDLE_INTERMEDIATE],
  [JOINT_INDEX.MIDDLE_INTERMEDIATE, JOINT_INDEX.MIDDLE_DISTAL],
  [JOINT_INDEX.MIDDLE_DISTAL, JOINT_INDEX.MIDDLE_TIP],
  // Ring
  [JOINT_INDEX.WRIST, JOINT_INDEX.RING_METACARPAL],
  [JOINT_INDEX.RING_METACARPAL, JOINT_INDEX.RING_PROXIMAL],
  [JOINT_INDEX.RING_PROXIMAL, JOINT_INDEX.RING_INTERMEDIATE],
  [JOINT_INDEX.RING_INTERMEDIATE, JOINT_INDEX.RING_DISTAL],
  [JOINT_INDEX.RING_DISTAL, JOINT_INDEX.RING_TIP],
  // Pinky
  [JOINT_INDEX.WRIST, JOINT_INDEX.PINKY_METACARPAL],
  [JOINT_INDEX.PINKY_METACARPAL, JOINT_INDEX.PINKY_PROXIMAL],
  [JOINT_INDEX.PINKY_PROXIMAL, JOINT_INDEX.PINKY_INTERMEDIATE],
  [JOINT_INDEX.PINKY_INTERMEDIATE, JOINT_INDEX.PINKY_DISTAL],
  [JOINT_INDEX.PINKY_DISTAL, JOINT_INDEX.PINKY_TIP],
  // Palm transverse connections
  [JOINT_INDEX.INDEX_METACARPAL, JOINT_INDEX.MIDDLE_METACARPAL],
  [JOINT_INDEX.MIDDLE_METACARPAL, JOINT_INDEX.RING_METACARPAL],
  [JOINT_INDEX.RING_METACARPAL, JOINT_INDEX.PINKY_METACARPAL]
];
function buildSyntheticHand(opts) {
  const buf = new Float32Array(STRIDE);
  const isLeft = opts.hand === "left";
  const defaultWristX = isLeft ? -0.18 : 0.18;
  const [wx, wy, wz] = opts.wristPos ?? [defaultWristX, 1.2, -0.45];
  const scale = opts.scale ?? 1;
  let [fx, fy, fz] = opts.handDir ?? [0, 0, -1];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;
  const sideSign = isLeft ? -1 : 1;
  let rx = sideSign, ry = 0, rz = 0;
  if (Math.abs(fx) > 0.9) {
    rx = 0;
    ry = 1;
    rz = 0;
  }
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;
  const cx = fy * uz - fz * uy;
  const cy = fz * ux - fx * uz;
  const cz = fx * uy - fy * ux;
  function setJoint(idx, x, y, z, qx = 0, qy = 0, qz = 0, qw = 1) {
    const base = idx * FLOATS_PER_JOINT;
    buf[base] = x;
    buf[base + 1] = y;
    buf[base + 2] = z;
    buf[base + 3] = qx;
    buf[base + 4] = qy;
    buf[base + 5] = qz;
    buf[base + 6] = qw;
  }
  setJoint(JOINT_INDEX.WRIST, wx, wy, wz);
  let thumbOpen = true;
  let indexOpen = true;
  let middleOpen = true;
  let ringOpen = true;
  let pinkyOpen = true;
  let isPinch = Boolean(opts.customPinch);
  let thumbPointingUp = false;
  let thumbPointingDown = false;
  switch (opts.poseName) {
    case "fist":
    case "asl_a":
    case "asl_s":
      thumbOpen = false;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;
    case "point":
      thumbOpen = false;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;
    case "pinch":
      thumbOpen = true;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      isPinch = true;
      break;
    case "peace":
    case "asl_v":
      thumbOpen = false;
      indexOpen = true;
      middleOpen = true;
      ringOpen = false;
      pinkyOpen = false;
      break;
    case "thumbs_up":
      thumbOpen = true;
      thumbPointingUp = true;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;
    case "thumbs_down":
      thumbOpen = true;
      thumbPointingDown = true;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;
    case "horns":
      thumbOpen = false;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = true;
      break;
    case "shaka":
    case "asl_y":
      thumbOpen = true;
      indexOpen = false;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = true;
      break;
    case "finger_gun":
      thumbOpen = true;
      thumbPointingUp = true;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      break;
    case "ok_sign":
      thumbOpen = true;
      indexOpen = true;
      middleOpen = true;
      ringOpen = true;
      pinkyOpen = true;
      isPinch = true;
      break;
    case "asl_b":
      thumbOpen = false;
      indexOpen = true;
      middleOpen = true;
      ringOpen = true;
      pinkyOpen = true;
      break;
    case "asl_l":
      thumbOpen = true;
      indexOpen = true;
      middleOpen = false;
      ringOpen = false;
      pinkyOpen = false;
      thumbPointingUp = true;
      break;
    case "open_palm":
    default:
      thumbOpen = true;
      indexOpen = true;
      middleOpen = true;
      ringOpen = true;
      pinkyOpen = true;
      break;
  }
  const fingers = [
    {
      open: indexOpen,
      spread: -0.028 * sideSign * scale,
      joints: [
        JOINT_INDEX.INDEX_METACARPAL,
        JOINT_INDEX.INDEX_PROXIMAL,
        JOINT_INDEX.INDEX_INTERMEDIATE,
        JOINT_INDEX.INDEX_DISTAL,
        JOINT_INDEX.INDEX_TIP
      ]
    },
    {
      open: middleOpen,
      spread: -9e-3 * sideSign * scale,
      joints: [
        JOINT_INDEX.MIDDLE_METACARPAL,
        JOINT_INDEX.MIDDLE_PROXIMAL,
        JOINT_INDEX.MIDDLE_INTERMEDIATE,
        JOINT_INDEX.MIDDLE_DISTAL,
        JOINT_INDEX.MIDDLE_TIP
      ]
    },
    {
      open: ringOpen,
      spread: 9e-3 * sideSign * scale,
      joints: [
        JOINT_INDEX.RING_METACARPAL,
        JOINT_INDEX.RING_PROXIMAL,
        JOINT_INDEX.RING_INTERMEDIATE,
        JOINT_INDEX.RING_DISTAL,
        JOINT_INDEX.RING_TIP
      ]
    },
    {
      open: pinkyOpen,
      spread: 0.028 * sideSign * scale,
      joints: [
        JOINT_INDEX.PINKY_METACARPAL,
        JOINT_INDEX.PINKY_PROXIMAL,
        JOINT_INDEX.PINKY_INTERMEDIATE,
        JOINT_INDEX.PINKY_DISTAL,
        JOINT_INDEX.PINKY_TIP
      ]
    }
  ];
  for (const f of fingers) {
    const [mIdx, pIdx, iIdx, dIdx, tIdx] = f.joints;
    const mx = wx + ux * f.spread + fx * 0.03 * scale;
    const my = wy + uy * f.spread + fy * 0.03 * scale;
    const mz = wz + uz * f.spread + fz * 0.03 * scale;
    const px = mx + fx * 0.04 * scale;
    const py = my + fy * 0.04 * scale;
    const pz = mz + fz * 0.04 * scale;
    setJoint(mIdx, mx, my, mz);
    setJoint(pIdx, px, py, pz);
    if (f.open) {
      setJoint(iIdx, px + fx * 0.03 * scale, py + fy * 0.03 * scale, pz + fz * 0.03 * scale);
      setJoint(dIdx, px + fx * 0.052 * scale, py + fy * 0.052 * scale, pz + fz * 0.052 * scale);
      setJoint(tIdx, px + fx * 0.075 * scale, py + fy * 0.075 * scale, pz + fz * 0.075 * scale);
    } else {
      const ix = px + cx * 0.024 * scale;
      const iy = py + cy * 0.024 * scale;
      const iz = pz + cz * 0.024 * scale;
      setJoint(iIdx, ix, iy, iz);
      setJoint(dIdx, ix - fx * 0.016 * scale, iy - fy * 0.016 * scale, iz - fz * 0.016 * scale);
      setJoint(tIdx, ix - fx * 0.028 * scale, iy - fy * 0.028 * scale, iz - fz * 0.028 * scale);
    }
  }
  const thumbLat = -0.036 * sideSign * scale;
  const tMetaX = wx + ux * thumbLat + fx * 0.022 * scale;
  const tMetaY = wy + uy * thumbLat + fy * 0.022 * scale;
  const tMetaZ = wz + uz * thumbLat + fz * 0.022 * scale;
  setJoint(JOINT_INDEX.THUMB_METACARPAL, tMetaX, tMetaY, tMetaZ);
  if (isPinch) {
    const itOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const itx = buf[itOff];
    const ity = buf[itOff + 1];
    const itz = buf[itOff + 2];
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, (tMetaX + itx) * 0.5, (tMetaY + ity) * 0.5, (tMetaZ + itz) * 0.5);
    setJoint(JOINT_INDEX.THUMB_DISTAL, itx - 0.012 * sideSign, ity, itz);
    setJoint(JOINT_INDEX.THUMB_TIP, itx - 4e-3 * sideSign, ity, itz);
  } else if (thumbPointingUp) {
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX, tMetaY + 0.025 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX, tMetaY + 0.048 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX, tMetaY + 0.072 * scale, tMetaZ);
  } else if (thumbPointingDown) {
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX, tMetaY - 0.025 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX, tMetaY - 0.048 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX, tMetaY - 0.072 * scale, tMetaZ);
  } else if (thumbOpen) {
    const tDirX = ux * (-0.7 * sideSign) + fx * 0.4;
    const tDirY = uy * (-0.7 * sideSign) + fy * 0.4;
    const tDirZ = uz * (-0.7 * sideSign) + fz * 0.4;
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX + tDirX * 0.025 * scale, tMetaY + tDirY * 0.025 * scale, tMetaZ + tDirZ * 0.025 * scale);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX + tDirX * 0.05 * scale, tMetaY + tDirY * 0.05 * scale, tMetaZ + tDirZ * 0.05 * scale);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX + tDirX * 0.075 * scale, tMetaY + tDirY * 0.075 * scale, tMetaZ + tDirZ * 0.075 * scale);
  } else {
    setJoint(JOINT_INDEX.THUMB_PROXIMAL, tMetaX + fx * 0.015 * scale, tMetaY + cy * 0.015 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_DISTAL, tMetaX + fx * 0.025 * scale, tMetaY + cy * 0.02 * scale, tMetaZ);
    setJoint(JOINT_INDEX.THUMB_TIP, tMetaX + fx * 0.035 * scale, tMetaY + cy * 0.022 * scale, tMetaZ);
  }
  return buf;
}
var HaathPlayground = class {
  _engine;
  _canvas;
  _ctx;
  _isWebXRActive = false;
  _xrSession = null;
  _xrRefSpace = null;
  // Simulator State
  _activeHand = "right";
  _leftPoseName = "open_palm";
  _rightPoseName = "open_palm";
  _leftPoses;
  _rightPoses;
  // Interactive mouse/trajectory dragging state
  _isDragging = false;
  _dragStartX = 0;
  _dragStartY = 0;
  _currentDragDepth = -0.45;
  // meters Z
  // Animation sequence states
  _activeSequence = null;
  _sequenceStartTime = 0;
  // Trajectory trail points for rendering
  _leftTrail = [];
  _rightTrail = [];
  _lastTimeMs = performance.now();
  _latestResult = null;
  constructor(canvas) {
    this._canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D Canvas context required for visualizer");
    this._ctx = ctx;
    this._engine = new CompositionalGestureEngine();
    this._leftPoses = buildSyntheticHand({ poseName: this._leftPoseName, hand: "left" });
    this._rightPoses = buildSyntheticHand({ poseName: this._rightPoseName, hand: "right" });
    this._setupMouseInteractions();
    this._setupResizeHandler();
  }
  // --- Public Getters & Engine Control ---
  get engine() {
    return this._engine;
  }
  get isWebXRActive() {
    return this._isWebXRActive;
  }
  setPose(hand, poseName) {
    if (hand === "left" || hand === "both") {
      this._leftPoseName = poseName;
      this._leftPoses = buildSyntheticHand({
        poseName,
        hand: "left",
        wristPos: [this._leftPoses[0], this._leftPoses[1], this._leftPoses[2]]
      });
    }
    if (hand === "right" || hand === "both") {
      this._rightPoseName = poseName;
      this._rightPoses = buildSyntheticHand({
        poseName,
        hand: "right",
        wristPos: [this._rightPoses[0], this._rightPoses[1], this._rightPoses[2]]
      });
    }
  }
  setActiveHandMode(mode) {
    this._activeHand = mode;
  }
  resetEngine() {
    this._engine.reset();
    this._leftTrail.length = 0;
    this._rightTrail.length = 0;
    this._activeSequence = null;
    this._leftPoses = buildSyntheticHand({ poseName: this._leftPoseName, hand: "left" });
    this._rightPoses = buildSyntheticHand({ poseName: this._rightPoseName, hand: "right" });
  }
  // --- Sequences & Simulators ---
  triggerMicroGesture(type) {
    this._activeSequence = `micro_${type}`;
    this._sequenceStartTime = performance.now();
  }
  triggerBimanualSequence(type) {
    this._activeSequence = `bimanual_${type}`;
    this._sequenceStartTime = performance.now();
  }
  triggerTrajectoryPreset(type) {
    this._activeSequence = `traj_${type}`;
    this._sequenceStartTime = performance.now();
  }
  // --- WebXR Implementation ---
  async enterWebXR() {
    if (!navigator.xr) {
      alert("WebXR is not supported on this browser or device.");
      return false;
    }
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      alert("WebXR immersive-vr session is not supported.");
      return false;
    }
    try {
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["hand-tracking", "local-floor"]
      });
      this._xrSession = session;
      this._isWebXRActive = true;
      this._xrRefSpace = await session.requestReferenceSpace("local-floor").catch(
        () => session.requestReferenceSpace("viewer")
      );
      session.addEventListener("end", () => {
        this._isWebXRActive = false;
        this._xrSession = null;
        this._xrRefSpace = null;
      });
      const onXRFrame = (time, frame) => {
        if (!this._xrSession) return;
        this._processXRFrame(frame, time);
        this._xrSession.requestAnimationFrame(onXRFrame);
      };
      session.requestAnimationFrame(onXRFrame);
      return true;
    } catch (err) {
      console.error("Failed to start WebXR session:", err);
      alert(`WebXR session error: ${err}`);
      return false;
    }
  }
  _processXRFrame(frame, nowMs) {
    if (!this._xrRefSpace) return;
    let hasLeftXR = false;
    let hasRightXR = false;
    for (const source of frame.session.inputSources) {
      if (!source.hand) continue;
      const handedness = source.handedness;
      const targetBuf = handedness === "left" ? this._leftPoses : this._rightPoses;
      let jointsExtracted = 0;
      for (let j = 0; j < XR_HAND_JOINTS.length; j++) {
        const jointName = XR_HAND_JOINTS[j];
        const jointSpace = source.hand.get(jointName);
        if (!jointSpace) continue;
        const pose = frame.getJointPose(jointSpace, this._xrRefSpace);
        if (!pose) continue;
        const b = j * FLOATS_PER_JOINT;
        targetBuf[b] = pose.transform.position.x;
        targetBuf[b + 1] = pose.transform.position.y;
        targetBuf[b + 2] = pose.transform.position.z;
        targetBuf[b + 3] = pose.transform.orientation.x;
        targetBuf[b + 4] = pose.transform.orientation.y;
        targetBuf[b + 5] = pose.transform.orientation.z;
        targetBuf[b + 6] = pose.transform.orientation.w;
        jointsExtracted++;
      }
      if (jointsExtracted >= 20) {
        if (handedness === "left") hasLeftXR = true;
        if (handedness === "right") hasRightXR = true;
      }
    }
    const deltaSec = Math.min((nowMs - this._lastTimeMs) / 1e3, 0.05);
    this._lastTimeMs = nowMs;
    this._latestResult = this._engine.update(
      hasLeftXR ? this._leftPoses : null,
      0,
      hasRightXR ? this._rightPoses : null,
      0,
      deltaSec,
      nowMs
    );
    this._updateTrails();
    this._renderFrame();
  }
  // --- Animation Loop for Desktop Simulator ---
  startDesktopLoop() {
    const loop = (nowMs) => {
      if (!this._isWebXRActive) {
        const deltaSec = Math.min((nowMs - this._lastTimeMs) / 1e3, 0.05);
        this._lastTimeMs = nowMs;
        this._tickActiveSequence(nowMs);
        this._latestResult = this._engine.update(
          this._leftPoses,
          0,
          this._rightPoses,
          0,
          deltaSec,
          nowMs
        );
        this._updateTrails();
        this._renderFrame();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  get latestResult() {
    return this._latestResult;
  }
  // --- Sequence Tick Handler ---
  _tickActiveSequence(nowMs) {
    if (!this._activeSequence) return;
    const elapsed = nowMs - this._sequenceStartTime;
    if (this._activeSequence === "bimanual_kamehameha") {
      if (elapsed < 380) {
        this._leftPoses = buildSyntheticHand({
          poseName: "open_palm",
          hand: "left",
          wristPos: [0.18, 1.05, -0.28],
          handDir: [0.6, 0.2, -0.4]
        });
        this._rightPoses = buildSyntheticHand({
          poseName: "open_palm",
          hand: "right",
          wristPos: [0.22, 1.05, -0.32],
          handDir: [-0.6, 0.2, 0.4]
        });
      } else if (elapsed < 650) {
        const t = (elapsed - 380) / 270;
        const pushZ = -0.3 + t * -0.55;
        this._leftPoses = buildSyntheticHand({
          poseName: "open_palm",
          hand: "left",
          wristPos: [-0.08, 1.25, pushZ],
          handDir: [0, 0, -1]
        });
        this._rightPoses = buildSyntheticHand({
          poseName: "open_palm",
          hand: "right",
          wristPos: [0.08, 1.25, pushZ],
          handDir: [0, 0, -1]
        });
      } else {
        this._activeSequence = null;
      }
    } else if (this._activeSequence === "bimanual_bow") {
      if (elapsed < 650) {
        const pullT = elapsed / 650;
        const drawZ = -0.45 + pullT * 0.38;
        this._leftPoses = buildSyntheticHand({
          poseName: "fist",
          hand: "left",
          wristPos: [-0.15, 1.22, -0.45],
          handDir: [0, 0, -1]
        });
        this._rightPoses = buildSyntheticHand({
          poseName: "pinch",
          hand: "right",
          wristPos: [0.1, 1.22, drawZ],
          handDir: [0, 0, 1]
        });
      } else if (elapsed < 850) {
        this._rightPoses = buildSyntheticHand({
          poseName: "open_palm",
          hand: "right",
          wristPos: [0.18, 1.22, -0.05],
          handDir: [0, 0, 1]
        });
      } else {
        this._activeSequence = null;
      }
    } else if (this._activeSequence === "bimanual_portal") {
      if (elapsed < 200) {
        this._leftPoses = buildSyntheticHand({
          poseName: "fist",
          hand: "left",
          wristPos: [-0.06, 1.2, -0.4]
        });
        this._rightPoses = buildSyntheticHand({
          poseName: "fist",
          hand: "right",
          wristPos: [0.06, 1.2, -0.4]
        });
      } else if (elapsed < 600) {
        const t = (elapsed - 200) / 400;
        const spread = 0.06 + t * 0.28;
        this._leftPoses = buildSyntheticHand({
          poseName: "fist",
          hand: "left",
          wristPos: [-spread, 1.2, -0.4]
        });
        this._rightPoses = buildSyntheticHand({
          poseName: "fist",
          hand: "right",
          wristPos: [spread, 1.2, -0.4]
        });
      } else {
        this._activeSequence = null;
      }
    } else if (this._activeSequence === "bimanual_timeout") {
      this._rightPoses = buildSyntheticHand({
        poseName: "open_palm",
        hand: "right",
        wristPos: [0, 1.2, -0.4],
        handDir: [1, 0, 0]
        // Horizontal palm
      });
      this._leftPoses = buildSyntheticHand({
        poseName: "point",
        hand: "left",
        wristPos: [0, 1.08, -0.4],
        handDir: [0, 1, 0]
        // Index tip pointing up at right palm
      });
      if (elapsed > 600) this._activeSequence = null;
    } else if (this._activeSequence === "bimanual_dial") {
      const angle = elapsed / 1200 * Math.PI * 1.5;
      const radius = 0.18;
      const cx = 0;
      const cy = 1.2;
      this._leftPoses = buildSyntheticHand({
        poseName: "fist",
        hand: "left",
        wristPos: [cx - Math.cos(angle) * radius, cy - Math.sin(angle) * radius, -0.4]
      });
      this._rightPoses = buildSyntheticHand({
        poseName: "fist",
        hand: "right",
        wristPos: [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, -0.4]
      });
      if (elapsed > 1200) this._activeSequence = null;
    } else if (this._activeSequence === "micro_flick") {
      if (elapsed < 120) {
        this.setPose("right", "fist");
      } else if (elapsed < 240) {
        this.setPose("right", "point");
      } else {
        this._activeSequence = null;
      }
    } else if (this._activeSequence === "micro_snap") {
      if (elapsed < 120) {
        this.setPose("right", "pinch");
      } else if (elapsed < 240) {
        this.setPose("right", "fist");
      } else {
        this._activeSequence = null;
      }
    } else if (this._activeSequence === "micro_money_rub") {
      const osc = Math.sin(elapsed / 300 * Math.PI * 4) * 0.02;
      this._rightPoses = buildSyntheticHand({
        poseName: "pinch",
        hand: "right",
        wristPos: [0.18 + osc, 1.2, -0.45]
      });
      if (elapsed > 600) this._activeSequence = null;
    } else if (this._activeSequence === "traj_circle") {
      const angle = elapsed / 1e3 * Math.PI * 2.8;
      const r = 0.12;
      this._rightPoses = buildSyntheticHand({
        poseName: "point",
        hand: "right",
        wristPos: [0.18 + Math.cos(angle) * r, 1.2 + Math.sin(angle) * r, -0.45]
      });
      if (elapsed > 1e3) this._activeSequence = null;
    } else if (this._activeSequence.startsWith("traj_swipe_")) {
      const dir = this._activeSequence.replace("traj_swipe_", "");
      const t = elapsed / 400;
      let dx = 0, dy = 0;
      if (dir === "left") dx = -t * 0.45;
      if (dir === "right") dx = t * 0.45;
      if (dir === "up") dy = t * 0.45;
      this._rightPoses = buildSyntheticHand({
        poseName: "open_palm",
        hand: "right",
        wristPos: [0.18 + dx, 1.2 + dy, -0.45]
      });
      if (elapsed > 400) this._activeSequence = null;
    }
  }
  // --- Mouse / Trajectory Dragging ---
  _setupMouseInteractions() {
    this._canvas.addEventListener("mousedown", (e) => {
      this._isDragging = true;
      const rect = this._canvas.getBoundingClientRect();
      this._dragStartX = e.clientX - rect.left;
      this._dragStartY = e.clientY - rect.top;
      this._updateHandFromMouse(this._dragStartX, this._dragStartY, e.shiftKey);
    });
    window.addEventListener("mousemove", (e) => {
      if (!this._isDragging) return;
      const rect = this._canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._updateHandFromMouse(x, y, e.shiftKey);
    });
    window.addEventListener("mouseup", () => {
      this._isDragging = false;
    });
    this._canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this._currentDragDepth += e.deltaY * 5e-4;
      this._currentDragDepth = Math.max(-0.9, Math.min(-0.15, this._currentDragDepth));
    });
  }
  _updateHandFromMouse(canvasX, canvasY, shiftHeld) {
    const normX = (canvasX / this._canvas.width - 0.5) * 1;
    const normY = 1.2 - (canvasY / this._canvas.height - 0.5) * 0.8;
    if (this._activeHand === "right" || this._activeHand === "both") {
      this._rightPoses = buildSyntheticHand({
        poseName: this._rightPoseName,
        hand: "right",
        wristPos: [normX + 0.1, normY, this._currentDragDepth]
      });
    }
    if (this._activeHand === "left" || this._activeHand === "both") {
      this._leftPoses = buildSyntheticHand({
        poseName: this._leftPoseName,
        hand: "left",
        wristPos: [normX - 0.1, normY, this._currentDragDepth]
      });
    }
  }
  _setupResizeHandler() {
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = this._canvas.getBoundingClientRect();
      this._canvas.width = rect.width * dpr;
      this._canvas.height = rect.height * dpr;
      this._ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 50);
  }
  _updateTrails() {
    const rTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    const lTipOff = JOINT_INDEX.INDEX_TIP * FLOATS_PER_JOINT;
    this._rightTrail.push([
      this._rightPoses[rTipOff],
      this._rightPoses[rTipOff + 1],
      this._rightPoses[rTipOff + 2]
    ]);
    if (this._rightTrail.length > 45) this._rightTrail.shift();
    this._leftTrail.push([
      this._leftPoses[lTipOff],
      this._leftPoses[lTipOff + 1],
      this._leftPoses[lTipOff + 2]
    ]);
    if (this._leftTrail.length > 45) this._leftTrail.shift();
  }
  // --- 2D / 3D Canvas Rendering ---
  _project(x, y, z) {
    const rect = this._canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const fov = 420;
    const dist = Math.abs(z);
    const px = w * 0.5 + x * fov / dist;
    const py = h * 0.5 - (y - 1.2) * fov / dist;
    return [px, py];
  }
  _renderFrame() {
    const rect = this._canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this._ctx.fillStyle = "#0a0d14";
    this._ctx.fillRect(0, 0, w, h);
    this._drawGrid(w, h);
    this._drawTrail(this._leftTrail, "#00ffff");
    this._drawTrail(this._rightTrail, "#ffaa00");
    this._drawHandSkeleton(this._leftPoses, "#00e5ff", "#007799");
    this._drawHandSkeleton(this._rightPoses, "#ff9100", "#994400");
    if (this._latestResult) {
      this._drawBimanualOverlays(this._latestResult);
    }
  }
  _drawGrid(w, h) {
    this._ctx.strokeStyle = "#182030";
    this._ctx.lineWidth = 1;
    for (let x = -0.5; x <= 0.5; x += 0.1) {
      const [p1x, p1y] = this._project(x, 0.8, -0.2);
      const [p2x, p2y] = this._project(x, 0.8, -0.8);
      this._ctx.beginPath();
      this._ctx.moveTo(p1x, p1y);
      this._ctx.lineTo(p2x, p2y);
      this._ctx.stroke();
    }
    for (let z = -0.2; z >= -0.8; z -= 0.1) {
      const [p1x, p1y] = this._project(-0.5, 0.8, z);
      const [p2x, p2y] = this._project(0.5, 0.8, z);
      this._ctx.beginPath();
      this._ctx.moveTo(p1x, p1y);
      this._ctx.lineTo(p2x, p2y);
      this._ctx.stroke();
    }
  }
  _drawTrail(trail, color) {
    if (trail.length < 2) return;
    this._ctx.save();
    for (let i = 1; i < trail.length; i++) {
      const [x0, y0] = this._project(trail[i - 1][0], trail[i - 1][1], trail[i - 1][2]);
      const [x1, y1] = this._project(trail[i][0], trail[i][1], trail[i][2]);
      const alpha = i / trail.length * 0.7;
      this._ctx.strokeStyle = color;
      this._ctx.globalAlpha = alpha;
      this._ctx.lineWidth = 2.5;
      this._ctx.beginPath();
      this._ctx.moveTo(x0, y0);
      this._ctx.lineTo(x1, y1);
      this._ctx.stroke();
    }
    this._ctx.restore();
  }
  _drawHandSkeleton(poses, jointColor, boneColor) {
    this._ctx.save();
    this._ctx.strokeStyle = boneColor;
    this._ctx.lineWidth = 3;
    this._ctx.lineCap = "round";
    for (const [a, b] of SKELETON_CONNECTIONS) {
      const aOff = a * FLOATS_PER_JOINT;
      const bOff = b * FLOATS_PER_JOINT;
      const [ax, ay] = this._project(poses[aOff], poses[aOff + 1], poses[aOff + 2]);
      const [bx, by] = this._project(poses[bOff], poses[bOff + 1], poses[bOff + 2]);
      this._ctx.beginPath();
      this._ctx.moveTo(ax, ay);
      this._ctx.lineTo(bx, by);
      this._ctx.stroke();
    }
    for (let i = 0; i < JOINT_COUNT; i++) {
      const off = i * FLOATS_PER_JOINT;
      const [px, py] = this._project(poses[off], poses[off + 1], poses[off + 2]);
      const isTip = i === JOINT_INDEX.THUMB_TIP || i === JOINT_INDEX.INDEX_TIP || i === JOINT_INDEX.MIDDLE_TIP || i === JOINT_INDEX.RING_TIP || i === JOINT_INDEX.PINKY_TIP;
      this._ctx.fillStyle = isTip ? "#ffffff" : jointColor;
      this._ctx.beginPath();
      this._ctx.arc(px, py, isTip ? 5 : 3.5, 0, Math.PI * 2);
      this._ctx.fill();
    }
    this._ctx.restore();
  }
  _drawBimanualOverlays(res) {
    const { bimanual } = res;
    if (bimanual.kamehameha.active) {
      const [ox, oy] = this._project(
        bimanual.kamehameha.origin[0],
        bimanual.kamehameha.origin[1],
        bimanual.kamehameha.origin[2]
      );
      const r = 15 + bimanual.kamehameha.charge * 30;
      this._ctx.save();
      this._ctx.fillStyle = bimanual.kamehameha.triggered ? "#ff0055" : "#00ffff";
      this._ctx.shadowColor = "#00ffff";
      this._ctx.shadowBlur = 25;
      this._ctx.beginPath();
      this._ctx.arc(ox, oy, r, 0, Math.PI * 2);
      this._ctx.fill();
      this._ctx.restore();
    }
    if (bimanual.bow.active) {
      const [ax, ay] = this._project(
        bimanual.bow.arrowOrigin[0],
        bimanual.bow.arrowOrigin[1],
        bimanual.bow.arrowOrigin[2]
      );
      this._ctx.save();
      this._ctx.strokeStyle = "#00ff66";
      this._ctx.lineWidth = 4;
      this._ctx.beginPath();
      this._ctx.arc(ax, ay, 10 + bimanual.bow.power * 15, 0, Math.PI * 2);
      this._ctx.stroke();
      this._ctx.restore();
    }
    if (bimanual.portal.active) {
      const [cx, cy] = this._project(
        bimanual.portal.center[0],
        bimanual.portal.center[1],
        bimanual.portal.center[2]
      );
      this._ctx.save();
      this._ctx.strokeStyle = "#bf00ff";
      this._ctx.lineWidth = bimanual.portal.triggered ? 8 : 4;
      this._ctx.beginPath();
      this._ctx.arc(cx, cy, bimanual.portal.stretchDistance * 80, 0, Math.PI * 2);
      this._ctx.stroke();
      this._ctx.restore();
    }
  }
};
export {
  HaathPlayground,
  buildSyntheticHand
};
