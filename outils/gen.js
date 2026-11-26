const {DX,DY,MIR,NORI,trace,isWin}=require('./sim.js');
function RNG(s){return ()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const pick=(r,a)=>a[(r()*a.length)|0];
function shuffle(r,a){for(let i=a.length-1;i>0;i--){const j=(r()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function bits(c){return (c&1)+((c>>1)&1)+((c>>2)&1);}
function pieceKey(p){return p.t==='flt'?'flt'+p.c:p.t;}

function makeGrid(L){const g=new Array(L.w*L.h).fill(null);for(const c of L.cells)g[c.y*L.w+c.x]=Object.assign({},c);return g;}

function solve(L, opts={}){
  const maxNodes=opts.maxNodes||150000, maxSol=opts.maxSol||50;
  const base=makeGrid(L);
  const rotIdx=[]; base.forEach((g,i)=>{if(g&&g.rot)rotIdx.push(i);});
  const trayCount={}; const trayProto={};
  for(const p of L.tray){const k=pieceKey(p);trayCount[k]=(trayCount[k]||0)+1;trayProto[k]=p;}
  const keys=Object.keys(trayCount);
  let nodes=0; const sols=new Set(); const memo=new Set(); let firstSolNodes=-1; let aborted=false; const solList=[];
  const combos=[]; (function rec(i,acc){if(i===rotIdx.length){combos.push(acc.slice());return;} const g=base[rotIdx[i]]; for(let o=0;o<NORI[g.t];o++){acc.push(o);rec(i+1,acc);acc.pop();}})(0,[]);
  function dfs(grid,placed,rotKey){
    if(nodes++>maxNodes){aborted=true;return;}
    if(sols.size>=maxSol) return;
    const tr=trace(L,grid);
    if(isWin(L,grid,tr)){let pl=placed.slice(); const saved=[]; let changed=true; while(changed){changed=false; for(let j=0;j<pl.length;j++){const ii=+pl[j].split(':')[0]; const sv=grid[ii]; grid[ii]=null; const w=isWin(L,grid,trace(L,grid)); if(w){ saved.push([ii,sv]); pl.splice(j,1); changed=true; break;} grid[ii]=sv;}} for(const [ii,sv] of saved) grid[ii]=sv;
      // restore grid unaffected; key uses reduced set
      const key=rotKey+'|'+pl.sort().join(';'); if(!sols.has(key)){sols.add(key);solList.push(key); if(firstSolNodes<0)firstSolNodes=nodes;} return;}
    for(const i of tr.lit){ if(grid[i]) continue;
      for(const k of keys){ if(!trayCount[k]) continue; const pr=trayProto[k];
        for(let o=0;o<NORI[pr.t];o++){
          const pk=i+':'+k+':'+o; const np=placed.concat([pk]); const mk=rotKey+'|'+np.slice().sort().join(';');
          if(memo.has(mk)) continue; memo.add(mk);
          grid[i]={t:pr.t,o,c:pr.c}; trayCount[k]--;
          dfs(grid,np,rotKey);
          grid[i]=null; trayCount[k]++;
          if(aborted||sols.size>=maxSol) return;
        }}}
  }
  for(const cb of combos){
    const grid=base.map(g=>g?Object.assign({},g):null);
    rotIdx.forEach((ix,j)=>grid[ix].o=cb[j]);
    dfs(grid,[],cb.join(','));
    if(aborted) break;
  }
  return {nodes,sols:sols.size,aborted,firstSolNodes,solList};
}

function generate(cfg, seed){
  const r=RNG(seed);
  for(let attempt=0;attempt<400;attempt++){
    const W=cfg.w,H=cfg.h; const grid=new Array(W*H).fill(null);
    const empty=()=>{const a=[];for(let i=0;i<W*H;i++)if(!grid[i])a.push(i);return a;};
    // walls
    for(let k=0;k<(cfg.walls||0);k++){const e=pick(r,empty());grid[e]={t:'wall'};}
    // sources
    let ok=true;
    for(const c of cfg.src){
      let placed=false;
      for(let t=0;t<60&&!placed;t++){
        const e=pick(r,empty()); const x=e%W,y=(e/W)|0;
        const border=x===0||y===0||x===W-1||y===H-1; if(cfg.borderSrc!==false && !border && r()<0.8) continue;
        const ds=shuffle(r,[0,1,2,3]);
        for(const d of ds){const nx=x+DX[d]*2,ny=y+DY[d]*2; if(nx<0||ny<0||nx>=W||ny>=H) continue; if(grid[(y+DY[d])*W+x+DX[d]]) continue; grid[e]={t:'src',d,c}; placed=true; break;}
      }
      if(!placed){ok=false;break;}
    }
    if(!ok) continue;
    // solution pieces
    const pieces=[]; const T=cfg.tray||{};
    for(let k=0;k<(T.mir||0);k++)pieces.push({t:'mir'});
    for(let k=0;k<(T.spl||0);k++)pieces.push({t:'spl'});
    for(let k=0;k<(T.pri||0);k++)pieces.push({t:'pri'});
    for(const c of (T.flt||[]))pieces.push({t:'flt',c});
    const rotPieces=[]; for(const t of (cfg.rot||[]))rotPieces.push({t,rot:true});
    const all=shuffle(r,pieces.concat(rotPieces));
    // order: prisms/filters after some mirrors fine
    const placedIdx=[];
    for(const p of all){
      const L={w:W,h:H}; const tr=trace(L,grid);
      // candidate (cell, incoming dir, color)
      const cand=[];
      for(const s of tr.segs){ const [sx,sy,ex,ey,c,sd,ed]=s; const d=sx===ex?(ey>sy?1:3):(ex>sx?0:2);
        const len=Math.floor(Math.abs(ex-sx)+Math.abs(ey-sy));
        for(let k=1;k<=len;k++){const x=sx+DX[d]*k,y=sy+DY[d]*k; if(x<0||y<0||x>=W||y>=H) continue; const i=y*W+x; if(grid[i]) continue;
          // avoid adjacency to source tip? allow
          cand.push({i,d,c,w:(sd+k)*(sd+k)+1});}}
      let cs=cand;
      if(p.t==='pri') cs=cand.filter(q=>bits(q.c)>=2);
      if(p.t==='flt') cs=cand.filter(q=>(q.c&p.c)&&(q.c&~p.c));
      if(!cs.length){ok=false;break;}
      let tw=cs.reduce((a,b)=>a+b.w,0),rq=r()*tw,q=cs[0]; for(const qq of cs){rq-=qq.w; if(rq<=0){q=qq;break;}}
      let o=0;
      if(p.t==='pri') o=q.d; else if(p.t==='mir'||p.t==='spl') o=(r()*2)|0;
      grid[q.i]={t:p.t,o,c:p.c,rot:p.rot};
      placedIdx.push(q.i);
    }
    if(!ok) continue;
    // crystals
    const L={w:W,h:H};
    const nC=cfg.crys[0]+((r()*(cfg.crys[1]-cfg.crys[0]+1))|0);
    const crysIdx=[];
    for(let k=0;k<nC;k++){
      const tr=trace(L,grid);
      // endpoints & cell colors
      const col=new Map(); const endp=new Set();
      for(const s of tr.segs){const [sx,sy,ex,ey,c]=s; const d=sx===ex?(ey>sy?1:3):(ex>sx?0:2); const len=Math.round(Math.abs(ex-sx)+Math.abs(ey-sy)*1);
        for(let j=1;j<=Math.ceil(Math.abs(ex-sx)+Math.abs(ey-sy));j++){const x=Math.round(sx+DX[d]*j),y=Math.round(sy+DY[d]*j); if(Math.abs(x-sx)>Math.abs(ex-sx)+0.01||Math.abs(y-sy)>Math.abs(ey-sy)+0.01) break; if(x<0||y<0||x>=W||y>=H) continue; const i=y*W+x; if(grid[i]) continue; col.set(i,(col.get(i)||0)|c);}
        // endpoint: last empty cell
        const fx=Math.round(ex-DX[d]*0.5*(ex%1!==0||ey%1!==0?1:0)), fy=Math.round(ey-DY[d]*0.5*(ex%1!==0||ey%1!==0?1:0));
        if(fx>=0&&fy>=0&&fx<W&&fy<H&&!grid[fy*W+fx]) endp.add(fy*W+fx);
      }
      const cand=[];
      for(const [i,c] of col){ let w=1; if(endp.has(i)) w+=4; if(cfg.mix && bits(c)>=2 ) w+=12;
        // distance from sources: avoid adjacent to src
        const x=i%W,y=(i/W)|0; let near=false; for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d]; if(nx>=0&&ny>=0&&nx<W&&ny<H){const g=grid[ny*W+nx]; if(g&&g.t==='src')near=true;}} if(near) w*=0.1;
        cand.push([i,w]); }
      if(!cand.length) break;
      let tot=cand.reduce((a,b)=>a+b[1],0), rr=r()*tot, ch=cand[0][0]; for(const [i,w] of cand){rr-=w; if(rr<=0){ch=i;break;}}
      grid[ch]={t:'crys',c:0}; crysIdx.push(ch);
    }
    if(crysIdx.length<cfg.crys[0]) continue;
    let tr=trace(L,grid);
    let bad=false;
    for(const i of crysIdx){const h=tr.hits.get(i)||0; if(!h){bad=true;break;} grid[i].c=h;}
    if(bad) continue;
    if(cfg.needColors){ const set=new Set(crysIdx.map(i=>grid[i].c)); if(!cfg.needColors.some(c=>set.has(c))) continue; }
    // all placed pieces lit
    tr=trace(L,grid);
    if(placedIdx.some(i=>!tr.lit.has(i))) continue;
    // each piece necessary: removing breaks win
    let nec=true;
    for(const i of placedIdx){const g=grid[i]; grid[i]=null; const t2=trace(L,grid); if(isWin(L,grid,t2)) nec=false; grid[i]=g; if(!nec)break;}
    if(!nec) continue;
    // each rot piece necessary-ish: some other orientation fails
    // dark crystals
    const sol=placedIdx.filter(i=>!grid[i].rot).map(i=>({x:i%W,y:(i/W)|0,t:grid[i].t,o:grid[i].o,c:grid[i].c}));
    const solRot=placedIdx.filter(i=>grid[i].rot).map(i=>({x:i%W,y:(i/W)|0,o:grid[i].o}));
    // build initial
    const init=grid.map(g=>g?Object.assign({},g):null);
    for(const s of sol) init[s.y*W+s.x]=null;
    for(const s of solRot){const g=init[s.y*W+s.x]; g.o=(g.o+1+((r()*(NORI[g.t]-1))|0))%NORI[g.t];}
    if(cfg.darks){
      const ti=trace(L,init); const ts=trace(L,grid);
      let cands=[...ti.lit].filter(i=>!ts.lit.has(i)&&!init[i]);
      // also cells adjacent to solution beams
      if(cands.length<cfg.darks){ const extra=[]; for(const i of ts.lit){const x=i%W,y=(i/W)|0; for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d]; if(nx<0||ny<0||nx>=W||ny>=H)continue; const j=ny*W+nx; if(!ts.lit.has(j)&&!grid[j]) extra.push(j);}} cands=cands.concat(shuffle(r,extra)); }
      cands=[...new Set(cands)];
      if(cands.length<cfg.darks) continue;
      shuffle(r,cands);
      for(let k=0;k<cfg.darks;k++){const i=cands[k]; init[i]={t:'dark'}; grid[i]={t:'dark'};}
      if(!isWin(L,grid,trace(L,grid))) continue;
    }
    const cells=[]; init.forEach((g,i)=>{if(g){const c={t:g.t,x:i%W,y:(i/W)|0}; if(g.o!==undefined)c.o=g.o; if(g.c!==undefined)c.c=g.c; if(g.d!==undefined)c.d=g.d; if(g.rot)c.rot=1; cells.push(c);}});
    const tray=sol.map(s=>s.t==='flt'?{t:'flt',c:s.c}:{t:s.t});
    for(const dcy of (cfg.decoy||[])) tray.push(typeof dcy==='string'?{t:dcy}:dcy);
    const order={mir:0,spl:1,pri:2,flt:3}; tray.sort((a,b)=>order[a.t]-order[b.t]||(a.c||0)-(b.c||0));
    const Lv={w:W,h:H,cells,tray,sol,solRot};
    { const tf=trace(L,grid); Lv.cov=tf.lit.size/(W*H); const xs=[...tf.lit].map(i=>i%W), ys=[...tf.lit].map(i=>(i/W)|0); Lv.span=(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1)/(W*H); }
    // initial not winning
    if(isWin(Lv,init,trace(Lv,init))) continue;
    return Lv;
  }
  return null;
}
module.exports={generate,solve,makeGrid,RNG};
