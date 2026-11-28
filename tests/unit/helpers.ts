// Outils communs aux tests unitaires : on joue avec le vrai moteur (src/engine), sans navigateur.
import { LEVELS } from '../../src/engine/levels';
import { Puzzle, pieceKey, type PuzzleEvent } from '../../src/engine/puzzle';
import type { KVStore } from '../../src/engine/save';
import type { Cell, Grid, Level } from '../../src/engine/types';

/** localStorage en mémoire. */
export function memStore(init: Record<string, string> = {}): KVStore & { m: Map<string, string> } {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    m,
  };
}

/** Plateau w×h à partir d'une liste de pièces {t,x,y,...}. */
export function board(w: number, h: number, cells: (Cell & { x: number; y: number })[]): { L: { w: number; h: number }; grid: Grid } {
  const grid: Grid = new Array(w * h).fill(null);
  for (const c of cells) grid[c.y * w + c.x] = { ...c };
  return { L: { w, h }, grid };
}

/** Niveau minimal pour tester le moteur. */
export function level(partial: Partial<Level> & Pick<Level, 'w' | 'h' | 'cells'>): Level {
  return { tray: [], sol: [], solRot: [], name: 'test', hint: '', ...partial };
}

/** Joue la solution enregistrée du niveau i comme un joueur : prend chaque pièce dans la réserve,
 * la pose, la tourne jusqu'à la bonne orientation, puis tourne les pièces fixes orientables.
 * hints : nombre d'indices demandés avant de commencer. */
export function playSolution(i: number, onEvent?: (e: PuzzleEvent) => void, hints = 0): Puzzle {
  const p = new Puzzle(LEVELS[i], i, onEvent);
  for (let h = 0; h < hints; h++) p.useHint();
  const L = p.level;
  for (const s of L.sol) {
    const k = pieceKey({ t: s.t ?? '', c: s.c });
    const slot = p.tray.findIndex(t => t.k === k && t.n > 0);
    if (slot < 0) throw new Error(`niveau ${i + 1} : pièce ${k} absente de la réserve`);
    const idx = p.idx(s.x, s.y);
    // un prisme se pose déjà tourné vers le rayon dans le jeu ; ici on part de 0 et on tourne
    if (!p.place({ t: s.t ?? '', c: s.c }, 0, idx, slot)) throw new Error(`niveau ${i + 1} : pose refusée en ${s.x},${s.y}`);
    for (let r = 0; r < 4 && s.t !== 'flt' && p.grid[idx]?.o !== s.o; r++) p.rotateAt(idx);
  }
  for (const s of L.solRot || []) {
    const idx = p.idx(s.x, s.y);
    for (let r = 0; r < 4 && p.grid[idx]?.o !== s.o; r++) p.rotateAt(idx);
  }
  return p;
}
