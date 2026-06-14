// src/lib/trade/intake/attribute-fields.ts
import { ATTRIBUTE_SANITY_RANGES } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

export interface AttributeField {
  attribute: AttributeName;
  label: string;
  unit?: string;
  kind: "number" | "boolean" | "enum" | "string";
  enumValues?: string[];
  help?: string;
}

/** Editorial metadata for every attribute the v1 catalog can render. Bounds are
 *  NOT redefined here — validation reuses ATTRIBUTE_SANITY_RANGES (the matcher's
 *  actual UNKNOWN-routing bound) so the form and matcher agree by construction. */
export const ATTRIBUTE_FIELDS: Partial<Record<AttributeName, AttributeField>> =
  {
    starTrackerAccuracyArcsec: {
      attribute: "starTrackerAccuracyArcsec",
      label: "Genauigkeit (1σ)",
      unit: "arcsec",
      kind: "number",
      help: "Kreuz-Boresight-Genauigkeit; ITAR-Schwelle ≤ 1 arcsec.",
    },
    starTrackerSlewRateDegPerS: {
      attribute: "starTrackerSlewRateDegPerS",
      label: "Slew-Rate-Toleranz",
      unit: "°/s",
      kind: "number",
      help: "ITAR-Schwelle ≥ 3 °/s (konjunktiv mit Genauigkeit).",
    },
    gnssMaxVelocityMPerS: {
      attribute: "gnssMaxVelocityMPerS",
      label: "Max. Geschwindigkeit",
      unit: "m/s",
      kind: "number",
      help: "MTCR/EAR-Schwelle ≥ 600 m/s.",
    },
    radHardTidKrad: {
      attribute: "radHardTidKrad",
      label: "Strahlungshärte (TID)",
      unit: "krad",
      kind: "number",
    },
    isRadHardened: {
      attribute: "isRadHardened",
      label: "Strahlungsgehärtet",
      kind: "boolean",
    },
    isSpeciallyDesigned: {
      attribute: "isSpeciallyDesigned",
      label: "Speziell konstruiert (specially designed)",
      kind: "boolean",
    },
    payloadKg: {
      attribute: "payloadKg",
      label: "Nutzlast",
      unit: "kg",
      kind: "number",
    },
    rangeKm: {
      attribute: "rangeKm",
      label: "Reichweite",
      unit: "km",
      kind: "number",
    },
    frequencyGhz: {
      attribute: "frequencyGhz",
      label: "Frequenz",
      unit: "GHz",
      kind: "number",
    },
    thrustNewtons: {
      attribute: "thrustNewtons",
      label: "Schub",
      unit: "N",
      kind: "number",
    },
    specificImpulseSecondsVacuum: {
      attribute: "specificImpulseSecondsVacuum",
      label: "Spezifischer Impuls (Vakuum)",
      unit: "s",
      kind: "number",
    },
    apertureMeters: {
      attribute: "apertureMeters",
      label: "Apertur",
      unit: "m",
      kind: "number",
    },
    gsdMeters: {
      attribute: "gsdMeters",
      label: "Bodenauflösung (GSD)",
      unit: "m",
      kind: "number",
    },
    // ── Fields the corpus makes relevant for the 12 v1 categories (Task 7).
    // The completeness test fails the build if any rendered attribute lacks an
    // entry here, which is the mechanism that forces full dictionary coverage.
    apertureMM: {
      attribute: "apertureMM",
      label: "Apertur",
      unit: "mm",
      kind: "number",
      help: "Optik-Apertur; 6A002-Schwelle ≥ 350 mm (Teleskope ≥ 250 mm).",
    },
    IspSeconds: {
      attribute: "IspSeconds",
      label: "Spezifischer Impuls",
      unit: "s",
      kind: "number",
    },
    thermalCycleCount: {
      attribute: "thermalCycleCount",
      label: "Thermische Lastwechsel",
      kind: "number",
    },
    missionDurationYears: {
      attribute: "missionDurationYears",
      label: "Missionsdauer",
      unit: "Jahre",
      kind: "number",
    },
    inclinationDegrees: {
      attribute: "inclinationDegrees",
      label: "Bahnneigung",
      unit: "°",
      kind: "number",
    },
    apogeeKm: {
      attribute: "apogeeKm",
      label: "Apogäum",
      unit: "km",
      kind: "number",
    },
    perigeeKm: {
      attribute: "perigeeKm",
      label: "Perigäum",
      unit: "km",
      kind: "number",
    },
    peakPowerWatts: {
      attribute: "peakPowerWatts",
      label: "Spitzenleistung",
      unit: "W",
      kind: "number",
    },
    propellantType: {
      attribute: "propellantType",
      label: "Treibstofftyp",
      kind: "enum",
      enumValues: ["chemical", "electric"],
    },
    totalImpulseNs: {
      attribute: "totalImpulseNs",
      label: "Gesamtimpuls",
      unit: "N·s",
      kind: "number",
    },
    radarBandwidthMhz: {
      attribute: "radarBandwidthMhz",
      label: "Radar-Bandbreite",
      unit: "MHz",
      kind: "number",
    },
    radarCenterFreqGhz: {
      attribute: "radarCenterFreqGhz",
      label: "Radar-Mittenfrequenz",
      unit: "GHz",
      kind: "number",
    },
    peakWavelengthNm: {
      attribute: "peakWavelengthNm",
      label: "Spitzenwellenlänge",
      unit: "nm",
      kind: "number",
    },
    radHardenedTID_krad: {
      attribute: "radHardenedTID_krad",
      label: "Strahlungshärte (TID)",
      unit: "krad",
      kind: "number",
    },
    doseRateUpsetRadSiPerS: {
      attribute: "doseRateUpsetRadSiPerS",
      label: "Dosisraten-Upset-Schwelle",
      unit: "rad(Si)/s",
      kind: "number",
    },
    neutronFluenceNPerCm2: {
      attribute: "neutronFluenceNPerCm2",
      label: "Neutronenfluenz",
      unit: "n/cm²",
      kind: "number",
    },
    seuRateErrorsPerBitDay: {
      attribute: "seuRateErrorsPerBitDay",
      label: "SEU-Rate",
      unit: "Fehler/Bit·Tag",
      kind: "number",
    },
    selLetThresholdMevCm2Mg: {
      attribute: "selLetThresholdMevCm2Mg",
      label: "SEL-LET-Schwelle",
      unit: "MeV·cm²/mg",
      kind: "number",
    },
    isAntiJam: {
      attribute: "isAntiJam",
      label: "Anti-Jamming",
      kind: "boolean",
    },
    antennaGainDbi: {
      attribute: "antennaGainDbi",
      label: "Antennengewinn",
      unit: "dBi",
      kind: "number",
    },
    frequencyBandsGhz: {
      attribute: "frequencyBandsGhz",
      label: "Frequenzbänder",
      unit: "GHz",
      kind: "number",
      help: "Liste der betriebenen Bänder; 28 GHz adressiert 5A001-Schwellen.",
    },
    polarisationType: {
      attribute: "polarisationType",
      label: "Polarisation",
      kind: "enum",
      enumValues: ["RHCP", "LHCP", "dual"],
    },
    solarCellEfficiencyPercent: {
      attribute: "solarCellEfficiencyPercent",
      label: "Zellwirkungsgrad",
      unit: "%",
      kind: "number",
    },
    batterySpecificEnergyWhPerKg: {
      attribute: "batterySpecificEnergyWhPerKg",
      label: "Spezifische Energie",
      unit: "Wh/kg",
      kind: "number",
    },
    swirSpectralBands: {
      attribute: "swirSpectralBands",
      label: "SWIR-Spektralbänder",
      kind: "number",
    },
    mwirSpectralBands: {
      attribute: "mwirSpectralBands",
      label: "MWIR-Spektralbänder",
      kind: "number",
    },
    lwirSpectralBands: {
      attribute: "lwirSpectralBands",
      label: "LWIR-Spektralbänder",
      kind: "number",
    },
    hyperspectralBandCount: {
      attribute: "hyperspectralBandCount",
      label: "Hyperspektrale Bänder",
      kind: "number",
    },
  };

export function getAttributeField(
  a: AttributeName,
): AttributeField | undefined {
  return ATTRIBUTE_FIELDS[a];
}

export function validateAttributeValue(
  a: AttributeName,
  value: number | boolean | string,
): { ok: boolean; reason?: string } {
  const bound = ATTRIBUTE_SANITY_RANGES[a];
  if (bound && typeof value === "number") {
    if (!Number.isFinite(value) || value < bound.min || value > bound.max) {
      return {
        ok: false,
        reason: `Wert ${value} außerhalb des plausiblen Bereichs (${bound.min}–${bound.max}). Möglicher Einheitenfehler.`,
      };
    }
  }
  return { ok: true };
}
