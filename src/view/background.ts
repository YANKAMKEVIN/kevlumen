/** Fond : visuel peint du chapitre (s'il est chargé) ou fond procédural étoilé, rendu une fois hors écran. */
import { CHAPTERS } from '../engine/levels';
import { art, CHAPTER_ART } from '../app/art';
import { TAU } from './color';

const bgCv = document.createElement('canvas');
/** Chapitre dont le fond est dessiné (-1 : fond procédural, -2 : rien encore). */
let bgChapter = -2;
let bgW = 0, bgH = 0;

/** Chapitre d'un niveau (0 avant le premier niveau). */
export function chapterOf(level: number): number {
  const i = CHAPTERS.findIndex(c => level >= c[1] && level < c[2]);
  return i < 0 ? 0 : i;
}

/** Chapitre dont le fond devrait être affiché (-1 si son visuel n'est pas encore chargé). */
function wanted(level: number): number {
  const ch = chapterOf(level);
  return art(CHAPTER_ART[ch]) ? ch : -1;
}

function paintArt(b: CanvasRenderingContext2D, im: HTMLImageElement, w: number, h: number): void {
  const sc = Math.max(w / im.width, h / im.height), iw = im.width * sc, ih = im.height * sc;
  b.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih);
  const v = b.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .8);
  v.addColorStop(0, 'rgba(5,4,11,.35)'); v.addColorStop(1, 'rgba(5,4,11,.6)');
  b.fillStyle = v; b.fillRect(0, 0, w, h);
}

const BLOBS: [number, number, string][] = [
  [.18, .22, 'rgba(120,60,200,.20)'], [.85, .15, 'rgba(40,90,200,.16)'], [.7, .85, 'rgba(200,50,140,.12)'],
  [.1, .8, 'rgba(40,160,170,.10)'], [.5, .5, 'rgba(90,70,180,.08)'],
];

function paintProcedural(b: CanvasRenderingContext2D, w: number, h: number, dpr: number): void {
  const g = b.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0818'); g.addColorStop(1, '#05040b');
  b.fillStyle = g; b.fillRect(0, 0, w, h);
  for (const [x, y, c] of BLOBS) {
    const r = Math.max(w, h) * .55;
    const rg = b.createRadialGradient(x * w, y * h, 0, x * w, y * h, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = rg; b.fillRect(0, 0, w, h);
  }
  let s = 12345;
  const rnd = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < (w * h) / 5000; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 1.2 * dpr + .2, a = rnd() * .6 + .1;
    b.fillStyle = `rgba(230,225,255,${(a * .7).toFixed(3)})`; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill();
  }
  const v = b.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  b.fillStyle = v; b.fillRect(0, 0, w, h);
}

/** Redessine le fond hors écran (taille en pixels physiques). */
export function makeBg(w: number, h: number, dpr: number, level: number): void {
  bgCv.width = w; bgCv.height = h; bgW = w; bgH = h;
  const b = bgCv.getContext('2d') as CanvasRenderingContext2D;
  const ch = chapterOf(level), im = art(CHAPTER_ART[ch]);
  bgChapter = im ? ch : -1;
  if (im) paintArt(b, im, w, h); else paintProcedural(b, w, h, dpr);
}

/** Dessine le fond, en le refaisant si le chapitre ou la taille a changé. */
export function drawBg(c: CanvasRenderingContext2D, w: number, h: number, dpr: number, vw: number, vh: number, level: number): void {
  if (bgChapter !== wanted(level) || bgW !== w || bgH !== h) makeBg(w, h, dpr, level);
  c.drawImage(bgCv, 0, 0, vw, vh);
}
