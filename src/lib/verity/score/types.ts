export interface ComplianceScore {
  overall: number;
  breakdown: ScoreBreakdown;
  attestationCount: number;
  passingCount: number;
  failingCount: number;
  expiredCount: number;
  coveragePercent: number;
  trend: "improving" | "declining" | "stable";
  computedAt: string;
}

export interface ScoreBreakdown {
  debris: number;
  cybersecurity: number;
  authorization: number;
  environmental: number;
  spectrum: number;
  insurance: number;
}
