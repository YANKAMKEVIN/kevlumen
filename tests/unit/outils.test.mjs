import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { LEVELS } from '../../src/levels.js';
import { trace, isWin } from '../../src/sim.js';

// Le générateur de niveaux (outils/, CommonJS) a sa propre copie de la simulation :
// elle doit donner exactement les mêmes rayons que le jeu, sinon un niveau « vérifié » pourrait être impossible.
const outils = createRequire(import.meta.url)('../../outils/sim.js');

test('outils/sim.js et src/sim.js tracent les mêmes rayons sur les 30 niveaux, avant et après solution', () => {
  LEVELS.forEach((L, i) => {
    const g = new Array(L.w * L.h).fill(null);
    for (const c of L.cells) g[c.y * L.w + c.x] = { ...c };
    const a = trace(L, g), b = outils.trace(L, g);
    assert.deepEqual(a.segs, b.segs, `niveau ${i + 1} départ`);
    for (const p of L.sol) g[p.y * L.w + p.x] = { t: p.t, o: p.o, c: p.c };
    for (const p of L.solRot || []) g[p.y * L.w + p.x].o = p.o;
    const c = trace(L, g), d = outils.trace(L, g);
    assert.deepEqual(c.segs, d.segs, `niveau ${i + 1} résolu`);
    assert.equal(isWin(L, g, c), outils.isWin(L, g, d));
    assert.ok(isWin(L, g, c), `niveau ${i + 1}`);
  });
});
