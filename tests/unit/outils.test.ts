// Le générateur de niveaux (outils/, CommonJS) a sa propre copie de la simulation :
// elle doit donner exactement les mêmes rayons que le jeu, sinon un niveau « vérifié » pourrait être impossible.
import { createRequire } from 'node:module';
import { expect, test } from 'vitest';
import { LEVELS } from '../../src/engine/levels';
import { isWin, trace } from '../../src/engine/sim';
import type { Grid } from '../../src/engine/types';

const outils = createRequire(import.meta.url)('../../outils/sim.js') as { trace: typeof trace; isWin: typeof isWin };

test.each(LEVELS.map((L, i) => [i + 1, L.name, i] as const))('niveau %i « %s » : outils/sim.js et src/engine/sim.ts tracent les mêmes rayons', (_n, _name, i) => {
  const L = LEVELS[i];
  const g: Grid = new Array(L.w * L.h).fill(null);
  for (const c of L.cells) g[c.y * L.w + c.x] = { ...c };
  expect(outils.trace(L, g).segs).toEqual(trace(L, g).segs);
  for (const p of L.sol) g[p.y * L.w + p.x] = { t: p.t ?? '', o: p.o, c: p.c };
  for (const p of L.solRot || []) { const c = g[p.y * L.w + p.x]; if (c) c.o = p.o; }
  const a = trace(L, g), b = outils.trace(L, g);
  expect(b.segs).toEqual(a.segs);
  expect(outils.isWin(L, g, b)).toBe(isWin(L, g, a));
  expect(isWin(L, g, a)).toBe(true);
});
