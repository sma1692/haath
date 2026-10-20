// Two-handed geometric evaluators
// Sources:
//   DunJun src/systems/gestures.ts L322-L372 - triangle/diamond apex/base/normal
//   DunJun src/systems/longGesture.ts - double-clap state machine (_clapCount, _HandsSeparated,
//     palm dot check), chest-cross pause hold, corner hold timer
// TODO(Phase 2): extract and decouple from @iwsdk/core

import type { TwoHandState } from '../core/types.js';

// TODO(Phase 2): implement - pre-allocate all scratch vecs and state structs here
export function evaluateTwoHand(
  _leftJoints: unknown,
  _rightJoints: unknown,
  _delta: number,
  _prayerHoldMs: number,
  _crossChestHoldMs: number,
): TwoHandState {
  throw new Error('evaluateTwoHand() - Phase 2 extraction pending.');
}
