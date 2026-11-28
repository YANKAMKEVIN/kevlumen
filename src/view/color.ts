/** Couleurs des rayons, interpolation, constantes de dessin. Sans DOM. */

export const TAU = Math.PI * 2;

/** Couleur RVB de chaque combinaison de bits (0 : gris des pièces éteintes). */
export const COL: Record<number, readonly [number, number, number]> = {
  1: [255, 64, 92], 2: [64, 255, 128], 4: [70, 120, 255], 3: [255, 214, 70],
  5: [255, 70, 230], 6: [70, 240, 255], 7: [255, 255, 255], 0: [120, 110, 150],
};

/** Cache des chaînes rgba() : le rendu en demande des milliers par image. */
const cache = new Map<number, string>();

/** rgba() d'une couleur de rayon ; l'opacité est arrondie au millième pour profiter du cache. */
export function rgba(c: number, a: number): string {
  const q = Math.round(Math.max(0, Math.min(1, a)) * 1000);
  const key = (c & 7) * 1001 + q;
  let s = cache.get(key);
  if (s === undefined) {
    const k = COL[c & 7];
    s = `rgba(${k[0]},${k[1]},${k[2]},${q / 1000})`;
    cache.set(key, s);
  }
  return s;
}

export const ease = (a: number, b: number, k: number): number => a + (b - a) * k;
