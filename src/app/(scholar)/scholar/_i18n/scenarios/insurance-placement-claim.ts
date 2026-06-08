/**
 * Caelex Scholar — i18n for the "insurance-placement-claim" Planspiel (prefix `ins`).
 *
 * Flat dotted keys mirroring the asi.* style. EN is the source of truth; DE is a
 * full professional translation. IT/FR/ES are intentionally omitted — t() degrades
 * to EN. The orchestrator merges this block into the `planspiele-play` namespace.
 */
export const INSURANCE_PLAY = {
  en: {
    "ins.title": "Launch & In-Orbit Insurance — Placement to Claim (France)",
    "ins.summary":
      "A medium GEO operator must place launch and first-year in-orbit cover to clear an EU Space Act insurance condition and France's Art. 6 LOS mandatory third-party-liability mandate, then adjudicate a partial reflector-deployment loss in a coverage-position letter. You are the operator's risk manager; a London-market underwriter is played by the AI.",

    "ins.role.operator.name": "Risk Manager (Operator)",
    "ins.role.operator.goal":
      "Place a compliant, cost-efficient coverage stack that clears the authorization condition, then defend the operator's recovery on the in-orbit loss.",
    "ins.role.operator.brief":
      "Your GEO satellite is about to be authorised and launched from French jurisdiction. Both the EU Space Act and France's Law on Space Operations require adequate third-party-liability cover before the authorization issues. Structure the stack across pre-launch, launch-failure and first-year in-orbit, set the statutory TPL tier, then handle the underwriter's coverage position when the main reflector under-deploys in orbit.",
    "ins.role.operator.private":
      "Your CFO wants the thinnest possible TPL layer and resists paying for the in-orbit stratum. The reflector anomaly leaves the satellite at roughly 10% of planned capacity — a PARTIAL loss, so a constructive-total-loss claim may not trigger. Your leverage: deployment-mechanism failure is covered unless it was specifically excluded in the policy you negotiated.",

    "ins.role.insurer.name": "London-Market Underwriter (Insurer)",
    "ins.role.insurer.goal":
      "Bind only priceable risk, hold the line on negotiated exclusions, and settle proportionately to the actual performance loss — not a total loss.",
    "ins.role.insurer.brief":
      "You underwrite the launch and in-orbit risk on the London market. You scrutinise the coverage request, push on the exclusions you need (gradual degradation, manufacturing defect, war/cyber), and on a loss you pay in proportion to the capacity shortfall measured against the contractual specification.",
    "ins.role.insurer.private":
      "The market has hardened after a run of large partial-failure payouts. You concede a constructive total loss only below the CTL threshold; here the satellite still delivers ~10% capacity, so this is a proportionate settlement, not a write-off. You will test whether the operator over-claims for a total loss.",

    "ins.p1.title": "Phase 1 — Governing insurance regime",
    "ins.p1.brief":
      "Identify the regime that sets the MANDATORY minimum third-party-liability cover for this authorization and justify your choice in one line, citing the governing provision. Note how the EU Space Act 'adequate insurance proportionate to risk' standard interacts with France's two-tier Art. 6 LOS model.",
    "ins.p1.regime": "Governing insurance regime",
    "ins.p1.justification":
      "One-line justification (cite the governing article)",
    "ins.p1.r.regime": "Correct governing regime",
    "ins.p1.r.justif": "Quality of the minimum-cover justification",

    "ins.p2.title": "Phase 2 — Structure the coverage stack",
    "ins.p2.brief":
      "Build the insurance placement. Toggle each required layer and set the statutory TPL tier. The pre-launch, launch-failure and first-year in-orbit strata exist for distinct triggers — recall AMOS-6: propellant-loading commencement, not engine ignition, is the pre-launch trigger.",
    "ins.p2.tpl": "Third-party-liability cover (statutory minimum)",
    "ins.p2.inorbit": "First-year in-orbit cover",
    "ins.p2.prelaunch": "Pre-launch cover (propellant-loading onward)",
    "ins.p2.launchfail": "Launch-failure cover",
    "ins.p2.tpltier": "Third-party-liability tier",
    "ins.p2.r.layers": "Mandatory coverage layers present",
    "ins.p2.r.tpl": "Statutory TPL tier met",

    "ins.p3.title": "Phase 3 — Placement cover letter & exclusions",
    "ins.p3.brief":
      "Draft the cover letter to the underwriter binding the placement. State the legal basis for the TPL mandate, address the exclusions the insurer is pressing (deployment-mechanism failure, gradual degradation, manufacturing defect, war/cyber), and allocate residual risk across operator, insurer and State. Cite at least two provisions.",
    "ins.p3.r.exclusion": "Exclusion / peril reasoning",
    "ins.p3.r.allocation": "Risk allocation (operator / insurer / State)",
    "ins.p3.r.cites": "Citation accuracy (≥2 provisions)",

    "ins.p4.title": "Phase 4 — Loss event: coverage-position letter",
    "ins.p4.brief":
      "The main reflector has under-deployed in orbit; capacity is reduced to roughly 10% of specification. The underwriter has issued a coverage position offering a proportionate, not total, settlement. Write the operator's reply: address the insurer's position, quantify a proportionate payout on the partial loss (compare Viasat-3), and cite the policy clause plus the governing liability instrument.",
    "ins.p4.r.addresses": "Addresses the insurer's coverage position",
    "ins.p4.r.payout": "Proportionate-payout reasoning on the partial loss",
    "ins.p4.r.quality": "Quality of the adjudication",

    "ins.fb.regime.ok":
      "Correct — France's Art. 6 LOS sets the mandatory third-party-liability cover (operator insures the layer; the State guarantees beyond), the binding minimum for this authorization.",
    "ins.fb.regime.wrong":
      "Not the regime that fixes the mandatory minimum cover here. The EU Space Act states an 'adequate / proportionate' standard and the 1972 Liability Convention governs inter-State liability, but the operative authorization condition is France's Art. 6 LOS mandate.",
    "ins.fb.layers.ok":
      "All mandatory coverage layers are present — pre-launch, launch-failure, first-year in-orbit and the third-party-liability layer.",
    "ins.fb.layers.partial":
      "One or more mandatory layers are missing — the placement does not yet span pre-launch, launch-failure and first-year in-orbit alongside the TPL layer.",
    "ins.fb.tpl.ok":
      "The third-party-liability tier meets the statutory minimum set per authorization under Art. 6 LOS.",
    "ins.fb.tpl.wrong":
      "The third-party-liability tier does not meet the statutory minimum: too thin clears no authorization, and the State-backed top tier exceeds what the operator must itself insure.",
  },
  de: {
    "ins.title":
      "Start- & In-Orbit-Versicherung — von der Platzierung zum Schaden (Frankreich)",
    "ins.summary":
      "Ein mittelgroßer GEO-Betreiber muss Start- und erstjährige In-Orbit-Deckung platzieren, um eine Versicherungsauflage des EU Space Act und Frankreichs Pflicht zur Haftpflichtdeckung nach Art. 6 LOS zu erfüllen, und anschließend einen Teilschaden aus einer fehlerhaften Reflektor-Entfaltung in einem Deckungsschreiben beurteilen. Du bist der Risikomanager des Betreibers; einen Underwriter des Londoner Marktes spielt die KI.",

    "ins.role.operator.name": "Risikomanager (Betreiber)",
    "ins.role.operator.goal":
      "Eine rechtskonforme, kosteneffiziente Deckungsstruktur platzieren, die die Genehmigungsauflage erfüllt, und anschließend die Entschädigung des Betreibers beim In-Orbit-Schaden verteidigen.",
    "ins.role.operator.brief":
      "Dein GEO-Satellit steht kurz vor Genehmigung und Start unter französischer Hoheitsgewalt. Sowohl der EU Space Act als auch das französische Weltraumtätigkeitsgesetz verlangen vor Erteilung der Genehmigung eine angemessene Haftpflichtdeckung. Strukturiere die Deckung über Vorstart, Startfehlschlag und erstes In-Orbit-Jahr, setze die gesetzliche Haftpflicht-Stufe und behandle dann die Deckungsposition des Underwriters, nachdem sich der Hauptreflektor im Orbit nur unzureichend entfaltet hat.",
    "ins.role.operator.private":
      "Dein CFO will die dünnstmögliche Haftpflicht-Schicht und sträubt sich, die In-Orbit-Schicht zu bezahlen. Die Reflektor-Anomalie lässt den Satelliten bei rund 10 % der geplanten Kapazität — ein TEILSCHADEN, sodass ein konstruktiver Totalschaden möglicherweise nicht greift. Dein Hebel: Versagen des Entfaltungsmechanismus ist gedeckt, sofern es in der von dir verhandelten Police nicht ausdrücklich ausgeschlossen wurde.",

    "ins.role.insurer.name": "Underwriter Londoner Markt (Versicherer)",
    "ins.role.insurer.goal":
      "Nur bepreisbares Risiko zeichnen, an den verhandelten Ausschlüssen festhalten und proportional zum tatsächlichen Leistungsverlust regulieren — nicht als Totalschaden.",
    "ins.role.insurer.brief":
      "Du zeichnest das Start- und In-Orbit-Risiko am Londoner Markt. Du prüfst den Deckungsantrag, bestehst auf den nötigen Ausschlüssen (allmähliche Degradation, Herstellungsfehler, Krieg/Cyber) und zahlst im Schadenfall proportional zum Kapazitätsausfall gemessen an der vertraglichen Spezifikation.",
    "ins.role.insurer.private":
      "Der Markt hat sich nach einer Reihe großer Teilschaden-Zahlungen verhärtet. Einen konstruktiven Totalschaden räumst du nur unterhalb der CTL-Schwelle ein; hier liefert der Satellit noch ~10 % Kapazität, also ist dies eine proportionale Regulierung, kein Totalausfall. Du prüfst, ob der Betreiber einen Totalschaden überzieht.",

    "ins.p1.title": "Phase 1 — Maßgebliches Versicherungsregime",
    "ins.p1.brief":
      "Bestimme das Regime, das die VERPFLICHTENDE Mindest-Haftpflichtdeckung für diese Genehmigung festlegt, und begründe deine Wahl in einem Satz unter Angabe der einschlägigen Vorschrift. Beachte, wie der Maßstab des EU Space Act („angemessene, risikoproportionale Versicherung“) mit Frankreichs zweistufigem Modell nach Art. 6 LOS zusammenwirkt.",
    "ins.p1.regime": "Maßgebliches Versicherungsregime",
    "ins.p1.justification":
      "Einzeilige Begründung (einschlägigen Artikel zitieren)",
    "ins.p1.r.regime": "Korrektes maßgebliches Regime",
    "ins.p1.r.justif": "Qualität der Begründung der Mindestdeckung",

    "ins.p2.title": "Phase 2 — Deckungsstruktur aufbauen",
    "ins.p2.brief":
      "Baue die Versicherungsplatzierung auf. Schalte jede erforderliche Schicht ein und setze die gesetzliche Haftpflicht-Stufe. Die Schichten Vorstart, Startfehlschlag und erstes In-Orbit-Jahr bestehen für unterschiedliche Auslöser — erinnere dich an AMOS-6: Auslöser der Vorstart-Deckung ist der Beginn der Treibstoffbefüllung, nicht die Triebwerkszündung.",
    "ins.p2.tpl": "Haftpflichtdeckung (gesetzliches Minimum)",
    "ins.p2.inorbit": "In-Orbit-Deckung erstes Jahr",
    "ins.p2.prelaunch": "Vorstart-Deckung (ab Treibstoffbefüllung)",
    "ins.p2.launchfail": "Startfehlschlag-Deckung",
    "ins.p2.tpltier": "Haftpflicht-Stufe",
    "ins.p2.r.layers": "Pflicht-Deckungsschichten vorhanden",
    "ins.p2.r.tpl": "Gesetzliche Haftpflicht-Stufe eingehalten",

    "ins.p3.title": "Phase 3 — Platzierungsanschreiben & Ausschlüsse",
    "ins.p3.brief":
      "Verfasse das Anschreiben an den Underwriter zur Bindung der Platzierung. Nenne die Rechtsgrundlage der Haftpflicht, gehe auf die vom Versicherer geforderten Ausschlüsse ein (Versagen des Entfaltungsmechanismus, allmähliche Degradation, Herstellungsfehler, Krieg/Cyber) und verteile das Restrisiko auf Betreiber, Versicherer und Staat. Zitiere mindestens zwei Vorschriften.",
    "ins.p3.r.exclusion": "Begründung zu Ausschlüssen / Gefahren",
    "ins.p3.r.allocation": "Risikoverteilung (Betreiber / Versicherer / Staat)",
    "ins.p3.r.cites": "Zitiergenauigkeit (≥2 Vorschriften)",

    "ins.p4.title": "Phase 4 — Schadenfall: Deckungsschreiben",
    "ins.p4.brief":
      "Der Hauptreflektor hat sich im Orbit unzureichend entfaltet; die Kapazität ist auf rund 10 % der Spezifikation reduziert. Der Underwriter hat eine Deckungsposition mit einer proportionalen, nicht vollständigen Regulierung vorgelegt. Schreibe die Antwort des Betreibers: gehe auf die Position des Versicherers ein, quantifiziere eine proportionale Zahlung beim Teilschaden (vergleiche Viasat-3) und zitiere die Policenklausel sowie das maßgebliche Haftungsinstrument.",
    "ins.p4.r.addresses": "Geht auf die Deckungsposition des Versicherers ein",
    "ins.p4.r.payout": "Proportionale Zahlungsbegründung beim Teilschaden",
    "ins.p4.r.quality": "Qualität der Beurteilung",

    "ins.fb.regime.ok":
      "Richtig — Frankreichs Art. 6 LOS legt die verpflichtende Haftpflichtdeckung fest (der Betreiber versichert die Schicht; der Staat garantiert darüber hinaus), das bindende Minimum für diese Genehmigung.",
    "ins.fb.regime.wrong":
      "Nicht das Regime, das hier das verpflichtende Mindestmaß festlegt. Der EU Space Act nennt einen „angemessenen / proportionalen“ Maßstab und das Haftungsübereinkommen von 1972 regelt die zwischenstaatliche Haftung, doch die maßgebliche Genehmigungsauflage ist Frankreichs Pflicht nach Art. 6 LOS.",
    "ins.fb.layers.ok":
      "Alle Pflicht-Deckungsschichten sind vorhanden — Vorstart, Startfehlschlag, erstes In-Orbit-Jahr und die Haftpflicht-Schicht.",
    "ins.fb.layers.partial":
      "Eine oder mehrere Pflichtschichten fehlen — die Platzierung umfasst noch nicht Vorstart, Startfehlschlag und erstes In-Orbit-Jahr neben der Haftpflicht-Schicht.",
    "ins.fb.tpl.ok":
      "Die Haftpflicht-Stufe hält das je Genehmigung nach Art. 6 LOS festgelegte gesetzliche Minimum ein.",
    "ins.fb.tpl.wrong":
      "Die Haftpflicht-Stufe hält das gesetzliche Minimum nicht ein: zu dünn erfüllt keine Genehmigung, und die staatlich abgesicherte Oberstufe übersteigt, was der Betreiber selbst versichern muss.",
  },
} as const;
