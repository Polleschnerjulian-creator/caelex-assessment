/**
 * SHIELD — Conjunction Assessment & Collision Avoidance
 * Type definitions for the Shield subsystem.
 */

// Re-export Prisma enums for convenience
export type { ConjunctionStatus, RiskTier, CADecision } from "@prisma/client";

// ─── Space-Track CDM ─────────────────────────────────────────────────────────

/** Raw CDM record from Space-Track API */
export interface SpaceTrackCDM {
  CDM_ID: string;
  CREATION_DATE: string;
  TCA: string;
  MIN_RNG: string; // km — convert to meters internally
  PC: string; // collision probability as string
  PC_METHOD: string | null;
  SAT_1_ID: string;
  SAT_1_NAME: string;
  SAT1_OBJECT_TYPE: string;
  SAT_1_RCS: string | null;
  SAT_2_ID: string;
  SAT_2_NAME: string;
  SAT2_OBJECT_TYPE: string;
  SAT_2_RCS: string | null;
  RELATIVE_SPEED: string | null; // km/s
  SAT2_MANEUVERABLE: string | null; // YES, NO, N/A
  SAT_1_X?: string;
  SAT_1_Y?: string;
  SAT_1_Z?: string;
  SAT_1_X_DOT?: string;
  SAT_1_Y_DOT?: string;
  SAT_1_Z_DOT?: string;
  SAT_2_X?: string;
  SAT_2_Y?: string;
  SAT_2_Z?: string;
  SAT_2_X_DOT?: string;
  SAT_2_Y_DOT?: string;
  SAT_2_Z_DOT?: string;
}

/** Parsed CDM in canonical Caelex format */
export interface ParsedCDM {
  cdmId: string;
  creationDate: Date;
  tca: Date;
  missDistanceMeters: number;
  collisionProbability: number;
  probabilityMethod: string | null;
  relativeSpeedMs: number | null;
  sat1NoradId: string;
  sat1Name: string;
  sat1ObjectType: string;
  sat2NoradId: string;
  sat2Name: string;
  sat2ObjectType: string;
  sat2Maneuverable: string | null;
  rawCdm: SpaceTrackCDM;
}

// ─── Pc Trend ────────────────────────────────────────────────────────────────

export type PcTrendDirection =
  | "INCREASING"
  | "DECREASING"
  | "STABLE"
  | "VOLATILE";

export interface PcTrend {
  direction: PcTrendDirection;
  slope: number;
  confidence: number;
  projectedPcAtTca: number;
  dataPoints: number;
  history: Array<{ timestamp: Date; pc: number; missDistance: number }>;
}

// ─── Risk Classification ─────────────────────────────────────────────────────

export interface RiskThresholds {
  emergencyPc: number;
  highPc: number;
  elevatedPc: number;
  monitorPc: number;
  emergencyMiss: number;
  highMiss: number;
  elevatedMiss: number;
  monitorMiss: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  emergencyPc: 1e-3,
  highPc: 1e-4,
  elevatedPc: 1e-5,
  monitorPc: 1e-7,
  emergencyMiss: 100,
  highMiss: 500,
  elevatedMiss: 1000,
  monitorMiss: 5000,
};

// ─── Conjunction Tracker ─────────────────────────────────────────────────────

export interface EscalationResult {
  tierChanged: boolean;
  statusChanged: boolean;
  previousTier: import("@prisma/client").RiskTier;
  newTier: import("@prisma/client").RiskTier;
  previousStatus: import("@prisma/client").ConjunctionStatus;
  newStatus: import("@prisma/client").ConjunctionStatus;
  trigger: string;
}

// ─── CDM Polling ─────────────────────────────────────────────────────────────

export interface CDMPollingResult {
  cdmsProcessed: number;
  newEvents: number;
  updatedEvents: number;
  escalations: number;
  autoClosures: number;
  errors: string[];
  durationMs: number;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ShieldStats {
  activeEvents: number;
  emergencyCount: number;
  highCount: number;
  elevatedCount: number;
  monitorCount: number;
  overdueDecisions: number;
  lastPollAt: string | null;
}
