// Candidate frame-stability + dwell progress timer (0..1) with post-trigger cooldown
// Extracted from DunJun LongGestureSystem.thehroOps()

import {
  HOLD_COOLDOWN_MS,
  HOLD_DEFAULT_DURATION_MS,
  HOLD_SIGN_STABILITY_FRAMES,
} from '../constants.js';
import type { HoldConfig, HoldState } from '../types.js';

export class HoldRecognizer<T = string | number> {
  private readonly _stabilityFrames: number;
  private readonly _holdDurationMs: number;
  private readonly _cooldownMs: number;

  private _rawCandidate: T | null = null;
  private _stableFrames = 0;
  private _lockedCandidate: T | null = null;
  private _elapsedMs = 0;
  private _lastTriggerMs = -Infinity;

  public readonly state: HoldState<T> = {
    active: false,
    candidate: null,
    progress: 0,
    triggered: false,
  };

  constructor(config: HoldConfig = {}) {
    this._stabilityFrames = config.stabilityFrames ?? HOLD_SIGN_STABILITY_FRAMES;
    this._holdDurationMs = config.holdDurationMs ?? HOLD_DEFAULT_DURATION_MS;
    this._cooldownMs = config.cooldownMs ?? HOLD_COOLDOWN_MS;
  }

  private _isIdleCandidate(candidate: T | null | undefined): candidate is null | undefined {
    return (
      candidate === null ||
      candidate === undefined ||
      candidate === ('idle' as unknown as T) ||
      candidate === ('unknown' as unknown as T) ||
      candidate === ('none' as unknown as T) ||
      candidate === (0 as unknown as T)
    );
  }

  /**
   * Advances the stability + dwell state machine.
   * Accepts `delta` in either milliseconds (>= 1) or seconds (< 1).
   */
  update(
    candidate: T | null | undefined,
    delta: number,
    nowMs: number = performance.now(),
  ): HoldState<T> {
    this.state.triggered = false;

    // Convert delta from seconds to ms if passed as typical XR frame delta (< 1.0s)
    const dtMs = delta > 0 && delta < 1.0 ? delta * 1000 : Math.max(0, delta);

    // Post-trigger cooldown gate
    if (nowMs - this._lastTriggerMs < this._cooldownMs) {
      this.state.active = false;
      this.state.candidate = null;
      this.state.progress = 0;
      return this.state;
    }

    if (this._isIdleCandidate(candidate)) {
      this._rawCandidate = null;
      this._stableFrames = 0;
      this._lockedCandidate = null;
      this._elapsedMs = 0;
      this.state.active = false;
      this.state.candidate = null;
      this.state.progress = 0;
      return this.state;
    }

    if (candidate === this._rawCandidate) {
      this._stableFrames++;
    } else {
      this._rawCandidate = candidate;
      this._stableFrames = 1;
      if (this._lockedCandidate !== candidate) {
        this._lockedCandidate = null;
        this._elapsedMs = 0;
      }
    }

    if (this._stableFrames < this._stabilityFrames) {
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
    this.state.progress =
      this._holdDurationMs > 0 ? Math.min(1, this._elapsedMs / this._holdDurationMs) : 1;

    if (this._elapsedMs >= this._holdDurationMs) {
      this.state.triggered = true;
      this.state.progress = 1;
      this._lastTriggerMs = nowMs;
      this._rawCandidate = null;
      this._stableFrames = 0;
      this._lockedCandidate = null;
      this._elapsedMs = 0;
    }

    return this.state;
  }

  reset(): void {
    this._rawCandidate = null;
    this._stableFrames = 0;
    this._lockedCandidate = null;
    this._elapsedMs = 0;
    this._lastTriggerMs = -Infinity;
    this.state.active = false;
    this.state.candidate = null;
    this.state.progress = 0;
    this.state.triggered = false;
  }
}
