/** Glisser-déposer à la souris ou au doigt, touchers pour tourner, raccourcis clavier. */
import { trace } from '../engine/sim';
import { cv } from '../view/canvas';
import { burstAt } from '../view/frame';
import { cellAt, slotAt } from '../view/layout';
import { etat, showTrace, type Drag } from '../view/state';
import { Snd } from './audio';
import { $ } from './dom';
import { resetLevel, undo } from './game';

/** Distance (px) au-delà de laquelle un appui devient un glisser. */
export const DRAG_THRESHOLD = 9;
/** Tolérance (px) d'un toucher sur une pièce fixe orientable. */
export const TAP_TOLERANCE = 14;
/** Au doigt, la pièce tenue est décalée vers le haut (en cases) pour rester visible. */
export const TOUCH_LIFT = 0.7;

function newDrag(partial: Partial<Drag> & Pick<Drag, 'from' | 'px' | 'py'>): Drag {
  return {
    proto: { t: '' }, o: 0, slot: -1, idx: -1, sx: partial.px, sy: partial.py,
    active: false, histPushed: false, lift: 0, ...partial,
  };
}

function onDown(e: PointerEvent): void {
  Snd.init();
  const p = etat.puzzle;
  if (etat.mode !== 'play' || !p || p.won) return;
  if (etat.pid !== null && etat.drag && etat.drag.active) return;
  etat.pid = e.pointerId; etat.drag = null;
  try { cv.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
  const px = e.clientX, py = e.clientY;
  const tipEl = $('tip');
  if (tipEl.textContent && p.index > 2) tipEl.style.opacity = '.55';
  const lift = e.pointerType === 'touch' ? etat.lay.cs * TOUCH_LIFT : 0;
  const sl = slotAt(etat.lay, px, py);
  if (sl && p.tray[sl.i] && p.tray[sl.i].n > 0) {
    const tp = p.tray[sl.i];
    etat.drag = newDrag({ proto: { t: tp.t, c: tp.c }, from: 'tray', slot: sl.i, px, py, active: true, lift });
    Snd.pick();
    return;
  }
  const i = cellAt(etat.lay, p.level.w, p.level.h, px, py);
  const g = i >= 0 ? p.grid[i] : null;
  if (!g) return;
  if (!g.fixed) etat.drag = newDrag({ proto: { t: g.t, c: g.c }, o: g.o ?? 0, from: 'board', idx: i, px, py, lift });
  else if (g.rot) etat.drag = newDrag({ from: 'tap', idx: i, px, py });
}

/** Aperçu des rayons avec la pièce posée sur la case survolée. */
function updateHover(d: Drag): void {
  const p = etat.puzzle;
  if (!p) return;
  const i = cellAt(etat.lay, p.level.w, p.level.h, d.px, d.py - d.lift);
  const h = i >= 0 && !p.grid[i] ? i : -1;
  if (h === etat.hoverCell) return;
  etat.hoverCell = h;
  if (h >= 0) {
    if (d.proto.t === 'pri') { const dir = p.incomingDir(h); if (dir >= 0) d.o = dir; }
    const g2 = p.grid.slice();
    g2[h] = { t: d.proto.t, o: d.o, c: d.proto.c };
    showTrace(trace(p.level, g2));
  } else showTrace(p.trace);
}

function onMove(e: PointerEvent): void {
  const d = etat.drag, p = etat.puzzle;
  if (e.pointerId !== etat.pid || !d || !p) return;
  d.px = e.clientX; d.py = e.clientY;
  if (d.from === 'tap') return;
  if (!d.active && Math.hypot(d.px - d.sx, d.py - d.sy) > DRAG_THRESHOLD) {
    if (!p.pickUp(d.idx)) { etat.drag = null; return; }
    d.active = true; d.histPushed = true;
    Snd.pick(); etat.hoverCell = -2;
  }
  if (d.active) updateHover(d);
}

function onUp(e: PointerEvent): void {
  if (e.pointerId !== etat.pid) return;
  etat.pid = null;
  const d = etat.drag, p = etat.puzzle;
  etat.drag = null;
  if (!d || !p) return;
  if (d.from === 'tap') {
    if (Math.hypot(d.px - d.sx, d.py - d.sy) < TAP_TOLERANCE) p.rotateAt(d.idx);
    return;
  }
  if (!d.active) { p.rotateAt(d.idx); return; } // toucher une pièce mobile : elle tourne
  const i = cellAt(etat.lay, p.level.w, p.level.h, d.px, d.py - d.lift);
  if (i >= 0 && !p.grid[i] && e.type !== 'pointercancel') {
    p.place(d.proto, d.o, i, d.from === 'tray' ? d.slot : -1, d.histPushed);
    Snd.place();
    burstAt(i, d.proto.c || 7, 8);
  } else if (d.from === 'board') {
    p.returnPiece(d.proto);
    Snd.back();
  }
  etat.hoverCell = -1; etat.hint = null;
  showTrace(p.trace);
}

function onKey(e: KeyboardEvent): void {
  if (etat.mode !== 'play') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) resetLevel();
}

/** Branche les gestes ; appelé une fois au démarrage. */
export function initInput(): void {
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  // un appui long ne doit pas ouvrir le menu contextuel (téléphones) pendant qu'on tient une pièce
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', onKey);
}
