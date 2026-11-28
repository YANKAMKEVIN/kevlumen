/** Accès aux éléments fixes de la page. */

/** Élément de la page par son id (la page est fixe : il existe toujours). */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`élément #${id} introuvable`);
  return el as T;
}
