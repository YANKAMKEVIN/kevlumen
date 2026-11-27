// @ts-check
/** Ambiance et sons générés avec la Web Audio API. */
import { save, persist } from './save.js';

// ---------- audio ----------
/** @type {any} Nœuds Web Audio créés au premier geste du joueur. */
export const Snd={ctx:null,on:save.snd!==false,
  init(){ if(this.ctx) {if(this.ctx.state==='suspended')this.ctx.resume();return;}
    const AC=window.AudioContext||/** @type {any} */ (window).webkitAudioContext; if(!AC) return;
    const c=this.ctx=new AC();
    this.master=c.createGain(); this.master.gain.value=this.on?0.9:0; this.master.connect(c.destination);
    const comp=c.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3; comp.connect(this.master);
    this.out=comp;
    this.rev=c.createConvolver(); const len=c.sampleRate*4.2, ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++){d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}}
    this.rev.buffer=ir; this.revG=c.createGain(); this.revG.gain.value=0.55; this.rev.connect(this.revG); this.revG.connect(comp);
    this.dry=c.createGain(); this.dry.gain.value=0.7; this.dry.connect(comp);
    this.padBus=c.createGain(); this.padBus.gain.value=0.0; const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; lp.Q.value=0.4;
    this.padBus.connect(lp); lp.connect(this.rev); lp.connect(this.dry);
    this.padBus.gain.linearRampToValueAtTime(0.16,c.currentTime+4);
    this.chordI=0; this.nextChord=c.currentTime+0.1; this.nextBell=c.currentTime+3;
    setInterval(()=>this.tick(),250);
  },
  mtof:m=>440*Math.pow(2,(m-69)/12),
  CH:[[48,55,59,62,64],[45,52,55,60,64],[41,48,52,55,57,64],[43,50,55,57,62]],
  tick(){const c=this.ctx;if(!c)return;const t=c.currentTime;
    if(t>this.nextChord-0.2){this.chord(this.CH[this.chordI%4],this.nextChord,11);this.chordI++;this.nextChord+=9;}
    if(t>this.nextBell){const pent=[72,74,76,79,81,84,86,88];this.bell(this.mtof(pent[(Math.random()*pent.length)|0]),0.035,t+0.05,3.5);this.nextBell=t+2.5+Math.random()*5;}
  },
  chord(notes,t0,dur){const c=this.ctx;
    for(const m of notes){for(const [type,det,g] of /** @type {[OscillatorType,number,number][]} */ ([['sine',-5,.5],['triangle',6,.22],['sine',1200,.06]])){
      const o=c.createOscillator();o.type=type;o.frequency.value=this.mtof(m);o.detune.value=det;
      const gn=c.createGain();gn.gain.setValueAtTime(0,t0);gn.gain.linearRampToValueAtTime(g/notes.length,t0+3.5);gn.gain.setValueAtTime(g/notes.length,t0+dur-4.5);gn.gain.linearRampToValueAtTime(0,t0+dur);
      o.connect(gn);gn.connect(this.padBus);o.start(t0);o.stop(t0+dur+.1);}}
  },
  bell(f,vol,t,dec=2.4){const c=this.ctx;if(!c)return;t=t||c.currentTime;
    const o=c.createOscillator(),m=c.createOscillator(),mg=c.createGain(),g=c.createGain();
    o.type='sine';o.frequency.value=f;m.type='sine';m.frequency.value=f*3.5;mg.gain.setValueAtTime(f*1.2,t);mg.gain.exponentialRampToValueAtTime(1,t+dec*.6);
    m.connect(mg);mg.connect(o.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dec);
    o.connect(g);g.connect(this.rev);g.connect(this.dry);o.start(t);m.start(t);o.stop(t+dec+.1);m.stop(t+dec+.1);
  },
  blip(f1,f2,dur,vol,type='sine'){const c=this.ctx;if(!c)return;const t=c.currentTime;
    const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.dry);g.connect(this.rev);o.start(t);o.stop(t+dur+.02);},
  rotate(){this.blip(1500,900,.07,.06);this.blip(3000,2400,.03,.02,'triangle');},
  pick(){this.blip(600,900,.09,.07,'triangle');},
  place(){this.blip(260,110,.16,.16);this.blip(1800,1400,.05,.03,'triangle');},
  back(){this.blip(700,400,.12,.06,'triangle');},
  crystal(i){const pent=[76,79,81,84,86,88,91,93];this.bell(this.mtof(pent[i%pent.length]),.12,0,3.2);this.bell(this.mtof(pent[i%pent.length]+12),.03,0,2);},
  dark(){this.blip(110,90,.5,.09,'sawtooth');},
  win(){const c=this.ctx;if(!c)return;const t=c.currentTime;[72,76,79,83,84,88,91,96].forEach((m,i)=>this.bell(this.mtof(m),.09,t+i*.11,3.6));},
  toggle(){this.on=!this.on;save.snd=this.on;persist();if(this.master)this.master.gain.setTargetAtTime(this.on?0.9:0,this.ctx.currentTime,.1);}
};
