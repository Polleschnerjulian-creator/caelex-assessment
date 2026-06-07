/**
 * Caelex Scholar — spotlight-search home namespace (`search`).
 *
 * Every user-visible UI string of the search home (src/app/(scholar)/scholar/
 * page.tsx): the time-of-day greeting, the search + jurisdiction inputs, the
 * idle stats line, loading / error / no-results states, the result-count +
 * search-mode signal, the empty-state example chips and entry cards, the
 * results section heading and show-all toggles, and the legal footer.
 *
 * EN is the source of truth; the `de` values are the strings previously
 * hardcoded in page.tsx. it/fr/es are domain-appropriate legal/academic
 * translations.
 *
 * Shared terms live in `common` and are reused via t(locale, COMMON, "key").
 * The search rows render FULL-form source-type eyebrows (a wider column than
 * SourceRow's abbreviated `rowType*` labels), so those full labels live here as
 * `type*` keys — the exact strings the page rendered before i18n.
 *
 * A handful of values carry {tokens} replaced at the call site:
 *   - resultOne / resultMany : the count is rendered separately
 *   - noResultsLive          : "No results for {query}."
 *   - noResultsHint          : "No results for “{query}” — …"
 *   - showAll                : "Show all {total}"
 *
 * Resolve with: t(locale, SEARCH, "key")
 */
import type { ScholarLocale, ScholarNamespace } from "./core";
import { DEFAULT_SCHOLAR_LOCALE } from "./core";

export const SEARCH = {
  en: {
    // ── Time-of-day greeting (page picks one by the local hour) ──
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",

    // ── Page title (sr-only) ──
    pageTitle: "Caelex Scholar — search legal sources",

    // ── Search input ──
    searchLabel: "Search legal sources",
    searchPlaceholder: "Search legal sources, laws, regulations …",

    // ── Jurisdiction filter ──
    jurisdictionLabel: "Jurisdiction:",
    jurisdictionPlaceholder: "e.g. DE, EU, FR …",

    // ── Idle stats line ──
    statsSearchSpaceLaw: "Search space law",
    statsLawsRegulations: "Laws & regulations",
    statsMultipleJurisdictions: "multiple jurisdictions",

    // ── Loading ──
    searching: "Searching legal sources…",

    // ── Errors ──
    searchFailed: "The search failed. Please try again.",
    networkError: "Network error. Please check your connection.",

    // ── AI transparency disclosure (EU AI Act Art. 50) ──
    // Persistent monochrome notice near the search input + on results:
    // results are AI-ranked → verify against the official source; research
    // aid, not legal advice.
    aiDisclosureLabel: "About these results",
    aiDisclosure:
      "Results are ranked with AI semantic search — verify against the official source. Caelex Scholar is a research aid, not legal advice.",

    // ── Result count + search-mode signal ──
    resultOne: "result",
    resultMany: "results",
    resultsFoundLive: "{count} results found.",
    semanticActive: "Semantic search active",
    keywordSearch: "Keyword search",

    // ── No results ──
    noResultsLive: "No matches for {query}.",
    noResultsHint:
      "No matches for “{query}” — try different terms or another jurisdiction.",

    // ── Empty-state: chips ──
    exampleSearches: "Example searches",

    // ── Empty-state: entry cards ──
    explore: "Explore",
    cardJurisdictionsLabel: "Jurisdictions",
    cardJurisdictionsDesc: "Legal sources by country or region",
    cardLibraryLabel: "Library",
    cardLibraryDesc: "Filter and search all sources",
    cardCasesLabel: "Case law",
    cardCasesDesc: "Decisions and enforcement actions",

    // ── Results section ──
    resultsAriaLabel: "Search results",
    resultsHeading: "Legal sources",
    showAll: "Show all {total}",
    showLess: "Show less",

    // ── Legal footer ──
    footerScholar: "Scholar",
    footerByCaelex: "by Caelex",
    footerNoAdviceLead: "Not legal advice.",
    footerNoAdviceBody:
      "Caelex Scholar is a research and information tool. The information, data and analyses provided do not constitute legal, compliance or other professional advice. Users must verify all information independently and consult qualified legal counsel.",
    footerNoWarrantyLead: "No warranty.",
    footerNoWarrantyBody:
      "Caelex makes no warranty as to the accuracy, completeness or timeliness of the data. Regulatory frameworks may change without notice.",
    footerRightsReserved: "All rights reserved",
    footerLegalLinksLabel: "Legal links",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerImprint: "Imprint",

    // ── Result-type eyebrows (full-form, wider column than SourceRow) ──
    typeInternationalTreaty: "Treaty",
    typeFederalLaw: "Law",
    typeFederalRegulation: "Regulation",
    typeTechnicalStandard: "Standard",
    typeEuRegulation: "EU Regulation",
    typeEuDirective: "EU Directive",
    typePolicyDocument: "Guidance",
    typeDraftLegislation: "Draft",
    typeCertificationStandard: "Certification",
    typeIndustryGuideline: "Guideline",
    typeInsuranceClause: "Clause",
    typeScientificProtocol: "Protocol",
    typeSoftLawResolution: "Resolution",
    typeNationalSecurityDoctrine: "Doctrine",
    typeBilateralAgreement: "Bilateral",
    typeMultilateralAgreement: "Multilateral",
    typeCaseLaw: "Case law",
    typeProcurementFramework: "Procurement",
    typeSafetyRegulation: "Safety",
    typeTaxTreaty: "Tax",
  },

  de: {
    // ── Time-of-day greeting ──
    greetingMorning: "Guten Morgen",
    greetingAfternoon: "Guten Tag",
    greetingEvening: "Guten Abend",

    // ── Page title (sr-only) ──
    pageTitle: "Caelex Scholar — Rechtsquellen durchsuchen",

    // ── Search input ──
    searchLabel: "Rechtsquellen durchsuchen",
    searchPlaceholder: "Rechtsquellen, Gesetze, Verordnungen durchsuchen …",

    // ── Jurisdiction filter ──
    jurisdictionLabel: "Jurisdiction:",
    jurisdictionPlaceholder: "z.B. DE, EU, FR …",

    // ── Idle stats line ──
    statsSearchSpaceLaw: "Weltraumrecht durchsuchen",
    statsLawsRegulations: "Gesetze & Verordnungen",
    statsMultipleJurisdictions: "mehrere Jurisdiktionen",

    // ── Loading ──
    searching: "Durchsuche Rechtsquellen…",

    // ── Errors ──
    searchFailed: "Die Suche ist fehlgeschlagen. Bitte versuche es erneut.",
    networkError: "Netzwerkfehler. Bitte prüfe deine Verbindung.",

    // ── AI transparency disclosure (EU AI Act Art. 50) ──
    aiDisclosureLabel: "Über diese Ergebnisse",
    aiDisclosure:
      "Die Ergebnisse werden mit KI-gestützter semantischer Suche sortiert — bitte mit der amtlichen Quelle abgleichen. Caelex Scholar ist ein Recherchewerkzeug und keine Rechtsberatung.",

    // ── Result count + search-mode signal ──
    resultOne: "Ergebnis",
    resultMany: "Ergebnisse",
    resultsFoundLive: "{count} Ergebnisse gefunden.",
    semanticActive: "Semantische Suche aktiv",
    keywordSearch: "Stichwortsuche",

    // ── No results ──
    noResultsLive: "Keine Treffer für {query}.",
    noResultsHint:
      "Keine Treffer für „{query}“ — andere Suchbegriffe oder Jurisdiction versuchen.",

    // ── Empty-state: chips ──
    exampleSearches: "Beispielsuchen",

    // ── Empty-state: entry cards ──
    explore: "Erkunden",
    cardJurisdictionsLabel: "Jurisdiktionen",
    cardJurisdictionsDesc: "Rechtsquellen nach Land oder Region",
    cardLibraryLabel: "Bibliothek",
    cardLibraryDesc: "Alle Quellen filtern und durchsuchen",
    cardCasesLabel: "Rechtsprechung",
    cardCasesDesc: "Urteile und Durchsetzungsmaßnahmen",

    // ── Results section ──
    resultsAriaLabel: "Suchergebnisse",
    resultsHeading: "Rechtsquellen",
    showAll: "Alle {total} anzeigen",
    showLess: "Weniger anzeigen",

    // ── Legal footer ──
    footerScholar: "Scholar",
    footerByCaelex: "by Caelex",
    footerNoAdviceLead: "Kein Rechtsrat.",
    footerNoAdviceBody:
      "Caelex Scholar ist ein Recherche- und Informationswerkzeug. Die bereitgestellten Informationen, Daten und Analysen stellen keine Rechts-, Compliance- oder sonstige professionelle Beratung dar. Nutzer müssen alle Informationen eigenständig verifizieren und qualifizierte Rechtsberatung hinzuziehen.",
    footerNoWarrantyLead: "Keine Gewähr.",
    footerNoWarrantyBody:
      "Caelex übernimmt keine Gewähr für Richtigkeit, Vollständigkeit oder Aktualität der Daten. Regulatorische Rahmenbedingungen können sich ohne Vorankündigung ändern.",
    footerRightsReserved: "Alle Rechte vorbehalten",
    footerLegalLinksLabel: "Rechtliche Links",
    footerPrivacy: "Datenschutz",
    footerTerms: "AGB",
    footerImprint: "Impressum",

    // ── Result-type eyebrows (full-form, wider column than SourceRow) ──
    typeInternationalTreaty: "Vertrag",
    typeFederalLaw: "Gesetz",
    typeFederalRegulation: "Verordnung",
    typeTechnicalStandard: "Standard",
    typeEuRegulation: "EU-Verordnung",
    typeEuDirective: "EU-Richtlinie",
    typePolicyDocument: "Leitlinie",
    typeDraftLegislation: "Entwurf",
    typeCertificationStandard: "Zertifizierung",
    typeIndustryGuideline: "Leitfaden",
    typeInsuranceClause: "Klausel",
    typeScientificProtocol: "Protokoll",
    typeSoftLawResolution: "Resolution",
    typeNationalSecurityDoctrine: "Doktrin",
    typeBilateralAgreement: "Bilateral",
    typeMultilateralAgreement: "Multilateral",
    typeCaseLaw: "Rechtsprechung",
    typeProcurementFramework: "Vergabe",
    typeSafetyRegulation: "Sicherheit",
    typeTaxTreaty: "Steuer",
  },

  it: {
    // ── Time-of-day greeting ──
    greetingMorning: "Buongiorno",
    greetingAfternoon: "Buon pomeriggio",
    greetingEvening: "Buonasera",

    // ── Page title (sr-only) ──
    pageTitle: "Caelex Scholar — cerca fonti normative",

    // ── Search input ──
    searchLabel: "Cerca fonti normative",
    searchPlaceholder: "Cerca fonti normative, leggi, regolamenti …",

    // ── Jurisdiction filter ──
    jurisdictionLabel: "Giurisdizione:",
    jurisdictionPlaceholder: "es. DE, EU, FR …",

    // ── Idle stats line ──
    statsSearchSpaceLaw: "Cerca nel diritto spaziale",
    statsLawsRegulations: "Leggi e regolamenti",
    statsMultipleJurisdictions: "più giurisdizioni",

    // ── Loading ──
    searching: "Ricerca delle fonti normative…",

    // ── Errors ──
    searchFailed: "La ricerca non è riuscita. Riprova.",
    networkError: "Errore di rete. Controlla la connessione.",

    // ── AI transparency disclosure (EU AI Act Art. 50) ──
    aiDisclosureLabel: "Informazioni su questi risultati",
    aiDisclosure:
      "I risultati sono ordinati con ricerca semantica basata sull’IA — verifica sempre con la fonte ufficiale. Caelex Scholar è uno strumento di ricerca, non una consulenza legale.",

    // ── Result count + search-mode signal ──
    resultOne: "risultato",
    resultMany: "risultati",
    resultsFoundLive: "{count} risultati trovati.",
    semanticActive: "Ricerca semantica attiva",
    keywordSearch: "Ricerca per parole chiave",

    // ── No results ──
    noResultsLive: "Nessun risultato per {query}.",
    noResultsHint:
      "Nessun risultato per «{query}» — prova altri termini o un’altra giurisdizione.",

    // ── Empty-state: chips ──
    exampleSearches: "Ricerche di esempio",

    // ── Empty-state: entry cards ──
    explore: "Esplora",
    cardJurisdictionsLabel: "Giurisdizioni",
    cardJurisdictionsDesc: "Fonti normative per Paese o regione",
    cardLibraryLabel: "Biblioteca",
    cardLibraryDesc: "Filtra e cerca tutte le fonti",
    cardCasesLabel: "Giurisprudenza",
    cardCasesDesc: "Sentenze e provvedimenti sanzionatori",

    // ── Results section ──
    resultsAriaLabel: "Risultati della ricerca",
    resultsHeading: "Fonti normative",
    showAll: "Mostra tutti i {total}",
    showLess: "Mostra meno",

    // ── Legal footer ──
    footerScholar: "Scholar",
    footerByCaelex: "by Caelex",
    footerNoAdviceLead: "Non costituisce consulenza legale.",
    footerNoAdviceBody:
      "Caelex Scholar è uno strumento di ricerca e informazione. Le informazioni, i dati e le analisi forniti non costituiscono consulenza legale, di conformità o di altro tipo professionale. Gli utenti devono verificare autonomamente tutte le informazioni e rivolgersi a un legale qualificato.",
    footerNoWarrantyLead: "Nessuna garanzia.",
    footerNoWarrantyBody:
      "Caelex non fornisce alcuna garanzia in merito all’accuratezza, alla completezza o all’attualità dei dati. I quadri normativi possono cambiare senza preavviso.",
    footerRightsReserved: "Tutti i diritti riservati",
    footerLegalLinksLabel: "Link legali",
    footerPrivacy: "Privacy",
    footerTerms: "Termini",
    footerImprint: "Note legali",

    // ── Result-type eyebrows (full-form, wider column than SourceRow) ──
    typeInternationalTreaty: "Trattato",
    typeFederalLaw: "Legge",
    typeFederalRegulation: "Regolamento",
    typeTechnicalStandard: "Standard",
    typeEuRegulation: "Regolamento UE",
    typeEuDirective: "Direttiva UE",
    typePolicyDocument: "Linee guida",
    typeDraftLegislation: "Bozza",
    typeCertificationStandard: "Certificazione",
    typeIndustryGuideline: "Linea guida",
    typeInsuranceClause: "Clausola",
    typeScientificProtocol: "Protocollo",
    typeSoftLawResolution: "Risoluzione",
    typeNationalSecurityDoctrine: "Dottrina",
    typeBilateralAgreement: "Bilaterale",
    typeMultilateralAgreement: "Multilaterale",
    typeCaseLaw: "Giurisprudenza",
    typeProcurementFramework: "Appalti",
    typeSafetyRegulation: "Sicurezza",
    typeTaxTreaty: "Fiscale",
  },

  fr: {
    // ── Time-of-day greeting ──
    greetingMorning: "Bonjour",
    greetingAfternoon: "Bon après-midi",
    greetingEvening: "Bonsoir",

    // ── Page title (sr-only) ──
    pageTitle: "Caelex Scholar — rechercher des sources juridiques",

    // ── Search input ──
    searchLabel: "Rechercher des sources juridiques",
    searchPlaceholder: "Rechercher des sources juridiques, lois, règlements …",

    // ── Jurisdiction filter ──
    jurisdictionLabel: "Juridiction :",
    jurisdictionPlaceholder: "p. ex. DE, EU, FR …",

    // ── Idle stats line ──
    statsSearchSpaceLaw: "Rechercher dans le droit spatial",
    statsLawsRegulations: "Lois et règlements",
    statsMultipleJurisdictions: "plusieurs juridictions",

    // ── Loading ──
    searching: "Recherche des sources juridiques…",

    // ── Errors ──
    searchFailed: "La recherche a échoué. Veuillez réessayer.",
    networkError: "Erreur réseau. Veuillez vérifier votre connexion.",

    // ── AI transparency disclosure (EU AI Act Art. 50) ──
    aiDisclosureLabel: "À propos de ces résultats",
    aiDisclosure:
      "Les résultats sont classés par recherche sémantique assistée par IA — vérifiez auprès de la source officielle. Caelex Scholar est un outil de recherche, et non un avis juridique.",

    // ── Result count + search-mode signal ──
    resultOne: "résultat",
    resultMany: "résultats",
    resultsFoundLive: "{count} résultats trouvés.",
    semanticActive: "Recherche sémantique active",
    keywordSearch: "Recherche par mots-clés",

    // ── No results ──
    noResultsLive: "Aucun résultat pour {query}.",
    noResultsHint:
      "Aucun résultat pour « {query} » — essayez d’autres termes ou une autre juridiction.",

    // ── Empty-state: chips ──
    exampleSearches: "Exemples de recherche",

    // ── Empty-state: entry cards ──
    explore: "Explorer",
    cardJurisdictionsLabel: "Juridictions",
    cardJurisdictionsDesc: "Sources juridiques par pays ou région",
    cardLibraryLabel: "Bibliothèque",
    cardLibraryDesc: "Filtrer et rechercher toutes les sources",
    cardCasesLabel: "Jurisprudence",
    cardCasesDesc: "Décisions et mesures d’exécution",

    // ── Results section ──
    resultsAriaLabel: "Résultats de recherche",
    resultsHeading: "Sources juridiques",
    showAll: "Afficher les {total}",
    showLess: "Afficher moins",

    // ── Legal footer ──
    footerScholar: "Scholar",
    footerByCaelex: "by Caelex",
    footerNoAdviceLead: "Ne constitue pas un avis juridique.",
    footerNoAdviceBody:
      "Caelex Scholar est un outil de recherche et d’information. Les informations, données et analyses fournies ne constituent pas un avis juridique, de conformité ou tout autre conseil professionnel. Les utilisateurs doivent vérifier toutes les informations de manière indépendante et consulter un conseiller juridique qualifié.",
    footerNoWarrantyLead: "Aucune garantie.",
    footerNoWarrantyBody:
      "Caelex ne garantit ni l’exactitude, ni l’exhaustivité, ni l’actualité des données. Les cadres réglementaires peuvent changer sans préavis.",
    footerRightsReserved: "Tous droits réservés",
    footerLegalLinksLabel: "Liens juridiques",
    footerPrivacy: "Confidentialité",
    footerTerms: "CGU",
    footerImprint: "Mentions légales",

    // ── Result-type eyebrows (full-form, wider column than SourceRow) ──
    typeInternationalTreaty: "Traité",
    typeFederalLaw: "Loi",
    typeFederalRegulation: "Règlement",
    typeTechnicalStandard: "Norme",
    typeEuRegulation: "Règlement UE",
    typeEuDirective: "Directive UE",
    typePolicyDocument: "Orientations",
    typeDraftLegislation: "Projet",
    typeCertificationStandard: "Certification",
    typeIndustryGuideline: "Ligne directrice",
    typeInsuranceClause: "Clause",
    typeScientificProtocol: "Protocole",
    typeSoftLawResolution: "Résolution",
    typeNationalSecurityDoctrine: "Doctrine",
    typeBilateralAgreement: "Bilatéral",
    typeMultilateralAgreement: "Multilatéral",
    typeCaseLaw: "Jurisprudence",
    typeProcurementFramework: "Marchés",
    typeSafetyRegulation: "Sécurité",
    typeTaxTreaty: "Fiscal",
  },

  es: {
    // ── Time-of-day greeting ──
    greetingMorning: "Buenos días",
    greetingAfternoon: "Buenas tardes",
    greetingEvening: "Buenas noches",

    // ── Page title (sr-only) ──
    pageTitle: "Caelex Scholar — buscar fuentes jurídicas",

    // ── Search input ──
    searchLabel: "Buscar fuentes jurídicas",
    searchPlaceholder: "Buscar fuentes jurídicas, leyes, reglamentos …",

    // ── Jurisdiction filter ──
    jurisdictionLabel: "Jurisdicción:",
    jurisdictionPlaceholder: "p. ej. DE, EU, FR …",

    // ── Idle stats line ──
    statsSearchSpaceLaw: "Buscar en el Derecho espacial",
    statsLawsRegulations: "Leyes y reglamentos",
    statsMultipleJurisdictions: "varias jurisdicciones",

    // ── Loading ──
    searching: "Buscando fuentes jurídicas…",

    // ── Errors ──
    searchFailed: "La búsqueda ha fallado. Inténtalo de nuevo.",
    networkError: "Error de red. Comprueba tu conexión.",

    // ── AI transparency disclosure (EU AI Act Art. 50) ──
    aiDisclosureLabel: "Acerca de estos resultados",
    aiDisclosure:
      "Los resultados se ordenan mediante búsqueda semántica con IA — verifícalos con la fuente oficial. Caelex Scholar es una herramienta de investigación, no asesoramiento jurídico.",

    // ── Result count + search-mode signal ──
    resultOne: "resultado",
    resultMany: "resultados",
    resultsFoundLive: "{count} resultados encontrados.",
    semanticActive: "Búsqueda semántica activa",
    keywordSearch: "Búsqueda por palabras clave",

    // ── No results ──
    noResultsLive: "Sin resultados para {query}.",
    noResultsHint:
      "Sin resultados para «{query}» — prueba otros términos u otra jurisdicción.",

    // ── Empty-state: chips ──
    exampleSearches: "Búsquedas de ejemplo",

    // ── Empty-state: entry cards ──
    explore: "Explorar",
    cardJurisdictionsLabel: "Jurisdicciones",
    cardJurisdictionsDesc: "Fuentes jurídicas por país o región",
    cardLibraryLabel: "Biblioteca",
    cardLibraryDesc: "Filtrar y buscar todas las fuentes",
    cardCasesLabel: "Jurisprudencia",
    cardCasesDesc: "Sentencias y medidas de ejecución",

    // ── Results section ──
    resultsAriaLabel: "Resultados de búsqueda",
    resultsHeading: "Fuentes jurídicas",
    showAll: "Mostrar los {total}",
    showLess: "Mostrar menos",

    // ── Legal footer ──
    footerScholar: "Scholar",
    footerByCaelex: "by Caelex",
    footerNoAdviceLead: "No constituye asesoramiento jurídico.",
    footerNoAdviceBody:
      "Caelex Scholar es una herramienta de investigación e información. La información, los datos y los análisis facilitados no constituyen asesoramiento jurídico, de cumplimiento ni de otro tipo profesional. Los usuarios deben verificar toda la información de forma independiente y consultar a un asesor jurídico cualificado.",
    footerNoWarrantyLead: "Sin garantía.",
    footerNoWarrantyBody:
      "Caelex no garantiza la exactitud, integridad o actualidad de los datos. Los marcos normativos pueden cambiar sin previo aviso.",
    footerRightsReserved: "Todos los derechos reservados",
    footerLegalLinksLabel: "Enlaces legales",
    footerPrivacy: "Privacidad",
    footerTerms: "Condiciones",
    footerImprint: "Aviso legal",

    // ── Result-type eyebrows (full-form, wider column than SourceRow) ──
    typeInternationalTreaty: "Tratado",
    typeFederalLaw: "Ley",
    typeFederalRegulation: "Reglamento",
    typeTechnicalStandard: "Estándar",
    typeEuRegulation: "Reglamento UE",
    typeEuDirective: "Directiva UE",
    typePolicyDocument: "Directrices",
    typeDraftLegislation: "Borrador",
    typeCertificationStandard: "Certificación",
    typeIndustryGuideline: "Directriz",
    typeInsuranceClause: "Cláusula",
    typeScientificProtocol: "Protocolo",
    typeSoftLawResolution: "Resolución",
    typeNationalSecurityDoctrine: "Doctrina",
    typeBilateralAgreement: "Bilateral",
    typeMultilateralAgreement: "Multilateral",
    typeCaseLaw: "Jurisprudencia",
    typeProcurementFramework: "Contratación",
    typeSafetyRegulation: "Seguridad",
    typeTaxTreaty: "Fiscal",
  },
} as const satisfies ScholarNamespace;

/**
 * Example-search chips for the idle empty state.
 *
 * These are example *queries* a user clicks to seed the search box, not UI
 * chrome — so they are localized per reading locale (a French reader sees the
 * example searches in French). Proper nouns that are the same across languages
 * (EU Space Act, NIS2, ITAR) are kept; the descriptive ones are translated.
 * Falls back to EN for any unknown locale.
 */
const EXAMPLE_CHIPS_BY_LOCALE: Record<ScholarLocale, readonly string[]> = {
  en: [
    "Outer Space Treaty",
    "NIS2 Directive",
    "EU Space Act",
    "Space debris mitigation",
    "Launch authorisation",
    "ITAR regulations",
  ],
  de: [
    "Weltraumvertrag",
    "NIS2-Richtlinie",
    "EU Space Act",
    "Vermeidung von Weltraummüll",
    "Startgenehmigung",
    "ITAR-Vorschriften",
  ],
  it: [
    "Trattato sullo spazio extra-atmosferico",
    "Direttiva NIS2",
    "EU Space Act",
    "Mitigazione dei detriti spaziali",
    "Autorizzazione al lancio",
    "Normativa ITAR",
  ],
  fr: [
    "Traité sur l’espace extra-atmosphérique",
    "Directive NIS2",
    "EU Space Act",
    "Réduction des débris spatiaux",
    "Autorisation de lancement",
    "Réglementation ITAR",
  ],
  es: [
    "Tratado sobre el espacio ultraterrestre",
    "Directiva NIS2",
    "EU Space Act",
    "Mitigación de la basura espacial",
    "Autorización de lanzamiento",
    "Normativa ITAR",
  ],
};

/** Example-search chips for the given locale (falls back to EN). */
export function exampleChips(locale: ScholarLocale): readonly string[] {
  return (
    EXAMPLE_CHIPS_BY_LOCALE[locale] ??
    EXAMPLE_CHIPS_BY_LOCALE[DEFAULT_SCHOLAR_LOCALE]
  );
}
