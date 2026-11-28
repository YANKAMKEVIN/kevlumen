/** Dessin des rayons : halo en plusieurs passes, cœur blanc, étincelles qui filent, lueurs d'impact. */
import type { Trace } from '../engine/types';
import { rgba } from './color';
import type { Layout } from './layout';
import { glowSprite } from './particles';

/** Segment à l'écran : x1, y1, x2, y2, couleur, distance de départ, part dévoilée (0..1). */
interface ScreenSeg { x1: number; y1: number; x2: number; y2: number; c: number; sd: number; f: number }

/** Passes du halo : [largeur relative à la case, opacité]. */
const PASSES: [number, number][] = [[.46, .035], [.26, .08], [.13, .2], [.055, .55]];
/** Segments réutilisés d'une image à l'autre. */
const segs: ScreenSeg[] = [];
let nSegs = 0;

function toScreen(tr: Trace, lay: Layout, reveal: number): void {
  const { cs, ox, oy } = lay;
  nSegs = 0;
  for (const s of tr.segs) {
    const [sx, sy, ex, ey, c, sd, ed] = s;
    if (sd >= reveal) continue;
    const f = ed <= reveal ? 1 : (reveal - sd) / (ed - sd);
    const o = segs[nSegs] || (segs[nSegs] = { x1: 0, y1: 0, x2: 0, y2: 0, c: 0, sd: 0, f: 0 });
    o.x1 = ox + (sx + .5) * cs; o.y1 = oy + (sy + .5) * cs;
    o.x2 = ox + (sx + (ex - sx) * f + .5) * cs; o.y2 = oy + (sy + (ey - sy) * f + .5) * cs;
    o.c = c; o.sd = sd; o.f = f;
    nSegs++;
  }
}

function strokeAll(ctx: CanvasRenderingContext2D, color: (c: number) => string): void {
  for (let k = 0; k < nSegs; k++) {
    const s = segs[k];
    ctx.strokeStyle = color(s.c); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
}

export function drawBeams(ctx: CanvasRenderingContext2D, tr: Trace, lay: Layout, reveal: number, t: number): void {
  const cs = lay.cs;
  toScreen(tr, lay, reveal);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const fl = 1 + .06 * Math.sin(t * 7.3) + .04 * Math.sin(t * 13.1);
  for (const [w, a] of PASSES) {
    ctx.lineWidth = Math.max(1, cs * w * fl);
    strokeAll(ctx, c => rgba(c, a));
  }
  ctx.lineWidth = Math.max(1, cs * .02);
  strokeAll(ctx, c => (c === 7 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)'));
  // étincelles qui filent le long des rayons
  const sp = cs * 1.3, half = cs * .14;
  for (let k = 0; k < nSegs; k++) {
    const s = segs[k];
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (len < 1) continue;
    const ph = ((t * cs * 2.6) - s.sd * cs) % sp, ux = (s.x2 - s.x1) / len, uy = (s.y2 - s.y1) / len;
    const img = glowSprite(s.c, .55, .35, .4);
    for (let d = ((ph % sp) + sp) % sp; d < len; d += sp) {
      ctx.drawImage(img, s.x1 + ux * d - half, s.y1 + uy * d - half, half * 2, half * 2);
    }
  }
  // lueurs d'impact au bout des segments (sur les miroirs, etc.) et tête du rayon qui avance
  for (let k = 0; k < nSegs; k++) {
    const s = segs[k];
    if (s.f >= 1) { const r = cs * .32; ctx.drawImage(glowSprite(s.c, 0, .35, 0), s.x2 - r, s.y2 - r, r * 2, r * 2); }
  }
  for (let k = 0; k < nSegs; k++) {
    const s = segs[k];
    if (s.f < 1) { const r = cs * .4; ctx.drawImage(glowSprite(s.c, .9, .6, .3), s.x2 - r, s.y2 - r, r * 2, r * 2); }
  }
  ctx.restore();
}
