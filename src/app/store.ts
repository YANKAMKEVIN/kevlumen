/** Sauvegarde du jeu en cours, branchée sur le localStorage du navigateur. */
import { KEY, load, write, type KVStore, type SaveData } from '../engine/save';

/** Le stockage du navigateur, ou null s'il est bloqué (navigation privée, iframe…). */
export function browserStore(): KVStore | null {
  try { const s = window.localStorage; s.getItem(KEY); return s; } catch { return null; }
}

/** Sauvegarde du jeu en cours (objet modifié sur place, jamais remplacé). */
export const save: SaveData = load(browserStore());

/** Écrit la sauvegarde ; false si le stockage est plein ou bloqué (le jeu continue). */
export function persist(): boolean { return write(browserStore(), save); }
