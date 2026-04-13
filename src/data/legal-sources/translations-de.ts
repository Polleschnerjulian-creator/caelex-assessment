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
]);
