// Outils communs aux tests unitaires : on joue avec les vraies règles (src/game.js), sans navigateur.
import { etat } from '../../src/state.js';
import { loadLevel, placePiece, rotatePiece } from '../../src/game.js';

export { etat };

/** localStorage en mémoire. */
export function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}

/** Clé de réserve d'une pièce (comme le jeu : les filtres sont rangés par couleur). */
export const keyOf = p => p.t === 'flt' ? 'flt' + p.c : p.t;

/** Joue la solution du niveau i comme un joueur : prend chaque pièce dans la réserve, la pose, la tourne
 * jusqu'à la bonne orientation, puis tourne les pièces fixes orientables. Renvoie le nombre de coups. */
export function playSolution(i) {
  loadLevel(i);
  const L = etat.L;
  for (const s of L.sol) {
    const slot = etat.tray.findIndex(t => t.k === keyOf(s) && t.n > 0);
    if (slot < 0) throw new Error(`niveau ${i + 1} : pièce ${keyOf(s)} absente de la réserve`);
    const idx = s.y * L.w + s.x;
    // un prisme se pose déjà tourné vers le rayon dans le jeu ; ici on part de 0 et on tourne
    placePiece({ t: s.t, c: s.c }, 0, idx, slot, false);
    for (let r = 0; r < 4 && s.t !== 'flt' && etat.grid[idx].o !== s.o; r++) rotatePiece(etat.grid[idx]);
  }
  for (const s of L.solRot || []) {
    const g = etat.grid[s.y * L.w + s.x];
    for (let r = 0; r < 4 && g.o !== s.o; r++) rotatePiece(g);
  }
  return etat.moves;
}
