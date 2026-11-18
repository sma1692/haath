// examples/02-iwsdk-system/CombatSystem.ts
// Contact-based hits: the hand must touch the enemy while the gesture is a strike.

import { createSystem } from '@iwsdk/core';
import { CollisionCooldownTracker, type HandSphereTestOptions } from '@treefour/haath';
import { HandSystem } from './HandSystem.js';

export interface Enemy {
  id: number;
  pos: { x: number; y: number; z: number };
  prev: { x: number; y: number; z: number };
  radius: number;
  hp: number;
}

export class CombatSystem extends createSystem({}) {
  enemies: Enemy[] = [];

  // Allocate once. Reusing this object keeps the per-frame path allocation free.
  private hitOpts: HandSphereTestOptions = {
    mode: 'combat',
    requiredGesture: ['punch', 'slap', 'poke'],
    cooldown: new CollisionCooldownTracker(200),
  };

  update() {
    const hands = this.world.getSystem(HandSystem);
    if (!hands) return;
    const haath = hands.haath;

    for (const e of this.enemies) {
      this.hitOpts.targetId = e.id;
      this.hitOpts.prevTargetX = e.prev.x;
      this.hitOpts.prevTargetY = e.prev.y;
      this.hitOpts.prevTargetZ = e.prev.z;
      for (const side of ['left', 'right'] as const) {
        const part = haath.testHandSphere(side, e.pos.x, e.pos.y, e.pos.z, e.radius, this.hitOpts);
        if (part === 'none') continue;
        const hand = haath.state[side];
        // Damage scales with strike speed; 'part' tells you palm, wrist, indexTip, or sweep.
        e.hp -= Math.round(10 * Math.max(1, hand.motionSpeed));
      }
    }
  }
}
