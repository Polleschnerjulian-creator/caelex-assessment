/**
 * Caelex Scholar — sidebar navigation namespace (`nav`).
 *
 * Labels + a11y strings for the ScholarShell sidebar. EN is the source of
 * truth; `de` values are the strings previously hardcoded in ScholarShell.tsx.
 *
 * Resolve with: t(locale, NAV, "key")
 *
 * NOTE: shared terms (Settings, Sign out) also exist in `common`; the nav keeps
 * its own copies here so the sidebar reads as one self-contained dictionary —
 * the values are identical to COMMON.settings / COMMON.signOut.
 */
import type { ScholarNamespace } from "./core";

export const NAV = {
  en: {
    // Main nav items
    search: "Search",
    jurisdictions: "Jurisdictions",
    library: "Library",
    caseLaw: "Case law",
    watchlist: "Watchlist",
    // Bottom items
    settings: "Settings",
    signOut: "Sign out",
    // Chrome / a11y
    sidebarNav: "Sidebar navigation",
    poweredByAtlas: "powered by Atlas",
    logoAlt: "Caelex Scholar",
  },
  de: {
    search: "Suche",
    jurisdictions: "Jurisdiktionen",
    library: "Bibliothek",
    caseLaw: "Rechtsprechung",
    watchlist: "Merkliste",
    settings: "Einstellungen",
    signOut: "Abmelden",
    sidebarNav: "Seitennavigation",
    poweredByAtlas: "powered by Atlas",
    logoAlt: "Caelex Scholar",
  },
  it: {
    search: "Ricerca",
    jurisdictions: "Giurisdizioni",
    library: "Biblioteca",
    caseLaw: "Giurisprudenza",
    watchlist: "Elenco salvati",
    settings: "Impostazioni",
    signOut: "Esci",
    sidebarNav: "Navigazione laterale",
    poweredByAtlas: "powered by Atlas",
    logoAlt: "Caelex Scholar",
  },
  fr: {
    search: "Recherche",
    jurisdictions: "Juridictions",
    library: "Bibliothèque",
    caseLaw: "Jurisprudence",
    watchlist: "Liste de suivi",
    settings: "Paramètres",
    signOut: "Se déconnecter",
    sidebarNav: "Navigation latérale",
    poweredByAtlas: "powered by Atlas",
    logoAlt: "Caelex Scholar",
  },
  es: {
    search: "Búsqueda",
    jurisdictions: "Jurisdicciones",
    library: "Biblioteca",
    caseLaw: "Jurisprudencia",
    watchlist: "Lista guardada",
    settings: "Ajustes",
    signOut: "Cerrar sesión",
    sidebarNav: "Navegación lateral",
    poweredByAtlas: "powered by Atlas",
    logoAlt: "Caelex Scholar",
  },
} as const satisfies ScholarNamespace;
