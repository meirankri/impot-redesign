# Impôts Reskin

Extension Chrome qui modernise visuellement l'espace professionnel **cfspro.impots.gouv.fr**, localement et sans collecte de données.

---

## Télécharger

[**Télécharger l'extension (.zip)**](https://github.com/meirankri/impot-redesign/raw/main/impots-reskin.zip)

> Le `.zip` est régénéré automatiquement à chaque push sur `main` (via GitHub Actions) et contient directement le build prêt à l'emploi. Décompresse-le, le dossier obtenu est celui à charger dans Chrome.

---

## Ce que fait l'extension

L'extension remplace l'interface de l'espace professionnel (cfspro.impots.gouv.fr) par un design moderne, **côté client uniquement** :

- **Une nouvelle UI** : bandeau bleu institutionnel, hero avec ton nom et SIREN, cartes blanches avec tuiles à icônes regroupées par section (Consulter / Déclarer / Payer / Mon espace / Messagerie).
- **Les liens d'origine sont préservés** : chaque tuile relaie vers le vrai service du site (avec son `href` et son `onclick`), donc les sessions, formulaires et navigation continuent de fonctionner normalement.
- **Tes informations sont lues depuis la page** (nom, identifiant abonné, SIREN, raison sociale) — jamais en dur dans le code.
- **Un bouton flottant** en bas à droite permet de désactiver l'effet à tout moment.
- **Toggle ON/OFF** persistant via l'icône de l'extension dans la barre Chrome : quand OFF, la page revient à 100% à son apparence d'origine, **aucun pixel ajouté**.

### Ce qu'elle ne fait pas

- Aucun appel réseau, aucune télémétrie.
- Aucune donnée utilisateur (nom, SIREN, montants, etc.) n'est stockée ailleurs que dans la mémoire locale de l'onglet le temps de l'affichage.
- N'agit que sur `https://cfspro.impots.gouv.fr/*` — aucun autre site n'est affecté.
- N'utilise PAS le DSFR (Système de Design de l'État, réservé aux sites officiels `.gouv.fr`). Le design est original.

---

## Installer

### 1. Télécharger et décompresser

1. Clique sur le lien de téléchargement ci-dessus.
2. Décompresse `impots-reskin.zip` quelque part de stable (ex. `~/Extensions/impots-reskin/`). **Ne supprime pas ce dossier** après installation : Chrome charge l'extension depuis cet emplacement.

### 2. Charger dans Chrome (ou Edge)

1. Ouvre `chrome://extensions` dans Chrome (ou `edge://extensions` dans Edge).
2. Active **Mode développeur** (interrupteur en haut à droite).
3. Clique **Charger l'extension non empaquetée**.
4. Sélectionne le dossier décompressé (celui qui contient `manifest.json`).

### 3. Utiliser

1. Va sur https://cfspro.impots.gouv.fr/ et connecte-toi normalement.
2. L'interface modernisée s'applique automatiquement.
3. Pour désactiver : clique sur le bouton flottant en bas à droite, ou sur l'icône de l'extension dans la barre Chrome puis sur le toggle.
4. Pour réactiver : clique sur l'icône de l'extension → toggle ON.

---

## Build depuis les sources

Si tu veux modifier le code ou rebuilder toi-même :

```bash
pnpm install
pnpm build
```

Output : `build/chrome-mv3-prod/` — c'est ce dossier qu'il faut charger dans Chrome (étape 2 ci-dessus).

Pour itérer en hot reload pendant le dev :

```bash
pnpm dev
```

Et charger `build/chrome-mv3-dev/` à la place.
