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
  | "financial"
  | "launch_operations"
  | "vehicle_anomalies"
  | "range_environment"
  | "launch_regulatory"
  | "proximity_operations"
  | "target_events"
  | "isos_regulatory"
  | "site_infrastructure"
  | "site_environmental"
  | "site_regulatory"
  | "capacity_management"
  | "service_operations"
  | "cap_regulatory"
  | "data_operations"
  | "data_security_events"
  | "pdp_regulatory"
  | "ground_operations"
  | "command_events"
  | "tco_regulatory"
  | "cross_type";

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
  {
    id: "launch_operations",
    label: "Launch Operations",
    icon: "Rocket",
    color: "text-blue-500",
  },
  {
    id: "vehicle_anomalies",
    label: "Vehicle Anomalies",
    icon: "AlertTriangle",
    color: "text-amber-500",
  },
  {
    id: "range_environment",
    label: "Range & Environment",
    icon: "MapPin",
    color: "text-cyan-500",
  },
  {
    id: "launch_regulatory",
    label: "Launch Regulatory",
    icon: "FileCheck",
    color: "text-emerald-500",
  },
  {
    id: "proximity_operations",
    label: "Proximity Operations",
    icon: "Target",
    color: "text-violet-500",
  },
  {
    id: "target_events",
    label: "Target Events",
    icon: "Crosshair",
    color: "text-cyan-500",
  },
  {
    id: "isos_regulatory",
    label: "ISOS Regulatory",
    icon: "FileCheck",
    color: "text-emerald-500",
  },
  {
    id: "site_infrastructure",
    label: "Site Infrastructure",
    icon: "Building",
    color: "text-amber-500",
  },
  {
    id: "site_environmental",
    label: "Site Environmental",
    icon: "Leaf",
    color: "text-cyan-500",
  },
  {
    id: "site_regulatory",
    label: "Site Regulatory",
    icon: "FileCheck",
    color: "text-emerald-500",
  },
  // CAP categories
  {
    id: "capacity_management",
    label: "Capacity Management",
    icon: "Server",
    color: "text-blue-500",
  },
  {
    id: "service_operations",
    label: "Service Operations",
    icon: "Settings",
    color: "text-cyan-500",
  },
  {
    id: "cap_regulatory",
    label: "CAP Regulatory",
    icon: "FileCheck",
    color: "text-blue-500",
  },
  // PDP categories
  {
    id: "data_operations",
    label: "Data Operations",
    icon: "Database",
    color: "text-purple-500",
  },
  {
    id: "data_security_events",
    label: "Data Security Events",
    icon: "ShieldAlert",
    color: "text-red-500",
  },
  {
    id: "pdp_regulatory",
    label: "PDP Regulatory",
    icon: "FileCheck",
    color: "text-purple-500",
  },
  // TCO categories
  {
    id: "ground_operations",
    label: "Ground Operations",
    icon: "Radio",
    color: "text-amber-500",
  },
  {
    id: "command_events",
    label: "Command Events",
    icon: "Terminal",
    color: "text-red-500",
  },
  {
    id: "tco_regulatory",
    label: "TCO Regulatory",
    icon: "FileCheck",
    color: "text-amber-500",
  },
  {
    id: "cross_type",
    label: "Cross-Type Dependencies",
    icon: "GitBranch",
    color: "text-violet-500",
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
  /** Operator types this block is available for. Undefined = all types. */
  operatorTypes?: string[];
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

  // =========================================================================
  // LAUNCH OPERATIONS — LO only (4)
  // =========================================================================
  {
    id: "lo-launch-delay",
    name: "Launch Delay",
    description: "Simulate a launch delay and its cascading compliance impact.",
    icon: "Clock",
    color: "text-blue-500",
    scenarioType: "LO_LAUNCH_DELAY",
    category: "launch_operations",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "slider",
        key: "delayDays",
        label: "Delay Duration",
        min: 1,
        max: 365,
        step: 1,
        defaultValue: 30,
        unit: "days",
      },
      {
        type: "select",
        key: "reason",
        label: "Delay Reason",
        options: [
          "technical",
          "weather",
          "regulatory",
          "customer",
          "range_conflict",
        ],
        defaultValue: "technical",
      },
    ],
  },
  {
    id: "lo-launch-window-change",
    name: "Launch Window Change",
    description: "Simulate a change in the available launch window.",
    icon: "Calendar",
    color: "text-blue-400",
    scenarioType: "LO_LAUNCH_WINDOW_CHANGE",
    category: "launch_operations",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "slider",
        key: "windowShiftDays",
        label: "Window Shift",
        min: -90,
        max: 90,
        step: 1,
        defaultValue: 14,
        unit: "days",
      },
      {
        type: "slider",
        key: "windowDurationDays",
        label: "New Window Duration",
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 7,
        unit: "days",
      },
    ],
  },
  {
    id: "lo-pad-turnaround-delay",
    name: "Pad Turnaround Delay",
    description: "Simulate delayed pad availability between campaigns.",
    icon: "Timer",
    color: "text-blue-500",
    scenarioType: "LO_PAD_TURNAROUND_DELAY",
    category: "launch_operations",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "slider",
        key: "additionalDays",
        label: "Additional Days",
        min: 1,
        max: 90,
        step: 1,
        defaultValue: 14,
        unit: "days",
      },
    ],
  },
  {
    id: "lo-multi-manifest-change",
    name: "Multi-Manifest Change",
    description: "Simulate adding or removing a payload from the manifest.",
    icon: "Layers",
    color: "text-blue-400",
    scenarioType: "LO_MULTI_MANIFEST_CHANGE",
    category: "launch_operations",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "action",
        label: "Action",
        options: ["add_payload", "remove_payload"],
        defaultValue: "add_payload",
      },
      {
        type: "select",
        key: "payloadClassification",
        label: "Payload Classification",
        options: ["unclassified", "controlled", "itar_restricted"],
        defaultValue: "unclassified",
      },
    ],
  },

  // =========================================================================
  // VEHICLE ANOMALIES — LO only (5)
  // =========================================================================
  {
    id: "lo-engine-anomaly",
    name: "Engine Anomaly",
    description: "Simulate an engine anomaly during test or flight.",
    icon: "Flame",
    color: "text-amber-500",
    scenarioType: "LO_ENGINE_ANOMALY",
    category: "vehicle_anomalies",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "stage",
        label: "Stage",
        options: ["first_stage", "second_stage", "upper_stage"],
        defaultValue: "first_stage",
      },
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["minor", "major", "catastrophic"],
        defaultValue: "major",
      },
    ],
  },
  {
    id: "lo-fts-activation",
    name: "FTS Activation",
    description: "Simulate a Flight Termination System activation event.",
    icon: "AlertOctagon",
    color: "text-amber-600",
    scenarioType: "LO_FTS_ACTIVATION",
    category: "vehicle_anomalies",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "flightPhase",
        label: "Flight Phase",
        options: [
          "first_stage_burn",
          "stage_separation",
          "upper_stage_burn",
          "coast",
        ],
        defaultValue: "first_stage_burn",
      },
    ],
  },
  {
    id: "lo-stage-separation-anomaly",
    name: "Stage Separation Anomaly",
    description: "Simulate a stage separation failure or delay.",
    icon: "Unlink",
    color: "text-amber-400",
    scenarioType: "LO_STAGE_SEPARATION_ANOMALY",
    category: "vehicle_anomalies",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "outcome",
        label: "Outcome",
        options: [
          "delayed_separation",
          "partial_separation",
          "failed_separation",
        ],
        defaultValue: "delayed_separation",
      },
    ],
  },
  {
    id: "lo-fairing-failure",
    name: "Fairing Failure",
    description: "Simulate a payload fairing separation failure.",
    icon: "ShieldOff",
    color: "text-amber-500",
    scenarioType: "LO_FAIRING_FAILURE",
    category: "vehicle_anomalies",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "failureType",
        label: "Failure Type",
        options: ["delayed_separation", "partial_separation", "no_separation"],
        defaultValue: "delayed_separation",
      },
    ],
  },
  {
    id: "lo-upper-stage-restart-failure",
    name: "Upper Stage Restart Failure",
    description:
      "Simulate an upper stage restart failure affecting orbit insertion.",
    icon: "RefreshCwOff",
    color: "text-amber-600",
    scenarioType: "LO_UPPER_STAGE_RESTART_FAILURE",
    category: "vehicle_anomalies",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "slider",
        key: "restartAttempt",
        label: "Restart Attempt",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 2,
        unit: "",
      },
    ],
  },

  // =========================================================================
  // RANGE & ENVIRONMENT — LO only (4)
  // =========================================================================
  {
    id: "lo-range-safety-violation",
    name: "Range Safety Violation",
    description:
      "Simulate a trajectory deviation triggering range safety concerns.",
    icon: "AlertTriangle",
    color: "text-cyan-500",
    scenarioType: "LO_RANGE_SAFETY_VIOLATION",
    category: "range_environment",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "deviationType",
        label: "Deviation Type",
        options: ["azimuth", "altitude", "velocity", "debris_footprint"],
        defaultValue: "azimuth",
      },
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["minor", "major", "critical"],
        defaultValue: "major",
      },
    ],
  },
  {
    id: "lo-weather-delay",
    name: "Weather Delay",
    description: "Simulate weather-related launch delays.",
    icon: "CloudRain",
    color: "text-cyan-400",
    scenarioType: "LO_WEATHER_DELAY",
    category: "range_environment",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "slider",
        key: "delayDays",
        label: "Expected Delay",
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 3,
        unit: "days",
      },
      {
        type: "select",
        key: "weatherType",
        label: "Weather Type",
        options: [
          "wind",
          "lightning",
          "visibility",
          "upper_wind_shear",
          "precipitation",
        ],
        defaultValue: "wind",
      },
    ],
  },
  {
    id: "lo-environmental-protest",
    name: "Environmental Protest/Injunction",
    description: "Simulate an environmental challenge to launch operations.",
    icon: "Scale",
    color: "text-cyan-500",
    scenarioType: "LO_ENVIRONMENTAL_PROTEST",
    category: "range_environment",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "type",
        label: "Challenge Type",
        options: ["protest", "legal_injunction", "regulatory_review"],
        defaultValue: "regulatory_review",
      },
      {
        type: "slider",
        key: "estimatedDelayDays",
        label: "Estimated Delay",
        min: 7,
        max: 365,
        step: 1,
        defaultValue: 60,
        unit: "days",
      },
    ],
  },
  {
    id: "lo-overflight-restriction",
    name: "Overflight Restriction Change",
    description:
      "Simulate a change in overflight restrictions affecting launch azimuth.",
    icon: "MapPinOff",
    color: "text-cyan-600",
    scenarioType: "LO_OVERFLIGHT_RESTRICTION",
    category: "range_environment",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "restrictionType",
        label: "Type",
        options: ["new_restriction", "expanded_zone", "temporary_tfr"],
        defaultValue: "new_restriction",
      },
    ],
  },

  // =========================================================================
  // LAUNCH REGULATORY — LO only (3)
  // =========================================================================
  {
    id: "lo-launch-license-condition-change",
    name: "Launch License Condition Change",
    description: "Simulate a change in launch license conditions by the NCA.",
    icon: "FileEdit",
    color: "text-emerald-500",
    scenarioType: "LO_LAUNCH_LICENSE_CONDITION_CHANGE",
    category: "launch_regulatory",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "conditionType",
        label: "Condition",
        options: [
          "insurance_increase",
          "additional_safety_review",
          "environmental_restriction",
          "frequency_restriction",
          "launch_rate_limit",
        ],
        defaultValue: "additional_safety_review",
      },
    ],
  },
  {
    id: "lo-payload-classification-change",
    name: "Payload Classification Change",
    description: "Simulate a payload being reclassified under export control.",
    icon: "Tag",
    color: "text-emerald-400",
    scenarioType: "LO_PAYLOAD_CLASSIFICATION_CHANGE",
    category: "launch_regulatory",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "newClassification",
        label: "New Classification",
        options: ["unclassified", "controlled", "itar_restricted"],
        defaultValue: "controlled",
      },
    ],
  },
  {
    id: "lo-technology-transfer-issue",
    name: "Technology Transfer Issue",
    description: "Simulate a technology transfer compliance issue.",
    icon: "Lock",
    color: "text-emerald-500",
    scenarioType: "LO_TECHNOLOGY_TRANSFER_ISSUE",
    category: "launch_regulatory",
    operatorTypes: ["LO"],
    parameterDefs: [
      {
        type: "select",
        key: "issueType",
        label: "Issue",
        options: [
          "denied_license",
          "additional_review",
          "partner_country_restriction",
        ],
        defaultValue: "additional_review",
      },
    ],
  },

  // =========================================================================
  // ISOS — PROXIMITY OPERATIONS (4)
  // =========================================================================
  {
    id: "isos-approach-abort",
    name: "Approach Abort",
    description: "Simulate aborting the approach to the target.",
    icon: "ArrowLeftCircle",
    color: "text-violet-500",
    scenarioType: "ISOS_APPROACH_ABORT",
    category: "proximity_operations",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "abortPhase",
        label: "Phase",
        options: [
          "far_approach",
          "close_approach",
          "final_approach",
          "docking",
        ],
        defaultValue: "close_approach",
      },
      {
        type: "select",
        key: "reason",
        label: "Reason",
        options: [
          "target_tumble",
          "sensor_failure",
          "fuel_low",
          "ground_command",
          "collision_risk",
        ],
        defaultValue: "target_tumble",
      },
    ],
  },
  {
    id: "isos-keepout-zone-violation",
    name: "Keep-Out Zone Violation",
    description: "Simulate an unintended entry into the target keep-out zone.",
    icon: "ShieldAlert",
    color: "text-violet-600",
    scenarioType: "ISOS_KEEPOUT_ZONE_VIOLATION",
    category: "proximity_operations",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "slider",
        key: "violationDistanceKm",
        label: "Distance at Violation",
        min: 0.01,
        max: 10,
        step: 0.1,
        defaultValue: 0.5,
        unit: "km",
      },
      {
        type: "select",
        key: "duration",
        label: "Duration in Zone",
        options: ["seconds", "minutes", "sustained"],
        defaultValue: "minutes",
      },
    ],
  },
  {
    id: "isos-relative-nav-failure",
    name: "Relative Navigation Failure",
    description: "Simulate failure of the relative navigation system.",
    icon: "Compass",
    color: "text-violet-400",
    scenarioType: "ISOS_RELATIVE_NAV_FAILURE",
    category: "proximity_operations",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "sensorType",
        label: "Failed Sensor",
        options: ["lidar", "camera", "radar", "gps_relative", "all"],
        defaultValue: "lidar",
      },
      {
        type: "select",
        key: "redundancy",
        label: "Backup Available",
        options: ["yes", "degraded", "none"],
        defaultValue: "degraded",
      },
    ],
  },
  {
    id: "isos-capture-mechanism-failure",
    name: "Capture Mechanism Failure",
    description: "Simulate failure of the capture/docking mechanism.",
    icon: "Hand",
    color: "text-violet-500",
    scenarioType: "ISOS_CAPTURE_MECHANISM_FAILURE",
    category: "proximity_operations",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "failureType",
        label: "Failure",
        options: [
          "partial_grip",
          "no_grip",
          "stuck_open",
          "stuck_closed",
          "misalignment",
        ],
        defaultValue: "partial_grip",
      },
      {
        type: "select",
        key: "retryPossible",
        label: "Retry Possible",
        options: ["yes", "no"],
        defaultValue: "yes",
      },
    ],
  },

  // =========================================================================
  // ISOS — TARGET EVENTS (3)
  // =========================================================================
  {
    id: "isos-target-tumble-increase",
    name: "Target Tumble Rate Increase",
    description: "Simulate the target satellite increasing its tumble rate.",
    icon: "RotateCcw",
    color: "text-cyan-500",
    scenarioType: "ISOS_TARGET_TUMBLE_INCREASE",
    category: "target_events",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "tumbleRate",
        label: "Tumble Rate",
        options: ["slow_stable", "moderate", "fast", "chaotic"],
        defaultValue: "moderate",
      },
    ],
  },
  {
    id: "isos-target-debris-cloud",
    name: "Target Debris Cloud",
    description: "Simulate debris generation near the target.",
    icon: "Cloud",
    color: "text-cyan-400",
    scenarioType: "ISOS_TARGET_DEBRIS_CLOUD",
    category: "target_events",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "source",
        label: "Source",
        options: [
          "target_breakup",
          "nearby_collision",
          "nearby_explosion",
          "micrometeoroid",
        ],
        defaultValue: "nearby_collision",
      },
      {
        type: "select",
        key: "debrisDensity",
        label: "Density",
        options: ["low", "medium", "high"],
        defaultValue: "medium",
      },
    ],
  },
  {
    id: "isos-target-non-cooperation",
    name: "Target Owner Non-Cooperation",
    description: "Simulate the target operator withdrawing cooperation.",
    icon: "UserX",
    color: "text-cyan-600",
    scenarioType: "ISOS_TARGET_NON_COOPERATION",
    category: "target_events",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "reason",
        label: "Reason",
        options: [
          "commercial_dispute",
          "regulatory_order",
          "changed_plans",
          "operator_bankrupt",
        ],
        defaultValue: "commercial_dispute",
      },
    ],
  },

  // =========================================================================
  // ISOS — ISOS REGULATORY (3)
  // =========================================================================
  {
    id: "isos-authorization-change",
    name: "ISOS Authorization Change (Art. 63)",
    description: "Simulate a change in Art. 63 ISOS authorization conditions.",
    icon: "FileEdit",
    color: "text-emerald-500",
    scenarioType: "ISOS_AUTHORIZATION_CHANGE",
    category: "isos_regulatory",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "changeType",
        label: "Change",
        options: [
          "keepout_zone_increase",
          "additional_safety_review",
          "insurance_increase",
          "consent_revocation",
          "approach_speed_limit",
        ],
        defaultValue: "keepout_zone_increase",
      },
    ],
  },
  {
    id: "isos-debris-remediation-order",
    name: "Debris Remediation Order",
    description: "Simulate a regulatory order mandating debris removal.",
    icon: "Trash2",
    color: "text-emerald-400",
    scenarioType: "ISOS_DEBRIS_REMEDIATION_ORDER",
    category: "isos_regulatory",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "slider",
        key: "timelineDays",
        label: "Compliance Timeline",
        min: 30,
        max: 730,
        step: 30,
        defaultValue: 180,
        unit: "days",
      },
      {
        type: "slider",
        key: "targetCount",
        label: "Objects to Remove",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 1,
        unit: "",
      },
    ],
  },
  {
    id: "isos-oos-standard-change",
    name: "On-Orbit Servicing Standard Change",
    description:
      "Simulate a change in international OOS standards (CONFERS, ISO).",
    icon: "BookOpen",
    color: "text-emerald-500",
    scenarioType: "ISOS_OOS_STANDARD_CHANGE",
    category: "isos_regulatory",
    operatorTypes: ["ISOS"],
    parameterDefs: [
      {
        type: "select",
        key: "standard",
        label: "Standard",
        options: [
          "confers_best_practices",
          "iso_24113_update",
          "iadc_guidelines_update",
          "national_regulation",
        ],
        defaultValue: "confers_best_practices",
      },
      {
        type: "select",
        key: "impact",
        label: "Impact Level",
        options: ["minor_update", "significant_change", "major_overhaul"],
        defaultValue: "significant_change",
      },
    ],
  },

  // =========================================================================
  // LSO — SITE INFRASTRUCTURE (4)
  // =========================================================================
  {
    id: "lso-pad-damage",
    name: "Pad Damage",
    description: "Simulate damage to a launch pad.",
    icon: "Hammer",
    color: "text-amber-500",
    scenarioType: "LSO_PAD_DAMAGE",
    category: "site_infrastructure",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["minor_surface", "structural", "major_destruction"],
        defaultValue: "structural",
      },
      {
        type: "select",
        key: "padId",
        label: "Affected Pad",
        options: ["pad_1", "pad_2", "all_pads"],
        defaultValue: "pad_1",
      },
      {
        type: "slider",
        key: "repairTimeDays",
        label: "Est. Repair Time",
        min: 7,
        max: 365,
        step: 7,
        defaultValue: 90,
        unit: "days",
      },
    ],
  },
  {
    id: "lso-range-radar-failure",
    name: "Range Radar Failure",
    description: "Simulate failure of the range safety radar system.",
    icon: "Radio",
    color: "text-amber-400",
    scenarioType: "LSO_RANGE_RADAR_FAILURE",
    category: "site_infrastructure",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "failureType",
        label: "Type",
        options: ["degraded_accuracy", "intermittent", "total_failure"],
        defaultValue: "degraded_accuracy",
      },
      {
        type: "select",
        key: "redundancyAvailable",
        label: "Backup Radar",
        options: ["yes", "no"],
        defaultValue: "yes",
      },
    ],
  },
  {
    id: "lso-fts-system-failure",
    name: "FTS System Failure",
    description: "Simulate a Flight Termination System failure.",
    icon: "AlertOctagon",
    color: "text-amber-600",
    scenarioType: "LSO_FTS_SYSTEM_FAILURE",
    category: "site_infrastructure",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "component",
        label: "Failed Component",
        options: [
          "command_transmitter",
          "destruct_receiver",
          "safe_arm_device",
          "software",
        ],
        defaultValue: "command_transmitter",
      },
    ],
  },
  {
    id: "lso-weather-station-outage",
    name: "Weather Station Outage",
    description: "Simulate meteorological system failure.",
    icon: "CloudOff",
    color: "text-amber-400",
    scenarioType: "LSO_WEATHER_STATION_OUTAGE",
    category: "site_infrastructure",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "systemsAffected",
        label: "Systems",
        options: [
          "wind_profiler",
          "lightning_detection",
          "upper_atmosphere",
          "all",
        ],
        defaultValue: "wind_profiler",
      },
    ],
  },

  // =========================================================================
  // LSO — SITE ENVIRONMENTAL (3)
  // =========================================================================
  {
    id: "lso-noise-compliance-violation",
    name: "Noise Compliance Violation",
    description: "Simulate exceeding noise limits during launch operations.",
    icon: "VolumeX",
    color: "text-cyan-500",
    scenarioType: "LSO_NOISE_COMPLIANCE_VIOLATION",
    category: "site_environmental",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "slider",
        key: "excessDb",
        label: "Excess (dB)",
        min: 1,
        max: 30,
        step: 1,
        defaultValue: 5,
        unit: "dB",
      },
    ],
  },
  {
    id: "lso-emission-limit-breach",
    name: "Emission Limit Breach",
    description: "Simulate exceeding environmental emission limits.",
    icon: "Wind",
    color: "text-cyan-400",
    scenarioType: "LSO_EMISSION_LIMIT_BREACH",
    category: "site_environmental",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "emissionType",
        label: "Type",
        options: ["hcl", "alumina", "co2", "nox", "particulate"],
        defaultValue: "hcl",
      },
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["marginal", "significant", "major"],
        defaultValue: "marginal",
      },
    ],
  },
  {
    id: "lso-wildlife-impact-assessment",
    name: "Wildlife Impact Assessment Required",
    description: "Simulate a regulatory requirement for wildlife impact study.",
    icon: "Bird",
    color: "text-cyan-500",
    scenarioType: "LSO_WILDLIFE_IMPACT_ASSESSMENT",
    category: "site_environmental",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "species",
        label: "Protected Species",
        options: [
          "marine_mammals",
          "nesting_birds",
          "migratory_species",
          "multiple",
        ],
        defaultValue: "nesting_birds",
      },
      {
        type: "slider",
        key: "assessmentTimeDays",
        label: "Assessment Duration",
        min: 30,
        max: 365,
        step: 30,
        defaultValue: 90,
        unit: "days",
      },
    ],
  },

  // =========================================================================
  // LSO — SITE REGULATORY (3)
  // =========================================================================
  {
    id: "lso-site-license-condition-change",
    name: "Site License Condition Change",
    description: "Simulate a change in launch site license conditions.",
    icon: "FileEdit",
    color: "text-emerald-500",
    scenarioType: "LSO_SITE_LICENSE_CONDITION_CHANGE",
    category: "site_regulatory",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "conditionType",
        label: "Condition",
        options: [
          "launch_rate_reduction",
          "operating_hours_restriction",
          "additional_environmental_monitoring",
          "safety_zone_expansion",
          "insurance_increase",
        ],
        defaultValue: "launch_rate_reduction",
      },
    ],
  },
  {
    id: "lso-airspace-restriction-change",
    name: "Airspace Restriction Change",
    description: "Simulate changes to airspace restrictions around the site.",
    icon: "Plane",
    color: "text-emerald-400",
    scenarioType: "LSO_AIRSPACE_RESTRICTION_CHANGE",
    category: "site_regulatory",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "changeType",
        label: "Change",
        options: [
          "new_air_route",
          "restricted_zone_expansion",
          "temporary_flight_restriction",
          "military_exercise",
        ],
        defaultValue: "new_air_route",
      },
    ],
  },
  {
    id: "lso-notam-conflict",
    name: "NOTAM Conflict",
    description: "Simulate a conflict with a Notice to Air Missions.",
    icon: "FileWarning",
    color: "text-emerald-500",
    scenarioType: "LSO_NOTAM_CONFLICT",
    category: "site_regulatory",
    operatorTypes: ["LSO"],
    parameterDefs: [
      {
        type: "select",
        key: "conflictType",
        label: "Conflict",
        options: [
          "overlapping_notam",
          "military_priority",
          "commercial_aviation_reroute",
          "international_overflight",
        ],
        defaultValue: "overlapping_notam",
      },
    ],
  },

  // =========================================================================
  // CAP — CAPACITY MANAGEMENT (5)
  // =========================================================================
  {
    id: "cap-service-outage",
    name: "Service Outage",
    description: "Simulate a partial or total service outage.",
    icon: "WifiOff",
    color: "text-blue-600",
    scenarioType: "CAP_SERVICE_OUTAGE",
    category: "capacity_management",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "select",
        key: "scope",
        label: "Scope",
        options: ["partial", "total"],
        defaultValue: "partial",
      },
      {
        type: "slider",
        key: "durationHours",
        label: "Duration",
        min: 1,
        max: 720,
        step: 1,
        defaultValue: 24,
        unit: "hours",
      },
    ],
  },
  {
    id: "cap-capacity-degradation",
    name: "Capacity Degradation",
    description: "Simulate a reduction in available capacity.",
    icon: "TrendingDown",
    color: "text-blue-500",
    scenarioType: "CAP_CAPACITY_DEGRADATION",
    category: "capacity_management",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "slider",
        key: "degradationPct",
        label: "Degradation",
        min: 5,
        max: 100,
        step: 5,
        defaultValue: 20,
        unit: "%",
      },
    ],
  },
  {
    id: "cap-sla-breach",
    name: "SLA Breach",
    description: "Simulate a service level agreement breach.",
    icon: "FileX",
    color: "text-blue-400",
    scenarioType: "CAP_SLA_BREACH",
    category: "capacity_management",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "select",
        key: "severity",
        label: "Severity",
        options: ["minor", "major"],
        defaultValue: "minor",
      },
      {
        type: "slider",
        key: "customersAffected",
        label: "Customers Affected",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 1,
        unit: "",
      },
    ],
  },
  {
    id: "cap-ground-segment-failure",
    name: "Ground Segment Failure",
    description: "Simulate a failure in the ground segment infrastructure.",
    icon: "ServerCrash",
    color: "text-blue-500",
    scenarioType: "CAP_GROUND_SEGMENT_FAILURE",
    category: "capacity_management",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "select",
        key: "component",
        label: "Component",
        options: ["noc", "gateway", "teleport", "monitoring"],
        defaultValue: "noc",
      },
      {
        type: "select",
        key: "redundancy",
        label: "Redundancy Available",
        options: ["yes", "no"],
        defaultValue: "yes",
      },
    ],
  },
  {
    id: "cap-bandwidth-saturation",
    name: "Bandwidth Saturation",
    description: "Simulate bandwidth utilization reaching saturation.",
    icon: "Gauge",
    color: "text-blue-400",
    scenarioType: "CAP_BANDWIDTH_SATURATION",
    category: "capacity_management",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "slider",
        key: "utilizationPct",
        label: "Utilization",
        min: 80,
        max: 110,
        step: 1,
        defaultValue: 95,
        unit: "%",
      },
    ],
  },

  // =========================================================================
  // CAP — SERVICE OPERATIONS (1)
  // =========================================================================
  {
    id: "cap-customer-migration",
    name: "Customer Migration",
    description: "Simulate a customer migration event.",
    icon: "ArrowRightLeft",
    color: "text-cyan-500",
    scenarioType: "CAP_CUSTOMER_MIGRATION",
    category: "service_operations",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "select",
        key: "scale",
        label: "Scale",
        options: ["single", "batch", "fleet_wide"],
        defaultValue: "single",
      },
    ],
  },

  // =========================================================================
  // CAP — CAP REGULATORY (2)
  // =========================================================================
  {
    id: "cap-nis2-classification-change",
    name: "NIS2 Classification Change",
    description: "Simulate a change in NIS2 entity classification.",
    icon: "Shield",
    color: "text-blue-500",
    scenarioType: "CAP_NIS2_CLASSIFICATION_CHANGE",
    category: "cap_regulatory",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "select",
        key: "newClassification",
        label: "New Classification",
        options: ["essential", "important", "out_of_scope"],
        defaultValue: "essential",
      },
    ],
  },
  {
    id: "cap-data-sovereignty-change",
    name: "Data Sovereignty Change",
    description: "Simulate a data sovereignty or jurisdiction change.",
    icon: "Globe",
    color: "text-blue-400",
    scenarioType: "CAP_DATA_SOVEREIGNTY_CHANGE",
    category: "cap_regulatory",
    operatorTypes: ["CAP"],
    parameterDefs: [
      {
        type: "select",
        key: "scope",
        label: "Scope",
        options: ["single_jurisdiction", "multi_jurisdiction"],
        defaultValue: "single_jurisdiction",
      },
    ],
  },

  // =========================================================================
  // PDP — DATA OPERATIONS (3)
  // =========================================================================
  {
    id: "pdp-data-breach",
    name: "Data Breach",
    description: "Simulate a data breach incident.",
    icon: "ShieldOff",
    color: "text-purple-600",
    scenarioType: "PDP_DATA_BREACH",
    category: "data_operations",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "dataType",
        label: "Data Type",
        options: ["imagery", "sar", "metadata", "restricted", "classified"],
        defaultValue: "imagery",
      },
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
    id: "pdp-ground-station-outage",
    name: "Ground Station Outage",
    description: "Simulate a ground station outage affecting data acquisition.",
    icon: "Radio",
    color: "text-purple-500",
    scenarioType: "PDP_GROUND_STATION_OUTAGE",
    category: "data_operations",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "stationsAffected",
        label: "Stations Affected",
        options: ["single", "multiple", "all"],
        defaultValue: "single",
      },
    ],
  },
  {
    id: "pdp-quality-degradation",
    name: "Quality Degradation",
    description: "Simulate a degradation in data quality.",
    icon: "TrendingDown",
    color: "text-purple-400",
    scenarioType: "PDP_QUALITY_DEGRADATION",
    category: "data_operations",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "degradationType",
        label: "Degradation Type",
        options: ["resolution", "radiometric", "geometric", "total_loss"],
        defaultValue: "resolution",
      },
    ],
  },

  // =========================================================================
  // PDP — DATA SECURITY EVENTS (2)
  // =========================================================================
  {
    id: "pdp-archive-corruption",
    name: "Archive Corruption",
    description: "Simulate corruption of the data archive.",
    icon: "DatabaseZap",
    color: "text-red-500",
    scenarioType: "PDP_ARCHIVE_CORRUPTION",
    category: "data_security_events",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "extent",
        label: "Extent",
        options: ["partial", "total"],
        defaultValue: "partial",
      },
    ],
  },
  {
    id: "pdp-distribution-violation",
    name: "Distribution Violation",
    description: "Simulate unauthorized data distribution.",
    icon: "Ban",
    color: "text-red-400",
    scenarioType: "PDP_DISTRIBUTION_VIOLATION",
    category: "data_security_events",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "violationType",
        label: "Violation Type",
        options: ["unauthorized_access", "license_violation", "export_control"],
        defaultValue: "unauthorized_access",
      },
    ],
  },

  // =========================================================================
  // PDP — PDP REGULATORY (2)
  // =========================================================================
  {
    id: "pdp-nis2-classification-change",
    name: "NIS2 Classification Change",
    description: "Simulate a change in NIS2 entity classification.",
    icon: "Shield",
    color: "text-purple-500",
    scenarioType: "PDP_NIS2_CLASSIFICATION_CHANGE",
    category: "pdp_regulatory",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "newClassification",
        label: "New Classification",
        options: ["essential", "important", "out_of_scope"],
        defaultValue: "essential",
      },
    ],
  },
  {
    id: "pdp-data-sovereignty-change",
    name: "Data Sovereignty Change",
    description: "Simulate a data sovereignty or jurisdiction change.",
    icon: "Globe",
    color: "text-purple-400",
    scenarioType: "PDP_DATA_SOVEREIGNTY_CHANGE",
    category: "pdp_regulatory",
    operatorTypes: ["PDP"],
    parameterDefs: [
      {
        type: "select",
        key: "scope",
        label: "Scope",
        options: ["single_jurisdiction", "multi_jurisdiction"],
        defaultValue: "single_jurisdiction",
      },
    ],
  },

  // =========================================================================
  // TCO — GROUND OPERATIONS (3)
  // =========================================================================
  {
    id: "tco-command-link-loss",
    name: "Command Link Loss",
    description: "Simulate loss of command link to spacecraft.",
    icon: "Unlink",
    color: "text-amber-600",
    scenarioType: "TCO_COMMAND_LINK_LOSS",
    category: "ground_operations",
    operatorTypes: ["TCO"],
    parameterDefs: [
      {
        type: "select",
        key: "duration",
        label: "Duration",
        options: ["temporary", "extended", "permanent"],
        defaultValue: "temporary",
      },
      {
        type: "slider",
        key: "affectedSatellites",
        label: "Affected Satellites",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 1,
        unit: "",
      },
    ],
  },
  {
    id: "tco-tracking-accuracy-degradation",
    name: "Tracking Accuracy Degradation",
    description: "Simulate degradation in tracking accuracy.",
    icon: "Crosshair",
    color: "text-amber-500",
    scenarioType: "TCO_TRACKING_ACCURACY_DEGRADATION",
    category: "ground_operations",
    operatorTypes: ["TCO"],
    parameterDefs: [
      {
        type: "select",
        key: "degradationLevel",
        label: "Degradation Level",
        options: ["moderate", "severe", "total_loss"],
        defaultValue: "moderate",
      },
    ],
  },
  {
    id: "tco-ground-station-failure",
    name: "Ground Station Failure",
    description: "Simulate a ground station system failure.",
    icon: "Building",
    color: "text-amber-400",
    scenarioType: "TCO_GROUND_STATION_FAILURE",
    category: "ground_operations",
    operatorTypes: ["TCO"],
    parameterDefs: [
      {
        type: "select",
        key: "failureType",
        label: "Failure Type",
        options: ["partial", "total"],
        defaultValue: "partial",
      },
      {
        type: "select",
        key: "redundancy",
        label: "Redundancy Available",
        options: ["yes", "no"],
        defaultValue: "yes",
      },
    ],
  },

  // =========================================================================
  // TCO — COMMAND EVENTS (3)
  // =========================================================================
  {
    id: "tco-antenna-failure",
    name: "Antenna Failure",
    description: "Simulate a ground antenna failure.",
    icon: "Radio",
    color: "text-red-500",
    scenarioType: "TCO_ANTENNA_FAILURE",
    category: "command_events",
    operatorTypes: ["TCO"],
    parameterDefs: [
      {
        type: "select",
        key: "antennaType",
        label: "Antenna Type",
        options: ["primary", "secondary", "backup"],
        defaultValue: "primary",
      },
    ],
  },
  {
    id: "tco-timing-synchronization-loss",
    name: "Timing Synchronization Loss",
    description: "Simulate loss of timing synchronization.",
    icon: "Clock",
    color: "text-red-400",
    scenarioType: "TCO_TIMING_SYNCHRONIZATION_LOSS",
    category: "command_events",
    operatorTypes: ["TCO"],
    parameterDefs: [],
  },
  {
    id: "tco-command-authentication-breach",
    name: "Command Authentication Breach",
    description: "Simulate a breach in command authentication security.",
    icon: "ShieldAlert",
    color: "text-red-600",
    scenarioType: "TCO_COMMAND_AUTHENTICATION_BREACH",
    category: "command_events",
    operatorTypes: ["TCO"],
    parameterDefs: [],
  },

  // =========================================================================
  // TCO — TCO REGULATORY (2)
  // =========================================================================
  {
    id: "tco-nis2-classification-change",
    name: "NIS2 Classification Change",
    description: "Simulate a change in NIS2 entity classification.",
    icon: "Shield",
    color: "text-amber-500",
    scenarioType: "TCO_NIS2_CLASSIFICATION_CHANGE",
    category: "tco_regulatory",
    operatorTypes: ["TCO"],
    parameterDefs: [
      {
        type: "select",
        key: "newClassification",
        label: "New Classification",
        options: ["essential", "important", "out_of_scope"],
        defaultValue: "essential",
      },
    ],
  },
  {
    id: "tco-interoperability-failure",
    name: "Interoperability Failure",
    description: "Simulate an interoperability or protocol failure.",
    icon: "GitBranch",
    color: "text-amber-400",
    scenarioType: "TCO_INTEROPERABILITY_FAILURE",
    category: "tco_regulatory",
    operatorTypes: ["TCO"],
    parameterDefs: [
      {
        type: "select",
        key: "scope",
        label: "Scope",
        options: ["single_protocol", "multi_protocol"],
        defaultValue: "single_protocol",
      },
    ],
  },

  // =========================================================================
  // CROSS-TYPE DEPENDENCIES (1)
  // =========================================================================
  {
    id: "dependency-failure",
    name: "Dependency Failure",
    description:
      "Simulate the impact of an upstream dependency failing on this entity.",
    icon: "GitBranch",
    color: "text-violet-500",
    scenarioType: "DEPENDENCY_FAILURE",
    category: "cross_type",
    parameterDefs: [
      {
        type: "select",
        key: "dependencyType",
        label: "Dependency Type",
        options: [
          "TTC_PROVIDER",
          "LAUNCH_PROVIDER",
          "LAUNCH_SITE",
          "CAPACITY_SOURCE",
          "DATA_SOURCE",
          "SERVICING_TARGET",
          "DATA_PROVIDER",
          "GROUND_NETWORK",
          "INSURANCE_SHARED",
        ],
        defaultValue: "TTC_PROVIDER",
      },
      {
        type: "select",
        key: "strength",
        label: "Dependency Strength",
        options: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        defaultValue: "HIGH",
      },
      {
        type: "slider",
        key: "scoreDelta",
        label: "Upstream Score Drop",
        min: -50,
        max: -5,
        step: 5,
        defaultValue: -20,
        unit: "pts",
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
