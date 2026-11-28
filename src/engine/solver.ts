/**
 * Solveur : cherche, sans connaître la solution enregistrée, une façon de résoudre un niveau.
 *
 * Recherche « par la frontière de lumière » : on prend une case vide éclairée pas encore
 * décidée, et on essaie soit de la déclarer vide pour toujours, soit d'y poser chaque pièce
 * restante (dans chaque orientation). Une pièce posée dans le noir ne change rien, donc
 * toute solution est trouvée, sans jamais explorer deux fois le même ensemble de pièces.
 * Un rayon dont tout le trajet est décidé est définitif : s'il touche un cristal d'ombre ou
 * apporte une couleur en trop à un cristal, la branche est coupée (doomed). On essaie chaque
 * orientation des pièces fixes orientables. solveAny() alterne deux ordres de décision avec
 * un budget qui double, car selon le niveau l'un ou l'autre trouve bien plus vite.
 */
import { pieceKey, orientations, startGrid } from './puzzle';
import { DX, DY, MIR, isWin, trace } from './sim';
import type { Cell, Grid, Level, SolStep, TrayPiece } from './types';

/** Ordre dans lequel on décide les cases éclairées : la plus proche d'une source, ou la plus lointaine. */
export type Strategy = 'near' | 'far';

export interface SolveOptions {
  /** Nombre maximal d'états explorés avant d'abandonner. */
  maxNodes?: number;
  strategy?: Strategy;
}

export interface Solution {
  /** Pièces de la réserve à poser. */
  place: (SolStep & { t: string })[];
  /** Orientation des pièces fixes orientables. */
  rotate: SolStep[];
}

export interface SolveResult {
  solution: Solution | null;
  nodes: number;
  aborted: boolean;
}

// Codes des sortes de pièces dans les tableaux du solveur.
const K = { empty: 0, wall: 1, src: 2, crys: 3, dark: 4, mir: 5, spl: 6, flt: 7, pri: 8 } as const;
const KIND: Record<string, number> = K;

/** Plateau compact du solveur : sorte, orientation et couleur de chaque case dans des tableaux typés. */
export class Board {
  readonly w: number;
  readonly h: number;
  readonly kind: Uint8Array;
  readonly ori: Uint8Array;
  readonly col: Uint8Array;
  /** Cases déclarées vides pour toujours. */
  readonly empty: Uint8Array;
  // tampons réutilisés d'une simulation à l'autre (aucune allocation pendant la recherche)
  private seenStamp: Uint32Array;
  private cellStamp: Uint32Array;
  private hits: Uint8Array;
  private dist: Int32Array;
  private q: Int32Array;
  private stamp = 0;

  constructor(L: Level, grid: Grid) {
    const n = L.w * L.h;
    this.w = L.w; this.h = L.h;
    this.kind = new Uint8Array(n); this.ori = new Uint8Array(n); this.col = new Uint8Array(n); this.empty = new Uint8Array(n);
    for (let i = 0; i < n; i++) this.set(i, grid[i]);
    this.seenStamp = new Uint32Array(n * 4 * 8 * 2);
    this.cellStamp = new Uint32Array(n);
    this.hits = new Uint8Array(n);
    this.dist = new Int32Array(n);
    this.q = new Int32Array(MAX_QUEUE * 5);
  }

  set(i: number, g: Cell | null): void {
    this.kind[i] = g ? KIND[g.t] ?? K.wall : K.empty;
    this.ori[i] = g?.o ?? 0;
    this.col[i] = g?.c ?? 0;
  }

  /**
   * Une simulation (mêmes règles que trace()) qui dit en un passage : gagné ?, condamné ?, et
   * quelle case vide éclairée non décidée est la plus proche (sign = 1) ou la plus lointaine
   * (sign = -1) d'une source (-1 s'il n'y en a pas). Un rayon est « définitif » quand toutes les
   * cases traversées depuis sa source sont décidées (pièce, ou case déclarée vide) : plus rien
   * ne pourra le modifier. S'il touche un cristal d'ombre ou apporte une couleur en trop à un
   * cristal, la branche est condamnée.
   */
  probe(sign: number): { win: boolean; doomed: boolean; frontier: number } {
    const W = this.w, H = this.h, n = W * H, kind = this.kind, ori = this.ori, col = this.col, q = this.q;
    const st = ++this.stamp;
    let head = 0, tail = 0, doomedRay = false, best = -1, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (kind[i] === K.src && tail < MAX_QUEUE) {
        const o = tail * 5; q[o] = i % W; q[o + 1] = (i / W) | 0; q[o + 2] = ori[i]; q[o + 3] = col[i]; q[o + 4] = 1; rayDist[tail] = 0; tail++;
      }
    }
    while (head < tail) {
      const o = head * 5; head++;
      let x = q[o], y = q[o + 1], dist = 0;
      const d = q[o + 2], c = q[o + 3];
      let perm = q[o + 4] === 1;
      const push = (nx: number, ny: number, nd: number, nc: number): void => {
        if (tail >= MAX_QUEUE) return;
        const p = tail * 5; q[p] = nx; q[p + 1] = ny; q[p + 2] = nd; q[p + 3] = nc; q[p + 4] = perm ? 1 : 0; tail++;
        rayDist[tail - 1] = dist;
      };
      dist = rayDist[head - 1];
      for (;;) {
        x += DX[d]; y += DY[d]; dist++;
        if (x < 0 || y < 0 || x >= W || y >= H) break;
        const i = y * W + x;
        const k = ((i * 4 + d) * 8 + c) * 2 + (perm ? 1 : 0);
        if (this.seenStamp[k] === st) break;
        this.seenStamp[k] = st;
        if (this.cellStamp[i] !== st) { this.cellStamp[i] = st; this.hits[i] = 0; this.dist[i] = dist; }
        else if (dist < this.dist[i]) this.dist[i] = dist;
        const g = kind[i];
        if (g === K.empty) {
          if (!this.empty[i]) {
            perm = false;
            const v = sign * this.dist[i];
            if (v < bestD || (v === bestD && i < best)) { bestD = v; best = i; }
          }
          continue;
        }
        if (g === K.wall || g === K.src) break;
        if (g === K.crys || g === K.dark) {
          this.hits[i] |= c;
          if (perm && (g === K.dark || (c & ~col[i]))) doomedRay = true;
          break;
        }
        const oo = ori[i];
        if (g === K.mir) { push(x, y, MIR[oo][d], c); break; }
        if (g === K.spl) { push(x, y, d, c); push(x, y, MIR[oo][d], c); break; }
        if (g === K.flt) { const nc = c & col[i]; if (nc) push(x, y, d, nc); break; }
        if (g === K.pri) {
          if (d === oo) {
            if (c & 1) push(x, y, (d + 3) % 4, 1);
            if (c & 2) push(x, y, d, 2);
            if (c & 4) push(x, y, (d + 1) % 4, 4);
          }
          break;
        }
        break;
      }
    }
    let win = true;
    for (let i = 0; i < n && win; i++) {
      const g = kind[i];
      if (g !== K.crys && g !== K.dark) continue;
      const h = this.cellStamp[i] === st ? this.hits[i] : 0;
      if (g === K.crys ? h !== col[i] : h !== 0) win = false;
    }
    return { win, doomed: doomedRay, frontier: best };
  }
}

/** Nombre maximal de rayons suivis par simulation (même garde-fou que trace()). */
const MAX_QUEUE = 8000;
/** Distance de départ de chaque rayon de la file. */
const rayDist = new Int32Array(MAX_QUEUE);

export function solve(L: Level, opts: SolveOptions = {}): SolveResult {
  const maxNodes = opts.maxNodes ?? 2_000_000;
  const sign = opts.strategy === 'far' ? -1 : 1;
  const base = startGrid(L);
  // les sources sont rangées avec leur direction comme orientation
  for (const g of base) if (g && g.t === 'src') g.o = g.d;
  const rotIdx: number[] = [];
  base.forEach((g, i) => { if (g && g.rot) rotIdx.push(i); });
  const count: Record<string, number> = {};
  const proto: Record<string, TrayPiece> = {};
  for (const p of L.tray) { const k = pieceKey(p); count[k] = (count[k] || 0) + 1; proto[k] = p; }
  const keys = Object.keys(count);
  const kinds = keys.map(k => ({ k, kind: KIND[proto[k].t], c: proto[k].c ?? 0, n: orientations(proto[k].t) }));
  let left = L.tray.length;
  let nodes = 0, aborted = false;

  // toutes les combinaisons d'orientation des pièces fixes orientables
  const combos: number[][] = [];
  (function rec(i: number, acc: number[]) {
    if (i === rotIdx.length) { combos.push(acc.slice()); return; }
    const g = base[rotIdx[i]] as Cell;
    for (let o = 0; o < orientations(g.t); o++) { acc.push(o); rec(i + 1, acc); acc.pop(); }
  })(0, []);

  const placed: { i: number; k: string; o: number }[] = [];
  const b = new Board(L, base);

  function dfs(): boolean {
    if (nodes++ > maxNodes) { aborted = true; return false; }
    const r = b.probe(sign);
    if (r.win) return true;
    const c = r.frontier;
    if (!left || c < 0 || r.doomed) return false;
    // d'abord laisser la case vide (la plupart des cases le restent dans une solution)
    b.empty[c] = 1;
    const keep = dfs();
    b.empty[c] = 0;
    if (keep || aborted) return keep;
    for (const pk of kinds) {
      if (!count[pk.k]) continue;
      for (let o = 0; o < pk.n; o++) {
        b.kind[c] = pk.kind; b.ori[c] = o; b.col[c] = pk.c;
        count[pk.k]--; left--; placed.push({ i: c, k: pk.k, o });
        const ok = dfs();
        b.kind[c] = K.empty; b.ori[c] = 0; b.col[c] = 0;
        count[pk.k]++; left++;
        if (ok) return true;
        placed.pop();
        if (aborted) return false;
      }
    }
    return false;
  }

  for (const cb of combos) {
    rotIdx.forEach((ix, j) => { b.ori[ix] = cb[j]; });
    if (dfs()) {
      const place = placed.map(({ i, k, o }) => {
        const p = proto[k];
        const st: SolStep & { t: string } = { x: i % L.w, y: (i / L.w) | 0, t: p.t, o };
        if (p.c !== undefined) st.c = p.c;
        return st;
      });
      const rotate = rotIdx.map((ix, j) => ({ x: ix % L.w, y: (ix / L.w) | 0, o: cb[j] }));
      return { solution: { place, rotate }, nodes, aborted: false };
    }
    if (aborted) break;
  }
  return { solution: null, nodes, aborted };
}

/** Essaie les deux stratégies avec un budget qui double à chaque tour, jusqu'à totalNodes. */
export function solveAny(L: Level, totalNodes = 4_000_000): SolveResult {
  let used = 0, budget = 50_000;
  while (used < totalNodes) {
    for (const strategy of ['near', 'far'] as const) {
      const r = solve(L, { maxNodes: Math.min(budget, totalNodes - used), strategy });
      used += r.nodes;
      if (r.solution || !r.aborted) return { ...r, nodes: used };
      if (used >= totalNodes) break;
    }
    budget *= 2;
  }
  return { solution: null, nodes: used, aborted: true };
}

/** Applique une solution (pose + rotations) sur le plateau de départ et dit si le niveau est gagné.
 * Refuse une pièce absente de la réserve, hors du plateau ou posée sur une case occupée. */
export function checkSolution(L: Level, place: SolStep[], rotate: SolStep[] = []): boolean {
  const grid = startGrid(L);
  const left: Record<string, number> = {};
  for (const p of L.tray) { const k = pieceKey(p); left[k] = (left[k] || 0) + 1; }
  for (const p of place) {
    if (p.x < 0 || p.y < 0 || p.x >= L.w || p.y >= L.h) return false;
    const k = pieceKey({ t: p.t ?? '', c: p.c });
    if (!left[k]) return false;
    left[k]--;
    const i = p.y * L.w + p.x;
    if (grid[i]) return false;
    const cell: Cell = { t: p.t ?? '', o: p.o ?? 0 };
    if (p.c !== undefined) cell.c = p.c;
    grid[i] = cell;
  }
  for (const r of rotate) {
    const g = grid[r.y * L.w + r.x];
    if (!g || !g.rot) return false;
    g.o = r.o;
  }
  return isWin(L, grid, trace(L, grid));
}
