/**
 * Particules (éclats, étincelles) et poussières lumineuses du fond.
 * Les lueurs sont des images pré-rendues par couleur (sprites) : aucun dégradé n'est créé
 * pendant l'image, et les particules mortes sont recyclées (pas d'allocation par image).
 */
import { TAU, rgba } from './color';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; c: number; r: number }
interface Mote { x: number; y: number; v: number; r: number; p: number; c: number }

/** Nombre maximal de particules vivantes (garde-fou pour les petits téléphones). */
export const MAX_PARTICLES = 600;

const parts: Particle[] = [];
const pool: Particle[] = [];
const motes: Mote[] = [];
for (let i = 0; i < 46; i++) {
  motes.push({ x: Math.random(), y: Math.random(), v: .004 + Math.random() * .01, r: Math.random() * 1.6 + .4, p: Math.random() * TAU, c: [1, 2, 4, 7, 6, 5][i % 6] });
}

const SPRITE = 64;
const sprites = new Map<string, HTMLCanvasElement>();

/**
 * Lueur ronde pré-rendue : blanc au centre (opacité `core`), puis la couleur c (opacité `mid`
 * à la position `at`), jusqu'au transparent. Dessinée ensuite avec drawImage à la taille voulue.
 */
export function glowSprite(c: number, core: number, mid: number, at: number): HTMLCanvasElement {
  const key = `${c}:${core}:${mid}:${at}`;
  let s = sprites.get(key);
  if (!s) {
    s = document.createElement('canvas');
    s.width = s.height = SPRITE;
    const g = s.getContext('2d') as CanvasRenderingContext2D, h = SPRITE / 2;
    const gr = g.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, core > 0 ? `rgba(255,255,255,${core})` : rgba(c, mid));
    gr.addColorStop(at, rgba(c, mid)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, SPRITE, SPRITE);
    sprites.set(key, s);
  }
  return s;
}

/** Fait jaillir n éclats de couleur c depuis (x, y). */
export function burst(x: number, y: number, c: number, n: number, sp = 1): void {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, v = (20 + Math.random() * 90) * sp;
    spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, .6 + Math.random() * .8, c, 1 + Math.random() * 2.2);
  }
}

/** Ajoute une particule (recyclée si possible). */
export function spawn(x: number, y: number, vx: number, vy: number, max: number, c: number, r: number): void {
  if (parts.length >= MAX_PARTICLES) return;
  const p = pool.pop() || { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, c: 0, r: 0 };
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = max; p.c = c; p.r = r;
  parts.push(p);
}

export const particleCount = (): number => parts.length;

/** Avance et dessine les particules. */
export function drawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = parts.length - 1; k >= 0; k--) {
    const p = parts[k];
    p.life += dt;
    if (p.life > p.max) { parts[k] = parts[parts.length - 1]; parts.pop(); pool.push(p); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.8; p.vy *= 1 - dt * 1.8;
    const a = 1 - p.life / p.max, r = p.r * (1 + a);
    ctx.globalAlpha = a;
    ctx.drawImage(glowSprite(p.c, .9, .6, .3), p.x - r * 3, p.y - r * 3, r * 6, r * 6);
  }
  ctx.restore();
}

/** Poussières qui montent doucement dans tout l'écran. */
export function drawMotes(ctx: CanvasRenderingContext2D, dt: number, t: number, vw: number, vh: number): void {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    m.y -= m.v * dt; m.x += Math.sin(t * .3 + m.p) * .0004;
    if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
    const a = .25 + .2 * Math.sin(t * 1.5 + m.p);
    ctx.fillStyle = rgba(m.c, a * .5); ctx.beginPath(); ctx.arc(m.x * vw, m.y * vh, m.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
