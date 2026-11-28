import { describe, expect, test } from 'vitest';
import { Board, checkSolution, solve, solveAny } from '../../../src/engine/solver';
import { LEVELS } from '../../../src/engine/levels';
import { startGrid } from '../../../src/engine/puzzle';
import { isWin, trace } from '../../../src/engine/sim';
import { level } from '../helpers';

describe('solveur sur de petits cas', () => {
  test('un miroir à poser au bon endroit', () => {
    const L = level({ w: 3, h: 3, cells: [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 2, y: 2, c: 1 }], tray: [{ t: 'mir' }] });
    const r = solve(L);
    expect(r.solution?.place).toEqual([{ x: 2, y: 0, t: 'mir', o: 1 }]);
    expect(checkSolution(L, r.solution?.place ?? [])).toBe(true);
  });

  test('un niveau impossible est déclaré impossible (sans abandon)', () => {
    const L = level({ w: 3, h: 1, cells: [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 2, y: 0, c: 4 }], tray: [{ t: 'mir' }] });
    const r = solve(L);
    expect(r.solution).toBeNull();
    expect(r.aborted).toBe(false);
  });

  test('budget épuisé : abandon signalé', () => {
    const L = level({ w: 6, h: 6, cells: [{ t: 'src', x: 0, y: 0, c: 7, d: 0 }, { t: 'crys', x: 5, y: 5, c: 4 }, { t: 'dark', x: 5, y: 0 }], tray: [{ t: 'mir' }, { t: 'mir' }, { t: 'spl' }, { t: 'pri' }] });
    const r = solve(L, { maxNodes: 3 });
    expect(r.aborted).toBe(true);
    expect(r.solution).toBeNull();
  });

  test('pièce fixe orientable : le solveur trouve la bonne orientation', () => {
    const L = level({ w: 3, h: 3, cells: [{ t: 'src', x: 0, y: 0, c: 2, d: 0 }, { t: 'mir', x: 2, y: 0, o: 0, rot: 1 }, { t: 'crys', x: 2, y: 2, c: 2 }] });
    const r = solveAny(L);
    expect(r.solution).toEqual({ place: [], rotate: [{ x: 2, y: 0, o: 1 }] });
  });

  test('les deux stratégies trouvent une solution', () => {
    const L = level({ w: 4, h: 4, cells: [{ t: 'src', x: 0, y: 0, c: 7, d: 0 }, { t: 'crys', x: 3, y: 3, c: 7 }, { t: 'wall', x: 3, y: 0 }], tray: [{ t: 'mir' }, { t: 'mir' }] });
    for (const strategy of ['near', 'far'] as const) {
      const r = solve(L, { strategy });
      expect(r.solution && checkSolution(L, r.solution.place, r.solution.rotate), strategy).toBe(true);
    }
  });
});

describe('simulation compacte du solveur (Board.probe)', () => {
  const probe = (L: ReturnType<typeof level>, empty: number[] = [], sign = 1) => {
    const g = startGrid(L);
    for (const c of g) if (c && c.t === 'src') c.o = c.d;
    const b = new Board(L, g);
    for (const i of empty) b.empty[i] = 1;
    return b.probe(sign);
  };

  test('gagné exactement quand trace() et isWin() le disent, sur les 30 niveaux résolus', () => {
    for (const L of LEVELS) {
      const g = startGrid(L);
      for (const s of L.sol) g[s.y * L.w + s.x] = { t: s.t ?? '', o: s.o, c: s.c };
      for (const r of L.solRot || []) { const c = g[r.y * L.w + r.x]; if (c) c.o = r.o; }
      const want = isWin(L, g, trace(L, g));
      for (const c of g) if (c && c.t === 'src') c.o = c.d;
      expect(new Board(L, g).probe(1).win, L.name).toBe(want);
    }
  });

  test('frontière : case vide éclairée la plus proche, ou la plus lointaine', () => {
    const L = level({ w: 4, h: 1, cells: [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }] });
    expect(probe(L).frontier).toBe(1);
    expect(probe(L, [], -1).frontier).toBe(3);
    expect(probe(L, [1]).frontier).toBe(2);
    expect(probe(L, [1, 2, 3]).frontier).toBe(-1);
  });

  test('un rayon définitif sur un cristal d\'ombre condamne la branche', () => {
    const L = level({ w: 3, h: 1, cells: [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'dark', x: 2, y: 0 }] });
    expect(probe(L).doomed).toBe(false); // la case du milieu peut encore recevoir une pièce
    expect(probe(L, [1]).doomed).toBe(true); // déclarée vide : plus rien n'arrêtera le rayon
  });

  test('une couleur en trop par un rayon définitif condamne la branche', () => {
    const L = level({ w: 2, h: 1, cells: [{ t: 'src', x: 0, y: 0, c: 3, d: 0 }, { t: 'crys', x: 1, y: 0, c: 1 }] });
    expect(probe(L).doomed).toBe(true);
  });

  test('une couleur manquante ne condamne pas (un autre rayon peut l\'apporter)', () => {
    const L = level({ w: 2, h: 1, cells: [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 1, y: 0, c: 3 }] });
    const r = probe(L);
    expect(r.doomed).toBe(false);
    expect(r.win).toBe(false);
  });
});
