import { expect, test } from 'vitest';
import { COL, ease, rgba } from '../../../src/view/color';

test('rgba() : couleur additive et opacité, avec cache', () => {
  expect(rgba(1, .5)).toBe('rgba(255,64,92,0.5)');
  expect(rgba(7, 1)).toBe('rgba(255,255,255,1)');
  expect(rgba(3, 0)).toBe('rgba(255,214,70,0)');
  expect(rgba(2, .25)).toBe(rgba(2, .25));
});

test('rgba() borne l\'opacité entre 0 et 1', () => {
  expect(rgba(4, 1.7)).toBe('rgba(70,120,255,1)');
  expect(rgba(4, -.2)).toBe('rgba(70,120,255,0)');
});

test('les 8 combinaisons de couleurs ont une teinte', () => {
  for (let c = 0; c < 8; c++) expect(COL[c]).toHaveLength(3);
});

test('ease() interpole', () => {
  expect(ease(0, 10, .25)).toBe(2.5);
  expect(ease(4, 4, .9)).toBe(4);
});
