// @ts-check
/** Dessin sur canvas : fond, plateau, rayons, pièces, particules, réserve. */
import { isWin } from './sim.js';
import { $, TAU, ease, rgba } from './util.js';
import { Snd } from './audio.js';
import { etat } from './state.js';
import { cxy, hintText, layout } from './layout.js';
import { angFor } from './game.js';
import { onWin } from './ui.js';

// ---------- canvas & state ----------
/** @type {HTMLCanvasElement} */
export const cv=$('c');
export const ctx=/** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
const parts=[],motes=[];
const bgCv=document.createElement('canvas');
export function resize(){
  etat.DPR=Math.min(window.devicePixelRatio||1,2);etat.VW=innerWidth;etat.VH=innerHeight;
  cv.width=etat.VW*etat.DPR;cv.height=etat.VH*etat.DPR;
  makeBg(); if(etat.L){if(etat.mode==='play'&&!etat.won)$('tip').textContent=hintText();layout();}
}
function makeBg(){
  bgCv.width=cv.width;bgCv.height=cv.height;const b=/** @type {CanvasRenderingContext2D} */ (bgCv.getContext('2d'));const w=bgCv.width,h=bgCv.height;
  const g=b.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0a0818');g.addColorStop(1,'#05040b');b.fillStyle=g;b.fillRect(0,0,w,h);
  /** @type {[number,number,string][]} */
  const blobs=[[.18,.22,'rgba(120,60,200,.20)'],[.85,.15,'rgba(40,90,200,.16)'],[.7,.85,'rgba(200,50,140,.12)'],[.1,.8,'rgba(40,160,170,.10)'],[.5,.5,'rgba(90,70,180,.08)']];
  for(const [x,y,c] of blobs){const r=Math.max(w,h)*.55;const rg=b.createRadialGradient(x*w,y*h,0,x*w,y*h,r);rg.addColorStop(0,c);rg.addColorStop(1,'rgba(0,0,0,0)');b.fillStyle=rg;b.fillRect(0,0,w,h);}
  let s=12345;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let i=0;i<(w*h)/5000;i++){const x=rnd()*w,y=rnd()*h,r=rnd()*1.2*etat.DPR+.2,a=rnd()*.6+.1;b.fillStyle=`rgba(230,225,255,${a*.7})`;b.beginPath();b.arc(x,y,r,0,TAU);b.fill();}
  const v=b.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');b.fillStyle=v;b.fillRect(0,0,w,h);
}
for(let i=0;i<46;i++)motes.push({x:Math.random(),y:Math.random(),v:.004+Math.random()*.01,r:Math.random()*1.6+.4,p:Math.random()*TAU,c:[1,2,4,7,6,5][i%6]});
export function burst(i,c,n,sp=1){const [x,y]=cxy(i);for(let k=0;k<n;k++){const a=Math.random()*TAU,v=(20+Math.random()*90)*sp;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:.6+Math.random()*.8,c,r:1+Math.random()*2.2});}}
// ---------- drawing ----------
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function hexPath(c,x,y,r,rot=0){c.beginPath();for(let k=0;k<6;k++){const a=rot+k*TAU/6-Math.PI/2;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;k?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}
export function drawPiece(c,g,x,y,s,opt={}){
  const t=g.t;
  c.save();c.translate(x,y);
  const sc=1+(g.pop||0);c.scale(sc,sc);
  if(t==='wall'){
    c.translate(-x,-y);const p=s*.06,w=s-p*2;
    const gr=c.createLinearGradient(x,y-w/2,x,y+w/2);gr.addColorStop(0,'#251d42');gr.addColorStop(1,'#0e0a1d');
    rr(c,x-w/2,y-w/2,w,w,s*.14);c.fillStyle=gr;c.fill();
    c.strokeStyle='rgba(160,130,255,.16)';c.lineWidth=1;c.stroke();
    c.beginPath();c.moveTo(x-w/2+s*.16,y-w/2+1.5);c.lineTo(x+w/2-s*.16,y-w/2+1.5);c.strokeStyle='rgba(255,255,255,.12)';c.stroke();
    // facets
    c.strokeStyle='rgba(140,110,230,.07)';c.beginPath();c.moveTo(x-w/2+s*.2,y+w/2-s*.15);c.lineTo(x,y-w*.05);c.lineTo(x+w/2-s*.12,y+w/3);c.stroke();
  }
  else if(t==='src'){
    const a=g.a||0;c.rotate(a);
    // nozzle
    const ng=c.createLinearGradient(0,-s*.11,0,s*.11);ng.addColorStop(0,'#8c86a8');ng.addColorStop(.5,'#e8e4ff');ng.addColorStop(1,'#56506e');
    rr(c,s*.12,-s*.1,s*.34,s*.2,s*.05);c.fillStyle=ng;c.fill();
    c.fillStyle=rgba(g.c,.9);c.fillRect(s*.42,-s*.06,s*.04,s*.12);
    c.rotate(-a);
    const bg=c.createRadialGradient(-s*.08,-s*.1,s*.02,0,0,s*.32);bg.addColorStop(0,'#5a5280');bg.addColorStop(1,'#16122a');
    c.beginPath();c.arc(0,0,s*.3,0,TAU);c.fillStyle=bg;c.fill();c.strokeStyle='rgba(220,210,255,.35)';c.lineWidth=1.5;c.stroke();
    c.globalCompositeOperation='lighter';
    const pu=.75+.25*Math.sin(etat.T*3+x*.01);
    const og=c.createRadialGradient(0,0,0,0,0,s*.42);og.addColorStop(0,rgba(g.c,.95*pu));og.addColorStop(.35,rgba(g.c,.5*pu));og.addColorStop(1,rgba(g.c,0));
    c.fillStyle=og;c.beginPath();c.arc(0,0,s*.42,0,TAU);c.fill();
    c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.arc(0,0,s*.06,0,TAU);c.fill();
    c.globalCompositeOperation='source-over';
    // rotating ring
    c.strokeStyle=rgba(g.c,.35);c.lineWidth=1;c.setLineDash([s*.05,s*.07]);c.lineDashOffset=-etat.T*12;c.beginPath();c.arc(0,0,s*.24,0,TAU);c.stroke();c.setLineDash([]);
  }
  else if(t==='mir'||t==='spl'){
    if(opt.ring){c.strokeStyle='rgba(200,190,255,.22)';c.lineWidth=1.2;c.setLineDash([3,5]);c.beginPath();c.arc(0,0,s*.43,0,TAU);c.stroke();c.setLineDash([]);
      c.fillStyle='rgba(200,190,255,.35)';for(const k of [0,1]){const aa=k*Math.PI+etat.T*.25;c.beginPath();c.arc(Math.cos(aa)*s*.43,Math.sin(aa)*s*.43,1.8,0,TAU);c.fill();}}
    if(opt.base){const bg=c.createRadialGradient(0,0,0,0,0,s*.42);bg.addColorStop(0,'rgba(190,170,255,.13)');bg.addColorStop(1,'rgba(190,170,255,0)');c.fillStyle=bg;c.beginPath();c.arc(0,0,s*.42,0,TAU);c.fill();}
    c.rotate(g.a);
    const Lh=s*.42,th=s*(t==='mir'?.065:.055);
    if(t==='mir'){
      const mg=c.createLinearGradient(0,-th,0,th);mg.addColorStop(0,'#59607a');mg.addColorStop(.42,'#ffffff');mg.addColorStop(.6,'#c9d0ea');mg.addColorStop(1,'#4b5068');
      rr(c,-Lh,-th,Lh*2,th*2,th);c.fillStyle=mg;c.fill();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;c.stroke();
      c.fillStyle='#2b2640';c.beginPath();c.arc(0,0,s*.045,0,TAU);c.fill();c.strokeStyle='rgba(255,255,255,.5)';c.stroke();
    }else{
      const mg=c.createLinearGradient(0,-th,0,th);mg.addColorStop(0,'rgba(120,230,255,.25)');mg.addColorStop(.5,'rgba(220,250,255,.75)');mg.addColorStop(1,'rgba(120,200,255,.25)');
      rr(c,-Lh,-th,Lh*2,th*2,th);c.fillStyle=mg;c.fill();c.strokeStyle='rgba(190,245,255,.8)';c.lineWidth=1;c.stroke();
      c.strokeStyle='rgba(255,255,255,.9)';c.setLineDash([s*.04,s*.035]);c.beginPath();c.moveTo(-Lh+3,0);c.lineTo(Lh-3,0);c.stroke();c.setLineDash([]);
    }
  }
  else if(t==='pri'){
    if(opt.base){const bg=c.createRadialGradient(0,0,0,0,0,s*.42);bg.addColorStop(0,'rgba(190,170,255,.13)');bg.addColorStop(1,'rgba(190,170,255,0)');c.fillStyle=bg;c.beginPath();c.arc(0,0,s*.42,0,TAU);c.fill();}
    c.rotate(g.a);
    const ax=s*.33,bx=-s*.25,by=s*.31;
    c.beginPath();c.moveTo(ax,0);c.lineTo(bx,-by);c.lineTo(bx,by);c.closePath();
    const pg=c.createLinearGradient(bx,-by,ax,by);pg.addColorStop(0,'rgba(255,255,255,.35)');pg.addColorStop(.5,'rgba(170,190,255,.14)');pg.addColorStop(1,'rgba(255,255,255,.28)');
    c.fillStyle=pg;c.fill();c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.4;c.lineJoin='round';c.stroke();
    c.globalCompositeOperation='lighter';c.lineWidth=2;
    [[1,-1],[2,0],[4,1]].forEach(([cc,k])=>{c.strokeStyle=rgba(cc,.75);c.beginPath();c.moveTo(bx+s*.08,0);c.lineTo(ax-s*.08,k*s*.11);c.stroke();});
    c.globalCompositeOperation='source-over';
    c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(bx-s*.06,0,s*.03,0,TAU);c.fill();
  }
  else if(t==='flt'){
    if(opt.base){const bg=c.createRadialGradient(0,0,0,0,0,s*.42);bg.addColorStop(0,'rgba(190,170,255,.1)');bg.addColorStop(1,'rgba(190,170,255,0)');c.fillStyle=bg;c.beginPath();c.arc(0,0,s*.42,0,TAU);c.fill();}
    const w=s*.5;rr(c,-w/2,-w/2,w,w,s*.09);c.fillStyle=rgba(g.c,.28);c.fill();c.strokeStyle=rgba(g.c,.95);c.lineWidth=2;c.stroke();
    c.save();c.clip();c.fillStyle='rgba(255,255,255,.22)';c.beginPath();c.moveTo(-w/2,w*.1);c.lineTo(w*.1,-w/2);c.lineTo(w*.32,-w/2);c.lineTo(-w/2,w*.32);c.fill();c.restore();
    c.globalCompositeOperation='lighter';const fg=c.createRadialGradient(0,0,0,0,0,s*.4);fg.addColorStop(0,rgba(g.c,.25));fg.addColorStop(1,rgba(g.c,0));c.fillStyle=fg;c.fillRect(-s/2,-s/2,s,s);c.globalCompositeOperation='source-over';
  }
  else if(t==='crys'){
    const lit=opt.lit||0,got=opt.got||0;const r=s*.3;
    const rot=etat.T*.15;
    if(lit>0&&!opt.noGlow){c.globalCompositeOperation='lighter';
      const gg=c.createRadialGradient(0,0,0,0,0,s*1.1);gg.addColorStop(0,rgba(g.c,.55*lit));gg.addColorStop(.3,rgba(g.c,.18*lit));gg.addColorStop(1,rgba(g.c,0));c.fillStyle=gg;c.beginPath();c.arc(0,0,s*1.1,0,TAU);c.fill();
      c.strokeStyle=rgba(g.c,.22*lit);c.lineWidth=1.5;for(let k=0;k<6;k++){const a=rot*2+k*TAU/6;c.beginPath();c.moveTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2);c.lineTo(Math.cos(a)*s*.62,Math.sin(a)*s*.62);c.stroke();}
      c.globalCompositeOperation='source-over';}
    hexPath(c,0,0,r);
    const cg=c.createLinearGradient(-r,-r,r,r);cg.addColorStop(0,rgba(g.c,.35+.6*lit));cg.addColorStop(1,rgba(g.c,.08+.5*lit));c.fillStyle=cg;c.fill();
    c.strokeStyle=rgba(g.c,.55+.45*lit);c.lineWidth=1.6;c.stroke();
    // facets
    c.strokeStyle=`rgba(255,255,255,${.12+.35*lit})`;c.lineWidth=1;hexPath(c,0,0,r*.5);c.stroke();
    c.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6-Math.PI/2;c.moveTo(Math.cos(a)*r*.5,Math.sin(a)*r*.5);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();
    if(got&&!opt.ok){c.globalCompositeOperation='lighter';const ig=c.createRadialGradient(0,0,0,0,0,r*.6);ig.addColorStop(0,rgba(got,.8));ig.addColorStop(1,rgba(got,0));c.fillStyle=ig;c.beginPath();c.arc(0,0,r*.6,0,TAU);c.fill();c.globalCompositeOperation='source-over';}
    if(lit>.5){c.fillStyle=`rgba(255,255,255,${.85*lit})`;c.beginPath();c.arc(0,0,r*.16,0,TAU);c.fill();}
  }
  else if(t==='dark'){
    const hit=opt.got?1:0;const r=s*.3;
    if(hit){c.globalCompositeOperation='lighter';const p=.6+.4*Math.sin(etat.T*14);const gg=c.createRadialGradient(0,0,0,0,0,s*.8);gg.addColorStop(0,`rgba(255,40,70,${.5*p})`);gg.addColorStop(1,'rgba(255,40,70,0)');c.fillStyle=gg;c.beginPath();c.arc(0,0,s*.8,0,TAU);c.fill();c.globalCompositeOperation='source-over';
      c.translate(Math.sin(etat.T*50)*1.2,0);}
    c.beginPath();c.moveTo(0,-r*1.15);c.lineTo(r*.85,0);c.lineTo(0,r*1.15);c.lineTo(-r*.85,0);c.closePath();
    const dg=c.createLinearGradient(-r,-r,r,r);dg.addColorStop(0,'#2a2140');dg.addColorStop(1,'#050308');c.fillStyle=dg;c.fill();
    c.strokeStyle=hit?'rgba(255,80,110,.95)':'rgba(170,120,255,.55)';c.lineWidth=1.6;c.stroke();
    c.strokeStyle='rgba(200,170,255,.18)';c.lineWidth=1;c.beginPath();c.moveTo(0,-r*1.15);c.lineTo(0,r*1.15);c.moveTo(-r*.85,0);c.lineTo(r*.85,0);c.stroke();
    if(!hit){c.fillStyle='rgba(200,170,255,.5)';const p=.5+.5*Math.sin(etat.T*1.3);c.globalAlpha=p;c.beginPath();c.arc(0,0,1.6,0,TAU);c.fill();c.globalAlpha=1;}
  }
  c.restore();
}
function drawBeams(){
  const cs=etat.lay.cs,ox=etat.lay.ox,oy=etat.lay.oy;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  const passes=[[.46,.035],[.26,.08],[.13,.2],[.055,.55]];
  /** @type {any[]} */
  const segs=[];
  for(const s of etat.tr.segs){const [sx,sy,ex,ey,c,sd,ed]=s;if(sd>=etat.reveal)continue;
    const f=ed<=etat.reveal?1:(etat.reveal-sd)/(ed-sd);
    const x1=ox+(sx+.5)*cs,y1=oy+(sy+.5)*cs,x2=ox+(sx+(ex-sx)*f+.5)*cs,y2=oy+(sy+(ey-sy)*f+.5)*cs;segs.push([x1,y1,x2,y2,c,sd,f,s]);}
  const fl=1+.06*Math.sin(etat.T*7.3)+.04*Math.sin(etat.T*13.1);
  for(const [w,a] of passes){ctx.lineWidth=Math.max(1,cs*w*fl);
    for(const [x1,y1,x2,y2,c] of segs){ctx.strokeStyle=rgba(c,a);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}}
  ctx.lineWidth=Math.max(1,cs*.02);
  for(const [x1,y1,x2,y2,c] of segs){ctx.strokeStyle=`rgba(255,255,255,${c===7?.9:.55})`;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  // flowing sparks
  for(const [x1,y1,x2,y2,c,sd] of segs){const len=Math.hypot(x2-x1,y2-y1);if(len<1)continue;const sp=cs*1.3,ph=((etat.T*cs*2.6)-sd*cs)%sp;const ux=(x2-x1)/len,uy=(y2-y1)/len;
    for(let d=((ph%sp)+sp)%sp;d<len;d+=sp){const px=x1+ux*d,py=y1+uy*d;const gr=ctx.createRadialGradient(px,py,0,px,py,cs*.14);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.4,rgba(c,.35));gr.addColorStop(1,rgba(c,0));ctx.fillStyle=gr;ctx.fillRect(px-cs*.14,py-cs*.14,cs*.28,cs*.28);}}
  // impact glows at segment ends (on mirrors etc.)
  for(const [,,x2,y2,c,,f] of segs){if(f<1)continue;const gr=ctx.createRadialGradient(x2,y2,0,x2,y2,cs*.32);gr.addColorStop(0,rgba(c,.35));gr.addColorStop(1,rgba(c,0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x2,y2,cs*.32,0,TAU);ctx.fill();}
  // head of reveal
  for(const [,,x2,y2,c,,f] of segs){if(f>=1)continue;const gr=ctx.createRadialGradient(x2,y2,0,x2,y2,cs*.4);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.3,rgba(c,.6));gr.addColorStop(1,rgba(c,0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x2,y2,cs*.4,0,TAU);ctx.fill();}
  ctx.restore();
}
function drawBoard(){
  const cs=etat.lay.cs,ox=etat.lay.ox,oy=etat.lay.oy,W=etat.L.w,H=etat.L.h;
  ctx.save();
  rr(ctx,ox-10,oy-10,W*cs+20,H*cs+20,22);ctx.fillStyle='rgba(18,14,38,.55)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;ctx.stroke();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const px=ox+x*cs,py=oy+y*cs;rr(ctx,px+3,py+3,cs-6,cs-6,cs*.16);ctx.fillStyle=(x+y)%2?'rgba(255,255,255,.028)':'rgba(255,255,255,.04)';ctx.fill();}
  if(etat.drag&&etat.drag.active&&etat.hoverCell>=0){const x=etat.hoverCell%W,y=(etat.hoverCell/W)|0;rr(ctx,ox+x*cs+3,oy+y*cs+3,cs-6,cs-6,cs*.16);ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.06)';ctx.fill();}
  ctx.restore();
}
function crystalStates(){
  // returns per cell {got, ok, lit(anim)}
  const res=new Map();
  for(let i=0;i<etat.grid.length;i++){const g=etat.grid[i];if(!g||(g.t!=='crys'&&g.t!=='dark'))continue;
    const d=etat.tr.hd.get(i);const got=(d!==undefined&&d<=etat.reveal+1e-6)?(etat.tr.hits.get(i)||0):0;
    res.set(i,{got,ok:g.t==='crys'?got===g.c:!got});}
  return res;
}
/** Heure de l'image précédente. */
const clock={l:0};
export function frame(now){
  const dt=Math.min(.05,(now-(clock.l||now))/1000);clock.l=now;etat.T+=dt;
  ctx.setTransform(etat.DPR,0,0,etat.DPR,0,0);
  ctx.drawImage(bgCv,0,0,etat.VW,etat.VH);
  // motes
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const m of motes){m.y-=m.v*dt;m.x+=Math.sin(etat.T*.3+m.p)*.0004;if(m.y<-.02){m.y=1.02;m.x=Math.random();}
    const a=.25+.2*Math.sin(etat.T*1.5+m.p);ctx.fillStyle=rgba(m.c,a*.5);ctx.beginPath();ctx.arc(m.x*etat.VW,m.y*etat.VH,m.r,0,TAU);ctx.fill();}
  ctx.restore();
  if(etat.mode==='title'||!etat.L){drawTitleBeams(dt);}
  if(etat.L&&etat.mode==='play'){
    if(etat.reveal<1e8){etat.reveal+=dt*16; if(etat.reveal>etat.maxDist+1){etat.reveal=1e9;}}
    drawBoard();
    drawBeams();
    // pieces
    const cs=etat.lay.cs;const st=crystalStates();
    let okCount=0,need=0;
    for(let i=0;i<etat.grid.length;i++){const g=etat.grid[i];if(!g)continue;
      g.a=ease(g.a,g.ta,Math.min(1,dt*14));g.pop=ease(g.pop||0,0,Math.min(1,dt*10));
      const [x,y]=cxy(i);
      if(g.t==='crys'||g.t==='dark'){const s=st.get(i);g.l=ease(g.l||0,s.ok&&g.t==='crys'?1:0,Math.min(1,dt*6));
        if(g.t==='crys'){need++;if(s.ok)okCount++;
          if(s.ok&&!etat.lastOkSet.has(i)){etat.lastOkSet.add(i);Snd.crystal(etat.crysOrder++);burst(i,g.c,26,1.2);g.pop=.25;}
          if(!s.ok&&etat.lastOkSet.has(i))etat.lastOkSet.delete(i);
          if(s.ok&&Math.random()<dt*6){const [px,py]=cxy(i);const a=Math.random()*TAU;parts.push({x:px+Math.cos(a)*cs*.3,y:py+Math.sin(a)*cs*.3,vx:Math.cos(a)*18,vy:Math.sin(a)*18-14,life:0,max:1+Math.random(),c:g.c,r:1+Math.random()*1.4});}
        }else{ if(s.got&&!etat.lastDarkSet.has(i)){etat.lastDarkSet.add(i);Snd.dark();} if(!s.got)etat.lastDarkSet.delete(i);}
        drawPiece(ctx,g,x,y,cs,{lit:g.l,got:s.got,ok:s.ok});}
      else drawPiece(ctx,g,x,y,cs,{ring:g.fixed&&g.rot,base:!g.fixed});
    }
    // hint ghost
    if(etat.hint){const k=etat.T-etat.hint.t0;if(k>6)etat.hint=null;else{const [x,y]=cxy(etat.hint.i);const p=.5+.5*Math.sin(etat.T*6);
      ctx.save();ctx.strokeStyle=`rgba(255,230,140,${.5+.4*p})`;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.lineDashOffset=-etat.T*20;rr(ctx,x-cs/2+4,y-cs/2+4,cs-8,cs-8,cs*.18);ctx.stroke();ctx.restore();
      if(!etat.hint.remove){ctx.save();ctx.globalAlpha=.45+.25*p;drawPiece(ctx,{t:etat.hint.t,o:etat.hint.o,c:etat.hint.c,a:angFor({t:etat.hint.t,o:etat.hint.o})},x,y,cs,{});ctx.restore();}
      else{ctx.save();ctx.strokeStyle=`rgba(255,120,140,${.6+.3*p})`;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-cs*.2,y-cs*.2);ctx.lineTo(x+cs*.2,y+cs*.2);ctx.moveTo(x+cs*.2,y-cs*.2);ctx.lineTo(x-cs*.2,y+cs*.2);ctx.stroke();ctx.restore();}}}
    drawTray();
    // win check
    if(!etat.won&&etat.reveal>=1e8&&need>0&&okCount===need&&!etat.drag&&isWin(etat.L,etat.grid,etat.tr)){etat.won=true;etat.wonT=etat.T;onWin();}
    if(etat.won){const k=etat.T-etat.wonT;if(k<1.2&&Math.random()<.5){const ids=[...etat.lastOkSet];if(ids.length)burst(ids[(Math.random()*ids.length)|0],[1,2,4,3,5,6,7][(Math.random()*7)|0],4,1.6);}}
    // dragged piece
    if(etat.drag&&etat.drag.active){const g={t:etat.drag.proto.t,o:etat.drag.o,c:etat.drag.proto.c,a:angFor({t:etat.drag.proto.t,o:etat.drag.o})};
      ctx.save();ctx.globalAlpha=.92;ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=16;drawPiece(ctx,g,etat.drag.px,etat.drag.py-(etat.drag.lift||0),cs*1.08,{base:true});ctx.restore();}
  }
  // particles
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let k=parts.length-1;k>=0;k--){const p=parts[k];p.life+=dt;if(p.life>p.max){parts.splice(k,1);continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*1.8;p.vy*=1-dt*1.8;const a=1-p.life/p.max;
    const r=p.r*(1+a);const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);gr.addColorStop(0,`rgba(255,255,255,${a*.9})`);gr.addColorStop(.3,rgba(p.c,a*.6));gr.addColorStop(1,rgba(p.c,0));ctx.fillStyle=gr;ctx.fillRect(p.x-r*3,p.y-r*3,r*6,r*6);}
  ctx.restore();
  requestAnimationFrame(frame);
}
function drawTray(){
  ctx.save();
  if(!etat.tray.length){ctx.restore();return;}
  const s0=etat.lay.slots[0],sl=etat.lay.slots[etat.lay.slots.length-1];const padd=14;
  const x0=s0.x-s0.s/2-padd,y0=s0.y-s0.s/2-padd,x1=sl.x+sl.s/2+padd,y1=sl.y+sl.s/2+padd;
  rr(ctx,x0,y0,x1-x0,y1-y0,22);ctx.fillStyle='rgba(22,17,44,.6)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;ctx.stroke();
  for(const s of etat.lay.slots){const tp=etat.tray[s.i];
    rr(ctx,s.x-s.s/2,s.y-s.s/2,s.s,s.s,16);ctx.fillStyle=tp.n?'rgba(255,255,255,.06)':'rgba(255,255,255,.02)';ctx.fill();ctx.strokeStyle=tp.n?'rgba(255,255,255,.16)':'rgba(255,255,255,.05)';ctx.stroke();
    ctx.globalAlpha=tp.n?1:.22;
    drawPiece(ctx,{t:tp.t,o:0,c:tp.c,a:angFor({t:tp.t,o:0})},s.x,s.y,s.s*.92,{});
    ctx.globalAlpha=1;
    if(tp.n>0){const bx=s.x+s.s/2-6,by=s.y-s.s/2+6;ctx.fillStyle='#efeaff';ctx.beginPath();ctx.arc(bx,by,10,0,TAU);ctx.fill();ctx.fillStyle='#14102a';ctx.font='600 12px Outfit,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(tp.n),bx,by+.5);}
  }
  ctx.restore();
}
// decorative beams on title
const tb=[];
function drawTitleBeams(dt){
  if(tb.length<5&&Math.random()<dt*1.2){const c=[1,2,4,3,5,6,7][(Math.random()*7)|0];const pts=[];let x=Math.random()<.5?-.05:1.05,y=Math.random();let d=x<0?0:2;pts.push([x,y]);
    for(let k=0;k<5;k++){const L2=.15+Math.random()*.45;x+=[1,0,-1,0][d]*L2*(etat.VH/etat.VW);y+=[0,1,0,-1][d]*L2;pts.push([x,y]);d=(d+(Math.random()<.5?1:3))%4;}
    tb.push({pts,c,t:0,life:9+Math.random()*5});}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
  for(let k=tb.length-1;k>=0;k--){const b=tb[k];b.t+=dt;if(b.t>b.life){tb.splice(k,1);continue;}
    const fade=Math.min(1,b.t/1.5,(b.life-b.t)/2);const grow=Math.min(1,b.t/3);
    let total=0;const seg=[];for(let i=1;i<b.pts.length;i++){const a=b.pts[i-1],c2=b.pts[i];const l=Math.hypot((c2[0]-a[0])*etat.VW,(c2[1]-a[1])*etat.VH);seg.push(l);total+=l;}
    let rem=total*grow;
    for(const [w,al] of [[26,.03],[12,.07],[5,.18],[1.6,.6]]){ctx.lineWidth=w;ctx.strokeStyle=rgba(b.c,al*fade);ctx.beginPath();ctx.moveTo(b.pts[0][0]*etat.VW,b.pts[0][1]*etat.VH);let r2=rem;
      for(let i=1;i<b.pts.length&&r2>0;i++){const a=b.pts[i-1],c2=b.pts[i];const f=Math.min(1,r2/seg[i-1]);ctx.lineTo((a[0]+(c2[0]-a[0])*f)*etat.VW,(a[1]+(c2[1]-a[1])*f)*etat.VH);r2-=seg[i-1];}ctx.stroke();}
  }
  ctx.restore();
}
