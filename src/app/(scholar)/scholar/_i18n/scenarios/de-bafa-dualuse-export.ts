/**
 * Caelex Scholar — i18n for the `de-bafa-dualuse-export` Planspiel.
 *
 * Flat dotted keys under the "dualuse." prefix, mirroring the `asi.*` block in
 * planspiele-play.ts. EN is the source of truth; DE is the professional German
 * translation. IT/FR/ES are intentionally omitted and degrade to EN via t().
 *
 * Merged into the `planspiele-play` namespace by the i18n registry (orchestrator-wired).
 */
export const DUALUSE_PLAY = {
  en: {
    // ── Scenario header ─────────────────────────────────────────────────────
    "dualuse.title":
      "Dual-Use Export Control — Classify, Licence, Comply (Germany)",
    "dualuse.summary":
      "A German maker of star trackers and GNSS receivers wants to ship a space component to a third country. You are the exporter's export-control counsel; BAFA — the German licensing and enforcement authority — is played by the AI. Classify the item across the EU and US regimes, build the licensing dossier with a technology control plan, then answer an enforcement notice. This is the Scholar-side mirror of what Caelex Passage automates for industry.",

    // ── Roles ───────────────────────────────────────────────────────────────
    "dualuse.role.counsel.name": "Export-Control Counsel (Exporter)",
    "dualuse.role.counsel.goal":
      "Ship the item lawfully at the lowest enforcement risk: classify it correctly across every regime that bites, obtain the right licence, and surface and remediate any exposure before BAFA does.",
    "dualuse.role.counsel.brief":
      "Your client builds star trackers and GNSS receivers and has a sale to a third-country buyer. Decide which export-control regimes apply (EU dual-use under BAFA, US ITAR under DDTC, US EAR under BIS), classify the item under the correct control entries, assemble the licensing dossier with a technology control plan, and advise on compliance.",
    "dualuse.role.counsel.private":
      "Two facts are not yet on the file. A sub-supplier already drop-shipped US-origin radiation-tolerant parts to this same end-user WITHOUT a licence — US-origin content drags US re-export jurisdiction across the border (the Loral / ITT lesson). And your CTO ran a 'troubleshooting' call walking the buyer through calibration internals with no Technical Assistance Agreement in place — a probable deemed-export of controlled technical data. The end-user's parent is one corporate layer away from an OFAC-listed party, so the SDN 50% Rule is in play.",
    "dualuse.role.regulator.name": "BAFA (Licensing & Enforcement)",
    "dualuse.role.regulator.goal":
      "License only a complete, correctly-classified transaction; protect the control regime; test whether counsel self-identifies the latent violations and proposes credible remediation.",
    "dualuse.role.regulator.brief":
      "You are the German Federal Office for Economic Affairs and Export Control. You assess the classification and the licensing dossier for completeness and legal soundness, and you issue an enforcement notice where the showing is incomplete or the conduct is non-compliant.",
    "dualuse.role.regulator.private":
      "You already hold the sub-supplier's unlicensed-shipment record and you know about the CTO's call. You will not treat the matter as resolved unless counsel names both exposures, proposes a voluntary self-disclosure, and shows the EAR and OFAC violations stack rather than offset.",

    // ── Phase 1 — Classify ──────────────────────────────────────────────────
    "dualuse.p1.title": "Phase 1 — Classify the item and pick the regime",
    "dualuse.p1.brief":
      "Decide which authority leads, then classify the item under both the EU and US control lists. Pick the lead authority, the EU dual-use category, and the US classification, and justify your choice in one line — apply the Article 4 catch-all 'know-or-suspect' duty where the listed entries do not fully capture the risk.",
    "dualuse.p1.authority": "Lead export-control authority",
    "dualuse.p1.eucat": "EU dual-use control category (Annex I)",
    "dualuse.p1.usclass": "US classification",
    "dualuse.p1.justification":
      "One-line justification (cite the governing entry and address the catch-all duty)",
    "dualuse.p1.r.authority": "Correct lead authority",
    "dualuse.p1.r.eucat": "Correct EU control category",
    "dualuse.p1.r.usclass": "Correct US classification",
    "dualuse.p1.r.catchall": "Catch-all / know-or-suspect reasoning",

    // ── Phase 2 — Licence & Technology Control Plan ─────────────────────────
    "dualuse.p2.title": "Phase 2 — Licence and technology control plan",
    "dualuse.p2.brief":
      "Assemble the licensing dossier. Toggle each required element and draft the cover letter for the technology control plan. Identify when a US Technical Assistance Agreement is needed for technical-data or deemed-export transfers. The governing AWG/AWV provisions are open in the rail.",
    "dualuse.p2.bafa": "BAFA dual-use export licence (AWG §§4–8 / AWV)",
    "dualuse.p2.enduser": "End-user / end-use statement",
    "dualuse.p2.taa":
      "US Technical Assistance Agreement (technical-data / deemed export)",
    "dualuse.p2.tcp": "Technology Control Plan",
    "dualuse.p2.r.licence": "Mandatory licensing elements present",
    "dualuse.p2.r.tcp": "Quality of the technology-control-plan cover letter",

    // ── Phase 3 — Enforcement ───────────────────────────────────────────────
    "dualuse.p3.title": "Phase 3 — Respond to the enforcement notice",
    "dualuse.p3.brief":
      "BAFA returns an enforcement notice flagging two latent exposures. Identify the violations (the unlicensed US-origin re-export and the deemed-export from the uncontrolled call), propose a remediation strategy weighing voluntary self-disclosure against concealment, and ground your answer in the real settlement record.",
    "dualuse.p3.r.violations": "Identifies the latent violations",
    "dualuse.p3.r.remediation":
      "Remediation strategy (self-disclosure vs concealment)",
    "dualuse.p3.r.grounding": "Grounding in the enforcement record",

    // ── Track-1 engine feedback notes ───────────────────────────────────────
    "dualuse.fb.authority.ok":
      "Correct — BAFA leads the German dual-use licence; DDTC (ITAR) and BIS (EAR) are the parallel US authorities, not the lead here.",
    "dualuse.fb.authority.wrong":
      "Not the lead authority for a German dual-use export. BAFA administers the EU dual-use regime; DDTC and BIS act only on the US-origin content.",
    "dualuse.fb.eucat.ok":
      "Correct — a star tracker / GNSS receiver falls under EU Annex I Category 7 (navigation and avionics), not Category 9 (aerospace and propulsion).",
    "dualuse.fb.eucat.wrong":
      "Wrong category — the navigation/avionics function places this item in EU Annex I Category 7, not Category 9.",
    "dualuse.fb.usclass.ok":
      "Correct — after the 2014 export-control reform most commercial spacecraft components sit under EAR ECCN 9A515, not USML Category XV.",
    "dualuse.fb.usclass.wrong":
      "Wrong classification — post-2014-reform this commercial component is controlled under EAR 9A515, not ITAR USML Category XV.",
    "dualuse.fb.licence.ok":
      "All mandatory licensing elements are present — licence, end-user statement, TAA, and technology control plan.",
    "dualuse.fb.licence.partial":
      "Some mandatory licensing elements are missing — BAFA cannot license an incomplete dossier, and a missing TAA leaves the deemed-export uncovered.",
  },
  de: {
    // ── Scenario header ─────────────────────────────────────────────────────
    "dualuse.title":
      "Dual-Use-Exportkontrolle — Einstufen, Genehmigen, Compliance (Deutschland)",
    "dualuse.summary":
      "Ein deutscher Hersteller von Sternensensoren und GNSS-Empfängern möchte eine Weltraumkomponente in ein Drittland liefern. Sie sind die Exportkontroll-Beraterin/-Berater des Exporteurs; das BAFA — die deutsche Genehmigungs- und Vollzugsbehörde — wird von der KI gespielt. Stufen Sie das Gut über die EU- und die US-Regime ein, erstellen Sie das Genehmigungsdossier mit einem Technology Control Plan und beantworten Sie anschließend einen Vollzugsbescheid. Dies ist das Scholar-Pendant zu dem, was Caelex Passage für die Industrie automatisiert.",

    // ── Roles ───────────────────────────────────────────────────────────────
    "dualuse.role.counsel.name": "Exportkontroll-Berater (Exporteur)",
    "dualuse.role.counsel.goal":
      "Das Gut rechtmäßig und mit geringstem Vollzugsrisiko ausführen: korrekt über alle einschlägigen Regime einstufen, die richtige Genehmigung einholen und etwaige Risiken aufdecken und beheben, bevor das BAFA dies tut.",
    "dualuse.role.counsel.brief":
      "Ihr Mandant baut Sternensensoren und GNSS-Empfänger und hat einen Verkauf an einen Käufer im Drittland. Entscheiden Sie, welche Exportkontrollregime greifen (EU-Dual-Use über das BAFA, US-ITAR über das DDTC, US-EAR über das BIS), stufen Sie das Gut unter den richtigen Kontrolleinträgen ein, stellen Sie das Genehmigungsdossier mit einem Technology Control Plan zusammen und beraten Sie zur Compliance.",
    "dualuse.role.counsel.private":
      "Zwei Tatsachen stehen noch nicht in der Akte. Ein Unterlieferant hat US-Ursprungs-strahlungsfeste Teile bereits OHNE Genehmigung direkt an genau diesen Endverwender geliefert — US-Ursprungsanteile ziehen die US-Wiederausfuhrzuständigkeit über die Grenze (die Lehre aus Loral / ITT). Und Ihr CTO hat in einem 'Troubleshooting'-Gespräch dem Käufer Kalibrierungs-Interna erläutert, ohne dass ein Technical Assistance Agreement vorlag — eine wahrscheinliche fingierte Ausfuhr (deemed export) kontrollierter technischer Daten. Die Muttergesellschaft des Endverwenders liegt nur eine Beteiligungsebene von einer OFAC-gelisteten Partei entfernt, sodass die SDN-50%-Regel greift.",
    "dualuse.role.regulator.name": "BAFA (Genehmigung & Vollzug)",
    "dualuse.role.regulator.goal":
      "Nur einen vollständigen, korrekt eingestuften Vorgang genehmigen; das Kontrollregime schützen; prüfen, ob die Beratung die latenten Verstöße selbst benennt und eine glaubwürdige Behebung vorschlägt.",
    "dualuse.role.regulator.brief":
      "Sie sind das Bundesamt für Wirtschaft und Ausfuhrkontrolle. Sie prüfen die Einstufung und das Genehmigungsdossier auf Vollständigkeit und Rechtssicherheit und erlassen einen Vollzugsbescheid, wenn die Darlegung unvollständig oder das Verhalten nicht regelkonform ist.",
    "dualuse.role.regulator.private":
      "Sie verfügen bereits über den Vorgang zur ungenehmigten Lieferung des Unterlieferanten und wissen von dem Gespräch des CTO. Sie behandeln die Sache erst dann als erledigt, wenn die Beratung beide Risiken benennt, eine freiwillige Selbstanzeige vorschlägt und darlegt, dass sich EAR- und OFAC-Verstöße kumulieren und nicht gegenseitig aufheben.",

    // ── Phase 1 — Classify ──────────────────────────────────────────────────
    "dualuse.p1.title": "Phase 1 — Gut einstufen und Regime bestimmen",
    "dualuse.p1.brief":
      "Bestimmen Sie die federführende Behörde und stufen Sie das Gut sowohl unter der EU- als auch unter der US-Kontrollliste ein. Wählen Sie die federführende Behörde, die EU-Dual-Use-Kategorie und die US-Einstufung und begründen Sie Ihre Wahl in einer Zeile — wenden Sie die Catch-all-Pflicht des Artikels 4 ('Kenntnis oder Verdacht') an, wo die gelisteten Einträge das Risiko nicht vollständig erfassen.",
    "dualuse.p1.authority": "Federführende Exportkontrollbehörde",
    "dualuse.p1.eucat": "EU-Dual-Use-Kontrollkategorie (Anhang I)",
    "dualuse.p1.usclass": "US-Einstufung",
    "dualuse.p1.justification":
      "Einzeilige Begründung (gelisteten Eintrag zitieren und Catch-all-Pflicht ansprechen)",
    "dualuse.p1.r.authority": "Korrekte federführende Behörde",
    "dualuse.p1.r.eucat": "Korrekte EU-Kontrollkategorie",
    "dualuse.p1.r.usclass": "Korrekte US-Einstufung",
    "dualuse.p1.r.catchall": "Catch-all- / Kenntnis-oder-Verdacht-Begründung",

    // ── Phase 2 — Licence & Technology Control Plan ─────────────────────────
    "dualuse.p2.title": "Phase 2 — Genehmigung und Technology Control Plan",
    "dualuse.p2.brief":
      "Stellen Sie das Genehmigungsdossier zusammen. Schalten Sie jedes erforderliche Element ein und entwerfen Sie das Anschreiben zum Technology Control Plan. Bestimmen Sie, wann ein US-Technical-Assistance-Agreement für die Weitergabe technischer Daten oder eine fingierte Ausfuhr erforderlich ist. Die maßgeblichen AWG/AWV-Vorschriften sind in der Leiste geöffnet.",
    "dualuse.p2.bafa": "BAFA-Dual-Use-Ausfuhrgenehmigung (AWG §§4–8 / AWV)",
    "dualuse.p2.enduser": "Endverbleibs-/Endverwendungserklärung",
    "dualuse.p2.taa":
      "US-Technical-Assistance-Agreement (technische Daten / fingierte Ausfuhr)",
    "dualuse.p2.tcp": "Technology Control Plan",
    "dualuse.p2.r.licence": "Pflichtelemente der Genehmigung vorhanden",
    "dualuse.p2.r.tcp": "Qualität des Anschreibens zum Technology Control Plan",

    // ── Phase 3 — Enforcement ───────────────────────────────────────────────
    "dualuse.p3.title": "Phase 3 — Auf den Vollzugsbescheid reagieren",
    "dualuse.p3.brief":
      "Das BAFA erlässt einen Vollzugsbescheid, der zwei latente Risiken benennt. Identifizieren Sie die Verstöße (die ungenehmigte US-Ursprungs-Wiederausfuhr und die fingierte Ausfuhr aus dem unkontrollierten Gespräch), schlagen Sie eine Behebungsstrategie vor, die freiwillige Selbstanzeige gegen Verschleierung abwägt, und stützen Sie Ihre Antwort auf den realen Vergleichsfall-Bestand.",
    "dualuse.p3.r.violations": "Benennt die latenten Verstöße",
    "dualuse.p3.r.remediation":
      "Behebungsstrategie (Selbstanzeige vs. Verschleierung)",
    "dualuse.p3.r.grounding": "Stützung auf den Vollzugs-Bestand",

    // ── Track-1 engine feedback notes ───────────────────────────────────────
    "dualuse.fb.authority.ok":
      "Richtig — das BAFA führt die deutsche Dual-Use-Genehmigung; DDTC (ITAR) und BIS (EAR) sind die parallelen US-Behörden, hier nicht federführend.",
    "dualuse.fb.authority.wrong":
      "Nicht die federführende Behörde für eine deutsche Dual-Use-Ausfuhr. Das BAFA verwaltet das EU-Dual-Use-Regime; DDTC und BIS greifen nur auf den US-Ursprungsanteil.",
    "dualuse.fb.eucat.ok":
      "Richtig — ein Sternensensor / GNSS-Empfänger fällt unter EU-Anhang-I-Kategorie 7 (Navigation und Avionik), nicht unter Kategorie 9 (Luft- und Raumfahrt sowie Antrieb).",
    "dualuse.fb.eucat.wrong":
      "Falsche Kategorie — die Navigations-/Avionikfunktion ordnet dieses Gut der EU-Anhang-I-Kategorie 7 zu, nicht der Kategorie 9.",
    "dualuse.fb.usclass.ok":
      "Richtig — nach der Exportkontrollreform von 2014 fallen die meisten kommerziellen Raumfahrtkomponenten unter EAR-ECCN 9A515, nicht unter USML-Kategorie XV.",
    "dualuse.fb.usclass.wrong":
      "Falsche Einstufung — nach der Reform von 2014 wird diese kommerzielle Komponente unter EAR 9A515 kontrolliert, nicht unter ITAR-USML-Kategorie XV.",
    "dualuse.fb.licence.ok":
      "Alle Pflichtelemente der Genehmigung liegen vor — Genehmigung, Endverbleibserklärung, TAA und Technology Control Plan.",
    "dualuse.fb.licence.partial":
      "Einige Pflichtelemente der Genehmigung fehlen — das BAFA kann ein unvollständiges Dossier nicht genehmigen, und ein fehlendes TAA lässt die fingierte Ausfuhr ungedeckt.",
  },
} as const;
