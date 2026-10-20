// Static single-hand sign classifier
// Source: DunJun src/systems/gestures.ts - detectHandSign(), genericDirection()
// Signs: fist, open, thehro, niche, gun, poke, pinch, thumbsup, thumbsdown,
//        rock-horns, telephone, pinkie-out, birdie-1, birdie-2
// TODO(Phase 2): extract and decouple from @iwsdk/core

import type { CurlState, HandSign } from '../core/types.js';

// TODO(Phase 2): implement
export function detectHandSign(_curl: CurlState, _pinchDist: number): HandSign {
  throw new Error('detectHandSign() - Phase 2 extraction pending.');
}
