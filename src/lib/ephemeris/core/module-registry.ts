// ═══════════════════════════════════════════════════════════════════════════════
// EPHEMERIS — Module Registry
//
// Declarative registry of compliance modules per OperatorType.
// Extracted from the previously hardcoded MODULE_WEIGHTS in constants.ts.
//
// SCO values MUST match constants.ts MODULE_WEIGHTS exactly to preserve
// byte-for-byte identical scoring behavior.
// ═══════════════════════════════════════════════════════════════════════════════

import type { ModuleRegistration, ModuleRegistry, DataSource } from "./types";

export const MODULE_REGISTRY: ModuleRegistry = {
  SCO: [
    {
      key: "fuel",
      label: "Fuel & Passivation",
      weight: 20,
      safetyCritical: true,
      regulationRefs: [
        "eu_space_act_art_70",
        "eu_space_act_art_72",
        "iadc_5_3_1",
      ],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "fuel-depletion",
    },
    {
      key: "orbital",
      label: "Orbital Lifetime",
      weight: 15,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_68"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "orbital-decay",
    },
    {
      key: "subsystems",
      label: "Subsystems",
      weight: 15,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel"] as DataSource[],
      predictionModel: "subsystem-degradation",
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["sentinel", "verity", "assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "ground",
      label: "Ground Segment",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: [] as DataSource[],
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 8,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_70", "eu_space_act_art_72"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
    {
      key: "insurance",
      label: "Insurance",
      weight: 7,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "registration",
      label: "Registration",
      weight: 5,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_24"],
      requiredDataSources: [] as DataSource[],
    },
  ],

  // Placeholder registries — modules defined, but no implementation yet.
  // These exist so the type system is complete and the registry is queryable.
  // Actual implementation comes in Phase 2+.
  LO: [],
  LSO: [],
  ISOS: [],
  CAP: [],
  PDP: [],
  TCO: [],
};

// ─── Helper Functions ───────────────────────────────────────────────────────

export function getModulesForType(operatorType: string): ModuleRegistration[] {
  return MODULE_REGISTRY[operatorType] ?? [];
}

/**
 * Returns module weights as a Record<key, weight>.
 * Weights are raw values (e.g. fuel=20, orbital=15) — the scoring engine
 * normalizes by dividing by the total weight sum.
 */
export function getModuleWeights(operatorType: string): Record<string, number> {
  const modules = getModulesForType(operatorType);
  return Object.fromEntries(modules.map((m) => [m.key, m.weight]));
}

/**
 * Returns module config matching the shape used by the scoring engine:
 * { [key]: { weight, safetyGate } }
 */
export function getModuleConfig(
  operatorType: string,
): Record<string, { weight: number; safetyGate: boolean }> {
  const modules = getModulesForType(operatorType);
  return Object.fromEntries(
    modules.map((m) => [
      m.key,
      { weight: m.weight, safetyGate: m.safetyCritical },
    ]),
  );
}

export function getSafetyCriticalModules(operatorType: string): string[] {
  return getModulesForType(operatorType)
    .filter((m) => m.safetyCritical)
    .map((m) => m.key);
}

export function validateRegistry(operatorType: string): {
  valid: boolean;
  error?: string;
} {
  const modules = getModulesForType(operatorType);
  if (modules.length === 0) return { valid: true }; // Empty = not yet implemented

  // Check for duplicate keys
  const keys = modules.map((m) => m.key);
  const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (duplicates.length > 0) {
    return {
      valid: false,
      error: `${operatorType} has duplicate keys: ${duplicates.join(", ")}`,
    };
  }

  // Check all weights are positive
  const invalidWeights = modules.filter((m) => m.weight <= 0);
  if (invalidWeights.length > 0) {
    return {
      valid: false,
      error: `${operatorType} has non-positive weights: ${invalidWeights.map((m) => m.key).join(", ")}`,
    };
  }

  return { valid: true };
}
