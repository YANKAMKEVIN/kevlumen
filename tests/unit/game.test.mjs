import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etat, playSolution, keyOf } from './helpers.mjs';
import { LEVELS, CHAPTERS } from '../../src/levels.js';
import { trace, isWin } from '../../src/sim.js';
import { loadLevel, placePiece, returnPiece, rotatePiece, undo, resetLvl, showHint, starsFor, recordWin, nextUnfinished, maxUnlocked } from '../../src/game.js';
import { save } from '../../src/save.js';

const won = () => isWin(etat.L, etat.grid, trace(etat.L, etat.grid));

test('30 niveaux répartis en 6 chapitres qui se suivent', () => {
  assert.equal(LEVELS.length, 30);
  assert.equal(CHAPTERS.length, 6);
  assert.equal(CHAPTERS[0][1], 0);
  for (let i = 1; i < CHAPTERS.length; i++) assert.equal(CHAPTERS[i][1], CHAPTERS[i - 1][2]);
  assert.equal(CHAPTERS.at(-1)[2], LEVELS.length);
});

test('chaque niveau est bien formé : nom, pièces dans le plateau, au moins un cristal et une source', () => {
  LEVELS.forEach((L, i) => {
    assert.ok(L.name && typeof L.hint === 'string', `niveau ${i + 1}`);
    const seen = new Set();
    for (const c of L.cells) {
      assert.ok(c.x >= 0 && c.y >= 0 && c.x < L.w && c.y < L.h, `niveau ${i + 1} : pièce hors plateau`);
      const k = c.y * L.w + c.x; assert.ok(!seen.has(k), `niveau ${i + 1} : deux pièces sur une case`); seen.add(k);
    }
    assert.ok(L.cells.some(c => c.t === 'src') && L.cells.some(c => c.t === 'crys'), `niveau ${i + 1}`);
    // la réserve contient au moins les pièces de la solution (il peut y avoir des leurres, ex. niveau 22)
    const have = L.tray.map(keyOf);
    for (const k of L.sol.map(keyOf)) { const j = have.indexOf(k); assert.ok(j >= 0, `niveau ${i + 1} : ${k} manque dans la réserve`); have.splice(j, 1); }
  });
});

test('aucun niveau n\'est gagné avant d\'avoir joué', () => {
  LEVELS.forEach((_, i) => { loadLevel(i); assert.equal(won(), false, `niveau ${i + 1}`); });
});

test('chaque niveau se résout en jouant sa solution avec les vraies règles', () => {
  LEVELS.forEach((_, i) => { playSolution(i); assert.ok(won(), `niveau ${i + 1}`); });
});

test('poser une pièce la retire de la réserve ; la reprendre l\'y remet', () => {
  loadLevel(0);
  assert.equal(etat.tray[0].n, 1);
  placePiece({ t: 'mir' }, 0, 0, 0, false);
  assert.equal(etat.tray[0].n, 0);
  assert.equal(etat.grid[0].t, 'mir');
  assert.equal(etat.moves, 1);
  etat.grid[0] = null; returnPiece({ t: 'mir' });
  assert.equal(etat.tray[0].n, 1);
  assert.equal(etat.moves, 2);
});

test('toucher un miroir le fait pivoter ; une source ne pivote pas', () => {
  loadLevel(0);
  placePiece({ t: 'mir' }, 0, 0, 0, false);
  rotatePiece(etat.grid[0]); assert.equal(etat.grid[0].o, 1);
  rotatePiece(etat.grid[0]); assert.equal(etat.grid[0].o, 0);
  const src = etat.grid.find(g => g && g.t === 'src'); const d = src.d;
  const m = etat.moves; rotatePiece(src); assert.equal(src.d, d); assert.equal(etat.moves, m);
});

test('annuler défait les coups un par un, jusqu\'au plateau de départ', () => {
  loadLevel(0);
  placePiece({ t: 'mir' }, 0, 24, 0, false);
  undo();
  assert.equal(etat.grid[24], null);
  assert.equal(etat.tray[0].n, 1);
  assert.equal(etat.moves, 0);
  undo(); // rien à annuler : pas d'erreur
  assert.equal(etat.hist.length, 0);
});

test('recommencer remet le niveau à zéro', () => {
  playSolution(3);
  resetLvl();
  assert.equal(etat.moves, 0);
  assert.equal(won(), false);
});

test('indice : montre la première pièce de la solution, coûte une étoile', () => {
  loadLevel(0);
  showHint();
  const s = etat.L.sol[0];
  assert.equal(etat.hint.i, s.y * etat.L.w + s.x);
  assert.equal(etat.hint.t, s.t);
  assert.equal(etat.hintsUsed, 1);
  assert.equal(starsFor(0), 3); assert.equal(starsFor(1), 2); assert.equal(starsFor(4), 1);
});

test('indice : désigne une pièce en trop qui gêne', () => {
  loadLevel(0);
  const s = etat.L.sol[0];
  const wrong = etat.grid.findIndex((g, i) => !g && i !== s.y * etat.L.w + s.x);
  placePiece({ t: 'mir' }, s.o, wrong, 0, false);
  etat.hint = null; showHint();
  assert.equal(etat.hint.i, s.y * etat.L.w + s.x, 'd\'abord la bonne case');
});

test('partie complète : les 30 niveaux, étoiles et déblocage', () => {
  for (const k of Object.keys(save.done)) delete save.done[k];
  assert.equal(nextUnfinished(), 0);
  assert.equal(maxUnlocked(), 2, 'au début, 3 niveaux ouverts');
  for (let i = 0; i < LEVELS.length; i++) {
    assert.ok(i <= maxUnlocked(), `niveau ${i + 1} ouvert à temps`);
    playSolution(i);
    assert.ok(won(), `niveau ${i + 1}`);
    if (i === 5) { etat.hintsUsed = 1; }
    const st = recordWin();
    assert.equal(st, i === 5 ? 2 : 3);
  }
  assert.equal(Object.keys(save.done).length, 30);
  assert.equal(save.done[5], 2);
  // rejouer mieux garde le meilleur score
  playSolution(5); etat.hintsUsed = 0; recordWin(); assert.equal(save.done[5], 3);
  playSolution(5); etat.hintsUsed = 3; recordWin(); assert.equal(save.done[5], 3);
  assert.equal(nextUnfinished(), 0, 'tout fini : on revient au premier');
});
