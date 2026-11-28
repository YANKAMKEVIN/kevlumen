import { describe, expect, test } from 'vitest';
import { LEVELS } from '../../../src/engine/levels';
import { buildTray, isRotatable, MAX_HISTORY, orientations, pieceKey, Puzzle, startGrid, type PuzzleEvent } from '../../../src/engine/puzzle';
import { level, playSolution } from '../helpers';

const newGame = (i = 0, ev?: (e: PuzzleEvent) => void) => new Puzzle(LEVELS[i], i, ev);

describe('chargement', () => {
  test('la réserve est regroupée par sorte, les filtres par couleur', () => {
    const t = buildTray([{ t: 'mir' }, { t: 'flt', c: 1 }, { t: 'mir' }, { t: 'flt', c: 4 }, { t: 'flt', c: 1 }]);
    expect(t.map(s => [s.k, s.n])).toEqual([['mir', 2], ['flt1', 2], ['flt4', 1]]);
  });

  test('le plateau de départ copie les pièces du niveau sans les partager', () => {
    const L = LEVELS[1];
    const g = startGrid(L);
    const c = L.cells[0];
    const cell = g[c.y * L.w + c.x];
    expect(cell).not.toBe(c);
    expect(cell?.fixed).toBe(true);
    if (cell) cell.o = 99;
    expect(c.o).not.toBe(99);
  });

  test('orientations par sorte de pièce', () => {
    expect(['mir', 'spl', 'pri', 'flt', 'src'].map(orientations)).toEqual([2, 2, 4, 1, 1]);
    expect(isRotatable('flt')).toBe(false);
    expect(pieceKey({ t: 'flt', c: 6 })).toBe('flt6');
  });

  test('aucun niveau n\'est gagné avant d\'avoir joué', () => {
    LEVELS.forEach((_, i) => expect(newGame(i).isSolved(), `niveau ${i + 1}`).toBe(false));
  });

  test('chaque niveau se résout en jouant sa solution avec les vraies règles', () => {
    LEVELS.forEach((_, i) => expect(playSolution(i).isSolved(), `niveau ${i + 1}`).toBe(true));
  });

  test('un événement « load » est émis au chargement', () => {
    const ev: PuzzleEvent[] = [];
    newGame(0, e => ev.push(e));
    expect(ev).toEqual([{ type: 'load' }]);
  });
});

describe('poser, reprendre, tourner', () => {
  test('poser une pièce la retire de la réserve ; la reprendre l\'y remet', () => {
    const p = newGame();
    expect(p.tray[0].n).toBe(1);
    expect(p.place({ t: 'mir' }, 0, 0, 0)).toBe(true);
    expect(p.tray[0].n).toBe(0);
    expect(p.grid[0]?.t).toBe('mir');
    expect(p.moves).toBe(1);
    expect(p.pickUp(0)?.t).toBe('mir');
    p.returnPiece({ t: 'mir' });
    expect(p.tray[0].n).toBe(1);
    expect(p.grid[0]).toBeNull();
    expect(p.moves).toBe(2);
  });

  test('on ne pose pas sur une case occupée, hors plateau, ni depuis une pile vide', () => {
    const p = newGame();
    const occupied = p.grid.findIndex(g => g);
    expect(p.place({ t: 'mir' }, 0, occupied, 0)).toBe(false);
    expect(p.place({ t: 'mir' }, 0, -1, 0)).toBe(false);
    expect(p.place({ t: 'mir' }, 0, 999, 0)).toBe(false);
    expect(p.place({ t: 'mir' }, 0, 0, 0)).toBe(true);
    expect(p.place({ t: 'mir' }, 0, 1, 0)).toBe(false);
    expect(p.moves).toBe(1);
  });

  test('une pièce fixe ne se prend pas', () => {
    const p = newGame();
    const fixed = p.grid.findIndex(g => g);
    expect(p.pickUp(fixed)).toBeNull();
    expect(p.historySize).toBe(0);
  });

  test('toucher un miroir le fait pivoter ; une source ne pivote pas', () => {
    const p = newGame();
    p.place({ t: 'mir' }, 0, 0, 0);
    expect(p.rotateAt(0)).toBe(true); expect(p.grid[0]?.o).toBe(1);
    expect(p.rotateAt(0)).toBe(true); expect(p.grid[0]?.o).toBe(0);
    const src = p.grid.findIndex(g => g && g.t === 'src');
    const d = p.grid[src]?.d, m = p.moves;
    expect(p.rotateAt(src)).toBe(false);
    expect(p.grid[src]?.d).toBe(d);
    expect(p.moves).toBe(m);
  });

  test('un prisme fait un tour complet en 4 touchers', () => {
    const p = new Puzzle(level({ w: 3, h: 1, cells: [], tray: [{ t: 'pri' }] }));
    p.place({ t: 'pri' }, 0, 1, 0);
    const seen = [];
    for (let k = 0; k < 4; k++) { p.rotateAt(1); seen.push(p.grid[1]?.o); }
    expect(seen).toEqual([1, 2, 3, 0]);
  });

  test('toucher un filtre le fait rebondir sans compter de coup ni remplir l\'historique', () => {
    const ev: PuzzleEvent[] = [];
    const p = new Puzzle(level({ w: 3, h: 1, cells: [], tray: [{ t: 'flt', c: 2 }] }), 0, e => ev.push(e));
    p.place({ t: 'flt', c: 2 }, 0, 1, 0);
    const h = p.historySize, m = p.moves;
    expect(p.rotateAt(1)).toBe(false);
    expect(p.historySize).toBe(h);
    expect(p.moves).toBe(m);
    expect(ev.at(-1)).toEqual({ type: 'bump', i: 1 });
  });

  test('une pièce fixe orientable tourne, une pièce fixe ordinaire non', () => {
    const p = newGame(1); // « Pivot » : deux miroirs fixes orientables
    const rot = p.grid.findIndex(g => g && g.rot);
    const o = p.grid[rot]?.o;
    expect(p.rotateAt(rot)).toBe(true);
    expect(p.grid[rot]?.o).toBe(o ? 0 : 1);
    const wall = p.grid.findIndex(g => g && g.t === 'wall');
    expect(p.rotateAt(wall)).toBe(false);
  });

  test('les rayons sont recalculés après chaque coup', () => {
    const p = newGame();
    const before = p.trace;
    p.place({ t: 'mir' }, 0, p.idx(4, 4), 0);
    expect(p.trace).not.toBe(before);
    expect(p.isSolved()).toBe(true);
  });
});

describe('annuler, recommencer', () => {
  test('annuler défait les coups un par un, jusqu\'au plateau de départ', () => {
    const p = newGame();
    p.place({ t: 'mir' }, 0, 24, 0);
    p.rotateAt(24);
    expect(p.undo()).toBe(true);
    expect(p.grid[24]?.o).toBe(0);
    expect(p.undo()).toBe(true);
    expect(p.grid[24]).toBeNull();
    expect(p.tray[0].n).toBe(1);
    expect(p.moves).toBe(0);
    expect(p.undo()).toBe(false); // rien à annuler : pas d'erreur
  });

  test('annuler un déplacement remet la pièce à sa place d\'origine', () => {
    const p = newGame();
    p.place({ t: 'mir' }, 1, 3, 0);
    p.pickUp(3);
    p.place({ t: 'mir' }, 1, 7, -1, true);
    expect(p.undo()).toBe(true);
    expect(p.grid[7]).toBeNull();
    expect(p.grid[3]).toMatchObject({ t: 'mir', o: 1 });
  });

  test('annuler une rotation de pièce fixe orientable', () => {
    const p = newGame(1);
    const rot = p.grid.findIndex(g => g && g.rot);
    const o = p.grid[rot]?.o;
    const cell = p.grid[rot];
    p.rotateAt(rot);
    p.undo();
    expect(p.grid[rot]?.o).toBe(o);
    expect(p.grid[rot]).toBe(cell); // la pièce fixe reste le même objet
  });

  test('l\'événement « undo » liste les pièces rendues au plateau', () => {
    const ev: PuzzleEvent[] = [];
    const p = newGame(0, e => ev.push(e));
    p.place({ t: 'mir' }, 0, 3, 0);
    p.pickUp(3);
    p.undo();
    expect(ev.at(-1)).toEqual({ type: 'undo', restored: [3] });
  });

  test('l\'historique est borné', () => {
    const p = new Puzzle(level({ w: 3, h: 1, cells: [], tray: [{ t: 'mir' }] }));
    p.place({ t: 'mir' }, 0, 1, 0);
    for (let k = 0; k < MAX_HISTORY + 50; k++) p.rotateAt(1);
    expect(p.historySize).toBe(MAX_HISTORY);
  });

  test('recommencer remet le niveau à zéro', () => {
    const p = playSolution(3);
    expect(p.reset()).toBe(true);
    expect(p.moves).toBe(0);
    expect(p.hintsUsed).toBe(0);
    expect(p.historySize).toBe(0);
    expect(p.isSolved()).toBe(false);
  });
});

describe('victoire', () => {
  test('declareWin() ne marche que sur un plateau résolu, une seule fois', () => {
    const p = newGame();
    expect(p.declareWin()).toBe(false);
    p.place({ t: 'mir' }, 0, p.idx(4, 4), 0);
    expect(p.declareWin()).toBe(true);
    expect(p.declareWin()).toBe(false);
  });

  test('une fois gagné, plus aucun coup n\'est accepté', () => {
    const p = playSolution(0);
    p.declareWin();
    const i = p.idx(4, 4);
    expect(p.rotateAt(i)).toBe(false);
    expect(p.pickUp(i)).toBeNull();
    expect(p.undo()).toBe(false);
    expect(p.reset()).toBe(false);
    expect(p.place({ t: 'mir' }, 0, 0, -1)).toBe(false);
    expect(p.useHint()).toBeNull();
  });
});

describe('indices', () => {
  test('montre la première pièce de la solution et coûte un indice', () => {
    const p = newGame();
    const h = p.useHint();
    const s = p.level.sol[0];
    expect(h).toMatchObject({ i: p.idx(s.x, s.y), t: s.t, o: s.o });
    expect(p.hintsUsed).toBe(1);
  });

  test('computeHint() ne compte rien', () => {
    const p = newGame();
    p.computeHint(); p.computeHint();
    expect(p.hintsUsed).toBe(0);
  });

  test('désigne d\'abord la bonne case, puis une pièce en trop qui gêne', () => {
    const p = newGame();
    const s = p.level.sol[0], good = p.idx(s.x, s.y);
    const wrong = p.grid.findIndex((g, i) => !g && i !== good);
    p.place({ t: 'mir' }, s.o ?? 0, wrong, 0);
    expect(p.computeHint()?.i).toBe(good);
  });

  test('pièce en trop : l\'indice propose de la retirer', () => {
    const L = LEVELS[21]; // « Leurre » : une pièce de la réserve ne sert à rien
    const p = playSolution(21);
    const k = L.tray.findIndex(t => !L.sol.some(s => s.t === t.t && s.c === t.c));
    const slot = p.tray.findIndex(t => t.k === pieceKey(L.tray[k]));
    const free = p.grid.findIndex(g => !g);
    p.place(L.tray[k], 0, free, slot);
    expect(p.computeHint()).toEqual({ i: free, remove: true });
  });

  test('niveau à pièces fixes orientables : l\'indice désigne la pièce à tourner', () => {
    const p = newGame(1);
    const h = p.computeHint();
    expect(h?.rot).toBe(true);
    const s = (p.level.solRot || []).find(r => p.grid[p.idx(r.x, r.y)]?.o !== r.o);
    expect(h?.i).toBe(p.idx(s?.x ?? 0, s?.y ?? 0));
  });

  test('plateau résolu par la solution : plus d\'indice', () => {
    expect(playSolution(4).computeHint()).toBeNull();
  });
});
