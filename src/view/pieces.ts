/** Dessin d'une pièce (plateau, réserve, aide). Chaque sorte a sa fonction ; t = temps écoulé (s). */
import { TAU, rgba } from './color';

type Ctx = CanvasRenderingContext2D;

/** Ce qu'il faut savoir pour dessiner une pièce. a : angle affiché, pop : rebond. */
export interface PieceLook {
  t: string;
  o?: number;
  c?: number;
  d?: number;
  a?: number;
  pop?: number;
}

export interface PieceOpts {
  /** Éclat d'un cristal (0..1), couleur reçue, cristal satisfait. */
  lit?: number;
  got?: number;
  ok?: boolean;
  /** Anneau des pièces fixes orientables, halo des pièces mobiles. */
  ring?: boolean;
  base?: boolean;
  noGlow?: boolean;
}

export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function hexPath(c: Ctx, x: number, y: number, r: number, rot = 0): void {
  c.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = rot + k * TAU / 6 - Math.PI / 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (k) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.closePath();
}

/** Halo doux sous une pièce mobile. */
function baseGlow(c: Ctx, s: number, alpha: number): void {
  const bg = c.createRadialGradient(0, 0, 0, 0, 0, s * .42);
  bg.addColorStop(0, `rgba(190,170,255,${alpha})`); bg.addColorStop(1, 'rgba(190,170,255,0)');
  c.fillStyle = bg; c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill();
}

function drawWall(c: Ctx, s: number): void {
  const p = s * .06, w = s - p * 2;
  const gr = c.createLinearGradient(0, -w / 2, 0, w / 2); gr.addColorStop(0, '#251d42'); gr.addColorStop(1, '#0e0a1d');
  rr(c, -w / 2, -w / 2, w, w, s * .14); c.fillStyle = gr; c.fill();
  c.strokeStyle = 'rgba(160,130,255,.16)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.moveTo(-w / 2 + s * .16, -w / 2 + 1.5); c.lineTo(w / 2 - s * .16, -w / 2 + 1.5); c.strokeStyle = 'rgba(255,255,255,.12)'; c.stroke();
  // facettes
  c.strokeStyle = 'rgba(140,110,230,.07)'; c.beginPath();
  c.moveTo(-w / 2 + s * .2, w / 2 - s * .15); c.lineTo(0, -w * .05); c.lineTo(w / 2 - s * .12, w / 3); c.stroke();
}

function drawSource(c: Ctx, g: PieceLook, x: number, s: number, t: number): void {
  const a = g.a || 0, col = g.c ?? 7;
  c.rotate(a);
  // buse
  const ng = c.createLinearGradient(0, -s * .11, 0, s * .11); ng.addColorStop(0, '#8c86a8'); ng.addColorStop(.5, '#e8e4ff'); ng.addColorStop(1, '#56506e');
  rr(c, s * .12, -s * .1, s * .34, s * .2, s * .05); c.fillStyle = ng; c.fill();
  c.fillStyle = rgba(col, .9); c.fillRect(s * .42, -s * .06, s * .04, s * .12);
  c.rotate(-a);
  const bg = c.createRadialGradient(-s * .08, -s * .1, s * .02, 0, 0, s * .32); bg.addColorStop(0, '#5a5280'); bg.addColorStop(1, '#16122a');
  c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.fillStyle = bg; c.fill(); c.strokeStyle = 'rgba(220,210,255,.35)'; c.lineWidth = 1.5; c.stroke();
  c.globalCompositeOperation = 'lighter';
  const pu = .75 + .25 * Math.sin(t * 3 + x * .01);
  const og = c.createRadialGradient(0, 0, 0, 0, 0, s * .42);
  og.addColorStop(0, rgba(col, .95 * pu)); og.addColorStop(.35, rgba(col, .5 * pu)); og.addColorStop(1, rgba(col, 0));
  c.fillStyle = og; c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, s * .06, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
  // anneau tournant
  c.strokeStyle = rgba(col, .35); c.lineWidth = 1; c.setLineDash([s * .05, s * .07]); c.lineDashOffset = -t * 12;
  c.beginPath(); c.arc(0, 0, s * .24, 0, TAU); c.stroke(); c.setLineDash([]);
}

function drawMirror(c: Ctx, g: PieceLook, s: number, opt: PieceOpts, t: number): void {
  if (opt.ring) {
    c.strokeStyle = 'rgba(200,190,255,.22)'; c.lineWidth = 1.2; c.setLineDash([3, 5]);
    c.beginPath(); c.arc(0, 0, s * .43, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(200,190,255,.35)';
    for (const k of [0, 1]) { const aa = k * Math.PI + t * .25; c.beginPath(); c.arc(Math.cos(aa) * s * .43, Math.sin(aa) * s * .43, 1.8, 0, TAU); c.fill(); }
  }
  if (opt.base) baseGlow(c, s, .13);
  c.rotate(g.a || 0);
  const Lh = s * .42, th = s * (g.t === 'mir' ? .065 : .055);
  if (g.t === 'mir') {
    const mg = c.createLinearGradient(0, -th, 0, th);
    mg.addColorStop(0, '#59607a'); mg.addColorStop(.42, '#ffffff'); mg.addColorStop(.6, '#c9d0ea'); mg.addColorStop(1, '#4b5068');
    rr(c, -Lh, -th, Lh * 2, th * 2, th); c.fillStyle = mg; c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#2b2640'; c.beginPath(); c.arc(0, 0, s * .045, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.stroke();
  } else {
    const mg = c.createLinearGradient(0, -th, 0, th);
    mg.addColorStop(0, 'rgba(120,230,255,.25)'); mg.addColorStop(.5, 'rgba(220,250,255,.75)'); mg.addColorStop(1, 'rgba(120,200,255,.25)');
    rr(c, -Lh, -th, Lh * 2, th * 2, th); c.fillStyle = mg; c.fill(); c.strokeStyle = 'rgba(190,245,255,.8)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.setLineDash([s * .04, s * .035]);
    c.beginPath(); c.moveTo(-Lh + 3, 0); c.lineTo(Lh - 3, 0); c.stroke(); c.setLineDash([]);
  }
}

const PRISM_RAYS: [number, number][] = [[1, -1], [2, 0], [4, 1]];

function drawPrism(c: Ctx, g: PieceLook, s: number, opt: PieceOpts): void {
  if (opt.base) baseGlow(c, s, .13);
  c.rotate(g.a || 0);
  const ax = s * .33, bx = -s * .25, by = s * .31;
  c.beginPath(); c.moveTo(ax, 0); c.lineTo(bx, -by); c.lineTo(bx, by); c.closePath();
  const pg = c.createLinearGradient(bx, -by, ax, by);
  pg.addColorStop(0, 'rgba(255,255,255,.35)'); pg.addColorStop(.5, 'rgba(170,190,255,.14)'); pg.addColorStop(1, 'rgba(255,255,255,.28)');
  c.fillStyle = pg; c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke();
  c.globalCompositeOperation = 'lighter'; c.lineWidth = 2;
  for (const [cc, k] of PRISM_RAYS) {
    c.strokeStyle = rgba(cc, .75); c.beginPath(); c.moveTo(bx + s * .08, 0); c.lineTo(ax - s * .08, k * s * .11); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(bx - s * .06, 0, s * .03, 0, TAU); c.fill();
}

function drawFilter(c: Ctx, g: PieceLook, s: number, opt: PieceOpts): void {
  const col = g.c ?? 7;
  if (opt.base) baseGlow(c, s, .1);
  const w = s * .5;
  rr(c, -w / 2, -w / 2, w, w, s * .09); c.fillStyle = rgba(col, .28); c.fill(); c.strokeStyle = rgba(col, .95); c.lineWidth = 2; c.stroke();
  c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath(); c.moveTo(-w / 2, w * .1); c.lineTo(w * .1, -w / 2); c.lineTo(w * .32, -w / 2); c.lineTo(-w / 2, w * .32); c.fill(); c.restore();
  c.globalCompositeOperation = 'lighter';
  const fg = c.createRadialGradient(0, 0, 0, 0, 0, s * .4); fg.addColorStop(0, rgba(col, .25)); fg.addColorStop(1, rgba(col, 0));
  c.fillStyle = fg; c.fillRect(-s / 2, -s / 2, s, s); c.globalCompositeOperation = 'source-over';
}

function drawCrystal(c: Ctx, g: PieceLook, s: number, opt: PieceOpts, t: number): void {
  const lit = opt.lit || 0, got = opt.got || 0, r = s * .3, col = g.c ?? 7;
  const rot = t * .15;
  if (lit > 0 && !opt.noGlow) {
    c.globalCompositeOperation = 'lighter';
    const gg = c.createRadialGradient(0, 0, 0, 0, 0, s * 1.1);
    gg.addColorStop(0, rgba(col, .55 * lit)); gg.addColorStop(.3, rgba(col, .18 * lit)); gg.addColorStop(1, rgba(col, 0));
    c.fillStyle = gg; c.beginPath(); c.arc(0, 0, s * 1.1, 0, TAU); c.fill();
    c.strokeStyle = rgba(col, .22 * lit); c.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      const a = rot * 2 + k * TAU / 6;
      c.beginPath(); c.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); c.lineTo(Math.cos(a) * s * .62, Math.sin(a) * s * .62); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }
  hexPath(c, 0, 0, r);
  const cg = c.createLinearGradient(-r, -r, r, r); cg.addColorStop(0, rgba(col, .35 + .6 * lit)); cg.addColorStop(1, rgba(col, .08 + .5 * lit));
  c.fillStyle = cg; c.fill();
  c.strokeStyle = rgba(col, .55 + .45 * lit); c.lineWidth = 1.6; c.stroke();
  // facettes
  c.strokeStyle = `rgba(255,255,255,${(.12 + .35 * lit).toFixed(3)})`; c.lineWidth = 1; hexPath(c, 0, 0, r * .5); c.stroke();
  c.beginPath();
  for (let k = 0; k < 6; k++) { const a = k * TAU / 6 - Math.PI / 2; c.moveTo(Math.cos(a) * r * .5, Math.sin(a) * r * .5); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.stroke();
  if (got && !opt.ok) {
    c.globalCompositeOperation = 'lighter';
    const ig = c.createRadialGradient(0, 0, 0, 0, 0, r * .6); ig.addColorStop(0, rgba(got, .8)); ig.addColorStop(1, rgba(got, 0));
    c.fillStyle = ig; c.beginPath(); c.arc(0, 0, r * .6, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
  }
  if (lit > .5) { c.fillStyle = `rgba(255,255,255,${(.85 * lit).toFixed(3)})`; c.beginPath(); c.arc(0, 0, r * .16, 0, TAU); c.fill(); }
}

function drawDark(c: Ctx, s: number, opt: PieceOpts, t: number): void {
  const hit = opt.got ? 1 : 0, r = s * .3;
  if (hit) {
    c.globalCompositeOperation = 'lighter';
    const p = .6 + .4 * Math.sin(t * 14);
    const gg = c.createRadialGradient(0, 0, 0, 0, 0, s * .8);
    gg.addColorStop(0, `rgba(255,40,70,${(.5 * p).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,40,70,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(0, 0, s * .8, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    c.translate(Math.sin(t * 50) * 1.2, 0);
  }
  c.beginPath(); c.moveTo(0, -r * 1.15); c.lineTo(r * .85, 0); c.lineTo(0, r * 1.15); c.lineTo(-r * .85, 0); c.closePath();
  const dg = c.createLinearGradient(-r, -r, r, r); dg.addColorStop(0, '#2a2140'); dg.addColorStop(1, '#050308');
  c.fillStyle = dg; c.fill();
  c.strokeStyle = hit ? 'rgba(255,80,110,.95)' : 'rgba(170,120,255,.55)'; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = 'rgba(200,170,255,.18)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, -r * 1.15); c.lineTo(0, r * 1.15); c.moveTo(-r * .85, 0); c.lineTo(r * .85, 0); c.stroke();
  if (!hit) {
    c.fillStyle = 'rgba(200,170,255,.5)'; c.globalAlpha *= .5 + .5 * Math.sin(t * 1.3);
    c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill();
  }
}

/** Dessine la pièce g centrée en (x, y), dans une case de s px, au temps t. */
export function drawPiece(c: Ctx, g: PieceLook, x: number, y: number, s: number, opt: PieceOpts = {}, t = 0): void {
  c.save(); c.translate(x, y);
  const sc = 1 + (g.pop || 0); c.scale(sc, sc);
  switch (g.t) {
    case 'wall': drawWall(c, s); break;
    case 'src': drawSource(c, g, x, s, t); break;
    case 'mir': case 'spl': drawMirror(c, g, s, opt, t); break;
    case 'pri': drawPrism(c, g, s, opt); break;
    case 'flt': drawFilter(c, g, s, opt); break;
    case 'crys': drawCrystal(c, g, s, opt, t); break;
    case 'dark': drawDark(c, s, opt, t); break;
  }
  c.restore();
}
