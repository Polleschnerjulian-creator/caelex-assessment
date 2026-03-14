import type { EphemerisColors } from "../../theme";

// ─── Forecast Data Types ─────────────────────────────────────────────────────

export interface ForecastPoint {
  date: string;
  nominal: number;
  bestCase: number;
  worstCase: number;
  isHistorical: boolean;
}

export interface ForecastCurve {
  regulationRef: string;
  regulationName: string;
  metric: string;
  unit: string;
  thresholdValue: number;
  dataPoints: ForecastPoint[];
  crossingDate: string | null;
  crossingDaysFromNow: number | null;
  confidence: string;
}

export interface ComplianceEvent {
  id: string;
  date: string;
  daysFromNow: number;
  regulationRef: string;
  regulationName: string;
  eventType: string;
  severity: string;
  description: string;
  recommendedAction: string;
}

export interface ForecastData {
  forecastCurves: ForecastCurve[];
  complianceEvents: ComplianceEvent[];
  horizonDays: number | null;
}

export interface SatelliteAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  regulationRef: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface ModuleScore {
  score: number;
  status: string;
  dataSource: string;
  factors: Array<{
    id: string;
    name: string;
    regulationRef: string;
    status: string;
    daysToThreshold: number | null;
  }>;
}

export interface HistoryPoint {
  calculatedAt: string;
  overallScore: number;
  moduleScores?: Record<string, { score: number }>;
}

// ─── Shared Props ────────────────────────────────────────────────────────────

export interface ThemedProps {
  C: EphemerisColors;
}

export type TimeRange = "30D" | "90D" | "180D" | "1Y" | "5Y";

export const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  "30D": 30,
  "90D": 90,
  "180D": 180,
  "1Y": 365,
  "5Y": 1825,
};

export const MODULE_LABELS: Record<string, string> = {
  fuel: "Fuel & Passivation",
  orbital: "Orbital Lifetime",
  subsystems: "Subsystems",
  cyber: "Cybersecurity",
  ground: "Ground Segment",
  documentation: "Documentation",
  insurance: "Insurance",
  registration: "Registration",
};
