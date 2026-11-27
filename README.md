# KevLumen

Un puzzle de lumière à jouer dans le navigateur, à la souris ou au doigt.
Fais glisser des miroirs, des séparateurs, des prismes et des filtres pour guider des rayons colorés jusqu'aux cristaux.

![KevLumen](captures/aurore_ordi.png)

## Jouer

En ligne : https://yankamkevin.github.io/kevlumen/ (une fois GitHub Pages activé).

En local, le jeu est en modules ES : il faut un petit serveur (un double-clic sur `index.html` ne suffit plus).

```bash
npm start          # puis ouvrir http://localhost:8000
```

## Règles

- **Source** : émet un rayon coloré.
- **Cristal** : s'allume quand il reçoit *exactement* sa couleur. Les couleurs s'additionnent : rouge + vert = jaune, rouge + bleu = magenta, vert + bleu = cyan, les trois = blanc.
- **Miroir** : renvoie la lumière à angle droit. Touche-le pour le faire pivoter.
- **Séparateur** : laisse passer le rayon et le reflète en même temps.
- **Prisme** : décompose la lumière (rouge à gauche, vert tout droit, bleu à droite). Il ne prend la lumière que par l'arrière.
- **Filtre** : ne laisse passer que sa couleur.
- **Cristal d'ombre** : doit rester dans le noir.

## Contenu

- 30 niveaux en 6 chapitres : Reflets, Séparateurs, Filtres, Prismes, Ombres, Aurore.
- Indices, annuler, recommencer, étoiles et progression sauvegardée dans le navigateur.
- Ambiance sonore douce générée en direct (aucun fichier audio).

## Technique

Version 1.1.0 (affichée sur l'écran titre). Pas d'étape de compilation : le navigateur charge `src/main.js`.

| Fichier | Rôle |
|---|---|
| `src/sim.js` | Simulation des rayons et condition de victoire. Sans DOM. |
| `src/levels.js` | Les 30 niveaux et les 6 chapitres (données). |
| `src/game.js` | Règles d'un niveau : poser, tourner, reprendre, annuler, indices, étoiles. Sans DOM. |
| `src/save.js` | Sauvegarde versionnée. |
| `src/state.js` | État partagé et liaisons vers l'interface. |
| `src/layout.js`, `src/render.js`, `src/input.js`, `src/ui.js`, `src/audio.js` | Mise en page, dessin, gestes, écrans, son. |

Les types sont vérifiés par TypeScript sur le JavaScript (`// @ts-check` + JSDoc, `npm run types`).

## Sauvegarde

Clé `kevlumen.sauvegarde` dans le navigateur : `{ version, done: { niveau: étoiles }, snd }`.
Tout changement de format incrémente `SAVE_VERSION` et ajoute une étape à `migrate()`.
Une sauvegarde abîmée ou d'une version plus récente est mise de côté sous `kevlumen.sauvegarde.abimee`, jamais écrasée.
L'ancien format (`kevlumen_v1`) est repris automatiquement une fois, puis effacé.

## Dossier `outils`

Les outils qui ont servi à fabriquer les niveaux (Node, CommonJS) :

- `sim.js` : copie de la simulation (un test vérifie qu'elle trace exactement les mêmes rayons que `src/sim.js`).
- `gen.js` et `build.js` : le générateur de niveaux et le solveur qui vérifie que chaque niveau a une solution. Les niveaux retenus sont ensuite copiés dans `src/levels.js`.

## Tests

```bash
npm install
npx playwright install chromium
npm test            # types + unitaires + fumée + partie complète ; captures dans test-results/
```

- `npm run unit` : rayons (miroir, séparateur, filtre, prisme, ombre, mélange des couleurs), les 30 niveaux bien formés et résolus avec les vraies règles, annuler, indices, étoiles, déblocage, partie complète simulée, sauvegarde (abîmée, trop récente, stockage bloqué, ancien format).
- `npm run smoke` : le jeu joue tout seul sur ordinateur, iPhone SE et Pixel 7 couché ; échoue sur toute erreur console, un bouton hors écran, une page qui déborde ou une chute d'images/s.
- `npm run partie` : les 30 niveaux résolus à la souris par de vrais glisser-déposer, écran de victoire et étoiles, sauvegarde relue après rechargement, ancien format repris, sauvegarde abîmée ; puis 3 niveaux au doigt sur iPhone SE.

La CI GitHub (`.github/workflows/tests.yml`) lance tout sur chaque PR et bloque en cas d'échec. GitHub Pages publie directement la branche `main` (fichier `.nojekyll` : servie telle quelle).
