// ---------------------------------------------------------------------------
// Scenario Builder – Block Definitions Registry
// ---------------------------------------------------------------------------

/** A slider parameter: numeric value with min/max/step and a display unit. */
export interface SliderParameterDef {
  type: "slider";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

/** A select parameter: one value chosen from a fixed list of options. */
export interface SelectParameterDef {
  type: "select";
  key: string;
  label: string;
  options: string[];
  defaultValue: string;
}

/** Union of all parameter definition types. */
export type ParameterDef = SliderParameterDef | SelectParameterDef;

// ---------------------------------------------------------------------------
// Block Definition
// ---------------------------------------------------------------------------

export interface BlockDefinition {
  /** Unique identifier for this block type, e.g. "orbit-raise". */
  id: string;
  /** Human-readable name shown in the palette. */
  name: string;
  /** Short description of what this block does. */
  description: string;
  /** Lucide-react icon component name. */
  icon: string;
  /** Tailwind colour class for theming the block. */
  color: string;
  /** The scenario simulation type this block maps to. */
  scenarioType: string;
  /** Parameter definitions (may be empty). */
  parameterDefs: ParameterDef[];
}

// ---------------------------------------------------------------------------
// Pipeline Block Instance (a placed block in the scenario pipeline)
// ---------------------------------------------------------------------------

export interface PipelineBlockInstance {
  /** Unique id for this particular placement in the pipeline. */
  instanceId: string;
  /** References BlockDefinition.id. */
  definitionId: string;
  /** Current parameter values keyed by ParameterDef.key. */
  parameters: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Block Definitions Registry
// ---------------------------------------------------------------------------

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    id: "orbit-raise",
    name: "Orbit Raise",
    description:
      "Simulate raising the satellite orbit by a given altitude delta.",
    icon: "ArrowUpCircle",
    color: "text-blue-600",
    scenarioType: "ORBIT_RAISE",
    parameterDefs: [
      {
        type: "slider",
        key: "altitudeDeltaKm",
        label: "Altitude Delta",
        min: 10,
        max: 200,
        step: 1,
        defaultValue: 50,
        unit: "km",
      },
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 2,
        unit: "%",
      },
    ],
  },
  {
    id: "fuel-burn",
    name: "Fuel Burn",
    description: "Simulate a fuel burn consuming a percentage of reserves.",
    icon: "Flame",
    color: "text-orange-500",
    scenarioType: "FUEL_BURN",
    parameterDefs: [
      {
        type: "slider",
        key: "burnPct",
        label: "Burn Percentage",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 5,
        unit: "%",
      },
    ],
  },
  {
    id: "thruster-failure",
    name: "Thruster Failure",
    description: "Simulate a thruster failure event.",
    icon: "AlertTriangle",
    color: "text-red-500",
    scenarioType: "THRUSTER_FAILURE",
    parameterDefs: [],
  },
  {
    id: "eol-extension",
    name: "EOL Extension",
    description: "Extend the satellite end-of-life date by a number of years.",
    icon: "Clock",
    color: "text-amber-500",
    scenarioType: "EOL_EXTENSION",
    parameterDefs: [
      {
        type: "slider",
        key: "extensionYears",
        label: "Extension",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2,
        unit: "years",
      },
    ],
  },
  {
    id: "jurisdiction-change",
    name: "Jurisdiction Change",
    description:
      "Simulate transferring the satellite to a different regulatory jurisdiction.",
    icon: "Globe",
    color: "text-indigo-500",
    scenarioType: "JURISDICTION_CHANGE",
    parameterDefs: [
      {
        type: "select",
        key: "toJurisdiction",
        label: "Target Jurisdiction",
        options: ["DE", "NO", "GB", "LU", "FR", "IT", "SE"],
        defaultValue: "LU",
      },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    description: "A custom scenario block with user-defined behaviour.",
    icon: "Wrench",
    color: "text-[#6B7280]",
    scenarioType: "CUSTOM",
    parameterDefs: [],
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

let _counter = 0;

/**
 * Build a `Record<string, unknown>` of default parameter values from a
 * block definition's `parameterDefs`.
 */
export function getDefaultParameters(
  definition: BlockDefinition,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const p of definition.parameterDefs) {
    params[p.key] = p.defaultValue;
  }
  return params;
}

/**
 * Create a new `PipelineBlockInstance` from a `BlockDefinition`, generating a
 * unique `instanceId` and populating default parameter values.
 */
export function createBlockInstance(
  definition: BlockDefinition,
): PipelineBlockInstance {
  _counter += 1;
  return {
    instanceId: `${definition.id}-${Date.now()}-${_counter}`,
    definitionId: definition.id,
    parameters: getDefaultParameters(definition),
  };
}
