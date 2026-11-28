import { describe, expect, test } from 'vitest';
import { angFor, animOf, bump, nextTarget, popIn, stepAnim } from '../../../src/view/anim';
import type { Cell } from '../../../src/engine/types';

const Q = Math.PI / 2;

describe('angles des pièces', () => {
  test('angle d\'affichage selon la sorte et l\'orientation', () => {
    expect(angFor({ t: 'mir', o: 0 })).toBeCloseTo(-Math.PI / 4);
    expect(angFor({ t: 'spl', o: 1 })).toBeCloseTo(Math.PI / 4);
    expect(angFor({ t: 'pri', o: 3 })).toBeCloseTo(3 * Q);
    expect(angFor({ t: 'src', d: 2 })).toBeCloseTo(Math.PI);
    expect(angFor({ t: 'crys' })).toBe(0);
  });

  test('un miroir tourne toujours d\'un quart de tour vers l\'avant', () => {
    let ta = angFor({ t: 'mir', o: 0 });
    for (let k = 1; k <= 6; k++) {
      const next = nextTarget(ta, { t: 'mir', o: k % 2 });
      expect(next - ta).toBeCloseTo(Q);
      ta = next;
    }
  });

  test('un prisme avance d\'un quart de tour, et recule quand on annule', () => {
    expect(nextTarget(0, { t: 'pri', o: 1 })).toBeCloseTo(Q);
    expect(nextTarget(3 * Q, { t: 'pri', o: 0 })).toBeCloseTo(4 * Q);
    expect(nextTarget(Q, { t: 'pri', o: 0 })).toBeCloseTo(0);
  });

  test('animOf suit l\'orientation du moteur et anime vers la cible', () => {
    const cell: Cell = { t: 'pri', o: 0 };
    const an = animOf(cell);
    expect(an.a).toBe(0);
    cell.o = 1;
    expect(animOf(cell).ta).toBeCloseTo(Q);
    for (let k = 0; k < 60; k++) stepAnim(an, 1 / 60);
    expect(an.a).toBeCloseTo(Q, 2);
  });

  test('rebonds : une pièce rendue par annulation grossit puis revient ; un toucher sans effet recule', () => {
    const cell: Cell = { t: 'mir', o: 0 };
    popIn(cell, 1);
    expect(animOf(cell).pop).toBe(1);
    for (let k = 0; k < 120; k++) stepAnim(animOf(cell), 1 / 60);
    expect(Math.abs(animOf(cell).pop)).toBeLessThan(.01);
    bump(cell);
    expect(animOf(cell).pop).toBe(-.15);
  });
});
