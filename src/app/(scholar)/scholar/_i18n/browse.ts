/**
 * Caelex Scholar — browse / library namespace (`browse`).
 *
 * Every user-visible UI string of the faceted-browse surface:
 *   • /scholar/library            (faceted browse over the whole corpus)
 *   • /scholar/jurisdictions      (jurisdiction index)
 *   • /scholar/jurisdictions/[code] (one jurisdiction's legal landscape)
 *   • src/lib/scholar/browse-facets.server.ts (the facet labels it emits:
 *     Quellentyp / Thema / Chronologie option labels + group headings)
 *
 * EN is the source of truth; the `de` values are the strings previously
 * hardcoded in those files. it/fr/es are domain-appropriate legal/academic
 * translations. Legal CONTENT (corpus text, source titles, authority names) is
 * NOT translated here — only the surrounding UI chrome and the controlled facet
 * vocabularies (legal-source TYPES, compliance THEMES, decade buckets).
 *
 * Shared terms (Source/Sources, Jurisdiction(s), Filter/Reset wording where it
 * overlaps, …) live in the `common` namespace and are reused via
 * t(locale, COMMON, "key"); this file only adds browse-specific keys.
 *
 * Placeholders: a few values contain {tokens} ({n}, {total}, {label}, {count})
 * that the call site replaces with .replace(). They are kept identical across
 * locales so the substitution is position-independent.
 *
 * Resolve with: t(locale, BROWSE, "key")
 */
import type { ScholarNamespace } from "./core";

export const BROWSE = {
  en: {
    // ── /scholar/library — header ──
    libraryTitle: "Library",
    librarySubtitle:
      "Search the entire legal-source corpus by type, jurisdiction, theme and period",

    // ── Facet rail chrome ──
    filter: "Filter",
    reset: "Reset",
    ariaFacetFilter: "Filter by facet",
    ariaResults: "Search results",
    activeFilters: "Active filters",
    // chip remove (sr-only): removeFilterPrefix + label + removeFilterSuffix
    removeFilterPrefix: "Remove filter “",
    removeFilterSuffix: "”",

    // ── Count + cap + empty ──
    filteredSuffix: " (filtered)",
    // "Showing the first {n} of {total} sources — refine the filters to see the rest."
    capNotice:
      "Showing the first {n} of {total} sources — refine the filters to see the rest.",
    emptyFilters:
      "No sources found for the selected filters. Remove a filter or reset the selection.",

    // ── Facet option sr-only state ──
    srSelectedRemove: ", selected — remove",
    // ", {count} sources — select"
    srUnselectedSelect: ", {count} sources — select",

    // ── Sort control ──
    sortLabel: "Sort:",
    sortActiveSuffix: " (active)",
    sortRelevance: "Relevance",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",

    // ── Footer ──
    footerBy: "by Caelex",

    // ── /scholar/jurisdictions ──
    jurisdictionsTitle: "Jurisdictions",
    // "{n} jurisdictions with space-law sources"
    jurisdictionsSubtitle: "{n} jurisdictions with space-law sources",

    // ── /scholar/jurisdictions/[code] ──
    backToJurisdictions: "Back to jurisdictions",
    legalSource: "legal source",
    legalSources: "legal sources",
    competentAuthorities: "Competent authorities",
    nationalLaw: "National law",
    applicableInternationalLaw: "Applicable international / EU law",
    viewWebsite: "View website →",

    // ── Special jurisdiction names (not in ISO-3166) ──
    jurisdictionINT: "International",
    jurisdictionEU: "European Union",

    // ── Facet group headings (browse-facets.server.ts) ──
    groupType: "Source type",
    groupJurisdiction: "Jurisdiction",
    groupArea: "Theme",
    groupDecade: "Chronology",

    // ── Facet: legal-source TYPE labels ──
    typeInternationalTreaty: "International treaty",
    typeFederalLaw: "National law",
    typeFederalRegulation: "National regulation",
    typeTechnicalStandard: "Technical standard",
    typeEuRegulation: "EU regulation",
    typeEuDirective: "EU directive",
    typePolicyDocument: "Policy document",
    typeDraftLegislation: "Draft legislation",
    typeCertificationStandard: "Certification standard",
    typeIndustryGuideline: "Industry guideline",
    typeInsuranceClause: "Insurance clause",
    typeScientificProtocol: "Scientific protocol",
    typeSoftLawResolution: "Soft-law resolution",
    typeNationalSecurityDoctrine: "National-security doctrine",
    typeBilateralAgreement: "Bilateral agreement",
    typeMultilateralAgreement: "Multilateral agreement",
    typeCaseLaw: "Case law",
    typeProcurementFramework: "Procurement framework",
    typeSafetyRegulation: "Safety regulation",
    typeTaxTreaty: "Double-taxation treaty",

    // ── Facet: compliance THEME (area) labels ──
    areaLicensing: "Licensing",
    areaRegistration: "Registration",
    areaLiability: "Liability",
    areaInsurance: "Insurance",
    areaCybersecurity: "Cybersecurity",
    areaExportControl: "Export control",
    areaDataSecurity: "Data security",
    areaFrequencySpectrum: "Frequency spectrum",
    areaEnvironmental: "Environment",
    areaDebrisMitigation: "Space debris",
    areaSpaceTrafficManagement: "Space traffic",
    areaHumanSpaceflight: "Human spaceflight",
    areaMilitaryDualUse: "Military / dual-use",
    areaCompetitionAntitrust: "Competition law",
    areaStateAid: "State aid",
    areaProcurement: "Procurement",
    areaTaxCustoms: "Tax & customs",
    areaSanctionsCompliance: "Sanctions",
    areaIpPatents: "Patents & IP",
    areaProductLiability: "Product liability",
    areaFdiScreening: "Investment screening",
    areaAiCompliance: "AI compliance",
    areaAmlKyc: "AML / KYC",
    areaConsumerProtection: "Consumer protection",
    areaEmploymentLabor: "Labour law",
    areaScientificResearch: "Science",
    areaMediaBroadcasting: "Media & broadcasting",
    areaCriticalInfrastructure: "Critical infrastructure",
    areaSustainabilityReporting: "Sustainability reporting",

    // ── Facet: decade buckets (Chronology) ──
    decadePre1960: "Before 1960",
    decade1960s: "1960s",
    decade1970s: "1970s",
    decade1980s: "1980s",
    decade1990s: "1990s",
    decade2000s: "2000s",
    decade2010s: "2010s",
    decade2020s: "2020s",
  },

  de: {
    // ── /scholar/library — header ──
    libraryTitle: "Bibliothek",
    librarySubtitle:
      "Den gesamten Rechtsquellen-Korpus nach Typ, Jurisdiktion, Thema und Zeitraum durchsuchen",

    // ── Facet rail chrome ──
    filter: "Filter",
    reset: "Zurücksetzen",
    ariaFacetFilter: "Filter nach Facetten",
    ariaResults: "Suchergebnisse",
    activeFilters: "Aktive Filter",
    removeFilterPrefix: "Filter „",
    removeFilterSuffix: "“ entfernen",

    // ── Count + cap + empty ──
    filteredSuffix: " (gefiltert)",
    capNotice:
      "Es werden die ersten {n} von {total} Quellen angezeigt — verfeinere die Filter, um die übrigen zu sehen.",
    emptyFilters:
      "Keine Quellen für die gewählten Filter gefunden. Entferne einen Filter oder setze die Auswahl zurück.",

    // ── Facet option sr-only state ──
    srSelectedRemove: ", ausgewählt — entfernen",
    srUnselectedSelect: ", {count} Quellen — auswählen",

    // ── Sort control ──
    sortLabel: "Sortieren:",
    sortActiveSuffix: " (aktiv)",
    sortRelevance: "Relevanz",
    sortNewest: "Neueste zuerst",
    sortOldest: "Älteste zuerst",

    // ── Footer ──
    footerBy: "by Caelex",

    // ── /scholar/jurisdictions ──
    jurisdictionsTitle: "Jurisdiktionen",
    jurisdictionsSubtitle: "{n} Jurisdiktionen mit Weltraumrecht-Quellen",

    // ── /scholar/jurisdictions/[code] ──
    backToJurisdictions: "Zurück zu Jurisdiktionen",
    legalSource: "Rechtsquelle",
    legalSources: "Rechtsquellen",
    competentAuthorities: "Zuständige Behörden",
    nationalLaw: "Nationales Recht",
    applicableInternationalLaw: "Anwendbares Völkerrecht / EU-Recht",
    viewWebsite: "Website ansehen →",

    // ── Special jurisdiction names (not in ISO-3166) ──
    jurisdictionINT: "International",
    jurisdictionEU: "Europäische Union",

    // ── Facet group headings ──
    groupType: "Quellentyp",
    groupJurisdiction: "Jurisdiktion",
    groupArea: "Thema",
    groupDecade: "Chronologie",

    // ── Facet: legal-source TYPE labels ──
    typeInternationalTreaty: "Internationaler Vertrag",
    typeFederalLaw: "Bundesgesetz",
    typeFederalRegulation: "Bundesverordnung",
    typeTechnicalStandard: "Technischer Standard",
    typeEuRegulation: "EU-Verordnung",
    typeEuDirective: "EU-Richtlinie",
    typePolicyDocument: "Politikdokument",
    typeDraftLegislation: "Gesetzentwurf",
    typeCertificationStandard: "Zertifizierungsstandard",
    typeIndustryGuideline: "Branchenrichtlinie",
    typeInsuranceClause: "Versicherungsklausel",
    typeScientificProtocol: "Wissenschaftliches Protokoll",
    typeSoftLawResolution: "Soft-Law-Resolution",
    typeNationalSecurityDoctrine: "Nationale Sicherheitsdoktrin",
    typeBilateralAgreement: "Bilaterales Abkommen",
    typeMultilateralAgreement: "Multilaterales Abkommen",
    typeCaseLaw: "Rechtsprechung",
    typeProcurementFramework: "Beschaffungsrahmen",
    typeSafetyRegulation: "Sicherheitsvorschrift",
    typeTaxTreaty: "Doppelbesteuerungsabkommen",

    // ── Facet: compliance THEME (area) labels ──
    areaLicensing: "Lizenzierung",
    areaRegistration: "Registrierung",
    areaLiability: "Haftung",
    areaInsurance: "Versicherung",
    areaCybersecurity: "Cybersicherheit",
    areaExportControl: "Exportkontrolle",
    areaDataSecurity: "Datensicherheit",
    areaFrequencySpectrum: "Frequenzspektrum",
    areaEnvironmental: "Umwelt",
    areaDebrisMitigation: "Weltraummüll",
    areaSpaceTrafficManagement: "Weltraumverkehr",
    areaHumanSpaceflight: "Bemannte Raumfahrt",
    areaMilitaryDualUse: "Militärisch / Dual-Use",
    areaCompetitionAntitrust: "Wettbewerbsrecht",
    areaStateAid: "Beihilfen",
    areaProcurement: "Beschaffung",
    areaTaxCustoms: "Steuern & Zoll",
    areaSanctionsCompliance: "Sanktionen",
    areaIpPatents: "Patente & IP",
    areaProductLiability: "Produkthaftung",
    areaFdiScreening: "Investitionsprüfung",
    areaAiCompliance: "KI-Compliance",
    areaAmlKyc: "Geldwäsche / KYC",
    areaConsumerProtection: "Verbraucherschutz",
    areaEmploymentLabor: "Arbeitsrecht",
    areaScientificResearch: "Wissenschaft",
    areaMediaBroadcasting: "Medien & Rundfunk",
    areaCriticalInfrastructure: "Kritische Infrastruktur",
    areaSustainabilityReporting: "Nachhaltigkeitsberichte",

    // ── Facet: decade buckets (Chronology) ──
    decadePre1960: "Vor 1960",
    decade1960s: "1960er",
    decade1970s: "1970er",
    decade1980s: "1980er",
    decade1990s: "1990er",
    decade2000s: "2000er",
    decade2010s: "2010er",
    decade2020s: "2020er",
  },

  it: {
    // ── /scholar/library — header ──
    libraryTitle: "Biblioteca",
    librarySubtitle:
      "Cerca nell’intero corpus di fonti normative per tipo, giurisdizione, tema e periodo",

    // ── Facet rail chrome ──
    filter: "Filtri",
    reset: "Reimposta",
    ariaFacetFilter: "Filtra per faccette",
    ariaResults: "Risultati della ricerca",
    activeFilters: "Filtri attivi",
    removeFilterPrefix: "Rimuovi il filtro «",
    removeFilterSuffix: "»",

    // ── Count + cap + empty ──
    filteredSuffix: " (filtrato)",
    capNotice:
      "Vengono mostrate le prime {n} di {total} fonti — affina i filtri per vedere le altre.",
    emptyFilters:
      "Nessuna fonte trovata per i filtri selezionati. Rimuovi un filtro o reimposta la selezione.",

    // ── Facet option sr-only state ──
    srSelectedRemove: ", selezionato — rimuovi",
    srUnselectedSelect: ", {count} fonti — seleziona",

    // ── Sort control ──
    sortLabel: "Ordina:",
    sortActiveSuffix: " (attivo)",
    sortRelevance: "Rilevanza",
    sortNewest: "Più recenti prima",
    sortOldest: "Più vecchie prima",

    // ── Footer ──
    footerBy: "di Caelex",

    // ── /scholar/jurisdictions ──
    jurisdictionsTitle: "Giurisdizioni",
    jurisdictionsSubtitle: "{n} giurisdizioni con fonti di diritto spaziale",

    // ── /scholar/jurisdictions/[code] ──
    backToJurisdictions: "Torna alle giurisdizioni",
    legalSource: "fonte normativa",
    legalSources: "fonti normative",
    competentAuthorities: "Autorità competenti",
    nationalLaw: "Diritto nazionale",
    applicableInternationalLaw: "Diritto internazionale / UE applicabile",
    viewWebsite: "Vai al sito →",

    // ── Special jurisdiction names ──
    jurisdictionINT: "Internazionale",
    jurisdictionEU: "Unione europea",

    // ── Facet group headings ──
    groupType: "Tipo di fonte",
    groupJurisdiction: "Giurisdizione",
    groupArea: "Tema",
    groupDecade: "Cronologia",

    // ── Facet: legal-source TYPE labels ──
    typeInternationalTreaty: "Trattato internazionale",
    typeFederalLaw: "Legge nazionale",
    typeFederalRegulation: "Regolamento nazionale",
    typeTechnicalStandard: "Standard tecnico",
    typeEuRegulation: "Regolamento UE",
    typeEuDirective: "Direttiva UE",
    typePolicyDocument: "Documento programmatico",
    typeDraftLegislation: "Progetto di legge",
    typeCertificationStandard: "Standard di certificazione",
    typeIndustryGuideline: "Linee guida di settore",
    typeInsuranceClause: "Clausola assicurativa",
    typeScientificProtocol: "Protocollo scientifico",
    typeSoftLawResolution: "Risoluzione di soft law",
    typeNationalSecurityDoctrine: "Dottrina di sicurezza nazionale",
    typeBilateralAgreement: "Accordo bilaterale",
    typeMultilateralAgreement: "Accordo multilaterale",
    typeCaseLaw: "Giurisprudenza",
    typeProcurementFramework: "Quadro per gli appalti",
    typeSafetyRegulation: "Regolamento di sicurezza",
    typeTaxTreaty: "Convenzione contro le doppie imposizioni",

    // ── Facet: compliance THEME (area) labels ──
    areaLicensing: "Licenze",
    areaRegistration: "Registrazione",
    areaLiability: "Responsabilità",
    areaInsurance: "Assicurazione",
    areaCybersecurity: "Cibersicurezza",
    areaExportControl: "Controllo delle esportazioni",
    areaDataSecurity: "Sicurezza dei dati",
    areaFrequencySpectrum: "Spettro di frequenze",
    areaEnvironmental: "Ambiente",
    areaDebrisMitigation: "Detriti spaziali",
    areaSpaceTrafficManagement: "Traffico spaziale",
    areaHumanSpaceflight: "Volo spaziale umano",
    areaMilitaryDualUse: "Militare / duplice uso",
    areaCompetitionAntitrust: "Diritto della concorrenza",
    areaStateAid: "Aiuti di Stato",
    areaProcurement: "Appalti",
    areaTaxCustoms: "Fiscalità e dogane",
    areaSanctionsCompliance: "Sanzioni",
    areaIpPatents: "Brevetti e PI",
    areaProductLiability: "Responsabilità del prodotto",
    areaFdiScreening: "Controllo degli investimenti",
    areaAiCompliance: "Conformità IA",
    areaAmlKyc: "Antiriciclaggio / KYC",
    areaConsumerProtection: "Tutela dei consumatori",
    areaEmploymentLabor: "Diritto del lavoro",
    areaScientificResearch: "Scienza",
    areaMediaBroadcasting: "Media e radiodiffusione",
    areaCriticalInfrastructure: "Infrastrutture critiche",
    areaSustainabilityReporting: "Rendicontazione di sostenibilità",

    // ── Facet: decade buckets (Chronology) ──
    decadePre1960: "Prima del 1960",
    decade1960s: "Anni 1960",
    decade1970s: "Anni 1970",
    decade1980s: "Anni 1980",
    decade1990s: "Anni 1990",
    decade2000s: "Anni 2000",
    decade2010s: "Anni 2010",
    decade2020s: "Anni 2020",
  },

  fr: {
    // ── /scholar/library — header ──
    libraryTitle: "Bibliothèque",
    librarySubtitle:
      "Parcourir l’ensemble du corpus de sources juridiques par type, juridiction, thème et période",

    // ── Facet rail chrome ──
    filter: "Filtres",
    reset: "Réinitialiser",
    ariaFacetFilter: "Filtrer par facettes",
    ariaResults: "Résultats de recherche",
    activeFilters: "Filtres actifs",
    removeFilterPrefix: "Retirer le filtre « ",
    removeFilterSuffix: " »",

    // ── Count + cap + empty ──
    filteredSuffix: " (filtré)",
    capNotice:
      "Affichage des {n} premières sources sur {total} — affinez les filtres pour voir les autres.",
    emptyFilters:
      "Aucune source trouvée pour les filtres sélectionnés. Retirez un filtre ou réinitialisez la sélection.",

    // ── Facet option sr-only state ──
    srSelectedRemove: ", sélectionné — retirer",
    srUnselectedSelect: ", {count} sources — sélectionner",

    // ── Sort control ──
    sortLabel: "Trier :",
    sortActiveSuffix: " (actif)",
    sortRelevance: "Pertinence",
    sortNewest: "Plus récentes d’abord",
    sortOldest: "Plus anciennes d’abord",

    // ── Footer ──
    footerBy: "par Caelex",

    // ── /scholar/jurisdictions ──
    jurisdictionsTitle: "Juridictions",
    jurisdictionsSubtitle:
      "{n} juridictions disposant de sources de droit spatial",

    // ── /scholar/jurisdictions/[code] ──
    backToJurisdictions: "Retour aux juridictions",
    legalSource: "source juridique",
    legalSources: "sources juridiques",
    competentAuthorities: "Autorités compétentes",
    nationalLaw: "Droit national",
    applicableInternationalLaw: "Droit international / UE applicable",
    viewWebsite: "Voir le site →",

    // ── Special jurisdiction names ──
    jurisdictionINT: "International",
    jurisdictionEU: "Union européenne",

    // ── Facet group headings ──
    groupType: "Type de source",
    groupJurisdiction: "Juridiction",
    groupArea: "Thème",
    groupDecade: "Chronologie",

    // ── Facet: legal-source TYPE labels ──
    typeInternationalTreaty: "Traité international",
    typeFederalLaw: "Loi nationale",
    typeFederalRegulation: "Règlement national",
    typeTechnicalStandard: "Norme technique",
    typeEuRegulation: "Règlement UE",
    typeEuDirective: "Directive UE",
    typePolicyDocument: "Document d’orientation",
    typeDraftLegislation: "Projet de loi",
    typeCertificationStandard: "Norme de certification",
    typeIndustryGuideline: "Ligne directrice sectorielle",
    typeInsuranceClause: "Clause d’assurance",
    typeScientificProtocol: "Protocole scientifique",
    typeSoftLawResolution: "Résolution de droit souple",
    typeNationalSecurityDoctrine: "Doctrine de sécurité nationale",
    typeBilateralAgreement: "Accord bilatéral",
    typeMultilateralAgreement: "Accord multilatéral",
    typeCaseLaw: "Jurisprudence",
    typeProcurementFramework: "Cadre des marchés publics",
    typeSafetyRegulation: "Réglementation de sécurité",
    typeTaxTreaty: "Convention de double imposition",

    // ── Facet: compliance THEME (area) labels ──
    areaLicensing: "Licences",
    areaRegistration: "Immatriculation",
    areaLiability: "Responsabilité",
    areaInsurance: "Assurance",
    areaCybersecurity: "Cybersécurité",
    areaExportControl: "Contrôle des exportations",
    areaDataSecurity: "Sécurité des données",
    areaFrequencySpectrum: "Spectre de fréquences",
    areaEnvironmental: "Environnement",
    areaDebrisMitigation: "Débris spatiaux",
    areaSpaceTrafficManagement: "Trafic spatial",
    areaHumanSpaceflight: "Vol spatial habité",
    areaMilitaryDualUse: "Militaire / double usage",
    areaCompetitionAntitrust: "Droit de la concurrence",
    areaStateAid: "Aides d’État",
    areaProcurement: "Marchés publics",
    areaTaxCustoms: "Fiscalité et douanes",
    areaSanctionsCompliance: "Sanctions",
    areaIpPatents: "Brevets et PI",
    areaProductLiability: "Responsabilité du fait des produits",
    areaFdiScreening: "Filtrage des investissements",
    areaAiCompliance: "Conformité IA",
    areaAmlKyc: "LBC / KYC",
    areaConsumerProtection: "Protection des consommateurs",
    areaEmploymentLabor: "Droit du travail",
    areaScientificResearch: "Science",
    areaMediaBroadcasting: "Médias et radiodiffusion",
    areaCriticalInfrastructure: "Infrastructures critiques",
    areaSustainabilityReporting: "Rapports de durabilité",

    // ── Facet: decade buckets (Chronology) ──
    decadePre1960: "Avant 1960",
    decade1960s: "Années 1960",
    decade1970s: "Années 1970",
    decade1980s: "Années 1980",
    decade1990s: "Années 1990",
    decade2000s: "Années 2000",
    decade2010s: "Années 2010",
    decade2020s: "Années 2020",
  },

  es: {
    // ── /scholar/library — header ──
    libraryTitle: "Biblioteca",
    librarySubtitle:
      "Explora todo el corpus de fuentes jurídicas por tipo, jurisdicción, tema y periodo",

    // ── Facet rail chrome ──
    filter: "Filtros",
    reset: "Restablecer",
    ariaFacetFilter: "Filtrar por facetas",
    ariaResults: "Resultados de búsqueda",
    activeFilters: "Filtros activos",
    removeFilterPrefix: "Quitar el filtro «",
    removeFilterSuffix: "»",

    // ── Count + cap + empty ──
    filteredSuffix: " (filtrado)",
    capNotice:
      "Se muestran las primeras {n} de {total} fuentes — ajusta los filtros para ver las demás.",
    emptyFilters:
      "No se encontraron fuentes para los filtros seleccionados. Quita un filtro o restablece la selección.",

    // ── Facet option sr-only state ──
    srSelectedRemove: ", seleccionado — quitar",
    srUnselectedSelect: ", {count} fuentes — seleccionar",

    // ── Sort control ──
    sortLabel: "Ordenar:",
    sortActiveSuffix: " (activo)",
    sortRelevance: "Relevancia",
    sortNewest: "Más recientes primero",
    sortOldest: "Más antiguas primero",

    // ── Footer ──
    footerBy: "por Caelex",

    // ── /scholar/jurisdictions ──
    jurisdictionsTitle: "Jurisdicciones",
    jurisdictionsSubtitle: "{n} jurisdicciones con fuentes de derecho espacial",

    // ── /scholar/jurisdictions/[code] ──
    backToJurisdictions: "Volver a jurisdicciones",
    legalSource: "fuente jurídica",
    legalSources: "fuentes jurídicas",
    competentAuthorities: "Autoridades competentes",
    nationalLaw: "Derecho nacional",
    applicableInternationalLaw: "Derecho internacional / de la UE aplicable",
    viewWebsite: "Ver el sitio web →",

    // ── Special jurisdiction names ──
    jurisdictionINT: "Internacional",
    jurisdictionEU: "Unión Europea",

    // ── Facet group headings ──
    groupType: "Tipo de fuente",
    groupJurisdiction: "Jurisdicción",
    groupArea: "Tema",
    groupDecade: "Cronología",

    // ── Facet: legal-source TYPE labels ──
    typeInternationalTreaty: "Tratado internacional",
    typeFederalLaw: "Ley nacional",
    typeFederalRegulation: "Reglamento nacional",
    typeTechnicalStandard: "Estándar técnico",
    typeEuRegulation: "Reglamento de la UE",
    typeEuDirective: "Directiva de la UE",
    typePolicyDocument: "Documento de política",
    typeDraftLegislation: "Proyecto de ley",
    typeCertificationStandard: "Estándar de certificación",
    typeIndustryGuideline: "Directriz sectorial",
    typeInsuranceClause: "Cláusula de seguro",
    typeScientificProtocol: "Protocolo científico",
    typeSoftLawResolution: "Resolución de derecho indicativo",
    typeNationalSecurityDoctrine: "Doctrina de seguridad nacional",
    typeBilateralAgreement: "Acuerdo bilateral",
    typeMultilateralAgreement: "Acuerdo multilateral",
    typeCaseLaw: "Jurisprudencia",
    typeProcurementFramework: "Marco de contratación",
    typeSafetyRegulation: "Reglamento de seguridad",
    typeTaxTreaty: "Convenio de doble imposición",

    // ── Facet: compliance THEME (area) labels ──
    areaLicensing: "Licencias",
    areaRegistration: "Registro",
    areaLiability: "Responsabilidad",
    areaInsurance: "Seguro",
    areaCybersecurity: "Ciberseguridad",
    areaExportControl: "Control de exportaciones",
    areaDataSecurity: "Seguridad de los datos",
    areaFrequencySpectrum: "Espectro de frecuencias",
    areaEnvironmental: "Medio ambiente",
    areaDebrisMitigation: "Basura espacial",
    areaSpaceTrafficManagement: "Tráfico espacial",
    areaHumanSpaceflight: "Vuelo espacial tripulado",
    areaMilitaryDualUse: "Militar / doble uso",
    areaCompetitionAntitrust: "Derecho de la competencia",
    areaStateAid: "Ayudas estatales",
    areaProcurement: "Contratación",
    areaTaxCustoms: "Impuestos y aduanas",
    areaSanctionsCompliance: "Sanciones",
    areaIpPatents: "Patentes y PI",
    areaProductLiability: "Responsabilidad por productos",
    areaFdiScreening: "Control de inversiones",
    areaAiCompliance: "Cumplimiento de IA",
    areaAmlKyc: "Prevención de blanqueo / KYC",
    areaConsumerProtection: "Protección del consumidor",
    areaEmploymentLabor: "Derecho laboral",
    areaScientificResearch: "Ciencia",
    areaMediaBroadcasting: "Medios y radiodifusión",
    areaCriticalInfrastructure: "Infraestructuras críticas",
    areaSustainabilityReporting: "Informes de sostenibilidad",

    // ── Facet: decade buckets (Chronology) ──
    decadePre1960: "Antes de 1960",
    decade1960s: "Años 1960",
    decade1970s: "Años 1970",
    decade1980s: "Años 1980",
    decade1990s: "Años 1990",
    decade2000s: "Años 2000",
    decade2010s: "Años 2010",
    decade2020s: "Años 2020",
  },
} as const satisfies ScholarNamespace;
