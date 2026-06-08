/**
 * Caelex Scholar — Planspiele i18n block for `nis2-orbit-cyber-incident`.
 *
 * Flat dotted keys (prefix `nis2.`), mirroring the ASI flagship's `asi.*` block.
 * EN is source-of-truth; DE is a full professional translation. IT/FR/ES are
 * intentionally omitted and degrade to EN via the playT() fallback chain.
 *
 * The orchestrator merges these into the `planspiele-play` namespace.
 */
export const NIS2_INCIDENT_PLAY = {
  en: {
    // ── Scenario shell ──────────────────────────────────────────────────────
    "nis2.title": "In-Orbit Cyber Incident — NIS2 24h/72h Clock (EU)",
    "nis2.summary":
      "A wiper attack on the ground modems bricks tens of thousands of user terminals and degrades an EU satellite-broadband service. You are the operator working the NIS2 Article 23 reporting clock — 24-hour early warning, 72-hour notification, final report within a month. The national authority is played by the AI. Here the timeline is the law: file the right facts, to the right authority, on time.",

    // ── Roles ───────────────────────────────────────────────────────────────
    "nis2.role.operator.name": "Operator — Incident Commander & Legal Lead",
    "nis2.role.operator.goal":
      "Discharge the NIS2 Article 23 obligations on time and defensibly: classify the entity, notify the right authority, and sequence the right facts to each statutory stage.",
    "nis2.role.operator.brief":
      "You run a large EU LEO broadband constellation. Overnight a malicious software update pushed through your modem supply chain wiped the firmware on tens of thousands of customer modems, knocking your service offline across several Member States. As the essential-entity operator, you are now on the NIS2 clock: an early warning to the competent authority within 24 hours, a fuller notification within 72 hours, and a final report within one month. Classify the entity, pick the authority and channel, file each stage with the facts the law requires, then defend it.",
    "nis2.role.operator.private":
      "The threat actor looks state-aligned, but attribution is NOT confirmed — say 'suspected', never name a state. The entry point was the modem (CPE) supply chain, an Article 21(2)(d) dimension. Because your modems are a product with digital elements, the CRA Article 14 channel to ENISA (24h/72h) runs in PARALLEL with NIS2 — flag it, do not conflate it. The outage spilled across borders, so cross-border impact is real.",
    "nis2.role.regulator.name": "Competent Authority (BSI)",
    "nis2.role.regulator.goal":
      "Verify each deadline and the mandated content at every stage, press on the weak points, and escalate with a deficiency notice where the showing falls short.",
    "nis2.role.regulator.brief":
      "You are the national competent authority for NIS2 in the affected Member State. You check that the early warning landed within 24 hours and the notification within 72 hours, that the notification states a suspected unlawful or malicious cause and any cross-border impact, and that the operator is reasoning about the supply-chain dimension. Where an element is missing or thin, you issue a deficiency notice.",
    "nis2.role.regulator.private":
      "Push hard on three things: the suspected-cause statement, the cross-border impact, and the Article 21(2)(d) CPE/supply-chain dimension echoed by the KA-SAT/AcidRain holding. Fire the deficiency on the weakest filed element and cite KA-SAT.",

    // ── Phase 1 — Authority & classification ────────────────────────────────
    "nis2.p1.title": "Phase 1 — Authority & classification",
    "nis2.p1.brief":
      "Classify your entity under NIS2 (space is an Annex I high-criticality sector) and identify the competent authority and statutory channel. State in one line why this authority and this classification, citing the governing provision.",
    "nis2.p1.authority": "Competent authority",
    "nis2.p1.classification": "NIS2 entity classification",
    "nis2.p1.justification":
      "One-line justification (cite the governing provision)",
    "nis2.p1.r.authority": "Correct competent authority",
    "nis2.p1.r.class": "Correct NIS2 entity classification",
    "nis2.p1.r.channel": "Quality of the channel justification",

    // ── Phase 2 — Early warning & 72h notification ──────────────────────────
    "nis2.p2.title": "Phase 2 — Early warning & 72-hour notification",
    "nis2.p2.brief":
      "Work the Article 23 clock. Set when you filed the 24-hour early warning and the 72-hour notification, and toggle the facts the notification must carry. Remember the parallel CRA/ENISA product-incident channel. The engine checks the timing and the mandatory content live.",
    "nis2.p2.earlyWarning": "Early warning filed (within 24h?)",
    "nis2.p2.notification": "Notification filed (within 72h?)",
    "nis2.p2.crossBorder": "Cross-border impact stated",
    "nis2.p2.unlawfulCause": "Suspected unlawful / malicious cause stated",
    "nis2.p2.severity": "Severity & impact assessment included",
    "nis2.p2.indicators": "Indicators of compromise provided",
    "nis2.p2.craChannel": "Parallel CRA Art. 14 / ENISA channel triggered",
    "nis2.p2.r.timing": "Article 23 deadlines met (24h + 72h)",
    "nis2.p2.r.modules": "Mandatory notification content present",
    "nis2.p2.r.cra": "Parallel CRA/ENISA channel correctly triggered",

    // ── Phase 3 — Final report ──────────────────────────────────────────────
    "nis2.p3.title": "Phase 3 — Final report",
    "nis2.p3.brief":
      "Draft the final report due within one month. State the root cause without overreaching on attribution, map the failure onto the Article 21(2) risk-management measures, and cite at least two provisions. Use the citation export to pull verifiable references from the corpus.",
    "nis2.p3.r.rootcause": "Root-cause analysis (no attribution overreach)",
    "nis2.p3.r.gap": "Article 21(2) gap analysis",
    "nis2.p3.r.cites": "Citation accuracy (≥2 provisions)",

    // ── Phase 4 — Deficiency response ───────────────────────────────────────
    "nis2.p4.title": "Phase 4 — Respond to the deficiency notice",
    "nis2.p4.brief":
      "The authority returned a deficiency notice on the weakest element of your filing. Read it, cure the gap, and resubmit with a short explanation grounded in the governing provisions and the KA-SAT precedent.",
    "nis2.p4.r.addresses": "Addresses the stated deficiency",
    "nis2.p4.r.quality": "Quality of the revision",

    // ── Track-1 engine feedback notes (answer-key) ──────────────────────────
    "nis2.fb.authority.ok":
      "Correct — the BSI is the competent NIS2 authority for this incident, notified via its statutory reporting channel.",
    "nis2.fb.authority.wrong":
      "Not the competent NIS2 authority here — ENISA receives CRA product-incident reports and the spectrum regulator is a separate channel; the national NIS2 authority is the BSI.",
    "nis2.fb.class.ok":
      "Correct — a large EU-critical broadband operator in the Annex I space sector is an essential entity.",
    "nis2.fb.class.wrong":
      "Re-check the classification: at this size in the Annex I high-criticality space sector the entity is essential, not important or out of scope.",
    "nis2.fb.timing.ok":
      "Both Article 23 deadlines met — the early warning within 24 hours and the notification within 72 hours.",
    "nis2.fb.timing.partial":
      "One of the two Article 23 deadlines was missed — the clock runs from awareness for both the 24-hour early warning and the 72-hour notification.",
    "nis2.fb.modules.ok":
      "All mandatory notification facts are present — suspected cause, cross-border impact, severity assessment and indicators of compromise.",
    "nis2.fb.modules.partial":
      "Some mandatory notification facts are missing — the 72-hour notification must carry the suspected cause, cross-border impact, severity and indicators of compromise.",
    "nis2.fb.cra.ok":
      "Correct — because the modems are products with digital elements, the CRA Article 14 channel to ENISA runs in parallel and was triggered.",
    "nis2.fb.cra.wrong":
      "The parallel CRA Article 14 / ENISA product-incident channel should also be triggered — the modem firmware compromise is an actively-exploited vulnerability in a product with digital elements.",
  },

  de: {
    "nis2.title": "Cyber-Vorfall im Orbit — NIS2-Frist 24h/72h (EU)",
    "nis2.summary":
      "Ein Wiper-Angriff auf die Bodenmodems zerstört zehntausende Endgeräte und beeinträchtigt einen EU-Satelliten-Breitbanddienst. Du bist der Betreiber und arbeitest die NIS2-Meldefrist nach Artikel 23 ab — Frühwarnung binnen 24 Stunden, Meldung binnen 72 Stunden, Abschlussbericht binnen eines Monats. Die nationale Behörde spielt die KI. Hier ist der Zeitplan das Gesetz: die richtigen Fakten, an die richtige Behörde, fristgerecht.",

    "nis2.role.operator.name":
      "Betreiber — Vorfallleitung & rechtliche Leitung",
    "nis2.role.operator.goal":
      "Die NIS2-Pflichten nach Artikel 23 fristgerecht und belastbar erfüllen: die Einrichtung einstufen, die richtige Behörde benachrichtigen und die richtigen Fakten der jeweiligen gesetzlichen Stufe zuordnen.",
    "nis2.role.operator.brief":
      "Du betreibst eine große EU-LEO-Breitbandkonstellation. Über Nacht hat ein bösartiges Software-Update über deine Modem-Lieferkette die Firmware zehntausender Kundenmodems gelöscht und deinen Dienst in mehreren Mitgliedstaaten lahmgelegt. Als Betreiber einer wesentlichen Einrichtung läuft nun die NIS2-Uhr: eine Frühwarnung an die zuständige Behörde binnen 24 Stunden, eine ausführlichere Meldung binnen 72 Stunden und ein Abschlussbericht binnen eines Monats. Stufe die Einrichtung ein, wähle Behörde und Meldeweg, reiche jede Stufe mit den gesetzlich geforderten Fakten ein und verteidige sie anschließend.",
    "nis2.role.operator.private":
      "Der Angreifer wirkt staatsnah, aber die Zuordnung ist NICHT bestätigt — sprich von „mutmaßlich“ und nenne keinen Staat. Einfallstor war die Modem-(CPE-)Lieferkette, eine Dimension nach Artikel 21 Abs. 2 Buchst. d. Da deine Modems ein Produkt mit digitalen Elementen sind, läuft der CRA-Meldeweg nach Artikel 14 an die ENISA (24h/72h) PARALLEL zu NIS2 — weise darauf hin, vermische ihn aber nicht. Der Ausfall reicht über Grenzen hinweg, die grenzüberschreitende Auswirkung ist also real.",
    "nis2.role.regulator.name": "Zuständige Behörde (BSI)",
    "nis2.role.regulator.goal":
      "Jede Frist und die geforderten Inhalte auf jeder Stufe prüfen, an den Schwachstellen nachhaken und mit einem Mängelbescheid eskalieren, wenn der Nachweis unzureichend ist.",
    "nis2.role.regulator.brief":
      "Du bist die nationale NIS2-Behörde des betroffenen Mitgliedstaats. Du prüfst, ob die Frühwarnung binnen 24 Stunden und die Meldung binnen 72 Stunden eingegangen sind, ob die Meldung eine mutmaßlich rechtswidrige oder böswillige Ursache und etwaige grenzüberschreitende Auswirkungen nennt und ob der Betreiber die Lieferketten-Dimension berücksichtigt. Wo ein Element fehlt oder dünn ist, stellst du einen Mängelbescheid aus.",
    "nis2.role.regulator.private":
      "Hak bei drei Punkten hart nach: der Aussage zur mutmaßlichen Ursache, der grenzüberschreitenden Auswirkung und der CPE-/Lieferketten-Dimension nach Artikel 21 Abs. 2 Buchst. d, die das KA-SAT-/AcidRain-Urteil aufgreift. Stelle den Mängelbescheid zum schwächsten eingereichten Element und zitiere KA-SAT.",

    "nis2.p1.title": "Phase 1 — Behörde & Einstufung",
    "nis2.p1.brief":
      "Stufe deine Einrichtung nach NIS2 ein (Weltraum ist ein Sektor hoher Kritikalität nach Anhang I) und bestimme die zuständige Behörde sowie den gesetzlichen Meldeweg. Begründe in einem Satz, warum diese Behörde und diese Einstufung, unter Angabe der einschlägigen Vorschrift.",
    "nis2.p1.authority": "Zuständige Behörde",
    "nis2.p1.classification": "NIS2-Einstufung der Einrichtung",
    "nis2.p1.justification":
      "Einzeilige Begründung (einschlägige Vorschrift zitieren)",
    "nis2.p1.r.authority": "Korrekte zuständige Behörde",
    "nis2.p1.r.class": "Korrekte NIS2-Einstufung der Einrichtung",
    "nis2.p1.r.channel": "Qualität der Begründung des Meldewegs",

    "nis2.p2.title": "Phase 2 — Frühwarnung & 72-Stunden-Meldung",
    "nis2.p2.brief":
      "Arbeite die Frist nach Artikel 23 ab. Lege fest, wann du die 24-Stunden-Frühwarnung und die 72-Stunden-Meldung eingereicht hast, und schalte die Fakten ein, die die Meldung enthalten muss. Denke an den parallelen CRA-/ENISA-Meldeweg für Produktvorfälle. Die Engine prüft Fristen und Pflichtinhalte live.",
    "nis2.p2.earlyWarning": "Frühwarnung eingereicht (binnen 24h?)",
    "nis2.p2.notification": "Meldung eingereicht (binnen 72h?)",
    "nis2.p2.crossBorder": "Grenzüberschreitende Auswirkung genannt",
    "nis2.p2.unlawfulCause":
      "Mutmaßlich rechtswidrige / böswillige Ursache genannt",
    "nis2.p2.severity": "Schwere- und Auswirkungsbewertung enthalten",
    "nis2.p2.indicators": "Kompromittierungsindikatoren (IoC) angegeben",
    "nis2.p2.craChannel":
      "Paralleler Meldeweg nach CRA Art. 14 / ENISA ausgelöst",
    "nis2.p2.r.timing": "Fristen nach Artikel 23 eingehalten (24h + 72h)",
    "nis2.p2.r.modules": "Pflichtinhalte der Meldung vorhanden",
    "nis2.p2.r.cra": "Paralleler CRA-/ENISA-Meldeweg korrekt ausgelöst",

    "nis2.p3.title": "Phase 3 — Abschlussbericht",
    "nis2.p3.brief":
      "Verfasse den binnen eines Monats fälligen Abschlussbericht. Nenne die Grundursache, ohne die Zuordnung zu überdehnen, ordne das Versagen den Risikomanagementmaßnahmen nach Artikel 21 Abs. 2 zu und zitiere mindestens zwei Vorschriften. Nutze den Zitat-Export, um belegbare Verweise aus dem Korpus zu übernehmen.",
    "nis2.p3.r.rootcause":
      "Grundursachenanalyse (keine Überdehnung der Zuordnung)",
    "nis2.p3.r.gap": "Lückenanalyse nach Artikel 21 Abs. 2",
    "nis2.p3.r.cites": "Zitiergenauigkeit (≥2 Vorschriften)",

    "nis2.p4.title": "Phase 4 — Auf den Mängelbescheid reagieren",
    "nis2.p4.brief":
      "Die Behörde hat einen Mängelbescheid zum schwächsten Element deiner Einreichung zurückgesandt. Lies ihn, behebe die Lücke und reiche erneut ein — mit einer kurzen Erläuterung, gestützt auf die einschlägigen Vorschriften und das KA-SAT-Präjudiz.",
    "nis2.p4.r.addresses": "Behebt den genannten Mangel",
    "nis2.p4.r.quality": "Qualität der Überarbeitung",

    "nis2.fb.authority.ok":
      "Richtig — das BSI ist für diesen Vorfall die zuständige NIS2-Behörde, benachrichtigt über seinen gesetzlichen Meldeweg.",
    "nis2.fb.authority.wrong":
      "Hier nicht die zuständige NIS2-Behörde — die ENISA erhält CRA-Produktvorfallmeldungen und die Frequenzbehörde ist ein eigener Weg; nationale NIS2-Behörde ist das BSI.",
    "nis2.fb.class.ok":
      "Richtig — ein großer, für die EU kritischer Breitbandbetreiber im Weltraumsektor nach Anhang I ist eine wesentliche Einrichtung.",
    "nis2.fb.class.wrong":
      "Prüfe die Einstufung erneut: in dieser Größe im Weltraumsektor hoher Kritikalität nach Anhang I ist die Einrichtung wesentlich, nicht wichtig oder außerhalb des Anwendungsbereichs.",
    "nis2.fb.timing.ok":
      "Beide Fristen nach Artikel 23 eingehalten — die Frühwarnung binnen 24 Stunden und die Meldung binnen 72 Stunden.",
    "nis2.fb.timing.partial":
      "Eine der beiden Fristen nach Artikel 23 wurde versäumt — die Uhr läuft ab Kenntnis, sowohl für die 24-Stunden-Frühwarnung als auch für die 72-Stunden-Meldung.",
    "nis2.fb.modules.ok":
      "Alle Pflichtfakten der Meldung sind vorhanden — mutmaßliche Ursache, grenzüberschreitende Auswirkung, Schwerebewertung und Kompromittierungsindikatoren.",
    "nis2.fb.modules.partial":
      "Einige Pflichtfakten der Meldung fehlen — die 72-Stunden-Meldung muss die mutmaßliche Ursache, die grenzüberschreitende Auswirkung, die Schwere und die Kompromittierungsindikatoren enthalten.",
    "nis2.fb.cra.ok":
      "Richtig — da die Modems Produkte mit digitalen Elementen sind, läuft der CRA-Meldeweg nach Artikel 14 an die ENISA parallel und wurde ausgelöst.",
    "nis2.fb.cra.wrong":
      "Der parallele CRA-Meldeweg nach Artikel 14 / an die ENISA für Produktvorfälle sollte ebenfalls ausgelöst werden — die kompromittierte Modem-Firmware ist eine aktiv ausgenutzte Schwachstelle in einem Produkt mit digitalen Elementen.",
  },
} as const;
