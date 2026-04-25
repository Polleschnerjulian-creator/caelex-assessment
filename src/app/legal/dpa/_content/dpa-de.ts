import type { LegalDocument, LegalSection } from "@/lib/legal/types";

export const DPA_DE: LegalDocument = {
  lang: "de",
  title: "Auftragsverarbeitungsvertrag",
  subtitle:
    "Vereinbarung gemäß Art. 28 DSGVO zwischen dem Kunden (Verantwortlicher) und Caelex (Auftragsverarbeiter)",
  version: "Version 1.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Dieser Auftragsverarbeitungsvertrag („DPA“) konkretisiert die Rechte und Pflichten des Verantwortlichen („Kunde“) und des Auftragsverarbeiters („Caelex“ oder „Anbieter“) bei der Verarbeitung personenbezogener Daten im Rahmen der Nutzung der Caelex-Plattform.",
    "Der DPA ist integraler Bestandteil des Hauptvertrages (AGB V3.0, § 20). Bei Widersprüchen zwischen DPA und Hauptvertrag gehen die Regelungen dieses DPA für die hier geregelten Gegenstände vor.",
    "Maßgeblich ist die Verordnung (EU) 2016/679 („DSGVO“) sowie das Bundesdatenschutzgesetz („BDSG“) in der jeweils geltenden Fassung.",
  ],
  sections: [
    {
      id: "d1",
      number: "§ 1",
      title: "Gegenstand, Umfang und Dauer",
      blocks: [
        {
          type: "p",
          text: "(1) Gegenstand dieses DPA ist die Verarbeitung personenbezogener Daten durch Caelex im Auftrag und auf Weisung des Kunden im Zuge der Bereitstellung der Caelex-Plattform und aller vertraglich vereinbarten Produkte (Atlas, Assure, Academy, API/Widget, Astra, Mission Control, Ephemeris, NCA Portal, Digital Twin, Sentinel, Verity, Generate, Dashboard, Assessments).",
        },
        {
          type: "p",
          text: "(2) Die Laufzeit entspricht der Laufzeit des Hauptvertrages. Rechte und Pflichten aus diesem DPA, die ihrer Natur nach fortbestehen sollen (insbesondere Löschpflichten, Vertraulichkeit, Haftung, Nachweispflichten), gelten über das Vertragsende hinaus.",
        },
        {
          type: "p",
          text: "(3) Verarbeitungsort ist primär die Europäische Union und der Europäische Wirtschaftsraum. Drittland-Verarbeitung erfolgt ausschließlich unter den Bedingungen des § 18 dieses DPA.",
        },
      ],
    },
    {
      id: "d2",
      number: "§ 2",
      title: "Begriffsbestimmungen",
      blocks: [
        {
          type: "p",
          text: "Für diesen DPA gelten die Definitionen des Art. 4 DSGVO. Ergänzend:",
        },
        {
          type: "definition",
          term: "Verantwortlicher",
          text: "der Kunde gemäß Art. 4 Nr. 7 DSGVO. Der Kunde bestimmt Zwecke und Mittel der Verarbeitung.",
        },
        {
          type: "definition",
          term: "Auftragsverarbeiter",
          text: "Caelex gemäß Art. 4 Nr. 8 DSGVO. Caelex verarbeitet personenbezogene Daten im Auftrag des Kunden.",
        },
        {
          type: "definition",
          term: "Sub-Auftragsverarbeiter",
          text: "ein von Caelex eingesetzter Dritter, der personenbezogene Daten im Rahmen der Leistungserbringung verarbeitet (Art. 28 Abs. 4 DSGVO). Die aktuelle Liste ist Anlage 2 und unter caelex.eu/legal/sub-processors einsehbar.",
        },
        {
          type: "definition",
          term: "TOMs",
          text: "technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO, dokumentiert in Anlage 1 dieses DPA.",
        },
        {
          type: "definition",
          term: "Schutzverletzung",
          text: "eine Verletzung des Schutzes personenbezogener Daten i.S.d. Art. 4 Nr. 12 DSGVO.",
        },
      ],
    },
    {
      id: "d3",
      number: "§ 3",
      title: "Art und Zweck der Verarbeitung",
      blocks: [
        { type: "p", text: "(1) Art der Verarbeitung:" },
        {
          type: "ul",
          items: [
            "Erheben, Erfassen, Organisieren, Ordnen, Speichern, Anpassen, Verändern",
            "Abfragen, Beraten, Verwenden durch automatisierte Auswertung",
            "Offenlegen durch Übermittlung, Verbreiten oder eine andere Form der Bereitstellung",
            "Abgleichen, Verknüpfen, Einschränken, Löschen, Vernichten",
            "Automatisierte Auswertung durch KI-Systeme zur Unterstützung des Kunden (Astra, Generate, Dokumenten-Automation)",
          ],
        },
        { type: "p", text: "(2) Zwecke der Verarbeitung:" },
        {
          type: "ul",
          items: [
            "Bereitstellung der vertraglich vereinbarten Produkte und Leistungen",
            "Account- und Nutzerverwaltung sowie Rechte- und Rollensteuerung",
            "Durchführung von Compliance-Assessments und Generierung von Compliance-Dokumenten",
            "Verwaltung von Dokumenten, Einreichungen und Audit-Trails des Kunden",
            "KI-gestützte Beantwortung von Fragen (Astra) auf Basis der Eingaben des Kunden",
            "Ermöglichung von Kollaboration zwischen Nutzern des Kunden",
            "Betriebssichere und beobachtbare Bereitstellung (Fehler-Monitoring, Performance-Metriken)",
            "Erfüllung gesetzlicher Aufbewahrungs- und Nachweispflichten",
          ],
        },
        {
          type: "p",
          text: "(3) Die Verarbeitung erfolgt ausschließlich zu den in Abs. 2 genannten Zwecken. Eine Nutzung für eigene Zwecke des Auftragsverarbeiters — insbesondere für Werbung, Profiling für Dritte oder Training eigener oder fremder KI-Modelle — ist ausgeschlossen, soweit der Kunde nicht ausdrücklich und widerruflich in Textform zustimmt.",
        },
      ],
    },
    {
      id: "d4",
      number: "§ 4",
      title: "Art der personenbezogenen Daten",
      blocks: [
        {
          type: "p",
          text: "Gegenstand der Verarbeitung sind je nach Nutzung des Kunden insbesondere folgende Datenkategorien:",
        },
        {
          type: "ul",
          items: [
            "Stammdaten der Nutzer des Kunden (Name, E-Mail-Adresse, Sprache, Zeitzone)",
            "Authentifizierungsdaten (gehashte Passwörter, MFA-Tokens, WebAuthn-Credentials, Session-Tokens)",
            "Organisations- und Rollendaten (Organisationszugehörigkeit, Berechtigungen, Einladungen)",
            "Kommunikationsdaten (Support-Anfragen, In-App-Benachrichtigungen, Astra-Konversationen)",
            "Kundendaten im engeren Sinn (hochgeladene Dokumente, Assessment-Antworten, Compliance-Status, Risiken, Ephemeris-Daten, Satelliten-Telemetrie, Kunden-spezifische regulatorische Konfigurationen)",
            "Nutzungs- und Log-Daten (IP-Adressen, User-Agent, Zugriffszeitpunkte, Sicherheits-Events, Audit-Logs)",
            "Abrechnungs- und Vertragsdaten (Rechnungsadresse, Zahlungshistorie über Stripe; Zahlungsmittel werden nicht bei Caelex gespeichert)",
          ],
        },
        {
          type: "p",
          text: "Besondere Kategorien personenbezogener Daten i.S.d. Art. 9 DSGVO sind nicht vorgesehen. Der Kunde ist verpflichtet, keine derartigen Daten in die Plattform einzubringen, soweit er mit Caelex keine gesonderte Vereinbarung getroffen hat.",
        },
      ],
    },
    {
      id: "d5",
      number: "§ 5",
      title: "Kategorien der betroffenen Personen",
      blocks: [
        { type: "p", text: "Die Verarbeitung betrifft insbesondere:" },
        {
          type: "ul",
          items: [
            "Nutzer des Kunden (eigene Mitarbeiter, Auftragnehmer, autorisierte Dritte)",
            "Geschäftskontakte des Kunden, deren Daten in die Plattform eingebracht werden (z.B. Ansprechpartner bei Behörden, NCA-Kontakte, Investorenkontakte bei Assure)",
            "Endkunden des Kunden, soweit deren Daten im Rahmen der Plattform-Nutzung verarbeitet werden",
          ],
        },
      ],
    },
    {
      id: "d6",
      number: "§ 6",
      title: "Rechte und Pflichten des Verantwortlichen",
      blocks: [
        {
          type: "p",
          text: "(1) Der Kunde ist Verantwortlicher i.S.d. Art. 4 Nr. 7 DSGVO und allein verantwortlich für die Rechtmäßigkeit der Datenverarbeitung sowie für die Wahrung der Rechte der betroffenen Personen.",
        },
        {
          type: "p",
          text: "(2) Der Kunde stellt sicher, dass eine gültige Rechtsgrundlage (Art. 6, ggf. Art. 9, 10 DSGVO) für die Verarbeitung besteht und die erforderlichen Informationspflichten (Art. 13, 14 DSGVO) erfüllt sind.",
        },
        {
          type: "p",
          text: "(3) Der Kunde ist verpflichtet, alle Weisungen und Anfragen in Textform zu dokumentieren. Mündliche Weisungen sind unverzüglich in Textform zu bestätigen.",
        },
        {
          type: "p",
          text: "(4) Der Kunde benennt einen Ansprechpartner für datenschutzrechtliche Fragen. Bei Wechsel ist Caelex unverzüglich zu informieren.",
        },
      ],
    },
    {
      id: "d7",
      number: "§ 7",
      title: "Allgemeine Pflichten des Auftragsverarbeiters",
      blocks: [
        {
          type: "p",
          text: "Caelex verarbeitet personenbezogene Daten ausschließlich im Rahmen der vertraglichen Vereinbarungen und nach dokumentierten Weisungen des Kunden. Caelex:",
        },
        {
          type: "ul",
          items: [
            "verarbeitet Daten nur auf dokumentierte Weisung des Kunden, auch bei Übermittlungen in Drittländer (vorbehaltlich § 18 dieses DPA);",
            "unterrichtet den Kunden unverzüglich, wenn eine Weisung nach Auffassung von Caelex gegen die DSGVO oder andere Datenschutzvorschriften verstößt; Caelex ist berechtigt, die Ausführung der Weisung auszusetzen, bis der Kunde sie bestätigt oder ändert;",
            "verpflichtet die zur Verarbeitung befugten Personen auf Vertraulichkeit oder stellt sicher, dass sie einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen (Art. 28 Abs. 3 lit. b DSGVO);",
            "implementiert und hält die TOMs nach § 9 und Anlage 1 aufrecht;",
            "bindet Sub-Auftragsverarbeiter nur gemäß § 10 und Anlage 2 ein;",
            "unterstützt den Kunden mit geeigneten technischen und organisatorischen Maßnahmen bei der Wahrnehmung der Rechte betroffener Personen (§ 15 dieses DPA);",
            "unterstützt den Kunden bei Pflichten nach Art. 32–36 DSGVO (§§ 12, 13 dieses DPA);",
            "löscht oder gibt nach Wahl des Kunden alle personenbezogenen Daten nach Ende der Erbringung der Verarbeitungsleistung zurück und löscht vorhandene Kopien, sofern keine gesetzliche Pflicht zur Speicherung besteht (§ 14);",
            "stellt dem Kunden die zum Nachweis der Einhaltung dieser Pflichten erforderlichen Informationen zur Verfügung und ermöglicht Überprüfungen (§ 16);",
            "benennt einen Datenschutzbeauftragten (DSB), soweit Caelex hierzu gesetzlich verpflichtet ist, und teilt den Namen sowie die Kontaktdaten dem Kunden auf Anforderung mit.",
          ],
        },
      ],
    },
    {
      id: "d8",
      number: "§ 8",
      title: "Weisungsrecht",
      blocks: [
        {
          type: "p",
          text: "(1) Der Kunde erteilt Weisungen grundsätzlich in Textform an privacy@caelex.eu. Die Vereinbarung dieses DPA samt Anlagen und die Nutzung der Plattform nach ihren vertraglich vereinbarten Funktionen stellen ebenfalls Weisungen dar.",
        },
        {
          type: "p",
          text: "(2) Einzelweisungen sind verbindlich, wenn sie Caelex einen zumutbaren Aufwand abverlangen und mit dem vereinbarten Leistungsumfang vereinbar sind. Weisungen, die über den vertraglich vereinbarten Leistungsumfang hinausgehen, können von Caelex nach Aufwand berechnet oder abgelehnt werden.",
        },
        {
          type: "p",
          text: "(3) Caelex teilt dem Kunden die bei Caelex autorisierten Empfänger von Weisungen mit. Ändert sich diese Liste, informiert Caelex den Kunden unverzüglich.",
        },
      ],
    },
    {
      id: "d9",
      number: "§ 9",
      title: "Technische und organisatorische Maßnahmen (TOMs)",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex trifft geeignete TOMs gemäß Art. 32 DSGVO, die dem Stand der Technik, den Implementierungskosten sowie Art, Umfang, Umständen und Zwecken der Verarbeitung und dem Risiko für die Rechte und Freiheiten natürlicher Personen angemessen sind.",
        },
        {
          type: "p",
          text: "(2) Die TOMs sind in Anlage 1 dokumentiert und werden bei wesentlichen Änderungen fortgeschrieben. Caelex ist berechtigt, die TOMs weiterzuentwickeln, solange das Schutzniveau nicht unterschritten wird.",
        },
        {
          type: "p",
          text: "(3) Der Kunde bestätigt, die TOMs vor Vertragsabschluss geprüft und als angemessen bewertet zu haben.",
        },
      ],
    },
    {
      id: "d10",
      number: "§ 10",
      title: "Sub-Auftragsverarbeiter",
      blocks: [
        {
          type: "p",
          text: "(1) Der Kunde erteilt Caelex die allgemeine schriftliche Genehmigung i.S.d. Art. 28 Abs. 2 S. 2 DSGVO zur Beauftragung der in Anlage 2 gelisteten Sub-Auftragsverarbeiter.",
        },
        {
          type: "p",
          text: "(2) Caelex verpflichtet seine Sub-Auftragsverarbeiter vertraglich zur Einhaltung eines Schutzniveaus, das den Pflichten aus diesem DPA im Wesentlichen entspricht, insbesondere zu ausreichenden TOMs und zur Einhaltung der Weisungen (Art. 28 Abs. 4 DSGVO).",
        },
        {
          type: "p",
          text: "(3) Caelex informiert den Kunden mindestens 30 Tage vor Aufnahme oder Austausch eines Sub-Auftragsverarbeiters. Die aktuelle Liste wird unter caelex.eu/legal/sub-processors veröffentlicht; der Kunde kann sich zum Benachrichtigungsservice anmelden.",
        },
        {
          type: "p",
          text: "(4) Der Kunde kann aus wichtigem, datenschutzbezogenem Grund in Textform Einspruch erheben. Bei berechtigtem Einspruch, dem Caelex nicht durch eine vergleichbare Alternative begegnen kann, hat der Kunde ein Sonderkündigungsrecht des Hauptvertrages zum Zeitpunkt des Wechsels.",
        },
        {
          type: "p",
          text: "(5) Die bloße Nutzung von Dienstleistern ohne Zugriff auf personenbezogene Daten (z.B. anonyme CDN-Bereitstellung, reine Paketzustellung) ist keine Unterauftragsverarbeitung i.S.d. DSGVO.",
        },
        {
          type: "p",
          text: "(6) Soweit der Kunde Berufsgeheimnisträger im Sinne des § 203 StGB ist (insbesondere Rechtsanwälte, Steuerberater, Wirtschaftsprüfer, Ärzte), gilt zusätzlich der Berufsgeheimnisträger-Annex unten (§ 10a). Caelex verpflichtet alle Sub-Auftragsverarbeiter, die Zugang zu Mandantengeheimnissen erhalten können, schriftlich auf die Verschwiegenheit und weist sie ausdrücklich auf die strafrechtlichen Folgen aus § 203 StGB hin (§ 43e Abs. 3 BRAO).",
        },
      ],
    },
    {
      id: "d10a",
      number: "§ 10a",
      title:
        "Annex Berufsgeheimnisträger (§ 43e BRAO · § 203 StGB · § 62a StBerG)",
      blocks: [
        {
          type: "p",
          text: "(1) Anwendungsbereich. Dieser Annex findet Anwendung, wenn der Kunde Berufsgeheimnisträger im Sinne des § 203 StGB ist und unter Caelex Daten verarbeitet, die einer beruflichen Verschwiegenheitspflicht unterliegen — namentlich Mandanten-, Klienten-, Patientenbeziehungen sowie sämtliche darauf bezogene Sachverhalte (einschließlich der bloßen Tatsache der Mandatierung).",
        },
        {
          type: "p",
          text: "(2) Verpflichtung von Caelex. Caelex und sämtliche bei Caelex zur Auftragsverarbeitung befugten Personen sind ausdrücklich auf die Verschwiegenheit verpflichtet und über die strafrechtlichen Folgen einer Verletzung gemäß § 203 StGB sowie etwaige berufsrechtliche Sanktionen belehrt. Caelex dokumentiert diese Belehrung schriftlich für jede mitwirkende Person und stellt entsprechende Nachweise auf Anforderung des Kunden zur Verfügung.",
        },
        {
          type: "p",
          text: "(3) Sub-Auftragsverarbeiter. Caelex verpflichtet jeden Sub-Auftragsverarbeiter, der Zugang zu Mandantengeheimnissen erhalten kann (insbesondere KI-Dienstleister, Hosting-Anbieter und Datenbankbetreiber), durch eine zusätzliche Vereinbarung in Textform auf die Verschwiegenheit und auf die strafrechtlichen Folgen aus § 203 StGB. Die Vereinbarung umfasst insbesondere die Verpflichtung, Daten nicht zu Trainingszwecken zu verwenden, sie nach Verarbeitung unverzüglich zu löschen (Zero-Data-Retention, soweit technisch möglich) und sich Weisungen des Kunden über Caelex unterzuordnen.",
        },
        {
          type: "p",
          text: "(4) Need-to-know-Prinzip. Caelex stellt sicher, dass Mandantendaten nur denjenigen Personen und Systemen zugänglich gemacht werden, die für die jeweilige Verarbeitung erforderlich sind. Im bilateralen Mandat-Bridge-Modul (Atlas × Caelex) wird der Zugriff der Anwaltskanzlei auf das im Handshake-Verfahren festgelegte Scope-Set technisch beschränkt; jeder Zugriff wird in einem manipulationssicheren Audit-Log (Hash-Chain) protokolliert.",
        },
        {
          type: "p",
          text: "(5) Drittlandtransfer. KI-Inferenz-Anbieter und Embedding-Anbieter mit Sitz in den USA (insbesondere Anthropic PBC und OpenAI L.L.C.) verarbeiten Mandantengeheimnisse nur unter zertifiziertem EU-US Data Privacy Framework, ergänzt um Standardvertragsklauseln und Zero-Data-Retention-Zusagen. Auf Wunsch des Kunden kann für Mandate mit erhöhter Sensibilität eine Verarbeitung ausschließlich in EU-Regionen vereinbart werden (z.B. Anthropic via AWS Bedrock Frankfurt).",
        },
        {
          type: "p",
          text: "(6) Beschlagnahmefreiheit / Auskunftsverweigerung. Caelex erkennt die Beschlagnahmefreiheit der dem Kunden anvertrauten Geheimnisse (§ 97 StPO) an und macht von etwaigen Auskunfts- oder Herausgabeverweigerungsrechten Gebrauch, soweit dies rechtlich zulässig ist. Caelex informiert den Kunden unverzüglich über behördliche Auskunftsersuchen, die Mandantengeheimnisse betreffen, soweit eine Information nicht selbst gegen geltendes Recht verstößt.",
        },
        {
          type: "p",
          text: "(7) Beendigung. Bei Beendigung des Hauptvertrages oder eines konkreten Mandats stellt Caelex die Mandantendaten in einem strukturierten, gängigen und maschinenlesbaren Format zur Verfügung und löscht oder pseudonymisiert sie nach den Weisungen des Kunden — vorbehaltlich gesetzlicher Aufbewahrungspflichten und vorbehaltlich des Rechts der mandatsbearbeitenden Anwaltskanzlei zur eigenen Aktenführung gemäß § 50 BRAO.",
        },
      ],
    },
    {
      id: "d11",
      number: "§ 11",
      title: "Unterstützungspflichten",
      blocks: [
        {
          type: "p",
          text: "Caelex unterstützt den Kunden angemessen bei der Einhaltung seiner Pflichten nach den Art. 32 bis 36 DSGVO, insbesondere:",
        },
        {
          type: "ul",
          items: [
            "Sicherstellung der Vertraulichkeit, Integrität, Verfügbarkeit und Belastbarkeit (Art. 32 DSGVO);",
            "rasche Wiederherstellbarkeit nach Zwischenfällen;",
            "Unterstützung bei der Meldung von Schutzverletzungen (§ 12);",
            "Unterstützung bei der Datenschutz-Folgenabschätzung (§ 13);",
            "Unterstützung bei der vorherigen Konsultation mit der Aufsichtsbehörde, soweit erforderlich.",
          ],
        },
        {
          type: "p",
          text: "Unterstützungsleistungen, die über die in diesem DPA vereinbarten Pflichten hinausgehen, werden von Caelex nach Zeitaufwand zu branchenüblichen Sätzen berechnet.",
        },
      ],
    },
    {
      id: "d12",
      number: "§ 12",
      title: "Meldung von Schutzverletzungen",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex informiert den Kunden unverzüglich, spätestens innerhalb von 72 Stunden ab Kenntniserlangung, schriftlich oder in Textform über Schutzverletzungen personenbezogener Daten, die dem Zuständigkeitsbereich von Caelex zuzurechnen sind.",
        },
        {
          type: "p",
          text: "(2) Die Meldung enthält, soweit bekannt: Art der Schutzverletzung, Kategorien und ungefähre Zahl der Betroffenen, Kategorien und ungefähre Zahl der betroffenen Datensätze, wahrscheinliche Folgen, ergriffene Abhilfemaßnahmen.",
        },
        {
          type: "p",
          text: "(3) Der Kunde ist verantwortlich für die Meldung an die zuständige Aufsichtsbehörde (Art. 33 DSGVO) und gegebenenfalls an betroffene Personen (Art. 34 DSGVO). Caelex unterstützt bei der Erstellung der Meldungen.",
        },
        {
          type: "p",
          text: "(4) Der zentrale Meldekanal bei Caelex ist security@caelex.eu sowie privacy@caelex.eu. Caelex führt ein Register aller Schutzverletzungen und stellt diesen Eintrag dem Kunden auf Anforderung zur Verfügung.",
        },
      ],
    },
    {
      id: "d13",
      number: "§ 13",
      title: "Datenschutz-Folgenabschätzung",
      blocks: [
        {
          type: "p",
          text: "(1) Soweit der Kunde nach Art. 35 DSGVO zur Durchführung einer Datenschutz-Folgenabschätzung verpflichtet ist, unterstützt Caelex mit angemessenen Informationen, insbesondere durch Bereitstellung von Produktbeschreibungen, TOMs, Sub-Auftragsverarbeiter-Informationen und ggf. Zusammenfassungen interner Risikoanalysen.",
        },
        {
          type: "p",
          text: "(2) Caelex ist nicht verpflichtet, eigene Datenschutz-Folgenabschätzungen an den Kunden herauszugeben, soweit diese Geschäftsgeheimnisse enthalten.",
        },
      ],
    },
    {
      id: "d14",
      number: "§ 14",
      title: "Rückgabe und Löschung",
      blocks: [
        {
          type: "p",
          text: "(1) Nach Beendigung der Erbringung der Verarbeitungsleistung stellt Caelex dem Kunden die personenbezogenen Daten innerhalb von 30 Tagen in einem strukturierten, gängigen und maschinenlesbaren Format zur Verfügung (Export). Nach Ablauf der Exportfrist oder auf Wunsch des Kunden erfolgt die Löschung.",
        },
        {
          type: "p",
          text: "(2) Die Löschung erfolgt auf allen Produktivsystemen binnen 30 Tagen, auf Backup-Systemen spätestens mit Ablauf des regulären Backup-Zyklus von 90 Tagen. Die Löschung wird protokolliert; der Kunde kann eine Löschbestätigung anfordern.",
        },
        {
          type: "p",
          text: "(3) Gesetzliche Aufbewahrungspflichten (insbesondere handels- und steuerrechtliche Pflichten) gehen der Löschung vor. Caelex informiert den Kunden, welche Daten aus welchem Grund und für welche Dauer weiter aufbewahrt werden müssen.",
        },
        {
          type: "p",
          text: "(4) Aggregierte, vollständig anonymisierte Daten ohne Personenbezug und ohne Re-Identifizierungsmöglichkeit dürfen für statistische und Produktverbesserungszwecke weiter genutzt werden.",
        },
      ],
    },
    {
      id: "d15",
      number: "§ 15",
      title: "Rechte der betroffenen Personen",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex unterstützt den Kunden mit geeigneten technischen und organisatorischen Maßnahmen bei der Beantwortung von Anträgen auf Wahrnehmung der Rechte betroffener Personen (Art. 15–22 DSGVO), insbesondere durch Self-Service-Funktionen, Exporte und gezielte Löschung.",
        },
        {
          type: "p",
          text: "(2) Wendet sich eine betroffene Person unmittelbar an Caelex, leitet Caelex den Antrag unverzüglich an den Kunden weiter und beantwortet ihn nicht selbst, soweit nicht ausdrücklich durch den Kunden angewiesen oder rechtlich zwingend.",
        },
      ],
    },
    {
      id: "d16",
      number: "§ 16",
      title: "Nachweise und Kontrollen",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex stellt dem Kunden alle erforderlichen Informationen zum Nachweis der Einhaltung der Pflichten aus Art. 28 DSGVO und dieses DPA zur Verfügung, insbesondere durch Bereitstellung aktueller TOM-Dokumentation, Sub-Auftragsverarbeiter-Liste und ggf. Auditberichten Dritter (z.B. ISO 27001-Zertifikate des Hostings, SOC 2 Reports).",
        },
        {
          type: "p",
          text: "(2) Der Kunde ist berechtigt, einmal pro Kalenderjahr — bei begründetem Anlass (z.B. dokumentierte Schutzverletzung) auch häufiger — eine Überprüfung durchzuführen. Die Überprüfung erfolgt nach Ankündigung mit mindestens 30 Kalendertagen Vorlauf.",
        },
        {
          type: "p",
          text: "(3) Überprüfungen sollen die Geschäftstätigkeit von Caelex nicht unangemessen beeinträchtigen, werden vorrangig durch Vorlage von Dokumentation, Zertifikaten und schriftlichen Auskünften erfüllt. Vor-Ort-Prüfungen erfolgen nur, wenn Dokumentenprüfung nicht ausreicht.",
        },
        {
          type: "p",
          text: "(4) Der Kunde kann die Überprüfung durch einen geeigneten, zur Berufsverschwiegenheit verpflichteten Dritten (z.B. zugelassener Wirtschaftsprüfer) durchführen lassen. Wettbewerber von Caelex sind als Prüfer ausgeschlossen.",
        },
        {
          type: "p",
          text: "(5) Kosten für eigene Prüfungen trägt der Kunde, außer die Prüfung deckt wesentliche Mängel auf, die Caelex zu vertreten hat.",
        },
      ],
    },
    {
      id: "d17",
      number: "§ 17",
      title: "Haftung",
      blocks: [
        {
          type: "p",
          text: "(1) Für die Haftung nach Art. 82 DSGVO gelten die allgemeinen Bestimmungen der DSGVO. Im Innenverhältnis gilt ergänzend der Haftungsrahmen aus § 26 der AGB V3.0.",
        },
        {
          type: "p",
          text: "(2) Soweit Caelex und Kunde gesamtschuldnerisch haften, haftet im Innenverhältnis diejenige Partei vorrangig, deren Verantwortungsbereich die Ursache zuzurechnen ist.",
        },
        {
          type: "p",
          text: "(3) Der Kunde stellt Caelex im Innenverhältnis von Ansprüchen frei, die auf Weisungen des Kunden oder auf Rechtswidrigkeit der Verarbeitung in der Sphäre des Kunden beruhen.",
        },
      ],
    },
    {
      id: "d18",
      number: "§ 18",
      title: "Internationale Datentransfers",
      blocks: [
        {
          type: "p",
          text: "(1) Eine Übermittlung personenbezogener Daten in Drittländer i.S.d. Art. 44 ff. DSGVO erfolgt ausschließlich, wenn eine Rechtsgrundlage nach Art. 45 bis 49 DSGVO vorliegt.",
        },
        {
          type: "p",
          text: "(2) Für Transfers an Sub-Auftragsverarbeiter mit Sitz in den USA oder anderen Drittstaaten ohne Angemessenheitsbeschluss nutzt Caelex die EU-Standardvertragsklauseln nach Durchführungsbeschluss (EU) 2021/914, Modul 2 (Controller-to-Processor) oder Modul 3 (Processor-to-Processor), in der jeweils aktuellen Fassung.",
        },
        {
          type: "p",
          text: "(3) Wo anwendbar, nutzt Caelex ergänzend das EU-US Data Privacy Framework (Durchführungsbeschluss (EU) 2023/1795).",
        },
        {
          type: "p",
          text: "(4) Ergänzende Schutzmaßnahmen (Verschlüsselung, Zugriffsbeschränkung, Transparenzberichte) werden in den TOMs in Anlage 1 dokumentiert.",
        },
        {
          type: "p",
          text: "(5) Der Kunde stimmt mit Abschluss dieses DPA den in Anlage 2 beschriebenen Drittlandtransfers ausdrücklich zu.",
        },
      ],
    },
    {
      id: "d19",
      number: "§ 19",
      title: "Geheimhaltung",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex verpflichtet die mit der Verarbeitung befassten Personen auf Vertraulichkeit. Die Verpflichtung besteht auch nach Beendigung ihrer Tätigkeit fort.",
        },
        {
          type: "p",
          text: "(2) Ergänzend gilt die Vertraulichkeitsklausel § 22 der AGB V3.0.",
        },
      ],
    },
    {
      id: "d20",
      number: "§ 20",
      title: "Sonstige Bestimmungen",
      blocks: [
        {
          type: "p",
          text: "(1) Änderungen und Ergänzungen dieses DPA bedürfen der Textform. Dies gilt auch für die Änderung dieser Schriftformklausel.",
        },
        {
          type: "p",
          text: "(2) Sollten einzelne Bestimmungen dieses DPA unwirksam oder undurchführbar sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
        },
        {
          type: "p",
          text: "(3) Im Falle eines Widerspruchs zwischen diesem DPA und anderen Vereinbarungen der Parteien geht dieser DPA für die hier geregelten Gegenstände vor.",
        },
        {
          type: "p",
          text: "(4) Für diesen DPA gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin, sofern der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.",
        },
        {
          type: "p",
          text: "(5) Die deutsche Fassung dieses DPA ist rechtlich maßgeblich. Englischsprachige Fassungen dienen ausschließlich der Information.",
        },
      ],
    },
  ],
  annexes: [
    {
      id: "anl1",
      number: "Anlage 1",
      title: "Technische und organisatorische Maßnahmen (TOMs)",
      blocks: [
        {
          type: "callout",
          variant: "info",
          text: "Die folgenden TOMs beschreiben das Schutzniveau, das Caelex zum Zeitpunkt der Vertragsschließung gewährleistet. Caelex ist berechtigt, die Maßnahmen weiterzuentwickeln, solange das Schutzniveau nicht unterschritten wird.",
        },
        {
          type: "p",
          text: "A. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)",
        },
        {
          type: "ul",
          items: [
            "Zutrittskontrolle: Hostinginfrastruktur in zertifizierten Rechenzentren (ISO 27001, SOC 2 Type II) der Infrastrukturpartner. Caelex selbst betreibt keine On-Prem-Server mit Produktivdaten.",
            "Zugangskontrolle: Multi-Faktor-Authentifizierung für alle privilegierten Zugänge (TOTP und/oder WebAuthn/FIDO2). Passwort-Policy mit Mindestlänge 12, Hash mittels bcrypt (12 Runden). Automatische Account-Sperre nach fünf fehlgeschlagenen Login-Versuchen binnen 15 Minuten.",
            "Zugriffskontrolle: Role-Based Access Control (RBAC) mit Rollen Owner, Admin, Manager, Member, Viewer. Prinzip der minimalen Berechtigung. Trennung von Mandantendaten durch pro-Organisation-Isolation auf Anwendungs- und Datenbankschicht.",
            "Trennungskontrolle: Mandantentrennung auf Ebene der Anwendungs-Datenbank; separate Schlüsselableitung pro Organisation bei feldweisem Encryption.",
            "Pseudonymisierung / Verschlüsselung: sensible Datenbankfelder (VAT, Bankverbindungen, Steuer-ID, Policen-Nummern) werden mittels AES-256-GCM und Scrypt-Schlüsselableitung pro Mandant verschlüsselt. Transportverschlüsselung ausnahmslos TLS 1.2+.",
          ],
        },
        { type: "p", text: "B. Integrität (Art. 32 Abs. 1 lit. b DSGVO)" },
        {
          type: "ul",
          items: [
            "Weitergabekontrolle: Datenübermittlung ausschließlich verschlüsselt. Interne Service-Service-Kommunikation über authentifizierte Kanäle. API-Aufrufe über HMAC-signierte Requests bei sensiblen Endpunkten.",
            "Eingabekontrolle: Revisionssichere Audit-Logs mit SHA-256-Hash-Verkettung jeder Änderung. Audit-Log manipulationssicher durch Hash-Chain. Aufbewahrungsfristen je nach Datenkategorie.",
          ],
        },
        {
          type: "p",
          text: "C. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b und c DSGVO)",
        },
        {
          type: "ul",
          items: [
            "Backups: automatisch täglich, kryptographisch geschützt; Aufbewahrung mindestens 30 Tage (Point-in-Time Recovery des Datenbanksystems).",
            "Verfügbarkeitsziel: 99,5 % monatlich (siehe § 16 AGB).",
            "Hochverfügbarkeit durch verteilte Edge-Infrastruktur und regionsübergreifende Replikation der Datenbank.",
            "Regelmäßige Wiederherstellungstests.",
          ],
        },
        {
          type: "p",
          text: "D. Verfahren zur regelmäßigen Überprüfung (Art. 32 Abs. 1 lit. d DSGVO)",
        },
        {
          type: "ul",
          items: [
            "Datenschutz-Management: dokumentierte Verfahren; privacy@caelex.eu als zentraler Kanal.",
            "Incident-Response: dokumentierter Prozess mit 72-Stunden-Meldefrist (Art. 33 DSGVO).",
            "Anomalieerkennung und Intrusion-Monitoring mit automatisierten Alerts (Honey-Token, Brute-Force-Detection, Anomalie-Detection-Engine).",
            "Security-Audit-Logs inkl. Login-Events, API-Aufrufen, Änderungen an Zugriffsrechten.",
            "Regelmäßige Abhängigkeits- und Schwachstellenprüfungen (Dependabot, CodeQL, TruffleHog Secret Scanning, OWASP Dependency Checks).",
            "Auftragskontrolle: Sub-Auftragsverarbeiter vertraglich verpflichtet, siehe Anlage 2.",
            "Datenschutzfreundliche Voreinstellungen (Privacy by Default) bei der Benutzeroberfläche.",
          ],
        },
        { type: "p", text: "E. Organisatorische Maßnahmen" },
        {
          type: "ul",
          items: [
            "Verpflichtung der Mitarbeiter auf Vertraulichkeit und Datenschutz; regelmäßige Schulungen.",
            "Dokumentierte Richtlinien zu Passwort- und Gerätesicherheit.",
            "Getrennte Umgebungen für Entwicklung, Staging und Produktion.",
            "Zwei-Personen-Prinzip bei Produktivänderungen mit hohem Risiko.",
            "Pre-Commit-Hooks (ESLint, TypeScript, Geheimnis-Scan) vor Commits.",
          ],
        },
      ],
    },
    {
      id: "anl2",
      number: "Anlage 2",
      title: "Sub-Auftragsverarbeiter",
      blocks: [
        {
          type: "p",
          text: "Die zum Zeitpunkt des Vertragsschlusses eingesetzten Sub-Auftragsverarbeiter werden hier in Kategorien genannt. Die vollständige, aktuelle Liste ist unter caelex.eu/legal/sub-processors abrufbar.",
        },
        {
          type: "ul",
          items: [
            "Hosting / Edge Network: Vercel Inc. (USA) — Standardvertragsklauseln Modul 3; EU-US DPF; Daten überwiegend in EU-Regionen.",
            "Datenbank (Managed Postgres): Neon Inc. (USA) — EU-Datenhaltung (eu-central-1); Standardvertragsklauseln Modul 3.",
            "Rate Limiting / Caching: Upstash Inc. (USA) — Standardvertragsklauseln Modul 3; EU-US DPF.",
            "Zahlungsabwicklung: Stripe Payments Europe Ltd. (Irland) — eigenverantwortlich für Zahlungsdaten; Caelex speichert keine Kartendaten.",
            "E-Mail-Versand: Resend Inc. (USA) — Standardvertragsklauseln Modul 3.",
            "Fehler- und Performance-Monitoring: Functional Software Inc. (dba Sentry, USA) — konfiguriert mit PII-Scrubbing.",
            "KI-Inferenz: Anthropic PBC (USA) — Standardvertragsklauseln Modul 3; Eingaben werden nicht zum Modell-Training genutzt (Zero-Data-Retention-Vereinbarung).",
          ],
        },
        {
          type: "p",
          text: "Bei Änderungen dieser Liste informiert Caelex den Kunden mindestens 30 Tage im Voraus (§ 10 dieses DPA).",
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
    "Datenschutzanfragen:",
    "mailto:privacy@caelex.eu",
    "Sicherheitsvorfälle:",
    "mailto:security@caelex.eu",
    "Rechtliche Anfragen:",
    "mailto:legal@caelex.eu",
  ],
  links: [
    { label: "English Version →", href: "/legal/dpa-en" },
    { label: "AGB (V3.0)", href: "/legal/terms" },
    { label: "Datenschutzerklärung", href: "/legal/privacy" },
    { label: "Sub-Auftragsverarbeiter", href: "/legal/sub-processors" },
  ],
};
