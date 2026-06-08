# Impôts Reskin

Extension Chrome (Manifest V3, Plasmo + TypeScript) qui restyle localement l'espace professionnel **cfspro.impots.gouv.fr**.

- **Purement cosmétique** — aucune donnée n'est lue, capturée ou envoyée.
- **Local** — tout se passe dans le navigateur, aucune communication réseau.
- **Réversible** — un toggle via le popup de l'icône Chrome bascule entre design moderne et design d'origine. Quand OFF, l'extension ne laisse **aucune trace** dans le DOM.

> Le design est **original**, inspiré d'une esthétique "administratif respirable". Il n'utilise PAS le DSFR (Système de Design de l'État), qui est réservé aux sites en `.gouv.fr` officiels.

## Architecture

```
impots-reskin/
├── package.json              # deps Plasmo + override manifest
├── popup.tsx                 # popup React (toggle ON/OFF)
├── background.ts             # service worker minimal
├── contents/
│   └── cfspro-reskin.ts      # content script : injection, observer, bouton
└── styles/
    ├── cfspro-reskin.css     # design moderne, scopé sous html.ir-reskin-on
    └── toggle.css            # bouton flottant
```

### Flux d'état

La source de vérité est `chrome.storage.local.reskinEnabled` (booléen, défaut `true`). Le popup et le content script s'y synchronisent via `chrome.storage.onChanged` — pas de message direct.

- **ON** : le content script ajoute `<style id="ir-reskin-style">` à `<head>`, la classe `ir-reskin-on` sur `<html>`, et le bouton flottant `#ir-toggle-btn` dans `<body>`. Un MutationObserver veille à ce que ces 3 éléments restent en place si le site re-render.
- **OFF** : tout est retiré, l'observer est déconnecté. La page redevient strictement identique à l'originale.

## Installation (mode développeur)

```bash
pnpm install
pnpm dev
```

Puis dans Chrome :

1. Ouvrir `chrome://extensions`
2. Activer **Mode développeur** (coin haut droit)
3. Cliquer **Charger l'extension non empaquetée**
4. Sélectionner le dossier `build/chrome-mv3-dev`

Naviguer sur https://cfspro.impots.gouv.fr/ — le reskin s'applique automatiquement.

## Build de production

```bash
pnpm build
```

Output : `build/chrome-mv3-prod`.

## Vérifier que OFF = zéro trace

1. Cliquer sur l'icône de l'extension → toggle OFF.
2. Ouvrir DevTools → onglet Elements.
3. Vérifier que :
   - `<html>` n'a plus la classe `ir-reskin-on`
   - Il n'y a plus de `<style id="ir-reskin-style">`
   - Il n'y a plus de `#ir-toggle-btn`

Aucun pixel n'est ajouté quand l'extension est désactivée.

## Ce que l'extension ne fait PAS

- Ne lit jamais le contenu utilisateur (SIREN, nom, montants, etc.).
- Ne fait aucun appel réseau.
- Ne touche que le scope strict `https://cfspro.impots.gouv.fr/*`.
- Ne style PAS les conteneurs injectés par d'autres extensions (`browser-mcp-container`, `browserflow-container`, `#automa-palette`, etc.).
