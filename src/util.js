// @ts-check
/** Petits outils : couleurs, interpolation, bornes. */

/** Version du jeu, affichée sur l'écran titre (garder égale à package.json). */
export const VERSION='1.1.0';
/** Élément de la page par son id (la page est fixe : il existe toujours).
 * @param {string} id @returns {any} */
export const $=id=>document.getElementById(id);
export const TAU=Math.PI*2;
const COL={1:[255,64,92],2:[64,255,128],4:[70,120,255],3:[255,214,70],5:[255,70,230],6:[70,240,255],7:[255,255,255],0:[120,110,150]};
export const rgba=(c,a)=>`rgba(${COL[c][0]},${COL[c][1]},${COL[c][2]},${a})`;
export const ease=(a,b,k)=>a+(b-a)*k;
