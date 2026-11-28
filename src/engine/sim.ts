/**
 * Simulation des rayons (sans DOM) : trajet de la lumière et condition de victoire.
 * Une copie CommonJS vit dans outils/sim.js (générateur de niveaux) ; un test vérifie
 * qu'elles tracent exactement les mêmes rayons.
 */
import type { Board, Grid, Segment, Trace } from './types';

export const DX = [1, 0, -1, 0] as const;
export const DY = [0, 1, 0, -1] as const;
/** Direction de sortie d'un miroir selon son orientation ('/' puis '\') et la direction d'entrée. */
export const MIR = [[3, 2, 1, 0], [1, 0, 3, 2]] as const;
/** Garde-fou contre les boucles de rayons (en nombre de rayons traités). */
export const MAX_RAYS = 4000;

type Ray = [x: number, y: number, d: number, c: number, dist: number];

/** Trace tous les rayons partant des sources du plateau. */
export function trace(L: Board, grid: Grid): Trace {
  const W = L.w, H = L.h;
  const seen = new Set<number>(), segs: Segment[] = [], hits = new Map<number, number>();
  const lit = new Set<number>(), hd = new Map<number, number>();
  const q: Ray[] = [];
  for (let i = 0; i < W * H; i++) {
    const g = grid[i];
    if (g && g.t === 'src') q.push([i % W, (i / W) | 0, g.d ?? 0, g.c ?? 0, 0]);
  }
  let guard = 0;
  while (q.length && guard++ < MAX_RAYS) {
    let [x, y, d, c, dist] = q.shift() as Ray;
    const sx = x, sy = y, sd = dist;
    for (;;) {
      x += DX[d]; y += DY[d]; dist++;
      if (x < 0 || y < 0 || x >= W || y >= H) { segs.push([sx, sy, x - DX[d] * 0.5, y - DY[d] * 0.5, c, sd, dist - 0.5]); break; }
      const i = y * W + x, k = (i * 4 + d) * 8 + c;
      if (seen.has(k)) { segs.push([sx, sy, x, y, c, sd, dist]); break; }
      seen.add(k); lit.add(i);
      const g = grid[i];
      if (!g) continue;
      if (g.t === 'wall' || g.t === 'src') { segs.push([sx, sy, x - DX[d] * 0.5, y - DY[d] * 0.5, c, sd, dist - 0.5]); break; }
      segs.push([sx, sy, x, y, c, sd, dist]);
      if (g.t === 'crys' || g.t === 'dark') {
        hits.set(i, (hits.get(i) || 0) | c);
        const prev = hd.get(i);
        if (prev === undefined || prev > dist) hd.set(i, dist);
        break;
      }
      const o = g.o ?? 0;
      if (g.t === 'mir') { q.push([x, y, MIR[o][d], c, dist]); break; }
      if (g.t === 'spl') { q.push([x, y, d, c, dist]); q.push([x, y, MIR[o][d], c, dist]); break; }
      if (g.t === 'flt') { const nc = c & (g.c ?? 0); if (nc) q.push([x, y, d, nc, dist]); break; }
      if (g.t === 'pri') {
        if (d === o) {
          if (c & 1) q.push([x, y, (d + 3) % 4, 1, dist]);
          if (c & 2) q.push([x, y, d, 2, dist]);
          if (c & 4) q.push([x, y, (d + 1) % 4, 4, dist]);
        }
        break;
      }
      break;
    }
  }
  return { segs, hits, lit, hd };
}

/** Gagné : chaque cristal reçoit exactement sa couleur, chaque cristal d'ombre reste dans le noir. */
export function isWin(_L: Board, grid: Grid, tr: Trace): boolean {
  for (let i = 0; i < grid.length; i++) {
    const g = grid[i];
    if (!g) continue;
    if (g.t === 'crys' && (tr.hits.get(i) || 0) !== g.c) return false;
    if (g.t === 'dark' && (tr.hits.get(i) || 0)) return false;
  }
  return true;
}

/** Nombre de couleurs primaires dans c. */
export function bits(c: number): number { return (c & 1) + ((c >> 1) & 1) + ((c >> 2) & 1); }

/** Direction du rayon le plus riche qui entre dans la case i (-1 si aucun) : sert à orienter un prisme. */
export function incomingDir(L: Board, tr: Trace, i: number): number {
  const x = i % L.w, y = (i / L.w) | 0;
  let best = -1, bc = 0;
  for (const s of tr.segs) {
    const [sx, sy, ex, ey, c] = s;
    if (sx === ex && sx === x) {
      if (y > sy && y <= ey) { if (bits(c) > bc) { bc = bits(c); best = 1; } }
      else if (y < sy && y >= ey) { if (bits(c) > bc) { bc = bits(c); best = 3; } }
    } else if (sy === ey && sy === y) {
      if (x > sx && x <= ex) { if (bits(c) > bc) { bc = bits(c); best = 0; } }
      else if (x < sx && x >= ex) { if (bits(c) > bc) { bc = bits(c); best = 2; } }
    }
  }
  return best;
}
