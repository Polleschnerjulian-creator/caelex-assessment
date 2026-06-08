/**
 * Caelex Scholar — Planspiele workspace namespace (`planspiele-play`).
 *
 * Holds (a) the ASI flagship scenario's text (flat dotted keys like
 * "asi.role.operator.brief" — referenced from src/data/scholar/planspiele/),
 * (b) the rubric-feedback notes emitted by scoring.server.ts + sim-coach.server.ts,
 * and (c) the cockpit/results/debrief chrome.
 *
 * Resolve with: t(locale, PLANSPIELE_PLAY, "key").
 * EN is the source of truth. FR/ES are MVP stubs ({}) — t() falls back to EN.
 */
import type { ScholarLocale, ScholarNamespace } from "./core";
import { DE_LEO_EO_PLAY } from "./scenarios/de-leo-eo";
import { NIS2_INCIDENT_PLAY } from "./scenarios/nis2-orbit-cyber-incident";
import { INSURANCE_PLAY } from "./scenarios/insurance-placement-claim";
import { DUALUSE_PLAY } from "./scenarios/de-bafa-dualuse-export";
import { TCO_PLAY } from "./scenarios/tco-equivalence-eu";
import { ITU_PLAY } from "./scenarios/itu-leo-coordination";

export const PLANSPIELE_PLAY = {
  en: {
    // ── ASI flagship scenario ───────────────────────────────────────────────
    "asi.title": "ASI Re-entry & Debris (Italy)",
    "asi.summary":
      "A medium LEO operator must clear a controlled re-entry and disposal showing with the Italian authority under the Space Economy Act (Legge 89/2025). You are the operator; the regulator is played by the AI.",
    "asi.role.operator.name": "Satellite Operator (Applicant)",
    "asi.role.operator.goal":
      "Get the re-entry/disposal authorised at lowest risk while meeting the statutory casualty-risk thresholds.",
    "asi.role.operator.brief":
      "Your spacecraft is approaching end of life in LEO. Italy's Space Economy Act requires an authorised disposal/re-entry plan with a casualty-risk showing. Assemble and file the dossier with the competent authority.",
    "asi.role.operator.private":
      "Your true casualty risk is below 1×10⁻⁴ uncontrolled, but only if the controlled-re-entry burn succeeds. Your insurance covers the statutory minimum; cyber controls are documented but not yet certified.",
    "asi.role.regulator.name": "Italian Regulator (ASI / MIMIT)",
    "asi.role.regulator.goal":
      "Protect public safety and the environment while enabling lawful activity; grant only on a complete, well-grounded dossier.",
    "asi.role.regulator.brief":
      "You review the operator's filing for completeness and a sound legal basis, and issue a deficiency notice where the showing is incomplete.",
    "asi.role.regulator.private":
      "You will not grant unless the casualty-risk threshold is met and the disposal plan is present. A missing debris/disposal note is an automatic deficiency.",
    "asi.p1.title": "Phase 1 — Competent authority",
    "asi.p1.brief":
      "Identify the competent authority for a space-activity authorisation under Legge 89/2025 and justify your choice in one line, citing the governing provision.",
    "asi.p1.authority": "Competent authority",
    "asi.p1.justification":
      "One-line justification (cite the governing article)",
    "asi.p1.r.authority": "Correct competent authority",
    "asi.p1.r.justif": "Quality of the cited justification",
    "asi.p2.title": "Phase 2 — Assemble the application",
    "asi.p2.brief":
      "Build the authorisation dossier. Toggle each required element and set the casualty-risk band. The EU Space Act engine validates completeness live; the governing articles are open in the rail.",
    "asi.p2.insurance": "Third-party-liability insurance (statutory minimum)",
    "asi.p2.debris": "Debris-mitigation plan",
    "asi.p2.disposal": "End-of-life disposal / re-entry plan",
    "asi.p2.cyber": "Cybersecurity measures",
    "asi.p2.casualty": "Casualty-risk band",
    "asi.p2.r.modules": "Mandatory dossier elements present",
    "asi.p2.r.casualty": "Casualty-risk threshold met",
    "asi.p3.title": "Phase 3 — Cover letter to the authority",
    "asi.p3.brief":
      "Draft the cover letter accompanying the filing. State the legal basis and cite at least two provisions. Use the citation export to pull verifiable references from the corpus.",
    "asi.p3.r.basis": "Correct legal basis",
    "asi.p3.r.complete": "Completeness of the letter",
    "asi.p3.r.cites": "Citation accuracy (≥2 provisions)",
    "asi.p4.title": "Phase 4 — Respond to the deficiency notice",
    "asi.p4.brief":
      "The authority returned a deficiency notice. Read it, revise the affected element, and resubmit with a short explanation of the fix.",
    "asi.p4.r.addresses": "Addresses the stated deficiency",
    "asi.p4.r.quality": "Quality of the revision",

    // ── Track-1 engine feedback notes ───────────────────────────────────────
    "asi.fb.authority.ok":
      "Correct — ASI is the competent authority under Legge 89/2025.",
    "asi.fb.authority.wrong":
      "Not the competent authority for a space-activity authorisation under Legge 89/2025.",
    "asi.fb.modules.ok": "All mandatory dossier elements are present.",
    "asi.fb.modules.partial":
      "Some mandatory elements are missing — the authority cannot grant on an incomplete dossier.",
    "asi.fb.casualty.ok":
      "The casualty-risk band meets the statutory threshold.",
    "asi.fb.casualty.wrong":
      "The casualty-risk band does not meet the statutory threshold for an uncontrolled re-entry.",

    // ── Track-2 AI-coach notes ──────────────────────────────────────────────
    "coach.cites.ok": "Sufficient, verifiable citations.",
    "coach.cites.few":
      "Too few citations — cite at least the governing provisions.",
    "coach.cites.unverified":
      "A cited reference could not be verified against the corpus.",
    "coach.selfassess":
      "Self-assess against the rubric: is the legal basis correct and the argument complete?",
    "coach.fallback.summary":
      "Offline review (no AI). Scores below the free-text items are provisional — use them as a self-assessment checklist.",

    // ── Cockpit / results / debrief chrome ──────────────────────────────────
    "play.phase": "Phase",
    "play.of": "of",
    "play.legalSources": "Legal sources",
    "play.yourWork": "Your work product",
    "play.completePhase": "Complete phase",
    "play.continue": "Continue",
    "play.submitted": "Submitted",
    "play.deficiencyNotice": "Deficiency notice from the authority",
    "play.results": "Results",
    "play.score": "Score",
    "play.modelAnswer": "Model answer",
    "play.engineGraded": "Auto-graded",
    "play.coachGraded": "AI coach",
    "play.met": "Met",
    "play.notMet": "Not met",
    "play.debrief": "Debrief",
    "play.debriefIntro":
      "Replay your decisions, each tied back to the governing source.",
    "play.reflection": "Your reflection",
    "play.reflectionPlaceholder":
      "What did you learn? What would you do differently next time?",
    "play.saveReflection": "Save reflection",
    "play.timeline": "Decision timeline",
    "play.exportDebrief": "Export debrief",
    "play.aiDisclosure":
      "Feedback is generated to support learning and is not legal advice.",
    "play.completeBanner": "Planspiel complete — see your debrief below.",
    "play.requiredCitation": "Cite at least {n} provisions.",
    "play.startFailed": "Could not start — please try again.",
    ...DE_LEO_EO_PLAY.en,
    ...NIS2_INCIDENT_PLAY.en,
    ...INSURANCE_PLAY.en,
    ...DUALUSE_PLAY.en,
    ...TCO_PLAY.en,
    ...ITU_PLAY.en,
  },

  de: {
    "asi.title": "ASI-Wiedereintritt & Weltraummüll (Italien)",
    "asi.summary":
      "Ein mittelgroßer LEO-Betreiber muss bei der italienischen Behörde einen kontrollierten Wiedereintritts- und Entsorgungsnachweis nach dem Weltraumwirtschaftsgesetz (Legge 89/2025) erbringen. Du bist der Betreiber; die Behörde spielt die KI.",
    "asi.role.operator.name": "Satellitenbetreiber (Antragsteller)",
    "asi.role.operator.goal":
      "Den Wiedereintritt/die Entsorgung mit geringstem Risiko genehmigen lassen und dabei die gesetzlichen Schwellen für das Personenrisiko einhalten.",
    "asi.role.operator.brief":
      "Dein Raumfahrzeug nähert sich dem Lebensende in der LEO. Das italienische Weltraumwirtschaftsgesetz verlangt einen genehmigten Entsorgungs-/Wiedereintrittsplan mit Personenrisiko-Nachweis. Stelle das Dossier zusammen und reiche es bei der zuständigen Behörde ein.",
    "asi.role.operator.private":
      "Dein tatsächliches Personenrisiko liegt unter 1×10⁻⁴ unkontrolliert — aber nur, wenn das kontrollierte Wiedereintrittsmanöver gelingt. Die Versicherung deckt das gesetzliche Minimum; Cyber-Maßnahmen sind dokumentiert, aber noch nicht zertifiziert.",
    "asi.role.regulator.name": "Italienische Behörde (ASI / MIMIT)",
    "asi.role.regulator.goal":
      "Öffentliche Sicherheit und Umwelt schützen und zugleich rechtmäßige Tätigkeit ermöglichen; nur bei vollständigem, gut begründetem Dossier genehmigen.",
    "asi.role.regulator.brief":
      "Du prüfst die Einreichung auf Vollständigkeit und eine tragfähige Rechtsgrundlage und stellst einen Mängelbescheid aus, wenn der Nachweis unvollständig ist.",
    "asi.role.regulator.private":
      "Du genehmigst nicht, solange die Personenrisiko-Schwelle nicht eingehalten und kein Entsorgungsplan vorgelegt ist. Ein fehlender Müll-/Entsorgungsnachweis ist ein automatischer Mangel.",
    "asi.p1.title": "Phase 1 — Zuständige Behörde",
    "asi.p1.brief":
      "Bestimme die zuständige Behörde für eine Genehmigung der Weltraumtätigkeit nach Legge 89/2025 und begründe deine Wahl in einem Satz unter Angabe der einschlägigen Vorschrift.",
    "asi.p1.authority": "Zuständige Behörde",
    "asi.p1.justification":
      "Einzeilige Begründung (einschlägigen Artikel zitieren)",
    "asi.p1.r.authority": "Korrekte zuständige Behörde",
    "asi.p1.r.justif": "Qualität der zitierten Begründung",
    "asi.p2.title": "Phase 2 — Antrag zusammenstellen",
    "asi.p2.brief":
      "Stelle das Genehmigungsdossier zusammen. Schalte jedes erforderliche Element ein und setze das Personenrisiko-Band. Die EU-Space-Act-Engine prüft die Vollständigkeit live; die einschlägigen Artikel stehen in der Leiste offen.",
    "asi.p2.insurance": "Haftpflichtversicherung (gesetzliches Minimum)",
    "asi.p2.debris": "Plan zur Vermeidung von Weltraummüll",
    "asi.p2.disposal": "Entsorgungs-/Wiedereintrittsplan zum Lebensende",
    "asi.p2.cyber": "Cybersicherheitsmaßnahmen",
    "asi.p2.casualty": "Personenrisiko-Band",
    "asi.p2.r.modules": "Pflichtbestandteile des Dossiers vorhanden",
    "asi.p2.r.casualty": "Personenrisiko-Schwelle eingehalten",
    "asi.p3.title": "Phase 3 — Anschreiben an die Behörde",
    "asi.p3.brief":
      "Verfasse das Anschreiben zur Einreichung. Nenne die Rechtsgrundlage und zitiere mindestens zwei Vorschriften. Nutze den Zitat-Export, um belegbare Verweise aus dem Korpus zu übernehmen.",
    "asi.p3.r.basis": "Korrekte Rechtsgrundlage",
    "asi.p3.r.complete": "Vollständigkeit des Schreibens",
    "asi.p3.r.cites": "Zitiergenauigkeit (≥2 Vorschriften)",
    "asi.p4.title": "Phase 4 — Auf den Mängelbescheid reagieren",
    "asi.p4.brief":
      "Die Behörde hat einen Mängelbescheid zurückgesandt. Lies ihn, überarbeite das betroffene Element und reiche es mit einer kurzen Erläuterung der Korrektur erneut ein.",
    "asi.p4.r.addresses": "Behebt den genannten Mangel",
    "asi.p4.r.quality": "Qualität der Überarbeitung",

    "asi.fb.authority.ok":
      "Richtig — die ASI ist nach Legge 89/2025 die zuständige Behörde.",
    "asi.fb.authority.wrong":
      "Nicht die zuständige Behörde für eine Genehmigung der Weltraumtätigkeit nach Legge 89/2025.",
    "asi.fb.modules.ok":
      "Alle Pflichtbestandteile des Dossiers sind vorhanden.",
    "asi.fb.modules.partial":
      "Einige Pflichtbestandteile fehlen — die Behörde kann bei unvollständigem Dossier nicht genehmigen.",
    "asi.fb.casualty.ok":
      "Das Personenrisiko-Band hält die gesetzliche Schwelle ein.",
    "asi.fb.casualty.wrong":
      "Das Personenrisiko-Band hält die gesetzliche Schwelle für einen unkontrollierten Wiedereintritt nicht ein.",

    "coach.cites.ok": "Ausreichende, belegbare Zitate.",
    "coach.cites.few":
      "Zu wenige Zitate — zitiere mindestens die einschlägigen Vorschriften.",
    "coach.cites.unverified":
      "Ein zitierter Verweis konnte nicht gegen den Korpus belegt werden.",
    "coach.selfassess":
      "Selbsteinschätzung am Raster: Ist die Rechtsgrundlage korrekt und die Argumentation vollständig?",
    "coach.fallback.summary":
      "Offline-Bewertung (keine KI). Die Werte unter den Freitext-Punkten sind vorläufig — nutze sie als Selbstcheck-Liste.",

    "play.phase": "Phase",
    "play.of": "von",
    "play.legalSources": "Rechtsquellen",
    "play.yourWork": "Dein Arbeitsergebnis",
    "play.completePhase": "Phase abschließen",
    "play.continue": "Weiter",
    "play.submitted": "Eingereicht",
    "play.deficiencyNotice": "Mängelbescheid der Behörde",
    "play.results": "Ergebnis",
    "play.score": "Punktzahl",
    "play.modelAnswer": "Musterlösung",
    "play.engineGraded": "Automatisch bewertet",
    "play.coachGraded": "KI-Coach",
    "play.met": "Erfüllt",
    "play.notMet": "Nicht erfüllt",
    "play.debrief": "Debrief",
    "play.debriefIntro":
      "Spiele deine Entscheidungen durch — jede zurückverlinkt auf die einschlägige Quelle.",
    "play.reflection": "Deine Reflexion",
    "play.reflectionPlaceholder":
      "Was hast du gelernt? Was würdest du beim nächsten Mal anders machen?",
    "play.saveReflection": "Reflexion speichern",
    "play.timeline": "Entscheidungsverlauf",
    "play.exportDebrief": "Debrief exportieren",
    "play.aiDisclosure":
      "Das Feedback wird zur Lernunterstützung erzeugt und ist keine Rechtsberatung.",
    "play.completeBanner": "Planspiel abgeschlossen — siehe Debrief unten.",
    "play.requiredCitation": "Zitiere mindestens {n} Vorschriften.",
    "play.startFailed":
      "Konnte nicht gestartet werden — bitte erneut versuchen.",
    ...DE_LEO_EO_PLAY.de,
    ...NIS2_INCIDENT_PLAY.de,
    ...INSURANCE_PLAY.de,
    ...DUALUSE_PLAY.de,
    ...TCO_PLAY.de,
    ...ITU_PLAY.de,
  },

  it: {
    "asi.title": "Rientro ASI e detriti (Italia)",
    "asi.summary":
      "Un operatore LEO di medie dimensioni deve presentare all'autorità italiana una dimostrazione di rientro controllato e smaltimento ai sensi della Legge sull'economia dello spazio (Legge 89/2025). Tu sei l'operatore; l'autorità è interpretata dall'IA.",
    "asi.role.operator.name": "Operatore satellitare (richiedente)",
    "asi.role.operator.goal":
      "Ottenere l'autorizzazione al rientro/smaltimento al minor rischio rispettando le soglie di rischio per le persone previste dalla legge.",
    "asi.role.operator.brief":
      "Il tuo veicolo spaziale si avvicina al fine vita in LEO. La Legge italiana sull'economia dello spazio richiede un piano di smaltimento/rientro autorizzato con dimostrazione del rischio per le persone. Assembla e presenta il fascicolo all'autorità competente.",
    "asi.role.operator.private":
      "Il rischio reale per le persone è inferiore a 1×10⁻⁴ in caso non controllato, ma solo se la manovra di rientro controllato riesce. L'assicurazione copre il minimo di legge; le misure cyber sono documentate ma non ancora certificate.",
    "asi.role.regulator.name": "Autorità italiana (ASI / MIMIT)",
    "asi.role.regulator.goal":
      "Tutelare la sicurezza pubblica e l'ambiente consentendo l'attività lecita; autorizzare solo su un fascicolo completo e ben fondato.",
    "asi.role.regulator.brief":
      "Esamini la presentazione per completezza e solida base giuridica ed emetti una richiesta di integrazione quando la dimostrazione è incompleta.",
    "asi.role.regulator.private":
      "Non autorizzi finché la soglia di rischio per le persone non è rispettata e il piano di smaltimento non è presente. Un piano detriti/smaltimento mancante è una carenza automatica.",
    "asi.p1.title": "Fase 1 — Autorità competente",
    "asi.p1.brief":
      "Individua l'autorità competente per un'autorizzazione all'attività spaziale ai sensi della Legge 89/2025 e motiva la scelta in una riga, citando la disposizione applicabile.",
    "asi.p1.authority": "Autorità competente",
    "asi.p1.justification":
      "Motivazione in una riga (cita l'articolo applicabile)",
    "asi.p1.r.authority": "Autorità competente corretta",
    "asi.p1.r.justif": "Qualità della motivazione citata",
    "asi.p2.title": "Fase 2 — Assembla la domanda",
    "asi.p2.brief":
      "Costruisci il fascicolo di autorizzazione. Attiva ogni elemento richiesto e imposta la fascia di rischio per le persone. Il motore dell'EU Space Act verifica la completezza in tempo reale; gli articoli applicabili sono aperti nel pannello.",
    "asi.p2.insurance":
      "Assicurazione di responsabilità civile (minimo di legge)",
    "asi.p2.debris": "Piano di mitigazione dei detriti",
    "asi.p2.disposal": "Piano di smaltimento/rientro a fine vita",
    "asi.p2.cyber": "Misure di cibersicurezza",
    "asi.p2.casualty": "Fascia di rischio per le persone",
    "asi.p2.r.modules": "Elementi obbligatori del fascicolo presenti",
    "asi.p2.r.casualty": "Soglia di rischio per le persone rispettata",
    "asi.p3.title": "Fase 3 — Lettera di accompagnamento all'autorità",
    "asi.p3.brief":
      "Redigi la lettera di accompagnamento alla domanda. Indica la base giuridica e cita almeno due disposizioni. Usa l'esportazione delle citazioni per inserire riferimenti verificabili dal corpus.",
    "asi.p3.r.basis": "Base giuridica corretta",
    "asi.p3.r.complete": "Completezza della lettera",
    "asi.p3.r.cites": "Accuratezza delle citazioni (≥2 disposizioni)",
    "asi.p4.title": "Fase 4 — Rispondi alla richiesta di integrazione",
    "asi.p4.brief":
      "L'autorità ha restituito una richiesta di integrazione. Leggila, rivedi l'elemento interessato e ripresenta con una breve spiegazione della correzione.",
    "asi.p4.r.addresses": "Risponde alla carenza indicata",
    "asi.p4.r.quality": "Qualità della revisione",

    "asi.fb.authority.ok":
      "Corretto — l'ASI è l'autorità competente ai sensi della Legge 89/2025.",
    "asi.fb.authority.wrong":
      "Non è l'autorità competente per un'autorizzazione all'attività spaziale ai sensi della Legge 89/2025.",
    "asi.fb.modules.ok":
      "Tutti gli elementi obbligatori del fascicolo sono presenti.",
    "asi.fb.modules.partial":
      "Mancano alcuni elementi obbligatori — l'autorità non può autorizzare su un fascicolo incompleto.",
    "asi.fb.casualty.ok":
      "La fascia di rischio per le persone rispetta la soglia di legge.",
    "asi.fb.casualty.wrong":
      "La fascia di rischio per le persone non rispetta la soglia di legge per un rientro non controllato.",

    "coach.cites.ok": "Citazioni sufficienti e verificabili.",
    "coach.cites.few":
      "Troppe poche citazioni — cita almeno le disposizioni applicabili.",
    "coach.cites.unverified":
      "Un riferimento citato non è stato verificato nel corpus.",
    "coach.selfassess":
      "Autovaluta rispetto alla griglia: la base giuridica è corretta e l'argomentazione è completa?",
    "coach.fallback.summary":
      "Revisione offline (senza IA). I punteggi sotto le voci a testo libero sono provvisori — usali come lista di autovalutazione.",

    "play.phase": "Fase",
    "play.of": "di",
    "play.legalSources": "Fonti giuridiche",
    "play.yourWork": "Il tuo elaborato",
    "play.completePhase": "Completa la fase",
    "play.continue": "Continua",
    "play.submitted": "Inviato",
    "play.deficiencyNotice": "Richiesta di integrazione dell'autorità",
    "play.results": "Risultati",
    "play.score": "Punteggio",
    "play.modelAnswer": "Soluzione modello",
    "play.engineGraded": "Valutazione automatica",
    "play.coachGraded": "Coach IA",
    "play.met": "Soddisfatto",
    "play.notMet": "Non soddisfatto",
    "play.debrief": "Debriefing",
    "play.debriefIntro":
      "Ripercorri le tue decisioni, ciascuna collegata alla fonte applicabile.",
    "play.reflection": "La tua riflessione",
    "play.reflectionPlaceholder":
      "Cosa hai imparato? Cosa faresti diversamente la prossima volta?",
    "play.saveReflection": "Salva la riflessione",
    "play.timeline": "Cronologia delle decisioni",
    "play.exportDebrief": "Esporta il debriefing",
    "play.aiDisclosure":
      "Il feedback è generato a supporto dell'apprendimento e non costituisce consulenza legale.",
    "play.completeBanner":
      "Simulazione completata — vedi il debriefing qui sotto.",
    "play.requiredCitation": "Cita almeno {n} disposizioni.",
    "play.startFailed": "Impossibile avviare — riprova.",
  },

  fr: {},
  es: {},
} as const satisfies ScholarNamespace;

/**
 * Loose resolver for SCENARIO-DRIVEN dynamic keys (titleKey / briefKey / labelKey /
 * rubric notes) whose value is a bare `string` and therefore can't satisfy the
 * strict `keyof NS["en"]` parameter of t(). Same fallback chain: locale → EN → key.
 */
export function playT(locale: ScholarLocale, key: string): string {
  const ns = PLANSPIELE_PLAY as Record<string, Record<string, string>>;
  return ns[locale]?.[key] ?? ns.en?.[key] ?? key;
}
