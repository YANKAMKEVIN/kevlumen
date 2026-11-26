// ---- KevLumen simulation (shared with game) ----
const DX=[1,0,-1,0], DY=[0,1,0,-1];
const MIR=[[3,2,1,0],[1,0,3,2]]; // '/' and '\'
const NORI={mir:2,spl:2,pri:4,flt:1};
function trace(L, grid){
  // grid: array w*h of cell objects or null. cell: {t, o, c, d}
  const W=L.w,H=L.h, seen=new Set(), segs=[], hits=new Map(), lit=new Set(), hd=new Map();
  const q=[];
  for(let i=0;i<W*H;i++){const g=grid[i]; if(g&&g.t==='src') q.push([i%W,(i/W)|0,g.d,g.c,0]);}
  let guard=0;
  while(q.length && guard++<4000){
    let [x,y,d,c,dist]=q.shift();
    const sx=x,sy=y,sd=dist;
    let endType='edge';
    for(;;){
      x+=DX[d]; y+=DY[d]; dist++;
      if(x<0||y<0||x>=W||y>=H){ segs.push([sx,sy,x-DX[d]*0.5,y-DY[d]*0.5,c,sd,dist-0.5]); break; }
      const i=y*W+x, k=(i*4+d)*8+c;
      if(seen.has(k)){ segs.push([sx,sy,x,y,c,sd,dist]); endType='loop'; break;}
      seen.add(k); lit.add(i);
      const g=grid[i];
      if(!g) continue;
      if(g.t==='wall'||g.t==='src'){ segs.push([sx,sy,x-DX[d]*0.5,y-DY[d]*0.5,c,sd,dist-0.5]); break; }
      segs.push([sx,sy,x,y,c,sd,dist]);
      if(g.t==='crys'||g.t==='dark'){ hits.set(i,(hits.get(i)||0)|c); if(!hd.has(i)||hd.get(i)>dist) hd.set(i,dist); break; }
      if(g.t==='mir'){ q.push([x,y,MIR[g.o][d],c,dist]); break; }
      if(g.t==='spl'){ q.push([x,y,d,c,dist]); q.push([x,y,MIR[g.o][d],c,dist]); break; }
      if(g.t==='flt'){ const nc=c&g.c; if(nc) q.push([x,y,d,nc,dist]); break; }
      if(g.t==='pri'){ if(d===g.o){ if(c&1) q.push([x,y,(d+3)%4,1,dist]); if(c&2) q.push([x,y,d,2,dist]); if(c&4) q.push([x,y,(d+1)%4,4,dist]); } break; }
      break;
    }
  }
  return {segs,hits,lit,hd};
}
function isWin(L,grid,tr){
  for(let i=0;i<grid.length;i++){const g=grid[i]; if(!g) continue;
    if(g.t==='crys' && (tr.hits.get(i)||0)!==g.c) return false;
    if(g.t==='dark' && (tr.hits.get(i)||0)) return false;}
  return true;
}
if(typeof module!=='undefined') module.exports={DX,DY,MIR,NORI,trace,isWin};
