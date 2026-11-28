/** État de la vue (écran, partie en cours, glisser, indice, apparition des rayons). Sans DOM. */
import type { Puzzle } from '../engine/puzzle';
import type { Hint, Trace, TrayPiece } from '../engine/types';
import { emptyLayout, type Layout } from './layout';

/** Pièce en cours de glisser (depuis la réserve ou le plateau), ou toucher sur une pièce fixe orientable. */
export interface Drag {
  proto: TrayPiece;
  o: number;
  from: 'tray' | 'board' | 'tap';
  slot: number;
  idx: number;
  px: number;
  py: number;
  sx: number;
  sy: number;
  active: boolean;
  histPushed: boolean;
  /** Décalage vers le haut sous le doigt, pour voir la pièce. */
  lift: number;
}

/** Plafond du devicePixelRatio : au-delà, le coût du remplissage explose sans gain visible. */
export const MAX_DPR = 2;
/** Vitesse d'apparition des rayons (cases par seconde). */
export const REVEAL_SPEED = 16;
/** Plus de rayon à dévoiler. */
export const REVEAL_DONE = 1e9;

export const etat = {
  DPR: 1,
  VW: 0,
  VH: 0,
  mode: 'title' as 'title' | 'play',
  /** Dernier niveau lancé (choisit le fond du chapitre, même hors partie). */
  li: 0,
  /** Partie en cours (null hors partie). */
  puzzle: null as Puzzle | null,
  /** Rayons affichés : ceux du plateau, ou l'aperçu pendant un glisser. */
  tr: null as Trace | null,
  /** Distance jusqu'où les rayons sont dévoilés (animation de propagation). */
  reveal: REVEAL_DONE,
  maxDist: 0,
  lay: emptyLayout() as Layout,
  drag: null as Drag | null,
  pid: null as number | null,
  hoverCell: -1,
  hint: null as (Hint & { t0: number }) | null,
  wonT: 0,
  /** Temps écoulé (s). */
  T: 0,
  lastOkSet: new Set<number>(),
  lastDarkSet: new Set<number>(),
  crysOrder: 0,
};

const segKey = (s: number[]): string => s.join(',');

/**
 * Affiche de nouveaux rayons. Seule la partie qui a changé est redévoilée depuis l'endroit
 * où elle diverge des anciens rayons (initial : tout est redévoilé depuis les sources).
 */
export function showTrace(nt: Trace, initial = false): void {
  let div = REVEAL_DONE;
  if (etat.tr && !initial) {
    const old = new Set(etat.tr.segs.map(segKey));
    for (const s of nt.segs) if (!old.has(segKey(s))) div = Math.min(div, s[5]);
  } else div = 0;
  if (div < etat.reveal) etat.reveal = div;
  etat.tr = nt;
  let m = 0;
  for (const s of nt.segs) m = Math.max(m, s[6]);
  etat.maxDist = m;
}

/** Avance l'apparition des rayons ; renvoie true quand tout est dévoilé. */
export function stepReveal(dt: number): boolean {
  if (etat.reveal < REVEAL_DONE / 10) {
    etat.reveal += dt * REVEAL_SPEED;
    if (etat.reveal > etat.maxDist + 1) etat.reveal = REVEAL_DONE;
  }
  return etat.reveal >= REVEAL_DONE / 10;
}
