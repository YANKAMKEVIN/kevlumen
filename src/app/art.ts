/**
 * Visuels peints avec Codex (src/assets/art, prompts dans tools/art/prompts.json).
 * Le jeu reste jouable sans eux : tant qu'une image n'est pas chargée, le dessin
 * procédural d'origine prend le relais.
 */

export const ART_FILES = [
  'titre', 'fond_reflets', 'fond_separateurs', 'fond_filtres', 'fond_prismes', 'fond_ombres', 'fond_aurore',
] as const;

/** Fond peint de chaque chapitre, dans l'ordre de CHAPTERS. */
export const CHAPTER_ART = ['fond_reflets', 'fond_separateurs', 'fond_filtres', 'fond_prismes', 'fond_ombres', 'fond_aurore'];

/** Adresses des images après construction (Vite les renomme avec une empreinte). */
const URLS = import.meta.glob('../assets/art/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlOf = (name: string): string | undefined => URLS[`../assets/art/${name}.webp`];

const loaded = new Map<string, HTMLImageElement>();

/**
 * Charge tous les visuels. Se résout quand tout est chargé, ou au bout de `maxMs`
 * (une image lente ou absente ne bloque jamais le jeu). Renvoie le nombre d'images prêtes.
 */
export function loadArt(maxMs = 4000): Promise<number> {
  const all = ART_FILES.map(name => new Promise<boolean>(res => {
    const url = urlOf(name);
    if (!url) { res(false); return; }
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { loaded.set(name, im); res(true); };
    im.onerror = () => res(false);
    im.src = url;
  }));
  return Promise.race([
    Promise.all(all),
    new Promise(res => setTimeout(res, maxMs)),
  ]).then(() => loaded.size);
}

/** L'image si elle est prête, sinon null. */
export function art(name: string): HTMLImageElement | null { return loaded.get(name) || null; }
