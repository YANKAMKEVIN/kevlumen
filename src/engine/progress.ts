/** Progression : étoiles, déblocage des niveaux, niveau suivant. Fonctions pures sur la sauvegarde. */
import type { Progress } from './save';

/** Nombre de niveaux ouverts d'avance au-delà du plus loin réussi. */
export const UNLOCK_AHEAD = 3;

/** Étoiles : 3 sans indice, 2 avec un, 1 au-delà. */
export function starsFor(hints: number): number { return hints === 0 ? 3 : hints === 1 ? 2 : 1; }

/** Enregistre une victoire (garde le meilleur score) ; renvoie les étoiles de cette partie. */
export function recordWin(p: Progress, level: number, hints: number): number {
  const st = starsFor(hints);
  p.done[level] = Math.max(p.done[level] || 0, st);
  return st;
}

/** Premier niveau pas encore réussi (0 si tout est fini). */
export function nextUnfinished(p: Progress, count: number): number {
  for (let i = 0; i < count; i++) if (!p.done[i]) return i;
  return 0;
}

/** Plus haut niveau jouable (les UNLOCK_AHEAD suivants le plus loin réussi sont ouverts). */
export function maxUnlocked(p: Progress, count: number): number {
  let m = -1;
  for (const k in p.done) m = Math.max(m, +k);
  return Math.min(count - 1, m + UNLOCK_AHEAD);
}

/** Totaux pour l'écran des niveaux. */
export function totals(p: Progress): { done: number; stars: number } {
  let done = 0, stars = 0;
  for (const k in p.done) { done++; stars += p.done[k]; }
  return { done, stars };
}
