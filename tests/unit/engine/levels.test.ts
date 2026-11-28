import { describe, expect, test } from 'vitest';
import { CHAPTERS, LEVELS } from '../../../src/engine/levels';
import { pieceKey } from '../../../src/engine/puzzle';
import { NB_NIVEAUX } from '../../../src/engine/save';
import { checkSolution } from '../../../src/engine/solver';

const KINDS = ['src', 'crys', 'dark', 'wall', 'mir', 'spl', 'pri', 'flt'];

describe('les niveaux', () => {
  test('30 niveaux répartis en 6 chapitres qui se suivent sans trou', () => {
    expect(LEVELS).toHaveLength(30);
    expect(NB_NIVEAUX).toBe(LEVELS.length);
    expect(CHAPTERS).toHaveLength(6);
    expect(CHAPTERS[0][1]).toBe(0);
    for (let i = 1; i < CHAPTERS.length; i++) expect(CHAPTERS[i][1]).toBe(CHAPTERS[i - 1][2]);
    expect(CHAPTERS[CHAPTERS.length - 1][2]).toBe(LEVELS.length);
  });

  test('les noms des niveaux sont uniques', () => {
    expect(new Set(LEVELS.map(L => L.name)).size).toBe(LEVELS.length);
  });

  test('les plateaux grandissent avec les chapitres (de 5×5 à 9×9)', () => {
    expect(LEVELS[0].w).toBe(5);
    expect(LEVELS[LEVELS.length - 1].w).toBe(9);
    for (const L of LEVELS) { expect(L.w).toBe(L.h); expect(L.w).toBeGreaterThanOrEqual(5); expect(L.w).toBeLessThanOrEqual(9); }
  });

  test.each(LEVELS.map((L, i) => [i + 1, L.name, i] as const))('niveau %i « %s » bien formé', (_n, _name, i) => {
    const L = LEVELS[i];
    expect(L.name).toBeTruthy();
    expect(typeof L.hint).toBe('string');
    const seen = new Set<number>();
    for (const c of L.cells) {
      expect(KINDS).toContain(c.t);
      expect(c.x >= 0 && c.y >= 0 && c.x < L.w && c.y < L.h, 'pièce hors plateau').toBe(true);
      const k = c.y * L.w + c.x;
      expect(seen.has(k), 'deux pièces sur une case').toBe(false);
      seen.add(k);
      if (c.t === 'src') { expect(c.d).toBeGreaterThanOrEqual(0); expect(c.d).toBeLessThan(4); expect(c.c).toBeGreaterThan(0); }
      if (c.t === 'crys') expect(c.c).toBeGreaterThan(0);
    }
    expect(L.cells.some(c => c.t === 'src')).toBe(true);
    expect(L.cells.some(c => c.t === 'crys')).toBe(true);
    // la réserve contient au moins les pièces de la solution (il peut y avoir des leurres, ex. niveau 22)
    const have = L.tray.map(pieceKey);
    for (const k of L.sol.map(s => pieceKey({ t: s.t ?? '', c: s.c }))) {
      const j = have.indexOf(k);
      expect(j, `${k} manque dans la réserve`).toBeGreaterThanOrEqual(0);
      have.splice(j, 1);
    }
    // les pièces à tourner de la solution sont bien des pièces fixes orientables
    for (const r of L.solRot || []) expect(L.cells.find(c => c.x === r.x && c.y === r.y)?.rot).toBeTruthy();
  });

  test.each(LEVELS.map((L, i) => [i + 1, L.name, i] as const))('niveau %i « %s » : la solution enregistrée gagne', (_n, _name, i) => {
    const L = LEVELS[i];
    expect(checkSolution(L, L.sol, L.solRot)).toBe(true);
  });

  test('aucun niveau n\'est déjà gagné sans rien poser ni tourner', () => {
    LEVELS.forEach((L, i) => expect(checkSolution(L, [], []), `niveau ${i + 1}`).toBe(false));
  });
});

describe('checkSolution() refuse les solutions tricheuses', () => {
  const L = LEVELS[0];
  test('pièce absente de la réserve', () => expect(checkSolution(L, [{ x: 4, y: 4, t: 'spl', o: 0 }])).toBe(false));
  test('pièce en double', () => expect(checkSolution(L, [...L.sol, { x: 0, y: 4, t: 'mir', o: 0 }])).toBe(false));
  test('case occupée', () => expect(checkSolution(L, [{ x: 2, y: 4, t: 'mir', o: 0 }])).toBe(false));
  test('hors plateau', () => expect(checkSolution(L, [{ x: 9, y: 0, t: 'mir', o: 0 }])).toBe(false));
  test('rotation d\'une pièce qui n\'est pas orientable', () => expect(checkSolution(L, L.sol, [{ x: 2, y: 4, o: 1 }])).toBe(false));
});
