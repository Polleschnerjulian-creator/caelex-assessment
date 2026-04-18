import type { LegalDocument } from "@/lib/legal/types";

export const CONTENT_POLICY_DE: LegalDocument = {
  lang: "de",
  title: "Acceptable Use Policy",
  subtitle:
    "Regeln zur zulässigen Nutzung der Caelex-Plattform und zu den hochgeladenen Inhalten",
  version: "Version 1.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Diese Acceptable Use Policy („AUP“) konkretisiert § 11 der AGB V3.0 und legt fest, welche Nutzungen der Caelex-Plattform zulässig sind und welche nicht. Sie gilt zusätzlich zu den AGB und wird Vertragsbestandteil.",
  ],
  sections: [
    {
      id: "u1",
      number: "§ 1",
      title: "Grundsatz",
      blocks: [
        {
          type: "p",
          text: "Die Plattform darf ausschließlich zum bestimmungsgemäßen Zweck genutzt werden — zur Unterstützung der regulatorischen Compliance in der Raumfahrt — und unter Einhaltung anwendbaren Rechts.",
        },
      ],
    },
    {
      id: "u2",
      number: "§ 2",
      title: "Verbotene Inhalte",
      blocks: [
        {
          type: "p",
          text: "Der Kunde stellt sicher, dass er keine Inhalte einbringt, die:",
        },
        {
          type: "ul",
          items: [
            "rechtswidrig, strafbewehrt, ehrverletzend, beleidigend, diskriminierend, gewaltverherrlichend oder jugendgefährdend sind",
            "Rechte Dritter verletzen (Urheberrecht, Marken, Geschäftsgeheimnisse, Persönlichkeitsrechte)",
            "Schadsoftware, Schadcode oder Exploits enthalten",
            "personenbezogene Daten enthalten, für deren Verarbeitung keine Rechtsgrundlage besteht",
            "besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) ohne gesonderte Vereinbarung enthalten",
            "Export-kontrollierte technische Informationen ohne erforderliche Genehmigung enthalten (siehe § 23 AGB)",
            "irreführende oder betrügerische Darstellungen enthalten",
          ],
        },
      ],
    },
    {
      id: "u3",
      number: "§ 3",
      title: "Verbotene Nutzungsmuster",
      blocks: [
        {
          type: "ul",
          items: [
            "Scraping, systematische Extraktion oder automatisierte Datenerhebung außerhalb der bereitgestellten API",
            "Reverse Engineering, Dekompilierung oder Ableitung interner Funktionsweise",
            "Nutzung zum Training eigener oder fremder KI-Modelle",
            "Umgehung von Rate-Limits, Authentifizierung oder Zugriffskontrollen",
            "Wettbewerbliche Nutzung zur Entwicklung konkurrierender Produkte",
            "Lasttests, Penetrationstests oder Sicherheitsprüfungen ohne vorherige schriftliche Zustimmung (security@caelex.eu)",
            "Spam, Kettenbriefe oder massenhafte unerwünschte Kommunikation",
            "Nutzung durch mehr als die vertraglich vereinbarten Nutzer oder Organisationen",
          ],
        },
      ],
    },
    {
      id: "u4",
      number: "§ 4",
      title: "Meldung von Missbrauch",
      blocks: [
        {
          type: "p",
          text: "Missbrauch und rechtsverletzende Inhalte melden Sie bitte an abuse@caelex.eu mit einer nachvollziehbaren Beschreibung und, soweit möglich, URL oder Content-ID. Wir prüfen Meldungen zeitnah und handeln gemäß DSA Art. 16 (Notice-and-Action).",
        },
      ],
    },
    {
      id: "u5",
      number: "§ 5",
      title: "Rechtsfolgen",
      blocks: [
        {
          type: "p",
          text: "Bei Verstößen behalten wir uns vor: (a) Inhalte zu entfernen oder zu sperren, (b) den Account vorübergehend oder dauerhaft zu sperren, (c) den Vertrag außerordentlich zu kündigen, (d) Schadensersatz und Unterlassung geltend zu machen, (e) bei strafbewehrten Verstößen Ermittlungsbehörden einzuschalten.",
        },
      ],
    },
    {
      id: "u6",
      number: "§ 6",
      title: "Sicherheitsforschung",
      blocks: [
        {
          type: "p",
          text: "Sicherheitsforscher sind ausdrücklich eingeladen, Schwachstellen zu melden. Es gilt ein Coordinated-Vulnerability-Disclosure-Prozess. Meldungen bitte an security@caelex.eu; siehe auch /.well-known/security.txt.",
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
    "Missbrauchsmeldungen:",
    "mailto:abuse@caelex.eu",
    "Sicherheitsmeldungen:",
    "mailto:security@caelex.eu",
  ],
  links: [
    { label: "AGB § 11", href: "/legal/terms#s11" },
    { label: "Datenschutzerklärung", href: "/legal/privacy" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
