import type { LegalDocument } from "@/lib/legal/types";

export const A11Y_DE: LegalDocument = {
  lang: "de",
  title: "Erklärung zur Barrierefreiheit",
  subtitle:
    "Informationen zur Barrierefreiheit der Caelex-Plattform gemäß BFSG und BGG/BITV",
  version: "Version 1.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Caelex ist bestrebt, seine Website und Plattform für alle Menschen zugänglich zu gestalten. Diese Erklärung beschreibt den Stand der Barrierefreiheit und Feedback-Kanäle gemäß Barrierefreiheitsstärkungsgesetz (BFSG) und den einschlägigen Richtlinien.",
  ],
  sections: [
    {
      id: "b1",
      number: "§ 1",
      title: "Geltungsbereich",
      blocks: [
        {
          type: "p",
          text: "Diese Erklärung gilt für die unter caelex.eu erreichbare Website und die Caelex-Plattform einschließlich aller Produktlinien, die nach § 1 Abs. 2 BFSG in den Anwendungsbereich des Gesetzes fallen (insbesondere Dienstleistungen im elektronischen Geschäftsverkehr gegenüber Verbrauchern).",
        },
      ],
    },
    {
      id: "b2",
      number: "§ 2",
      title: "Stand der Vereinbarkeit",
      blocks: [
        {
          type: "p",
          text: "Die Caelex-Plattform wird fortlaufend an den Anforderungen der Web Content Accessibility Guidelines (WCAG) 2.1 Level AA gemessen. Das ist die von BFSG / BITV 2.0 / EN 301 549 referenzierte Norm.",
        },
        {
          type: "p",
          text: "Wir streben die vollständige Übereinstimmung mit WCAG 2.1 AA an. Die Plattform ist in wesentlichen Teilen barrierefrei; in einigen, nachfolgend aufgeführten Bereichen arbeiten wir an der Beseitigung verbliebener Barrieren.",
        },
      ],
    },
    {
      id: "b3",
      number: "§ 3",
      title: "Umgesetzte Maßnahmen",
      blocks: [
        {
          type: "ul",
          items: [
            "semantisches HTML (Überschriften-Hierarchie, aria-Attribute, landmark-Rollen)",
            "Tastaturbedienbarkeit aller interaktiven Elemente; sichtbarer Fokusindikator",
            "Dunkelmodus mit ausreichender Farbkontrastrate (WCAG AA: 4.5:1 für normalen Text)",
            "alternative Texte für informative Grafiken und Icons",
            "responsive Layouts bis 400 % Zoom ohne horizontalen Scroll",
            "keine allein farbabhängigen Statusindikatoren",
            "Reduzierte Bewegung (prefers-reduced-motion) wird unterstützt",
            "Formular-Labels und Fehlermeldungen programmatisch verknüpft",
            "Skip-Links zur Sprungnavigation",
            "maschinenlesbare Struktur für assistive Technologien",
          ],
        },
      ],
    },
    {
      id: "b4",
      number: "§ 4",
      title: "Noch nicht vollständig zugängliche Inhalte",
      blocks: [
        {
          type: "p",
          text: "Folgende Inhalte sind derzeit nicht oder nur eingeschränkt barrierefrei; wir arbeiten an einer Lösung:",
        },
        {
          type: "ul",
          items: [
            "Komplexe 3D-Visualisierungen (Mission Control Globus, Landingpage-Three.js-Szene) — es werden alternative tabellarische Darstellungen angeboten, wo Informationsgleichwertigkeit hergestellt werden kann",
            "Einige Diagramme und Charts — geeignete textliche Zusammenfassungen sind in Bearbeitung",
            "Generierte PDF-Dokumente — barrierefreie PDF-Erzeugung ist in Arbeit; als Zwischenlösung stehen HTML-Äquivalente zur Verfügung",
          ],
        },
      ],
    },
    {
      id: "b5",
      number: "§ 5",
      title: "Feedback und Kontakt",
      blocks: [
        {
          type: "p",
          text: "Haben Sie Barrieren bemerkt oder benötigen Sie Inhalte in einer zugänglicheren Form? Wir freuen uns über Ihr Feedback.",
        },
        {
          type: "p",
          text: "Kontakt: accessibility@caelex.eu — wir antworten innerhalb von fünf Werktagen und bieten, soweit möglich, eine zugängliche Alternative.",
        },
      ],
    },
    {
      id: "b6",
      number: "§ 6",
      title: "Durchsetzungsverfahren",
      blocks: [
        {
          type: "p",
          text: "Bleiben Ihre Anliegen nach Kontaktaufnahme mit uns unbeantwortet oder unbefriedigend, können Sie sich an die Marktüberwachungsbehörde nach BFSG wenden. Zuständig ist in der Regel die Marktüberwachung des Bundeslandes des Anbietersitzes (für Caelex: Berlin).",
        },
      ],
    },
    {
      id: "b7",
      number: "§ 7",
      title: "Stand und Überprüfung",
      blocks: [
        {
          type: "p",
          text: "Diese Erklärung wurde erstellt am 18. April 2026 auf Grundlage einer Selbstbewertung. Sie wird jährlich, bei wesentlichen Änderungen der Plattform oder bei entsprechenden Rückmeldungen aktualisiert.",
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
    "Barrierefreiheits-Feedback:",
    "mailto:accessibility@caelex.eu",
    "Allgemeine Anfragen:",
    "mailto:cs@caelex.eu",
  ],
  links: [
    {
      label: "English / Accessibility Statement →",
      href: "/legal/accessibility",
    },
    { label: "Datenschutzerklärung", href: "/legal/privacy" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
