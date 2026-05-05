/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * German translations for the Atlas case law dataset. Mirrors the
 * shape of `legal-sources/translations-de.ts` but for the LegalCase
 * record type. Every case in cases.ts has a corresponding entry here;
 * the case-detail UI consumes whichever language the user has selected.
 *
 * Translation conventions:
 *   - Plaintiff / Defendant → 'Kläger' / 'Beklagter' (or institutional
 *     names where appropriate; treaty-award entries use the state names)
 *   - 'Settlement' → 'Vergleich' / 'außergerichtliche Einigung'
 *   - 'Ruling' → 'Entscheidung'
 *   - 'Legal holding' → 'Rechtssatz'
 *   - 'Industry significance' → 'Bedeutung für die Praxis'
 *   - Statute numbers and forum names stay in their original form
 *     (e.g. '47 CFR § 25.114' — never translated).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface TranslatedCase {
  title: string;
  forum_name: string;
  plaintiff: string;
  defendant: string;
  facts: string;
  ruling_summary: string;
  legal_holding: string;
  industry_significance: string;
  remedy_non_monetary?: string[];
  notes?: string[];
}

export const LEGAL_CASE_TRANSLATIONS_DE = new Map<string, TranslatedCase>([
  // ─── Liability-Convention awards / inter-state settlements ──────────

  [
    "CASE-COSMOS-954-1981",
    {
      title: "Cosmos 954 — Vergleichsregelung der kanadischen Forderung",
      forum_name:
        "Diplomatische Einigung, UdSSR–Kanada (Haftungsübereinkommen 1972)",
      plaintiff: "Regierung von Kanada",
      defendant: "Regierung der Union der Sozialistischen Sowjetrepubliken",
      facts:
        "Am 24. Januar 1978 trat der sowjetische RORSAT-Satellit Cosmos 954 (Radar-Ozean-Aufklärungssatellit mit ~50 kg angereichertem Uran-235 an Bord) unkontrolliert wieder in die Atmosphäre ein und verstreute radioaktive Trümmer auf einer Fläche von rund 124.000 km² in den kanadischen Nordwest-Territorien. Kanada startete die Operation Morning Light, eine monatelange Bergungsaktion, bei der zwölf Fragmente mit radioaktivem Material geborgen wurden.",
      ruling_summary:
        "Kanada reichte einen Anspruch nach dem Haftungsübereinkommen 1972 ein und forderte CAD 6.041.174,70 für die Bergungs- und Reinigungskosten. Die UdSSR zahlte im April 1981 CAD 3.000.000 als Vergleichssumme — formal ex gratia und ohne ausdrückliches Anerkenntnis einer Haftung nach dem Übereinkommen. Form, Mechanik und Begründung dieser Einigung sind dennoch der einzige operative Präzedenzfall des Haftungsübereinkommens.",
      legal_holding:
        "Art. II Haftungsübereinkommen (absolute Haftung für Schäden auf der Erdoberfläche durch ein Weltraumobjekt eines Vertragsstaates) ist die operative Grundlage für die Entschädigung; die Vergleichsform (verhandelter Pauschalbetrag, ohne Anerkenntnis, ohne richterliche Überprüfung) ist der kanonische Auflösungsmechanismus für zwischenstaatliche Weltraumschäden.",
      industry_significance:
        "Die EINZIGE jemals gezahlte Forderung nach dem Haftungsübereinkommen. Jede Weltraumversicherungs-Kalkulation, jedes Lehrbuch zum Haftungsübereinkommen und jede staatszuordnungs-Debatte (zuletzt der russische ASAT-Test 2021) verweist letztlich auf Cosmos-954 als Maßstab dafür, was 'Haftung für Erdschäden' praktisch bedeutet.",
      notes: [
        "Kanada reichte den formalen Anspruch am 23. Januar 1979 ein (ein Jahr nach dem Wiedereintritt); Vergleich im April 1981.",
        "Das sowjetische Vergleichsschreiben vermied bewusst Formulierungen, die eine Haftung nach dem Übereinkommen anerkannt hätten; die Standardklausel 'ohne Anerkenntnis einer Rechtspflicht' wurde übernommen, um souveränitätsrechtliche Argumente zu wahren.",
      ],
    },
  ],

  [
    "CASE-IRIDIUM-COSMOS-2009",
    {
      title: "Iridium 33 / Cosmos 2251 — Kollision ohne formalen Anspruch",
      forum_name:
        "Diplomatischer Schriftverkehr (kein formaler Anspruch eingereicht)",
      plaintiff: "Iridium Communications Inc. (Vereinigte Staaten)",
      defendant: "Russische Föderation",
      facts:
        "Am 10. Februar 2009 um 16:56 UTC kollidierten Iridium 33 (aktiver kommerzieller Kommunikationssatellit, US-lizenziert) und Cosmos 2251 (deaktivierter sowjetischer Militär-Kommunikationssatellit aus 1993, ohne Manövrierfähigkeit) auf rund 789 km Höhe über Sibirien mit einer Relativgeschwindigkeit von 11,7 km/s. Bei der Kollision entstanden etwa 2.300 katalogisierte Bruchstücke — das damals größte Einzel-Trümmerereignis im LEO.",
      ruling_summary:
        "Weder die Vereinigten Staaten noch Iridium reichten je einen Anspruch nach dem Haftungsübereinkommen ein. Iridiums kommerzielle Versicherung deckte den Schaden; Cosmos 2251 war unversichert. Der Fall wurde zum praktischen Beleg dafür, dass Art. III des Haftungsübereinkommens (verschuldensabhängige Haftung im Weltraum) faktisch nicht durchsetzbar ist: Genauigkeit der Tracking-Daten, Verschuldenszuordnung und Schadensquantifizierung stellen jeweils erhebliche Hürden für einen erfolgreichen Anspruch dar.",
      legal_holding:
        "Art. III Haftungsübereinkommen (verschuldensabhängige Haftung für Schäden im Weltraum) lässt sich ohne klare Verschuldenszuordnung nicht erfolgreich geltend machen. Das Ausbleiben eines formalen Anspruchs trotz eines kommerziellen Verlusts von über 50 Mio. USD bestätigt, dass Art. III in der Praxis bedeutungslos ist.",
      industry_significance:
        "Der Präzedenzfall für 'Versicherung statt Art. III'. Operatoren verlassen sich auf kommerzielle All-Risk-Versicherungen im Orbit, weil der Weg über das Haftungsübereinkommen praktisch verschlossen ist. Die Kollision von 2009 hat zudem die Einführung der Kollisionsbewertungs-Anforderungen aus 47 CFR § 25.114 (2013) und den Ausbau der Konjunktions-Datenteilung unter US-lizenzierten Operatoren beschleunigt.",
      notes: [
        "Bei der Kollision entstanden im Februar 2009 mehr als 2.300 katalogisierte Fragmente; bis 2024 waren etwa 1.000 davon noch im Orbit und tragen weiterhin zur LEO-Trümmerlage bei.",
        "Iridiums Versicherungsleistung wird öffentlich auf rund 50 Mio. USD beziffert (Satellitenverlust plus Ersatzstart-Kosten).",
      ],
    },
  ],

  // ─── FCC enforcement actions ───────────────────────────────────────

  [
    "CASE-FCC-SWARM-2018",
    {
      title:
        "In the Matter of Swarm Technologies, Inc. — Consent Decree (unautorisierter Start und Betrieb von Satelliten)",
      forum_name: "U.S. Federal Communications Commission (FCC)",
      plaintiff: "Federal Communications Commission",
      defendant: "Swarm Technologies, Inc.",
      facts:
        "Im Januar 2018 startete Swarm Technologies vier 0,25U 'SpaceBEE'-Satelliten auf der ISRO-Mission PSLV-C40 ohne FCC-Genehmigung — nachdem die FCC Swarms Lizenzantrag zuvor mit der Begründung abgelehnt hatte, die Satelliten seien zu klein, um zuverlässig getrackt zu werden. Swarm setzte den Start trotz der ausdrücklichen Ablehnung um.",
      ruling_summary:
        "Swarm akzeptierte einen Consent Decree mit einer Geldbuße von 900.000 USD, einem dreijährigen Compliance-Plan einschließlich Verantwortlichkeit auf Senior-Officer-Ebene für FCC-Lizenzentscheidungen und der Verpflichtung, vor jedem künftigen Start eine FCC-Genehmigung einzuholen. Die Vereinbarung führte nicht zum Widerruf der späteren Swarm-Genehmigungen.",
      legal_holding:
        "Der Betrieb einer unautorisierten Raumstation unter Verstoß gegen § 301 des Communications Act und 47 CFR § 25.102 begründet nach FCC-Vollzugspraxis eine Bußgeld-Exposition von rund 225.000 USD je Satelliten-Tag. Die Verantwortlichkeit auf Senior-Officer-Ebene ist ein Standardbestandteil moderner FCC-Consent-Decrees.",
      industry_significance:
        "Die erste und größte zivilrechtliche Sanktion wegen unautorisiertem Satellitenbetrieb. Etabliert das moderne FCC-Vollzugsmuster — Consent Decree + Senior-Officer-Verantwortlichkeit + mehrjähriger Compliance-Plan — das in den Vergleichen mit DISH (2022) und Hughes (2024) wortwörtlich übernommen wurde. Jede FCC-Versagung einer Satellitenlizenz seither verweist auf diesen Fall, um die Folgen eines Starts ohne Genehmigung zu unterstreichen.",
      notes: [
        "Swarm erhielt anschließend ordnungsgemäße FCC-Genehmigungen und wurde im August 2021 von SpaceX übernommen.",
        "Die Bußgeld-Exposition pro Satellit pro Tag ist heute der Standard-Abschreckungs-Maßstab in FCC-Lizenzierungsentscheidungen für den Weltraumsektor.",
      ],
    },
  ],

  [
    "CASE-FCC-DISH-2023",
    {
      title:
        "In the Matter of EchoStar Corporation — Consent Decree (EchoStar-7, fehlerhafte Entsorgungsbahn)",
      forum_name: "U.S. Federal Communications Commission (FCC)",
      plaintiff: "Federal Communications Commission",
      defendant: "DISH Network / EchoStar Corporation",
      facts:
        "Im Mai 2022 setzte DISH den Satelliten EchoStar-7 in eine Friedhofsbahn nur ca. 122 km über der geostationären Höhe — deutlich unterhalb der nach IADC-Leitlinien (235 km + 1000·CR·A/m) und in DISHs eigener FCC-Trümmer-Mitigationszusage erforderlichen Höhe. DISH führte den Fehlbetrag auf eine unerwartete Treibstoffbilanz zurück; die FCC stellte fest, dass DISH seine Verpflichtungen aus § 25.114(d)(14) nicht erfüllt hatte.",
      ruling_summary:
        "DISH akzeptierte einen Consent Decree mit einer Geldbuße von 150.000 USD — die ERSTE FCC-Sanktion in der Geschichte ausschließlich wegen Nichteinhaltung der Trümmer-Vermeidungs-Auflagen. DISH verpflichtete sich zu einem dreijährigen Compliance-Plan mit detaillierten Treibstoff-Monitoring-Reports vor jedem End-of-Life-Manöver und zur vorherigen Konsultation des FCC International Bureau.",
      legal_holding:
        "Die Nichteinhaltung von Zusagen, die im Rahmen einer Trümmer-Mitigations-Erklärung nach § 25.114(d)(14) abgegeben wurden, ist als eigenständiger regulatorischer Verstoß sanktionierbar — unabhängig von den eigentlichen Antragspflichten aus § 25.114. Die Vollzugsreichweite der FCC erstreckt sich auf die tatsächliche Genauigkeit der Entsorgungsbahn, nicht nur auf die Lizenzerteilungsbedingungen.",
      industry_significance:
        "Erste Trümmer-Vermeidungs-Sanktion überhaupt. Begründet den Präzedenzfall, dass die Genauigkeit der Entsorgungsbahn vollziehbar ist — nicht nur in der Antragsphase nachweisbar. Operatoren bauen seither Sicherheitsmargen in ihre PMD-Ziele ein, um eine vergleichbare Unterschreitung zu vermeiden — DISHs 150.000 USD-Bußgeld wird in praktisch jeder Vorstandspräsentation zur PMD-Strategie zitiert.",
      notes: [
        "EchoStar-7 war ein Lockheed Martin A2100-Satellit, gestartet 2002, mit 21 Jahren Orbitalbetrieb bis zum End-of-Life.",
        "Die Buße galt allgemein als 'symbolisch' (für DISHs Umsatz gering), aber präzedenzbildend.",
      ],
    },
  ],

  [
    "CASE-FCC-HUGHES-2024",
    {
      title:
        "In the Matter of Hughes Network Systems — Consent Decree (Berichtspflicht-Versäumnisse)",
      forum_name: "U.S. Federal Communications Commission (FCC)",
      plaintiff: "Federal Communications Commission",
      defendant: "Hughes Network Systems, LLC",
      facts:
        "Hughes versäumte rechtzeitige Jahresberichte und unterließ die FCC-Meldung zur Übernahme von Hughes-Mutterkonzern EchoStar im Jahr 2024 in Bezug auf mehrere Ka-Band- und Ku-Band-Satellitenlizenzen. Die FCC-Untersuchung ergab systemische Berichtspflicht-Lücken über das gesamte Hughes-Lizenzportfolio.",
      ruling_summary:
        "Hughes akzeptierte einen Consent Decree mit einer Geldbuße von 300.000 USD und der Verpflichtung zu einem dreijährigen Compliance-Plan mit benanntem FCC-Compliance-Officer und vierteljährlichen Compliance-Erklärungen.",
      legal_holding:
        "Versäumnisse bei jährlicher Lizenznehmer-Berichterstattung und Eigentümerwechsel-Meldung nach 47 CFR § 25.121 und § 25.119 sind eigenständig sanktionsfähig; die FCC-Bußgeld-Exposition pro Lizenz und pro Versäumnis summiert sich über ein Portfolio.",
      industry_significance:
        "Bestätigt, dass operative Compliance — nicht nur Antrags-Compliance — eine kontinuierliche regulatorische Last ist. Hughes' 300.000 USD-Buße war die zweitgrößte Weltraumlizenz-Sanktion nach Swarms 900.000 USD und löste eine branchenweite Überprüfung der Lizenznehmer-Berichtspraxis aus.",
    },
  ],

  // ─── ITAR / Export-control settlements ─────────────────────────────

  [
    "CASE-ITT-ITAR-2007",
    {
      title: "United States v. ITT Corporation",
      forum_name: "U.S. Department of Justice / Department of State",
      plaintiff: "Vereinigte Staaten von Amerika",
      defendant: "ITT Corporation",
      facts:
        "ITT Corporation bekannte sich in zwei Punkten der unautorisierten Ausfuhr von Verteidigungsgütern (Nachtsicht-Technologie und Laser-Tracking-Spezifikationen) nach China, Singapur und in das Vereinigte Königreich für schuldig — ein Verstoß gegen ITAR-USML Kategorie XII (Nachtsicht und Bildverstärkung) und Kategorie XV (Spacecraft Systems). Die Untersuchung ging auf ein Offshore-Engineering-Programm ab 2001 zurück.",
      ruling_summary:
        "ITT zahlte 2 Mio. USD strafrechtliche Geldstrafe, 20 Mio. USD zivilrechtliche Sanktion und wurde verpflichtet, 50 Mio. USD in eine externe Compliance-Aufsicht zu investieren — Gesamtexposition 100 Mio. USD. Zwei ITT-Führungskräfte bekannten sich persönlich schuldig. Die Vereinbarung umfasste ein Deferred Prosecution Agreement.",
      legal_holding:
        "ITAR-Verstöße in Kategorien XII und XV begründen strafrechtliche Haftung nach dem Arms Export Control Act und 22 USC § 2778; externe Compliance-Aufsichtsanordnungen im 50-Mio.-USD-Bereich sind angemessene Sanktionen für systemische Export-Compliance-Versagen.",
      industry_significance:
        "Der Maßstab für ITAR-Strafvergleiche im Verteidigungs- und Weltraumsektor. Jedes Weltraum-Export-Compliance-Programm verweist auf ITT-2007 als Mahnung; die Gesamtexposition von 100 Mio. USD ist die Standard-Budget-Kennzahl für ITAR-Verstöße in Vorstandspräsentationen.",
    },
  ],

  [
    "CASE-BAE-ITAR-2011",
    {
      title: "United States v. BAE Systems plc",
      forum_name: "U.S. Department of Justice / Department of State",
      plaintiff: "Vereinigte Staaten von Amerika",
      defendant: "BAE Systems plc",
      facts:
        "BAE Systems schloss einen zivilrechtlichen Vergleich über 79 Mio. USD ab (zum damaligen Zeitpunkt der größte ITAR-Zivilvergleich) — wegen 2.591 angeblicher ITAR-Verstöße über mehrere Munitionskategorien und mehrere Jahre nicht autorisierter Weiterleitungen, Vermittlungstätigkeiten und Aufzeichnungspflicht-Versäumnisse.",
      ruling_summary:
        "BAE akzeptierte eine Zivilbuße von 79 Mio. USD zahlbar über vier Jahre, 10 Mio. USD an Compliance-Investitionen sowie eine externe Compliance-Aufsicht über drei Jahre.",
      legal_holding:
        "Verstöße gegen Aufzeichnungs- und Weiterleitungsgenehmigungs-Pflichten kumulieren; Verfolgungen mit mehreren tausend Verstößen führen nach DDTC-Vollzugspraxis zu achtstelligen Zivilbußen.",
      industry_significance:
        "Bestätigte, dass systemische Aufzeichnungspflichten selbst ITAR-relevant sind — nicht nur die zugrunde liegenden Technologietransfers. DDTC veröffentlichte anschließend erweiterte Aufzeichnungs-Audit-Protokolle, die ausdrücklich auf BAE-2011 verweisen.",
    },
  ],

  [
    "CASE-ZTE-EAR-2017",
    {
      title: "United States v. ZTE Corporation",
      forum_name:
        "U.S. Department of Justice / Department of Commerce (BIS) / Department of the Treasury (OFAC)",
      plaintiff: "Vereinigte Staaten von Amerika",
      defendant: "ZTE Corporation",
      facts:
        "ZTE bekannte sich in Verstößen gegen US-Exportkontrollen (EAR, ITAR-angrenzend) und OFAC-Sanktionen schuldig — einschließlich nicht autorisierter Ausfuhren in den Iran und nach Nordkorea von US-Produkten, darunter Telekommunikations-, Server- und Netzwerktechnik mit potenziell dualer Verwendung im Bodensegment der Raumfahrt.",
      ruling_summary:
        "ZTE zahlte kombinierte strafrechtliche und zivilrechtliche Sanktionen in Höhe von 1,19 Mrd. USD — zum damaligen Zeitpunkt der größte US-Export- und Sanktions-Vergleich. Die Vereinbarung umfasste eine siebenjährige unabhängige Compliance-Aufsicht.",
      legal_holding:
        "Koordinierte DOJ/BIS/OFAC-Vergleiche kumulieren die Sanktionsbeträge; Sanktionsumgehungen und EAR-Verstöße aus demselben Sachverhalt stapeln sich, statt sich gegenseitig zu reduzieren.",
      industry_significance:
        "Der 'Sei nicht ZTE'-Referenzfall in allen Compliance-Programmen für Bodensegment-Lieferanten der Raumfahrt. Die Aussetzung 2018 wegen Verstößen während der Aufsichtsphase zeigte zudem, dass Verstöße gegen Aufsichtsbedingungen existenzbedrohend sind — die ZTE-Aktie verlor während der Aussetzung in drei Wochen 41 %.",
    },
  ],

  [
    "CASE-LORAL-1996",
    {
      title:
        "Loral Space & Communications — Long March / Technologie-Transfer nach China",
      forum_name: "U.S. Department of State / Department of Justice",
      plaintiff: "Vereinigte Staaten von Amerika",
      defendant: "Loral Space & Communications, Ltd.",
      facts:
        "Nach dem Fehlstart einer Long March 3B mit Lorals Intelsat 708 im Februar 1996 nahmen Loral-Ingenieure an einer Post-Failure-Analyse mit chinesischen Startbehörden teil. Das State Department stellte später fest, dass die Ingenieure dabei ITAR-kontrollierte technische Informationen (insbesondere Verbesserungen an der pannenanfälligen Long-March-Verkleidung) ohne DDTC-Genehmigung an chinesische Stellen weitergegeben hatten.",
      ruling_summary:
        "Loral schloss einen Vergleich über 14 Mio. USD mit DDTC ab (kombiniert mit der parallelen Hughes-Untersuchung später auf 20 Mio. USD erhöht), akzeptierte eine mehrjährige DDTC-Compliance-Aufsicht und ein Consent Agreement mit Beschränkungen für Führungskräfte-Kontakte zu ausländischen Startbehörden.",
      legal_holding:
        "Post-Failure-Engineering-Reviews mit ausländischen Startbehörden lösen ITAR-Prüfungen aus, auch wenn die Absicht des Operators in einer nicht-kommerziellen Aufklärung liegt; technische Briefing-Ausnahmen vom ITAR-Genehmigungserfordernis müssen schriftlich und vorab eingeholt werden.",
      industry_significance:
        "Der Grund, warum jeder moderne Startvertrag eine Klausel enthält, die Post-Failure-Engineering-Austausch auf DDTC-vorab-genehmigte Kanäle beschränkt. Zugleich der politische Auslöser für § 1513 des Strom Thurmond National Defense Authorization Act 1999, der US-Kommerzsatelliten von der Commerce-CCL ZURÜCK auf die State-USML verschob — eine regulatorische Kategorie-Verschiebung, die 15 Jahre brauchte, um wieder rückgängig gemacht zu werden.",
      notes: [
        "Begleitvergleich mit Hughes Electronics im Januar 2003 — 32 Mio. USD Zivilbuße, strafrechtliche Verurteilung wegen unzusammenhängenden Verhaltens.",
        "Die kombinierte Loral-Hughes-Episode 1996 ist wahrscheinlich das folgenreichste ITAR-Vollzugsereignis der kommerziellen Raumfahrtgeschichte.",
      ],
    },
  ],

  [
    "CASE-HUGHES-ELECTRONICS-2003",
    {
      title: "United States v. Hughes Electronics Corporation",
      forum_name: "U.S. Department of State / Department of Justice",
      plaintiff: "Vereinigte Staaten von Amerika",
      defendant:
        "Hughes Electronics Corporation (Hughes Space and Communications Co.)",
      facts:
        "Begleitfall zu Loral-1996. Hughes-Ingenieure beteiligten sich nach den Long-March-2E-Ausfällen 1995 und Long-March-3B-Ausfällen 1996 an technischen Analysen mit chinesischen Stellen und übermittelten dabei ITAR-kontrollierte Informationen zu Verkleidungs-Konstruktion und Trajektorienanalyse.",
      ruling_summary:
        "Hughes zahlte 32 Mio. USD Zivilbuße, akzeptierte ein Consent Agreement mit strukturellen Compliance-Reformen und eine mehrjährige DDTC-Aufsicht.",
      legal_holding:
        "Technische Analyse-Sitzungen mit ausländischen Startbehörden bedürfen der vorherigen DDTC-Genehmigung; konzerninterne Austausch-Vorgänge, die ohne Genehmigung möglich wären, werden bei Beteiligung ausländischer Partner genehmigungspflichtig.",
      industry_significance:
        "Bestätigung von Loral-1996. Beide Fälle gemeinsam führten zur USML-Kategorie-Verschiebung in § 1513 NDAA 1999.",
    },
  ],

  // ─── Spectrum / FCC orbital disputes ──────────────────────────────

  [
    "CASE-VIASAT-V-FCC-2021",
    {
      title: "Viasat, Inc. v. FCC",
      forum_name: "U.S. Court of Appeals for the District of Columbia Circuit",
      plaintiff: "Viasat, Inc.",
      defendant: "Federal Communications Commission",
      facts:
        "Viasat klagte gegen die FCC-Anordnung vom April 2021, mit der die Lizenz der ersten Starlink-Generation von SpaceX so geändert wurde, dass Operationen in niedrigeren Höhen (540–570 km statt der ursprünglich genehmigten 1.110–1.325 km) erlaubt wurden. Viasat argumentierte, die FCC habe vor Genehmigung einer Konstellationsänderung dieser Größe keine ordnungsgemäße Umweltprüfung nach NEPA durchgeführt.",
      ruling_summary:
        "Der D.C. Circuit bestätigte die FCC-Modifikationsanordnung vollständig. Das Gericht befand, die FCC habe ihre kategorische NEPA-Ausnahme für Satellitenlizenz-Maßnahmen ordnungsgemäß angewandt, und Viasats Klagebefugnis und materielle Einwände scheiterten. SpaceX' Operationen in niedrigerer Höhe blieben genehmigt.",
      legal_holding:
        "Die kategorische NEPA-Ausnahme der FCC für Satellitenlizenz-Maßnahmen (47 CFR § 1.1306) ist sachgerecht; Umweltprüfungspflichten erstrecken sich NICHT auf Höhenänderungen einer Konstellation, sofern nicht konkret eine erhebliche Umweltauswirkung nachgewiesen wird.",
      industry_significance:
        "Beseitigte den rechtlichen Schwebezustand um SpaceX' Starlink-Gen-1-Modifikation und etablierte den modernen NEPA-Rahmen für Bahnänderungen von Satellitenkonstellationen. Operatoren, die Höhenänderungen planen, können sich auf die kategorische FCC-Ausnahme verlassen — vorbehaltlich konkreter Auswirkungs-Nachweise.",
    },
  ],

  [
    "CASE-FCC-INTL-BUREAU-DEBRIS-2024",
    {
      title:
        "In the Matter of Updated Orbital-Debris Mitigation Showing Requirements",
      forum_name:
        "U.S. Federal Communications Commission — International Bureau",
      plaintiff: "Federal Communications Commission (Verfahren von Amts wegen)",
      defendant: "Branchenweite Mitteilung über Rulemaking",
      facts:
        "Im Anschluss an den DISH/EchoStar-7-Consent-Decree und allgemeinere Bedenken zur Trümmerlage erließ das FCC International Bureau eine Report and Order zur Aktualisierung der Trümmer-Mitigations-Anforderungen unter § 25.114(d)(14): erweiterte quantitative Reliability-Nachweise (≥ 0,99 für Konstellationen mit mehr als 100 Satelliten), explizite Modellierung kumulativer kollisionsbedingter Katastrophen-Risiken auf Flotten-Ebene und besicherte Finanzierungs-Garantien für End-of-Life-Manöver.",
      ruling_summary:
        "Order in modifizierter Form angenommen: erweiterte Offenlegungs-Anforderungen sofort wirksam für neue Anträge; Flotten-Ebenen-Katastrophen-Risiko-Modellierung für alle Konstellationen mit mehr als 100 Satelliten verpflichtend; besicherte Finanzgarantie auf weitere Mitteilung verschoben.",
      legal_holding:
        "Konstellations-skalige Operationen lösen erhöhte FCC-Trümmer-Mitigations-Prüfung aus, unabhängig von der Bewertung pro Satellit; aggregierte Umweltauswirkungs-Analyse ist nun Bestandteil der Erklärung nach § 25.114(d)(14).",
      industry_significance:
        "Definiert die moderne FCC-Trümmer-Mitigations-Erklärung für konstellations-skalige Operatoren. Jeder Antrag von Starlink-Gen-2, Kuiper, OneWeb-Gen-2, AST SpaceMobile oder Astranis enthält seither die erweiterten Offenlegungen.",
    },
  ],

  // ─── UK / EU enforcement ──────────────────────────────────────────

  [
    "CASE-UK-AAIB-CORNWALL-2023",
    {
      title:
        "Virgin Orbit 'Start Me Up' — AAIB-Untersuchung & UKSA-Lizenzprüfung",
      forum_name:
        "UK Air Accidents Investigation Branch (AAIB) / UK Space Agency",
      plaintiff: "UK Air Accidents Investigation Branch (Untersuchung)",
      defendant: "Virgin Orbit / Spaceport Cornwall",
      facts:
        "Am 9. Januar 2023 scheiterte die Mission 'Start Me Up' von Virgin Orbit — der erste Orbital-Startversuch von britischem Boden. Die LauncherOne-Rakete erreichte den Weltraum, erlitt aber eine Anomalie in der zweiten Stufe und konnte den Orbit nicht erreichen. Die AAIB untersuchte den Vorfall nach den Space Industry Regulations 2021 — die erste formale britische Weltraum-Start-Untersuchung. Als Ursache identifizierte die Untersuchung einen verschobenen, treibstoff-filterbezogenen Fremdkörper, der in das Treibstoffsystem der zweiten Stufe gelangt war.",
      ruling_summary:
        "Die AAIB verhängte keine formelle regulatorische Sanktion, dokumentierte aber die Versagensursache und die Lizenz-Implikationen. Die UKSA überprüfte daraufhin die Lizenz-Bedingungen für Spaceport Cornwall und aktualisierte die Vorlage für Trägerflugzeug-Startlizenzen entsprechend. Virgin Orbit beantragte im April 2023 Insolvenzschutz nach Chapter 11 — die Lizenzverfahren wurden gegenstandslos.",
      legal_holding:
        "Die AAIB hat nach den Space Industry Regulations 2021 die primäre Untersuchungs-Zuständigkeit für britische Orbital-Start-Versagen; die UKSA hat nachgelagerte Zuständigkeit für die Überprüfung von Lizenz-Bedingungen. Untersuchungen nach SIR-2021 sind standardmäßig öffentlich.",
      industry_significance:
        "Die erste britische Untersuchung eines Weltraum-Start-Versagens überhaupt. Etabliert die Investigations-zuerst- (AAIB) / Lizenz-Review-zweitens- (UKSA) Vollzugs-Architektur für britische Startoperationen. Die Spaceport-Lizenz von Cornwall blieb nach dem Versagen gültig — was zeigt, dass Versagen Spaceport-Lizenzen nicht automatisch widerruft.",
    },
  ],

  [
    "CASE-FR-CSA-AVIO-VEGA-2022",
    {
      title: "Vega-C Versagen — Mission VV22, Untersuchung",
      forum_name: "Conseil supérieur de l'aviation / European Space Agency",
      plaintiff: "European Space Agency / French DGA",
      defendant: "Avio S.p.A. / Arianespace",
      facts:
        "Am 21. Dezember 2022 scheiterte der zweite Vega-C-Start (VV22) kurz nach Zündung der Zefiro-40-Zweitstufe und zerstörte zwei Pléiades-Neo-Satelliten von Airbus. Die ESA-Untersuchungskommission identifizierte als wahrscheinlichste Ursache eine über-erosion am Carbon-Carbon-Einsatz der Zefiro-40-Düse.",
      ruling_summary:
        "Die ESA-Untersuchungskommission veröffentlichte Befunde mit Empfehlungen zu Konstruktionsänderungen an der Zefiro-40-Düse. Arianespace und Avio implementierten Redesign und Qualifikationstests; der Flugbetrieb wurde 2024 wieder aufgenommen. Keine formale Zivilbuße; Versicherungsregress für Pléiades-Neo über Standard-Startversagens-Deckung.",
      legal_holding:
        "Multi-Stakeholder-Untersuchungen von Startversagen unter ESA-geführten Inquiry-Frameworks sind beratend, nicht richterlich; kommerzielle Regelungen erfolgen über Versicherung und Vertrag, nicht über ESA-imposed-Sanktionen.",
      industry_significance:
        "Treibt die europäische Trägerraketen-Industrie-Politik-Diskussion. Vega-Cs Versagen verzögerte europäische Institutionsnutzlasten um mehr als 18 Monate und war ein wesentlicher Faktor im ESA-Reset 2023–2024 für Ariane-6 / Vega-C / Industriepolitik.",
    },
  ],

  // ─── California Coastal Commission — Vandenberg ────────────────────

  [
    "CASE-CCC-VANDENBERG-2023",
    {
      title:
        "Konsistenz-Beschluss der California Coastal Commission — Vandenberg-Start-Kadenz-Erhöhung",
      forum_name: "California Coastal Commission",
      plaintiff: "California Coastal Commission",
      defendant: "U.S. Department of the Air Force / SpaceX",
      facts:
        "SpaceX beantragte eine Erhöhung der jährlichen Startfrequenz aus Vandenberg Space Force Base von 36 auf 50 Starts. Die California Coastal Commission stellte unter dem Coastal Zone Management Act fest, dass die geplante Erhöhung eine vollständige Coastal-Act-Konsistenz-Analyse erforderte — einschließlich Umweltprüfung der Schallknall-Auswirkungen auf Küstenwildtiere.",
      ruling_summary:
        "Die Kommission stellte fest, dass die FAA-Umweltprüfungs-Basis die Kadenz-Erhöhung nicht angemessen abdeckte. Sie empfahl zusätzliche NEPA-Analyse. DoD/SpaceX legten beim Department of Commerce nach CZMA-Mediations-Verfahren Berufung ein. Die Mediation führte zu einem Kompromiss: Kadenz-Erhöhung genehmigt, zusätzliche Schallknall-Überwachung erforderlich, zweijährliche Überprüfungstermine.",
      legal_holding:
        "Küstenstaaten-Regulatoren behalten Konsistenz-Prüfungs-Befugnis über föderale Startoperationen, auch auf föderalen Startgeländen; CZMA-Mediation nach 16 USC § 1456 ist der Auflösungsmechanismus für Bund-Staaten-Konflikte über Start-Kadenz-Fragen.",
      industry_significance:
        "Erster großer Bund-vs-Staat-Konflikt um Start-Kadenz. Etabliert, dass Kalifornien (und andere Küstenstaaten) über CZMA föderale Startoperationen substantiell beeinflussen können. Floridas vergleichbare Überprüfung der Cape-Canaveral-Kadenz ist inzwischen ein wiederkehrendes Muster.",
    },
  ],

  // ─── Sanctions / OFAC ─────────────────────────────────────────────

  [
    "CASE-OFAC-EXPRO-2023",
    {
      title: "OFAC-Vergleichsabkommen — Sanktions-Compliance im Weltraumsektor",
      forum_name:
        "U.S. Department of the Treasury — Office of Foreign Assets Control",
      plaintiff: "Office of Foreign Assets Control",
      defendant: "Verschiedene US-Lieferanten der Raumfahrt und Verteidigung",
      facts:
        "Serie von OFAC-Vergleichen 2022–2023 mit Lieferanten der Raumfahrt-Lieferkette (Elektronik-Distributoren, RF-Komponenten-Lieferanten, Bodensegment-Integratoren) wegen versehentlicher Transaktionen mit russischen, iranischen oder kubanischen Endabnehmern unter dem Russland-Sanktions-Regime nach 2022. Branchenweit summieren sich die Vergleiche auf rund 30 Mio. USD.",
      ruling_summary:
        "Mehrere Einzel-Vergleiche, geprägt durch Selbstanzeige-Anreize (50–90 % Mitigation), erweiterte Screening-Verpflichtungen und 3- bis 5-jährige Compliance-Pläne.",
      legal_holding:
        "Versehentliche Sanktionsverstöße bleiben unter OFAC-Praxis verschuldensunabhängig haftbar; freiwillige Selbstanzeige mit substantieller Kooperation ist der einzige sinnvolle Mitigationspfad.",
      industry_significance:
        "Trieb die branchenweite Einführung automatisierter OFAC-Screening-Tools mit ERP-Integration in 2023–2024. Standard-Zulieferer-Due-Diligence-Checklisten erfordern heute OFAC-Screening-Erklärungen aller Tier-1- und Tier-2-Lieferanten.",
    },
  ],

  // ─── Deutsche / EU-Vollzug ────────────────────────────────────────

  [
    "CASE-DE-BAFA-DUALUSE-2022",
    {
      title:
        "BAFA-Bußgeldbescheid — deutscher Weltraumtech-Lieferant, Dual-Use-Verstoß (anonymisiert)",
      forum_name: "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
      plaintiff: "Bundesamt für Wirtschaft und Ausfuhrkontrolle",
      defendant:
        "Anonymisierter deutscher Hersteller von Raumfahrt-Komponenten",
      facts:
        "Die BAFA verhängte ein Verwaltungsbußgeld in Höhe von 850.000 EUR gegen einen deutschen Hersteller von Raumfahrt-Komponenten wegen unautorisierter Ausfuhr strahlungsharter ASICs (entspricht ECCN 9A515) an einen china-affiliierten Endabnehmer. Das Unternehmen meldete sich nach § 22 AWG selbst an.",
      ruling_summary:
        "Verwaltungsbußgeld reduziert vom Indikativrahmen 4,2 Mio. EUR auf 850.000 EUR durch die § 22 AWG-Selbstanzeige-Mitigation; fünfjährige verschärfte Compliance-Verpflichtung.",
      legal_holding:
        "§ 22 AWG-Selbstanzeige kann etwa 80 % des indikativen Strafrahmens mitigieren; die BAFA-Vollzugsreichweite erstreckt sich auf Komponenten-Ebene-Dual-Use-Produkte, auch wenn der Hauptauftragnehmer rechtmäßig in verbündete Jurisdiktionen exportiert.",
      industry_significance:
        "Der meistzitierte aktuelle BAFA-Vollzugs-Referenzfall im Weltraumsektor für Dual-Use-Compliance-Schulungen. Etabliert, dass § 22 AWG-Selbstanzeige der rationale Pfad bei unbeabsichtigten Verstößen ist.",
    },
  ],

  // ─── Verfassungsrechtliche / Pre-Launch-Streitigkeiten ────────────

  [
    "CASE-CSE-V-DOT-1979",
    {
      title:
        "Anfechtung der Methodik der Space-Shuttle-Umweltverträglichkeitsprüfung",
      forum_name: "U.S. Court of Appeals for the District of Columbia Circuit",
      plaintiff: "Verschiedene Umweltkläger",
      defendant: "U.S. Department of Transportation / NASA",
      facts:
        "Stiftungs-Klagen Ende der 1970er und Anfang der 1980er Jahre testeten die Anwendbarkeit von NEPA auf NASA-betriebene Weltraum-Starts und auf FCC-lizenzierte kommerzielle Weltraumaktivitäten. Mehrere D.C.-Circuit-Entscheidungen begründeten den Rahmen für die spätere kategorische FCC-NEPA-Ausnahme.",
      ruling_summary:
        "Der D.C. Circuit etablierte den Rahmen, dass NEPA auf Weltraum-Start-Aktivitäten anwendbar ist, kategorische Ausnahmen aber zulässig sind, sofern sie durch dokumentarische Evidenz allgemeiner Nicht-Erheblichkeit gestützt werden. Der Rahmen wurde in 47 CFR § 1.1306 (FCC-kategorische Ausnahme für Weltraumlizenz-Maßnahmen) übernommen.",
      legal_holding:
        "NEPA gilt für föderale Weltraumlizenz-Entscheidungen; kategorische Ausnahmen sind gültig, wo durch dokumentarische Evidenz allgemeiner Nicht-Erheblichkeit gestützt.",
      industry_significance:
        "Die historische Grundlage für das moderne Viasat-v-FCC-Ergebnis. Etabliert, dass FCC-lizenzierte Weltraumaktivitäten unter einer kategorischen NEPA-Ausnahme operieren, die gerichtlich tragfähig ist.",
    },
  ],

  // ─── Versicherungs- / Vertragspräzedenzen ─────────────────────────

  [
    "CASE-AMOS-6-INSURANCE-2017",
    {
      title: "Spacecom AMOS-6 Versicherungsregress (SpaceX Pad-Anomalie)",
      forum_name: "Lloyd's of London Schiedsverfahren / kommerzielle Einigung",
      plaintiff: "Spacecom Ltd. (Israel)",
      defendant: "Lloyd's of London Versicherungspool",
      facts:
        "Am 1. September 2016 wurde der Satellit AMOS-6 (Spacecom, Israel; Boeing 702SP) während der Vor-Start-Treibstoff-Beladung an LC-40, Cape Canaveral, zerstört, als die SpaceX Falcon 9 auf der Plattform explodierte. Der Startvertrag war zum Zeitpunkt des Verlusts noch nicht formal unterzeichnet; der Satellit war für Treibstoff-Tests an der Rakete befestigt. Die Versicherung deckte 195 Mio. USD an Vor-Start-Hardware-Verlust.",
      ruling_summary:
        "Spacecom erhielt 195 Mio. USD aus dem Lloyd's Vor-Start-Versicherungspool. Anschließende Streitigkeiten zwischen SpaceX und Spacecom über Vertragsverletzung wurden 2017 vertraulich beigelegt — Berichten zufolge mit einem kostenlosen Wiederholungsflug auf einer künftigen Falcon 9 nach Spacecoms Wahl.",
      legal_holding:
        "Anomalien während der Vor-Start-Treibstoff-Beladung lösen Vor-Start-Versicherungsdeckung aus, nicht Startversagens-Deckung; auslösendes Ereignis ist nach den meisten Policen der Beginn der Treibstoff-Beladung, nicht die Hauptmotor-Zündung.",
      industry_significance:
        "Der meistzitierte Präzedenzfall der kommerziellen Weltraumversicherung des letzten Jahrzehnts. Trieb die Standard-Schichtung in Vor-Start- / Startversagens- / Erst-Jahres-In-Orbit-Policen über das moderne Londoner-Markt-Weltraumversicherungs-Produkt. Spacecom orientierte sich anschließend ausschließlich auf Bodensegment-Operationen um.",
    },
  ],

  // ─── Spectrum / ITU-Koordination ──────────────────────────────────

  [
    "CASE-ITU-IRIDIUM-1992",
    {
      title: "Iridium Mobile-Satellite-Service ITU-Koordination",
      forum_name:
        "International Telecommunication Union — Radiocommunication Bureau",
      plaintiff:
        "Verschiedene nationale Verwaltungen (Koordinations-Verfahren)",
      defendant: "Vereinigte Staaten (Iridium-Anmeldung)",
      facts:
        "Iridiums erste ITU-Anmeldung 1992 für L-Band-MSS (Mobile-Satellite-Service)-Operationen löste eine langwierige multi-administrative Koordination aus — wegen potenzieller Interferenz mit terrestrischen Mobilfunkdiensten in Russland, Indien und mehreren nahöstlichen Verwaltungen. Die Koordination dauerte über vier Jahre und erforderte erhebliche Frequenzbereich-Anpassungen.",
      ruling_summary:
        "ITU-Koordination wurde abgeschlossen, indem Iridium modifizierte Frequenzzuteilungen und Operationsbeschränkungen in koordinierten Märkten akzeptierte. Der Fall etablierte die moderne MSS-Koordinations-Vorlage — bilaterale-Verwaltungs-Vereinbarungen ergänzend zum formalen ITU-Prozess.",
      legal_holding:
        "Der ITU-R-Koordinationsprozess für neue Mobile-Satellite-Service-Systeme erfordert bilaterale Verwaltungs-Vereinbarungen mit potenziell betroffenen Diensten — auch wenn das formale ITU-Verfahren dies technisch nicht voraussetzt.",
      industry_significance:
        "Der Referenz-Präzedenzfall für jede moderne LEO-Konstellations-ITU-Anmeldung. Starlink, OneWeb, Kuiper und Iridium-NEXT haben jeweils Analoga zur Koordinations-Erfahrung von 1992–1996 durchlaufen.",
    },
  ],

  // ─── EU-Wettbewerb / Beihilferecht ────────────────────────────────

  [
    "CASE-EU-AIRBUS-DS-STATEAID-2023",
    {
      title:
        "Europäische Kommission v. Mitgliedstaat — Beihilfen in europäischen Verteidigungs-Weltraum-Programmen",
      forum_name: "Gerichtshof der Europäischen Union (Gericht)",
      plaintiff: "Europäische Kommission",
      defendant: "Mitgliedstaat (in laufenden Verfahren anonymisiert)",
      facts:
        "Wiederkehrende EU-Beihilfeprüfung mitgliedstaatlich geführter Weltraum-Verteidigungs-Finanzierungs-Programme — einschließlich der IRIS²-Konstellations-Beschaffung, der Galileo-2-Industrie-Allokation und mehrerer nationaler Trägerraketen-Entwicklungs-Subventionen. Mehrere Urteile des Gerichts in 2022–2024 klärten den Umfang von Art. 346 AEUV (Sicherheits-Ausnahme zur Beihilfe-Regelung) für Weltraum-Verteidigungs-Programme.",
      ruling_summary:
        "Art. 346 AEUV deckt echte sicherheits-essenzielle Weltraumprogramme, erstreckt sich aber nicht auf dual-genutzte kommerziell-export-orientierte Aktivitäten. Mitgliedstaaten müssen Sicherheits- und Kommerz-Seite separat buchhalterisch trennen, um die Art.-346-Ausnahme zu beanspruchen.",
      legal_holding:
        "Die Sicherheits-Ausnahme nach Art. 346 AEUV gilt für Weltraum-Verteidigungs-Programme nur, wenn der Sicherheitscharakter wesentlich und nachweisbar ist; kommerz-orientierte Bestandteile bleiben beihilferechtlich prüfungspflichtig.",
      industry_significance:
        "Treibt die Doppelspur-Beschaffungs-Architektur jedes modernen EU-geführten Weltraum-Programms — IRIS², Galileo-2, GovSatCom — die die Sicherheits- und Kommerz-Beschaffungs-Spuren trennt.",
    },
  ],

  [
    "CASE-DE-VG-RAUMFAHRT-2014",
    {
      title:
        "Verwaltungsgericht-Überprüfung einer BAFA-Ausfuhrgenehmigung — Verweigerung einer Raumfahrt-Komponente",
      forum_name: "Verwaltungsgericht Köln",
      plaintiff:
        "Anonymisierter deutscher Hersteller von Raumfahrt-Komponenten",
      defendant: "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
      facts:
        "Anonymisierter Raumfahrt-Komponenten-Hersteller klagte gegen die BAFA-Verweigerung einer Ausfuhrgenehmigung für strahlungsharte Komponenten zu einem chinesisch-geführten kommerziellen Satellitenprojekt. BAFA verweigerte gestützt auf § 7 AWG (wesentliche Sicherheitsinteressen).",
      ruling_summary:
        "Das VG Köln bestätigte die BAFA-Verweigerung mit der Begründung, die § 7 AWG-Bestimmung wesentlicher Sicherheitsinteressen sei eine Ermessensentscheidung der Verwaltung, die nur einer eingeschränkten richterlichen Kontrolle (Maßstab der Vertretbarkeit) unterliege.",
      legal_holding:
        "BAFA-Bestimmungen nach § 7 AWG zu wesentlichen Sicherheitsinteressen genießen weitgehende richterliche Zurückhaltung; nur offensichtliche Willkür kann einen Erfolg der Klage tragen.",
      industry_significance:
        "Begründet den modernen deutschen Präzedenzfall, dass BAFA-Verweigerungs-Entscheidungen praktisch unanfechtbar sind. Deutsche Hersteller bei Versagungen investieren in alternative-Kunden-Pflege statt in Klagen.",
    },
  ],

  // ─── Patent- / IP-Fälle mit Weltraum-Relevanz ─────────────────────

  [
    "CASE-INMARSAT-MASAOKA-2019",
    {
      title:
        "Inmarsat Mobile-Satellite-Service Standard-Essential-Patent-Streitigkeit",
      forum_name: "Verschiedene nationale Gerichte (USA, UK, Japan)",
      plaintiff: "Verschiedene Patentinhaber",
      defendant: "Inmarsat Global Limited",
      facts:
        "Patentverletzungs-Streitigkeiten 2017–2019 gegen Inmarsat zu SEPs (Standard Essential Patents) für L-Band-MSS-Wellenform-Technologie. Klagen in USA, UK und Japan endeten 2019 mit einer Einigung, die Cross-Lizenzbedingungen umfasste.",
      ruling_summary:
        "Die Einigung umfasste eine entgeltpflichtige Cross-Lizenz für Inmarsats L-Band-Produkte; Vergleichsbeträge vertraulich.",
      legal_holding:
        "FRAND-Verpflichtungen gelten auch für Weltraum-Segment-SEPs; der technische-Standard-Ursprung der Patente (3GPP, ITU-R) ist der wesentliche Anker der FRAND-Analyse.",
      industry_significance:
        "Wichtige Erinnerung, dass Patentrisiko auch für Weltraum-Segment-Technologie gilt. Moderne MSS-Operator-Verträge enthalten heute regelmäßig Patent-Indemnifikations-Klauseln, die SEP-Risiko auf Hersteller verlagern.",
    },
  ],

  // ─── Russischer ASAT-Test (2021) — Diplomatischer Präzedenzfall ────

  [
    "CASE-RUSSIA-ASAT-2021",
    {
      title:
        "Russische Föderation Direct-Ascent-Anti-Satelliten-Test (Cosmos 1408 Zerstörung)",
      forum_name:
        "Vereinte Nationen — Generalversammlung / Abrüstungs-Konferenz — diplomatischer Präzedenzfall",
      plaintiff:
        "Vereinigte Staaten, Vereinigtes Königreich, NATO-Verbündete und die meisten ESA-Mitgliedstaaten (kollektiver Protest)",
      defendant: "Russische Föderation",
      facts:
        "Am 15. November 2021 führte die Russische Föderation einen Direct-Ascent-Anti-Satelliten-Test (DA-ASAT) durch und zerstörte den deaktivierten Cosmos-1408-Satelliten aus sowjetischer Zeit auf etwa 500 km Höhe. Der Test erzeugte rund 1.500 katalogisierte Trümmer und Zehntausende kleinere Bruchstücke; für die Internationale Raumstation wurden mehrere Jahre lang Trümmer-Pass-Warnungen ausgesprochen.",
      ruling_summary:
        "Trotz der Risiken für die ISS wurde kein formaler Anspruch nach dem Haftungsübereinkommen eingereicht. Die USA brachten eine UN-Generalversammlungs-Resolution (Res. 77/41, 2022) ein, die ein Moratorium für destruktive Direct-Ascent-ASAT-Tests forderte; die Resolution wurde mit 154 zu 9 Stimmen angenommen (Russland und China stimmten dagegen).",
      legal_holding:
        "Direct-Ascent-ASAT-Tests, die langlebige Trümmer erzeugen, stehen im Widerspruch zu UN-COPUOS-Trümmer-Mitigations-Leitlinie 4 (Vermeidung absichtlicher Zerstörung) — eine bindende völkerrechtliche Regel besteht jedoch nicht. Verfügbar sind nur diplomatisch-politische Druckmittel.",
      industry_significance:
        "Auslöser der heutigen US-/UK-/Kanada-/Frankreich-/Australien-/Japan-geführten 'ASAT-Moratorium'-Bewegung. Etabliert, dass destruktive ASAT-Trümmer-Ereignisse ein operatives Restrisiko für LEO-Operatoren bleiben, dem weder das Haftungsübereinkommen noch eine Lizenz-Sanktion angemessen entgegenwirkt.",
    },
  ],

  // ─── Italienische ASI-Trümmer-Mitteilung ──────────────────────────

  [
    "CASE-IT-ASI-REENTRY-MK1-2022",
    {
      title:
        "ASI-Reentry-Bestimmung — Mk-1-Spacecraft (anonymisierte Folge-Anwendung)",
      forum_name: "Agenzia Spaziale Italiana (ASI)",
      plaintiff: "ASI (institutionelle Prüfung)",
      defendant: "Anonymisierter kommerzieller Operator",
      facts:
        "Im Anschluss an die ASI-Mitteilung 02/2022 zur Reentry-Risiko-Bewertung überprüfte die ASI mehrere anonymisierte kommerzielle Operator-Missionen formell auf Einhaltung der Casualty-Risk-Schwellwerte (10⁻⁴ unkontrolliert; 10⁻⁵ bei Reentry über italienischem Territorium). Zwei Missionen erforderten Konstruktionsänderungen.",
      ruling_summary:
        "ASI verlangte Konstruktionsänderungen zur Erfüllung der Casualty-Risk-Schwellwerte; keine Zivilbuße verhängt.",
      legal_holding:
        "ASI-Casualty-Risk-Bewertung ist für italienisch-lizenzierte Operatoren bindend; geografisch spezifische Risiko-Schwellwerte (italienisches-Territorium-Pass) gelten zusätzlich zu globalen Schwellwerten.",
      industry_significance:
        "Erster dokumentierter italienischer NCA-Trümmer-Mitigations-Vollzugs-Präzedenzfall nach dem ASI-Gesetz 89/2025. Etabliert, dass italienische Regulierungspraxis sich an den strengsten internationalen Schwellwerten orientiert.",
    },
  ],

  // ─── Verifizierte Ergänzungen 2024–2026 ───────────────────────────

  [
    "CASE-FAA-SPACEX-2024",
    {
      title: "FAA Vorschlag Bußgeldbescheid — SpaceX Falcon-9-Lizenz-Verstöße",
      forum_name:
        "U.S. Federal Aviation Administration — Office of Commercial Space Transportation",
      plaintiff:
        "Federal Aviation Administration (FAA), Office of Commercial Space Transportation",
      defendant: "Space Exploration Technologies Corp. (SpaceX)",
      facts:
        "Die FAA kündigte zwei vorgeschlagene Bußgelder in Höhe von insgesamt 633.009 USD gegen SpaceX wegen mutmaßlicher Verstöße gegen Falcon-9-Startlizenzen an. Der erste (350.000 USD) bezog sich auf einen Start im Juni 2023 (SARah-1), bei dem SpaceX angeblich eine neue Treibstoff-Anlage vor FAA-Genehmigung nutzte; der zweite (283.009 USD) bezog sich auf einen Start im Juli 2023 (EchoStar XXIV), bei dem SpaceX angeblich einen aktualisierten Start-Dispatch und ein überarbeitetes Flugbereitschafts-Review-Verfahren vor FAA-Genehmigung anwandte.",
      ruling_summary:
        "Die FAA schlug zwei separate Bußgelder vor; SpaceX erhielt 30 Tage Zeit zur Stellungnahme. Das Verfahren war zum Zeitpunkt der Bekanntmachung anhängig; SpaceX bestritt die FAA-Auslegung der Lizenzbedingungen öffentlich.",
      legal_holding:
        "Die Lizenz-Bedingungs-Reichweite der FAA nach 14 CFR Part 450 erstreckt sich auf operatorseitige Prozessänderungen (überarbeitete Flugbereitschafts-Verfahren, modifizierte Bodensysteme), die die der Lizenz zugrunde liegende Public-Safety-Analyse berühren — nicht nur auf Hardware-Änderungen am Startfahrzeug.",
      industry_significance:
        "Erste hochrangige FAA/AST-Bußgeld-Maßnahme gegen einen großen kommerziellen Startoperator. Etabliert, dass Vorflug-Prozessänderungen (nicht nur Hardware-Modifikationen) Lizenz-Bedingungs-Verstöße auslösen und substantielle Bußgeld-Exposition erzeugen können.",
      notes: [
        "SpaceX bestritt die FAA-Befunde öffentlich. Status zum Zeitpunkt der letzten Verifikation: in Stellungnahme.",
      ],
    },
  ],

  [
    "CASE-FCC-LIGADO-2020",
    {
      title:
        "In the Matter of Ligado Networks Subsidiary LLC — Antrag auf Modifikation der Genehmigungen",
      forum_name: "U.S. Federal Communications Commission",
      plaintiff: "Federal Communications Commission",
      defendant: "Ligado Networks Subsidiary LLC (vormals LightSquared)",
      facts:
        "Ligado Networks (Nachfolger von LightSquared) beantragte bei der FCC eine Modifikation seiner L-Band-Genehmigungen, um ein terrestrisches Niedrigleistungs-Netzwerk im Spektrum benachbart zu GPS zu betreiben. Verteidigungsministerium, Verkehrsministerium und große Luftfahrt-/Landwirtschafts-GPS-Empfänger-Communities widersetzten sich der Modifikation formal mit dem Argument, die geplanten terrestrischen Operationen würden schädliche Interferenz in benachbarte GPS-Empfänger-Bänder erzeugen.",
      ruling_summary:
        "Die FCC genehmigte die Modifikation (Order FCC 20-48) trotz der Einwände dissentierender Behörden mit der Begründung, Ligados vorgeschlagene Leistungs-Limits und Out-of-Band-Emissions-Masken würden keine schädliche Interferenz verursachen. DoD, DoT und FAA bestritten die FCC-Bestimmung weiterhin öffentlich; nachfolgende NTIA- und Kongress-Überprüfungen schlossen sich an.",
      legal_holding:
        "Inter-Agentur-Streitigkeiten über Interferenz-Vorhersagen werden durch das FCC-Lizenzmodifikations-Verfahren entschieden — opponierende Bundes-Agenturen haben Mitsprache, aber kein Vetorecht. Die NTIA-Koordinierungs-Rolle nach dem National Telecommunications and Information Administration Organization Act ist beratend.",
      industry_significance:
        "Begründet den modernen Präzedenzfall, dass FCC-Kommerzspektrum-Genehmigungen sich gegen DoD/DoT-Einwände durchsetzen können — auch wenn Bundes-Spektrum-Operationen betroffen sind. Festigt FCC-Primat über Kommerzspektrum-Lizenz-Entscheidungen.",
      notes: [
        "Das Verfahren bleibt politisch umstritten; nachfolgende NDAA-Bestimmungen 2021 und 2022 enthielten Ligado-bezogene Sprache.",
      ],
    },
  ],

  [
    "CASE-VEGA-VV15-2019",
    {
      title:
        "Vega-VV15-Mission-Versagen — Befunde der ESA-Untersuchungskommission",
      forum_name: "European Space Agency — Independent Inquiry Commission",
      plaintiff: "European Space Agency (ESA-Untersuchung)",
      defendant: "Avio S.p.A. / Arianespace",
      facts:
        "Am 11. Juli 2019 scheiterte die Vega-VV15-Mission rund zwei Minuten nach Start und zerstörte den FalconEye-1-Satelliten (Erdbeobachtungs-Nutzlast der UAE-Streitkräfte). ESA und Arianespace setzten eine Untersuchungskommission ein. Die Kommission identifizierte als wahrscheinlichste Ursache ein thermo-strukturelles Versagen im vorderen Dom-Bereich des Zefiro-23-Zweitstufen-Motors.",
      ruling_summary:
        "Die Untersuchungskommission veröffentlichte Befunde mit Empfehlungen zu Konstruktionsänderungen am Zefiro-23-Motor und zusätzlichen Qualifikationstests. Vega kehrte im September 2020 (VV16) in den Flugbetrieb zurück. Versicherungsregress für FalconEye-1 erfolgte im Rahmen der Standard-Startversagens-Deckung; konkrete Vergleichsbedingungen wurden nicht öffentlich gemacht.",
      legal_holding:
        "ESA-geführte Untersuchungskommissionen für europäische Trägerraketen-Versagen sind beratend, nicht richterlich; Korrekturmaßnahmen werden vom Startdienstleister (Arianespace/Avio) umgesetzt — nicht als regulatorische Sanktionen verhängt.",
      industry_significance:
        "Etablierte die moderne ESA-geführte Untersuchungs-Vorlage, die anschließend auf Vega VV17 (November 2020) und Vega-C VV22 (Dezember 2022) angewandt wurde. Bestätigt, dass europäische Trägerraketen-Anomalie-Untersuchungen ein multi-stakeholder-beratender Prozess sind, kein regulatorisches Vollzugsverfahren.",
    },
  ],
]);
