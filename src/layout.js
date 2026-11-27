// @ts-check
/** Mise en page du plateau et de la réserve selon l'écran, et repérage des cases. */
import { $ } from './util.js';
import { etat } from './state.js';

// « depuis le bas » n'est vrai que si la réserve est en bas (sinon elle est à droite)
export function hintText(){const h=(etat.L&&etat.L.hint)||'';return etat.VW>etat.VH*1.2?h.replace('depuis le bas','depuis la droite'):h}
export function layout(){
  // le plateau commence sous la barre du haut et sous la bulle d'aide (qui peut faire 2-3 lignes sur téléphone)
  const hudB=$('hud').getBoundingClientRect().bottom, tipB=$('tip').textContent?$('tip').getBoundingClientRect().bottom:0;
  const top=Math.max(72,Math.ceil(hudB)+6,Math.ceil(tipB)+10), pad=14;
  const vert=etat.VW>etat.VH*1.2; const tw=vert?110:etat.VW, th=vert?etat.VH:112;
  let aw=etat.VW-pad*2-(vert?tw:0), ah=etat.VH-top-pad-(vert?0:th);
  let cs=Math.floor(Math.min(aw/etat.L.w,ah/etat.L.h,104));
  cs=Math.max(cs,28);
  const bw=cs*etat.L.w,bh=cs*etat.L.h;
  etat.lay.cs=cs;etat.lay.ox=Math.round(pad+(aw-bw)/2);etat.lay.oy=Math.round(top+(ah-bh)/2);
  etat.lay.tray={vert,x:vert?etat.VW-tw:0,y:vert?0:etat.VH-th,w:tw,h:th};
  layoutSlots();
}
function layoutSlots(){
  const t=etat.lay.tray, n=etat.tray.length; const sz=Math.min(74,Math.max(52,etat.lay.cs*0.95)); const gap=12;
  etat.lay.slots=[];
  const total=n*sz+(n-1)*gap;
  for(let i=0;i<n;i++){
    if(t.vert){etat.lay.slots.push({x:t.x+t.w/2,y:etat.VH/2-total/2+sz/2+i*(sz+gap),s:sz,i});}
    else{etat.lay.slots.push({x:etat.VW/2-total/2+sz/2+i*(sz+gap),y:t.y+t.h/2-4,s:sz,i});}
  }
}
export function cellAt(px,py){const x=Math.floor((px-etat.lay.ox)/etat.lay.cs),y=Math.floor((py-etat.lay.oy)/etat.lay.cs);if(x<0||y<0||x>=etat.L.w||y>=etat.L.h)return -1;return y*etat.L.w+x;}
export function slotAt(px,py){for(const s of etat.lay.slots){if(Math.abs(px-s.x)<s.s/2+6&&Math.abs(py-s.y)<s.s/2+6)return s;}return null;}
// ---------- particles ----------
export function cxy(i){return [etat.lay.ox+((i%etat.L.w)+.5)*etat.lay.cs,etat.lay.oy+(((i/etat.L.w)|0)+.5)*etat.lay.cs];}
