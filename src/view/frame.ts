/** Boucle d'affichage : fond, plateau, rayons, pièces, particules, réserve ; détection de la victoire. */
import { angFor, animOf, stepAnim } from './anim';
import { drawBg } from './background';
import { drawBeams } from './beams';
import { crystalStates, drawBoard, drawHint, drawTray } from './board';
import { cv, ctx } from './canvas';
import { ease, TAU } from './color';
import { cellCenter } from './layout';
import { burst, drawMotes, drawParticles, spawn } from './particles';
import { drawPiece } from './pieces';
import { etat, stepReveal } from './state';
import { drawTitleBeams } from './title';

/** Durée d'affichage d'un indice (s). */
export const HINT_SECONDS = 6;

/** Liaisons vers le son et les écrans, branchées par l'application. */
export const frameHooks = {
  onWin(): void {},
  crystal(_order: number): void {},
  dark(): void {},
};

const WIN_COLORS = [1, 2, 4, 3, 5, 6, 7];

/** Fait jaillir des éclats depuis la case i. */
export function burstAt(i: number, c: number, n: number, sp = 1): void {
  const p = etat.puzzle;
  if (!p) return;
  const [x, y] = cellCenter(etat.lay, p.level.w, i);
  burst(x, y, c, n, sp);
}

function drawPlay(dt: number): void {
  const p = etat.puzzle, tr = etat.tr;
  if (!p || !tr) return;
  const revealed = stepReveal(dt);
  const lay = etat.lay, cs = lay.cs, W = p.level.w, T = etat.T;
  const drag = etat.drag;
  drawBoard(ctx, lay, W, p.level.h, drag && drag.active ? etat.hoverCell : -1);
  drawBeams(ctx, tr, lay, etat.reveal, T);
  // pièces
  const st = crystalStates(p, tr, etat.reveal);
  let okCount = 0, need = 0;
  for (let i = 0; i < p.grid.length; i++) {
    const g = p.grid[i];
    if (!g) continue;
    const an = animOf(g);
    stepAnim(an, dt);
    const [x, y] = cellCenter(lay, W, i);
    const look = { t: g.t, o: g.o, c: g.c, d: g.d, a: an.a, pop: an.pop };
    if (g.t === 'crys' || g.t === 'dark') {
      const s = st.get(i);
      if (!s) continue;
      an.l = ease(an.l, s.ok && g.t === 'crys' ? 1 : 0, Math.min(1, dt * 6));
      if (g.t === 'crys') {
        need++;
        if (s.ok) okCount++;
        if (s.ok && !etat.lastOkSet.has(i)) { etat.lastOkSet.add(i); frameHooks.crystal(etat.crysOrder++); burst(x, y, g.c ?? 7, 26, 1.2); an.pop = .25; }
        if (!s.ok && etat.lastOkSet.has(i)) etat.lastOkSet.delete(i);
        if (s.ok && Math.random() < dt * 6) {
          const a = Math.random() * TAU;
          spawn(x + Math.cos(a) * cs * .3, y + Math.sin(a) * cs * .3, Math.cos(a) * 18, Math.sin(a) * 18 - 14, 1 + Math.random(), g.c ?? 7, 1 + Math.random() * 1.4);
        }
      } else {
        if (s.got && !etat.lastDarkSet.has(i)) { etat.lastDarkSet.add(i); frameHooks.dark(); }
        if (!s.got) etat.lastDarkSet.delete(i);
      }
      drawPiece(ctx, look, x, y, cs, { lit: an.l, got: s.got, ok: s.ok }, T);
    } else drawPiece(ctx, look, x, y, cs, { ring: !!(g.fixed && g.rot), base: !g.fixed }, T);
  }
  // fantôme d'indice
  if (etat.hint) {
    if (T - etat.hint.t0 > HINT_SECONDS) etat.hint = null;
    else { const [x, y] = cellCenter(lay, W, etat.hint.i); drawHint(ctx, etat.hint, x, y, cs, T); }
  }
  drawTray(ctx, lay, p.tray, T);
  // victoire : tous les rayons dévoilés, tous les cristaux allumés, rien en main
  if (!p.won && revealed && need > 0 && okCount === need && !drag && p.declareWin()) {
    etat.wonT = T;
    frameHooks.onWin();
  }
  if (p.won && T - etat.wonT < 1.2 && Math.random() < .5 && etat.lastOkSet.size) {
    const ids = [...etat.lastOkSet];
    burstAt(ids[(Math.random() * ids.length) | 0], WIN_COLORS[(Math.random() * 7) | 0], 4, 1.6);
  }
  // pièce tenue en main
  if (drag && drag.active) {
    const g = { t: drag.proto.t, o: drag.o, c: drag.proto.c, a: angFor({ t: drag.proto.t, o: drag.o }) };
    ctx.save(); ctx.globalAlpha = .92; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16;
    drawPiece(ctx, g, drag.px, drag.py - drag.lift, cs * 1.08, { base: true }, T);
    ctx.restore();
  }
}

let raf = 0, last = 0, running = false;

function frame(now: number): void {
  if (!running) return;
  const dt = Math.min(.05, (now - (last || now)) / 1000);
  last = now; etat.T += dt;
  ctx.setTransform(etat.DPR, 0, 0, etat.DPR, 0, 0);
  drawBg(ctx, cv.width, cv.height, etat.DPR, etat.VW, etat.VH, etat.li);
  drawMotes(ctx, dt, etat.T, etat.VW, etat.VH);
  if (etat.mode === 'title' || !etat.puzzle) drawTitleBeams(ctx, dt, etat.VW, etat.VH);
  if (etat.puzzle && etat.mode === 'play') drawPlay(dt);
  drawParticles(ctx, dt);
  raf = requestAnimationFrame(frame);
}

/** Lance la boucle (sans effet si elle tourne déjà). */
export function startLoop(): void {
  if (running) return;
  running = true; last = 0;
  raf = requestAnimationFrame(frame);
}

/** Met la boucle en pause (onglet caché) : plus aucun calcul ni dessin. */
export function stopLoop(): void {
  running = false;
  cancelAnimationFrame(raf);
}

export const isLooping = (): boolean => running;
