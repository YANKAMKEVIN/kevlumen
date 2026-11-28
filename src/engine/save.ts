/**
 * Sauvegarde versionnée (niveaux réussis, étoiles, réglages), sans DOM.
 *
 * Règles :
 * - toute modification du format incrémente SAVE_VERSION et ajoute une étape à MIGRATIONS ;
 * - une sauvegarde abîmée ou plus récente que le jeu n'est jamais écrasée en silence :
 *   elle est mise de côté sous KEY + '.abimee' et le jeu repart des valeurs par défaut ;
 * - l'ancien format (clé 'kevlumen_v1', sans version) est repris une fois puis effacé ;
 * - un stockage absent ou bloqué (navigation privée) ne casse jamais le jeu.
 *
 * Historique : v1 { version, done, snd } ; v2 { version, done, settings: { sound } }.
 */

export const KEY = 'kevlumen.sauvegarde';
export const BROKEN_KEY = KEY + '.abimee';
export const LEGACY_KEY = 'kevlumen_v1';
export const SAVE_VERSION = 2;
export const NB_NIVEAUX = 30;

/** Ce que la progression a besoin de connaître : numéro de niveau (0..29) -> meilleures étoiles (1..3). */
export interface Progress {
  done: Record<string, number>;
}

export interface Settings {
  /** Son et musique. */
  sound: boolean;
}

export interface SaveData extends Progress {
  version: number;
  settings: Settings;
}

/** Sous-ensemble de Storage utilisé (localStorage, ou un faux en test). */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaults(): SaveData {
  return { version: SAVE_VERSION, done: {}, settings: { sound: true } };
}

const intIn = (v: unknown, lo: number, hi: number): v is number =>
  Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validLevelKey = (k: string): boolean => /^\d+$/.test(k) && intIn(+k, 0, NB_NIVEAUX - 1);

type Raw = Record<string, unknown>;

/** Étapes de migration : MIGRATIONS[v] transforme une sauvegarde v en v+1. */
export const MIGRATIONS: Record<number, (d: Raw) => Raw> = {
  1: d => {
    const { snd, ...rest } = d;
    return { ...rest, version: 2, settings: { sound: typeof snd === 'boolean' ? snd : true } };
  },
};

/** Amène une sauvegarde d'une version antérieure à SAVE_VERSION ; null si inconnue ou trop récente. */
export function migrate(d: unknown): Raw | null {
  if (!isObj(d)) return null;
  const v = d.version;
  if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > SAVE_VERSION) return null;
  let out: Raw = structuredClone(d);
  while ((out.version as number) < SAVE_VERSION) {
    const step = MIGRATIONS[out.version as number];
    if (!step) return null;
    out = step(out);
  }
  return out;
}

export function isValid(d: unknown): d is SaveData {
  if (!isObj(d) || d.version !== SAVE_VERSION) return false;
  if (!isObj(d.settings) || typeof d.settings.sound !== 'boolean') return false;
  if (!isObj(d.done)) return false;
  for (const [k, v] of Object.entries(d.done)) {
    if (!validLevelKey(k) || !intIn(v, 1, 3)) return false;
  }
  return true;
}

/** Texte -> sauvegarde valide (migrée si besoin) et version d'origine, ou null. */
function parseWithVersion(text: string | null): { data: SaveData; from: number } | null {
  if (text == null) return null;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  const d = migrate(raw);
  return isValid(d) ? { data: d, from: (raw as Raw).version as number } : null;
}

/** Texte -> sauvegarde valide (migrée si besoin), ou null. */
export function parse(text: string | null): SaveData | null {
  return parseWithVersion(text)?.data ?? null;
}

/** Ancien format {done:{…}, snd} -> format actuel ; on garde ce qui est lisible. */
export function fromLegacy(text: string): SaveData | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isObj(raw)) return null;
  const d = defaults();
  if (typeof raw.snd === 'boolean') d.settings.sound = raw.snd;
  if (isObj(raw.done)) {
    for (const [k, v] of Object.entries(raw.done)) {
      if (validLevelKey(k) && intIn(v, 1, 3)) d.done[k] = v;
    }
  }
  return d;
}

/** Lit la sauvegarde ; reprend l'ancien format ; repart des valeurs par défaut si elle manque ou est abîmée. */
export function load(store: KVStore | null): SaveData {
  if (!store) return defaults();
  let text: string | null = null, legacy: string | null = null;
  try { text = store.getItem(KEY); legacy = store.getItem(LEGACY_KEY); } catch { return defaults(); }
  if (text == null) {
    if (legacy == null) return defaults();
    const d = fromLegacy(legacy) || defaults();
    if (write(store, d)) { try { store.removeItem(LEGACY_KEY); } catch { /* bloqué */ } }
    return d;
  }
  const p = parseWithVersion(text);
  if (p) {
    // une sauvegarde migrée est réécrite tout de suite au format actuel
    if (p.from !== SAVE_VERSION) write(store, p.data);
    return p.data;
  }
  try { store.setItem(BROKEN_KEY, text); store.removeItem(KEY); } catch { /* stockage plein ou bloqué */ }
  return defaults();
}

/** Écrit la sauvegarde ; refuse un état invalide ; false si le stockage est plein ou bloqué. */
export function write(store: KVStore | null, d: SaveData): boolean {
  if (!store || !isValid(d)) return false;
  try { store.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}
