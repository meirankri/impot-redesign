import { useEffect, useState } from "react"

/**
 * Popup affiché au clic sur l'icône de l'extension dans la barre Chrome.
 * Permet d'activer/désactiver le reskin. La source de vérité est
 * `chrome.storage.local` — le content script s'y synchronise tout seul
 * via `chrome.storage.onChanged`.
 */

const STORAGE_KEY = "reskinEnabled"

function IndexPopup(): JSX.Element {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then((stored) => {
      setEnabled(stored[STORAGE_KEY] !== false)
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: chrome.storage.AreaName
    ): void => {
      if (areaName !== "local") return
      const change = changes[STORAGE_KEY]
      if (!change) return
      setEnabled(change.newValue !== false)
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const toggle = (): void => {
    const next = !(enabled ?? true)
    void chrome.storage.local.set({ [STORAGE_KEY]: next })
    setEnabled(next)
  }

  return (
    <div
      style={{
        width: 260,
        padding: 20,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1a1d29"
      }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        Impôts Reskin
      </div>
      <div style={{ fontSize: 12, color: "#5b6172", marginBottom: 16 }}>
        Design moderne sur cfspro.impots.gouv.fr
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={enabled === null}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: "none",
          cursor: enabled === null ? "wait" : "pointer",
          fontWeight: 600,
          fontSize: 14,
          background: enabled ? "#1452c7" : "#e4e7ee",
          color: enabled ? "#ffffff" : "#1a1d29",
          transition: "background 120ms ease"
        }}>
        {enabled === null
          ? "Chargement…"
          : enabled
            ? "Activé — cliquer pour désactiver"
            : "Désactivé — cliquer pour activer"}
      </button>

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "#5b6172",
          lineHeight: 1.5
        }}>
        Reskin local et cosmétique. Aucune donnée n'est collectée ni envoyée.
      </div>
    </div>
  )
}

export default IndexPopup
