import type { LegalDocument, LegalSection } from "@/lib/legal/types";

export const TERMS_DE: LegalDocument = {
  lang: "de",
  title: "Allgemeine Geschäftsbedingungen",
  subtitle:
    "Verbindliche Nutzungsbedingungen der Caelex-Plattform und aller zugehörigen Produkte",
  version: "Version 3.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Caelex betreibt eine spezialisierte Software-Plattform für die regulatorische Compliance in der Raumfahrt. Diese Allgemeinen Geschäftsbedingungen (AGB) regeln das Vertragsverhältnis zwischen dem Anbieter und jedem Nutzer der Plattform.",
    "Diese AGB sind bewusst als Gesamtwerk konzipiert: Paragraph 1 bis 35 gelten für alle Produkte; die Anhänge A bis E ergänzen sie für bestimmte Produktlinien (Atlas, Assure, Academy, API/Widget, Astra). Bei Widersprüchen gelten die Anhänge vorrangig, soweit dort ausdrücklich bestimmt.",
    "Caelex ist weder Rechtsanwaltskanzlei noch Steuerberatung noch Finanzdienstleister. Die Plattform ersetzt keine individuelle Beratung durch qualifizierte Fachpersonen (§ 5).",
  ],
  sections: [
    {
      id: "s1",
      number: "§ 1",
      title: "Geltungsbereich",
      blocks: [
        {
          type: "p",
          text: "(1) Diese AGB gelten für alle gegenwärtigen und zukünftigen Verträge zwischen Caelex, Inhaber Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Deutschland (nachfolgend „Anbieter“ oder „Caelex“) und dem Kunden über die Nutzung der Caelex-Plattform einschließlich aller in § 4 genannten Produkte und Leistungen.",
        },
        {
          type: "p",
          text: "(2) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des Kunden werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich und in Textform zu. Dies gilt auch dann, wenn der Anbieter in Kenntnis der Bedingungen des Kunden Leistungen vorbehaltlos ausführt.",
        },
        {
          type: "p",
          text: "(3) Diese AGB gelten sowohl für Verbraucher (§ 13 BGB) als auch für Unternehmer (§ 14 BGB) und juristische Personen des öffentlichen Rechts. Für Verbraucher gelten zusätzlich die besonderen Schutzregelungen nach § 15 (Widerrufsrecht) und § 32 (Verbraucherschutz).",
        },
        {
          type: "p",
          text: "(4) Vorrangregelung bei Konflikten zwischen Vertragsdokumenten: (a) individuell verhandelte schriftliche Vereinbarungen gehen vor; (b) Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO gehen für die dort geregelten Gegenstände vor; (c) produktspezifische Anhänge (A bis E dieser AGB) gehen den Hauptklauseln vor, soweit sie dies ausdrücklich bestimmen; (d) im Übrigen gelten diese AGB.",
        },
      ],
    },
    {
      id: "s2",
      number: "§ 2",
      title: "Definitionen",
      blocks: [
        {
          type: "p",
          text: "Für diese AGB gelten folgende Begriffsbestimmungen:",
        },
        {
          type: "definition",
          term: "Plattform",
          text: "die gesamte von Caelex bereitgestellte Software, Infrastruktur und Benutzeroberfläche unter caelex.eu und verbundenen Domains, einschließlich aller Produkte nach § 4.",
        },
        {
          type: "definition",
          term: "Produkte",
          text: "die einzelnen funktionalen Module der Plattform, insbesondere Atlas (regulatorische Datenbank), Assure (Due-Diligence-Suite), Academy (Schulungen), API und Widget, Astra (KI-Assistent), Mission Control, Ephemeris, NCA Portal, Digital Twin, Sentinel, Verity, Generate sowie das Compliance-Dashboard.",
        },
        {
          type: "definition",
          term: "Inhalte",
          text: "sämtliche textlichen, grafischen, audiovisuellen, strukturierten oder ausführbaren Elemente der Plattform, einschließlich regulatorischer Mappings, Gesetzestexte, Assessment-Logik, Compliance-Algorithmen, Datenbank-Einträgen, Decision-Trees und aller dynamisch erzeugten Ausgaben.",
        },
        {
          type: "definition",
          term: "Kundendaten",
          text: "alle Daten, Dokumente, Eingaben und sonstigen Informationen, die der Kunde oder seine Nutzer in die Plattform hochladen, eingeben oder über die API übermitteln.",
        },
        {
          type: "definition",
          term: "KI-Ausgaben",
          text: "Inhalte, die durch Large Language Models oder andere Machine-Learning-Systeme auf der Plattform generiert werden, insbesondere durch Astra, Generate 2.0 oder automatische Dokumentengenerierung.",
        },
        {
          type: "definition",
          term: "Nutzer",
          text: "jede natürliche Person, die im Namen des Kunden auf die Plattform zugreift, einschließlich Mitarbeiter, Auftragnehmer und autorisierter Dritter.",
        },
        {
          type: "definition",
          term: "Verbraucher / Unternehmer",
          text: "Verbraucher i.S.d. § 13 BGB ist jede natürliche Person, die zu überwiegend privaten Zwecken handelt; Unternehmer i.S.d. § 14 BGB ist jede natürliche oder juristische Person, die in Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit handelt.",
        },
      ],
    },
    {
      id: "s3",
      number: "§ 3",
      title: "Vertragsschluss",
      blocks: [
        {
          type: "p",
          text: "(1) Die Darstellung der Plattform und einzelner Produkte stellt kein bindendes Angebot dar, sondern eine unverbindliche Aufforderung an den Kunden, seinerseits ein Angebot abzugeben.",
        },
        {
          type: "p",
          text: "(2) Der Vertrag kommt zustande (a) bei der kostenlosen Registrierung durch Anlegen eines Accounts und ausdrückliche Bestätigung dieser AGB per Checkbox („Ich habe die AGB gelesen und akzeptiere sie“); (b) bei kostenpflichtigen Tarifen zusätzlich durch Bestätigung des Tarifs und erfolgreichen Zahlungsabschluss; (c) bei Enterprise-Verträgen durch Gegenzeichnung eines individuell ausgehandelten Master Service Agreement.",
        },
        {
          type: "p",
          text: "(3) Der Anbieter bestätigt den Vertragsschluss per E-Mail. Die Bestätigung enthält die bei Vertragsschluss geltende AGB-Version; diese Version wird 10 Jahre archiviert und dem Kunden auf Anforderung zur Verfügung gestellt.",
        },
        {
          type: "p",
          text: "(4) Der Anbieter behält sich vor, den Vertragsschluss im Einzelfall ohne Angabe von Gründen abzulehnen, insbesondere bei Verdacht auf Verstöße gegen § 11 (Verbotene Aktivitäten), § 23 (Export-Kontrolle) oder § 24 (Anti-Korruption).",
        },
      ],
    },
    {
      id: "s4",
      number: "§ 4",
      title: "Leistungen und Produkte",
      blocks: [
        {
          type: "p",
          text: "(1) Gegenstand des Vertrages ist die Bereitstellung der Plattform in dem zum Zeitpunkt des Vertragsschlusses vereinbarten Leistungsumfang. Der konkrete Leistungsumfang ergibt sich aus dem gewählten Tarif, dem individuellen Angebot oder Master Service Agreement.",
        },
        {
          type: "p",
          text: "(2) Die Plattform umfasst insbesondere folgende Produktlinien, deren Funktionsumfang tarif- und laufzeitabhängig variiert:",
        },
        {
          type: "ul",
          items: [
            "Atlas — durchsuchbare Datenbank für Weltraumrecht, internationale Verträge und nationale Gesetzgebung (Anhang A)",
            "Assure — Due-Diligence-Werkzeuge für Investorenbeziehungen und Investment-Readiness-Bewertungen (Anhang B)",
            "Academy — Schulungen, Simulationen und Klassenräume für Raumfahrt-Compliance (Anhang C)",
            "API und Widget — programmatische und einbettbare Zugänge zu Compliance-Daten (Anhang D)",
            "Astra — KI-gestützter Compliance-Assistent (Anhang E)",
            "Mission Control, Ephemeris, Digital Twin, Sentinel — Satelliten-Telemetrie- und Forecast-Werkzeuge",
            "NCA Portal, Verity, Generate — Werkzeuge zur Vorbereitung behördlicher Einreichungen und Compliance-Dokumentation",
            "Assessments — Compliance-Assessments zum EU Space Act, NIS2, nationalem Weltraumrecht und unifizierte Assessments",
          ],
        },
        {
          type: "p",
          text: "(3) Der Anbieter ist berechtigt, Funktionen jederzeit zu ändern, weiterzuentwickeln oder — mit angemessener Vorankündigung von mindestens 30 Tagen — einzustellen, soweit dies den bei Vertragsschluss vereinbarten Kernleistungsumfang nicht wesentlich beeinträchtigt. Wesentliche Einschränkungen berechtigen den Kunden zur außerordentlichen Kündigung gemäß § 14 Abs. 5.",
        },
        {
          type: "p",
          text: "(4) Die Plattform wird als Software-as-a-Service im Wege des entgeltlichen oder kostenlosen Fernzugriffs bereitgestellt. Ein Anspruch auf Installation vor Ort, Quellcodeherausgabe oder zusätzliche individuelle Anpassungen besteht nicht.",
        },
      ],
    },
    {
      id: "s5",
      number: "§ 5",
      title: "Keine Rechts-, Anlage- oder Finanzberatung",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "Diese Klausel ist zentraler Bestandteil des Vertrages. Der Kunde bestätigt durch Annahme dieser AGB ausdrücklich, die folgenden Klarstellungen verstanden zu haben.",
        },
        {
          type: "p",
          text: "(1) Caelex ist weder zugelassene Rechtsanwaltskanzlei noch Kammeranwalt noch sonstiger registrierter Rechtsdienstleister im Sinne des Rechtsdienstleistungsgesetzes (RDG). Die Plattform erbringt ausdrücklich keine Rechtsdienstleistung. Sämtliche auf der Plattform bereitgestellten Informationen, Mappings, Assessments, Entscheidungsbäume, Checklisten und KI-Ausgaben sind informatorische Werkzeuge und ersetzen keine individuelle Rechtsberatung.",
        },
        {
          type: "p",
          text: "(2) Caelex ist weder Wertpapierinstitut i.S.d. Wertpapierinstitutsgesetzes (WpIG) noch Kreditinstitut i.S.d. Kreditwesengesetzes (KWG). Insbesondere die Produktlinie Assure (einschließlich Regulatory Readiness Score, Regulatory Credit Rating und Investment Readiness Score) stellt keine Anlageberatung, Anlagevermittlung, Finanzanalyse oder sonstige erlaubnispflichtige Finanzdienstleistung dar. Assure-Ausgaben sind qualitative Einschätzungen regulatorischer Bereitschaft und ausdrücklich keine Empfehlung zum Kauf, Verkauf oder Halten von Finanzinstrumenten.",
        },
        {
          type: "p",
          text: "(3) Caelex ist keine Steuerberatung i.S.d. Steuerberatungsgesetzes, keine Wirtschaftsprüfungsgesellschaft i.S.d. Wirtschaftsprüferordnung und keine Versicherungsvermittlung.",
        },
        {
          type: "p",
          text: "(4) Der Kunde ist verpflichtet, vor jeder rechtlich, finanziell oder regulatorisch relevanten Entscheidung qualifizierten, individuellen Rat bei zugelassenen Berufsträgern einzuholen (Rechtsanwalt, Steuerberater, Wirtschaftsprüfer, zugelassener Finanzdienstleister). Dies gilt insbesondere vor jeder Einreichung bei Behörden, vor Vertragsabschlüssen mit regulatorischer Relevanz, vor Investitionsentscheidungen und vor Compliance-Zertifizierungen.",
        },
        {
          type: "p",
          text: "(5) Die Plattform stellt keine verbindliche Feststellung regulatorischer Pflichten dar. Assessments und Ergebnisse dienen ausschließlich der internen Vorbereitung und sind keine behördliche oder drittwirkende Feststellung.",
        },
        {
          type: "p",
          text: "(6) Der Anbieter übernimmt keine Haftung für Entscheidungen, die der Kunde oder Dritte auf Basis von Plattform-Ausgaben treffen, soweit gesetzlich zulässig. Die weitergehenden Haftungsregelungen in § 26 bleiben unberührt.",
        },
        {
          type: "p",
          text: "(7) Internationale Klarstellung — Unauthorized Practice of Law (UPL). Wenn der Kunde seinen Sitz in einer Jurisdiktion außerhalb Deutschlands hat, gelten dortige Berufsrechts- und UPL-Regelungen kumulativ neben den deutschen. Caelex ist nicht zugelassen als 'solicitor', 'barrister', 'avocat', 'abogado', 'advocaat' oder funktional vergleichbare Stellung in anderen Jurisdiktionen, insbesondere nicht als Rechtsdienstleister im Sinne folgender Regime: (a) Vereinigtes Königreich — Legal Services Act 2007 ('reserved legal activities'); (b) Vereinigte Staaten — bundesstaatliche Bar-Zulassungsregeln einschließlich ABA Model Rule 5.5 (multijurisdictional practice); (c) Frankreich — Loi n° 71-1130 vom 31. Dezember 1971; (d) Italien — DPR 138/2012; (e) Spanien — Ley 34/2006 sobre el acceso a las profesiones de Abogado y Procurador; (f) Niederlande — Advocatenwet; (g) Österreich, Schweiz und alle weiteren Jurisdiktionen, in denen Rechtsberatung berufsrechtlich reglementiert ist. Die Plattform erbringt in keiner dieser Jurisdiktionen Rechtsdienstleistungen.",
        },
        {
          type: "p",
          text: "(8) Rollenbasierte Verantwortungsverteilung. Caelex bietet zwei Hauptzugänge mit unterschiedlichen Verantwortungsprofilen: (a) Caelex Comply (Betreiber-Workspace) — der Kunde ist für die Einholung qualifizierten Rates selbst verantwortlich (Abs. 4); (b) Atlas (Anwalts-Workspace) — die nutzende Anwältin / der nutzende Anwalt bleibt allein verantwortliche Berufsträgerin bzw. allein verantwortlicher Berufsträger gegenüber ihren bzw. seinen Mandanten und führt für jede KI-Ausgabe eine eigenständige fachliche Prüfung durch (siehe Anhang E sowie /legal/ai-disclosure § 5a). Atlas-Ausgaben sind anwaltliche Hilfsmittel; sie ersetzen weder die anwaltliche Sorgfaltspflicht noch die berufsrechtlichen Pflichten gegenüber dem Mandanten.",
        },
        {
          type: "p",
          text: "(9) Reichweite der Compliance-Tools. Module wie Authorization Workflow, NCA-Portal, Deadline-Tracker und ähnliche operative Hilfen unterstützen die interne Vorbereitung. Die finale Verantwortung für Vollständigkeit und Richtigkeit jeder Behörden-Einreichung liegt beim Kunden bzw. bei der/dem zugelassenen Berufsträger:in, die/der die Einreichung autorisiert. Caelex ist weder bevollmächtigt noch zugelassen, Einreichungen im Namen des Kunden zu unterzeichnen oder als Verfahrensbevollmächtigte:r aufzutreten.",
        },
      ],
    },
    {
      id: "s6",
      number: "§ 6",
      title: "Datenqualität und Aktualität",
      blocks: [
        {
          type: "p",
          text: "(1) Der Anbieter bemüht sich, die auf der Plattform bereitgestellten regulatorischen Informationen aktuell, vollständig und richtig zu halten. Eine Gewähr für Aktualität, Vollständigkeit oder Richtigkeit wird jedoch ausdrücklich nicht übernommen, soweit gesetzlich zulässig.",
        },
        {
          type: "p",
          text: "(2) Regulatorische Inhalte unterliegen kontinuierlichen Änderungen durch Gesetzgeber, Behörden und internationale Organisationen. Der Kunde trägt die Verantwortung, für jede konkrete Entscheidung die Aktualität der herangezogenen Informationen gegenüber der jeweiligen Primärquelle (EUR-Lex, BGBl., Official Journal, UN Treaty Collection etc.) eigenständig zu verifizieren.",
        },
        {
          type: "p",
          text: "(3) Verweise auf Drittquellen (EUR-Lex, UNOOSA, CelesTrak, ITU, nationale Amtsblätter) dienen der Verifizierung. Der Anbieter hat keinen Einfluss auf Verfügbarkeit, Inhalt oder Richtigkeit dieser Drittquellen und haftet nicht für deren Ausfall, Änderung oder Fehlerhaftigkeit.",
        },
        {
          type: "p",
          text: "(4) „Last-verified“- und Link-Status-Kennzeichnungen sind Best-Effort-Angaben und stellen keine garantierte Aussage zur Aktualität des verlinkten Inhalts dar.",
        },
      ],
    },
    {
      id: "s7",
      number: "§ 7",
      title: "Nutzung von KI-Funktionen",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "KI-Ausgaben können unvollständig, veraltet, fehlerhaft oder fabriziert sein (sog. „Halluzinationen“). Der Kunde ist verpflichtet, jede KI-Ausgabe vor Verwendung durch qualifizierte Fachpersonen prüfen zu lassen.",
        },
        {
          type: "p",
          text: "(1) Die Plattform enthält KI-Funktionen auf Basis von Large Language Models und weiteren Machine-Learning-Systemen, insbesondere in Astra (Anhang E), Generate 2.0 und der automatischen Dokumentengenerierung.",
        },
        {
          type: "p",
          text: "(2) KI-Ausgaben werden statistisch erzeugt und können unvollständig, ungenau, veraltet, widersprüchlich oder erfunden sein. KI-Ausgaben stellen keine verbindliche rechtliche, regulatorische oder finanzielle Einschätzung dar.",
        },
        {
          type: "p",
          text: "(3) Der Kunde ist allein verantwortlich für (a) die Prüfung jeder KI-Ausgabe auf Richtigkeit und Anwendbarkeit im konkreten Fall, (b) die Einholung qualifizierter Beratung vor Verwendung, (c) die Einhaltung aller einschlägigen Regeln über KI-Transparenz und -Kennzeichnung gegenüber Dritten.",
        },
        {
          type: "p",
          text: "(4) Der Anbieter haftet nicht für Schäden, die aus der Übernahme oder Weitergabe ungeprüfter KI-Ausgaben entstehen, insbesondere nicht für Ablehnungen, Verzögerungen oder Sanktionen im Rahmen behördlicher Einreichungen.",
        },
        {
          type: "p",
          text: "(5) Der Anbieter beachtet die Verordnung (EU) 2024/1689 (KI-Verordnung / AI Act) in ihrer jeweils geltenden Fassung. Soweit der Anbieter als Betreiber hochrisikobehafteter KI-Systeme einzustufen wäre, werden die entsprechenden Pflichten in produktspezifischen Anhängen geregelt.",
        },
        {
          type: "p",
          text: "(6) Der Kunde stellt sicher, dass er bei Weitergabe KI-generierter Inhalte an Dritte oder Behörden die gegebenenfalls geltenden Kennzeichnungspflichten einhält.",
        },
      ],
    },
    {
      id: "s8",
      number: "§ 8",
      title: "Nutzungsrechte an der Plattform",
      blocks: [
        {
          type: "p",
          text: "(1) Die Plattform und ihre Inhalte sind urheber-, datenbank- und geschäftsgeheimnisrechtlich geschützt. Alle Rechte, die nicht ausdrücklich eingeräumt werden, verbleiben beim Anbieter oder seinen Lizenzgebern.",
        },
        {
          type: "p",
          text: "(2) Der Anbieter räumt dem Kunden für die Dauer des Vertrages ein einfaches, nicht ausschließliches, nicht unterlizenzierbares, nicht übertragbares, widerrufliches Nutzungsrecht an der Plattform für den bestimmungsgemäßen Zweck ein. Das Nutzungsrecht umfasst die Nutzung durch autorisierte Nutzer des Kunden im Umfang des jeweils gebuchten Tarifs.",
        },
        {
          type: "p",
          text: "(3) Das Nutzungsrecht erlaubt nicht: (a) Vervielfältigung, Verbreitung oder öffentliche Zugänglichmachung der Inhalte über den bestimmungsgemäßen Gebrauch hinaus; (b) Erstellung abgeleiteter Werke; (c) Zugriff durch automatisierte Mittel außerhalb der bereitgestellten API; (d) Weitergabe der Zugangsdaten; (e) Nutzung zur Entwicklung, zum Training oder zur Verbesserung konkurrierender Produkte oder KI-Modelle.",
        },
        {
          type: "p",
          text: "(4) Die regulatorischen Mappings, Entscheidungsbäume, Scoring-Algorithmen, Compliance-Checklisten und kuratierten Datenbank-Einträge sind proprietäre Geschäftsgeheimnisse des Anbieters i.S.d. Geschäftsgeheimnisgesetzes (GeschGehG) und stellen die zentrale wirtschaftliche Leistung des Anbieters dar.",
        },
        {
          type: "p",
          text: "(5) Die Marken „Caelex“, „Atlas“, „Assure“, „Astra“, „Academy“, „Mission Control“, „Ephemeris“, „Verity“ sowie zugehörige Logos und Wort-/Bildmarken sind Eigentum des Anbieters. Ihre Nutzung durch den Kunden bedarf der vorherigen schriftlichen Zustimmung; zulässig ist lediglich die Referenzierung in neutraler Form unter Wahrung der markenrechtlichen Richtigkeit.",
        },
      ],
    },
    {
      id: "s9",
      number: "§ 9",
      title: "Kundendaten und Rechte daran",
      blocks: [
        {
          type: "p",
          text: "(1) Der Kunde bleibt Inhaber aller Rechte an Kundendaten. Der Anbieter erwirbt keine Eigentumsrechte an den vom Kunden hochgeladenen Inhalten.",
        },
        {
          type: "p",
          text: "(2) Der Kunde räumt dem Anbieter ein einfaches, nicht übertragbares, zeitlich auf die Vertragslaufzeit sowie nachvertraglich bis zum Ablauf der Löschfristen beschränktes Nutzungsrecht an den Kundendaten ein, soweit dies für die Bereitstellung der Leistung, für Backups, für die Einhaltung gesetzlicher Aufbewahrungspflichten und für die Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen erforderlich ist.",
        },
        {
          type: "p",
          text: "(3) Der Kunde sichert zu, dass er berechtigt ist, die Kundendaten der Plattform zur Verfügung zu stellen, und dass die Kundendaten keine Rechte Dritter verletzen. Für Verstöße stellt der Kunde den Anbieter gemäß § 27 frei.",
        },
        {
          type: "p",
          text: "(4) Der Anbieter verwendet Kundendaten nicht zum Training eigener oder fremder KI-Modelle, es sei denn, der Kunde hat ausdrücklich und widerruflich zugestimmt. Aggregierte, anonymisierte Nutzungsstatistiken ohne Personen- oder Betriebsgeheimnisbezug bleiben hiervon unberührt.",
        },
        {
          type: "p",
          text: "(5) Der Kunde kann seine Kundendaten während der Vertragslaufzeit und innerhalb von 30 Tagen nach Vertragsende in einem strukturierten, gängigen und maschinenlesbaren Format exportieren. Danach werden Kundendaten unter Berücksichtigung gesetzlicher Aufbewahrungsfristen gelöscht oder anonymisiert.",
        },
      ],
    },
    {
      id: "s10",
      number: "§ 10",
      title: "Feedback-Lizenz",
      blocks: [
        {
          type: "p",
          text: "(1) Übermittelt der Kunde Vorschläge, Ideen, Fehlermeldungen, Bewertungen oder sonstige Rückmeldungen zur Plattform („Feedback“), räumt er dem Anbieter ein unbefristetes, weltweites, unentgeltliches, unterlizenzierbares und übertragbares Nutzungsrecht an diesem Feedback ein.",
        },
        {
          type: "p",
          text: "(2) Der Anbieter ist nicht verpflichtet, Feedback umzusetzen, dessen Herkunft zu kennzeichnen oder eine Vergütung zu zahlen.",
        },
        {
          type: "p",
          text: "(3) Kundendaten im Sinne von § 9 Abs. 1 sind kein Feedback. Die Abgrenzung erfolgt nach dem Zweck der Übermittlung: Feedback betrifft die Plattform selbst, nicht den operativen Betrieb des Kunden.",
        },
      ],
    },
  ],
  annexes: [
    {
      id: "annex-a",
      number: "Anhang A",
      title: "Atlas — Regulatorische Datenbank",
      blocks: [
        {
          type: "p",
          text: "Dieser Anhang ergänzt die Hauptklauseln für die Nutzung des Produkts Atlas. Bei Widersprüchen geht dieser Anhang vor.",
        },
        {
          type: "p",
          text: "(1) Atlas ist eine kuratierte Datenbank internationaler, EU- und nationaler Weltraumrechtsakte. Die Inhalte werden durch den Anbieter zusammengestellt, strukturiert und mit Verweisen auf Primärquellen versehen.",
        },
        {
          type: "p",
          text: "(2) § 5 (keine Rechtsberatung), § 6 (Datenqualität) und § 7 (KI-Funktionen, soweit Astra in Atlas eingebunden ist) gelten ausdrücklich. Insbesondere die Kategorisierung von Instrumenten, die Zuordnung zu Ratifikatoren, die Einordnung von Gültigkeit und der Status von Links sind Hilfestellungen und ersetzen nicht die Prüfung der Primärquelle.",
        },
        {
          type: "p",
          text: "(3) Die Atlas-Datenbanken, Mappings und Struktur-Eintragungen sind Datenbankwerk i.S.d. §§ 87a ff. UrhG. Das Recht des Datenbankherstellers verbleibt ausschließlich beim Anbieter. Eine systematische oder wesentliche Entnahme ist nach § 11 Abs. 1 dieser AGB untersagt.",
        },
        {
          type: "p",
          text: "(4) Atlas kann auch öffentlich zugängliche Teile enthalten. Für authentifizierte Funktionen (Bookmarks-Sync, Comparator, Download von PDF-Memos) gilt der Nutzerstatus; öffentliche Teile unterliegen denselben Nutzungsbeschränkungen nach § 11.",
        },
      ],
    },
    {
      id: "annex-b",
      number: "Anhang B",
      title: "Assure — Keine Anlage- oder Finanzberatung",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "Assure ist ein Werkzeug zur qualitativen Einschätzung regulatorischer Bereitschaft. Es ist keine Anlageberatung, Anlagevermittlung, Finanzanalyse oder sonstige erlaubnispflichtige Finanzdienstleistung.",
        },
        {
          type: "p",
          text: "(1) Dieser Anhang ergänzt § 5 Abs. 2 und gilt für die Produktlinie Assure einschließlich Regulatory Readiness Score (RRS), Regulatory Credit Rating (RCR), Investment Readiness Score (IRS), Risk Register, Scenario Analysis, Data-Room-Funktionen und Investor-Update-Generierung.",
        },
        {
          type: "p",
          text: "(2) Sämtliche Assure-Ausgaben sind qualitative, regelbasierte Einschätzungen regulatorischer Parameter. Sie stellen ausdrücklich keine Empfehlung zum Kauf, Verkauf oder Halten von Finanzinstrumenten und keine Bewertung i.S.d. Wertpapierdienstleistungen dar.",
        },
        {
          type: "p",
          text: "(3) Assure-Scores beruhen auf Eingaben des Kunden und sind nur so valide wie diese Eingaben. Der Kunde ist allein für Richtigkeit, Vollständigkeit und Aktualität seiner Eingaben verantwortlich.",
        },
        {
          type: "p",
          text: "(4) Der Kunde verpflichtet sich, Assure-Ausgaben nicht als Grundlage für Anlageentscheidungen ohne qualifizierte Prüfung durch lizenzierte Finanzdienstleister zu verwenden. Bei Weitergabe an Investoren oder Dritte ist der Kunde verpflichtet, diesen den informatorischen Charakter der Ausgaben und den Haftungsausschluss gemäß § 5 und § 26 kenntlich zu machen.",
        },
        {
          type: "p",
          text: "(5) Data-Room-Funktionen dienen ausschließlich der Organisation und dem geschützten Austausch bestehender Dokumente. Der Anbieter ist kein Treuhänder, Escrow-Dienst oder Wirtschaftsprüfer.",
        },
        {
          type: "p",
          text: "(6) Der Anbieter übernimmt keine Haftung für Investitionsentscheidungen, die auf Assure-Ausgaben beruhen, und keine Haftung gegenüber Dritten, denen der Kunde Assure-Ausgaben zur Verfügung stellt.",
        },
      ],
    },
    {
      id: "annex-c",
      number: "Anhang C",
      title: "Academy — Schulungen und Zertifizierungen",
      blocks: [
        {
          type: "p",
          text: "(1) Academy umfasst Schulungsmodule, Simulationen, Klassenräume und Badge-Vergabe.",
        },
        {
          type: "p",
          text: "(2) Abzeichen, Simulations-Abschlüsse und Teilnahmebescheinigungen der Academy haben ausschließlich internen Charakter und stellen keine staatlich anerkannte Zertifizierung, keine Berufsqualifikation und keine akademische Leistung dar.",
        },
        {
          type: "p",
          text: "(3) Der Anbieter gewährleistet keine Prüfungserfolge und keine Erreichung bestimmter Lernziele durch den Kunden oder seine Nutzer.",
        },
        {
          type: "p",
          text: "(4) Schulungsinhalte werden nach dem jeweils aktuellen Stand kuratiert. § 6 (Datenqualität) gilt entsprechend.",
        },
      ],
    },
    {
      id: "annex-d",
      number: "Anhang D",
      title: "API und Widget",
      blocks: [
        {
          type: "p",
          text: "(1) Die Nutzung der Caelex API und des Widgets unterliegt den Hauptklauseln und diesem Anhang.",
        },
        {
          type: "p",
          text: "(2) API-Schlüssel sind vertraulich und dürfen nicht an Dritte weitergegeben werden. Rate-Limits gemäß Tarif sind einzuhalten. Überschreitungen können zu temporären Sperrungen oder Nachberechnung führen.",
        },
        {
          type: "p",
          text: "(3) Der Anbieter ist berechtigt, API-Versionen nach einer Ankündigungsfrist von mindestens 90 Tagen zu deprecaten. Der Kunde ist verantwortlich, seine Integration rechtzeitig anzupassen.",
        },
        {
          type: "p",
          text: "(4) Betreibt der Kunde eine Integration oder ein eigenes Produkt, das die Caelex-API oder das Widget nutzt, haftet der Kunde allein gegenüber seinen Endkunden. Der Anbieter begründet keine Rechtsbeziehung zu Endkunden des Kunden.",
        },
        {
          type: "p",
          text: "(5) Der Kunde sichert zu, dass seine Integration die Caelex-Inhalte nicht als eigene darstellt und eine angemessene Quellenangabe „Powered by Caelex“ enthält, soweit dies im Widget vorgesehen ist.",
        },
        {
          type: "p",
          text: "(6) Die Public-API-Endpunkte unterliegen zusätzlich einer Fair-Use-Richtlinie. Missbräuchliche Nutzung, insbesondere systematische Extraktion, berechtigt zur sofortigen Sperrung.",
        },
      ],
    },
    {
      id: "annex-e",
      number: "Anhang E",
      title: "Astra — KI-Compliance-Assistent",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "Astra ist ein KI-gestützter Assistent. Ausgaben sind informatorisch und ersetzen keine qualifizierte Beratung. Verwende Ausgaben nicht ungeprüft für behördliche Einreichungen oder Compliance-Entscheidungen.",
        },
        {
          type: "p",
          text: "(1) Astra beantwortet Fragen zu Weltraumrecht, Compliance-Anforderungen und Plattform-Inhalten. Astra nutzt Large Language Models externer Anbieter (siehe § 20 Abs. 3).",
        },
        {
          type: "p",
          text: "(2) § 7 (KI-Funktionen) gilt vollumfänglich. Astra-Ausgaben können unvollständig, veraltet, widersprüchlich oder erfunden sein.",
        },
        {
          type: "p",
          text: "(3) Astra darf nicht für Zwecke verwendet werden, die einer Rechtsberatung i.S.d. RDG gleichkommen, insbesondere nicht zur Einzelfallprüfung mit Bindungswirkung, nicht zur Erstellung behördlicher Einreichungen ohne Prüfung durch qualifizierte Berater und nicht zur Vertretung gegenüber Behörden.",
        },
        {
          type: "p",
          text: "(4) Der Anbieter verwendet vom Kunden über Astra eingegebene Inhalte zur Beantwortung der Anfrage. Eingaben werden gemäß § 9 Abs. 4 nicht zum Training eigener oder fremder Modelle verwendet. Aggregierte, anonymisierte Nutzungsmuster zur Plattform-Verbesserung sind hiervon unberührt.",
        },
        {
          type: "p",
          text: "(5) Astra-Konversationen werden zur Erbringung der Funktion und für Qualitätssicherung gespeichert. Der Kunde kann Konversationen jederzeit löschen; nach Löschung ist eine Wiederherstellung nicht möglich.",
        },
        {
          type: "p",
          text: "(6) Der Kunde darf Astra-Ausgaben weiterverwenden, ist aber verpflichtet, den Charakter als KI-generierten Inhalt bei Weitergabe an Dritte oder Behörden kenntlich zu machen, soweit gesetzlich oder vertraglich vorgeschrieben.",
        },
        {
          type: "p",
          text: "(7) Der Anbieter schließt die Haftung für Schäden aus der ungeprüften Verwendung von Astra-Ausgaben aus, soweit gesetzlich zulässig. § 26 gilt entsprechend.",
        },
      ],
    },
  ],
  contactLines: [
    "Caelex",
    "Inhaber: Julian Polleschner",
    "Am Maselakepark 37",
    "13587 Berlin, Deutschland",
    "",
    "Allgemeine Anfragen:",
    "mailto:cs@caelex.eu",
    "Rechtliche Anfragen & AGB:",
    "mailto:legal@caelex.eu",
    "Datenschutz:",
    "mailto:privacy@caelex.eu",
    "Sicherheitsmeldungen:",
    "mailto:security@caelex.eu",
  ],
  links: [
    { label: "English Version →", href: "/legal/terms-en" },
    { label: "Datenschutzerklärung", href: "/legal/privacy" },
    { label: "Cookie-Richtlinie", href: "/legal/cookies" },
    { label: "Impressum", href: "/legal/impressum" },
    { label: "AV-Vertrag / DPA", href: "/legal/dpa" },
    { label: "Sub-Auftragsverarbeiter", href: "/legal/sub-processors" },
  ],
};

// ─── §§ 11-20 ──────────────────────────────────────────────────────────

TERMS_DE.sections.push(
  {
    id: "s11",
    number: "§ 11",
    title: "Verbotene Aktivitäten und zulässige Nutzung",
    blocks: [
      {
        type: "p",
        text: "Dem Kunden und seinen Nutzern ist Folgendes untersagt; jeder Verstoß stellt eine wesentliche Vertragsverletzung dar und berechtigt den Anbieter zur sofortigen Sperrung des Zugangs sowie zur Geltendmachung von Schadensersatz und Unterlassungsansprüchen:",
      },
      {
        type: "ul",
        items: [
          "Reverse Engineering, Dekompilierung, Disassemblierung oder sonstige Ableitung von Quellcode, Algorithmen oder Datenstrukturen der Plattform, soweit dies nicht nach § 69e UrhG zwingend erlaubt ist;",
          "Scraping, Crawling, Spidering, systematisches Herunterladen oder sonstige automatisierte Extraktion von Inhalten außerhalb der bereitgestellten API und über deren Rate-Limits hinaus;",
          "Nutzung der Plattform, ihrer Inhalte oder KI-Ausgaben zum Training, zur Feinabstimmung oder zur Evaluierung eigener oder fremder KI-Modelle;",
          "Nutzung zur Entwicklung, zum Angebot oder zur Verbesserung konkurrierender Produkte oder Dienstleistungen;",
          "Umgehung oder Test von Sicherheitsmaßnahmen, Zugriffskontrollen oder Authentifizierungsverfahren ohne vorherige schriftliche Zustimmung;",
          "Weitergabe von Zugangsdaten, API-Schlüsseln oder Session-Tokens an Dritte sowie deren Veröffentlichung;",
          "Nutzung für rechtswidrige Zwecke, insbesondere zur Vorbereitung von Straftaten, zur Verletzung von Rechten Dritter oder zur Verletzung von Export- und Sanktionsvorschriften (§ 23);",
          "Hochladen von Schadsoftware, Schadcode oder rechtsverletzenden Inhalten;",
          "Vorsätzliche Falscheingaben zur Manipulation von Assessments, Ratings oder Scores;",
          "Neuveröffentlichung, Weiterverkauf oder Bereitstellung wesentlicher Teile der regulatorischen Datenbanken an Dritte;",
          "Framing, Mirroring oder sonstiges unmittelbares Einbetten der Plattform in Drittangebote außerhalb der hierfür vorgesehenen Widget- und API-Kanäle;",
          "Nutzung der Plattform durch mehr als die vertraglich vereinbarten Nutzer oder über die vertraglich vereinbarten Rate-Limits hinaus;",
          "Nutzung der Plattform gegen den Kunden (Benchmarking, Leistungsvergleiche zu Wettbewerbszwecken) ohne vorherige schriftliche Zustimmung.",
        ],
      },
      {
        type: "p",
        text: "Der Anbieter kann bei Verdacht auf Verstöße den Zugang zur Plattform vorübergehend beschränken oder sperren. Bei gesicherten Verstößen ist eine Sperrung bis zur Klärung sowie eine fristlose Kündigung zulässig. § 26 bleibt unberührt.",
      },
    ],
  },
  {
    id: "s12",
    number: "§ 12",
    title: "Account-Sicherheit",
    blocks: [
      {
        type: "p",
        text: "(1) Der Kunde ist verpflichtet, Zugangsdaten, Passwörter und Zwei-Faktor-Tokens vertraulich zu behandeln und vor unbefugtem Zugriff zu schützen. Passwörter dürfen nicht mit anderen Diensten geteilt werden.",
      },
      {
        type: "p",
        text: "(2) Bei Verdacht auf unbefugte Nutzung ist der Kunde verpflichtet, den Anbieter unverzüglich unter security@caelex.eu zu informieren und die betroffenen Zugangsdaten zu ändern.",
      },
      {
        type: "p",
        text: "(3) Der Kunde haftet für alle Aktivitäten unter seinem Account, es sei denn, er weist nach, dass die Aktivitäten ohne sein Verschulden durch Dritte erfolgt sind.",
      },
      {
        type: "p",
        text: "(4) Der Anbieter empfiehlt die Aktivierung der Zwei-Faktor-Authentifizierung und die Nutzung hardwaregestützter FIDO2/WebAuthn-Verfahren für privilegierte Accounts.",
      },
    ],
  },
  {
    id: "s13",
    number: "§ 13",
    title: "Preise, Zahlung, Preisanpassungen",
    blocks: [
      {
        type: "p",
        text: "(1) Die jeweils aktuellen Preise ergeben sich aus der Preisliste auf der Website, dem gewählten Tarif oder einem individuellen Angebot. Alle Preise verstehen sich in Euro zuzüglich der gesetzlichen Umsatzsteuer, sofern nicht ausdrücklich anders angegeben.",
      },
      {
        type: "p",
        text: "(2) Die Zahlung erfolgt per SEPA-Lastschrift, Kreditkarte oder auf Rechnung über den Zahlungsdienstleister Stripe Payments Europe Ltd. Der Kunde ermächtigt den Anbieter zum Einzug bei Fälligkeit.",
      },
      {
        type: "p",
        text: "(3) Rechnungen sind innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzug fällig, soweit nicht anders vereinbart. Bei Lastschrift und Kreditkartenzahlung gilt das Zahlungsdatum als Fälligkeitsdatum.",
      },
      {
        type: "p",
        text: "(4) Gerät der Kunde in Zahlungsverzug, ist der Anbieter nach vorheriger Mahnung und Fristsetzung berechtigt, den Zugang zur Plattform zu sperren. Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz (B2B; § 288 Abs. 2 BGB) bzw. 5 Prozentpunkten (B2C) sowie eine Verzugspauschale von 40 EUR bei B2B-Kunden (§ 288 Abs. 5 BGB) werden erhoben.",
      },
      {
        type: "p",
        text: "(5) Der Anbieter ist berechtigt, die Preise einmal jährlich mit einer Ankündigungsfrist von 60 Tagen anzupassen. Preiserhöhungen um mehr als 5 % über die allgemeine Teuerungsrate des Vorjahres hinaus (gemessen am Verbraucherpreisindex des Statistischen Bundesamts) berechtigen den Kunden zur außerordentlichen Kündigung zum Zeitpunkt des Inkrafttretens der Erhöhung.",
      },
      {
        type: "p",
        text: "(6) Sonder- und Zusatzleistungen (Overage, Add-Ons, Upgrades) werden zum Zeitpunkt der Buchung separat berechnet. Downgrades werden zum nächsten Abrechnungszyklus wirksam, ohne Rückerstattung bereits bezahlter Entgelte.",
      },
      {
        type: "p",
        text: "(7) Die Aufrechnung und Geltendmachung von Zurückbehaltungsrechten durch den Kunden ist beschränkt auf unbestrittene oder rechtskräftig festgestellte Gegenforderungen; diese Einschränkung gilt nicht gegenüber Verbrauchern.",
      },
    ],
  },
  {
    id: "s14",
    number: "§ 14",
    title: "Laufzeit, Verlängerung, Kündigung",
    blocks: [
      {
        type: "p",
        text: "(1) Kostenlose Accounts können jederzeit ohne Angabe von Gründen durch den Kunden oder den Anbieter gekündigt werden.",
      },
      {
        type: "p",
        text: "(2) Kostenpflichtige Tarife haben die im Tarif oder im individuellen Vertrag angegebene Mindestlaufzeit (in der Regel ein oder zwölf Monate). Sie verlängern sich nach Ablauf der Mindestlaufzeit automatisch auf unbestimmte Zeit und sind ab diesem Zeitpunkt jederzeit mit einer Frist von einem Monat kündbar. Diese Regelung entspricht § 309 Nr. 9 BGB in der seit 1. März 2022 geltenden Fassung.",
      },
      {
        type: "p",
        text: "(3) Der Anbieter stellt gemäß § 312k BGB eine Kündigungsschaltfläche bereit („Vertrag hier kündigen“), die ohne Anmeldung zugänglich ist. Die Kündigung ist daneben jederzeit in Textform per E-Mail an cs@caelex.eu oder über die Account-Einstellungen möglich.",
      },
      {
        type: "p",
        text: "(4) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt beiden Parteien unberührt. Wichtige Gründe sind insbesondere: wesentliche Vertragsverletzung, wiederholte Verstöße gegen diese AGB, Insolvenzantrag, wesentliche Änderung des Leistungsumfangs nach § 4 Abs. 3, wesentliche Preisanpassung nach § 13 Abs. 5.",
      },
      {
        type: "p",
        text: "(5) Mit Vertragsende erlöschen alle eingeräumten Nutzungsrechte. Kundendaten können gemäß § 9 Abs. 5 exportiert werden. Nach Ablauf der Exportfrist ist der Anbieter zur Löschung verpflichtet, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.",
      },
      {
        type: "p",
        text: "(6) Bei Kündigung durch den Kunden aus wichtigem Grund, den der Anbieter zu vertreten hat, erhält der Kunde eine anteilige Erstattung bereits geleisteter Vorauszahlungen.",
      },
    ],
  },
  {
    id: "s15",
    number: "§ 15",
    title: "Widerrufsrecht für Verbraucher",
    blocks: [
      {
        type: "p",
        text: "(1) Verbrauchern im Sinne des § 13 BGB steht bei Fernabsatzverträgen grundsätzlich ein Widerrufsrecht gemäß §§ 312g, 355 BGB zu. Die Widerrufsfrist beträgt 14 Tage ab Vertragsschluss.",
      },
      {
        type: "p",
        text: "(2) Zur Ausübung des Widerrufsrechts ist eine eindeutige Erklärung des Verbrauchers per E-Mail an legal@caelex.eu oder über das in der Widerrufsbelehrung bereitgestellte Muster-Widerrufsformular ausreichend.",
      },
      {
        type: "p",
        text: "(3) Das Widerrufsrecht erlischt gemäß § 356 Abs. 5 BGB bei Verträgen über die Lieferung nicht auf einem körperlichen Datenträger befindlicher digitaler Inhalte, wenn der Verbraucher (a) ausdrücklich zugestimmt hat, dass der Anbieter mit der Ausführung vor Ablauf der Widerrufsfrist beginnt, und (b) seine Kenntnis davon bestätigt hat, dass er durch seine Zustimmung mit Beginn der Ausführung sein Widerrufsrecht verliert, und (c) der Anbieter dem Verbraucher eine Bestätigung gemäß § 312f BGB zur Verfügung gestellt hat.",
      },
      {
        type: "p",
        text: "(4) Bei kostenpflichtigen Abonnements und API-Zugängen wird der Verbraucher im Bestellprozess explizit um diese Zustimmung gebeten. Die Zustimmung wird revisionssicher protokolliert.",
      },
      {
        type: "p",
        text: "(5) Die vollständige Widerrufsbelehrung einschließlich Muster-Widerrufsformular steht unter caelex.eu/legal/widerruf zur Verfügung.",
      },
    ],
  },
  {
    id: "s16",
    number: "§ 16",
    title: "Verfügbarkeit und Service-Level",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter bemüht sich um eine monatliche Verfügbarkeit der produktiven Plattform von 99,5 %, gemessen als Anteil der Zeit, in der die Plattform über das Internet erreichbar ist, außerhalb geplanter Wartungsfenster und Ereignisse höherer Gewalt (§ 28).",
      },
      {
        type: "p",
        text: "(2) Nicht als Ausfallzeit gelten: (a) geplante Wartungsarbeiten, die mindestens 48 Stunden im Voraus per E-Mail oder In-App-Benachrichtigung angekündigt werden; (b) Störungen, die durch höhere Gewalt, Drittausfälle außerhalb des Verantwortungsbereichs des Anbieters (z.B. Internet-Backbone, Stromversorgung, Dritt-APIs) oder Fehlverhalten des Kunden verursacht sind; (c) Beta-Funktionen gemäß § 19.",
      },
      {
        type: "p",
        text: "(3) Enterprise-Kunden können in einem individuellen Service Level Agreement erhöhte Verfügbarkeitszusagen und Service-Credits vereinbaren. In Standard-Tarifen besteht kein Anspruch auf Service-Credits; bei wesentlichen Verletzungen der Verfügbarkeitszusage bleibt das Recht zur Kündigung aus wichtigem Grund (§ 14 Abs. 4) unberührt.",
      },
      {
        type: "p",
        text: "(4) Support wird gemäß § 18 erbracht.",
      },
    ],
  },
  {
    id: "s17",
    number: "§ 17",
    title: "Wartung, Updates, Change-Management",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter ist berechtigt, die Plattform durch Updates weiterzuentwickeln, neue Funktionen einzuführen und technische Anpassungen vorzunehmen. Wartungsfenster werden nach Möglichkeit in nachfrageschwachen Zeiten eingeplant.",
      },
      {
        type: "p",
        text: "(2) Wesentliche Änderungen, die die Nutzbarkeit für den Kunden beeinträchtigen können, werden mindestens 30 Tage im Voraus angekündigt, soweit nicht sicherheitsrelevante Gründe eine sofortige Anpassung erforderlich machen.",
      },
      {
        type: "p",
        text: "(3) Der Anbieter schuldet nur die Aktualisierung für die jeweils unterstützten Browser- und API-Versionen. Legacy-Versionen können nach einer Ankündigungsfrist von 90 Tagen deprecated werden.",
      },
    ],
  },
  {
    id: "s18",
    number: "§ 18",
    title: "Support",
    blocks: [
      {
        type: "p",
        text: "(1) Standard-Support wird per E-Mail an cs@caelex.eu erbracht, werktags innerhalb der üblichen Geschäftszeiten. Erste Antwort innerhalb von zwei Werktagen.",
      },
      {
        type: "p",
        text: "(2) Enterprise-Tarife können in individuellen Vereinbarungen erweiterte Support-Zusagen (Reaktionszeiten, Priority, benannte Ansprechpartner) enthalten.",
      },
      {
        type: "p",
        text: "(3) Sicherheitsrelevante Meldungen werden bevorzugt an security@caelex.eu gerichtet; der Anbieter betreibt ein koordiniertes Schwachstellenoffenlegungsverfahren (Coordinated Vulnerability Disclosure).",
      },
    ],
  },
  {
    id: "s19",
    number: "§ 19",
    title: "Beta- und Vorschau-Funktionen",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter kann Funktionen als „Beta“, „Vorschau“, „Experimentell“ oder ähnlich kennzeichnen. Solche Funktionen werden „wie besehen“ bereitgestellt und können jederzeit ohne Vorankündigung geändert, eingeschränkt oder eingestellt werden.",
      },
      {
        type: "p",
        text: "(2) Für Beta-Funktionen gelten keine SLA-Zusagen (§ 16), keine Gewährleistungsansprüche und, soweit gesetzlich zulässig, keine Haftung außerhalb des § 26 Abs. 1.",
      },
      {
        type: "p",
        text: "(3) Der Kunde ist nicht verpflichtet, Beta-Funktionen zu nutzen. Die Nutzung erfolgt auf eigenes Risiko und ausdrücklich freiwillig.",
      },
    ],
  },
  {
    id: "s20",
    number: "§ 20",
    title: "Datenschutz, Auftragsverarbeitung, Sub-Auftragsverarbeiter",
    blocks: [
      {
        type: "p",
        text: "(1) Die Erhebung und Verarbeitung personenbezogener Daten durch den Anbieter im Rahmen der eigenen Geschäftstätigkeit richtet sich nach der Datenschutzerklärung unter caelex.eu/legal/privacy.",
      },
      {
        type: "p",
        text: "(2) Soweit der Kunde über die Plattform personenbezogene Daten Dritter verarbeitet (z.B. eigene Mitarbeiter, Kunden oder Geschäftspartner), ist der Anbieter Auftragsverarbeiter i.S.d. Art. 28 DSGVO. Für diese Verarbeitung gilt die als Vertragsbestandteil integrierte Auftragsverarbeitungsvereinbarung unter caelex.eu/legal/dpa („DPA“). Die DPA wird dem Kunden beim Vertragsschluss zur Kenntnis gebracht und kann auf Anforderung in gegengezeichneter Form bereitgestellt werden.",
      },
      {
        type: "p",
        text: "(3) Der Kunde stimmt zu, dass der Anbieter folgende Kategorien von Sub-Auftragsverarbeitern einsetzt: (a) Hosting und Edge Network (Vercel Inc., USA; Neon Inc., USA, mit EU-Datenhaltung); (b) Rate Limiting und Caching (Upstash Inc., USA); (c) Zahlungsabwicklung (Stripe Payments Europe Ltd., Irland); (d) E-Mail-Versand (Resend Inc., USA); (e) Fehler- und Performance-Monitoring (Functional Software Inc. dba Sentry, USA); (f) KI-Inferenz für Astra, Atlas und Generate 2.0 (Anthropic PBC; bevorzugte Verarbeitung in der EU über AWS Bedrock Frankfurt/Irland via Vercel AI Gateway, Fallback in den USA abgesichert durch EU-US Data Privacy Framework + Standardvertragsklauseln + Zero-Data-Retention-Zusage); (g) KI-Embeddings für die Atlas-Library-Suche (OpenAI L.L.C., USA, als Sub-Sub-Auftragsverarbeiter unter Vercel — keine direkte Vertragsbeziehung zwischen Anbieter und OpenAI). Die jeweils aktuelle Liste mit Transfergrundlagen je Auftragsverarbeiter wird unter caelex.eu/legal/sub-processors veröffentlicht und in caelex.eu/legal/privacy § 5 sowie caelex.eu/legal/dpa § 5(5) referenziert.",
      },
      {
        type: "p",
        text: "(4) Bei Datentransfers in Drittländer werden die EU-Standardvertragsklauseln (Durchführungsbeschluss (EU) 2021/914) und, wo anwendbar, das EU-US Data Privacy Framework als Transfergrundlage eingesetzt.",
      },
      {
        type: "p",
        text: "(5) Der Anbieter informiert den Kunden mindestens 30 Tage im Voraus über Änderungen im Kreis der Sub-Auftragsverarbeiter. Der Kunde ist berechtigt, begründeten Einspruch zu erheben; bei unauflöslichem Widerspruch steht dem Kunden ein Sonderkündigungsrecht zum Zeitpunkt des Wechsels zu.",
      },
    ],
  },
);

// ─── §§ 31-35 (wird weiter unten gepusht, nach §§ 21-30) ────────────────

const __pushed31to35: LegalSection[] = [
  {
    id: "s31",
    number: "§ 31",
    title: "Änderungen dieser AGB",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter ist berechtigt, diese AGB bei sachlich berechtigtem Grund zu ändern, insbesondere bei gesetzlichen Änderungen, Änderungen der höchstrichterlichen Rechtsprechung, Änderungen des Leistungsumfangs, sicherheitsrelevanten Anpassungen oder betriebswirtschaftlich zwingenden Anpassungen.",
      },
      {
        type: "p",
        text: "(2) Änderungen werden dem Kunden in Textform (in der Regel per E-Mail) mindestens 30 Tage vor Inkrafttreten mitgeteilt. Die Mitteilung enthält die geänderten Klauseln im Wortlaut oder einen entsprechenden Link.",
      },
      {
        type: "p",
        text: "(3) Widerspricht der Kunde nicht innerhalb von 30 Tagen nach Zugang der Mitteilung in Textform, gelten die geänderten AGB als angenommen. Auf diese Rechtsfolge wird in der Mitteilung ausdrücklich hingewiesen.",
      },
      {
        type: "p",
        text: "(4) Widerspricht der Kunde fristgerecht, gilt der Vertrag zu den bisherigen AGB fort; jede Partei kann den Vertrag in diesem Fall mit Wirkung zum geplanten Inkrafttreten außerordentlich kündigen.",
      },
      {
        type: "p",
        text: "(5) Für Verbraucher gilt Abs. 3 nur für Klauseln, die keine unangemessene Benachteiligung i.S.d. § 307 BGB begründen; für wesentliche Vertragsbestandteile gilt stets das gesetzliche Zustimmungserfordernis.",
      },
    ],
  },
  {
    id: "s32",
    number: "§ 32",
    title: "Besondere Bestimmungen für Verbraucher",
    blocks: [
      {
        type: "p",
        text: "(1) Die Bestimmungen dieses Paragraphen gelten ergänzend ausschließlich für Verbraucher (§ 13 BGB). Bei Widersprüchen zwischen diesen Bestimmungen und anderen Klauseln gehen die Verbraucherschutzbestimmungen vor.",
      },
      {
        type: "p",
        text: "(2) Haftungsbegrenzungen in § 26 Abs. 4–6 gelten gegenüber Verbrauchern nur, soweit sie mit zwingendem Verbraucherrecht vereinbar sind. Ansprüche aus dem Produkthaftungsgesetz und bei Verletzung von Leben, Körper oder Gesundheit bleiben unberührt.",
      },
      {
        type: "p",
        text: "(3) Die Verkürzung der Verjährung nach § 26 Abs. 8 und die Gewährleistungsverkürzung nach § 25 Abs. 4 gelten gegenüber Verbrauchern nicht.",
      },
      {
        type: "p",
        text: "(4) Die Aufrechnungs- und Zurückbehaltungsbeschränkung nach § 13 Abs. 7 gilt gegenüber Verbrauchern nicht.",
      },
      {
        type: "p",
        text: "(5) Für Verbraucher gilt der Gerichtsstand nach § 33 Abs. 2 nicht. Es gelten die gesetzlichen Zuständigkeitsregelungen.",
      },
      {
        type: "p",
        text: "(6) Informationen zur Online-Streitbeilegung: Die Europäische Kommission stellt unter ec.europa.eu/consumers/odr eine Plattform zur Online-Streitbeilegung bereit. Der Anbieter ist nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
      },
    ],
  },
  {
    id: "s33",
    number: "§ 33",
    title: "Streitbeilegung, Recht, Gerichtsstand",
    blocks: [
      {
        type: "p",
        text: "(1) Auf diese AGB und alle sich aus ihnen ergebenden Ansprüche findet das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG) Anwendung. Gegenüber Verbrauchern mit gewöhnlichem Aufenthalt in der EU bleibt die Anwendbarkeit zwingenden Verbraucherschutzrechts ihres Heimatstaats unberührt.",
      },
      {
        type: "p",
        text: "(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist Berlin, sofern der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist. Der Anbieter ist daneben berechtigt, den Kunden an dessen allgemeinem Gerichtsstand zu verklagen.",
      },
      {
        type: "p",
        text: "(3) Die deutschsprachige Fassung dieser AGB ist die maßgebliche Fassung. Übersetzungen dienen ausschließlich der Information; bei Widersprüchen gilt die deutschsprachige Fassung.",
      },
    ],
  },
  {
    id: "s34",
    number: "§ 34",
    title: "Schlussbestimmungen",
    blocks: [
      {
        type: "p",
        text: "(1) Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen oder undurchführbaren Bestimmung tritt diejenige wirksame und durchführbare Regelung, die dem wirtschaftlichen Zweck der ursprünglichen Bestimmung am nächsten kommt.",
      },
      {
        type: "p",
        text: "(2) Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen bedürfen der Textform.",
      },
      {
        type: "p",
        text: "(3) Rechtlich relevante Mitteilungen einer Partei an die andere werden in Textform per E-Mail an die hinterlegten Kontaktadressen zugestellt und gelten drei Werktage nach Absendung als zugegangen, sofern kein früherer Zugangsnachweis geführt wird.",
      },
      {
        type: "p",
        text: "(4) Erklärungen in elektronischer Form, einschließlich elektronischer Signaturen i.S.d. eIDAS-Verordnung, werden wechselseitig anerkannt.",
      },
      {
        type: "p",
        text: "(5) Die Nichtausübung eines Rechts stellt keinen Verzicht auf dieses Recht dar. Verzichte bedürfen der ausdrücklichen Textform.",
      },
      {
        type: "p",
        text: "(6) Diese AGB stellen zusammen mit ggf. individuell vereinbarten Dokumenten, der Datenschutzerklärung, der DPA und den jeweils anwendbaren Anhängen die gesamte Vereinbarung zwischen den Parteien dar und ersetzen alle vorherigen Vereinbarungen zum selben Gegenstand.",
      },
      {
        type: "p",
        text: "(7) Rechte und Pflichten, die ihrer Natur nach über das Vertragsende hinaus fortbestehen sollen, bleiben nach Vertragsende wirksam, insbesondere §§ 5, 8, 9 Abs. 3, 10, 22, 26, 27, 33.",
      },
      {
        type: "p",
        text: "(8) Dieser Vertrag begründet keine Rechte Dritter. Ansprüche Dritter aus diesem Vertrag sind ausgeschlossen.",
      },
    ],
  },
  {
    id: "s35",
    number: "§ 35",
    title: "Versionsverlauf und Archivierung",
    blocks: [
      {
        type: "p",
        text: "(1) Diese AGB tragen die Versionsnummer 3.0 und treten am 18. April 2026 in Kraft. Sie ersetzen die Version 2.0 vom Februar 2026.",
      },
      {
        type: "p",
        text: "(2) Bei jedem Vertragsschluss wird die geltende Version dokumentiert und dem Kunden per E-Mail bestätigt. Der Anbieter archiviert alle Versionen mindestens zehn Jahre ab Außerkraftsetzung und stellt sie dem Kunden auf Anforderung bereit.",
      },
      {
        type: "p",
        text: "(3) Frühere Versionen sind unter caelex.eu/legal/terms/archive abrufbar.",
      },
    ],
  },
];

// ─── §§ 21-30 ──────────────────────────────────────────────────────────

TERMS_DE.sections.push(
  {
    id: "s21",
    number: "§ 21",
    title: "Informationssicherheit",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter betreibt ein am Stand der Technik orientiertes Informationssicherheitsmanagement. Technische und organisatorische Maßnahmen umfassen insbesondere: Verschlüsselung in Übertragung (TLS 1.2+) und im Ruhezustand (AES-256-GCM), getrennte Schlüsselableitung pro Mandant, Zwei-Faktor-Authentifizierung, Hash-verkettete Audit-Logs, Anomalie- und Intrusion-Erkennung, tägliche Backups und regelmäßige Wiederherstellungstests.",
      },
      {
        type: "p",
        text: "(2) Sicherheitsvorfälle, die personenbezogene Daten des Kunden betreffen, werden gemäß Art. 33 DSGVO unverzüglich, spätestens innerhalb von 72 Stunden nach Kenntnis, an den Kunden gemeldet, soweit der Anbieter als Auftragsverarbeiter handelt.",
      },
      {
        type: "p",
        text: "(3) Der Anbieter verpflichtet sich, anerkannte Sicherheitsstandards (insbesondere ISO 27001-ähnliche Kontrollen und NIS2-Konformität bei Erreichen der Schwellenwerte) zu berücksichtigen. Ein Anspruch auf Zertifizierung besteht nicht, soweit nicht individuell vereinbart.",
      },
    ],
  },
  {
    id: "s22",
    number: "§ 22",
    title: "Vertraulichkeit",
    blocks: [
      {
        type: "p",
        text: "(1) Beide Parteien verpflichten sich, alle als vertraulich gekennzeichneten oder nach den Umständen ersichtlich vertraulichen Informationen der jeweils anderen Partei („Vertrauliche Informationen“) geheim zu halten und nur zur Erfüllung dieses Vertrages zu verwenden.",
      },
      {
        type: "p",
        text: "(2) Vertrauliche Informationen umfassen insbesondere nicht-öffentliche technische Unterlagen, Quellcode, Preisinformationen, Kundendaten, Compliance-Strategien, Geschäftsgeheimnisse i.S.d. Geschäftsgeheimnisgesetzes (GeschGehG) sowie alle Inhalte der Plattform.",
      },
      {
        type: "p",
        text: "(3) Die Vertraulichkeitspflicht gilt nicht für Informationen, die (a) bei Empfang bereits öffentlich bekannt waren oder ohne Verschulden der empfangenden Partei öffentlich werden, (b) der empfangenden Partei bereits vor Mitteilung rechtmäßig bekannt waren, (c) unabhängig entwickelt wurden oder (d) aufgrund gesetzlicher oder behördlicher Anordnung offengelegt werden müssen; im letzteren Fall unterrichtet die offenlegende Partei die andere Partei unverzüglich.",
      },
      {
        type: "p",
        text: "(4) Die Vertraulichkeitspflichten bestehen fünf Jahre über das Vertragsende hinaus, für Geschäftsgeheimnisse unbegrenzt.",
      },
    ],
  },
  {
    id: "s23",
    number: "§ 23",
    title: "Export-Kontrolle und Sanktionen",
    blocks: [
      {
        type: "callout",
        variant: "warn",
        text: "Die Raumfahrtbranche unterliegt besonders strengen Export-Kontroll-, Dual-Use- und Sanktionsregimen. Der Kunde trägt die alleinige Verantwortung für die Einhaltung dieser Vorschriften im Rahmen seiner Nutzung der Plattform.",
      },
      {
        type: "p",
        text: "(1) Der Kunde sichert zu, sämtliche einschlägigen Export-Kontroll- und Sanktionsvorschriften einzuhalten, einschließlich (a) der Dual-Use-Verordnung (EU) 2021/821, (b) des Außenwirtschaftsgesetzes (AWG) und der Außenwirtschaftsverordnung (AWV), (c) der US-Vorschriften EAR und ITAR, soweit anwendbar, (d) der EU- und UN-Sanktionslisten.",
      },
      {
        type: "p",
        text: "(2) Der Kunde verpflichtet sich, die Plattform nicht zu nutzen (a) zur Weitergabe von unter Export-Kontrolle stehender Technologie an sanktionierte Personen, Unternehmen oder Jurisdiktionen, (b) zu Zwecken, die einer Genehmigungspflicht unterliegen, ohne dass die erforderlichen Genehmigungen vorliegen, (c) von oder zugunsten natürlicher oder juristischer Personen auf Sanktionslisten.",
      },
      {
        type: "p",
        text: "(3) Der Anbieter ist berechtigt, den Zugang sofort zu beschränken oder zu beenden, wenn Hinweise auf Verstöße gegen Export-Kontroll- oder Sanktionsvorschriften vorliegen.",
      },
      {
        type: "p",
        text: "(4) Verstöße des Kunden begründen seine Freistellungspflicht nach § 27 in vollem Umfang; § 26 (Haftungsbegrenzung) findet insoweit zugunsten des Anbieters keine Anwendung gegenüber dem Kunden.",
      },
    ],
  },
  {
    id: "s24",
    number: "§ 24",
    title: "Anti-Korruption und Compliance",
    blocks: [
      {
        type: "p",
        text: "(1) Beide Parteien verpflichten sich, sämtliche anwendbaren Anti-Korruptions-, Anti-Geldwäsche- und Compliance-Vorschriften einzuhalten, insbesondere §§ 331–337 StGB, das UK Bribery Act 2010 und den US Foreign Corrupt Practices Act (FCPA).",
      },
      {
        type: "p",
        text: "(2) Weder direkt noch indirekt dürfen an Amtsträger, Angestellte oder Vertreter der anderen Partei oder Dritter Zahlungen, Vorteile oder geldwerte Zuwendungen gewährt werden, die zur unangemessenen Einflussnahme bestimmt oder geeignet sind.",
      },
      {
        type: "p",
        text: "(3) Verstöße gegen diese Klausel berechtigen zur sofortigen außerordentlichen Kündigung; Schadensersatzansprüche bleiben unberührt.",
      },
    ],
  },
  {
    id: "s25",
    number: "§ 25",
    title: "Mängelrechte und Gewährleistung",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter gewährleistet, dass die Plattform bei vertragsgemäßer Nutzung im Wesentlichen die vereinbarten Funktionen aufweist. Die Plattform wird kontinuierlich weiterentwickelt; Funktionsverbesserungen und Änderungen nach § 17 stellen keinen Mangel dar.",
      },
      {
        type: "p",
        text: "(2) Mängel sind dem Anbieter unverzüglich nach Entdeckung in Textform unter Angabe reproduzierbarer Schritte anzuzeigen. Der Anbieter ist zur Nacherfüllung durch Beseitigung des Mangels oder Bereitstellung einer mangelfreien Version berechtigt.",
      },
      {
        type: "p",
        text: "(3) Für Verbraucher gelten die gesetzlichen Gewährleistungsrechte nach §§ 327 ff. BGB (digitale Produkte) uneingeschränkt.",
      },
      {
        type: "p",
        text: "(4) Für Unternehmer ist die Gewährleistungsfrist auf ein Jahr ab Bereitstellung verkürzt, soweit gesetzlich zulässig.",
      },
      {
        type: "p",
        text: "(5) Unerhebliche Abweichungen von der vereinbarten Beschaffenheit begründen keine Mängelrechte.",
      },
    ],
  },
  {
    id: "s26",
    number: "§ 26",
    title: "Haftung",
    blocks: [
      {
        type: "callout",
        variant: "info",
        text: "Diese Klausel gilt abschließend für sämtliche Haftungsansprüche aus und im Zusammenhang mit diesem Vertrag, unabhängig von Anspruchsgrundlage oder Rechtsnatur. Absätze (1)–(3) sind zugunsten des Kunden zwingend und werden nicht beschränkt.",
      },
      {
        type: "p",
        text: "(1) Der Anbieter haftet unbeschränkt für (a) Vorsatz und grobe Fahrlässigkeit, (b) Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, (c) Ansprüche nach dem Produkthaftungsgesetz, (d) arglistig verschwiegene Mängel, (e) übernommene Garantien.",
      },
      {
        type: "p",
        text: "(2) Bei leichter Fahrlässigkeit haftet der Anbieter ausschließlich für die Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Wesentlich sind Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf. Die Haftung ist in diesem Fall auf den vertragstypischen, bei Vertragsschluss vorhersehbaren Schaden begrenzt.",
      },
      {
        type: "p",
        text: "(3) Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen, soweit gesetzlich zulässig.",
      },
      {
        type: "p",
        text: "(4) Gegenüber Unternehmern ist die Haftung des Anbieters gemäß Abs. 2 zusätzlich der Höhe nach beschränkt auf den geringeren der folgenden Beträge pro Vertragsjahr und insgesamt: (a) die Summe der in den zwölf Monaten vor Eintritt des schadensauslösenden Ereignisses vom Kunden gezahlten Entgelte, oder (b) EUR 50.000.",
      },
      {
        type: "p",
        text: "(5) Die Haftung für mittelbare Schäden, Folgeschäden, entgangenen Gewinn, Datenverlust, Reputationsschäden und Betriebsunterbrechung ist gegenüber Unternehmern ausgeschlossen, soweit gesetzlich zulässig.",
      },
      {
        type: "p",
        text: "(6) Der Anbieter haftet nicht für Schäden, die auf der Grundlage von KI-Ausgaben (§ 7), Datenqualität (§ 6), ungeprüfter Verwendung von Plattform-Inhalten oder Verstößen des Kunden gegen §§ 11, 23, 24 entstehen, soweit gesetzlich zulässig.",
      },
      {
        type: "p",
        text: "(7) Die Haftungsbegrenzungen nach Abs. 4–6 gelten nicht für Ansprüche aus Abs. 1 und nicht gegenüber Verbrauchern, soweit sie gegen zwingendes Verbraucherrecht verstoßen würden.",
      },
      {
        type: "p",
        text: "(8) Ansprüche auf Schadensersatz verjähren gegenüber Unternehmern nach 12 Monaten ab Kenntnis des Schadens, spätestens jedoch nach drei Jahren ab dem schadensauslösenden Ereignis; Ansprüche aus Abs. 1 bleiben unberührt.",
      },
    ],
  },
  {
    id: "s27",
    number: "§ 27",
    title: "Freistellung",
    blocks: [
      {
        type: "p",
        text: "(1) Der Kunde stellt den Anbieter von sämtlichen Ansprüchen Dritter frei, die aus (a) einer Verletzung dieser AGB, (b) rechtswidriger Nutzung der Plattform, (c) Verletzung von Rechten Dritter durch Kundendaten, (d) Verstößen gegen §§ 11, 23, 24 resultieren, einschließlich angemessener Kosten der Rechtsverteidigung.",
      },
      {
        type: "p",
        text: "(2) Der Anbieter stellt den Kunden von Ansprüchen Dritter frei, die auf Verletzung geistigen Eigentums durch die bestimmungsgemäße Nutzung der Plattform gestützt werden, sofern der Kunde (a) den Anbieter unverzüglich informiert, (b) keine Anerkenntnisse oder Vergleiche ohne Zustimmung des Anbieters abgibt, (c) dem Anbieter die alleinige Kontrolle über Verteidigung und Vergleich überlässt, (d) angemessene Unterstützung leistet. Die Freistellung ist der Höhe nach auf § 26 Abs. 4 beschränkt.",
      },
      {
        type: "p",
        text: "(3) Die Freistellung des Anbieters gemäß Abs. 2 entfällt, soweit der IP-Anspruch auf (a) Modifikationen durch den Kunden, (b) Kombination mit nicht vom Anbieter bereitgestellten Komponenten, (c) Nutzung entgegen den Anweisungen des Anbieters beruht.",
      },
    ],
  },
  {
    id: "s28",
    number: "§ 28",
    title: "Höhere Gewalt",
    blocks: [
      {
        type: "p",
        text: "(1) Keine Partei haftet für Verzögerungen oder Nichterfüllung, die auf Ereignisse außerhalb ihrer zumutbaren Kontrolle zurückzuführen sind, insbesondere Naturkatastrophen, Pandemien, Krieg, Terrorismus, Streiks, behördliche Maßnahmen, Ausfälle von Internet-Infrastruktur oder Drittdiensten, großflächige Cyberangriffe trotz angemessener Schutzmaßnahmen.",
      },
      {
        type: "p",
        text: "(2) Die betroffene Partei informiert die andere Partei unverzüglich über Eintritt und voraussichtliche Dauer. Dauert das Ereignis länger als 90 Tage, kann jede Partei den Vertrag mit einer Frist von 30 Tagen kündigen.",
      },
    ],
  },
  {
    id: "s29",
    number: "§ 29",
    title: "Referenzen und Publizität",
    blocks: [
      {
        type: "p",
        text: "(1) Der Anbieter ist berechtigt, Name und Logo des Unternehmenskunden in allgemeiner Form als Referenz auf der Website und in Kommunikationsmaterial zu verwenden, solange dies keine vertraulichen Informationen offenlegt.",
      },
      {
        type: "p",
        text: "(2) Über diese allgemeine Nennung hinausgehende Referenznutzungen (Case Studies, Zitate, Pressemitteilungen) bedürfen der vorherigen schriftlichen Zustimmung des Kunden.",
      },
      {
        type: "p",
        text: "(3) Der Kunde kann die Referenzierung gemäß Abs. 1 jederzeit mit einer Frist von 30 Tagen untersagen.",
      },
    ],
  },
  {
    id: "s30",
    number: "§ 30",
    title: "Abtretung und Kontrollwechsel",
    blocks: [
      {
        type: "p",
        text: "(1) Der Kunde darf Rechte und Pflichten aus diesem Vertrag nur mit vorheriger schriftlicher Zustimmung des Anbieters auf Dritte übertragen; die Zustimmung darf nicht treuwidrig verweigert werden.",
      },
      {
        type: "p",
        text: "(2) Der Anbieter ist berechtigt, Rechte und Pflichten im Rahmen einer Fusion, Übernahme, Umwandlung oder Vermögensübertragung auf einen Rechtsnachfolger zu übertragen, sofern der Rechtsnachfolger an diese AGB gebunden bleibt und keine wesentlichen Leistungseinschränkungen eintreten.",
      },
      {
        type: "p",
        text: "(3) Bei Übertragung auf ein Konzernunternehmen des Anbieters besteht kein Zustimmungserfordernis; eine Information erfolgt mindestens 30 Tage im Voraus.",
      },
    ],
  },
);

// Now push §§ 31-35 (defined earlier) at the correct position AFTER §§ 21-30:
TERMS_DE.sections.push(...__pushed31to35);
