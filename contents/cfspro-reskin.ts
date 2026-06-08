import type { PlasmoCSConfig } from "plasmo"

/**
 * Reskin de cfspro.impots.gouv.fr — approche destructive :
 * on remplace le <body> par une UI custom qui réutilise les VRAIS liens
 * de la page (avec leur href/onclick d'origine). Au toggle OFF, on
 * restaure le <body> original (snapshot pris avant la première mutation).
 *
 * Aucune donnée n'est envoyée ailleurs. Tout est local.
 */
export const config: PlasmoCSConfig = {
  matches: ["https://cfspro.impots.gouv.fr/*"],
  run_at: "document_idle",
  all_frames: false
}

/* -------------------------------------------------------------------------- */
/* Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "reskinEnabled"
const STYLE_ID = "ir-reskin-style"
const TOGGLE_BTN_ID = "ir-toggle-btn"
const ROOT_CLASS = "ir-reskin-on"

/* -------------------------------------------------------------------------- */
/* État local                                                                 */
/* -------------------------------------------------------------------------- */

interface MenuItem {
  label: string
  el: HTMLAnchorElement | null
}

let originalBodyHTML: string | null = null
let originalTitle: string | null = null

/* -------------------------------------------------------------------------- */
/* Scraping des liens et de l'identité utilisateur                            */
/* -------------------------------------------------------------------------- */

function getAllAnchors(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

/**
 * Cherche le premier <a> dont le texte commence par `prefix` (insensible à la casse).
 */
function findAnchor(
  anchors: HTMLAnchorElement[],
  prefix: string
): HTMLAnchorElement | null {
  const needle = prefix.toLowerCase()
  return (
    anchors.find((a) =>
      normalizeText(a.textContent ?? "").toLowerCase().startsWith(needle)
    ) ?? null
  )
}

/**
 * Cherche TOUS les <a> dont le texte commence par `prefix`.
 * (Sur cfspro, "TVA" apparaît à la fois sous Déclarer et sous Payer.)
 */
function findAllAnchors(
  anchors: HTMLAnchorElement[],
  prefix: string
): HTMLAnchorElement[] {
  return anchors.filter((a) =>
    normalizeText(a.textContent ?? "").startsWith(prefix)
  )
}

interface UserIdentity {
  /** Nom affiché ("M MEIR ANKRI"). */
  fullName: string
  /** Identifiant abonné (ex. "20161530066565"), s'il est trouvé. */
  subscriberId: string
  /** Nom du dossier courant (raison sociale). */
  dossierName: string
  /** SIREN du dossier courant (format "XXX XXX XXX"). */
  siren: string
  /** Initiales pour l'avatar. */
  initials: string
}

/**
 * Extrait l'identité depuis le DOM du site. Tous les sélecteurs sont permissifs :
 * si un élément manque, on retombe sur une valeur vide plutôt que de planter.
 */
function scrapeIdentity(): UserIdentity {
  // Bloc identité utilisateur en colonne gauche
  const monCpte = document.querySelector<HTMLElement>("#mon_cpte")
  const monCpteText = normalizeText(monCpte?.textContent ?? "")

  // On cherche un motif "M(me) NOM PRÉNOM" dans le bloc identité.
  // Sur la page, le nom apparaît en haut de #mon_cpte.
  let fullName = ""
  if (monCpte) {
    // Le nom est souvent dans le premier élément de texte significatif.
    const candidates = Array.from(monCpte.querySelectorAll<HTMLElement>("*"))
      .map((el) => normalizeText(el.textContent ?? ""))
      .filter((t) => /^M(me)?\.?\s+\S/i.test(t) && t.length < 80)
    fullName = candidates[0] ?? ""
  }

  // Fallback : regex globale sur le texte du bloc.
  if (!fullName && monCpteText) {
    const m = monCpteText.match(/M(?:me)?\.?\s+[A-ZÀ-Ý][A-ZÀ-Ý\s\-']{2,60}/)
    fullName = m ? m[0] : ""
  }

  // Identifiant abonné (chaîne de chiffres ≥ 10)
  const subMatch = monCpteText.match(/\b\d{10,}\b/)
  const subscriberId = subMatch ? subMatch[0] : ""

  // Dossier courant — SIREN + raison sociale
  const dossier = document.querySelector<HTMLElement>("#dossier_courant3")
  const dossierText = normalizeText(dossier?.textContent ?? "")

  const sirenMatch = dossierText.match(/\b\d{3}\s?\d{3}\s?\d{3}\b/)
  const siren = sirenMatch ? sirenMatch[0].replace(/\s+/g, " ") : ""

  // Raison sociale : on enlève le SIREN et les libellés connus du texte.
  let dossierName = dossierText
    .replace(/SIREN/gi, "")
    .replace(/Dossier\s+courant/gi, "")
    .replace(/\b\d{3}\s?\d{3}\s?\d{3}\b/, "")
    .replace(/[·•|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (dossierName.length > 80) dossierName = dossierName.slice(0, 80) + "…"

  // Initiales pour l'avatar — basées sur fullName ou dossierName.
  const initialsSource = fullName || dossierName || "??"
  const initialsParts = initialsSource
    .replace(/^M(me)?\.?\s+/i, "")
    .split(/\s+/)
    .filter((p) => /^[A-ZÀ-Ý]/i.test(p))
    .slice(0, 2)
  const initials =
    initialsParts.length > 0
      ? initialsParts.map((p) => p[0].toUpperCase()).join("")
      : "?"

  return { fullName, subscriberId, dossierName, siren, initials }
}

/* -------------------------------------------------------------------------- */
/* Icônes SVG                                                                 */
/* -------------------------------------------------------------------------- */

const ic = {
  consult:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
  pay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.61.79 1 1.41 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-6 9 6"/><path d="M4 10v9M20 10v9M8 14v3M12 14v3M16 14v3M3 21h18"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
  at: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>'
}

function iconFor(label: string): string {
  const l = label.toLowerCase()
  if (l.includes("compte fiscal") || l.includes("avis")) return ic.consult
  if (l.includes("comptes banc")) return ic.bank
  if (l.includes("contrats")) return ic.pay
  if (l.includes("gérer les services")) return ic.gear
  if (l.includes("calendrier")) return ic.cal
  if (l.includes("gestionnaire")) return ic.user
  if (l === "messagerie") return ic.mail
  if (l.includes("adresse")) return ic.at
  if (
    l.includes("tva") ||
    l.includes("contributions") ||
    l.includes("prélèv") ||
    l.includes("cfe") ||
    l.includes("dette")
  )
    return ic.pay
  return ic.doc
}

/* -------------------------------------------------------------------------- */
/* Construction du menu à partir des liens de la page                         */
/* -------------------------------------------------------------------------- */

interface MenuSections {
  consulter: MenuItem[]
  declarer: MenuItem[]
  payer: MenuItem[]
  espace: MenuItem[]
  autres: MenuItem[]
  messagerie: MenuItem[]
}

function buildMenu(): { menu: MenuSections; deconnexion: HTMLAnchorElement | null } {
  const anchors = getAllAnchors()
  const tvaLinks = findAllAnchors(anchors, "TVA")

  const menu: MenuSections = {
    consulter: [
      { label: "Compte fiscal", el: findAnchor(anchors, "Compte fiscal") },
      { label: "Avis CFE", el: findAnchor(anchors, "Avis CFE") }
    ],
    declarer: [{ label: "TVA", el: tvaLinks[0] ?? null }],
    payer: [
      { label: "TVA", el: tvaLinks[1] ?? null },
      {
        label: "Contributions indirectes",
        el: findAnchor(anchors, "Contributions indirectes")
      },
      {
        label: "Prélèvement à la source",
        el: findAnchor(anchors, "Prélèvement à la source")
      },
      { label: "CFE et autres impôts", el: findAnchor(anchors, "CFE et autres") },
      { label: "Dette fiscale", el: findAnchor(anchors, "Dette fiscale") }
    ],
    espace: [
      { label: "Gérer les services", el: findAnchor(anchors, "Gérer les services") },
      {
        label: "Comptes bancaires",
        el: findAnchor(anchors, "Gérer les comptes bancaires")
      },
      {
        label: "Contrats de prélèvement",
        el: findAnchor(anchors, "Gérer les contrats")
      }
    ],
    autres: [
      { label: "Calendrier fiscal", el: findAnchor(anchors, "Calendrier fiscal") },
      {
        label: "Gestionnaire & RDV",
        el: findAnchor(anchors, "Coordonnées du gestionnaire")
      }
    ],
    messagerie: [
      { label: "Messagerie", el: findAnchor(anchors, "Messagerie") },
      {
        label: "Adresse électronique de l'entreprise",
        el: findAnchor(anchors, "Adresse électronique")
      }
    ]
  }

  const deconnexion = findAnchor(anchors, "Me déconnecter")

  return { menu, deconnexion }
}

/**
 * Active le lien d'origine : déclenche son `onclick` ou redirige sur son `href`.
 * On préserve ainsi le comportement applicatif du site (sessions, formulaires).
 */
function activate(el: HTMLAnchorElement | null): () => void {
  return (): void => {
    if (!el) return
    const onclick = el.getAttribute("onclick")
    if (onclick) {
      try {
        const fn = el.onclick
        if (fn) fn.call(el, new MouseEvent("click"))
      } catch {
        /* ignore */
      }
    }
    if (el.href && !el.href.endsWith("#")) {
      window.location.href = el.href
    } else {
      el.click()
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Rendu HTML                                                                 */
/* -------------------------------------------------------------------------- */

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function tile(item: MenuItem): string {
  const label = escapeHTML(item.label)
  return `<div class="rd-tile" data-go="${label}"><span class="tic">${iconFor(item.label)}</span><span class="tlabel">${label}</span></div>`
}

function tiles(arr: MenuItem[]): string {
  return arr
    .filter((i) => i.el)
    .map(tile)
    .join("")
}

function renderHTML(menu: MenuSections, identity: UserIdentity): string {
  const nameLine = identity.fullName
    ? `<b>${escapeHTML(identity.fullName)}</b>`
    : `<b>Espace professionnel</b>`
  const subLine = identity.subscriberId
    ? `<span>Abonné ${escapeHTML(identity.subscriberId)}</span>`
    : `<span>impots.gouv.fr</span>`

  const heroName = identity.dossierName
    ? escapeHTML(identity.dossierName)
    : identity.fullName
      ? escapeHTML(identity.fullName)
      : "Espace professionnel"
  const heroSiren = identity.siren
    ? `SIREN ${escapeHTML(identity.siren)} · Dossier courant`
    : "Dossier courant"

  return `
    <div class="rd-top">
      <div class="brand">impots.gouv.fr<small>ESPACE PROFESSIONNEL</small></div>
      <div class="user">
        <div class="uname">${nameLine}${subLine}</div>
        <button class="rd-logout" id="rd-logout" type="button">Me déconnecter</button>
      </div>
    </div>
    <div class="rd-nav">
      <a data-nav="espace">Mon espace</a>
      <a data-nav="consulter">Consulter</a>
      <a data-nav="declarer">Déclarer</a>
      <a data-nav="payer">Payer</a>
      <a data-nav="messagerie">Messagerie</a>
    </div>
    <div id="rd-wrap">
      <div class="rd-hero">
        <div class="avatar">${escapeHTML(identity.initials)}</div>
        <div><h1>${heroName}</h1><div class="siren">${heroSiren}</div></div>
      </div>
      <div class="rd-grid">
        <div class="rd-col">
          <div class="rd-card" id="sec-fisc">
            <h2><span class="h2ic">${ic.pay}</span>Mes opérations fiscales</h2>
            <p class="sub">Consulter, déclarer et payer vos impôts</p>
            <div class="rd-tilewrap">
              <div class="rd-seclabel" id="sec-consulter">Consulter</div>${tiles(menu.consulter)}
              <div class="rd-seclabel" id="sec-declarer">Déclarer</div>${tiles(menu.declarer)}
              <div class="rd-seclabel" id="sec-payer">Payer</div>${tiles(menu.payer)}
            </div>
          </div>
        </div>
        <div class="rd-col">
          <div class="rd-card" id="sec-espace">
            <h2><span class="h2ic">${ic.gear}</span>Mon espace</h2>
            <div class="rd-list">${tiles(menu.espace)}</div>
          </div>
          <div class="rd-card">
            <h2><span class="h2ic">${ic.cal}</span>Autres services</h2>
            <div class="rd-list">${tiles(menu.autres)}</div>
          </div>
          <div class="rd-card" id="sec-messagerie">
            <h2><span class="h2ic">${ic.mail}</span>Messagerie</h2>
            <div class="rd-list">${tiles(menu.messagerie)}</div>
          </div>
        </div>
      </div>
      <div class="rd-footer">Interface redessinée localement · liens d'origine préservés</div>
    </div>`
}

/* -------------------------------------------------------------------------- */
/* Bouton flottant                                                            */
/* -------------------------------------------------------------------------- */

function injectToggleButton(): void {
  if (document.getElementById(TOGGLE_BTN_ID)) return
  const btn = document.createElement("button")
  btn.id = TOGGLE_BTN_ID
  btn.type = "button"
  btn.setAttribute("aria-label", "Désactiver le design moderne")
  btn.textContent = "Design moderne ON"
  btn.addEventListener("click", () => {
    void chrome.storage.local.set({ [STORAGE_KEY]: false })
  })
  document.body.appendChild(btn)
}

/* -------------------------------------------------------------------------- */
/* Apply / Remove                                                             */
/* -------------------------------------------------------------------------- */

function applyReskin(): void {
  if (document.documentElement.classList.contains(ROOT_CLASS)) return

  // Snapshot du body et du title pour pouvoir restaurer au toggle OFF.
  if (originalBodyHTML === null) {
    originalBodyHTML = document.body.innerHTML
    originalTitle = document.title
  }

  const { menu, deconnexion } = buildMenu()
  const identity = scrapeIdentity()

  // Injection du style scopé sous html.ir-reskin-on.
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement("style")
    styleEl.id = STYLE_ID
    styleEl.textContent = RESKIN_CSS
    document.head.appendChild(styleEl)
  }

  document.documentElement.classList.add(ROOT_CLASS)
  document.body.innerHTML = renderHTML(menu, identity)

  // Câblage des tuiles : chaque clic relaie vers le vrai lien d'origine.
  const allItems: MenuItem[] = [
    ...menu.consulter,
    ...menu.declarer,
    ...menu.payer,
    ...menu.espace,
    ...menu.autres,
    ...menu.messagerie
  ]
  document.querySelectorAll<HTMLElement>(".rd-tile").forEach((node) => {
    const label = node.getAttribute("data-go")
    const match = allItems.find((i) => i.label === label)
    if (match) node.addEventListener("click", activate(match.el))
  })

  // Navigation horizontale : scroll vers les sections.
  document.querySelectorAll<HTMLElement>(".rd-nav a").forEach((a) => {
    a.addEventListener("click", () => {
      const targetId = "sec-" + (a.getAttribute("data-nav") ?? "")
      const target = document.getElementById(targetId)
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  })

  // Déconnexion.
  const logoutBtn = document.getElementById("rd-logout")
  if (logoutBtn && deconnexion) {
    logoutBtn.addEventListener("click", activate(deconnexion))
  }

  injectToggleButton()
}

function removeReskin(): void {
  if (!document.documentElement.classList.contains(ROOT_CLASS)) return

  if (originalBodyHTML !== null) {
    document.body.innerHTML = originalBodyHTML
    if (originalTitle !== null) document.title = originalTitle
  }

  document.documentElement.classList.remove(ROOT_CLASS)
  document.getElementById(STYLE_ID)?.remove()
  document.getElementById(TOGGLE_BTN_ID)?.remove()
}

/* -------------------------------------------------------------------------- */
/* Initialisation + synchronisation storage                                   */
/* -------------------------------------------------------------------------- */

async function initialize(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const enabled = stored[STORAGE_KEY] !== false
  if (enabled) applyReskin()
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return
  const change = changes[STORAGE_KEY]
  if (!change) return
  if (change.newValue === false) removeReskin()
  else applyReskin()
})

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void initialize(), {
    once: true
  })
} else {
  void initialize()
}

/* -------------------------------------------------------------------------- */
/* CSS du reskin                                                              */
/* -------------------------------------------------------------------------- */

const RESKIN_CSS = `
html.ir-reskin-on, html.ir-reskin-on body {
  margin: 0;
  padding: 0;
  background: #eef1f6;
  color: #161616;
  font-family: 'Marianne', 'Segoe UI', system-ui, -apple-system, sans-serif;
}
html.ir-reskin-on * { box-sizing: border-box; }
html.ir-reskin-on a { text-decoration: none; color: inherit; }

html.ir-reskin-on .rd-top {
  background: #000091;
  color: #fff;
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 20;
}
html.ir-reskin-on .rd-top .brand {
  font-weight: 800;
  font-size: 19px;
  letter-spacing: .2px;
}
html.ir-reskin-on .rd-top .brand small {
  display: block;
  font-weight: 400;
  font-size: 11.5px;
  opacity: .8;
  letter-spacing: .5px;
}
html.ir-reskin-on .rd-top .user {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 13.5px;
}
html.ir-reskin-on .rd-top .user .uname {
  display: flex;
  flex-direction: column;
  text-align: right;
  line-height: 1.3;
}
html.ir-reskin-on .rd-top .user .uname b { font-weight: 600; }
html.ir-reskin-on .rd-top .user .uname span { opacity: .75; font-size: 11.5px; }

html.ir-reskin-on .rd-logout {
  background: rgba(255, 255, 255, .12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, .4);
  border-radius: 8px;
  padding: 9px 16px;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
  transition: .15s;
}
html.ir-reskin-on .rd-logout:hover {
  background: #fff;
  color: #000091;
}

html.ir-reskin-on .rd-nav {
  background: #1212a3;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 32px;
  position: sticky;
  top: 64px;
  z-index: 19;
}
html.ir-reskin-on .rd-nav a {
  color: #dfe1ff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  letter-spacing: .4px;
  cursor: pointer;
  transition: .15s;
}
html.ir-reskin-on .rd-nav a:hover {
  background: rgba(255, 255, 255, .14);
  color: #fff;
}

html.ir-reskin-on #rd-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 32px 64px;
}

html.ir-reskin-on .rd-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  background: linear-gradient(120deg, #000091, #2a2ad4);
  color: #fff;
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 22px;
  box-shadow: 0 6px 20px rgba(0, 0, 145, .18);
}
html.ir-reskin-on .rd-hero .avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
  color: #fff;
}
html.ir-reskin-on .rd-hero h1 {
  margin: 0 0 3px;
  font-size: 21px;
  color: #fff;
}
html.ir-reskin-on .rd-hero .siren {
  font-size: 13.5px;
  color: #fff;
  opacity: .9;
}

html.ir-reskin-on .rd-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 22px;
  align-items: start;
}
html.ir-reskin-on .rd-col {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
html.ir-reskin-on .rd-card {
  background: #fff;
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .05);
}
html.ir-reskin-on .rd-card h2 {
  margin: 0 0 4px;
  font-size: 15px;
  color: #161616;
  display: flex;
  align-items: center;
  gap: 9px;
}
html.ir-reskin-on .rd-card h2 .h2ic {
  width: 20px;
  height: 20px;
  color: #000091;
}
html.ir-reskin-on .rd-card h2 .h2ic svg { width: 100%; height: 100%; }
html.ir-reskin-on .rd-card .sub {
  font-size: 12.5px;
  color: #888;
  margin: 0 0 14px;
}

html.ir-reskin-on .rd-tilewrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
html.ir-reskin-on .rd-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid #eceef4;
  border-radius: 11px;
  cursor: pointer;
  transition: .14s;
  background: #fff;
}
html.ir-reskin-on .rd-tile:hover {
  border-color: #000091;
  background: #f5f6ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 145, .08);
}
html.ir-reskin-on .rd-tile .tic {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #eef0ff;
  color: #000091;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
html.ir-reskin-on .rd-tile .tic svg { width: 18px; height: 18px; }
html.ir-reskin-on .rd-tile .tlabel {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
}

html.ir-reskin-on .rd-seclabel {
  grid-column: 1 / -1;
  font-size: 11.5px;
  font-weight: 700;
  color: #9095a8;
  text-transform: uppercase;
  letter-spacing: .7px;
  margin: 8px 0 -2px;
}
html.ir-reskin-on .rd-seclabel:first-child { margin-top: 0; }

html.ir-reskin-on .rd-list .rd-tile {
  border: none;
  border-radius: 9px;
  padding: 11px 12px;
}
html.ir-reskin-on .rd-list .rd-tile:hover {
  background: #f5f6ff;
  transform: none;
  box-shadow: none;
}

html.ir-reskin-on .rd-footer {
  text-align: center;
  color: #a3a8b8;
  font-size: 12px;
  margin-top: 36px;
}

@media (max-width: 880px) {
  html.ir-reskin-on .rd-grid { grid-template-columns: 1fr; }
  html.ir-reskin-on .rd-tilewrap { grid-template-columns: 1fr; }
  html.ir-reskin-on .rd-nav { overflow-x: auto; }
}

/* Bouton flottant pour désactiver à la volée */
html.ir-reskin-on #ir-toggle-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  background: #000091;
  color: #fff;
  padding: 12px 20px;
  border: none;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 145, .35);
  font-family: 'Marianne', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 150ms ease, transform 150ms ease;
}
html.ir-reskin-on #ir-toggle-btn::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, .3);
}
html.ir-reskin-on #ir-toggle-btn:hover {
  background: #1212a3;
  transform: translateY(-2px);
}
`
