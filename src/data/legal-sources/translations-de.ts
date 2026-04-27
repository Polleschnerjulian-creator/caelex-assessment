// src/data/legal-sources/translations-de.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * German translations for ALL legal source content in ATLAS.
 * When language is "de", all titles, provision summaries, compliance
 * implications, scope descriptions, and authority mandates are shown
 * in German.
 *
 * Official references (BGBl., OJ L, etc.) are NEVER translated.
 * Article/section references (Art. VI, § 3, etc.) stay in original.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Interfaces ──────────────────────────────────────────────────────

export interface TranslatedProvision {
  title: string;
  summary: string;
  complianceImplication?: string;
}

export interface TranslatedSource {
  title: string;
  scopeDescription?: string;
  provisions: Record<string, TranslatedProvision>;
}

export interface TranslatedAuthority {
  name: string;
  mandate: string;
}

// ─── Source Translations ─────────────────────────────────────────────

export const LEGAL_SOURCE_TRANSLATIONS_DE = new Map<string, TranslatedSource>([
  // ═══════════════════════════════════════════════════════════════════
  // INTERNATIONAL TREATIES (DE file)
  // ═══════════════════════════════════════════════════════════════════

  [
    "INT-OST-1967",
    {
      title:
        "Weltraumvertrag — Vertrag über die Grundsätze zur Regelung der Tätigkeiten von Staaten bei der Erforschung und Nutzung des Weltraums",
      provisions: {
        "Art. I": {
          title: "Freiheit der Erforschung und Nutzung",
          summary:
            "Der Weltraum steht allen Staaten auf der Grundlage der Gleichberechtigung und im Einklang mit dem Völkerrecht zur Erforschung und Nutzung frei.",
        },
        "Art. II": {
          title: "Grundsatz der Nichtaneignung",
          summary:
            "Der Weltraum und die Himmelskörper unterliegen keiner nationalen Aneignung durch Beanspruchung der Hoheitsgewalt, Benutzung, Okkupation oder auf andere Weise.",
        },
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Staaten tragen die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten einschließlich der Tätigkeiten nichtstaatlicher Rechtsträger. Tätigkeiten nichtstaatlicher Rechtsträger bedürfen der Genehmigung und fortlaufenden Aufsicht durch den zuständigen Staat.",
          complianceImplication:
            "Dies ist die Rechtsgrundlage für ALLE nationalen Genehmigungsregime. Jeder deutsche Weltraumbetreiber muss genehmigt werden, weil Deutschland nach Art. VI die Verantwortung für dessen Tätigkeiten trägt.",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Ein Staat, der einen Gegenstand in den Weltraum startet oder den Start eines solchen Gegenstands veranlasst, sowie ein Staat, von dessen Hoheitsgebiet oder Anlage ein Gegenstand gestartet wird, haftet völkerrechtlich für Schäden, die einem anderen Staat oder dessen Bürgern zugefügt werden.",
          complianceImplication:
            "Deutschland haftet als \u201EStartstaat\u201C f\u00FCr Sch\u00E4den, die von seinem Hoheitsgebiet oder durch seine Staatsangeh\u00F6rigen verursachte Weltraumgegenst\u00E4nde hervorrufen. Dies begr\u00FCndet die Versicherungs- und Haftungspflichten.",
        },
        "Art. VIII": {
          title: "Registrierung und Hoheitsgewalt",
          summary:
            "Ein Vertragsstaat, in dessen Register ein in den Weltraum gestarteter Gegenstand eingetragen ist, behält die Hoheitsgewalt und Kontrolle über diesen Gegenstand und das darauf befindliche Personal.",
          complianceImplication:
            "Die Registrierung bestimmt, welcher Staat die Hoheitsgewalt ausübt. In Deutschland registrierte Satelliten unterliegen unabhängig von ihrer Orbitalposition der deutschen Hoheitsgewalt.",
        },
        "Art. IX": {
          title: "Konsultation und Kontaminationsvermeidung",
          summary:
            "Staaten betreiben die Erforschung so, dass eine schädliche Kontamination und nachteilige Veränderungen der Umwelt der Erde vermieden werden. Bei möglicherweise schädlichen Störungen ist eine Konsultation erforderlich.",
          complianceImplication:
            "Rechtsgrundlage für Anforderungen an Weltraummüllvermeidung und Umweltschutz.",
        },
      },
    },
  ],

  [
    "INT-RESCUE-1968",
    {
      title:
        "Weltraumrettungsübereinkommen — Übereinkommen über die Rettung und Rückführung von Raumfahrern sowie die Rückgabe von in den Weltraum gestarteten Gegenständen",
      provisions: {
        "Art. 1-4": {
          title: "Rettung und Rückführung von Raumfahrern",
          summary:
            "Vertragsparteien benachrichtigen, retten und führen Raumfahrer zurück, die in ihrem Hoheitsgebiet landen, und unterstützen Raumfahrer in Not.",
        },
        "Art. 5": {
          title: "Rückgabe von Weltraumgegenständen",
          summary:
            "Weltraumgegenstände, die außerhalb des Hoheitsgebiets der Startbehörde gefunden werden, sind auf Ersuchen an die Startbehörde zurückzugeben.",
          complianceImplication:
            "Relevant für Missionsplanung und End-of-Life-Verfahren — Betreiber sollten einen kontrollierten Wiedereintritt planen, um Rückgabeverpflichtungen zu vermeiden.",
        },
      },
    },
  ],

  [
    "INT-LIABILITY-1972",
    {
      title:
        "Weltraumhaftungsübereinkommen — Übereinkommen über die völkerrechtliche Haftung für Schäden durch Weltraumgegenstände",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Ein Startstaat haftet absolut (verschuldensunabhängig) für Schäden, die seine Weltraumgegenstände auf der Erdoberfläche oder an Luftfahrzeugen im Flug verursachen.",
          complianceImplication:
            "Startstaaten tragen eine verschuldensunabhängige Haftung für Bodenschäden. Dies begründet die Pflichtversicherung in nationalen Weltraumgesetzen — Betreiber müssen Deckung vorhalten, weil der Staat letztlich haftet.",
        },
        "Art. III": {
          title: "Verschuldenshaftung im Weltraum",
          summary:
            "Schäden, die im Weltraum an einem Weltraumgegenstand eines anderen Staates verursacht werden, werden nur bei Verschulden des Startstaats oder seiner Beauftragten ersetzt.",
          complianceImplication:
            "In-Orbit-Kollisionen erfordern einen Verschuldensnachweis. Weniger belastend als die Oberflächenhaftung, begründet aber dennoch Kollisionsvermeidungspflichten.",
        },
        "Art. V": {
          title: "Gesamtschuldnerische Haftung bei gemeinsamen Starts",
          summary:
            "Wenn zwei oder mehr Staaten gemeinsam einen Weltraumgegenstand starten, haften sie gesamtschuldnerisch für alle verursachten Schäden.",
          complianceImplication:
            "Gemeinsame Starts (z. B. Rideshare-Missionen) begründen eine gesamtschuldnerische Haftung. Jeder beteiligte Staat kann für den gesamten Schadensbetrag haftbar gemacht werden.",
        },
      },
    },
  ],

  [
    "INT-REGISTRATION-1975",
    {
      title:
        "Weltraumregistrierungsübereinkommen — Übereinkommen über die Registrierung von in den Weltraum gestarteten Gegenständen",
      provisions: {
        "Art. II": {
          title: "Nationale Registrierungspflicht",
          summary:
            "Jeder Startstaat führt ein Register über in die Erdumlaufbahn oder darüber hinaus gestartete Weltraumgegenstände und unterrichtet den UN-Generalsekretär über die Einrichtung eines solchen Registers.",
          complianceImplication:
            "Deutschland muss ein nationales Weltraumgegenstandsregister führen. Derzeit wird es informell vom DLR verwaltet; ein formelles Register ist im Rahmen des EU Space Act und des künftigen Weltraumgesetzes vorgesehen.",
        },
        "Art. IV": {
          title: "Registrierungsdaten",
          summary:
            "Jeder Staat übermittelt der UNO: Name des Startstaats/der Startstaaten, Bezeichnung/Registriernummer, Datum und Hoheitsgebiet des Starts, grundlegende Orbitalparameter, allgemeine Funktion des Weltraumgegenstands.",
          complianceImplication:
            "Betreiber müssen Start- und Orbitaldaten zur Ermöglichung der Registrierung bereitstellen.",
        },
      },
    },
  ],

  [
    "INT-MOON-1979",
    {
      title:
        "Mondvertrag — Übereinkommen zur Regelung der Tätigkeiten von Staaten auf dem Mond und anderen Himmelskörpern",
      scopeDescription:
        "Von Deutschland NICHT ratifiziert (auch nicht von anderen großen Weltraumnationen außer Österreich im DACH-Raum). Zur Vollständigkeit aufgeführt — das Prinzip des gemeinsamen Erbes der Menschheit ist kontextuell relevant für Weltraumressourcenbetreiber, begründet jedoch keine bindenden Verpflichtungen für deutsche Rechtsträger.",
      provisions: {
        "Art. 11": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine natürlichen Ressourcen sind das gemeinsame Erbe der Menschheit. Ein internationales Regime soll die Ausbeutung der Ressourcen regeln.",
        },
      },
    },
  ],

  [
    "INT-PTBT-1963",
    {
      title:
        "Vertrag über das Verbot von Kernwaffenversuchen in der Atmosphäre, im Weltraum und unter Wasser",
      provisions: {
        "Art. I": {
          title: "Kernwaffentestverbot im Weltraum",
          summary:
            "Die Vertragsparteien verpflichten sich, jede Kernwaffenversuchsexplosion im Weltraum zu untersagen, zu verhindern und nicht durchzuführen.",
        },
      },
    },
  ],

  [
    "INT-ITU-CONST",
    {
      title:
        "ITU-Konstitution und -Konvention — Verfassung und Konvention der Internationalen Fernmeldeunion",
      provisions: {
        "Art. 44": {
          title:
            "Nutzung des Funkfrequenzspektrums und der Satellitenumlaufbahnen",
          summary:
            "Die Mitgliedstaaten bemühen sich, die Anzahl der genutzten Frequenzen und des Spektrums auf das unbedingt Erforderliche zu beschränken. Funkfrequenzen und zugehörige Umlaufbahnen sind begrenzte natürliche Ressourcen, die rationell, effizient und wirtschaftlich genutzt werden müssen.",
          complianceImplication:
            "Rechtsgrundlage für alle Frequenzkoordinierungspflichten. Jeder Satellitenbetreiber muss über seine nationale Verwaltung (BNetzA für Deutschland) anmelden, bevor er eine Funkfrequenz nutzt.",
        },
        "Radio Regulations": {
          title:
            "ITU-Vollzugsordnung für den Funkdienst (völkerrechtlich bindendes Instrument)",
          summary:
            "Die Vollzugsordnung regelt die Zuweisung, Zuteilung und Zuordnung von Funkfrequenzen und Satellitenumlaufbahnen weltweit. Verfahren für die Voranmeldung (API), Koordinierung (CR/C), Notifikation und Eintragung.",
          complianceImplication:
            "Das ITU-Anmeldeverfahren (API → Koordinierung → Notifikation → Eintragung) ist für alle Satellitensysteme verpflichtend. Nichteinhaltung riskiert Störungsansprüche und Verlust von Frequenzrechten.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // GERMAN NATIONAL LAWS
  // ═══════════════════════════════════════════════════════════════════

  [
    "DE-SATDSIG-2007",
    {
      title: "Satellitendatensicherheitsgesetz (SatDSiG)",
      scopeDescription:
        "Gilt NUR für Betreiber hochauflösender Erdbeobachtungssysteme und Verteiler von EO-Daten. Erfasst NICHT: Raumfahrtbetrieb allgemein, Start, In-Orbit-Services, Kommunikationssatelliten oder Navigation. Dies ist Deutschlands einziges weltraumspezifisches Bundesgesetz.",
      provisions: {
        "§§ 3-9 (Teil 2)": {
          title: "Genehmigung von Erdbeobachtungssystemen",
          summary:
            "Der Betrieb eines hochauflösenden Erdbeobachtungssystems unter deutscher Hoheitsgewalt erfordert eine BAFA-Genehmigung. Anträge müssen Datensicherheitsmaßnahmen, IT-Konformität (BSI TR-03140) und die Einhaltung von Empfindlichkeitsschwellen nachweisen.",
          complianceImplication:
            "Jeder deutsche Betreiber von EO-Satelliten mit einer Bodenauflösung ≤ 2,5 m benötigt vor Betriebsaufnahme eine BAFA-Genehmigung.",
        },
        "§§ 11-20 (Teil 3)": {
          title: "Genehmigung für Datenanbieter",
          summary:
            "Die Verbreitung hochauflösender Satellitendaten erfordert eine separate Datenabieter-Genehmigung. Unterliegt Empfindlichkeitsprüfungen (§ 17) und vorrangigem Regierungszugang (§§ 21-22).",
          complianceImplication:
            "Nachgelagerte Datenverteiler — nicht nur Satellitenbetreiber — benötigen eine eigene Genehmigung.",
        },
        "§ 17": {
          title: "Empfindlichkeitsprüfung für Datenanfragen",
          summary:
            "Das BAFA führt Sicherheitsbewertungen für spezifische Datenverbreitungsanfragen durch. Der Bundesnachrichtendienst (BND) kann bei hochsensiblen Anfragen hinzugezogen werden.",
        },
        "§§ 25-26 (Teil 6)": {
          title: "Sanktionen",
          summary:
            "Verstöße können mit Geldbußen bis zu 500.000 € (Ordnungswidrigkeiten) oder strafrechtlichen Sanktionen bei vorsätzlichen Verstößen im Zusammenhang mit Daten der nationalen Sicherheit geahndet werden.",
        },
      },
    },
  ],

  [
    "DE-LUFTVG",
    {
      title: "Luftverkehrsgesetz (LuftVG)",
      provisions: {
        "§ 1 Abs. 2": {
          title: "Raumfahrzeuge im Luftraum",
          summary:
            "Raumfahrzeuge, Raketen und ähnliche Flugkörper gelten als Luftfahrzeuge, solange sie sich im Luftraum befinden.",
          complianceImplication:
            "Jeder Start von deutschem Hoheitsgebiet erfordert eine LBA-Freigabe für den Luftraumtransit, zusätzlich zu etwaigen künftigen weltraumspezifischen Genehmigungen.",
        },
        "§§ 33 ff.": {
          title: "Haftungsbestimmungen",
          summary:
            "Verschuldensunabhängige Haftung für Schäden, die durch Luftfahrzeuge (einschließlich Trägerraketen während des Luftraumtransits) an Personen und Eigentum am Boden verursacht werden.",
        },
      },
    },
  ],

  [
    "DE-TKG-2021",
    {
      title: "Telekommunikationsgesetz (TKG)",
      provisions: {
        "§§ 91 ff.": {
          title: "Frequenzzuteilung für Satellitensysteme",
          summary:
            "Satellitenbetreiber müssen von der BNetzA Frequenzzuteilungen für alle TT&C- und Nutzlastfrequenzen erhalten. Die BNetzA koordiniert ITU-Anmeldungen (API, CR/C, Notifikation, Eintragung) im Auftrag deutscher Betreiber.",
          complianceImplication:
            "Kein deutsches Satellitensystem darf ohne BNetzA-Frequenzzuteilung betrieben werden. Vorlaufzeiten betragen typisch 2–7 Jahre für GEO, 1–3 Jahre für LEO.",
        },
        "§ 165": {
          title: "Sicherheitsanforderungen für TK-Netze",
          summary:
            "Betreiber öffentlicher Telekommunikationsnetze müssen angemessene technische und organisatorische Sicherheitsmaßnahmen umsetzen. Umfasst Satellitennetze. Kritische Komponenten unterliegen der Prüfung nach § 165 Abs. 4.",
          complianceImplication:
            "Satellitenkommunikationsnetze sind TK-Netze im Sinne des TKG — Sicherheitspflichten gelten für das Bodensegment und die Missionskontrollinfrastruktur.",
        },
        "§ 168": {
          title: "Meldepflichten bei Sicherheitsvorfällen",
          summary:
            "Sicherheitsvorfälle, die TK-Netze betreffen, müssen unverzüglich der BNetzA und dem BSI gemeldet werden.",
          complianceImplication:
            "Überschneidung mit NIS2-Vorfallmeldung. Satellitenbetreiber müssen bei Cybervorfällen sowohl an die BNetzA (TKG) als auch an das BSI (NIS2/BSIG) melden.",
        },
      },
    },
  ],

  [
    "DE-AWG-2013",
    {
      title: "Außenwirtschaftsgesetz (AWG)",
      provisions: {
        "§§ 4-8": {
          title: "Ausfuhrgenehmigungspflichten",
          summary:
            "Die Ausfuhr von Gütern, Software und Technologie, die in der Dual-Use-Verordnung oder nationalen Kontrolllisten aufgeführt sind, erfordert eine BAFA-Genehmigung. Umfasst Raumfahrzeugkomponenten, Bodenstationsausrüstung und Kryptografiemodule.",
        },
        "§§ 55 ff. AWV": {
          title: "Investitionsprüfung",
          summary:
            "Übernahmen deutscher Unternehmen durch Nicht-EU/EFTA-Investoren unterliegen der BMWK-Prüfung, wenn das Unternehmen in sensiblen Sektoren wie Raumfahrt/Verteidigung tätig ist.",
          complianceImplication:
            "Ausländische Investitionen in deutsche Raumfahrtunternehmen lösen eine Meldepflicht beim BMWK aus, wenn der Investor ≥ 10 % der Stimmrechte erwirbt.",
        },
      },
    },
  ],

  [
    "DE-AWV-2013",
    {
      title: "Außenwirtschaftsverordnung (AWV)",
      provisions: {
        "§§ 55-62": {
          title: "Sektorspezifische Investitionsprüfung",
          summary:
            "Detaillierte Regeln für die Investitionsprüfung in den Bereichen Verteidigung, IT-Sicherheit und kritische Infrastrukturen. Der Raumfahrtsektor fällt unter kritische Infrastrukturen.",
        },
      },
    },
  ],

  [
    "DE-DUALUSE-2021",
    {
      title: "EU-Dual-Use-Verordnung",
      provisions: {
        "Annex I, Category 7": {
          title: "Navigation und Avionik",
          summary:
            "GNSS-Empfänger, Trägheitsnavigationssysteme, Sternsensoren und verwandte Technologie unterliegen der Ausfuhrkontrolle.",
        },
        "Annex I, Category 9": {
          title: "Luft- und Raumfahrt sowie Antrieb",
          summary:
            "Raumfahrzeuge, Trägerraketen, Antriebssysteme und zugehörige Software/Technologie. Umfasst komplette Satelliten, Reaktionsräder, Solarmodule oberhalb festgelegter Schwellenwerte.",
        },
        "Art. 4": {
          title: "Auffangklausel",
          summary:
            "Auch nicht gelistete Güter erfordern eine Genehmigung, wenn dem Ausführer bekannt ist, dass sie für Massenvernichtungswaffen, militärische Endverwendung in unter Embargo stehenden Ländern oder gelistete Endverbraucher bestimmt sein können.",
          complianceImplication:
            "Raumfahrtkomponentenexporteure müssen jede Transaktion überprüfen, nicht nur gelistete Güter.",
        },
      },
    },
  ],

  [
    "DE-KWKG",
    {
      title: "Kriegswaffenkontrollgesetz (KWKG)",
      scopeDescription:
        "Relevant für Trägerraketen mit Militärtechnologie-Ursprung und Dual-Use-Nutzlasten. Die meisten kommerziellen Raumfahrtaktivitäten fallen nicht unter das KWKG, es sei denn, die Nutzlast oder der Träger hat eine militärische Einstufung.",
      provisions: {
        "§§ 1-3": {
          title: "Verbot und Genehmigungspflicht für Kriegswaffen",
          summary:
            "Herstellung, Erwerb, Überlassung und Beförderung von Kriegswaffen erfordern eine staatliche Genehmigung. Die Kriegswaffenliste umfasst bestimmte Raketensysteme und weltraumfähige Trägerraketen oberhalb festgelegter Schwellenwerte.",
        },
      },
    },
  ],

  [
    "DE-BSIG-NIS2",
    {
      title: "BSI-Gesetz (BSIG), geändert durch NIS2UmsuCG",
      provisions: {
        "§§ 30-31": {
          title: "Risikomanagement und Vorfallmeldung für NIS2-Einrichtungen",
          summary:
            "Einrichtungen in Sektoren hoher Kritikalität (einschließlich Raumfahrt — NIS2 Anhang I) müssen Cybersicherheits-Risikomanagementmaßnahmen umsetzen und signifikante Vorfälle dem BSI innerhalb von 24 Stunden (Frühwarnung) und 72 Stunden (vollständige Meldung) melden.",
          complianceImplication:
            "Deutsche Weltraumbetreiber, die als ‚wichtig' oder ‚wesentlich' nach NIS2 eingestuft sind, müssen §§ 30-31 BSIG einhalten. Dies ist die deutsche Umsetzung von NIS2 Art. 21 und Art. 23.",
        },
        "§ 33": {
          title: "Registrierungspflicht",
          summary:
            "NIS2-Einrichtungen müssen sich beim BSI registrieren und dabei Kontaktdaten, Sektorklassifizierung und Mitgliedstaatpräsenz angeben.",
        },
        "§ 41": {
          title: "Kritische Komponenten",
          summary:
            "Der Einsatz kritischer Komponenten in erfasster Infrastruktur erfordert eine Meldung an das BSI. Das BMWK kann den Einsatz bestimmter Komponenten von nicht vertrauenswürdigen Anbietern untersagen.",
          complianceImplication:
            "Bodensegment- und Missionskontrollsysteme, die Komponenten bestimmter Anbieter nutzen, können eine BSI-Freigabe erfordern.",
        },
      },
    },
  ],

  [
    "DE-UVPG",
    {
      title: "Gesetz über die Umweltverträglichkeitsprüfung (UVPG)",
      provisions: {
        "§ 1": {
          title: "Zweck und Anwendungsbereich",
          summary:
            "Umweltverträglichkeitsprüfungen sind für Vorhaben vorgeschrieben, die erhebliche Auswirkungen auf die Umwelt haben können. Umfasst den Bau und Betrieb von Startanlagen.",
          complianceImplication:
            "Jede Startplatzentwicklung in Deutschland löst eine vollständige UVP aus. Relevant für künftige deutsche Weltraumhafen-Vorhaben.",
        },
      },
    },
  ],

  [
    "DE-PRODHAFTG",
    {
      title: "Produkthaftungsgesetz (ProdHaftG)",
      provisions: {
        "§ 1": {
          title: "Verschuldensunabhängige Produkthaftung",
          summary:
            "Ein Hersteller haftet für Schäden, die durch einen Fehler seines Produkts verursacht werden. Potenziell anwendbar auf Raumfahrzeugkomponenten, Bodenausrüstung und an Dritte gelieferte Satellitensubsysteme.",
          complianceImplication:
            "Raumfahrtkomponentenhersteller sollten den Produkthaftungsschutz überprüfen. Die Einrede des Entwicklungsrisikos (§ 1 Abs. 2 Nr. 5) kann auf neuartige Weltraumtechnologien anwendbar sein.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // BSI TECHNICAL STANDARDS (DE)
  // ═══════════════════════════════════════════════════════════════════

  [
    "DE-BSI-TR-03184-1",
    {
      title:
        "BSI TR-03184-1: Informationssicherheit für Weltraumsysteme — Raumsegment",
      provisions: {
        "Chapter 3": {
          title: "Bedrohungslage für das Raumsegment",
          summary:
            "Systematische Analyse der Cybersicherheitsbedrohungen für Satellitenplattformen: Jamming, Spoofing, Replay-Angriffe, Befehlseinschleusung, Firmware-Manipulation, Lieferkettenkompromittierung.",
        },
        "Chapter 4": {
          title: "Sicherheitsmaßnahmen für Raumfahrzeuge",
          summary:
            "Verpflichtende und empfohlene Gegenmaßnahmen: verschlüsselte TT&C-Verbindungen, authentifizierte Befehlskanäle, Firmware-Integritätsprüfung, Secure Boot, Anomalieerkennung, Schlüsselmanagement, Redundanz.",
          complianceImplication:
            "Quasi-verbindlich für KRITIS-Betreiber. ESA-, DLR- und Bundeswehr-Verträge erfordern TR-03184-Konformität. Haftungsrelevanz: Nichtumsetzung begründet Fahrlässigkeitsexposition.",
        },
      },
    },
  ],

  [
    "DE-BSI-TR-03184-2",
    {
      title:
        "BSI TR-03184-2: Informationssicherheit für Weltraumsysteme — Bodensegment",
      provisions: {
        "Full document": {
          title: "Sicherheitsanforderungen für das Bodensegment",
          summary:
            "Sicherheitsanforderungen für Missionskontrollzentren, Bodenstationen, TT&C-Infrastruktur, Datenverarbeitung. Umfasst Netzwerksegmentierung, Zugriffskontrolle, Schlüsselmanagement, sicheren Betrieb, Überwachung. Kompatibel mit ISO 27001/27002, NIST CSF, ECSS, CCSDS, MITRE ATT&CK.",
          complianceImplication:
            "Bodensegmentbetreiber, die NIS2-Einrichtungen sind, müssen diese Maßnahmen umsetzen. TR-03184-2 ist die BSI-Auslegung des ‚Stands der Technik' für Weltraumboden-Infrastruktur.",
        },
      },
    },
  ],

  [
    "DE-BSI-TR-03184-AUDIT",
    {
      title:
        "BSI TR-03184 Prüfvorschrift (Konformitätsbewertung Raum- und Bodensegment)",
      provisions: {
        "Full document": {
          title: "Konformitätsbewertungsverfahren",
          summary:
            "Definiert Prüfkriterien und -verfahren zur Bewertung der Konformität mit TR-03184 Teil 1 und 2. Legt die Zertifizierungsgrundlage für die Cybersicherheitskonformität von Weltraumsystemen fest.",
          complianceImplication:
            "Organisationen, die eine TR-03184-Zertifizierung anstreben, müssen diesem Prüfstandard folgen. Veröffentlicht März 2026 — die neueste BSI-Weltraumpublikation.",
        },
      },
    },
  ],

  [
    "DE-BSI-TR-03140",
    {
      title:
        "BSI TR-03140: Konformitätsbewertung nach Satellitendatensicherheitsgesetz",
      provisions: {
        "Full document": {
          title: "IT-Sicherheitskonformität für EO-Systeme",
          summary:
            "Definiert die IT-Sicherheitsbewertungskriterien, die für eine BAFA-Genehmigung nach SatDSiG erfüllt werden müssen. Das BSI führt die technische Bewertung durch.",
          complianceImplication:
            "Zwingende Voraussetzung für die SatDSiG-Genehmigung — das BAFA erteilt keine Genehmigung ohne positive BSI TR-03140-Konformitätsbewertung.",
        },
      },
    },
  ],

  [
    "DE-BSI-GRUNDSCHUTZ-SPACE",
    {
      title:
        "IT-Grundschutz-Profil für Weltraumsysteme (Raum- und Bodensegment)",
      provisions: {
        "Full profile": {
          title: "Mindest-Sicherheitsbasislinie für Weltraumsysteme",
          summary:
            "Wendet die BSI-IT-Grundschutz-Methodik auf den gesamten Lebenszyklus von Weltraumsystemen an. Definiert Mindest-Sicherheitsmaßnahmen (Basisabsicherung) und Standardmaßnahmen (Standardabsicherung) für Raum- und Bodensegmente.",
          complianceImplication:
            "Bietet einen strukturierten Weg zum Nachweis der NIS2-Konformität über das IT-Grundschutz-Zertifizierungsschema. Von deutschen Behörden als Nachweis angemessener Sicherheitsmaßnahmen anerkannt.",
        },
      },
    },
  ],

  [
    "DE-BSI-POSITION-SPACE",
    {
      title: "BSI-Positionspapier: Cybersicherheit für Weltrauminfrastrukturen",
      provisions: {
        "Full paper": {
          title: "BSI-Positionierung zur Weltraum-Cybersicherheit",
          summary:
            "Strategisches Positionspapier, das den Ansatz des BSI zum Schutz von Weltrauminfrastrukturen darlegt. Kontextualisiert TR-03184, IT-Grundschutz und NIS2-Anforderungen im breiteren Rahmen der Cybersicherheitspolitik.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // EU LAW
  // ═══════════════════════════════════════════════════════════════════

  [
    "EU-SPACE-ACT",
    {
      title:
        "EU-Weltraumgesetz — Verordnung über die europäische Weltraumwirtschaft",
      provisions: {
        "Art. 6-16": {
          title: "Harmonisiertes Genehmigungsregime",
          summary:
            "Schafft einen gemeinsamen EU-Genehmigungsrahmen für Weltraumaktivitäten. Nationale zuständige Behörden erteilen Genehmigungen auf Grundlage harmonisierter Kriterien. Gegenseitige Anerkennung über Mitgliedstaaten hinweg.",
          complianceImplication:
            "Nach Inkrafttreten schafft dies die erste umfassende Genehmigungspflicht für ALLE Weltraumaktivitäten in Deutschland — und schließt die Lücke des fehlenden Weltraumgesetzes.",
        },
        "Art. 20": {
          title: "Pflichten für Drittstaatbetreiber",
          summary:
            "Nicht-EU-Betreiber, die Dienstleistungen in der EU erbringen, müssen einen EU-Vertreter benennen und sich bei einer nationalen Behörde registrieren.",
        },
        "Art. 63-73": {
          title: "Weltraummüllvermeidung und Weltraumhachhaltigkeit",
          summary:
            "Verpflichtende Verfolgbarkeit, Kollisionsvermeidung, Manövrierfähigkeit, Weltraummüllvermeidungspläne, End-of-Life-Entsorgung und Erklärungen zum ökologischen Fußabdruck.",
        },
        "Art. 74-95": {
          title: "Cybersicherheitsanforderungen",
          summary:
            "Weltraumspezifische Cybersicherheitsmaßnahmen aufbauend auf NIS2. Abdeckung von Raumsegment, Bodensegment und Kommunikationsverbindungen.",
        },
      },
    },
  ],

  [
    "EU-SPACE-PROG-2021",
    {
      title: "EU-Weltraumprogramm-Verordnung",
      provisions: {
        "Full regulation": {
          title: "Rechtsrahmen für EU-Weltraumprogramme",
          summary:
            "Schafft die Rechtsgrundlage für Copernicus (Erdbeobachtung), Galileo/EGNOS (Navigation), GOVSATCOM (staatliche Satellitenkommunikation) und SSA/SST (Weltraumlageerfassung). Regelt die Rolle der EUSPA.",
          complianceImplication:
            "Betreiber, die zu EU-Weltraumprogrammen beitragen oder diese nutzen, müssen die Zugangs- und Datenrichtlinien einhalten. SSA/SST-Datenaustauschpflichten gelten für Betreiber in EU-Mitgliedstaaten.",
        },
      },
    },
  ],

  [
    "EU-NIS2-2022",
    {
      title: "NIS2-Richtlinie — Netz- und Informationssicherheit",
      provisions: {
        "Annex I, Sector 11": {
          title: "Raumfahrt als Sektor hoher Kritikalität",
          summary:
            "Raumfahrt ist ausdrücklich als Sektor hoher Kritikalität aufgeführt. Betreiber bodengestützter Infrastruktur, Satellitenbetreiber, die wesentliche Dienste erbringen, und Anbieter von Weltraumlageerfassung fallen in den NIS2-Anwendungsbereich.",
          complianceImplication:
            "Mittlere und große Weltraumbetreiber in der EU fallen automatisch in den Anwendungsbereich. Klein- und Kleinstunternehmen sind ausgenommen, sofern nicht von einem Mitgliedstaat benannt.",
        },
        "Art. 21": {
          title: "Cybersicherheits-Risikomanagementmaßnahmen",
          summary:
            "Art. 21(2)(a)-(j): 10 Kategorien verpflichtender Maßnahmen einschließlich Risikoanalyse, Vorfallbehandlung, Geschäftskontinuität, Lieferkette, Netzsicherheit, Wirksamkeitsbewertung, Cyberhygiene, Kryptografie, Personalwesen/Zugriffskontrolle, MFA.",
        },
        "Art. 23": {
          title: "Vorfallmeldepflichten",
          summary:
            "Frühwarnung innerhalb von 24 Stunden, Meldung innerhalb von 72 Stunden, Zwischenbericht auf Anfrage, Abschlussbericht innerhalb eines Monats.",
        },
      },
    },
  ],

  [
    "EU-CRA-2024",
    {
      title: "Cyberresilienzgesetz",
      provisions: {
        "Annex I": {
          title:
            "Wesentliche Cybersicherheitsanforderungen für Produkte mit digitalen Elementen",
          summary:
            "Security by Design, Schwachstellenbehandlung, SBOM, sichere Aktualisierungsmechanismen, 5-jährige Unterstützungsdauer.",
          complianceImplication:
            "Raumfahrzeug-Flugsoftware, Bodenstationsausrüstung und Satellitenkommunikationsmodule sind ‚Produkte mit digitalen Elementen' — das CRA gilt für Hersteller, die sie auf den EU-Markt bringen.",
        },
        "Annex III/IV": {
          title: "Produktklassifizierung (Klasse I / Klasse II)",
          summary:
            "Klasse-II-Produkte (Komponenten kritischer Infrastrukturen, kryptografische Hardware) erfordern eine Konformitätsbewertung durch Dritte. Klasse-I-Produkte können harmonisierte Normen für die Selbstbewertung nutzen.",
        },
        "Art. 14": {
          title: "Schwachstellenmeldung",
          summary:
            "Aktiv ausgenutzte Schwachstellen müssen der ENISA innerhalb von 24 Stunden gemeldet werden. Schwere Vorfälle innerhalb von 72 Stunden. Patches innerhalb von 14 Tagen nach Verfügbarkeit.",
        },
      },
    },
  ],

  [
    "EU-DORA-2022",
    {
      title: "Verordnung über die digitale operationale Resilienz (DORA)",
      scopeDescription:
        "Nur relevant für Weltraumbetreiber, die kritische IKT-Dienste für den Finanzsektor erbringen (z. B. SATCOM für Handelsplattformen, Timing-Dienste für Finanznetzwerke).",
      provisions: {
        "Art. 3, 28-30": {
          title: "IKT-Drittparteien-Risikomanagement",
          summary:
            "Finanzunternehmen müssen IKT-Risiken von Drittanbietern managen, einschließlich Anbieter von Satellitenkommunikation. Relevant, wenn ein Weltraumbetreiber kritische IKT-Dienste für Finanzinstitute erbringt.",
        },
      },
    },
  ],

  [
    "EU-EASA-2018",
    {
      title: "EASA-Grundverordnung",
      provisions: {
        "Art. 2(3)(d)": {
          title: "Suborbitalflüge und Luftraumübergang",
          summary:
            "Das EASA-Mandat umfasst Luftfahrzeugbetrieb einschließlich der Übergangsphase weltraumgebundener Fahrzeuge durch den regulierten Luftraum. Suborbitale Fluggeräte können unter die EASA-Zertifizierung fallen.",
          complianceImplication:
            "Trägerraketen, die den europäischen Luftraum durchqueren, interagieren mit EASA-reguliertem Luftverkehr. Koordinierung mit nationalen Luftfahrtbehörden (LBA in Deutschland) ist erforderlich.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // GERMAN POLICY DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════

  [
    "DE-RAUMFAHRTSTRATEGIE-2023",
    {
      title: "Raumfahrtstrategie der Bundesregierung 2023",
      provisions: {
        "Chapter: Regulatory Framework": {
          title: "Ankündigung eines nationalen Weltraumgesetzes",
          summary:
            "Die Strategie verpflichtet zur Verabschiedung eines umfassenden deutschen Weltraumgesetzes zur Festlegung von Genehmigungs-, Registrierungs-, Haftungs- und Versicherungspflichten für alle nichtstaatlichen Weltraumaktivitäten.",
          complianceImplication:
            "Politisches Signal, dass ein Weltraumgesetz politisch beabsichtigt ist. Betreiber sollten sich auf künftige Genehmigungspflichten vorbereiten.",
        },
      },
    },
  ],

  [
    "DE-WRG-ECKPUNKTE-2024",
    {
      title: "Eckpunktepapier der Bundesregierung für ein Weltraumgesetz",
      scopeDescription:
        "Kabinettsbeschluss (September 2024). Der vollständige Gesetzentwurf wurde NIEMALS in den Bundestag eingebracht — die Ampel-Koalition zerbrach im Dezember 2024, bevor ein Gesetzestext fertiggestellt wurde. Die Eckpunkte bleiben das detaillierteste öffentliche Dokument zur geplanten deutschen Weltraumgesetzarchitektur.",
      provisions: {
        Genehmigungspflicht: {
          title:
            "Genehmigungspflicht für alle nichtstaatlichen Weltraumaktivitäten",
          summary:
            "Alle privaten Weltraumaktivitäten, die vom deutschen Hoheitsgebiet oder von deutsch-kontrollierten Einrichtungen ausgeführt werden, würden eine staatliche Genehmigung erfordern.",
        },
        Registrierung: {
          title: "Nationales Weltraumgegenstandsregister",
          summary:
            "Verpflichtende Registrierung aller unter deutscher Hoheitsgewalt gestarteten Weltraumgegenstände in einem nationalen Register.",
        },
        "Haftung & Regress": {
          title: "Haftungsregime mit gedeckeltem Regress",
          summary:
            "Betreiberhaftung mit Regress gedeckelt auf 10 % des durchschnittlichen Jahresumsatzes der letzten 3 Jahre, maximal 50 Millionen Euro. Der Staat trägt die Resthaftung oberhalb der Betreiberdeckung.",
          complianceImplication:
            "Bei Verabschiedung wären die 50-Mio.-€-Deckelung und die 10-%-Regressgrenze das betreiberfreundlichste Regime in Europa.",
        },
        Versicherungspflicht: {
          title: "Pflichtversicherung",
          summary:
            "Betreiber müssen eine Haftpflichtversicherung für Dritte abschließen. Bankbürgschaft als Alternative akzeptiert. Deckungsschwellen werden per Verordnung festgelegt.",
        },
        Startplatzzulassung: {
          title: "Startplatzzulassung mit Umweltverträglichkeitsprüfung",
          summary:
            "Startanlagen auf deutschem Hoheitsgebiet erfordern eine spezifische Genehmigung einschließlich vollständiger Umweltverträglichkeitsprüfung (UVP).",
        },
        Notstandsregelung: {
          title: "Notstandsregelung",
          summary:
            "Der Bundeswehr werden Notfallzugangsrechte zu privaten Weltraumressourcen in Krisensituationen eingeräumt.",
          complianceImplication:
            "Umstrittene Bestimmung — Weltraumbetreiber sollten die mögliche militärische Beschlagnahme kommerzieller Ressourcen in Notsituationen beachten.",
        },
      },
    },
  ],

  [
    "DE-KOALITIONSVERTRAG-2025",
    {
      title: "Koalitionsvertrag CDU/CSU-SPD 2025",
      provisions: {
        "Space section": {
          title: "Verpflichtung zum Weltraumgesetz",
          summary:
            "Der Koalitionsvertrag nennt die Verabschiedung eines umfassenden deutschen Weltraumgesetzes ausdrücklich als Gesetzgebungspriorität. Details und Zeitplan sind nicht angegeben.",
          complianceImplication:
            "Eine politische Verpflichtung besteht — ein neuer Anlauf zum Weltraumgesetz wird in dieser Legislaturperiode (2025–2029) erwartet. Betreiber sollten mit künftigen Genehmigungspflichten rechnen.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // FRENCH SOURCES
  // ═══════════════════════════════════════════════════════════════════

  [
    "INT-ESA-CONV-1975",
    {
      title:
        "ESA-Übereinkommen — Übereinkommen zur Gründung einer Europäischen Weltraumorganisation",
      provisions: {
        "Art. II": {
          title: "Zweck der Agentur",
          summary:
            "Die ESA fördert die Zusammenarbeit europäischer Staaten in der Weltraumforschung und -technologie für ausschließlich friedliche Zwecke.",
          complianceImplication:
            "Frankreich als Gründungsmitglied beteiligt sich an allen obligatorischen ESA-Programmen und trägt ca. 25 % des ESA-Budgets bei — der größte Beitragszahler.",
        },
        "Art. V": {
          title: "Programme und Tätigkeiten",
          summary:
            "Legt obligatorische und optionale Programmkategorien fest. Mitgliedstaaten müssen zu obligatorischen Tätigkeiten beitragen und können sich an optionalen Programmen beteiligen.",
        },
        "Annex V": {
          title: "Industriepolitik",
          summary:
            "Die ESA-Industriepolitik strebt einen ‚fairen Rückfluss' (juste retour) an — jeder Mitgliedstaat erhält Industrieaufträge im Verhältnis zu seinem Finanzbeitrag.",
          complianceImplication:
            "Die französische Raumfahrtindustrie profitiert vom geografischen Rückfluss auf Frankreichs Beiträge. Arianespace und ArianeGroup sind Hauptbegünstigte des Trägerprogramms.",
        },
      },
    },
  ],

  [
    "INT-ISS-1998",
    {
      title: "Zwischenstaatliches Abkommen über die Internationale Raumstation",
      provisions: {
        "Art. 16": {
          title: "Gegenseitiger Haftungsverzicht (Cross-Waiver)",
          summary:
            "Partnerstaaten und ihre verbundenen Einrichtungen vereinbaren einen gegenseitigen Haftungsverzicht für Schäden aus ISS-Tätigkeiten, mit Ausnahme von vorsätzlichem Fehlverhalten und bestimmten IP-Ansprüchen.",
          complianceImplication:
            "Französische Einrichtungen, die Nutzlasten auf der ISS betreiben, profitieren vom Cross-Waiver-Regime. Dies ist ein einzigartiger Haftungsrahmen, der vom Standardregime des Haftungsübereinkommens abweicht.",
        },
        "Art. 21": {
          title: "Geistiges Eigentum",
          summary:
            "Auf dem Element eines Partners erzeugtes geistiges Eigentum wird so behandelt, als sei es auf dem Hoheitsgebiet dieses Partners erzeugt worden; es gelten die nationalen IP-Gesetze.",
        },
      },
    },
  ],

  [
    "INT-CTBT-1996",
    {
      title: "Umfassender Kernwaffenteststopp-Vertrag (CTBT)",
      provisions: {
        "Art. I": {
          title: "Grundverpflichtungen",
          summary:
            "Jeder Vertragsstaat verpflichtet sich, keine Kernwaffenversuchsexplosion oder sonstige nukleare Explosion durchzuführen, einschließlich im Weltraum.",
          complianceImplication:
            "Verbietet jede Nuklearversuchsexplosion im Weltraum. Frankreich war einer der ersten Kernwaffenstaaten, der ratifizierte (6. April 1998).",
        },
        "Art. IV": {
          title: "Verifikationsregime",
          summary:
            "Schafft das Internationale Überwachungssystem (IMS) mit seismischen, hydroakustischen, Infraschall- und Radionuklid-Stationen. Frankreich beherbergt mehrere IMS-Stationen.",
        },
      },
    },
  ],

  [
    "FR-INT-MOON-1979",
    {
      title: "Mondvertrag — Frankreich (unterzeichnet, nicht ratifiziert)",
      scopeDescription:
        "Frankreich hat den Mondvertrag am 29. Januar 1980 UNTERZEICHNET, aber NICHT ratifiziert. Das Prinzip des gemeinsamen Erbes ist vermerkt, begründet jedoch keine bindenden Verpflichtungen für französische Rechtsträger. Frankreich hat 2022 die Artemis Accords unterzeichnet, die einen anderen Ansatz zur Ressourcennutzung verfolgen.",
      provisions: {
        "Art. 11": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine natürlichen Ressourcen sind das gemeinsame Erbe der Menschheit.",
        },
        "Art. 6": {
          title: "Wissenschaftliche Untersuchung",
          summary:
            "Vertragsstaaten haben das Recht, während wissenschaftlicher Untersuchungen Proben vom Mond zu sammeln und zu entfernen.",
        },
      },
    },
  ],

  [
    "FR-INT-OST-RATIFICATION",
    {
      title: "Weltraumvertrag — Französische Ratifizierung",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Frankreich trägt die völkerrechtliche Verantwortung für alle französischen Weltraumaktivitäten, einschließlich nichtstaatlicher Rechtsträger. Dies ist die verfassungsrechtliche Grundlage des Genehmigungsregimes der LOS 2008.",
          complianceImplication:
            "Art. VI ist die unmittelbare Rechtsgrundlage für Frankreichs Weltraumoperationsgesetz (LOS 2008). Jeder französische Weltraumbetreiber muss genehmigt werden.",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Frankreich ist als Startstaat f\u00FCr vom CSG (Kourou) gestartete und von franz\u00F6sischen Betreibern betriebene Gegenst\u00E4nde verantwortlich. Dies begr\u00FCndet die Pflichtversicherung der LOS Art. 6.",
          complianceImplication:
            "Als primärer europäischer Startstaat (über das CSG) trägt Frankreich eine erhebliche Startstaat-Haftungsexposition.",
        },
      },
    },
  ],

  [
    "FR-INT-REGISTRATION-1975",
    {
      title:
        "Registrierungsübereinkommen — Französische Ratifizierung (erster ratifizierender Staat)",
      provisions: {
        "Art. II": {
          title: "Nationale Registrierungspflicht",
          summary:
            "Frankreich muss ein nationales Register der in die Erdumlaufbahn oder darüber hinaus gestarteten Weltraumgegenstände führen. Das CNES verwaltet das französische Nationalregister gemäß LOS Art. 12.",
          complianceImplication:
            "Alle unter französischer Hoheitsgewalt gestarteten Weltraumgegenstände müssen registriert werden. Das CNES führt das Register; Betreiber müssen die erforderlichen Daten liefern.",
        },
        "Art. IV": {
          title: "Registrierungsdaten",
          summary:
            "Frankreich muss der UNO übermitteln: Name des Startstaats, Bezeichnung/Registriernummer, Datum und Hoheitsgebiet des Starts, grundlegende Orbitalparameter und allgemeine Funktion.",
        },
      },
    },
  ],

  [
    "FR-INT-RESCUE-1968",
    {
      title: "Weltraumrettungsübereinkommen — Französische Ratifizierung",
      provisions: {
        "Art. 1-4": {
          title: "Rettung und Rückführung von Raumfahrern",
          summary:
            "Frankreich als Vertragspartei benachrichtigt, rettet und führt Raumfahrer zurück, die auf französischem Hoheitsgebiet landen (einschließlich Überseegebiete). Relevant für Wiedereintrittsszenarien über Französisch-Guayana.",
          complianceImplication:
            "Die Nähe zum CSG begründet spezifische Rettungsverpflichtungen. Frankreich unterhält Notfallkapazitäten für Besatzungsrückkehrszenarien in der Region Guayana.",
        },
        "Art. 5": {
          title: "Rückgabe von Weltraumgegenständen",
          summary:
            "Auf französischem Hoheitsgebiet gefundene Weltraumgegenstände werden auf Ersuchen an die Startbehörde zurückgegeben.",
        },
      },
    },
  ],

  [
    "FR-INT-LIABILITY-1972",
    {
      title: "Weltraumhaftungsübereinkommen — Französische Ratifizierung",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Frankreich als Startstaat haftet absolut für Schäden, die Weltraumgegenstände auf der Erdoberfläche oder an Luftfahrzeugen im Flug verursachen.",
          complianceImplication:
            "Als primärer europäischer Startstaat (CSG) trägt Frankreich eine erhebliche absolute Haftungsexposition für Oberflächenschäden bei Starts. Unmittelbare Rechtsgrundlage für das strenge LOS-Versicherungsregime.",
        },
        "Art. III": {
          title: "Verschuldenshaftung im Weltraum",
          summary:
            "In-Orbit-Schäden erfordern einen Verschuldensnachweis. Weniger belastend als die Oberflächenhaftung, begründet aber Kollisionsvermeidungspflichten.",
        },
        "Art. V": {
          title: "Gesamtschuldnerische Haftung",
          summary:
            "Gemeinsame Starts (z. B. Ariane-Rideshare vom CSG) begründen eine gesamtschuldnerische Haftung. Frankreich und mitbeteiligte Startstaaten haften gesamtschuldnerisch.",
          complianceImplication:
            "Rideshare-Missionen vom CSG umfassen mehrere Startstaaten. Jeder beteiligte Staat kann für den gesamten Schadensbetrag haftbar gemacht werden.",
        },
      },
    },
  ],

  [
    "FR-LOS-2008",
    {
      title: "Französisches Weltraumoperationsgesetz (LOS)",
      scopeDescription:
        "Die LOS 2008 ist der Eckpfeiler des französischen Weltraumrechts. 30 Artikel in 8 Titeln über Genehmigung, Versicherung, Registrierung, Haftung, CSG-Sicherheit und EO-Daten. Geändert durch Ordonnance 2022-232 (Verteidigung) und Loi 2023-703 Art. 60 (Konstellationen, wiederverwendbare Träger).",
      provisions: {
        "Art. 1": {
          title: "Definitionen — opération spatiale",
          summary:
            "Definiert ‚Weltraumoperation' als jede Tätigkeit des Startens, Startversuchs oder der Übernahme des Kommandos über einen Weltraumgegenstand sowie alle Flugphasen bis zum Ende der aktiven Lebensdauer oder der Rückkehr zur Erde.",
          complianceImplication:
            "Die weite Definition erfasst Startanbieter, Satellitenbetreiber und In-Orbit-Service-Anbieter. Jede Einrichtung, die diese Tätigkeiten unter französischer Hoheitsgewalt ausübt, benötigt eine Genehmigung.",
        },
        "Art. 2-8 (Titre II)": {
          title: "Genehmigungsregime",
          summary:
            "Jeder Betreiber, der Weltraumoperationen unter französischer Hoheitsgewalt durchführt, muss eine vorherige Genehmigung des Ministers einholen. Doppelte Genehmigung erforderlich: eine für den Start, eine für das Kommando.",
          complianceImplication:
            "Das Genehmigungsregime ist die Kernverpflichtung. Anträge erfordern ein dreiteiliges Dossier (administrativ, technisch, Verteidigung). Der Minister entscheidet innerhalb von 4 Monaten.",
        },
        "Art. 6": {
          title: "Pflicht-Haftpflichtversicherung",
          summary:
            "Betreiber müssen eine Versicherung oder Finanzgarantie für Schäden an Dritten vorhalten. Der Staat garantiert über den versicherten Betrag hinaus.",
          complianceImplication:
            "Frankreich betreibt ein zweistufiges Haftungssystem: Betreiber deckt den versicherten Betrag, der Staat deckt darüber hinaus. Kein fester Deckel — Beträge werden je Genehmigung festgelegt.",
        },
        "Art. 12": {
          title: "Nationale Weltraumgegenstandsregistrierung",
          summary:
            "Das CNES führt das nationale Register der Weltraumgegenstände. Betreiber müssen Starts melden und Orbitaldaten liefern. Registrierungsdaten werden an den UN-Generalsekretär übermittelt.",
          complianceImplication:
            "Verpflichtende Registrierung beim CNES für alle unter französischer Hoheitsgewalt gestarteten Gegenstände.",
        },
        "Art. 13-20 (Titre IV)": {
          title: "Haftungsregime",
          summary:
            "Der Betreiber haftet für durch Weltraumgegenstände während des Betriebs verursachte Schäden. Der Staat kann beim Betreiber Regress nehmen. Verjährung: 1 Jahr ab Schadenskenntnis, maximal 3 Jahre ab Ereignis.",
        },
        "Art. 21 (Titre V)": {
          title: "CNES police spéciale am CSG",
          summary:
            "Das CNES übt die police spéciale (Regulierungspolizei) für die Sicherheit am Centre Spatial Guyanais aus.",
          complianceImplication:
            "Alle Betreiber am CSG unterliegen den CNES-Sicherheitsvorschriften.",
        },
        "Art. 23-25 (Titre VI)": {
          title: "Erdbeobachtungsdatenregime",
          summary:
            "Die Verwertung primärer EO-Daten aus dem Weltraum erfordert eine Erklärung gegenüber dem SGDSN. Daten können Beschränkungen aus Gründen der nationalen Verteidigung und Sicherheit unterliegen.",
          complianceImplication:
            "EO-Datenbetreiber müssen beim SGDSN 2 Monate vor Beginn der kommerziellen Verwertung anmelden.",
        },
      },
    },
  ],

  [
    "FR-ORD-2022-232",
    {
      title: "Verordnung über Weltraumoperationen für die Landesverteidigung",
      provisions: {
        "Art. 1-3": {
          title: "Befreiung für Verteidigungsoperationen",
          summary:
            "Für die Landesverteidigung durchgeführte Weltraumoperationen können von bestimmten LOS-2008-Genehmigungspflichten befreit werden.",
          complianceImplication:
            "Militärische Weltraumbetreiber (CDE, DGA) unterliegen einem parallelen Regime. Kommerzielle Betreiber, die Verteidigungsmissionen unterstützen, können ebenfalls von vereinfachten Verfahren profitieren.",
        },
        "Art. 4-6": {
          title: "Requisitionsregime",
          summary:
            "Der Staat kann private Weltraumressourcen und -fähigkeiten in Situationen dringender nationaler Sicherheit requirieren. Entschädigungsbestimmungen enthalten.",
          complianceImplication:
            "Kommerzielle Betreiber sollten beachten, dass ihre Weltraumressourcen in Krisensituationen requiriert werden können.",
        },
        "Art. 7": {
          title: "Weltraum-zu-Weltraum-Beobachtung",
          summary:
            "Erweitert das EO-Datenregime (LOS Art. 23-25) auf die Beobachtung von Objekten im Weltraum aus dem Weltraum (Rendez-vous und Annäherungsoperationen, SSA aus dem Orbit).",
        },
      },
    },
  ],

  [
    "FR-LPM-2023-703-ART60",
    {
      title:
        "Militärprogrammgesetz 2024-2030, Artikel 60 — Weltraumbestimmungen",
      provisions: {
        "Art. 60 §I": {
          title: "Ratifizierung der Ordonnance 2022-232",
          summary:
            "Ratifiziert formell die Verordnung vom Februar 2022 über Verteidigungs-Weltraumoperationen und verleiht ihr volle Gesetzeskraft.",
        },
        "Art. 60 §II": {
          title: "Konstellationskonzept in der LOS",
          summary:
            "Führt den Rechtsbegriff ‚Konstellation' in das französische Weltraumrecht ein. Ermöglicht eine Gruppengenehmigung für Konstellationen von 10 oder mehr Objekten unter einem einzigen Betreiber.",
          complianceImplication:
            "Mega-Konstellationsbetreiber können nun eine einzige Genehmigung für die gesamte Konstellation beantragen statt je Objekt.",
        },
        "Art. 60 §III": {
          title: "Bestimmungen für wiederverwendbare Träger",
          summary:
            "Passt den LOS-Rahmen an wiederverwendbare Trägerraketen an. Stellt klar, dass Rückkehr-zum-Startplatz-Operationen vom Genehmigungsregime erfasst sind.",
          complianceImplication:
            "Ausgelegt für Ariane 6 SUSIE und künftige wiederverwendbare Fahrzeuge. Die Genehmigung kann mehrere Flüge desselben Fahrzeugs abdecken.",
        },
        "Art. 60 §IV": {
          title: "Erweiterte CNES police spéciale",
          summary:
            "Erweitert die CNES-Sicherheitsaufsicht am CSG auf neue Betriebsszenarien einschließlich Bergung wiederverwendbarer Träger und horizontaler Start/Landung.",
        },
      },
    },
  ],

  [
    "FR-DECRET-2009-643",
    {
      title: "Verordnung über das Genehmigungsverfahren",
      provisions: {
        "Art. 1-5": {
          title: "Dreiteiliges Genehmigungsdossier",
          summary:
            "Anträge erfordern ein dreiteiliges Dossier: administrativ (Identität, finanzielle Leistungsfähigkeit, Versicherung), technisch (Missionsdesign, Weltraummüllvermeidung, Cybersicherheit) und Verteidigung (Sicherheitsbewertung durch MinArmées).",
          complianceImplication:
            "Die Dossier-Struktur ist das verfahrensrechtliche Rückgrat der französischen Weltraumgenehmigung. Das CNES erstellt die technische Bewertung.",
        },
        "Art. 6-8": {
          title: "Entscheidungsfrist und Bedingungen",
          summary:
            "Der Minister entscheidet innerhalb von 4 Monaten nach Eingang eines vollständigen Dossiers. Schweigen nach 4 Monaten gilt als Ablehnung.",
          complianceImplication:
            "Betreiber sollten eine 4–6-monatige Genehmigungsfrist einplanen. Unvollständige Dossiers setzen die Frist neu.",
        },
        "Art. 9-12": {
          title: "Genehmigungsänderung und -übertragung",
          summary:
            "Wesentliche Änderungen an genehmigten Operationen erfordern eine vorherige Genehmigung. Genehmigungsübertragung erfordert einen neuen Antrag des Erwerbers.",
        },
      },
    },
  ],

  [
    "FR-DECRET-2009-644",
    {
      title: "Verordnung über CNES-Pflichten und Registrierung",
      provisions: {
        "Art. 1-4": {
          title: "Pflicht zur technischen Bewertung durch das CNES",
          summary:
            "Das CNES muss für alle Genehmigungsanträge technische Bewertungen erstellen, einschließlich Weltraummüllvermeidung, Orbitalsicherheit und Wiedereintrittsrisikobewertungen.",
          complianceImplication:
            "Das CNES ist der verpflichtende technische Gutachter — keine Genehmigung wird ohne seine positive Bewertung erteilt.",
        },
        "Art. 5-8": {
          title: "Verwaltung des Nationalregisters",
          summary:
            "Das CNES führt das nationale Weltraumgegenstandsregister. Muss Startdatum, Orbitalparameter, Betreiberidentität und Statusänderungen erfassen.",
        },
      },
    },
  ],

  [
    "FR-DECRET-2009-640",
    {
      title: "Verordnung über Erdbeobachtungsdaten",
      provisions: {
        "Art. 1-3": {
          title: "Anmeldepflicht für EO-Datenverwertung",
          summary:
            "Betreiber, die primäre Erdbeobachtungsdaten verwerten wollen, müssen mindestens 2 Monate vor Beginn der kommerziellen Verwertung eine Erklärung beim SGDSN einreichen.",
          complianceImplication:
            "Jeder französische oder von Frankreich genehmigte EO-Satellitenbetreiber muss das SGDSN vor dem Verkauf oder der Verbreitung primärer Daten benachrichtigen.",
        },
        "Art. 4-6": {
          title: "Sicherheitsbeschränkungen für EO-Daten",
          summary:
            "Das SGDSN kann Beschränkungen für bestimmte Datenkategorien aus Gründen der nationalen Verteidigung und Sicherheit auferlegen, einschließlich Auflösungsgrenzen, geografische Beschränkungen und zeitliche Embargos.",
        },
      },
    },
  ],

  [
    "FR-DECRET-2024-625",
    {
      title: "Aktualisierte Verordnung über Genehmigungsverfahren",
      provisions: {
        "Art. 1": {
          title: "Verkürzte Genehmigungsdauer",
          summary:
            "Reduziert die Genehmigungsdauer von 10 auf 5 Jahre und erfordert häufigere Verlängerungen.",
          complianceImplication:
            "Bestehende Genehmigungen mit 10-Jahres-Regime gehen auf 5-Jahres-Verlängerungen über. Betreiber sollten ihre Compliance-Kalender aktualisieren.",
        },
        "Art. 2": {
          title: "Bestimmungen für In-Orbit-Services",
          summary:
            "Legt Genehmigungsverfahren für In-Orbit-Serviceoperationen fest (Inspektion, Wartung, Betankung, Weltraumschrottentfernung).",
          complianceImplication:
            "Erster ausdrücklicher Regulierungsrahmen für In-Orbit-Services im französischen Recht.",
        },
        "Art. 3": {
          title: "Wegfall der GEO-Versicherungsbefreiung",
          summary:
            "Hebt die bisherige Befreiung von der Pflichtversicherung für GEO-Satellitenbetreiber in der Friedhofsorbitalphase auf. Alle Phasen erfordern nun Versicherungsschutz.",
          complianceImplication:
            "GEO-Betreiber müssen nun Versicherungsschutz bis zur End-of-Life-Entsorgung aufrechterhalten, einschließlich Friedhofsorbit-Operationen.",
        },
      },
    },
  ],

  [
    "FR-ARRETE-2011-RT",
    {
      title:
        "Technische Vorschriften für Weltraumoperationen (Réglementation Technique)",
      provisions: {
        "Titre II": {
          title: "Anforderungen an Weltraummüllvermeidung",
          summary:
            "LEO-Wiedereintritt innerhalb der dreifachen Missionsdauer, maximal 25 Jahre. GEO-Entsorgungsorbit-Anforderungen. Passivierungspflichten. Konstellationen mit 10 oder mehr Objekten unterliegen verschärften Anforderungen.",
          complianceImplication:
            "Frankreichs Weltraummüllvermeidungsregeln gehören zu den strengsten der Welt.",
        },
        "Titre III": {
          title: "Orbitalsicherheit und Kollisionsvermeidung",
          summary:
            "Betreiber müssen Kollisionsvermeidungsfähigkeiten implementieren, ihre Objekte verfolgen und auf Konjunktionswarnungen reagieren.",
        },
        "Titre IV (2024 amendment)": {
          title: "Cybersicherheitsanforderungen für TM/TC-Verbindungen",
          summary:
            "Telemetrie- und Telecommand-Verbindungen müssen vor unbefugtem Zugriff, Jamming und Spoofing geschützt werden. Verschlüsselung und Authentifizierung für alle Befehlskanäle erforderlich.",
          complianceImplication:
            "Die Änderung von Juni 2024 fügte erstmals explizite Cybersicherheitsanforderungen zu den Technischen Vorschriften hinzu.",
        },
        "Titre V (2024 amendment)": {
          title: "Konstellationsspezifische Anforderungen",
          summary:
            "Konstellationen mit 10 oder mehr Objekten müssen erweiterte Kollisionsvermeidung, koordinierte End-of-Life-Entsorgung und Ersatzplanung nachweisen.",
        },
      },
    },
  ],

  [
    "FR-ARRETE-2022-DOSSIER",
    {
      title: "Verordnung über die Zusammensetzung des Genehmigungsdossiers",
      provisions: {
        "Art. 1-4": {
          title: "Anforderungen an das administrative Dossier",
          summary:
            "Legt die für den administrativen Teil des Genehmigungsdossiers erforderlichen Unterlagen fest: Rechtsform des Betreibers, Nachweis der finanziellen Leistungsfähigkeit, Versicherungszertifikate.",
        },
        "Art. 5-10": {
          title: "Anforderungen an das technische Dossier",
          summary:
            "Detaillierte technische Dokumentation: Missionsbeschreibung, Orbitalmechanik-Analyse, Weltraummüllvermeidungsplan, Wiedereintrittsrisikobewertung, Cybersicherheitsmaßnahmen.",
          complianceImplication:
            "Das technische Dossier muss die Konformität mit dem Arrêté vom 31. März 2011 (Technische Vorschriften) nachweisen.",
        },
      },
    },
  ],

  [
    "FR-ARRETE-CSG-REI",
    {
      title: "CSG-Betriebsordnung (Règlement d'Exploitation Intérieur)",
      provisions: {
        "Titre I-III (Art. 1-30)": {
          title: "Allgemeine Regeln und Standortzugang",
          summary:
            "Zugangskontrollen, Sicherheitsüberprüfungsanforderungen und allgemeine Sicherheitsregeln für alle am Centre Spatial Guyanais tätigen Personen und Einrichtungen.",
        },
        "Titre IV-VI (Art. 31-97)": {
          title: "Sicherheitsregeln für Startoperationen",
          summary:
            "Detaillierte Sicherheitsverfahren für Startkampagnen: Montage, Tests, Treibstoffhandhabung, Countdown, Start und Nachstart-Operationen. 97 Artikel für alle Betriebsphasen.",
          complianceImplication:
            "Alle Start-Dienstleister am CSG müssen diese Regeln einhalten. Nichteinhaltung kann zur Startaussetzung durch das CNES führen.",
        },
      },
    },
  ],

  [
    "FR-CODE-RECHERCHE-CNES",
    {
      title: "Forschungsgesetzbuch — CNES-Bestimmungen",
      provisions: {
        "Art. L.331-1 to L.331-2": {
          title: "Status und Mission des CNES",
          summary:
            "Das CNES ist ein EPIC (öffentlich-rechtliche Einrichtung industriellen und kommerziellen Charakters) unter gemeinsamer Aufsicht des Forschungsministeriums, des Verteidigungsministeriums und des Wirtschaftsministeriums.",
          complianceImplication:
            "Die einzigartige Drei-Ministerien-Aufsichtsstruktur des CNES bedeutet, dass Weltraumpolitik-Entscheidungen Verteidigungs-, Forschungs- und Industrieministerien einbeziehen.",
        },
        "Art. R.331-1 to R.331-26": {
          title: "CNES-Governance und Regulierungsbefugnisse",
          summary:
            "Details zur CNES-Governance-Struktur (Verwaltungsrat, Wissenschaftsrat), Haushaltsverfahren und Regulierungsdelegationen. Umfasst die Registrierungspflichten für Weltraumgegenstände.",
        },
      },
    },
  ],

  [
    "FR-CODE-DEFENSE-SPACE",
    {
      title: "Verteidigungsgesetzbuch — Weltraumbestimmungen",
      provisions: {
        "Titre II bis (Art. L.2224-1 to L.2224-6)": {
          title: "Requisition von Weltraumressourcen",
          summary:
            "Der Staat kann private Weltraumressourcen (Satelliten, Bodenstationen, Daten) in Situationen, die die nationale Sicherheit bedrohen, requirieren. Entschädigung zum Marktwert.",
          complianceImplication:
            "Kommerzielle Betreiber müssen für mögliche Requisitionsszenarien planen. Vertragliche Vereinbarungen mit nicht-französischen Kunden sollten Fälle höherer Gewalt berücksichtigen.",
        },
        "Art. L.2335-2": {
          title: "Ausfuhrkontrolle für Verteidigungsgüter",
          summary:
            "Die Ausfuhr von Verteidigungsgütern, einschließlich Militärsatelliten und Militärnutzlasten, erfordert eine CIEEMG-Genehmigung.",
        },
        "Art. L.2391-1": {
          title: "Sensible Operationen",
          summary:
            "Bestimmte vom Verteidigungsministerium als ‚sensibel' eingestufte Weltraumoperationen unterliegen verstärkter Aufsicht und Beschränkungen.",
        },
      },
    },
  ],

  [
    "FR-LPM-2024-2030",
    {
      title: "Militärprogrammgesetz 2024-2030 — Weltrauminvestition",
      provisions: {
        "Art. 2 (Annexe — Rapport annexé)": {
          title:
            "413,3 Mrd. € Gesamtverteidigungshaushalt, 10,2 Mrd. € für Raumfahrt",
          summary:
            "Das LPM stellt 413,3 Mrd. € gesamt für 2024–2030 bereit, davon 10,2 Mrd. € für Weltraumverteidigungsfähigkeiten.",
          complianceImplication:
            "10,2 Mrd. € Weltraumverteidigungsinvestition schaffen erhebliche Beschaffungsmöglichkeiten für die französische und europäische Raumfahrtindustrie.",
        },
        "Art. 60": {
          title: "Weltraumrecht-Änderungen",
          summary:
            "Art. 60 ratifiziert die Ordonnance 2022-232, führt das Konstellationskonzept ein, schafft Bestimmungen für wiederverwendbare Träger und erweitert die CNES police spéciale.",
        },
      },
    },
  ],

  [
    "FR-SSD-2019",
    {
      title: "Weltraumverteidigungsstrategie (Stratégie Spatiale de Défense)",
      provisions: {
        "Chapter 2": {
          title: "Vier operative Funktionen",
          summary:
            "Definiert 4 operative Funktionen für den militärischen Weltraum: (1) Weltraumunterstützung für Operationen, (2) Weltraumlageerfassung, (3) Weltraumunterstützung für strategische Operationen, (4) aktive Verteidigung von Weltraumressourcen.",
          complianceImplication:
            "Die SSD legt fest, dass Frankreich sich das Recht auf ‚aktive Verteidigung' im Weltraum vorbehält — eine unter europäischen Nationen einzigartige Position.",
        },
        "Chapter 3": {
          title: "Drei abgestufte Reaktionsmodi",
          summary:
            "Definiert 3 abgestufte Reaktionsebenen: (1) Erkennung und Charakterisierung (SSA), (2) Abschreckung (Fähigkeitsdemonstration), (3) aktive Gegenmaßnahmen (Verteidigungsoperationen).",
        },
      },
    },
  ],

  [
    "FR-CPCE-SATELLITE",
    {
      title:
        "Post- und elektronisches Kommunikationsgesetzbuch — Satellitenbestimmungen",
      provisions: {
        "Art. L.97-2": {
          title: "Satelliten-Frequenzzuteilung",
          summary:
            "Satelliten-Frequenzzuteilungen werden von der ANFR im Auftrag Frankreichs vorgenommen. Betreiber müssen vor dem Betrieb jedes Satellitenkommunikationssystems Frequenzzuteilungen erhalten.",
          complianceImplication:
            "Kein Satellitensystem unter französischer Hoheitsgewalt darf ohne ANFR-Frequenzzuteilung betrieben werden. Vorlaufzeiten: 2–7 Jahre für GEO, 1–3 Jahre für LEO.",
        },
        "Art. L.97-3 to L.97-4": {
          title: "Sanktionen für unbefugte Nutzung",
          summary:
            "Unbefugte Nutzung von Satellitenfrequenzen ist strafbar mit bis zu 6 Monaten Freiheitsstrafe und 75.000 € Geldstrafe.",
          complianceImplication:
            "Strafrechtliche Sanktionen unterscheiden Frankreich von Rechtsordnungen, die nur Verwaltungsstrafen für Frequenzverstöße verhängen.",
        },
      },
    },
  ],

  [
    "FR-CODE-ASSURANCES-SPACE",
    {
      title: "Versicherungsgesetzbuch — Weltraum-Haftpflichtversicherung",
      provisions: {
        "Art. L.176-1": {
          title: "Pflicht-Weltraum-Haftpflichtversicherung",
          summary:
            "Jeder nach LOS 2008 genehmigte Weltraumbetreiber muss eine Drittschadenshaftpflichtversicherung oder gleichwertige Finanzgarantie für die Dauer der Weltraumoperationen unterhalten.",
          complianceImplication:
            "Versicherung ist Voraussetzung für die Genehmigung. Keine Genehmigung wird ohne Nachweis angemessener Deckung erteilt.",
        },
        "Art. L.176-2 to L.176-3": {
          title: "Claims-Made-Basis und Deckungsumfang",
          summary:
            "Weltraum-Haftpflichtversicherung gilt auf Claims-Made-Basis (nicht Schadenereignisbasis). Deckung für Drittschäden durch Weltraumgegenstände in allen Betriebsphasen.",
          complianceImplication:
            "Claims-Made-Basis bedeutet, dass Betreiber eine durchgehende Deckung benötigen. Deckungslücken schaffen unversicherte Haftungsexposition.",
        },
        "Art. L.176-4 to L.176-5": {
          title: "Staatsgarantie und Subrogation",
          summary:
            "Der französische Staat garantiert die Zahlung über den versicherten Betrag hinaus für internationale Ansprüche nach dem Haftungsübereinkommen. Der Staat kann beim Betreiber Regress nehmen (Subrogation).",
        },
      },
    },
  ],

  [
    "FR-CIEEMG",
    {
      title: "Ausfuhrkontrolle für Verteidigungsgüter — CIEEMG-Kommission",
      provisions: {
        "Code de la défense L.2335-1 to L.2335-4": {
          title: "Verteidigungsausfuhrgenehmigung",
          summary:
            "Die Ausfuhr von Verteidigungsgütern (einschließlich Militärsatelliten und Militärnutzlasten) erfordert eine CIEEMG-Genehmigung. Das SGDSN führt den Vorsitz.",
          complianceImplication:
            "Raumfahrtunternehmen, die militärische Komponenten exportieren, müssen eine CIEEMG-Freigabe erhalten. Bearbeitungszeit: typisch 2–6 Monate.",
        },
        "SIGALE system": {
          title: "Elektronisches Ausfuhrgenehmigungssystem",
          summary:
            "Alle Verteidigungsausfuhranträge werden über SIGALE verarbeitet. Elektronische Einreichung seit 2015 verpflichtend.",
        },
      },
    },
  ],

  [
    "FR-SBDU-DUALUSE",
    {
      title: "Ausfuhrkontrolle für Dual-Use-Güter — SBDU/EGIDE",
      provisions: {
        "EU Reg. 2021/821 — French implementation": {
          title: "Dual-Use-Ausfuhrgenehmigung",
          summary:
            "Frankreich setzt die EU-Dual-Use-Verordnung 2021/821 über den SBDU um. Raumfahrtkomponenten (Kategorien 7 und 9) erfordern Einzel- oder Allgemeinausfuhrgenehmigungen. Anträge über die EGIDE-Plattform.",
          complianceImplication:
            "Raumfahrtkomponentenexporteure müssen jede Transaktion gegen Anhang I, Kategorien 7 und 9 überprüfen. Auffangklausel (Art. 4) gilt für nicht gelistete Güter.",
        },
        "EGIDE platform": {
          title: "Elektronische Ausfuhrgenehmigungsplattform",
          summary:
            "EGIDE ist Frankreichs elektronische Plattform für Dual-Use-Ausfuhrgenehmigungsanträge. Verpflichtend für alle Anträge.",
        },
      },
    },
  ],

  [
    "FR-NIS2-TRANSPOSITION",
    {
      title: "Loi Résilience — Französische NIS2-Umsetzung",
      provisions: {
        "Titre I": {
          title: "Dreistufige Einrichtungsklassifizierung",
          summary:
            "Schafft drei Stufen regulierter Einrichtungen: Betreiber vitaler Bedeutung (OIV — bestehendes Regime, höchste Stufe), wesentliche Einrichtungen (NIS2 essential) und wichtige Einrichtungen (NIS2 important). Der Raumfahrtsektor fällt unter wesentliche Einrichtungen.",
          complianceImplication:
            "Als ‚wesentlich' eingestufte französische Weltraumbetreiber unterliegen der ANSSI-Aufsicht, Risikomanagement-Pflichten und Vorfallmeldepflichten.",
        },
        "Titre II": {
          title: "ANSSI als zuständige Behörde",
          summary:
            "Benennt die ANSSI als nationale zuständige Behörde für die NIS2-Umsetzung. Die ANSSI führt Audits durch, nimmt Vorfallmeldungen entgegen und kann Verwaltungssanktionen verhängen.",
          complianceImplication:
            "Weltraumbetreiber müssen sich bei der ANSSI registrieren und deren technischen Rahmenwerken entsprechen. Die ANSSI kann unangekündigte Audits kritischer Weltrauminfrastruktur durchführen.",
        },
      },
    },
  ],

  [
    "FR-ICPE-CSG",
    {
      title: "Umweltgesetzbuch — ICPE-Regime am Centre Spatial Guyanais",
      provisions: {
        "Art. L.515-15 to L.515-26": {
          title: "SEVESO-Oberschwellen-Einstufung",
          summary:
            "Das CSG ist als SEVESO-Oberschwellen-Anlage (seuil haut / AS) aufgrund der Treibstofflagerung und -handhabung eingestuft. Unterliegt den strengsten Umwelt- und Sicherheitsanforderungen des ICPE-Regimes.",
          complianceImplication:
            "Startoperationen am CSG müssen SEVESO-III-Anforderungen einhalten, einschließlich Sicherheitsmanagementsystemen, Notfallplanung und Öffentlichkeitsinformation.",
        },
        PPRT: {
          title: "Plan zur Verhütung technologischer Risiken",
          summary:
            "Ein PPRT (Plan de Prévention des Risques Technologiques) wird um das CSG herum erstellt und definiert Flächennutzungsbeschränkungen und Schutzmaßnahmen für umliegende Gemeinden.",
        },
      },
    },
  ],

  [
    "FR-FRANCE2030-SPACE",
    {
      title: "France 2030 Weltrauminvestitionsplan",
      provisions: {
        "Objective 9": {
          title: "1,5 Mrd. € Weltrauminvestition unter France 2030",
          summary:
            "France 2030 stellt 1,5 Mrd. € für Raumfahrt unter Ziel 9 bereit: Zugang zum Weltraum (wiederverwendbare Träger), New-Space-Konstellationen, Erdbeobachtung und Weltraumanwendungen.",
          complianceImplication:
            "Politisches Signal für erhebliche öffentliche Investitionen in die französische Raumfahrtindustrie. Betreiber können Subventionen und Co-Investitionen für qualifizierende Projekte erhalten.",
        },
        "Launcher priority": {
          title: "Förderung von Trägern der nächsten Generation",
          summary:
            "Prioritätsinvestition in wiederverwendbare Trägertechnologien (Ariane-6-Evolution, Micro-Launcher). Ziel: Erhalt der europäischen Startautonomie.",
        },
      },
    },
  ],

  [
    "FR-SNS-2025-2040",
    {
      title: "Nationale Weltraumstrategie 2025-2040",
      provisions: {
        "Pillar 1": {
          title: "Souveräner Zugang zum Weltraum",
          summary:
            "Aufrechterhaltung des europäischen autonomen Zugangs zum Weltraum durch fortgesetzte Investitionen in Ariane- und Vega-Trägerfamilien.",
        },
        "Pillar 2": {
          title: "Weltraumresilienz und Verteidigung",
          summary:
            "Stärkung der französischen Weltraumverteidigungsfähigkeiten einschließlich SSA, aktiver Verteidigung und Cyberschutz von Weltraumressourcen.",
        },
        "Pillar 3-5": {
          title: "Wettbewerbsfähigkeit, Nachhaltigkeit, Regulierung",
          summary:
            "Unterstützung französischer New-Space-Unternehmen, Umsetzung von Nachhaltigkeitsrahmen und Anpassung regulatorischer Rahmen an neue Aktivitäten.",
          complianceImplication:
            "Die SNS signalisiert weitere Entwicklung der französischen Weltraumregulierung für In-Orbit-Services, Weltraumverkehrsmanagement und Nachhaltigkeit.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // UK SOURCES
  // ═══════════════════════════════════════════════════════════════════

  [
    "UK-INT-OST-RATIFICATION",
    {
      title: "Weltraumvertrag — Britische Ratifizierung",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Das Vereinigte Königreich trägt die völkerrechtliche Verantwortung für alle nationalen Weltraumaktivitäten. Dies ist die verfassungsrechtliche Grundlage des OSA 1986 und des SIA 2018.",
          complianceImplication:
            "Art. VI ist die unmittelbare Rechtsgrundlage für das britische Doppelstatut-Genehmigungsregime. Jeder britische Weltraumbetreiber muss genehmigt werden.",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Das Vereinigte K\u00F6nigreich ist als Startstaat f\u00FCr von britischem Hoheitsgebiet oder durch britische Staatsangeh\u00F6rige gestartete Objekte verantwortlich. Dies begr\u00FCndet die Versicherungs- und Freistellungsanforderungen.",
        },
      },
    },
  ],

  [
    "UK-INT-LIABILITY-1972",
    {
      title: "Haftungsübereinkommen — Britische Ratifizierung",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Das Vereinigte Königreich haftet als Startstaat absolut für Schäden durch Weltraumgegenstände auf der Erdoberfläche oder an Luftfahrzeugen im Flug.",
          complianceImplication:
            "Die britische 4-Stufen-Haftungsarchitektur (Betreiberversicherung, gedeckelte Haftung, Ermessensfreistellung, obligatorische Rückdeckung) dient der Bewältigung dieser völkerrechtlichen Verpflichtung.",
        },
        "Art. III": {
          title: "Verschuldenshaftung im Weltraum",
          summary:
            "In-Orbit-Schäden erfordern einen Verschuldensnachweis. Weniger belastend als die Oberflächenhaftung, begründet aber Kollisionsvermeidungspflichten.",
        },
      },
    },
  ],

  [
    "UK-INT-REGISTRATION-1975",
    {
      title: "Registrierungsübereinkommen — Britische Ratifizierung",
      provisions: {
        "Art. II": {
          title: "Nationale Registrierungspflicht",
          summary:
            "Das Vereinigte Königreich muss ein nationales Register der Weltraumgegenstände führen. Die UKSA führt das UK Registry of Space Objects.",
          complianceImplication:
            "Alle unter britischer Hoheitsgewalt gestarteten Weltraumgegenstände müssen registriert werden.",
        },
      },
    },
  ],

  [
    "UK-INT-MOON-1979",
    {
      title: "Mondvertrag — vom Vereinigten Königreich nicht ratifiziert",
      scopeDescription:
        "Vom Vereinigten Königreich NICHT ratifiziert. Das Vereinigte Königreich hat 2020 als Gründungsmitglied die Artemis Accords unterzeichnet, die einen anderen Ansatz zur Weltraumressourcennutzung als das Mondvertrag-Prinzip verfolgen.",
      provisions: {
        "Art. 11": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine natürlichen Ressourcen sind das gemeinsame Erbe der Menschheit.",
        },
      },
    },
  ],

  [
    "INT-ARTEMIS-ACCORDS-2020",
    {
      title:
        "Artemis-Abkommen — Grundsätze für die Zusammenarbeit bei der zivilen Erforschung und Nutzung",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "Unterzeichner bestätigen, dass die Gewinnung und Nutzung von Weltraumressourcen nicht per se eine nationale Aneignung nach dem Weltraumvertrag darstellt.",
          complianceImplication:
            "Bietet einen Rechtsrahmen für britische Einrichtungen, die Weltraumressourcen gewinnen. Nicht bindend, aber politisch bedeutsam — 61 Länder haben bis 2026 unterzeichnet.",
        },
        "Section 7": {
          title: "Transparenz",
          summary:
            "Unterzeichner verpflichten sich, wissenschaftliche Daten aus ihren Weltraumaktivitäten öffentlich zu teilen.",
        },
        "Section 9": {
          title: "Weltraumschrott und Raumfahrzeugentsorgung",
          summary:
            "Unterzeichner verpflichten sich, die sichere Entsorgung von Raumfahrzeugen zu planen und die Erzeugung neuen Schrotts zu begrenzen.",
        },
      },
    },
  ],

  [
    "INT-HCOC-2002",
    {
      title:
        "Haager Verhaltenskodex gegen die Verbreitung ballistischer Flugkörper",
      provisions: {
        Principles: {
          title: "Vorstartbenachrichtigungen",
          summary:
            "Unterzeichnerstaaten verpflichten sich, Vorstartbenachrichtigungen für Starts von ballistischen Raketen und Weltraumträgern sowie jährliche Erklärungen abzugeben.",
          complianceImplication:
            "Das Vereinigte Königreich als Erstunterzeichner muss den HCOC über Starts von Weltraumträgern benachrichtigen. Relevant für Startanbieter an britischen Weltraumhäfen.",
        },
      },
    },
  ],

  [
    "UK-OSA-1986",
    {
      title: "Weltraumgesetz 1986 (Outer Space Act 1986)",
      scopeDescription:
        "Seit Juli 2021 gilt das OSA 1986 NUR für Übersee-Aktivitäten durch britisch-verbundene Personen. Alle im Vereinigten Königreich ansässigen Raumfahrtaktivitäten werden durch das SIA 2018 geregelt. Das Gesetz wurde auf die Isle of Man, Gibraltar, Kaimaninseln und Bermuda ausgedehnt.",
      provisions: {
        "s.1": {
          title: "Anwendungsbereich — Weltraumaktivitäten",
          summary:
            "Das Gesetz gilt für Tätigkeiten im Weltraum durch britische Staatsangehörige, schottische Firmen und nach britischem Recht gegründete Körperschaften. Seit Juli 2021 nur noch für Übersee-Aktivitäten.",
          complianceImplication:
            "Britisch-verbundene Personen, die Weltraumaktivitäten von nicht-britischem Hoheitsgebiet durchführen, benötigen weiterhin eine OSA-1986-Lizenz der CAA.",
        },
        "s.3": {
          title: "Verbot unlizenzierter Aktivitäten",
          summary:
            "Keine Person, auf die das Gesetz anwendbar ist, darf Weltraumaktivitäten ohne Genehmigung durchführen.",
        },
        "s.5": {
          title: "Lizenzbedingungen — Versicherung",
          summary:
            "Lizenzen können Bedingungen enthalten, einschließlich Versicherungspflichten des Lizenznehmers gegen Haftung für Schäden.",
          complianceImplication:
            "Versicherung ist eine Standard-Lizenzbedingung. Die CAA legt die Versicherungsanforderungen risikobasiert fest.",
        },
        "s.7": {
          title: "Register der Weltraumgegenstände",
          summary:
            "Der Staatssekretär führt ein Register der Weltraumgegenstände, das OSA- und SIA-gestartete Objekte umfasst.",
        },
        "s.10": {
          title:
            "Regierungsfreistellung — gedeckelt durch Deregulation Act 2015",
          summary:
            "Der Lizenznehmer ist verpflichtet, die Regierung gegen Ansprüche freizustellen. Der Deregulation Act 2015 s.12 führte verbindliche Haftungsobergrenzen ein.",
          complianceImplication:
            "Betreiber-Freistellungspflichten sind nun gedeckelt. Veröffentlichte Obergrenze für OSA-Lizenzen: 60 Mio. EUR.",
        },
        "s.12": {
          title: "Straftaten",
          summary:
            "Die Durchführung unlizenzierter Weltraumaktivitäten ist eine Straftat mit bis zu 2 Jahren Freiheitsstrafe.",
        },
      },
    },
  ],

  [
    "UK-SIA-2018",
    {
      title: "Raumfahrtindustriegesetz 2018 (Space Industry Act 2018)",
      scopeDescription:
        "Das SIA 2018 ist der umfassende Rahmen für alle im Vereinigten Königreich ansässigen Raumfahrtaktivitäten. 70 Abschnitte in 12 Anhängen. In Kraft seit 29. Juli 2021. Fünf Lizenztypen decken alle Aspekte ab.",
      provisions: {
        "s.1-4": {
          title: "Anwendungsbereich, Reguliererpflichten und Hauptziele",
          summary:
            "Schafft den regulatorischen Rahmen für Raumfahrtaktivitäten vom Vereinigten Königreich aus. Benennt die CAA als Regulierer.",
          complianceImplication:
            "Umfassender Rahmen — alle im Vereinigten Königreich ansässigen Raumfahrtaktivitäten erfordern eine SIA-Lizenz. Fünf Lizenztypen decken alle Aspekte ab.",
        },
        "s.3": {
          title: "Verbot unlizenzierter Raumfahrt",
          summary:
            "Die Durchführung von Raumfahrtaktivitäten, der Betrieb eines Weltraumhafens oder die Erbringung von Leitstanddiensten ohne Lizenz ist eine Straftat.",
        },
        "s.8-15": {
          title: "Lizenzen — fünf Typen",
          summary:
            "Fünf Lizenzkategorien: (1) Betreiberlizenz für Start/Rückkehr, (2) Weltraumhafenlizenz, (3) Leitstandlizenz, (4) Orbitalbetreiberlizenz, (5) Missionsmanagementlizenz.",
          complianceImplication:
            "Betreiber müssen ermitteln, welche Lizenzart(en) auf ihre Aktivitäten anwendbar sind, und bei der CAA beantragen.",
        },
        "s.11": {
          title: "Bewertung der Umweltauswirkungen (AEE)",
          summary:
            "Der Regulierer darf keine Weltraumhafen- oder Startlizenz erteilen, wenn die Bewertung der Umweltauswirkungen nicht durchgeführt wurde.",
          complianceImplication:
            "Die AEE ist eine zwingende Voraussetzung für Weltraumhafen- und Startlizenzen.",
        },
        "s.30-33": {
          title: "Straftaten",
          summary:
            "Umfassende Straftatbestände einschließlich unlizenzierter Aktivitäten, Lizenzbedingungsverstößen und Sicherheitsgefährdung. Anhang 4 umfasst Entführungsdelikte mit lebenslanger Freiheitsstrafe.",
        },
        "s.34-38": {
          title: "Haftung und Versicherung",
          summary:
            "Schafft den Haftungsrahmen für Raumfahrtaktivitäten. Betreiber müssen Versicherung vorhalten. Der SIA Indemnities Act 2025 hat s.12(2) geändert, sodass alle Betreiberlizenzen eine Haftungsobergrenze festlegen MÜSSEN.",
          complianceImplication:
            "Das obligatorische Deckelungsregime nach dem Indemnities Act 2025 bietet Regulierungssicherheit.",
        },
        "s.49-56": {
          title: "Unfalluntersuchung",
          summary:
            "Schafft den Rahmen für die Untersuchung von Raumfahrtunfällen.",
        },
        "Sch.4": {
          title: "Entführung von Raumfahrzeugen — Straftaten",
          summary:
            "Schafft spezifische Straftatbestände für die Entführung von Raumfahrzeugen. Höchststrafe: lebenslange Freiheitsstrafe.",
        },
      },
    },
  ],

  [
    "UK-SIA-INDEMNITIES-2025",
    {
      title:
        "Gesetz über Raumfahrtindustrie-Freistellungen 2025 (Space Industry (Indemnities) Act 2025)",
      provisions: {
        "s.1": {
          title:
            "Änderung von SIA 2018 s.12(2) — obligatorische Haftungsobergrenze",
          summary:
            "Ändert ‚darf' in ‚muss' in SIA 2018 s.12(2) — alle Betreiberlizenzen MÜSSEN nun einen Höchstbetrag der Haftung des Lizenznehmers festlegen.",
          complianceImplication:
            "Alle SIA-Betreiberlizenzen müssen eine festgelegte Haftungsobergrenze enthalten. Dies bietet Regulierungssicherheit für Betreiber und Investoren.",
        },
      },
    },
  ],

  [
    "UK-DEREGULATION-2015-S12",
    {
      title:
        "Deregulierungsgesetz 2015, Abschnitt 12 — OSA-Haftungsobergrenzen",
      provisions: {
        "s.12": {
          title: "Obligatorische Haftungsobergrenzen im OSA 1986",
          summary:
            "Führte obligatorische Haftungsobergrenzen in das Outer Space Act 1986 ein. Ermöglicht dem Staatssekretär, einen Höchstbetrag für die Freistellungspflicht des Lizenznehmers festzulegen.",
          complianceImplication:
            "Wegweisende Reform, die die Betreiberhaftung unter OSA-Lizenzen deckelte. Veröffentlichte Obergrenze: 60 Mio. EUR.",
        },
      },
    },
  ],

  [
    "UK-SI-2021-792",
    {
      title:
        "Raumfahrtindustrie-Verordnungen 2021 (Space Industry Regulations 2021)",
      provisions: {
        "Parts 1-17": {
          title:
            "Haupt-Durchführungsverordnungen — 287 Vorschriften, 6 Anhänge",
          summary:
            "DIE Haupt-Durchführungsverordnungen zum SIA 2018. 287 Vorschriften in 6 Anhängen und 17 Teilen über Genehmigungsverfahren, Sicherheitsnachweisanforderungen, Sicherheit, Cybersicherheit (Teil 11), Ausbildung, Haftung und Versicherung.",
          complianceImplication:
            "Jeder SIA-lizenzierte Betreiber muss diese Verordnungen einhalten. Teil 11 (Cybersicherheit) erfordert Cyberrisikobewertungen und Sicherheitsmaßnahmen.",
        },
        "Part 11": {
          title: "Sicherheit — Cybersicherheitsanforderungen",
          summary:
            "Auferlegt allen SIA-Lizenzinhabern Cybersicherheitspflichten. Erfordert Risikobewertungen, Sicherheitspläne, Vorfallmeldung und Personalüberprüfung.",
          complianceImplication:
            "Alle SIA-lizenzierten Betreiber müssen Cybersicherheitsmaßnahmen umsetzen.",
        },
        "Schedule 1": {
          title: "Lizenzantragsanforderungen",
          summary:
            "Detaillierte Anforderungen an Lizenzanträge einschließlich technischer, finanzieller, Versicherungs- und Sicherheitsdokumentation.",
        },
      },
    },
  ],

  [
    "UK-SI-2021-793",
    {
      title: "Verordnungen zur Untersuchung von Raumfahrtunfällen 2021",
      provisions: {
        "Full instrument": {
          title: "Einrichtung der Raumfahrtunfall-Untersuchungsbehörde",
          summary:
            "Schafft den Rahmen der Raumfahrtunfall-Untersuchungsbehörde (SAIA). Definiert Verfahren zur Untersuchung von Raumfahrtunfällen und schweren Zwischenfällen.",
        },
      },
    },
  ],

  [
    "UK-SI-2021-816",
    {
      title: "Raumfahrtindustrie-Berufungsverordnungen 2021",
      provisions: {
        "Full instrument": {
          title: "Berufungsrahmen für Lizenzentscheidungen",
          summary:
            "Schafft das Berufungsverfahren gegen CAA-Lizenzentscheidungen nach dem SIA 2018.",
        },
      },
    },
  ],

  [
    "UK-SI-2021-815",
    {
      title: "Anordnung über die Übertragung von Raumfahrtfunktionen 2021",
      provisions: {
        "Full instrument": {
          title: "Delegation von Regulierungsfunktionen an die CAA",
          summary:
            "Delegiert Raumfahrt-Regulierungsfunktionen vom Staatssekretär an die Civil Aviation Authority.",
        },
      },
    },
  ],

  [
    "UK-SI-2021-879",
    {
      title: "Luftnavigations-(Änderungs-)Anordnung 2021",
      provisions: {
        "Full instrument": {
          title: "Flugbeschränkungszonen um Weltraumhäfen",
          summary:
            "Ändert die Luftnavigationsanordnung zur Einrichtung von Flugbeschränkungszonen um lizenzierte Weltraumhäfen während Start- und Wiedereintrittsoperationen.",
        },
      },
    },
  ],

  [
    "UK-SI-2025-222",
    {
      title:
        "Verordnung über die Lizenzbefreiung für militärische Aktivitäten Verbündeter 2025",
      provisions: {
        "Full instrument": {
          title: "Lizenzbefreiung für alliierte Streitkräfte",
          summary:
            "Befreit alliierte Streitkräfte von der Pflicht, eine britische Weltraumlizenz für bestimmte Aktivitäten von britischem Hoheitsgebiet zu besitzen. Erleichtert NATO- und bilaterale Weltraumkooperation.",
        },
      },
    },
  ],

  [
    "UK-WTA-2006",
    {
      title: "Gesetz über drahtlose Telegrafie 2006",
      provisions: {
        "s.8": {
          title: "Ofcom-Lizenzierungsbefugnis",
          summary:
            "Ofcom kann Lizenzen für die Nutzung des Funkspektrums erteilen. Alle Satellitenbetreiber, die von britisch angemeldeten Frequenzen nutzen, benötigen eine Ofcom-Lizenz.",
          complianceImplication:
            "Kein britisches Satellitensystem darf ohne Ofcom-Lizenz betrieben werden.",
        },
      },
    },
  ],

  [
    "UK-CA-2003",
    {
      title: "Kommunikationsgesetz 2003",
      provisions: {
        "Parts 1-2": {
          title: "Ofcom-Regulierungsbefugnisse und -pflichten",
          summary:
            "Schafft Ofcom als britische Kommunikationsaufsicht. Erteilt Befugnisse für Satellitenrundfunkregulierung, Spektrumverwaltung und Netzregulierung. Ofcom fungiert als britische ITU-Verwaltung.",
          complianceImplication:
            "Satellitenbreitband- und -rundfunkdienste müssen dem Ofcom-Regulierungsrahmen entsprechen.",
        },
      },
    },
  ],

  [
    "UK-ECA-2002",
    {
      title: "Ausfuhrkontrollgesetz 2002",
      provisions: {
        "s.1-5": {
          title: "Ausfuhrkontrollbefugnisse",
          summary:
            "Primäres Ermächtigungsgesetz für britische Ausfuhrkontrollen. Erteilt dem Staatssekretär Befugnisse zur Kontrolle der Ausfuhr von Gütern, des Technologietransfers und der technischen Unterstützung für Raumfahrttechnologie.",
          complianceImplication:
            "Alle Ausfuhren kontrollierter Raumfahrttechnologie erfordern eine ECJU-Lizenz.",
        },
      },
    },
  ],

  [
    "UK-ECO-2008",
    {
      title: "Ausfuhrkontrollanordnung 2008",
      provisions: {
        "Schedule 2": {
          title: "Militärliste",
          summary:
            "Britische Militärliste — Kontrollen für militärische Güter einschließlich bestimmter Trägerraketen, militärischer Satellitensysteme und militärischer Raumfahrtkomponenten.",
        },
        "Schedule 3": {
          title: "Dual-Use-Liste",
          summary:
            "Britische Dual-Use-Liste — Kontrollen für Dual-Use-Güter einschließlich Raumfahrzeuge, Satellitensubsysteme und Bodenstationsausrüstung. Im Einklang mit dem Wassenaar-Arrangement.",
          complianceImplication:
            "Raumfahrtkomponentenexporteure müssen alle Güter gegen Militär- und Dual-Use-Liste prüfen.",
        },
      },
    },
  ],

  [
    "UK-DPA-2018",
    {
      title: "Datenschutzgesetz 2018 und UK-DSGVO",
      provisions: {
        "Parts 1-7": {
          title: "Datenschutzrahmen",
          summary:
            "Umfassendes Datenschutzrecht, das die britische beibehaltene DSGVO-Version umsetzt. Gilt für die Verarbeitung personenbezogener Daten einschließlich satellitengestützter Geodaten, die Personen identifizieren können.",
          complianceImplication:
            "Erdbeobachtungsbetreiber, die Bilder in ausreichender Auflösung zur Personenidentifizierung verarbeiten, müssen die UK-DSGVO-Anforderungen einhalten.",
        },
      },
    },
  ],

  [
    "UK-SIA-S11-AEE",
    {
      title:
        "Space Industry Act 2018, Abschnitt 11 — Bewertung der Umweltauswirkungen",
      provisions: {
        "s.11": {
          title: "AEE-Pflicht für Weltraumhafen- und Startlizenzen",
          summary:
            "Der Regulierer darf keine Lizenz erteilen, wenn keine Bewertung der Umweltauswirkungen durchgeführt wurde. Die AEE muss Luftqualität, Emissionen, Biodiversität, Meeresumwelt, Lärm, Wasserqualität und Bodenkontamination abdecken.",
          complianceImplication:
            "Verpflichtend für alle Weltraumhafen- und Startlizenzanträge.",
        },
      },
    },
  ],

  [
    "UK-COMAH-2015",
    {
      title:
        "Verordnung über die Beherrschung schwerer Unfallrisiken 2015 (COMAH)",
      provisions: {
        "Full instrument": {
          title: "Verhütung schwerer Unfälle bei Treibstofflagerung",
          summary:
            "COMAH-Vorschriften gelten für Anlagen, die gefährliche Stoffe über festgelegten Schwellenwerten lagern. Relevant für Raketentreibstofflagerung (LOX, RP-1, LH2, Hydrazin) an Weltraumhäfen.",
          complianceImplication:
            "Weltraumhafenbetreiber, die Raketentreibstoffe über COMAH-Schwellenwerten lagern, müssen Sicherheitsberichte erstellen.",
        },
      },
    },
  ],

  [
    "UK-EXPLOSIVES-2014",
    {
      title: "Sprengstoffverordnungen 2014",
      provisions: {
        "Full instrument": {
          title: "Regelung von Feststoffraketenmotoren und Pyrotechnik",
          summary:
            "Regelt die Herstellung, Lagerung und Verwendung von Sprengstoffen. Gilt für Feststoffraketenmotoren, pyrotechnische Zünder und Ordonnanz in Trägersystemen.",
          complianceImplication:
            "Startanbieter mit Feststoffantrieb oder pyrotechnischen Trennsystemen müssen entsprechende Sprengstofflizenzen besitzen.",
        },
      },
    },
  ],

  [
    "UK-NIS-REGS-2018",
    {
      title: "Verordnungen über Netz- und Informationssysteme 2018",
      provisions: {
        "Parts 1-4": {
          title: "Britischer NIS-Rahmen",
          summary:
            "Britischer eigener NIS-Rahmen (NICHT EU NIS2). Auferlegt Sicherheitspflichten und Vorfallmeldepflichten für Betreiber wesentlicher Dienste. Weltraumbetreiber, die wesentliche Dienste erbringen, müssen dies einhalten.",
          complianceImplication:
            "Das britische Cyber Security and Resilience Bill (2025–2026) wird diesen Rahmen voraussichtlich erheblich aktualisieren.",
        },
      },
    },
  ],

  [
    "UK-LIABILITY-ARCHITECTURE",
    {
      title: "Britische Weltraum-Haftungsarchitektur — 4-Stufen-Rahmen",
      provisions: {
        "Tier 1": {
          title: "Betreiberversicherung",
          summary:
            "Betreiber müssen eine Drittschaden-Haftpflichtversicherung unterhalten. Standardbeträge: 60 Mio. EUR für Orbitalaktivitäten (OSA), Maximum Insurable Risk (MIR) für Starts (SIA).",
        },
        "Tier 2": {
          title: "Gedeckelte Betreiberhaftung",
          summary:
            "Die Betreiberhaftung ist je Lizenz auf einen festgelegten Betrag gedeckelt. Veröffentlichte Obergrenzen: OSA 60 Mio. EUR, Virgin Orbit 250 Mio. USD, RFA 10,5 Mio. GBP.",
          complianceImplication:
            "Das obligatorische Deckelungsregime (nach dem Indemnities Act 2025) bietet Regulierungssicherheit. Betreiber kennen ihre maximale Exposition im Voraus.",
        },
        "Tier 3": {
          title: "Ermessensfreistellung durch die Regierung",
          summary:
            "Die Regierung kann nach Ermessen eine Freistellung für Verbindlichkeiten gewähren, die den gedeckelten Betrag des Betreibers übersteigen.",
        },
        "Tier 4": {
          title: "Obligatorische Rückdeckung durch die Regierung (ungedeckelt)",
          summary:
            "Die britische Regierung bietet eine ungedeckelte Rückdeckung zur Erfüllung der völkerrechtlichen Verpflichtungen aus dem Haftungsübereinkommen.",
          complianceImplication:
            "Die britische 4-Stufen-Architektur ist unter Weltraumnationen einzigartig. Die ungedeckelte Rückdeckung spiegelt die Verpflichtungen aus dem Haftungsübereinkommen wider.",
        },
      },
    },
  ],

  [
    "UK-CAP-2209",
    {
      title: "CAP 2209: Lizenzantrag nach dem Space Industry Act 2018",
      provisions: {
        "Full document": {
          title: "Hauptleitfaden für die Lizenzierung",
          summary:
            "Der wichtigste CAA-Leitfaden für Antragsteller, die Weltraumlizenzen beantragen. Deckt alle fünf Lizenztypen, Antragsverfahren, Bewertungskriterien und Sicherheitsnachweisanforderungen ab.",
          complianceImplication:
            "Pflichtlektüre für jede Einrichtung, die eine britische Weltraumlizenz beantragt.",
        },
      },
    },
  ],

  [
    "UK-CAP-2221",
    {
      title: "CAP 2221: Lizenzierungsregeln des Regulierers",
      provisions: {
        "Full document": {
          title: "Kern-Regulierungsdokument für die Weltraumlizenzierung",
          summary:
            "Die Lizenzierungsregeln der CAA — das zentrale Regulierungsdokument mit detaillierten Anforderungen und Bewertungskriterien für jeden Lizenztyp.",
          complianceImplication:
            "Obligatorische Einhaltung. Alle Lizenzantragsteller und -inhaber müssen diesen Regeln folgen.",
        },
      },
    },
  ],

  [
    "UK-CAP-GUIDANCE-SET",
    {
      title: "CAA-Weltraum-Leitfadensammlung (CAP 2210-2219, CAP 2987)",
      provisions: {
        "CAP 2210-2219": {
          title: "Themenspezifische Lizenzierungsleitfäden",
          summary:
            "Sammlung von 14+ CAP-Dokumenten zu spezifischen Lizenzierungsthemen: Sicherheitsnachweise, Orbitalanalyse, Weltraummüllvermeidung, Versicherung, Cybersicherheit, Leitstandsicherheit und Umweltauswirkungen.",
          complianceImplication:
            "Betreiber sollten alle relevanten CAP-Dokumente für ihren Lizenztyp prüfen.",
        },
      },
    },
  ],

  [
    "UK-NSS-2021",
    {
      title: "Nationale Weltraumstrategie",
      provisions: {
        "4 pillars": {
          title: "Rahmen der Nationalen Weltraumstrategie",
          summary:
            "Vier strategische Säulen: (1) Wachstum im Weltraumsektor, (2) Internationale Zusammenarbeit, (3) Wissenschafts- und Technologiesupermacht, (4) Resiliente Weltraumfähigkeiten. 69 Verpflichtungen über die gesamte Regierung.",
          complianceImplication:
            "Signalisiert die politische Richtung für regulatorische Entwicklung.",
        },
      },
    },
  ],

  [
    "UK-DSS-2022",
    {
      title: "Verteidigungsweltraumstrategie",
      provisions: {
        "Full document": {
          title: "Verteidigungsweltrauminvestitions- und Fähigkeitsplan",
          summary:
            "1,4 Mrd. GBP zusätzliche Investition in Verteidigungsweltraumfähigkeiten. Etabliert den britischen Ansatz zum Weltraum als operatives Einsatzgebiet.",
        },
      },
    },
  ],

  [
    "UK-SIP-2024",
    {
      title: "Weltraumindustrieplan",
      provisions: {
        "Full document": {
          title: "Fünf prioritäre Fähigkeitsziele 2024-2033",
          summary:
            "Legt die britischen Weltraumindustrie-Prioritäten für 2024–2033 fest. Fünf Fähigkeitsziele: souveräner Start, Satellitenherstellung, In-Orbit-Services, Erdbeobachtung und PNT.",
          complianceImplication:
            "Signalisiert Bereiche britischer Regierungsinvestition und regulatorischer Unterstützung.",
        },
      },
    },
  ],

  [
    "UK-SRR-2024",
    {
      title: "Weltraumregulierungs-Überprüfung 2024",
      provisions: {
        "17 recommendations": {
          title: "Empfehlungen zur Regulierungsreform",
          summary:
            "17 Empfehlungen zur Modernisierung des britischen Weltraumregulierungsrahmens. Umfasst Lizenzierungseffizienz, Haftungsobergrenzen, Orbitalnachhaltigkeit und In-Orbit-Services.",
          complianceImplication:
            "Der SIA Indemnities Act 2025 setzte eine der Schlüsselempfehlungen um (obligatorische Haftungsobergrenzen). Weitere Reformen 2026–2027 erwartet.",
        },
      },
    },
  ],

  [
    "UK-TCA-2020",
    {
      title: "EU-UK-Handels- und Kooperationsabkommen — Weltraumbestimmungen",
      provisions: {
        "Protocol I": {
          title: "Copernicus-Assoziierung",
          summary:
            "Ermöglicht die Assoziierung des Vereinigten Königreichs zum EU-Copernicus-Erdbeobachtungsprogramm.",
          complianceImplication:
            "Die Copernicus-Assoziierung wurde ab 1. Januar 2024 aktiviert. Ermöglicht britischen EO-Betreibern Zugang zu Sentinel-Daten.",
        },
        "Space provisions": {
          title: "Galileo- und SST-Vereinbarungen",
          summary:
            "Kein britischer Zugang zum Galileo Public Regulated Service (PRS) — der bedeutsamste Post-Brexit-Verlust im Weltraumbereich. SST-Datenzugang über Protokoll II für Weltraumüberwachung.",
          complianceImplication:
            "Britische Betreiber können sich nicht auf Galileo PRS für sichere Positionsbestimmung verlassen. Alternative PNT-Quellen erforderlich.",
        },
      },
    },
  ],

  [
    "UK-COPERNICUS-2024",
    {
      title: "Britisches Copernicus-Assoziierungsabkommen",
      provisions: {
        "Full agreement": {
          title: "Britische Copernicus-Assoziierung ab 1. Januar 2024",
          summary:
            "Das Vereinigte Königreich assoziiert sich offiziell zum EU-Copernicus-Programm. Beitrag ca. 750 Mio. EUR. Britische Einrichtungen erhalten vollen Zugang zu Copernicus-Daten und -Diensten.",
          complianceImplication:
            "Britische EO-Betreiber und Datenanbieter profitieren von der Copernicus-Assoziierung. Eröffnet Beschaffungsmöglichkeiten im Copernicus-Programm.",
        },
      },
    },
  ],

  [
    "UK-SPACEPORTS",
    {
      title: "Lizenzierte britische Weltraumhäfen — Referenzdokument",
      provisions: {
        "Licensed sites": {
          title: "Überblick über den Status britischer Weltraumhäfen",
          summary:
            "SaxaVord Spaceport (Unst, Shetland): Vertikalstart, lizenziert Dezember 2023, erster Orbitalstart voraussichtlich 2026. Spaceport Cornwall (Newquay): Horizontalstart, lizenziert November 2022. In Entwicklung: Space Hub Sutherland, Spaceport 1 North Uist.",
          complianceImplication:
            "Startanbieter müssen von einem lizenzierten Weltraumhafen aus operieren. Stand April 2026 halten SaxaVord und Spaceport Cornwall aktive Lizenzen.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ITALIAN SOURCES
  // ═══════════════════════════════════════════════════════════════════

  [
    "IT-OST-RATIFICA",
    {
      title: "Weltraumvertrag — Italienisches Ratifizierungsgesetz",
      provisions: {
        "Art. 1": {
          title: "Volle und vollständige Durchführung des Weltraumvertrags",
          summary:
            "Gibt dem Weltraumvertrag volle und vollständige Durchführung (‚piena ed intera esecuzione') in der italienischen Rechtsordnung. Art. VI ist die verfassungsrechtliche Grundlage für das Genehmigungsregime der Legge 89/2025.",
          complianceImplication:
            "Art.-VI-Verpflichtungen sind die unmittelbare Rechtsgrundlage für Italiens Weltraumgenehmigungsrahmen nach Legge 89/2025.",
        },
      },
    },
  ],

  [
    "IT-LIABILITY-RATIFICA",
    {
      title: "Haftungsübereinkommen — Italienisches Ratifizierungsgesetz",
      provisions: {
        "Art. 1": {
          title: "Ratifizierung und Durchführung des Haftungsübereinkommens",
          summary:
            "Ratifiziert das Haftungsübereinkommen von 1972. Art. II (absolute Haftung an der Oberfläche) und Art. III (verschuldensbasiert im Weltraum) spiegeln sich direkt im dualen Haftungsregime der Legge 89/2025 wider.",
          complianceImplication:
            "Das Haftungsübereinkommen begründet die 100-Mio.-€-Versicherungsobergrenze und die 3-stufige Versicherungsstruktur der Legge 89/2025.",
        },
      },
    },
  ],

  [
    "IT-REGISTRATION-RATIFICA",
    {
      title: "Registrierungsübereinkommen — Italienisches Beitrittsgesetz",
      provisions: {
        "Art. 1-2": {
          title: "Später Beitritt und ASI-Registerführung",
          summary:
            "Italiens später Beitritt zum Registrierungsübereinkommen (2005, über 29 Jahre nach Inkrafttreten). Überträgt der ASI die Führung des nationalen Registers, formalisiert in Legge 89/2025 Art. 14.",
          complianceImplication:
            "Alle italienischen Weltraumgegenstände müssen bei der ASI registriert werden.",
        },
      },
    },
  ],

  [
    "IT-INT-MOON-1979",
    {
      title: "Mondvertrag — von Italien nicht ratifiziert",
      scopeDescription:
        "Von Italien NICHT ratifiziert. Italien hat 2020 die Artemis Accords unterzeichnet und signalisiert damit die Übereinstimmung mit dem US-geführten Ansatz zur Weltraumressourcennutzung.",
      provisions: {
        "Art. 11": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine natürlichen Ressourcen sind das gemeinsames Erbe der Menschheit.",
        },
      },
    },
  ],

  [
    "IT-ARTEMIS-ACCORDS",
    {
      title:
        "Artemis-Abkommen — Italienische Unterzeichnung (Gründungsmitglied, 13. Oktober 2020)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "Unterzeichner bestätigen, dass die Gewinnung und Nutzung von Weltraumressourcen nicht per se eine nationale Aneignung darstellt.",
          complianceImplication:
            "Bietet einen Rahmen für italienische Einrichtungen bei Weltraumressourcenaktivitäten. Nicht bindend, aber politisch bedeutsam.",
        },
        "Section 9": {
          title: "Weltraumschrott und Raumfahrzeugentsorgung",
          summary:
            "Unterzeichner verpflichten sich zur sicheren Raumfahrzeugentsorgung und Begrenzung neuen Schrotts.",
        },
      },
    },
  ],

  [
    "IT-ESA-RATIFICA",
    {
      title: "ESA-Übereinkommen — Italienisches Ratifizierungsgesetz",
      provisions: {
        "Art. 1": {
          title: "Ratifizierung des ESA-Übereinkommens",
          summary:
            "Italien ist Gründungsmitglied der ESA (1975). Drittgrößter Beitragszahler zum ESA-Budget. Das Prinzip des industriellen Rückflusses (juste retour) prägt die italienische Raumfahrtindustriepolitik.",
          complianceImplication:
            "ESA-Mitgliedschaft prägt Italiens Raumfahrtindustriepolitik und Beschaffungspräferenzen. Die KMU-Beschaffungspräferenzen der Legge 89/2025 stimmen mit ESA-Prinzipien überein.",
        },
      },
    },
  ],

  [
    "IT-US-FRAMEWORK-2013",
    {
      title: "Rahmenabkommen Italien-USA über Weltraumkooperation",
      provisions: {
        Framework: {
          title: "Bilateraler Kooperationsrahmen",
          summary:
            "Umfassender bilateraler Rahmen für die Weltraumkooperation zwischen Italien und den USA über Wissenschaft, Technologie, Erdbeobachtung und bemannte Raumfahrt.",
          complianceImplication:
            "Erleichtert gemeinsame Missionen und Technologietransfer. Relevant für italienische Betreiber, die mit US-Einrichtungen zusammenarbeiten (ITAR-Implikationen).",
        },
      },
    },
  ],

  [
    "IT-LEGGE-89-2025",
    {
      title: "Italienisches Weltraumwirtschaftsgesetz — Legge 89/2025",
      scopeDescription:
        "DER Eckpfeiler des italienischen Weltraumrechts. 31 Artikel in 5 Titeln. Erstes umfassendes italienisches Weltraumgesetz. Schafft Genehmigungs-, Registrierungs-, Haftungs-, Versicherungs- und Industriepolitikrahmen. Durchführungsverordnungen (Art. 13) stehen Stand April 2026 noch aus — kritische Regulierungslücke.",
      provisions: {
        "Title I (Arts. 1-4)": {
          title: "Definitionen und Anwendungsbereich",
          summary:
            "Definiert Weltraumaktivitäten, Weltraumgegenstände, Betreiber und den Umfang der italienischen Hoheitsgewalt. Legt fest, dass Aktivitäten italienischer Einrichtungen oder von italienischem Hoheitsgebiet eine Genehmigung erfordern.",
          complianceImplication:
            "Breiter Zuständigkeitsbereich — italienische Staatsangehörige, in Italien eingetragene Einrichtungen und von italienischem Hoheitsgebiet gestartete Aktivitäten fallen alle unter das Regime.",
        },
        "Title II (Arts. 5-13)": {
          title: "Genehmigungsregime — 120-Tage-Entscheidung",
          summary:
            "Umfassendes Genehmigungsrahmenwerk. 120-Tage-Entscheidungsfrist. ASI führt 60-tägige technische Bewertung durch (Art. 11). Pflichtversicherung mindestens 100 Mio. € (Art. 12). Strafbarkeit unlizenzierter Aktivitäten: 3–6 Jahre Freiheitsstrafe.",
          complianceImplication:
            "Betreiber müssen vor Aufnahme von Weltraumaktivitäten eine Genehmigung einholen. Die 100-Mio.-€-Versicherungspflicht gehört zu den höchsten in Europa. 3–6 Jahre Freiheitsstrafe sind erheblich strenger als in den meisten europäischen Rechtsordnungen.",
        },
        "Title III (Arts. 14-16)": {
          title: "Nationales Register der Weltraumgegenstände",
          summary:
            "Die ASI führt das nationale Register. Registrierung verpflichtend für alle unter italienischer Hoheitsgewalt gestarteten Gegenstände.",
          complianceImplication:
            "Alle italienischen Weltraumgegenstände müssen bei der ASI registriert werden. Nichtregistrierung ist eine Ordnungswidrigkeit.",
        },
        "Title IV (Arts. 17-23)": {
          title: "Haftungs- und Versicherungsregime",
          summary:
            "Duales Haftungsrahmenwerk: verschuldensunabhängige Haftung für Schäden auf italienischem Hoheitsgebiet (Oberfläche), verschuldensbasierte Haftung für Schäden im Weltraum. 100-Mio.-€-Versicherungsobergrenze in 3 Stufen. KEINE staatliche Rückdeckung.",
          complianceImplication:
            "Das Fehlen einer staatlichen Rückdeckung ist ein entscheidender Unterschied zum Vereinigten Königreich und Frankreich. Betreiber tragen unbegrenzte Haftung oberhalb der 100-Mio.-€-Versicherungsobergrenze.",
        },
        "Title V (Arts. 24-31)": {
          title: "Industriepolitik und Weltraumwirtschaftsfonds",
          summary:
            "5-Jahres-Nationalplan. Schafft den Fondo per l'Economia dello Spazio (Weltraumwirtschaftsfonds) mit 35 Mio. € Erstausstattung. KMU-Beschaffungspräferenzen.",
          complianceImplication:
            "KMU-Betreiber können von Beschaffungspräferenzen profitieren. Der Weltraumwirtschaftsfonds kann finanzielle Unterstützung für Compliance-Infrastruktur bieten.",
        },
      },
    },
  ],

  [
    "IT-LEGGE-7-2018",
    {
      title: "Gesetz über die Governance der Weltraumwirtschaft — Legge 7/2018",
      provisions: {
        "Art. 2": {
          title: "Einrichtung von COMINT",
          summary:
            "Schafft das Comitato Interministeriale per le Politiche Spaziali (COMINT) als interministerielles Koordinierungsgremium für die Weltraumpolitik.",
        },
      },
    },
  ],

  [
    "IT-DLGS-128-2003",
    {
      title: "ASI-Reformdekret — D.Lgs. 128/2003",
      provisions: {
        "Full decree": {
          title: "Reorganisation und Governance der ASI",
          summary:
            "Reformiert die Governance der ASI und legt ihre Rolle als technische Regulierungsbehörde für Weltraumaktivitäten fest.",
        },
      },
    },
  ],

  [
    "IT-DECRETI-ATTUATIVI-89-2025",
    {
      title: "Durchführungsverordnungen zur Legge 89/2025 (ausstehend)",
      provisions: {
        "Full instrument": {
          title: "Detaillierte Genehmigungsanforderungen",
          summary:
            "Durchführungsverordnungen, die die detaillierten technischen, finanziellen und verfahrensrechtlichen Anforderungen für Genehmigungsanträge festlegen. Stand April 2026 NOCH NICHT ANGENOMMEN — kritische Regulierungslücke.",
          complianceImplication:
            "Ohne diese Durchführungsverordnungen fehlen den Betreibern detaillierte Anleitungen zu Antragsanforderungen, Versicherungsstufen und technischen Standards.",
        },
      },
    },
  ],

  [
    "IT-NIS2-DLGS-138-2024",
    {
      title: "NIS2-Umsetzung — D.Lgs. 138/2024",
      provisions: {
        "Full decree": {
          title: "Italienische NIS2-Umsetzung",
          summary:
            "Setzt die NIS2-Richtlinie in italienisches Recht um. Benennt die ACN als zuständige nationale Behörde. Der Raumfahrtsektor fällt unter Sektoren hoher Kritikalität.",
          complianceImplication:
            "Italienische Weltraumbetreiber müssen Cybersicherheits-Risikomanagementmaßnahmen umsetzen und Vorfälle der ACN melden.",
        },
      },
    },
  ],

  [
    "IT-PERIMETRO-2019",
    {
      title: "Nationaler Perimeter für Cybersicherheit",
      provisions: {
        "Full instrument": {
          title: "Perimetro di Sicurezza Nazionale Cibernetica",
          summary:
            "Schafft den nationalen Cybersicherheitsperimeter für kritische Infrastruktur. Weltraumbodenstationen und Missionskontrollzentren fallen unter diesen Rahmen.",
        },
      },
    },
  ],

  [
    "IT-ACN-2021",
    {
      title: "Einrichtung der Nationalen Cybersicherheitsagentur (ACN)",
      provisions: {
        "Full instrument": {
          title: "Schaffung der ACN",
          summary:
            "Schafft die Agenzia per la Cybersicurezza Nazionale als zentrale nationale Behörde für Cybersicherheit, einschließlich des Raumfahrtsektors.",
        },
      },
    },
  ],

  [
    "IT-GOLDEN-POWER",
    {
      title:
        "Golden-Power-Gesetz — Investitionsprüfung für strategische Sektoren",
      provisions: {
        "Full instrument": {
          title: "Investitionsprüfung für Raumfahrt und Verteidigung",
          summary:
            "Ermächtigt die italienische Regierung, ausländische Investitionen in strategischen Sektoren einschließlich Raumfahrt zu prüfen und zu blockieren.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LUXEMBOURG SOURCES
  // ═══════════════════════════════════════════════════════════════════

  [
    "LU-OST-RATIFICA",
    {
      title:
        "Weltraumvertrag — Luxemburger Ratifizierungsurkunde (Loi du 31 juillet 2005)",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Luxemburg trägt die völkerrechtliche Verantwortung für alle nationalen Weltraumtätigkeiten. Dies ist die verfassungsrechtliche Grundlage des Weltraumressourcengesetzes 2017 und des Weltraumtätigkeitengesetzes 2020.",
          complianceImplication:
            "Art. VI ist die unmittelbare Rechtsgrundlage für Luxemburgs duales Weltraumgesetz-Genehmigungsregime.",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Luxemburg ist als 'Startstaat' haftbar für Schäden durch Weltraumgegenstände, die von seinem Hoheitsgebiet oder durch luxemburgische Rechtsträger gestartet werden.",
        },
      },
    },
  ],
  [
    "LU-LIABILITY-RATIFICA",
    {
      title:
        "Weltraumhaftungsübereinkommen — Luxemburger Ratifizierungsurkunde (Loi du 9 juin 1983)",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Luxemburg haftet als Startstaat absolut für Schäden auf der Erdoberfläche. Das Weltraumtätigkeitengesetz 2020 sieht volle Betreiberhaftung OHNE gesetzliche Obergrenze und OHNE staatliche Entschädigung vor.",
          complianceImplication:
            "Eines der strengsten Haftungsregime in Europa — keine gesetzliche Haftungsobergrenze, kein staatlicher Rückgriff.",
        },
      },
    },
  ],
  [
    "LU-REGISTRATION-RATIFICA",
    {
      title:
        "Weltraumregistrierungsübereinkommen — Luxemburger Beitrittsurkunde (Loi du 15 décembre 2020)",
      provisions: {
        "Art. II": {
          title: "Nationale Registrierungspflicht",
          summary:
            "Luxemburg muss ein nationales Register der Weltraumgegenstände führen. Das Weltraumtätigkeitengesetz 2020 (Kapitel 6) setzt diese Verpflichtung um — die LSA führt das nationale Register.",
        },
      },
    },
  ],
  [
    "LU-INT-MOON-1979",
    {
      title: "Mondvertrag — Luxemburg (NICHT ratifiziert)",
      scopeDescription:
        "Von Luxemburg NICHT ratifiziert. Luxemburgs Weltraumressourcengesetz 2017 verfolgt einen grundlegend anderen Ansatz — Art. 1 gestattet ausdrücklich die Aneignung von Weltraumressourcen.",
      provisions: {
        "Art. 11": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine natürlichen Ressourcen sind das gemeinsame Erbe der Menschheit.",
        },
      },
    },
  ],
  [
    "LU-RESCUE-STATUS",
    {
      title:
        "Weltraumrettungsübereinkommen — Luxemburg (unterzeichnet, NICHT ratifiziert)",
      scopeDescription:
        "Luxemburg hat das Rettungsübereinkommen unterzeichnet, aber NICHT ratifiziert. Keine bindenden Verpflichtungen über die allgemeine Pflicht nach Art. V des Weltraumvertrags hinaus.",
      provisions: {
        "Art. 1-4": {
          title: "Rettung und Rückführung von Raumfahrern",
          summary:
            "Vertragsparteien benachrichtigen, retten und führen Raumfahrer zurück, die in ihrem Hoheitsgebiet landen.",
        },
      },
    },
  ],
  [
    "LU-SPACE-RESOURCES-2017",
    {
      title:
        "Gesetz vom 20. Juli 2017 über die Erforschung und Nutzung von Weltraumressourcen",
      scopeDescription:
        "Weltweit zweites Weltraumressourcengesetz nach dem US SPACE Act von 2015. 18 Artikel mit einem vollständigen Regulierungsrahmen für die Erforschung und Nutzung von Weltraumressourcen. Übernimmt ein Finanzplatz-Governance-Modell, das in der Weltraumgesetzgebung weltweit einzigartig ist.",
      provisions: {
        "Art. 1": {
          title: "Eigentumsrechte — Aneignung von Weltraumressourcen",
          summary:
            "Les ressources de l'espace sont susceptibles d'appropriation — Weltraumressourcen können Gegenstand der Aneignung sein. Begründet private Eigentumsrechte an abgebauten Weltraumressourcen.",
          complianceImplication:
            "Luxemburgisches Recht gestattet ausdrücklich die Aneignung von Weltraumressourcen. Autorisierte Betreiber erwerben Rechtstitel an abgebauten Ressourcen.",
        },
        "Art. 2": {
          title: "Genehmigungspflicht",
          summary:
            "Die Erforschung und Nutzung von Weltraumressourcen bedarf der vorherigen Genehmigung durch den Wirtschaftsminister.",
        },
        "Art. 4": {
          title: "Luxemburger Gesellschaftsform erforderlich — SA/SCA/SARL/SE",
          summary:
            "Nur in Luxemburg als SA, SCA, SARL oder SE gegründete Gesellschaften können eine Genehmigung beantragen.",
          complianceImplication:
            "Ausländische Betreiber MÜSSEN eine luxemburgische Tochtergesellschaft in einer der vier zugelassenen Rechtsformen gründen.",
        },
        "Art. 7": {
          title: "Finanzplatz-Governance-Modell",
          summary:
            "Das Gesetz übernimmt Luxemburgs bewährten Finanzplatz-Regulierungsrahmen für die Genehmigung und Aufsicht von Weltraumressourcenbetreibern.",
        },
        "Art. 8": {
          title: "Meldepflicht bei Beteiligungsschwelle",
          summary:
            "Jede Person, die 10 % oder mehr der Anteile eines genehmigten Betreibers erwirbt, muss den Minister benachrichtigen.",
        },
        "Art. 10": {
          title: "Risikobewertung und Versicherung",
          summary:
            "Genehmigte Betreiber müssen eine Risikobewertung durchführen und eine Versicherungsdeckung bei einem konzernfremden Versicherer aufrechterhalten.",
        },
        "Art. 13": {
          title: "Genehmigungsgebühr",
          summary: "Genehmigungsgebühr zwischen 5.000 EUR und 500.000 EUR.",
        },
        "Art. 18": {
          title: "Strafrechtliche Sanktionen",
          summary:
            "Nicht autorisierte Weltraumressourcentätigkeiten: 8 Tage bis 5 Jahre Freiheitsstrafe und/oder Geldstrafe bis 1.250.000 EUR.",
        },
      },
    },
  ],
  [
    "LU-SPACE-ACTIVITIES-2020",
    {
      title: "Gesetz vom 15. Dezember 2020 über Weltraumtätigkeiten",
      scopeDescription:
        "Umfassendes Rahmengesetz (lex generalis) für alle luxemburgischen Weltraumtätigkeiten. 8 Kapitel, 20 Artikel. Gleichzeitig mit dem Beitritt zum Registrierungsübereinkommen verabschiedet. Ergänzt das Weltraumressourcengesetz 2017 (lex specialis).",
      provisions: {
        "Ch. 1": {
          title:
            "Anwendungsbereich — Tätigkeiten unter luxemburgischer Verantwortung",
          summary:
            "Das Gesetz gilt für Weltraumtätigkeiten, für die Luxemburg die völkerrechtliche Verantwortung trägt.",
        },
        "Ch. 2": {
          title: "Genehmigungsregime — Wirtschaftsminister",
          summary:
            "Genehmigung durch den Wirtschaftsminister. Antragstellung mindestens 6 Monate im Voraus. Genehmigungsgebühr 5.000–500.000 EUR. Jährliche Aufsichtsgebühr 2.000–50.000 EUR.",
        },
        "Ch. 3": {
          title: "Laufende Aufsicht und öffentliches Register",
          summary:
            "Genehmigte Betreiber unterliegen der laufenden Aufsicht durch das Ministerium. Ein öffentliches Register genehmigter Betreiber wird geführt.",
        },
        "Ch. 4": {
          title: "Übertragung und Kontrollwechselschwellen",
          summary:
            "Übertragung der Genehmigung erfordert ministerielle Zustimmung. Kontrollwechselschwellen bei 10 %, 20 %, 33 % und 50 %.",
        },
        "Ch. 5": {
          title:
            "Volle Betreiberhaftung — KEINE gesetzliche Obergrenze, KEINE staatliche Entschädigung",
          summary:
            "Betreiber haften in vollem Umfang für Schäden. KEINE gesetzliche Haftungsobergrenze und KEIN staatlicher Rückgriff.",
          complianceImplication:
            "Eines der strengsten Haftungsregime in Europa. Betreiber haften unbegrenzt ohne staatlichen Rückgriff. Versicherungsplanung ist entscheidend.",
        },
        "Ch. 6": {
          title:
            "Nationales Register — Umsetzung des Registrierungsübereinkommens",
          summary:
            "Einrichtung des nationalen Registers der Weltraumgegenstände Luxemburgs.",
        },
        "Ch. 7": {
          title: "Strafrechtliche Sanktionen",
          summary:
            "Nicht genehmigte Weltraumtätigkeiten: bis zu 5 Jahre Freiheitsstrafe und/oder Geldstrafe bis 1.250.000 EUR.",
        },
        "Ch. 8": {
          title: "Übergangsbestimmungen — SES-Konzession",
          summary:
            "SES-Konzessionsübergang: bestehende Konzessionsvereinbarungen müssen bis 31. Dezember 2022 zum neuen Genehmigungsregime übergehen. Steuerbefreiungen für Weltraumversicherungsprämien und Betreiber-Einkommensteuergutschrift.",
        },
      },
    },
  ],
  [
    "LU-ELECTRONIC-MEDIA-1991",
    {
      title: "Geändertes Gesetz vom 27. Juli 1991 über elektronische Medien",
      provisions: {
        "Art. 20": {
          title: "Konzession für luxemburgische Satellitensysteme",
          summary:
            "Konzessionspflicht für den Betrieb luxemburgischer Satellitensysteme. Die Regierung hält 33,33 % der Stimmrechte an SES über Klasse-B-Aktien.",
        },
      },
    },
  ],
  [
    "LU-RGD-2025-FEES",
    {
      title:
        "Großherzogliche Verordnung vom 11. Juli 2025 — Gebührenerhebungsverfahren",
      provisions: {
        "Full instrument": {
          title: "Gebührenerhebung nach Art. 13 des Gesetzes von 2017",
          summary:
            "Detaillierte Verfahren zur Erhebung der Genehmigungsgebühren (5.000–500.000 EUR) nach Art. 13 des Weltraumressourcengesetzes 2017.",
        },
      },
    },
  ],
  [
    "LU-ELECTRONIC-COMMS-2021",
    {
      title: "Gesetz vom 17. Dezember 2021 über elektronische Kommunikation",
      provisions: {
        "Full instrument": {
          title: "Umsetzung des EU-Kodex für elektronische Kommunikation",
          summary:
            "Umsetzung des EU-Kodex für elektronische Kommunikation (Richtlinie 2018/1972) in luxemburgisches Recht. ILR als nationale Regulierungsbehörde.",
        },
      },
    },
  ],
  [
    "LU-RADIO-FREQUENCIES-2005",
    {
      title:
        "Geändertes Gesetz vom 30. Mai 2005 über die Verwaltung von Funkfrequenzbändern",
      provisions: {
        "Full instrument": {
          title: "Verwaltung von Funkfrequenzbändern",
          summary:
            "Rahmen für die Zuweisung und Verwaltung von Funkfrequenzbändern. ILR verwaltet Frequenzzuweisungen einschließlich Satellitenfrequenzkoordination.",
        },
      },
    },
  ],
  [
    "LU-EXPORT-CONTROL-2018",
    {
      title: "Gesetz vom 27. Juni 2018 über Exportkontrolle",
      provisions: {
        "Full instrument": {
          title: "Konsolidierter Exportkontrollrahmen",
          summary:
            "Konsolidiertes Exportkontrollgesetz für Dual-Use-Güter, Verteidigungsprodukte und andere kontrollierte Güter. OCEIT als zuständige Behörde.",
        },
      },
    },
  ],
  [
    "LU-EXPORT-IMPL-2018",
    {
      title:
        "Großherzogliche Verordnung vom 14. Dezember 2018 — Exportkontrolldurchführung",
      provisions: {
        "Full instrument": {
          title: "Durchführungsverordnung Exportkontrolle",
          summary:
            "Detaillierte Durchführungsbestimmungen einschließlich innergemeinschaftlicher Übertragungsverfahren für kryptografische Ausrüstung.",
        },
      },
    },
  ],
  [
    "LU-NIS1-2019",
    {
      title:
        "Gesetz vom 28. Mai 2019 über die Sicherheit von Netz- und Informationssystemen (NIS1)",
      provisions: {
        "Full instrument": {
          title: "NIS1-Richtlinienumsetzung",
          summary:
            "Umsetzung der NIS1-Richtlinie (EU 2016/1148) in luxemburgisches Recht. Cybersicherheitsverpflichtungen für Betreiber wesentlicher Dienste und Anbieter digitaler Dienste.",
        },
      },
    },
  ],
  [
    "LU-NIS2-PENDING",
    {
      title: "NIS2-Umsetzung — Projet de loi n° 8364",
      provisions: {
        "Full draft": {
          title: "NIS2-Richtlinienumsetzung",
          summary:
            "Gesetzentwurf zur Umsetzung der NIS2-Richtlinie (EU 2022/2555). Eingereicht 13. März 2024. Luxemburg hat die Umsetzungsfrist vom 17. Oktober 2024 versäumt. Europäische Kommission: mit Gründen versehene Stellungnahme vom 7. Mai 2025.",
        },
      },
    },
  ],
  [
    "LU-CNPD-2018",
    {
      title: "Gesetz vom 1. August 2018 — CNPD/DSGVO-Rahmenwerk",
      provisions: {
        "Full instrument": {
          title: "CNPD-Einrichtung und DSGVO-Umsetzung",
          summary:
            "Errichtung der Commission Nationale pour la Protection des Données (CNPD) als luxemburgische Datenschutzbehörde und Umsetzung der DSGVO-Bestimmungen.",
        },
      },
    },
  ],
  [
    "LU-IRIS2",
    {
      title: "IRIS\u00B2 — Luxemburger Beteiligung und Kontrollzentrum",
      provisions: {
        Programme: {
          title: "EU-Konstellation für sichere Konnektivität",
          summary:
            "IRIS\u00B2 — Luxemburg beherbergt eines von drei Kontrollzentren. SES führt das SpaceRise-Konsortium, das die Konzession gewonnen hat.",
        },
      },
    },
  ],
  [
    "LU-SPACE-STRATEGY-2023",
    {
      title: "Nationale Weltraumstrategie 2023-2027 — Focus on Sustainability",
      provisions: {
        "4 Axes": {
          title: "Nationale Weltraumstrategierahmen",
          summary:
            "Vier strategische Achsen für luxemburgische Weltraumtätigkeiten 2023-2027. Budget ca. 256 Mio. EUR. Schwerpunkt auf Nachhaltigkeit, Wettbewerbsfähigkeit und Innovation.",
        },
      },
    },
  ],
  [
    "LU-SPACERESOURCES-LU",
    {
      title: "SpaceResources.lu-Initiative",
      provisions: {
        Initiative: {
          title: "Nationales Weltraumressourcenprogramm",
          summary:
            "SpaceResources.lu-Initiative gestartet im Februar 2016 mit 200 Mio. EUR Regierungszusage. Über 80 Unternehmen und ca. 1.650 Beschäftigte im luxemburgischen Weltraumsektor.",
        },
      },
    },
  ],
  [
    "LU-LUXIMPULSE",
    {
      title: "LuxIMPULSE Nationales Programm",
      provisions: {
        Programme: {
          title: "Nationales Weltraumprogramm 2026-2029",
          summary:
            "LuxIMPULSE nationales Programm mit 115,8 Mio. EUR Budget für 2026-2029. Umsetzung mit ESA-Unterstützung.",
        },
      },
    },
  ],
  [
    "LU-GOVSAT",
    {
      title: "GovSat — Luxemburger Regierungssatellitenkommunikation",
      provisions: {
        Programme: {
          title: "Staatliches Satellitenkommunikations-Joint-Venture",
          summary:
            "GovSat — LuxGovSat S.A. ist ein 50/50-Joint-Venture zwischen der luxemburgischen Regierung und SES. GovSat-1 gestartet am 31. Januar 2018 (X-Band und Ka-Band Militärkommunikation). GovSat-2 im Januar 2026 genehmigt mit 301 Mio. EUR Budget.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // NETHERLANDS (NL) — 22 Sources
  // ═══════════════════════════════════════════════════════════════════

  // International Treaties (NL)
  [
    "NL-OST-1967",
    {
      title: "Weltraumvertrag — Niederländischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Die Niederlande tragen die völkerrechtliche Verantwortung für alle nationalen Weltraumtätigkeiten einschließlich der Tätigkeiten nichtstaatlicher Rechtsträger. Dies ist die verfassungsrechtliche Grundlage des WRA 2007.",
          complianceImplication:
            "Art. VI ist die unmittelbare Rechtsgrundlage des niederländischen Genehmigungsregimes unter dem WRA 2007. Jeder niederländische Weltraumbetreiber muss lizenziert werden.",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Die Niederlande sind ‚Startstaat' für Objekte, die von ihrem Hoheitsgebiet oder durch niederländische Einrichtungen gestartet werden.",
        },
        "Art. VIII": {
          title: "Registrierung und Hoheitsgewalt",
          summary:
            "Ein Staat, in dessen Register ein Weltraumgegenstand eingetragen ist, behält die Hoheitsgewalt. Die Niederlande führen ein Zweiteiliges Register (aktive + außer Dienst gestellte Objekte).",
        },
      },
    },
  ],
  [
    "NL-RESCUE-1968",
    {
      title:
        "Weltraumrettungsübereinkommen — Niederländischer Ratifizierungsvermerk",
      provisions: {
        "Art. 1-4": {
          title: "Rettung und Rückführung von Raumfahrern",
          summary:
            "Vertragsstaaten müssen Raumfahrer, die in ihrem Hoheitsgebiet landen, benachrichtigen, retten und zurückführen. Die Niederlande haben dieses Abkommen RATIFIZIERT.",
        },
        "Art. 5": {
          title: "Rückgabe von Weltraumgegenständen",
          summary:
            "Im Hoheitsgebiet eines Vertragsstaats gefundene Weltraumgegenstände sind dem Startstaat zurückzugeben.",
        },
      },
    },
  ],
  [
    "NL-LIABILITY-1972",
    {
      title:
        "Weltraumhaftungsübereinkommen — Niederländischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Die Niederlande haften als Startstaat absolut für Schäden, die durch ihre Weltraumgegenstände auf der Erdoberfläche verursacht werden.",
          complianceImplication:
            "Das WRA 2007 setzt ein flexibles Haftungsregime um — keine feste gesetzliche Obergrenze. Der Minister legt die Haftungsgrenzen im Einzelfall in den Lizenzbedingungen fest.",
        },
        "Art. III": {
          title: "Verschuldenshaftung im Weltraum",
          summary:
            "Für Schäden außerhalb der Erdoberfläche haftet der Startstaat nur bei Verschulden.",
        },
      },
    },
  ],
  [
    "NL-REGISTRATION-1975",
    {
      title:
        "Registrierungsübereinkommen — Niederländischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Die Niederlande müssen ein nationales Register der Weltraumgegenstände führen. Umgesetzt durch WRA 2007 Kapitel 5 und das Besluit Register Ruimtevoorwerpen — ein einzigartiges Zweiteiliges Register.",
          complianceImplication:
            "Alle Weltraumgegenstände, für die die Niederlande die internationale Verantwortung tragen, müssen beim NSO registriert werden.",
        },
      },
    },
  ],
  [
    "NL-MOON-1979",
    {
      title: "Mondvertrag — Niederländischer Ratifizierungsvermerk",
      scopeDescription:
        "Die Niederlande sind eine von nur 18 Vertragsparteien des Mondvertrags und die EINZIGE bedeutende Raumfahrtnation, die ihn ratifiziert hat (17. Februar 1983). Dies schafft eine einzigartige Spannung: Die NL haben die Artemis Accords (2024) unterzeichnet, obwohl das Gemeinsame-Erbe-Prinzip des Mondvertrags möglicherweise im Widerspruch zu Artemis Abschnitt 10 (Weltraumressourcen) steht.",
      provisions: {
        "Art. 11(1)": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine natürlichen Ressourcen sind das gemeinsame Erbe der Menschheit. Kein Staat darf Souveränität über Himmelskörper beanspruchen.",
          complianceImplication:
            "Die Niederlande sind an das Gemeinsame-Erbe-Prinzip GEBUNDEN — im Gegensatz zu den USA, Luxemburg und den meisten anderen Raumfahrtnationen.",
        },
        "Art. 11(5)": {
          title: "Internationales Regime für Ausbeutung",
          summary:
            "Ein internationales Regime soll die Ausbeutung der natürlichen Ressourcen des Mondes regeln, wenn eine solche Ausbeutung durchführbar wird.",
        },
        "Art. 6(2)": {
          title: "Wissenschaftliche Proben zulässig",
          summary:
            "Proben von Mondmineralien und -substanzen dürfen für wissenschaftliche Zwecke gesammelt und entfernt werden.",
        },
      },
    },
  ],

  // Primary National Legislation (NL)
  [
    "NL-WRA-2007",
    {
      title:
        "Gesetz über Weltraumaktivitäten (Wet ruimtevaartactiviteiten — WRA)",
      scopeDescription:
        "Eines der frühesten umfassenden europäischen Weltraumgesetze (erlassen 2006, in Kraft 2007). 28 Abschnitte in 7 Kapiteln. Bemerkenswerte Merkmale: Erweiterung der Zuständigkeit auf Steuerung und Kontrolle, Zweiteiliges Register, flexible Einzelfall-Haftungsgrenzen.",
      provisions: {
        "§ 2 (Art. 3)": {
          title: "Lizenzpflicht",
          summary:
            "Es ist verboten, Weltraumtätigkeiten vom Hoheitsgebiet der Niederlande oder von niederländisch registrierten Schiffen oder Flugzeugen ohne Lizenz des Ministers für Wirtschaft durchzuführen.",
          complianceImplication:
            "Alle den Niederlanden zurechenbaren Weltraumtätigkeiten erfordern eine Lizenz.",
        },
        "§ 2 (Art. 3a)": {
          title: "Erweiterung auf Steuerung und Kontrolle",
          summary:
            "Die Lizenzpflicht erstreckt sich auf Steuerungs- und Kontrollaktivitäten über Weltraumgegenstände vom niederländischen Hoheitsgebiet aus, auch wenn das Objekt anderswo gestartet wurde.",
          complianceImplication:
            "Bodensegmentbetreiber, die ausländisch gestartete Satelliten von den Niederlanden aus steuern, benötigen ebenfalls eine WRA-Lizenz.",
        },
        "§ 3 (Art. 7-9)": {
          title: "Registrierung — Zweiteiliges Register",
          summary:
            "Weltraumgegenstände müssen im nationalen Register des NSO eingetragen werden. Das Register hat zwei Teile: aktive Objekte und außer Dienst gestellte Objekte.",
          complianceImplication:
            "Das Zweiteilige Register ist eine niederländische Innovation. Außer Dienst gestellte Objekte werden weiterhin nachverfolgt.",
        },
        "§ 4 (Art. 10-11)": {
          title: "Haftung — flexibles Regime, keine feste Obergrenze",
          summary:
            "Betreiber haften für durch ihre Weltraumtätigkeiten verursachte Schäden. Es gibt KEINE feste gesetzliche Haftungsobergrenze — der Minister legt die Haftungsgrenzen im Einzelfall fest.",
          complianceImplication:
            "Das flexible Haftungsregime ist ein wesentliches Unterscheidungsmerkmal. Anders als Deutschland (keine Obergrenze), Frankreich (60 Mio. EUR) oder Luxemburg (unbegrenzt, kein Rückgriff) bestimmen die Niederlande die Haftungsgrenzen pro Lizenz.",
        },
        "§ 5 (Art. 12-14)": {
          title: "Aufsicht und Durchsetzung",
          summary:
            "Der Minister kann Verwaltungsstrafen verhängen. Lizenzbedingungen können Versicherungspflichten, Weltraummüllvermeidung und Betriebsbeschränkungen umfassen.",
        },
        "§ 6 (Art. 15-17)": {
          title: "Strafvorschriften",
          summary:
            "Die Durchführung von Weltraumtätigkeiten ohne Lizenz ist eine Straftat (Wirtschaftsdelikt). Höchststrafe der vierten Kategorie (25.750 EUR Stand 2026).",
          complianceImplication:
            "Strafsanktionen sind vergleichsweise moderat gegenüber Luxemburg (1,25 Mio. EUR) oder Frankreich (200.000 EUR + Freiheitsstrafe).",
        },
        "§ 7 (Art. 18-28)": {
          title: "Übergangs- und Schlussbestimmungen",
          summary:
            "Bestandsbetreiber hatten eine Übergangsfrist zur Erlangung von Lizenzen. Das Gesetz trat am 1. Januar 2007 in Kraft.",
        },
      },
    },
  ],

  // Implementing Legislation (NL)
  [
    "NL-WRA-DECREE-2008",
    {
      title:
        "Verordnung über Weltraumtätigkeiten (Besluit ruimtevaartactiviteiten)",
      provisions: {
        "Full instrument": {
          title: "Anforderungen an Lizenzanträge",
          summary:
            "Detaillierte Anforderungen für Lizenzanträge: technische Dokumentation, Nachweis der finanziellen Leistungsfähigkeit, Versicherungsvereinbarungen, Pläne zur Weltraummüllvermeidung und Betreiberkompetenz.",
        },
      },
    },
  ],
  [
    "NL-WRA-REGULATION-2008",
    {
      title:
        "Ministerialverordnung Weltraumtätigkeiten (Regeling ruimtevaartactiviteiten)",
      provisions: {
        "Full instrument": {
          title: "Antragsformulare und Verfahren",
          summary:
            "Detaillierte Ministerialverordnung mit Antragsformularen, Verfahrensanforderungen, Lizenzbedingungen und technischen Standards.",
        },
      },
    },
  ],
  [
    "NL-REGISTRY-DECREE",
    {
      title:
        "Verordnung über das Register der Weltraumgegenstände (Besluit Register Ruimtevoorwerpen)",
      provisions: {
        "Full instrument": {
          title: "Nationales Register — Zweiteilige Struktur",
          summary:
            "Detaillierte Struktur und Betrieb des nationalen Registers. Teil A (aktive Weltraumgegenstände) und Teil B (außer Dienst gestellte Weltraumgegenstände).",
          complianceImplication:
            "Betreiber müssen Startdaten, Orbitalparameter und Stilllegungspläne für die Registrierung bereitstellen.",
        },
      },
    },
  ],

  // Telecommunications (NL)
  [
    "NL-TW-2004",
    {
      title: "Telekommunikationsgesetz (Telecommunicatiewet)",
      provisions: {
        "Ch. 3": {
          title: "Frequenzverwaltung",
          summary:
            "RDI (vormals Agentschap Telecom) verwaltet die Frequenzzuweisung und Satellitenfrequenzkoordination einschließlich ITU-Meldepflichten.",
          complianceImplication:
            "Satellitenbetreiber, die niederländisch angemeldete Frequenzen nutzen, benötigen eine RDI-Spektrumgenehmigung.",
        },
      },
    },
  ],

  // Export Control (NL)
  [
    "NL-WSG-2012",
    {
      title: "Gesetz über strategische Güter (Wet strategische goederen — Wsg)",
      provisions: {
        "Full instrument": {
          title: "Dual-Use- und Verteidigungsexportkontrolle",
          summary:
            "Umsetzung der EU-Dual-Use-Verordnung (EU 2021/821) und nationaler Verteidigungsexportkontrollen. CDIU ist die zuständige Behörde. Umfasst Wassenaar-Arrangement-Kontrolllisten — das Wassenaar Arrangement hat seinen Hauptsitz in Den Haag.",
          complianceImplication:
            "Satellitenkomponenten, Verschlüsselungstechnologie und weltraumbezogene Güter erfordern eine CDIU-Exportgenehmigung.",
        },
      },
    },
  ],

  // Cybersecurity (NL)
  [
    "NL-WBNI-2018",
    {
      title: "Gesetz zur Sicherheit von Netz- und Informationssystemen (Wbni)",
      provisions: {
        "Full instrument": {
          title: "Umsetzung der NIS1-Richtlinie",
          summary:
            "Umsetzung der NIS1-Richtlinie (EU 2016/1148) in niederländisches Recht. Cybersicherheitspflichten für Betreiber wesentlicher Dienste (AED). NCSC als zentrale Koordinierungsstelle.",
          complianceImplication:
            "Als wesentliche Dienste eingestufte Weltraumbetreiber müssen Sicherheits- und Meldepflichten erfüllen. Derzeit gültig bis zur NIS2-Umsetzung.",
        },
      },
    },
  ],
  [
    "NL-CBW-NIS2",
    {
      title:
        "Cybersicherheitsgesetz (Cyberbeveiligingswet — Cbw) — NIS2-Umsetzung",
      provisions: {
        "Full draft": {
          title: "Umsetzung der NIS2-Richtlinie",
          summary:
            "Gesetzentwurf zur Umsetzung der NIS2-Richtlinie (EU 2022/2555). Raumfahrtsektor explizit als wesentlicher Dienstsektor einbezogen. Erweiterte Cybersicherheitspflichten und obligatorische Vorfallmeldung.",
          complianceImplication:
            "Weltraumbetreiber werden unter dem Cbw deutlich erweiterten Cybersicherheitspflichten unterliegen. Die Niederlande haben die Umsetzungsfrist vom 17. Oktober 2024 versäumt.",
        },
      },
    },
  ],

  // Data Protection (NL)
  [
    "NL-UAVG-2018",
    {
      title: "DSGVO-Umsetzungsgesetz (Uitvoeringswet AVG — UAVG)",
      provisions: {
        "Full instrument": {
          title: "Nationale DSGVO-Umsetzung",
          summary:
            "Setzt die DSGVO in niederländisches Recht um. Einrichtung der Autoriteit Persoonsgegevens (AP) als nationale Datenschutzbehörde.",
          complianceImplication:
            "Erdbeobachtungsbetreiber und Satellitendatenanbieter, die personenbezogene Daten verarbeiten, müssen die DSGVO über das UAVG-Rahmenwerk einhalten.",
        },
      },
    },
  ],

  // Environmental (NL)
  [
    "NL-WM-1979",
    {
      title: "Umweltmanagementgesetz (Wet milieubeheer — Wm)",
      provisions: {
        "Full instrument": {
          title: "Umweltmanagement-Rahmenwerk",
          summary:
            "Allgemeines Umweltmanagement-Rahmenwerk anwendbar auf Weltraumstart- und Bodeninfrastruktur. Umweltverträglichkeitsprüfung kann erforderlich sein.",
        },
      },
    },
  ],

  // Investment Screening (NL)
  [
    "NL-VIFO-2023",
    {
      title:
        "Sicherheitsüberprüfungsgesetz für Investitionen, Fusionen und Übernahmen (Wet Vifo)",
      provisions: {
        "Full instrument": {
          title: "Auslandsinvestitionsprüfung für sensible Technologien",
          summary:
            "Obligatorische Prüfung von Investitionen und Übernahmen sensibler Technologieunternehmen. Raumfahrttechnologie explizit als sensible Technologie eingestuft. BTI verwaltet den Prüfprozess.",
          complianceImplication:
            "Übernahmen niederländischer Raumfahrtunternehmen durch Nicht-EU-Investoren unterliegen der obligatorischen BTI-Prüfung. Rückwirkend zum 8. September 2020.",
        },
      },
    },
  ],

  // Policy Documents (NL)
  [
    "NL-SPACE-STRATEGY-2019",
    {
      title:
        "Niederländische Langfristige Raumfahrtagenda (Lange-Termijn Ruimtevaart Agenda)",
      provisions: {
        "Full document": {
          title: "Nationale Raumfahrtstrategie 2019-2025",
          summary:
            "Niederländische langfristige Raumfahrtpolitik-Agenda. Die Niederlande tragen jährlich etwa 200 Mio. EUR zur ESA bei. Prioritäten: Erdbeobachtung, Satellitennavigation, Weltraumwissenschaft und Weltraumsicherheit.",
        },
      },
    },
  ],
  [
    "NL-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Niederlande als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "Unterzeichner bestätigen, dass die Gewinnung von Weltraumressourcen keine nationale Aneignung darstellt. Die Niederlande unterzeichneten trotz Mitgliedschaft im Mondvertrag.",
          complianceImplication:
            "Niederländische Betreiber unterliegen einem einzigartigen Doppelrahmen: gebunden an den Mondvertrag (gemeinsames Erbe) und die Artemis Accords (permissive Ressourcengewinnung).",
        },
        "Section 11": {
          title: "Dekonfliktierung von Aktivitäten",
          summary:
            "Unterzeichner verpflichten sich, schädliche Interferenzen zu vermeiden und Aktivitäten zu melden, die Störungen verursachen könnten.",
        },
      },
    },
  ],
  [
    "NL-HAGUE-BUILDING-BLOCKS",
    {
      title:
        "Haager Arbeitsgruppe für internationale Weltraumressourcen-Governance — Bausteine",
      provisions: {
        "Building Blocks": {
          title: "Internationaler Governance-Rahmen für Weltraumressourcen",
          summary:
            "20 Bausteine für einen internationalen Rahmen für Weltraumressourcenaktivitäten. Entwickelt von der Haager Arbeitsgruppe an der Universität Leiden.",
          complianceImplication:
            "Die Bausteine beeinflussen internationale Diskussionen bei COPUOS. Niederländische Betreiber sollten die Entwicklung beobachten.",
        },
      },
    },
  ],
  [
    "NL-HCOC",
    {
      title:
        "Haager Verhaltenskodex gegen die Verbreitung ballistischer Raketen (HCoC)",
      provisions: {
        "Full instrument": {
          title: "Nichtverbreitung ballistischer Raketen und Vertrauensbildung",
          summary:
            "Politisch bindender Verhaltenskodex mit Transparenz- und Vertrauensbildungsmaßnahmen für ballistische Raketen- und Raumfahrtträgerprogramme. Vorstartmeldungen erforderlich. Den Haag ist die namensgebende Stadt.",
          complianceImplication:
            "Startdienstleister müssen Vorstartmeldepflichten einhalten.",
        },
      },
    },
  ],

  // EU/ESA (NL)
  [
    "NL-ESA-HQ-AGREEMENT",
    {
      title: "ESA/Niederlande-Sitzabkommen (ESTEC)",
      provisions: {
        "Full instrument": {
          title: "ESTEC-Privilegien und Immunitäten",
          summary:
            "Gewährt der ESA Privilegien und Immunitäten für den ESTEC-Betrieb in Noordwijk. ESTEC ist die größte ESA-Einrichtung mit ca. 2.500 Mitarbeitern. Beherbergt das ESTEC Test Centre (größte Satellitentestanlage Europas).",
          complianceImplication:
            "ESA-Operationen am ESTEC unterliegen unter diesem Abkommen nicht der niederländischen Regulierungszuständigkeit.",
        },
      },
    },
  ],

  // Wassenaar (NL)
  [
    "NL-WASSENAAR",
    {
      title:
        "Wassenaar Arrangement über Exportkontrollen für konventionelle Waffen und Dual-Use-Güter",
      provisions: {
        "Dual-Use List": {
          title: "Exportkontrolllisten für Raumfahrttechnologie",
          summary:
            "Führt Kontrolllisten für Dual-Use-Güter einschließlich Satellitenkomponenten, Antriebssysteme, Lenksysteme und Verschlüsselungstechnologie. 42 teilnehmende Staaten. Hauptsitz in Wassenaar bei Den Haag.",
          complianceImplication:
            "Die Wassenaar-Listen werden direkt in der EU-Verordnung 2021/821 und dem nationalen Exportkontrollgesetz (Wsg) umgesetzt.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // BELGIUM (BE) — 23 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "BE-OST-1967",
    {
      title: "Weltraumvertrag — Belgischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Belgien trägt die völkerrechtliche Verantwortung für alle nationalen Weltraumtätigkeiten. Verfassungsrechtliche Grundlage des Weltraumgesetzes von 2005.",
          complianceImplication:
            "Art. VI ist die Rechtsgrundlage des belgischen Genehmigungsregimes. Belgien wählte bewusst nur territoriale Zuständigkeit (ratione loci).",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Belgien ist ‚Startstaat' für von seinem Hoheitsgebiet oder durch belgische Einrichtungen gestartete Objekte. Belgien vertritt eine restriktive Position.",
        },
      },
    },
  ],
  [
    "BE-RESCUE-1968",
    {
      title: "Weltraumrettungsübereinkommen — Belgischer Ratifizierungsvermerk",
      provisions: {
        "Art. 1-4": {
          title: "Rettung und Rückführung von Raumfahrern",
          summary:
            "Vertragsstaaten müssen Raumfahrer retten und zurückführen. Belgien hat ratifiziert.",
        },
      },
    },
  ],
  [
    "BE-LIABILITY-1972",
    {
      title: "Weltraumhaftungsübereinkommen — Belgischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Belgien haftet als Startstaat absolut für Schäden auf der Erdoberfläche. Das Gesetz von 2005 setzt dies durch das Rückgriffsrecht (action récursoire) um, gedeckelt auf 10% des Jahresumsatzes.",
          complianceImplication:
            "Die 10%-Umsatzobergrenze ist Belgiens charakteristische Innovation. Die Obergrenze verfällt bei Verletzung der Genehmigungsbedingungen.",
        },
        "Art. III": {
          title: "Verschuldenshaftung im Weltraum",
          summary:
            "Für Schäden im Weltraum haftet der Startstaat nur bei Verschulden.",
        },
      },
    },
  ],
  [
    "BE-REGISTRATION-1975",
    {
      title: "Registrierungsübereinkommen — Belgischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Belgien führt ein nationales Register der Weltraumgegenstände. Umgesetzt durch das Gesetz von 2005 (Kapitel V, Art. 14). BELSPO übermittelt Daten an den UN-Generalsekretär.",
          complianceImplication:
            "Zwischen 2014 und 2020 wurden 36 Objekte registriert.",
        },
      },
    },
  ],
  [
    "BE-MOON-2004",
    {
      title: "Mondvertrag — Belgischer Beitrittsvermerk",
      scopeDescription:
        "Belgien trat am 12. November 2004 bei — eine von nur ~17 Vertragsparteien weltweit. Schafft einzigartige Spannung mit den Artemis Accords (unterzeichnet 23. Januar 2024). Belgien positioniert sich als Brücke zwischen dem Mondvertragsrahmen und den operativen Realitäten des Artemis-Programms.",
      provisions: {
        "Art. 11(1)": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Der Mond und seine Ressourcen sind gemeinsames Erbe der Menschheit. Belgien ist an dieses Prinzip GEBUNDEN.",
          complianceImplication:
            "Belgien löst die Spannung durch pragmatischen Multilateralismus — die Accords als nicht rechtsverbindliche politische Grundsätze behandelnd.",
        },
        "Art. 11(5)": {
          title: "Internationales Regime für Ausbeutung",
          summary:
            "Ein internationales Regime soll die Ressourcenausbeutung regeln. Belgien ist führender Befürworter bei COPUOS.",
        },
      },
    },
  ],
  [
    "BE-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Belgien als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "Belgien unterzeichnete trotz Mitgliedschaft im Mondvertrag — behandelt die Accords als rechtlich nicht bindende politische Grundsätze.",
          complianceImplication:
            "Belgische Betreiber unterliegen einem Doppelrahmen: Mondvertrag (gemeinsames Erbe) und Artemis Accords (permissive Gewinnung).",
        },
      },
    },
  ],

  [
    "BE-SPACE-LAW-2005",
    {
      title: "Gesetz vom 17. September 2005 über Weltraumtätigkeiten",
      scopeDescription:
        "Europas FRÜHESTES ‚neue Welle'-Weltraumgesetz — erlassen 2005, drei Jahre vor Frankreich. 7 Kapitel, 21 Artikel. Drei Säulen: Genehmigung/Aufsicht, nationales Register, Haftung/Rückgriff. Die umsatzbasierte 10%-Haftungsobergrenze und das ermessensbasierte Versicherungsregime sind einzigartige belgische Innovationen.",
      provisions: {
        "Art. 4": {
          title: "Genehmigungspflicht — persönlich und nicht übertragbar",
          summary:
            "Alle Weltraumtätigkeiten im belgischen Zuständigkeitsbereich erfordern eine Genehmigung des Ministers für Weltraumforschung. Gebühr: 1.000 EUR. Entscheidung binnen 90 Tagen.",
          complianceImplication:
            "Belgien wählte nur territoriale Zuständigkeit (ratione loci). Schweigen bedeutet Ablehnung.",
        },
        "Art. 5": {
          title: "Ermessensbasierte Versicherung",
          summary:
            "Keine feste Versicherungssumme vorgeschrieben. Der Minister kann Versicherungspflichten fallweise auferlegen — flexibler als Frankreichs obligatorische 60-Mio.-EUR-Obergrenze.",
          complianceImplication:
            "Besonders geeignet für Belgiens KMU-dominiertes Weltraum-Ökosystem.",
        },
        "Art. 15": {
          title: "Haftung — 10%-Umsatz-Rückgriffsobergrenze",
          summary:
            "Der König kann den Rückgriff auf 10% des durchschnittlichen Jahresumsatzes deckeln. Dieses Modell beeinflusste Deutschlands geplantes Weltraumgesetz und EU-Diskussionen.",
          complianceImplication:
            "Die Obergrenze verfällt vollständig bei Verletzung der Genehmigungsbedingungen oder unterlassener Krisenbenachrichtigung.",
        },
        "Art. 19": {
          title: "Strafvorschriften",
          summary:
            "Unbefugte Weltraumtätigkeiten: 8 Tage bis 1 Jahr Freiheitsstrafe und/oder 25 bis 25.000 EUR Geldstrafe.",
        },
      },
    },
  ],
  [
    "BE-SPACE-LAW-AMENDMENT-2013",
    {
      title: "Gesetz vom 1. Dezember 2013 — Änderung des Weltraumgesetzes 2005",
      scopeDescription:
        "Änderte Artikel 3 für nicht manövrierbare Objekte im Orbit (Cubesats, Nanosatelliten). Versicherungs- und Haftungsbestimmungen NICHT geändert.",
      provisions: {
        "Art. 3, 2°": {
          title: "Betreiberdefinition — nicht manövrierbare Objekte",
          summary:
            "Für nicht in der Flugbahn steuerbare Weltraumgegenstände gilt als Betreiber die Person, die die Positionierung in Auftrag gibt.",
        },
        "Art. 3, 3°": {
          title: "Effektive Kontrolle — überarbeitete Definition",
          summary:
            "Geändert von ‚Beherrschung der Kommandomittel' zu ‚Autorität über die Aktivierung der Kommando- oder Fernsteuerungsmittel'.",
        },
      },
    },
  ],

  [
    "BE-RD-2022",
    {
      title:
        "Königlicher Erlass vom 15. März 2022 — Durchführungserlass (aktuell)",
      provisions: {
        "Full instrument": {
          title: "BELSPO-Rolle — Antragsbearbeitung",
          summary:
            "BELSPO-Rolle formal festgelegt. ESA-Fachexpertise für Class-U-Objekte (Cubesats) obligatorisch, Kosten zu Lasten des Antragstellers. Rahmen für Registrierungsübertragung. DSGVO-Konformität integriert.",
          complianceImplication:
            "Ausnahmen für staatlich beaufsichtigte Aktivitäten und Betreiber mit vorheriger Class-U-Genehmigung innerhalb der letzten 10 Jahre.",
        },
      },
    },
  ],
  [
    "BE-ESA-REDU-2021",
    {
      title:
        "Gesetz vom 12. Oktober 2021 — ESA/Belgien ESEC-Sitzabkommen (Redu)",
      provisions: {
        "Full instrument": {
          title: "ESEC-Sitzabkommen-Ratifizierung",
          summary:
            "Ratifiziert das Sitzabkommen für das ESEC-Zentrum in Redu. ESEC beherbergt Missionskontrolle für Proba-Satelliten, Galileo-Signalvalidierung und Europas erstes Cybersicherheits-Trainingszentrum für Weltraumsysteme (30 Mio. EUR).",
        },
      },
    },
  ],

  [
    "BE-NIS2-2024",
    {
      title: "Gesetz vom 26. April 2024 — NIS2-Umsetzung",
      provisions: {
        "Full instrument": {
          title: "NIS2-Richtlinienumsetzung — erste in der EU",
          summary:
            "Belgien war der ERSTE EU-Mitgliedstaat mit vollständiger NIS2-Umsetzung. Weltraum als Sektor hoher Kritikalität eingestuft. Registrierungsfrist: 18. April 2026. Vorfallmeldung: 24h Erstwarnung, 72h weitere Informationen, 30-Tage-Abschlussbericht.",
          complianceImplication:
            "Leitungsorgane persönlich haftbar mit obligatorischer Schulung. CyberFundamentals (CyFun®) als ISO-27001-Alternative.",
        },
      },
    },
  ],
  [
    "BE-NIS2-RD-2024",
    {
      title: "Königlicher Erlass vom 9. Juni 2024 — CCB-Benennung unter NIS2",
      provisions: {
        "Full instrument": {
          title: "CCB als nationale Cybersicherheitsbehörde",
          summary:
            "Benennt das Centre for Cybersecurity Belgium (CCB) als nationale Cybersicherheitsbehörde und CSIRT (via CERT.be).",
        },
      },
    },
  ],

  [
    "BE-ECA-2005",
    {
      title: "Gesetz über elektronische Kommunikation vom 13. Juni 2005",
      provisions: {
        "Full instrument": {
          title: "Rahmenwerk für elektronische Kommunikation",
          summary:
            "Allgemeines Genehmigungsregime mit BIPT-Meldung. BIPT verwaltet Satellitenfrequenzkoordination und ITU-Anmeldungen.",
        },
      },
    },
  ],
  [
    "BE-SAT-EARTH-STATIONS-1998",
    {
      title: "Königlicher Erlass vom 16. April 1998 — Satelliten-Erdstationen",
      provisions: {
        "Full instrument": {
          title: "Lizenzierung von Satelliten-Erdstationen",
          summary:
            "Regelt Satelliten-Erdstationen mit BIPT-Konformitätspflicht. TV-Empfangsantennen und Satellitentelefone sind befreit.",
        },
      },
    },
  ],

  [
    "BE-SPECIAL-LAW-2003",
    {
      title:
        "Sondergesetz vom 12. August 2003 — Regionale Exportkontrollübertragung",
      provisions: {
        "Full instrument": {
          title: "Übertragung der Dual-Use-Exportlizenzen auf die Regionen",
          summary:
            "Übertrug die Waffen- und Dual-Use-Exportlizenzierung an Belgiens drei Regionen: Flandern, Wallonien und Brüssel-Hauptstadt. Europas komplexeste Dual-Use-Lizenzarchitektur.",
          complianceImplication:
            "Weltraumunternehmen beantragen Exportlizenzen bei ihrer regionalen Behörde je nach Standort.",
        },
      },
    },
  ],
  [
    "BE-FLANDERS-ARMS-2012",
    {
      title: "Flämisches Waffenhandelsgesetz vom 15. Juni 2012",
      provisions: {
        "Full instrument": {
          title: "Flämische Exportkontrolle für strategische Güter",
          summary:
            "Flämische Regionalgesetzgebung für Dual-Use- und Waffenexportlizenzen. Gilt für in Flandern ansässige Unternehmen (z.B. Redwire Space Belgium, Newtec).",
        },
      },
    },
  ],
  [
    "BE-WALLONIA-EXPORT-2012",
    {
      title:
        "Dekret der Wallonischen Region vom 21. Juni 2012 — Exportkontrolle",
      provisions: {
        "Full instrument": {
          title: "Wallonisches Exportkontrollrahmenwerk",
          summary:
            "Wallonische Regionalgesetzgebung für Exportlizenzen. Wallonien umfasst >70% der belgischen Luftfahrtaktivität (z.B. Thales Alenia Space Belgium, Spacebel).",
        },
      },
    },
  ],

  [
    "BE-GDPR-2018",
    {
      title: "Gesetz vom 30. Juli 2018 — DSGVO-Rahmengesetz",
      provisions: {
        "Full instrument": {
          title: "Nationale DSGVO-Umsetzung",
          summary:
            "Setzt die DSGVO in belgisches Recht um. Keine weltraumspezifische Orientierung der Datenschutzbehörde.",
        },
      },
    },
  ],
  [
    "BE-FDI-2023",
    {
      title: "Kooperationsabkommen vom 30. November 2022 — Investitionsprüfung",
      provisions: {
        "Full instrument": {
          title: "Prüfung ausländischer Direktinvestitionen",
          summary:
            "Luft- und Raumfahrt sowie Verteidigung explizit als sensible Sektoren gelistet. Koordiniert durch den Interföderalen Prüfungsausschuss (ISC).",
        },
      },
    },
  ],

  [
    "BE-CM25-ESA",
    {
      title: "Belgiens CM25 ESA-Verpflichtung (November 2025, Bremen)",
      provisions: {
        Programme: {
          title: "Fünfjahres-ESA-Verpflichtung ~1,1 Mrd. EUR",
          summary:
            "Belgien verpflichtete sich bei CM25 zu ca. 1,1 Mrd. EUR über fünf Jahre: 114 Mio. EUR für Trägersysteme, 113 Mio. EUR für Erdbeobachtung, 205 Mio. EUR für Forschung.",
        },
      },
    },
  ],
  [
    "BE-BENELUX-MOU-2024",
    {
      title: "Benelux-Weltraumkooperation MOU (September 2024)",
      provisions: {
        MOU: {
          title: "Benelux-Raumfahrtindustriekooperation",
          summary:
            "MOU zwischen SpaceNed (Niederlande), VRI (Flandern), BAG (Brüssel) und Wallonie Espace für Benelux-Weltraumkooperation.",
        },
      },
    },
  ],

  [
    "BE-CRA-2024",
    {
      title:
        "Cyber-Resilienz-Gesetz (Verordnung (EU) 2024/2847) — Belgische Anwendung",
      provisions: {
        "Full regulation": {
          title: "Produktcybersicherheit für Weltraumkomponenten",
          summary:
            "Gilt für alle Produkte mit digitalen Elementen einschließlich Satellitenkomponenten und Bodenstationssoftware. Meiste Pflichten ab 11. Dezember 2027.",
          complianceImplication:
            "Belgische Hersteller (Redwire, Thales Alenia Space Belgium, Aerospacelab, Spacebel) müssen Konformität vorbereiten.",
        },
      },
    },
  ],
  [
    "BE-BWHI-1980",
    {
      title:
        "Sondergesetz zur Institutionenreform (BWHI-LSRI) — Weltraumkompetenz",
      provisions: {
        "Art. 6bis, §2, 3°": {
          title: "Weltraumforschung als ausschließliche Bundeskompetenz",
          summary:
            "Weltraumforschung im Rahmen internationaler Institutionen ist ausschließliche Bundeskompetenz. Exportkontrolle ist regional, Forschung parallele Kompetenz.",
          complianceImplication:
            "Das Weltraumgesetz 2005 ist ausschließlich föderaler Zuständigkeit. Exportkontrolle ist ausschließlich regional (seit 2003) — einzigartig in Europa.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // SPAIN (ES) — 21 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "ES-OST-1967",
    {
      title: "Weltraumvertrag — Spanischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Spanien trägt die Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEINEN nationalen Mechanismus, der diese Verpflichtung umsetzt — die grundlegendste Regulierungslücke.",
          complianceImplication:
            "Art. VI erfordert die Genehmigung privater Tätigkeiten, aber Spanien hat kein Genehmigungsregime.",
        },
        "Art. VII": {
          title: "Haftung des Startstaats",
          summary:
            "Spanien ist ‚Startstaat' für von seinem Hoheitsgebiet oder durch spanische Einrichtungen gestartete Objekte.",
        },
      },
    },
  ],
  [
    "ES-RESCUE-2001",
    {
      title: "Weltraumrettungsübereinkommen — Spanischer Beitrittsvermerk",
      provisions: {
        "Art. 1-4": {
          title: "Rettung und Rückführung von Raumfahrern",
          summary:
            "Spanien trat erst 2001 bei — 33 Jahre nach Öffnung des Vertrags. Eine der spätesten Beitritte unter ESA-Gründungsmitgliedern.",
        },
      },
    },
  ],
  [
    "ES-LIABILITY-1972",
    {
      title: "Weltraumhaftungsübereinkommen — Spanischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Spanien haftet absolut für Oberflächenschäden. Es gibt KEIN nationales Versicherungs-, Haftungs- oder Rückgriffsregime für Weltraumbetreiber.",
          complianceImplication:
            "Keine gesetzlichen Versicherungspflichten, keine Haftungsobergrenzen, keine Finanzgarantien, kein staatlicher Rückhalt.",
        },
      },
    },
  ],
  [
    "ES-REGISTRATION-1975",
    {
      title: "Registrierungsübereinkommen — Spanischer Beitrittsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Umgesetzt durch Real Decreto 278/1995 — das Registro Español de Objetos Espaciales.",
        },
      },
    },
  ],
  [
    "ES-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Spanien als Unterzeichner (2023)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "Spanien unterzeichnete am 30. Mai 2023 als 25. Unterzeichnerstaat. Spanien hat den Mondvertrag NICHT ratifiziert und NICHT unterzeichnet.",
        },
      },
    },
  ],

  [
    "ES-ORDEN-1968",
    {
      title: "Ministerialerlass vom 19. April 1968 — Private Weltraumstarts",
      provisions: {
        "Full instrument": {
          title: "Regelung privater Weltraumstarts",
          summary:
            "Regelt private Weltraumstarts vom Staatsgebiet. Technisch noch in Kraft, aber allgemein als veraltet und unzureichend anerkannt. Älteste noch geltende weltraumspezifische Vorschrift unter den großen europäischen Raumfahrtnationen.",
        },
      },
    },
  ],
  [
    "ES-RD-278-1995",
    {
      title:
        "Königlicher Erlass 278/1995 — Spanisches Register der Weltraumgegenstände",
      scopeDescription:
        "Spaniens EINZIGES substanzielles weltraumspezifisches Rechtsinstrument neben dem Erlass von 1968. Eine Änderung zur Erweiterung der Datenanforderungen und Einführung von Versicherungspflichten ist in öffentlicher Konsultation, aber nicht veröffentlicht.",
      provisions: {
        "Art. 1": {
          title: "Registererrichtung",
          summary:
            "Errichtet das Registro Español de Objetos Espaciales zur Umsetzung des Registrierungsübereinkommens von 1975.",
        },
        "Art. 5-6": {
          title: "Registrierungspflichten und Datenanforderungen",
          summary:
            "Definiert Registrierungspflichten: Name des Startstaats, Bezeichnung, Orbitalparameter.",
        },
      },
    },
  ],

  [
    "ES-LEY-17-2022",
    {
      title:
        "Gesetz 17/2022 — Wissenschaftsgesetzänderung (AEE-Gründungsermächtigung)",
      provisions: {
        "Disposición Adicional Tercera": {
          title: "Ermächtigung zur AEE-Gründung",
          summary:
            "Ermächtigte die Gründung der Agencia Espacial Española als agencia estatal unter dem Wissenschafts- und dem Verteidigungsministerium.",
        },
      },
    },
  ],
  [
    "ES-RD-158-2023",
    {
      title:
        "Königlicher Erlass 158/2023 — Statut der Agencia Espacial Española",
      scopeDescription:
        "Schafft Spaniens erste eigene Raumfahrtagentur. Art. 5(x) beauftragt die AEE, ein Anteproyecto de Ley de Actividades Espaciales vorzuschlagen.",
      provisions: {
        "Art. 5": {
          title: "AEE-Kompetenzen",
          summary:
            "Umfassende Kompetenzen einschließlich Weltraum-F&E-Koordination, ESA-Beitragsverwaltung und — entscheidend — Mandat für ein Weltraumtätigkeitengesetz.",
          complianceImplication:
            "Die AEE ist ausdrücklich beauftragt, Spaniens erstes umfassendes Weltraumgesetz zu entwerfen. Bis zur Verabschiedung gibt es kein Genehmigungs- oder Versicherungsregime.",
        },
      },
    },
  ],

  [
    "ES-RD-524-2022",
    {
      title:
        "Königlicher Erlass 524/2022 — Umbenennung in Luft- und Weltraumstreitkräfte",
      provisions: {
        "Full instrument": {
          title: "Ejército del Aire y del Espacio",
          summary:
            "Umbenennung der Luftwaffe in Luft- und Weltraumstreitkräfte.",
        },
      },
    },
  ],
  [
    "ES-DEF-264-2023",
    {
      title:
        "Erlass DEF/264/2023 — Organisation der Luft- und Weltraumstreitkräfte (MESPA)",
      provisions: {
        "Art. 9": {
          title: "Mando del Espacio (MESPA) — Weltraumkommando",
          summary:
            "Schafft die Fuerza Aeroespacial mit MESPA als Weltraumkommando für Weltraumlageerfassung und Satellitenschutz.",
        },
      },
    },
  ],
  [
    "ES-ESAN-2025",
    {
      title:
        "Nationale Strategie für Luft- und Raumfahrtsicherheit 2025 (ESAN)",
      provisions: {
        "Full document": {
          title: "Luft- und Raumfahrtsicherheit als einheitliche Domäne",
          summary:
            "Nationale Sicherheitsstrategie mit vereinheitlichter Luft- und Raumfahrtsicherheitsdomäne. Fordert nationale Weltraumgesetzgebung.",
        },
      },
    },
  ],

  [
    "ES-SPACE-LAW-DRAFT",
    {
      title:
        "Entwurf eines Weltraumtätigkeitengesetzes (Anteproyecto de Ley de Actividades Espaciales)",
      provisions: {
        "Public consultation": {
          title: "Geplanter Umfang eines umfassenden Weltraumgesetzes",
          summary:
            "Öffentliche Konsultation November 2025. Geplant: Genehmigungsregime, Betriebssicherheit, Nachhaltigkeit, Versicherung, Registrierungsmodernisierung. KEIN Entwurfstext veröffentlicht — früheste vorgesetzgeberische Phase.",
          complianceImplication:
            "Wenn verabschiedet, wird dies Spaniens erstes umfassendes Weltraumtätigkeitengesetz sein. Kein projiziertes Verabschiedungsdatum.",
        },
      },
    },
  ],

  [
    "ES-LEY-11-2022",
    {
      title: "Allgemeines Telekommunikationsgesetz (Ley 11/2022)",
      provisions: {
        "Art. 85.3": {
          title: "Satelliten-Orbit-Spektrum-Ressourcen",
          summary:
            "Nutzung des Funkspektrums über Satellitennetze unterliegt staatlicher Verwaltung. SETID verwaltet Frequenzzuweisungen und ITU-Koordination.",
        },
      },
    },
  ],
  [
    "ES-LEY-53-2007",
    {
      title:
        "Gesetz 53/2007 — Außenhandelskontrolle für Verteidigungs- und Dual-Use-Güter",
      provisions: {
        "Art. 4 / Art. 14": {
          title: "Kontrollierte Güter und Genehmigungsverfahren",
          summary:
            "Definiert kontrollierte Güter und das JIMDDU-Genehmigungsverfahren. Raumfahrttechnologieexporte werden einzelfallbezogen durch JIMDDU geprüft.",
        },
      },
    },
  ],

  [
    "ES-RD-LEY-12-2018",
    {
      title: "Königlicher Gesetzesverordnung 12/2018 — NIS1-Umsetzung",
      provisions: {
        "Full instrument": {
          title: "Umsetzung der NIS1-Richtlinie",
          summary:
            "Umsetzung der NIS1-Richtlinie. Spanien hat die NIS2-Umsetzungsfrist (17. Oktober 2024) VERSÄUMT — EK-Vertragsverletzungsverfahren eingeleitet.",
          complianceImplication:
            "Spanien steht unter aktivem EK-Vertragsverletzungsverfahren wegen versäumter Frist.",
        },
      },
    },
  ],
  [
    "ES-NIS2-DRAFT",
    {
      title:
        "Entwurf eines Cybersicherheits-Koordinations- und Governance-Gesetzes — NIS2-Umsetzung",
      provisions: {
        "Full draft": {
          title: "NIS2-Richtlinienumsetzung",
          summary:
            "Ministerrat genehmigte Anteproyecto am 14. Januar 2025. Hat parlamentarisches Verfahren NICHT abgeschlossen.",
        },
      },
    },
  ],

  [
    "ES-LOPDGDD-2018",
    {
      title: "Organgesetz 3/2018 — DSGVO-Umsetzung (LOPDGDD)",
      provisions: {
        "Full instrument": {
          title: "DSGVO-Umsetzung und digitale Rechte",
          summary:
            "Setzt die DSGVO in spanisches Recht um. AEPD ist die Aufsichtsbehörde.",
        },
      },
    },
  ],
  [
    "ES-ESA-HOST-2012",
    {
      title: "Spanien-ESA Gastlandabkommen (ESAC und Cebreros)",
      provisions: {
        "Full instrument": {
          title: "Dauerhafte ESA-Einrichtungen in Spanien",
          summary:
            "Regelt ESA-Standorte in Spanien: ESAC in Villafranca del Castillo und Cebreros-Tiefenraumantenne (35m). Erweitert durch Notenaustausch Juli 2024.",
        },
      },
    },
  ],
  [
    "ES-CM25-ESA",
    {
      title:
        "Spaniens CM25 ESA-Verpflichtung — 1,85 Mrd. EUR (November 2025, Bremen)",
      provisions: {
        Programme: {
          title: "Rekord-ESA-Verpflichtung — viertgrößter Beitragszahler",
          summary:
            "1,85 Mrd. EUR — 100%+ Steigerung gegenüber CM22. Spanien erstmals 4. größter ESA-Beitragszahler, vor dem Vereinigten Königreich.",
          complianceImplication:
            "Die institutionelle Infrastruktur (AEE, MESPA, CDTI) ist bereit — es fehlt der Rechtsrahmen (Ley de Actividades Espaciales).",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // NORWAY (NO) — 16 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "NO-OST-1967",
    {
      title: "Weltraumvertrag — Norwegischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit und Genehmigungspflicht",
          summary:
            "Norwegen ratifizierte im Juni 1969 — im selben Monat wie das weltweit erste nationale Weltraumgesetz (LOV-1969-06-13-38).",
          complianceImplication:
            "Das Weltraumgesetz von 1969 war die weltweit erste nationale Umsetzung von Art. VI.",
        },
      },
    },
  ],
  [
    "NO-LIABILITY-1995",
    {
      title:
        "Weltraumhaftungsübereinkommen — Norwegischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "Verspätet 1995 ratifiziert — zeitgleich mit wachsenden SvalSat-Operationen. Kein nationales Umsetzungsgesetz erlassen.",
          complianceImplication:
            "Das Gesetz von 1969 enthält KEINE Haftungsbestimmungen. Nur Ekomloven § 6-7 bietet eine Rückgriffsgrundlage.",
        },
      },
    },
  ],
  [
    "NO-REGISTRATION-1995",
    {
      title: "Registrierungsübereinkommen — Norwegischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Ratifiziert 28. Juni 1995. Registerverwaltung per Königlichem Erlass 31. Mai 2024 an die Luftfahrtbehörde (CAA) delegiert.",
        },
      },
    },
  ],
  [
    "NO-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Norwegen als Unterzeichner (2025)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "Norwegen unterzeichnete am 15. Mai 2025 als 55. Unterzeichner. Mondvertrag NICHT unterzeichnet/ratifiziert.",
        },
      },
    },
  ],
  [
    "NO-SVALBARD-TREATY",
    {
      title: "Spitzbergenvertrag (Svalbardtraktaten, 1920)",
      scopeDescription:
        "Schafft eine EINZIGARTIGE doppelte Regulierungsebene — SvalSat-Betreiber müssen sowohl norwegische Vorschriften ALS AUCH vertragliche Militärnutzungsverbote beachten. Russland und China erheben Bedenken wegen dualer Datennutzung.",
      provisions: {
        "Art. 9": {
          title:
            "Verbot von Marinestützpunkten, Befestigungen, kriegerischen Zwecken",
          summary:
            "Norwegen verpflichtet sich, keine Marinestützpunkte oder Befestigungen zu errichten. Norwegens Position: Svalbard ist NICHT entmilitarisiert — der Vertrag verbietet physische Militärinfrastruktur, nicht Informationsaktivitäten.",
          complianceImplication:
            "SvalSat-Betreiber benötigen Nkom-Konzessionen, die Satelliten mit ‚spezifisch militärischen Funktionen' ausschließen.",
        },
      },
    },
  ],

  [
    "NO-SPACE-ACT-1969",
    {
      title: "Weltraumgesetz 1969 — Weltweit erstes nationales Weltraumgesetz",
      scopeDescription:
        "Das WELTWEIT ERSTE nationale Weltraumgesetz. Nur 3 Paragraphen — das kürzeste Weltraumgesetz der Geschichte. Keine Haftungs-, Versicherungs-, Registrierungs-, Weltraummüll- oder Aufsichtsbestimmungen. Ersetzung durch umfassendes neues Gesetz 2026 erwartet.",
      provisions: {
        "§ 1": {
          title: "Genehmigungspflicht",
          summary:
            "Verbietet das Starten von Gegenständen in den Weltraum ohne ministerielle Genehmigung vom norwegischen Hoheitsgebiet (einschließlich Svalbard und Jan Mayen), norwegischen Schiffen/Flugzeugen oder durch norwegische Staatsangehörige.",
          complianceImplication:
            "Startgenehmigungsbefugnis am 31. Mai 2024 an die CAA delegiert. Erste Startgenehmigung: Isar Aerospace, März 2025.",
        },
      },
    },
  ],
  [
    "NO-NEW-SPACE-ACT-DRAFT",
    {
      title: "Vorgeschlagenes neues Weltraumgesetz — Prop. 155 L (2024-2025)",
      scopeDescription:
        "8 Kapitel, 29 Bestimmungen — ersetzt das kürzeste Weltraumgesetz der Welt (3 Paragraphen). Verabschiedung 2026 erwartet.",
      provisions: {
        "Ch. 5 (§§ 15-18)": {
          title:
            "Strikte Haftung, Staatsrückgriff, obligatorische Versicherung",
          summary:
            "Strikte (objektive) Haftung für Oberflächen-/Flugzeugschäden. Staatsrückgriff gegen Betreiber. Obligatorische Versicherung. Beträge werden per Parlament/Verordnungen festgelegt.",
          complianceImplication:
            "Transformiert Norwegen von null Haftungsbestimmungen zu einem umfassenden Rahmenwerk.",
        },
        "Ch. 4 (§ 11)": {
          title: "Betreiberpflichten — Weltraummüll und Umwelt",
          summary:
            "Keine ‚unverhältnismäßigen Umweltschäden,' ‚so weit wie möglich' kein Weltraummüll. Bezieht sich auf IADC-, COPUOS- und LTS-Leitlinien.",
        },
      },
    },
  ],

  [
    "NO-SVALBARD-EARTH-STATION-REG",
    {
      title: "Svalbard-Satelliten-Erdstationsverordnung",
      provisions: {
        "Full instrument": {
          title: "SvalSat-Betriebsregime",
          summary:
            "Nkom-Genehmigung erforderlich. Pro Satellit separate Kommunikationsgenehmigung. Militärische Nutzung VERBOTEN — Stationen dürfen keine Daten von Satelliten mit ‚spezifisch militärischen Funktionen' senden/empfangen. Obligatorische Protokollierung ALLER Satellitenüberflüge.",
          complianceImplication:
            "Kritisch für SvalSat (150+ Antennen, weltweit größte kommerzielle Bodenstation). Nkom lehnte US- und türkische Militärsatellitenantrage ab.",
        },
      },
    },
  ],
  [
    "NO-ANTARCTIC-EARTH-STATION-REG",
    {
      title: "Antarktis-Satelliten-Erdstationsverordnung",
      provisions: {
        "Full instrument": {
          title: "TrollSat-Betriebsregime",
          summary:
            "Parallele Verordnung für antarktische Erdstationen. Friedliche Zwecke gemäß Antarktisvertrag. Regelt KSATs TrollSat (~23 Antennen).",
        },
      },
    },
  ],
  [
    "NO-EKOMLOVEN-2024",
    {
      title: "Gesetz über elektronische Kommunikation (neues Ekomloven)",
      provisions: {
        "Ch. 6": {
          title: "Spektrumverwaltung und Orbitalplätze",
          summary:
            "§ 6-7 ist die EINZIGE bestehende Rechtsgrundlage für Versicherung und Staatsrückgriff — ermächtigt Nkom zum Rückgriff und verpflichtet Startantragsteller zur Sicherheitsleistung.",
          complianceImplication:
            "Bis zur Verabschiedung des neuen Weltraumgesetzes ist § 6-7 die einzige Rechtsgrundlage für Versicherungspflichten.",
        },
      },
    },
  ],
  [
    "NO-EXPORT-CONTROL-1987",
    {
      title: "Exportkontrollgesetz",
      provisions: {
        "Full instrument": {
          title: "Exportkontrolle für strategische Güter",
          summary:
            "Drei Kontrolllisten: Liste I (Verteidigung), Liste II (Dual-Use nach EU 2021/821), Liste III (kritische Technologien über EU-Umfang hinaus, November 2024). ESA-Ausnahme (§ 5(d)). DEKSA verwaltet das Regime.",
          complianceImplication:
            "Liste III geht über den EU-Dual-Use-Umfang hinaus — kritisch für Weltraumtechnologieexporte.",
        },
      },
    },
  ],
  [
    "NO-DIGITAL-SECURITY-2025",
    {
      title: "Digitalsicherheitsgesetz (NIS1-Umsetzung)",
      provisions: {
        "Full instrument": {
          title: "NIS1-Umsetzung mit Arktis-Erweiterungen",
          summary:
            "Norwegen hat ‚arktische Infrastruktur' (Svalbard-Kabel und Satelliten) proaktiv als wesentliche Infrastruktur eingestuft — ÜBER den NIS2-Standardumfang hinaus.",
        },
      },
    },
  ],
  [
    "NO-SECURITY-ACT-2018",
    {
      title: "Nationales Sicherheitsgesetz (Sikkerhetsloven)",
      provisions: {
        "Full instrument": {
          title: "Sicherheitsrahmen für Weltraumentitäten",
          summary:
            "Die Norwegische Raumfahrtagentur und Space Norway AS unterliegen diesem Gesetz. Alle SvalSat-Mitarbeiter benötigen Sicherheitsfreigabe.",
        },
      },
    },
  ],
  [
    "NO-US-TSA-2025",
    {
      title: "US-Norwegen Technologieschutzabkommen (Andøya Spaceport)",
      provisions: {
        "Full instrument": {
          title: "ITAR-Technologieschutz in Andøya",
          summary:
            "Verhindert unbefugte Weitergabe von US-Technologie am Andøya Spaceport. Unterzeichnet 16. Januar 2025.",
        },
      },
    },
  ],
  [
    "NO-CM25-ESA",
    {
      title:
        "Norwegens CM25 ESA-Verpflichtung — 292 Mio. EUR (November 2025, Bremen)",
      provisions: {
        Programme: {
          title:
            "ESA-Verpflichtung mit Absichtserklärung für Arktisches Raumfahrtzentrum",
          summary:
            "292 Mio. EUR. 55 Mio. EUR für Raumtransport. Absichtserklärung für ESA Arctic Space Centre in Tromsø.",
        },
      },
    },
  ],
  [
    "NO-MELD-ST-32-2013",
    {
      title: "Weißbuch: Zwischen Himmel und Erde — Norwegische Weltraumpolitik",
      provisions: {
        "Full document": {
          title: "Erste umfassende Weltraumstrategie seit 1986",
          summary:
            "Nationale Weltraumstrategie — erste umfassende Überprüfung in 26 Jahren. Prioritäten: Arktische Satellitenkomm./Erdbeobachtung, Klimaüberwachung, maritime Überwachung.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // SWEDEN (SE) — 15 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "SE-OST-1967",
    {
      title: "Weltraumvertrag — Schwedischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Ratifiziert 11. Oktober 1967 — einen Tag nach Inkrafttreten. Das Weltraumgesetz von 1982 setzt Art. VI um.",
        },
      },
    },
  ],
  [
    "SE-LIABILITY-CONV",
    {
      title:
        "Weltraumhaftungsübereinkommen — Schwedischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "§ 6 des Gesetzes von 1982 setzt den Rückgriffsmechanismus um — Betreiber erstattet dem Staat, aber OHNE Versicherungspflicht, OHNE Haftungsobergrenze, OHNE staatlichen Rückhalt.",
        },
      },
    },
  ],
  [
    "SE-REGISTRATION-CONV",
    {
      title: "Registrierungsübereinkommen — Schwedischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Umgesetzt durch § 4 der Verordnung (1982:1069). Rymdstyrelsen führt das Register.",
        },
      },
    },
  ],
  [
    "SE-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Schweden als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "38. Unterzeichner, 16. April 2024. Mondvertrag NICHT unterzeichnet.",
        },
      },
    },
  ],

  [
    "SE-SPACE-ACT-1982",
    {
      title: "Weltraumgesetz (Lag om rymdverksamhet)",
      scopeDescription:
        "Eines der frühesten Weltraumgesetze der Welt. Nur 6 Paragraphen auf einer A4-Seite. Keine Versicherung, keine Haftungsobergrenze, keine Weltraummüllvorschriften, keine Lizenzkriterien. SOU 2021:91-Reform (455 Seiten) seit 2021 blockiert.",
      provisions: {
        "§ 1": {
          title: "Geltungsbereich — Höhenforschungsraketen AUSGENOMMEN",
          summary:
            "Explizit AUSGENOMMEN: Signalempfang und Höhenforschungsraketen. Orbitale Starts erfordern Lizenzierung.",
        },
        "§ 2": {
          title: "Doppelte Lizenzpflicht",
          summary:
            "Territorial- UND Staatsangehörigkeitsbasis. Schwedischer Staat ist befreit.",
        },
        "§ 3": {
          title: "Regierungsentscheidung — keine Kriterien",
          summary:
            "Lizenzen durch die Regierung (Kabinett). KEINE Kriterien für Erteilung oder Ablehnung — vollständig diskretionär.",
        },
        "§ 6": {
          title: "Staatsrückgriff — keine Obergrenze, keine Versicherung",
          summary:
            "Betreiber erstattet dem Staat Zahlungen aus dem Haftungsübereinkommen. KEINE Versicherungspflicht, KEINE Haftungsobergrenze, KEINE staatliche Absicherung.",
          complianceImplication:
            "Schwedens am meisten kritisierte Lücke. SOU 2021:91 schlug 600 Mio. SEK (~55 Mio. EUR) Pflichtversicherung vor — nicht verabschiedet.",
        },
      },
    },
  ],
  [
    "SE-SPACE-ORDINANCE-1982",
    {
      title: "Verordnung über Weltraumtätigkeiten",
      provisions: {
        "§ 1": {
          title: "Antragsverfahren",
          summary:
            "Schriftliche Anträge an Rymdstyrelsen, die PTS konsultiert und an die Regierung weiterleitet.",
        },
        "§ 4": {
          title: "Registrierung von Weltraumgegenständen",
          summary:
            "Rymdstyrelsen führt Register. Daten über Außenministerium an UN-Generalsekretär.",
        },
      },
    },
  ],
  [
    "SE-SOU-2021-91",
    {
      title: "SOU 2021:91 — ‚En ny rymdlag' (Ein neues Weltraumgesetz)",
      provisions: {
        "Full report": {
          title: "Umfassende Weltraumrechtsreform (455 Seiten)",
          summary:
            "Vorschläge: SNSA als Lizenzbehörde; Pflichtversicherung 600 Mio. SEK; strikte Haftung; 100 km Schwelle; 25-Jahre-Deorbit; Umweltbestimmungen. Remiss endete April 2022 — kein Gesetzentwurf eingebracht, Reform blockiert.",
        },
      },
    },
  ],

  [
    "SE-LEK-2022",
    {
      title: "Gesetz über elektronische Kommunikation (LEK)",
      provisions: {
        "Ch. 1 § 7 / Ch. 3 § 1": {
          title: "Satellitenspektrumverwaltung",
          summary:
            "Telekommunikationsnetze umfassen Satellitennetze. PTS verwaltet ITU-Koordination und Erdstationslizenzen.",
        },
      },
    },
  ],
  [
    "SE-DUAL-USE-2000",
    {
      title: "Dual-Use-Kontrollgesetz",
      provisions: {
        "Full instrument": {
          title: "Exportkontrolle für Weltraumtechnologie",
          summary:
            "Ergänzt EU-Dual-Use-Verordnung. ISP ist Lizenzbehörde. Einzigartig: demokratischer Status des Empfängerlandes als ‚zentrale Bedingung' bei Militärexporten.",
        },
      },
    },
  ],
  [
    "SE-CYBERSECURITY-2025",
    {
      title: "Cybersicherheitsgesetz (NIS2-Umsetzung)",
      provisions: {
        "Full instrument": {
          title: "NIS2-Richtlinienumsetzung",
          summary:
            "Weltraum als kritischer Sektor. MCF (vormals MSB) als Koordinator. Höchststrafen: 10 Mio. EUR oder 2% des Umsatzes. Schweden verfehlte die Frist Oktober 2024.",
        },
      },
    },
  ],
  [
    "SE-DATASKYDDSLAGEN-2018",
    {
      title: "Datenschutzgesetz (DSGVO-Ergänzung)",
      provisions: {
        "Full instrument": {
          title: "Nationale DSGVO-Ergänzung",
          summary:
            "IMY als Aufsichtsbehörde. Relevant für Erdbeobachtungsdaten und hochauflösende Bilder.",
        },
      },
    },
  ],
  [
    "SE-US-TSA-2025",
    {
      title: "US-Schweden Technologieschutzabkommen (Esrange)",
      provisions: {
        "Full instrument": {
          title: "ITAR-Technologieschutz in Esrange",
          summary:
            "Nur das 6. US-TSA weltweit. Ermöglicht Firefly-Alpha-Starts von Esrange. Fünf Jahre Verhandlungen. Unterzeichnet 20. Juni 2025.",
          complianceImplication:
            "Wesentlicher Ermöglicher für US-Starts von Esrange.",
        },
      },
    },
  ],
  [
    "SE-SPACE-STRATEGY-2018",
    {
      title: "Strategie für schwedische Weltraumtätigkeiten (2018)",
      provisions: {
        "Full document": {
          title: "Nationale zivile Weltraumstrategie",
          summary:
            "Schwerpunkte: ESA-Kooperation, nachhaltige Weltraumnutzung, Sicherheit, industrielle Wettbewerbsfähigkeit.",
        },
      },
    },
  ],
  [
    "SE-DEFENCE-SPACE-STRATEGY-2024",
    {
      title: "Verteidigungs- und Sicherheits-Weltraumstrategie (2024)",
      provisions: {
        "Full document": {
          title: "Schwedens erste Verteidigungsweltraumstrategie",
          summary:
            "Vier Säulen: Handlungsfreiheit, Gesamtverteidigung, kohärente Politik, internationale Partnerschaft. Erster Militärsatellit GNA-3 im August 2024. 5,3 Mrd. SEK für Weltraumfähigkeiten.",
          complianceImplication:
            "NATO-Beitritt, Militärsatelliten, responsive Starts von Esrange.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // FINLAND (FI) — 12 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "FI-OST-1967",
    {
      title: "Weltraumvertrag — Finnischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Finnlands Umsetzung von Art. VI durch das Gesetz 63/2018 ist eine der gründlichsten in Europa — 8 kumulative Bedingungen, Pflichtversicherung, ministerielle Konsultation.",
          complianceImplication:
            "8 kumulative Lizenzbedingungen — Europas detaillierteste gesetzliche Kriterien.",
        },
      },
    },
  ],
  [
    "FI-LIABILITY-1977",
    {
      title: "Weltraumhaftungsübereinkommen — Finnischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung für Oberflächenschäden",
          summary:
            "§ 7 des Gesetzes setzt beide Ebenen um: absolute Haftung für Boden-/Flugzeugschäden, verschuldensabhängig für Weltraumschäden. Staat zahlt zuerst, dann Rückgriff auf Betreiber (max. 60 Mio. EUR für konforme Betreiber).",
          complianceImplication:
            "Finnlands kanalisierte Haftung schafft implizite Staatsabsicherung — über 60 Mio. EUR hinaus zahlt der Staat.",
        },
      },
    },
  ],
  [
    "FI-REGISTRATION-2018",
    {
      title: "Registrierungsübereinkommen — Finnischer Beitrittsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Finnland trat 2018 bei — bewusst zeitgleich mit dem Weltraumgesetz. TEM führt das Register. 26 finnische Satelliten registriert (März 2026).",
        },
      },
    },
  ],
  [
    "FI-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Finnland als Unterzeichner (2025)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "53. Unterzeichner, 21. Januar 2025. Finnland bekräftigte die UN als ‚primäres Forum für Weltraumrecht'.",
        },
      },
    },
  ],

  [
    "FI-SPACE-ACT-2018",
    {
      title: "Weltraumgesetz (Laki avaruustoiminnasta)",
      scopeDescription:
        "Europas modernstes Weltraumgesetz. 4 Kapitel, 22 Paragraphen. Kernmerkmale: 60-Mio.-EUR-Haftungsobergrenze mit Compliance-Anreiz (Obergrenze entfällt bei Nichteinhaltung), risikobasierte Versicherungsbefreiungen, 8 kumulative Lizenzbedingungen, ministerübergreifende Konsultation.",
      provisions: {
        "§ 5": {
          title: "Genehmigungsregime — 8 kumulative Bedingungen",
          summary:
            "Vorherige TEM-Genehmigung erforderlich. 8 Bedingungen: Zuverlässigkeit, Risikobewertung, Weltraummüllvermeidung, Abwicklungsplan, Sicherheitsvereinbarkeit, Versicherung, ITU-Konformität, Exportkontrolle.",
        },
        "§ 7": {
          title:
            "Kanalisierte Haftung — 60-Mio.-EUR-Obergrenze mit Compliance-Anreiz",
          summary:
            "Staat zahlt Schäden. Rückgriff auf Betreiber max. 60 Mio. EUR. Obergrenze ENTFÄLLT VOLLSTÄNDIG bei Nichtkonformität — unbegrenzte Haftung.",
          complianceImplication:
            "Einzigartigste Innovation: konforme Betreiber haben klare 60-Mio.-Obergrenze, nicht konforme unbegrenzte Haftung.",
        },
        "§ 8": {
          title:
            "Pflichtversicherung — 60 Mio. EUR mit risikobasierten Befreiungen",
          summary:
            "Mindestens 60 Mio. EUR Haftpflichtversicherung. TEM kann befreien wenn: Startversicherung ≥60 Mio. EUR deckt, ODER Risikobewertung Schwellenwerte des Erlasses 74/2018 erfüllt.",
          complianceImplication:
            "Risikobasierte Befreiung besonders vorteilhaft für Kleinsatellitenbetreiber.",
        },
        "§ 10": {
          title: "Umweltschutz und Weltraummüll",
          summary:
            "‚Allgemein anerkannte internationale Leitlinien' (IADC/UN COPUOS) für Trümmervermeidung. Prinzipienbasierter, technologieneutraler Ansatz.",
        },
      },
    },
  ],
  [
    "FI-SPACE-DECREE-2018",
    {
      title: "Weltraumverordnung (TEM-Erlass 74/2018)",
      provisions: {
        "§ 1": {
          title: "Antragsfristen",
          summary:
            "Mindestens 6 Monate vor Start. Mindestens 3 Monate vor Erwerb eines Objekts im Orbit.",
        },
        "§ 5": {
          title: "Risikogrenzen für Versicherungsbefreiung",
          summary:
            "Kollisionswahrscheinlichkeit mit Objekten ≥10 cm. Wiedereintritts-Opfererwartung unter 1/10.000.",
        },
      },
    },
  ],
  [
    "FI-GROUND-STATIONS-2023",
    {
      title: "Gesetz über Bodenstationen und bestimmte Radaranlagen",
      provisions: {
        "Full instrument": {
          title: "Bodenstations-Lizenzregime",
          summary:
            "Separate Lizenzierung für Erdstationen. Traficom als Behörde — Vorschau auf geplante Lizenztransfer. Sodankylä hat 10+ Anträge erhalten.",
        },
      },
    },
  ],
  [
    "FI-ECOMM-2014",
    {
      title: "Gesetz über elektronische Kommunikationsdienste",
      provisions: {
        "Full instrument": {
          title: "Satellitenspektrumverwaltung und Galileo PRS",
          summary:
            "Sendende Erdstationen erfordern Traficom-Funklizenzen. ITU-Koordination. Änderung 1211/2022: Personalüberprüfungen für Galileo-PRS-Anbieter.",
        },
      },
    },
  ],
  [
    "FI-EXPORT-CONTROL-2024",
    {
      title: "Gesetz über die Exportkontrolle von Dual-Use-Gütern",
      provisions: {
        "Full instrument": {
          title: "Moderne Dual-Use-Exportkontrolle mit nationaler Liste",
          summary:
            "Nationale Kontrollliste (Quantencomputing, Halbleiter). SAR-Technologie (ICEYEs Kern) unter Wassenaar Kategorie 6. ICEYEs ITAR-freie Architektur: Exporte unter finnischer/EU-Kontrolle, nicht US-ITAR.",
          complianceImplication:
            "USA setzten Finnland auf IEC-Zielliste (17. September 2024), da finnische Kontrollen US-Beschränkungen entsprechen.",
        },
      },
    },
  ],
  [
    "FI-CYBERSECURITY-2025",
    {
      title: "Cybersicherheitsgesetz (NIS2-Umsetzung)",
      provisions: {
        "Full instrument": {
          title: "NIS2-Umsetzung — Weltraum als hochkritischer Sektor",
          summary:
            "Traficom NCSC-FI als Aufsichtsbehörde. 13 Cybersicherheitsanforderungen. Vorfallmeldung: 24h, 72h, 30 Tage. Weltraumbetreiber (ICEYE, Bodenstationen) im Anwendungsbereich.",
        },
      },
    },
  ],
  [
    "FI-DPA-2018",
    {
      title: "Datenschutzgesetz (DSGVO-Ergänzung)",
      provisions: {
        "Full instrument": {
          title: "Nationale DSGVO-Ergänzung",
          summary:
            "Datenschutzbeauftragter als Aufsicht. ICEYE (Sitz Espoo) als finnischer Verantwortlicher direkt DSGVO-pflichtig. 16 cm SAR-Auflösung wirft Fragen zur kontextuellen Identifizierung auf.",
        },
      },
    },
  ],
  [
    "FI-SPACE-STRATEGY-2030",
    {
      title: "Weltraumstrategie 2030 (Dezember 2024)",
      provisions: {
        "Full document": {
          title: "Dritte nationale Weltraumstrategie — Sicherheitswende",
          summary:
            "Vier Ziele: Nutzung von Weltraumdiensten, Verbesserung des Betriebsumfelds, Stärkung der Funktionsfähigkeit, internationale Zusammenarbeit. Bedeutende Wende Richtung Sicherheit/Verteidigung. ESA-Beitrag ~28 Mio. EUR jährlich.",
          complianceImplication:
            "NATO-Beitritt (April 2023) katalysierte militärische Weltraumentwicklung. 200+ Unternehmen.",
        },
      },
    },
  ],

  // DENMARK (DK) — 12 Sources
  [
    "DK-OST-1967",
    {
      title: "Weltraumvertrag — Dänischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Dänemark ist für das GESAMTE Königreich verantwortlich (einschließlich Grönland/Färöer) — doch das Gesetz von 2016 schließt Grönland/Färöer explizit aus (§23).",
          complianceImplication:
            "Pituffik Space Base operiert unter dem Verteidigungsabkommen von 1951, nicht unter dänischem Weltraumrecht.",
        },
      },
    },
  ],
  [
    "DK-LIABILITY-CONV",
    {
      title: "Weltraumhaftungsübereinkommen — Dänischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung",
          summary:
            "§11 des Gesetzes setzt beide Ebenen um. Keine feste Versicherungssumme — Minister setzt Anforderungen nach Risikoprofil.",
        },
      },
    },
  ],
  [
    "DK-REGISTRATION-CONV",
    {
      title: "Registrierungsübereinkommen — Dänischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Umgesetzt durch §10 des Gesetzes von 2016. UFST führt das Register.",
        },
      },
    },
  ],
  [
    "DK-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Dänemark als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary: "48. Unterzeichner, 13. November 2024 in Kopenhagen.",
        },
      },
    },
  ],
  [
    "DK-SPACE-ACT-2016",
    {
      title: "Weltraumgesetz (Lov om aktiviteter i det ydre rum)",
      scopeDescription:
        "10 Kapitel, 23 Paragraphen. 100 km Kármán-Linie. Schließt Grönland und Färöer EXPLIZIT AUS (§23). 25-Jahre-Deorbit-Regel im Durchführungserlass.",
      provisions: {
        "§ 4": {
          title: "100 km Kármán-Linie",
          summary:
            "Weltraum definiert als Bereich über 100 km. Selten in nationalen Gesetzen kodifiziert.",
        },
        "§§ 11-14": {
          title: "Haftung und Versicherung — ministerielles Ermessen",
          summary:
            "Strikte Haftung für Bodenschäden. Keine feste Versicherungssumme — Minister setzt Anforderungen. Befreiung möglich (BEK 552 §3). Kein Staats-Backstop.",
        },
        "§ 23": {
          title: "SCHLIESST Grönland und Färöer AUS",
          summary:
            "Das Gesetz gilt NICHT für Grönland oder die Färöer. Kann per Königlichem Erlass ausgedehnt werden — aber KEIN solcher Erlass wurde erlassen.",
          complianceImplication:
            "Bedeutendste Regulierungslücke im dänischen Weltraumrecht.",
        },
      },
    },
  ],
  [
    "DK-SPACE-EXEC-ORDER-2016",
    {
      title: "Durchführungserlass für Weltraumgenehmigungen",
      provisions: {
        "§ 3": {
          title: "Versicherungsbefreiung/-reduzierung",
          summary:
            "Betreiber können Befreiung von Versicherungspflichten beantragen.",
        },
        "§ 6": {
          title: "25-Jahre-Deorbit-Regel",
          summary:
            "Weltraumobjekte müssen innerhalb von 25 Jahren nach Betriebsende sicher die Umlaufbahn verlassen.",
        },
      },
    },
  ],
  [
    "DK-DEFENCE-GREENLAND-1951",
    {
      title: "Verteidigungsabkommen für Grönland (1951) — Pituffik Space Base",
      provisions: {
        "Full instrument": {
          title: "US-Militärweltraumoperationen bei Pituffik",
          summary:
            "Grundlegendes Abkommen für Pituffik Space Base (76°31'N). UEWR-Raketenwarnung, Satellitentracking (22.000+ Kontakte/Jahr). Kein Ablaufdatum. Operiert VOLLSTÄNDIG außerhalb dänischen Weltraumrechts.",
        },
      },
    },
  ],
  [
    "DK-IGALIKU-2004",
    {
      title: "Igaliku-Abkommen (2004) — Änderung des Verteidigungsabkommens",
      provisions: {
        "Full instrument": {
          title: "UEWR-Genehmigung und Grönland-Anerkennung",
          summary:
            "Trilaterales Instrument (USA-Dänemark-Grönland). Genehmigte UEWR-Radar-Upgrade. Erste trilaterale Anerkennung von Grönlands konsultativer Rolle.",
        },
      },
    },
  ],
  [
    "DK-EXPORT-CONTROL",
    {
      title: "Dual-Use-Exportkontrolle — Dänische Ermächtigungsgesetzgebung",
      provisions: {
        "Full instrument": {
          title: "Exportkontrolle für Weltraumtechnologie",
          summary:
            "Konsolidierungsgesetz 635/2011, geändert 2305/2021. Erhvervsstyrelsen verwaltet Lizenzen. FDI-Prüfung seit 1. Juli 2021.",
        },
      },
    },
  ],
  [
    "DK-NIS2-2025",
    {
      title: "Dänisches NIS2-Gesetz (Cybersicherheit)",
      provisions: {
        "Full instrument": {
          title: "NIS2-Umsetzung — Weltraum als hochkritischer Sektor",
          summary:
            "Erweitert Abdeckung von ~1.000 auf 6.000+ Einrichtungen. \u2018Kein Goldplating\u2019-Ansatz. In Kraft 1. Juli 2025.",
        },
      },
    },
  ],
  [
    "DK-SPACE-STRATEGY-2025",
    {
      title: "Strategie für Weltraumforschung und -innovation 2025-2035",
      provisions: {
        "Full document": {
          title: "Verdopplung der ESA-Beiträge",
          summary:
            "DKK 280 Mio. auf DKK 580 Mio. bis 2035. Bis zu 4 nationale Missionen. ~100 neue Start-ups.",
        },
      },
    },
  ],
  [
    "DK-GREENLAND-SELF-GOVT-2009",
    {
      title: "Grönländisches Selbstverwaltungsgesetz",
      provisions: {
        "Full instrument": {
          title: "Grönlands autonomer Status und Weltraumimplikationen",
          summary:
            "Verteidigung und Außenpolitik verbleiben bei Dänemark. Dänemark trägt Weltraumvertragsverantwortung für das gesamte Königreich — aber Weltraumgesetz schließt Grönland aus.",
        },
      },
    },
  ],

  // AUSTRIA (AT) — 12 Sources
  [
    "AT-OST-1967",
    {
      title: "Weltraumvertrag — Österreichischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Österreich setzt Art. VI mit einem 8-Bedingungen-Genehmigungsregime, 60-Mio.-EUR-Pflichtversicherung und Zwangsübertragungsmechanismus um.",
        },
      },
    },
  ],
  [
    "AT-LIABILITY-1980",
    {
      title:
        "Weltraumhaftungsübereinkommen — Österreichischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung",
          summary:
            "Weltraumgesetz § 11: Rückgriff gedeckelt auf Versicherungssumme (min. 60 Mio. EUR). Obergrenze entfällt bei Verschulden oder Genehmigungsverstoß. Kein Staats-Backstop.",
        },
      },
    },
  ],
  [
    "AT-REGISTRATION-1980",
    {
      title:
        "Registrierungsübereinkommen — Österreichischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Nationale Registerpflicht",
          summary:
            "Umgesetzt durch §§ 9-10 Weltraumgesetz. Register übertrifft Konventionsminimum um 3 Datenpunkte. TUGSAT-1, UniBRITE, PEGASUS, OPS-SAT, PRETTY registriert.",
        },
      },
    },
  ],
  [
    "AT-MOON-1984",
    {
      title: "Mondvertrag — Österreichischer Ratifizierungsvermerk",
      provisions: {
        "Art. 11": {
          title: "Gemeinsames Erbe der Menschheit",
          summary:
            "Österreichs Ratifizierung 1984 war die FÜNFTE — löste direkt das Inkrafttreten des Mondvertrags aus. Eines von weniger als 20 Vertragsparteien.",
          complianceImplication:
            "Österreich unterzeichnete Artemis Accords (Dezember 2024) trotz Mondvertragspartei — neben Belgien und den Niederlanden.",
        },
      },
    },
  ],
  [
    "AT-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Österreich als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "50. Unterzeichner, 11. Dezember 2024 bei NASA HQ. Doppelposition: Mondvertrag + Artemis Accords.",
        },
      },
    },
  ],
  [
    "AT-WELTRAUMGESETZ-2011",
    {
      title:
        "Weltraumgesetz (Bundesgesetz über die Genehmigung von Weltraumaktivitäten)",
      scopeDescription:
        "Eines der vollständigsten europäischen Weltraumgesetze. 18 Paragraphen. Einstimmig beschlossen. 60-Mio.-EUR-Versicherung mit akademischer Befreiung, 8 kumulative Genehmigungsbedingungen, Zwangsübertragungsmechanismus (§ 7(3)), Register über Konventionsminimum hinaus.",
      provisions: {
        "§ 4": {
          title: "Acht kumulative Genehmigungsbedingungen",
          summary:
            "Zuverlässigkeit, kein Sicherheitsrisiko, internationale Konformität, Weltraummüll, Umwelt, ITU, 60-Mio.-EUR-Versicherung, geordnete Beendigung. Entscheidung innerhalb 6 Monaten.",
          complianceImplication:
            "Eines der detailliertesten gesetzlichen Lizenzregime Europas.",
        },
        "§ 4(4)": {
          title: "60-Mio.-EUR-Pflichtversicherung pro Schadenfall",
          summary:
            "Mindestens 60 Mio. EUR pro Versicherungsfall. Nachlaufhaftung nicht ausschließbar. Für Wissenschaft/Forschung/Bildung: Reduzierung oder Befreiung möglich.",
        },
        "§ 7(3)": {
          title: "Zwangsübertragung der Kontrolle",
          summary:
            "Bei Nichteinhaltung der Widerrufsentscheidung SOLL die Kontrolle per Verwaltungsbescheid auf einen anderen Betreiber übertragen werden. Einzigartig in europäischem Weltraumrecht.",
        },
        "§ 11": {
          title: "Rückgriff — 60-Mio.-Obergrenze mit Verschuldensaufhebung",
          summary:
            "Gedeckelt auf Versicherungssumme für Oberflächen-/Flugzeugschäden. Obergrenze entfällt bei Verschulden oder Verstoß gegen §§ 3/4. Kein staatlicher Rückhalt.",
        },
      },
    },
  ],
  [
    "AT-WELTRAUMVERORDNUNG-2015",
    {
      title: "Weltraumverordnung (Durchführungsverordnung)",
      provisions: {
        "Full instrument": {
          title: "Detaillierte Antrags- und Weltraummüllanforderungen",
          summary:
            "Operationalisiert das Weltraumgesetz: 4 IADC-Weltraummüllkategorien, Sicherheitsprüfungen, Versicherungsnachweise, Notfallpläne. Verfahrensgebühr: 6.500 EUR.",
        },
      },
    },
  ],
  [
    "AT-AUSSENWIRTSCHAFTSGESETZ-2011",
    {
      title: "Außenwirtschaftsgesetz 2011",
      provisions: {
        "Full instrument": {
          title: "Nationale Dual-Use-Exportkontrolle",
          summary:
            "Ergänzt EU-Verordnung 2021/821. Lizenzen über PAWA-Portal. Österreich Mitglied aller 5 Exportkontrollregime. MTCR-Vorsitz 2020-2021.",
        },
      },
    },
  ],
  [
    "AT-TKG-2021",
    {
      title: "Telekommunikationsgesetz 2021",
      provisions: {
        "§ 4 / §§ 10-19": {
          title: "Satellitenspektrumverwaltung",
          summary:
            "Satellitennetze explizit einbezogen. Betreiber benötigen SOWOHL Weltraumgesetz-Genehmigung ALS AUCH TKG-Frequenzzuweisungen.",
        },
      },
    },
  ],
  [
    "AT-NISG-2026",
    {
      title:
        "NISG 2026 — Netz- und Informationssystemsicherheitsgesetz (NIS2-Umsetzung)",
      provisions: {
        "Full bill": {
          title: "NIS2-Umsetzung — Weltraum als kritischer Sektor",
          summary:
            "Nationalrat lehnte NISG 2024 am 3. Juli 2024 ab. NISG 2026 als Gesetzentwurf 308 d.B. eingebracht. Strafen bis 10 Mio. EUR oder 2% des weltweiten Umsatzes.",
          complianceImplication:
            "NISG 2018 gilt als Übergangslösung bis Verabschiedung.",
        },
      },
    },
  ],
  [
    "AT-DSG",
    {
      title: "Datenschutzgesetz",
      provisions: {
        "§ 1": {
          title:
            "Verfassungsrechtlicher Datenschutz — gilt auch für juristische Personen",
          summary:
            "§ 1 DSG hat VERFASSUNGSRANG und erstreckt Datenschutz auf juristische Personen — stärker als die meisten EU-Mitgliedstaaten.",
        },
      },
    },
  ],
  [
    "AT-SPACE-STRATEGY-2030",
    {
      title:
        "Österreichische Weltraumstrategie 2030+ — Menschen, Klima und Wirtschaft",
      provisions: {
        "Full document": {
          title: "Space is for EVERYONE",
          summary:
            "CM25-Verpflichtung: 336 Mio. EUR (48% Steigerung über CM22). ~70 Mio. EUR jährlicher ESA-Beitrag, ~90% Georeturn. Ergänzt durch Militärische Weltraumstrategie 2035+.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // SWITZERLAND (CH) — 10 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "CH-OST-1967",
    {
      title: "Weltraumvertrag — Schweizerische Ratifizierung",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Unter dem monistischen System direkt anwendbar — aber kein nationales Umsetzungsgesetz bis zum Raumfahrtgesetz (~2028).",
        },
      },
    },
  ],
  [
    "CH-LIABILITY-CONV",
    {
      title: "Weltraumhaftungsübereinkommen — Schweizerische Ratifizierung",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung",
          summary:
            "Derzeit KEIN nationales Umsetzungsgesetz. Allgemeines Haftpflichtrecht (OR) gilt. Raumfahrtgesetz sieht DIREKTE Betreiberhaftung vor (nicht Staat-dann-Rückgriff).",
        },
      },
    },
  ],
  [
    "CH-REGISTRATION-CONV",
    {
      title: "Registrierungsübereinkommen — Schweizerische Ratifizierung",
      provisions: {
        "Art. II": {
          title: "Registerpflicht",
          summary:
            "Ratifiziert ~1978 — aber KEIN nationales Register existiert. Raumfahrtgesetz wird erstmals eines einrichten.",
        },
      },
    },
  ],
  [
    "CH-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Schweiz als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "37. Unterzeichner, 15. April 2024. Bundesrat Parmelin unterzeichnete. Mondvertrag NICHT ratifiziert.",
        },
      },
    },
  ],
  [
    "CH-NARV",
    {
      title:
        "Verordnung über die Förderung nationaler Aktivitäten im Bereich Raumfahrt (NARV)",
      provisions: {
        "Full instrument": {
          title: "Forschungsförderung — KEIN Regulierungsrahmen",
          summary:
            "Ermöglicht ESA-Beteiligung und Forschungsförderung. Deckt NICHT ab: Genehmigung, Haftung, Versicherung, Register, Aufsicht. 'Weltraumverordnung SR 700.1' existiert NICHT — SR 700.1 ist Raumplanung.",
        },
      },
    },
  ],
  [
    "CH-RAUMFAHRTGESETZ-DRAFT",
    {
      title: "Raumfahrtgesetz — Bundesgesetz über die Raumfahrt (Entwurf)",
      scopeDescription:
        "Botschaft 25. Februar 2026, vor dem Parlament. Inkrafttreten frühestens 2028. DIREKTE Betreiberhaftung (nicht Staat-dann-Rückgriff). Risikobasierte Versicherung. Nationales Register. Weltraummüllvorschriften.",
      provisions: {
        "Art. 23-25": {
          title: "Direkte Betreiberhaftung",
          summary:
            "Betreiber (nicht der Staat) haftet direkt gegenüber Geschädigten. Strikte Haftung für Oberflächenschäden, verschuldensabhängig für Weltraumschäden. Einzigartig in Europa.",
          complianceImplication:
            "Anders als FR/AT/BE — kein Staatsrückgriff, sondern direkte Betreiberhaftung.",
        },
        "Art. 9(1)(j) / Art. 26": {
          title: "Risikobasierte Versicherung",
          summary:
            "KEINE allgemeine Versicherungspflicht. Behörde KANN Versicherung verlangen bei erhöhtem Risiko. Flexibler als AT/FR/FI (60 Mio. EUR Mindest).",
        },
      },
    },
  ],
  [
    "CH-FMG",
    {
      title: "Fernmeldegesetz",
      provisions: {
        "Full instrument": {
          title: "Satellitenspektrumverwaltung via BAKOM",
          summary:
            "Funkspektrum bis 3.000 GHz erfordert Lizenz. BAKOM verwaltet Satellitenfrequenzen und vertritt die Schweiz beim ITU.",
        },
      },
    },
  ],
  [
    "CH-GKG",
    {
      title: "Güterkontrollgesetz",
      provisions: {
        "Art. 1 / Art. 6 / Art. 14": {
          title: "Dual-Use- und strategische Güterexportkontrolle",
          summary:
            "Kontrolle von Dual-Use-, Militär- und strategischen Gütern. Strafen bis 10 Jahre Haft. Kategorien 7 und 9 für Weltraumtechnologie. Schweiz Mitglied aller 4 Exportkontrollregime.",
          complianceImplication:
            "MTCR-Plenum 2022 in Montreux. HCoC-Vorsitz 2020. ~1.744 Dual-Use-Genehmigungen/Jahr.",
        },
      },
    },
  ],
  [
    "CH-DSG",
    {
      title: "Datenschutzgesetz",
      provisions: {
        "Full instrument": {
          title: "Neues Datenschutzgesetz (seit 1. September 2023)",
          summary:
            "Ersetzt das Gesetz von 1992. EDÖB als Aufsichtsbehörde. Weder das Gesetz noch der Raumfahrtgesetz-Entwurf regeln Weltraumdaten-Governance.",
        },
      },
    },
  ],
  [
    "CH-SPACE-POLICY-2023",
    {
      title: "Weltraumpolitik 2023",
      provisions: {
        "Full document": {
          title: "Drei strategische Prioritäten",
          summary:
            "Zugang und Resilienz, Wettbewerbsfähigkeit und Relevanz, Partnerschaft und Verlässlichkeit. CM25: 781 Mio. EUR. CHF 1.666,3 Mio. für 2025-2028.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // PORTUGAL (PT) — 10 Sources
  // ═══════════════════════════════════════════════════════════════════

  [
    "PT-OST-1967",
    {
      title: "Weltraumvertrag — Portugiesischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Legislativ 1971 genehmigt, aber Hinterlegung erst 1996 — 25-jährige Lücke wegen Nelkenrevolution 1974. Weltraumgesetz 2019 setzt Art. VI vollständig um.",
        },
      },
    },
  ],
  [
    "PT-LIABILITY-2019",
    {
      title: "Weltraumhaftungsübereinkommen — Portugiesischer Beitrittsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung",
          summary:
            "Bemerkenswert spät: 47 JAHRE nach Verabschiedung beigetreten (2019). Massengestaffelte Versicherung: 2 Mio. EUR (≤50 kg), 60 Mio. EUR (>500 kg). Staatsrückgriff max. 50 Mio. EUR.",
        },
      },
    },
  ],
  [
    "PT-REGISTRATION-2018",
    {
      title: "Registrierungsübereinkommen — Portugiesischer Beitrittsvermerk",
      provisions: {
        "Art. II": {
          title: "Registerpflicht",
          summary:
            "Beitritt Oktober 2018. ANACOM führt Register. Registrierung innerhalb 2 Tagen nach Start. Erste Objekte UN-registriert: November 2025.",
        },
      },
    },
  ],
  [
    "PT-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Portugal als Unterzeichner (2026)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "60. Unterzeichner, 11. Januar 2026 in Lissabon. Mondvertrag NICHT ratifiziert.",
        },
      },
    },
  ],
  [
    "PT-SPACE-ACT-2019",
    {
      title: "Weltraumgesetz (Decreto-Lei n.º 16/2019)",
      scopeDescription:
        "Umfassendes Weltraumgesetz. Drei Lizenztypen (seit 2024). Massengestaffelte Versicherung. ANACOM als Doppelrolle: Telekommunikationsregulator + Weltraumbehörde. Erste Lizenzen 2024. Weltraumhafen Santa Maria lizenziert August 2025.",
      provisions: {
        Licensing: {
          title: "Drei Lizenztypen (seit 2024-Änderung)",
          summary:
            "Einzellizenzen, Globallizenzen, Gemeinschaftslizenzen. Portal do Espaço. Entscheidung 90 Tage. Weltraumhafen-Lizenzen: 240 Tage, bis 15 Jahre (verlängerbar).",
          complianceImplication:
            "Erste Lizenzen 2024 erteilt. Erste Weltraumhafen-Lizenz: August 2025 (Santa Maria, Azoren).",
        },
        "Art. 18-19": {
          title: "Doppeltes Haftungsregime",
          summary:
            "Strikte Haftung für Oberflächen-/Flugzeugschäden. Verschuldenshaftung für andere Schäden. Staatsrückgriff max. 50 Mio. EUR.",
        },
      },
    },
  ],
  [
    "PT-SPACE-REGULATION-2019",
    {
      title: "Weltraumverordnung (ANACOM-Regulamento 697/2019)",
      provisions: {
        "Full instrument": {
          title: "Detaillierte Lizenz- und Registrierungsverfahren",
          summary:
            "Verfahren für alle Lizenztypen, Vorqualifizierung, Registrierung, Eigentumsübertragung. 2024-Änderung: Weltraumhafen-Lizenzverfahren.",
        },
      },
    },
  ],
  [
    "PT-INSURANCE-2023",
    {
      title: "Weltraumversicherungs-Verordnung (Portaria 279/2023)",
      provisions: {
        "Full instrument": {
          title: "Massengestaffelte Pflichtversicherung",
          summary:
            "≤50 kg: 2 Mio. EUR; 50-500 kg: gestaffelter Betrag; >500 kg: 60 Mio. EUR. Staatsrückgriff max. 50 Mio. EUR. Befreiung für kleine Satelliten, Wissenschaft und reduziertes Risiko möglich.",
          complianceImplication:
            "Massenstaffelung: einzigartig in Europa. 2-Mio.-EUR-Untergrenze besonders NewSpace-freundlich.",
        },
      },
    },
  ],
  [
    "PT-ECOMM-2022",
    {
      title: "Gesetz über elektronische Kommunikation",
      provisions: {
        "Full instrument": {
          title: "Satellitenspektrum und ANACOMs Doppelmandat",
          summary:
            "Umsetzt EU-Kommunikationskodex. ANACOMs Doppelrolle als Telekommunikationsregulator UND Weltraumbehörde ist einzigartig in Europa.",
        },
      },
    },
  ],
  [
    "PT-NIS2-2025",
    {
      title: "Rechtliches Regime für Cybersicherheit (NIS2-Umsetzung)",
      provisions: {
        "Full instrument": {
          title: "NIS2-Umsetzung",
          summary:
            "CNCS als zuständige Behörde. In Kraft 3. April 2026. Strafen bis 10 Mio. EUR oder 2% des weltweiten Umsatzes.",
        },
      },
    },
  ],
  [
    "PT-SPACE-STRATEGY-2030",
    {
      title: "Strategie Portugal Espaço 2030",
      provisions: {
        "Full document": {
          title: "Atlantische Weltraumnation",
          summary:
            "Ziel: 500 Mio. EUR Jahresumsatz, ~1.000 Fachkräfte bis 2030. CM25: 204,8 Mio. EUR (Rekord, 51% Steigerung). ESA-Rendite >2,17 EUR pro investiertem Euro.",
        },
      },
    },
  ],

  // IRELAND (IE) — 6 Sources
  [
    "IE-OST-1967",
    {
      title:
        "Weltraumvertrag — Irischer Ratifizierungsvermerk (Dáil-Genehmigung 2022)",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit — keine nationale Umsetzung",
          summary:
            "Unterzeichnet 1967, aber verfassungsrechtlich erforderliche Dáil-Genehmigung erst 12. Juli 2022 (55 Jahre spät) — Notdebatte wegen EIRSAT-1. Irland hat KEIN Genehmigungsregime zur Umsetzung von Art. VI.",
          complianceImplication:
            "EIRSAT-1 wurde durch Ad-hoc-Kabinettsentscheidung genehmigt. Kein dauerhaftes Verfahren für künftige Missionen.",
        },
      },
    },
  ],
  [
    "IE-LIABILITY-1972",
    {
      title:
        "Weltraumhaftungsübereinkommen — Irischer Ratifizierungsvermerk (Dáil-Genehmigung 2022)",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein nationales Rahmenwerk",
          summary:
            "KEIN Weltraumhaftungsgesetz, KEINE Pflichtversicherung, KEIN Entschädigungsmechanismus. Unter Irlands dualistischem System ist das Übereinkommen NICHT direkt vor irischen Gerichten durchsetzbar ohne Umsetzungsgesetz (existiert nicht).",
        },
      },
    },
  ],
  [
    "IE-WIRELESS-TELEGRAPHY-1926",
    {
      title:
        "Gesetz über drahtlose Telegrafie 1926 — Satelliten-Erdstationslizenzen",
      provisions: {
        "Full instrument + S.I. No. 96/2024": {
          title: "Grundlage ALLER Satellitenlizenzen in Irland",
          summary:
            "Ein 100 Jahre altes Drahtlos-Gesetz = Irlands EINZIGE gesetzliche Grundlage für die Regulierung jeglicher Satellitenoperationen.",
        },
      },
    },
  ],
  [
    "IE-EXPORT-CONTROL-2023",
    {
      title: "Exportkontrollgesetz 2023",
      provisions: {
        "Full instrument": {
          title: "Irlands stärkstes Weltraum-Regulierungsinstrument",
          summary:
            "Umsetzt EU-Dual-Use-Verordnung. Strafen: 10 Mio. EUR oder 3× Warenwert und bis 5 Jahre Haft. Irland führte Wassenaar-Plenum 2022. Mitglied aller großen Exportkontrollregime.",
          complianceImplication:
            "Exportkontrolle ist Irlands ENTWICKELTESTES Weltraum-Regulierungsinstrument.",
        },
      },
    },
  ],
  [
    "IE-ESA-PRIVILEGES-1976",
    {
      title: "ESA-Vorrechte und Immunitäten (Irland) 1976",
      provisions: {
        "Full instrument": {
          title: "ESA-Privilegien im irischen Recht",
          summary:
            "Irland unterzeichnete die ESA-Konvention am LETZTEN möglichen Tag (31. Dezember 1975). ESA-Gründungsmitglied.",
        },
      },
    },
  ],
  [
    "IE-SPACE-STRATEGY-2019",
    {
      title: "Nationale Weltraumstrategie für Unternehmen 2019-2025",
      provisions: {
        "Full document": {
          title: "Nur Unternehmensstrategie — kein Regulierungsrahmen",
          summary:
            "Irlands einzige Weltraumstrategie. Ausschließlich unternehmensorientiert — behandelt NICHT Lizenzierung, Haftung, Weltraummüll oder Weltraumbehörde. CM25: 170 Mio. EUR. 116 ESA-aktive Unternehmen. Regierung verlässt sich auf EU Space Act (2030) als Lösung.",
          complianceImplication:
            "Kein nationales Weltraumgesetz geplant. EU Space Act = voraussichtlich Irlands erstes umfassendes Rahmenwerk.",
        },
      },
    },
  ],

  // GREECE (GR) — 9 Sources
  [
    "GR-OST-1967",
    {
      title: "Weltraumvertrag — Griechischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Gesetz 4508/2017 setzt Art. VI umfassend um: Lizenzierung, Register, Umweltverträglichkeitsprüfung, Sanktionen. Unterzeichnet am Eröffnungstag (27. Januar 1967).",
        },
      },
    },
  ],
  [
    "GR-LIABILITY-1977",
    {
      title:
        "Weltraumhaftungsübereinkommen — Griechischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung",
          summary:
            "Art. 11 des Gesetzes 4508/2017 regelt internationale Haftung. Keine feste Mindestversicherung — einzelfallbezogen in Lizenzbedingungen.",
        },
      },
    },
  ],
  [
    "GR-REGISTRATION-2003",
    {
      title: "Registrierungsübereinkommen — Griechischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Registerpflicht",
          summary:
            "Spät ratifiziert (2003, 28 Jahre nach Verabschiedung). Art. 17: Nationales Register der Weltraumgegenstände. 9 griechische Satelliten im Orbit (Ende 2025).",
        },
      },
    },
  ],
  [
    "GR-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Griechenland als Unterzeichner (2024)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "35. Unterzeichner, 9. Februar 2024. Griechenland und Belgien schlugen gemeinsam die COPUOS-Arbeitsgruppe für Weltraumressourcen vor (2019).",
        },
      },
    },
  ],
  [
    "GR-SPACE-ACT-2017",
    {
      title:
        "Gesetz 4508/2017 — Lizenzierung von Weltraumaktivitäten und Nationalregister",
      scopeDescription:
        "Eines der umfassenderen europäischen Weltraumgesetze. Drei Kapitel. Geändert durch Gesetze 4712/2020 und 5099/2024. Verteidigungsweltraum unter MOD-Autonomie ausgeklammert.",
      provisions: {
        "Art. 3": {
          title: "Obligatorische Vorlizenzierung",
          summary:
            "Alle Weltraumtätigkeiten erfordern vorherige Lizenz. Gilt für griechisches Hoheitsgebiet, griechische Einrichtungen im Ausland, griechische Staatsangehörige.",
        },
        "Art. 6": {
          title: "Umweltverträglichkeitsprüfung",
          summary:
            "Obligatorische UVP vor jeder lizenzierten Weltraumtätigkeit. Relativ ungewöhnlich in europäischen Weltraumgesetzen.",
        },
        "Art. 17": {
          title: "Nationales Register der Weltraumgegenstände",
          summary:
            "Εθνικό Μητρώο mit eindeutigen nationalen Registrierungsnummern.",
        },
      },
    },
  ],
  [
    "GR-HSC-LAW-2019",
    {
      title:
        "Gesetz 4623/2019, Art. 60-61 — Gründung des Hellenischen Raumfahrtzentrums",
      provisions: {
        "Art. 60": {
          title: "HSC-Gründung und Mandat",
          summary:
            "ΕΛΚΕΔ als ΝΠΙΔ unter Ministerium für Digitale Governance. 9-faches Mandat. Art. 60(10): MOD behält VOLLE Autonomie über Verteidigungsweltraumprogramme.",
          complianceImplication:
            "Verteidigungsweltraum explizit ausgeklammert — dualer Regulierungspfad.",
        },
      },
    },
  ],
  [
    "GR-ECOMM-2020",
    {
      title: "Gesetz 4727/2020 — Kodex für elektronische Kommunikation",
      provisions: {
        "Art. 109 / Art. 119": {
          title: "Satellitenspektrum und Orbitalverwaltung",
          summary:
            "Satellitennetze in Definition elektronischer Kommunikation einbezogen. Art. 119: Verwaltung von Satellitenbahnen und zugehörigen Frequenzen.",
        },
      },
    },
  ],
  [
    "GR-NIS2-2024",
    {
      title: "Gesetz 5160/2024 — NIS2-Umsetzung",
      provisions: {
        "Full instrument": {
          title: "NIS2-Umsetzung — nur einen Monat verspätet",
          summary:
            "Griechenland transponierte NIS2 nur einen Monat nach EU-Frist — unter den schnellsten in der EU. Weltraum als kritischer Sektor. Drei Durchführungs-JMDs (2025).",
        },
      },
    },
  ],
  [
    "GR-SATELLITE-PROGRAMME",
    {
      title: "Griechisches Nationales Kleinsatellitenprogramm (200 Mio. EUR)",
      provisions: {
        "Full programme": {
          title: "200 Mio. EUR aus EU-Aufbau- und Resilienzfazilität",
          summary:
            "13 Betriebssatelliten in 4 Instrumentenkategorien. 9 im Orbit Ende 2025. ~60 Unternehmen, 500 Mio. EUR Umsatz 2024 (verdoppelt seit 2020).",
        },
      },
    },
  ],

  // CZECH REPUBLIC (CZ) — 10 Sources
  [
    "CZ-OST-1967",
    {
      title:
        "Weltraumvertrag — Tschechische Republik (Tschechoslowakische Sukzession)",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit — keine nationale Umsetzung",
          summary:
            "Ererbt via tschechoslowakische Sukzession (1. Januar 1993). KEIN nationales Genehmigungsregime — ‚právní vakuum' (Rechtsvakuum). Arbeit an einem Weltraumgesetz seit 2018, auf unbestimmte Zeit blockiert.",
          complianceImplication:
            "Die Tschechische Republik kann Art. VI (Genehmigung und Aufsicht) derzeit NICHT erfüllen.",
        },
      },
    },
  ],
  [
    "CZ-LIABILITY-1977",
    {
      title: "Weltraumhaftungsübereinkommen — Tschechische Sukzession",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein nationales Rahmenwerk",
          summary:
            "KEIN Weltraumhaftungsgesetz. Bürgerliches Gesetzbuch §2925 (strikte Haftung für besonders gefährliche Betriebe) gilt analog. KEINE Pflichtversicherung, KEINE Rückgriffsobergrenze.",
        },
      },
    },
  ],
  [
    "CZ-REGISTRATION-1978",
    {
      title: "Registrierungsübereinkommen — Tschechische Sukzession",
      provisions: {
        "Art. II": {
          title: "Register per Regierungsbeschluss, nicht per Gesetz",
          summary:
            "Nationales Register durch Regierungsbeschluss 326/2014. 13+ Objekte registriert. Keine gesetzlichen Strafen für Nichtregistrierung.",
        },
      },
    },
  ],
  [
    "CZ-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Tschechische Republik (2023)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "24. Unterzeichner, 3. Mai 2023. Außenminister Lipavský unterzeichnete bei NASA HQ.",
        },
      },
    },
  ],
  [
    "CZ-GOV-RES-282-2011",
    {
      title:
        "Regierungsbeschluss Nr. 282/2011 — Koordination der Weltraumaktivitäten",
      provisions: {
        "Full instrument": {
          title: "Verkehrsministerium als Weltraumkoordinator",
          summary:
            "WICHTIGSTES Verwaltungsinstrument — aber kein Gesetz. Kann keine Lizenzen, Versicherungspflichten oder Strafen schaffen. Verfassungsrechtliches Legalitätsprinzip (Art. 2(3)) erfordert gesetzliche Grundlage.",
        },
      },
    },
  ],
  [
    "CZ-GOV-RES-326-2014",
    {
      title: "Regierungsbeschluss Nr. 326/2014 — Nationales Weltraumregister",
      provisions: {
        "Full instrument": {
          title: "Register per Beschluss, nicht Gesetz",
          summary:
            "13+ Objekte registriert. Register hat 4-mal den Zuständigen gewechselt (1979-2014). Keine Strafen bei Nichtregistrierung.",
        },
      },
    },
  ],
  [
    "CZ-CIVIL-CODE-2012",
    {
      title: "Bürgerliches Gesetzbuch — §2925 Gefährdungshaftung",
      provisions: {
        "§ 2925": {
          title: "Strikte Haftung für besonders gefährliche Betriebe",
          summary:
            "Einzige inländische Haftungsgrundlage für Weltraumoperationen. Keine Versicherungspflicht, keine Rückgriffsobergrenze — unbegrenzte Haftung für private Betreiber.",
        },
      },
    },
  ],
  [
    "CZ-NIS2-2025",
    {
      title: "Cybersicherheitsgesetz (NIS2-Umsetzung)",
      provisions: {
        "Full instrument": {
          title: "NIS2 — Raumtransport als hochkritischer Sektor",
          summary:
            "NÚKIB als Behörde. In Kraft 1. November 2025. Tschechien verfehlte Oktober 2024 Frist.",
        },
      },
    },
  ],
  [
    "CZ-EXPORT-CONTROL-2004",
    {
      title: "Dual-Use-Exportkontrollgesetz",
      provisions: {
        "Full instrument": {
          title: "Exportkontrolle für Weltraumtechnologie",
          summary:
            "Ergänzt EU-Verordnung 2021/821. MPO erteilt Genehmigungen über ELIS-System. Mitglied aller 4 Exportkontrollregime. Wassenaar-Plenum-Vorsitz 2011.",
        },
      },
    },
  ],
  [
    "CZ-NSP-2020-2025",
    {
      title: "Nationaler Kosmischer Plan 2020-2025",
      provisions: {
        "Full document": {
          title: "Dritter Weltraumplan — kein Gesetz erwähnt",
          summary:
            "Fünf Ziele inkl. ‚solider Rechtsrahmen' — aber keine konkrete gesetzgeberische Maßnahme. ~60 Mio. EUR/Jahr ESA-Beitrag. 65+ Unternehmen. Plan Ende 2025 ausgelaufen. EUSPA in Prag. Aleš Svoboda: ESA-Astronautenreserve.",
        },
      },
    },
  ],

  // POLAND (PL) — 10 Sources
  [
    "PL-OST-1967",
    {
      title: "Weltraumvertrag — Polnischer Ratifizierungsvermerk",
      provisions: {
        "Art. VI": {
          title: "Staatenverantwortlichkeit",
          summary:
            "Ratifiziert 30. Januar 1968. Erst 58 Jahre später (2026) erste nationale Umsetzung durch das Weltraumgesetz.",
          complianceImplication:
            "Bis April 2026 hatte Polen KEIN nationales Genehmigungsregime trotz Bindung seit 1968.",
        },
      },
    },
  ],
  [
    "PL-LIABILITY-1973",
    {
      title: "Weltraumhaftungsübereinkommen — Polnischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung",
          summary:
            "Weltraumgesetz 2026: strikte Haftung für Oberflächenschäden (kein höhere Gewalt), verschuldensabhängig im Weltraum. Pflichtversicherung bis 60 Mio. EUR. Staatsrückgriff beschränkt auf Versicherungssumme.",
        },
      },
    },
  ],
  [
    "PL-REGISTRATION-1979",
    {
      title: "Registrierungsübereinkommen — Polnischer Ratifizierungsvermerk",
      provisions: {
        "Art. II": {
          title: "Registerpflicht",
          summary:
            "Krajowy Rejestr Obiektów Kosmicznych (POLSA). Registrierung innerhalb 30 Tagen. 20+ polnische Satelliten im Orbit.",
        },
      },
    },
  ],
  [
    "PL-ARTEMIS-ACCORDS",
    {
      title: "Artemis Accords — Polen als Unterzeichner (2021)",
      provisions: {
        "Section 10": {
          title: "Weltraumressourcen",
          summary:
            "13. Unterzeichner, 25. Oktober 2021. Erster zentraleuropäischer Unterzeichnerstaat.",
        },
      },
    },
  ],
  [
    "PL-SPACE-ACT-2026",
    {
      title: "Weltraumgesetz 2026 (Ustawa o działalności kosmicznej)",
      scopeDescription:
        "Polens ERSTES umfassendes Weltraumgesetz. Schließt eine 58-jährige Lücke. POLSA als Genehmigungsbehörde, 60-Mio.-EUR-Versicherung, nationales Register, strikte Haftung, Weltraummüll. Militärische Aktivitäten unter MON/ARGUS befreit. 566 Unternehmen im Ökosystem.",
      provisions: {
        Permits: {
          title: "Umfassendes Genehmigungsregime",
          summary:
            "6 Bedingungen: Zuverlässigkeit, Risikobewertung, Weltraummüll, Umwelt, ITU, Versicherung. Entscheidung 60 Tage. Gültigkeit bis 25 Jahre. ABW-Sicherheitsgutachten. Militär BEFREIT.",
          complianceImplication:
            "POLSA kann Genehmigungen verweigern, aussetzen oder widerrufen.",
        },
        Insurance: {
          title: "Pflichtversicherung 60 Mio. EUR pro Ereignis",
          summary:
            "Deckung Betreiber- und Staatshaftung. POLSA-Präsident setzt Summe je Risiko fest. Befreiung für Wissenschaft/Bildung und Militär.",
          complianceImplication:
            "60 Mio. EUR = höchste Stufe in Europa (wie FR/AT/FI).",
        },
      },
    },
  ],
  [
    "PL-POLSA-ACT-2014",
    {
      title: "Gesetz über die Polnische Raumfahrtagentur",
      provisions: {
        "Full instrument": {
          title: "POLSA-Gründung und Mandat",
          summary:
            "Zentrale Regierungsbehörde seit 2014. Durch Weltraumgesetz 2026 zur Genehmigungsbehörde transformiert. Sitz: Danzig (seit 2024). ~120 Mitarbeiter.",
        },
      },
    },
  ],
  [
    "PL-ECOMM-2024",
    {
      title: "Gesetz über elektronische Kommunikation",
      provisions: {
        "Full instrument": {
          title: "Satellitenspektrumverwaltung",
          summary:
            "Neues Telekommunikationsgesetz. UKE verwaltet Satellitenfrequenzen und ITU-Koordination.",
        },
      },
    },
  ],
  [
    "PL-STRATEGIC-GOODS-2000",
    {
      title: "Gesetz über den Handel mit strategischen Gütern",
      provisions: {
        "Full instrument": {
          title: "Exportkontrolle mit Tracker 2.0",
          summary:
            "Mitglied aller 5 Exportkontrollregime. HCoC-Vorsitz 2017-2018. CAMILA/MIKROGLOB >90% polnische Technologie — bewusste ITAR-Vermeidung.",
          complianceImplication:
            "Polnische Programme minimieren bewusst ausländische Exportkontrollabhängigkeiten.",
        },
      },
    },
  ],
  [
    "PL-SPACE-STRATEGY-2017",
    {
      title: "Polnische Weltraumstrategie 2017-2030",
      provisions: {
        "Full document": {
          title: "Drei strategische Ziele — 3% Marktanteil",
          summary:
            "CM25: 731 Mio. EUR (+277%). >1,2 Mrd. EUR Militärsatelliten. 566 Unternehmen. IAC 2027 in Posen. Sławosz Uznański: 2. Pole im Weltraum (Juni 2025).",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // CROSS-CUTTING SOURCES (added 2026-04 — sanctions, standards, ITU, insurance,
  // sectoral, EU programmes, multilateral export regimes)
  // ═══════════════════════════════════════════════════════════════════

  [
    "INT-EU-SANCTIONS-RU-833",
    {
      title:
        "Verordnung (EU) Nr. 833/2014 — Russland-Sektorensanktionen (mit den Eskalationen ab 2022 für den Raumfahrtsektor)",
      scopeDescription:
        "Operative EU-Sanktionsverordnung gegen Russland, seit Februar 2022 mehrfach verschärft (zuletzt 16. Sanktionspaket Dezember 2024). Anhang VII (Hochtechnologie) und Anhang XXIII (Industriegüter) erfassen Raumfahrzeuge, GNSS-Empfänger, INS, Sternensensoren und zahlreiche Bodensegment-Komponenten. Anhang IV listet sanktionierte Endempfänger. Unmittelbar in allen EU-Mitgliedstaaten anwendbar — überlagert jede vertragliche Vereinbarung und kann durch Rechtswahl nicht verdrängt werden.",
      provisions: {
        "Art. 2 + Anhang VII": {
          title: "Ausfuhrverbot für Hochtechnologie",
          summary:
            "Verbietet den unmittelbaren oder mittelbaren Verkauf, die Lieferung, Verbringung oder Ausfuhr von Hochtechnologiegütern und -technologie an Personen in Russland oder zur Verwendung in Russland — einschließlich Raumfahrzeugen, GNSS, INS, Sternensensoren.",
        },
        "Art. 12g": {
          title: "Umgehungsverbot — Sorgfaltspflicht",
          summary:
            "Operatoren müssen aktive Maßnahmen ergreifen, um eine Drittlandsumlenkung nach Russland zu verhindern. Umlenkung über Belarus, Zentralasien oder den Kaukasus ist die häufigste Compliance-Falle.",
        },
      },
    },
  ],

  [
    "INT-WASSENAAR",
    {
      title:
        "Wassenaar-Arrangement über Exportkontrollen für konventionelle Waffen sowie Güter und Technologien mit doppeltem Verwendungszweck",
      scopeDescription:
        "Plurilaterales Exportkontrollregime von 42 Teilnehmerstaaten mit gemeinsamen Kontrolllisten (Munitionsliste und Dual-Use-Liste). Die Listen der EU-Dual-Use-Verordnung 2021/821, US EAR, UK ECO 2008, JP FEFTA und AU DSGL leiten ihre Struktur direkt aus den Wassenaar-Listen ab. Jährliche Plenar-Aktualisierungen fließen mit 6–18 Monaten Verzögerung in die nationalen Listen ein.",
      provisions: {
        "Liste der Güter mit doppeltem Verwendungszweck": {
          title: "Jährliche Aktualisierungen der Kontrollliste",
          summary:
            "Kategorien 1–9 erfassen Materialien, Chemikalien, Elektronik, Computer, Telekommunikation, Sensoren und Luft- und Raumfahrt-/Antriebstechnik. Aktualisierung jeweils im Dezember-Plenar; nationale Anpassungen folgen im Q1–Q2 des Folgejahres.",
        },
      },
    },
  ],

  [
    "INT-MTCR",
    {
      title:
        "Trägertechnologie-Kontrollregime (MTCR) — Anhang Kategorien I und II",
      scopeDescription:
        "Freiwilliges plurilaterales Regime zwischen 35 Partnerstaaten zur Verhinderung der Verbreitung von Trägersystemen, die mindestens 500 kg über 300 km tragen können. Kategorie I (komplette Trägersysteme und Hauptsubsysteme) unterliegt einer Versagensvermutung; Kategorie II (Dual-Use-Komponenten, Technologie, Materialien) wird einzelfallbezogen genehmigt. Erfasst die meisten Trägerraketen, Antriebssysteme, INS/Sternensensoren oberhalb der Schwellenwerte sowie Raumfahrzeug-Subsysteme mit Raketenanwendung.",
      provisions: {
        "Anhang Kategorie I": {
          title: "Versagensvermutung",
          summary:
            "Komplette Raketensysteme, vollständige unbemannte Luftfahrzeuge sowie Hauptsubsysteme (Raketenmotoren, Wiedereintrittskörper, GNC-Sätze) unterliegen einer Versagensvermutung, sofern keine außerordentliche politische Rechtfertigung besteht.",
        },
      },
    },
  ],

  [
    "INT-ISO-24113",
    {
      title:
        "ISO 24113 — Raumfahrtsysteme: Anforderungen zur Vermeidung von Weltraumtrümmern",
      scopeDescription:
        "Top-Level-ISO-Standard zur Trümmerminderung, der von praktisch jeder nationalen Genehmigungsbehörde als technische Grundlage für nicht-staatliche Raumfahrtaktivitäten übernommen wurde. Spezifiziert quantitative Anforderungen zur Lebensdauer im Orbit (LEO ≤ 25 Jahre), Passivierung, End-of-Life-Disposal, Casualty-Risk-Schwellenwerte und Design-for-Disposal. Wird vom französischen RTF-2011, australischen SLR Rules 2019, japanischen Space Activities Act sowie der US-FCC-5-Jahres-PMD-Regel zitiert.",
      provisions: {
        "Cl. 6.3 — LEO post-mission disposal": {
          title: "25-Jahres-Lebensdauer-Obergrenze",
          summary:
            "Raumfahrzeuge und Oberstufen im LEO müssen innerhalb von 25 Jahren nach Missionsende aus dem geschützten Bereich entfernt werden — durch Wiedereintritt, Verbringung in eine Friedhofsumlaufbahn oder aktive Beseitigung.",
        },
        "Cl. 6.6 — Casualty risk": {
          title: "1-zu-10.000-Schadenrisiko-Obergrenze",
          summary:
            "Der unkontrollierte Wiedereintritt von Raumfahrzeugen und Trägerraketen muss ein Casualty-Risk von weniger als 1 zu 10.000 pro Ereignis erreichen — eine quantitative Schwelle, die in Genehmigungsregeln aller Jurisdiktionen übernommen wurde.",
        },
      },
    },
  ],

  [
    "INT-ITU-RR",
    {
      title: "ITU Radio Regulations (Vollzugsordnung für den Funkdienst)",
      scopeDescription:
        "Völkerrechtsverbindliches internationales Instrument zur Frequenzzuteilung und zur Nutzung des geostationären Orbits. Bindet 194 ITU-Mitgliedstaaten und liegt oberhalb jeder nationalen Frequenz-Lizenzregelung. Artikel 5 (Frequenzzuteilung), Artikel 9 (Koordinierung), Artikel 11 (Anmeldung) und Artikel 22 (Weltraumdienste) sind die operativen Bestimmungen für jedes kommerzielle Satellitensystem.",
      provisions: {
        "Art. 9 — Koordinierung": {
          title: "API, CR/C und bilaterale Koordinierung",
          summary:
            "Verfahren zur Koordinierung eines Satellitennetzes mit potenziell betroffenen Verwaltungen. API (Advance Publication Information) eröffnet das Verfahren; CR/C (Coordination Request) löst die bilateralen Koordinierungspflichten aus; Vorlaufzeiten betragen typischerweise 2–7 Jahre für GEO-Netze.",
        },
        "Art. 22": {
          title: "Weltraumdienste — PFD- und EPFD-Konstellationsgrenzen",
          summary:
            "Legt PFD-Grenzen für Weltraum-zu-Erde-Übertragungen sowie EPFD-Grenzen für Nicht-GSO-Konstellationen in geteilten Bändern fest. Bestimmt die technische Hülle, die ein Konstellationsbetreiber einhalten muss.",
        },
      },
    },
  ],

  [
    "INT-IOS-ADR-FRAMEWORK",
    {
      title:
        "In-Orbit-Servicing und aktive Trümmerbeseitigung — Vergleichsregulatorischer Rahmen",
      scopeDescription:
        "Referenzeintrag für die Regulierungslandschaft zu Rendezvous-and-Proximity-Operationen, Betankung im Orbit, robotischem Servicing und aktiver Trümmerbeseitigung. Es gibt kein globales Vertragsregime — Operatoren navigieren ein Patchwork nationaler Rahmenwerke. Erfasst FCC-IOSSA-Rahmen, japanischen CRD2-Präzedenzfall, ESA-ClearSpace-1-Vertragsmodell, NASA-OSAM-Vertragsstrukturen und die offene Frage der Haftungsverteilung bei physischer Interaktion zwischen Raumfahrzeugen verschiedener Operatoren.",
      provisions: {
        "Regulatorische Pfade": {
          title: "Lizenzwege je Jurisdiktion",
          summary:
            "FCC: Part 25 + IOSSA-Framework (Anzeigeregime). FAA: Part-450-Mission-Licensing. UK CAA: SIA-2018 Orbital-Operator-Lizenz + Mission-Management-Lizenz. JP Cabinet Office: Spacecraft-Management-Permit (Art. 20-23 SAA 2016). ESA: ClearSpace-1-Vertragsinstrument unter Space Safety Programme.",
        },
      },
    },
  ],

  [
    "INT-SPACE-RESOURCES-COMPARATOR",
    {
      title:
        "Weltraumressourcen — Vergleichendes Eigentumsregime (US, LU, AE, JP)",
      scopeDescription:
        "Vergleichseintrag für die vier Jurisdiktionen, die kommerzielle Eigentumsrechte an Weltraumressourcen gesetzlich geregelt haben, plus die COPUOS-Arbeitsgruppe zu rechtlichen Aspekten von Space-Resource-Aktivitäten (seit 2021 aktiv). Alle vier Gesetzesregime interpretieren das Nichtaneignungsprinzip von Art. II OST so, dass es Privateigentum an extrahierten Ressourcen nicht ausschließt — zum Teil mit unterschiedlichen Souveränitätsimplikationen. China und Russland lehnen diese Auslegung ab; die EU hat (noch) nicht legislativ gehandelt.",
      provisions: {
        "USA — CSLCA Title IV (2015)": {
          title: "First-Mover-Statut",
          summary:
            "51 USC §51303: Ein US-Bürger, der an der kommerziellen Gewinnung einer Asteroidenressource oder Weltraumressource beteiligt ist, hat Anspruch auf jede so erlangte Ressource — einschließlich Besitz, Eigentum, Transport, Nutzung und Verkauf.",
        },
      },
    },
  ],

  [
    "EU-IRIS2-CONCESSION-2024",
    {
      title:
        "Verordnung (EU) 2023/588 — IRIS² Programm für sichere Konnektivität",
      scopeDescription:
        "Etabliert das IRIS²-Programm (Infrastructure for Resilience, Interconnection and Security by Satellite) — eine Dual-Use-Konstellation für Regierungs- und kommerzielle Nutzung in MEO/LEO. Der 2024 vergebene IRIS²-Konzessionsvertrag an das SpaceRISE-Konsortium operationalisiert die staatliche Beschaffung sicherer Konnektivität bis 2040, mit ausdrücklichen Pflichten zu Cybersicherheit, Lieferkettensicherheit und ITAR-freier Konstruktion.",
      provisions: {
        "Art. 9": {
          title: "Konzessionsbasierte Beschaffung",
          summary:
            "Die EU beschafft den IRIS²-Sicherheitsdienst über einen Konzessionsvertrag mit einem Konsortium (SpaceRISE: Eutelsat-OneWeb / SES / Hispasat / Airbus / Thales / OHB). Konzessionshorizont 2024–2040 mit meilensteingebundenen Zahlungen.",
        },
      },
    },
  ],

  [
    "DE-VVG",
    {
      title: "Versicherungsvertragsgesetz (VVG)",
      scopeDescription:
        "Grundlegendes deutsches Vertragsrechtsgesetz für jeden nach deutschem Recht abgeschlossenen Versicherungsvertrag — einschließlich Haftpflichtdeckungen für ein zukünftiges Weltraumgesetz, NIS2-getriebene Cyberdeckungen und operatorseitig beschaffte Launch- und In-Orbit-Versicherungen. Definiert vorvertragliche Anzeigepflichten (§§ 19–22), Schadenregulierungsregeln (§§ 100–115) und das Verbraucherschutzregime, das deutsche Policen von Londoner Marktwordings unterscheidet.",
      provisions: {
        "§§ 19-22": {
          title: "Vorvertragliche Anzeigepflichten",
          summary:
            "Der Versicherungsnehmer hat alle ihm bekannten gefahrerheblichen Umstände anzuzeigen. Anders als das englische Uberrima-fides-Konzept unterscheidet das deutsche Regime zwischen fahrlässigem, grob fahrlässigem und arglistigem Verstoß mit verhältnismäßigen Rechtsfolgen.",
        },
      },
    },
  ],

  [
    "UK-INSURANCE-ACT-2015",
    {
      title: "Insurance Act 2015 (UK)",
      scopeDescription:
        "Modernisiert das englische Versicherungsvertragsrecht und ist die rechtliche Grundlage für nahezu jede in Lloyd's platzierte Raumfahrtversicherung — Launch, In-Orbit, Drittpersonen-Haftung und Political-Risk-Deckungen, die routinemäßig im Londoner Markt für globale Operatoren gezeichnet werden. Ersetzt den strengen Anzeigemaßstab des Marine Insurance Act 1906 durch eine 'duty of fair presentation' (§ 3) und reformiert die Rechtsfolgen von Verstoß, Garantien und betrügerischen Schadensanzeigen.",
      provisions: {
        "§ 3": {
          title: "Pflicht zur fairen Darstellung",
          summary:
            "Ersetzt den Vor-2015-Maßstab der äußersten Treue durch eine Pflicht zur fairen Darstellung, die die Offenlegung wesentlicher Umstände entweder ausdrücklich oder in einer für den Versicherer angemessen recherchierbaren Weise verlangt. Entscheidend bei der Platzierung jedes Weltraumrisikos.",
        },
      },
    },
  ],

  [
    "INT-SPACE-INSURANCE-MARKET",
    {
      title:
        "Globaler Weltraumversicherungsmarkt — Lloyd's-Syndikate, Mutuals und Captives",
      scopeDescription:
        "Referenzeintrag, der die tatsächliche Marktstruktur abbildet, mit der Operatoren bei der Beschaffung von Raumfahrtdeckungen konfrontiert sind — getrennt von den gesetzlichen Vorgaben in den nationalen Vertragsrechtseinträgen (DE-VVG, FR-CODE-ASSURANCES-SPACE, UK-INSURANCE-ACT-2015). Katalogisiert die wesentlichen Kapazitätsgeber (Lloyd's-Syndikate, kontinentale Europäer, Mutuals), die typische Schichtstruktur (Pre-Launch, Launch, In-Orbit, Drittpersonen-Haftung, Political Risk) und die Wording-Lineage, der jede Raumfahrtversicherungs-Platzierung begegnet.",
      provisions: {
        Standardschichtung: {
          title: "Pre-Launch, Launch, In-Orbit, Drittpersonen",
          summary:
            "Typische Platzierungsstruktur: Pre-Launch (Transport und Integration), Launch (gewollte Zündung bis Trennung), In-Orbit-Lebensdauer (Inbetriebnahme bis EOL) und Drittpersonen-Haftung (gesetzliche Haftung gegenüber Nicht-Passagieren). Jede Schicht hat eigenen Markt, eigene Wording-Lineage und eigene Preisdynamik.",
        },
      },
    },
  ],

  [
    "JP-SPACE-ACTIVITIES-ACT-2016",
    {
      title:
        "Gesetz über den Start von Raumfahrzeugen und die Kontrolle von Raumfahrzeugen (Japan)",
      scopeDescription:
        "Operatives Genehmigungsstatut für japanische kommerzielle Start- und On-Orbit-Management-Aktivitäten. Etabliert ein Kabinettsbüro-Genehmigungsregime, eine zwingende Drittpersonen-Haftpflichtversicherung (derzeit 20 Mrd. JPY), staatliche Indemnifikation oberhalb der Versicherungsobergrenze sowie ausdrückliche Trümmerminderungs- und End-of-Life-Disposal-Pflichten für Satellitenbetreiber.",
      provisions: {
        "Art. 35-43": {
          title: "Haftung und staatliche Indemnifikation",
          summary:
            "Verschuldensunabhängige Operatorhaftung für Oberflächenschäden; zwingende Drittpersonen-Haftpflicht in Höhe von 20 Mrd. JPY; staatliche Indemnifikation oberhalb der Versicherungsobergrenze bis zu einer durch den Diet festgesetzten Höchstgrenze.",
        },
      },
    },
  ],

  [
    "AE-DECREE-12-2019",
    {
      title:
        "Bundesverordnungsgesetz Nr. 12 von 2019 zur Regulierung des Weltraumsektors (UAE)",
      scopeDescription:
        "Primäres Weltraumgesetz der VAE. Etabliert die UAESA als nationale Lizenzbehörde, verlangt Genehmigungen für jede Raumfahrtaktivität durch UAE-flagged oder UAE-territoriale Operatoren, regelt Haftung und Versicherung und autorisiert ausdrücklich die Gewinnung von Weltraumressourcen (UAE war nach US und Luxemburg die dritte Jurisdiktion mit gesetzlich geregeltem Eigentum an Weltraumressourcen).",
      provisions: {
        "Art. 18": {
          title: "Weltraumressourcen-Aktivitäten",
          summary:
            "Autorisiert und reguliert Erforschung und Nutzung von Weltraumressourcen durch genehmigte Operatoren. Detaillierter Rahmen durch Kabinettsbeschluss festgelegt.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // VERIFIZIERTE ÜBERSETZUNGSTRANCHE — DEBRIS / STM / ENVIRONMENTAL
  // ═══════════════════════════════════════════════════════════════════

  // ─── INTL: IADC, ISO, CCSDS, COPUOS, ECSS, ESA, ITU, LTS, Aarhus ────

  [
    "INT-IADC-MITIGATION-2002",
    {
      title:
        "IADC-Leitlinien zur Vermeidung von Weltraumtrümmern (Originalfassung 2002)",
      scopeDescription:
        "Originaldokument des Inter-Agency Space Debris Coordination Committee (IADC) aus 2002 — die ingenieurtechnische Grundlage für COPUOS-2007 und jedes nationale Trümmer-Mitigations-Regime. Definierte die geschützten Regionen (LEO ≤ 2000 km Höhe; GEO ±200 km × ±15° Breite), die 25-Jahres-Regel zur LEO-End-of-Life-Entsorgung, die GEO-Friedhofs-Bahnformel (235 km + 1000·CR·A/m über GEO) und die Passivierungspflicht. Operativ durch die 2007er Minor-Revision und die Updates 2020/2025 abgelöst, die geschützten Regionen-Definitionen bleiben jedoch unverändert und sind weiterhin die kanonische Referenz.",
      provisions: {
        "§3": {
          title: "Geschützte Regionen",
          summary:
            "Region A (LEO): kugelförmiger Bereich von der Erdoberfläche bis 2000 km Höhe. Region B (GEO): Torus ±200 km Höhe × ±15° Breite um den geostationären Gürtel.",
          complianceImplication:
            "Alle nationalen Entsorgungsvorschriften (FCC 5-Jahre, ESA 25-Jahre, JAXA 25-Jahre, UKSA Einzelfall) gelten ausschließlich für diese beiden Regionen. Operatoren außerhalb von Region A/B haben formal keine End-of-Life-Entsorgungspflicht.",
        },
        "§5.3.1": {
          title: "LEO-End-of-Life-Entsorgung — 25 Jahre",
          summary:
            "Raumfahrzeuge und Orbitalstufen sollen Region A nach Missionsende nicht länger als 25 Jahre verbleiben — durch direkten Wiedereintritt, atmosphärischen Drag oder Transfer in eine Langzeit-Friedhofsbahn.",
        },
        "§5.3.2": {
          title: "GEO-Friedhofsbahn-Formel",
          summary:
            "Re-Orbit-Höhe über GEO ≥ 235 km + 1000·CR·A/m, wobei CR der Solarstrahlungsdruck-Koeffizient (typisch 1,2–1,5) und A/m das Flächen-Masse-Verhältnis in m²/kg ist.",
          complianceImplication:
            "Die meisten Operatoren steuern ~300 km über GEO an, um Reserve einzubauen. Unterschreitung der Formel ist der häufigste GEO-Entsorgungs-Verstoß in Operator-Audits.",
        },
        "§5.2.2": {
          title: "Passivierung",
          summary:
            "Alle bordeigenen Energiequellen (Resttreibstoff, Batterien, Druckbehälter, Schwungräder) sind am Missionsende zu entladen oder sicher zu stellen, um Post-Mission-Auseinanderbrechen zu verhindern.",
        },
      },
    },
  ],

  [
    "INT-IADC-MITIGATION-2020",
    {
      title:
        "IADC-Leitlinien zur Vermeidung von Weltraumtrümmern (Revision 2020)",
      scopeDescription:
        "Revision 2020, die die Basis 2002/2007 verschärft. Führt eine ausdrückliche Zuverlässigkeitsanforderung von 90 % für die LEO-End-of-Life-Entsorgung ein, präzisiert die Passivierungs-Sprache und empfiehlt die Koordination kollisionsvermeidender Manöver über geteilte Katalogdaten. Bleibt die Version, auf die FCC-/FAA-/UKSA-/CNES-Leitlinien wörtlich verweisen — bis jede Behörde das 2025er Update einzeln übernimmt.",
      provisions: {
        "§5.3.1": {
          title: "LEO-Entsorgung — 25 Jahre und 90 % Zuverlässigkeit",
          summary:
            "Behält die 25-Jahres-Regel bei, ergänzt jedoch: 'Das End-of-Life-Entsorgungsmanöver ist so auszulegen, dass eine Erfolgswahrscheinlichkeit von mindestens 0,9 erreicht wird.'",
          complianceImplication:
            "Der 90 %-Schwellwert ist die Grundlage moderner Lizenz-Auflagen ('Nachweis ≥ 0,9 Entsorgungs-Zuverlässigkeit'). Single-String-Antriebsarchitekturen erfüllen dies in der Regel nicht ohne Redundanz.",
        },
        "§5.4": {
          title: "Konjunktionsbewertung & Vermeidung",
          summary:
            "Operatoren sollen Konjunktions-Screening anhand der genauesten verfügbaren Bahndaten durchführen und Ausweichmanöver ausführen, sobald die Kollisionswahrscheinlichkeit eine vom Operator definierte Schwelle überschreitet.",
        },
        "§5.6": {
          title: "Casualty-Risk beim Wiedereintritt",
          summary:
            "Wiedereintretende Objekte sollen nationale Casualty-Risk-Schwellwerte (typisch 10⁻⁴) einhalten — die IADC selbst legt keine Zahl fest, sondern verweist ausdrücklich auf nationale Regime.",
        },
      },
    },
  ],

  [
    "INT-IADC-MITIGATION-2025",
    {
      title:
        "IADC-Leitlinien zur Vermeidung von Weltraumtrümmern — Update 2025 (5-Jahres-LEO-Regel)",
      scopeDescription:
        "Aktueller IADC-Konsens, beim Plenum 2025 verabschiedet. Ersetzt das 25-Jahres-Ziel für LEO-End-of-Life-Entsorgung durch ein 5-Jahres-Ziel für neue Raumfahrzeuge (konsistent mit der FCC-Anordnung 2022), führt eine Koordinationspflicht für den Wiedereintritt ein und verschärft die Zuverlässigkeitsanforderung für die End-of-Life-Entsorgung auf 0,95. Operativ die anspruchsvollste IADC-Fassung — die meisten modernen Lizenzentscheidungen (FCC, UKSA Standard Conditions, ASI Note 02/2024) verweisen direkt auf diese Revision.",
      provisions: {
        "§5.3.1 (Rev. 3)": {
          title: "5-Jahres-LEO-Entsorgung",
          summary:
            "Neue Raumfahrzeuge und Orbitalstufen sind innerhalb von fünf Jahren nach Missionsende aus dem LEO zu entfernen, mit einer Erfolgswahrscheinlichkeit der End-of-Life-Entsorgung von mindestens 0,95.",
          complianceImplication:
            "Erfordert effektiv Antrieb (oder aerodynamische Drag-Augmentation-Devices für Bahnen unter 600 km). Die '5 Jahre' sind heute der Mindeststandard für jede Mission nach 2025, die eine US-, UK- oder französische Genehmigung anstrebt.",
        },
        "§5.3.3": {
          title: "Wiedereintritts-Koordination",
          summary:
            "Staaten und Operatoren sollen Zeit und Bodenspur kontrollierter und unkontrollierter Wiedereintritte koordinieren, um Risiken für besiedelte Gebiete zu minimieren, und potenziell betroffene Staaten vorab benachrichtigen.",
        },
        "§5.7": {
          title: "Sonderbestimmungen für Konstellationen",
          summary:
            "Große Konstellationen (>100 Raumfahrzeuge) sollen einen flottenweiten Trümmer-Mitigations-Plan veröffentlichen — mit Ersatz-vs-aktiv-Strategie, End-of-Life-Kadenz und kumulativem Katastrophen-Kollisions-Risiko-Modell.",
          complianceImplication:
            "Erste IADC-Fassung, die Konstellationen als Kategorie adressiert. Treibt Filings vom Typ Astranis/Starlink/OneWeb/Kuiper dazu, flottenweite Statistiken statt nur Pro-Satelliten-Werte einzureichen.",
        },
      },
    },
  ],

  [
    "INT-ISO-24113-2023",
    {
      title:
        "ISO 24113:2023 — Raumfahrtsysteme — Anforderungen an die Vermeidung von Weltraumtrümmern",
      scopeDescription:
        "Top-Level-ISO-Norm, die die IADC-Leitlinien in auditierbare ingenieurtechnische Anforderungen übersetzt. Die 4. Ausgabe (2023) richtet sich an der IADC-Basis 2020 Rev. 2 aus und ergänzt explizite Anforderungen an den Nachweis der Entsorgungs-Zuverlässigkeit, das Casualty-Risk nach Wiedereintritt und die Verifikation der End-of-Life-Passivierung. Die meisten ESA-, JAXA- und CNES-Verträge verlangen ISO-24113-Konformität in den technischen Klauseln; viele Privatoperatoren referenzieren sie als projekt-internen SDM-Standard.",
      provisions: {
        "§6.2": {
          title: "Beschränkung von Trümmer-Freisetzung im Normalbetrieb",
          summary:
            "Die Wahrscheinlichkeit der Freisetzung operativer Trümmer ≥ 1 mm ist nachweisbar zu minimieren. Linsendeckel, Trennfedern und Sprengbolzenfragmente werden ausdrücklich als Beispiele genannt.",
        },
        "§6.3": {
          title: "Beschränkung unbeabsichtigter Auseinanderbrüche",
          summary:
            "Raumfahrzeug- und Orbitalstufen-Konstruktionen müssen nachweisen, dass die Wahrscheinlichkeit unbeabsichtigter Auseinanderbrüche im Betrieb unter 10⁻³ liegt.",
        },
        "§6.4": {
          title: "Beschränkung Post-Mission-Auseinanderbrüche",
          summary:
            "Alle gespeicherten Energiequellen (Treibstoff, Druckbehälter, Batterien, Schwungräder) sind innerhalb eines definierten Post-Mission-Zeitrahmens zu passivieren. Die Passivierungs-Verifikation muss orbital nachweisbar sein.",
        },
        "§6.5": {
          title: "End-of-Life-Entsorgung — geschützte Regionen",
          summary:
            "Entsorgung aus LEO innerhalb von 25 Jahren (gemäß IADC 2020). Entsorgung aus GEO via Friedhofsbahn nach IADC-Formel. Nachgewiesene Erfolgswahrscheinlichkeit ≥ 0,9.",
        },
        "§6.6": {
          title: "Casualty-Risk beim Wiedereintritt",
          summary:
            "Casualty-Risk bei unkontrolliertem Wiedereintritt darf 10⁻⁴ nicht überschreiten (ESA-/JAXA-/FAA-Schwellwert). Bei kontrolliertem Wiedereintritt ist die Zielbodenspur mit den zuständigen nationalen Behörden abzustimmen.",
        },
        "§6.7": {
          title: "Behandlung von Konjunktionsereignissen",
          summary:
            "Es muss ein operatives Verfahren existieren zum Empfang von Conjunction-Data-Messages, Berechnung der Kollisionswahrscheinlichkeit und Ausführung von Ausweichmanövern.",
        },
      },
    },
  ],

  [
    "INT-COPUOS-DEBRIS-2007",
    {
      title:
        "Leitlinien zur Vermeidung von Weltraumtrümmern des Ausschusses der Vereinten Nationen für die friedliche Nutzung des Weltraums (COPUOS)",
      scopeDescription:
        "Sieben unverbindliche Leitlinien, die die internationale Basis für die Trümmer-Vermeidung bilden. Von der UN-Generalversammlung gebilligt (Res. 62/217) und in praktisch jedem nationalen Weltraumgesetz-Trümmer-Regime referenziert (FR LOS, IT Gesetz 89/2025, UK SIA 2018, FAA 14 CFR Part 450, ESA-Politik).",
      provisions: {
        "Guideline 1": {
          title: "Beschränkung von Trümmern im Normalbetrieb",
          summary:
            "Weltraumsysteme sollen so ausgelegt werden, dass im Normalbetrieb keine Trümmer freigesetzt werden. Wo dies nicht möglich ist, ist der Effekt auf die Orbitalumgebung zu minimieren.",
        },
        "Guideline 2": {
          title: "Vermeidung von Auseinanderbrüchen im Betrieb",
          summary:
            "Konstruktion und Betrieb sollen das Risiko unbeabsichtigter Explosion oder unbeabsichtigten Auseinanderbrechens im Betrieb minimieren.",
        },
        "Guideline 3": {
          title:
            "Beschränkung der Wahrscheinlichkeit unbeabsichtigter Kollisionen im Orbit",
          summary:
            "Bahnauswahl, Ausweichmanöver und Koordination sollen die Kollisionswahrscheinlichkeit reduzieren. Operatoren sollen aktive Maßnahmen zur Vermeidung bekannter Weltraumobjekte ergreifen.",
        },
        "Guideline 4": {
          title:
            "Vermeidung absichtlicher Zerstörung und schädlicher Aktivitäten",
          summary:
            "Absichtliche Zerstörung, die langlebige Trümmer erzeugt, ist zu vermeiden. Diese Leitlinie umrahmt die internationale Reaktion auf ASAT-Tests.",
        },
        "Guideline 5": {
          title:
            "Minimierung von Post-Mission-Auseinanderbrüchen aus gespeicherter Energie",
          summary:
            "Passivierung: Entladung von Resttreibstoff und Batterien am Missionsende, um explosivem Auseinanderbrechen vorzubeugen.",
        },
        "Guideline 6": {
          title: "Begrenzung der LEO-Langzeit-Präsenz",
          summary:
            "End-of-Life-Entsorgung aus LEO innerhalb von 25 Jahren (die '25-Jahres-Regel') — durch Wiedereintritt oder Transfer in eine Friedhofsbahn. Zunehmend durch 5-Jahres-Regeln (FCC 2022) abgelöst und durch das IADC-2025-Update verstärkt.",
        },
        "Guideline 7": {
          title: "Begrenzung der GEO-Langzeit-Präsenz",
          summary:
            "End-of-Life-Entsorgung aus GEO via Transfer in eine Friedhofsbahn mindestens 235 km + (1000 × CR × A/m) über GEO.",
        },
      },
    },
  ],

  [
    "INT-LTS-2019",
    {
      title:
        "Leitlinien für die langfristige Nachhaltigkeit von Weltraumtätigkeiten (UN COPUOS LTS Guidelines)",
      scopeDescription:
        "21 Leitlinien (A.1–D.5), 2019 vom UN-COPUOS verabschiedet, mit Empfehlungen zu nationalem regulatorischem Rahmen, sicherem Betrieb von Weltraumobjekten, internationaler Kooperation und wissenschaftlicher und technischer Zusammenarbeit. Die meisten westlichen Raumfahrtnationen orientieren ihre regulatorische Modernisierung an diesem Korpus.",
      provisions: {
        "A.1–A.7": {
          title: "Politik- und regulatorischer Rahmen",
          summary:
            "Mitgliedstaaten sollen geeignete nationale regulatorische Rahmen für Weltraumtätigkeiten einrichten und an internationaler Standardsetzung mitwirken.",
        },
        "B.1–B.10": {
          title: "Sichere Durchführung von Weltraumoperationen",
          summary:
            "Empfehlungen zu Konjunktionsbewertung, Bahndaten-Austausch, Vorab-Anmeldung von Manövern und Wiedereintritts-Koordination.",
        },
      },
    },
  ],

  [
    "INT-ECSS-U-AS-10C",
    {
      title:
        "ECSS-U-AS-10C Rev.2 — Übernahme von ISO 24113: Anforderungen an die Vermeidung von Weltraumtrümmern",
      scopeDescription:
        "ESA-Übernahme von ISO 24113 mit europa-spezifischer Anpassung. ECSS-U-AS-10C Rev.2 ist in allen ESA-Verträgen verbindlich und wird von CNES, DLR, ASI, INTA, Belspo, NSO und den meisten nationalen Trümmer-Mitigations-Leitlinien als technische Basis referenziert. Die europäische Anpassung verschärft die Passivierungs-Nachweise und führt mit der ESA-SDM-Politik konsistente Casualty-Risk-Modellierungs-Regeln ein.",
      provisions: {
        "Tailoring §4.1": {
          title: "Entsorgungs-Zuverlässigkeit ≥ 0,9",
          summary:
            "ESA-Missionen müssen am Ende-Mission-Confirmation-Meilenstein eine Erfolgswahrscheinlichkeit der End-of-Life-Entsorgung von ≥ 0,9 nachweisen.",
        },
        "Tailoring §4.4": {
          title: "Casualty-Risk-Schwellwert 10⁻⁴",
          summary:
            "Aggregiertes Casualty-Risk bei unkontrolliertem Wiedereintritt darf 10⁻⁴ nicht überschreiten; bei höheren Risiken ist kontrollierter Wiedereintritt in das SPOUA (South-Pacific Ocean Uninhabited Area) zwingend.",
        },
      },
    },
  ],

  [
    "INT-ESA-SDM-POLICY-2014",
    {
      title:
        "ESA-Politik zur Vermeidung von Weltraumtrümmern bei Agentur-Projekten",
      scopeDescription:
        "Verbindliche interne ESA-Politik zur Trümmer-Vermeidung für alle Projekte, Verträge und Partnerschaften der Agentur. Verlangt für jede ESA-Mission die Konformität mit ECSS-U-AS-10C (und damit ISO 24113) zuzüglich agenturspezifischer Anpassung bei Entsorgungs-Zuverlässigkeits-Nachweisen, Casualty-Risk-Schwellwerten und dem SPOUA-Wiedereintritts-Korridor.",
      provisions: {
        "§4": {
          title: "Konformität mit ECSS-U-AS-10C",
          summary:
            "Alle ESA-Projekte müssen die Konformität mit ECSS-U-AS-10C (übernimmt ISO 24113) einhalten und durch die projekteigene Trümmer-Mitigations-Dokumentation nachweisen.",
        },
        "§5": {
          title: "Tailoring-Befugnis",
          summary:
            "Projektspezifische Anpassungen sind nur mit formaler Genehmigung des Programm-Direktors zulässig; Abweichungen sind zu dokumentieren und risikobasiert zu rechtfertigen.",
        },
      },
    },
  ],

  [
    "INT-CCSDS-CDM-508",
    {
      title: "CCSDS 508.0-B-1 — Conjunction Data Message (CDM)",
      scopeDescription:
        "Industriestandard-Format für maschinenlesbare Konjunktions-Warnungen. Ursprünglich vom 18th Space Defense Squadron / Space-Track entwickelt und von jedem großen SSA-Anbieter übernommen (LeoLabs, Slingshot, ESA SST, EU SST, JAXA SSA). Operatoren MÜSSEN CDMs in diesem Format konsumieren, um an einer modernen Kollisionsvermeidungs-Pipeline teilnehmen zu können.",
      provisions: {
        "§4": {
          title: "CDM-Datenfelder",
          summary:
            "Definiert die obligatorischen Konjunktions-Felder: TCA (Time of Closest Approach), Miss-Distance, Relativgeschwindigkeit, Primary-/Secondary-State-Vector am TCA, Kovarianzmatrizen, Hard-Body-Radius und Kollisionswahrscheinlichkeit.",
        },
        "§5": {
          title: "Berechnung der Kollisionswahrscheinlichkeit",
          summary:
            "Standardisierte Pc-Berechnungs-Methodik; Referenz-Implementierungen von Foster, Patera und Alfano sind normativ aufgeführt.",
        },
      },
    },
  ],

  [
    "INT-ITU-RES-35",
    {
      title:
        "ITU-R Resolution 35 (WRC-19) — Meilensteinbasierte Inbetriebnahme von NGSO-Satellitensystemen in bestimmten Frequenzbändern und Diensten",
      scopeDescription:
        "Auf der WRC-19 verabschiedet: Resolution 35 verhängt verbindliche Inbetriebnahme-Meilensteine für NGSO-Satelliten-Netze in bestimmten Frequenzbändern: mindestens 10 % des Netzes innerhalb von 2 Jahren ab Bringing-Into-Use-Datum, 50 % innerhalb von 5 Jahren und 100 % innerhalb von 7 Jahren. Verfehlung eines Meilensteins führt zu einer proportionalen Reduktion der im Master International Frequency Register (MIFR) eingetragenen Satellitenzahl. Beschränkt Konstellations-Inbetriebnahme-Zeitpläne und stärkt die Trümmer-Vermeidungs-Disziplin durch Sanktionierung reiner Papier-Anmeldungen.",
      provisions: {
        "Resolves 1": {
          title: "Drei-Stufen-Inbetriebnahme-Meilensteine",
          summary:
            "Meilenstein 1 (≥ 10 % Inbetriebnahme) innerhalb von 2 Jahren ab BIU; Meilenstein 2 (≥ 50 %) innerhalb von 5 Jahren; Meilenstein 3 (≥ 100 %) innerhalb von 7 Jahren.",
        },
        "Resolves 2": {
          title: "MIFR-Konsequenz bei Nichteinhaltung",
          summary:
            "Verfehlung eines Meilensteins reduziert die im MIFR eingetragene Satellitenzahl auf die zum Meilenstein-Datum tatsächlich in Betrieb genommene Zahl.",
          complianceImplication:
            "NGSO-Konstellations-Operatoren müssen ihre Inbetriebnahme-Kadenz an den Meilenstein-Plan anpassen oder eine dauerhafte Reduktion ihrer ITU-eingetragenen Flotte hinnehmen — wirkt sich direkt auf die lebenslange Spektrumsrechte-Hülle aus.",
        },
      },
    },
  ],

  [
    "INT-AARHUS-1998",
    {
      title:
        "Aarhus-Übereinkommen über den Zugang zu Informationen, die Öffentlichkeitsbeteiligung an Entscheidungsverfahren und den Zugang zu Gerichten in Umweltangelegenheiten",
      scopeDescription:
        "UN-ECE-Übereinkommen, das der Öffentlichkeit drei Verfahrensrechte in Umweltangelegenheiten gewährt: (1) Zugang zu Umweltinformationen bei Behörden, (2) Beteiligung an umweltbezogenen Entscheidungsverfahren, (3) Zugang zu Gerichten zur Überprüfung umweltbezogener Entscheidungen. Von allen EU-Mitgliedstaaten und der EU selbst ratifiziert (Beschluss 2005/370/EG). Bestimmt die Verfahrensoberfläche für Spaceport-Lizenzierung und Startkorridor-Umweltprüfung in ganz Europa — die Pflichten zur Öffentlichkeitsbeteiligung in EU-EIA, Habitats und nationalen Genehmigungsregimen sind Aarhus-basiert.",
      provisions: {
        "Art. 4-5": {
          title: "Zugang zu Umweltinformationen",
          summary:
            "Behörden haben Umweltinformationen auf Anfrage bereitzustellen und bestimmte Informationskategorien proaktiv zu verbreiten.",
        },
        "Art. 6": {
          title: "Öffentlichkeitsbeteiligung bei bestimmten Tätigkeiten",
          summary:
            "Annex-I-Tätigkeiten (große Industrieanlagen und bestimmte Verkehrsinfrastruktur) erfordern frühzeitige und wirksame Öffentlichkeitsbeteiligung im Genehmigungsverfahren.",
        },
        "Art. 9": {
          title: "Zugang zu Gerichten",
          summary:
            "Mitgliedern der Öffentlichkeit muss Klagebefugnis zustehen, um Verstöße gegen nationales Umweltrecht und die materielle und verfahrensrechtliche Rechtmäßigkeit von Genehmigungsentscheidungen anzufechten.",
        },
      },
    },
  ],

  // ─── EU: STM Strategy, EIA, Habitats ────────────────────────────────

  [
    "EU-STM-STRATEGY-2022",
    {
      title:
        "EU-Strategie zum Space Traffic Management — Gemeinsame Mitteilung JOIN(2022) 4 final",
      scopeDescription:
        "Gemeinsame Mitteilung der Europäischen Kommission und der Hohen Vertreterin, die die EU-STM-Ambition formuliert: Aufbau einer koordinierten EU-STM-Fähigkeit auf Basis der EU-SST-Partnerschaft, Beitrag zu internationalen STM-Standards, Aufbau operativer STM-Dienste auf EU-Ebene und Adressierung der regulatorischen Dimension (mögliches künftiges EU-Weltraumgesetz zu STM). Anschlussakt: EU Space Act (COM(2025) 335), der STM-Bestimmungen in seinem Entwurf-Titel VI integriert.",
      provisions: {
        "§ 2 — Operativer Pfeiler": {
          title: "STM-Dienste auf EU-Ebene",
          summary:
            "Die EU-SST-Partnerschaft soll zum operativen Rückgrat des EU-STM ausgebaut werden, ergänzt durch zusätzliche Dienste (Wiedereintritts-Analyse, Fragmentierungs-Analyse, Manöver-Koordination).",
        },
        "§ 4 — Regulatorischer Pfeiler": {
          title: "Künftige EU-STM-Regulierung",
          summary:
            "Die Kommission soll EU-Rechtsetzung zu STM vorschlagen, wo Mitgliedstaatsrahmen unzureichend sind — verfolgt im Entwurf des EU-Weltraumgesetzes.",
        },
      },
    },
  ],

  [
    "EU-EIA-DIR-2011-92",
    {
      title:
        "Richtlinie über die Umweltverträglichkeitsprüfung (Richtlinie 2011/92/EU, geändert durch 2014/52/EU)",
      scopeDescription:
        "EU-Richtlinie, die eine Umweltverträglichkeitsprüfung (UVP) für öffentliche und private Vorhaben mit voraussichtlich erheblichen Umweltauswirkungen vorschreibt. Annex I listet UVP-pflichtige Vorhaben (große Industrieanlagen, bestimmte Verkehrsinfrastrukturen); Annex II listet Vorhaben, die einer mitgliedstaatlichen Vorprüfung unterliegen. Spaceport-Bau und größere Startgelände-Erweiterungen fallen unter Annex-II-Vorprüfung; die Änderung 2014/52 verschärfte die Vorprüfungs-Kriterien und führte verbindliche 'begründete Schlussfolgerungen' der Mitgliedstaaten zur Umweltauswirkung ein. Innerstaatlich umgesetzt: UK SI 2017/571, deutsches UVPG, französischer Code de l'environnement Art. L122 etc.",
      provisions: {
        "Art. 4": {
          title: "Vorprüfung (Screening)",
          summary:
            "Mitgliedstaaten bestimmen, ob das Projekt einer UVP unterzogen wird — Annex-I-Projekte stets; Annex II via Einzelfallprüfung.",
        },
        "Art. 5-7": {
          title: "Scoping und Konsultation",
          summary:
            "Vorhabenträger legt einen Scoping-Bericht vor; Konsultation mit Umweltbehörden und der Öffentlichkeit; grenzüberschreitende Konsultation bei mitgliedstaatsübergreifenden Auswirkungen.",
        },
        "Art. 8a (post-2014)": {
          title: "Begründete Schlussfolgerung",
          summary:
            "Die zuständige Behörde muss eine begründete Schlussfolgerung zu den erheblichen Umweltauswirkungen des Projekts in die Genehmigung integrieren.",
        },
      },
    },
  ],

  [
    "EU-HABITATS-DIR-92-43",
    {
      title:
        "FFH-Richtlinie (Richtlinie 92/43/EWG zur Erhaltung der natürlichen Lebensräume sowie der wildlebenden Tiere und Pflanzen)",
      scopeDescription:
        "Grundlage des Natura-2000-Netzwerks. Art. 6 Abs. 3 verlangt eine 'angemessene Prüfung' jedes Plans oder Projekts, das ein Natura-2000-Gebiet erheblich beeinträchtigen könnte — einzeln oder im Zusammenwirken mit anderen Vorhaben. Mehrere europäische Spaceports und Startkorridore überschneiden sich mit Natura-2000-Gebieten (insbesondere entlang atlantischer und mediterraner Küsten und in skandinavischen Boreal-Zonen), sodass FFH-Prüfungen ein wiederkehrender Bestandteil europäischer Startgelände-Genehmigungen sind.",
      provisions: {
        "Art. 6 Abs. 3": {
          title: "Angemessene Prüfung",
          summary:
            "Pläne oder Projekte, die ein Natura-2000-Gebiet erheblich beeinträchtigen könnten, sind einer angemessenen Prüfung der Auswirkungen auf die Erhaltungsziele des Gebiets zu unterziehen.",
        },
        "Art. 6 Abs. 4": {
          title: "Zwingende Gründe des überwiegenden öffentlichen Interesses",
          summary:
            "Wenn die Prüfung negativ ausfällt, das Vorhaben aber aus zwingenden Gründen des überwiegenden öffentlichen Interesses durchgeführt werden muss, hat der Mitgliedstaat alle erforderlichen Ausgleichsmaßnahmen zu treffen.",
        },
      },
    },
  ],

  // ─── US: NEPA, FAA Part 450, FCC Rules, ODMSP, NASA-STD, SPD-3, ITAR/EAR ────

  [
    "US-NEPA-1969",
    {
      title: "National Environmental Policy Act (NEPA) von 1969",
      scopeDescription:
        "Bundesgesetz, das eine Umweltprüfung für 'major federal actions' vorschreibt — jede FAA-Startlizenz, jede FCC-Raumstation-Genehmigung und jede NOAA-Fernerkundungs-Lizenz ist eine 'federal action' im Sinne von NEPA. Löst entweder eine Environmental Assessment (EA) oder eine vollständige Environmental Impact Statement (EIS) aus, sofern keine kategorische Ausnahme greift. Der Rahmen aus CSE-v-DOT (und Viasat-v-FCC) bestätigt, dass kategorische Ausnahmen für die Satellitenlizenzierung gültig sind, wo durch dokumentarische Evidenz allgemeiner Nicht-Erheblichkeit gestützt.",
      provisions: {
        "§ 4332(C)": {
          title: "Environmental Impact Statement",
          summary:
            "Jede Empfehlung oder jeder Bericht zu Vorschlägen für Gesetzgebung und sonstigen 'major federal actions' mit erheblichen Auswirkungen auf die menschliche Umwelt muss eine detaillierte Erklärung zu Umweltauswirkungen und Alternativen enthalten.",
        },
        "40 CFR § 1501.4": {
          title: "Entscheidungsbaum EA / EIS / kategorische Ausnahme",
          summary:
            "CEQ-Verordnungen schreiben vor, wie eine Behörde zwischen EA, EIS oder kategorischer Ausnahme entscheidet — der praktische Schritt, der den Umweltprüfungs-Aufwand einer Startlizenz bestimmt.",
        },
      },
    },
  ],

  [
    "US-FAA-450-131",
    {
      title:
        "14 CFR § 450.131 — Umweltprüfung für FAA-Start- und Wiedereintrittslizenzen",
      scopeDescription:
        "Die Umweltprüfungs-Bestimmung von Part 450: Verlangt vom Lizenznehmer Umweltinformationen, die der FAA eine NEPA-Analyse (42 USC §§ 4321 ff.) und Anwendung weiterer Umweltgesetze (Endangered Species Act, National Historic Preservation Act, Clean Air Act etc.) erlauben. Der Antragsteller muss die Start- und Wiedereintritts-Umweltauswirkungen identifizieren und Mitigationsmaßnahmen vorschlagen. Die FAA erstellt dann eine EA, erteilt eine kategorische Ausnahme oder leitet ein EIS ein — abhängig vom Projekt-Profil.",
      provisions: {
        "(a)": {
          title: "Pflicht des Antragstellers",
          summary:
            "Der Antragsteller hat Umweltinformationen bereitzustellen, die der FAA die Erfüllung von NEPA und weiteren Umweltgesetzen und -verordnungen ermöglichen.",
        },
        "(b)": {
          title: "Mitigations-Verpflichtungen",
          summary:
            "Mitigationsmaßnahmen zur Reduktion von Umweltauswirkungen sind zu identifizieren; die FAA kann sie als Lizenz-Bedingungen verhängen.",
        },
      },
    },
  ],

  [
    "US-NASA-STD-8719-14B",
    {
      title:
        "NASA-STD-8719.14B — Verfahren zur Beschränkung von Orbital-Trümmern (mit Change 1)",
      scopeDescription:
        "Verbindliche interne NASA-Trümmer-Mitigations-Norm, anwendbar auf alle NASA-finanzierten Missionen und bindend für Auftragnehmer und Partner. Setzt die US-Government Orbital Debris Mitigation Standard Practices (ODMSP, 2019-Update) um und wird von FAA, FCC, NOAA und Verteidigungsministerium als Gold-Standard-Methodik für die unterstützenden Analysen referenziert (DAS — Debris Assessment Software — läuft gegen diese Norm).",
      provisions: {
        "§4.3": {
          title: "Operative Trümmer-Limits",
          summary:
            "Mission-bezogene Trümmer ≥ 1 mm, die in den LEO freigesetzt werden, sind soweit praktikabel zu eliminieren.",
        },
        "§4.4": {
          title: "Unbeabsichtigte Auseinanderbruchs-Wahrscheinlichkeit",
          summary:
            "Die Wahrscheinlichkeit unbeabsichtigter Explosionen im operativen Betrieb ist unter 0,001 zu halten.",
        },
        "§4.5": {
          title: "End-of-Life-Entsorgung — LEO 25 Jahre (Übergang zu 5)",
          summary:
            "End-of-Life-Entsorgung aus LEO innerhalb von 25 Jahren; an die FCC-2022-5-Jahres-Regel für neue Raumfahrzeuge angepasst über missionsspezifische Waiver und das ODMSP-Update 2024.",
        },
        "§4.6": {
          title: "Casualty-Risk beim Wiedereintritt — 1:10.000",
          summary:
            "Aggregiertes menschliches Casualty-Risk bei unkontrolliertem Wiedereintritt darf 1 von 10.000 (10⁻⁴) nicht überschreiten.",
        },
      },
    },
  ],

  [
    "US-ODMSP-2019",
    {
      title:
        "US-Government Orbital Debris Mitigation Standard Practices (ODMSP) — Update 2019",
      scopeDescription:
        "Inter-Agency-Politik der US-Regierung zur Umsetzung der IADC-Leitlinien. Das ODMSP ist die harmonisierte Basis, auf die NASA-STD-8719.14B, FAA 14 CFR Part 450, FCC § 25.114 und NOAA-CRSRA verweisen. Das Update 2019 führte quantitative Kollisions-Risiko- und Zuverlässigkeits-Metriken für den Betrieb und für große Konstellationen ein.",
      provisions: {
        "§1": {
          title: "Beschränkung der Freisetzung operativer Trümmer",
          summary:
            "Programme sollen Raumfahrzeuge und Orbitalstufen so auslegen, dass im Normalbetrieb keine Trümmer freigesetzt werden (mission-bezogene Trümmer > 1 mm).",
        },
        "§3": {
          title: "Zuverlässigkeitsziel der End-of-Life-Entsorgung",
          summary:
            "Die Erfolgswahrscheinlichkeit des End-of-Life-Entsorgungs-Manövers muss ≥ 0,9 sein (für das vorgeschlagene 2024-Update für große Konstellationen auf 0,99 erhöht).",
        },
        "§4-B": {
          title: "Konstellationen — zusätzliche Anforderungen",
          summary:
            "Große Konstellationen (>100 Satelliten) müssen aggregierte Kollisions-Risiko-Statistiken veröffentlichen und nachweisen, dass die flottenweite Katastrophen-Kollisions-Wahrscheinlichkeit über die Konstellationslebenszeit < 10⁻⁴ ist.",
        },
      },
    },
  ],

  [
    "US-FCC-25-114",
    {
      title:
        "47 CFR § 25.114 — Antragsanforderungen für Satelliten-Raumstationen (Trümmer-Mitigations-Erklärung)",
      scopeDescription:
        "Abschnitt der FCC-Part-25-Satellitenlizenz-Verordnung, der bei jedem Raumstation-Antrag eine Trümmer-Erklärung verlangt. Operatoren müssen die Konformität mit § 25.283 (PMD), § 25.281 (operativen Praktiken) und der 5-Jahres-Entsorgungsregel (eingeführt 2022) nachweisen. Eine fehlende § 25.114(d)(14)-Erklärung führt zur Rückweisung des Antrags.",
      provisions: {
        "(d)(14)(i)": {
          title: "Hardware-Auslegung des Raumfahrzeugs",
          summary:
            "Nachweis der getroffenen Maßnahmen zur Beschränkung der Trümmer-Freisetzung im Normalbetrieb und zur Minimierung der Kollisionswahrscheinlichkeit mit großen Trümmern.",
        },
        "(d)(14)(ii)": {
          title: "Minimierung möglicher Auseinanderbrüche",
          summary:
            "Nachweis von Passivierungsverfahren für gespeicherte Energie am Missionsende und Bewertung der unbeabsichtigten Auseinanderbruchs-Wahrscheinlichkeit.",
        },
        "(d)(14)(iii)": {
          title: "Entsorgungs-Erklärung",
          summary:
            "Entsorgungsplan konform zu § 25.283 — kontrollierter Wiedereintritt, atmosphärisches Verglühen innerhalb von 5 Jahren (post-2022) oder Transfer in eine Entsorgungsbahn.",
        },
      },
    },
  ],

  [
    "US-FCC-25-283",
    {
      title:
        "47 CFR § 25.283 — End-of-Life-Entsorgung von Raumstationen (5-Jahres-Regel)",
      scopeDescription:
        "Kodifiziert die 5-Jahres-FCC-End-of-Life-Entsorgungsregel — der operative Text hinter FCC 22-74. Neue Raumstationen, deren Genehmigung nach dem 29. September 2024 erteilt wird, sind innerhalb von 5 Jahren nach Missionsende zu entsorgen. Entsorgungspfade: kontrollierter Wiedereintritt, atmosphärisches Verglühen via natürlicher Bahnverfall oder Transfer in eine Entsorgungsbahn nachweislich außerhalb der LEO-geschützten Region.",
      provisions: {
        "(a)": {
          title: "5-Jahres-LEO-End-of-Life-Entsorgung",
          summary:
            "Raumstationen, die ihren Betrieb im LEO einstellen oder durch ihn passieren (≤ 2000 km Höhe), sind innerhalb von 5 Jahren nach Missionsende zu entsorgen.",
          complianceImplication:
            "Erste verbindliche nationale Abweichung von der IADC-25-Jahres-Leitlinie. Erfordert effektiv Antrieb (oder aerodynamische Augmentations-Devices) bei jeder LEO-Mission ab 2024 — außer bei Höhen < 600 km, wo natürlicher Bahnverfall allein die Regel erfüllen kann.",
        },
        "(b)": {
          title: "Entsorgungs-Zuverlässigkeit ≥ 0,9",
          summary:
            "Operator hat eine Erfolgswahrscheinlichkeit des End-of-Life-Entsorgungs-Manövers von mindestens 0,9 nachzuweisen, konsistent mit dem US-Government ODMSP.",
        },
        "(c)": {
          title: "GEO-Friedhof",
          summary:
            "GEO-Entsorgung via Re-Orbit ≥ 235 km + 1000·CR·A/m über GEO; Entsorgungs-Zuverlässigkeit ≥ 0,9.",
        },
      },
    },
  ],

  [
    "US-FCC-5YR-PMD-2022",
    {
      title:
        "FCC Second Report and Order — Mitigation of Orbital Debris in the New Space Age (FCC 22-74)",
      scopeDescription:
        "FCC-Anordnung von September 2022, die die LEO-End-of-Life-Entsorgungsregel von der bisherigen 25-Jahres-Vorgabe auf 5 Jahre verkürzt. Erstmalige verbindliche nationale Abweichung von der IADC-Leitlinie, gilt für neue Raumfahrzeug-Genehmigungen ab dem 29. September 2024. Treibt die Branche zu propulsion-equipped LEO-Missionen.",
      provisions: {
        "Order ¶17": {
          title: "5-Jahres-Regel verkündet",
          summary:
            "Raumstationen, die in oder durch das LEO operieren, sind innerhalb von 5 Jahren nach Missionsende zu entsorgen — kodifiziert in 47 CFR § 25.283.",
        },
      },
    },
  ],

  [
    "US-SPD-3-2018",
    {
      title:
        "Space Policy Directive 3 (SPD-3) — National Space Traffic Management Policy",
      scopeDescription:
        "Etabliert die US-National-STM-Politik: Weist das Handelsministerium an, die öffentlich-zugewandte Space-Situational-Awareness-Datenteilungs-Rolle vom Verteidigungsministerium zu übernehmen, SSA-Standards zu entwickeln und STM-Dienste für zivile und kommerzielle Operatoren bereitzustellen. Der Aufbau des Traffic Coordination System for Space (TraCSS) durch das Office of Space Commerce seit 2024 setzt diese Direktive operativ um.",
      provisions: {
        "§ 2": {
          title: "Ziele und Grundsätze",
          summary:
            "Die Vereinigten Staaten sollen führend bei sicheren und verantwortungsvollen Weltraumtätigkeiten sein; das Handelsministerium soll die öffentlich-zugewandte Behörde für zivile SSA-Daten und grundlegende STM-Dienste sein.",
        },
        "§ 4": {
          title: "Rolle des Handelsministeriums",
          summary:
            "Handelsministerium / Office of Space Commerce sollen einen öffentlichen Katalog von Weltraumobjekten pflegen, grundlegende SSA-Dienste bereitstellen und STM-Standards in Koordination mit FCC, FAA, NASA und DoD entwickeln.",
        },
      },
    },
  ],

  [
    "US-CSLA-1984",
    {
      title: "Commercial Space Launch Act (CSLA) von 1984",
      scopeDescription:
        "Foundational US-Bundesgesetz, das das kommerzielle Startgenehmigungs-Regime der FAA/AST etabliert. Kodifiziert in 51 USC Chapter 509. Schafft das Lizenzregime für kommerzielle Starts und Wiedereintritte, die Genehmigung von Startanlagen-Betreibern, das Maximum-Probable-Loss-Versicherungsregime und die staatliche Indemnifikation oberhalb der MPL-Grenze.",
      provisions: {
        "§ 50904": {
          title: "Lizenzpflicht",
          summary:
            "Niemand darf ohne FAA-Lizenz einen Start, Wiedereintritt oder Betrieb einer Startanlage durchführen.",
        },
        "§ 50914": {
          title: "Maximum Probable Loss & staatliche Indemnifikation",
          summary:
            "Operatoren müssen Drittpartie-Haftpflicht in Höhe der MPL versichern; oberhalb dieser Grenze leistet die US-Regierung Indemnifikation bis zur Diet-festgelegten Obergrenze.",
        },
      },
    },
  ],

  [
    "US-COMM-ACT-1934",
    {
      title: "Communications Act von 1934 (auf Satelliten anwendbar)",
      scopeDescription:
        "Foundational US-Telekommunikationsgesetz, auf dessen Grundlage die FCC Satellitenkommunikation reguliert. § 301 verbietet den Betrieb von Funkanlagen ohne FCC-Lizenz; § 303 ermächtigt die FCC zur Spektrum-Zuteilung; § 308 regelt das Antragsverfahren. Anwendbar auf Satelliten-Raumstationen (47 CFR Part 25), Erdfunkstellen und Frequenzkoordination.",
      provisions: {
        "§ 301": {
          title: "Lizenzpflicht für Funkanlagen",
          summary:
            "Niemand darf eine Funkanlage in den USA ohne FCC-Lizenz betreiben.",
          complianceImplication:
            "Die statutäre Grundlage für die Bußgelder gegen Swarm Technologies (2018, 900.000 USD) und EchoStar/DISH (2023, 150.000 USD).",
        },
        "§ 303": {
          title: "Spektrum-Zuteilung",
          summary:
            "Die FCC ist befugt, Frequenzen zuzuteilen, Klassen von Funkdiensten festzulegen und Lizenzbedingungen zu definieren.",
        },
      },
    },
  ],

  [
    "US-ITAR",
    {
      title:
        "International Traffic in Arms Regulations (ITAR) — Kategorie IV & XV",
      scopeDescription:
        "Verwaltet vom State Department / DDTC unter dem Arms Export Control Act (22 USC § 2778). Die US Munitions List (USML) Kategorie IV (Startfahrzeuge, Lenkwaffen, Raketenmotoren) und Kategorie XV (Spacecraft Systems) erfassen die meisten militärischen und dual-use-Raumfahrt-Komponenten. ITAR-Verstöße ziehen Strafsanktionen bis zu 20 Jahren Haft und 1 Mio. USD pro Verstoß nach sich. Technical Assistance Agreements (TAAs) sind für technische Daten-Transfers an ausländische Personen erforderlich.",
      provisions: {
        "USML Kategorie IV": {
          title: "Startfahrzeuge, Lenkwaffen, Raketenmotoren",
          summary:
            "Erfasst Trägerraketen, Raketenmotoren, Wiedereintritts-Fahrzeuge und zugehörige Komponenten. Export erfordert DDTC-Lizenz; technischer Daten-Transfer erfordert TAA.",
        },
        "USML Kategorie XV": {
          title: "Spacecraft Systems",
          summary:
            "Erfasst militärische Satelliten und bestimmte kommerzielle Satelliten-Komponenten. Die Reform 2014 verschob viele kommerzielle Komponenten zur EAR — Kategorie XV bleibt für militär-spezifische Hardware bindend.",
        },
      },
    },
  ],

  [
    "US-EAR",
    {
      title:
        "Export Administration Regulations (EAR) — Kategorie 9 (Aerospace)",
      scopeDescription:
        "Verwaltet vom Commerce Department / BIS unter dem Export Control Reform Act 2018 (50 USC Ch. 58). Commerce Control List (CCL) Kategorie 9 (Aerospace and Propulsion) erfasst dual-use-Raumfahrt-Items, die nicht auf der ITAR-USML stehen. Die Export Control Reform 2014 verlagerte die meisten kommerziellen Satelliten-Komponenten von ITAR-Kategorie XV zur EAR-9E515 / 9A515. BIS-Screening-Verfahren für End-User, End-Use und Bestimmungsländer (insbesondere China, Russland, Iran).",
      provisions: {
        "ECCN 9A515": {
          title: "Satelliten und Komponenten",
          summary:
            "Kommerzielle Satelliten und definierte Komponenten — Export erfordert BIS-Lizenz, abhängig von Bestimmungsland und End-Use.",
        },
        "Entity List Screening": {
          title: "Endnutzer-Screening",
          summary:
            "Operatoren müssen vor Ausfuhr gegen die Entity List, die SDN List (OFAC) und die Unverified List screenen.",
        },
      },
    },
  ],

  // ─── UK: SIR 2021, CAP 2589 ─────────────────────────────────────────

  [
    "UK-SIR-2021",
    {
      title: "Space Industry Regulations 2021",
      scopeDescription:
        "Statutory Instrument zur Operationalisierung des Space Industry Act 2018 — legt die detaillierten Lizenzantrags-Anforderungen, Technical-Information-Schedules und Operating-Licence-Bedingungen fest, die durch die CAA durchgesetzt werden. Die Verordnungen enthalten ausdrückliche Trümmer-Vermeidungs- und End-of-Mission-Anforderungen (Schedule 1 Part 3) mit ISO 24113 als technischer Basis. Begleitverordnungen zu Rechtsbehelfen (SI 2021/793) und Vollzug (SI 2021/795) vervollständigen das Sekundärrechts-Paket unter SIA 2018.",
      provisions: {
        "Sched. 1 Part 3": {
          title: "Mission-Management-Plan",
          summary:
            "Antrag muss einen Mission-Management-Plan enthalten, der Betrieb, Konjunktions-Bewertungs-Verfahren, End-of-Life-Entsorgung und Passivierung abdeckt — gemessen an ISO 24113.",
        },
        "Sched. 1 Part 7": {
          title: "Versicherung und Indemnifikation",
          summary:
            "Antrag muss Drittpartie-Haftpflicht-Versicherung in der von der CAA festgesetzten Höhe nachweisen — typisch EUR 60M Basisbetrag plus missions-spezifische Aufschläge.",
        },
      },
    },
  ],

  [
    "UK-CAA-CAP2589",
    {
      title:
        "CAP 2589 — UK CAA Politik zur Vermeidung von Weltraumtrümmern und Nachhaltigkeit",
      scopeDescription:
        "Verbindliche Trümmer-Vermeidungs-Politik der CAA unter dem Space Industry Act 2018. Setzt die technische Basis (ISO 24113:2023) für die Lizenzierung und wendet einen Zwei-Stufen-Ansatz an: Standard-Lizenzierung für Missionen, die ISO 24113 erfüllen; verschärfte Prüfung für abweichende Missionen. Die erste CAP-2589-Revision im November 2024 führte eine Präferenz für 5-Jahres-LEO-End-of-Life-Entsorgung ein und brachte die UK in Linie mit FCC und IADC 2025.",
      provisions: {
        "§4.2": {
          title: "ISO-24113-Basis",
          summary:
            "Alle Lizenzantragsteller müssen die Konformität mit ISO 24113:2023 in der technischen Einreichung nachweisen.",
        },
        "§4.3": {
          title: "End-of-Life-Entsorgungs-Präferenz — 5 Jahre",
          summary:
            "Ab 2025 verschiebt sich das End-of-Life-Manöver-Ziel von 25 auf 5 Jahre für neue LEO-Missionen; die 25-Jahres-Fallback-Option nur mit dokumentierter Begründung.",
        },
        "§5": {
          title: "Manöver-Datenteilung",
          summary:
            "Operatoren müssen operative Manöver-Pläne mindestens 24 Stunden vor Ausführung mit dem NSpOC teilen — außer bei Kollisionsvermeidungs-Manövern, wo Post-Event-Reporting akzeptabel ist.",
        },
        "§6": {
          title: "Bereitschaft für Active Debris Removal",
          summary:
            "Raumfahrzeuge, die nach dem 1. Januar 2027 starten, sollten so ausgelegt sein, dass sie Active Debris Removal ermöglichen (Capture-Schnittstellen, Beacon-Tracking-Hilfen).",
        },
      },
    },
  ],

  // ─── FR: CNES RTE 2024, Décret 2009-643 ─────────────────────────────

  [
    "FR-CNES-DEBRIS-RTE-2024",
    {
      title:
        "CNES Référentiel Technique d'Exigence — Trümmer-Vermeidung im Weltraum",
      scopeDescription:
        "Technisches Referenzwerk des CNES, das von ANFR/CNES-Experten unter der LOS-Art.-4-Technische-Verordnungs-Prüfung angewandt wird. Setzt ISO 24113 mit französischen Spezifika um: strengerer Casualty-Risk-Schwellwert (10⁻⁵ für kontrollierten Wiedereintritt über französischem Territorium), verpflichtende CNES-Prüfung für Missionen mit Behauptungen ≥ 0,95 Entsorgungs-Zuverlässigkeit und ein verbindliches 5-Jahres-LEO-End-of-Life-Entsorgungs-Ziel seit der 2024er-Revision.",
      provisions: {
        "§4": {
          title: "5-Jahres-LEO-End-of-Life-Entsorgungs-Ziel",
          summary:
            "Das Référentiel verlangt eine Rest-Lebensdauer ≤ 5 Jahre im LEO nach Missionsende für alle ab 2025 eingereichten neuen Missionen.",
        },
        "§7": {
          title: "Casualty-Risk über französischem Territorium",
          summary:
            "Individuelles Casualty-Risk ≤ 10⁻⁵ für jeden kontrollierten Wiedereintritt über französischem Territorium oder den Übersee-Gebieten.",
        },
        "§9": {
          title: "Automatische Manöver-Mitteilung",
          summary:
            "Jedes Kollisionsvermeidungs-Manöver muss innerhalb einer Stunde nach Ausführung an das CIE (Centre d'Information sur l'Environnement) gemeldet werden.",
        },
      },
    },
  ],

  [
    "FR-DECRET-LOS-DEBRIS-IMPLEMENT",
    {
      title:
        "Décret n° 2009-643 — Anwendung des LOS Art. 4 (Technische Verordnung zur Trümmer-Vermeidung)",
      scopeDescription:
        "Anwendungs-Décret zum LOS, das die verbindliche technische Verordnung zur Trümmer-Vermeidung in französischen Weltraumtätigkeiten regelt. Artikel 14–17 legen die End-of-Life-Pflichten, Passivierungs-Anforderungen und Casualty-Risk-Schwellwerte fest; die Änderung 2024 führte das 5-Jahres-LEO-Ziel durch Verweis auf ISO 24113:2023 ein.",
      provisions: {
        "Art. 14": {
          title: "Post-Mission-Entsorgung",
          summary:
            "Jedes im LEO platzierte Objekt ist innerhalb von 5 Jahren nach Missionsende zu entsorgen (geändert 2024).",
        },
        "Art. 16": {
          title: "Casualty-Risk",
          summary:
            "Globales menschliches Risiko bei unkontrolliertem Wiedereintritt ≤ 10⁻⁴; bei Überschreitung kontrollierter Wiedereintritt zwingend.",
        },
        "Art. 17": {
          title: "Passivierung",
          summary:
            "Alle bordeigenen Energiequellen sind am Missionsende zu deaktivieren; Nachweise sind dem CNES vorzulegen.",
        },
      },
    },
  ],

  // ─── DE: Entwurf Weltraumgesetz Title IV ────────────────────────────

  [
    "DE-WELTRAUMG-DEBRIS-OBLIGATIONS",
    {
      title:
        "Entwurf Bundes-Weltraumgesetz — Vermeidung von Weltraumtrümmern (Titel IV)",
      scopeDescription:
        "Titel IV des Entwurfs des Bundes-Weltraumgesetzes (Inkrafttreten erwartet 2026/2027) führt erstmals statutäre End-of-Life- und Passivierungs-Anforderungen auf Bundesebene für deutsche Operatoren ein. Der Entwurf verweist namentlich auf ISO 24113:2023 und bindet Lizenzinhaber an ein 5-Jahres-LEO-End-of-Life-Entsorgungs-Ziel (konsistent mit FCC und IADC 2025).",
      provisions: {
        "§ 24 Entwurf": {
          title: "Auflagen zur Vermeidung von Trümmern",
          summary:
            "Genehmigungspflichtige Tätigkeiten sind mit Auflagen zu versehen, die der ISO 24113:2023 sowie ECSS-U-AS-10C Rev.2 entsprechen.",
        },
        "§ 25 Entwurf": {
          title: "End-of-Life-Verpflichtungen",
          summary:
            "Betreiber müssen die Wahrscheinlichkeit erfolgreicher End-of-Life-Manöver ≥ 0,9 nachweisen; LEO-Verweildauer max. 5 Jahre nach Missionsende.",
        },
        "§ 26 Entwurf": {
          title: "Passivierung",
          summary:
            "Alle Energiequellen (Treibstoff, Druckbehälter, Batterien) müssen am Missionsende deaktiviert werden; Nachweis durch Telemetrie.",
        },
      },
    },
  ],

  // ─── JP: JAXA JMR-003 ───────────────────────────────────────────────

  [
    "JP-JAXA-SED-STD",
    {
      title: "JAXA-Standard zur Vermeidung von Weltraumtrümmern (JMR-003)",
      scopeDescription:
        "Verbindlicher interner JAXA-Trümmer-Vermeidungs-Standard, anwendbar auf alle JAXA-Missionen und auf kommerzielle Raumfahrzeuge auf JAXA-beauftragten Trägern. Setzt die IADC-Leitlinien mit einem Japan-spezifischen Casualty-Risk-Ziel von 1×10⁻⁶ um — der weltweit strengste Wiedereintritts-Casualty-Schwellwert — getrieben durch die hohe Bevölkerungsdichte entlang potenzieller Bodenspuren. Rev. D (April 2023) ergänzte eine 5-Jahres-LEO-End-of-Life-Präferenz konsistent mit IADC 2025.",
      provisions: {
        "§5.4": {
          title: "Casualty-Risk — 1:1.000.000",
          summary:
            "Aggregiertes menschliches Casualty-Risk bei unkontrolliertem Wiedereintritt darf 1×10⁻⁶ nicht überschreiten — zehnmal strenger als die internationale 10⁻⁴-Basis.",
          complianceImplication:
            "Erzwingt effektiv kontrollierten Wiedereintritt für alle Raumfahrzeuge mit überlebenden Fragmenten > 0,1 kg. Begründung von JAXA für Konstruktions-Entscheidungen (z. B. vollständig verbrennende Materialien, präventive Demisability-Analyse) bei Missionen wie ETS-9 und ALOS-4.",
        },
        "§5.6": {
          title: "End-of-Life-Zuverlässigkeit ≥ 0,95",
          summary:
            "Erfolgswahrscheinlichkeit der End-of-Life-Entsorgung ≥ 0,95; redundante Entsorgungs-Mechanismen erforderlich für Missionen über 100 kg.",
        },
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // ENDE VERIFIZIERTE ÜBERSETZUNGSTRANCHE
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // VOLLSTÄNDIGKEITS-TRANCHE — alle verbleibenden fundamental/critical
  // Sources mit DE-Übersetzung versehen. Schwerpunkt: OST/Liability/
  // Registration-Ratifikationen sowie Nicht-EU Weltraumgesetze.
  // ═══════════════════════════════════════════════════════════════════

  // ─── US — Treaty-Ratifikationen + Major Acts ────────────────────────

  [
    "US-OST-1967",
    {
      title: "Weltraumvertrag — Ratifikation der Vereinigten Staaten",
      scopeDescription:
        "Ratifikationsurkunde der USA zum Weltraumvertrag von 1967. Verankert die US-Verpflichtung aus Art. VI zur Genehmigung und fortlaufenden Aufsicht nichtstaatlicher US-Weltraumtätigkeiten — die verfassungsrechtliche Grundlage, unter der CSLA, FCC Part 25, NOAA CRSRA und ITAR/EAR operieren.",
      provisions: {
        "Art. VI": {
          title:
            "Staatenverantwortlichkeit — umgesetzt durch CSLA + Sektorgesetze",
          summary:
            "Die Vereinigten Staaten tragen die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten einschließlich derer nichtstaatlicher Stellen. Die Umsetzung von Art. VI ist verteilt: FAA/AST lizenziert Start/Wiedereintritt (CSLA), FCC reguliert Spektrum (Communications Act), NOAA Fernerkundung (LRSPA), DDTC/BIS Exportkontrolle (ITAR/EAR).",
        },
        "Art. VII": {
          title: "Haftung des Startstaats — CSLA-Indemnifikations-Regime",
          summary:
            "Die USA haften völkerrechtlich als Startstaat für Schäden, die ihre Staatsangehörigen oder von ihrem Territorium verursachen. Der Commercial Space Launch Act § 50914 sieht ein dreistufiges Finanz-Verantwortungs-Regime vor (Operator-Versicherung bis MPL; Bundes-Indemnifikation darüber bis Diet-festgelegter Obergrenze; Operator-Eigenrisiko jenseits dessen).",
        },
        "Art. VIII": {
          title: "Registrierung und Hoheitsgewalt",
          summary:
            "Die USA behalten die Hoheitsgewalt über Objekte in ihrem Register. Die Registrierung erfolgt durch das State Department via UNOOSA gemäß Registrierungsübereinkommen 1975.",
        },
      },
    },
  ],

  [
    "US-LIABILITY-1972",
    {
      title: "Haftungsübereinkommen — Ratifikation der Vereinigten Staaten",
      scopeDescription:
        "Ratifikation des Haftungsübereinkommens durch die USA. Begründet die absolute Haftung der USA für Erdoberflächen-Schäden und die Verschuldenshaftung für Schäden im Orbit durch US-registrierte Weltraumobjekte — treibt das CSLA-§ 50914-Indemnifikations-Regime an, unter dem die US-Regierung die Drittpartie-Haftung über die Operator-Versicherungs-Obergrenze hinaus trägt.",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — umgesetzt durch CSLA § 50914",
          summary:
            "Die USA haften absolut für Erdoberflächen-Schäden, die durch US-Weltraumobjekte verursacht werden. Die innerstaatliche Umsetzung der Haftungs-Exposition läuft über die CSLA-§ 50914-Cross-Waiver- und Indemnifikations-Architektur.",
        },
      },
    },
  ],

  [
    "US-REGISTRATION-1976",
    {
      title:
        "Registrierungsübereinkommen — Ratifikation der Vereinigten Staaten",
      scopeDescription:
        "US-Ratifikation des Registrierungsübereinkommens. Innerstaatlich umgesetzt durch das State Department / Registry of Space Objects, das bei jedem CSLA-lizenzierten Start und jedem operativen US-Satelliten aktualisiert wird.",
      provisions: {
        "Art. II": {
          title: "Nationales Register — geführt vom State Department",
          summary:
            "Das US-Registry of Space Objects wird vom State Department (Bureau of Oceans and International Environmental and Scientific Affairs) geführt und an UNOOSA übermittelt. Registrierungs-Trigger: jeder Start einer CSLA-lizenzierten Mission und jeder operative US-Satellit.",
        },
      },
    },
  ],

  [
    "US-14CFR-PART-450",
    {
      title:
        "14 CFR Part 450 — Anforderungen für Start- und Wiedereintritts-Lizenzen",
      scopeDescription:
        "Performance-basierte modulare FAA-Verordnung zur kommerziellen Start- und Wiedereintritts-Lizenzierung — ersetzt das vormalige preskriptive Regime aus Part 415/431/435. Operatoren maßschneidern einen Sicherheitsfall an ihr Missionsprofil, statt Checklisten abzuhaken; das operative Dokument ist die Mission Operations and Safety Plan.",
      provisions: {
        "14 CFR 450.101": {
          title: "Performance-basierte Sicherheits-Kriterien",
          summary:
            "Konsolidierte Start- und Wiedereintritts-Lizenz, die die früheren Parts 415, 417, 431, 435 ersetzt. Performance-basierte Public-Safety-Kriterien: kollektives Risiko (Ec ≤ 1×10⁻⁴), individuelles Risiko (Pc ≤ 1×10⁻⁶), Luftfahrt-Risiko-Schwellwerte und Trajektorien-Sicherheits-Constraints.",
        },
      },
    },
  ],

  [
    "US-ARTEMIS-2020",
    {
      title:
        "Artemis Accords — Vereinigte Staaten (1. Unterzeichner / Initiator)",
      scopeDescription:
        "USA als Initiator und 1. Unterzeichner der Artemis Accords. Formuliert die operativen Grundsätze, die US-Partner für die Teilnahme an der NASA-geführten Mond-Erforschung akzeptieren müssen — friedliche Zwecke, Transparenz, Registrierung, Teilen wissenschaftlicher Daten, Interoperabilität, Notfallhilfe, Erhaltung des Weltraum-Erbes, Trümmer-Vermeidung, Konflikt-Vermeidung, Weltraum-Ressourcen-Koordination.",
      provisions: {
        "Section 10": {
          title: "Weltraum-Ressourcen — Koordinations-Rahmen",
          summary:
            "Unverbindliche Grundsätze für friedliche Nutzung des Weltraums und Koordination bei Mond- und Asteroiden-Erforschung. Section 10 erkennt an, dass Ressourcen-Extraktion im Einklang mit dem Weltraumvertrag 1967 stattfinden kann (mit dem Hinweis, dass dies keine Aneignung im Sinne von Art. II OST darstellt).",
        },
      },
    },
  ],

  [
    "US-CSLCA-2015",
    {
      title: "Commercial Space Launch Competitiveness Act (SPACE Act of 2015)",
      scopeDescription:
        "Änderungsgesetz von 2015 (der SPACE Act), das den CSLA modernisiert: erweitert das Indemnifikations-Regime, kodifiziert das Recht auf In-Space-Resource-Utilisation (Title IV), eröffnet Bundesanlagen für kommerzielle Nutzer und etabliert den FAA-Lernperioden-Rahmen für Human-Spaceflight-Operationen.",
      provisions: {
        "51 USC § 51303": {
          title: "Weltraum-Ressourcen — Eigentumsrechte für US-Bürger",
          summary:
            "Ein US-Bürger, der an der kommerziellen Bergung einer Asteroiden- oder Weltraumressource beteiligt ist, hat Anspruch auf jede so gewonnene Ressource — einschließlich des Rechts, sie zu besitzen, zu eigentumsmäßig innezuhaben, zu transportieren, zu nutzen und im Einklang mit anwendbarem Recht zu verkaufen.",
        },
        "51 USC § 50902(10)": {
          title: "Erweiterte Definition des 'Starts'",
          summary:
            "Bezieht den 'Wiedereintritt' in das CSLA-Definitionsschema ein, verlängert das Operator-Haftungsregime bis 2025 und erweitert die FAA-Zuständigkeit über kommerzielle Weltraumtätigkeiten.",
        },
      },
    },
  ],

  // ─── INTL — Sanctions, UNGA Recommendations, ESA Zero Debris ────────

  [
    "INT-ESA-ZERO-DEBRIS-STD",
    {
      title:
        "ESA Zero Debris Standard und Politik (ESSB-ST-U-006) — Anforderungen für ESA-beauftragte Missionen ab 2030",
      scopeDescription:
        "Institutioneller Zero-Debris-Standard der ESA, verbindlich für ESA-beauftragte Missionen mit Start ab 2030. Verlangt eine End-of-Life-Versagens-Wahrscheinlichkeit < 1/1000, Bereitstellung für Active Debris Removal bei nicht-konformen Legacy-Assets sowie Demisability-Anforderungen — alle eine Größenordnung strenger als die IADC-Basis.",
      provisions: {
        "§4 PMD Success": {
          title: "Erfolgswahrscheinlichkeit der End-of-Life-Entsorgung",
          summary:
            "Missionen müssen ≥ 99,9 % Erfolgswahrscheinlichkeit der End-of-Life-Entsorgung nachweisen — eine Größenordnung strenger als die IADC-90 %-Basis.",
        },
        "§5 Protected Regions": {
          title: "Keine langlebigen Trümmer in LEO/GEO geschützten Regionen",
          summary:
            "Operative Bruchstücke, Explosions-Trümmer und freigesetzte Hardware müssen unter einem definierten Verweildauer-Schwellwert für die LEO- (< 5 Jahre) und GEO-geschützten Regionen liegen.",
        },
        "§6 Casualty Risk": {
          title:
            "Casualty-Risk auf der Erdoberfläche ≤ 1×10⁻⁴ je Wiedereintritt",
          summary:
            "Aggregiertes Casualty-Risk aus unkontrolliertem und kontrolliertem Wiedereintritt darf die COPUOS-Basis von 1 in 10.000 nicht überschreiten.",
        },
      },
    },
  ],

  [
    "INT-OFAC-SDN-SPACE",
    {
      title:
        "US OFAC SDN-Liste und sektorale Sanktionen — Weltraumsektor-Entitäten",
      scopeDescription:
        "Referenz-Eintrag zu den wesentlichen US-Sanktionsinstrumenten mit Bezug zum Weltraumsektor: Executive Orders zur Sanktionierung russischer Weltraum-Verteidigungs-Entitäten (E.O. 14024 plus Änderungen), Iran/DPRK-Sanktionen, Cuba-Restriktionen sowie die SDN-Listen-übergreifende Reichweite.",
      provisions: {
        "E.O. 14024 (April 2021, geändert 2022+)": {
          title: "Russland-Befugnisse für 'harmful foreign activities'",
          summary:
            "Primäre US-Befugnis, unter der Roscosmos-Tochtergesellschaften, russische Weltraum-Verteidigungs-Entitäten und unterstützende Drittland-Netzwerke gelistet wurden. Listungen umfassen Asset-Freeze und Verbote für US-Personen.",
        },
        "31 CFR Part 510 (DPRK) und 31 CFR Part 560 (Iran)": {
          title: "Umfassende Länder-Sanktionen",
          summary:
            "DPRK- und Iran-Sanktionen sind nahezu umfassend: praktisch jede Weltraumsektor-Transaktion erfordert eine OFAC-General- oder Spezial-Lizenz, mit extraterritorialer Reichweite für US-Origin-Komponenten.",
        },
        "BIS Entity List (15 CFR Part 744 Supp. 4)": {
          title: "Exportkontroll-Listungen jenseits OFAC",
          summary:
            "Die BIS Entity List erfasst chinesische Weltraum-Verteidigungs-Entitäten, russische Weltraum-Liefer-Netzwerke und weitere Endnutzer, für die EAR-Lizenzanforderungen über die Standard-Kontrollliste hinaus gelten. Wird kontinuierlich aktualisiert.",
        },
      },
    },
  ],

  [
    "INT-UK-RUSSIA-REGS-2019",
    {
      title:
        "Russia (Sanctions) (EU Exit) Regulations 2019 — Russland-Sanktionen nach dem Brexit",
      scopeDescription:
        "Eigenständiges britisches Russland-Sanktions-Regime nach dem Brexit unter dem Sanctions and Anti-Money Laundering Act 2018. Reguliert Handels-, Finanz-, Einwanderungs-, Luftfahrzeug- und Schiff-Sanktionen gegen Russland. Seit Februar 2022 deutlich erweitert auf Weltraumsektor-spezifische Listungen.",
      provisions: {
        "Part 5 (Trade)": {
          title: "Handelssanktionen für Dual-Use- und Militärgüter",
          summary:
            "Verbietet Export, Re-Export, Lieferung, technische Hilfe und Vermittlung von Militär-, Dual-Use-, kritischen Industrie- und Infrastruktur-Items nach Russland. Erfasst die meisten Startfahrzeug- und Satelliten-Komponenten.",
        },
        "Reg. 19A-19F": {
          title: "Finanzsanktionen und Vermögenseinfrierungen",
          summary:
            "Vermögenseinfrierungs-Listungen umfassen Weltraumsektor-Entitäten und Personen. Operatoren müssen Vertragspartner gegen die OFSI Consolidated List der gelisteten Personen screenen.",
        },
      },
    },
  ],

  [
    "INT-UNGA-68-74-2013",
    {
      title:
        "Empfehlungen zur nationalen Gesetzgebung im Hinblick auf die friedliche Erforschung und Nutzung des Weltraums — Resolution 68/74",
      scopeDescription:
        "Legt die sieben Schlüsselelemente fest, die jedes nationale Weltraumgesetz adressieren sollte: (1) Anwendungsbereich; (2) Genehmigung und Lizenzierung; (3) fortlaufende Aufsicht; (4) Registrierung von Weltraumobjekten; (5) Haftung und Versicherung; (6) Sicherheit; (7) Eigentums- und Kontroll-Übertragung.",
      provisions: {
        "Anhang, Para. 2": {
          title: "Sieben Schlüsselelemente nationaler Weltraumgesetzgebung",
          summary:
            "(a) Anwendungsbereich; (b) Genehmigung; (c) fortlaufende Aufsicht; (d) Registrierung; (e) Haftung und Versicherung; (f) Sicherheit; (g) Übertragung von Eigentum und Kontrolle.",
        },
      },
    },
  ],

  [
    "INT-CN-EXPORT-LAW-2020",
    {
      title:
        "Exportkontrollgesetz der Volksrepublik China (mit den Dual-Use-Items-Exportkontroll-Verordnungen 2024)",
      scopeDescription:
        "Erstes umfassendes chinesisches Exportkontroll-Statut, teilweise an US-EAR orientiert. Erfasst Dual-Use-Items, Militärgüter, Nukleargüter und 'sonstige Güter, Technologien und Dienstleistungen' mit Bezug zur nationalen Sicherheit — ausdrücklich auf Raumfahrzeug- und verwandte Komponenten ausgedehnt.",
      provisions: {
        "Art. 12-15": {
          title: "Genehmigungspflicht und End-User/End-Use-Screening",
          summary:
            "Vom MIIT verwaltete Genehmigungen für die Ausfuhr von Items des Dual-Use-Items-Katalogs erforderlich. End-User- und End-Use-Erklärungen sind Pflicht; Falschaussagen sind eine Straftat.",
        },
        "Art. 18": {
          title: "Catch-all- und Unverified-End-User-Kontrollen",
          summary:
            "Items außerhalb des Katalogs benötigen dennoch eine Genehmigung, wenn der Exporteur weiß oder wissen sollte, dass sie für WMD, militärische Endnutzung in Restriktions-Ländern oder durch gelistete Endnutzer verwendet werden. Die Unverified-End-User-Liste erweitert die Reichweite.",
        },
        "Art. 48": {
          title: "Gegenmaßnahmen-Klausel",
          summary:
            "Ermächtigt zu retaliatorischen Exportkontroll-Maßnahmen gegen Jurisdiktionen, die 'diskriminierende' Kontrollen gegen chinesische Personen verhängen — die rechtliche Grundlage für Chinas reziproke Beschränkungen gegen US-Weltraumsektor-Pendants.",
        },
      },
    },
  ],

  // ─── Nicht-EU Weltraumgesetze ───────────────────────────────────────

  [
    "AU-SLR-ACT-2018",
    {
      title: "Space (Launches and Returns) Act 2018",
      scopeDescription:
        "Operatives australisches Start- und Rückführungs-Lizenzierungs-Statut. Ersetzte den Space Activities Act 1998; führte eine flexible Vier-Genehmigungs-Taxonomie ein (Australian Launch Facility, Launch, Return, Overseas Payload), ein Rückkehr-Regime und einen Hochleistungs-Raketen-Genehmigungspfad. Drittpartie-Haftungs-Indemnifikation gespiegelt am CSLA § 50914.",
      provisions: {
        "Part 3": {
          title: "Australian Launch Facility Licence",
          summary:
            "Der Betreiber einer australischen Startanlage benötigt eine ASA-Anlage-Lizenz mit Sicherheitsfall, der die Fähigkeit zur Aufnahme von Starts ohne unzumutbares Risiko für die Öffentlichkeit nachweist.",
        },
        "Part 4-5": {
          title: "Launch und Return Permits",
          summary:
            "Jeder Start und jede Rückkehr erfordert eine eigene ASA-Genehmigung, einschließlich Drittpartie-Haftpflicht-Versicherung, Trümmer-Vermeidungs-Analyse und CASA-koordinierter Luftraum-Freigabe.",
        },
        "Part 6": {
          title: "Overseas-Payload-Permit",
          summary:
            "Eine australisch kontrollierte Nutzlast, die von einer ausländischen Anlage gestartet wird, erfordert eine ASA-Overseas-Payload-Permit — erfasst australische Operatoren, die ausländische Trägerraketen nutzen.",
        },
        "Part 7": {
          title: "Haftung und Versicherung",
          summary:
            "Verpflichtende Drittpartie-Haftpflicht-Versicherung bis zur Maximum Probable Loss; Commonwealth-Indemnifikation oberhalb der Obergrenze, gespiegelt an der CSLA-§-50914-Architektur.",
        },
      },
    },
  ],

  [
    "CA-RSSSA-2005",
    {
      title: "Remote Sensing Space Systems Act",
      scopeDescription:
        "Kanadas primäres Statut für kommerzielle Weltraumtätigkeiten — eng zugeschnitten: deckt nur kommerzielle Erdbeobachtungs-Systeme oberhalb definierter Schwellwerte ab. Verhängt ein Lizenzierungs-Regime durch Global Affairs Canada, eine Shutter-Control-Befugnis aus nationalen Sicherheitsgründen und Endnutzer-Garantien für die Datenverteilung. Außerhalb der RSSSA-Reichweite (z.B. Kommunikation, Start) hat Kanada kein einheitliches Statut.",
      provisions: {
        "§ 8": {
          title: "Lizenzpflicht für Betrieb oder Verteilung",
          summary:
            "Niemand darf ein Fernerkundungs-Weltraumsystem betreiben oder Roh- oder verarbeitete Daten daraus verteilen ohne Lizenz des Außenministers.",
        },
        "§ 14": {
          title: "Bedingungen zur Datenverteilung",
          summary:
            "Lizenzen tragen Bedingungen zu Kunden-Screening, Area-of-Interest-Restriktionen, Auflösungs-Schwellwerten für den Export und einem Shutter-Control-Mechanismus, den der Minister aus Gründen der nationalen Sicherheit auslösen kann.",
        },
      },
    },
  ],

  [
    "CN-LAUNCH-REG-2002",
    {
      title:
        "Vorläufige Maßnahmen zur Verwaltung von Genehmigungen für zivile Starts",
      scopeDescription:
        "Operative zivile Start-Genehmigungs-Verordnung, herausgegeben vom Vorgänger der SASTIND. Bis zum Inkrafttreten eines umfassenden Weltraumgesetzes ist dieses Regelwerk von 2002 zusammen mit den Registrations-Maßnahmen (2001) und dem analogisch angewandten Zivilluftfahrtgesetz die primäre regulatorische Schicht.",
      provisions: {
        "Art. 5": {
          title: "Genehmigungspflicht für zivile Starts",
          summary:
            "Zivile Starts vom chinesischen Territorium oder durch chinesisch kontrollierte Startanbieter erfordern eine SASTIND-Genehmigung mit Bedingungen zu Sicherheit, finanzieller Verantwortung und Endnutzer-Screening.",
        },
      },
    },
  ],

  [
    "JP-BASIC-SPACE-LAW-2008",
    {
      title: "Basic Space Law",
      scopeDescription:
        "Verfassungsrechtlicher Anker des modernen japanischen Weltraumgesetz-Rahmens. Etabliert die Kabinetts-geführte Weltraumpolitik-Governance, öffnet die Tür zu Verteidigungs-orientierten Weltraumnutzungen (ein Bruch mit der vorherigen 'peaceful-purposes-only'-Doktrin von 2008) und mandatiert die Regierung, ein Space Activities Act zu erlassen — erfüllt durch das Space Activities Act 2016.",
      provisions: {
        "Art. 14": {
          title: "Mandat zum Erlass eines Space Activities Act",
          summary:
            "Verlangt von der Regierung, das Lizenzierungs-, Haftungs-, Versicherungs- und Trümmer-Vermeidungs-Regime für nichtstaatliche Weltraumtätigkeiten zu legifizieren — erfüllt durch das Space Activities Act 2016.",
        },
        "Art. 25-30": {
          title: "Strategisches Hauptquartier für Weltraumpolitik",
          summary:
            "Etabliert das Kabinetts-Strategisches-Hauptquartier unter Vorsitz des Premierministers, mit dem Office of National Space Policy als Sekretariat.",
        },
      },
    },
  ],

  [
    "KR-SPACE-DEV-PROMO-ACT",
    {
      title: "Space Development Promotion Act",
      scopeDescription:
        "Foundational koreanisches Weltraum-Förderungs-Statut, das das Lizenzierungs-Regime für Starts und On-Orbit-Operationen vom koreanischen Territorium oder durch koreanische Operatoren schafft. Etabliert das National Space Committee, das nationale Weltraumobjekt-Register und den technischen Prüfungsrahmen, den KASA von der vorherigen MSIT-Architektur übernimmt.",
      provisions: {
        "Art. 11": {
          title: "Genehmigung für Starts",
          summary:
            "Personen, die einen Weltraumobjekt-Start aus der Republik Korea oder eines koreanischen Weltraumobjekts von ausländischem Territorium beabsichtigen, müssen eine KASA-Genehmigung einholen. Bedingungen umfassen Sicherheit, technische Fähigkeit und Indemnifikations-Vereinbarungen.",
        },
        "Art. 8": {
          title: "Register von Weltraumobjekten",
          summary:
            "Verpflichtende Registrierung aller koreanisch gestarteten Weltraumobjekte im nationalen Register, in Erfüllung der koreanischen Verpflichtungen aus dem Registrierungsübereinkommen.",
        },
      },
    },
  ],

  [
    "KR-SPACE-LIABILITY-ACT",
    {
      title: "Space Liability Act",
      scopeDescription:
        "Innerstaatliche Umsetzung des Haftungsübereinkommens für koreanische Weltraumtätigkeiten. Etabliert ein verschuldensunabhängiges Haftungs-Regime für Startpersonen, eine verpflichtende Drittpartie-Haftpflicht-Versicherung bis zu einer vom Kabinett festgelegten Obergrenze und ein staatliches Indemnifikations-Rahmenwerk oberhalb dieser Grenze.",
      provisions: {
        "Art. 3": {
          title: "Verschuldensunabhängige Haftung für Erdoberflächen-Schäden",
          summary:
            "Startpersonen haften absolut für Schäden, die durch koreanische Weltraumobjekte auf der Erdoberfläche oder an Luftfahrzeugen im Flug verursacht werden — gespiegelt am Haftungsübereinkommen.",
        },
        "Art. 6-8": {
          title: "Versicherung und staatliche Indemnifikation",
          summary:
            "Verpflichtende Drittpartie-Haftpflicht-Versicherung bis zur kabinetts-festgelegten Obergrenze; staatliche Indemnifikation oberhalb der Versicherungs-Obergrenze, vorbehaltlich der Einhaltung der Bedingungen des Space Development Promotion Act.",
        },
      },
    },
  ],

  [
    "RU-SPACE-LAW-1993",
    {
      title: "Bundesgesetz über Raumfahrttätigkeit",
      scopeDescription:
        "Russlands primäres Statut für Raumfahrttätigkeiten. Etabliert das von Roscosmos verwaltete Lizenzierungs-Regime, mandatiert eine Drittpartie-Haftpflicht-Versicherung, regelt die staatliche Indemnifikation, führt das nationale Register von Weltraumobjekten und definiert den rechtlichen Status von Kosmonauten.",
      provisions: {
        "Art. 9-11": {
          title: "Lizenzierung von Raumfahrttätigkeiten",
          summary:
            "Roscosmos erteilt Lizenzen für Konstruktion, Herstellung, Tests, Start und Betrieb von Weltraumobjekten durch russische Stellen oder vom russischen Territorium aus. Lizenzen tragen Sicherheits-, Technik- und Finanz-Bedingungen.",
        },
        "Art. 25-29": {
          title: "Haftung und Versicherung",
          summary:
            "Verschuldensunabhängige Operator-Haftung für Erdoberflächen-Schäden; verpflichtende Drittpartie-Haftpflicht-Versicherung; staatliche Indemnifikation oberhalb der Operator-Versicherungs-Obergrenze.",
        },
        "Art. 18": {
          title: "Register von Weltraumobjekten",
          summary:
            "Verpflichtendes nationales Register russisch gestarteter Weltraumobjekte mit Notifikation an den UN-Generalsekretär gemäß Registrierungsübereinkommen.",
        },
      },
    },
  ],

  [
    "ZA-SPACE-AFFAIRS-ACT-1993",
    {
      title: "Space Affairs Act",
      scopeDescription:
        "Südafrikas primäres Statut für Weltraumtätigkeiten. Etabliert den SACSA-Council, das Lizenzierungs-Regime für Starts und On-Orbit-Operationen, das nationale Register und den Indemnifikations-Rahmen. Südafrika ist einer der wenigen afrikanischen Staaten mit einem dedizierten Weltraumgesetz.",
      provisions: {
        "§ 5-9": {
          title: "Lizenzpflicht für Weltraumtätigkeiten",
          summary:
            "Starts vom südafrikanischen Territorium und der Betrieb südafrikanisch kontrollierter Weltraumobjekte erfordern eine SACSA-Lizenz; der Council prüft technische, Sicherheits- und Finanz-Kriterien.",
        },
        "§ 13": {
          title: "Haftung und Versicherung",
          summary:
            "Verschuldensunabhängige Operator-Haftung für Erdoberflächen-Schäden; verpflichtende Drittpartie-Haftpflicht-Versicherung in vom Minister festgesetzter Höhe; staatliche Indemnifikation oberhalb der Versicherungs-Obergrenze.",
        },
      },
    },
  ],

  [
    "NZ-OSHAA-2017",
    {
      title: "Outer Space and High-altitude Activities Act 2017 (OSHAA)",
      scopeDescription:
        "Dediziertes nationales Weltraumgesetz Neuseelands, das sowohl orbitale (Weltraum-) als auch sub-orbitale (Hochhöhen-) Tätigkeiten erfasst. Schafft fünf Lizenzkategorien — Payload Permit, Launch Licence, Overseas Launch Licence, Facility Licence, Return Licence — und gibt der MBIE umfassende Befugnisse.",
      provisions: {
        "Part 2 (ss. 7–24)": {
          title: "Genehmigungs-Regime",
          summary:
            "Schafft die fünf OSHAA-Genehmigungen. Jede erfordert Operator-Eignungsprüfung, Risiko-/Sicherheits-Analyse, Trümmer-Vermeidungs-Plan, Versicherung/Indemnifikation und nationale-Interesse-Prüfung. Der Minister kann aus nationalen Sicherheitsgründen ablehnen.",
        },
        "s. 15 — Liability and indemnity": {
          title: "Crown-Indemnifikation mit Regress gegen Operatoren",
          summary:
            "Die NZ-Krone leistet internationale Haftungs-Übereinkommens-Ansprüche, hat aber Regress gegen den autorisierten Operator bis zur Versicherungs-Obergrenze in der jeweiligen Lizenz. Versicherungs-Schwellwerte werden typisch im Lizenzdokument festgelegt.",
        },
        "s. 30 — National interest grounds": {
          title: "Nationale-Sicherheits-Ablehnungs-Befugnis",
          summary:
            "Der Minister kann jede Genehmigung aus Gründen des nationalen Interesses ablehnen — ausdrücklich einschließlich Trümmer-Generierungs-Risiko, ausländischer Staats-Verbindung und Dual-Use-Technologie-Exposition.",
        },
        "s. 54 — High-altitude activities": {
          title: "Hochhöhen-Aktivitäts-Genehmigungs-Regime",
          summary:
            "Eigener Genehmigungspfad für stratosphärische Plattformen, sub-orbitale Fahrzeuge und Hochhöhen-Ballons. Ko-reguliert mit der CAA für die Luftraum-Integration.",
        },
      },
    },
  ],

  [
    "NZ-OSHAA-REGS-2017",
    {
      title:
        "Outer Space and High-altitude Activities (Authorisations) Regulations 2017",
      scopeDescription:
        "Durchführungs-Verordnungen unter OSHAA 2017 § 112. Spezifiziert Dokumentation, Gebühren und Verfahrensschritte für jede der fünf OSHAA-Genehmigungen. Definiert die Methodik der Missions-Risiko-Bewertung, den Inhalt des Trümmer-Vermeidungs-Plans und die Form der Versicherungs-Erklärungen.",
      provisions: {
        "Reg. 9": {
          title: "Payload-Permit-Dokumentation",
          summary:
            "Antragsteller müssen technische Nutzlast-Spezifikation, Bahnparameter, Spektrum-Nutzung, End-of-Life-Entsorgungs-Plan und ITU-Koordinations-Status liefern.",
        },
        "Reg. 14": {
          title: "Launch-Licence-Risiko-Analyse",
          summary:
            "Antragsteller reicht Failure-Mode-and-Effects-Analyse, Abbruch-Trajektorien, Casualty-Risk-Berechnung (Ziel ≤ 1×10⁻⁴) und Range-Safety-Koordination mit NZDF (wo anwendbar) ein.",
        },
        "Reg. 22": {
          title: "Trümmer-Vermeidungs-Plan",
          summary:
            "Jede Genehmigung muss von einem Trümmer-Vermeidungs-Plan begleitet sein, der mit COPUOS-Leitlinien (2007) und LTS-21 (2019) im Einklang steht. End-of-Life-Entsorgungs-Verpflichtungen sind lizenzbindend.",
        },
      },
    },
  ],

  [
    "NZ-TSA-2016",
    {
      title: "Neuseeland–USA Technology Safeguards Agreement (TSA)",
      scopeDescription:
        "Bilaterale Vereinbarung zwischen Neuseeland und den USA über die Behandlung US-ITAR-kontrollierter Weltraum-Technologie auf neuseeländischem Boden. Unterzeichnet am 3. Juni 2016 zur Unterstützung der Electron-Trägerraketen-Operationen von Rocket Lab (Rocket Lab ist US-domiziliert, startet aber von Neuseeland).",
      provisions: {
        "Art. 3": {
          title: "Anlagen-Zugangs-Kontrollen",
          summary:
            "Zugangs-beschränkte Zonen am Launch Complex 1 und in den Auckland-Rocket-Lab-Anlagen, mit gemeinsam von NZ/US verwalteten Freigabe-Listen.",
        },
        "Art. 7": {
          title: "Vorfall-Berichterstattung",
          summary:
            "Jede potenzielle ITAR-Kompromittierung wird gemeinsam von NZ MFAT-EC und US State DDTC innerhalb von 72 Stunden gemeldet und untersucht.",
        },
      },
    },
  ],

  [
    "IL-DEC-LAW-2007",
    {
      title: "Defense Export Control Law, 5767-2007",
      scopeDescription:
        "Primäres Statut zur Regulierung israelischer Verteidigungs- und Dual-Use-Exporte — erfasst Trägerraketen, raketen-fähige Antriebe, Satellitentechnologie und viele Raumfahrzeug-Komponenten. Operieren ohne DECA-Genehmigung für Items auf der Defense Export Control List ist eine Straftat.",
      provisions: {
        "§ 7-9": {
          title: "Genehmigungspflicht für kontrollierte Ausfuhren",
          summary:
            "Materielle und immaterielle Ausfuhren von Items auf den Defense- oder Dual-Use-Listen erfordern eine DECA-Genehmigung. Vermittlung, Technologie-Transfer und immaterielle Hilfeleistung sind ausdrücklich erfasst.",
        },
        "§ 17-22": {
          title: "Endnutzer-Zusicherungen",
          summary:
            "Genehmigungen enthalten Endnutzer-, Endnutzungs- und Re-Export-Bedingungen; DECA setzt fortlaufende Compliance durch Audits und Post-Shipment-Checks durch.",
        },
      },
    },
  ],

  [
    "IN-SPACE-POLICY-2023",
    {
      title: "Indische Weltraum-Politik 2023",
      scopeDescription:
        "Foundational-Politik, die End-to-End-Beteiligung nichtstaatlicher Stellen (NGEs) an indischen Weltraumtätigkeiten ermöglicht. Setzt IN-SPACe als Single-Window-Genehmigungsbehörde, definiert Rollen für ISRO (F&E), NSIL (kommerziell) und DOS (Politik) und öffnet den Weltraum für privates Kapital.",
      provisions: {
        "§ 4-5": {
          title: "Genehmigungs-Regime für NGEs",
          summary:
            "Alle nichtstaatlichen Weltraumtätigkeiten — Start, Satellitenfertigung und -betrieb, Bodenstationen, Downstream-Dienste — erfordern IN-SPACe-Genehmigung. IN-SPACe erteilt Norms, Guidelines and Procedures (NGP) als Anwendungs-Schicht.",
        },
        "§ 6": {
          title: "Ausländische Direktinvestitionen im Weltraumsektor",
          summary:
            "100 % FDI für Satelliten-Komponenten-Fertigung; 74 % automatischer Pfad für Satellitenfertigung/-betrieb/-daten; 49 % automatischer Pfad für Trägerraketen. Oberhalb dieser Schwellwerte ist Regierungsfreigabe erforderlich.",
        },
      },
    },
  ],

  [
    "IN-NGP-2024",
    {
      title:
        "IN-SPACe Norms, Guidelines and Procedures for Authorisation of Space Activities",
      scopeDescription:
        "Operatives Regelwerk, das die Politik 2023 in antragsreife Verfahren überführt. Definiert Genehmigungs-Klassen (Start, Satellitenbetrieb, Bodenstation, Kontrollübertragung etc.), Nachweis-Standards, Gebühren-Schedule, Indemnifikations-Schwellwerte und einen Genehmigungs-Compliance-Trail.",
      provisions: {
        "Part B": {
          title: "Genehmigungs-Klassen und Nachweise",
          summary:
            "Acht Genehmigungs-Klassen für Start, Satellitenbetrieb, Bodenstationen, In-Orbit-Services, Eigentums-/Kontroll-Übertragungen und Downstream-Anwendungen. Jede mit Nachweis-Vorlage, Gebühren und Verfahrens-Schritten.",
        },
        "Part D": {
          title: "Indemnifikation und Versicherung",
          summary:
            "Operator-Staats-Indemnifikations-Vorlage für Erdoberflächen-Schäden. Verpflichtende Drittpartie-Haftpflicht-Versicherung skaliert mit Missions-Risiko; IN-SPACe akzeptiert äquivalente Staats-zu-Staats-Garantie für partner-staatliche Missionen.",
        },
      },
    },
  ],

  [
    "TR-TUA-DECREE-2018",
    {
      title: "Präsidialdekret zur Errichtung der Türkischen Weltraumagentur",
      scopeDescription:
        "Etabliert die Türkische Weltraumagentur (TUA) und überträgt ihr die Koordinationsbefugnis über nationale Weltraumtätigkeiten. In Ermangelung eines dedizierten nationalen Weltraumgesetzes dient das dekret-basierte Mandat der TUA als quasi-regulatorische Funktion.",
      provisions: {
        Gesamtinstrument: {
          title:
            "TUA-Mandat — quasi-regulatorische Funktion ohne Weltraumgesetz",
          summary:
            "Etabliert die TUA und gibt ihr Koordinationsbefugnis über nationale Weltraumtätigkeiten. Ohne dediziertes nationales Weltraumgesetz dient das dekretbasierte Mandat als regulatorischer Ersatz, ergänzt durch sektorale Verordnungen aus Telekommunikation und Verteidigung.",
        },
      },
    },
  ],

  // ─── EU-Mitgliedstaaten — NIS2-Transpositionen ──────────────────────

  [
    "EE-NIS2-TRANSPOSITION",
    {
      title:
        "Cybersecurity-Gesetz-Änderung — NIS2-Transposition (Küberturvalisuse seaduse muutmise seadus)",
      scopeDescription:
        "Estnischer Entwurf zur Änderung des Küberturvalisuse seadus 2018 zur Umsetzung von NIS2 (Richtlinie (EU) 2022/2555). Estland verfehlte die Transpositionsfrist Oktober 2024; der Entwurf passierte 2024 die eelnõu-Konsultation, die vollständige Riigikogu-Annahme steht aus.",
      provisions: {
        "Art. 21 NIS2 / Entwurfs-§": {
          title: "Risikomanagement für wesentliche und wichtige Einrichtungen",
          summary:
            "Setzt die Risikomanagement-Pflichten aus NIS2 Art. 21 (Vorfallbehandlung, Lieferketten-Sicherheit, Verschlüsselung, Multi-Faktor-Authentifizierung, Geschäftskontinuität) für Satellitensektor-Einrichtungen in estnisches Recht um.",
        },
        "Art. 23 NIS2 / Entwurfs-§": {
          title: "24h/72h-Vorfallmeldung an RIA",
          summary:
            "Erhebliche Cybersicherheits-Vorfälle sind binnen 24 Stunden vorab und binnen 72 Stunden vollständig an die RIA zu melden, mit Abschlussbericht binnen eines Monats.",
        },
      },
    },
  ],

  [
    "IE-NIS2-TRANSPOSITION",
    {
      title: "National Cyber Security Bill 2024 — Irische NIS2-Transposition",
      scopeDescription:
        "Irisches Primärrecht zur Umsetzung von NIS2 (Richtlinie (EU) 2022/2555). Irland verfehlte die NIS2-Frist Oktober 2024; die EK gab im Mai 2025 eine begründete Stellungnahme ab. Der Bill schafft das National Cyber Security Centre auf statutarischer Grundlage und wendet NIS2-Pflichten auf benannte essential und important entities an.",
      provisions: {
        "Part 4 (essential and important entities)": {
          title: "Risikomanagement und Vorfallmeldung",
          summary:
            "Etabliert Risikomanagement-Maßnahmen entsprechend NIS2 Art. 21 und die 24h/72h/Ein-Monats-Meldekaskade an das NCSC für benannte Einrichtungen.",
        },
        "Part 6": {
          title: "Vollzug und Verwaltungsbußen",
          summary:
            "Sieht Verwaltungsbußen bis zu 10 Mio. EUR oder 2 % des globalen Umsatzes für essential entities vor; 7 Mio. EUR oder 1,4 % für important entities — gespiegelt an NIS2 Art. 34.",
        },
      },
    },
  ],

  [
    "PL-NIS2-TRANSPOSITION",
    {
      title:
        "Änderung des Gesetzes über das Nationale Cybersicherheits-System — Polnische NIS2-Transposition",
      scopeDescription:
        "Polnischer Entwurf einer Änderung der ustawa o krajowym systemie cyberbezpieczeństwa (KSC) von 2018 zur Umsetzung von NIS2. Polen verfehlte die Frist Oktober 2024; die Änderung befindet sich im parlamentarischen Verfahren mit mehreren Runden interministerieller Konsultation.",
      provisions: {
        "Art. 21 NIS2 (Transposition)": {
          title: "Risikomanagement für wesentliche und wichtige Einrichtungen",
          summary:
            "Richtet die polnischen KSC-Pflichten an NIS2 Art. 21 aus: Risikomanagement-Maßnahmen, Lieferketten-Sicherheit, Multi-Faktor-Authentifizierung, Geschäftskontinuität. Listungen werden voraussichtlich Satelliten-Operatoren und Bodensegment-Betreiber erfassen.",
        },
        "Art. 23 NIS2 (Transposition)": {
          title: "24h/72h-Vorfallmeldung",
          summary:
            "Erhebliche Cybersicherheits-Vorfälle sind binnen 24 Stunden vorab und binnen 72 Stunden vollständig an das sektorale CSIRT zu melden, mit Abschlussbericht binnen eines Monats.",
        },
      },
    },
  ],

  // ─── UK Konsultation Orbital Liability ──────────────────────────────

  [
    "UK-ORBITAL-LIABILITY-CONSULT-2023",
    {
      title:
        "UK-Konsultation zu Orbital-Haftungen, Versicherung, Gebühren und Weltraum-Nachhaltigkeit",
      scopeDescription:
        "UK-Regierungs-Konsultation zu Reformen der Haftungsregime des Outer Space Act 1986 und des Space Industry Act 2018. Vier Reform-Säulen: (1) variable Haftungs-Obergrenzen je Missions-Risiko, (2) modulierte Versicherungsanforderungen je Bahnklasse und Missionsprofil, (3) Charging-Modelle für CAA-Lizenzdienste, (4) verbindliche Sustainability-Lizenz-Kriterien.",
      provisions: {
        "Säule 1": {
          title: "Variable Haftungs-Obergrenzen",
          summary:
            "Ersetzt die aktuelle einheitliche Drittpartie-Haftungs-Obergrenze von 60 Mio. GBP durch variable Obergrenzen, die am Missions-Risikoprofil kalibriert sind (Bahn-Höhe, Konstellationsgröße, IOS vs. passiv).",
        },
        "Säule 2": {
          title: "Risiko-basierte Versicherungsanforderungen",
          summary:
            "Versicherungsanforderungen abgestuft nach Kollisionswahrscheinlichkeit, End-of-Life-Zuverlässigkeit und Active-Debris-Removal-Zusage.",
        },
        "Säule 4": {
          title: "Verbindliche Nachhaltigkeits-Lizenz-Kriterien",
          summary:
            "Operative Nachhaltigkeits-Metriken (Manöver-Datenteilung, End-of-Life-Zeitlinie, ADR-Bereitschaft) wechseln von der CAA-Leitlinien-Ebene auf verbindliche Lizenz-Bedingungen.",
        },
      },
    },
  ],

  // ─── FR Technische Regulierungs-Konsultation 2024 ───────────────────

  [
    "FR-TECHREG-CONSULT-2024",
    {
      title:
        "Französische Konsultation zur Aktualisierung der technischen Weltraum-Verordnung (RTF — Réglementation Technique Française)",
      scopeDescription:
        "Französische öffentliche Konsultation zu einer umfassenden Aktualisierung des Arrêté Technique 2011 zur Umsetzung des LOS 2008. Vorgeschlagene Reformen richten die französischen technischen Anforderungen am ESA Zero Debris Standard aus, führen ein verkürztes End-of-Life-Entsorgungs-Fenster ein und setzen konstellations-spezifische Verpflichtungen.",
      provisions: {
        "Section PMD": {
          title: "5-Jahres-End-of-Life-Entsorgung für LEO",
          summary:
            "Vorgeschlagene Verkürzung des LEO-End-of-Life-Entsorgungs-Fensters von 25 Jahren (Arrêté 2011) auf 5 Jahre — ausgerichtet an FCC 2022 und ESA Zero Debris Standard.",
        },
        "Section Constellations": {
          title: "Konstellations-spezifische Verpflichtungen",
          summary:
            "Neue Lizenzierungs-Schwellwerte und Zuverlässigkeits-Anforderungen für Konstellationen über 100 Satelliten; verpflichtende Offenlegung der Pro-Satelliten-Versagens-Rate.",
        },
        "Section IOS": {
          title: "Genehmigungsregime für In-Orbit-Servicing",
          summary:
            "Führt einen dedizierten technischen Rahmen für IOS-Operationen ein: Sicherheitsabstands-Anforderungen, Abbruch-Protokoll-Nachweis, Klienten-Zustimmungs-Dokumentation.",
        },
        "Section Ré-entrée": {
          title: "Casualty-Risk auf der Erde ≤ 1×10⁻⁴",
          summary:
            "Ausrichtung an COPUOS- und ESA-Schwellwerten: Casualty-Risk aus unkontrolliertem Wiedereintritt darf 1 von 10.000 je Ereignis nicht überschreiten.",
        },
      },
    },
  ],

  // ─── Treaty-Ratifikationen — kompakte Stub-Einträge ─────────────────
  // Jeder dieser Einträge spiegelt das gleiche Muster: Art. VI Staaten-
  // verantwortlichkeit / Art. II absolute Haftung / Art. II nationales
  // Register, jeweils mit jurisdiktions-spezifischer Implementierungs-
  // Notiz aus dem englischen Original.

  [
    "AE-OST-2000",
    {
      title:
        "Weltraumvertrag — Ratifikation der Vereinigten Arabischen Emirate",
      scopeDescription:
        "Die VAE ratifizierten den OST im Jahr 2000. Staaten-Verantwortlichkeits- und Registrierungs-Pflichten werden durch das Bundes-Dekret-Gesetz 12/2019 und das UAESA-Genehmigungs-Regime erfüllt. Die VAE sind außerdem Unterzeichner der Artemis Accords (Oktober 2020).",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Die VAE tragen die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten — erfüllt durch das UAESA-Genehmigungs-Rahmenwerk.",
        },
      },
    },
  ],

  [
    "AU-OST-1967",
    {
      title: "Weltraumvertrag — Australische Ratifikation",
      scopeDescription:
        "Australische Ratifikation des Weltraumvertrags 1967. Verankert die Staaten-Verantwortlichkeits- und Registrierungs-Pflichten, die das SLR Act 2018 innerstaatlich erfüllt. Australien ist außerdem Unterzeichner der Artemis Accords (2020).",
      provisions: {
        "Art. VI / VII": {
          title: "Staaten-Verantwortlichkeit und Haftung",
          summary:
            "Australien ist völkerrechtlich verantwortlich und haftbar für Schäden durch australisch gestartete Weltraumobjekte — erfüllt durch den Indemnifikations-Rahmen des SLR Act 2018.",
        },
      },
    },
  ],

  [
    "BR-OST-1969",
    {
      title: "Weltraumvertrag — Brasilianische Ratifikation",
      scopeDescription:
        "Brasilianische Ratifikation des OST. Die Pflichten aus Art. VI werden mangels eines umfassenden Primärgesetzes über inter-departementale Genehmigungs-Verfahren (AEB + DECEA) erfüllt. Brasilien unterzeichnete die Artemis Accords 2021.",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Brasilien ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten. Die innerstaatliche Genehmigung läuft über AEB und DECEA, ergänzt durch Verpflichtungen aus dem US-Brasilien-Technology-Safeguards-Agreement.",
        },
      },
    },
  ],

  [
    "CA-OST-1967",
    {
      title: "Weltraumvertrag — Kanadische Ratifikation",
      scopeDescription:
        "Kanadische Ratifikation des Weltraumvertrags 1967. Die Verpflichtung aus Art. VI wird teils durch das RSSSA (kommerzielle Erdbeobachtung) und teils durch Crown-Prerogative-Genehmigung für andere Weltraumtätigkeiten erfüllt — mangels eines umfassenden Statuts.",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Kanada ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten — Grundlage des RSSSA-Lizenzierungs-Regimes und der inter-departementalen Genehmigung außerhalb der RSSSA-Reichweite.",
        },
      },
    },
  ],

  [
    "CN-OST-1983",
    {
      title: "Weltraumvertrag — Chinesischer Beitritt",
      scopeDescription:
        "China trat dem OST 1983 bei. Die Pflichten aus Art. VI werden über die Maßnahmen 2001/2002 und (perspektivisch) das Entwurf-Weltraumgesetz erfüllt. China ist KEIN Unterzeichner der Artemis Accords und hat den Ressourcen-Extraktions-Rahmen der Accords abgelehnt.",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "China ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten — erfüllt über SASTIND/CNSA-Genehmigungs-Verfahren und (in Vorbereitung) das Entwurf-Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "EE-OST-ACCESSION",
    {
      title: "Weltraumvertrag — Estnischer Beitritt",
      scopeDescription:
        "Estland ist dem OST beigetreten. Es trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten, hat aber kein dediziertes nationales Weltraumgesetz — der regulatorische Rahmen stützt sich auf MKM-Verwaltungspraxis und allgemeines Verwaltungsrecht.",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Estland trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime — Estland hat kein dediziertes nationales Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "EE-LIABILITY",
    {
      title: "Haftungsübereinkommen — Estnischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Estland haftet absolut für Erdoberflächen-Schäden durch estnische Weltraumobjekte. Es gibt keinen dedizierten Weltraum-Versicherungs-Rahmen oder Regress-Obergrenze nach estnischem Recht. Private Operatoren tragen das Versicherungs-Risiko vertraglich.",
        },
      },
    },
  ],

  [
    "EE-REGISTRATION",
    {
      title: "Registrierungsübereinkommen — Estnischer Rahmen",
      provisions: {
        "Art. II": {
          title: "Nationales Register — über MKM, kein eigenständiges Statut",
          summary:
            "Estland führt sein nationales Register für Weltraumobjekte über MKM-Verwaltungspraxis statt durch ein dediziertes Registrierungs-Statut. ESTCube-1 (gestartet 7. Mai 2013, 1U CubeSat, Universität Tartu) ist das erste registrierte estnische Weltraumobjekt.",
        },
      },
    },
  ],

  [
    "HR-OST",
    {
      title: "Weltraumvertrag — Kroatische Sukzession / Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Kroatien trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime — Kroatien hat kein dediziertes nationales Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "HR-LIABILITY",
    {
      title: "Haftungsübereinkommen — Kroatische Sukzession / Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Kroatien haftet absolut für Erdoberflächen-Schäden durch kroatische Weltraumobjekte. Kein dedizierter Weltraum-Haftungs- oder -Versicherungs-Rahmen nach kroatischem Recht; allgemeine Gefährdungshaftungs-Bestimmungen der Civil Obligations Act greifen.",
        },
      },
    },
  ],

  [
    "HU-OST",
    {
      title: "Weltraumvertrag — Ungarische Ratifikation",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Ungarn trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime — Ungarn hat kein dediziertes nationales Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "HU-LIABILITY",
    {
      title: "Haftungsübereinkommen — Ungarische Ratifikation",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Ungarn haftet absolut für Erdoberflächen-Schäden durch ungarische Weltraumobjekte. Allgemeine Gefährdungs-Operations-Bestimmungen des Zivilgesetzbuchs greifen mangels dedizierter Weltraum-Haftungs-Vorschriften.",
        },
      },
    },
  ],

  [
    "IL-OST-1977",
    {
      title: "Weltraumvertrag — Israelische Ratifikation",
      scopeDescription:
        "Israelische Ratifikation des OST. Mangels eines umfassenden israelischen Weltraum-Statuts wird die Genehmigungs-Pflicht aus Art. VI über Kabinetts-Beschlüsse, ISA-Koordination und das Defense Export Control Law für hardware-bezogene Kontrollen erfüllt.",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Israel ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten — derzeit erfüllt über inter-ministerielle Koordination statt durch ein einheitliches Statut, in Erwartung des vorgeschlagenen Israel Space Activities Act.",
        },
      },
    },
  ],

  [
    "IN-OST-1982",
    {
      title: "Weltraumvertrag — Indische Ratifikation",
      scopeDescription:
        "Indische Ratifikation des OST. Verankert die Pflicht Indiens aus Art. VI zur Genehmigung und fortlaufenden Aufsicht nationaler Weltraumtätigkeiten — die völkerrechtliche Grundlage, die die Indische Weltraum-Politik 2023 und das IN-SPACe-NGP umsetzen.",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Indien ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten. Innerstaatlich erfüllt durch das IN-SPACe-Genehmigungs-Regime unter der Politik 2023 und dem NGP 2024.",
        },
      },
    },
  ],

  [
    "IS-OST",
    {
      title: "Weltraumvertrag — Isländischer Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — kein innerstaatlicher Rahmen",
          summary:
            "Island trägt die völkerrechtliche Verantwortung für etwaige nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime und faktisch keine kommerzielle Weltraumindustrie.",
        },
      },
    },
  ],

  [
    "IS-LIABILITY",
    {
      title: "Haftungsübereinkommen — Isländischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Island haftet absolut für Erdoberflächen-Schäden durch etwaige isländische Weltraumobjekte. Kein dedizierter Weltraum-Haftungs- oder Versicherungs-Rahmen. Mangels nennenswerter kommerzieller Weltraumtätigkeit hat die Haftungs-Exposition derzeit nur theoretische Bedeutung.",
        },
      },
    },
  ],

  [
    "KR-OST-1967",
    {
      title: "Weltraumvertrag — Koreanische Ratifikation",
      scopeDescription:
        "Koreanische Ratifikation des Weltraumvertrags 1967. Staaten-Verantwortlichkeits-Pflichten werden über das Space Development Promotion Act und das Space Liability Act erfüllt. Korea ist außerdem Unterzeichner der Artemis Accords (Mai 2021).",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Korea ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten — Grundlage des KASA-administrierten Genehmigungs-Regimes.",
        },
      },
    },
  ],

  [
    "LI-OST",
    {
      title: "Weltraumvertrag — Liechtensteiner Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — theoretische Exposition",
          summary:
            "Liechtenstein trägt die völkerrechtliche Verantwortung für etwaige nationale Weltraumtätigkeiten. In der Praxis bestehen keine innerstaatlichen Weltraumtätigkeiten, und kein Genehmigungs-Regime ist kodifiziert. Die Art.-VI-Exposition bleibt theoretisch.",
        },
      },
    },
  ],

  [
    "LI-LIABILITY",
    {
      title: "Haftungsübereinkommen — Liechtensteiner Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Liechtenstein haftet absolut für Erdoberflächen-Schäden durch Weltraumobjekte, bei denen es Startstaat oder Registrierungs-Staat ist. Kein innerstaatlicher Weltraum-Haftungs-Rahmen.",
        },
      },
    },
  ],

  [
    "LT-OST",
    {
      title: "Weltraumvertrag — Litauischer Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Litauen trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime — Litauen hat kein dediziertes nationales Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "LT-LIABILITY",
    {
      title: "Haftungsübereinkommen — Litauischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Litauen haftet absolut für Erdoberflächen-Schäden durch litauische Weltraumobjekte. Allgemeine Gefährdungshaftungs-Bestimmungen des Zivilgesetzbuchs greifen mangels dedizierter Weltraum-Haftungs-Vorschriften.",
        },
      },
    },
  ],

  [
    "LV-OST",
    {
      title: "Weltraumvertrag — Lettischer Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Lettland trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime — Lettland hat kein dediziertes nationales Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "LV-LIABILITY",
    {
      title: "Haftungsübereinkommen — Lettischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Lettland haftet absolut für Erdoberflächen-Schäden durch lettische Weltraumobjekte. Allgemeine Gefährdungshaftungs- oder verschuldensbasierte Bestimmungen des Civil Law greifen mangels dedizierter Vorschriften.",
        },
      },
    },
  ],

  [
    "NZ-OST-1968",
    {
      title: "Weltraumvertrag — Neuseeländischer Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — umgesetzt durch OSHAA 2017",
          summary:
            "Neuseeland trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Innerstaatlich umgesetzt durch das Outer Space and High-altitude Activities Act 2017, administriert von der NZ Space Agency unter MBIE.",
        },
        "Art. VIII": {
          title: "Hoheitsgewalt und Kontrolle — NZ-Register",
          summary:
            "Neuseeland behält die Hoheitsgewalt über Weltraumobjekte in seinem nationalen Register. Das Register wird von der NZ Space Agency geführt und über MFAT an UNOOSA übermittelt.",
        },
      },
    },
  ],

  [
    "NZ-LIABILITY-1974",
    {
      title: "Haftungsübereinkommen — Neuseeländische Ratifikation",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung an Erdoberfläche / Luftfahrzeugen im Flug",
          summary:
            "Neuseeland haftet absolut gegenüber anderen Staaten für Schäden, die auf der Erdoberfläche oder an Luftfahrzeugen im Flug durch neuseeländische Weltraumobjekte verursacht werden. Innerstaatliche Umsetzung umfasst Indemnifikations-Bestimmungen unter OSHAA 2017 § 15.",
        },
        "Art. III": {
          title: "Verschuldenshaftung im Weltraum",
          summary:
            "Für Schäden, die nicht auf der Erdoberfläche entstehen, gilt Verschuldenshaftung. Neuseeländische Operatoren müssen angemessene Space-Traffic-Management-Praxis (Konjunktions-Screening, Manöver-Fähigkeit) nachweisen.",
        },
      },
    },
  ],

  [
    "NZ-REGISTRATION-1978",
    {
      title: "Registrierungsübereinkommen — Neuseeländischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Neuseeländisches nationales Register — MBIE NZSA",
          summary:
            "Jedes Weltraumobjekt, das vom neuseeländischen Territorium oder durch einen neuseeländischen Staatsangehörigen gestartet wird, wird in das von der NZ Space Agency unter MBIE geführte nationale Register eingetragen und über MFAT an UNOOSA übermittelt.",
        },
      },
    },
  ],

  [
    "RO-OST-1968",
    {
      title: "Weltraumvertrag — Rumänischer Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Rumänien trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten (1967 als Volksrepublik Rumänien unterzeichnet, Kontinuität durch den Nachfolge-Staat ab 1989 bestätigt). Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime.",
        },
      },
    },
  ],

  [
    "RO-LIABILITY",
    {
      title: "Haftungsübereinkommen — Rumänischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Rumänien haftet absolut für Erdoberflächen-Schäden durch rumänische Weltraumobjekte. Kein dedizierter Weltraum-Haftungs- oder Versicherungs-Rahmen — allgemeine Gefährdungshaftungs-Bestimmungen des Zivilgesetzbuchs greifen.",
        },
      },
    },
  ],

  [
    "RU-OST-1967",
    {
      title:
        "Weltraumvertrag — UdSSR-/Russische-Föderations-Ratifikation (fortgeführt)",
      scopeDescription:
        "Die UdSSR war Original-Unterzeichner des OST 1967, und die Russische Föderation führt diese Ratifikation fort. Staaten-Verantwortlichkeits- und Registrierungs-Pflichten werden über das Bundesgesetz von 1993 über Raumfahrttätigkeit und Roscosmos-Verfahren erfüllt. Russland ist KEIN Unterzeichner der Artemis Accords.",
      provisions: {
        "Art. VI / VII": {
          title: "Staaten-Verantwortlichkeit und Haftung",
          summary:
            "Russland ist völkerrechtlich verantwortlich und haftbar für Schäden durch russisch gestartete Weltraumobjekte — erfüllt über das Bundesgesetz von 1993 über Raumfahrttätigkeit.",
        },
      },
    },
  ],

  [
    "SI-OST",
    {
      title: "Weltraumvertrag — Slowenische Sukzession / Beitritt",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Slowenien trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime — Slowenien hat kein dediziertes nationales Weltraumgesetz.",
        },
      },
    },
  ],

  [
    "SI-LIABILITY",
    {
      title: "Haftungsübereinkommen — Slowenischer Beitritt",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Slowenien haftet absolut für Erdoberflächen-Schäden durch slowenische Weltraumobjekte. Allgemeine Gefährdungshaftungs-Bestimmungen der Obligations Code greifen mangels dedizierter Weltraum-Haftungs-Vorschriften.",
        },
      },
    },
  ],

  [
    "SK-OST",
    {
      title:
        "Weltraumvertrag — Slowakische Republik (Tschechoslowakische Sukzession)",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — keine innerstaatliche Umsetzung",
          summary:
            "Die Slowakei trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten (über Tschechoslowakische Sukzession 1993). Es gibt jedoch KEIN innerstaatliches Genehmigungs-Regime.",
        },
      },
    },
  ],

  [
    "SK-LIABILITY",
    {
      title:
        "Haftungsübereinkommen — Slowakische Republik (Tschechoslowakische Sukzession)",
      provisions: {
        "Art. II": {
          title: "Absolute Haftung — kein innerstaatlicher Rahmen",
          summary:
            "Die Slowakei haftet absolut für Erdoberflächen-Schäden durch slowakische Weltraumobjekte. Allgemeine Gefährdungshaftungs-Bestimmungen des Zivilgesetzbuchs greifen mangels dedizierter Weltraum-Haftungs-Vorschriften.",
        },
      },
    },
  ],

  [
    "TR-OST",
    {
      title: "Weltraumvertrag — Türkische Ratifikation",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit — TUA als Koordinator",
          summary:
            "Die Türkei trägt die völkerrechtliche Verantwortung für nationale Weltraumtätigkeiten. Mangels eines dedizierten Weltraumgesetzes koordiniert die TUA die Genehmigung über ihr präsidial-dekret-basiertes Mandat, ergänzt durch sektorale Verordnungen.",
        },
      },
    },
  ],

  [
    "TR-LIABILITY",
    {
      title: "Haftungsübereinkommen — Türkische Ratifikation",
      provisions: {
        "Art. II": {
          title:
            "Absolute Haftung — kein dediziertes Weltraum-Versicherungs-Rahmenwerk",
          summary:
            "Die Türkei haftet absolut für Erdoberflächen-Schäden durch türkische Weltraumobjekte. Kein dedizierter Weltraum-Haftungs- oder Versicherungs-Rahmen; allgemeine Bestimmungen des türkischen Obligationenrechts greifen.",
        },
      },
    },
  ],

  [
    "ZA-OST-1968",
    {
      title: "Weltraumvertrag — Südafrikanische Ratifikation",
      scopeDescription:
        "Südafrikas Ratifikation des OST. Staaten-Verantwortlichkeits- und Registrierungs-Pflichten werden über das Space Affairs Act 1993 und SACSA-Verfahren erfüllt. Südafrika ist KEIN Unterzeichner der Artemis Accords (Stand April 2026).",
      provisions: {
        "Art. VI": {
          title: "Staaten-Verantwortlichkeit und Genehmigung",
          summary:
            "Südafrika ist völkerrechtlich verantwortlich für nationale Weltraumtätigkeiten — erfüllt über das Lizenzierungs-Rahmenwerk des Space Affairs Act 1993.",
        },
      },
    },
  ],
]);

// ─── Authority Translations ──────────────────────────────────────────

export const AUTHORITY_TRANSLATIONS_DE = new Map<string, TranslatedAuthority>([
  // German Authorities (8)
  [
    "DE-BMWK",
    {
      name: "Bundesministerium für Wirtschaft und Klimaschutz",
      mandate:
        "Federführendes Ministerium für Weltraumpolitik. Künftige Genehmigungsbehörde unter einem nationalen Weltraumgesetz. Derzeit zuständig für die SatDSiG-Umsetzung und koordiniert die Raumfahrtagentur-Rolle des DLR.",
    },
  ],
  [
    "DE-DLR",
    {
      name: "Deutsches Zentrum für Luft- und Raumfahrt — Raumfahrtagentur",
      mandate:
        "Verwaltet das deutsche nationale Raumfahrtprogramm im Auftrag des BMWK. Vertritt Deutschland in der ESA-Governance. Erstellt technische Bewertungen für Genehmigungsentscheidungen. Betreibt das German Space Situational Awareness Centre (GSSAC).",
    },
  ],
  [
    "DE-BAFA",
    {
      name: "Bundesamt für Wirtschaft und Ausfuhrkontrolle",
      mandate:
        "Zuständige Behörde für SatDSiG-Genehmigungen (hochauflösende Erdbeobachtung). Verwaltet Dual-Use- und militärische Ausfuhrkontrollen für Weltraumtechnologie nach AWG/AWV und EU-Verordnung 2021/821.",
    },
  ],
  [
    "DE-BSI",
    {
      name: "Bundesamt für Sicherheit in der Informationstechnik",
      mandate:
        "IT-Sicherheitskonformitätsbewertungen nach SatDSiG (TR-03140). Veröffentlicht TR-03184 (Raumsegment + Bodensegment Cybersicherheit). Nationale NIS2-Aufsichtsbehörde für kritische Infrastrukturen einschließlich Raumfahrtsektor (BSIG §§ 30-31).",
    },
  ],
  [
    "DE-BNETZA",
    {
      name: "Bundesnetzagentur",
      mandate:
        "Weist Funkfrequenzen für Satellitenkommunikation, TT&C und Nutzlastverbindungen nach TKG § 91 zu. Reicht ITU-Anmeldungen im Auftrag deutscher Betreiber ein. Erteilt Spektrumlizenzen. Setzt TK-Sicherheitsanforderungen durch (TKG § 165).",
    },
  ],
  [
    "DE-LBA",
    {
      name: "Luftfahrt-Bundesamt",
      mandate:
        "Regelt den Transit von Trägerraketen durch den deutschen Luftraum nach LuftVG § 1(2). Erteilt Luftraumsperrverfügungen und koordiniert mit der militärischen Flugsicherung für Startfenster.",
    },
  ],
  [
    "DE-BMVG",
    {
      name: "Bundesministerium der Verteidigung — Weltraumkommando",
      mandate:
        "Betreibt das Weltraumkommando (Space Command) in Uedem für militärische Weltraumlageerfassung. Zuständig für Bundeswehr-Satellitensysteme und Weltraumsicherheitspolitik.",
    },
  ],
  [
    "DE-AA",
    {
      name: "Auswärtiges Amt",
      mandate:
        "Vertritt Deutschland im UN-COPUOS und anderen internationalen Weltraumrechtsforen. Zuständig für Vertragsratifizierungsprozesse und diplomatische Aspekte von Weltraumaktivitäten (Einhaltung Art. VI Weltraumvertrag).",
    },
  ],

  // French Authorities (15)
  [
    "FR-CNES",
    {
      name: "Nationales Zentrum für Weltraumforschung (CNES)",
      mandate:
        "Französische Weltraumagentur und technische Behörde nach der LOS 2008. Führt das nationale Weltraumgegenstandsregister. Übt die police spéciale am CSG aus. Erstellt technische Bewertungen für Genehmigungsentscheidungen. Budget ca. 3 Mrd. €.",
    },
  ],
  [
    "FR-CDE",
    {
      name: "Weltraumkommando (Commandement de l'Espace)",
      mandate:
        "Militärisches Weltraumoperationskommando. Führt Weltraumlageerfassung (SSA), aktive Weltraumverteidigung und Weltraumüberwachung durch.",
    },
  ],
  [
    "FR-DGA",
    {
      name: "Generaldirektion für Rüstung (DGA)",
      mandate:
        "Militärische Weltraumbeschaffung und Dual-Use-Technologiekontrolle. Verwaltet die Beschaffung militärischer Satellitensysteme (CSO, Syracuse, CERES).",
    },
  ],
  [
    "FR-DGAC",
    {
      name: "Generaldirektion für Zivilluftfahrt (DGAC)",
      mandate:
        "Verwaltet Luftraumbeschränkungen bei Starts vom CSG und koordiniert NOTAMs für Startfenster.",
    },
  ],
  [
    "FR-ARCEP",
    {
      name: "Regulierungsbehörde für elektronische Kommunikation (ARCEP)",
      mandate:
        "Satelliten-Frequenzgenehmigungen nach dem Code des postes et des communications électroniques. Reguliert Satellitenbreitbandbetreiber.",
    },
  ],
  [
    "FR-ANFR",
    {
      name: "Nationale Frequenzagentur (ANFR)",
      mandate:
        "Reicht ITU-Frequenzmeldungen und Koordinierungsanträge im Auftrag Frankreichs ein. Verwaltet die nationale Frequenzzuteilungstabelle. Koordiniert die Spektrumnutzung zwischen zivilen, militärischen und wissenschaftlichen Nutzern.",
    },
  ],
  [
    "FR-ANSSI",
    {
      name: "Nationale Agentur für Cybersicherheit (ANSSI)",
      mandate:
        "Cybersicherheitsbehörde für den Weltraumsektor. Beaufsichtigt Betreiber vitaler Bedeutung (OIV) im Raumfahrtsektor. Benannte nationale NIS2-Behörde unter der Loi Résilience. Erstellt Sicherheitsrahmenwerke und führt Audits kritischer Weltrauminfrastruktur durch.",
    },
  ],
  [
    "FR-CNIL",
    {
      name: "Nationale Kommission für Informatik und Freiheiten (CNIL)",
      mandate:
        "Datenschutzbehörde für Erdbeobachtungsdaten mit personenbezogenen Implikationen. Setzt die DSGVO und das Loi Informatique et Libertés für satellitengestützte Geodatenverarbeitung durch.",
    },
  ],
  [
    "FR-SGDSN",
    {
      name: "Generalsekretariat für nationale Verteidigung und Sicherheit (SGDSN)",
      mandate:
        "Koordiniert die nationale Weltraumsicherheitspolitik. Verwaltet das EO-Datenregime unter LOS Art. 23-25. Verfasser der Stratégie Nationale Spatiale 2025-2040. Vorsitz der CIEEMG (Verteidigungsexportkommission).",
    },
  ],
  [
    "FR-MINARMES",
    {
      name: "Verteidigungsministerium (Ministère des Armées)",
      mandate:
        "Weltraumverteidigungspolitik. Verfasser der Stratégie Spatiale de Défense (2019). Mitaufsicht über das CNES. Zuständig für die Weltrauminvestition des Militärprogrammgesetzes (10,2 Mrd. € bis 2030).",
    },
  ],
  [
    "FR-MINECO",
    {
      name: "Wirtschaftsministerium — Generaldirektion für Unternehmen (MinÉco/DGE)",
      mandate:
        "Federführend für Weltraumindustriepolitik. Verwaltet France-2030-Weltrauminvestitionen (1,5 Mrd. € unter Ziel 9). Dual-Use-Ausfuhrkontrollen über SBDU und die EGIDE-Plattform.",
    },
  ],
  [
    "FR-MESR",
    {
      name: "Ministerium für Hochschulbildung und Forschung (MESR)",
      mandate:
        "Hauptaufsichtsministerium über das CNES. Beaufsichtigt die Bestimmungen des Forschungsgesetzbuchs über Auftrag, Organisation und Governance der Weltraumagentur.",
    },
  ],
  [
    "FR-ASN",
    {
      name: "Behörde für nukleare Sicherheit (ASN)",
      mandate:
        "Nukleare Sicherheit für nuklearbetriebene Raumfahrzeuge und Radioisotopen-Thermoelektrik-Generatoren (RTGs). Aufsicht über Missionen mit Nuklearmaterialien unter französischer Hoheitsgewalt.",
    },
  ],
  [
    "FR-PREFET-GUYANE",
    {
      name: "Präfekt der Region Guyana",
      mandate:
        "Gebietskörperschaft für das CSG in Kourou. Koordiniert lokale Sicherheit, ICPE-Genehmigungen (klassifizierte Anlagen), SEVESO-Aufsicht und Umweltschutz für Startoperationen.",
    },
  ],
  [
    "FR-DRM",
    {
      name: "Militärischer Nachrichtendienst (DRM)",
      mandate:
        "Kontrolle militärischer Satellitennutzlasten und Nachrichtenauswertung. Betreibt Bildaufklärung (IMINT) der CSO-Konstellation. Prüft militärische Nutzlastgenehmigungen.",
    },
  ],

  // UK Authorities (14)
  [
    "UK-CAA",
    {
      name: "Zivilluftfahrtbehörde (Weltraumregulierung) (CAA)",
      mandate:
        "Britische Weltraumaufsichtsbehörde seit Juli 2021. Erteilt alle Weltraumlizenzen nach dem SIA 2018 und Übersee-Aktivitätslizenzen nach dem OSA 1986. Zuständig für Betreiber-, Weltraumhafen-, Leitstand- und Orbitalbetriebslizenzierung.",
    },
  ],
  [
    "UK-UKSA",
    {
      name: "UK Space Agency (UKSA)",
      mandate:
        "Politik, Programmabwicklung und internationale Vertretung. Exekutivagentur des DSIT. Verwaltet die britische Teilnahme an ESA-Programmen. Führt das UK Registry of Space Objects. Zusammenführung mit DSIT ab April 2026.",
    },
  ],
  [
    "UK-OFCOM",
    {
      name: "Kommunikationsaufsichtsbehörde (Ofcom)",
      mandate:
        "Satellitenspektrumlizenzierung und ITU-Anmeldungen im Auftrag britischer Betreiber. Reguliert Satellitenrundfunk und -breitband. Erteilt Wireless-Telegraphy-Act-Lizenzen.",
    },
  ],
  [
    "UK-ECJU",
    {
      name: "Gemeinsame Ausfuhrkontrollstelle (ECJU)",
      mandate:
        "Lizenzierung der Ausfuhr von Weltraumtechnologie. Verwaltet britische Ausfuhrkontrollen für militärische und Dual-Use-Güter einschließlich Raumfahrzeuge und Satellitenkomponenten.",
    },
  ],
  [
    "UK-SPACECOMMAND",
    {
      name: "UK Space Command",
      mandate:
        "Militärische Weltraumoperationen, Weltraumlageerfassung (SDA) und Skynet-Satellitenkommunikation. Gegründet 1. April 2021, Hauptquartier RAF High Wycombe.",
    },
  ],
  [
    "UK-NCSC",
    {
      name: "Nationales Zentrum für Cybersicherheit (NCSC)",
      mandate:
        "Cybersicherheitsleitlinien für Weltraumsysteme. Teil von GCHQ. Berät die CAA zu Cybersicherheitsaspekten von Lizenzanträgen.",
    },
  ],
  [
    "UK-HSE",
    {
      name: "Arbeitsschutzbehörde (HSE)",
      mandate:
        "Sicherheitsregulierung an Startplätzen. Setzt COMAH-Vorschriften für Raketentreibstofflagerung durch. Beaufsichtigt Sprengstoffvorschriften für Feststoffraketenmotoren an Weltraumhäfen.",
    },
  ],
  [
    "UK-ICO",
    {
      name: "Büro des Informationsbeauftragten (ICO)",
      mandate:
        "Datenschutzbehörde für Erdbeobachtungsbilder mit personenbezogenen Implikationen. Setzt die UK-DSGVO und das Datenschutzgesetz 2018 für satellitengestützte Geodatenverarbeitung durch.",
    },
  ],
  [
    "UK-AAIB",
    {
      name: "Unfalluntersuchungsstelle für Luftfahrt / Weltraumunfalluntersuchungsbehörde (AAIB/SAIA)",
      mandate:
        "Untersuchung von Weltraumunfällen. Das SIA 2018 s.20 und SI 2021/793 schaffen die SAIA innerhalb des bestehenden AAIB-Rahmens.",
    },
  ],
  [
    "UK-DSIT",
    {
      name: "Ministerium für Wissenschaft, Innovation und Technologie (DSIT)",
      mandate:
        "Gesamte zivile Weltraumpolitik. Übergeordnetes Ministerium der UKSA. Zuständig für die Nationale Weltraumstrategie und Regulierungsreform.",
    },
  ],
  [
    "UK-DFT",
    {
      name: "Verkehrsministerium (DfT)",
      mandate:
        "SIA-2018-Regulierungspolitik. Erteilt Zustimmungen des Staatssekretärs für suborbitale Raumfahrtlizenzen.",
    },
  ],
  [
    "UK-MOD",
    {
      name: "Verteidigungsministerium (MOD)",
      mandate:
        "Verteidigungsweltraumpolitik und Defence Space Portfolio. Beaufsichtigt UK Space Command. Zuständig für Skynet-Militärsatellitenkommunikation.",
    },
  ],
  [
    "UK-NSPOC",
    {
      name: "Nationales Weltraumoperationszentrum (NSpOC)",
      mandate:
        "Gegründet Mai 2024, RAF High Wycombe. Etwa 70 Mitarbeiter. Bietet Weltraumlageerfassung (SSA) und Weltraumüberwachungsdienste für das Vereinigte Königreich.",
    },
  ],
  [
    "UK-MCA",
    {
      name: "Seefahrts- und Küstenwachebehörde (MCA)",
      mandate:
        "Sicherheit im Seebereich und maritime Sperrgebiete bei Starts. Koordiniert Schiffsfreigabe und maritime Sicherheit für Start- und Wiedereintrittsoperationen.",
    },
  ],

  // Italian Authorities (14)
  [
    "IT-PDC",
    {
      name: "Präsidentschaft des Ministerrats (PdCM)",
      mandate:
        "Oberste Genehmigungsbehörde für Weltraumaktivitäten im italienischen Rahmen. Legge 7/2018 benennt den PdCM als höchstes Weltraum-Governance-Organ, verstärkt durch Legge 89/2025.",
    },
  ],
  [
    "IT-ASI",
    {
      name: "Italienische Weltraumagentur (ASI)",
      mandate:
        "Technische Regulierungsbehörde für Weltraumaktivitäten. Führt 60-tägige technische Bewertung von Genehmigungsanträgen nach Legge 89/2025 Art. 11 durch. Führt das nationale Weltraumgegenstandsregister nach Art. 14. Beaufsichtigt die laufende Compliance genehmigter Betreiber.",
    },
  ],
  [
    "IT-COMINT",
    {
      name: "Interministerieller Ausschuss für Weltraumpolitik (COMINT)",
      mandate:
        "Politikkoordinierung und strategische Planung für den nationalen Raumfahrtsektor. Genehmigt das Documento Strategico di Politica Spaziale Nazionale.",
    },
  ],
  [
    "IT-MIMIT",
    {
      name: "Ministerium für Unternehmen und Made in Italy (MIMIT)",
      mandate:
        "Industrielle Weltraumpolitik, Verwaltung des Fondo per l'Economia dello Spazio, Satelliten-Frequenzkoordinierung.",
    },
  ],
  [
    "IT-MINDIFESA",
    {
      name: "Verteidigungsministerium / Weltraumoperationskommando (MinDifesa)",
      mandate:
        "Militärische Weltraumoperationen, Dual-Use-Weltraumsysteme. Legge 89/2025 Art. 28 nimmt Verteidigungs- und Nachrichtendienstaktivitäten ausdrücklich vom zivilen Genehmigungsregime aus.",
    },
  ],
  [
    "IT-MAECI-UAMA",
    {
      name: "Außenministerium / Einheit für Rüstungsgütergenehmigungen (MAECI/UAMA)",
      mandate:
        "Ausfuhrkontrollbehörde für militärische Güter (L. 185/1990) und Dual-Use-Güter (D.Lgs. 221/2017). Die UAMA erteilt Ausfuhrgenehmigungen für Raumfahrzeugkomponenten und Trägertechnologie.",
    },
  ],
  [
    "IT-AGCOM",
    {
      name: "Behörde für Kommunikationsgarantien (AGCOM)",
      mandate:
        "Satelliten-Frequenzregulierung und -lizenzierung. Verwaltet Spektrumzuteilungen für Satellitendienste. Koordiniert ITU-Anmeldungen für italienische Satellitennetzwerke.",
    },
  ],
  [
    "IT-ACN",
    {
      name: "Nationale Agentur für Cybersicherheit (ACN)",
      mandate:
        "Cybersicherheitsbehörde für den Weltraumsektor. Zuständige NIS2-Behörde, die Raumfahrt als Sektor hoher Kritikalität einstuft. Beaufsichtigt den Perimetro di Sicurezza Nazionale Cibernetica für Weltraumbodenstationen und Missionskontrollzentren.",
    },
  ],
  [
    "IT-GARANTE",
    {
      name: "Datenschutzbehörde (Garante)",
      mandate:
        "Datenschutzbehörde für Erdbeobachtungsbilder und satellitengestützte personenbezogene Daten. Setzt die DSGVO und den Codice Privacy für weltraumbezogene Datenverarbeitung durch.",
    },
  ],
  [
    "IT-ENAC",
    {
      name: "Nationale Zivilluftfahrtbehörde (ENAC)",
      mandate:
        "Suborbitale Raumfahrtlizenzierung und Weltraumhafenregulierung. Hat die SASO-Verordnungen 2023 für den Weltraumhafen Grottaglie erlassen.",
    },
  ],
  [
    "IT-MUR",
    {
      name: "Ministerium für Universität und Forschung (MUR)",
      mandate:
        "Aufsichtsministerium über die ASI. Genehmigt den dreijährigen Tätigkeitsplan und Haushalt der ASI.",
    },
  ],
  [
    "IT-MASE",
    {
      name: "Ministerium für Umwelt und Energiesicherheit (MASE)",
      mandate:
        "Umweltverträglichkeitsprüfungsbehörde (VIA) für Weltraumaktivitäten. Verwaltet die Umweltgesetzgebung für Startplatz-Umweltprüfungen und Treibstoffhandhabung (Seveso III).",
    },
  ],
  [
    "IT-COS",
    {
      name: "Weltraumoperationskommando (COS)",
      mandate:
        "Militärisches Weltraumoperationskommando. Gegründet Juni 2020 innerhalb der Aeronautica Militare. Verwaltet SICRAL-Satellitenkommunikation und COSMO-SkyMed-Erdbeobachtung.",
    },
  ],
  [
    "IT-DIS",
    {
      name: "Abteilung für Sicherheitsinformationen (DIS)",
      mandate:
        "Nachrichtendienstkoordinierung. Für Nachrichtendienstzwecke durchgeführte Weltraumaktivitäten sind nach Legge 89/2025 Art. 28 ausdrücklich vom zivilen Genehmigungsregime ausgenommen.",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LUXEMBOURG AUTHORITIES
  // ═══════════════════════════════════════════════════════════════════

  [
    "LU-LSA",
    {
      name: "Luxemburgische Weltraumagentur (LSA)",
      mandate:
        "Operative Weltraumagentur, gegründet als Stiftung am 8. Juli 2021, unter der Aufsicht des Wirtschaftsministeriums. Bearbeitet Genehmigungsanträge nach den Weltraumgesetzen 2017 und 2020. Führt das nationale Register der Weltraumgegenstände. Leitet die SpaceResources.lu-Initiative. CEO: Marc Serres.",
    },
  ],
  [
    "LU-MECO",
    {
      name: "Wirtschaftsministerium",
      mandate:
        "Erteilt und entzieht Genehmigungen für Weltraumtätigkeiten und Weltraumressourcenerkundung/-nutzung per arrêté ministériel. Letzte Entscheidungsinstanz nach den Weltraumgesetzen 2017 und 2020.",
    },
  ],
  [
    "LU-ILR",
    {
      name: "Luxemburgisches Regulierungsinstitut (ILR)",
      mandate:
        "Frequenzverwaltung und Satellitenfrequenzkoordination. Verwaltet Funkfrequenzzuweisungen für Satellitenbetreiber. Zuständig für NIS-Registrierungen im Rahmen des Cybersicherheitsrechts.",
    },
  ],
  [
    "LU-SMC",
    {
      name: "Dienst für Medien, Konnektivität und Digitalpolitik (SMC)",
      mandate:
        "Konzessionen für Satellitensysteme und Frequenz-/Orbitalpositionskonzessionen. Verwaltet den regulatorischen Rahmen für luxemburgische Satellitensysteme einschließlich Konzessionsvereinbarungen mit SES.",
    },
  ],
  [
    "LU-CSSF",
    {
      name: "Finanzaufsichtskommission (CSSF)",
      mandate:
        "Finanzaufsicht über börsennotierte Weltraumunternehmen (SES S.A.) und Weltrauminvestitionsfonds. Reguliert das Governance-Modell des Finanzplatzes, das vom Weltraumressourcengesetz 2017 (Art. 7-9) übernommen wurde.",
    },
  ],
  [
    "LU-CNPD",
    {
      name: "Nationale Kommission für Datenschutz (CNPD)",
      mandate:
        "DSGVO-Compliance für Weltraumdatenverarbeitung. Setzt Datenschutzverpflichtungen für Erdbeobachtungsbilder und satellitengestützte Daten mit personenbezogenen Datenimplikationen durch.",
    },
  ],
  [
    "LU-DEFENCE",
    {
      name: "Direktion für Verteidigung",
      mandate:
        "Militärische Satellitenkommunikation über die GovSat-Partnerschaft (LuxGovSat S.A.). NATO-Weltraumdomänenkoordination. Verwaltet Luxemburgs Teilnahme an NATO- und EU-Verteidigungsweltraumprogrammen.",
    },
  ],
  [
    "LU-OCEIT",
    {
      name: "Amt für Export-, Import- und Transitkontrolle (OCEIT)",
      mandate:
        "Exportlizenzen für Dual-Use-Güter und Verteidigungsprodukte. Verwaltet Exportkontrollen nach dem Gesetz vom 27. Juni 2018 für Satellitenkomponenten, Verschlüsselungstechnologie und weltraumbezogene Güter.",
    },
  ],
  [
    "LU-MAE",
    {
      name: "Ministerium für auswärtige und europäische Angelegenheiten",
      mandate:
        "Internationale Weltraumdiplomatie und Vertragsverhandlungen. Vertritt Luxemburg im UN-COPUOS, bei den Artemis Accords und in bilateralen Weltraumkooperationsabkommen.",
    },
  ],
  [
    "LU-HCPN",
    {
      name: "Hochkommissariat für Landesschutz (HCPN)",
      mandate:
        "Nationale Cybersicherheitspolitik und Schutz kritischer Infrastrukturen. Koordiniert Luxemburgs Reaktion auf Cyberbedrohungen gegen Weltraumsysteme und Satelliten-Bodeninfrastruktur.",
    },
  ],
  [
    "LU-ESRIC",
    {
      name: "Europäisches Innovationszentrum für Weltraumressourcen (ESRIC)",
      mandate:
        "Weltweit erstes Innovationszentrum für Weltraumressourcen, gegründet August 2020. Gemeinsame Initiative von LSA, Luxembourg Institute of Science and Technology (LIST) und ESA. Betreibt Forschung und unterstützt Start-ups bei der Weltraumressourcennutzung.",
    },
  ],

  // Netherlands Authorities (15)
  [
    "NL-NSO",
    {
      name: "Niederländisches Raumfahrtbüro (NSO)",
      mandate:
        "Nationale Raumfahrtagentur und primäre Kontaktstelle für die Lizenzierung von Weltraumtätigkeiten unter dem WRA 2007. Verwaltet das niederländische Raumfahrtprogramm, die ESA-Delegation und die internationale Zusammenarbeit. Führt das nationale Register der Weltraumgegenstände (zweiteilig: aktiv + außer Dienst gestellt).",
    },
  ],
  [
    "NL-EZK",
    {
      name: "Ministerium für Wirtschaft und Klimapolitik",
      mandate:
        "Federführendes Ministerium für Raumfahrtpolitik. Erteilt Lizenzen unter dem WRA 2007. Verantwortlich für die nationale Raumfahrtstrategie und ESA-Ministerratskonferenz-Entscheidungen.",
    },
  ],
  [
    "NL-RDI",
    {
      name: "Nationale Aufsichtsbehörde für Digitale Infrastruktur (RDI)",
      mandate:
        "Frequenzverwaltung und Funkfrequenzkoordination für Satellitendienste. Vormals Agentschap Telecom. Nationale Frequenzregulierungsbehörde für ITU-Anmeldungen und Satellitenfrequenzzuweisungen.",
    },
  ],
  [
    "NL-NCSC",
    {
      name: "Nationales Zentrum für Cybersicherheit (NCSC)",
      mandate:
        "Cybersicherheitsbehörde für kritische Infrastrukturen einschließlich Weltraumsysteme. Koordiniert die NIS2-Umsetzung. Zentrale Stelle für Cyber-Vorfallreaktion.",
    },
  ],
  [
    "NL-AP",
    {
      name: "Niederländische Datenschutzbehörde (Autoriteit Persoonsgegevens)",
      mandate:
        "DSGVO/AVG-Durchsetzung für Weltraumdatenverarbeitung. Beaufsichtigt Erdbeobachtungsbetreiber und Satellitendatenanbieter, die personenbezogene Daten verarbeiten.",
    },
  ],
  [
    "NL-CDIU",
    {
      name: "Zentraler Dienst für Ein- und Ausfuhr (CDIU)",
      mandate:
        "Exportkontrolllizenzen für Dual-Use-Güter und Verteidigungsprodukte unter dem Wet strategische goederen (Wsg). Erteilt Exportlizenzen für Satellitenkomponenten und Verschlüsselungstechnologie.",
    },
  ],
  [
    "NL-DEFENCE",
    {
      name: "Ministerium für Verteidigung",
      mandate:
        "Militärische Weltraumoperationen und NATO Space Centre of Excellence (geplant Den Haag). Betreibt das Defensie Space Commando. Koordiniert militärische Satellitenkommunikation und Weltraumlageerfassung.",
    },
  ],
  [
    "NL-BZ",
    {
      name: "Ministerium für Auswärtige Angelegenheiten",
      mandate:
        "Internationale Weltraumdiplomatie und Vertragsverhandlungen. Vertretung der Niederlande bei UN-COPUOS. Verwaltet den Haager Verhaltenskodex gegen die Verbreitung ballistischer Raketen (HCoC).",
    },
  ],
  [
    "NL-IenW",
    {
      name: "Ministerium für Infrastruktur und Wasserwirtschaft",
      mandate:
        "Umweltregulierung für Start- und Wiedereintrittsaktivitäten unter dem Wet milieubeheer (Wm). Verantwortlich für Umweltverträglichkeitsprüfungen für Weltrauminfrastruktur.",
    },
  ],
  [
    "NL-KNMI",
    {
      name: "Königliches Niederländisches Meteorologisches Institut (KNMI)",
      mandate:
        "Nationaler meteorologischer und seismologischer Dienst. Betreibt den Copernicus-Klimawandeldienst (C3S) und verwaltet niederländische Erdbeobachtungssatellitendaten. Weltraumwetterüberwachung für Satellitenbetrieb.",
    },
  ],
  [
    "NL-BTI",
    {
      name: "Büro für Investitionsprüfung (BTI)",
      mandate:
        "Prüfung ausländischer Investitionen in sensible Technologien unter dem Wet veiligheidstoets investeringen (Vifo). Raumfahrttechnologie als sensible Technologie eingestuft — Übernahmen niederländischer Raumfahrtunternehmen durch Nicht-EU-Investoren unterliegen obligatorischer Prüfung.",
    },
  ],
  [
    "NL-ILT",
    {
      name: "Aufsichtsbehörde für Umwelt und Transport (ILT)",
      mandate:
        "Umweltdurchsetzung und Transportsicherheitsaufsicht. Überwacht Einhaltung der Wet milieubeheer-Anforderungen für weltraumbezogene Einrichtungen.",
    },
  ],
  [
    "NL-TUDELFT",
    {
      name: "Technische Universität Delft — Fakultät für Luft- und Raumfahrttechnik",
      mandate:
        "Führende europäische Luft- und Raumfahrt-Forschungsuniversität. Betreibt das Delfi-Programm (Studentensatelliten). Größte Fakultät für Luft- und Raumfahrttechnik in Europa.",
    },
  ],
  [
    "NL-ESTEC",
    {
      name: "Europäisches Zentrum für Weltraumforschung und -technologie (ESA/ESTEC)",
      mandate:
        "Größte ESA-Einrichtung in Noordwijk. Primäres Technologieentwicklungs- und Testzentrum der ESA. Beherbergt das ESTEC Test Centre (größte Satellitentestanlage Europas). Ca. 2.500 Mitarbeiter.",
    },
  ],
  [
    "NL-ACM",
    {
      name: "Behörde für Verbraucher und Märkte (ACM)",
      mandate:
        "Marktregulierung und Wettbewerbsbehörde. Beaufsichtigt den Telekommunikationsmarkt einschließlich Satellitenkommunikationsdienste.",
    },
  ],

  // Belgium Authorities (15)
  [
    "BE-BELSPO",
    {
      name: "Belgisches Bundesamt für Wissenschaftspolitik (BELSPO)",
      mandate:
        "De-facto-Raumfahrtagentur Belgiens. Setzt das Genehmigungsverfahren unter dem Weltraumgesetz 2005 um, verwaltet ESA-Beiträge (~296 Mio. EUR 2024), führt das Nationale Register der Weltraumgegenstände. Raumfahrt macht über 40% des BELSPO-Budgets aus.",
    },
  ],
  [
    "BE-MINISTER-SCIENCE",
    {
      name: "Minister/Staatssekretär für Wissenschaftspolitik",
      mandate:
        "Erlässt ministerielle Genehmigungsdekrete (arrêtés ministériels) für Weltraumtätigkeiten unter dem Gesetz von 2005.",
    },
  ],
  [
    "BE-MOD",
    {
      name: "Verteidigungsministerium",
      mandate:
        "STAR-Plan mit 616 Mio. EUR für Weltraumfähigkeiten bis 2034: bodengestützte SSA-Sensoren, optisches Teleskop, Satellitenterminals. Cyber Command als 5. Militärkomponente.",
    },
  ],
  [
    "BE-BIPT",
    {
      name: "Belgisches Institut für Post und Telekommunikation (BIPT)",
      mandate:
        "Satellitenspektrumverwaltung, Frequenzzuweisung und ITU-Anmeldungen als belgische meldende Verwaltung. Lizenzierung von Satelliten-Erdstationen.",
    },
  ],
  [
    "BE-APD",
    {
      name: "Belgische Datenschutzbehörde (APD/GBA)",
      mandate:
        "DSGVO-Durchsetzung in Belgien. Keine weltraumspezifische Orientierung. Der Königliche Erlass 2022 integriert DSGVO-Konformität in das Weltraumgenehmigungsverfahren.",
    },
  ],
  [
    "BE-CCB",
    {
      name: "Zentrum für Cybersicherheit Belgien (CCB)",
      mandate:
        "Nationale Cybersicherheitsbehörde und CSIRT (via CERT.be) unter NIS2. Belgien war der ERSTE EU-Mitgliedstaat mit vollständiger NIS2-Umsetzung. Verwendet CyberFundamentals (CyFun®) als ISO-27001-Alternative.",
    },
  ],
  [
    "BE-NCCN",
    {
      name: "Nationales Krisenzentrum (NCCN)",
      mandate:
        "Krisenmanagement für Fehlfunktionen belgisch registrierter Weltraumgegenstände. Benannt seit 2008, bestätigt im Königlichen Erlass 2022. Unterlassene Meldung an das NCCN führt zum Verfall der 10%-Haftungsobergrenze.",
    },
  ],
  [
    "BE-FPS-FA",
    {
      name: "Föderaler Öffentlicher Dienst Auswärtige Angelegenheiten",
      mandate:
        "Internationale Weltraumdiplomatie. Führte EU-Präsidentschafts-Weltraumprioritäten 2024, startete Verhandlungen zum EU Space Act. Belgische COPUOS-Delegation unter Leitung des Botschafters in Wien.",
    },
  ],
  [
    "BE-FPS-ECO",
    {
      name: "FÖD Wirtschaft — Lizenzstelle",
      mandate:
        "Exportkontrollkompetenz NUR für Transaktionen der belgischen Armee/Polizei. Nukleargüterexporte über CANVEK. Für Privatunternehmen ist die Exportlizenzierung REGIONALE Kompetenz seit 2003.",
    },
  ],
  [
    "BE-WALL-EXPORT",
    {
      name: "Wallonien — Direktion für Waffenlizenzmanagement",
      mandate:
        "Regionale Exportkontrollbehörde für Wallonien unter dem Dekret vom 21. Juni 2012. Wallonien umfasst >70% der belgischen Luftfahrtaktivität.",
    },
  ],
  [
    "BE-FLAND-EXPORT",
    {
      name: "Flandern — Kontrolle strategischer Güter",
      mandate:
        "Regionale Exportkontrollbehörde für Flandern unter dem Flämischen Waffenhandelsgesetz vom 15. Juni 2012.",
    },
  ],
  [
    "BE-BXL-EXPORT",
    {
      name: "Brüssel-Hauptstadt — Lizenzbüro (SPRB)",
      mandate:
        "Regionale Exportkontrollbehörde für die Region Brüssel-Hauptstadt unter der Verordnung vom 20. Juni 2013.",
    },
  ],
  [
    "BE-ROB",
    {
      name: "Königliche Sternwarte von Belgien (ROB)",
      mandate:
        "Bundeswissenschaftliches Institut unter BELSPO. Beherbergt das Solar-Terrestrial Centre of Excellence (STCE) und das ESA-Weltraumwetter-Koordinierungszentrum (SSCC).",
    },
  ],
  [
    "BE-CSL",
    {
      name: "Raumfahrtzentrum Lüttich (CSL)",
      mandate:
        "Angewandtes Forschungszentrum an der Universität Lüttich (gegründet 1964). Eines von vier ESA-koordinierten Testeinrichtungen. ~100 Mitarbeiter, ~19 Mio. EUR Umsatz.",
    },
  ],
  [
    "BE-VKI",
    {
      name: "Von Karman Institut für Strömungsdynamik (VKI)",
      mandate:
        "Internationale Forschungsorganisation (gegründet 1956). ~50 Einrichtungen einschließlich Mach-14/20-Hyperschall-Windkanäle und 1.200-kW-Plasmatron. Kooperationsabkommen mit ESA und NASA.",
    },
  ],

  // Spain Authorities (13)
  [
    "ES-AEE",
    {
      name: "Spanische Raumfahrtagentur (AEE)",
      mandate:
        "Geschaffen durch RD 158/2023, operativ seit 20. April 2023. Sitz in Sevilla. Verwaltet ESA-Beiträge, koordiniert nationale Weltraumpolitik und ist beauftragt, das Anteproyecto de Ley de Actividades Espaciales vorzuschlagen. Derzeit KEINE Lizenzierungs-/Regulierungsbehörde.",
    },
  ],
  [
    "ES-INTA",
    {
      name: "Nationales Institut für Luft- und Raumfahrttechnik (INTA)",
      mandate:
        "Gegründet 1942. Öffentliche Forschungseinrichtung unter dem Verteidigungsministerium. ~1.500 Mitarbeiter. Luft- und Raumfahrtprüfung, Satellitenbau, Betrieb von Bodenstationen (MDSCC, Maspalomas). El Arenosillo (CEDEA) — Startplatz der PLD Space MIURA 1.",
    },
  ],
  [
    "ES-CDTI",
    {
      name: "Zentrum für technologische und industrielle Entwicklung (CDTI)",
      mandate:
        "Ursprünglich 1977 gegründet. Öffentliche Unternehmenseinrichtung unter dem Wissenschaftsministerium. Historisch Spaniens ESA-Delegation. AEE hat ESA-bezogene Funktionen übernommen, CDTI behält Programmausführung.",
    },
  ],
  [
    "ES-SETID",
    {
      name: "Staatssekretariat für Telekommunikation und Digitale Infrastruktur (SETID)",
      mandate:
        "Spaniens primäre Spektrumverwaltungsbehörde. Verwaltet Planung und Zuweisung des Funkspektrums einschließlich Satelliten-Orbit-Spektrum-Ressourcen. Führt das CNAF. Reicht Satellitennetzmeldungen beim ITU ein.",
    },
  ],
  [
    "ES-CNMC",
    {
      name: "Nationale Märkte- und Wettbewerbskommission (CNMC)",
      mandate:
        "Unabhängige Regulierungsbehörde. Nationale Regulierungsbehörde für elektronische Kommunikation einschließlich Satellitendienste. Verwaltet das Telekommunikationsbetreiberregister.",
    },
  ],
  [
    "ES-AEPD",
    {
      name: "Spanische Datenschutzbehörde (AEPD)",
      mandate:
        "Unabhängige Aufsichtsbehörde unter LO 3/2018 (LOPDGDD). Überwacht Verarbeitung personenbezogener Daten aus Satellitenbildern und Erdbeobachtungsdaten.",
    },
  ],
  [
    "ES-MOD",
    {
      name: "Verteidigungsministerium — Luft- und Weltraumstreitkräfte / MESPA",
      mandate:
        "Ejército del Aire y del Espacio seit 2022. MESPA (Weltraumkommando) seit 2023. AEE-Mitträgerbehörde. INTA-Trägerbehörde.",
    },
  ],
  [
    "ES-JIMDDU",
    {
      name: "Interministerielle Kommission für Verteidigungsgüter und Dual-Use-Handel (JIMDDU)",
      mandate:
        "Interministerielle Kommission für die Einzelfallprüfung ALLER Exportgenehmigungsanträge für Verteidigungsmaterial und Dual-Use-Technologien. Erteilt verbindliche Gutachten.",
    },
  ],
  [
    "ES-MINCIENCIA",
    {
      name: "Ministerium für Wissenschaft, Innovation und Universitäten",
      mandate:
        "Übergeordnetes Weltraumpolitik-Ministerium. AEE-Hauptträgerbehörde. CDTI-Trägerbehörde.",
    },
  ],
  [
    "ES-MAEC",
    {
      name: "Ministerium für Auswärtige Angelegenheiten, EU und Zusammenarbeit",
      mandate:
        "Vertragspflichten und diplomatische Vertretung bei COPUOS. Verwaltet das Registro Español de Objetos Espaciales (koordiniert über AEE).",
    },
  ],
  [
    "ES-AEMET",
    {
      name: "Spanische Meteorologische Agentur (AEMET)",
      mandate:
        "Staatliche Agentur unter dem Ministerium für Ökologischen Übergang. Spaniens EUMETSAT-Vertreter. Leitet die Nowcasting SAF (NWC SAF) von EUMETSAT.",
    },
  ],
  [
    "ES-CCN",
    {
      name: "Nationales Kryptologisches Zentrum (CCN)",
      mandate:
        "Nationale Cybersicherheitsbehörde unter dem CNI. Verwaltet das Esquema Nacional de Seguridad (ENS). NIS2-Umsetzung ausstehend — Spanien hat die Frist Oktober 2024 versäumt.",
    },
  ],
  [
    "ES-CNSA",
    {
      name: "Nationaler Rat für Luft- und Raumfahrtsicherheit (CNSA)",
      mandate:
        "Unterstützungsorgan des Nationalen Sicherheitsrats. Koordiniert Luft- und Raumfahrtsicherheitspolitik einschließlich der ESAN-2025-Strategie.",
    },
  ],

  // Norway Authorities (13)
  [
    "NO-NOSA",
    {
      name: "Norwegische Raumfahrtagentur (Direktoratet for romvirksomhet)",
      mandate:
        "Ursprünglich 1987 mit ESA-Beitritt gegründet. ~40-54 Mitarbeiter, Oslo. Verwaltet staatliche Investitionsfonds, vertritt Norwegen bei ESA/EU, koordiniert Weltraumpolitik. NICHT die Regulierungsbehörde — das ist die CAA.",
    },
  ],
  [
    "NO-CAA",
    {
      name: "Norwegische Zivilluftfahrtbehörde (Luftfartstilsynet)",
      mandate:
        "Nationale Aufsichtsbehörde für Weltraumtätigkeiten seit 1. Januar 2023. Erteilt Lizenzen und Genehmigungen, führt nationales Register, überwacht Startplätze. Erste Startgenehmigung: Isar Aerospace, März 2025.",
    },
  ],
  [
    "NO-NFD",
    {
      name: "Ministerium für Handel, Industrie und Fischerei",
      mandate:
        "Sektorale Zuständigkeit für Weltraumbetrieb. Unternehmensführung über Andøya Space AS und Space Norway AS. Verantwortlich für ESA/EU/UN-Weltraumkooperation. Bereitet das neue Weltraumgesetz vor.",
    },
  ],
  [
    "NO-NKOM",
    {
      name: "Norwegische Kommunikationsbehörde (Nkom)",
      mandate:
        "Verwaltet Funkfrequenzen einschließlich Satellitenspektrum. Erteilt Genehmigungen für Satelliten-Erdstationen auf Svalbard und in der Antarktis. Registriert Satellitennetze beim ITU. Lehnte US- und türkische Militärsatellitenantrage bei SvalSat ab.",
    },
  ],
  [
    "NO-ETJENESTEN",
    {
      name: "Norwegischer Nachrichtendienst (E-tjenesten)",
      mandate:
        "Seit 2020 Norwegens militärische Weltraumbehörde. Drei Schwerpunkte: Satellitenüberwachung, Weltraumbeobachtung und Satellitenkommunikation im Hohen Norden.",
    },
  ],
  [
    "NO-NSM",
    {
      name: "Nationale Sicherheitsbehörde Norwegens (NSM)",
      mandate:
        "Präventive nationale Sicherheit einschließlich IKT-Sicherheit (NorCERT). Norwegische Raumfahrtagentur und Space Norway unterliegen dem Sicherheitsgesetz. Alle SvalSat-Mitarbeiter benötigen NATO-Sicherheitsfreigabe über NSM.",
    },
  ],
  [
    "NO-FFI",
    {
      name: "Norwegisches Verteidigungsforschungsinstitut (FFI)",
      mandate:
        "Militärische Weltraumtechnologieentwicklung. NRD auf NorSat-3, Kameras auf NorSat-4, MilSpace2-Satelliten (Birkeland und Huygens — Radarüberwachung). Trieb die 2014-15 militärische Weltraumstrategie voran.",
    },
  ],
  [
    "NO-MOD",
    {
      name: "Verteidigungsministerium",
      mandate:
        "Militärische Weltraumpolitik. Langfristiger Verteidigungsplan 2025-2036: ~600 Mrd. NOK, Weltraum als Investitionspriorität. 200 Mio. NOK für militärische Nutzung von Andøya.",
    },
  ],
  [
    "NO-DEKSA",
    {
      name: "Direktorat für Exportkontrolle und Sanktionen (DEKSA)",
      mandate:
        "Ende 2024 eingerichtet. Verwaltet Exportkontrolle mit drei Kontrolllisten: Liste I (Verteidigung), Liste II (Dual-Use nach EU), Liste III (kritische Technologien über EU-Umfang, November 2024).",
    },
  ],
  [
    "NO-MET",
    {
      name: "Norwegisches Meteorologisches Institut (MET Norway)",
      mandate:
        "Vertritt Norwegen bei EUMETSAT. Hauptnutzer von Satellitendaten für Wettervorhersage und Arktisüberwachung.",
    },
  ],
  [
    "NO-KARTVERKET",
    {
      name: "Norwegische Kartierungsbehörde (Kartverket)",
      mandate:
        "Betreibt landesweites GNSS-Positionierungssystem (280+ Stationen) und geodätisches Observatorium in Ny-Ålesund in Zusammenarbeit mit der NASA.",
    },
  ],
  [
    "NO-MAEC",
    {
      name: "Außenministerium",
      mandate:
        "Vertragspflichten und diplomatische Vertretung. Norwegen trat COPUOS 2017 bei. Verwaltet Svalbardvertrag-Compliance und US-Norwegen Technologieschutzabkommen.",
    },
  ],
  [
    "NO-JUSTISDEP",
    {
      name: "Justiz- und Bereitsschaftsministerium",
      mandate:
        "Entwirft NIS2-Umsetzungsgesetz. Verantwortlich für das Digitalsicherheitsgesetz (NIS1-Umsetzung, in Kraft 1. Oktober 2025).",
    },
  ],

  // Sweden Authorities (14)
  [
    "SE-SNSA",
    {
      name: "Schwedische Raumfahrtagentur (Rymdstyrelsen)",
      mandate:
        "Zentrale Behörde unter dem Bildungsministerium. ~30 Mitarbeiter, Solna. Bereitet Lizenzanträge vor, überwacht lizenzierte Tätigkeiten, führt Register. Entscheidet NICHT über Lizenzen — leitet an die Regierung weiter. ~70% des ~900 MSEK Budgets für ESA.",
    },
  ],
  [
    "SE-SSC",
    {
      name: "SSC Space AB (vormals Swedish Space Corporation)",
      mandate:
        "100% staatseigen, gegründet 1972. ~750 Mitarbeiter. Betreibt Esrange Space Center und eines der weltweit größten kommerziellen Bodenstationsnetze. Nicht Regulierer — Schlüssel-Betriebsunternehmen.",
    },
  ],
  [
    "SE-PTS",
    {
      name: "Schwedische Post- und Telekommunikationsbehörde (PTS)",
      mandate:
        "Satellitenspektrumzuweisung, Erdstationslizenzen, ITU-Vertretung. Wird bei allen Weltraumlizenzen konsultiert.",
    },
  ],
  [
    "SE-ISP",
    {
      name: "Schwedische Inspektionsbehörde für strategische Produkte (ISP)",
      mandate:
        "Zuständig für Dual-Use- und Militärexportlizenzen. Kontrolliert Weltraumtechnologieexporte. Auch FDI-Prüfbehörde.",
    },
  ],
  [
    "SE-FORSVARSMAKTEN",
    {
      name: "Schwedische Streitkräfte — Weltraumabteilung",
      mandate:
        "Rymdavdelningen seit 2023 unter der Luftwaffe. Erster Militärsatellit GNA-3 am 16. August 2024. 5,3 Mrd. SEK für Weltraum, 1,3 Mrd. SEK für Aufklärungssatelliten.",
    },
  ],
  [
    "SE-FMV",
    {
      name: "Schwedische Verteidigungsmaterialverwaltung (FMV)",
      mandate:
        "209 Mio. SEK Vertrag mit SSC für Satellitenstarttfähigkeit (März 2026). ~10 Militär-ISR-Satelliten (~142 Mio. USD, Januar 2026). Militärstartfähigkeit bis 2028 geplant.",
    },
  ],
  [
    "SE-IMY",
    {
      name: "Schwedische Datenschutzbehörde (IMY)",
      mandate:
        "Nationale DSGVO-Aufsichtsbehörde. Relevant für Erdbeobachtungsdaten und hochauflösende Bilder.",
    },
  ],
  [
    "SE-MCF",
    {
      name: "Behörde für Zivilverteidigung (MCF, vormals MSB)",
      mandate:
        "Nationale Koordinierungsstelle für NIS2/Cybersicherheitsgesetz. Weltraumbetreiber müssen Cybersicherheitsrisikomanagement und Vorfallmeldung einhalten.",
    },
  ],
  [
    "SE-SMHI",
    {
      name: "Schwedisches Meteorologisches und Hydrologisches Institut (SMHI)",
      mandate:
        "Schwedens EUMETSAT-Vertreter. ~650 Mitarbeiter. Führt NWC-SAF und CM-SAF. Leitet Arctic Weather Satellite Programm.",
    },
  ],
  [
    "SE-IRF",
    {
      name: "Schwedisches Institut für Raumphysik (IRF)",
      mandate:
        "Staatliches Forschungsinstitut, Kiruna. Baut Instrumente für schwedische und internationale Satellitenmissionen.",
    },
  ],
  [
    "SE-FOI",
    {
      name: "Schwedische Verteidigungsforschungsagentur (FOI)",
      mandate:
        "Verteidigungsbezogene Weltraumforschung. Mitentwicklung des GNA-3-Satelliten. Bewertete Dual-Use-Risiken chinesischen Zugangs zu SSC-Stationen (führte zu Zugangssperre 2020).",
    },
  ],
  [
    "SE-MOD",
    {
      name: "Verteidigungsministerium",
      mandate:
        "Militärische Weltraumpolitik. Veröffentlichte Schwedens erste Verteidigungsweltraumstrategie (4. Juli 2024). NATO-Beitritt erhöhte Esrange als responsive Startanlage.",
    },
  ],
  [
    "SE-UTRIKESDEP",
    {
      name: "Außenministerium",
      mandate:
        "Vertragsplichten und COPUOS-Vertretung. US-Schweden TSA (20. Juni 2025). ISP untersteht diesem Ministerium.",
    },
  ],
  [
    "SE-NATURVARDSVERKET",
    {
      name: "Schwedische Umweltschutzbehörde (Naturvårdsverket)",
      mandate:
        "Umweltgenehmigungen für Esrange-Startoperationen unter dem Miljöbalken (Umweltgesetzbuch, 1998:808).",
    },
  ],

  // Finland Authorities (13)
  [
    "FI-TEM",
    {
      name: "Ministerium für Wirtschaft und Beschäftigung (TEM)",
      mandate:
        "Primäre Weltraumbehörde unter Gesetz 63/2018. Erteilt Genehmigungen, führt Register, überwacht Konformität. Genehmigungsgebühr: 7.000 EUR. Geplanter Transfer der Lizenzierung an Traficom.",
    },
  ],
  [
    "FI-TRAFICOM",
    {
      name: "Finnische Verkehrs- und Kommunikationsbehörde (Traficom)",
      mandate:
        "Satellitenspektrumverwaltung, ITU-Vertretung, Galileo-PRS-Sicherheitsbehörde, NIS2-Aufsicht für Weltraumsektor (via NCSC-FI). Lizenziert Bodenstationen. Künftiger Empfänger der Weltraumlizenzierung.",
    },
  ],
  [
    "FI-UM",
    {
      name: "Außenministerium — Exportkontrollstelle",
      mandate:
        "Nationale Lizenzbehörde für Dual-Use-Exportkontrollen. Gibt Stellungnahmen zu internationalen Verpflichtungen für Weltraumgenehmigungen ab.",
    },
  ],
  [
    "FI-MOD",
    {
      name: "Verteidigungsministerium",
      mandate:
        "Führung und Aufsicht der Weltraumaktivitäten der Streitkräfte. Verteidigungsgüter-Exportlizenzen. Streitkräfte teilweise von Gesetz 63/2018 befreit.",
    },
  ],
  [
    "FI-FMI",
    {
      name: "Finnisches Meteorologisches Institut (FMI)",
      mandate:
        "EU-SST-Partnerschaft (seit November 2022). Arctic Space Centre Sodankylä und National Satellite Data Centre. Leitet ziviles Kommandozentrum des nationalen SSA-Zentrums. Satelliteninstrumente seit 1986.",
    },
  ],
  [
    "FI-AIRFORCE",
    {
      name: "Finnische Streitkräfte / Luftwaffe — Weltraumkommando",
      mandate:
        "Luftwaffenkommandeur als Weltraumkommandeur. ICEYE-Vertrag 158 Mio. EUR (September 2025) für souveräne weltraumgestützte Aufklärung. NATO APSS, NORTHLINK, STARLIFT.",
    },
  ],
  [
    "FI-DPO",
    {
      name: "Büro des Datenschutzbeauftragten",
      mandate:
        "DSGVO-Durchsetzung für Satelliten-/EO-Daten. ICEYE (16 cm SAR-Auflösung) als finnischer Verantwortlicher direkt betroffen.",
    },
  ],
  [
    "FI-TUKES",
    {
      name: "Finnische Sicherheits- und Chemikalienbehörde (Tukes)",
      mandate:
        "Marktüberwachung für Produkte mit digitalen Elementen unter CRA. REACH/RoHS-Konformität für Satellitenherstellung.",
    },
  ],
  [
    "FI-BUSINESSFINLAND",
    {
      name: "Business Finland",
      mandate:
        "Koordiniert finnische ESA-Beteiligung (~16,2 Mio. EUR jährlich). Betreibt ESA BIC Finland an der Aalto-Universität.",
    },
  ],
  [
    "FI-SPACE-COMMITTEE",
    {
      name: "Finnischer Weltraumausschuss",
      mandate:
        "Beratungsgremium unter TEM (Erlass 739/2019). Ministerübergreifende Koordination mit Vertretern aus 6 Ministerien, Streitkräften und Industrieverbänden.",
    },
  ],
  [
    "FI-MoTC",
    {
      name: "Ministerium für Verkehr und Kommunikation",
      mandate:
        "Übergeordnetes Ministerium von Traficom. Telekommunikations- und Spektrumpolitik.",
    },
  ],
  [
    "FI-CUSTOMS",
    {
      name: "Finnischer Zoll (Tulli)",
      mandate:
        "Erweiterte Befugnisse über immaterielle Dual-Use-Güter unter Gesetz 500/2024. Physische Kontrollen strategischer Güterexporte.",
    },
  ],
  [
    "FI-MAANPUOLUSTUS",
    {
      name: "Außenministerium — Vertragsabteilung",
      mandate:
        "Internationale Vertragspflichten. Artemis Accords (53. Unterzeichner, Januar 2025). COPUOS-Vertretung (Mitglied seit 2018).",
    },
  ],

  // Denmark Authorities (11)
  [
    "DK-UFM",
    {
      name: "Ministerium für Hochschulbildung und Wissenschaft",
      mandate:
        "Nationale Koordinierungsbehörde für Weltraum. Formale Verantwortung für Regulierung, internationale Zusammenarbeit (ESA, EU, COPUOS). Minister erteilt Genehmigungen.",
    },
  ],
  [
    "DK-UFST",
    {
      name: "Dänische Agentur für Hochschulbildung und Wissenschaft (UFST)",
      mandate:
        "Operationale Weltraumbehörde — Dänemarks Weltraumregulator. Genehmigung, Aufsicht, Registrierung. Vertritt Dänemark bei ESA und COPUOS. Verwaltet nationales Weltraumprogramm ab 2026.",
    },
  ],
  [
    "DK-DTU-SPACE",
    {
      name: "DTU Space — Nationales Raumfahrtinstitut",
      mandate:
        "Dänemarks größte Weltraumforschungseinrichtung. 100+ internationale Missionen. ~169 Mitarbeiter. Betreibt Grönland-Magnetometerarray (19 Stationen). ESA BIC Denmark.",
    },
  ],
  [
    "DK-ENERGISTYRELSEN",
    {
      name: "Dänische Energiebehörde",
      mandate:
        "Spektrumzuweisung und Frequenzplanung für Weltraumdienste, einschließlich ITU-Frequenz- und GEO-Slot-Compliance.",
    },
  ],
  [
    "DK-FORSVARET",
    {
      name: "Dänische Verteidigung / DALO",
      mandate:
        "Militärische Weltraumaktivitäten. BIFROST-Satellit (Juni 2025 — Dänemarks erster Militärüberwachungssatellit). DKK 14,6 Mrd. Arktis-Verteidigungspaket.",
    },
  ],
  [
    "DK-ERHVERVSSTYRELSEN",
    {
      name: "Dänische Gewerbeaufsicht (Erhvervsstyrelsen)",
      mandate:
        "Verwaltet Dual-Use-Exportkontrollen und FDI-Prüfung für kritische Weltraumtechnologien (seit 1. Juli 2021).",
    },
  ],
  [
    "DK-MFA",
    {
      name: "Außenministerium",
      mandate:
        "Zugang zu Pituffik Space Base. Unterzeichnete Artemis Accords (November 2024, 48. Unterzeichner). Außen-/Sicherheitspolitische Bewertungen.",
    },
  ],
  [
    "DK-INTER-MINISTERIAL",
    {
      name: "Interministerieller Weltraumausschuss",
      mandate:
        "Gegründet 2016, Vorsitz UFM. Ministerien für Finanzen, Verteidigung, Umwelt, Verkehr und Auswärtiges.",
    },
  ],
  [
    "DK-DMI",
    {
      name: "Dänisches Meteorologisches Institut (DMI)",
      mandate:
        "Partner bei Weltraumprojekten, insbesondere maritime/Wettersatellitennanwendungen und Grönland-Eisüberwachung.",
    },
  ],
  [
    "DK-MOD",
    {
      name: "Verteidigungsministerium",
      mandate:
        "Militärische Weltraumpolitik. EU-Verteidigungsopt-out abgeschafft Juni 2022. DKK 14,6 Mrd. + DKK 27,4 Mrd. Arktis-Verteidigungspakete. Verteidigungsausgaben nähern sich 3% BIP.",
    },
  ],
  [
    "DK-RESILIENCE-MINISTRY",
    {
      name: "Ministerium für gesellschaftliche Resilienz und Krisenvorsorge",
      mandate:
        "Überwacht NIS2-Umsetzung. Dänisches NIS2-Gesetz in Kraft 1. Juli 2025. Abdeckung von ~1.000 auf 6.000+ Einrichtungen erweitert.",
    },
  ],

  // Austria Authorities (10)
  [
    "AT-BMIMI",
    {
      name: "Bundesministerium für Innovation, Mobilität und Infrastruktur (BMIMI)",
      mandate:
        "Österreichs Weltraumministerium und Genehmigungsbehörde. Umbenannt von BMK am 1. April 2025. Verwaltet nationales Register, übt Aufsicht aus. Minister: Peter Hanke (SPÖ).",
    },
  ],
  [
    "AT-FFG",
    {
      name: "Österreichische Forschungsförderungsgesellschaft — Agentur für Luft- und Raumfahrt (FFG/ALR)",
      mandate:
        "De-facto nationale Raumfahrtagentur. Gegründet 2004. Vertritt Österreich bei ESA. Verwaltet ASAP-Programm. Nationale Kontaktstelle für EU SST.",
    },
  ],
  [
    "AT-RTR",
    {
      name: "Rundfunk und Telekom Regulierungs-GmbH (RTR)",
      mandate:
        "Satellitenspektrumverwaltung unter TKG 2021. Frequenzzuweisungen. TKK führt Spektrumauktionen durch.",
    },
  ],
  [
    "AT-BMEIA",
    {
      name: "Bundesministerium für europäische und internationale Angelegenheiten",
      mandate:
        "Vertritt Österreich bei COPUOS. Verwaltet HCoC-Exekutivsekretariat (www.hcoc.at). Übermittelt Registerdaten an UN-Generalsekretär.",
    },
  ],
  [
    "AT-BMWET",
    {
      name: "Bundesministerium für Wirtschaft — Exportkontrollabteilung V/2",
      mandate:
        "Exportkontrolle für Dual-Use-Weltraumtechnologie. Lizenzen über PAWA-Portal. Österreich Mitglied aller 5 Exportkontrollregime. MTCR-Vorsitz 2020-2021.",
    },
  ],
  [
    "AT-BMLV",
    {
      name: "Bundesministerium für Landesverteidigung",
      mandate:
        "Militärische Weltraumpolitik. Kein Weltraumkommando (Neutralität). Erster Militärsatellit März 2026 (GATE Space). Militärische Weltraumstrategie 2035+. Goldhaube-Radar seit 1988.",
    },
  ],
  [
    "AT-DSB",
    {
      name: "Datenschutzbehörde (DSB)",
      mandate:
        "DSGVO-Aufsicht für Satellitendaten. DSG § 1 hat VERFASSUNGSRANG und erstreckt Datenschutz auf juristische Personen.",
    },
  ],
  [
    "AT-BMI",
    {
      name: "Bundesministerium für Inneres",
      mandate:
        "Öffentliche Sicherheitsbewertung für Weltraumgenehmigungen (§ 17). Zuverlässigkeitsüberprüfung der Betreiber.",
    },
  ],
  [
    "AT-AUSTROSPACE",
    {
      name: "AUSTROSPACE — Österreichische Raumfahrtindustrie",
      mandate:
        "Industrieverband, gegründet Februar 1991. ~19-20 Mitglieder. 120+ Organisationen aktiv, ~125 Mio. EUR Umsatz, ~1.000 direkte Beschäftigte.",
    },
  ],
  [
    "AT-NPOC",
    {
      name: "NPOC Weltraumrecht Österreich — Universität Wien",
      mandate:
        "Gegründet 2001 von Prof. Brünner (Graz). Geleitet von Prof. Marboe (Wien) — COPUOS AG Nationales Weltraumrecht (2008-2013, UNGA Res. 68/74). Netzwerk an 6 Universitäten.",
    },
  ],

  // Switzerland Authorities (10)
  [
    "CH-SSO",
    {
      name: "Swiss Space Office (SSO) im SBFI",
      mandate:
        "Kompetenzzentrum des Bundes für Weltraum. Dr. Krpoun führt ESA-Ratsvorsitz. Bereitet Raumfahrtgesetz vor.",
    },
  ],
  [
    "CH-OFCOM",
    {
      name: "Bundesamt für Kommunikation (BAKOM)",
      mandate:
        "Funkspektrum bis 3.000 GHz inkl. Satellitenbänder. ITU-Vertretung. NFAP 2026.",
    },
  ],
  [
    "CH-SECO",
    {
      name: "SECO — Exportkontrollen",
      mandate:
        "Lizenzierungsbehörde für Dual-Use-Güter. ELIC-System. ~1.744 Genehmigungen/Jahr.",
    },
  ],
  [
    "CH-DDPS",
    {
      name: "VBS — Kompetenzzentrum Weltraum",
      mandate:
        "Seit 1. Januar 2026. 10-15 Militärsatelliten geplant. Erster Testsatellit Januar 2025.",
    },
  ],
  [
    "CH-FDFA",
    {
      name: "EDA — Eidg. Departement für auswärtige Angelegenheiten",
      mandate:
        "COPUOS-Delegation (Dr. Archinard). UN-Weltraumsicherheit. Artemis Accords (37. Unterzeichner).",
    },
  ],
  [
    "CH-CFAS",
    {
      name: "Eidg. Kommission für Weltraumfragen (EKWF)",
      mandate:
        "Ausserparlamentarische Kommission. Berät den Bundesrat zur Weltraumpolitik.",
    },
  ],
  [
    "CH-IKAR",
    {
      name: "IKAR — Interdepartementaler Koordinationsausschuss",
      mandate:
        "Vorsitz SSO. Koordiniert Weltraumfragen über Departemente hinweg.",
    },
  ],
  [
    "CH-EDOEB",
    {
      name: "EDÖB — Datenschutzbeauftragter",
      mandate:
        "Datenschutzaufsicht unter nDSG (SR 235.1). Gilt für Satelliten-/EO-Daten.",
    },
  ],
  [
    "CH-ESPACE",
    {
      name: "EPFL Space Center (eSpace)",
      mandate: "Akademischer Hub. Spinoffs: ClearSpace, Astrocast, SWISSto12.",
    },
  ],
  [
    "CH-SSIG",
    {
      name: "Swiss Space Industries Group (SSIG)",
      mandate:
        "~100 Unternehmen, ~2.500 Beschäftigte. Beyond Gravity CHF 402 Mio. Umsatz.",
    },
  ],

  // Portugal Authorities (10)
  [
    "PT-ANACOM",
    {
      name: "ANACOM — Nationale Kommunikationsbehörde / Interim-Weltraumbehörde",
      mandate:
        "DOPPELROLLE: Telekommunikationsregulator UND Interim-Weltraumbehörde. Lizenziert Weltraumaktivitäten, überwacht, führt Register. Erste Lizenzen 2024, erste Weltraumhafen-Lizenz August 2025.",
    },
  ],
  [
    "PT-PTSPACE",
    {
      name: "Portugal Space — Portugiesische Raumfahrtagentur",
      mandate:
        "Setzt Strategie Portugal Espaço 2030 um. Vorabstellungnahmen zu Lizenzen (seit 2024). Sitz: Santa Maria Island, Azoren.",
    },
  ],
  [
    "PT-MECI",
    {
      name: "Ministerium für Bildung, Wissenschaft und Innovation",
      mandate:
        "Zuständiges Ministerium für Weltraumpolitik. Interministerieller Arbeitskreis Weltraum (Despacho 10547/2025).",
    },
  ],
  [
    "PT-MDN",
    {
      name: "Verteidigungsministerium — DGRDN",
      mandate:
        "Nationales SST-Programm. EU-SST-Konsortium (seit Dezember 2018). Genehmigung für Weltraumhafen-Lizenzen. 16,2% des CM25-Beitrags.",
    },
  ],
  [
    "PT-AT-CUSTOMS",
    {
      name: "Steuer- und Zollbehörde — Exportkontrolle",
      mandate:
        "Nationale Behörde für Dual-Use-Exportkontrollen unter DL 130/2015.",
    },
  ],
  [
    "PT-CNPD",
    {
      name: "Nationale Datenschutzkommission (CNPD)",
      mandate:
        "DSGVO-Aufsichtsbehörde. Keine spezifische Orientierung zu Satelliten-/EO-Daten.",
    },
  ],
  [
    "PT-CNCS",
    {
      name: "Nationales Cybersicherheitszentrum (CNCS)",
      mandate:
        "NIS2-Behörde. Regime Jurídico da Cibersegurança in Kraft 3. April 2026.",
    },
  ],
  [
    "PT-IPMA",
    {
      name: "Portugiesisches Institut für Meer und Atmosphäre (IPMA)",
      mandate: "Erdbeobachtung und Meteorologie. EUMETSAT-Rahmen.",
    },
  ],
  [
    "PT-AZORES-SPACE",
    {
      name: "EMA-Espaço — Azoren-Weltraummissionsstruktur",
      mandate:
        "Koordiniert Azoren-Weltraumaktivitäten. Bindende Stellungnahmen zu Weltraumhafeninstallationen. Eigene Weltraumgesetzgebung: DLR 9/2019/A.",
    },
  ],
  [
    "PT-AIR-CENTRE",
    {
      name: "Atlantic International Research Centre",
      mandate:
        "Terceira Island, Azoren. 16 kooperierende Staaten/Regionen. Atlantic Constellation Satellitenprojekt.",
    },
  ],

  // Ireland Authorities (8)
  [
    "IE-DETE",
    {
      name: "Ministerium für Unternehmen, Handel und Beschäftigung",
      mandate:
        "Federführendes Ministerium für Weltraumpolitik. ESA-Delegationsministerium. Genehmigte EIRSAT-1 per Kabinettsentscheidung. Exportkontrollbehörde.",
    },
  ],
  [
    "IE-EI",
    {
      name: "Enterprise Ireland",
      mandate:
        "De-facto-Raumfahrtagentur für Unternehmen. Koordiniert ESA-Industriebeteiligung. ESA BIC Ireland. 116 ESA-aktive Unternehmen. KEINE Regulierungs- oder Aufsichtsbefugnis.",
    },
  ],
  [
    "IE-COMREG",
    {
      name: "Kommunikationsregulierungskommission (ComReg)",
      mandate:
        "Satellitenspektrum und Erdstationslizenzen. NIS2-Sektorbehörde für Weltraum. Einzige regulierte Weltraumfunktion in Irland.",
    },
  ],
  [
    "IE-DFA",
    {
      name: "Außenministerium",
      mandate:
        "Internationale Vertragspflichten. Würde diplomatische Antwort auf Haftungsansprüche leiten.",
    },
  ],
  [
    "IE-DPC",
    {
      name: "Datenschutzkommission (DPC)",
      mandate:
        "DSGVO-Aufsicht. Leitende Aufsichtsbehörde für Google, Apple, Meta, Microsoft. Zuständig für Satellitendatenverarbeitung.",
    },
  ],
  [
    "IE-NCSC",
    {
      name: "Nationales Cybersicherheitszentrum",
      mandate:
        "CSIRT-IE. NIS2-Umsetzung ausstehend — EK-Stellungnahme Mai 2025.",
    },
  ],
  [
    "IE-IAA",
    {
      name: "Irische Luftfahrtbehörde",
      mandate: "Shannon FIR (455.000 km²). Kein explizites Weltraummandat.",
    },
  ],
  [
    "IE-MET-EIREANN",
    {
      name: "Met Éireann",
      mandate:
        "EUMETSAT-Gründungsmitglied (1983). Direktor Eoin Moran = EUMETSAT-Ratsvorsitzender.",
    },
  ],

  // Greece Authorities (8)
  [
    "GR-HSC",
    {
      name: "Hellenisches Raumfahrtzentrum (ΕΛΚΕΔ/HSC)",
      mandate:
        "Griechenlands Raumfahrtagentur. ΝΠΙΔ unter Ministerium für Digitale Governance. 200-Mio.-EUR-Satellitenprogramm. Präsident: Dr. Rammos (ex-ESA, 26 Patente).",
    },
  ],
  [
    "GR-MINDIGITAL",
    {
      name: "Ministerium für Digitale Governance — ΓΓΤΤ",
      mandate:
        "Aufsichtsministerium für HSC. Generalsekretär = Leiter der griechischen ESA-Delegation. Lizenzanträge unter Gesetz 5099/2024.",
    },
  ],
  [
    "GR-EETT",
    {
      name: "Griechische Telekommunikations- und Postkommission (EETT)",
      mandate:
        "Funkspektrum (außer Staatsnetze). Satelliten-Erdstationsfrequenzen. SSMS-Überwachungssystem. mySPECTRA-Portal.",
    },
  ],
  [
    "GR-MOD",
    {
      name: "Verteidigungsministerium — Weltraumabteilung",
      mandate:
        "Space Division seit 2024 unter ΓΕΕΘΑ. NCSA seit 1995 (Helios II, CSO). ELKAK: 25-Mio.-EUR-SAR-Satellit. Verteidigungsplannung 2025-2036: 25 Mrd. EUR inkl. Satellitensysteme.",
    },
  ],
  [
    "GR-NOA",
    {
      name: "Nationales Observatorium Athen — BEYOND-Zentrum",
      mandate:
        "EU-SST-Partnerschaft. GR-NOC SST. FireHub 24/7-Brandererkennung für EFFIS. Erste europäische Deep-Space-Optikkommunikation mit NASA Psyche (Juli 2025).",
    },
  ],
  [
    "GR-MFA-B6",
    {
      name: "Außenministerium — B6-Direktion (Exportkontrolle)",
      mandate:
        "Dual-Use-Lizenzbehörde. Griechenland = eines von 7 EU-Mitgliedstaaten mit nationalen Allgemeinausfuhrgenehmigungen.",
    },
  ],
  [
    "GR-NCA",
    {
      name: "Nationale Cybersicherheitsbehörde",
      mandate:
        "NIS2-Konformität für Weltraumsektor unter Gesetz 5160/2024. Griechenland transponierte NIS2 nur einen Monat verspätet.",
    },
  ],
  [
    "GR-HDPA",
    {
      name: "Hellenische Datenschutzbehörde (ΑΠΔΠΧ)",
      mandate:
        "DSGVO-Aufsicht unter Gesetz 4624/2019. Keine weltraumspezifische Orientierung.",
    },
  ],

  // Czech Republic Authorities (9)
  [
    "CZ-MOT",
    {
      name: "Verkehrsministerium — Tschechische Raumfahrtagentur (Abt. 710)",
      mandate:
        "Hauptkoordinator seit 2011. ~46 Mio. EUR/Jahr ESA-Beiträge. Nationales Register. ESA-Delegationsministerium. EU-SST-Partnerschaft.",
    },
  ],
  [
    "CZ-CTU",
    {
      name: "Tschechisches Telekommunikationsamt (ČTÚ)",
      mandate:
        "Nationale Regulierungsbehörde. Funkspektrum inkl. Satellitenfrequenzen. ITU-Koordination. 10-Jahres-Strategie Mai 2025.",
    },
  ],
  [
    "CZ-MPO",
    {
      name: "Ministerium für Industrie und Handel — Exportkontrolle",
      mandate:
        "Dual-Use-Exportkontrolle. ELIS-System. Mitglied aller 4 Exportkontrollregime.",
    },
  ],
  [
    "CZ-MOD",
    {
      name: "Verteidigungsministerium — CZE SATCEN",
      mandate:
        "CZE SATCEN (seit 2018, Militärischer Nachrichtendienst). SATurnin-1 (Jan 2025): 14 kg, KI-Verarbeitung, ohne ausländische Technologie gebaut. AMBIC-Folgeprogramm.",
    },
  ],
  [
    "CZ-NUKIB",
    {
      name: "Nationale Agentur für Cyber- und Informationssicherheit (NÚKIB)",
      mandate:
        "NIS2-Behörde unter Gesetz 264/2025 Sb. Raumtransport als hochkritischer Sektor.",
    },
  ],
  [
    "CZ-MFA",
    {
      name: "Außenministerium",
      mandate:
        "Vertragspflichten, COPUOS-Vertretung. Prof. Kopal: COPUOS-Rechtsausschuss-Vorsitz (1999-2004, 2008-2010). Artemis Accords (24. Unterzeichner, Mai 2023).",
    },
  ],
  [
    "CZ-MSMT",
    {
      name: "Ministerium für Bildung, Jugend und Sport",
      mandate: "~14,2 Mio. EUR/Jahr ESA-F&E (PRODEX, Wissenschaftsprogramm).",
    },
  ],
  [
    "CZ-UOOU",
    {
      name: "Amt für den Schutz personenbezogener Daten (ÚOOÚ)",
      mandate:
        "DSGVO-Durchsetzung für Satellitendaten unter Gesetz 110/2019 Sb.",
    },
  ],
  [
    "CZ-COORD-COUNCIL",
    {
      name: "Koordinierungsrat für Weltraumaktivitäten",
      mandate:
        "Ressortübergreifend seit 2011. 7 Regierungsmitglieder + Teilnehmer. Drei Ausschüsse: Industrie, Wissenschaft, Sicherheit.",
    },
  ],

  // Poland Authorities (10)
  [
    "PL-POLSA",
    {
      name: "Polnische Raumfahrtagentur (POLSA)",
      mandate:
        "Zentrale Weltraumbehörde seit 2014. Durch Weltraumgesetz 2026 zur Genehmigungsbehörde. Erteilt Permits, führt Register, überwacht. Sitz: Danzig. ~120 Mitarbeiter.",
    },
  ],
  [
    "PL-MFIG",
    {
      name: "Ministerium für Finanzen und Wirtschaft",
      mandate:
        "Aufsichtsministerium für POLSA. Zuständig für zivile Weltraumpolitik. Berufungsinstanz für Genehmigungen.",
    },
  ],
  [
    "PL-MON",
    {
      name: "Verteidigungsministerium — ARGUS Weltraumzentrum",
      mandate:
        "Militärische Weltraumaktivitäten vom Weltraumgesetz BEFREIT. ARGUS seit 1. Jan 2025. >1,2 Mrd. EUR Satellitenbeschaffung (POLEOS, MikroSAR, MIKROGLOB, PIAST). Ziel: 12 Militärsatelliten.",
    },
  ],
  [
    "PL-UKE",
    {
      name: "Amt für Elektronische Kommunikation (UKE)",
      mandate:
        "Nationale Regulierungsbehörde. Satellitenspektrumverwaltung. ITU-Koordination.",
    },
  ],
  [
    "PL-ABW",
    {
      name: "Agentur für Innere Sicherheit (ABW)",
      mandate:
        "Verbindliche Sicherheitsgutachten für Weltraumgenehmigungen. Cybersicherheit.",
    },
  ],
  [
    "PL-EXPORT",
    {
      name: "MFiG — Abteilung Handel mit sensitiven Gütern",
      mandate:
        "Exportkontrolle für Dual-Use-Weltraumtechnologie. Tracker 2.0 Digitalsystem. Mitglied aller 5 Exportkontrollregime.",
    },
  ],
  [
    "PL-UODO",
    {
      name: "Amt für den Schutz personenbezogener Daten (UODO)",
      mandate: "DSGVO-Aufsicht für Satellitendaten.",
    },
  ],
  [
    "PL-CBK-PAN",
    {
      name: "Weltraumforschungszentrum der PAN (CBK PAN)",
      mandate:
        "Polens führende Weltraumforschungseinrichtung seit 1977. Cassini, Rosetta, JUICE. Entwickelt CAMILA-Konstellation.",
    },
  ],
  [
    "PL-IMGW",
    {
      name: "Institut für Meteorologie und Wasserwirtschaft (IMGW)",
      mandate:
        "EUMETSAT-Vertreter. Copernicus-Datennutzer für Hochwasserüberwachung.",
    },
  ],
  [
    "PL-NASK",
    {
      name: "NASK — CSIRT NASK",
      mandate:
        "Nationales CSIRT. NIS2-Umsetzung ausstehend. Weltraum als kritischer Sektor.",
    },
  ],

  // ───────────────────────────────────────────────────────────────────
  // STRATEGIC NON-EU/UK ACTORS (added 2026-04)
  // ───────────────────────────────────────────────────────────────────

  [
    "JP-CABINET-OFFICE",
    {
      name: "Kabinettsbüro — Büro für nationale Weltraumpolitik",
      mandate:
        "Hauptbehörde für Lizenzierungen unter dem Space Activities Act 2016. Erteilt Start- und Satellitenmanagement-Genehmigungen, betreut das Register nach dem Space Resources Act und betreibt das ressortübergreifende Strategic Headquarters for Space Policy.",
    },
  ],
  [
    "JP-METI",
    {
      name: "Ministerium für Wirtschaft, Handel und Industrie (METI, Japan)",
      mandate:
        "Industriepolitik für den Raumfahrtsektor sowie Dual-Use-Exportlizenzierung nach dem Foreign Exchange and Foreign Trade Act. Mitverwalter des Space Resources Act zusammen mit dem Kabinettsbüro.",
    },
  ],
  [
    "JP-JAXA",
    {
      name: "Japan Aerospace Exploration Agency (JAXA)",
      mandate:
        "Nationale Raumfahrtagentur, die Erkundungs-, Wissenschafts- sowie H3-/Epsilon-Startfähigkeiten ausführt. Technischer Berater des Kabinettsbüros bei der Prüfung des Space Activities Act.",
    },
  ],
  [
    "IN-SPACE",
    {
      name: "Indian National Space Promotion and Authorization Centre (IN-SPACe)",
      mandate:
        "Single-Window-Genehmigungs-, Aufsichts- und Förderbehörde für nicht-staatliche Raumfahrtaktivitäten in Indien. Erteilt Genehmigungen unter den Norms, Guidelines and Procedures (NGP) und der Indian Space Policy 2023. Berichtet an den Premierminister über das Department of Space.",
    },
  ],
  [
    "IN-ISRO",
    {
      name: "Indian Space Research Organisation (ISRO)",
      mandate:
        "Nationale Raumfahrtagentur, die PSLV-/GSLV-/LVM3-Starts, das Chandrayaan-/Aditya-/Gaganyaan-Programm und die indische Satellitenflotte betreibt. Liefert technische Beratung an IN-SPACe für Genehmigungsanträge.",
    },
  ],
  [
    "AU-ASA",
    {
      name: "Australian Space Agency (ASA)",
      mandate:
        "Nationale Raumfahrtagentur seit 2018 und Aufsichtsbehörde, die Start-, Rückführungs-, Auslandsstart- und Hochleistungsraketen-Lizenzen unter dem Space (Launches and Returns) Act 2018 erteilt. Betreibt das Australische Register für Weltraumobjekte.",
    },
  ],
  [
    "AU-ACMA",
    {
      name: "Australian Communications and Media Authority (ACMA)",
      mandate:
        "Frequenzzuteilung, Lizenzierung von Satellitenbodenstationen und ITU-Koordinierungsfilings für australische Satellitensysteme. Verwaltet den Radiocommunications Act 1992.",
    },
  ],
  [
    "CA-CSA",
    {
      name: "Canadian Space Agency (CSA / Agence spatiale canadienne)",
      mandate:
        "Nationale Raumfahrtagentur. Zivile Raumfahrtprogramme (RADARSAT, ISS-Canadarm, Mondexploration) sowie Politikberater von ISED zur Regulierung des Raumfahrtsektors.",
    },
  ],
  [
    "AE-UAESA",
    {
      name: "UAE Space Agency (UAESA)",
      mandate:
        "Nationale Raumfahrtagentur und Lizenzbehörde nach Bundesverordnungsgesetz Nr. 12 von 2019 und seiner Durchführungsverordnung. Erteilt Genehmigungen für Raumfahrtaktivitäten, betreut das nationale Register für Weltraumobjekte und überwacht Genehmigungen zur Gewinnung von Weltraumressourcen.",
    },
  ],
  [
    "KR-KASA",
    {
      name: "Korea AeroSpace Administration (KASA)",
      mandate:
        "Nationale Raumfahrtagentur, gegründet am 27. Mai 2024 — Nachfolgebehörde für zivile Raumfahrtprogramme und primäre Aufsichtsbehörde für Genehmigungen nach dem Space Development Promotion Act und dem Space Liability Act. Ersetzte die zuvor von MSIT geführte Struktur.",
    },
  ],
  [
    "IL-DECA",
    {
      name: "Defence Export Controls Agency (DECA, Israel)",
      mandate:
        "Hauptbehörde für die israelische Verteidigungs- und Dual-Use-Exportlizenzierung nach dem Defense Export Control Law 2007. Erfasst die meisten Trägerraketen und viele Raumfahrzeug-Komponenten. Streng kontrolliert — israelische Raumfahrt-Hardware ist überwiegend verteidigungsklassifiziert.",
    },
  ],
  [
    "CN-SASTIND",
    {
      name: "Staatliche Verwaltung für Wissenschaft, Technologie und Industrie für die Landesverteidigung (SASTIND, China)",
      mandate:
        "Hauptregulator für zivile und Dual-Use-Raumfahrtprogramme. Erteilt Lizenzen für Starts und On-Orbit-Management bei nicht-militärischen Raumfahrtaktivitäten, beaufsichtigt die Exportkontrolle von Dual-Use-Raumfahrtgütern und koordiniert mit PLA-SSF bei militärischen Überschneidungen.",
    },
  ],
  [
    "RU-ROSCOSMOS",
    {
      name: "Staatskorporation für Raumfahrtaktivitäten — Roscosmos",
      mandate:
        "Staatskorporation seit 2015 (Nachfolger der vormaligen Bundesagentur). Sowohl Regulator als auch Hauptoperator: Lizenzierung russischer Raumfahrtaktivitäten nach Bundesgesetz Nr. 5663-1 von 1993, Verwaltung der Starts von Baikonur und Plesetsk/Vostochny sowie Aufsicht über das russische ISS-Segment.",
    },
  ],
  [
    "BR-AEB",
    {
      name: "Brasilianische Weltraumagentur (Agência Espacial Brasileira, AEB)",
      mandate:
        "Zivile Raumfahrtagentur seit 1994. Mit-Genehmigungsbehörde mit DECEA für Starts von Alcântara und anderen brasilianischen Standorten; Hauptansprechpartner für internationale Raumfahrtkooperation einschließlich des US-Brasilien-Technologieschutzabkommens.",
    },
  ],
  [
    "ZA-SACOUNCIL",
    {
      name: "Südafrikanischer Rat für Weltraumangelegenheiten (SACSA)",
      mandate:
        "Statutarischer Lizenzrat nach dem Space Affairs Act 84 von 1993. Erteilt Lizenzen für Starts und den Betrieb von Weltraumobjekten und führt das südafrikanische Register für Weltraumobjekte.",
    },
  ],
]);
