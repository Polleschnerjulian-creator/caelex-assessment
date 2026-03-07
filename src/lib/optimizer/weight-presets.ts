import type { OptimizationWeights, WeightProfileName } from "./types";

export interface WeightPreset {
  name: WeightProfileName;
  label: string;
  description: string;
  weights: OptimizationWeights;
}

export const WEIGHT_PRESETS: Record<
  Exclude<WeightProfileName, "custom">,
  WeightPreset
> = {
  startup: {
    name: "startup",
    label: "Startup",
    description:
      "Optimizes for speed-to-market and low upfront costs. Best for early-stage companies launching first missions.",
    weights: {
      timeline: 35,
      cost: 30,
      compliance: 15,
      insurance: 10,
      liability: 5,
      debrisFlex: 5,
    },
  },
  enterprise: {
    name: "enterprise",
    label: "Enterprise",
    description:
      "Prioritizes regulatory compliance and insurance coverage. Best for established operators with large fleets.",
    weights: {
      timeline: 10,
      cost: 15,
      compliance: 30,
      insurance: 20,
      liability: 15,
      debrisFlex: 10,
    },
  },
  government: {
    name: "government",
    label: "Government",
    description:
      "Maximizes compliance and debris mitigation standards. Best for government and institutional missions.",
    weights: {
      timeline: 5,
      cost: 5,
      compliance: 35,
      insurance: 15,
      liability: 15,
      debrisFlex: 25,
    },
  },
  balanced: {
    name: "balanced",
    label: "Balanced",
    description:
      "Equal weighting across all dimensions. Good starting point for exploring trade-offs.",
    weights: {
      timeline: 20,
      cost: 20,
      compliance: 20,
      insurance: 15,
      liability: 15,
      debrisFlex: 10,
    },
  },
};

/** Normalize weights so they sum to 100. */
export function normalizeWeights(w: OptimizationWeights): OptimizationWeights {
  const sum =
    w.timeline +
    w.cost +
    w.compliance +
    w.insurance +
    w.liability +
    w.debrisFlex;
  if (sum === 0) return WEIGHT_PRESETS.balanced.weights;
  const factor = 100 / sum;
  return {
    timeline: w.timeline * factor,
    cost: w.cost * factor,
    compliance: w.compliance * factor,
    insurance: w.insurance * factor,
    liability: w.liability * factor,
    debrisFlex: w.debrisFlex * factor,
  };
}

/** Resolve a weight profile name to concrete weights. */
export function resolveWeights(
  profile: WeightProfileName,
  customWeights?: OptimizationWeights,
): OptimizationWeights {
  if (profile === "custom" && customWeights) {
    return normalizeWeights(customWeights);
  }
  if (profile === "custom") {
    return WEIGHT_PRESETS.balanced.weights;
  }
  return WEIGHT_PRESETS[profile].weights;
}
