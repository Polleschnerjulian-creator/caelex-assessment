/**
 * Caelex Scholar — Nutzungsbedingungen (DE, verbindlich).
 *
 * Binding German edition. The EN file (`terms-en.ts`) is a convenience
 * translation and MUST be kept in sync.
 *
 * DRAFT — the mandatory ENTWURF banner is rendered by LegalDoc; do NOT add one
 * here. This text is a template pending qualified-counsel review (see the
 * gap-analysis spec G3/AI2/AI5 and the §4 NEEDS-LAWYER list).
 *
 * STRICTLY MONOCHROME / WCAG 2.2 AA — handled by the shell. Plain-string blocks
 * only; no inline HTML.
 *
 * Facts grounded in: src/app/legal/impressum/page.tsx (entity, §19 UStG,
 * cs@caelex.eu) and the legal-compliance spec
 * (docs/superpowers/specs/2026-06-07-caelex-scholar-legal-compliance.md).
 */

import type { ScholarLegalDoc } from "../_components/types";

export const TERMS_DE: ScholarLegalDoc = {
  lang: "de",
  title: "Nutzungsbedingungen",
  subtitle: "Caelex Scholar — kostenlose, hochschullizenzierte Rechtsrecherche",
  version: "1.0",
  lastUpdated: "7. Juni 2026",
  preamble: [
    "Diese Nutzungsbedingungen regeln den Zugang zu und die Nutzung von Caelex Scholar (caelex.eu/scholar, nachfolgend „Scholar“), einer kostenlosen, von Hochschulen lizenzierten Rechtsrecherche-Datenbank für das Weltraumrecht, betrieben von Caelex (Inhaber: Julian Polleschner, Berlin; nachfolgend „Caelex“, „wir“). Scholar wird im Rahmen eines B2B2C-Modells angeboten: Eine Hochschule oder Forschungseinrichtung (nachfolgend „lizenzierende Hochschule“) schließt mit Caelex einen Vertrag und stellt den Zugang ihren Angehörigen kostenlos zur Verfügung.",
    "Mit der Nutzung von Scholar erklären Sie sich mit diesen Nutzungsbedingungen einverstanden. Bitte lesen Sie insbesondere den Hinweis „Keine Rechtsberatung“ (§ 2) und die Haftungsregelungen (§ 8) sorgfältig.",
  ],
  sections: [
    {
      id: "s1",
      number: "§ 1",
      title: "Anbieter, Geltungsbereich und Vertragssprache",
      blocks: [
        {
          type: "p",
          text: "Anbieter von Scholar ist Caelex, Inhaber Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Deutschland. Die vollständigen Anbieterangaben nach § 5 DDG finden Sie im Impressum.",
        },
        {
          type: "p",
          text: "Diese Nutzungsbedingungen gelten für jede Nutzung von Scholar durch Nutzerinnen und Nutzer, die über eine lizenzierende Hochschule Zugang erhalten. Sie gelten zusätzlich zu und unbeschadet etwaiger Vereinbarungen zwischen der lizenzierenden Hochschule und ihren Angehörigen sowie zwischen Caelex und der lizenzierenden Hochschule.",
        },
        {
          type: "definition",
          term: "Verbindliche Sprachfassung.",
          text: "Verbindlich ist ausschließlich die deutsche Fassung dieser Nutzungsbedingungen. Die englische Fassung ist eine unverbindliche Übersetzung zur Erleichterung des Verständnisses. Bei Abweichungen geht die deutsche Fassung vor.",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Keine Rechtsberatung — Recherchehilfe",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "Scholar ist ein Recherche- und Bildungswerkzeug. Scholar erbringt KEINE Rechtsberatung und ersetzt keine anwaltliche oder sonstige fachkundige Beratung. Die bereitgestellten Inhalte sind allgemeine Referenzmaterialien und keine auf einen Einzelfall bezogene rechtliche Empfehlung.",
        },
        {
          type: "p",
          text: "Die in Scholar bereitgestellten Texte (Verträge, EU-Rechtsakte, nationale Gesetze, Gerichtsentscheidungen und ergänzende Materialien zum Weltraumrecht) dienen ausschließlich Informations-, Studien- und Forschungszwecken. Sie begründen kein Mandats- oder Beratungsverhältnis und keinen Vertrauenstatbestand.",
        },
        {
          type: "p",
          text: "Caelex ist keine Rechtsanwaltskanzlei und keine Steuerberatung. Die Nutzung von Scholar führt zu keinem Anwalts- oder Beratungsvertrag. Vor rechtlich relevanten Entscheidungen ist stets qualifizierter Rechtsrat einzuholen und die Primärquelle in ihrer amtlichen Fassung zu prüfen.",
        },
        {
          type: "p",
          text: "Verlassen Sie sich nicht allein auf Scholar. Inhalte können unvollständig, veraltet oder für Ihren Anwendungsfall ungeeignet sein. Die maßgebliche, amtliche Fassung einer Rechtsquelle ist stets bei der jeweils zuständigen Stelle (z. B. Amtsblatt der EU, nationale Gesetzblätter, Gerichte) zu überprüfen.",
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Zugangsberechtigung",
      blocks: [
        {
          type: "p",
          text: "Zugangsberechtigt sind ausschließlich Angehörige einer lizenzierenden Hochschule, denen diese Hochschule einen Zugang zuweist — insbesondere immatrikulierte Studierende sowie Lehr-, Forschungs- und Verwaltungspersonal im Rahmen ihrer Tätigkeit für die Hochschule.",
        },
        {
          type: "p",
          text: "Der Zugang erfolgt in der Regel über das Single-Sign-On (SSO) Ihrer Hochschule. Sie sind verpflichtet, Ihre Zugangsdaten geheim zu halten und nicht an Dritte weiterzugeben (vgl. Nutzungsrichtlinie / Acceptable Use Policy).",
        },
        {
          type: "p",
          text: "Endet Ihre Zugehörigkeit zur lizenzierenden Hochschule oder endet deren Lizenz, so erlischt Ihre Zugangsberechtigung. Ein Anspruch auf Fortbestand des Zugangs besteht nicht.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Minderjährige: Scholar richtet sich an Hochschulangehörige; einzelne Nutzerinnen und Nutzer können jedoch minderjährig sein. Optionale, einwilligungsbasierte Funktionen (z. B. Suchverlauf, semantische Suche) sind standardmäßig deaktiviert. Soweit eine Einwilligung erforderlich ist, gilt in Deutschland das digitale Einwilligungsalter von 16 Jahren (Art. 8 DSGVO). Einzelheiten regelt die Datenschutzerklärung.",
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Leistungsumfang, Kostenfreiheit und Lizenzumfang",
      blocks: [
        {
          type: "p",
          text: "Scholar wird den zugangsberechtigten Nutzerinnen und Nutzern kostenlos zur Verfügung gestellt. Caelex erhält ein Entgelt allein von der lizenzierenden Hochschule; gegenüber den einzelnen Nutzerinnen und Nutzern besteht kein entgeltliches Vertragsverhältnis.",
        },
        {
          type: "p",
          text: "Caelex gewährt Ihnen ein einfaches, nicht ausschließliches, nicht übertragbares und widerrufliches Recht, Scholar im Rahmen dieser Nutzungsbedingungen für Ihre eigenen, nicht kommerziellen Studien- und Forschungszwecke zu nutzen. Eine darüber hinausgehende Nutzung — insbesondere eine systematische Vervielfältigung oder Weiterverbreitung — ist nicht gestattet (vgl. § 6 und die Nutzungsrichtlinie).",
        },
        {
          type: "p",
          text: "Scholar wird als kostenloser Dienst „wie verfügbar“ („as is“ / „as available“) bereitgestellt. Ein bestimmter Funktionsumfang, eine bestimmte Verfügbarkeit oder die Eignung für einen bestimmten Zweck werden nicht zugesichert. Caelex kann den Dienst jederzeit ändern, einschränken oder einstellen, soweit dies für die einzelnen Nutzerinnen und Nutzer zumutbar ist.",
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title: "KI-gestützte Suche (Transparenzhinweis)",
      blocks: [
        {
          type: "p",
          text: "Scholar bietet optional eine semantische Suche, die auf Verfahren der künstlichen Intelligenz (Vektor-Embeddings) beruht, um relevante Stellen im Quellenbestand aufzufinden und zu sortieren. Diese Funktion ist standardmäßig deaktiviert und wird nur nach Ihrer aktiven Aktivierung verwendet.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Hinweis nach Art. 50 KI-VO (Verordnung (EU) 2024/1689): Bei aktivierter semantischer Suche interagieren Sie mit einem KI-System. Die Ergebnisse werden durch KI-gestützte semantische Suche sortiert und können fehlerhaft, unvollständig oder unpassend sein. Überprüfen Sie die Ergebnisse stets anhand der amtlichen Quelle.",
        },
        {
          type: "p",
          text: "Die semantische Suche ist ein Hilfsmittel zum Auffinden von Inhalten (Retrieval). Sie trifft keine rechtsverbindlichen Entscheidungen und nimmt keine automatisierte Entscheidung im Einzelfall mit rechtlicher Wirkung im Sinne von Art. 22 DSGVO vor. Die inhaltliche Bewertung und Verantwortung verbleiben stets bei Ihnen.",
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Zulässige Nutzung und Pflichten",
      blocks: [
        {
          type: "p",
          text: "Sie dürfen Scholar nur im Rahmen dieser Nutzungsbedingungen, der ergänzenden Nutzungsrichtlinie (Acceptable Use Policy) und der geltenden Gesetze nutzen. Die Nutzungsrichtlinie ist Bestandteil dieser Nutzungsbedingungen.",
        },
        {
          type: "p",
          text: "Untersagt sind insbesondere: das automatisierte Auslesen oder massenhafte Extrahieren von Inhalten (Scraping, Bulk-Download); die Umgehung technischer Schutz-, Zugangs- oder Ratenbegrenzungsmaßnahmen; die Weitergabe von Zugangsdaten; sowie jede rechtswidrige oder den Dienst beeinträchtigende Nutzung. Einzelheiten regelt die Nutzungsrichtlinie.",
        },
        {
          type: "p",
          text: "Sie sind für sämtliche Handlungen unter Ihrem Zugang verantwortlich. Bei Anhaltspunkten für einen Missbrauch Ihres Zugangs informieren Sie uns bitte unverzüglich unter cs@caelex.eu.",
        },
      ],
    },
    {
      id: "s7",
      number: "§ 7",
      title: "Geistiges Eigentum und Quellenbestand",
      blocks: [
        {
          type: "p",
          text: "Die Marke „Caelex“, „Caelex Scholar“ sowie das Erscheinungsbild, die Software, die Strukturierung, Aufbereitung und Zusammenstellung des Dienstes sind urheber- und kennzeichenrechtlich geschützt. Sie erhalten hieran keine über § 4 hinausgehenden Rechte.",
        },
        {
          type: "p",
          text: "Der Quellenbestand besteht überwiegend aus amtlichen Rechtstexten (Verträge, EU-Rechtsakte, nationale Gesetze, Gerichtsentscheidungen). Amtliche Werke sind nach § 5 UrhG gemeinfrei; an ihnen besteht kein Urheberrechtsschutz. Die jeweilige amtliche Fassung und Geltung ist stets bei der zuständigen Stelle zu prüfen.",
        },
        {
          type: "p",
          text: "Die Zusammenstellung des Quellenbestands als Datenbank ist als solche nach dem Schutzrecht sui generis (Richtlinie 96/9/EG, §§ 87a ff. UrhG) geschützt, auch soweit einzelne Inhalte gemeinfrei sind. Eine Entnahme oder Weiterverwendung wesentlicher Teile sowie eine wiederholte und systematische Entnahme unwesentlicher Teile sind unzulässig (vgl. Nutzungsrichtlinie).",
        },
        {
          type: "p",
          text: "Für Inhalte aus geschlossen lizenzierten Standards (z. B. ITU, ISO/IEC) wird die angezeigte Textmenge begrenzt (Auszug von höchstens 600 Zeichen je Bestimmung), um die Rechte der jeweiligen Rechteinhaber zu wahren.",
        },
      ],
    },
    {
      id: "s8",
      number: "§ 8",
      title: "Gewährleistung und Haftung",
      blocks: [
        {
          type: "p",
          text: "Scholar wird unentgeltlich bereitgestellt. Eine Gewähr für die Richtigkeit, Vollständigkeit, Aktualität, Verfügbarkeit oder Eignung der Inhalte für einen bestimmten Zweck wird — soweit gesetzlich zulässig — nicht übernommen. Maßgeblich ist stets die amtliche Primärquelle.",
        },
        {
          type: "p",
          text: "Caelex haftet — gleich aus welchem Rechtsgrund — unbeschränkt nur (i) bei Vorsatz und grober Fahrlässigkeit, (ii) bei der Verletzung von Leben, Körper oder Gesundheit, (iii) nach den zwingenden Vorschriften des Produkthaftungsgesetzes sowie (iv) im Umfang einer von Caelex übernommenen Garantie.",
        },
        {
          type: "p",
          text: "Bei der leicht fahrlässigen Verletzung einer wesentlichen Vertragspflicht (einer Pflicht, deren Erfüllung die ordnungsgemäße Durchführung erst ermöglicht und auf deren Einhaltung Sie regelmäßig vertrauen dürfen — Kardinalpflicht) ist die Haftung auf den bei Vertragsschluss typischerweise vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.",
        },
        {
          type: "p",
          text: "Da Scholar unentgeltlich überlassen wird, haftet Caelex nach den §§ 521, 599 BGB (Schenkungs-/Leihrecht) zudem nur für Vorsatz und grobe Fahrlässigkeit, soweit dies weiter reicht als die vorstehenden Beschränkungen. Eine Haftung für Entscheidungen, die Sie auf Grundlage der Inhalte treffen, ist im gesetzlich zulässigen Umfang ausgeschlossen; die vorstehenden Haftungsgrenzen bleiben unberührt.",
        },
      ],
    },
    {
      id: "s9",
      number: "§ 9",
      title: "Datenschutz",
      blocks: [
        {
          type: "p",
          text: "Die Verarbeitung personenbezogener Daten im Zusammenhang mit Scholar richtet sich nach der Datenschutzerklärung. Im B2B2C-Modell ist die lizenzierende Hochschule für den vertraglich beauftragten Dienst Verantwortliche und Caelex insoweit Auftragsverarbeiter; für eigene Zwecke (Produkt, Sicherheit, KI) ist Caelex eigenständig Verantwortlicher. Einzelheiten, einschließlich Ihrer Betroffenenrechte, enthält die Datenschutzerklärung.",
        },
      ],
    },
    {
      id: "s10",
      number: "§ 10",
      title: "Sperrung und Beendigung",
      blocks: [
        {
          type: "p",
          text: "Caelex kann den Zugang ganz oder teilweise vorübergehend sperren oder dauerhaft beenden, wenn ein wichtiger Grund vorliegt — insbesondere bei einem Verstoß gegen diese Nutzungsbedingungen oder die Nutzungsrichtlinie, bei missbräuchlicher Nutzung oder zur Abwehr von Gefahren für den Dienst, andere Nutzerinnen und Nutzer oder Dritte.",
        },
        {
          type: "p",
          text: "Ihre Zugangsberechtigung endet ferner mit dem Ende Ihrer Zugehörigkeit zur lizenzierenden Hochschule oder mit dem Ende von deren Lizenz. Regelungen zur Löschung Ihrer Daten enthält die Datenschutzerklärung; eine Selbstbedienungs-Löschung Ihres Kontos ist in den Einstellungen verfügbar.",
        },
      ],
    },
    {
      id: "s11",
      number: "§ 11",
      title: "Änderungen dieser Nutzungsbedingungen",
      blocks: [
        {
          type: "p",
          text: "Caelex kann diese Nutzungsbedingungen mit Wirkung für die Zukunft ändern, soweit dies erforderlich ist und die Änderung für Sie zumutbar ist, insbesondere zur Anpassung an geänderte Rechtslage, Rechtsprechung oder den Funktionsumfang. Die jeweils geltende Fassung wird unter Angabe von Stand und Version veröffentlicht.",
        },
        {
          type: "p",
          text: "Wesentliche Änderungen werden in geeigneter Weise kenntlich gemacht. Mit der fortgesetzten Nutzung nach Inkrafttreten einer geänderten Fassung gilt diese als angenommen, soweit gesetzlich zulässig.",
        },
      ],
    },
    {
      id: "s12",
      number: "§ 12",
      title: "Anwendbares Recht und Schlussbestimmungen",
      blocks: [
        {
          type: "p",
          text: "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften des Staates Ihres gewöhnlichen Aufenthalts bleiben unberührt.",
        },
        {
          type: "p",
          text: "Die Europäische Kommission stellt unter ec.europa.eu/consumers/odr eine Plattform zur Online-Streitbeilegung (OS-Plattform) bereit. Caelex ist nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
        },
        {
          type: "definition",
          term: "Salvatorische Klausel.",
          text: "Sollte eine Bestimmung dieser Nutzungsbedingungen ganz oder teilweise unwirksam sein oder werden, so bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.",
        },
        {
          type: "p",
          text: "Kontakt: Caelex, Inhaber Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Deutschland — cs@caelex.eu.",
        },
      ],
    },
  ],
};
