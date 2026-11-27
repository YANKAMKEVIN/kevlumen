// @ts-check
/** Sauvegarde versionnée (niveaux réussis, étoiles, son) dans localStorage.
 *
 * Règle : toute modification du format incrémente SAVE_VERSION et ajoute une étape
 * à migrate(). Une sauvegarde abîmée ou plus récente que le jeu n'est jamais
 * écrasée en silence : elle est mise de côté sous KEY + '.abimee' et le jeu repart
 * des valeurs par défaut. L'ancien format (clé 'kevlumen_v1', sans version) est
 * repris une fois puis effacé. */

export const KEY = 'kevlumen.sauvegarde';
export const LEGACY_KEY = 'kevlumen_v1';
export const SAVE_VERSION = 1;
export const NB_NIVEAUX = 30;

/** done : numéro de niveau (0..29) -> meilleures étoiles (1..3).
 * @typedef {{version:number,done:Record<string,number>,snd:boolean}} SaveData */

/** @returns {SaveData} */
export function defaults() { return { version: SAVE_VERSION, done: {}, snd: true }; }

/** @param {unknown} v @param {number} lo @param {number} hi */
const intIn = (v, lo, hi) => Number.isInteger(v) && /** @type {number} */ (v) >= lo && /** @type {number} */ (v) <= hi;

/** Amène une sauvegarde d'une version antérieure à SAVE_VERSION ; null si inconnue ou trop récente.
 * @param {any} d @returns {any} */
export function migrate(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const v = d.version;
  if (!Number.isInteger(v) || v < 1 || v > SAVE_VERSION) return null;
  const out = structuredClone(d);
  // Étapes futures, à chaîner ici :
  // if (out.version === 1) { out = v1ToV2(out); }
  return out;
}

/** @param {any} d @returns {d is SaveData} */
export function isValid(d) {
  if (!d || typeof d !== 'object' || d.version !== SAVE_VERSION) return false;
  if (typeof d.snd !== 'boolean') return false;
  const done = d.done;
  if (!done || typeof done !== 'object' || Array.isArray(done)) return false;
  for (const [k, v] of Object.entries(done)) {
    if (!/^\d+$/.test(k) || !intIn(+k, 0, NB_NIVEAUX - 1) || !intIn(v, 1, 3)) return false;
  }
  return true;
}

/** Texte -> sauvegarde valide, ou null.
 * @param {string|null} text */
export function parse(text) {
  if (text == null) return null;
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  const d = migrate(raw);
  return isValid(d) ? d : null;
}

/** Ancien format {done:{…}, snd} -> format actuel ; on garde ce qui est lisible.
 * @param {string} text @returns {SaveData|null} */
export function fromLegacy(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!raw || typeof raw !== 'object') return null;
  const d = defaults();
  if (typeof raw.snd === 'boolean') d.snd = raw.snd;
  if (raw.done && typeof raw.done === 'object') {
    for (const [k, v] of Object.entries(raw.done)) {
      if (/^\d+$/.test(k) && intIn(+k, 0, NB_NIVEAUX - 1) && intIn(v, 1, 3)) d.done[k] = /** @type {number} */ (v);
    }
  }
  return d;
}

/** Lit la sauvegarde ; reprend l'ancien format ; repart des valeurs par défaut si elle manque ou est abîmée.
 * @param {Storage|null} store @returns {SaveData} */
export function load(store) {
  if (!store) return defaults();
  let text = null, legacy = null;
  try { text = store.getItem(KEY); legacy = store.getItem(LEGACY_KEY); } catch { return defaults(); }
  if (text == null) {
    if (legacy == null) return defaults();
    const d = fromLegacy(legacy) || defaults();
    if (write(store, d)) { try { store.removeItem(LEGACY_KEY); } catch { /* bloqué */ } }
    return d;
  }
  const d = parse(text);
  if (d) return d;
  try { store.setItem(KEY + '.abimee', text); store.removeItem(KEY); } catch { /* stockage plein ou bloqué */ }
  return defaults();
}

/** @param {Storage|null} store @param {SaveData} d @returns {boolean} */
export function write(store, d) {
  if (!store || !isValid(d)) return false;
  try { store.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}

/** Le stockage du navigateur, ou null s'il est bloqué (navigation privée, iframe…). */
export function browserStore() {
  try { const s = window.localStorage; s.getItem(KEY); return s; } catch { return null; }
}

/** Sauvegarde du jeu en cours (objet modifié sur place, jamais remplacé). */
export const save = load(browserStore());
/** Écrit la sauvegarde du jeu en cours. */
export function persist() { return write(browserStore(), save); }
