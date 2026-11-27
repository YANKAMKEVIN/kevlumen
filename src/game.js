// @ts-check
/** Règles d'un niveau : poser, tourner, reprendre, annuler, indices, étoiles. Sans DOM : testé sous Node. */
import { save, persist } from './save.js';
import { trace } from './sim.js';
import { LEVELS } from './levels.js';
import { Snd } from './audio.js';
import { etat, fx } from './state.js';

// ---------- level ----------
const pkey=p=>p.t==='flt'?'flt'+p.c:p.t;
export function angFor(c){ if(c.t==='mir'||c.t==='spl') return c.o?Math.PI/4:-Math.PI/4; if(c.t==='pri') return c.o*Math.PI/2; if(c.t==='src') return c.d*Math.PI/2; return 0;}
export function loadLevel(i){
  etat.LI=i;etat.L=LEVELS[i];etat.grid=new Array(etat.L.w*etat.L.h).fill(null);
  for(const c of etat.L.cells){const g=Object.assign({},c);g.fixed=true;g.a=g.ta=angFor(g);g.pop=0;etat.grid[c.y*etat.L.w+c.x]=g;}
  const m=new Map();for(const p of etat.L.tray){const k=pkey(p);if(!m.has(k))m.set(k,{t:p.t,c:p.c,n:0,k});m.get(k).n++;}
  etat.tray=[...m.values()];
  etat.hist=[];etat.moves=0;etat.hintsUsed=0;etat.won=false;etat.hint=null;etat.drag=null;etat.pid=null;etat.hoverCell=-1;etat.litState=new Map();
  fx.levelLoaded(i);
  etat.tr=/** @type {any} */ (null);recompute(true);
}
function snapshot(){return {g:etat.grid.map(c=>c&&!c.fixed?{t:c.t,o:c.o,c:c.c}:c&&c.rot?{o:c.o}:null),tr:etat.tray.map(s=>s.n),moves:etat.moves};}
export function pushHist(){etat.hist.push(snapshot());if(etat.hist.length>200)etat.hist.shift();}
function restore(s){
  etat.grid.forEach((c,i)=>{const v=s.g[i];if(c&&c.fixed){if(c.rot&&v){c.o=v.o;c.ta=angFor(c);}}else{etat.grid[i]=v?Object.assign({},v,{a:angFor(v),ta:angFor(v),pop:1}):null;}});
  etat.tray.forEach((t,i)=>t.n=s.tr[i]);etat.moves=s.moves;recompute();
}
function segKey(s){return s.join(',');}
export function recompute(initial,preview){
  const g=preview||etat.grid;
  const nt=trace(etat.L,g);
  // divergence
  let div=1e9;
  if(etat.tr&&!initial){const old=new Set(etat.tr.segs.map(segKey));for(const s of nt.segs){if(!old.has(segKey(s)))div=Math.min(div,s[5]);}}
  else div=0;
  if(div<etat.reveal) etat.reveal=div;
  etat.tr=nt;etat.maxDist=0;for(const s of etat.tr.segs)etat.maxDist=Math.max(etat.maxDist,s[6]);
  if(!preview) etat.checkLater=true;
}
/** Pose une pièce sur la case i (depuis la réserve si slot>=0, sinon pièce déjà retirée du plateau). */
export function placePiece(proto,o,i,slot,histPushed){
  if(slot>=0){pushHist();etat.tray[slot].n--;}else if(!histPushed)pushHist();
  const g={t:proto.t,o,c:proto.c,a:angFor({t:proto.t,o}),pop:0,ta:0};g.ta=g.a;etat.grid[i]=g;etat.moves++;
}
/** Rend à la réserve une pièce retirée du plateau. */
export function returnPiece(proto){const k=pkey(proto);const s=etat.tray.find(t=>t.k===k);if(s)s.n++;etat.moves++;}
/** Étoiles : 3 sans indice, 2 avec un, 1 au-delà. */
export function starsFor(h){return h===0?3:h===1?2:1;}
/** Enregistre la victoire du niveau courant ; renvoie les étoiles gagnées. */
export function recordWin(){const st=starsFor(etat.hintsUsed);save.done[etat.LI]=Math.max(save.done[etat.LI]||0,st);persist();return st;}
// auto orient prism to incoming beam at cell
function incomingDir(i){if(!etat.tr)return -1;const x=i%etat.L.w,y=(i/etat.L.w)|0;let best=-1,bc=0;
  for(const s of etat.tr.segs){const [sx,sy,ex,ey,c]=s;if(sx===ex&&sx===x){if((y>sy&&y<=ey)){if(bits(c)>bc){bc=bits(c);best=1;}}else if(y<sy&&y>=ey){if(bits(c)>bc){bc=bits(c);best=3;}}}
    else if(sy===ey&&sy===y){if(x>sx&&x<=ex){if(bits(c)>bc){bc=bits(c);best=0;}}else if(x<sx&&x>=ex){if(bits(c)>bc){bc=bits(c);best=2;}}}}
  return best;}
function bits(c){return (c&1)+((c>>1)&1)+((c>>2)&1);}
export function incomingDirBase(i){const keep=etat.tr;etat.tr=trace(etat.L,etat.grid);const d=incomingDir(i);etat.tr=keep;return d;}
export function rotatePiece(g){
  if(g.t==='mir'||g.t==='spl'){g.o^=1;g.ta+=Math.PI/2;}
  else if(g.t==='pri'){g.o=(g.o+1)%4;g.ta+=Math.PI/2;}
  else {g.pop=-.15;return;}
  etat.moves++;Snd.rotate();etat.hint=null;recompute();
}
export function undo(){if(etat.won||!etat.hist.length)return;restore(etat.hist.pop());Snd.back();etat.hint=null;}
export function resetLvl(){if(etat.won)return;loadLevel(etat.LI);Snd.back();}
// ---------- hint ----------
export function showHint(){
  if(etat.won)return;
  for(const s of etat.L.solRot||[]){const g=etat.grid[s.y*etat.L.w+s.x];if(g&&g.o!==s.o){etat.hint={i:s.y*etat.L.w+s.x,t:g.t,o:s.o,c:g.c,t0:etat.T,rot:true};break;}}
  if(!etat.hint)for(const s of etat.L.sol){const i=s.y*etat.L.w+s.x,g=etat.grid[i];if(!g||g.t!==s.t||(g.o!==s.o&&s.t!=='flt')||g.c!==s.c){etat.hint={i,t:s.t,o:s.o,c:s.c,t0:etat.T};break;}}
  if(!etat.hint){ // extra piece in the way
    for(let i=0;i<etat.grid.length;i++){const g=etat.grid[i];if(g&&!g.fixed&&!etat.L.sol.some(s=>s.y*etat.L.w+s.x===i)){etat.hint={i,remove:true,t0:etat.T};break;}}}
  if(etat.hint){etat.hintsUsed++;Snd.bell(Snd.mtof(84),.06);}
}
export function nextUnfinished(){for(let i=0;i<LEVELS.length;i++)if(!save.done[i])return i;return 0;}
export function maxUnlocked(){let m=-1;for(const k in save.done)m=Math.max(m,+k);return Math.min(LEVELS.length-1,m+3);}
