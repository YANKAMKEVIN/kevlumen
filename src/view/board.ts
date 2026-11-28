/** Plateau, réserve, fantôme d'indice et pièce tenue en main. */
import type { Puzzle } from '../engine/puzzle';
import type { Hint, Trace, TraySlot } from '../engine/types';
import { angFor } from './anim';
import { TAU } from './color';
import type { Layout } from './layout';
import { drawPiece, rr } from './pieces';

export function drawBoard(ctx: CanvasRenderingContext2D, lay: Layout, W: number, H: number, hover: number): void {
  const { cs, ox, oy } = lay;
  ctx.save();
  rr(ctx, ox - 10, oy - 10, W * cs + 20, H * cs + 20, 22);
  ctx.fillStyle = 'rgba(18,14,38,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    rr(ctx, ox + x * cs + 3, oy + y * cs + 3, cs - 6, cs - 6, cs * .16);
    ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.028)' : 'rgba(255,255,255,.04)'; ctx.fill();
  }
  if (hover >= 0) {
    const x = hover % W, y = (hover / W) | 0;
    rr(ctx, ox + x * cs + 3, oy + y * cs + 3, cs - 6, cs - 6, cs * .16);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
  }
  ctx.restore();
}

export interface CrystalState { got: number; ok: boolean }
const states = new Map<number, CrystalState>();

/** État de chaque cristal selon les rayons déjà dévoilés (réutilise la même table à chaque image). */
export function crystalStates(p: Puzzle, tr: Trace, reveal: number): Map<number, CrystalState> {
  for (const s of states.values()) { s.got = 0; s.ok = false; }
  for (let i = 0; i < p.grid.length; i++) {
    const g = p.grid[i];
    if (!g || (g.t !== 'crys' && g.t !== 'dark')) { states.delete(i); continue; }
    const d = tr.hd.get(i);
    const got = d !== undefined && d <= reveal + 1e-6 ? tr.hits.get(i) || 0 : 0;
    let s = states.get(i);
    if (!s) { s = { got: 0, ok: false }; states.set(i, s); }
    s.got = got; s.ok = g.t === 'crys' ? got === g.c : !got;
  }
  return states;
}

export function drawTray(ctx: CanvasRenderingContext2D, lay: Layout, tray: TraySlot[], t: number): void {
  if (!tray.length || !lay.slots.length) return;
  ctx.save();
  const s0 = lay.slots[0], sl = lay.slots[lay.slots.length - 1], padd = 14;
  const x0 = s0.x - s0.s / 2 - padd, y0 = s0.y - s0.s / 2 - padd, x1 = sl.x + sl.s / 2 + padd, y1 = sl.y + sl.s / 2 + padd;
  rr(ctx, x0, y0, x1 - x0, y1 - y0, 22); ctx.fillStyle = 'rgba(22,17,44,.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '600 12px Outfit,system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const s of lay.slots) {
    const tp = tray[s.i];
    if (!tp) continue;
    rr(ctx, s.x - s.s / 2, s.y - s.s / 2, s.s, s.s, 16);
    ctx.fillStyle = tp.n ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)'; ctx.fill();
    ctx.strokeStyle = tp.n ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)'; ctx.stroke();
    ctx.globalAlpha = tp.n ? 1 : .22;
    drawPiece(ctx, { t: tp.t, o: 0, c: tp.c, a: angFor({ t: tp.t, o: 0 }) }, s.x, s.y, s.s * .92, {}, t);
    ctx.globalAlpha = 1;
    if (tp.n > 0) {
      const bx = s.x + s.s / 2 - 6, by = s.y - s.s / 2 + 6;
      ctx.fillStyle = '#efeaff'; ctx.beginPath(); ctx.arc(bx, by, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = '#14102a'; ctx.fillText(String(tp.n), bx, by + .5);
    }
  }
  ctx.restore();
}

/** Fantôme de l'indice : cadre pointillé, pièce à poser en transparence ou croix sur la pièce à retirer. */
export function drawHint(ctx: CanvasRenderingContext2D, h: Hint, x: number, y: number, cs: number, t: number): void {
  const p = .5 + .5 * Math.sin(t * 6);
  ctx.save();
  ctx.strokeStyle = `rgba(255,230,140,${(.5 + .4 * p).toFixed(3)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
  rr(ctx, x - cs / 2 + 4, y - cs / 2 + 4, cs - 8, cs - 8, cs * .18); ctx.stroke();
  ctx.restore();
  ctx.save();
  if (!h.remove && h.t) {
    ctx.globalAlpha = .45 + .25 * p;
    drawPiece(ctx, { t: h.t, o: h.o, c: h.c, a: angFor({ t: h.t, o: h.o }) }, x, y, cs, {}, t);
  } else {
    ctx.strokeStyle = `rgba(255,120,140,${(.6 + .3 * p).toFixed(3)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - cs * .2, y - cs * .2); ctx.lineTo(x + cs * .2, y + cs * .2);
    ctx.moveTo(x + cs * .2, y - cs * .2); ctx.lineTo(x - cs * .2, y + cs * .2); ctx.stroke();
  }
  ctx.restore();
}
