/**
 * Règles d'un niveau : poser, tourner, reprendre, annuler, indices, victoire.
 * Moteur pur : aucun DOM, aucun son, aucune animation. L'interface s'abonne aux
 * événements (onEvent) pour jouer un son ou animer une pièce.
 */
import { incomingDir, isWin, trace } from './sim';
import type { Cell, Grid, Hint, Level, Trace, TrayPiece, TraySlot } from './types';

/** Taille maximale de l'historique d'annulation. */
export const MAX_HISTORY = 200;

/** Clé de réserve d'une pièce : les filtres sont rangés par couleur. */
export const pieceKey = (p: TrayPiece): string => (p.t === 'flt' ? 'flt' + p.c : p.t);

/** Nombre d'orientations distinctes d'une sorte de pièce. */
export function orientations(t: string): number {
  return t === 'mir' || t === 'spl' ? 2 : t === 'pri' ? 4 : 1;
}

/** Peut-on la faire pivoter ? */
export const isRotatable = (t: string): boolean => orientations(t) > 1;

interface Snapshot {
  g: (Cell | null)[];
  tr: number[];
  moves: number;
}

export type PuzzleEvent =
  | { type: 'load' }
  | { type: 'place'; i: number }
  | { type: 'pickup'; i: number }
  | { type: 'return' }
  | { type: 'rotate'; i: number }
  | { type: 'bump'; i: number }
  | { type: 'undo'; restored: number[] };

/** Regroupe la réserve d'un niveau en piles. */
export function buildTray(pieces: TrayPiece[]): TraySlot[] {
  const m = new Map<string, TraySlot>();
  for (const p of pieces) {
    const k = pieceKey(p);
    let s = m.get(k);
    if (!s) { s = { t: p.t, c: p.c, n: 0, k }; m.set(k, s); }
    s.n++;
  }
  return [...m.values()];
}

/** Plateau de départ d'un niveau (copies des pièces fixes). */
export function startGrid(L: Level): Grid {
  const grid: Grid = new Array(L.w * L.h).fill(null);
  for (const c of L.cells) {
    const g: Cell = { t: c.t, fixed: true };
    if (c.o !== undefined) g.o = c.o;
    if (c.c !== undefined) g.c = c.c;
    if (c.d !== undefined) g.d = c.d;
    if (c.rot !== undefined) g.rot = c.rot;
    grid[c.y * L.w + c.x] = g;
  }
  return grid;
}

export class Puzzle {
  readonly level: Level;
  readonly index: number;
  grid: Grid = [];
  tray: TraySlot[] = [];
  moves = 0;
  hintsUsed = 0;
  won = false;
  /** Rayons du plateau courant, recalculés après chaque coup. */
  trace!: Trace;
  private hist: Snapshot[] = [];
  private listener: (e: PuzzleEvent, p: Puzzle) => void;

  constructor(level: Level, index = 0, onEvent: (e: PuzzleEvent, p: Puzzle) => void = () => {}) {
    this.level = level;
    this.index = index;
    this.listener = onEvent;
    this.load();
  }

  get historySize(): number { return this.hist.length; }

  /** (Re)charge le niveau. */
  private load(): void {
    this.grid = startGrid(this.level);
    this.tray = buildTray(this.level.tray);
    this.hist = []; this.moves = 0; this.hintsUsed = 0; this.won = false;
    this.recompute();
    this.listener({ type: 'load' }, this);
  }

  /** Recommence le niveau (sans effet une fois gagné). */
  reset(): boolean {
    if (this.won) return false;
    this.load();
    return true;
  }

  recompute(): Trace { this.trace = trace(this.level, this.grid); return this.trace; }

  /** Index de case depuis des coordonnées. */
  idx(x: number, y: number): number { return y * this.level.w + x; }

  private snapshot(): Snapshot {
    return {
      g: this.grid.map(c => (c && !c.fixed ? { t: c.t, o: c.o, c: c.c } : c && c.rot ? { t: c.t, o: c.o } : null)),
      tr: this.tray.map(s => s.n),
      moves: this.moves,
    };
  }

  pushHist(): void {
    this.hist.push(this.snapshot());
    if (this.hist.length > MAX_HISTORY) this.hist.shift();
  }

  /** Annule le dernier coup. Renvoie false s'il n'y a rien à annuler. */
  undo(): boolean {
    if (this.won || !this.hist.length) return false;
    const s = this.hist.pop() as Snapshot;
    const restored: number[] = [];
    this.grid.forEach((c, i) => {
      const v = s.g[i];
      if (c && c.fixed) { if (c.rot && v) c.o = v.o; }
      else {
        this.grid[i] = v ? { t: v.t, o: v.o, c: v.c } : null;
        if (v) restored.push(i);
      }
    });
    this.tray.forEach((t, i) => { t.n = s.tr[i]; });
    this.moves = s.moves;
    this.recompute();
    this.listener({ type: 'undo', restored }, this);
    return true;
  }

  /** Pose une pièce sur la case i : depuis la réserve si slot >= 0, sinon une pièce déjà retirée du plateau
   * (l'historique a alors été poussé par pickUp). */
  place(proto: TrayPiece, o: number, i: number, slot = -1, histPushed = false): boolean {
    if (this.won || i < 0 || i >= this.grid.length || this.grid[i]) return false;
    if (slot >= 0) {
      const s = this.tray[slot];
      if (!s || s.n <= 0) return false;
      this.pushHist(); s.n--;
    } else if (!histPushed) this.pushHist();
    const g: Cell = { t: proto.t, o };
    if (proto.c !== undefined) g.c = proto.c;
    this.grid[i] = g;
    this.moves++;
    this.recompute();
    this.listener({ type: 'place', i }, this);
    return true;
  }

  /** Prend en main une pièce mobile du plateau (début d'un glisser). */
  pickUp(i: number): Cell | null {
    const g = this.grid[i];
    if (this.won || !g || g.fixed) return null;
    this.pushHist();
    this.grid[i] = null;
    this.recompute();
    this.listener({ type: 'pickup', i }, this);
    return g;
  }

  /** Rend à la réserve une pièce prise sur le plateau. */
  returnPiece(proto: TrayPiece): void {
    const k = pieceKey(proto);
    const s = this.tray.find(t => t.k === k);
    if (s) s.n++;
    this.moves++;
    this.listener({ type: 'return' }, this);
  }

  /** Fait pivoter la pièce de la case i si elle peut l'être (pièce mobile, ou fixe orientable). */
  rotateAt(i: number): boolean {
    const g = this.grid[i];
    if (this.won || !g || (g.fixed && !g.rot)) return false;
    if (!isRotatable(g.t)) { this.listener({ type: 'bump', i }, this); return false; }
    this.pushHist();
    g.o = ((g.o ?? 0) + 1) % orientations(g.t);
    this.moves++;
    this.recompute();
    this.listener({ type: 'rotate', i }, this);
    return true;
  }

  /** Le plateau est-il résolu ? */
  isSolved(): boolean {
    return isWin(this.level, this.grid, this.trace);
  }

  /** Déclare la victoire si le plateau est résolu ; plus aucun coup n'est accepté ensuite. */
  declareWin(): boolean {
    if (this.won || !this.isSolved()) return false;
    this.won = true;
    return true;
  }

  /** Direction du rayon qui entrerait dans la case i (pour orienter un prisme). */
  incomingDir(i: number): number { return incomingDir(this.level, this.trace, i); }

  /** Calcule l'indice suivant sans le compter. */
  computeHint(): Hint | null {
    const L = this.level;
    for (const s of L.solRot || []) {
      const i = this.idx(s.x, s.y), g = this.grid[i];
      if (g && g.o !== s.o) return { i, t: g.t, o: s.o, c: g.c, rot: true };
    }
    for (const s of L.sol) {
      const i = this.idx(s.x, s.y), g = this.grid[i];
      if (!g || g.t !== s.t || (g.o !== s.o && s.t !== 'flt') || g.c !== s.c) return { i, t: s.t, o: s.o, c: s.c };
    }
    for (let i = 0; i < this.grid.length; i++) {
      const g = this.grid[i];
      if (g && !g.fixed && !L.sol.some(s => this.idx(s.x, s.y) === i)) return { i, remove: true };
    }
    return null;
  }

  /** Montre un indice et le compte (chaque indice coûte une étoile). */
  useHint(): Hint | null {
    if (this.won) return null;
    const h = this.computeHint();
    if (h) this.hintsUsed++;
    return h;
  }
}
