/**
 * Caelex Scholar — legal-page CHROME namespace (`legal`).
 *
 * Strings for the chrome that <LegalDoc /> wraps around every legal document:
 * the prominent DRAFT banner and the "Stand / Last updated" meta label. These
 * are localised across all 5 Scholar UI locales.
 *
 * IMPORTANT scope split:
 *   • This namespace = page CHROME only (banner + meta label + a11y names).
 *   • The legal-document BODIES (privacy/terms/…) are DE (binding) + EN
 *     (convenience) and live in the legal route's `_content/*` files — NOT here.
 *
 * The draft banner intentionally states BOTH that the German edition is binding
 * AND that the text is a draft pending counsel review, regardless of UI locale,
 * because that disclaimer is legally load-bearing.
 *
 * Resolve with: t(locale, LEGAL, "key").
 */
import type { ScholarNamespace } from "./core";

export const LEGAL = {
  en: {
    /** a11y name for the draft-notice landmark. */
    draftBannerLabel: "Important notice",
    /** Boxed draft notice (mandatory on every legal page). */
    draftBanner:
      "DRAFT — template; must be reviewed and adapted by qualified legal counsel before publication or execution. Not legal advice. The German edition is the binding version; this English text is a convenience translation.",
    /** Meta label preceding the document's last-updated value. */
    lastUpdatedLabel: "Last updated",
    /** Meta label preceding the version value. */
    versionLabel: "Version",
  },
  de: {
    draftBannerLabel: "Wichtiger Hinweis",
    draftBanner:
      "ENTWURF — Vorlage; vor Veröffentlichung bzw. Unterzeichnung durch qualifizierte Rechtsberatung zu prüfen und anzupassen. Keine Rechtsberatung. Die deutsche Fassung ist verbindlich; diese englische Übersetzung dient nur der Information.",
    lastUpdatedLabel: "Stand",
    versionLabel: "Version",
  },
  it: {
    draftBannerLabel: "Avviso importante",
    draftBanner:
      "BOZZA — modello; da verificare e adattare da parte di un consulente legale qualificato prima della pubblicazione o della firma. Non è consulenza legale. La versione tedesca è vincolante; questo testo è una traduzione di cortesia.",
    lastUpdatedLabel: "Aggiornato il",
    versionLabel: "Versione",
  },
  fr: {
    draftBannerLabel: "Avis important",
    draftBanner:
      "PROJET — modèle ; à vérifier et adapter par un conseil juridique qualifié avant publication ou signature. Ne constitue pas un avis juridique. La version allemande fait foi ; ce texte est une traduction de courtoisie.",
    lastUpdatedLabel: "Dernière mise à jour",
    versionLabel: "Version",
  },
  es: {
    draftBannerLabel: "Aviso importante",
    draftBanner:
      "BORRADOR — plantilla; debe ser revisada y adaptada por asesoría jurídica cualificada antes de su publicación o firma. No es asesoramiento jurídico. La versión alemana es la vinculante; este texto es una traducción de cortesía.",
    lastUpdatedLabel: "Última actualización",
    versionLabel: "Versión",
  },
} as const satisfies ScholarNamespace;
