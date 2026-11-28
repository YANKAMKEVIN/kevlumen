/** Chef d'orchestre d'une partie : relie le moteur (Puzzle) à la vue, au son et à la sauvegarde. */
import { LEVELS } from '../engine/levels';
import { Puzzle, type PuzzleEvent } from '../engine/puzzle';
import { recordWin } from '../engine/progress';
import { bump, popIn } from '../view/anim';
import { cv } from '../view/canvas';
import { computeLayout, hintFor } from '../view/layout';
import { MAX_DPR, etat, showTrace } from '../view/state';
import { Snd } from './audio';
import { $ } from './dom';
import { persist, save } from './store';

/** Liaisons vers les écrans (branchées par ui.ts, pour éviter un import circulaire). */
export const uiHooks = {
  levelLoaded(_p: Puzzle): void {},
};

/** Texte d'aide du niveau, adapté à la place de la réserve. */
export function hintText(): string {
  const p = etat.puzzle;
  return p ? hintFor(p.level.hint || '', etat.VW, etat.VH) : '';
}

/** Recalcule la mise en page du plateau (après un chargement ou un redimensionnement). */
export function layout(): void {
  const p = etat.puzzle;
  if (!p) return;
  const tip = $('tip');
  etat.lay = computeLayout({
    vw: etat.VW, vh: etat.VH,
    hudBottom: $('hud').getBoundingClientRect().bottom,
    tipBottom: tip.textContent ? tip.getBoundingClientRect().bottom : 0,
    w: p.level.w, h: p.level.h, slots: p.tray.length,
  });
}

/** Adapte le canvas à la fenêtre ; le devicePixelRatio est plafonné (MAX_DPR). */
export function resize(): void {
  etat.DPR = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  etat.VW = innerWidth; etat.VH = innerHeight;
  cv.width = Math.round(etat.VW * etat.DPR); cv.height = Math.round(etat.VH * etat.DPR);
  const p = etat.puzzle;
  if (p) {
    if (etat.mode === 'play' && !p.won) $('tip').textContent = hintText();
    layout();
  }
}

function clearTransient(): void {
  etat.hint = null; etat.drag = null; etat.pid = null; etat.hoverCell = -1; etat.tr = null;
}

function onPuzzleEvent(e: PuzzleEvent, p: Puzzle): void {
  if (p !== etat.puzzle) return; // chargement initial : géré par loadLevel
  switch (e.type) {
    case 'load':
      clearTransient(); uiHooks.levelLoaded(p); showTrace(p.trace, true); break;
    case 'rotate':
      Snd.rotate(); etat.hint = null; showTrace(p.trace); break;
    case 'bump': {
      const g = p.grid[e.i];
      if (g) bump(g);
      break;
    }
    case 'undo':
      for (const i of e.restored) { const g = p.grid[i]; if (g) popIn(g, 1); }
      Snd.back(); etat.hint = null; showTrace(p.trace); break;
    default: break;
  }
}

/** Charge le niveau i. */
export function loadLevel(i: number): Puzzle {
  etat.li = i;
  clearTransient();
  const p = new Puzzle(LEVELS[i], i, onPuzzleEvent);
  etat.puzzle = p;
  uiHooks.levelLoaded(p);
  showTrace(p.trace, true);
  return p;
}

export function undo(): void { etat.puzzle?.undo(); }

export function resetLevel(): void {
  const p = etat.puzzle;
  if (p && p.reset()) Snd.back();
}

/**
 * Indice : montre la pièce suivante de la solution. Il coûte une étoile, sauf s'il est déjà
 * affiché (appuyer deux fois de suite ne fait que le remontrer).
 */
export function showHint(): void {
  const p = etat.puzzle;
  if (!p || p.won) return;
  const h = p.computeHint();
  if (!h) return;
  const shown = etat.hint;
  if (shown && shown.i === h.i && shown.t === h.t && shown.o === h.o && !!shown.remove === !!h.remove) {
    shown.t0 = etat.T;
    return;
  }
  p.useHint();
  etat.hint = { ...h, t0: etat.T };
  Snd.hint();
}

/** Enregistre la victoire du niveau en cours ; renvoie les étoiles gagnées. */
export function recordCurrentWin(): number {
  const p = etat.puzzle;
  if (!p) return 0;
  const st = recordWin(save, p.index, p.hintsUsed);
  persist();
  return st;
}
