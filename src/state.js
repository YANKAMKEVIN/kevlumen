// @ts-check
/** État mutable partagé, et liaisons vers l'interface. */

/** Pièce sur une case. t : src, crys, dark, wall, mir, spl, pri, flt. o : orientation, c : couleur (bits R=1 V=2 B=4), d : direction d'une source.
 * a/ta : angle affiché et visé, pop : rebond, l : éclat d'un cristal, fixed : fait partie du niveau, rot : pièce fixe qu'on peut tourner.
 * @typedef {{t:string,o?:number,c?:number,d?:number,x?:number,y?:number,a?:number,ta?:number,pop?:number,l?:number,fixed?:boolean,rot?:number|boolean}} Cell */
/** @typedef {{t?:string,x:number,y:number,o?:number,c?:number}} SolStep */
/** @typedef {{w:number,h:number,cells:(Cell&{x:number,y:number})[],tray:{t:string,c?:number}[],sol:SolStep[],solRot?:SolStep[],name:string,hint:string}} Level */
/** Résultat de trace() : segments [x0,y0,x1,y1,couleur,dist0,dist1], couleurs reçues par case, cases éclairées, distance d'arrivée.
 * @typedef {{segs:number[][],hits:Map<number,number>,lit:Set<number>,hd:Map<number,number>}} Trace */
/** @typedef {{t:string,c?:number,n:number,k:string}} TraySlot */
/** @typedef {{x:number,y:number,s:number,i:number}} Slot */
/** @typedef {{cs:number,ox:number,oy:number,tray:{x:number,y:number,w:number,h:number,vert:boolean},slots:Slot[]}} Layout */
/** @typedef {{g:any[],tr:number[],moves:number}} Snapshot */

/** État mutable partagé (anciennes variables globales). */
export const etat = {
  DPR: 1,
  VW: 0,
  VH: 0,
  /** @type {'title'|'play'} */ mode: 'title',
  /** Niveau en cours (null hors partie ; les règles ne tournent qu'en partie). @type {Level} */ L: /** @type {any} */ (null),
  LI: 0,
  /** @type {(Cell|null)[]} */ grid: [],
  /** @type {TraySlot[]} */ tray: [],
  /** @type {Snapshot[]} */ hist: [],
  moves: 0,
  hintsUsed: 0,
  won: false,
  wonT: 0,
  /** Rayons du plateau, recalculés à chaque coup (null avant le premier niveau). @type {Trace} */ tr: /** @type {any} */ (null),
  /** @type {Trace|null} */ prevTr: null,
  reveal: 1e9,
  maxDist: 0,
  /** @type {Map<number,any>} */ litState: new Map(),
  /** @type {Layout} */ lay: {cs:60,ox:0,oy:0,tray:{x:0,y:0,w:0,h:0,vert:false},slots:[]},
  /** @type {any} */ drag: null,
  hoverCell: -1,
  /** @type {any} */ hint: null,
  T: 0,
  checkLater: false,
  /** @type {number|null} */ pid: null,
  /** @type {Set<number>} */ lastOkSet: new Set(),
  /** @type {Set<number>} */ lastDarkSet: new Set(),
  crysOrder: 0,
};
/** Liaisons vers l'interface, branchées par ui.js (vides sous Node). */
export const fx={/** @param {number} _i */ levelLoaded(_i){}};
