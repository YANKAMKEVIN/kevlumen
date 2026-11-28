import { beforeEach, describe, expect, test } from 'vitest';
import { trace } from '../../../src/engine/sim';
import { color } from './color-helper';
import { etat, REVEAL_DONE, showTrace, stepReveal } from '../../../src/view/state';
import { board } from '../helpers';

describe('apparition des rayons', () => {
  beforeEach(() => { etat.tr = null; etat.reveal = REVEAL_DONE; });

  test('au chargement, tout est redévoilé depuis les sources', () => {
    const { L, grid } = board(5, 1, [{ t: 'src', x: 0, y: 0, c: color.red, d: 0 }]);
    showTrace(trace(L, grid), true);
    expect(etat.reveal).toBe(0);
    expect(etat.maxDist).toBe(4.5);
  });

  test('seule la partie qui change est redévoilée, depuis l\'endroit où elle diverge', () => {
    const a = board(6, 3, [{ t: 'src', x: 0, y: 1, c: 1, d: 0 }]);
    showTrace(trace(a.L, a.grid), true);
    while (!stepReveal(1 / 60)) { /* on laisse tout apparaître */ }
    expect(etat.reveal).toBe(REVEAL_DONE);
    a.grid[1 * 6 + 3] = { t: 'mir', o: 0 }; // miroir en (3,1)
    showTrace(trace(a.L, a.grid));
    expect(etat.reveal).toBe(0); // le premier segment change de longueur : il repart de la source
  });

  test('un aperçu identique ne relance pas l\'animation', () => {
    const a = board(4, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }]);
    showTrace(trace(a.L, a.grid), true);
    while (!stepReveal(.05)) { /* */ }
    showTrace(trace(a.L, a.grid));
    expect(etat.reveal).toBe(REVEAL_DONE);
  });

  test('stepReveal finit toujours (16 cases par seconde)', () => {
    const a = board(9, 1, [{ t: 'src', x: 0, y: 0, c: 1, d: 0 }]);
    showTrace(trace(a.L, a.grid), true);
    let frames = 0;
    while (!stepReveal(1 / 60) && frames < 1000) frames++;
    expect(frames).toBeLessThan(60);
  });
});
