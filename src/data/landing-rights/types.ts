/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Landing Rights type system. Zod schemas double as runtime validators
 * (used in types.test.ts to catch malformed content files at test time).
 */

import { z } from "zod";
import { JURISDICTION_CODES } from "./_helpers";

export const LandingRightsCategorySchema = z.enum([
  "market_access",
  "itu_coordination",
  "earth_station",
  "re_entry",
]);
export type LandingRightsCategory = z.infer<typeof LandingRightsCategorySchema>;

export const RegimeTypeSchema = z.enum([
  "two_track",
  "telecoms_only",
  "space_act_only",
  "emerging",
]);
export type RegimeType = z.infer<typeof RegimeTypeSchema>;

export const CoverageDepthSchema = z.enum(["deep", "standard", "stub"]);
export type CoverageDepth = z.infer<typeof CoverageDepthSchema>;

export const OperatorStatusSchema = z.enum([
  "licensed",
  "pending",
  "denied",
  "sector_limited",
  "not_entered",
  "unknown",
]);
export type OperatorStatus = z.infer<typeof OperatorStatusSchema>;

export const JurisdictionCodeSchema = z.enum(JURISDICTION_CODES);

const FeeRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string(),
  note: z.string().optional(),
});

export const LandingRightsProfileSchema = z.object({
  jurisdiction: JurisdictionCodeSchema,
  depth: CoverageDepthSchema,
  last_verified: z.string(),
  overview: z.object({
    summary: z.string(),
    regime_type: RegimeTypeSchema,
    in_force_date: z.string().optional(),
    last_major_change: z.string().optional(),
  }),
  regulators: z.array(
    z.object({
      name: z.string(),
      abbreviation: z.string(),
      role: z.enum(["primary", "co_authority", "security_review"]),
      url: z.string().optional(),
    }),
  ),
  legal_basis: z.array(
    z.object({
      source_id: z.string(),
      title: z.string(),
      citation: z.string().optional(),
    }),
  ),
  fees: z.object({
    application: FeeRangeSchema.optional(),
    annual: FeeRangeSchema.optional(),
    note: z.string().optional(),
  }),
  timeline: z.object({
    typical_duration_months: z.object({ min: z.number(), max: z.number() }),
    statutory_window_days: z.number().optional(),
    note: z.string().optional(),
  }),
  foreign_ownership: z.object({
    cap_percent: z.number().nullable().optional(),
    note: z.string().optional(),
    workaround: z.string().optional(),
  }),
  renewal: z.object({
    term_years: z.number().optional(),
    note: z.string().optional(),
  }),
  security_review: z.object({
    required: z.boolean(),
    authority: z.string().optional(),
    framework: z.string().optional(),
  }),
  operator_snapshots: z.partialRecord(
    z.enum(["starlink", "kuiper", "oneweb"]),
    z.object({
      status: OperatorStatusSchema,
      since: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
});
export type LandingRightsProfile = z.infer<typeof LandingRightsProfileSchema>;

export const CategoryDeepDiveSchema = z.object({
  jurisdiction: JurisdictionCodeSchema,
  category: LandingRightsCategorySchema,
  title: z.string(),
  summary: z.string(),
  key_provisions: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      citation: z.string().optional(),
    }),
  ),
  practical_notes: z.string().optional(),
  last_verified: z.string(),
});
export type CategoryDeepDive = z.infer<typeof CategoryDeepDiveSchema>;

export const CaseStudySchema = z.object({
  id: z.string(),
  title: z.string(),
  jurisdiction: JurisdictionCodeSchema,
  operator: z.string(),
  categories: z.array(LandingRightsCategorySchema),
  date_range: z.object({ from: z.string(), to: z.string().optional() }),
  narrative: z.string(),
  takeaways: z.array(z.string()),
  outcome: z.enum(["licensed", "pending", "denied", "compromise"]),
  last_verified: z.string(),
});
export type CaseStudy = z.infer<typeof CaseStudySchema>;

export const OperatorMatrixRowSchema = z.object({
  operator: z.string(),
  statuses: z.partialRecord(
    JurisdictionCodeSchema,
    z.object({
      status: OperatorStatusSchema,
      since: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  last_verified: z.string(),
});
export type OperatorMatrixRow = z.infer<typeof OperatorMatrixRowSchema>;

export const ConductTypeSchema = z.enum([
  "data_localization",
  "lawful_intercept",
  "geo_fencing",
  "indigenization",
  "suspension_capability",
  "local_content",
  "other",
]);
export type ConductType = z.infer<typeof ConductTypeSchema>;

export const ConductConditionSchema = z.object({
  id: z.string(),
  jurisdiction: JurisdictionCodeSchema,
  type: ConductTypeSchema,
  title: z.string(),
  requirement: z.string(),
  legal_source_id: z.string().optional(),
  effective_date: z.string().optional(),
  applies_to: z.enum([
    "all_operators",
    "mssp",
    "ngso",
    "gso",
    "gateway",
    "specific",
  ]),
  operators_affected: z.array(z.string()).optional(),
  last_verified: z.string(),
});
export type ConductCondition = z.infer<typeof ConductConditionSchema>;

// ─── Primary Source (verifiable document linkage) ──────────────────

export const PrimarySourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  title_en: z.string().optional(),
  jurisdiction: z.union([
    JurisdictionCodeSchema,
    z.literal("INTL"),
    z.literal("EU"),
  ]),
  official_url: z.string().url(),
  publisher: z.string(),
  last_accessed: z.string(),
  type: z.enum([
    "statute",
    "regulation",
    "policy",
    "court_decision",
    "guidance",
    "treaty",
    "delegated_act",
  ]),
  language: z.string(),
  citation_short: z.string().optional(),
});
export type PrimarySource = z.infer<typeof PrimarySourceSchema>;

// ─── Calendar Event (auto-computed from profiles + milestones) ─────

export const CalendarEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum([
    "license_renewal",
    "milestone",
    "wrc",
    "biu_deadline",
    "regulatory_change",
    "enforcement",
  ]),
  jurisdiction: JurisdictionCodeSchema.optional(),
  operator: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  source_url: z.string().url().optional(),
  status: z.enum(["upcoming", "past", "satisfied"]),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// ─── ITU Filing (static curation, SRS deep links) ──────────────────

export const ITUSystemTypeSchema = z.enum([
  "GSO",
  "NGSO-FSS",
  "NGSO-MSS",
  "OTHER",
]);
export type ITUSystemType = z.infer<typeof ITUSystemTypeSchema>;

export const ITUBIUStatusSchema = z.enum([
  "pre_biu",
  "biu_achieved",
  "biu_failed",
  "unknown",
]);
export type ITUBIUStatus = z.infer<typeof ITUBIUStatusSchema>;

export const ITUFilingSchema = z.object({
  id: z.string(),
  satellite_network_id: z.string(),
  operator: z.string(),
  system_type: ITUSystemTypeSchema,
  api_filed: z.string().optional(),
  cr_c_filed: z.string().optional(),
  notification_filed: z.string().optional(),
  biu_status: ITUBIUStatusSchema,
  biu_date: z.string().optional(),
  resolution_35_milestones: z
    .object({
      milestone_10_pct: z.string().optional(),
      milestone_50_pct: z.string().optional(),
      milestone_100_pct: z.string().optional(),
      current_progress_pct: z.number().optional(),
    })
    .optional(),
  itu_srs_url: z.string().url().optional(),
  notes: z.string().optional(),
  last_verified: z.string(),
});
export type ITUFiling = z.infer<typeof ITUFilingSchema>;
