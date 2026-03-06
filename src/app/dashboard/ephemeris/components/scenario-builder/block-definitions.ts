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
// Block Categories
// ---------------------------------------------------------------------------

export type BlockCategory =
  | "orbital"
  | "hardware"
  | "environment"
  | "communication"
  | "regulatory"
  | "operational"
  | "financial";

export interface CategoryMeta {
  id: BlockCategory;
  label: string;
  icon: string;
  color: string;
}

export const BLOCK_CATEGORIES: CategoryMeta[] = [
  {
    id: "orbital",
    label: "Orbital Mechanics",
    icon: "Orbit",
    color: "text-blue-500",
  },
  {
    id: "hardware",
    label: "Hardware Failures",
    icon: "Cog",
    color: "text-red-500",
  },
  {
    id: "environment",
    label: "Space Environment",
    icon: "CloudLightning",
    color: "text-purple-500",
  },
  {
    id: "communication",
    label: "Communication & Data",
    icon: "Wifi",
    color: "text-cyan-500",
  },
  {
    id: "regulatory",
    label: "Regulatory & Legal",
    icon: "Scale",
    color: "text-indigo-500",
  },
  {
    id: "operational",
    label: "Operational",
    icon: "Clock",
    color: "text-amber-500",
  },
  {
    id: "financial",
    label: "Financial & Business",
    icon: "DollarSign",
    color: "text-emerald-500",
  },
];

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
  /** Category this block belongs to. */
  category: BlockCategory;
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
// Block Definitions Registry (55 blocks across 7 categories)
// ---------------------------------------------------------------------------

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // =========================================================================
  // ORBITAL (8)
  // =========================================================================
  {
    id: "orbit-raise",
    name: "Orbit Raise",
    description:
      "Simulate raising the satellite orbit by a given altitude delta.",
    icon: "ArrowUpCircle",
    color: "text-blue-600",
    scenarioType: "ORBIT_RAISE",
    category: "orbital",
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
    id: "orbit-lower",
    name: "Orbit Lower",
    description: "Lower the satellite orbit by a given altitude delta.",
    icon: "ArrowDownCircle",
    color: "text-blue-400",
    scenarioType: "ORBIT_LOWER",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "altitudeDeltaKm",
        label: "Altitude Delta",
        min: 10,
        max: 100,
        step: 1,
        defaultValue: 50,
        unit: "km",
      },
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 0.5,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        unit: "%",
      },
    ],
  },
  {
    id: "orbit-plane-change",
    name: "Orbit Plane Change",
    description: "Change orbital inclination.",
    icon: "RotateCcw",
    color: "text-blue-600",
    scenarioType: "ORBIT_PLANE_CHANGE",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "inclinationDelta",
        label: "Inclination Delta",
        min: 1,
        max: 15,
        step: 1,
        defaultValue: 5,
        unit: "°",
      },
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 1,
        max: 15,
        step: 0.1,
        defaultValue: 3,
        unit: "%",
      },
    ],
  },
  {
    id: "orbital-slot-change",
    name: "Orbital Slot Change",
    description: "Relocate to different GEO orbital slot.",
    icon: "Target",
    color: "text-blue-500",
    scenarioType: "ORBITAL_SLOT_CHANGE",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 0.5,
        max: 5,
        step: 0.1,
        defaultValue: 2,
        unit: "%",
      },
    ],
  },
  {
    id: "collision-avoidance",
    name: "Collision Avoidance",
    description: "Simulate a collision avoidance maneuver.",
    icon: "Crosshair",
    color: "text-blue-700",
    scenarioType: "COLLISION_AVOIDANCE",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "missDistanceKm",
        label: "Miss Distance",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 10,
        unit: "km",
      },
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 0.5,
        unit: "%",
      },
    ],
  },
  {
    id: "deorbit-execute",
    name: "Deorbit Execute",
    description: "Execute end-of-life deorbit maneuver.",
    icon: "ArrowDown",
    color: "text-blue-300",
    scenarioType: "DEORBIT_EXECUTE",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "targetAltKm",
        label: "Target Altitude",
        min: 200,
        max: 400,
        step: 1,
        defaultValue: 300,
        unit: "km",
      },
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 5,
        max: 30,
        step: 0.1,
        defaultValue: 15,
        unit: "%",
      },
    ],
  },
  {
    id: "constellation-resize",
    name: "Constellation Resize",
    description: "Add or remove satellites from constellation.",
    icon: "Grid3x3",
    color: "text-blue-500",
    scenarioType: "CONSTELLATION_RESIZE",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "fleetDelta",
        label: "Fleet Delta",
        min: -5,
        max: 10,
        step: 1,
        defaultValue: 0,
        unit: "sats",
      },
    ],
  },
  {
    id: "atmospheric-drag-increase",
    name: "Atmospheric Drag Increase",
    description: "Simulate increased atmospheric drag from solar activity.",
    icon: "Wind",
    color: "text-blue-400",
    scenarioType: "ATMOSPHERIC_DRAG_INCREASE",
    category: "orbital",
    parameterDefs: [
      {
        type: "slider",
        key: "dragFactor",
        label: "Drag Factor",
        min: 1.5,
        max: 5,
        step: 0.1,
        defaultValue: 2,
        unit: "x",
      },
    ],
  },

  // =========================================================================
  // HARDWARE (12)
  // =========================================================================
  {
    id: "thruster-failure",
    name: "Thruster Failure",
    description: "Simulate a thruster failure event.",
    icon: "AlertTriangle",
    color: "text-red-500",
    scenarioType: "THRUSTER_FAILURE",
    category: "hardware",
    parameterDefs: [],
  },
  {
    id: "reaction-wheel-failure",
    name: "Reaction Wheel Failure",
    description: "Simulate reaction wheel failure.",
    icon: "Cog",
    color: "text-red-400",
    scenarioType: "REACTION_WHEEL_FAILURE",
    category: "hardware",
    parameterDefs: [
      {
        type: "slider",
        key: "wheelsLost",
        label: "Wheels Lost",
        min: 1,
        max: 3,
        step: 1,
        defaultValue: 1,
        unit: "of 4",
      },
    ],
  },
  {
    id: "solar-panel-degradation",
    name: "Solar Panel Degradation",
    description: "Simulate solar panel power loss.",
    icon: "Sun",
    color: "text-red-300",
    scenarioType: "SOLAR_PANEL_DEGRADATION",
    category: "hardware",
    parameterDefs: [
      {
        type: "slider",
        key: "capacityLossPct",
        label: "Capacity Loss",
        min: 5,
        max: 50,
        step: 1,
        defaultValue: 15,
        unit: "%",
      },
    ],
  },
  {
    id: "battery-degradation",
    name: "Battery Degradation",
    description: "Simulate battery capacity reduction.",
    icon: "Battery",
    color: "text-red-400",
    scenarioType: "BATTERY_DEGRADATION",
    category: "hardware",
    parameterDefs: [
      {
        type: "slider",
        key: "capacityLossPct",
        label: "Capacity Loss",
        min: 5,
        max: 50,
        step: 1,
        defaultValue: 15,
        unit: "%",
      },
    ],
  },
  {
    id: "antenna-degradation",
    name: "Antenna Degradation",
    description: "Simulate antenna link margin degradation.",
    icon: "Radio",
    color: "text-red-300",
    scenarioType: "ANTENNA_DEGRADATION",
    category: "hardware",
    parameterDefs: [
      {
        type: "slider",
        key: "linkMarginLoss",
        label: "Link Margin Loss",
        min: 3,
        max: 20,
        step: 1,
        defaultValue: 6,
        unit: "dB",
      },
    ],
  },
  {
    id: "attitude-control-anomaly",
    name: "Attitude Control Anomaly",
    description: "Simulate attitude control system anomaly.",
    icon: "RotateCcw",
    color: "text-red-500",
    scenarioType: "ATTITUDE_CONTROL_ANOMALY",
    category: "hardware",
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["tumble", "drift", "bias"],
        defaultValue: "drift",
      },
    ],
  },
  {
    id: "thermal-control-failure",
    name: "Thermal Control Failure",
    description: "Simulate thermal control system failure.",
    icon: "Thermometer",
    color: "text-red-600",
    scenarioType: "THERMAL_CONTROL_FAILURE",
    category: "hardware",
    parameterDefs: [],
  },
  {
    id: "sensor-degradation",
    name: "Sensor Degradation",
    description: "Simulate sensor degradation or failure.",
    icon: "Eye",
    color: "text-red-300",
    scenarioType: "SENSOR_DEGRADATION",
    category: "hardware",
    parameterDefs: [
      {
        type: "select",
        key: "sensorType",
        label: "Sensor Type",
        options: ["star_tracker", "sun_sensor", "GPS"],
        defaultValue: "star_tracker",
      },
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["degraded", "failed"],
        defaultValue: "degraded",
      },
    ],
  },
  {
    id: "payload-failure",
    name: "Payload Failure",
    description: "Simulate primary payload failure.",
    icon: "Package",
    color: "text-red-500",
    scenarioType: "PAYLOAD_FAILURE",
    category: "hardware",
    parameterDefs: [],
  },
  {
    id: "passivation-failure",
    name: "Passivation Failure",
    description: "Simulate inability to passivate at end of life.",
    icon: "ShieldOff",
    color: "text-red-600",
    scenarioType: "PASSIVATION_FAILURE",
    category: "hardware",
    parameterDefs: [],
  },
  {
    id: "propellant-leak",
    name: "Propellant Leak",
    description: "Simulate ongoing propellant leak.",
    icon: "Droplets",
    color: "text-red-400",
    scenarioType: "PROPELLANT_LEAK",
    category: "hardware",
    parameterDefs: [
      {
        type: "slider",
        key: "ratePctPerMonth",
        label: "Leak Rate",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 2,
        unit: "%/mo",
      },
    ],
  },
  {
    id: "power-bus-anomaly",
    name: "Power Bus Anomaly",
    description: "Simulate power distribution anomaly.",
    icon: "Zap",
    color: "text-red-500",
    scenarioType: "POWER_BUS_ANOMALY",
    category: "hardware",
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["brownout", "shutdown"],
        defaultValue: "brownout",
      },
    ],
  },

  // =========================================================================
  // ENVIRONMENT (6)
  // =========================================================================
  {
    id: "solar-storm",
    name: "Solar Storm",
    description: "Simulate a geomagnetic storm event.",
    icon: "CloudLightning",
    color: "text-purple-500",
    scenarioType: "SOLAR_STORM",
    category: "environment",
    parameterDefs: [
      {
        type: "select",
        key: "intensity",
        label: "Intensity",
        options: ["G1", "G2", "G3", "G4", "G5"],
        defaultValue: "G3",
      },
    ],
  },
  {
    id: "coronal-mass-ejection",
    name: "Coronal Mass Ejection",
    description: "Simulate coronal mass ejection impact.",
    icon: "Flame",
    color: "text-purple-600",
    scenarioType: "CORONAL_MASS_EJECTION",
    category: "environment",
    parameterDefs: [
      {
        type: "slider",
        key: "velocityKmS",
        label: "Velocity",
        min: 500,
        max: 3000,
        step: 100,
        defaultValue: 1500,
        unit: "km/s",
      },
      {
        type: "select",
        key: "direction",
        label: "Direction",
        options: ["direct", "glancing"],
        defaultValue: "direct",
      },
    ],
  },
  {
    id: "solar-particle-event",
    name: "Solar Particle Event",
    description: "Simulate solar energetic particle event.",
    icon: "Sparkles",
    color: "text-purple-400",
    scenarioType: "SOLAR_PARTICLE_EVENT",
    category: "environment",
    parameterDefs: [
      {
        type: "select",
        key: "fluenceLevel",
        label: "Fluence Level",
        options: ["moderate", "severe", "extreme"],
        defaultValue: "moderate",
      },
    ],
  },
  {
    id: "debris-cloud-event",
    name: "Debris Cloud Event",
    description: "Simulate debris cloud encounter.",
    icon: "Cloud",
    color: "text-purple-500",
    scenarioType: "DEBRIS_CLOUD_EVENT",
    category: "environment",
    parameterDefs: [
      {
        type: "select",
        key: "proximity",
        label: "Proximity",
        options: ["near", "adjacent", "direct"],
        defaultValue: "near",
      },
    ],
  },
  {
    id: "micrometeoroid-impact",
    name: "Micrometeoroid Impact",
    description: "Simulate micrometeoroid impact.",
    icon: "Sparkles",
    color: "text-purple-300",
    scenarioType: "MICROMETEOROID_IMPACT",
    category: "environment",
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["surface", "penetrating"],
        defaultValue: "surface",
      },
    ],
  },
  {
    id: "electrostatic-discharge",
    name: "Electrostatic Discharge",
    description: "Simulate spacecraft charging and ESD event.",
    icon: "Zap",
    color: "text-purple-400",
    scenarioType: "ELECTROSTATIC_DISCHARGE",
    category: "environment",
    parameterDefs: [],
  },

  // =========================================================================
  // COMMUNICATION (5)
  // =========================================================================
  {
    id: "comm-failure",
    name: "Comm Failure",
    description: "Simulate communication link failure.",
    icon: "WifiOff",
    color: "text-cyan-500",
    scenarioType: "COMM_FAILURE",
    category: "communication",
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["partial", "total"],
        defaultValue: "partial",
      },
      {
        type: "slider",
        key: "durationDays",
        label: "Duration",
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 7,
        unit: "days",
      },
    ],
  },
  {
    id: "ground-station-loss",
    name: "Ground Station Loss",
    description: "Simulate ground station unavailability.",
    icon: "Satellite",
    color: "text-cyan-400",
    scenarioType: "GROUND_STATION_LOSS",
    category: "communication",
    parameterDefs: [
      {
        type: "slider",
        key: "stationsAffected",
        label: "Stations Affected",
        min: 1,
        max: 3,
        step: 1,
        defaultValue: 1,
        unit: "stations",
      },
      {
        type: "slider",
        key: "durationDays",
        label: "Duration",
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 7,
        unit: "days",
      },
    ],
  },
  {
    id: "frequency-interference",
    name: "Frequency Interference",
    description: "Simulate frequency band interference.",
    icon: "Radio",
    color: "text-cyan-600",
    scenarioType: "FREQUENCY_INTERFERENCE",
    category: "communication",
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["minor", "major"],
        defaultValue: "minor",
      },
    ],
  },
  {
    id: "cyber-incident",
    name: "Cyber Incident",
    description: "Simulate cybersecurity incident.",
    icon: "Shield",
    color: "text-cyan-500",
    scenarioType: "CYBER_INCIDENT",
    category: "communication",
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["low", "medium", "high", "critical"],
        defaultValue: "medium",
      },
    ],
  },
  {
    id: "data-breach",
    name: "Data Breach",
    description: "Simulate data breach event.",
    icon: "Database",
    color: "text-cyan-400",
    scenarioType: "DATA_BREACH",
    category: "communication",
    parameterDefs: [
      {
        type: "select",
        key: "personalData",
        label: "Personal Data",
        options: ["yes", "no"],
        defaultValue: "no",
      },
    ],
  },

  // =========================================================================
  // REGULATORY (12)
  // =========================================================================
  {
    id: "jurisdiction-change",
    name: "Jurisdiction Change",
    description:
      "Simulate transferring the satellite to a different regulatory jurisdiction.",
    icon: "Globe",
    color: "text-indigo-500",
    scenarioType: "JURISDICTION_CHANGE",
    category: "regulatory",
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
    id: "operator-type-change",
    name: "Operator Type Change",
    description: "Change EU Space Act operator classification.",
    icon: "Users",
    color: "text-indigo-500",
    scenarioType: "OPERATOR_TYPE_CHANGE",
    category: "regulatory",
    parameterDefs: [
      {
        type: "select",
        key: "operatorType",
        label: "Operator Type",
        options: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
        defaultValue: "SCO",
      },
    ],
  },
  {
    id: "regulatory-change",
    name: "Regulatory Change",
    description: "Simulate new or amended regulation.",
    icon: "FileText",
    color: "text-indigo-400",
    scenarioType: "REGULATORY_CHANGE",
    category: "regulatory",
    parameterDefs: [
      {
        type: "select",
        key: "framework",
        label: "Framework",
        options: ["EU Space Act", "NIS2", "IADC"],
        defaultValue: "EU Space Act",
      },
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["minor", "major", "critical"],
        defaultValue: "minor",
      },
    ],
  },
  {
    id: "insurance-lapse",
    name: "Insurance Lapse",
    description: "Simulate insurance coverage gap.",
    icon: "ShieldOff",
    color: "text-indigo-600",
    scenarioType: "INSURANCE_LAPSE",
    category: "regulatory",
    parameterDefs: [
      {
        type: "slider",
        key: "durationMonths",
        label: "Duration",
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 3,
        unit: "months",
      },
    ],
  },
  {
    id: "nca-audit-trigger",
    name: "NCA Audit Trigger",
    description: "Simulate national authority audit.",
    icon: "Search",
    color: "text-indigo-400",
    scenarioType: "NCA_AUDIT_TRIGGER",
    category: "regulatory",
    parameterDefs: [
      {
        type: "select",
        key: "scope",
        label: "Scope",
        options: ["full", "targeted"],
        defaultValue: "targeted",
      },
    ],
  },
  {
    id: "licensing-condition-change",
    name: "Licensing Condition Change",
    description: "Simulate license condition change.",
    icon: "FileCheck",
    color: "text-indigo-300",
    scenarioType: "LICENSING_CONDITION_CHANGE",
    category: "regulatory",
    parameterDefs: [
      {
        type: "select",
        key: "changeType",
        label: "Change Type",
        options: ["add", "modify", "remove"],
        defaultValue: "modify",
      },
    ],
  },
  {
    id: "debris-remediation-order",
    name: "Debris Remediation Order",
    description: "NCA orders debris remediation.",
    icon: "Trash2",
    color: "text-indigo-600",
    scenarioType: "DEBRIS_REMEDIATION_ORDER",
    category: "regulatory",
    parameterDefs: [
      {
        type: "slider",
        key: "deadlineDays",
        label: "Deadline",
        min: 30,
        max: 365,
        step: 1,
        defaultValue: 180,
        unit: "days",
      },
    ],
  },
  {
    id: "mandatory-maneuver-order",
    name: "Mandatory Maneuver Order",
    description: "Authority orders mandatory maneuver.",
    icon: "AlertOctagon",
    color: "text-indigo-500",
    scenarioType: "MANDATORY_MANEUVER_ORDER",
    category: "regulatory",
    parameterDefs: [
      {
        type: "slider",
        key: "deadlineDays",
        label: "Deadline",
        min: 1,
        max: 90,
        step: 1,
        defaultValue: 14,
        unit: "days",
      },
    ],
  },
  {
    id: "spectrum-reallocation",
    name: "Spectrum Reallocation",
    description: "Simulate frequency spectrum reallocation.",
    icon: "Waves",
    color: "text-indigo-400",
    scenarioType: "SPECTRUM_REALLOCATION",
    category: "regulatory",
    parameterDefs: [
      {
        type: "slider",
        key: "timelineMonths",
        label: "Timeline",
        min: 3,
        max: 24,
        step: 1,
        defaultValue: 12,
        unit: "months",
      },
    ],
  },
  {
    id: "treaty-change",
    name: "Treaty Change",
    description: "Simulate international treaty amendment.",
    icon: "ScrollText",
    color: "text-indigo-500",
    scenarioType: "TREATY_CHANGE",
    category: "regulatory",
    parameterDefs: [],
  },
  {
    id: "liability-claim",
    name: "Liability Claim",
    description: "Simulate liability claim.",
    icon: "Scale",
    color: "text-indigo-600",
    scenarioType: "LIABILITY_CLAIM",
    category: "regulatory",
    parameterDefs: [
      {
        type: "select",
        key: "basis",
        label: "Basis",
        options: ["fault", "absolute"],
        defaultValue: "fault",
      },
    ],
  },
  {
    id: "nis2-notification-trigger",
    name: "NIS2 Notification Trigger",
    description: "Trigger NIS2 incident notification.",
    icon: "Bell",
    color: "text-indigo-400",
    scenarioType: "NIS2_NOTIFICATION_TRIGGER",
    category: "regulatory",
    parameterDefs: [
      {
        type: "select",
        key: "incidentClass",
        label: "Incident Class",
        options: ["significant", "substantial", "large-scale"],
        defaultValue: "significant",
      },
    ],
  },

  // =========================================================================
  // OPERATIONAL (7)
  // =========================================================================
  {
    id: "eol-extension",
    name: "EOL Extension",
    description: "Extend the satellite end-of-life date by a number of years.",
    icon: "Clock",
    color: "text-amber-500",
    scenarioType: "EOL_EXTENSION",
    category: "operational",
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
    id: "launch-delay",
    name: "Launch Delay",
    description: "Simulate launch schedule delay.",
    icon: "CalendarX",
    color: "text-amber-400",
    scenarioType: "LAUNCH_DELAY",
    category: "operational",
    parameterDefs: [
      {
        type: "slider",
        key: "delayMonths",
        label: "Delay",
        min: 1,
        max: 24,
        step: 1,
        defaultValue: 6,
        unit: "months",
      },
    ],
  },
  {
    id: "mission-scope-change",
    name: "Mission Scope Change",
    description: "Simulate mission scope expansion or reduction.",
    icon: "Maximize2",
    color: "text-amber-500",
    scenarioType: "MISSION_SCOPE_CHANGE",
    category: "operational",
    parameterDefs: [
      {
        type: "select",
        key: "direction",
        label: "Direction",
        options: ["expand", "reduce"],
        defaultValue: "expand",
      },
      {
        type: "slider",
        key: "magnitudePct",
        label: "Magnitude",
        min: 10,
        max: 100,
        step: 1,
        defaultValue: 20,
        unit: "%",
      },
    ],
  },
  {
    id: "software-anomaly",
    name: "Software Anomaly",
    description: "Simulate onboard software anomaly.",
    icon: "Code",
    color: "text-amber-400",
    scenarioType: "SOFTWARE_ANOMALY",
    category: "operational",
    parameterDefs: [
      {
        type: "select",
        key: "subsystem",
        label: "Subsystem",
        options: ["AOCS", "TT&C", "payload", "power"],
        defaultValue: "AOCS",
      },
    ],
  },
  {
    id: "service-interruption",
    name: "Service Interruption",
    description: "Simulate service interruption.",
    icon: "WifiOff",
    color: "text-amber-500",
    scenarioType: "SERVICE_INTERRUPTION",
    category: "operational",
    parameterDefs: [
      {
        type: "slider",
        key: "durationHours",
        label: "Duration",
        min: 1,
        max: 168,
        step: 1,
        defaultValue: 24,
        unit: "hours",
      },
      {
        type: "slider",
        key: "customersAffectedPct",
        label: "Customers Affected",
        min: 10,
        max: 100,
        step: 1,
        defaultValue: 50,
        unit: "%",
      },
    ],
  },
  {
    id: "operations-team-change",
    name: "Operations Team Change",
    description: "Simulate operations staff changes.",
    icon: "UserMinus",
    color: "text-amber-400",
    scenarioType: "OPERATIONS_TEAM_CHANGE",
    category: "operational",
    parameterDefs: [
      {
        type: "slider",
        key: "personnelLossPct",
        label: "Personnel Loss",
        min: 10,
        max: 80,
        step: 1,
        defaultValue: 30,
        unit: "%",
      },
      {
        type: "slider",
        key: "trainingGapMonths",
        label: "Training Gap",
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 3,
        unit: "months",
      },
    ],
  },
  {
    id: "frequency-band-migration",
    name: "Frequency Band Migration",
    description: "Simulate frequency band migration.",
    icon: "Radio",
    color: "text-amber-500",
    scenarioType: "FREQUENCY_BAND_MIGRATION",
    category: "operational",
    parameterDefs: [
      {
        type: "slider",
        key: "timelineMonths",
        label: "Timeline",
        min: 3,
        max: 24,
        step: 1,
        defaultValue: 12,
        unit: "months",
      },
    ],
  },

  // =========================================================================
  // FINANCIAL (5)
  // =========================================================================
  {
    id: "insurance-premium-increase",
    name: "Insurance Premium Increase",
    description: "Simulate insurance premium increase.",
    icon: "TrendingUp",
    color: "text-emerald-500",
    scenarioType: "INSURANCE_PREMIUM_INCREASE",
    category: "financial",
    parameterDefs: [
      {
        type: "slider",
        key: "increasePct",
        label: "Increase",
        min: 10,
        max: 200,
        step: 1,
        defaultValue: 50,
        unit: "%",
      },
    ],
  },
  {
    id: "supply-chain-disruption",
    name: "Supply Chain Disruption",
    description: "Simulate critical component supply disruption.",
    icon: "Truck",
    color: "text-emerald-400",
    scenarioType: "SUPPLY_CHAIN_DISRUPTION",
    category: "financial",
    parameterDefs: [
      {
        type: "slider",
        key: "leadTimeMonths",
        label: "Lead Time",
        min: 3,
        max: 36,
        step: 1,
        defaultValue: 12,
        unit: "months",
      },
    ],
  },
  {
    id: "sanctions-export-control",
    name: "Sanctions / Export Control",
    description: "Simulate sanctions or export control restriction.",
    icon: "Ban",
    color: "text-emerald-600",
    scenarioType: "SANCTIONS_EXPORT_CONTROL",
    category: "financial",
    parameterDefs: [],
  },
  {
    id: "budget-cut",
    name: "Budget Cut",
    description: "Simulate operational budget reduction.",
    icon: "Scissors",
    color: "text-emerald-400",
    scenarioType: "BUDGET_CUT",
    category: "financial",
    parameterDefs: [
      {
        type: "slider",
        key: "reductionPct",
        label: "Reduction",
        min: 10,
        max: 50,
        step: 1,
        defaultValue: 20,
        unit: "%",
      },
    ],
  },
  {
    id: "partner-default",
    name: "Partner Default",
    description: "Simulate partner or supplier default.",
    icon: "UserX",
    color: "text-emerald-500",
    scenarioType: "PARTNER_DEFAULT",
    category: "financial",
    parameterDefs: [
      {
        type: "select",
        key: "criticality",
        label: "Criticality",
        options: ["low", "medium", "high"],
        defaultValue: "medium",
      },
    ],
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
