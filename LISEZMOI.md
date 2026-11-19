# Weather or not — PWA

## Contenu

```
meteo-pwa/
├── index.html              Application (dashboard d'origine + couche PWA)
├── manifest.webmanifest    Nom, icônes, couleurs, mode plein écran
├── sw.js                   Service worker (cache et mode hors ligne)
└── icons/                  Icônes 192, 512, maskable 512, Apple 180
```

## Ce qui a été ajouté au fichier d'origine

- Manifest et balises iOS : installation sur l'écran d'accueil, lancement sans barre de navigateur.
- Service worker :
  - app et bibliothèques (Tailwind, Chart.js, Leaflet, MapLibre, polices) mises en cache → l'app démarre hors ligne après une première ouverture en ligne ;
  - réponses API (Open-Meteo, marine, géocodage, RainViewer) : réseau d'abord, dernière réponse en cache si pas de réseau ;
  - tuiles de carte : cache plafonné à 600 tuiles.
- Badge « Hors ligne » quand le réseau tombe, rechargement automatique au retour du réseau.
- Bouton « Installer » (Chrome, Edge, Android) et consigne d'installation pour iPhone/iPad.
- Mémorisation du dernier lieu consulté (localStorage).
- Message « Nouvelle version disponible » quand `sw.js` change.
- Marges pour l'encoche des iPhone en mode plein écran.

## Version 1.1 — nouveau graphisme

- Thème sombre « verre dépoli » (palette bleu nuit / bleu ciel / ambre), polices Space Grotesk, Inter et JetBrains Mono.
- Icônes **Material Symbols** (Google) à la place de Font Awesome et des emojis ; icônes météo jour/nuit selon le code WMO.
- Nouveaux blocs alimentés par les données Open-Meteo déjà téléchargées :
  - bande « Heure par heure » (24 h, touchez une heure pour la sélectionner) ;
  - éphéméride solaire (lever, coucher, durée du jour, position du soleil sur l'arc) ;
  - nébulosité par étage (basse / moyenne / haute ; « n.d. » si le modèle ne la fournit pas) ;
  - rafales, ressenti, libellé UV, max UV du jour.
- Barre de navigation en bas d'écran sur mobile (Direct, Radar, Heures, Modèles, Marine/Ski).
- Fonds de carte : CARTO retiré (v1.1.1). Fond par défaut « OSM sombre » = tuiles OpenStreetMap officielles (`tile.openstreetmap.org`, sans clé) assombries par un filtre CSS. Autres fonds : OpenStreetMap standard, Plan IGN gris/couleur, OpenTopoMap, orthophotos IGN.
- Corrections :
  - pression affichée = pression réduite au niveau de la mer (`pressure_msl`), et non plus la pression en surface, qui est plus basse en altitude ; tendance calculée sur 3 h ;
  - passage en °F : les données sont toujours demandées en °C puis converties à l'affichage (avant, une double conversion était possible après un changement de lieu, et les graphiques restaient en °C) ;
  - point de rosée correct en °F.
- Éléments de la maquette **non repris** faute de source de données dans l'app : phase de lune, qualité de l'air (IQA), METAR, station Météo-France, photo de profil, imagerie satellite IR.

## Contrainte technique à connaître

Un service worker ne fonctionne que dans un **contexte sécurisé** :
- `https://…` ou
- `http://localhost` / `http://127.0.0.1` (machine locale uniquement).

Conséquences :
- Ouvrir `index.html` en double-cliquant (`file://…`) : l'app s'affiche mais **n'est pas une PWA**.
- Une adresse réseau local en HTTP (`http://192.168.x.x`) depuis un iPad/téléphone : **pas de PWA**.
- Pour installer sur iPhone/iPad/Android, il faut donc un **hébergement HTTPS**.

## 1. Tester sur l'ordinateur

Python 3 est préinstallé sur macOS et la plupart des Linux ; sous Windows : https://www.python.org/downloads/ (cocher « Add to PATH »).

```bash
cd chemin/vers/meteo-pwa
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000` dans Chrome ou Edge.

Vérification : outils de développement (F12) → onglet **Application** → *Manifest* (pas d'erreur) et *Service workers* (statut « activated and is running »).
Installation : bouton « Installer » dans l'en-tête ou icône d'installation dans la barre d'adresse.

Alternative Node.js (si installé) : `npx serve .`

## 2. Mettre en ligne en HTTPS (pour téléphone et tablette)

Trois options gratuites. Toutes servent les fichiers tels quels, sans compilation.

### Option A — Netlify Drop (le plus rapide, sans ligne de commande)
1. Aller sur https://app.netlify.com/drop
2. Glisser-déposer le **dossier** `meteo-pwa`.
3. Netlify donne une adresse `https://xxxx.netlify.app`. Créer un compte gratuit pour la conserver (sinon elle expire).

### Option B — GitHub Pages
1. Créer un dépôt public sur GitHub (ex. `meteo-pwa`).
2. Y déposer le contenu du dossier (`index.html` à la racine du dépôt).
3. *Settings* → *Pages* → *Source : Deploy from a branch* → branche `main`, dossier `/ (root)` → *Save*.
4. Adresse obtenue : `https://<utilisateur>.github.io/meteo-pwa/` (1 à 2 minutes de délai).

En ligne de commande :
```bash
cd meteo-pwa
git init && git add . && git commit -m "PWA météo"
git branch -M main
git remote add origin https://github.com/<utilisateur>/meteo-pwa.git
git push -u origin main
```

### Option C — Cloudflare Pages
*Workers & Pages* → *Create* → *Pages* → *Upload assets* → déposer le dossier.

Les chemins de l'app sont relatifs (`./`) : elle fonctionne aussi dans un sous-dossier (cas de GitHub Pages).

## 3. Installer sur les appareils

| Appareil | Navigateur | Procédure |
|---|---|---|
| iPhone / iPad | Safari (ou Chrome iOS 16.4+) | Bouton Partager → *Sur l'écran d'accueil* → *Ajouter* |
| Android | Chrome | Bouton « Installer » de l'app, ou menu ⋮ → *Installer l'application* |
| Windows / macOS / Linux | Chrome, Edge | Bouton « Installer » ou icône dans la barre d'adresse |
| macOS | Safari 17+ | Menu Fichier → *Ajouter au Dock* |

Firefox ordinateur ne propose pas l'installation de PWA (l'app y fonctionne normalement dans un onglet).

## 4. Publier une mise à jour

1. Modifier `index.html` (ou autre fichier).
2. Dans `sw.js`, incrémenter `const VERSION = 'v1.0.0';` → `'v1.0.1'`.
3. Redéployer (nouveau dépôt Netlify, `git push`, etc.).
4. Au lancement suivant, l'app affiche « Nouvelle version disponible » → *Mettre à jour*.

Sans changement de `VERSION`, l'ancienne version des fichiers peut rester servie depuis le cache.

## Limites

- Tuiles OpenStreetMap : service gratuit soumis à la politique d'usage de l'OSMF (https://operations.osmfoundation.org/policies/tiles/) — adapté à un usage personnel ; un usage intensif ou commercial impose un autre fournisseur ou un serveur de tuiles propre.

- **Première ouverture : réseau obligatoire** (téléchargement des bibliothèques, des polices, des icônes Material Symbols et des données). Sans la police d'icônes, les icônes s'affichent sous forme de mots (ex. « cloud ») ; une fois en cache, cela ne se produit plus.
- Hors ligne : seules les données et tuiles déjà consultées sont disponibles ; une nouvelle ville ou un nouveau modèle ne se charge pas.
- Les fonds **Plan IGN** sont des tuiles vectorielles chargées par MapLibre : leur mise en cache hors ligne est partielle. Les fonds OSM / OpenTopoMap / orthophotos IGN sont mis en cache normalement (uniquement les tuiles consultées, plafond 600).
- `cdn.tailwindcss.com` est la version « développement » de Tailwind (elle affiche un avertissement dans la console). Elle fonctionne, mais compile le CSS dans le navigateur à chaque lancement. Pour une version optimisée, il faudrait générer un fichier CSS avec Tailwind CLI — non fait ici pour garder l'app sans étape de compilation.
- Géolocalisation (« Me localiser ») : nécessite aussi HTTPS et l'autorisation de l'utilisateur.
- APIs utilisées gratuites et sans clé (Open-Meteo, RainViewer, Nominatim, IGN, OSM, OpenTopoMap) ; Open-Meteo gratuit = usage non commercial, avec quotas journaliers.
