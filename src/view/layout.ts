/** Mise en page du plateau et de la réserve selon l'écran, et repérage des cases. Sans DOM. */

export interface Slot { x: number; y: number; s: number; i: number }
export interface TrayBox { x: number; y: number; w: number; h: number; vert: boolean }
export interface Layout { cs: number; ox: number; oy: number; tray: TrayBox; slots: Slot[] }

export interface LayoutInput {
  /** Taille de la fenêtre (px CSS). */
  vw: number;
  vh: number;
  /** Bas de la barre du haut et de la bulle d'aide (0 si absente). */
  hudBottom: number;
  tipBottom: number;
  /** Plateau en cases. */
  w: number;
  h: number;
  /** Nombre de piles dans la réserve. */
  slots: number;
}

export const PAD = 14;
export const TRAY_SIDE = 110;
export const TRAY_BOTTOM = 112;
export const MAX_CELL = 104;
export const MIN_CELL = 28;

/** Écran large : la réserve passe à droite. */
export const isWide = (vw: number, vh: number): boolean => vw > vh * 1.2;

/** « depuis le bas » n'est vrai que si la réserve est en bas (sinon elle est à droite). */
export function hintFor(text: string, vw: number, vh: number): string {
  return isWide(vw, vh) ? text.replace('depuis le bas', 'depuis la droite') : text;
}

export function emptyLayout(): Layout {
  return { cs: 60, ox: 0, oy: 0, tray: { x: 0, y: 0, w: 0, h: 0, vert: false }, slots: [] };
}

export function computeLayout(p: LayoutInput): Layout {
  // le plateau commence sous la barre du haut et sous la bulle d'aide (qui peut faire 2-3 lignes sur téléphone)
  const top = Math.max(72, Math.ceil(p.hudBottom) + 6, p.tipBottom ? Math.ceil(p.tipBottom) + 10 : 0);
  const vert = isWide(p.vw, p.vh);
  const tw = vert ? TRAY_SIDE : p.vw, th = vert ? p.vh : TRAY_BOTTOM;
  const aw = p.vw - PAD * 2 - (vert ? tw : 0), ah = p.vh - top - PAD - (vert ? 0 : th);
  let cs = Math.floor(Math.min(aw / p.w, ah / p.h, MAX_CELL));
  cs = Math.max(cs, MIN_CELL);
  const bw = cs * p.w, bh = cs * p.h;
  const tray: TrayBox = { vert, x: vert ? p.vw - tw : 0, y: vert ? 0 : p.vh - th, w: tw, h: th };
  return {
    cs,
    ox: Math.round(PAD + (aw - bw) / 2),
    oy: Math.round(top + (ah - bh) / 2),
    tray,
    slots: layoutSlots(tray, p.slots, cs, p.vw, p.vh),
  };
}

function layoutSlots(t: TrayBox, n: number, cs: number, vw: number, vh: number): Slot[] {
  const sz = Math.min(74, Math.max(52, cs * 0.95)), gap = 12;
  const total = n * sz + (n - 1) * gap;
  const out: Slot[] = [];
  for (let i = 0; i < n; i++) {
    if (t.vert) out.push({ x: t.x + t.w / 2, y: vh / 2 - total / 2 + sz / 2 + i * (sz + gap), s: sz, i });
    else out.push({ x: vw / 2 - total / 2 + sz / 2 + i * (sz + gap), y: t.y + t.h / 2 - 4, s: sz, i });
  }
  return out;
}

/** Case sous le point (px, py), ou -1. */
export function cellAt(lay: Layout, w: number, h: number, px: number, py: number): number {
  const x = Math.floor((px - lay.ox) / lay.cs), y = Math.floor((py - lay.oy) / lay.cs);
  if (x < 0 || y < 0 || x >= w || y >= h) return -1;
  return y * w + x;
}

/** Pile de la réserve sous le point (avec une marge pour le doigt), ou null. */
export function slotAt(lay: Layout, px: number, py: number): Slot | null {
  for (const s of lay.slots) {
    if (Math.abs(px - s.x) < s.s / 2 + 6 && Math.abs(py - s.y) < s.s / 2 + 6) return s;
  }
  return null;
}

/** Centre de la case i en px. */
export function cellCenter(lay: Layout, w: number, i: number): [number, number] {
  return [lay.ox + ((i % w) + 0.5) * lay.cs, lay.oy + (((i / w) | 0) + 0.5) * lay.cs];
}
