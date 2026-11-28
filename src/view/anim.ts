/**
 * Animation des pièces (angle affiché, rebond, éclat des cristaux), gardée à côté du moteur :
 * le moteur ne connaît que l'orientation, la vue retrouve l'angle à viser. Sans DOM.
 */
import type { Cell } from '../engine/types';

export interface Anim {
  /** Angle affiché et angle visé. */
  a: number;
  ta: number;
  /** Rebond (échelle 1 + pop). */
  pop: number;
  /** Éclat d'un cristal (0..1). */
  l: number;
  /** Orientation vue à l'image précédente. */
  o: number | undefined;
}

/** Angle d'affichage d'une pièce dans une orientation donnée. */
export function angFor(c: { t: string; o?: number; d?: number }): number {
  if (c.t === 'mir' || c.t === 'spl') return c.o ? Math.PI / 4 : -Math.PI / 4;
  if (c.t === 'pri') return (c.o ?? 0) * Math.PI / 2;
  if (c.t === 'src') return (c.d ?? 0) * Math.PI / 2;
  return 0;
}

/** Période de symétrie : un miroir retourné d'un demi-tour est identique. */
const period = (t: string): number => (t === 'mir' || t === 'spl' ? Math.PI : Math.PI * 2);

/**
 * Nouvel angle visé quand l'orientation passe à `cell.o` : l'angle équivalent le plus proche
 * de l'ancien, en avançant (sens horaire) en cas d'égalité. Un quart de tour vers l'avant
 * pour une rotation, vers l'arrière pour une annulation.
 */
export function nextTarget(prevTarget: number, cell: Cell): number {
  const p = period(cell.t), base = angFor(cell);
  const k = Math.round((prevTarget - base) / p);
  let best = base + k * p;
  for (const cand of [best - p, best + p]) {
    const dc = Math.abs(cand - prevTarget), db = Math.abs(best - prevTarget);
    if (dc < db - 1e-9 || (Math.abs(dc - db) <= 1e-9 && cand > best)) best = cand;
  }
  return best;
}

const anims = new WeakMap<Cell, Anim>();

/** Animation d'une pièce, créée à la première demande (pop : rebond de départ). */
export function animOf(cell: Cell, pop = 0): Anim {
  let an = anims.get(cell);
  if (!an) {
    const a = angFor(cell);
    an = { a, ta: a, pop, l: 0, o: cell.o };
    anims.set(cell, an);
  } else if (an.o !== cell.o) {
    an.ta = nextTarget(an.ta, cell);
    an.o = cell.o;
  }
  return an;
}

/** Fait apparaître une pièce avec un rebond (pièce rendue par une annulation). */
export function popIn(cell: Cell, pop: number): void {
  anims.delete(cell);
  animOf(cell, pop);
}

/** Petit recul quand on touche une pièce qui ne tourne pas. */
export function bump(cell: Cell): void { animOf(cell).pop = -0.15; }

/** Avance les animations de dt secondes. */
export function stepAnim(an: Anim, dt: number): void {
  an.a = ease(an.a, an.ta, Math.min(1, dt * 14));
  an.pop = ease(an.pop, 0, Math.min(1, dt * 10));
}

const ease = (a: number, b: number, k: number): number => a + (b - a) * k;
