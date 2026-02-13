/**
 * ASTRA Regulatory Knowledge Base
 *
 * Central export for all regulatory knowledge modules.
 */

// EU Space Act
export {
  EU_SPACE_ACT_CHAPTERS,
  OPERATOR_TYPES,
  KEY_ARTICLES,
  EU_SPACE_ACT_SUMMARY,
  getArticleById,
  getArticleByNumber,
  getArticlesForOperatorType,
  getArticlesForChapter,
  searchArticles,
} from "./eu-space-act";

// NIS2
export {
  SPACE_SECTOR_CLASSIFICATION,
  NIS2_REQUIREMENT_CATEGORIES,
  NIS2_KEY_REQUIREMENTS,
  NIS2_PENALTIES,
  INCIDENT_NOTIFICATION_TIMELINE,
  NIS2_SUMMARY,
  classifyNIS2Entity,
  getRequirementsByCategory,
  getRequirementsForEntityType,
  searchRequirements,
} from "./nis2";
export type { NIS2EntityType, NIS2ClassificationCriteria } from "./nis2";

// Jurisdictions
export {
  JURISDICTION_PROFILES,
  FAVORABILITY_FACTORS,
  JURISDICTIONS_SUMMARY,
  getJurisdictionByCode,
  getJurisdictionsByFavorability,
  compareJurisdictions,
  getJurisdictionsWithInsuranceBelow,
  getJurisdictionsByProcessingTime,
} from "./jurisdictions";

// Cross-Regulation
export {
  CROSS_REGULATION_MAPPINGS,
  CROSS_REGULATION_SUMMARY,
  analyzeOverlap,
  getMappingsForRegulation,
  getMappingsForArticle,
  getSingleImplementationMappings,
} from "./cross-regulation-map";
export type { OverlapAnalysis } from "./cross-regulation-map";

// Glossary
export {
  GLOSSARY_TERMS,
  GLOSSARY_INDEX,
  getTermByAbbreviation,
  searchTerms,
  getTermsByContext,
  getRelatedTerms,
} from "./glossary";

// ─── Combined Knowledge Base Summary ───

export const REGULATORY_KNOWLEDGE_SUMMARY = `
ASTRA has access to comprehensive regulatory knowledge covering:

1. **EU Space Act (COM(2025) 335)**
   - 119 articles across 10 titles
   - 7 operator types (SCO, LO, LSO, ISOS, CAP, PDP, TCO)
   - Full authorization, registration, debris, insurance, and cybersecurity requirements

2. **NIS2 Directive (EU 2022/2555)**
   - Space sector classification (Annex I, Sector 11)
   - 10 requirement categories per Art. 21(2)(a-j)
   - Incident notification timeline (24h/72h/1 month)
   - Penalty structures for essential/important entities

3. **10 European Jurisdictions**
   - France, UK, Germany, Luxembourg, Netherlands, Belgium, Austria, Denmark, Italy, Norway
   - NCA details, processing times, insurance minimums, favorability scores
   - Language requirements and fee structures

4. **Cross-Regulation Mappings**
   - 18+ mappings between NIS2 ↔ EU Space Act ↔ ISO 27001 ↔ ENISA
   - Overlap analysis with effort savings estimates
   - Implementation priority recommendations

5. **Glossary**
   - 40+ terms covering operator types, regulatory bodies, technical concepts
   - Regulatory context references and related terms

This knowledge base enables ASTRA to provide accurate, cited responses with specific article references and confidence levels.
`;
