const {generate,solve}=require('./gen.js');
const C=[
 // name, hint, cfg, pct
 ['Première lueur','Fais glisser le miroir depuis le bas et pose-le sur le rayon pour guider la lumière jusqu’au cristal.',{w:5,h:5,src:[4],walls:0,tray:{mir:1},crys:[1,1]},0.1],
 ['Pivot','Touche un miroir posé pour le faire pivoter.',{w:5,h:5,src:[1],walls:1,rot:['mir','mir'],crys:[1,1]},0.3],
 ['Double reflet','Deux miroirs, un seul chemin.',{w:6,h:6,src:[2],walls:3,tray:{mir:2},crys:[1,1]},0.4],
 ['Lumière blanche','Les cristaux ne s’allument qu’avec leur couleur exacte.',{w:6,h:6,src:[7],walls:4,tray:{mir:2},rot:['mir'],crys:[1,1]},0.5],
 ['Magenta','Les lumières s’additionnent : rouge + bleu = magenta.',{w:6,h:6,src:[1,4],walls:2,tray:{mir:2},crys:[1,1],mix:true,needColors:[5]},0.4],
 ['Aube jaune','Rouge + vert = jaune. Un cristal peut recevoir plusieurs rayons.',{w:7,h:7,src:[1,2],walls:4,tray:{mir:3},crys:[1,2],mix:true,needColors:[3]},0.5],
 ['Trois sources','Rouge, vert et bleu ensemble donnent du blanc.',{w:7,h:7,src:[1,2,4],walls:4,tray:{mir:2},rot:['mir','mir'],crys:[2,3],mix:true},0.6],
 ['Le séparateur','Le séparateur laisse passer la lumière ET la reflète en même temps.',{w:6,h:6,src:[6],walls:2,tray:{spl:1,mir:1},crys:[2,2]},0.4],
 ['Fourche','Un rayon, deux destins.',{w:7,h:7,src:[1,4],walls:4,tray:{spl:1,mir:2},crys:[2,3],mix:true},0.6],
 ['Éventail','',{w:7,h:7,src:[7],walls:5,tray:{spl:2,mir:2},crys:[3,3]},0.7],
 ['Ricochets','',{w:7,h:7,src:[2,5],walls:5,tray:{spl:1,mir:2},rot:['mir'],crys:[2,3],mix:true},0.75],
 ['Le filtre','Un filtre ne laisse passer que sa propre couleur.',{w:6,h:6,src:[7],walls:2,tray:{flt:[1],mir:1},crys:[1,1]},0.4],
 ['Verre ambré','',{w:7,h:7,src:[7],walls:4,tray:{flt:[3],spl:1,mir:1},crys:[2,2]},0.6],
 ['Tamis','',{w:7,h:7,src:[7],walls:4,tray:{flt:[4,2],spl:1,mir:1},crys:[2,3]},0.7],
 ['Le prisme','Le prisme décompose la lumière blanche en rouge, vert et bleu. Oriente-le face au rayon.',{w:7,h:7,src:[7],walls:2,tray:{pri:1},crys:[3,3]},0.4],
 ['Arc-en-ciel','',{w:7,h:7,src:[7],walls:4,tray:{pri:1,mir:2},crys:[3,3]},0.6],
 ['Spectre','',{w:8,h:8,src:[7],walls:6,tray:{pri:1,mir:2,flt:[5]},crys:[2,3]},0.7],
 ['Réfraction','',{w:8,h:8,src:[7,1],walls:6,tray:{pri:1,spl:1,mir:2},crys:[3,4],mix:true},0.75],
 ['Cristal d’ombre','Les cristaux d’ombre doivent rester dans le noir.',{w:6,h:6,src:[5],walls:2,tray:{mir:2},crys:[1,1],darks:1},0.5],
 ['Pénombre','',{w:7,h:7,src:[7],walls:4,tray:{spl:1,mir:2},crys:[2,2],darks:2},0.7],
 ['Éclipse','',{w:8,h:8,src:[7],walls:5,tray:{pri:1,mir:2},crys:[2,3],darks:2},0.75],
 ['Leurre','Toutes les pièces ne sont pas forcément utiles…',{w:7,h:7,src:[3,4],walls:5,tray:{mir:2,spl:1},crys:[2,3],mix:true,decoy:[{t:'flt',c:2}]},0.7],
 ['Kaléidoscope','',{w:8,h:8,src:[7],walls:6,tray:{pri:1,spl:1,mir:2},rot:['mir'],crys:[3,4]},0.8],
 ['Vitrail','',{w:8,h:8,src:[7,7],walls:6,tray:{flt:[6,1],mir:2},crys:[2,3],mix:true,darks:1},0.8],
 ['Nébuleuse','',{w:8,h:8,src:[1,2,4],walls:7,tray:{spl:2,mir:2},crys:[3,4],mix:true,darks:1},0.85],
 ['Constellation','',{w:8,h:8,src:[7],walls:6,tray:{pri:1,spl:1,mir:2,flt:[3]},crys:[3,4],darks:1},0.85],
 ['Aurore','',{w:9,h:9,src:[7,4],walls:8,tray:{pri:1,spl:1,mir:3},rot:['mir'],crys:[3,4],mix:true,darks:1},0.9],
 ['Labyrinthe de verre','',{w:9,h:9,src:[7],walls:10,tray:{pri:1,spl:2,mir:2},crys:[4,5],darks:2},0.9],
 ['Supernova','',{w:9,h:9,src:[7,7],walls:9,tray:{pri:2,mir:3},crys:[4,5],mix:true,darks:1},0.95],
 ['Lumière éternelle','Le dernier cristal. Tout ce que tu as appris.',{w:9,h:9,src:[7,1],walls:9,tray:{pri:1,spl:1,mir:3,flt:[4]},rot:['mir'],crys:[4,5],mix:true,darks:2,decoy:['mir']},0.95],
];
const out=[];const ONLY=+process.argv[2];
C.forEach(([name,hint,cfg,pct],li)=>{ if(li!==ONLY) return;
  const cands=[]; const N=li<4?60:(li>=15?50:120); const TRIES=(li===16||li===21||li===29)?N*20:N*3; const t0=Date.now();
  for(let s=0;s<TRIES && cands.length<N;s++){
    const L=generate(cfg,(li+1)*100003+s*7919); if(!L) continue;
    {const {makeGrid}=require('./gen.js');const {trace,isWin}=require('./sim.js');const g=makeGrid(L);for(const p of L.sol)g[p.y*L.w+p.x]={t:p.t,o:p.o,c:p.c};for(const p of L.solRot)g[p.y*L.w+p.x].o=p.o;if(!isWin(L,g,trace(L,g))){console.log('BADSOL');continue;}}
    const big=li>=15; const r=solve(L,{maxNodes:big?60000:100000,maxSol:30}); if(r.aborted&&!big) continue; if(r.aborted&&r.sols===0) r.sols=0.5;
    if(r.sols===0) {console.log('UNSOLVABLE?',li); continue;}
    // coverage: length of beams in solution
    cands.push({L,r});
  }
  const maxS=Math.min(...cands.map(c=>c.r.sols));
  {const sp=cands.map(c=>c.L.span+c.L.cov).sort((a,b)=>a-b); const med=sp[Math.floor(sp.length*0.5)]; const k=cands.filter(c=>c.L.span+c.L.cov>=med); if(k.length>=3){cands.length=0; cands.push(...k);} }
  let pool=cands.filter(c=>!c.r.aborted&&c.r.sols<=Math.max(maxS, li<6?3:2)); if(pool.length<3) pool=cands.filter(c=>c.r.sols<=2);
  if(!pool.length) pool=cands.slice().sort((a,b)=>a.r.sols-b.r.sols).slice(0,3);
  pool.sort((a,b)=>a.r.nodes-b.r.nodes);
  const ch=pool[Math.min(pool.length-1,Math.floor(pct*pool.length))];
  const L=ch.L; L.name=name; L.hint=hint; console.log('span',L.span.toFixed(2),'cov',L.cov.toFixed(2));
  out.push(L);
  console.log(li+1,name,'cands',cands.length,'pool',pool.length,'sols',ch.r.sols,'nodes',ch.r.nodes,ch.r.aborted?'ABORT':'',(Date.now()-t0)+'ms');
});
require('fs').mkdirSync('out',{recursive:true});require('fs').writeFileSync('out/'+ONLY+'.json',JSON.stringify(out[0]));
