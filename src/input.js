// @ts-check
/** Glisser-déposer à la souris ou au doigt, raccourcis clavier. */
import { $ } from './util.js';
import { Snd } from './audio.js';
import { burst, cv } from './render.js';
import { etat } from './state.js';
import { angFor, incomingDirBase, placePiece, pushHist, recompute, resetLvl, returnPiece, rotatePiece, undo } from './game.js';
import { cellAt, slotAt } from './layout.js';

cv.addEventListener('pointerdown',e=>{
  Snd.init();
  if(etat.mode!=='play'||etat.won)return;
  if(etat.pid!==null&&etat.drag&&etat.drag.active)return; etat.pid=e.pointerId; etat.drag=null; try{cv.setPointerCapture(etat.pid);}catch(_){}
  const px=e.clientX,py=e.clientY;
  const tipEl=$('tip'); if(tipEl.textContent&&etat.LI>2) tipEl.style.opacity=.55;
  const sl=slotAt(px,py);
  if(sl&&etat.tray[sl.i].n>0){const tp=etat.tray[sl.i];etat.drag={proto:{t:tp.t,c:tp.c},o:0,from:'tray',slot:sl.i,px,py,sx:px,sy:py,active:true,a:angFor({t:tp.t,o:0}),lift:e.pointerType==='touch'?etat.lay.cs*.7:0};Snd.pick();return;}
  const i=cellAt(px,py);
  if(i>=0&&etat.grid[i]){const g=etat.grid[i];
    if(!g.fixed){etat.drag={proto:{t:g.t,c:g.c},o:g.o,from:'board',idx:i,px,py,sx:px,sy:py,active:false,a:g.a,lift:e.pointerType==='touch'?etat.lay.cs*.7:0};return;}
    if(g.rot){etat.drag={tap:true,idx:i,sx:px,sy:py,px,py};return;}
  }
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerId!==etat.pid||!etat.drag)return;
  etat.drag.px=e.clientX;etat.drag.py=e.clientY;
  if(etat.drag.tap)return;
  if(!etat.drag.active&&Math.hypot(etat.drag.px-etat.drag.sx,etat.drag.py-etat.drag.sy)>9){
    etat.drag.active=true;pushHist();etat.drag.histPushed=true;etat.grid[etat.drag.idx]=null;Snd.pick();etat.hoverCell=-2;
  }
  if(etat.drag.active)updateHover();
});
function updateHover(){
  const i=cellAt(etat.drag.px,etat.drag.py-(etat.drag.lift||0));
  const h=(i>=0&&!etat.grid[i])?i:-1;
  if(h!==etat.hoverCell){etat.hoverCell=h;
    if(h>=0){ if(etat.drag.proto.t==='pri'){const d=incomingDirBase(h);if(d>=0)etat.drag.o=d;}
      const g2=etat.grid.slice();g2[h]={t:etat.drag.proto.t,o:etat.drag.o,c:etat.drag.proto.c};recompute(false,g2);}
    else recompute(false,etat.grid);
  }
}
function endPointer(e){
  if(e.pointerId!==etat.pid)return;etat.pid=null;
  if(!etat.drag)return;const d=etat.drag;etat.drag=null;
  if(d.tap){const g=etat.grid[d.idx];if(g&&Math.hypot(d.px-d.sx,d.py-d.sy)<14){pushHist();rotatePiece(g);}return;}
  if(!d.active){ // tap on movable piece -> rotate
    const g=etat.grid[d.idx];if(g){pushHist();rotatePiece(g);}return;}
  const i=cellAt(d.px,d.py-(d.lift||0));
  if(i>=0&&!etat.grid[i]&&!(e.type==='pointercancel')){
    placePiece(d.proto,d.o,i,d.from==='tray'?d.slot:-1,d.histPushed);Snd.place();
    burst(i,d.proto.c||7,8);
  }else{
    if(d.from==='board'){returnPiece(d.proto);Snd.back();}
  }
  etat.hoverCell=-1;etat.hint=null;recompute();
}
cv.addEventListener('pointerup',endPointer);
cv.addEventListener('pointercancel',endPointer);
window.addEventListener('keydown',e=>{if(etat.mode!=='play')return;if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}if(e.key==='r'&&!e.ctrlKey&&!e.metaKey)resetLvl();});
