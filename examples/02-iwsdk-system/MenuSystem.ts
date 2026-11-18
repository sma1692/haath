// examples/02-iwsdk-system/MenuSystem.ts
// Reads haath state from HandSystem: double clap opens pause, thumbs-up hold confirms.

import { createSystem } from '@iwsdk/core';
import { HoldRecognizer } from '@treefour/haath';
import { HandSystem } from './HandSystem.js';

export class MenuSystem extends createSystem({}) {
  private confirm = new HoldRecognizer<string>({ holdDurationMs: 1000, stabilityFrames: 10, cooldownMs: 800 });
  paused = false;
  confirmProgress = 0;

  update(delta: number) {
    const hands = this.world.getSystem(HandSystem);
    if (!hands) return;
    const { left, right, twoHand } = hands.haath.state;

    // One-frame flag: read it in the same frame it fires.
    if (twoHand.clap.doubleClap) this.paused = !this.paused;

    if (this.paused) {
      const thumbs = right.sign === 'thumbsup' || left.sign === 'thumbsup' ? 'thumbsup' : null;
      const hold = this.confirm.update(thumbs, delta);
      this.confirmProgress = hold.progress; // drive a loading ring 0..1
      if (hold.triggered) this.paused = false;
    }
  }
}
