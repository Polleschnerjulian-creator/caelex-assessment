// src/lib/trade/intake/product-categories.ts
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import { deriveRelevantAttributes } from "./derive-relevant-attributes";

export interface ProductCategory {
  id: string;
  label: string;
  blurb: string;
  /** Validated at build time against CANONICAL_ITEM_CLASSES (Task 1). */
  canonicalItemClass: string;
  synonyms: string[];
  group: "ADCS" | "Antrieb" | "Payload" | "Power" | "RF" | "Elektronik";
  /** Thin overlay — MAY ONLY reorder / relabel / append; `hide` is render-only.
   *  `order` pins the class-specific decisive NUMERIC thresholds ahead of the
   *  ubiquitous boolean `isSpeciallyDesigned` (which the global decisivenessRank
   *  over-weights because it appears in ~25 corpus entries). Every attribute in
   *  `order` is verified to be present in deriveRelevantAttributes(class). */
  overlay?: {
    order?: AttributeName[];
    hide?: AttributeName[];
    extraOptional?: AttributeName[];
  };
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "star_tracker",
    label: "Sternsensor (Star Tracker)",
    blurb: "Lagebestimmung über Sternfeld",
    canonicalItemClass: "spacecraft.adcs.star_tracker",
    group: "ADCS",
    synonyms: ["star tracker", "sternsensor", "celestial navigation"],
    overlay: {
      order: ["starTrackerAccuracyArcsec", "starTrackerSlewRateDegPerS"],
    },
  },
  {
    id: "reaction_wheel",
    label: "Reaktionsrad",
    blurb: "Drehmoment-Aktuator zur Lageregelung",
    canonicalItemClass: "spacecraft.adcs.reaction_wheel",
    group: "ADCS",
    synonyms: ["reaction wheel", "momentum wheel"],
  },
  {
    id: "cmg",
    label: "Drallrad / CMG",
    blurb: "Control Moment Gyroscope",
    canonicalItemClass: "spacecraft.adcs.cmg",
    group: "ADCS",
    synonyms: ["cmg", "control moment gyro"],
  },
  {
    id: "thruster_electric",
    label: "Elektrisches Triebwerk",
    blurb: "Hall / Ionen / Plasma",
    canonicalItemClass: "propulsion.electric",
    group: "Antrieb",
    synonyms: ["hall thruster", "ion engine", "electric propulsion"],
    overlay: {
      order: ["thrustNewtons", "specificImpulseSecondsVacuum"],
    },
  },
  {
    id: "thruster_chemical",
    label: "Chemisches Triebwerk",
    blurb: "Mono-/Bipropellant",
    canonicalItemClass: "propulsion.chemical",
    group: "Antrieb",
    synonyms: ["chemical thruster", "monopropellant", "bipropellant"],
    overlay: {
      order: ["totalImpulseNs"],
    },
  },
  {
    id: "eo_imager",
    label: "EO-Imager / Optik-Payload",
    blurb: "Optische Erdbeobachtung",
    canonicalItemClass: "sensor.imager",
    group: "Payload",
    synonyms: ["imager", "telescope", "optical payload", "camera"],
    overlay: {
      order: ["apertureMM"],
    },
  },
  {
    id: "sar_payload",
    label: "SAR-Payload",
    blurb: "Radar mit synthetischer Apertur",
    canonicalItemClass: "spacecraft.remote_sensing.sar",
    group: "Payload",
    synonyms: ["sar", "synthetic aperture radar"],
    overlay: {
      order: ["radarBandwidthMhz", "radarCenterFreqGhz"],
    },
  },
  {
    id: "radhard_ic",
    label: "Rad-harter IC / Prozessor",
    blurb: "Strahlungsfeste Elektronik",
    canonicalItemClass: "ic.radhard",
    group: "Elektronik",
    synonyms: ["rad-hard", "radiation hardened", "fpga", "processor"],
    overlay: {
      order: ["radHardTidKrad", "radHardenedTID_krad"],
    },
  },
  {
    id: "gnss_receiver",
    label: "GNSS-Empfänger",
    blurb: "Satellitennavigation",
    canonicalItemClass: "gnss.receiver",
    group: "Elektronik",
    synonyms: ["gnss", "gps receiver", "navigation receiver"],
    overlay: {
      order: ["gnssMaxVelocityMPerS"],
    },
  },
  {
    id: "rf_antenna",
    label: "RF-Antenne / Transponder",
    blurb: "Kommunikations-Hardware",
    canonicalItemClass: "rf.antenna",
    group: "RF",
    synonyms: ["antenna", "transponder", "rf"],
    overlay: {
      order: ["antennaGainDbi"],
    },
  },
  {
    id: "solar_array",
    label: "Solar-Array",
    blurb: "Photovoltaik-Stromerzeugung",
    canonicalItemClass: "spacecraft.power.solar",
    group: "Power",
    synonyms: ["solar array", "solar panel", "photovoltaic"],
    overlay: {
      order: ["solarCellEfficiencyPercent"],
    },
  },
  {
    id: "battery",
    label: "Satelliten-Batterie",
    blurb: "Energiespeicher",
    canonicalItemClass: "spacecraft.power.battery",
    group: "Power",
    synonyms: ["battery", "li-ion", "energy storage"],
    overlay: {
      order: ["batterySpecificEnergyWhPerKg"],
    },
  },
];

export function getCategory(id: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find((c) => c.id === id);
}

/** Derived field set for a category, with overlay applied: reorder by overlay.order
 *  first (stable), append overlay.extraOptional, remove overlay.hide from the
 *  RENDERED list only (hidden fields still flow to the matcher as absent). */
export function renderedFields(categoryId: string): AttributeName[] {
  const c = getCategory(categoryId);
  if (!c) return [];
  const derived = deriveRelevantAttributes(c.canonicalItemClass);
  const extra = (c.overlay?.extraOptional ?? []).filter(
    (a) => !derived.includes(a),
  );
  const hide = new Set(c.overlay?.hide ?? []);
  const orderHint = c.overlay?.order ?? [];
  const all = [...derived, ...extra].filter((a) => !hide.has(a));
  return all.sort((a, b) => {
    const ia = orderHint.indexOf(a),
      ib = orderHint.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
