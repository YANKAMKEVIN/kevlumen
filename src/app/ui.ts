/** Écrans (titre, niveaux, victoire, aide) et boutons. */
import { CHAPTERS, LEVELS } from '../engine/levels';
import { maxUnlocked, nextUnfinished, totals } from '../engine/progress';
import { frameHooks } from '../view/frame';
import { drawPiece } from '../view/pieces';
import { etat } from '../view/state';
import { VERSION } from '../version';
import { Snd } from './audio';
import { $ } from './dom';
import { hintText, layout, loadLevel, recordCurrentWin, resetLevel, showHint, uiHooks, undo } from './game';
import { save } from './store';

type Screen = 'title' | 'select' | 'win' | 'help';
const SCREENS: Screen[] = ['title', 'select', 'win', 'help'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const WIN_TITLES = ['Lumière rétablie', 'Magnifique', 'Tout s’illumine', 'Parfait', 'Éblouissant'];
/** Délai entre la victoire et l'écran de victoire (on laisse briller les cristaux). */
export const WIN_SCREEN_DELAY = 1700;

function show(id: Screen | null): void {
  for (const s of SCREENS) {
    const el = $(s);
    const hidden = s !== id;
    el.classList.toggle('hide', hidden);
    el.setAttribute('aria-hidden', String(hidden));
    el.toggleAttribute('inert', hidden);
  }
}

export function startLevel(i: number): void {
  etat.mode = 'play';
  show(null);
  $('hud').style.display = 'flex';
  etat.lastOkSet = new Set(); etat.lastDarkSet = new Set(); etat.crysOrder = 0;
  loadLevel(i);
}

const LOCK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'
  + '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

function levelButton(i: number, unlocked: boolean, current: boolean): HTMLButtonElement {
  const bt = document.createElement('button');
  const st = save.done[i] || 0;
  bt.className = 'lb' + (st ? ' done' : '') + (current ? ' cur' : '');
  bt.style.setProperty('--k', String(i));
  if (!unlocked) {
    bt.disabled = true;
    bt.innerHTML = LOCK_SVG;
    bt.setAttribute('aria-label', `Niveau ${i + 1}, verrouillé`);
  } else {
    bt.innerHTML = `${i + 1}<span class="st">${st ? '★'.repeat(st) + '<span class="off">' + '★'.repeat(3 - st) + '</span>' : ''}</span>`;
    bt.setAttribute('aria-label', `Niveau ${i + 1}, ${LEVELS[i].name}${st ? `, ${st} étoile${st > 1 ? 's' : ''}` : ''}`);
    bt.title = LEVELS[i].name;
  }
  bt.onclick = () => { Snd.init(); startLevel(i); };
  return bt;
}

function openSelect(): void {
  etat.mode = 'title'; etat.puzzle = null; etat.tr = null;
  $('hud').style.display = 'none'; $('tip').textContent = '';
  const ch = $('chaps'); ch.innerHTML = '';
  const mu = maxUnlocked(save, LEVELS.length), nu = nextUnfinished(save, LEVELS.length);
  const { done, stars } = totals(save);
  $('selProg').textContent = `${done} / ${LEVELS.length} niveaux · ${stars} ★`;
  CHAPTERS.forEach(([name, a, b], ci) => {
    const d = document.createElement('section'); d.className = 'chap';
    let chStars = 0;
    for (let i = a; i < b; i++) chStars += save.done[i] || 0;
    d.innerHTML = `<h3>${ROMAN[ci]}. ${name}<small>${a + 1}–${b} · ${chStars}/${(b - a) * 3} ★</small></h3>`;
    const g = document.createElement('div'); g.className = 'lv';
    for (let i = a; i < b; i++) g.appendChild(levelButton(i, i <= mu, i === nu));
    d.appendChild(g); ch.appendChild(d);
  });
  show('select');
}

function onWin(): void {
  Snd.win();
  const stars = recordCurrentWin();
  const p = etat.puzzle;
  if (!p) return;
  const last = p.index === LEVELS.length - 1;
  setTimeout(() => {
    if (etat.puzzle !== p || etat.mode !== 'play') return;
    $('winT').textContent = last ? 'Lumière éternelle' : WIN_TITLES[p.index % WIN_TITLES.length];
    [...$('winS').children].forEach((e, k) => e.classList.toggle('on', k < stars));
    $('winI').textContent = `Niveau ${p.index + 1} · ${p.moves} coup${p.moves > 1 ? 's' : ''}`
      + (p.hintsUsed ? ` · ${p.hintsUsed} indice${p.hintsUsed > 1 ? 's' : ''}` : '')
      + (last ? ' — tu as terminé KevLumen !' : '');
    $('bNext').style.display = last ? 'none' : '';
    show('win');
  }, WIN_SCREEN_DELAY);
}

const SND_ON = '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>';
const SND_OFF = '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>';
function updSnd(): void {
  $('sndIco').innerHTML = Snd.on ? SND_ON : SND_OFF;
  $('bSnd').setAttribute('aria-pressed', String(Snd.on));
}

function drawHelpIcons(): void {
  document.querySelectorAll<HTMLCanvasElement>('#help canvas').forEach(c => {
    const d = Math.min(devicePixelRatio || 1, 2);
    c.width = 52 * d; c.height = 52 * d;
    const x = c.getContext('2d') as CanvasRenderingContext2D;
    x.scale(d, d);
    const t = c.dataset.p || '';
    const g = { t, o: 0, c: t === 'src' ? 7 : t === 'crys' ? 3 : t === 'flt' ? 1 : undefined, d: 0, a: t === 'mir' || t === 'spl' ? -Math.PI / 4 : 0 };
    drawPiece(x, g, 26, 26, 46, { lit: 1, base: false, noGlow: true }, etat.T);
  });
}

/** Branche les boutons et les liaisons ; appelé une fois au démarrage. */
export function initUI(): void {
  $('bPlay').onclick = () => { Snd.init(); startLevel(nextUnfinished(save, LEVELS.length)); };
  $('bLevels').onclick = () => { Snd.init(); openSelect(); };
  $('bHelp').onclick = () => { Snd.init(); show('help'); drawHelpIcons(); };
  $('bHelpOk').onclick = () => { if (etat.mode === 'play') show(null); else show('title'); };
  $('bSelBack').onclick = () => show('title');
  $('bMenu').onclick = () => openSelect();
  $('bUndo').onclick = () => undo();
  $('bReset').onclick = () => resetLevel();
  $('bHint').onclick = () => showHint();
  $('bSnd').onclick = () => { Snd.init(); Snd.toggle(); updSnd(); };
  $('bNext').onclick = () => startLevel(Math.min(LEVELS.length - 1, etat.li + 1));
  $('bWinMenu').onclick = () => openSelect();
  updSnd();
  $('ver').textContent = 'v' + VERSION;
  show('title');
  frameHooks.onWin = onWin;
  frameHooks.crystal = n => Snd.crystal(n);
  frameHooks.dark = () => Snd.dark();
  uiHooks.levelLoaded = p => {
    $('lvNum').textContent = 'Niveau ' + (p.index + 1);
    $('lvName').textContent = p.level.name;
    const tip = $('tip'); tip.textContent = hintText(); tip.style.opacity = '1';
    layout();
  };
}
