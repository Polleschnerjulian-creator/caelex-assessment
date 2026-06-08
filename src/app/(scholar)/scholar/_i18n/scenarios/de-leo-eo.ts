/**
 * Caelex Scholar — i18n for the `de-leo-eo` Planspiel
 * ("German LEO Earth-Observation Authorization — BAFA / SatDSiG").
 *
 * Flat dotted keys under the `deleo.` prefix, mirroring the flagship `asi.` block in
 * planspiele-play.ts. EN is the source of truth; DE is fully authored (German
 * scenario). IT/FR/ES are intentionally omitted and degrade to EN via playT().
 *
 * The orchestrator merges this object into the `planspiele-play` namespace; this file
 * only declares the key/value pairs.
 */
export const DE_LEO_EO_PLAY = {
  en: {
    "deleo.title":
      "German LEO Earth-Observation Authorization (BAFA / SatDSiG)",
    "deleo.summary":
      "A medium German operator must license a sub-metre LEO Earth-observation satellite. The twist: Germany has no national space law in force and no single space regulator, so high-resolution EO is licensed by an export-control office (BAFA) under the 2007 satellite data-security statute (SatDSiG). You are the operator; the German authority is played by the AI.",

    // ── Roles ───────────────────────────────────────────────────────────────
    "deleo.role.operator.name": "Satellite Operator (Applicant)",
    "deleo.role.operator.goal":
      "Secure the German operating authorization at lowest friction — pick the correct authority and file a complete, well-grounded dossier.",
    "deleo.role.operator.brief":
      "You operate a new sub-metre optical LEO Earth-observation satellite from Germany. Before commercial imaging can start you need a German authorization. Identify the competent authority, assemble the data-security and conformity dossier, write the cover letter, and cure the deficiency the authority raises.",
    "deleo.role.operator.private":
      "Your best ground-sample distance is ~0.7 m — squarely above the SatDSiV optical threshold, so you cannot design your way out of BAFA's remit. Your BSI TR-03140 IT-conformity is not yet certified, and the BNetzA frequency assignment is still pending. Do not overstate readiness.",
    "deleo.role.regulator.name": "German NCA (BAFA, with BSI input)",
    "deleo.role.regulator.goal":
      "Protect the security interests served by the SatDSiG while enabling lawful activity; grant only on a complete, correctly-grounded dossier.",
    "deleo.role.regulator.brief":
      "You are the Federal Office for Economic Affairs and Export Control (BAFA), the competent authority for high-resolution Earth-observation systems under the SatDSiG, drawing on BSI for IT-conformity. You check the filing for completeness and a sound statutory basis and issue a deficiency notice where it falls short.",
    "deleo.role.regulator.private":
      "You will not grant unless the §16 SatDSiG data-distribution-control commitment and a credible TR-03140 IT-conformity note are present. A missing data-security concept or an unaddressed §16 control regime is an automatic deficiency, grounded in the OVG Berlin-Brandenburg satellite-data line.",

    // ── Phase 1 — competent authority ───────────────────────────────────────
    "deleo.p1.title": "Phase 1 — Competent authority",
    "deleo.p1.brief":
      "Germany has no single space regulator. Identify which federal body licenses a high-resolution Earth-observation satellite, and justify your choice in one line, citing the governing instrument. Note that there is no German space act in force — the RaumfahrtG remains an Eckpunkte proposal.",
    "deleo.p1.authority": "Competent authority",
    "deleo.p1.justification":
      "One-line justification (cite the governing instrument)",
    "deleo.p1.r.authority": "Correct competent authority",
    "deleo.p1.r.justif": "Quality of the cited justification",

    // ── Phase 2 — assemble the application ──────────────────────────────────
    "deleo.p2.title": "Phase 2 — Assemble the application",
    "deleo.p2.brief":
      "Build the authorization dossier. Toggle each required element and set the imaging-resolution band. Watch the scope trigger: the SatDSiV ground-sample-distance thresholds (optical ≤2.5 m) decide whether the SatDSiG bites at all. The governing provisions are open in the rail.",
    "deleo.p2.dataSecurity": "Data-security concept (SatDSiG §§3–9)",
    "deleo.p2.itConformity": "IT-conformity to BSI TR-03140",
    "deleo.p2.frequency": "BNetzA frequency assignment (TKG)",
    "deleo.p2.nis2": "NIS2/BSIG operator registration",
    "deleo.p2.resolution": "Imaging-resolution band",
    "deleo.p2.r.modules": "Mandatory dossier elements present",
    "deleo.p2.r.resolution": "Resolution band correctly classified",

    // ── Phase 3 — cover letter ──────────────────────────────────────────────
    "deleo.p3.title": "Phase 3 — Cover letter to the authority",
    "deleo.p3.brief":
      "Draft the cover letter accompanying the filing. State the statutory basis under the SatDSiG/SatDSiV and cite at least two provisions. Flag the German-vs-EU interplay: the SatDSiG governs today via BAFA, but the directly-applicable EU Space Act will add the first EU-wide authorization and insurance mandate around 2030 with no transposition. Use the citation export to pull verifiable references from the corpus.",
    "deleo.p3.r.basis": "Correct legal basis",
    "deleo.p3.r.complete": "Completeness of the letter",
    "deleo.p3.r.cites": "Citation accuracy (≥2 provisions)",

    // ── Phase 4 — deficiency response ───────────────────────────────────────
    "deleo.p4.title": "Phase 4 — Respond to the deficiency notice",
    "deleo.p4.brief":
      "BAFA returned a deficiency notice: the §16 SatDSiG data-distribution-control commitment is missing and the IT-conformity note is unsubstantiated. Read it, revise the affected elements, and resubmit with a short explanation of the fix — answering the disclosure-duty reasoning from the OVG Berlin-Brandenburg satellite-data decision.",
    "deleo.p4.r.addresses": "Addresses the stated deficiency",
    "deleo.p4.r.quality": "Quality of the revision",

    // ── Track-1 engine feedback notes ───────────────────────────────────────
    "deleo.fb.authority.ok":
      "Correct — BAFA is the competent authority for high-resolution Earth-observation systems under the SatDSiG; Germany has no space-agency licence and no national space act in force.",
    "deleo.fb.authority.wrong":
      "Not the competent authority. A high-resolution EO satellite is licensed by BAFA under the SatDSiG — not by BMFTR, DLR, or BNetzA (BNetzA assigns frequencies but does not issue the EO operating licence).",
    "deleo.fb.modules.ok":
      "All licensing-critical elements are present: data-security concept, BSI TR-03140 IT-conformity, and the BNetzA frequency assignment.",
    "deleo.fb.modules.partial":
      "Some licensing-critical elements are missing — BAFA cannot grant without the data-security concept, IT-conformity, and frequency assignment together.",
    "deleo.fb.resolution.ok":
      "Correct — an optical resolution of 2.5 m or finer falls within the SatDSiV threshold, so the SatDSiG authorization regime applies.",
    "deleo.fb.resolution.wrong":
      "The resolution band is misclassified for licensing purposes. The SatDSiV optical threshold is 2.5 m; a sub-metre system is in scope and cannot be treated as below the threshold.",
  },

  de: {
    "deleo.title": "Deutsche LEO-Erdbeobachtungs-Genehmigung (BAFA / SatDSiG)",
    "deleo.summary":
      "Ein mittelgroßer deutscher Betreiber muss einen sub-metrigen optischen LEO-Erdbeobachtungssatelliten genehmigen lassen. Der Clou: Deutschland hat kein nationales Weltraumgesetz in Kraft und keine einheitliche Weltraumbehörde — hochauflösende Erdbeobachtung wird von einer Exportkontrollbehörde (BAFA) nach dem Satellitendatensicherheitsgesetz von 2007 (SatDSiG) lizenziert. Du bist der Betreiber; die deutsche Behörde spielt die KI.",

    "deleo.role.operator.name": "Satellitenbetreiber (Antragsteller)",
    "deleo.role.operator.goal":
      "Die deutsche Betriebsgenehmigung mit geringstem Aufwand sichern — die richtige Behörde wählen und ein vollständiges, gut begründetes Dossier einreichen.",
    "deleo.role.operator.brief":
      "Du betreibst aus Deutschland einen neuen sub-metrigen optischen LEO-Erdbeobachtungssatelliten. Vor dem Start der kommerziellen Aufnahmen brauchst du eine deutsche Genehmigung. Bestimme die zuständige Behörde, stelle das Datensicherheits- und Konformitätsdossier zusammen, verfasse das Anschreiben und behebe den von der Behörde erhobenen Mangel.",
    "deleo.role.operator.private":
      "Deine beste Bodenauflösung liegt bei ~0,7 m — klar oberhalb der optischen SatDSiV-Schwelle, du kannst dich also nicht aus der Zuständigkeit der BAFA herauskonstruieren. Deine IT-Konformität nach BSI TR-03140 ist noch nicht zertifiziert, und die BNetzA-Frequenzzuteilung steht noch aus. Stelle die Reife nicht zu optimistisch dar.",
    "deleo.role.regulator.name": "Deutsche Behörde (BAFA, mit BSI-Beteiligung)",
    "deleo.role.regulator.goal":
      "Die durch das SatDSiG geschützten Sicherheitsinteressen wahren und zugleich rechtmäßige Tätigkeit ermöglichen; nur bei vollständigem, korrekt begründetem Dossier genehmigen.",
    "deleo.role.regulator.brief":
      "Du bist das Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA), die zuständige Behörde für hochauflösende Erdbeobachtungssysteme nach dem SatDSiG, unter Heranziehung des BSI für die IT-Konformität. Du prüfst die Einreichung auf Vollständigkeit und eine tragfähige gesetzliche Grundlage und stellst einen Mängelbescheid aus, wo sie unzureichend ist.",
    "deleo.role.regulator.private":
      "Du genehmigst nicht, solange die Verpflichtung zur Datenabgabekontrolle nach § 16 SatDSiG und ein belastbarer Nachweis der IT-Konformität nach TR-03140 fehlen. Ein fehlendes Datensicherheitskonzept oder eine nicht adressierte § 16-Kontrollregelung ist ein automatischer Mangel, gestützt auf die Rechtsprechungslinie des OVG Berlin-Brandenburg zu Satellitendaten.",

    "deleo.p1.title": "Phase 1 — Zuständige Behörde",
    "deleo.p1.brief":
      "Deutschland hat keine einheitliche Weltraumbehörde. Bestimme, welche Bundesbehörde einen hochauflösenden Erdbeobachtungssatelliten lizenziert, und begründe deine Wahl in einem Satz unter Angabe der maßgeblichen Rechtsgrundlage. Beachte: Es gibt kein deutsches Weltraumgesetz in Kraft — das RaumfahrtG liegt nur als Eckpunkte-Vorschlag vor.",
    "deleo.p1.authority": "Zuständige Behörde",
    "deleo.p1.justification":
      "Einzeilige Begründung (maßgebliche Rechtsgrundlage zitieren)",
    "deleo.p1.r.authority": "Korrekte zuständige Behörde",
    "deleo.p1.r.justif": "Qualität der zitierten Begründung",

    "deleo.p2.title": "Phase 2 — Antrag zusammenstellen",
    "deleo.p2.brief":
      "Stelle das Genehmigungsdossier zusammen. Schalte jedes erforderliche Element ein und setze das Auflösungs-Band. Achte auf den Anwendungsbereichs-Auslöser: Die SatDSiV-Schwellen für die Bodenauflösung (optisch ≤2,5 m) entscheiden überhaupt erst, ob das SatDSiG greift. Die maßgeblichen Vorschriften stehen in der Leiste offen.",
    "deleo.p2.dataSecurity": "Datensicherheitskonzept (§§ 3–9 SatDSiG)",
    "deleo.p2.itConformity": "IT-Konformität nach BSI TR-03140",
    "deleo.p2.frequency": "BNetzA-Frequenzzuteilung (TKG)",
    "deleo.p2.nis2": "NIS2/BSIG-Betreiberregistrierung",
    "deleo.p2.resolution": "Auflösungs-Band (Bildgebung)",
    "deleo.p2.r.modules": "Pflichtbestandteile des Dossiers vorhanden",
    "deleo.p2.r.resolution": "Auflösungs-Band korrekt eingeordnet",

    "deleo.p3.title": "Phase 3 — Anschreiben an die Behörde",
    "deleo.p3.brief":
      "Verfasse das Anschreiben zur Einreichung. Nenne die gesetzliche Grundlage nach SatDSiG/SatDSiV und zitiere mindestens zwei Vorschriften. Weise auf das Zusammenspiel zwischen deutschem und EU-Recht hin: Das SatDSiG gilt heute über die BAFA, aber der unmittelbar anwendbare EU Space Act führt um 2030 ohne Umsetzung die erste EU-weite Genehmigungs- und Versicherungspflicht ein. Nutze den Zitat-Export, um belegbare Verweise aus dem Korpus zu übernehmen.",
    "deleo.p3.r.basis": "Korrekte Rechtsgrundlage",
    "deleo.p3.r.complete": "Vollständigkeit des Schreibens",
    "deleo.p3.r.cites": "Zitiergenauigkeit (≥2 Vorschriften)",

    "deleo.p4.title": "Phase 4 — Auf den Mängelbescheid reagieren",
    "deleo.p4.brief":
      "Die BAFA hat einen Mängelbescheid zurückgesandt: Die Verpflichtung zur Datenabgabekontrolle nach § 16 SatDSiG fehlt und der IT-Konformitätsnachweis ist nicht belegt. Lies ihn, überarbeite die betroffenen Elemente und reiche sie mit einer kurzen Erläuterung der Korrektur erneut ein — und gehe dabei auf die Begründung der Offenlegungspflichten aus der Satellitendaten-Entscheidung des OVG Berlin-Brandenburg ein.",
    "deleo.p4.r.addresses": "Behebt den genannten Mangel",
    "deleo.p4.r.quality": "Qualität der Überarbeitung",

    "deleo.fb.authority.ok":
      "Richtig — die BAFA ist nach dem SatDSiG die zuständige Behörde für hochauflösende Erdbeobachtungssysteme; Deutschland hat keine Weltraumagentur-Lizenz und kein nationales Weltraumgesetz in Kraft.",
    "deleo.fb.authority.wrong":
      "Nicht die zuständige Behörde. Ein hochauflösender Erdbeobachtungssatellit wird von der BAFA nach dem SatDSiG lizenziert — nicht von BMFTR, DLR oder BNetzA (die BNetzA teilt Frequenzen zu, erteilt aber nicht die EO-Betriebsgenehmigung).",
    "deleo.fb.modules.ok":
      "Alle lizenzkritischen Elemente sind vorhanden: Datensicherheitskonzept, IT-Konformität nach BSI TR-03140 und die BNetzA-Frequenzzuteilung.",
    "deleo.fb.modules.partial":
      "Einige lizenzkritische Elemente fehlen — die BAFA kann ohne Datensicherheitskonzept, IT-Konformität und Frequenzzuteilung zusammen nicht genehmigen.",
    "deleo.fb.resolution.ok":
      "Richtig — eine optische Auflösung von 2,5 m oder feiner liegt innerhalb der SatDSiV-Schwelle, sodass das Genehmigungsregime des SatDSiG anwendbar ist.",
    "deleo.fb.resolution.wrong":
      "Das Auflösungs-Band ist für Lizenzierungszwecke falsch eingeordnet. Die optische SatDSiV-Schwelle liegt bei 2,5 m; ein sub-metriges System fällt in den Anwendungsbereich und kann nicht als unterhalb der Schwelle behandelt werden.",
  },
} as const;
