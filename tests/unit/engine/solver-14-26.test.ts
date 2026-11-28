// Le solveur résout seul les niveaux 14 à 26, sans regarder la solution enregistrée.
// (Les 30 niveaux sont répartis en trois fichiers pour que Vitest les lance en parallèle.)
import { expect, test } from 'vitest';
import { LEVELS } from '../../../src/engine/levels';
import { checkSolution, solveAny } from '../../../src/engine/solver';

const IDS = LEVELS.map((L, i) => [i + 1, L.name] as const).slice(14 - 1, 26);

test.each(IDS)('niveau %i « %s » : le solveur trouve une solution valide', (n) => {
  const L = LEVELS[n - 1];
  const r = solveAny(L);
  expect(r.solution, `${r.nodes} états explorés`).not.toBeNull();
  if (!r.solution) return;
  expect(checkSolution(L, r.solution.place, r.solution.rotate)).toBe(true);
  // une solution n'utilise jamais plus de pièces que la réserve n'en contient
  expect(r.solution.place.length).toBeLessThanOrEqual(L.tray.length);
}, 60_000);
