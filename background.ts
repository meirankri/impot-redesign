/**
 * Background service worker.
 *
 * Volontairement minimal en v1 : la synchronisation popup ↔ content script
 * passe directement par `chrome.storage.onChanged`, donc le SW n'a rien à
 * relayer. Ce fichier existe pour réserver l'extension MV3 et permettre
 * d'ajouter facilement plus tard :
 *   - une commande clavier (chrome.commands.onCommand)
 *   - une icône d'action dynamique selon l'état
 */

export {}
