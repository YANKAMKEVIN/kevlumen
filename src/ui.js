// @ts-check
/** Écrans (titre, niveaux, victoire, aide) et boutons. */
import { save } from './save.js';
import { CHAPTERS, LEVELS } from './levels.js';
import { $, VERSION } from './util.js';
import { Snd } from './audio.js';
import { etat, fx } from './state.js';
import { hintText, layout } from './layout.js';
import { loadLevel, maxUnlocked, nextUnfinished, recordWin, resetLvl, showHint, undo } from './game.js';
import { drawPiece } from './render.js';

// ---------- screens ----------
function show(id){for(const s of ['title','select','win','help'])$(s).classList.toggle('hide',s!==id);}
export function startLevel(i){etat.mode='play';show(null);$('hud').style.display='flex';etat.lastOkSet=new Set();etat.lastDarkSet=new Set();etat.crysOrder=0;loadLevel(i);}
function openSelect(){
  etat.mode='title';etat.L=/** @type {any} */ (null);$('hud').style.display='none';$('tip').textContent='';
  const ch=$('chaps');ch.innerHTML='';const mu=maxUnlocked();const nu=nextUnfinished();
  let doneN=0,stars=0;for(const k in save.done){doneN++;stars+=save.done[k];}
  $('selProg').textContent=`${doneN} / ${LEVELS.length} niveaux · ${stars} ★`;
  CHAPTERS.forEach(([name,a,b],ci)=>{const d=document.createElement('div');d.className='chap';
    d.innerHTML=`<h3>${['I','II','III','IV','V','VI'][ci]}. ${name}<small>${a+1}–${b}</small></h3>`;const g=document.createElement('div');g.className='lv';
    for(let i=a;i<b;i++){const bt=document.createElement('button');bt.className='lb'+(save.done[i]?' done':'')+(i===nu?' cur':'');
      const st=save.done[i]||0;bt.innerHTML=`${i+1}<span class="st">${st?'★'.repeat(st)+'<span style="opacity:.2">'+'★'.repeat(3-st)+'</span>':''}</span>`;
      if(i>mu)bt.disabled=true,bt.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
      bt.onclick=()=>{Snd.init();startLevel(i);};g.appendChild(bt);}
    d.appendChild(g);ch.appendChild(d);});
  show('select');
}
export function onWin(){
  Snd.win();
  const stars=recordWin();
  const msgs=['Lumière rétablie','Magnifique','Tout s’illumine','Parfait','Éblouissant'];
  const myLI=etat.LI;
  setTimeout(()=>{
    if(!etat.won||etat.LI!==myLI||etat.mode!=='play')return;
    $('winT').textContent=etat.LI===LEVELS.length-1?'Lumière éternelle':msgs[etat.LI%msgs.length];
    [...$('winS').children].forEach((e,k)=>e.classList.toggle('on',k<stars));
    $('winI').textContent=`Niveau ${etat.LI+1} · ${etat.moves} coup${etat.moves>1?'s':''}`+(etat.hintsUsed?` · ${etat.hintsUsed} indice${etat.hintsUsed>1?'s':''}`:'')+(etat.LI===LEVELS.length-1?' — tu as terminé KevLumen !':'');
    $('bNext').style.display=etat.LI<LEVELS.length-1?'':'none';
    show('win');
  },1700);
}
$('bPlay').onclick=()=>{Snd.init();startLevel(nextUnfinished());};
$('bLevels').onclick=()=>{Snd.init();openSelect();};
$('bHelp').onclick=()=>{Snd.init();show('help');drawHelpIcons();};
$('bHelpOk').onclick=()=>{ if(etat.mode==='play'){show(null);} else show('title');};
$('bSelBack').onclick=()=>show('title');
$('bMenu').onclick=()=>openSelect();
$('bUndo').onclick=()=>undo();
$('bReset').onclick=()=>resetLvl();
$('bHint').onclick=()=>showHint();
$('bSnd').onclick=()=>{Snd.init();Snd.toggle();updSnd();};
$('bNext').onclick=()=>startLevel(Math.min(LEVELS.length-1,etat.LI+1));
$('bWinMenu').onclick=()=>openSelect();
function updSnd(){$('sndIco').innerHTML=Snd.on?'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>':'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>';}
updSnd();
function drawHelpIcons(){/** @type {NodeListOf<HTMLCanvasElement>} */ (document.querySelectorAll('#help canvas')).forEach(c=>{const d=Math.min(devicePixelRatio||1,2);c.width=52*d;c.height=52*d;const x=/** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));x.scale(d,d);const t=c.dataset.p;
  const g={t,o:0,c:t==='src'?7:t==='crys'?3:t==='flt'?1:undefined,d:0,a:t==='mir'||t==='spl'?-Math.PI/4:0};drawPiece(x,g,26,26,46,{lit:1,base:false,noGlow:true});});}
// liaisons appelées par les règles (game.js), qui ne touchent jamais au DOM
fx.levelLoaded=i=>{
  $('lvNum').textContent='Niveau '+(i+1);$('lvName').textContent=etat.L.name;
  const tip=$('tip');tip.textContent=hintText();tip.style.opacity='1';
  layout();
};
$('ver').textContent='v'+VERSION;
