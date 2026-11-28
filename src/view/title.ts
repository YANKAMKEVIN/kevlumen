/** Rayons décoratifs de l'écran titre : des traits de lumière qui se dessinent et s'effacent. */
import { rgba } from './color';

interface TitleBeam { pts: [number, number][]; c: number; t: number; life: number; seg: number[] }
const beams: TitleBeam[] = [];
const PASSES: [number, number][] = [[26, .03], [12, .07], [5, .18], [1.6, .6]];

export function drawTitleBeams(ctx: CanvasRenderingContext2D, dt: number, vw: number, vh: number): void {
  if (beams.length < 5 && Math.random() < dt * 1.2) {
    const c = [1, 2, 4, 3, 5, 6, 7][(Math.random() * 7) | 0];
    const pts: [number, number][] = [];
    let x = Math.random() < .5 ? -.05 : 1.05, y = Math.random(), d = x < 0 ? 0 : 2;
    pts.push([x, y]);
    for (let k = 0; k < 5; k++) {
      const L2 = .15 + Math.random() * .45;
      x += [1, 0, -1, 0][d] * L2 * (vh / vw); y += [0, 1, 0, -1][d] * L2;
      pts.push([x, y]);
      d = (d + (Math.random() < .5 ? 1 : 3)) % 4;
    }
    beams.push({ pts, c, t: 0, life: 9 + Math.random() * 5, seg: [] });
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = beams.length - 1; k >= 0; k--) {
    const b = beams[k];
    b.t += dt;
    if (b.t > b.life) { beams.splice(k, 1); continue; }
    const fade = Math.min(1, b.t / 1.5, (b.life - b.t) / 2), grow = Math.min(1, b.t / 3);
    let total = 0;
    b.seg.length = 0;
    for (let i = 1; i < b.pts.length; i++) {
      const a = b.pts[i - 1], c2 = b.pts[i];
      const l = Math.hypot((c2[0] - a[0]) * vw, (c2[1] - a[1]) * vh);
      b.seg.push(l); total += l;
    }
    const rem = total * grow;
    for (const [w, al] of PASSES) {
      ctx.lineWidth = w; ctx.strokeStyle = rgba(b.c, al * fade);
      ctx.beginPath(); ctx.moveTo(b.pts[0][0] * vw, b.pts[0][1] * vh);
      let r2 = rem;
      for (let i = 1; i < b.pts.length && r2 > 0; i++) {
        const a = b.pts[i - 1], c2 = b.pts[i], f = Math.min(1, r2 / b.seg[i - 1]);
        ctx.lineTo((a[0] + (c2[0] - a[0]) * f) * vw, (a[1] + (c2[1] - a[1]) * f) * vh);
        r2 -= b.seg[i - 1];
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
