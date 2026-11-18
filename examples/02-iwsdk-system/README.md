# 02 · IWSDK systems

Code-only example for [Meta's Immersive Web SDK](https://github.com/facebook/immersive-web-sdk) (`@iwsdk/core`). IWSDK apps need its Vite toolchain, so copy these files into a project made with `npm create @iwsdk@latest`.

- `HandSystem.ts`: owns the single `Haath` instance and calls `update()` once per frame.
- `MenuSystem.ts`: double clap toggles pause, a one-second thumbs-up hold confirms.
- `CombatSystem.ts`: contact hits with `testHandSphere()` and a shared cooldown tracker.

Register `HandSystem` first so the others read fresh state in the same frame:

```ts
import { World } from '@iwsdk/core';
import { HandSystem } from './HandSystem.js';
import { MenuSystem } from './MenuSystem.js';
import { CombatSystem } from './CombatSystem.js';

World.create(document.getElementById('scene-container') as HTMLDivElement, {
  xr: { features: { handTracking: true } },
}).then((world) => {
  world.registerSystem(HandSystem, { priority: -10 });
  world.registerSystem(MenuSystem);
  world.registerSystem(CombatSystem);
});
```

For desktop testing, IWSDK already injects IWER in dev (`@iwsdk/vite-plugin-iwer`). Add the haath emulator the way example 04 does, behind `import.meta.env.DEV`.
