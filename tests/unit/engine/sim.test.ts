import { describe, expect, test } from 'vitest';
import { bits, incomingDir, isWin, MIR, trace } from '../../../src/engine/sim';
import type { Trace } from '../../../src/engine/types';
import { board } from '../helpers';

const got = (tr: Trace, w: number, x: number, y: number): number => tr.hits.get(y * w + x) || 0;

describe('propagation des rayons', () => {
  test('un rayon file tout droit jusqu\'au cristal', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
    const tr = trace(L, grid);
    expect(got(tr, 5, 4, 0)).toBe(1);
    expect(isWin(L, grid, tr)).toBe(true);
  });

  test.each([
    [0, 'droite', 4, 2], [1, 'bas', 2, 4], [2, 'gauche', 0, 2], [3, 'haut', 2, 0],
  ])('une source tournée vers %i (%s) éclaire le bord', (d, _nom, x, y) => {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 2, y: 2, c: 7, d }]);
    const tr = trace(L, grid);
    expect(tr.lit.has(y * 5 + x)).toBe(true);
    expect(tr.segs).toHaveLength(1);
  });

  test('le segment qui sort du plateau s\'arrête à mi-case au bord', () => {
    const { L, grid } = board(4, 1, [{ t: 'src', x: 0, y: 0, c: 2, d: 0 }]);
    const [s] = trace(L, grid).segs;
    expect(s).toEqual([0, 0, 3.5, 0, 2, 0, 3.5]);
  });

  test('un mur arrête la lumière', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'wall', x: 2, y: 0 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
    const tr = trace(L, grid);
    expect(got(tr, 5, 4, 0)).toBe(0);
    expect(tr.lit.has(3)).toBe(false);
    expect(isWin(L, grid, tr)).toBe(false);
  });

  test('une source arrête un rayon comme un mur', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'src', x: 3, y: 0, c: 4, d: 2 }]);
    const tr = trace(L, grid);
    expect(tr.segs.every(s => s[2] > 0 && s[2] < 3)).toBe(true);
  });

  test('distance d\'arrivée sur un cristal : le plus court des rayons', () => {
    const { L, grid } = board(7, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'src', x: 6, y: 0, c: 4, d: 2 }, { t: 'crys', x: 2, y: 0, c: 5 }]);
    const tr = trace(L, grid);
    expect(tr.hd.get(2)).toBe(2);
    expect(got(tr, 7, 2, 0)).toBe(5);
  });
});

describe('miroirs', () => {
  test('la table de réflexion est une involution (un rayon peut revenir sur ses pas)', () => {
    for (const o of [0, 1]) for (let d = 0; d < 4; d++) {
      const out = MIR[o][d];
      expect(MIR[o][(out + 2) % 4]).toBe((d + 2) % 4);
      expect(out % 2).not.toBe(d % 2);
    }
  });

  test('miroir : renvoie à angle droit selon son orientation', () => {
    // rayon vers la droite, miroir en (2,2) ; o=0 '/' renvoie vers le haut, o=1 '\' vers le bas
    for (const [o, cy] of [[0, 0], [1, 4]]) {
      const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 4, d: 0 }, { t: 'mir', x: 2, y: 2, o }, { t: 'crys', x: 2, y: cy, c: 4 }]);
      expect(got(trace(L, grid), 5, 2, cy)).toBe(4);
    }
  });

  test.each([[1, 0, 2], [3, 1, 2]])('rayon vers %i sur un miroir o=%i : repart vers %i', (d, o, out) => {
    expect(MIR[o][d]).toBe(out);
  });

  test('deux miroirs font faire demi-tour par un U', () => {
    const { L, grid } = board(5, 3, [
      { t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'mir', x: 3, y: 0, o: 1 }, { t: 'mir', x: 3, y: 2, o: 0 }, { t: 'crys', x: 0, y: 2, c: 1 },
    ]);
    const tr = trace(L, grid);
    expect(got(tr, 5, 0, 2)).toBe(1);
    expect(isWin(L, grid, tr)).toBe(true);
  });
});

describe('séparateur, couleurs, filtre, prisme, ombre', () => {
  test('séparateur : le rayon passe et se reflète en même temps', () => {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 2, d: 0 }, { t: 'spl', x: 2, y: 2, o: 0 }, { t: 'crys', x: 4, y: 2, c: 2 }, { t: 'crys', x: 2, y: 0, c: 2 }]);
    const tr = trace(L, grid);
    expect(got(tr, 5, 4, 2)).toBe(2);
    expect(got(tr, 5, 2, 0)).toBe(2);
    expect(isWin(L, grid, tr)).toBe(true);
  });

  test.each([[1, 4, 5, 'magenta'], [1, 2, 3, 'jaune'], [2, 4, 6, 'cyan']])('les couleurs s\'additionnent : %i + %i = %i (%s)', (a, b, sum) => {
    const { L, grid } = board(5, 3, [{ t: 'src', x: 0, y: 1, c: a, d: 0 }, { t: 'src', x: 4, y: 1, c: b, d: 2 }, { t: 'crys', x: 2, y: 1, c: sum }]);
    const tr = trace(L, grid);
    expect(got(tr, 5, 2, 1)).toBe(sum);
    expect(isWin(L, grid, tr)).toBe(true);
  });

  test('trois sources primaires font du blanc', () => {
    const { L, grid } = board(5, 5, [
      { t: 'src', x: 0, y: 2, c: 1, d: 0 }, { t: 'src', x: 4, y: 2, c: 2, d: 2 }, { t: 'src', x: 2, y: 0, c: 4, d: 1 }, { t: 'crys', x: 2, y: 2, c: 7 },
    ]);
    expect(isWin(L, grid, trace(L, grid))).toBe(true);
  });

  test('un cristal qui reçoit une couleur en trop reste éteint', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 3, d: 0 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
    expect(isWin(L, grid, trace(L, grid))).toBe(false);
  });

  test('un cristal qui ne reçoit qu\'une partie de sa couleur reste éteint', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 4, y: 0, c: 3 }]);
    expect(isWin(L, grid, trace(L, grid))).toBe(false);
  });

  test('filtre : ne laisse passer que sa couleur', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 7, d: 0 }, { t: 'flt', x: 2, y: 0, c: 2 }, { t: 'crys', x: 4, y: 0, c: 2 }]);
    expect(got(trace(L, grid), 5, 4, 0)).toBe(2);
    const b2 = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'flt', x: 2, y: 0, c: 2 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
    expect(got(trace(b2.L, b2.grid), 5, 4, 0)).toBe(0);
  });

  test('filtre composé : un filtre jaune laisse passer le rouge et le vert d\'un blanc', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 7, d: 0 }, { t: 'flt', x: 2, y: 0, c: 3 }, { t: 'crys', x: 4, y: 0, c: 3 }]);
    expect(got(trace(L, grid), 5, 4, 0)).toBe(3);
  });

  test('prisme : rouge à gauche, vert tout droit, bleu à droite, seulement par l\'arrière', () => {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 7, d: 0 }, { t: 'pri', x: 2, y: 2, o: 0 }]);
    const tr = trace(L, grid);
    const seg = (c: number) => tr.segs.filter(s => s[4] === c && s[0] === 2 && s[1] === 2)[0];
    expect(seg(1)[3]).toBeLessThan(2); // rouge vers le haut (à gauche du sens de marche)
    expect(seg(2)[2]).toBeGreaterThan(2); // vert continue
    expect(seg(4)[3]).toBeGreaterThan(2); // bleu vers le bas
    for (const o of [1, 2, 3]) {
      const b = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 7, d: 0 }, { t: 'pri', x: 2, y: 2, o }]);
      expect(trace(b.L, b.grid).segs, `prisme o=${o}`).toHaveLength(1);
    }
  });

  test('prisme : un rayon rouge seul ne donne que du rouge', () => {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 1, d: 0 }, { t: 'pri', x: 2, y: 2, o: 0 }]);
    const out = trace(L, grid).segs.filter(s => s[0] === 2 && s[1] === 2);
    expect(out.map(s => s[4])).toEqual([1]);
  });

  test('cristal d\'ombre : la partie est perdue s\'il est éclairé', () => {
    const a = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'dark', x: 4, y: 0 }]);
    expect(isWin(a.L, a.grid, trace(a.L, a.grid))).toBe(false);
    const b = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'wall', x: 2, y: 0 }, { t: 'dark', x: 4, y: 0 }]);
    expect(isWin(b.L, b.grid, trace(b.L, b.grid))).toBe(true);
  });

  test('un cristal arrête le rayon', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }, { t: 'crys', x: 2, y: 0, c: 1 }, { t: 'crys', x: 4, y: 0, c: 1 }]);
    const tr = trace(L, grid);
    expect(got(tr, 5, 4, 0)).toBe(0);
  });
});

describe('robustesse', () => {
  test('une boucle de miroirs ne bloque pas le calcul', () => {
    const { L, grid } = board(4, 4, [{ t: 'src', x: 0, y: 1, c: 1, d: 0 }, { t: 'spl', x: 1, y: 1, o: 1 }, { t: 'mir', x: 1, y: 3, o: 0 }, { t: 'mir', x: 3, y: 3, o: 1 }, { t: 'mir', x: 3, y: 1, o: 0 }]);
    expect(trace(L, grid).segs.length).toBeLessThan(100);
  });

  test('plateau sans source : aucun rayon, et victoire si aucun cristal', () => {
    const { L, grid } = board(3, 3, [{ t: 'wall', x: 1, y: 1 }]);
    const tr = trace(L, grid);
    expect(tr.segs).toHaveLength(0);
    expect(isWin(L, grid, tr)).toBe(true);
  });

  test('trace() ne modifie pas le plateau', () => {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 7, d: 0 }, { t: 'pri', x: 2, y: 2, o: 0 }, { t: 'spl', x: 3, y: 2, o: 1 }]);
    const before = JSON.stringify(grid);
    trace(L, grid);
    expect(JSON.stringify(grid)).toBe(before);
  });

  test('bits() compte les couleurs primaires', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(bits)).toEqual([0, 1, 1, 2, 1, 2, 2, 3]);
  });

  test('incomingDir : direction du rayon le plus riche qui entre dans une case', () => {
    const { L, grid } = board(5, 5, [{ t: 'src', x: 0, y: 2, c: 7, d: 0 }, { t: 'src', x: 2, y: 0, c: 1, d: 1 }]);
    const tr = trace(L, grid);
    expect(incomingDir(L, tr, 2 * 5 + 2)).toBe(0); // le blanc (3 couleurs) gagne sur le rouge
    expect(incomingDir(L, tr, 1 * 5 + 2)).toBe(1);
    expect(incomingDir(L, tr, 4 * 5 + 4)).toBe(-1);
  });
});
