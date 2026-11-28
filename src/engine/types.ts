/**
 * Types du moteur de puzzle (aucune dépendance au DOM).
 *
 * Couleurs : bits additifs R=1, V=2, B=4 (3 jaune, 5 magenta, 6 cyan, 7 blanc).
 * Directions : 0 droite, 1 bas, 2 gauche, 3 haut.
 */

/** Sortes de pièces. */
export type PieceKind = 'src' | 'crys' | 'dark' | 'wall' | 'mir' | 'spl' | 'pri' | 'flt';

/** Bits de couleur (0..7). */
export type Color = number;
/** Direction 0..3. */
export type Dir = number;

/** Pièce posée sur une case (données pures, pas d'animation).
 * o : orientation (miroir/séparateur 0 « / », 1 « \ » ; prisme : direction d'entrée 0..3),
 * c : couleur, d : direction d'une source, fixed : fait partie du niveau, rot : pièce fixe qu'on peut tourner. */
export interface Cell {
  t: PieceKind | string;
  o?: number;
  c?: Color;
  d?: Dir;
  fixed?: boolean;
  rot?: number | boolean;
}

/** Plateau : tableau w*h, case vide = null. */
export type Grid = (Cell | null)[];

/** Une étape de la solution enregistrée. */
export interface SolStep {
  t?: string;
  x: number;
  y: number;
  o?: number;
  c?: Color;
}

/** Pièce de la réserve telle que décrite par le niveau. */
export interface TrayPiece {
  t: string;
  c?: Color;
}

/** Un niveau (données générées par outils/gen.js). */
export interface Level {
  w: number;
  h: number;
  cells: (Cell & { x: number; y: number })[];
  tray: TrayPiece[];
  sol: SolStep[];
  solRot?: SolStep[];
  name: string;
  hint: string;
  cov?: number;
  span?: number;
}

/** Dimensions minimales pour tracer des rayons. */
export interface Board {
  w: number;
  h: number;
}

/** Segment de rayon : [x0, y0, x1, y1, couleur, distance au départ, distance à l'arrivée]. */
export type Segment = [number, number, number, number, number, number, number];

/** Résultat de trace() : segments, couleurs reçues par case, cases éclairées, distance d'arrivée. */
export interface Trace {
  segs: Segment[];
  hits: Map<number, number>;
  lit: Set<number>;
  hd: Map<number, number>;
}

/** Pile de la réserve, regroupée par sorte (les filtres par couleur). */
export interface TraySlot {
  t: string;
  c?: Color;
  n: number;
  k: string;
}

/** Ce que montre un indice. */
export interface Hint {
  i: number;
  t?: string;
  o?: number;
  c?: Color;
  rot?: boolean;
  remove?: boolean;
}
