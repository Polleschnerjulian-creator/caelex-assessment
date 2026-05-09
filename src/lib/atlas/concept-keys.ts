/**
 * Atlas Comparator — canonical concept keys.
 *
 * Atlas-Lawyer-UX-Audit BUG-A1: the comparator (`ComparisonTable.tsx`)
 * and the forecast engine (`forecast-engine.ts`) used to declare their
 * concept keys independently and DRIFTED OUT OF SYNC. Examples that
 * silently broke the ForecastBadge render:
 *
 *   - ComparisonTable row used `min_coverage`
 *     forecast-engine emitted `minimum_coverage`
 *
 *   - ComparisonTable row used `debris_plan`
 *     forecast-engine emitted `debris_mitigation_plan`
 *
 * Result: when Marie dragged the slider to Q4 2027, ForecastBadges
 * appeared on `mandatory_insurance` and `liability_regime` rows but
 * NOT on min-coverage / debris-plan / EU-readiness rows that the
 * engine actually marked affected. Silent bug — no console error,
 * no test catch.
 *
 * This module is the single source of truth. Both sides MUST import
 * from here. New comparator concepts add a constant; forecast events
 * reference the constant. TypeScript's literal-type tracking makes
 * accidental string drift compile-time visible.
 */

/* The full set of concept keys the comparator + forecast engine know
   about. Adding a new row to `ComparisonTable` or a new event-mapping
   to `forecast-engine.ts` should add the key here first. */
export const CONCEPT_KEYS = {
  /* ── Authorization ── */
  LICENSING_AUTHORITY: "licensing_authority",
  LEGISLATION: "legislation",
  STATUS: "status",
  LICENSING_REQUIREMENTS: "licensing_requirements",

  /* ── Insurance / liability ── */
  MANDATORY_INSURANCE: "mandatory_insurance",
  /* Was previously two divergent values: `min_coverage` (table) vs
     `minimum_coverage` (forecast). Canonicalised to the longer form
     because it's more searchable and matches the LegalSource.compliance_areas
     vocabulary. */
  MINIMUM_COVERAGE: "minimum_coverage",
  LIABILITY_REGIME: "liability_regime",
  LIABILITY_CAP: "liability_cap",
  THIRD_PARTY_REQUIRED: "third_party_required",
  GOV_INDEMNIFICATION: "gov_indemnification",
  INDEMNIFICATION_CAP: "indemnification_cap",

  /* ── Debris ── */
  DEORBIT_REQUIREMENT: "deorbit_requirement",
  DEORBIT_TIMELINE: "deorbit_timeline",
  PASSIVATION: "passivation",
  /* Was previously two divergent values: `debris_plan` (table) vs
     `debris_mitigation_plan` (forecast). Canonicalised to the longer
     form for the same reason as MINIMUM_COVERAGE. */
  DEBRIS_MITIGATION_PLAN: "debris_mitigation_plan",
  COLLISION_AVOIDANCE: "collision_avoidance",
  STANDARDS: "standards",

  /* ── Registration ── */
  NATIONAL_REGISTRY: "national_registry",
  REGISTRY_NAME: "registry_name",
  UN_REGISTRATION: "un_registration",

  /* ── Timeline / costs ── */
  ANNUAL_FEE: "annual_fee",
  OTHER_COSTS: "other_costs",

  /* ── EU readiness ── */
  EU_SPACE_ACT_READINESS: "eu_space_act_readiness",
  RELATIONSHIP: "relationship",
  DESCRIPTION: "description",
  KEY_ARTICLES: "key_articles",
  TRANSITION_NOTES: "transition_notes",

  /* ── Cybersecurity (NIS2 territory — forecast emits, table doesn't yet
     have a dedicated row but may in future). */
  CYBERSECURITY_REGIME: "cybersecurity_regime",
} as const;

/** Type of any valid concept key. New rows MUST be added to CONCEPT_KEYS
    above to be assignable here. */
export type ConceptKey = (typeof CONCEPT_KEYS)[keyof typeof CONCEPT_KEYS];
