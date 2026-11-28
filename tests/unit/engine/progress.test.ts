import { describe, expect, test } from 'vitest';
import { maxUnlocked, nextUnfinished, recordWin, starsFor, totals, UNLOCK_AHEAD } from '../../../src/engine/progress';

const prog = (done: Record<string, number> = {}) => ({ done });

describe('progression', () => {
  test('étoiles : 3 sans indice, 2 avec un, 1 au-delà', () => {
    expect([0, 1, 2, 3, 10].map(starsFor)).toEqual([3, 2, 1, 1, 1]);
  });

  test('recordWin garde le meilleur score', () => {
    const p = prog();
    expect(recordWin(p, 4, 1)).toBe(2);
    expect(p.done[4]).toBe(2);
    expect(recordWin(p, 4, 0)).toBe(3);
    expect(recordWin(p, 4, 5)).toBe(1);
    expect(p.done[4]).toBe(3);
  });

  test('au début, 3 niveaux ouverts ; chaque victoire ouvre la suite', () => {
    expect(UNLOCK_AHEAD).toBe(3);
    expect(maxUnlocked(prog(), 30)).toBe(2);
    expect(maxUnlocked(prog({ 0: 1 }), 30)).toBe(3);
    expect(maxUnlocked(prog({ 10: 1 }), 30)).toBe(13);
    expect(maxUnlocked(prog({ 28: 3 }), 30)).toBe(29);
  });

  test('niveau suivant : le premier pas encore réussi, sinon le premier', () => {
    expect(nextUnfinished(prog(), 30)).toBe(0);
    expect(nextUnfinished(prog({ 0: 3, 1: 1, 3: 2 }), 30)).toBe(2);
    const all = prog(); for (let i = 0; i < 30; i++) all.done[i] = 1;
    expect(nextUnfinished(all, 30)).toBe(0);
  });

  test('totaux : niveaux réussis et étoiles', () => {
    expect(totals(prog({ 0: 3, 1: 2, 7: 1 }))).toEqual({ done: 3, stars: 6 });
    expect(totals(prog())).toEqual({ done: 0, stars: 0 });
  });
});
