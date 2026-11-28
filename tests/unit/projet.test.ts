// Règles de structure du projet : version cohérente, moteur pur, fichiers de taille raisonnable.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from 'vitest';
import { VERSION } from '../../src/version';

const ROOT = new URL('../../', import.meta.url).pathname;
function files(dir: string, ext = '.ts'): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}
const src = files(join(ROOT, 'src'));
const stripComments = (code: string): string => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('la version affichée suit package.json', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  expect(VERSION).toBe(pkg.version);
  expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
});

test('le moteur (src/engine) est pur : ni DOM, ni vue, ni application', () => {
  for (const f of src.filter(p => p.includes('/src/engine/'))) {
    const code = stripComments(readFileSync(f, 'utf8'));
    const rel = relative(ROOT, f);
    expect(code, rel).not.toMatch(/from '\.\.\/(view|app)\//);
    expect(code, rel).not.toMatch(/\b(document|window|localStorage|requestAnimationFrame)\b/);
  }
});

test('les modules de vue testés sous Node (layout, anim, color, state) ne touchent pas au DOM', () => {
  for (const name of ['layout', 'anim', 'color', 'state']) {
    const code = stripComments(readFileSync(join(ROOT, 'src/view', name + '.ts'), 'utf8'));
    expect(code, name).not.toMatch(/\b(document|window)\b/);
  }
});

test('aucun fichier source ne dépasse 400 lignes (hors données des niveaux)', () => {
  for (const f of src) {
    if (f.endsWith('levels.ts')) continue;
    const n = readFileSync(f, 'utf8').split('\n').length;
    expect(n, relative(ROOT, f)).toBeLessThanOrEqual(400);
  }
});

test('aucune ligne de code illisible (plus de 200 caractères, hors données des niveaux)', () => {
  for (const f of src) {
    if (f.endsWith('levels.ts')) continue;
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => expect(l.length, `${relative(ROOT, f)}:${i + 1}`).toBeLessThanOrEqual(200));
  }
});
