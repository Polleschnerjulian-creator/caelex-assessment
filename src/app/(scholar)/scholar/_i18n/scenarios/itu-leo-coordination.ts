/**
 * Caelex Scholar — i18n for the Planspiel "itu-leo-coordination".
 *
 * Flat dotted keys under the `itu.*` prefix, mirroring the `asi.*` style in
 * planspiele-play.ts. EN is the source of truth; DE is fully authored. IT/FR/ES
 * are intentionally omitted and degrade to EN via the resolver fallback chain.
 *
 * The orchestrator merges this block into the `planspiele-play` namespace; this
 * file itself imports nothing and is a plain `as const` object.
 */
export const ITU_PLAY = {
  en: {
    // ── Scenario header ───────────────────────────────────────────────────────
    "itu.title":
      "ITU Spectrum Coordination & Interference Dispute (International)",
    "itu.summary":
      "A new non-GSO broadband constellation must secure international spectrum protection through the ITU. You are the operator's home Administration — the Notifying Administration — driving the filing from Advance Publication (API) through coordination (Art. 9), an interference dispute over EPFD limits and date-priority (Art. 22 / 11.32A), to recording in the Master Register (Art. 11). A competing Administration, played by the AI, objects at every step.",

    // ── Roles ─────────────────────────────────────────────────────────────────
    "itu.role.regulator.name": "Notifying Administration (home spectrum desk)",
    "itu.role.regulator.goal":
      "Secure international protection for your operator's network, defeat or settle the competing objection, and record the assignments in the Master Register before priority erodes.",
    "itu.role.regulator.brief":
      "Operators do not deal with the ITU directly — rights flow through you, the responsible national Administration. You file the API, run coordination under Article 9, defend the EPFD envelope, and notify for recording in the Master International Frequency Register. Throughout, you carry the inter-Administration duty of good-faith coordination.",
    "itu.role.regulator.private":
      "Your filing is genuine and funded, meets the Resolution 35 milestone schedule, and is EPFD-compliant in Ku-band — but the margin is thin in one Ka sub-band, so disclose it accurately rather than overstate compliance. Your strongest shield against the objector is its own partial, paper-only use of the earlier network.",
    "itu.role.admin.name": "Competing Administration (incumbent / objecting)",
    "itu.role.admin.goal":
      "Protect an earlier-filed network, extract spectrum concessions, or delay recording of the new system in the Master Register.",
    "itu.role.admin.brief":
      "You hold an earlier date-priority filing and raise a harmful-interference objection during coordination. You press the date-priority claim and the EPFD concern, testing whether the Notifying Administration has done its homework.",
    "itu.role.admin.private":
      "Your priority is on paper but your bring-into-use is only partial — one sub-band has lain dormant past the regulatory window, so a continuing-use challenge would defeat part of your claim. Your real EPFD concern is genuine in only ONE Ka sub-band; over-claiming across the band risks being branded as spectrum warehousing under Resolution 35.",

    // ── Phase 1 — Filing route & opening act ──────────────────────────────────
    "itu.p1.title": "Phase 1 — Filing route & opening act",
    "itu.p1.brief":
      "Establish how this non-GSO system enters the international regime. Choose the correct filing route (who files with the ITU) and the correct opening procedural act for a new network, then justify both in one line citing the governing instrument. Remember that rights are secured through the Administration, not by the operator directly.",
    "itu.p1.route": "Filing route",
    "itu.p1.act": "Opening procedural act",
    "itu.p1.justification":
      "One-line justification (cite the governing provision)",
    "itu.p1.r.route": "Correct filing route",
    "itu.p1.r.act": "Correct opening act for a new network",
    "itu.p1.r.justif": "Quality of the cited justification",

    // ── Phase 2 — Coordination dossier (Art. 9) ───────────────────────────────
    "itu.p2.title": "Phase 2 — Coordination dossier (Article 9)",
    "itu.p2.brief":
      "Assemble the coordination request. Toggle each required element and declare the EPFD compliance bracket. A complete non-GSO filing carries the frequency-assignment particulars, the EPFD/PFD envelope, a bring-into-use plan, and a Resolution 35 milestone schedule. List affected networks for transparency — it is recorded, but it is not the test of completeness.",
    "itu.p2.frequency": "Frequency-assignment particulars (Appendix 4 data)",
    "itu.p2.epfd": "EPFD / PFD power envelope (Article 22)",
    "itu.p2.biu": "Bring-into-use (BIU) plan",
    "itu.p2.milestones": "Resolution 35 milestone schedule",
    "itu.p2.affected": "List of affected networks (informational)",
    "itu.p2.epfdbracket": "EPFD compliance bracket",
    "itu.p2.r.coord": "Mandatory coordination elements present",
    "itu.p2.r.epfd": "EPFD envelope within the Article 22 limits",

    // ── Phase 3 — Interference dispute (cover letter) ─────────────────────────
    "itu.p3.title": "Phase 3 — Interference-dispute response",
    "itu.p3.brief":
      "The competing Administration has raised a harmful-interference objection asserting date-priority. Draft the coordination response. Frame the claim against the Article 22 EPFD limits and the Article 11.32A 'no increase in the probability of harmful interference' test, and argue priority: an earlier network's protection is conditional on continuing, actual use — not an absolute right. Cite at least two provisions.",
    "itu.p3.r.law": "Correct interference-law framing (Art. 22 / 11.32A)",
    "itu.p3.r.priority": "Date-priority argument grounded in continuing use",
    "itu.p3.r.cites": "Citation accuracy (≥2 provisions)",

    // ── Phase 4 — Notification & MIFR recording (deficiency response) ──────────
    "itu.p4.title": "Phase 4 — Notification & MIFR recording",
    "itu.p4.brief":
      "The Bureau returned a finding on your notification for recording in the Master International Frequency Register. Read it, cure the affected element — invoking continuing-use, bring-into-use status, and milestone compliance to preserve your recorded rights — and resubmit with a short explanation of the fix.",
    "itu.p4.r.addresses": "Addresses the Bureau's stated finding",
    "itu.p4.r.quality": "Quality of the notification / recording defence",

    // ── Track-1 engine feedback notes ─────────────────────────────────────────
    "itu.fb.route.ok":
      "Correct — international rights are secured by the responsible national Administration filing with the ITU on the operator's behalf.",
    "itu.fb.route.wrong":
      "Wrong route — an operator cannot file directly with the ITU, nor does the ITU grant spectrum unilaterally; rights flow through the home Administration.",
    "itu.fb.act.ok":
      "Correct — Advance Publication Information (API) is the opening act that starts the coordination process for a new network.",
    "itu.fb.act.wrong":
      "Not the correct opening act — for a new network the procedure begins with API, before coordination (CR/C) and notification.",
    "itu.fb.coord.ok":
      "All mandatory coordination elements are present — frequency particulars, EPFD envelope, BIU plan, and the Resolution 35 milestone schedule.",
    "itu.fb.coord.partial":
      "Some mandatory coordination elements are missing — an incomplete non-GSO filing cannot be properly coordinated.",
    "itu.fb.epfd.ok": "The EPFD envelope is within the Article 22 limits.",
    "itu.fb.epfd.wrong":
      "The declared EPFD bracket does not stay within the Article 22 limits — a filing at or above the limit invites a founded interference objection.",
  },

  de: {
    // ── Scenario header ───────────────────────────────────────────────────────
    "itu.title": "ITU-Frequenzkoordinierung & Störungsstreit (International)",
    "itu.summary":
      "Eine neue nicht-geostationäre Breitbandkonstellation muss über die ITU internationalen Frequenzschutz erlangen. Du bist die Heimatverwaltung des Betreibers — die anmeldende Verwaltung — und treibst das Verfahren von der Voraus­veröffentlichung (API) über die Koordinierung (Art. 9) und einen Störungsstreit um EPFD-Grenzwerte und Zeitvorrang (Art. 22 / 11.32A) bis zur Eintragung in das Hauptregister (Art. 11). Eine konkurrierende Verwaltung, gespielt von der KI, erhebt bei jedem Schritt Einwände.",

    // ── Roles ─────────────────────────────────────────────────────────────────
    "itu.role.regulator.name":
      "Anmeldende Verwaltung (heimisches Frequenzreferat)",
    "itu.role.regulator.goal":
      "Internationalen Schutz für das Netz deines Betreibers sichern, den konkurrierenden Einwand abwehren oder beilegen und die Zuweisungen ins Hauptregister eintragen lassen, bevor der Vorrang erodiert.",
    "itu.role.regulator.brief":
      "Betreiber treten nicht unmittelbar mit der ITU in Kontakt — Rechte laufen über dich, die zuständige nationale Verwaltung. Du reichst die API ein, führst die Koordinierung nach Artikel 9, verteidigst den EPFD-Rahmen und meldest zur Eintragung in das internationale Hauptfrequenzregister an. Durchgehend trägst du die zwischenstaatliche Pflicht zur Koordinierung nach Treu und Glauben.",
    "itu.role.regulator.private":
      "Deine Anmeldung ist echt und finanziert, erfüllt den Meilensteinplan nach Resolution 35 und ist im Ku-Band EPFD-konform — der Spielraum ist jedoch in einem Ka-Teilband knapp; lege dies also genau offen, statt die Konformität zu überzeichnen. Dein stärkster Schutz gegen den Einwendenden ist dessen eigene teilweise, nur auf dem Papier bestehende Nutzung des älteren Netzes.",
    "itu.role.admin.name": "Konkurrierende Verwaltung (Inhaberin / einwendend)",
    "itu.role.admin.goal":
      "Ein früher angemeldetes Netz schützen, Frequenzzugeständnisse erwirken oder die Eintragung des neuen Systems ins Hauptregister verzögern.",
    "itu.role.admin.brief":
      "Du hältst eine ältere Anmeldung mit Zeitvorrang und erhebst während der Koordinierung einen Einwand wegen funktechnischer Störung. Du drängst auf den Zeitvorrang und die EPFD-Bedenken und prüfst, ob die anmeldende Verwaltung ihre Hausaufgaben gemacht hat.",
    "itu.role.admin.private":
      "Dein Vorrang besteht auf dem Papier, deine Inbetriebnahme ist jedoch nur teilweise erfolgt — ein Teilband liegt über die regulatorische Frist hinaus brach, sodass eine Anfechtung wegen fehlender fortlaufender Nutzung einen Teil deines Anspruchs zu Fall bringen würde. Dein tatsächliches EPFD-Bedenken besteht nur in EINEM Ka-Teilband; eine Überdehnung über das gesamte Band riskiert den Vorwurf der Frequenzhortung nach Resolution 35.",

    // ── Phase 1 — Filing route & opening act ──────────────────────────────────
    "itu.p1.title": "Phase 1 — Einreichungsweg & Eröffnungshandlung",
    "itu.p1.brief":
      "Lege fest, wie dieses nicht-geostationäre System in das internationale Regime eintritt. Wähle den korrekten Einreichungsweg (wer bei der ITU einreicht) und die korrekte eröffnende Verfahrenshandlung für ein neues Netz und begründe beides in einem Satz unter Angabe der einschlägigen Vorschrift. Beachte: Rechte werden über die Verwaltung gesichert, nicht unmittelbar durch den Betreiber.",
    "itu.p1.route": "Einreichungsweg",
    "itu.p1.act": "Eröffnende Verfahrenshandlung",
    "itu.p1.justification":
      "Einzeilige Begründung (einschlägige Vorschrift zitieren)",
    "itu.p1.r.route": "Korrekter Einreichungsweg",
    "itu.p1.r.act": "Korrekte Eröffnungshandlung für ein neues Netz",
    "itu.p1.r.justif": "Qualität der zitierten Begründung",

    // ── Phase 2 — Coordination dossier (Art. 9) ───────────────────────────────
    "itu.p2.title": "Phase 2 — Koordinierungsdossier (Artikel 9)",
    "itu.p2.brief":
      "Stelle den Koordinierungsantrag zusammen. Schalte jedes erforderliche Element ein und gib die EPFD-Konformitätsklasse an. Eine vollständige nicht-geostationäre Anmeldung umfasst die Angaben zur Frequenzzuweisung, den EPFD/PFD-Rahmen, einen Inbetriebnahmeplan und einen Meilensteinplan nach Resolution 35. Liste die betroffenen Netze zur Transparenz auf — dies wird erfasst, ist aber nicht der Maßstab für die Vollständigkeit.",
    "itu.p2.frequency": "Angaben zur Frequenzzuweisung (Daten nach Anhang 4)",
    "itu.p2.epfd": "EPFD/PFD-Leistungsrahmen (Artikel 22)",
    "itu.p2.biu": "Inbetriebnahmeplan (BIU)",
    "itu.p2.milestones": "Meilensteinplan nach Resolution 35",
    "itu.p2.affected": "Liste der betroffenen Netze (informativ)",
    "itu.p2.epfdbracket": "EPFD-Konformitätsklasse",
    "itu.p2.r.coord": "Pflicht-Koordinierungselemente vorhanden",
    "itu.p2.r.epfd": "EPFD-Rahmen innerhalb der Grenzwerte des Artikels 22",

    // ── Phase 3 — Interference dispute (cover letter) ─────────────────────────
    "itu.p3.title": "Phase 3 — Erwiderung im Störungsstreit",
    "itu.p3.brief":
      "Die konkurrierende Verwaltung hat einen Einwand wegen funktechnischer Störung erhoben und beruft sich auf den Zeitvorrang. Verfasse die Koordinierungs­erwiderung. Ordne den Anspruch den EPFD-Grenzwerten des Artikels 22 und dem Test des Artikels 11.32A (keine Erhöhung der Wahrscheinlichkeit funktechnischer Störung) zu und argumentiere zum Vorrang: Der Schutz eines älteren Netzes ist an die fortlaufende, tatsächliche Nutzung gebunden — kein absolutes Recht. Zitiere mindestens zwei Vorschriften.",
    "itu.p3.r.law": "Korrekte Einordnung des Störungsrechts (Art. 22 / 11.32A)",
    "itu.p3.r.priority": "Vorrangargument auf Grundlage fortlaufender Nutzung",
    "itu.p3.r.cites": "Zitiergenauigkeit (≥2 Vorschriften)",

    // ── Phase 4 — Notification & MIFR recording (deficiency response) ──────────
    "itu.p4.title": "Phase 4 — Anmeldung & MIFR-Eintragung",
    "itu.p4.brief":
      "Das Büro hat zu deiner Anmeldung zur Eintragung in das internationale Hauptfrequenzregister eine Feststellung zurückgesandt. Lies sie, behebe das betroffene Element — unter Berufung auf fortlaufende Nutzung, Inbetriebnahmestatus und Meilensteinkonformität zur Wahrung deiner eingetragenen Rechte — und reiche es mit einer kurzen Erläuterung der Korrektur erneut ein.",
    "itu.p4.r.addresses": "Behandelt die Feststellung des Büros",
    "itu.p4.r.quality": "Qualität der Anmeldungs-/Eintragungsverteidigung",

    // ── Track-1 engine feedback notes ─────────────────────────────────────────
    "itu.fb.route.ok":
      "Richtig — internationale Rechte werden dadurch gesichert, dass die zuständige nationale Verwaltung im Namen des Betreibers bei der ITU einreicht.",
    "itu.fb.route.wrong":
      "Falscher Weg — ein Betreiber kann nicht unmittelbar bei der ITU einreichen, und die ITU weist Frequenzen nicht einseitig zu; Rechte laufen über die Heimatverwaltung.",
    "itu.fb.act.ok":
      "Richtig — die Voraus­veröffentlichung (API) ist die Eröffnungshandlung, die das Koordinierungsverfahren für ein neues Netz in Gang setzt.",
    "itu.fb.act.wrong":
      "Nicht die korrekte Eröffnungshandlung — bei einem neuen Netz beginnt das Verfahren mit der API, vor Koordinierung (CR/C) und Anmeldung.",
    "itu.fb.coord.ok":
      "Alle Pflicht-Koordinierungselemente sind vorhanden — Frequenzangaben, EPFD-Rahmen, Inbetriebnahmeplan und der Meilensteinplan nach Resolution 35.",
    "itu.fb.coord.partial":
      "Einige Pflicht-Koordinierungselemente fehlen — eine unvollständige nicht-geostationäre Anmeldung kann nicht ordnungsgemäß koordiniert werden.",
    "itu.fb.epfd.ok":
      "Der EPFD-Rahmen liegt innerhalb der Grenzwerte des Artikels 22.",
    "itu.fb.epfd.wrong":
      "Die angegebene EPFD-Klasse bleibt nicht innerhalb der Grenzwerte des Artikels 22 — eine Anmeldung am oder über dem Grenzwert lädt zu einem begründeten Störungseinwand ein.",
  },
} as const;
