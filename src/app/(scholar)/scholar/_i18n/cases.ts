/**
 * Caelex Scholar — case-law namespace (`cases`).
 *
 * Every user-visible UI string of the two case-law surfaces:
 *   - /scholar/cases       (browse + keyword search + Thema/Jurisdiktion/Forum
 *                            filters + date sort + active-filter chips + list)
 *   - /scholar/cases/[id]  (the case reading shell: header card, metadata strip,
 *                            section headings, parties, applied sources, footer)
 *
 * EN is the source of truth; the `de` values are the strings previously
 * hardcoded in those two pages. it/fr/es are domain-appropriate legal/academic
 * translations. Legal CONTENT (the case bodies themselves) is NOT translated
 * here — only the surrounding UI chrome.
 *
 * Shared single terms (Back, Content) live in the `common` namespace and are
 * reused via t(locale, COMMON, "key"); this file only adds case-specific keys.
 * A few full-sentence strings that the source lane also carries (the disclaimer,
 * the translation-provenance note, the "last verified" prefix) are kept here
 * with identical wording so each consuming page reads from a single
 * self-contained dictionary without cross-lane coupling.
 *
 * Resolve with: t(locale, CASES, "key")
 */
import type { ScholarNamespace } from "./core";

export const CASES = {
  en: {
    // ── Page header ──
    pageTitle: "Case law",
    pageSubtitle: "Judgments, decisions and enforcement actions in space law",

    // ── Search / filter form ──
    formAriaLabel: "Search and filter case law",
    searchLabel: "Search",
    searchPlaceholder: "Case name, forum or parties…",
    areaLabel: "Topic",
    areaAll: "All topics",
    jurisdictionLabel: "Jurisdiction",
    jurisdictionAll: "All jurisdictions",
    forumLabel: "Forum",
    forumAll: "All forums",
    sortLabel: "Sort",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    apply: "Apply",

    // ── Active-filter chips ──
    activeFiltersSr: "Active filters:",
    chipSearch: "Search",
    chipTopic: "Topic",
    chipJurisdiction: "Jurisdiction",
    chipForum: "Forum",
    resetAll: "Reset all",
    removeChip: "remove",

    // ── Result count + list ──
    decisionOne: "decision",
    decisionMany: "decisions",
    filteredSuffix: "(filtered)",
    capNotice: "first {cap} shown", // {cap} replaced at call site
    casesHeading: "Cases",
    noResults: "No decisions found for the selected criteria.",
    capHidden:
      "{hidden} more decisions hidden — please refine your search or filters.", // {hidden}

    // ── Forum dropdown labels (full names; the compact row labels live in SOURCE) ──
    forumCourt: "Court",
    forumRegulatorOrder: "Regulatory order",
    forumRegulatorSettlement: "Regulatory settlement",
    forumCriminalSettlement: "Criminal settlement",
    forumCivilSettlement: "Civil settlement",
    forumTreatyAward: "Treaty arbitral award",
    forumAdministrativeAppeal: "Administrative appeal",
    forumArbitralAward: "Arbitral award",

    // ── Compliance-area (Thema) labels ──
    areaLicensing: "Licensing & authorisation",
    areaRegistration: "Registration",
    areaLiability: "Liability",
    areaInsurance: "Insurance",
    areaCybersecurity: "Cybersecurity",
    areaExportControl: "Export control",
    areaDataSecurity: "Data security",
    areaFrequencySpectrum: "Frequency & spectrum",
    areaEnvironmental: "Environment",
    areaDebrisMitigation: "Space debris",
    areaSpaceTrafficManagement: "Space traffic",
    areaHumanSpaceflight: "Human spaceflight",
    areaMilitaryDualUse: "Military / dual-use",
    areaCompetitionAntitrust: "Competition & antitrust",
    areaStateAid: "State aid",
    areaProcurement: "Procurement",
    areaTaxCustoms: "Tax & customs",
    areaSanctionsCompliance: "Sanctions",
    areaIpPatents: "Intellectual property",
    areaProductLiability: "Product liability",
    areaFdiScreening: "Investment screening",
    areaAiCompliance: "AI compliance",
    areaAmlKyc: "Anti-money-laundering & KYC",
    areaConsumerProtection: "Consumer protection",
    areaEmploymentLabor: "Employment law",
    areaScientificResearch: "Science & research",
    areaMediaBroadcasting: "Media & broadcasting",
    areaCriticalInfrastructure: "Critical infrastructure",
    areaSustainabilityReporting: "Sustainability reporting",

    // ── Case detail: parties line ──
    versus: "versus",

    // ── Case detail: metadata strip ──
    metaPrecedentialWeight: "Precedential weight",
    metaForum: "Forum",
    metaJurisdiction: "Jurisdiction",
    metaDecided: "Decided",
    metaFiled: "Filed",
    metaCaseNumber: "Case number",
    metaCitation: "Citation",

    // ── Precedential-weight labels ──
    weightBinding: "Binding",
    weightPersuasive: "Persuasive",
    weightSettledFacts: "Settlement practice",
    weightNonPrecedential: "No precedential effect",
    weightTreatyOnly: "International-law only",

    // ── Case detail: action row + provenance ──
    viewOfficialDecision: "View official decision →",
    copyCitation: "Copy citation",
    caelexTranslationNote: "Caelex translation — not the official wording",

    // ── Case detail: section headings ──
    sectionFacts: "Facts",
    sectionRuling: "Decision",
    sectionHolding: "Holding",
    sectionSignificance: "Significance",
    sectionRemedy: "Remedy",
    sectionNotes: "Notes",
    sectionParties: "Parties involved",
    sectionAppliedSources: "Applied legal sources",

    // ── Remedy line ──
    remedyFine: "Fine:",

    // ── Footer ──
    lastVerified: "Last verified",
    disclaimer:
      "Not legal advice. Caelex Scholar is for research only — the official wording always governs.",
    footerBrandBy: "by Caelex",
  },

  de: {
    // ── Page header ──
    pageTitle: "Rechtsprechung",
    pageSubtitle:
      "Urteile, Entscheidungen und Durchsetzungsmaßnahmen im Weltraumrecht",

    // ── Search / filter form ──
    formAriaLabel: "Rechtsprechung durchsuchen und filtern",
    searchLabel: "Suche",
    searchPlaceholder: "Fallname, Forum oder Beteiligte…",
    areaLabel: "Thema",
    areaAll: "Alle Themen",
    jurisdictionLabel: "Jurisdiktion",
    jurisdictionAll: "Alle Jurisdiktionen",
    forumLabel: "Forum",
    forumAll: "Alle Foren",
    sortLabel: "Sortierung",
    sortNewest: "Neueste zuerst",
    sortOldest: "Älteste zuerst",
    apply: "Anwenden",

    // ── Active-filter chips ──
    activeFiltersSr: "Aktive Filter:",
    chipSearch: "Suche",
    chipTopic: "Thema",
    chipJurisdiction: "Jurisdiktion",
    chipForum: "Forum",
    resetAll: "Alle zurücksetzen",
    removeChip: "entfernen",

    // ── Result count + list ──
    decisionOne: "Entscheidung",
    decisionMany: "Entscheidungen",
    filteredSuffix: "(gefiltert)",
    capNotice: "erste {cap} angezeigt",
    casesHeading: "Fälle",
    noResults: "Keine Entscheidungen für die gewählten Kriterien gefunden.",
    capHidden:
      "{hidden} weitere Entscheidungen ausgeblendet — bitte die Suche oder Filter verfeinern.",

    // ── Forum dropdown labels ──
    forumCourt: "Gericht",
    forumRegulatorOrder: "Behördliche Anordnung",
    forumRegulatorSettlement: "Behördlicher Vergleich",
    forumCriminalSettlement: "Strafvergleich",
    forumCivilSettlement: "Zivilvergleich",
    forumTreatyAward: "Vertragsschiedsspruch",
    forumAdministrativeAppeal: "Verwaltungsbeschwerde",
    forumArbitralAward: "Schiedsspruch",

    // ── Compliance-area (Thema) labels ──
    areaLicensing: "Zulassung & Genehmigung",
    areaRegistration: "Registrierung",
    areaLiability: "Haftung",
    areaInsurance: "Versicherung",
    areaCybersecurity: "Cybersicherheit",
    areaExportControl: "Exportkontrolle",
    areaDataSecurity: "Datensicherheit",
    areaFrequencySpectrum: "Frequenzen & Spektrum",
    areaEnvironmental: "Umwelt",
    areaDebrisMitigation: "Weltraumschrott",
    areaSpaceTrafficManagement: "Weltraumverkehr",
    areaHumanSpaceflight: "Bemannte Raumfahrt",
    areaMilitaryDualUse: "Militärisch / Dual-Use",
    areaCompetitionAntitrust: "Wettbewerb & Kartellrecht",
    areaStateAid: "Beihilfen",
    areaProcurement: "Vergabe",
    areaTaxCustoms: "Steuern & Zoll",
    areaSanctionsCompliance: "Sanktionen",
    areaIpPatents: "Geistiges Eigentum",
    areaProductLiability: "Produkthaftung",
    areaFdiScreening: "Investitionskontrolle",
    areaAiCompliance: "KI-Konformität",
    areaAmlKyc: "Geldwäsche & KYC",
    areaConsumerProtection: "Verbraucherschutz",
    areaEmploymentLabor: "Arbeitsrecht",
    areaScientificResearch: "Wissenschaft & Forschung",
    areaMediaBroadcasting: "Medien & Rundfunk",
    areaCriticalInfrastructure: "Kritische Infrastruktur",
    areaSustainabilityReporting: "Nachhaltigkeitsberichte",

    // ── Case detail: parties line ──
    versus: "gegen",

    // ── Case detail: metadata strip ──
    metaPrecedentialWeight: "Präzedenzgewicht",
    metaForum: "Forum",
    metaJurisdiction: "Jurisdiktion",
    metaDecided: "Entschieden",
    metaFiled: "Eingereicht",
    metaCaseNumber: "Aktenzeichen",
    metaCitation: "Zitierung",

    // ── Precedential-weight labels ──
    weightBinding: "Bindend",
    weightPersuasive: "Überzeugend",
    weightSettledFacts: "Vergleichspraxis",
    weightNonPrecedential: "Keine Präzedenzwirkung",
    weightTreatyOnly: "Völkerrechtlich",

    // ── Case detail: action row + provenance ──
    viewOfficialDecision: "Amtliche Entscheidung ansehen →",
    copyCitation: "Zitierung kopieren",
    caelexTranslationNote: "Caelex-Übersetzung — nicht der amtliche Wortlaut",

    // ── Case detail: section headings ──
    sectionFacts: "Sachverhalt",
    sectionRuling: "Entscheidung",
    sectionHolding: "Leitsatz",
    sectionSignificance: "Bedeutung",
    sectionRemedy: "Rechtsfolge",
    sectionNotes: "Hinweise",
    sectionParties: "Beteiligte",
    sectionAppliedSources: "Angewandte Rechtsquellen",

    // ── Remedy line ──
    remedyFine: "Geldbuße:",

    // ── Footer ──
    lastVerified: "Zuletzt verifiziert",
    disclaimer:
      "Kein Rechtsrat. Caelex Scholar dient ausschließlich der Recherche — maßgeblich ist stets der amtliche Wortlaut.",
    footerBrandBy: "by Caelex",
  },

  it: {
    // ── Page header ──
    pageTitle: "Giurisprudenza",
    pageSubtitle:
      "Sentenze, decisioni e provvedimenti esecutivi nel diritto spaziale",

    // ── Search / filter form ──
    formAriaLabel: "Cerca e filtra la giurisprudenza",
    searchLabel: "Ricerca",
    searchPlaceholder: "Nome del caso, foro o parti…",
    areaLabel: "Tema",
    areaAll: "Tutti i temi",
    jurisdictionLabel: "Giurisdizione",
    jurisdictionAll: "Tutte le giurisdizioni",
    forumLabel: "Foro",
    forumAll: "Tutti i fori",
    sortLabel: "Ordinamento",
    sortNewest: "Prima i più recenti",
    sortOldest: "Prima i più vecchi",
    apply: "Applica",

    // ── Active-filter chips ──
    activeFiltersSr: "Filtri attivi:",
    chipSearch: "Ricerca",
    chipTopic: "Tema",
    chipJurisdiction: "Giurisdizione",
    chipForum: "Foro",
    resetAll: "Reimposta tutto",
    removeChip: "rimuovi",

    // ── Result count + list ──
    decisionOne: "decisione",
    decisionMany: "decisioni",
    filteredSuffix: "(filtrate)",
    capNotice: "prime {cap} mostrate",
    casesHeading: "Casi",
    noResults: "Nessuna decisione trovata per i criteri selezionati.",
    capHidden:
      "Altre {hidden} decisioni nascoste — affina la ricerca o i filtri.",

    // ── Forum dropdown labels ──
    forumCourt: "Corte",
    forumRegulatorOrder: "Provvedimento dell’autorità",
    forumRegulatorSettlement: "Transazione con l’autorità",
    forumCriminalSettlement: "Patteggiamento penale",
    forumCivilSettlement: "Transazione civile",
    forumTreatyAward: "Lodo arbitrale su trattato",
    forumAdministrativeAppeal: "Ricorso amministrativo",
    forumArbitralAward: "Lodo arbitrale",

    // ── Compliance-area (Thema) labels ──
    areaLicensing: "Licenze e autorizzazioni",
    areaRegistration: "Registrazione",
    areaLiability: "Responsabilità",
    areaInsurance: "Assicurazione",
    areaCybersecurity: "Cibersicurezza",
    areaExportControl: "Controllo delle esportazioni",
    areaDataSecurity: "Sicurezza dei dati",
    areaFrequencySpectrum: "Frequenze e spettro",
    areaEnvironmental: "Ambiente",
    areaDebrisMitigation: "Detriti spaziali",
    areaSpaceTrafficManagement: "Traffico spaziale",
    areaHumanSpaceflight: "Volo spaziale umano",
    areaMilitaryDualUse: "Militare / duplice uso",
    areaCompetitionAntitrust: "Concorrenza e antitrust",
    areaStateAid: "Aiuti di Stato",
    areaProcurement: "Appalti",
    areaTaxCustoms: "Fisco e dogane",
    areaSanctionsCompliance: "Sanzioni",
    areaIpPatents: "Proprietà intellettuale",
    areaProductLiability: "Responsabilità da prodotto",
    areaFdiScreening: "Controllo degli investimenti",
    areaAiCompliance: "Conformità IA",
    areaAmlKyc: "Antiriciclaggio e KYC",
    areaConsumerProtection: "Tutela dei consumatori",
    areaEmploymentLabor: "Diritto del lavoro",
    areaScientificResearch: "Scienza e ricerca",
    areaMediaBroadcasting: "Media e radiodiffusione",
    areaCriticalInfrastructure: "Infrastrutture critiche",
    areaSustainabilityReporting: "Rendicontazione di sostenibilità",

    // ── Case detail: parties line ──
    versus: "contro",

    // ── Case detail: metadata strip ──
    metaPrecedentialWeight: "Valore di precedente",
    metaForum: "Foro",
    metaJurisdiction: "Giurisdizione",
    metaDecided: "Decisa il",
    metaFiled: "Depositata il",
    metaCaseNumber: "Numero di causa",
    metaCitation: "Citazione",

    // ── Precedential-weight labels ──
    weightBinding: "Vincolante",
    weightPersuasive: "Persuasivo",
    weightSettledFacts: "Prassi transattiva",
    weightNonPrecedential: "Nessun valore di precedente",
    weightTreatyOnly: "Solo diritto internazionale",

    // ── Case detail: action row + provenance ──
    viewOfficialDecision: "Vedi la decisione ufficiale →",
    copyCitation: "Copia la citazione",
    caelexTranslationNote: "Traduzione Caelex — non è il testo ufficiale",

    // ── Case detail: section headings ──
    sectionFacts: "Fatti",
    sectionRuling: "Decisione",
    sectionHolding: "Massima",
    sectionSignificance: "Rilevanza",
    sectionRemedy: "Provvedimento",
    sectionNotes: "Note",
    sectionParties: "Parti coinvolte",
    sectionAppliedSources: "Fonti normative applicate",

    // ── Remedy line ──
    remedyFine: "Sanzione pecuniaria:",

    // ── Footer ──
    lastVerified: "Ultima verifica",
    disclaimer:
      "Non costituisce consulenza legale. Caelex Scholar serve solo alla ricerca — fa sempre fede il testo ufficiale.",
    footerBrandBy: "by Caelex",
  },

  fr: {
    // ── Page header ──
    pageTitle: "Jurisprudence",
    pageSubtitle:
      "Arrêts, décisions et mesures d’exécution en droit de l’espace",

    // ── Search / filter form ──
    formAriaLabel: "Rechercher et filtrer la jurisprudence",
    searchLabel: "Recherche",
    searchPlaceholder: "Nom de l’affaire, juridiction ou parties…",
    areaLabel: "Thème",
    areaAll: "Tous les thèmes",
    jurisdictionLabel: "Juridiction",
    jurisdictionAll: "Toutes les juridictions",
    forumLabel: "Instance",
    forumAll: "Toutes les instances",
    sortLabel: "Tri",
    sortNewest: "Plus récentes d’abord",
    sortOldest: "Plus anciennes d’abord",
    apply: "Appliquer",

    // ── Active-filter chips ──
    activeFiltersSr: "Filtres actifs :",
    chipSearch: "Recherche",
    chipTopic: "Thème",
    chipJurisdiction: "Juridiction",
    chipForum: "Instance",
    resetAll: "Tout réinitialiser",
    removeChip: "retirer",

    // ── Result count + list ──
    decisionOne: "décision",
    decisionMany: "décisions",
    filteredSuffix: "(filtrées)",
    capNotice: "{cap} premières affichées",
    casesHeading: "Affaires",
    noResults: "Aucune décision trouvée pour les critères sélectionnés.",
    capHidden:
      "{hidden} autres décisions masquées — veuillez affiner la recherche ou les filtres.",

    // ── Forum dropdown labels ──
    forumCourt: "Tribunal",
    forumRegulatorOrder: "Décision de l’autorité",
    forumRegulatorSettlement: "Transaction avec l’autorité",
    forumCriminalSettlement: "Transaction pénale",
    forumCivilSettlement: "Transaction civile",
    forumTreatyAward: "Sentence arbitrale sur traité",
    forumAdministrativeAppeal: "Recours administratif",
    forumArbitralAward: "Sentence arbitrale",

    // ── Compliance-area (Thema) labels ──
    areaLicensing: "Licences et autorisations",
    areaRegistration: "Immatriculation",
    areaLiability: "Responsabilité",
    areaInsurance: "Assurance",
    areaCybersecurity: "Cybersécurité",
    areaExportControl: "Contrôle des exportations",
    areaDataSecurity: "Sécurité des données",
    areaFrequencySpectrum: "Fréquences et spectre",
    areaEnvironmental: "Environnement",
    areaDebrisMitigation: "Débris spatiaux",
    areaSpaceTrafficManagement: "Trafic spatial",
    areaHumanSpaceflight: "Vol spatial habité",
    areaMilitaryDualUse: "Militaire / double usage",
    areaCompetitionAntitrust: "Concurrence et antitrust",
    areaStateAid: "Aides d’État",
    areaProcurement: "Marchés publics",
    areaTaxCustoms: "Fiscalité et douanes",
    areaSanctionsCompliance: "Sanctions",
    areaIpPatents: "Propriété intellectuelle",
    areaProductLiability: "Responsabilité du fait des produits",
    areaFdiScreening: "Contrôle des investissements",
    areaAiCompliance: "Conformité IA",
    areaAmlKyc: "Lutte anti-blanchiment et KYC",
    areaConsumerProtection: "Protection des consommateurs",
    areaEmploymentLabor: "Droit du travail",
    areaScientificResearch: "Science et recherche",
    areaMediaBroadcasting: "Médias et radiodiffusion",
    areaCriticalInfrastructure: "Infrastructures critiques",
    areaSustainabilityReporting: "Rapports de durabilité",

    // ── Case detail: parties line ──
    versus: "contre",

    // ── Case detail: metadata strip ──
    metaPrecedentialWeight: "Valeur de précédent",
    metaForum: "Instance",
    metaJurisdiction: "Juridiction",
    metaDecided: "Décidée le",
    metaFiled: "Déposée le",
    metaCaseNumber: "Numéro d’affaire",
    metaCitation: "Référence",

    // ── Precedential-weight labels ──
    weightBinding: "Contraignant",
    weightPersuasive: "Persuasif",
    weightSettledFacts: "Pratique transactionnelle",
    weightNonPrecedential: "Sans valeur de précédent",
    weightTreatyOnly: "Droit international uniquement",

    // ── Case detail: action row + provenance ──
    viewOfficialDecision: "Voir la décision officielle →",
    copyCitation: "Copier la référence",
    caelexTranslationNote: "Traduction Caelex — pas le texte officiel",

    // ── Case detail: section headings ──
    sectionFacts: "Faits",
    sectionRuling: "Décision",
    sectionHolding: "Attendu de principe",
    sectionSignificance: "Portée",
    sectionRemedy: "Mesure ordonnée",
    sectionNotes: "Remarques",
    sectionParties: "Parties concernées",
    sectionAppliedSources: "Sources juridiques appliquées",

    // ── Remedy line ──
    remedyFine: "Amende :",

    // ── Footer ──
    lastVerified: "Dernière vérification",
    disclaimer:
      "Ne constitue pas un avis juridique. Caelex Scholar sert uniquement à la recherche — le texte officiel fait toujours foi.",
    footerBrandBy: "by Caelex",
  },

  es: {
    // ── Page header ──
    pageTitle: "Jurisprudencia",
    pageSubtitle:
      "Sentencias, resoluciones y medidas de ejecución en derecho del espacio",

    // ── Search / filter form ──
    formAriaLabel: "Buscar y filtrar la jurisprudencia",
    searchLabel: "Búsqueda",
    searchPlaceholder: "Nombre del caso, foro o partes…",
    areaLabel: "Tema",
    areaAll: "Todos los temas",
    jurisdictionLabel: "Jurisdicción",
    jurisdictionAll: "Todas las jurisdicciones",
    forumLabel: "Foro",
    forumAll: "Todos los foros",
    sortLabel: "Orden",
    sortNewest: "Más recientes primero",
    sortOldest: "Más antiguas primero",
    apply: "Aplicar",

    // ── Active-filter chips ──
    activeFiltersSr: "Filtros activos:",
    chipSearch: "Búsqueda",
    chipTopic: "Tema",
    chipJurisdiction: "Jurisdicción",
    chipForum: "Foro",
    resetAll: "Restablecer todo",
    removeChip: "quitar",

    // ── Result count + list ──
    decisionOne: "resolución",
    decisionMany: "resoluciones",
    filteredSuffix: "(filtradas)",
    capNotice: "primeras {cap} mostradas",
    casesHeading: "Casos",
    noResults:
      "No se han encontrado resoluciones para los criterios seleccionados.",
    capHidden:
      "Otras {hidden} resoluciones ocultas — refine la búsqueda o los filtros.",

    // ── Forum dropdown labels ──
    forumCourt: "Tribunal",
    forumRegulatorOrder: "Resolución de la autoridad",
    forumRegulatorSettlement: "Acuerdo con la autoridad",
    forumCriminalSettlement: "Conformidad penal",
    forumCivilSettlement: "Acuerdo civil",
    forumTreatyAward: "Laudo arbitral sobre tratado",
    forumAdministrativeAppeal: "Recurso administrativo",
    forumArbitralAward: "Laudo arbitral",

    // ── Compliance-area (Thema) labels ──
    areaLicensing: "Licencias y autorizaciones",
    areaRegistration: "Registro",
    areaLiability: "Responsabilidad",
    areaInsurance: "Seguros",
    areaCybersecurity: "Ciberseguridad",
    areaExportControl: "Control de exportaciones",
    areaDataSecurity: "Seguridad de los datos",
    areaFrequencySpectrum: "Frecuencias y espectro",
    areaEnvironmental: "Medio ambiente",
    areaDebrisMitigation: "Basura espacial",
    areaSpaceTrafficManagement: "Tráfico espacial",
    areaHumanSpaceflight: "Vuelos espaciales tripulados",
    areaMilitaryDualUse: "Militar / doble uso",
    areaCompetitionAntitrust: "Competencia y defensa de la competencia",
    areaStateAid: "Ayudas de Estado",
    areaProcurement: "Contratación pública",
    areaTaxCustoms: "Fiscalidad y aduanas",
    areaSanctionsCompliance: "Sanciones",
    areaIpPatents: "Propiedad intelectual",
    areaProductLiability: "Responsabilidad por productos",
    areaFdiScreening: "Control de inversiones",
    areaAiCompliance: "Cumplimiento de IA",
    areaAmlKyc: "Prevención de blanqueo y KYC",
    areaConsumerProtection: "Protección del consumidor",
    areaEmploymentLabor: "Derecho laboral",
    areaScientificResearch: "Ciencia e investigación",
    areaMediaBroadcasting: "Medios y radiodifusión",
    areaCriticalInfrastructure: "Infraestructuras críticas",
    areaSustainabilityReporting: "Información sobre sostenibilidad",

    // ── Case detail: parties line ──
    versus: "contra",

    // ── Case detail: metadata strip ──
    metaPrecedentialWeight: "Valor de precedente",
    metaForum: "Foro",
    metaJurisdiction: "Jurisdicción",
    metaDecided: "Resuelta el",
    metaFiled: "Presentada el",
    metaCaseNumber: "Número de caso",
    metaCitation: "Cita",

    // ── Precedential-weight labels ──
    weightBinding: "Vinculante",
    weightPersuasive: "Persuasivo",
    weightSettledFacts: "Práctica transaccional",
    weightNonPrecedential: "Sin valor de precedente",
    weightTreatyOnly: "Solo derecho internacional",

    // ── Case detail: action row + provenance ──
    viewOfficialDecision: "Ver la resolución oficial →",
    copyCitation: "Copiar la cita",
    caelexTranslationNote: "Traducción de Caelex — no es el texto oficial",

    // ── Case detail: section headings ──
    sectionFacts: "Hechos",
    sectionRuling: "Resolución",
    sectionHolding: "Fundamento jurídico",
    sectionSignificance: "Relevancia",
    sectionRemedy: "Medida adoptada",
    sectionNotes: "Observaciones",
    sectionParties: "Partes implicadas",
    sectionAppliedSources: "Fuentes jurídicas aplicadas",

    // ── Remedy line ──
    remedyFine: "Multa:",

    // ── Footer ──
    lastVerified: "Última verificación",
    disclaimer:
      "No constituye asesoramiento jurídico. Caelex Scholar sirve únicamente para la investigación — siempre prevalece el texto oficial.",
    footerBrandBy: "by Caelex",
  },
} as const satisfies ScholarNamespace;
