import { describe, expect, test } from 'vitest';
import {
  BROKEN_KEY, defaults, fromLegacy, isValid, KEY, LEGACY_KEY, load, migrate, MIGRATIONS, parse, SAVE_VERSION, write,
} from '../../../src/engine/save';
import { memStore } from '../helpers';

const v1 = (done: Record<string, number> = {}, snd = true) => ({ version: 1, done, snd });

describe('format et validation', () => {
  test('les valeurs par défaut sont valides et à la version courante', () => {
    expect(isValid(defaults())).toBe(true);
    expect(defaults().version).toBe(SAVE_VERSION);
    expect(defaults().settings.sound).toBe(true);
  });

  test('chaque version antérieure a une étape de migration', () => {
    for (let v = 1; v < SAVE_VERSION; v++) expect(typeof MIGRATIONS[v], `v${v}`).toBe('function');
  });

  test.each([
    ['étoiles hors bornes', { done: { 0: 4 } }],
    ['étoiles à zéro', { done: { 0: 0 } }],
    ['étoiles non entières', { done: { 0: 2.5 } }],
    ['niveau hors bornes', { done: { 30: 1 } }],
    ['niveau négatif', { done: { '-1': 1 } }],
    ['clé non numérique', { done: { a: 1 } }],
    ['done en tableau', { done: [3, 3] }],
    ['réglages absents', { settings: undefined }],
    ['son non booléen', { settings: { sound: 'oui' } }],
  ])('invalide : %s', (_nom, patch) => {
    expect(isValid({ ...defaults(), ...patch })).toBe(false);
  });
});

describe('aller-retour et stockage', () => {
  test('ce qui est sauvé est relu à l\'identique', () => {
    const st = memStore(); const d = defaults();
    d.done = { 0: 3, 1: 2, 29: 1 }; d.settings.sound = false;
    expect(write(st, d)).toBe(true);
    expect(load(st)).toEqual(d);
  });

  test('sauvegarde absente : valeurs par défaut', () => expect(load(memStore())).toEqual(defaults()));

  test('stockage bloqué (navigation privée) : le jeu tourne quand même', () => {
    const blocked = { getItem(): string { throw new Error('bloqué'); }, setItem(): void { throw new Error('bloqué'); }, removeItem(): void {} };
    expect(load(blocked)).toEqual(defaults());
    expect(write(blocked, defaults())).toBe(false);
    expect(load(null)).toEqual(defaults());
    expect(write(null, defaults())).toBe(false);
  });

  test('stockage plein : write() renvoie false sans lever d\'erreur', () => {
    const full = { ...memStore(), setItem(): void { throw new DOMException('quota', 'QuotaExceededError'); } };
    expect(write(full, defaults())).toBe(false);
  });

  test('write() refuse d\'écrire un état invalide', () => {
    const st = memStore(); const d = defaults(); d.done = { 0: 0 };
    expect(write(st, d)).toBe(false);
    expect(st.getItem(KEY)).toBeNull();
  });
});

describe('sauvegarde abîmée ou trop récente', () => {
  const bad = ['{pas du json', '[]', '"texte"', 'null', '42', '{"version":2}', '{"version":"2"}',
    JSON.stringify({ ...defaults(), done: { 0: 4 } }), JSON.stringify({ ...defaults(), done: { 30: 1 } }),
    JSON.stringify({ ...defaults(), done: { a: 1 } }), JSON.stringify({ ...defaults(), settings: { sound: 'oui' } }),
    JSON.stringify(v1({ 0: 9 }))];
  test.each(bad)('mise de côté, jamais écrasée en silence : %s', b => {
    const st = memStore({ [KEY]: b });
    expect(load(st)).toEqual(defaults());
    expect(st.getItem(BROKEN_KEY)).toBe(b);
    expect(st.getItem(KEY)).toBeNull();
  });

  test('version plus récente du jeu : refusée (et mise de côté)', () => {
    const d = { ...defaults(), version: SAVE_VERSION + 1 };
    expect(migrate(d)).toBeNull();
    expect(parse(JSON.stringify(d))).toBeNull();
    const st = memStore({ [KEY]: JSON.stringify(d) });
    expect(load(st)).toEqual(defaults());
    expect(st.getItem(BROKEN_KEY)).toBe(JSON.stringify(d));
  });

  test('version 0 ou négative : refusée', () => {
    expect(migrate({ ...defaults(), version: 0 })).toBeNull();
    expect(migrate({ ...defaults(), version: -3 })).toBeNull();
  });
});

describe('migrations', () => {
  test('v1 -> v2 : le son passe dans les réglages, la progression est gardée', () => {
    expect(migrate(v1({ 0: 3, 5: 2 }, false))).toEqual({ version: 2, done: { 0: 3, 5: 2 }, settings: { sound: false } });
  });

  test('v1 sans réglage de son lisible : son activé par défaut', () => {
    expect(migrate({ version: 1, done: {} })).toEqual({ version: 2, done: {}, settings: { sound: true } });
  });

  test('migrate() ne modifie pas l\'objet d\'origine', () => {
    const d = v1({ 1: 1 });
    const copy = structuredClone(d);
    migrate(d);
    expect(d).toEqual(copy);
  });

  test('une sauvegarde v1 est lue puis réécrite tout de suite au format courant', () => {
    const st = memStore({ [KEY]: JSON.stringify(v1({ 2: 3 }, false)) });
    const d = load(st);
    expect(d.done).toEqual({ 2: 3 });
    expect(d.settings.sound).toBe(false);
    expect(JSON.parse(st.getItem(KEY) as string)).toEqual({ version: SAVE_VERSION, done: { 2: 3 }, settings: { sound: false } });
  });

  test('une sauvegarde déjà au format courant n\'est pas réécrite au chargement', () => {
    const st = memStore({ [KEY]: JSON.stringify(defaults()) });
    let writes = 0;
    const spy = { ...st, setItem: (k: string, v: string) => { writes++; st.setItem(k, v); } };
    load(spy);
    expect(writes).toBe(0);
  });
});

describe('ancien format (kevlumen_v1, sans version)', () => {
  test('progression reprise une fois, puis ancienne clé effacée', () => {
    const st = memStore({ [LEGACY_KEY]: JSON.stringify({ done: { 0: 3, 1: 1, 7: 2 }, snd: false }) });
    const d = load(st);
    expect(d.done).toEqual({ 0: 3, 1: 1, 7: 2 });
    expect(d.settings.sound).toBe(false);
    expect(st.getItem(LEGACY_KEY)).toBeNull();
    expect(JSON.parse(st.getItem(KEY) as string)).toEqual(d);
  });

  test('partiellement abîmé : on garde ce qui est lisible', () => {
    expect(fromLegacy(JSON.stringify({ done: { 0: 3, 99: 2, x: 1, 2: 9 } }))?.done).toEqual({ 0: 3 });
    expect(fromLegacy('{oups')).toBeNull();
    expect(fromLegacy('[1,2]')).toBeNull();
    expect(load(memStore({ [LEGACY_KEY]: '{oups' }))).toEqual(defaults());
  });

  test('si la nouvelle sauvegarde existe, l\'ancienne est ignorée', () => {
    const d = defaults(); d.done = { 4: 1 };
    const st = memStore({ [KEY]: JSON.stringify(d), [LEGACY_KEY]: JSON.stringify({ done: { 0: 3 } }) });
    expect(load(st).done).toEqual({ 4: 1 });
  });

  test('stockage en lecture seule : l\'ancienne clé est gardée (rien n\'est perdu)', () => {
    const st = memStore({ [LEGACY_KEY]: JSON.stringify({ done: { 0: 3 } }) });
    const ro = { ...st, setItem(): void { throw new Error('lecture seule'); } };
    expect(load(ro).done).toEqual({ 0: 3 });
    expect(st.getItem(LEGACY_KEY)).not.toBeNull();
  });
});
