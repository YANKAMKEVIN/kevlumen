/** Point d'entrée : démarrage, boucle d'affichage, pause quand l'onglet est caché. */
import './style.css';
import { Snd } from './app/audio';
import { loadArt } from './app/art';
import { resize } from './app/game';
import { initInput } from './app/input';
import { initUI, startLevel } from './app/ui';
import { LEVELS } from './engine/levels';
import { isWin, trace } from './engine/sim';
import { isLooping, startLoop, stopLoop } from './view/frame';
import { particleCount } from './view/particles';
import { etat } from './view/state';

initUI();
initInput();
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  Snd.setHidden(document.hidden);
  if (document.hidden) stopLoop(); else startLoop();
});
resize();
startLoop();

declare global {
  interface Window {
    __klArt?: number;
    __kl: unknown;
    __trayKeys: () => string[];
  }
}

// Fonds peints : le fond est refait dès qu'ils sont là (voir drawBg).
void loadArt().then(n => { window.__klArt = n; });

// Accès pour les tests de bout en bout (tests/e2e).
window.__kl = {
  get grid() { return etat.puzzle?.grid ?? []; },
  get L() { return etat.puzzle?.level ?? null; },
  get tr() { return etat.tr; },
  get won() { return etat.puzzle?.won ?? false; },
  get lay() { return etat.lay; },
  get T() { return etat.T; },
  get looping() { return isLooping(); },
  get particles() { return particleCount(); },
  get DPR() { return etat.DPR; },
  startLevel, LEVELS, trace, isWin,
};
window.__trayKeys = () => (etat.puzzle?.tray ?? []).map(t => t.k);
