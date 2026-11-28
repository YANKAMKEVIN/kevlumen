/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// base relative : le jeu marche sous https://yankamkevin.github.io/kevlumen/ comme en local.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: true,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/view/layout.ts', 'src/view/anim.ts'],
      reporter: ['text-summary'],
    },
  },
});
