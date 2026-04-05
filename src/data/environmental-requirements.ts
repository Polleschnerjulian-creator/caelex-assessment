/**
 * Environmental Footprint Declaration (EFD) Requirements
 * Based on EU Space Act (COM(2025) 335) — proposed regulation, not yet in force.
 * Primary data source for the Environmental module.
 */

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// Environmental Footprint Module Data
// Based on EU Space Act Articles 44-46 and anticipated PEFCR for Space sector
// Reference: Product Environmental Footprint Category Rules methodology

// ─── Types ───

export type ImpactCategoryCode =
  | "GWP"
  | "ODP"
  | "AP"
  | "EP_FW"
  | "EP_M"
  | "EP_T"
  | "POCP"
  | "ADP_MM"
  | "ADP_F"
  | "WU"
  | "PM"
  | "IRP"
  | "ETP_FW"
  | "HTP_C"
  | "HTP_NC"
  | "LU";

export type LifecyclePhase =
  | "raw_material_extraction"
  | "manufacturing"
  | "transport_to_launch"
  | "launch"
  | "operations"
  | "end_of_life";

export type PropellantType =
  | "hydrazine"
  | "monomethylhydrazine"
  | "nitrogen_tetroxide"
  | "rp1_kerosene"
  | "liquid_hydrogen"
  | "liquid_oxygen"
  | "liquid_methane"
  | "solid_propellant"
  | "xenon"
  | "krypton"
  | "argon"
  | "iodine"
  | "green_propellant";

export type LaunchVehicleId =
  | "ariane_6"
  | "vega_c"
  | "falcon_9"
  | "falcon_heavy"
  | "electron"
  | "soyuz"
  | "generic_small"
  | "new_glenn"
  | "starship"
  | "pslv"
  | "long_march_2d"
  | "miura_5"
  | "prime"
  | "spectrum";

export type EFDGrade = "A" | "B" | "C" | "D" | "E";

export type AssessmentStatus =
  | "draft"
  | "data_collection"
  | "calculation"
  | "review"
  | "submitted"
  | "approved";

// ─── Impact Category Definitions ───

export interface ImpactCategory {
  code: ImpactCategoryCode;
  name: string;
  unit: string;
  description: string;
  spaceNotes: string;
  normalizationFactor: number;
  weightingFactor: number;
}

export const impactCategories: Record<ImpactCategoryCode, ImpactCategory> = {
  GWP: {
    code: "GWP",
    name: "Climate Change",
    unit: "kg CO2 eq",
    description:
      "Global Warming Potential - contribution to climate change from greenhouse gas emissions",
    spaceNotes:
      "Launch emissions dominate. Black carbon from solid propellants has high altitude multiplier (2-3x). Upper atmosphere effects not fully characterized.",
    normalizationFactor: 8100,
    weightingFactor: 0.2106,
  },
  ODP: {
    code: "ODP",
    name: "Ozone Depletion",
    unit: "kg CFC-11 eq",
    description: "Stratospheric ozone depletion potential",
    spaceNotes:
      "Critical for space: launch emissions directly into ozone layer. Chlorine from solid propellants and aluminum oxide particles have documented effects.",
    normalizationFactor: 0.0536,
    weightingFactor: 0.0631,
  },
  AP: {
    code: "AP",
    name: "Acidification",
    unit: "mol H+ eq",
    description: "Acidification of soil and water from NOx, SOx emissions",
    spaceNotes:
      "Launch site emissions primary concern. Ground-level impacts near launch facilities.",
    normalizationFactor: 55.6,
    weightingFactor: 0.062,
  },
  EP_FW: {
    code: "EP_FW",
    name: "Eutrophication, Freshwater",
    unit: "kg P eq",
    description: "Nutrient enrichment of freshwater ecosystems",
    spaceNotes:
      "Manufacturing processes, particularly electronics and solar cells. Hydrazine production significant.",
    normalizationFactor: 1.61,
    weightingFactor: 0.028,
  },
  EP_M: {
    code: "EP_M",
    name: "Eutrophication, Marine",
    unit: "kg N eq",
    description: "Nutrient enrichment of marine ecosystems",
    spaceNotes:
      "Sea-based launches and coastal launch sites. NOx deposition from launch emissions.",
    normalizationFactor: 19.5,
    weightingFactor: 0.0296,
  },
  EP_T: {
    code: "EP_T",
    name: "Eutrophication, Terrestrial",
    unit: "mol N eq",
    description: "Nutrient enrichment of terrestrial ecosystems",
    spaceNotes:
      "Launch site area effects. NOx deposition patterns near spaceports.",
    normalizationFactor: 177,
    weightingFactor: 0.0371,
  },
  POCP: {
    code: "POCP",
    name: "Photochemical Ozone Formation",
    unit: "kg NMVOC eq",
    description: "Ground-level ozone (smog) formation potential",
    spaceNotes:
      "VOC emissions from manufacturing, propellant handling, and launch.",
    normalizationFactor: 40.6,
    weightingFactor: 0.0478,
  },
  ADP_MM: {
    code: "ADP_MM",
    name: "Resource Use, Minerals and Metals",
    unit: "kg Sb eq",
    description: "Abiotic depletion of mineral and metal resources",
    spaceNotes:
      "Critical: rare earths, platinum group metals, gallium, germanium for electronics and solar cells. Supply chain concerns.",
    normalizationFactor: 0.0636,
    weightingFactor: 0.0755,
  },
  ADP_F: {
    code: "ADP_F",
    name: "Resource Use, Fossils",
    unit: "MJ",
    description: "Abiotic depletion of fossil energy resources",
    spaceNotes:
      "Energy-intensive manufacturing. RP-1 kerosene as propellant. Ground operations energy use.",
    normalizationFactor: 65000,
    weightingFactor: 0.0832,
  },
  WU: {
    code: "WU",
    name: "Water Use",
    unit: "m³ world eq",
    description: "Freshwater consumption and scarcity",
    spaceNotes:
      "Manufacturing processes, hydrogen production (if electrolysis), launch pad deluge systems.",
    normalizationFactor: 11500,
    weightingFactor: 0.0851,
  },
  PM: {
    code: "PM",
    name: "Particulate Matter",
    unit: "disease incidences",
    description: "Fine particulate matter emissions affecting human health",
    spaceNotes:
      "Launch emissions, aluminum oxide particles. Occupational exposure during manufacturing.",
    normalizationFactor: 0.000595,
    weightingFactor: 0.0896,
  },
  IRP: {
    code: "IRP",
    name: "Ionizing Radiation",
    unit: "kBq U235 eq",
    description: "Human exposure to ionizing radiation",
    spaceNotes:
      "RTG missions (rare), nuclear propulsion R&D. Generally low for conventional missions.",
    normalizationFactor: 4220,
    weightingFactor: 0.0501,
  },
  ETP_FW: {
    code: "ETP_FW",
    name: "Ecotoxicity, Freshwater",
    unit: "CTUe",
    description: "Toxic effects on freshwater ecosystems",
    spaceNotes:
      "Hydrazine and propellant handling. Electronic component manufacturing. Spacecraft disposal (re-entry debris).",
    normalizationFactor: 42700,
    weightingFactor: 0.0192,
  },
  HTP_C: {
    code: "HTP_C",
    name: "Human Toxicity, Cancer",
    unit: "CTUh",
    description: "Carcinogenic effects on human health",
    spaceNotes:
      "Hydrazine classified as carcinogen. Manufacturing processes, composite materials.",
    normalizationFactor: 0.0000169,
    weightingFactor: 0.0213,
  },
  HTP_NC: {
    code: "HTP_NC",
    name: "Human Toxicity, Non-Cancer",
    unit: "CTUh",
    description: "Non-carcinogenic effects on human health",
    spaceNotes:
      "Heavy metals in electronics. Propellant exposure. Beryllium in some applications.",
    normalizationFactor: 0.000231,
    weightingFactor: 0.0184,
  },
  LU: {
    code: "LU",
    name: "Land Use",
    unit: "points",
    description: "Land occupation and transformation impacts",
    spaceNotes:
      "Launch site footprint, manufacturing facilities, ground stations. Exclusion zones.",
    normalizationFactor: 819000,
    weightingFactor: 0.0794,
  },
};

// ─── Propellant Environmental Ratings ───

export interface PropellantProfile {
  type: PropellantType;
  name: string;
  gwpPerKg: number;
  odpPerKg: number;
  toxicityClass: "low" | "medium" | "high" | "very_high";
  sustainabilityRating: "A" | "B" | "C" | "D" | "E";
  notes: string;
}

export const propellantProfiles: Record<PropellantType, PropellantProfile> = {
  hydrazine: {
    type: "hydrazine",
    name: "Hydrazine (N2H4)",
    gwpPerKg: 3.2,
    odpPerKg: 0,
    toxicityClass: "very_high",
    sustainabilityRating: "E",
    notes:
      "Carcinogenic, highly toxic. REACH restricted. Consider green alternatives.",
  },
  monomethylhydrazine: {
    type: "monomethylhydrazine",
    name: "Monomethylhydrazine (MMH)",
    gwpPerKg: 4.8,
    odpPerKg: 0,
    toxicityClass: "very_high",
    sustainabilityRating: "E",
    notes: "Highly toxic hypergolic fuel. Requires extensive safety protocols.",
  },
  nitrogen_tetroxide: {
    type: "nitrogen_tetroxide",
    name: "Nitrogen Tetroxide (N2O4)",
    gwpPerKg: 0.28,
    odpPerKg: 0.012,
    toxicityClass: "high",
    sustainabilityRating: "D",
    notes: "Hypergolic oxidizer. NOx emissions contribute to ozone depletion.",
  },
  rp1_kerosene: {
    type: "rp1_kerosene",
    name: "RP-1 Kerosene",
    gwpPerKg: 3.15,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "C",
    notes: "Fossil fuel derived. Black carbon emissions at altitude.",
  },
  liquid_hydrogen: {
    type: "liquid_hydrogen",
    name: "Liquid Hydrogen (LH2)",
    gwpPerKg: 0,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "B",
    notes:
      "Clean combustion. Production pathway matters (green vs gray hydrogen).",
  },
  liquid_oxygen: {
    type: "liquid_oxygen",
    name: "Liquid Oxygen (LOX)",
    gwpPerKg: 0,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "A",
    notes: "Non-toxic oxidizer. Energy-intensive cryogenic production.",
  },
  liquid_methane: {
    type: "liquid_methane",
    name: "Liquid Methane (LCH4)",
    gwpPerKg: 2.75,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "B",
    notes:
      "Lower soot than RP-1. ISRU potential for Mars missions. Bio-methane option.",
  },
  solid_propellant: {
    type: "solid_propellant",
    name: "Solid Propellant (AP/Al)",
    gwpPerKg: 4.2,
    odpPerKg: 0.008,
    toxicityClass: "medium",
    sustainabilityRating: "D",
    notes: "Aluminum oxide particles, HCl emissions. Documented ozone effects.",
  },
  xenon: {
    type: "xenon",
    name: "Xenon",
    gwpPerKg: 0,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "B",
    notes:
      "Electric propulsion. Rare, expensive. Consider krypton alternative.",
  },
  krypton: {
    type: "krypton",
    name: "Krypton",
    gwpPerKg: 0,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "A",
    notes: "Electric propulsion. More abundant than xenon.",
  },
  argon: {
    type: "argon",
    name: "Argon",
    gwpPerKg: 0,
    odpPerKg: 0,
    toxicityClass: "low",
    sustainabilityRating: "A",
    notes: "Abundant, low cost. Lower efficiency than xenon/krypton.",
  },
  iodine: {
    type: "iodine",
    name: "Iodine",
    gwpPerKg: 0,
    odpPerKg: 0,
    toxicityClass: "medium",
    sustainabilityRating: "A",
    notes: "Solid storage, abundant. Emerging for small sat propulsion.",
  },
  green_propellant: {
    type: "green_propellant",
    name: "Green Propellant (AF-M315E / LMP-103S)",
    gwpPerKg: 1.8,
    odpPerKg: 0,
    toxicityClass: "medium",
    sustainabilityRating: "A",
    notes: "Hydrazine replacement. Reduced toxicity, improved handling.",
  },
};

// ─── Launch Vehicle Database ───

export interface LaunchVehicle {
  id: LaunchVehicleId;
  name: string;
  provider: string;
  payloadCapacityLeoKg: number;
  payloadCapacityGtoKg: number;
  carbonIntensityKgCO2PerKgPayload: {
    leo: number;
    gto: number;
  };
  propellantTypes: PropellantType[];
  reusability: "none" | "partial" | "full";
  sustainabilityGrade: EFDGrade;
  emissionsProfile: {
    gwp: number;
    odp: number;
    particulates: number;
  };
  notes: string;
}

export const launchVehicles: Record<LaunchVehicleId, LaunchVehicle> = {
  ariane_6: {
    id: "ariane_6",
    name: "Ariane 6",
    provider: "ArianeGroup / ESA",
    payloadCapacityLeoKg: 21500,
    payloadCapacityGtoKg: 11500,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 180,
      gto: 340,
    },
    propellantTypes: ["liquid_hydrogen", "liquid_oxygen", "solid_propellant"],
    reusability: "none",
    sustainabilityGrade: "C",
    emissionsProfile: {
      gwp: 820000,
      odp: 12.5,
      particulates: 45000,
    },
    notes:
      "European sovereign access. Solid boosters contribute to ozone impact.",
  },
  vega_c: {
    id: "vega_c",
    name: "Vega C",
    provider: "Avio / ESA",
    payloadCapacityLeoKg: 2300,
    payloadCapacityGtoKg: 0,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 320,
      gto: 0,
    },
    propellantTypes: ["solid_propellant", "liquid_oxygen", "rp1_kerosene"],
    reusability: "none",
    sustainabilityGrade: "D",
    emissionsProfile: {
      gwp: 185000,
      odp: 8.2,
      particulates: 28000,
    },
    notes:
      "Solid propellant stages. Higher carbon intensity due to small payload.",
  },
  falcon_9: {
    id: "falcon_9",
    name: "Falcon 9",
    provider: "SpaceX",
    payloadCapacityLeoKg: 22800,
    payloadCapacityGtoKg: 8300,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 95,
      gto: 260,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "partial",
    sustainabilityGrade: "B",
    emissionsProfile: {
      gwp: 425000,
      odp: 0.8,
      particulates: 12000,
    },
    notes:
      "Reusable first stage reduces per-launch impact. Black carbon from RP-1.",
  },
  falcon_heavy: {
    id: "falcon_heavy",
    name: "Falcon Heavy",
    provider: "SpaceX",
    payloadCapacityLeoKg: 63800,
    payloadCapacityGtoKg: 26700,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 70,
      gto: 165,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "partial",
    sustainabilityGrade: "B",
    emissionsProfile: {
      gwp: 1100000,
      odp: 2.1,
      particulates: 35000,
    },
    notes:
      "High absolute emissions but excellent kg/CO2 ratio for heavy payloads.",
  },
  electron: {
    id: "electron",
    name: "Electron",
    provider: "Rocket Lab",
    payloadCapacityLeoKg: 300,
    payloadCapacityGtoKg: 0,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 450,
      gto: 0,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "partial",
    sustainabilityGrade: "C",
    emissionsProfile: {
      gwp: 35000,
      odp: 0.1,
      particulates: 1200,
    },
    notes:
      "Small payload = higher intensity. Electric pumps reduce some impacts.",
  },
  soyuz: {
    id: "soyuz",
    name: "Soyuz 2",
    provider: "Roscosmos",
    payloadCapacityLeoKg: 8200,
    payloadCapacityGtoKg: 3250,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 210,
      gto: 530,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "none",
    sustainabilityGrade: "D",
    emissionsProfile: {
      gwp: 420000,
      odp: 0.9,
      particulates: 18000,
    },
    notes:
      "Legacy vehicle. No reusability. Currently limited availability for EU operators.",
  },
  generic_small: {
    id: "generic_small",
    name: "Generic Small Launch Vehicle",
    provider: "Various",
    payloadCapacityLeoKg: 500,
    payloadCapacityGtoKg: 0,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 380,
      gto: 0,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "none",
    sustainabilityGrade: "C",
    emissionsProfile: {
      gwp: 48000,
      odp: 0.15,
      particulates: 1800,
    },
    notes: "Default values for unspecified small launchers.",
  },
  new_glenn: {
    id: "new_glenn",
    name: "New Glenn",
    provider: "Blue Origin",
    payloadCapacityLeoKg: 45000,
    payloadCapacityGtoKg: 13000,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 7,
      gto: 25,
    },
    propellantTypes: ["liquid_methane", "liquid_oxygen"],
    reusability: "partial",
    sustainabilityGrade: "B",
    emissionsProfile: {
      gwp: 320000,
      odp: 0.001,
      particulates: 8000,
    },
    notes:
      "Methane-based, reusable first stage. Low ODP due to clean-burning propellants.",
  },
  starship: {
    id: "starship",
    name: "Starship",
    provider: "SpaceX",
    payloadCapacityLeoKg: 150000,
    payloadCapacityGtoKg: 21000,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 4,
      gto: 26,
    },
    propellantTypes: ["liquid_methane", "liquid_oxygen"],
    reusability: "full",
    sustainabilityGrade: "A",
    emissionsProfile: {
      gwp: 550000,
      odp: 0.001,
      particulates: 15000,
    },
    notes:
      "Fully reusable. Very high absolute emissions but best-in-class carbon intensity per kg to orbit.",
  },
  pslv: {
    id: "pslv",
    name: "PSLV",
    provider: "ISRO",
    payloadCapacityLeoKg: 3800,
    payloadCapacityGtoKg: 1425,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 47,
      gto: 126,
    },
    propellantTypes: ["solid_propellant", "liquid_oxygen"],
    reusability: "none",
    sustainabilityGrade: "C",
    emissionsProfile: {
      gwp: 180000,
      odp: 0.15,
      particulates: 22000,
    },
    notes:
      "Solid + hypergolic stages. Higher ODP from solid propellant and UDMH upper stage.",
  },
  long_march_2d: {
    id: "long_march_2d",
    name: "Long March 2D",
    provider: "CASC",
    payloadCapacityLeoKg: 3500,
    payloadCapacityGtoKg: 1300,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 60,
      gto: 162,
    },
    propellantTypes: ["nitrogen_tetroxide"],
    reusability: "none",
    sustainabilityGrade: "D",
    emissionsProfile: {
      gwp: 210000,
      odp: 0.2,
      particulates: 16000,
    },
    notes:
      "Hypergolic propellants (UDMH/N2O4). Higher environmental impact per kg due to toxic propellants.",
  },
  miura_5: {
    id: "miura_5",
    name: "Miura 5",
    provider: "PLD Space",
    payloadCapacityLeoKg: 540,
    payloadCapacityGtoKg: 0,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 83,
      gto: 0,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "partial",
    sustainabilityGrade: "C",
    emissionsProfile: {
      gwp: 45000,
      odp: 0.01,
      particulates: 1500,
    },
    notes:
      "European small launcher. LOX/RP-1 propulsion with partial reusability planned.",
  },
  prime: {
    id: "prime",
    name: "Prime",
    provider: "Orbex",
    payloadCapacityLeoKg: 180,
    payloadCapacityGtoKg: 0,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 139,
      gto: 0,
    },
    propellantTypes: ["liquid_oxygen"],
    reusability: "none",
    sustainabilityGrade: "A",
    emissionsProfile: {
      gwp: 25000,
      odp: 0.005,
      particulates: 400,
    },
    notes:
      "Bio-propane/LOX propulsion. Low-carbon fuel reduces GWP significantly. European micro-launcher.",
  },
  spectrum: {
    id: "spectrum",
    name: "Spectrum",
    provider: "Isar Aerospace",
    payloadCapacityLeoKg: 1000,
    payloadCapacityGtoKg: 700,
    carbonIntensityKgCO2PerKgPayload: {
      leo: 50,
      gto: 71,
    },
    propellantTypes: ["rp1_kerosene", "liquid_oxygen"],
    reusability: "none",
    sustainabilityGrade: "B",
    emissionsProfile: {
      gwp: 50000,
      odp: 0.01,
      particulates: 1600,
    },
    notes:
      "German small launcher. LOX/RP-1. European sovereign access for small satellites.",
  },
};

// ─── Simplified Emission Factors for Screening LCA ───

export interface EmissionFactors {
  category: string;
  phase: LifecyclePhase;
  unit: string;
  gwpFactor: number;
  odpFactor: number;
  notes: string;
}

export const simplifiedEmissionFactors: EmissionFactors[] = [
  // Raw Material Extraction
  {
    category: "Aluminum (aerospace grade)",
    phase: "raw_material_extraction",
    unit: "kg CO2eq / kg",
    gwpFactor: 12.5,
    odpFactor: 0.00001,
    notes: "Primary aluminum production. Recycled content can reduce by 90%.",
  },
  {
    category: "Titanium",
    phase: "raw_material_extraction",
    unit: "kg CO2eq / kg",
    gwpFactor: 35.2,
    odpFactor: 0.00002,
    notes: "High energy intensity. Critical aerospace material.",
  },
  {
    category: "Carbon Fiber Composite",
    phase: "raw_material_extraction",
    unit: "kg CO2eq / kg",
    gwpFactor: 29.4,
    odpFactor: 0.00001,
    notes: "PAN-based carbon fiber. Significant manufacturing energy.",
  },
  {
    category: "Solar Cells (III-V)",
    phase: "raw_material_extraction",
    unit: "kg CO2eq / m²",
    gwpFactor: 350,
    odpFactor: 0.008,
    notes: "Triple-junction cells. Rare materials (Ga, Ge, As).",
  },
  {
    category: "Electronics (general)",
    phase: "raw_material_extraction",
    unit: "kg CO2eq / kg",
    gwpFactor: 85,
    odpFactor: 0.0015,
    notes: "Includes PCB, processors. Significant rare earth content.",
  },
  {
    category: "Batteries (Li-ion)",
    phase: "raw_material_extraction",
    unit: "kg CO2eq / kWh",
    gwpFactor: 120,
    odpFactor: 0.0002,
    notes: "Cell-level production. Cobalt/nickel supply chain considerations.",
  },

  // Manufacturing
  {
    category: "Spacecraft Assembly",
    phase: "manufacturing",
    unit: "kg CO2eq / kg spacecraft",
    gwpFactor: 45,
    odpFactor: 0.0005,
    notes: "Cleanroom operations, testing, integration.",
  },
  {
    category: "Propellant Production - Hydrazine",
    phase: "manufacturing",
    unit: "kg CO2eq / kg",
    gwpFactor: 8.5,
    odpFactor: 0.0001,
    notes: "High toxicity requires extensive safety infrastructure.",
  },
  {
    category: "Propellant Production - LOX/LH2",
    phase: "manufacturing",
    unit: "kg CO2eq / kg",
    gwpFactor: 2.8,
    odpFactor: 0,
    notes: "Energy-intensive cryogenic production.",
  },

  // Transport
  {
    category: "Air Freight",
    phase: "transport_to_launch",
    unit: "kg CO2eq / kg·km",
    gwpFactor: 0.00062,
    odpFactor: 0,
    notes: "Typical for sensitive spacecraft components.",
  },
  {
    category: "Sea Freight",
    phase: "transport_to_launch",
    unit: "kg CO2eq / kg·km",
    gwpFactor: 0.00003,
    odpFactor: 0,
    notes: "Container shipping for less sensitive cargo.",
  },
  {
    category: "Road Transport",
    phase: "transport_to_launch",
    unit: "kg CO2eq / kg·km",
    gwpFactor: 0.00012,
    odpFactor: 0,
    notes: "Specialized transport with climate control.",
  },

  // Operations
  {
    category: "Ground Station Operations",
    phase: "operations",
    unit: "kg CO2eq / contact-hour",
    gwpFactor: 15,
    odpFactor: 0,
    notes: "Electricity, cooling, data processing.",
  },
  {
    category: "Mission Control",
    phase: "operations",
    unit: "kg CO2eq / satellite-year",
    gwpFactor: 850,
    odpFactor: 0,
    notes: "Staff, facilities, computing infrastructure.",
  },

  // End of Life
  {
    category: "Controlled Deorbit",
    phase: "end_of_life",
    unit: "kg CO2eq / kg spacecraft",
    gwpFactor: 0.5,
    odpFactor: 0.0001,
    notes: "Propellant usage for deorbit burn. Atmospheric reentry emissions.",
  },
  {
    category: "Graveyard Orbit Transfer",
    phase: "end_of_life",
    unit: "kg CO2eq / kg spacecraft",
    gwpFactor: 1.2,
    odpFactor: 0.0002,
    notes: "Higher delta-V requirement for GEO disposal.",
  },
];

// ─── EFD Grading Thresholds ───

export interface EFDGradeThreshold {
  grade: EFDGrade;
  label: string;
  maxCarbonIntensity: number; // kg CO2eq per kg payload delivered to orbit
  color: string;
  description: string;
}

export const efdGradeThresholds: EFDGradeThreshold[] = [
  {
    grade: "A",
    label: "Excellent",
    maxCarbonIntensity: 100,
    color: "#22C55E",
    description:
      "Best-in-class environmental performance. Reusable launch vehicles, green propellants, sustainable supply chain.",
  },
  {
    grade: "B",
    label: "Good",
    maxCarbonIntensity: 200,
    color: "#84CC16",
    description:
      "Above average performance. Partial reusability or efficient expendable systems.",
  },
  {
    grade: "C",
    label: "Average",
    maxCarbonIntensity: 350,
    color: "#EAB308",
    description: "Industry average. Standard expendable launch vehicles.",
  },
  {
    grade: "D",
    label: "Below Average",
    maxCarbonIntensity: 500,
    color: "#F97316",
    description:
      "Higher than average environmental impact. Room for improvement.",
  },
  {
    grade: "E",
    label: "Poor",
    maxCarbonIntensity: Infinity,
    color: "#EF4444",
    description:
      "Significant environmental impact. Improvement plan recommended.",
  },
];

// ─── Regulatory Framework Reference ───

export interface RegulatoryRequirement {
  articleNumber: string;
  title: string;
  summary: string;
  deadline: string;
  applicableTo: string[];
  simplifiedRegime: boolean;
}

export const efdRegulatoryRequirements: RegulatoryRequirement[] = [
  {
    articleNumber: "Art. 44",
    title: "Environmental Footprint Declaration Requirement",
    summary:
      "Space operators shall provide an Environmental Footprint Declaration (EFD) covering the full lifecycle of space assets, including methodology and lifecycle assessment requirements.",
    deadline: "2030-01-01",
    applicableTo: ["SCO", "LO", "LSO"],
    simplifiedRegime: false,
  },
  {
    articleNumber: "Art. 45",
    title: "EFD Grading, Methodology and Standards",
    summary:
      "The Commission shall adopt delegated acts specifying the methodology for calculating environmental footprint, aligned with the PEF methodology. Includes EFD grading criteria and lifecycle phase coverage.",
    deadline: "2028-06-01",
    applicableTo: ["ALL"],
    simplifiedRegime: false,
  },
  {
    articleNumber: "Art. 46",
    title: "Supply Chain Data Collection and Reporting",
    summary:
      "Operators may request environmental data from suppliers. Suppliers shall provide data within reasonable timeframes. EFD shall be submitted to the relevant authority and key metrics made publicly available.",
    deadline: "2030-01-01",
    applicableTo: ["SCO", "LO", "LSO"],
    simplifiedRegime: true,
  },
];

// ─── Simplified Regime Thresholds ───

export interface SimplifiedRegimeEligibility {
  criterion: string;
  threshold: string;
  exemption: string;
}

export const simplifiedRegimeCriteria: SimplifiedRegimeEligibility[] = [
  {
    criterion: "Organization Size",
    threshold:
      "Small enterprise (<50 employees, <€10M turnover) OR research/educational institution",
    exemption:
      "Screening LCA sufficient until 2032. Full LCA not required if screening shows <200 kg CO2eq/kg.",
  },
  {
    criterion: "Mission Mass",
    threshold: "Total spacecraft mass <100 kg",
    exemption:
      "May use simplified emission factors instead of detailed LCA for manufacturing phase.",
  },
  {
    criterion: "Rideshare Launch",
    threshold: "Payload constitutes <10% of total launch mass",
    exemption:
      "Launch emissions allocated proportionally. May use launcher default values.",
  },
  {
    criterion: "Secondary Mission",
    threshold: "Payload is hosted on another operators satellite",
    exemption:
      "Only report payload-specific impacts. Host operator reports platform impacts.",
  },
];

// ─── Mission Profile Interface ───

export interface MissionProfile {
  missionName: string;
  operatorType: "spacecraft" | "launch" | "launch_site";
  missionType: "commercial" | "research" | "government" | "educational";

  // Spacecraft Details
  spacecraftMassKg: number;
  spacecraftCount: number;
  orbitType: "LEO" | "MEO" | "GEO" | "HEO" | "cislunar" | "deep_space";
  altitudeKm?: number;
  missionDurationYears: number;

  // Launch
  launchVehicle: LaunchVehicleId;
  launchSharePercent: number; // For rideshare
  launchSiteCountry: string;

  // Propulsion
  spacecraftPropellant?: PropellantType;
  propellantMassKg?: number;

  // Operations
  groundStationCount: number;
  dailyContactHours: number;

  // End of Life
  deorbitStrategy:
    | "controlled_deorbit"
    | "passive_decay"
    | "graveyard_orbit"
    | "retrieval";

  // Simplified Regime Flags
  isSmallEnterprise: boolean;
  isResearchEducation: boolean;
}

// ─── Calculation Functions ───

export interface LifecycleImpact {
  phase: LifecyclePhase;
  gwpKgCO2eq: number;
  odpKgCFC11eq: number;
  percentOfTotal: number;
}

export interface EFDResult {
  totalGWP: number;
  totalODP: number;
  carbonIntensity: number; // kg CO2eq per kg payload
  grade: EFDGrade;
  gradeLabel: string;
  lifecycleBreakdown: LifecycleImpact[];
  hotspots: string[];
  recommendations: string[];
  isSimplifiedAssessment: boolean;
  regulatoryCompliance: {
    meetsDeadline: boolean;
    requiredActions: string[];
  };
}

// TODO: Implement remaining PEF impact categories (AP, EP, POCP, ADP, WU, PM, etc.)
// Currently only GWP and ODP are computed. The EnvironmentalImpactResult schema
// has fields for all 16 PEF categories but they are never populated.

export function calculateScreeningLCA(profile: MissionProfile): EFDResult {
  const launchVehicle = launchVehicles[profile.launchVehicle];
  const totalMass = profile.spacecraftMassKg * profile.spacecraftCount;

  if (totalMass <= 0) {
    throw new Error(
      "Spacecraft mass must be greater than zero for LCA calculation",
    );
  }

  // Determine if simplified regime applies
  const isSimplified =
    profile.isSmallEnterprise || profile.isResearchEducation || totalMass < 100;

  // Phase 1: Raw Material Extraction & Manufacturing
  // Simplified: ~60-80 kg CO2eq per kg spacecraft
  const manufacturingFactor = isSimplified ? 60 : 75;
  const manufacturingGWP = totalMass * manufacturingFactor;
  const manufacturingODP = totalMass * 0.0008;

  // Phase 2: Transport to Launch Site
  // Assume average 8000 km, mixed air/road
  const transportDistance = 8000;
  const transportGWP = totalMass * transportDistance * 0.0004;
  const transportODP = 0;

  // Phase 3: Launch
  const orbitKey =
    profile.orbitType === "GEO" || profile.orbitType === "HEO" ? "gto" : "leo";
  const launchShareFactor = profile.launchSharePercent / 100;
  const launchGWP = launchVehicle.emissionsProfile.gwp * launchShareFactor;
  const launchODP = launchVehicle.emissionsProfile.odp * launchShareFactor;

  // Phase 4: Operations
  // Ground station ops: count * daily hours * days/year * 15 kg CO2eq/contact-hour + mission control baseline
  const operationsYearlyGWP =
    profile.groundStationCount * profile.dailyContactHours * 365 * 15 + 850;
  const operationsGWP = operationsYearlyGWP * profile.missionDurationYears;
  const operationsODP = 0;

  // Phase 5: End of Life
  let eolGWP = 0;
  let eolODP = 0;

  switch (profile.deorbitStrategy) {
    case "controlled_deorbit":
      eolGWP = totalMass * 0.5;
      eolODP = totalMass * 0.0001;
      break;
    case "graveyard_orbit":
      eolGWP = totalMass * 1.2;
      eolODP = totalMass * 0.0002;
      break;
    case "passive_decay":
      eolGWP = totalMass * 0.1;
      eolODP = 0;
      break;
    case "retrieval":
      // ADR environmental cost — literature-based: 0.5-3 kg CO2eq/kg
      // (Ref: ESA Clean Space LCA studies, ADR mission environmental impact assessment)
      eolGWP = totalMass * 1.5;
      eolODP = totalMass * 0.001;
      break;
  }

  // Add propellant impacts if specified
  let propellantGWP = 0;
  let propellantODP = 0;
  if (profile.spacecraftPropellant && profile.propellantMassKg) {
    const propellant = propellantProfiles[profile.spacecraftPropellant];
    propellantGWP = profile.propellantMassKg * propellant.gwpPerKg;
    propellantODP = profile.propellantMassKg * propellant.odpPerKg;
  }

  // Calculate totals
  const totalGWP =
    manufacturingGWP +
    transportGWP +
    launchGWP +
    operationsGWP +
    eolGWP +
    propellantGWP;
  const totalODP =
    manufacturingODP +
    transportODP +
    launchODP +
    operationsODP +
    eolODP +
    propellantODP;

  // Carbon intensity per kg payload
  const carbonIntensity = totalGWP / totalMass;

  // Determine grade
  const grade = getEFDGrade(carbonIntensity);
  const gradeInfo = efdGradeThresholds.find((g) => g.grade === grade)!;

  // Build lifecycle breakdown
  // Literature-based approximation: raw material extraction typically 30-50% of manufacturing+material
  // Source: ESA Clean Space Initiative, 2023 screening studies
  const RAW_MATERIAL_FRACTION = 0.45; // Conservative mid-range
  const MANUFACTURING_FRACTION = 1 - RAW_MATERIAL_FRACTION;

  const phases: LifecycleImpact[] = [
    {
      phase: "raw_material_extraction",
      gwpKgCO2eq: manufacturingGWP * RAW_MATERIAL_FRACTION,
      odpKgCFC11eq: manufacturingODP * 0.55,
      percentOfTotal:
        ((manufacturingGWP * RAW_MATERIAL_FRACTION) / totalGWP) * 100,
    },
    {
      phase: "manufacturing",
      gwpKgCO2eq: manufacturingGWP * MANUFACTURING_FRACTION,
      odpKgCFC11eq: manufacturingODP * 0.45,
      percentOfTotal:
        ((manufacturingGWP * MANUFACTURING_FRACTION) / totalGWP) * 100,
    },
    {
      phase: "transport_to_launch",
      gwpKgCO2eq: transportGWP,
      odpKgCFC11eq: transportODP,
      percentOfTotal: (transportGWP / totalGWP) * 100,
    },
    {
      phase: "launch",
      gwpKgCO2eq: launchGWP + propellantGWP,
      odpKgCFC11eq: launchODP + propellantODP,
      percentOfTotal: ((launchGWP + propellantGWP) / totalGWP) * 100,
    },
    {
      phase: "operations",
      gwpKgCO2eq: operationsGWP,
      odpKgCFC11eq: operationsODP,
      percentOfTotal: (operationsGWP / totalGWP) * 100,
    },
    {
      phase: "end_of_life",
      gwpKgCO2eq: eolGWP,
      odpKgCFC11eq: eolODP,
      percentOfTotal: (eolGWP / totalGWP) * 100,
    },
  ];

  // Identify hotspots (phases > 25% of total)
  const hotspots: string[] = [];
  phases.forEach((p) => {
    if (p.percentOfTotal > 25) {
      hotspots.push(getPhaseLabel(p.phase));
    }
  });

  // Generate recommendations
  const recommendations = generateRecommendations(
    profile,
    phases,
    launchVehicle,
    carbonIntensity,
  );

  // Regulatory compliance check
  // Note: 2028 is when delegated acts with specific deadlines are expected
  const meetsDeadline = new Date() < new Date("2028-01-01");

  const requiredActions: string[] = [];
  if (!isSimplified) {
    requiredActions.push("Full lifecycle assessment required by 2030");
  } else {
    requiredActions.push("Screening LCA sufficient until 2032");
  }
  if (carbonIntensity > 350) {
    requiredActions.push("Consider environmental improvement plan");
  }
  if (
    profile.spacecraftPropellant === "hydrazine" ||
    profile.spacecraftPropellant === "monomethylhydrazine"
  ) {
    requiredActions.push("Evaluate green propellant alternatives");
  }

  return {
    totalGWP,
    totalODP,
    carbonIntensity,
    grade,
    gradeLabel: gradeInfo.label,
    lifecycleBreakdown: phases,
    hotspots,
    recommendations,
    isSimplifiedAssessment: isSimplified,
    regulatoryCompliance: {
      meetsDeadline,
      requiredActions,
    },
  };
}

export function getEFDGrade(carbonIntensity: number): EFDGrade {
  for (const threshold of efdGradeThresholds) {
    if (carbonIntensity <= threshold.maxCarbonIntensity) {
      return threshold.grade;
    }
  }
  return "E";
}

export function getPhaseLabel(phase: LifecyclePhase): string {
  const labels: Record<LifecyclePhase, string> = {
    raw_material_extraction: "Raw Material Extraction",
    manufacturing: "Manufacturing",
    transport_to_launch: "Transport to Launch Site",
    launch: "Launch",
    operations: "Operations",
    end_of_life: "End of Life",
  };
  return labels[phase];
}

function generateRecommendations(
  profile: MissionProfile,
  phases: LifecycleImpact[],
  launchVehicle: LaunchVehicle,
  carbonIntensity: number,
): string[] {
  const recommendations: string[] = [];

  // Launch-related recommendations
  const launchPhase = phases.find((p) => p.phase === "launch");
  if (launchPhase && launchPhase.percentOfTotal > 40) {
    if (launchVehicle.reusability === "none") {
      recommendations.push(
        "Consider launch providers with reusable vehicles to reduce launch emissions by 30-50%.",
      );
    }
    if (profile.launchSharePercent < 50) {
      recommendations.push(
        "Rideshare launches offer lower per-payload environmental impact.",
      );
    }
  }

  // Propellant recommendations
  if (profile.spacecraftPropellant === "hydrazine") {
    recommendations.push(
      "Replace hydrazine with green propellants (AF-M315E, LMP-103S) to improve toxicity profile and handling.",
    );
  }

  // Manufacturing recommendations
  const manufacturingPhase = phases.find((p) => p.phase === "manufacturing");
  if (manufacturingPhase && manufacturingPhase.percentOfTotal > 30) {
    recommendations.push(
      "Request environmental data from key suppliers per Art. 46.",
    );
    recommendations.push(
      "Consider suppliers with recycled material content certifications.",
    );
  }

  // Operations recommendations
  const operationsPhase = phases.find((p) => p.phase === "operations");
  if (operationsPhase && profile.groundStationCount > 3) {
    recommendations.push(
      "Consolidate ground station network or use renewable energy powered facilities.",
    );
  }

  // Grade-specific recommendations
  if (carbonIntensity > 350) {
    recommendations.push(
      "Current carbon intensity exceeds industry average. Develop improvement roadmap.",
    );
  }

  // End of life
  if (
    profile.deorbitStrategy === "passive_decay" &&
    profile.orbitType === "LEO" &&
    profile.altitudeKm &&
    profile.altitudeKm > 600
  ) {
    recommendations.push(
      "Passive decay may exceed 25-year guideline. Consider active deorbit capability.",
    );
  }

  return recommendations;
}

// ─── Supplier Data Request Helper ───

export interface SupplierDataRequest {
  supplierName: string;
  componentType: string;
  dataRequired: string[];
  deadline: Date;
  status: "pending" | "sent" | "received" | "overdue";
}

export function generateSupplierDataRequests(
  profile: MissionProfile,
): SupplierDataRequest[] {
  const requests: SupplierDataRequest[] = [];
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 3);

  // Core structure
  requests.push({
    supplierName: "[Primary Structure Supplier]",
    componentType: "Spacecraft Structure",
    dataRequired: [
      "Material composition (mass by material type)",
      "Recycled content percentage",
      "Manufacturing energy consumption (kWh)",
      "Waste generation (kg)",
      "Transport distance from factory (km)",
    ],
    deadline,
    status: "pending",
  });

  // Solar arrays
  requests.push({
    supplierName: "[Solar Array Supplier]",
    componentType: "Solar Arrays",
    dataRequired: [
      "Cell type and efficiency",
      "Rare material content (Ga, Ge, As)",
      "Energy payback time",
      "Manufacturing location",
    ],
    deadline,
    status: "pending",
  });

  // Electronics
  requests.push({
    supplierName: "[Avionics Supplier]",
    componentType: "Electronics/Avionics",
    dataRequired: [
      "PCB composition and mass",
      "Precious metal content (Au, Ag, Pd)",
      "ROHS compliance status",
      "Conflict mineral declaration",
    ],
    deadline,
    status: "pending",
  });

  // Propulsion if applicable
  if (profile.spacecraftPropellant) {
    requests.push({
      supplierName: "[Propulsion Supplier]",
      componentType: "Propulsion System",
      dataRequired: [
        "Propellant type and mass",
        "Tank material and mass",
        "Thruster manufacturing data",
        "Propellant production pathway",
      ],
      deadline,
      status: "pending",
    });
  }

  return requests;
}

// ─── Export Utilities ───

export function formatMass(massKg: number): string {
  if (massKg >= 1000) {
    return `${(massKg / 1000).toFixed(1)} tonnes`;
  }
  return `${massKg.toFixed(0)} kg`;
}

export function formatEmissions(kgCO2eq: number): string {
  if (kgCO2eq >= 1000000) {
    return `${(kgCO2eq / 1000000).toFixed(1)} kt CO2eq`;
  }
  if (kgCO2eq >= 1000) {
    return `${(kgCO2eq / 1000).toFixed(1)} t CO2eq`;
  }
  return `${kgCO2eq.toFixed(0)} kg CO2eq`;
}

export function getGradeColor(grade: EFDGrade): string {
  const threshold = efdGradeThresholds.find((t) => t.grade === grade);
  return threshold?.color || "#6B7280";
}

export function calculateComplianceScore(
  result: EFDResult,
  assessment?: {
    reportGenerated?: boolean;
    status?: string;
    supplierRequests?: Array<{ status: string }>;
  },
): number {
  let score = 100;

  // Deduct for poor grade
  const gradeDeductions: Record<EFDGrade, number> = {
    A: 0,
    B: 5,
    C: 15,
    D: 30,
    E: 50,
  };
  score -= gradeDeductions[result.grade];

  // Deduct for missing data (simplified assessment penalty)
  if (result.isSimplifiedAssessment) {
    score -= 10;
  }

  // Deduct for regulatory non-compliance
  if (result.regulatoryCompliance.requiredActions.length > 2) {
    score -= 15;
  }

  // Bonus for completed actions
  if (assessment?.reportGenerated) score += 10;
  if (assessment?.status === "submitted") score += 15;
  if (assessment?.status === "approved") score += 20;

  // Bonus for supplier data collection progress
  if (assessment?.supplierRequests && assessment.supplierRequests.length > 0) {
    const totalSuppliers = assessment.supplierRequests.length;
    const supplierDataReceived = assessment.supplierRequests.filter(
      (s) => s.status === "received",
    ).length;
    const supplierCompletion = supplierDataReceived / totalSuppliers;
    score += Math.round(supplierCompletion * 10);
  }

  return Math.max(0, Math.min(100, score));
}
