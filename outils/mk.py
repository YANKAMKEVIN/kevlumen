s=open('game.html').read()
sim=open('sim.js').read().replace("if(typeof module!=='undefined') module.exports={DX,DY,MIR,NORI,trace,isWin};","")
lv=open('levels.json').read()
s=s.replace('/*__SIM__*/',sim).replace('/*__LEVELS__*/',lv)
import os
os.makedirs('/mnt/project-files/kevlumen',exist_ok=True)
open('dist.html','w').write(s)
