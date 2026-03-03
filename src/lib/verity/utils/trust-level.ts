/**
 * Maps internal trust scores (float) to external trust levels.
 *
 * Externally the exact float is NEVER shown.
 * Reason: Overprecision in legal documents is attackable.
 * "Why 0.92 and not 0.93?" → litigation risk.
 * "HIGH" → no attack surface.
 */
export type TrustLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ExternalTrustInfo {
  level: TrustLevel;
  range: string;
  description: string;
}

export function toExternalTrust(score: number): ExternalTrustInfo {
  if (score >= 0.9) {
    return {
      level: "HIGH",
      range: "0.90\u20130.98",
      description:
        "Sentinel-collected, cryptographically sealed, optionally cross-verified",
    };
  }
  if (score >= 0.7) {
    return {
      level: "MEDIUM",
      range: "0.70\u20130.89",
      description: "Evidence-backed or API-submitted, signature verified",
    };
  }
  return {
    level: "LOW",
    range: "0.50\u20130.69",
    description: "Self-assessed or manually uploaded, limited verification",
  };
}
