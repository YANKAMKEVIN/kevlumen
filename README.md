# KevLumen

Un puzzle de lumière à jouer dans le navigateur, à la souris ou au doigt.
Fais glisser des miroirs, des séparateurs, des prismes et des filtres pour guider des rayons colorés jusqu'aux cristaux.

![KevLumen](captures/aurore_ordi.png)

## Jouer

En ligne : https://yankamkevin.github.io/kevlumen/ (publié par la CI à chaque fusion sur `main`, voir plus bas).

En local (Node 20 ou plus) :

```bash
npm ci
npm run dev        # serveur de développement Vite, rechargement à chaud
npm run build      # construit le jeu dans dist/
npm run preview    # sert dist/ sous /kevlumen/, comme GitHub Pages
```

## Visuels
L'affiche de l'écran titre et le fond de chacun des 6 chapitres sont peints avec Codex (`src/assets/art/`, WebP). Les prompts sont dans `tools/art/prompts.json` ; `tools/art/generer.sh` les génère et `tools/art/finir.py` les recadre et les exporte. Le centre des fonds reste sombre pour laisser le plateau lisible. Sans eux, le fond procédural d'origine prend le relais (`src/view/background.ts`).

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

Version 1.2.0 (affichée sur l'écran titre). TypeScript strict, construit par Vite (base relative : le même build marche à la racine et sous `/kevlumen/`).

```
src/
  engine/   moteur pur, sans DOM ni son : testé sous Node
    types.ts      types (pièces, niveaux, rayons)
    sim.ts        propagation des rayons et condition de victoire
    puzzle.ts     une partie : poser, prendre, tourner, annuler, indices, victoire (événements)
    progress.ts   étoiles, déblocage, niveau suivant
    save.ts       sauvegarde versionnée et migrations
    solver.ts     solveur indépendant des solutions enregistrées
    levels.ts     les 30 niveaux et les 6 chapitres (données)
  view/     dessin sur canvas
    state.ts, layout.ts, anim.ts, color.ts   état de la vue, mise en page, animations (sans DOM, testés)
    frame.ts      boucle d'affichage, détection de la victoire, pause onglet caché
    pieces.ts, beams.ts, board.ts, particles.ts, background.ts, title.ts
  app/      application : écrans, gestes, son, sauvegarde du navigateur, visuels
  main.ts   point d'entrée
```

Perf mobile : devicePixelRatio plafonné à 2, lueurs pré-rendues (aucun dégradé créé pendant une image), particules recyclées et plafonnées, boucle et son arrêtés quand l'onglet est caché, réserve à portée de doigt (cases ≥ 52 px, pièce tenue décalée au-dessus du doigt).

## Sauvegarde

Clé `kevlumen.sauvegarde` dans le navigateur : `{ version: 2, done: { niveau: étoiles }, settings: { sound } }`.
Tout changement de format incrémente `SAVE_VERSION` et ajoute une étape à `MIGRATIONS` (`src/engine/save.ts`) ; une sauvegarde migrée est réécrite tout de suite.
Une sauvegarde abîmée ou d'une version plus récente est mise de côté sous `kevlumen.sauvegarde.abimee`, jamais écrasée. Un stockage bloqué ou plein ne casse pas le jeu.
L'ancien format (`kevlumen_v1`) est repris automatiquement une fois, puis effacé.

## Dossier `outils`

Les outils qui ont servi à fabriquer les niveaux (Node, CommonJS) :

- `sim.js` : copie de la simulation (un test vérifie qu'elle trace exactement les mêmes rayons que `src/engine/sim.ts`).
- `gen.js` et `build.js` : le générateur de niveaux. Les niveaux retenus sont ensuite copiés dans `src/engine/levels.ts`.

## Tests

```bash
npm run typecheck   # TypeScript strict
npm test            # Vitest : ~270 tests unitaires (une vingtaine de secondes)
npm run build
npm run e2e         # Playwright sur le build : fumée + partie complète ; captures dans test-results/
npm run check       # tout, dans l'ordre de la CI
```

- **Unitaires** (`tests/unit`) : rayons (miroir, séparateur, filtre, prisme, ombre, couleurs), règles d'une partie (poser, reprendre, tourner, annuler, indices, victoire), progression, sauvegarde (abîmée, trop récente, stockage bloqué ou plein, migrations, ancien format), mise en page sur trois écrans, animations. Chacun des 30 niveaux est **résolu par le solveur** sans regarder la solution enregistrée, et chaque solution enregistrée est vérifiée. Un parcours complet joue les 30 niveaux avec la sauvegarde relue après chacun. Des règles de structure vérifient que le moteur reste pur et qu'aucun fichier ne dépasse 400 lignes.
- **Fumée** (`npm run smoke`) : le jeu joue tout seul sur ordinateur, iPhone SE et Pixel 7 couché ; échoue sur toute erreur console, un bouton hors écran, une page qui déborde ou une chute d'images/s.
- **Partie complète** (`npm run partie`) : les 30 niveaux résolus à la souris par de vrais glisser-déposer, écran de victoire et étoiles, réglage du son et progression relus après rechargement, ancien format repris, sauvegarde abîmée, pause quand l'onglet est caché, DPR plafonné sur un écran dense ; puis 3 niveaux au doigt sur iPhone SE.

## CI et publication

`.github/workflows/tests.yml`, sur chaque PR et chaque push sur `main` : types, tests unitaires, build, puis fumée et partie complète dans Chromium. Tout échec bloque.
Sur `main`, si tout passe, le build est publié sur GitHub Pages (réglage à faire une fois dans le dépôt : *Settings > Pages > Source : GitHub Actions*).
