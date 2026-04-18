import type { LegalDocument } from "@/lib/legal/types";

export const COOKIES_DE: LegalDocument = {
  lang: "de",
  title: "Cookie-Richtlinie",
  subtitle: "Informationen zu Cookies und ähnlichen Technologien",
  version: "Version 3.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Diese Richtlinie erklärt, welche Cookies und ähnliche Technologien (LocalStorage, SessionStorage, IndexedDB, Pixel) wir einsetzen, zu welchem Zweck, auf welcher Rechtsgrundlage und wie lange.",
    "Für nicht unbedingt erforderliche Cookies gilt § 25 Abs. 1 TTDSG: wir setzen sie nur mit Ihrer ausdrücklichen, informierten, vorab erteilten Einwilligung.",
    "Für den Datenschutz verweisen wir ergänzend auf die Datenschutzerklärung (/legal/privacy).",
  ],
  sections: [
    {
      id: "c1",
      number: "§ 1",
      title: "Was sind Cookies?",
      blocks: [
        {
          type: "p",
          text: "Cookies sind kleine Textdateien, die beim Besuch einer Website in Ihrem Browser gespeichert werden. Sie enthalten Informationen, die bei späteren Besuchen oder Interaktionen zurückgelesen werden können. Wir nutzen zusätzlich browser-gespeicherte Technologien wie LocalStorage (z.B. für Atlas-Bookmarks von Gästen) und SessionStorage (z.B. für Sitzungsdaten).",
        },
      ],
    },
    {
      id: "c2",
      number: "§ 2",
      title: "Kategorien und Rechtsgrundlage",
      blocks: [
        {
          type: "p",
          text: "(1) Unbedingt erforderlich (§ 25 Abs. 2 TTDSG, keine Einwilligung nötig): Cookies und LocalStorage-Einträge, ohne die die Plattform nicht funktioniert. Beispiele: Session-Token für die Anmeldung, CSRF-Schutz, Sprachpräferenz, MFA-Flow-Status, Atlas-Bookmarks von Gästen.",
        },
        {
          type: "p",
          text: "(2) Funktional (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TTDSG, Einwilligung): Cookies für optionale Komfortfunktionen wie UI-Präferenzen (Dark-Mode-Erinnerung jenseits des Notwendigen), Tabellen-Layouts, optionale Chat-Widgets.",
        },
        {
          type: "p",
          text: "(3) Analyse und Produktverbesserung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TTDSG, Einwilligung): soweit eingesetzt, ausschließlich datenschutzfreundliche Tools mit IP-Anonymisierung. Wir verzichten auf Tracking-Cookies von Google Analytics oder Facebook.",
        },
        {
          type: "p",
          text: "(4) Marketing: wir setzen keine Marketing-Cookies von Dritten (z.B. Facebook-Pixel, LinkedIn Insight Tag, Google Ads).",
        },
      ],
    },
    {
      id: "c3",
      number: "§ 3",
      title: "Liste der eingesetzten Cookies und Storage-Einträge",
      blocks: [
        {
          type: "callout",
          variant: "info",
          text: "Die folgende Liste wird fortlaufend gepflegt und spiegelt den Stand zum Versionsdatum. Änderungen werden mit der Version dokumentiert.",
        },
        { type: "p", text: "A. Unbedingt erforderlich:" },
        {
          type: "ul",
          items: [
            "authjs.session-token — Anmeldesitzung, HTTP-only, Secure, SameSite=Lax · Dauer: bis Abmeldung bzw. 30 Tage",
            "authjs.csrf-token — CSRF-Schutz, HTTP-only · Dauer: Session",
            "authjs.callback-url — Rücksprung nach OAuth-Login · Dauer: Session",
            "caelex.locale — Sprachpräferenz (de, en, fr, es) · Dauer: 1 Jahr",
            "atlas:bookmarks:v1 (LocalStorage) — Gast-Bookmarks in Atlas · Dauer: bis Löschung durch Nutzer",
            "consent.v1 — Cookie-Einwilligungsstatus · Dauer: 12 Monate",
          ],
        },
        { type: "p", text: "B. Funktional (nur mit Einwilligung):" },
        {
          type: "ul",
          items: [
            "caelex.ui-prefs — UI-Präferenzen, z.B. Tabellen-Layouts · Dauer: 6 Monate",
          ],
        },
        {
          type: "p",
          text: "C. Analyse (nur mit Einwilligung, soweit aktiviert): Vercel Web Analytics mit IP-Anonymisierung; keine Cookie-Setzung, rein server-seitige Aggregation. Keine Übermittlung an Dritte jenseits von Vercel Inc.",
        },
        {
          type: "p",
          text: "D. Drittanbieter: Stripe setzt für Checkout-Flows notwendige Cookies (z.B. __stripe_mid, __stripe_sid). Diese werden nur auf der Checkout-Seite gesetzt und unterliegen der Stripe-Datenschutzerklärung.",
        },
      ],
    },
    {
      id: "c4",
      number: "§ 4",
      title: "Einwilligung und Widerruf",
      blocks: [
        {
          type: "p",
          text: "(1) Beim ersten Besuch unserer Website zeigen wir ein Cookie-Banner an. Sie können alle nicht erforderlichen Cookies ablehnen, einzeln auswählen oder insgesamt akzeptieren.",
        },
        {
          type: "p",
          text: "(2) Sie können Ihre Einwilligung jederzeit über den Link „Cookie-Einstellungen“ im Footer oder über Ihre Browsereinstellungen widerrufen. Der Widerruf wirkt nur für die Zukunft.",
        },
        {
          type: "p",
          text: "(3) Einwilligungen werden lokal in Ihrem Browser protokolliert (Zeitpunkt, Version, Auswahl je Kategorie), ergänzt durch eine server-seitige Protokollierung bei eingeloggten Nutzern zur Nachweisbarkeit.",
        },
      ],
    },
    {
      id: "c5",
      number: "§ 5",
      title: "Browsereinstellungen",
      blocks: [
        {
          type: "p",
          text: "Sie können Cookies auch in Ihrem Browser verwalten (blockieren, löschen, Benachrichtigung bei Setzen). Beachten Sie, dass ohne unbedingt erforderliche Cookies Teile der Plattform nicht funktionieren.",
        },
        {
          type: "ul",
          items: [
            "Chrome: Einstellungen → Datenschutz und Sicherheit → Cookies und andere Websitedaten",
            "Firefox: Einstellungen → Datenschutz und Sicherheit → Cookies und Website-Daten",
            "Safari: Einstellungen → Datenschutz → Cookies und Website-Daten",
            "Edge: Einstellungen → Cookies und Websiteberechtigungen",
          ],
        },
      ],
    },
    {
      id: "c6",
      number: "§ 6",
      title: "Änderungen",
      blocks: [
        {
          type: "p",
          text: "Wir aktualisieren diese Richtlinie bei Änderungen an unseren Cookies oder rechtlichen Vorgaben. Die jeweils aktuelle Fassung steht unter caelex.eu/legal/cookies.",
        },
      ],
    },
  ],
  annexes: [],
  contactLines: [
    "Caelex",
    "Inhaber: Julian Polleschner",
    "Am Maselakepark 37",
    "13587 Berlin, Deutschland",
    "",
    "Datenschutzanfragen:",
    "mailto:privacy@caelex.eu",
  ],
  links: [
    { label: "English Version →", href: "/legal/cookies-en" },
    { label: "Datenschutzerklärung", href: "/legal/privacy" },
    { label: "AGB", href: "/legal/terms" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
