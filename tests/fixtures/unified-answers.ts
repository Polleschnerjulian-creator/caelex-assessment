/**
 * Unified Assessment Test Fixtures
 *
 * Pre-built `Partial<UnifiedAssessmentAnswers>` objects for the most common
 * assessment scenarios. Use these in unit and integration tests so test
 * intent is clear at the call site and the same scenarios are exercised
 * consistently across the suite.
 *
 * Each fixture is a *minimal* valid input — sufficient to drive the
 * unified mappers and engines through their main code paths without
 * adding noise. Tests can override individual fields by spreading:
 *
 *     const answers = { ...euLargeSCO, hasInsurance: false };
 *
 * If you need a fixture for a scenario that isn't here, add it rather
 * than copy-pasting the shape into a single test file.
 */

import { getDefaultUnifiedAnswers } from "@/lib/unified-assessment-types";
import type { UnifiedAssessmentAnswers } from "@/lib/unified-assessment-types";

/** Helper: build a complete UnifiedAssessmentAnswers from defaults + overrides. */
export function buildUnifiedAnswers(
  overrides: Partial<UnifiedAssessmentAnswers>,
): UnifiedAssessmentAnswers {
  return {
    ...getDefaultUnifiedAnswers(),
    ...overrides,
  };
}

// ─── Canonical happy paths ────────────────────────────────────────────────

/**
 * EU large spacecraft operator with full cybersecurity posture.
 * Expected outcome:
 *   - EU Space Act: standard regime, full applicable articles
 *   - NIS2: essential entity (Annex I, large)
 *   - National Space Law: applicable for FR/LU jurisdictions
 *   - Risk: low (no gaps)
 */
export const euLargeSCO: UnifiedAssessmentAnswers = buildUnifiedAnswers({
  companyName: "Acme Space SA",
  establishmentCountry: "DE",
  entitySize: "large",
  turnoverRange: "50m_250m",
  isResearchInstitution: false,
  activityTypes: ["SCO"],
  serviceTypes: ["SATCOM"],
  primaryOrbitalRegime: "LEO",
  operatesConstellation: false,
  constellationSize: null,
  spacecraftCount: 3,
  servesEUCustomers: true,
  isDefenseOnly: false,
  defenseInvolvement: "none",
  hasCybersecurityPolicy: true,
  hasRiskManagement: true,
  hasIncidentResponsePlan: true,
  hasBusinessContinuityPlan: true,
  hasSupplyChainSecurity: true,
  hasSecurityTraining: true,
  hasEncryption: true,
  hasAccessControl: true,
  hasVulnerabilityManagement: true,
  conductsPenetrationTesting: true,
  hasInsurance: true,
  interestedJurisdictions: ["FR", "LU"],
});

/**
 * Multi-activity operator: spacecraft + launch + in-space service.
 * Used to test merger logic for multi-activity EU Space Act results.
 */
export const multiActivityOperator: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "OrbitForge GmbH",
    establishmentCountry: "FR",
    entitySize: "large",
    turnoverRange: "50m_250m",
    activityTypes: ["SCO", "LO", "ISOS"],
    serviceTypes: ["SATCOM", "SERVICING"],
    primaryOrbitalRegime: "LEO",
    operatesConstellation: true,
    constellationSize: "medium",
    spacecraftCount: 50,
    servesEUCustomers: true,
    isDefenseOnly: false,
    defenseInvolvement: "none",
    hasDebrisMitigationPlan: true,
    hasCybersecurityPolicy: true,
    hasRiskManagement: true,
    interestedJurisdictions: ["FR"],
  });

// ─── Out-of-scope / exempt scenarios ──────────────────────────────────────

/**
 * Defense-only operator (Art. 2(3) exemption).
 * Expected: EU Space Act regime = "out_of_scope" / "defense_exempt"
 */
export const defenseOnlyOperator: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "Govt Defense Sat Authority",
    establishmentCountry: "FR",
    entitySize: "large",
    activityTypes: ["SCO"],
    serviceTypes: ["SATCOM"],
    primaryOrbitalRegime: "GEO",
    isDefenseOnly: true,
    defenseInvolvement: "full",
    servesEUCustomers: false,
    interestedJurisdictions: [],
  });

/**
 * Third country operator with NO EU services.
 * Expected: EU Space Act = out of scope (no jurisdiction);
 *           NIS2 = out_of_scope (not EU established, no EU services).
 */
export const thirdCountryNoEUServices: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "American Sats Inc",
    establishmentCountry: "US",
    entitySize: "large",
    activityTypes: ["SCO"],
    serviceTypes: ["SATCOM"],
    primaryOrbitalRegime: "LEO",
    spacecraftCount: 5,
    servesEUCustomers: false,
    providesServicesToEU: false,
    isDefenseOnly: false,
    interestedJurisdictions: [],
  });

/**
 * Third country operator WITH EU services.
 * Expected: EU Space Act = TCO obligations (Art. 20);
 *           NIS2 = important + Art. 26 representative obligation.
 */
export const thirdCountryWithEUServices: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "Global Sat Co",
    establishmentCountry: "US",
    entitySize: "large",
    activityTypes: ["TCO"],
    serviceTypes: ["SATCOM"],
    primaryOrbitalRegime: "GEO",
    spacecraftCount: 12,
    servesEUCustomers: true,
    providesServicesToEU: true,
    isDefenseOnly: false,
    interestedJurisdictions: [],
  });

// ─── Edge cases ───────────────────────────────────────────────────────────

/**
 * Micro research institution. Light-regime eligible, NIS2 out of scope.
 */
export const microResearchInstitution: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "Space Research Lab",
    establishmentCountry: "NL",
    entitySize: "micro",
    isResearchInstitution: true,
    activityTypes: ["SCO"],
    serviceTypes: ["EO"],
    primaryOrbitalRegime: "SSO",
    operatesConstellation: false,
    spacecraftCount: 1,
    servesEUCustomers: true,
    isDefenseOnly: false,
    defenseInvolvement: "none",
    interestedJurisdictions: ["NL"],
  });

/**
 * Small entity in space sector — should be out of scope by default per NIS2
 * Art. 2(1). Used to verify the small-entity classification fix.
 */
export const smallNonCriticalSpaceEntity: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "Tiny Sat Analytics",
    establishmentCountry: "ES",
    entitySize: "small",
    turnoverRange: "2m_10m",
    activityTypes: ["PDP"],
    serviceTypes: ["EO"],
    primaryOrbitalRegime: "LEO",
    servesEUCustomers: true,
    isDefenseOnly: false,
    designatedByMemberState: false,
    interestedJurisdictions: ["ES"],
  });

/**
 * Member-state-designated small entity (Art. 2(2)).
 * Should be in scope despite small size.
 */
export const designatedSmallEntity: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "Critical Ground Station Co",
    establishmentCountry: "IT",
    entitySize: "small",
    turnoverRange: "2m_10m",
    activityTypes: ["SCO"],
    serviceTypes: ["SATCOM"],
    primaryOrbitalRegime: "GEO",
    servesEUCustomers: true,
    isDefenseOnly: false,
    designatedByMemberState: true,
    interestedJurisdictions: ["IT"],
  });

/**
 * Mega constellation — for testing constellation-specific priority actions.
 */
export const megaConstellationOperator: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "MegaConst Networks",
    establishmentCountry: "FR",
    entitySize: "large",
    turnoverRange: "over_250m",
    activityTypes: ["SCO"],
    serviceTypes: ["SATCOM"],
    primaryOrbitalRegime: "LEO",
    operatesConstellation: true,
    constellationSize: "mega",
    spacecraftCount: 4000,
    servesEUCustomers: true,
    isDefenseOnly: false,
    interestedJurisdictions: ["FR", "LU"],
  });

/**
 * Operator with no answered cybersecurity questions — used to verify the
 * null = unanswered = no-gap behaviour (gaps only count once at least one
 * cyber question has been answered).
 */
export const earlyStageNoCyberAnswers: UnifiedAssessmentAnswers =
  buildUnifiedAnswers({
    companyName: "Brand New Operator",
    establishmentCountry: "DE",
    entitySize: "medium",
    activityTypes: ["SCO"],
    serviceTypes: ["EO"],
    primaryOrbitalRegime: "LEO",
    servesEUCustomers: true,
    isDefenseOnly: false,
    interestedJurisdictions: [],
    // Cybersecurity questions all left as null (default)
  });
