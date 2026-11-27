// @ts-check
/** Point d'entrée : démarrage et boucle de jeu. */
import { isWin, trace } from './sim.js';
import { LEVELS } from './levels.js';
import { Snd } from './audio.js';
import { etat } from './state.js';
import { frame, resize } from './render.js';
import { recompute } from './game.js';
import { startLevel } from './ui.js';
import './input.js';

window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(Snd.ctx){document.hidden?Snd.ctx.suspend():Snd.ctx.resume();}});
resize();
requestAnimationFrame(frame);
/** @type {any} */ (window).__kl={get grid(){return etat.grid},get L(){return etat.L},startLevel,get tr(){return etat.tr},LEVELS,trace,isWin,get won(){return etat.won},get lay(){return etat.lay},recompute,get T(){return etat.T}};
/** @type {any} */ (window).__trayKeys=()=>etat.tray.map(t=>t.k);
