/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

export const ConductConditionSchema = z.object({
  id: z.string(),
  jurisdiction: JurisdictionCodeSchema,
  type: z.enum([
    "data_localization",
    "lawful_intercept",
    "geo_fencing",
    "indigenization",
    "suspension_capability",
    "local_content",
    "other",
  ]),
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
