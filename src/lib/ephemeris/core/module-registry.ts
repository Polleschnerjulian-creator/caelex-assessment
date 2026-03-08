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

  // ─── Launch Operator ────────────────────────────────────────────────────
  LO: [
    {
      key: "launch_authorization",
      label: "Launch Authorization",
      weight: 20,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_6"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "range_safety",
      label: "Range Safety",
      weight: 15,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_62"],
      requiredDataSources: ["assessment", "sentinel"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "third_party_liability",
      label: "Third-Party Liability",
      weight: 15,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "environmental_impact",
      label: "Environmental Impact",
      weight: 12,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_66"],
      requiredDataSources: ["assessment"] as DataSource[],
    },
    {
      key: "payload_integration",
      label: "Payload Integration",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 8,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_62"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
    {
      key: "frequency_coordination",
      label: "Frequency Coordination",
      weight: 5,
      safetyCritical: false,
      regulationRefs: ["itu_radio_regulations"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "export_control",
      label: "Export Control",
      weight: 5,
      safetyCritical: false,
      regulationRefs: ["itar", "ear", "eu_dual_use"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "regulatory-change",
    },
  ],
  // ─── Launch Site Operator ──────────────────────────────────────────────────
  LSO: [
    {
      key: "site_authorization",
      label: "Site Authorization",
      weight: 20,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_6"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "range_safety_systems",
      label: "Range Safety Systems",
      weight: 20,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_62"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "subsystem-degradation",
    },
    {
      key: "environmental_compliance",
      label: "Environmental Compliance",
      weight: 15,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_66"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "regulatory-change",
    },
    {
      key: "ground_infrastructure",
      label: "Ground Infrastructure",
      weight: 12,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "subsystem-degradation",
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "insurance",
      label: "Insurance",
      weight: 8,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "emergency_response",
      label: "Emergency Response",
      weight: 8,
      safetyCritical: false,
      regulationRefs: ["national_civil_protection"],
      requiredDataSources: ["assessment"] as DataSource[],
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 7,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_62", "eu_space_act_art_5"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
  ],

  // ─── In-Space Operations & Servicing ────────────────────────────────────────
  ISOS: [
    {
      key: "mission_authorization",
      label: "Mission Authorization",
      weight: 18,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_63"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "proximity_operations",
      label: "Proximity Operations",
      weight: 18,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_63", "iadc_proximity_guidelines"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "proximity-safety",
    },
    {
      key: "fuel",
      label: "Fuel & Propulsion",
      weight: 15,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_70", "eu_space_act_art_72"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "fuel-depletion",
    },
    {
      key: "target_compliance",
      label: "Target Compliance",
      weight: 12,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_63"],
      requiredDataSources: ["assessment"] as DataSource[],
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "debris_risk",
      label: "Debris Risk",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_68", "iadc_5_3"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "orbital-decay",
    },
    {
      key: "insurance",
      label: "Insurance",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 7,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_63", "eu_space_act_art_70"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
  ],
  // ─── Capacity Provider ────────────────────────────────────────────────────
  CAP: [
    {
      key: "service_authorization",
      label: "Service Authorization",
      weight: 20,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_6"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "service_continuity",
      label: "Service Continuity",
      weight: 18,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "subsystem-degradation",
    },
    {
      key: "capacity_management",
      label: "Capacity Management",
      weight: 15,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 12,
      safetyCritical: false,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "sla_compliance",
      label: "SLA Compliance",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["assessment"] as DataSource[],
    },
    {
      key: "insurance",
      label: "Insurance",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "spectrum_coordination",
      label: "Spectrum Coordination",
      weight: 8,
      safetyCritical: false,
      regulationRefs: ["itu_radio_regulations"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 7,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_64"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
  ],

  // ─── Payload Data Provider ──────────────────────────────────────────────────
  PDP: [
    {
      key: "data_authorization",
      label: "Data Authorization",
      weight: 20,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_6"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "data_security",
      label: "Data Security",
      weight: 18,
      safetyCritical: true,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["sentinel", "assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "data_quality",
      label: "Data Quality",
      weight: 15,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 12,
      safetyCritical: false,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "distribution_compliance",
      label: "Distribution Compliance",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64", "eu_dual_use"],
      requiredDataSources: ["assessment"] as DataSource[],
    },
    {
      key: "insurance",
      label: "Insurance",
      weight: 8,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "spectrum_rights",
      label: "Spectrum Rights",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["itu_radio_regulations"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 7,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_64"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
  ],

  // ─── Tracking, Commanding & Operations ──────────────────────────────────────
  TCO: [
    {
      key: "operations_authorization",
      label: "Operations Authorization",
      weight: 18,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_6"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "ground_infrastructure",
      label: "Ground Infrastructure",
      weight: 18,
      safetyCritical: true,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
      predictionModel: "subsystem-degradation",
    },
    {
      key: "cyber",
      label: "Cybersecurity",
      weight: 15,
      safetyCritical: true,
      regulationRefs: ["nis2_art_21"],
      requiredDataSources: ["sentinel", "assessment", "verity"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "command_integrity",
      label: "Command Integrity",
      weight: 12,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
    },
    {
      key: "tracking_accuracy",
      label: "Tracking Accuracy",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["sentinel", "assessment"] as DataSource[],
    },
    {
      key: "insurance",
      label: "Insurance",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_8"],
      requiredDataSources: ["assessment"] as DataSource[],
      predictionModel: "deadline-events",
    },
    {
      key: "interoperability",
      label: "Interoperability",
      weight: 10,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_64"],
      requiredDataSources: ["assessment"] as DataSource[],
    },
    {
      key: "documentation",
      label: "Documentation",
      weight: 7,
      safetyCritical: false,
      regulationRefs: ["eu_space_act_art_5", "eu_space_act_art_64"],
      requiredDataSources: ["assessment", "verity"] as DataSource[],
    },
  ],
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
