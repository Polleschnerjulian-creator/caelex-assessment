import type { LegalDocument } from "@/lib/legal/types";

export const AI_DISCLOSURE_DE: LegalDocument = {
  lang: "de",
  title: "KI-Transparenz-Erklärung",
  subtitle:
    "Informationen zum Einsatz von Künstlicher Intelligenz auf der Caelex-Plattform",
  version: "Version 2.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Wir setzen Künstliche Intelligenz auf der Caelex-Plattform transparent und verantwortlich ein. Diese Erklärung informiert Sie darüber, wo KI zum Einsatz kommt, welche Modelle wir nutzen, was das für Ihre Daten bedeutet und welche Grenzen KI-Ausgaben haben.",
    "Die Erklärung ergänzt die AGB V3.0 § 7 und Anhang E (Astra) sowie die Datenschutzerklärung § 7.",
  ],
  sections: [
    {
      id: "a1",
      number: "§ 1",
      title: "Wo wir KI einsetzen",
      blocks: [
        { type: "p", text: "Wir setzen KI-Funktionen insbesondere ein in:" },
        {
          type: "ul",
          items: [
            "Astra — KI-gestützter Compliance-Copilot zur Beantwortung von Fragen zu Regulatorik und Plattform-Inhalten",
            "Generate 2.0 — automatische Generierung regulatorischer Dokumentvorlagen (z.B. NCA-Einreichungen, Compliance-Memos)",
            "Content-Assistenz — Verbesserungsvorschläge, Zusammenfassungen, Übersetzungen innerhalb der Plattform",
          ],
        },
        {
          type: "p",
          text: "Nicht eingesetzt wird KI für: automatisierte rechtsverbindliche Entscheidungen, automatisierte Bonitätsbewertungen, Profiling mit Rechtswirkung für Dritte oder biometrische Analysen.",
        },
      ],
    },
    {
      id: "a2",
      number: "§ 2",
      title: "Eingesetzte Modelle und Anbieter",
      blocks: [
        {
          type: "p",
          text: "Als primären Inferenz-Anbieter setzen wir Anthropic PBC (USA) mit dem Modell Claude Sonnet 4.6 (bzw. Nachfolgeversionen) ein. Details:",
        },
        {
          type: "ul",
          items: [
            "Anbieter: Anthropic PBC — Sub-Auftragsverarbeiter (siehe /legal/sub-processors)",
            "Zero-Data-Retention: Eingaben werden nach Beantwortung nicht gespeichert und nicht zum Modelltraining verwendet",
            "Transfergrundlage: EU-Standardvertragsklauseln Modul 3, USA",
            "Kategorie im Sinne der KI-VO (Verordnung (EU) 2024/1689): Allzweck-KI-Modell (GPAI) — Caelex ist Betreiber (deployer)",
          ],
        },
      ],
    },
    {
      id: "a3",
      number: "§ 3",
      title: "Was das für Ihre Daten bedeutet",
      blocks: [
        {
          type: "p",
          text: "(1) Ihre Eingabe, gegebenenfalls angereichert um von Ihnen freigegebenen Kontext, wird an den KI-Anbieter zur Beantwortung übertragen. Weitere Daten (z.B. andere Nutzerdaten, fremde Organisationsdaten) werden nicht übertragen.",
        },
        {
          type: "p",
          text: "(2) Der KI-Anbieter speichert die Anfrage nicht über die Beantwortung hinaus und verwendet sie nicht zum Modelltraining (Zero-Data-Retention-Vereinbarung).",
        },
        {
          type: "p",
          text: "(3) Innerhalb von Caelex werden Konversationen zu Ihrer eigenen Nachvollziehbarkeit gespeichert. Sie können Konversationen jederzeit löschen.",
        },
        {
          type: "p",
          text: "(4) Aggregierte, anonymisierte Nutzungsmuster dürfen wir für Produktverbesserungen auswerten, ohne dass dabei Personenbezug entsteht.",
        },
      ],
    },
    {
      id: "a4",
      number: "§ 4",
      title: "Grenzen von KI-Ausgaben",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "KI-Ausgaben können unvollständig, veraltet, widersprüchlich oder erfunden sein („Halluzinationen“). Sie ersetzen keine qualifizierte Beratung.",
        },
        {
          type: "p",
          text: "(1) KI-Ausgaben sind statistisch erzeugte Inhalte und keine verbindlichen rechtlichen, finanziellen oder regulatorischen Einschätzungen.",
        },
        {
          type: "p",
          text: "(2) Die Nutzerin bzw. der Nutzer ist allein verantwortlich, jede KI-Ausgabe vor Verwendung durch qualifizierte Fachpersonen (Rechtsanwalt, Steuerberater, zugelassener Finanzdienstleister) prüfen zu lassen.",
        },
        {
          type: "p",
          text: "(3) Bei Weitergabe von KI-Ausgaben an Dritte oder Behörden ist deren Charakter als KI-generierter Inhalt kenntlich zu machen, soweit gesetzlich oder vertraglich geboten.",
        },
      ],
    },
    {
      id: "a5",
      number: "§ 5",
      title: "Kennzeichnung und Transparenz",
      blocks: [
        {
          type: "p",
          text: 'KI-generierte Inhalte auf der Plattform sind erkennbar gekennzeichnet (z.B. Astra-Chat-Oberfläche, Generate-Wasserzeichen, Atlas-Pinboard-Karten mit „🤖 KI-generiert"-Badge). Wir halten die Kennzeichnungspflichten der KI-VO (Art. 50) ein, soweit sie auf uns anwendbar sind.',
        },
      ],
    },
    {
      id: "a5a",
      number: "§ 5a",
      title:
        "Atlas × Caelex — bilaterale Anwaltsplattform (Sonderbestimmungen)",
      blocks: [
        {
          type: "p",
          text: "Atlas ist die anwaltsseitige Oberfläche der Caelex-Plattform. Sie ermöglicht Kanzleien, im Rahmen eines durch beidseitigen Handshake autorisierten Mandats (Legal-Network-Bridge) auf compliance-bezogene Daten ihres Mandanten zuzugreifen und KI-gestützt zu beraten.",
        },
        {
          type: "p",
          text: "(1) Eingesetzte KI-Komponenten:",
        },
        {
          type: "ul",
          items: [
            "Atlas-AI-Chat — Claude Sonnet 4.6 für die Beratung im Mandat-Workspace, mit Tool-Use-Loop (Compliance-Übersicht abrufen, Quellensuche, Jurisdiktionen vergleichen, Memo entwerfen)",
            "Atlas Foresight — sekundärer Claude-Call nach jeder Antwort, der 2–3 Folge-Aktionen vorschlägt (max. 400 Output-Tokens)",
            "Atlas Personal Library Recall — Embeddings (OpenAI text-embedding-3-small @ 512 Dimensionen via Vercel AI Gateway) für die semantische Suche in der persönlichen Forschungs-Bibliothek der Anwältin / des Anwalts",
          ],
        },
        {
          type: "p",
          text: "(2) Datenfluss zur KI: Mandantendaten werden ausschließlich im Rahmen des im Handshake festgelegten Scope-Sets verarbeitet (technisch erzwungener Need-to-know-Filter, manipulationssicheres Hash-Chain-Audit-Log). Der KI-Anbieter erhält Eingaben unter Zero-Data-Retention-Vereinbarung; keine Speicherung über die Anfrage hinaus, keine Verwendung für Modelltraining.",
        },
        {
          type: "p",
          text: '(3) Verantwortlichkeit der Anwaltschaft: Atlas-Ausgaben sind anwaltliche Hilfsmittel, keine Rechtsberatung im Sinne des RDG / der BRAO. Die Anwältin / der Anwalt prüft jede Ausgabe vor Verwendung gegenüber dem Mandanten. Atlas-generierte Memos und Vergleiche tragen ein „🤖 KI-generiert" Badge und einen Hinweis auf die Review-Pflicht.',
        },
      ],
    },
    {
      id: "a5b",
      number: "§ 5b",
      title: "Risikoklassifizierung nach KI-VO (EU AI Act)",
      blocks: [
        {
          type: "p",
          text: "Wir haben die Atlas- und Caelex-KI-Komponenten gemäß Art. 6 i.V.m. Anhang III KI-VO bewertet:",
        },
        {
          type: "p",
          text: '(1) KEIN Hochrisiko-System nach Anhang III. Anhang III Nr. 8 erfasst KI-Systeme, die „Justizbehörden bei der Recherche, Auslegung und Anwendung von Rechtsvorschriften unterstützen" — also gerichtliche Anwendung. Atlas richtet sich an Anwältinnen und Anwälte als Beratungsmittel, nicht an Justizbehörden. Eine analoge Anwendung lehnen wir mit der herrschenden Auslegung ab.',
        },
        {
          type: "p",
          text: '(2) Article-6(3)-Ausnahme erfüllt. Selbst wenn Atlas teilweise unter Anhang III fiele, greifen die Ausnahmen aus Art. 6 Abs. 3 KI-VO: Atlas führt nur „begrenzte Verfahrensaufgaben" aus (Tool-Calls, Such-Aggregation), „verbessert menschliche Tätigkeit" (Memo-Entwürfe als Vorschlag) und „erkennt Muster ohne Entscheidung" (Foresight, Recall). Atlas trifft keine eigenständigen Entscheidungen mit Rechtswirkung; die Anwältin / der Anwalt entscheidet.',
        },
        {
          type: "p",
          text: "(3) KEIN Profiling natürlicher Personen. Atlas verarbeitet keine personenbezogenen Daten zur Bewertung oder Vorhersage individueller Eigenschaften.",
        },
        {
          type: "p",
          text: '(4) Transparenzpflichten nach Art. 50 KI-VO werden eingehalten: Nutzerinnen und Nutzer erkennen klar die Interaktion mit einem KI-System (Atlas-Orb-UI, „Frag Atlas"-Eingabefeld, KI-generiert-Badges auf Pinboard-Karten). KI-Ausgaben, die als Memo an Mandanten gehen können, tragen einen sichtbaren Hinweis auf den KI-Ursprung sowie die anwaltliche Review-Pflicht.',
        },
        {
          type: "p",
          text: "(5) Menschliche Aufsicht (Art. 14 KI-VO als Best-Practice trotz nicht-Hochrisiko): die Anwältin / der Anwalt kann jeden KI-Vorschlag annehmen, ablehnen oder modifizieren. Memo-Entwürfe werden nicht automatisch versendet; Foresight-Vorschläge sind ausschließlich Anzeige.",
        },
        {
          type: "p",
          text: "(6) Wir dokumentieren diese Bewertung intern und stellen sie auf Anfrage Aufsichtsbehörden bereit. Bei wesentlichen funktionalen Erweiterungen wird die Bewertung neu durchgeführt.",
        },
      ],
    },
    {
      id: "a6",
      number: "§ 6",
      title: "Sicherheit und Missbrauchsschutz",
      blocks: [
        {
          type: "p",
          text: "Wir setzen Prompt-Injection-Schutz, Content-Filter und Rate-Limits ein, um Missbrauch von KI-Funktionen zu vermeiden. Nutzungsmuster werden überwacht; Missbrauch kann gemäß AGB § 11 zur Sperrung führen.",
        },
      ],
    },
    {
      id: "a7",
      number: "§ 7",
      title: "Kontakt",
      blocks: [
        {
          type: "p",
          text: "Fragen oder Bedenken zu KI-Einsatz und Transparenz richten Sie bitte an privacy@caelex.eu oder legal@caelex.eu.",
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
    "KI- und Datenschutzanfragen:",
    "mailto:privacy@caelex.eu",
    "Rechtliche Anfragen:",
    "mailto:legal@caelex.eu",
  ],
  links: [
    { label: "AGB § 7 & Anhang E", href: "/legal/terms#s7" },
    { label: "Datenschutzerklärung", href: "/legal/privacy" },
    { label: "Sub-Auftragsverarbeiter", href: "/legal/sub-processors" },
    { label: "DPA", href: "/legal/dpa" },
  ],
};
