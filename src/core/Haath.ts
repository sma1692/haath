// Main tracker class
// Orchestrates joint history ring buffers, per-hand state, and event emitters.
// All scratch vectors and output structs pre-allocated here - zero per-frame heap.

import type { HaathConfig, HaathUpdateResult } from './types.js';
import { CURL_DOT, PINCH_DIST, PUNCH_SPEED, SLAP_SPEED, SPELL_CONFIG } from './constants.js';

// TODO(Phase 2): import recognizers once extracted from DunJun
// import { computeCurl } from '../recognizers/curl.js';
// import { detectHandSign } from '../recognizers/signs.js';
// import { detectStrike } from '../recognizers/strikes.js';
// import { evaluateTwoHand } from '../recognizers/twoHand.js';
// import { detectCircle } from '../recognizers/circle.js';

export class Haath {
  private readonly _config: Required<HaathConfig>;

  // TODO(Phase 2): ring buffers, per-hand state structs, scratch vecs

  constructor(config: HaathConfig = {}) {
    this._config = {
      curlDot:              config.curlDot              ?? CURL_DOT,
      pinchDist:            config.pinchDist            ?? PINCH_DIST,
      punchSpeed:           config.punchSpeed           ?? PUNCH_SPEED,
      slapSpeed:            config.slapSpeed            ?? SLAP_SPEED,
      circleMinRevolutions: config.circleMinRevolutions ?? SPELL_CONFIG.CIRCLE_MIN_REVOLUTIONS,
      prayerHoldMs:         config.prayerHoldMs         ?? 1500,
      crossChestHoldMs:     config.crossChestHoldMs     ?? 2000,
    };
  }

  // update() called once per XR frame - zero allocations
  update(
    _frame: XRFrame,
    _referenceSpace: XRReferenceSpace,
    _inputSources: XRInputSourceArray,
    _delta: number,
  ): HaathUpdateResult {
    // TODO(Phase 2): drive all recognizers, return populated state
    throw new Error('Haath.update() - not yet implemented. Phase 2 extraction pending.');
  }
}
