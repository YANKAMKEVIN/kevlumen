import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, LEGACY_KEY, SAVE_VERSION, defaults, parse, migrate, isValid, load, write, fromLegacy } from '../../src/save.js';
import { memStore } from './helpers.mjs';

test('les valeurs par défaut sont valides', () => assert.ok(isValid(defaults())));

test('aller-retour : ce qui est sauvé est relu à l\'identique', () => {
  const st = memStore(); const d = defaults();
  d.done = { 0: 3, 1: 2, 29: 1 }; d.snd = false;
  assert.ok(write(st, d));
  assert.deepEqual(load(st), d);
});

test('sauvegarde absente : valeurs par défaut', () => assert.deepEqual(load(memStore()), defaults()));

test('stockage bloqué (navigation privée) : le jeu tourne quand même', () => {
  const blocked = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() {} };
  assert.deepEqual(load(blocked), defaults());
  assert.equal(write(blocked, defaults()), false);
  assert.deepEqual(load(null), defaults());
});

test('fichier abîmé : mis de côté, jamais écrasé en silence', () => {
  const bad = ['{pas du json', '[]', '"texte"', '{"version":1}',
    JSON.stringify({ ...defaults(), done: { 0: 4 } }), JSON.stringify({ ...defaults(), done: { 30: 1 } }),
    JSON.stringify({ ...defaults(), done: { a: 1 } }), JSON.stringify({ ...defaults(), snd: 'oui' })];
  for (const b of bad) {
    const st = memStore({ [KEY]: b });
    assert.deepEqual(load(st), defaults(), b);
    assert.equal(st.getItem(KEY + '.abimee'), b);
    assert.equal(st.getItem(KEY), null);
  }
});

test('sauvegarde d\'une version plus récente du jeu : refusée', () => {
  const d = { ...defaults(), version: SAVE_VERSION + 1 };
  assert.equal(migrate(d), null);
  assert.equal(parse(JSON.stringify(d)), null);
});

test('ancien format (kevlumen_v1) : progression reprise une fois, puis ancienne clé effacée', () => {
  const st = memStore({ [LEGACY_KEY]: JSON.stringify({ done: { 0: 3, 1: 1, 7: 2 }, snd: false }) });
  const d = load(st);
  assert.deepEqual(d.done, { 0: 3, 1: 1, 7: 2 });
  assert.equal(d.snd, false);
  assert.equal(st.getItem(LEGACY_KEY), null);
  assert.deepEqual(JSON.parse(st.getItem(KEY)), d);
});

test('ancien format partiellement abîmé : on garde ce qui est lisible', () => {
  assert.deepEqual(fromLegacy(JSON.stringify({ done: { 0: 3, 99: 2, x: 1, 2: 9 } })).done, { 0: 3 });
  assert.equal(fromLegacy('{oups'), null);
  const st = memStore({ [LEGACY_KEY]: '{oups' });
  assert.deepEqual(load(st), defaults());
});

test('write() refuse d\'écrire un état invalide', () => {
  const st = memStore(); const d = defaults(); d.done = { 0: 0 };
  assert.equal(write(st, d), false); assert.equal(st.getItem(KEY), null);
});
