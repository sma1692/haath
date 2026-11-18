// examples/02-iwsdk-system/HandSystem.ts
// One haath instance for the whole IWSDK world. Other systems read `haath.state`.
// This mirrors how DunJun runs haath in production.

import { createSystem } from '@iwsdk/core';
import { Haath } from '@treefour/haath';

export class HandSystem extends createSystem({}) {
  /** Shared engine. Do not create a second one: velocity and clap timing live inside it. */
  haath = new Haath({ punchSpeed: 1.3, slapSpeed: 1.8 });

  update(delta: number) {
    const xr = this.world.renderer.xr;
    if (!xr.isPresenting) return;
    const frame = xr.getFrame();
    const session = xr.getSession();
    const refSpace = xr.getReferenceSpace();
    if (!frame || !session || !refSpace) return;
    // IWSDK passes delta in seconds, which is what haath expects.
    this.haath.update(frame, refSpace, session.inputSources, delta);
  }
}
