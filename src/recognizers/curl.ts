// Intra-finger dot-product straightness and thumb-out evaluators
// Source: DunJun src/systems/gestures.ts - fingerExtension(), _fingerExtendedCurl(), isThumbReallyOut()
// TODO(Phase 2): extract and decouple from @iwsdk/core joint pose API

import type { CurlState } from '../core/types.js';

// TODO(Phase 2): implement
export function computeCurl(_joints: unknown, _curlDotThreshold: number): CurlState {
  throw new Error('computeCurl() - Phase 2 extraction pending.');
}
