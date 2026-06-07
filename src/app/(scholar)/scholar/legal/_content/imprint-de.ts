/**
 * Caelex Scholar — Impressum (DE, verbindlich) nach § 5 DDG / § 18 MStV.
 *
 * Binding German edition. Keep in sync with `imprint-en.ts`.
 *
 * DRAFT — the mandatory ENTWURF banner is rendered by LegalDoc; do NOT add one
 * here. Template pending qualified-counsel review.
 *
 * STRICTLY MONOCHROME / WCAG 2.2 AA — handled by the shell. Plain strings only;
 * the LegalDoc renderer has no link block, so URLs/e-mails appear as plain text.
 *
 * Entity facts MIRROR the real platform imprint
 * (src/app/legal/impressum/page.tsx): Caelex · Inhaber Julian Polleschner ·
 * Am Maselakepark 37 · 13587 Berlin · Deutschland · § 19 UStG Kleinunternehmer ·
 * DSA Art. 11/12 SPOC · cs@caelex.eu.
 */

import type { ScholarLegalDoc } from "../_components/types";

export const IMPRINT_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Impressum",
  subtitle: "Caelex Scholar — Angaben nach § 5 DDG, § 18 MStV",
  version: "1.0",
  lastUpdated: "7. Juni 2026",
  preamble: [
    "Gesetzlich vorgeschriebene Angaben für den Dienst Caelex Scholar (caelex.eu/scholar). Verbindlich ist die deutsche Fassung; die englische Fassung dient nur der Information.",
  ],
  sections: [
    {
      id: "s1",
      number: "§ 1",
      title: "Anbieter (§ 5 DDG, § 18 MStV)",
      blocks: [
        {
          type: "p",
          text: "Caelex",
        },
        {
          type: "ul",
          items: [
            "Inhaber: Julian Polleschner",
            "Am Maselakepark 37",
            "13587 Berlin",
            "Deutschland",
          ],
        },
        {
          type: "p",
          text: "Caelex ist ein Einzelunternehmen (Inhaber: Julian Polleschner).",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Kontakt",
      blocks: [
        {
          type: "ul",
          items: [
            "Allgemein und Nutzerkontakt: cs@caelex.eu",
            "Rechtliches: legal@caelex.eu",
            "Datenschutz: privacy@caelex.eu",
            "Sicherheit: security@caelex.eu",
            "Missbrauch: abuse@caelex.eu",
          ],
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Umsatzsteuer-Identifikationsnummer",
      blocks: [
        {
          type: "p",
          text: "Gemäß § 27a UStG wird auf Anfrage bekannt gegeben. Als Kleinunternehmer gemäß § 19 UStG wird in Rechnungen keine Umsatzsteuer ausgewiesen, soweit und solange einschlägig.",
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
      blocks: [
        {
          type: "ul",
          items: [
            "Julian Polleschner",
            "Am Maselakepark 37",
            "13587 Berlin, Deutschland",
          ],
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title: "Zentrale Kontaktstelle nach Art. 11 und 12 DSA",
      blocks: [
        {
          type: "p",
          text: "Zentrale Kontaktstelle (Single Point of Contact) gemäß Verordnung (EU) 2022/2065 (Digital Services Act) für Behörden und für Nutzerinnen und Nutzer:",
        },
        {
          type: "ul",
          items: [
            "E-Mail für Behördenkontakt: legal@caelex.eu",
            "E-Mail für Nutzerkontakt: cs@caelex.eu",
            "Sprache der Kommunikation: Deutsch, Englisch",
            "Postalische Anschrift: wie oben unter Anbieter",
          ],
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Berufsrechtliche Angaben",
      blocks: [
        {
          type: "p",
          text: "Caelex ist keine Rechtsanwaltskanzlei, keine Steuerberatung und kein zugelassener Finanzdienstleister. Es bestehen keine spezifischen berufsrechtlichen Regelungen. Caelex Scholar ist ein Recherche- und Bildungswerkzeug und erbringt keine Rechtsberatung (vgl. Nutzungsbedingungen § 2).",
        },
      ],
    },
    {
      id: "s7",
      number: "§ 7",
      title: "Haftung für Inhalte",
      blocks: [
        {
          type: "p",
          text: "Als Dienstanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Dienstanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.",
        },
        {
          type: "p",
          text: "Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir die Inhalte umgehend entfernen.",
        },
      ],
    },
    {
      id: "s8",
      number: "§ 8",
      title: "Haftung für Links",
      blocks: [
        {
          type: "p",
          text: "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.",
        },
      ],
    },
    {
      id: "s9",
      number: "§ 9",
      title: "Urheberrecht",
      blocks: [
        {
          type: "p",
          text: "Die durch Caelex erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Amtliche Werke im Quellenbestand (z. B. Verträge, Gesetze, Gerichtsentscheidungen) sind nach § 5 UrhG gemeinfrei. Die Zusammenstellung des Quellenbestands als Datenbank ist nach dem Schutzrecht sui generis (§§ 87a ff. UrhG) geschützt. Einzelheiten regeln die Nutzungsbedingungen und die Nutzungsrichtlinie.",
        },
      ],
    },
    {
      id: "s10",
      number: "§ 10",
      title: "Streitbeilegung",
      blocks: [
        {
          type: "p",
          text: "Die Europäische Kommission stellt unter ec.europa.eu/consumers/odr eine Plattform zur Online-Streitbeilegung (OS-Plattform) bereit. Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
        },
      ],
    },
  ],
};
