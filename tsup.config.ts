import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    v2: 'src/v2.ts',
    debug: 'src/debug.ts',
    emulator: 'src/emulator.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Libraries ship unminified: consumers minify, and readable output keeps
  // tree-shaking, stack traces, and source maps useful in downstream apps.
  minify: false,
  treeshake: true,
  splitting: true,
  target: 'es2022',
});
