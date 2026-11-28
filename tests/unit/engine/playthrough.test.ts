// Parcours complet sans navigateur : les 30 niveaux joués dans l'ordre avec le vrai moteur,
// étoiles, déblocage et sauvegarde relue après chaque niveau (comme un rechargement de page).
import { expect, test } from 'vitest';
import { LEVELS } from '../../../src/engine/levels';
import { maxUnlocked, nextUnfinished, recordWin, totals } from '../../../src/engine/progress';
import { KEY, load, write } from '../../../src/engine/save';
import { memStore, playSolution } from '../helpers';

test('partie complète : les 30 niveaux, étoiles, déblocage, sauvegarde relue', () => {
  const store = memStore();
  let save = load(store);
  expect(nextUnfinished(save, LEVELS.length)).toBe(0);
  expect(maxUnlocked(save, LEVELS.length)).toBe(2);
  let level = nextUnfinished(save, LEVELS.length);
  for (let n = 0; n < LEVELS.length; n++) {
    expect(level, 'on joue les niveaux dans l\'ordre').toBe(n);
    expect(level).toBeLessThanOrEqual(maxUnlocked(save, LEVELS.length));
    const p = playSolution(level, undefined, level === 5 ? 1 : 0); // un indice coûte une étoile
    expect(p.declareWin(), `niveau ${level + 1}`).toBe(true);
    const st = recordWin(save, level, p.hintsUsed);
    expect(st).toBe(level === 5 ? 2 : 3);
    expect(write(store, save)).toBe(true);
    save = load(store); // « rechargement »
    level = level + 1 < LEVELS.length ? nextUnfinished(save, LEVELS.length) : level;
  }
  expect(totals(save)).toEqual({ done: 30, stars: 89 });
  expect(maxUnlocked(save, LEVELS.length)).toBe(29);
  expect(nextUnfinished(save, LEVELS.length), 'tout fini : on revient au premier').toBe(0);
  // rejouer mieux garde le meilleur score
  const p = playSolution(5); p.declareWin();
  recordWin(save, 5, p.hintsUsed); write(store, save);
  expect(load(store).done[5]).toBe(3);
  expect(JSON.parse(store.getItem(KEY) as string).version).toBe(2);
});

test('chaque niveau gagné compte au moins un coup par pièce posée', () => {
  LEVELS.forEach((L, i) => {
    const p = playSolution(i);
    expect(p.moves, `niveau ${i + 1}`).toBeGreaterThanOrEqual(L.sol.length + (L.solRot?.length ? 1 : 0));
  });
});
