import { describe, expect, test } from 'vitest';
import { cellAt, cellCenter, computeLayout, hintFor, isWide, MAX_CELL, MIN_CELL, slotAt, type LayoutInput } from '../../../src/view/layout';

const phone: LayoutInput = { vw: 375, vh: 667, hudBottom: 60, tipBottom: 110, w: 6, h: 6, slots: 3 };
const desktop: LayoutInput = { vw: 1280, vh: 800, hudBottom: 60, tipBottom: 0, w: 9, h: 9, slots: 4 };
const landscape: LayoutInput = { vw: 915, vh: 412, hudBottom: 60, tipBottom: 100, w: 9, h: 9, slots: 5 };

describe('mise en page', () => {
  test.each([['téléphone', phone], ['ordinateur', desktop], ['téléphone couché', landscape]])('%s : le plateau tient à l\'écran, sous la bulle d\'aide', (_n, inp) => {
    const lay = computeLayout(inp);
    expect(lay.ox).toBeGreaterThanOrEqual(0);
    expect(lay.ox + lay.cs * inp.w).toBeLessThanOrEqual(inp.vw - (lay.tray.vert ? lay.tray.w : 0));
    expect(lay.oy).toBeGreaterThanOrEqual(Math.max(inp.hudBottom, inp.tipBottom));
    expect(lay.oy + lay.cs * inp.h).toBeLessThanOrEqual(lay.tray.vert ? inp.vh : lay.tray.y);
    expect(lay.cs).toBeGreaterThanOrEqual(MIN_CELL);
    expect(lay.cs).toBeLessThanOrEqual(MAX_CELL);
  });

  test('réserve en bas sur téléphone, à droite sur écran large', () => {
    expect(computeLayout(phone).tray.vert).toBe(false);
    expect(computeLayout(desktop).tray.vert).toBe(true);
    expect(computeLayout(landscape).tray.vert).toBe(true);
    expect(isWide(1000, 800)).toBe(true);
    expect(isWide(800, 800)).toBe(false);
  });

  test('cases de la réserve assez grandes pour le doigt (≥ 52 px) et dans l\'écran', () => {
    for (const inp of [phone, desktop, landscape]) {
      const lay = computeLayout(inp);
      expect(lay.slots).toHaveLength(inp.slots);
      for (const s of lay.slots) {
        expect(s.s).toBeGreaterThanOrEqual(52);
        expect(s.x - s.s / 2).toBeGreaterThanOrEqual(0);
        expect(s.x + s.s / 2).toBeLessThanOrEqual(inp.vw);
        expect(s.y - s.s / 2).toBeGreaterThanOrEqual(0);
        expect(s.y + s.s / 2).toBeLessThanOrEqual(inp.vh);
      }
    }
  });

  test('la taille des cases est plafonnée sur très grand écran', () => {
    expect(computeLayout({ ...desktop, vw: 3840, vh: 2160, w: 5, h: 5 }).cs).toBe(MAX_CELL);
  });

  test('cellAt et cellCenter sont réciproques', () => {
    const lay = computeLayout(phone);
    for (let i = 0; i < 36; i++) {
      const [x, y] = cellCenter(lay, 6, i);
      expect(cellAt(lay, 6, 6, x, y)).toBe(i);
    }
    expect(cellAt(lay, 6, 6, lay.ox - 1, lay.oy)).toBe(-1);
    expect(cellAt(lay, 6, 6, lay.ox + lay.cs * 6 + 1, lay.oy)).toBe(-1);
  });

  test('slotAt : marge de 6 px autour de chaque case de la réserve', () => {
    const lay = computeLayout(phone);
    const s = lay.slots[1];
    expect(slotAt(lay, s.x, s.y)?.i).toBe(1);
    expect(slotAt(lay, s.x + s.s / 2 + 5, s.y)?.i).toBe(1);
    expect(slotAt(lay, s.x, s.y - s.s / 2 - 20)).toBeNull();
  });

  test('« depuis le bas » devient « depuis la droite » quand la réserve est à droite', () => {
    const t = 'Fais glisser le miroir depuis le bas.';
    expect(hintFor(t, 375, 667)).toBe(t);
    expect(hintFor(t, 1280, 800)).toBe('Fais glisser le miroir depuis la droite.');
  });
});
