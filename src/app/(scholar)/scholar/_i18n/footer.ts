/**
 * Caelex Scholar — footer namespace (`footer`).
 *
 * Labels for the ScholarFooter legal-link row + the footer's two standing
 * notices (not-legal-advice line + the "powered by Atlas" credit).
 *
 * EN is the source of truth (defines the key space); de/it/fr/es follow.
 * Resolve with: t(locale, FOOTER, "key")  — see ScholarFooter.tsx (client comp,
 * reads the active locale via useScholarLocale()).
 *
 * Scope note: footer/legal LINK LABELS are localised across all 5 Scholar
 * locales here. The legal DOCUMENT BODIES themselves are DE (binding) + EN
 * (convenience) only and live in the legal route's content files — NOT here.
 *
 * Each label deliberately carries the German term alongside the local-language
 * term for the binding documents (e.g. "Datenschutz / Privacy") so the
 * legally-operative German name is always visible — matching the project's
 * DE-binding convention. The pure-German `de` locale shows the German term once.
 */
import type { ScholarNamespace } from "./core";

export const FOOTER = {
  en: {
    // ── Legal links (href targets are fixed in ScholarFooter) ──
    privacy: "Datenschutz / Privacy",
    terms: "Nutzungsbedingungen / Terms",
    acceptableUse: "Nutzungsrichtlinie / Acceptable Use",
    cookies: "Cookies",
    subProcessors: "Unterauftragsverarbeiter / Sub-processors",
    accessibility: "Barrierefreiheit / Accessibility",
    imprint: "Impressum / Imprint",
    // ── Standing notices ──
    legalLinksLabel: "Legal",
    notLegalAdvice: "Not legal advice — research aid.",
    poweredByAtlas: "powered by Atlas",
  },
  de: {
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    acceptableUse: "Nutzungsrichtlinie",
    cookies: "Cookies",
    subProcessors: "Unterauftragsverarbeiter",
    accessibility: "Barrierefreiheit",
    imprint: "Impressum",
    legalLinksLabel: "Rechtliches",
    notLegalAdvice: "Keine Rechtsberatung — Recherchehilfe.",
    poweredByAtlas: "powered by Atlas",
  },
  it: {
    privacy: "Datenschutz / Privacy",
    terms: "Nutzungsbedingungen / Termini",
    acceptableUse: "Nutzungsrichtlinie / Uso accettabile",
    cookies: "Cookie",
    subProcessors: "Unterauftragsverarbeiter / Sub-responsabili",
    accessibility: "Barrierefreiheit / Accessibilità",
    imprint: "Impressum / Note legali",
    legalLinksLabel: "Informazioni legali",
    notLegalAdvice: "Non è consulenza legale — strumento di ricerca.",
    poweredByAtlas: "powered by Atlas",
  },
  fr: {
    privacy: "Datenschutz / Confidentialité",
    terms: "Nutzungsbedingungen / Conditions",
    acceptableUse: "Nutzungsrichtlinie / Usage acceptable",
    cookies: "Cookies",
    subProcessors: "Unterauftragsverarbeiter / Sous-traitants",
    accessibility: "Barrierefreiheit / Accessibilité",
    imprint: "Impressum / Mentions légales",
    legalLinksLabel: "Mentions légales",
    notLegalAdvice: "Ne constitue pas un avis juridique — outil de recherche.",
    poweredByAtlas: "powered by Atlas",
  },
  es: {
    privacy: "Datenschutz / Privacidad",
    terms: "Nutzungsbedingungen / Términos",
    acceptableUse: "Nutzungsrichtlinie / Uso aceptable",
    cookies: "Cookies",
    subProcessors: "Unterauftragsverarbeiter / Subencargados",
    accessibility: "Barrierefreiheit / Accesibilidad",
    imprint: "Impressum / Aviso legal",
    legalLinksLabel: "Aviso legal",
    notLegalAdvice:
      "No es asesoramiento jurídico — herramienta de investigación.",
    poweredByAtlas: "powered by Atlas",
  },
} as const satisfies ScholarNamespace;
