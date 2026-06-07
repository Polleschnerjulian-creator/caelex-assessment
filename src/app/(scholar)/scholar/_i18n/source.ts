/**
 * Caelex Scholar — source-detail namespace (`source`).
 *
 * Every user-visible UI string of the source-detail reading shell and its
 * display primitives: the source-detail page itself plus PageHeader,
 * MetadataStrip, ProvisionCard, CrossRefBlock, StatusPill, RelevanceGlyph,
 * Eyebrow, BackLink, InDocTOC, CopyCitation, SourceRow and CaseRow.
 *
 * EN is the source of truth; the `de` values are the strings previously
 * hardcoded in those files. it/fr/es are domain-appropriate legal/academic
 * translations. Legal CONTENT (corpus text) is NOT translated here — only the
 * surrounding UI chrome.
 *
 * Shared terms (Source, Case, Back, In force, relevance words, …) live in the
 * `common` namespace and are reused via t(locale, COMMON, "key"); this file
 * only adds source-detail-specific keys. A handful of labels that COMMON also
 * carries (e.g. back, relatedSources, content, the relevance scale, the
 * in-force/repealed/superseded statuses) are kept here too so each consuming
 * primitive can read from a single self-contained dictionary — the values are
 * identical to their COMMON counterparts.
 *
 * Resolve with: t(locale, SOURCE, "key")
 */
import type { ScholarNamespace } from "./core";

export const SOURCE = {
  en: {
    // ── Source-type eyebrows (TYPE_LABELS on the page + CrossRefBlock) ──
    typeTreaty: "TREATY",
    typeEuRegulation: "EU REGULATION",
    typeEuDirective: "EU DIRECTIVE",
    typeFederalLaw: "LAW",
    typeFederalRegulation: "REGULATION",

    // ── SourceRow short type labels (compact result-row eyebrows) ──
    rowTypeInternationalTreaty: "Treaty",
    rowTypeFederalLaw: "Law",
    rowTypeFederalRegulation: "Regulation",
    rowTypeTechnicalStandard: "Standard",
    rowTypeEuRegulation: "EU Reg",
    rowTypeEuDirective: "EU Dir",
    rowTypePolicyDocument: "Policy",
    rowTypeDraftLegislation: "Draft",
    rowTypeCertificationStandard: "Std",
    rowTypeIndustryGuideline: "Guide",
    rowTypeInsuranceClause: "Clause",
    rowTypeScientificProtocol: "Protocol",
    rowTypeSoftLawResolution: "Resolution",
    rowTypeNationalSecurityDoctrine: "Doctrine",
    rowTypeBilateralAgreement: "Bilateral",
    rowTypeMultilateralAgreement: "Multilateral",
    rowTypeCaseLaw: "Case Law",
    rowTypeProcurementFramework: "Procurement",
    rowTypeSafetyRegulation: "Safety",
    rowTypeTaxTreaty: "Tax",

    // ── CaseRow forum-type labels ──
    forumCourt: "Court",
    forumRegulatorOrder: "Regulator",
    forumRegulatorSettlement: "Reg. settl.",
    forumCriminalSettlement: "Crim. settl.",
    forumCivilSettlement: "Civil settl.",
    forumTreatyAward: "Treaty",
    forumAdministrativeAppeal: "Admin. appeal",
    forumArbitralAward: "Arbitral award",

    // ── Metadata-strip labels (header card) ──
    metaJurisdiction: "Jurisdiction",
    metaIssuingBody: "Issuing body",
    metaIdentifier: "Identifier",
    metaDates: "Dates",
    metaCompetentAuthorities: "Competent authorities",
    statusSrLabel: "Status",

    // ── Dates line prefixes ──
    dateEnacted: "Enacted",
    dateInForce: "In force",
    dateAmended: "Amended",

    // ── Provisions section ──
    keyProvisions: "Key provisions",
    tocContent: "Contents",
    preambleRecitals: "Preamble / recitals",

    // ── Per-type identity bands ──
    typeBandHeading: "Classification by legal-source type",
    treatyParties: "Contracting parties",
    treatySignatoriesOnly: "Signed only",
    legalEffect: "Legal effect",
    directlyApplicable: "Directly applicable.",
    directlyApplicableBody:
      "An EU regulation applies directly in all Member States — without transposition into national law.",
    transpositionRequired: "Transposition into national law required.",
    transpositionRequiredBody:
      "An EU directive binds the Member States as to the result to be achieved; the form of transposition is left to them.",
    appliesToMemberStates: "Applies to Member States",

    // ── Action row + provenance ──
    viewOfficialSource: "View official source →",
    caelexTranslationNote: "Caelex translation — not the official wording",

    // ── ProvisionCard ──
    complianceNote: "Compliance note:",
    fullTextAtOfficialSource: "Full text at the official source →",

    // ── CopyCitation ──
    copyCitation: "Copy citation",
    copyCitationDone: "Citation copied",
    copySection: "Copy {section}", // {section} replaced at call site

    // ── CrossRefBlock ──
    relatedSources: "Related sources",
    citingCases: "Cases applying this source",

    // ── Footer ──
    lastVerified: "Last verified",
    disclaimer:
      "Not legal advice. Caelex Scholar is for research only — the official wording always governs.",

    // ── BackLink ──
    back: "Back",

    // ── InDocTOC ──
    tocNavLabel: "Table of contents",

    // ── RelevanceGlyph (sr-only) ──
    relevancePrefix: "Relevance:",
    relevanceFundamental: "Fundamental",
    relevanceCritical: "Critical",
    relevanceHigh: "High",
    relevanceMedium: "Medium",
    relevanceLow: "Low",
    relevanceUnknown: "Unknown",

    // ── StatusPill labels ──
    statusInForce: "In force",
    statusSuperseded: "Superseded",
    statusRepealed: "Repealed",
    statusDraft: "Draft",
    statusDecided: "Decided",
    statusPending: "Pending",
    statusAppealed: "On appeal",
  },

  de: {
    // ── Source-type eyebrows ──
    typeTreaty: "TREATY",
    typeEuRegulation: "EU-VERORDNUNG",
    typeEuDirective: "EU-RICHTLINIE",
    typeFederalLaw: "GESETZ",
    typeFederalRegulation: "VERORDNUNG",

    // ── SourceRow short type labels ──
    rowTypeInternationalTreaty: "Vertrag",
    rowTypeFederalLaw: "Gesetz",
    rowTypeFederalRegulation: "Verordnung",
    rowTypeTechnicalStandard: "Standard",
    rowTypeEuRegulation: "EU-VO",
    rowTypeEuDirective: "EU-RL",
    rowTypePolicyDocument: "Policy",
    rowTypeDraftLegislation: "Entwurf",
    rowTypeCertificationStandard: "Std.",
    rowTypeIndustryGuideline: "Leitf.",
    rowTypeInsuranceClause: "Klausel",
    rowTypeScientificProtocol: "Protokoll",
    rowTypeSoftLawResolution: "Resolution",
    rowTypeNationalSecurityDoctrine: "Doktrin",
    rowTypeBilateralAgreement: "Bilateral",
    rowTypeMultilateralAgreement: "Multilateral",
    rowTypeCaseLaw: "Rechtspr.",
    rowTypeProcurementFramework: "Vergabe",
    rowTypeSafetyRegulation: "Sicherheit",
    rowTypeTaxTreaty: "Steuer",

    // ── CaseRow forum-type labels ──
    forumCourt: "Gericht",
    forumRegulatorOrder: "Behörde",
    forumRegulatorSettlement: "Beh. Vergl.",
    forumCriminalSettlement: "Strafvergl.",
    forumCivilSettlement: "Zivilvergl.",
    forumTreatyAward: "Vertrag",
    forumAdministrativeAppeal: "Verw.-Beschwerde",
    forumArbitralAward: "Schiedsspruch",

    // ── Metadata-strip labels ──
    metaJurisdiction: "Jurisdiktion",
    metaIssuingBody: "Herausgeber",
    metaIdentifier: "Kennung",
    metaDates: "Daten",
    metaCompetentAuthorities: "Zuständige Behörden",
    statusSrLabel: "Status",

    // ── Dates line prefixes ──
    dateEnacted: "Erlassen",
    dateInForce: "In Kraft",
    dateAmended: "Geändert",

    // ── Provisions section ──
    keyProvisions: "Schlüsselbestimmungen",
    tocContent: "Inhalt",
    preambleRecitals: "Präambel / Erwägungsgründe",

    // ── Per-type identity bands ──
    typeBandHeading: "Einordnung nach Rechtsquellentyp",
    treatyParties: "Vertragsparteien",
    treatySignatoriesOnly: "Nur unterzeichnet",
    legalEffect: "Rechtswirkung",
    directlyApplicable: "Unmittelbar geltend.",
    directlyApplicableBody:
      "Eine EU-Verordnung gilt in allen Mitgliedstaaten direkt — ohne Umsetzung in nationales Recht.",
    transpositionRequired: "Umsetzung in nationales Recht erforderlich.",
    transpositionRequiredBody:
      "Eine EU-Richtlinie bindet die Mitgliedstaaten hinsichtlich des Ziels; die Form der Umsetzung bleibt ihnen überlassen.",
    appliesToMemberStates: "Gilt für Mitgliedstaaten",

    // ── Action row + provenance ──
    viewOfficialSource: "Amtliche Quelle ansehen →",
    caelexTranslationNote: "Caelex-Übersetzung — nicht der amtliche Wortlaut",

    // ── ProvisionCard ──
    complianceNote: "Compliance-Hinweis:",
    fullTextAtOfficialSource: "Vollständiger Text bei der amtlichen Quelle →",

    // ── CopyCitation ──
    copyCitation: "Zitat kopieren",
    copyCitationDone: "Zitat kopiert",
    copySection: "{section} kopieren",

    // ── CrossRefBlock ──
    relatedSources: "Verwandte Quellen",
    citingCases: "Fälle, die diese Quelle anwenden",

    // ── Footer ──
    lastVerified: "Zuletzt verifiziert",
    disclaimer:
      "Kein Rechtsrat. Caelex Scholar dient ausschließlich der Recherche — maßgeblich ist stets der amtliche Wortlaut.",

    // ── BackLink ──
    back: "Zurück",

    // ── InDocTOC ──
    tocNavLabel: "Inhaltsverzeichnis",

    // ── RelevanceGlyph (sr-only) ──
    relevancePrefix: "Relevanz:",
    relevanceFundamental: "Grundlegend",
    relevanceCritical: "Kritisch",
    relevanceHigh: "Hoch",
    relevanceMedium: "Mittel",
    relevanceLow: "Gering",
    relevanceUnknown: "Unbekannt",

    // ── StatusPill labels ──
    statusInForce: "In Kraft",
    statusSuperseded: "Abgelöst",
    statusRepealed: "Aufgehoben",
    statusDraft: "Entwurf",
    statusDecided: "Entschieden",
    statusPending: "Anhängig",
    statusAppealed: "Berufung",
  },

  it: {
    // ── Source-type eyebrows ──
    typeTreaty: "TRATTATO",
    typeEuRegulation: "REGOLAMENTO UE",
    typeEuDirective: "DIRETTIVA UE",
    typeFederalLaw: "LEGGE",
    typeFederalRegulation: "REGOLAMENTO",

    // ── SourceRow short type labels ──
    rowTypeInternationalTreaty: "Trattato",
    rowTypeFederalLaw: "Legge",
    rowTypeFederalRegulation: "Regolamento",
    rowTypeTechnicalStandard: "Standard",
    rowTypeEuRegulation: "Reg. UE",
    rowTypeEuDirective: "Dir. UE",
    rowTypePolicyDocument: "Policy",
    rowTypeDraftLegislation: "Bozza",
    rowTypeCertificationStandard: "Std.",
    rowTypeIndustryGuideline: "Guida",
    rowTypeInsuranceClause: "Clausola",
    rowTypeScientificProtocol: "Protocollo",
    rowTypeSoftLawResolution: "Risoluzione",
    rowTypeNationalSecurityDoctrine: "Dottrina",
    rowTypeBilateralAgreement: "Bilaterale",
    rowTypeMultilateralAgreement: "Multilaterale",
    rowTypeCaseLaw: "Giurispr.",
    rowTypeProcurementFramework: "Appalti",
    rowTypeSafetyRegulation: "Sicurezza",
    rowTypeTaxTreaty: "Fiscale",

    // ── CaseRow forum-type labels ──
    forumCourt: "Corte",
    forumRegulatorOrder: "Autorità",
    forumRegulatorSettlement: "Trans. aut.",
    forumCriminalSettlement: "Trans. pen.",
    forumCivilSettlement: "Trans. civ.",
    forumTreatyAward: "Trattato",
    forumAdministrativeAppeal: "Ricorso amm.",
    forumArbitralAward: "Lodo arbitrale",

    // ── Metadata-strip labels ──
    metaJurisdiction: "Giurisdizione",
    metaIssuingBody: "Ente emittente",
    metaIdentifier: "Identificativo",
    metaDates: "Date",
    metaCompetentAuthorities: "Autorità competenti",
    statusSrLabel: "Stato",

    // ── Dates line prefixes ──
    dateEnacted: "Emanato",
    dateInForce: "In vigore",
    dateAmended: "Modificato",

    // ── Provisions section ──
    keyProvisions: "Disposizioni chiave",
    tocContent: "Contenuto",
    preambleRecitals: "Preambolo / considerando",

    // ── Per-type identity bands ──
    typeBandHeading: "Classificazione per tipo di fonte normativa",
    treatyParties: "Parti contraenti",
    treatySignatoriesOnly: "Solo firmatari",
    legalEffect: "Efficacia giuridica",
    directlyApplicable: "Direttamente applicabile.",
    directlyApplicableBody:
      "Un regolamento UE si applica direttamente in tutti gli Stati membri — senza recepimento nel diritto nazionale.",
    transpositionRequired: "Recepimento nel diritto nazionale necessario.",
    transpositionRequiredBody:
      "Una direttiva UE vincola gli Stati membri quanto al risultato da raggiungere; la forma del recepimento è lasciata a loro.",
    appliesToMemberStates: "Si applica agli Stati membri",

    // ── Action row + provenance ──
    viewOfficialSource: "Vedi la fonte ufficiale →",
    caelexTranslationNote: "Traduzione Caelex — non è il testo ufficiale",

    // ── ProvisionCard ──
    complianceNote: "Nota di conformità:",
    fullTextAtOfficialSource: "Testo integrale presso la fonte ufficiale →",

    // ── CopyCitation ──
    copyCitation: "Copia citazione",
    copyCitationDone: "Citazione copiata",
    copySection: "Copia {section}",

    // ── CrossRefBlock ──
    relatedSources: "Fonti correlate",
    citingCases: "Casi che applicano questa fonte",

    // ── Footer ──
    lastVerified: "Ultima verifica",
    disclaimer:
      "Non costituisce consulenza legale. Caelex Scholar serve solo alla ricerca — fa sempre fede il testo ufficiale.",

    // ── BackLink ──
    back: "Indietro",

    // ── InDocTOC ──
    tocNavLabel: "Indice",

    // ── RelevanceGlyph (sr-only) ──
    relevancePrefix: "Rilevanza:",
    relevanceFundamental: "Fondamentale",
    relevanceCritical: "Critico",
    relevanceHigh: "Alto",
    relevanceMedium: "Medio",
    relevanceLow: "Basso",
    relevanceUnknown: "Sconosciuto",

    // ── StatusPill labels ──
    statusInForce: "In vigore",
    statusSuperseded: "Sostituito",
    statusRepealed: "Abrogato",
    statusDraft: "Bozza",
    statusDecided: "Deciso",
    statusPending: "In sospeso",
    statusAppealed: "In appello",
  },

  fr: {
    // ── Source-type eyebrows ──
    typeTreaty: "TRAITÉ",
    typeEuRegulation: "RÈGLEMENT UE",
    typeEuDirective: "DIRECTIVE UE",
    typeFederalLaw: "LOI",
    typeFederalRegulation: "RÈGLEMENT",

    // ── SourceRow short type labels ──
    rowTypeInternationalTreaty: "Traité",
    rowTypeFederalLaw: "Loi",
    rowTypeFederalRegulation: "Règlement",
    rowTypeTechnicalStandard: "Norme",
    rowTypeEuRegulation: "Règl. UE",
    rowTypeEuDirective: "Dir. UE",
    rowTypePolicyDocument: "Politique",
    rowTypeDraftLegislation: "Projet",
    rowTypeCertificationStandard: "Norme",
    rowTypeIndustryGuideline: "Guide",
    rowTypeInsuranceClause: "Clause",
    rowTypeScientificProtocol: "Protocole",
    rowTypeSoftLawResolution: "Résolution",
    rowTypeNationalSecurityDoctrine: "Doctrine",
    rowTypeBilateralAgreement: "Bilatéral",
    rowTypeMultilateralAgreement: "Multilatéral",
    rowTypeCaseLaw: "Jurispr.",
    rowTypeProcurementFramework: "Marchés",
    rowTypeSafetyRegulation: "Sécurité",
    rowTypeTaxTreaty: "Fiscal",

    // ── CaseRow forum-type labels ──
    forumCourt: "Tribunal",
    forumRegulatorOrder: "Autorité",
    forumRegulatorSettlement: "Trans. aut.",
    forumCriminalSettlement: "Trans. pén.",
    forumCivilSettlement: "Trans. civ.",
    forumTreatyAward: "Traité",
    forumAdministrativeAppeal: "Recours adm.",
    forumArbitralAward: "Sentence arb.",

    // ── Metadata-strip labels ──
    metaJurisdiction: "Juridiction",
    metaIssuingBody: "Organisme émetteur",
    metaIdentifier: "Identifiant",
    metaDates: "Dates",
    metaCompetentAuthorities: "Autorités compétentes",
    statusSrLabel: "Statut",

    // ── Dates line prefixes ──
    dateEnacted: "Adopté",
    dateInForce: "En vigueur",
    dateAmended: "Modifié",

    // ── Provisions section ──
    keyProvisions: "Dispositions clés",
    tocContent: "Contenu",
    preambleRecitals: "Préambule / considérants",

    // ── Per-type identity bands ──
    typeBandHeading: "Classification par type de source juridique",
    treatyParties: "Parties contractantes",
    treatySignatoriesOnly: "Signataires uniquement",
    legalEffect: "Effet juridique",
    directlyApplicable: "Directement applicable.",
    directlyApplicableBody:
      "Un règlement de l’UE s’applique directement dans tous les États membres — sans transposition en droit national.",
    transpositionRequired: "Transposition en droit national requise.",
    transpositionRequiredBody:
      "Une directive de l’UE lie les États membres quant au résultat à atteindre ; la forme de la transposition leur est laissée.",
    appliesToMemberStates: "S’applique aux États membres",

    // ── Action row + provenance ──
    viewOfficialSource: "Voir la source officielle →",
    caelexTranslationNote: "Traduction Caelex — pas le texte officiel",

    // ── ProvisionCard ──
    complianceNote: "Note de conformité :",
    fullTextAtOfficialSource: "Texte intégral à la source officielle →",

    // ── CopyCitation ──
    copyCitation: "Copier la citation",
    copyCitationDone: "Citation copiée",
    copySection: "Copier {section}",

    // ── CrossRefBlock ──
    relatedSources: "Sources connexes",
    citingCases: "Affaires appliquant cette source",

    // ── Footer ──
    lastVerified: "Dernière vérification",
    disclaimer:
      "Ne constitue pas un avis juridique. Caelex Scholar sert uniquement à la recherche — le texte officiel fait toujours foi.",

    // ── BackLink ──
    back: "Retour",

    // ── InDocTOC ──
    tocNavLabel: "Sommaire",

    // ── RelevanceGlyph (sr-only) ──
    relevancePrefix: "Pertinence :",
    relevanceFundamental: "Fondamental",
    relevanceCritical: "Critique",
    relevanceHigh: "Élevé",
    relevanceMedium: "Moyen",
    relevanceLow: "Faible",
    relevanceUnknown: "Inconnu",

    // ── StatusPill labels ──
    statusInForce: "En vigueur",
    statusSuperseded: "Remplacé",
    statusRepealed: "Abrogé",
    statusDraft: "Projet",
    statusDecided: "Tranché",
    statusPending: "En instance",
    statusAppealed: "En appel",
  },

  es: {
    // ── Source-type eyebrows ──
    typeTreaty: "TRATADO",
    typeEuRegulation: "REGLAMENTO UE",
    typeEuDirective: "DIRECTIVA UE",
    typeFederalLaw: "LEY",
    typeFederalRegulation: "REGLAMENTO",

    // ── SourceRow short type labels ──
    rowTypeInternationalTreaty: "Tratado",
    rowTypeFederalLaw: "Ley",
    rowTypeFederalRegulation: "Reglamento",
    rowTypeTechnicalStandard: "Estándar",
    rowTypeEuRegulation: "Regl. UE",
    rowTypeEuDirective: "Dir. UE",
    rowTypePolicyDocument: "Política",
    rowTypeDraftLegislation: "Borrador",
    rowTypeCertificationStandard: "Norma",
    rowTypeIndustryGuideline: "Guía",
    rowTypeInsuranceClause: "Cláusula",
    rowTypeScientificProtocol: "Protocolo",
    rowTypeSoftLawResolution: "Resolución",
    rowTypeNationalSecurityDoctrine: "Doctrina",
    rowTypeBilateralAgreement: "Bilateral",
    rowTypeMultilateralAgreement: "Multilateral",
    rowTypeCaseLaw: "Jurispr.",
    rowTypeProcurementFramework: "Contratación",
    rowTypeSafetyRegulation: "Seguridad",
    rowTypeTaxTreaty: "Fiscal",

    // ── CaseRow forum-type labels ──
    forumCourt: "Tribunal",
    forumRegulatorOrder: "Autoridad",
    forumRegulatorSettlement: "Trans. aut.",
    forumCriminalSettlement: "Trans. pen.",
    forumCivilSettlement: "Trans. civ.",
    forumTreatyAward: "Tratado",
    forumAdministrativeAppeal: "Recurso adm.",
    forumArbitralAward: "Laudo arbitral",

    // ── Metadata-strip labels ──
    metaJurisdiction: "Jurisdicción",
    metaIssuingBody: "Organismo emisor",
    metaIdentifier: "Identificador",
    metaDates: "Fechas",
    metaCompetentAuthorities: "Autoridades competentes",
    statusSrLabel: "Estado",

    // ── Dates line prefixes ──
    dateEnacted: "Promulgado",
    dateInForce: "En vigor",
    dateAmended: "Modificado",

    // ── Provisions section ──
    keyProvisions: "Disposiciones clave",
    tocContent: "Contenido",
    preambleRecitals: "Preámbulo / considerandos",

    // ── Per-type identity bands ──
    typeBandHeading: "Clasificación por tipo de fuente jurídica",
    treatyParties: "Partes contratantes",
    treatySignatoriesOnly: "Solo firmantes",
    legalEffect: "Efecto jurídico",
    directlyApplicable: "Directamente aplicable.",
    directlyApplicableBody:
      "Un reglamento de la UE se aplica directamente en todos los Estados miembros — sin transposición al Derecho nacional.",
    transpositionRequired: "Se requiere transposición al Derecho nacional.",
    transpositionRequiredBody:
      "Una directiva de la UE vincula a los Estados miembros en cuanto al resultado que debe alcanzarse; la forma de la transposición queda a su elección.",
    appliesToMemberStates: "Se aplica a los Estados miembros",

    // ── Action row + provenance ──
    viewOfficialSource: "Ver la fuente oficial →",
    caelexTranslationNote: "Traducción de Caelex — no es el texto oficial",

    // ── ProvisionCard ──
    complianceNote: "Nota de cumplimiento:",
    fullTextAtOfficialSource: "Texto íntegro en la fuente oficial →",

    // ── CopyCitation ──
    copyCitation: "Copiar la cita",
    copyCitationDone: "Cita copiada",
    copySection: "Copiar {section}",

    // ── CrossRefBlock ──
    relatedSources: "Fuentes relacionadas",
    citingCases: "Casos que aplican esta fuente",

    // ── Footer ──
    lastVerified: "Última verificación",
    disclaimer:
      "No constituye asesoramiento jurídico. Caelex Scholar sirve únicamente para la investigación — siempre prevalece el texto oficial.",

    // ── BackLink ──
    back: "Volver",

    // ── InDocTOC ──
    tocNavLabel: "Índice",

    // ── RelevanceGlyph (sr-only) ──
    relevancePrefix: "Relevancia:",
    relevanceFundamental: "Fundamental",
    relevanceCritical: "Crítico",
    relevanceHigh: "Alto",
    relevanceMedium: "Medio",
    relevanceLow: "Bajo",
    relevanceUnknown: "Desconocido",

    // ── StatusPill labels ──
    statusInForce: "En vigor",
    statusSuperseded: "Sustituido",
    statusRepealed: "Derogado",
    statusDraft: "Borrador",
    statusDecided: "Resuelto",
    statusPending: "Pendiente",
    statusAppealed: "En apelación",
  },
} as const satisfies ScholarNamespace;
