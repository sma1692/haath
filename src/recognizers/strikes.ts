// Lever-arm velocity tracker and velocity-gated strike classifier
// Source: DunJun src/systems/gestures.ts - historian(), detectHighSpeedGesture(),
//         distanceBetweenPhalanges(), aimVec extraction
// Tracks ring-finger-tip relative to wrist as lever arm endpoint
// TODO(Phase 2): extract and decouple from @iwsdk/core

import type { StrikeResult } from '../core/types.js';

// TODO(Phase 2): implement - pre-allocate velocity history ring buffer here
export function detectStrike(
  _joints: unknown,
  _delta: number,
  _punchSpeed: number,
  _slapSpeed: number,
): StrikeResult {
  throw new Error('detectStrike() - Phase 2 extraction pending.');
}
