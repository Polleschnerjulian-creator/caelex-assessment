/**
 * Caelex Scholar — Planspiele scenario text for "tco-equivalence-eu".
 *
 * Flat dotted keys under the "tco." prefix, mirroring the ASI flagship style in
 * planspiele-play.ts. EN is the source of truth; DE is a full professional
 * translation. IT/FR/ES are intentionally omitted and degrade to EN via playT().
 *
 * The orchestrator merges this block into the `planspiele-play` namespace; this
 * file only owns the data (plain object, no imports, no `satisfies`).
 */
export const TCO_PLAY = {
  en: {
    // ── Scenario header ───────────────────────────────────────────────────────
    "tco.title": "Third-Country Operator: Competent NCA & TCO Equivalence (EU)",
    "tco.summary":
      "OrbitLink Ltd — a UK-incorporated, CAA-licensed LEO broadband operator — wants to sell connectivity into the EU once the EU Space Act applies. You are its EU regulatory counsel. Work out when a non-EU operator is caught by the Act, pick the Member-State authority that becomes its point of registration, and argue that its UK licence equivalence carries the lighter third-country pathway. The EU body and a competing national regulator are played by the AI.",

    // ── Roles ─────────────────────────────────────────────────────────────────
    "tco.role.counsel.name": "EU Regulatory Counsel (OrbitLink Ltd)",
    "tco.role.counsel.goal":
      "Secure lawful EU market access fast and cheaply via the third-country pathway: confirm the Act bites, designate the most favourable competent NCA, and win an equivalence determination that avoids full re-authorisation.",
    "tco.role.counsel.brief":
      "OrbitLink is established and licensed only in the UK, but plans to offer broadband to customers across the Union. The EU Space Act reaches non-EU operators that provide services into the Union (services-nexus, Art. 20). Your job: advise the board on whether and how the Act applies, choose the single Member-State NCA that will become OrbitLink's point of designation and registration, and build the equivalence case mapping the UK CAA authorisation onto the EU harmonised requirements so the lighter third-country obligations apply instead of a fresh authorisation.",
    "tco.role.counsel.private":
      "The board wants NO EU establishment beyond the bare statutory minimum. The genuinely non-equivalent gap is space cybersecurity (EU Space Act Art. 74–95) — it was never assessed against the UK licence, so a 'fully equivalent' claim is indefensible. Among the candidate authorities, Luxembourg (MECO) means unlimited operator liability and a 6-month filing window; France (CNES) offers a State guarantee above the insured amount. The EU representative under Art. 20 is non-negotiable and cannot be discharged by the home-state licence.",

    "tco.role.eubody.name": "EU Body (DG DEFIS / EUSPA)",
    "tco.role.eubody.goal":
      "Ensure uniform application of the EU Space Act across the Union; accept the third-country pathway only where the home-state authorisation is genuinely equivalent and the Union-facing obligations are actually met.",
    "tco.role.eubody.brief":
      "You oversee consistent application of the Act's third-country-operator regime. You scrutinise the equivalence argument, the genuineness of the EU representative, and the registration. You issue a deficiency notice where the showing overreaches.",
    "tco.role.eubody.private":
      "Your red lines: a UK CAA licence is not, by itself, an equivalence finding; the EU representative must be genuinely established in the Union, not a letterbox; and the deficiency must land specifically on the space-cybersecurity gap (Art. 74–95) that no home-state assessment ever covered.",

    "tco.role.regulator.name": "Competing Member-State NCA",
    "tco.role.regulator.goal":
      "Apply your national-law overlay correctly and surface the asymmetric-liability facts a thin memo may gloss over, so the operator's forum choice is made with eyes open.",
    "tco.role.regulator.brief":
      "You are a candidate national competent authority (the France/CNES route or the Luxembourg/MECO route). You press the operator on the national-law consequences of designating you — liability backstop, filing timelines, register transparency — and on which obligations your authorisation can and cannot absorb.",
    "tco.role.regulator.private":
      "If France: you offer a State guarantee above the insured TPL amount, which is attractive but conditions the authorisation. If Luxembourg: unlimited operator liability and a 6-month filing window — a fact the memo may understate. Either way, your authorisation does not cure the EU-level space-cybersecurity gap.",

    // ── Phase 1 — Jurisdiction memo ───────────────────────────────────────────
    "tco.p1.title": "Phase 1 — Jurisdiction & extraterritorial-reach memo",
    "tco.p1.brief":
      "Draft the opening memo to the board: does the EU Space Act reach OrbitLink, and on what basis? Apply the Art. 20 services-nexus (offering services into the Union) and distinguish it from the establishment-nexus of national law (French 'jurisdiction'; Luxembourg 'responsibility'). State the legal basis and cite at least two provisions; use the citation export to pull verifiable references from the corpus.",
    "tco.p1.r.basis": "Correct extraterritorial-reach basis (services-nexus)",
    "tco.p1.r.complete": "Completeness of the memo",
    "tco.p1.r.cites": "Citation accuracy (≥2 provisions)",

    // ── Phase 2 — Competent NCA ───────────────────────────────────────────────
    "tco.p2.title": "Phase 2 — Designate the competent NCA",
    "tco.p2.brief":
      "OrbitLink has no EU establishment, so a single Member-State NCA must become its point of designation and registration. Pick the authority and justify the choice in one line, weighing the liability backstop, filing timelines and register transparency. (UK_CAA is the home-state regulator, not an EU competent authority; DE_BNetzA handles spectrum, not space authorisation.)",
    "tco.p2.nca": "Competent EU national authority",
    "tco.p2.justification":
      "One-line justification (why this NCA — liability, timeline, transparency)",
    "tco.p2.r.nca": "Correct competent NCA",
    "tco.p2.r.justif": "Quality of the forum-choice justification",

    // ── Phase 3 — TCO obligations & equivalence ───────────────────────────────
    "tco.p3.title": "Phase 3 — TCO obligations & equivalence determination",
    "tco.p3.brief":
      "Assemble the mandatory third-country-operator obligations and set the equivalence basis. Toggle each obligation the home-state licence cannot discharge, then decide how far the UK CAA authorisation is equivalent to the EU harmonised requirements (Art. 6–16). Remember which pillar was never assessed against the UK licence.",
    "tco.p3.eurep":
      "Designate an EU representative established in the Union (Art. 20)",
    "tco.p3.registration": "Register under the EU Space Act (Art. 20)",
    "tco.p3.equiv": "Equivalence basis vs the EU harmonised requirements",
    "tco.p3.r.obligations": "Mandatory TCO obligations present",
    "tco.p3.r.equiv": "Equivalence determination correctly scoped",

    // ── Phase 4 — Registration deficiency ─────────────────────────────────────
    "tco.p4.title": "Phase 4 — Respond to the equivalence deficiency notice",
    "tco.p4.brief":
      "The EU body returned a deficiency notice on the contested equivalence finding. Read it, concede the genuinely non-equivalent gap, revise the affected element with provision-level citations, and resubmit with a short explanation of the fix.",
    "tco.p4.r.addresses": "Addresses the stated deficiency",
    "tco.p4.r.quality": "Quality of the revision",

    // ── Track-1 engine feedback notes ─────────────────────────────────────────
    "tco.fb.nca.ok":
      "Correct — France (CNES) is a defensible competent NCA: its State guarantee above the insured amount and workable filing timeline make it the favourable forum for a no-EU-establishment operator.",
    "tco.fb.nca.wrong":
      "Not the best competent NCA here. UK_CAA is the home-state regulator (not an EU authority); DE_BNetzA handles spectrum, not space authorisation; Luxembourg (MECO) carries unlimited operator liability and a tighter 6-month filing window.",
    "tco.fb.obligations.ok":
      "Both mandatory third-country obligations are present — an EU representative established in the Union and registration under Art. 20.",
    "tco.fb.obligations.partial":
      "A mandatory third-country obligation is missing. The home-state licence cannot discharge either the EU-representative designation or the Art. 20 registration.",
    "tco.fb.equiv.ok":
      "Correct — PARTIAL equivalence. Debris and insurance are equivalent to the UK licence, but space cybersecurity (Art. 74–95) was never assessed and is genuinely non-equivalent.",
    "tco.fb.equiv.wrong":
      "Wrong scope. FULL overreaches — the space-cybersecurity pillar (Art. 74–95) was never assessed against the UK licence; NONE understates it, because debris and insurance ARE equivalent. The answer is PARTIAL.",
  },

  de: {
    // ── Scenario header ───────────────────────────────────────────────────────
    "tco.title":
      "Drittstaatenbetreiber: Zuständige NCA & TCO-Gleichwertigkeit (EU)",
    "tco.summary":
      "OrbitLink Ltd — ein im Vereinigten Königreich ansässiger, von der CAA lizenzierter LEO-Breitbandbetreiber — möchte Konnektivität in die EU verkaufen, sobald das EU-Weltraumgesetz gilt. Du bist die EU-Regulierungsberatung. Bestimme, wann ein Nicht-EU-Betreiber vom Gesetz erfasst wird, wähle die Mitgliedstaatsbehörde, die zum Registrierungspunkt wird, und argumentiere, dass die Gleichwertigkeit der UK-Lizenz den leichteren Drittstaatenweg eröffnet. Die EU-Stelle und eine konkurrierende nationale Behörde spielt die KI.",

    // ── Roles ─────────────────────────────────────────────────────────────────
    "tco.role.counsel.name": "EU-Regulierungsberatung (OrbitLink Ltd)",
    "tco.role.counsel.goal":
      "Rechtmäßigen EU-Marktzugang schnell und kostengünstig über den Drittstaatenweg sichern: bestätigen, dass das Gesetz greift, die günstigste zuständige NCA benennen und eine Gleichwertigkeitsfeststellung erwirken, die eine vollständige Neugenehmigung vermeidet.",
    "tco.role.counsel.brief":
      "OrbitLink ist nur im Vereinigten Königreich niedergelassen und lizenziert, plant aber, Breitband an Kunden in der gesamten Union anzubieten. Das EU-Weltraumgesetz erfasst Nicht-EU-Betreiber, die Dienste in die Union erbringen (Dienste-Anknüpfung, Art. 20). Deine Aufgabe: den Vorstand beraten, ob und wie das Gesetz gilt, die eine Mitgliedstaats-NCA wählen, die zum Benennungs- und Registrierungspunkt von OrbitLink wird, und den Gleichwertigkeitsfall aufbauen, der die UK-CAA-Genehmigung den harmonisierten EU-Anforderungen gegenüberstellt, damit die leichteren Drittstaatenpflichten statt einer neuen Genehmigung greifen.",
    "tco.role.counsel.private":
      "Der Vorstand will KEINE EU-Niederlassung über das gesetzliche Minimum hinaus. Die wirklich nicht gleichwertige Lücke ist die Weltraum-Cybersicherheit (EU-Weltraumgesetz Art. 74–95) — sie wurde nie gegen die UK-Lizenz geprüft, daher ist die Behauptung „voll gleichwertig“ unhaltbar. Unter den in Frage kommenden Behörden bedeutet Luxemburg (MECO) unbegrenzte Betreiberhaftung und eine 6-Monats-Frist; Frankreich (CNES) bietet eine Staatsgarantie oberhalb des versicherten Betrags. Der EU-Vertreter nach Art. 20 ist nicht verhandelbar und kann durch die Heimatstaatslizenz nicht erfüllt werden.",

    "tco.role.eubody.name": "EU-Stelle (GD DEFIS / EUSPA)",
    "tco.role.eubody.goal":
      "Einheitliche Anwendung des EU-Weltraumgesetzes in der Union sicherstellen; den Drittstaatenweg nur akzeptieren, wo die Heimatstaatsgenehmigung wirklich gleichwertig ist und die unionsgerichteten Pflichten tatsächlich erfüllt sind.",
    "tco.role.eubody.brief":
      "Du überwachst die einheitliche Anwendung der Drittstaatenbetreiber-Regelung des Gesetzes. Du prüfst das Gleichwertigkeitsargument, die Echtheit des EU-Vertreters und die Registrierung. Du erlässt einen Mängelbescheid, wo der Nachweis überzogen ist.",
    "tco.role.eubody.private":
      "Deine roten Linien: Eine UK-CAA-Lizenz ist für sich genommen keine Gleichwertigkeitsfeststellung; der EU-Vertreter muss tatsächlich in der Union niedergelassen sein, kein Briefkasten; und der Mangel muss gezielt auf die Weltraum-Cybersicherheitslücke (Art. 74–95) zielen, die keine Heimatstaatsprüfung je abgedeckt hat.",

    "tco.role.regulator.name": "Konkurrierende Mitgliedstaats-NCA",
    "tco.role.regulator.goal":
      "Deinen nationalen Rechtsrahmen korrekt anwenden und die asymmetrischen Haftungstatsachen offenlegen, die ein dünnes Memo überspielen könnte, damit die Forumswahl des Betreibers sehenden Auges getroffen wird.",
    "tco.role.regulator.brief":
      "Du bist eine in Frage kommende nationale zuständige Behörde (der Weg Frankreich/CNES oder Luxemburg/MECO). Du befragst den Betreiber zu den nationalen Rechtsfolgen deiner Benennung — Haftungsrückhalt, Einreichungsfristen, Registertransparenz — und dazu, welche Pflichten deine Genehmigung aufnehmen kann und welche nicht.",
    "tco.role.regulator.private":
      "Bei Frankreich: Du bietest eine Staatsgarantie oberhalb des versicherten Haftungsbetrags, was attraktiv ist, die Genehmigung aber an Bedingungen knüpft. Bei Luxemburg: unbegrenzte Betreiberhaftung und eine 6-Monats-Frist — eine Tatsache, die das Memo untertreiben könnte. In jedem Fall heilt deine Genehmigung die EU-weite Weltraum-Cybersicherheitslücke nicht.",

    // ── Phase 1 — Jurisdiction memo ───────────────────────────────────────────
    "tco.p1.title":
      "Phase 1 — Memo zu Zuständigkeit & extraterritorialer Reichweite",
    "tco.p1.brief":
      "Verfasse das einleitende Memo an den Vorstand: Erfasst das EU-Weltraumgesetz OrbitLink, und auf welcher Grundlage? Wende die Dienste-Anknüpfung des Art. 20 an (Erbringung von Diensten in die Union) und grenze sie von der Niederlassungs-Anknüpfung des nationalen Rechts ab (französische „Gerichtsbarkeit“; luxemburgische „Verantwortung“). Nenne die Rechtsgrundlage und zitiere mindestens zwei Vorschriften; nutze den Zitat-Export, um belegbare Verweise aus dem Korpus zu übernehmen.",
    "tco.p1.r.basis":
      "Korrekte Grundlage der extraterritorialen Reichweite (Dienste-Anknüpfung)",
    "tco.p1.r.complete": "Vollständigkeit des Memos",
    "tco.p1.r.cites": "Zitiergenauigkeit (≥2 Vorschriften)",

    // ── Phase 2 — Competent NCA ───────────────────────────────────────────────
    "tco.p2.title": "Phase 2 — Zuständige NCA benennen",
    "tco.p2.brief":
      "OrbitLink hat keine EU-Niederlassung, daher muss eine einzige Mitgliedstaats-NCA zum Benennungs- und Registrierungspunkt werden. Wähle die Behörde und begründe die Wahl in einem Satz, unter Abwägung von Haftungsrückhalt, Einreichungsfristen und Registertransparenz. (UK_CAA ist die Heimatstaatsbehörde, keine EU-zuständige Behörde; DE_BNetzA ist für Frequenzen zuständig, nicht für die Weltraumgenehmigung.)",
    "tco.p2.nca": "Zuständige nationale EU-Behörde",
    "tco.p2.justification":
      "Einzeilige Begründung (warum diese NCA — Haftung, Frist, Transparenz)",
    "tco.p2.r.nca": "Korrekte zuständige NCA",
    "tco.p2.r.justif": "Qualität der Begründung der Forumswahl",

    // ── Phase 3 — TCO obligations & equivalence ───────────────────────────────
    "tco.p3.title": "Phase 3 — TCO-Pflichten & Gleichwertigkeitsfeststellung",
    "tco.p3.brief":
      "Stelle die zwingenden Drittstaatenbetreiber-Pflichten zusammen und setze die Gleichwertigkeitsgrundlage. Schalte jede Pflicht ein, die die Heimatstaatslizenz nicht erfüllen kann, und entscheide dann, wie weit die UK-CAA-Genehmigung den harmonisierten EU-Anforderungen (Art. 6–16) gleichwertig ist. Denke daran, welche Säule nie gegen die UK-Lizenz geprüft wurde.",
    "tco.p3.eurep":
      "Einen in der Union niedergelassenen EU-Vertreter benennen (Art. 20)",
    "tco.p3.registration": "Nach dem EU-Weltraumgesetz registrieren (Art. 20)",
    "tco.p3.equiv":
      "Gleichwertigkeitsgrundlage gegenüber den harmonisierten EU-Anforderungen",
    "tco.p3.r.obligations": "Zwingende TCO-Pflichten vorhanden",
    "tco.p3.r.equiv": "Gleichwertigkeitsfeststellung korrekt eingegrenzt",

    // ── Phase 4 — Registration deficiency ─────────────────────────────────────
    "tco.p4.title":
      "Phase 4 — Auf den Gleichwertigkeits-Mängelbescheid reagieren",
    "tco.p4.brief":
      "Die EU-Stelle hat einen Mängelbescheid zur strittigen Gleichwertigkeitsfeststellung zurückgesandt. Lies ihn, räume die wirklich nicht gleichwertige Lücke ein, überarbeite das betroffene Element mit Zitaten auf Vorschriftsebene und reiche es mit einer kurzen Erläuterung der Korrektur erneut ein.",
    "tco.p4.r.addresses": "Behebt den genannten Mangel",
    "tco.p4.r.quality": "Qualität der Überarbeitung",

    // ── Track-1 engine feedback notes ─────────────────────────────────────────
    "tco.fb.nca.ok":
      "Richtig — Frankreich (CNES) ist eine vertretbare zuständige NCA: Die Staatsgarantie oberhalb des versicherten Betrags und eine praktikable Einreichungsfrist machen es zum günstigen Forum für einen Betreiber ohne EU-Niederlassung.",
    "tco.fb.nca.wrong":
      "Nicht die beste zuständige NCA hier. UK_CAA ist die Heimatstaatsbehörde (keine EU-Behörde); DE_BNetzA ist für Frequenzen zuständig, nicht für die Weltraumgenehmigung; Luxemburg (MECO) trägt unbegrenzte Betreiberhaftung und eine knappere 6-Monats-Frist.",
    "tco.fb.obligations.ok":
      "Beide zwingenden Drittstaatenpflichten sind vorhanden — ein in der Union niedergelassener EU-Vertreter und die Registrierung nach Art. 20.",
    "tco.fb.obligations.partial":
      "Eine zwingende Drittstaatenpflicht fehlt. Die Heimatstaatslizenz kann weder die Benennung des EU-Vertreters noch die Registrierung nach Art. 20 erfüllen.",
    "tco.fb.equiv.ok":
      "Richtig — TEILWEISE Gleichwertigkeit. Weltraummüll und Versicherung sind der UK-Lizenz gleichwertig, aber die Weltraum-Cybersicherheit (Art. 74–95) wurde nie geprüft und ist wirklich nicht gleichwertig.",
    "tco.fb.equiv.wrong":
      "Falsche Eingrenzung. VOLL ist überzogen — die Weltraum-Cybersicherheitssäule (Art. 74–95) wurde nie gegen die UK-Lizenz geprüft; KEINE untertreibt es, weil Weltraummüll und Versicherung gleichwertig SIND. Die Antwort ist TEILWEISE.",
  },
} as const;
