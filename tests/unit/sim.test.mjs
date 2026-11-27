import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trace, isWin } from '../../src/sim.js';

/** Plateau w×h à partir d'une liste de pièces {t,x,y,...}. */
function board(w, h, cells) {
  const grid = new Array(w * h).fill(null);
  for (const c of cells) grid[c.y * w + c.x] = { ...c };
  return { L: { w, h }, grid };
}
const got = (tr, w, x, y) => tr.hits.get(y * w + x) || 0;

test('un rayon file tout droit jusqu\'au cristal', () => {
  const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
  const tr = trace(L, grid);
  assert.equal(got(tr, 5, 4, 0), 1);
  assert.ok(isWin(L, grid, tr));
});

test('un mur arrête la lumière', () => {
  const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'wall', x: 2, y: 0 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
  const tr = trace(L, grid);
  assert.equal(got(tr, 5, 4, 0), 0);
  assert.equal(isWin(L, grid, tr), false);
});

test('miroir : renvoie à angle droit selon son orientation', () => {
  // rayon vers la droite, miroir en (2,2) ; o=0 '/' renvoie vers le haut, o=1 '\' vers le bas
  for (const [o, cy] of [[0, 0], [1, 4]]) {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 4, d: 0 }, { t: 'mir', x: 2, y: 2, o }, { t: 'crys', x: 2, y: cy, c: 4 }]);
    assert.equal(got(trace(L, grid), 5, 2, cy), 4, `o=${o}`);
  }
});

test('séparateur : le rayon passe et se reflète en même temps', () => {
  const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 2, d: 0 }, { t: 'spl', x: 2, y: 2, o: 0 }, { t: 'crys', x: 4, y: 2, c: 2 }, { t: 'crys', x: 2, y: 0, c: 2 }]);
  const tr = trace(L, grid);
  assert.equal(got(tr, 5, 4, 2), 2);
  assert.equal(got(tr, 5, 2, 0), 2);
  assert.ok(isWin(L, grid, tr));
});

test('les couleurs s\'additionnent : rouge + bleu = magenta', () => {
  const { L, grid } = board(5, 3, [{ t: 'src', x: 0, y: 1, c: 1, d: 0 }, { t: 'src', x: 4, y: 1, c: 4, d: 2 }, { t: 'crys', x: 2, y: 1, c: 5 }]);
  const tr = trace(L, grid);
  assert.equal(got(tr, 5, 2, 1), 5);
  assert.ok(isWin(L, grid, tr));
});

test('un cristal qui reçoit une couleur en trop reste éteint', () => {
  const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 3, d: 0 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
  assert.equal(isWin(L, grid, trace(L, grid)), false);
});

test('filtre : ne laisse passer que sa couleur', () => {
  const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 7, d: 0 }, { t: 'flt', x: 2, y: 0, c: 2 }, { t: 'crys', x: 4, y: 0, c: 2 }]);
  const tr = trace(L, grid);
  assert.equal(got(tr, 5, 4, 0), 2);
  const { L: L2, grid: g2 } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'flt', x: 2, y: 0, c: 2 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
  assert.equal(got(trace(L2, g2), 5, 4, 0), 0);
});

test('prisme : rouge à gauche, vert tout droit, bleu à droite, seulement par l\'arrière', () => {
  const cells = [{ t: 'src', x: 0, y: 2, c: 7, d: 0 }, { t: 'pri', x: 2, y: 2, o: 0 }];
  const { L, grid } = board(5, 5, cells);
  const tr = trace(L, grid);
  const colorAt = (x, y) => tr.lit.has(y * 5 + x);
  assert.ok(colorAt(2, 1) && colorAt(2, 3) && colorAt(3, 2));
  const seg = c => tr.segs.filter(s => s[4] === c && s[0] === 2 && s[1] === 2)[0];
  assert.equal(seg(1)[3] < 2, true, 'rouge part vers le haut (à gauche du sens de marche)');
  assert.equal(seg(2)[2] > 2, true, 'vert continue');
  assert.equal(seg(4)[3] > 2, true, 'bleu part vers le bas');
  const { L: L2, grid: g2 } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 7, d: 0 }, { t: 'pri', x: 2, y: 2, o: 2 }]);
  assert.equal(trace(L2, g2).segs.length, 1, 'prisme à l\'envers : la lumière s\'arrête');
});

test('cristal d\'ombre : la partie est perdue s\'il est éclairé', () => {
  const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'dark', x: 4, y: 0 }]);
  assert.equal(isWin(L, grid, trace(L, grid)), false);
  const { L: L2, grid: g2 } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'wall', x: 2, y: 0 }, { t: 'dark', x: 4, y: 0 }]);
  assert.ok(isWin(L2, g2, trace(L2, g2)));
});

test('une boucle de miroirs ne bloque pas le calcul', () => {
  const { L, grid } = board(4, 4, [{ t: 'src', x: 0, y: 1, c: 1, d: 0 }, { t: 'spl', x: 1, y: 1, o: 1 }, { t: 'mir', x: 1, y: 3, o: 0 }, { t: 'mir', x: 3, y: 3, o: 1 }, { t: 'mir', x: 3, y: 1, o: 0 }]);
  const tr = trace(L, grid);
  assert.ok(tr.segs.length < 100);
});
