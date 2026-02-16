/**
 * Zod Validation Schemas for Compliance API Endpoints
 */

import { z } from "zod";

// ─── EU Space Act Assessment ───

export const EUSpaceActAssessSchema = z.object({
  activityType: z.enum([
    "spacecraft",
    "launch_vehicle",
    "launch_site",
    "isos",
    "data_provider",
  ]),
  isDefenseOnly: z.boolean().nullable().default(null),
  hasPostLaunchAssets: z.boolean().nullable().default(null),
  establishment: z.enum([
    "eu",
    "third_country_eu_services",
    "third_country_no_eu",
  ]),
  entitySize: z.enum(["small", "research", "medium", "large"]),
  operatesConstellation: z.boolean().nullable().default(null),
  constellationSize: z.number().int().min(0).nullable().default(null),
  primaryOrbit: z
    .enum(["LEO", "MEO", "GEO", "beyond"])
    .nullable()
    .default(null),
  offersEUServices: z.boolean().nullable().default(null),
});

export type EUSpaceActAssessInput = z.infer<typeof EUSpaceActAssessSchema>;

// ─── NIS2 Classification ───

export const NIS2ClassifySchema = z.object({
  entitySize: z.enum(["micro", "small", "medium", "large"]),
  sector: z.literal("space").default("space"),
  spaceSubSector: z
    .enum([
      "ground_infrastructure",
      "satellite_communications",
      "spacecraft_manufacturing",
      "launch_services",
      "earth_observation",
      "navigation",
      "space_situational_awareness",
    ])
    .nullable()
    .default(null),
  isEUEstablished: z.boolean().default(true),
  operatesGroundInfra: z.boolean().nullable().default(null),
  operatesSatComms: z.boolean().nullable().default(null),
  providesLaunchServices: z.boolean().nullable().default(null),
});

export type NIS2ClassifyInput = z.infer<typeof NIS2ClassifySchema>;

// ─── NIS2 Full Assessment ───

export const NIS2AssessSchema = NIS2ClassifySchema.extend({
  manufacturesSpacecraft: z.boolean().nullable().default(null),
  providesEOData: z.boolean().nullable().default(null),
  employeeCount: z.number().int().min(0).nullable().default(null),
  annualRevenue: z.number().min(0).nullable().default(null),
  memberStateCount: z.number().int().min(1).nullable().default(null),
  hasISO27001: z.boolean().nullable().default(null),
  hasExistingCSIRT: z.boolean().nullable().default(null),
  hasRiskManagement: z.boolean().nullable().default(null),
});

export type NIS2AssessInput = z.infer<typeof NIS2AssessSchema>;

// ─── Space Law Assessment ───

export const SpaceLawAssessSchema = z.object({
  selectedJurisdictions: z
    .array(z.enum(["FR", "UK", "BE", "NL", "LU", "AT", "DK", "DE", "IT", "NO"]))
    .min(1)
    .max(10),
  activityType: z
    .enum([
      "spacecraft_operation",
      "launch_vehicle",
      "launch_site",
      "in_orbit_services",
      "earth_observation",
      "satellite_communications",
      "space_resources",
    ])
    .nullable()
    .default(null),
  entityNationality: z
    .enum(["domestic", "eu_other", "non_eu", "esa_member"])
    .nullable()
    .default(null),
  entitySize: z.enum(["small", "medium", "large"]).nullable().default(null),
  primaryOrbit: z
    .enum(["LEO", "MEO", "GEO", "beyond"])
    .nullable()
    .default(null),
  constellationSize: z.number().int().min(0).nullable().default(null),
  licensingStatus: z
    .enum(["new_application", "existing_license", "renewal", "pre_assessment"])
    .nullable()
    .default(null),
});

export type SpaceLawAssessInput = z.infer<typeof SpaceLawAssessSchema>;

// ─── Quick Check (Public, Minimal) ───

export const QuickCheckSchema = z.object({
  activityType: z.enum([
    "spacecraft",
    "launch_vehicle",
    "launch_site",
    "isos",
    "data_provider",
  ]),
  entitySize: z.enum(["small", "research", "medium", "large"]),
  establishment: z.enum([
    "eu",
    "third_country_eu_services",
    "third_country_no_eu",
  ]),
});

export type QuickCheckInput = z.infer<typeof QuickCheckSchema>;

// ─── NIS2 Quick Classify (Public, Minimal) ───

export const NIS2QuickClassifySchema = z.object({
  entitySize: z.enum(["micro", "small", "medium", "large"]),
  sector: z.literal("space").default("space"),
});

export type NIS2QuickClassifyInput = z.infer<typeof NIS2QuickClassifySchema>;

// ─── Widget Analytics Tracking ───

export const WidgetTrackSchema = z.object({
  event: z.enum(["impression", "completion", "cta_click"]),
  widgetId: z.string().min(1),
});

export type WidgetTrackInput = z.infer<typeof WidgetTrackSchema>;
