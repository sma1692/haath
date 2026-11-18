import { describe, expect, it } from 'vitest';
import { evaluateFingerExtensions, type FingerExtensionState } from '../src/index.js';
import { analyzeFingers } from '../src/v2.js';
import { buildHandPoseBuffer, type FingerBuildOpts } from './fixtures/handPose.js';

/**
 * Parity check between the two finger analyzers:
 * - v1 `evaluateFingerExtensions` (singleHand.ts, used by the core Haath engine and DunJun)
 * - v2 `analyzeFingers` (StaticPoseClassifier.ts, graded curl scores with a half-curled band)
 *
 * They should agree on clearly extended / clearly curled fingers. The v2 analyzer
 * has a "halfCurled" band (0.38 < score < 0.62) that v1 does not model, so only
 * fingers outside that band are compared. Converge on one analyzer when v2 replaces v1.
 */
const newExt = (): FingerExtensionState =>
  ({ thumb: false, index: false, middle: false, ring: false, pinky: false, count: 0 }) as FingerExtensionState;

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

const POSES: Record<string, FingerBuildOpts> = {
  open_palm: { thumb: true, index: true, middle: true, ring: true, pinky: true },
  fist: {},
  point: { index: true },
  peace: { index: true, middle: true },
  horns: { index: true, pinky: true },
  thumbs_up: { thumb: true },
  rotated_open: { thumb: true, index: true, middle: true, ring: true, pinky: true, handDir: [0.3, 0.8, -0.5] },
  small_hand_peace: { index: true, middle: true, scale: 0.8 },
};

describe('finger analyzer parity (v1 evaluateFingerExtensions vs v2 analyzeFingers)', () => {
  for (const [name, opts] of Object.entries(POSES)) {
    it(`agrees on non-thumb fingers outside the half-curled band: ${name}`, () => {
      const poses = buildHandPoseBuffer(opts);
      const v1 = evaluateFingerExtensions(poses, 0, newExt());
      const v2 = analyzeFingers(poses, 0);
      for (const f of FINGERS) {
        if (f === 'thumb') continue; // covered by the dedicated thumb test below
        if (v2[f].halfCurled) continue;
        expect({ finger: f, v1: v1[f] }).toEqual({ finger: f, v1: v2[f].extended });
      }
    });
  }

  // v1 uses isThumbReallyOut, v2 uses evaluateThumbExtension (graded score). They agree on
  // these synthetic poses; real tucked / partial thumbs may still diverge, so add recorded
  // hand frames here before v2 replaces v1 in the core engine.
  it('thumb agrees between v1 and v2 on all synthetic poses', () => {
    for (const opts of Object.values(POSES)) {
      const poses = buildHandPoseBuffer(opts);
      const v1 = evaluateFingerExtensions(poses, 0, newExt());
      expect(v1.thumb).toBe(analyzeFingers(poses, 0).thumb.extended);
    }
  });
});
