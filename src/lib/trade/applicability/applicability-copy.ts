/**
 * Caelex Trade — Applicability obligation copy (pure data, German).
 *
 * Novice-readable "Was bedeutet das / was musst du tun?" blurbs, keyed by
 * the `copyKey` each regime verdict carries from `assess-applicability.ts`.
 * Imported by the result UI (renders the obligations + Astra deep-link) and
 * available to the seed path — NO logic, NO I/O.
 *
 * Honesty: every blurb is framed as a first orientation, points at the
 * relevant in-app surface so the obligation is ACTIONABLE, and pairs the
 * `PER_VERDICT_DISCLAIMER` reminder under each verdict (R4/R5). The copy
 * never promises a "you're fine" — it only ever describes what to check.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface ObligationCopy {
  /** Human regime name shown as the verdict-card title. */
  title: string;
  /** One novice paragraph: what this regime means for you, in plain German. */
  whatItMeans: string;
  /** Actionable first steps, each pointing at an in-app surface. */
  firstSteps: string[];
  /** The most-relevant in-app surface to act on this regime. */
  surfaceHref: string;
  /** Prefill text for the `/trade/astra?prefill=` deep-link (R: escape hatch). */
  astraPrefill: string;
}

/**
 * Per-verdict reminder line rendered under every regime card (R4). Mirrors
 * the standalone disclaimer banner but compact, so over-trust is hard even
 * when a card is read in isolation.
 */
export const PER_VERDICT_DISCLAIMER =
  "Vorläufige Orientierung — keine Rechtsberatung. Im Zweifel fachlich bestätigen.";

export const APPLICABILITY_COPY: Record<string, ObligationCopy> = {
  eu_dual_use: {
    title: "EU-Dual-Use-Verordnung (EU) 2021/821",
    whatItMeans:
      "Das ist für die meisten EU-Unternehmen das Grundregime. Eure Güter, Software und Technologie müssen gegen Anhang I der Verordnung geprüft (klassifiziert) werden. Steht etwas auf der Liste, braucht ihr für die Ausfuhr aus der EU eine Genehmigung — und auch ungelistete Güter können über die „Catch-all“-Klausel erfasst sein.",
    firstSteps: [
      "Artikel anlegen, die ihr liefert oder übermittelt",
      "Artikel gegen Anhang I klassifizieren",
      "Bei Treffern: Genehmigungsbedarf je Ziel-Land prüfen",
    ],
    surfaceHref: "/trade/classify",
    astraPrefill:
      "Die EU-Dual-Use-VO betrifft uns — was muss ich als kleines Raumfahrt-Unternehmen zuerst tun?",
  },
  de_national: {
    title: "Deutsches Außenwirtschaftsrecht (AWG/AWV, BAFA)",
    whatItMeans:
      "Als in Deutschland ansässiges Unternehmen gilt zusätzlich zum EU-Recht das nationale Außenwirtschaftsrecht. Teil I Abschnitt A der Ausfuhrliste enthält rein nationale Kontrollen, die über die EU-Liste hinausgehen. Eure zuständige Behörde ist die BAFA — dort beantragt ihr Genehmigungen und Auskünfte.",
    firstSteps: [
      "BAFA als zuständige Behörde im Programm hinterlegen",
      "Artikel auch gegen die nationale Ausfuhrliste (Teil I A) prüfen",
      "Bei Unsicherheit: Güterlistenauskunft bei der BAFA erwägen",
    ],
    surfaceHref: "/trade/classify",
    astraPrefill:
      "Wir sind in Deutschland ansässig — was bedeutet AWG/AWV und die BAFA konkret für uns?",
  },
  us_ear: {
    title: "US Export Administration Regulations (EAR, BIS)",
    whatItMeans:
      "Die US-EAR können selbst für ein deutsches Unternehmen gelten, sobald US-Ursprung im Spiel ist — etwa US-Teile, -Software oder -Technologie in eurem Produkt. Ob ihr betroffen seid, hängt von einer De-minimis-Prüfung (US-Anteil am Wert) und ggf. der Foreign-Direct-Product-Rule ab. Zuständig ist das US-BIS.",
    firstSteps: [
      "US-Ursprungsanteil je Artikel ermitteln (Stückliste prüfen)",
      "De-minimis-/FDPR-Relevanz je Artikel einschätzen",
      "Bei US-Bezug: Re-Export-Regeln für eure Ziel-Länder prüfen",
    ],
    surfaceHref: "/trade/classify",
    astraPrefill:
      "In unserem Produkt steckt US-Ursprung — wie finde ich heraus, ob die US-EAR uns betrifft?",
  },
  us_itar: {
    title: "US International Traffic in Arms Regulations (ITAR, DDTC)",
    whatItMeans:
      "ITAR ist US-Recht für Verteidigungs- und Militärgüter (USML) und gilt extraterritorial — mit hohen Strafen. Relevant wird es bei militärischem Bezug zusammen mit einem US-Nexus (US-Personen, US-Technologie oder US-Ursprung). Das ist ein Thema für qualifizierte Fachberatung, nicht für ein Self-Service-Tool allein.",
    firstSteps: [
      "Militärischen/Verteidigungs-Bezug eurer Produkte ehrlich bewerten",
      "US-Personen-, US-Technologie- und US-Ursprungs-Bezug klären",
      "Bei jedem Verdacht: spezialisierte ITAR-Beratung einholen",
    ],
    surfaceHref: "/trade/deemed-exports",
    astraPrefill:
      "ITAR könnte uns betreffen — was muss ich als deutsches Raumfahrt-Startup zuerst klären?",
  },
  mtcr: {
    title: "Missile Technology Control Regime (MTCR)",
    whatItMeans:
      "Das MTCR ist ein multilaterales Regime für Trägertechnik und unbemannte Systeme. Seine Kontrollen sind bereits in die EU-/nationalen Listen eingearbeitet — relevant wird es vor allem bei Antrieb/Trägertechnik (Kategorie I trägt eine starke Ablehnungsvermutung) und bei kompletten Satelliten oder bestimmten Nutzlasten.",
    firstSteps: [
      "Antriebs-/Träger-Komponenten gesondert kennzeichnen",
      "Komplette Satelliten/Nutzlasten auf MTCR-Bezug prüfen",
      "Bei Kategorie-I-Verdacht: früh fachlich klären",
    ],
    surfaceHref: "/trade/classify",
    astraPrefill:
      "Wir arbeiten an Antriebs-/Trägertechnik — was bedeutet das MTCR für unsere Ausfuhren?",
  },
  wassenaar: {
    title: "Wassenaar-Arrangement (Dual-Use- & Munitions-Basislinie)",
    whatItMeans:
      "Das Wassenaar-Arrangement ist die Basislinie für viele Dual-Use-Kontrollen. Ihr beantragt nichts direkt „bei Wassenaar“ — seine Listen sind bereits in die EU-Dual-Use-VO und die nationale Ausfuhrliste übernommen. Relevant ist es also genau dann, wenn euer konkretes Gut dort gelistet ist; das klärt die Klassifizierung.",
    firstSteps: [
      "Artikel klassifizieren — Wassenaar zeigt sich über die EU-/nationale Liste",
      "Auf Listungen in Anhang I / Ausfuhrliste achten",
    ],
    surfaceHref: "/trade/classify",
    astraPrefill:
      "Was hat das Wassenaar-Arrangement mit der EU-Dual-Use-Liste zu tun und was muss ich tun?",
  },
};
