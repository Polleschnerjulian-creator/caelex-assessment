import "server-only";

/**
 * Casualty Risk Calculator — Simplified NASA DAS Method
 *
 * Estimates expected casualties E[c] for spacecraft reentry to verify
 * compliance with the IADC 1x10^-4 threshold required by:
 * - IADC Space Debris Mitigation Guidelines (IADC-02-01 Rev. 7.1)
 * - CNES Safety Requirements (RNC-CNES-Q-40-512)
 * - EU Space Act (COM(2025) 335) Art. 72
 *
 * This is a simplified estimator based on the NASA Debris Assessment
 * Software (DAS) method. For formal submissions, operators should use
 * the full DAS tool or ESA DRAMA/SARA.
 */

export interface CasualtyRiskInput {
  spacecraftDryMassKg: number; // Mass without fuel
  numberOfSurvivingComponents: number; // Estimated components surviving reentry
  averageSurvivingAreaM2: number; // Average cross-section area of surviving pieces
  reentryInclinationDeg: number; // Orbital inclination at reentry
  isControlledReentry: boolean; // Targeted vs uncontrolled
  targetLatitudeDeg?: number; // For controlled: target latitude
  targetLongitudeDeg?: number; // For controlled: target longitude
}

export interface CasualtyRiskResult {
  expectedCasualties: number; // E[c] -- must be < 1e-4
  isCompliant: boolean; // E[c] < 1e-4
  casualtyAreaM2: number; // Total casualty area Ac
  impactProbability: number; // For uncontrolled
  populationDensity: number; // Weighted average in impact zone
  complianceThreshold: number; // 1e-4
  margin: number; // How far below/above threshold (percentage)
  breakdown: {
    label: string;
    value: string;
  }[];
  recommendation: string;
}

export function calculateCasualtyRisk(
  input: CasualtyRiskInput,
): CasualtyRiskResult {
  // Simplified NASA DAS method:

  // 1. Casualty Area per component: Ac_i = pi * (sqrt(A_i/pi) + 0.3)^2
  // 0.3m is the average human body radius
  const humanRadius = 0.3; // meters
  const avgComponentRadius = Math.sqrt(input.averageSurvivingAreaM2 / Math.PI);
  const casualtyAreaPerComponent =
    Math.PI * Math.pow(avgComponentRadius + humanRadius, 2);

  // 2. Total Casualty Area
  const totalCasualtyArea =
    casualtyAreaPerComponent * input.numberOfSurvivingComponents;

  // 3. Population Density (weighted by latitude band)
  // Use a simplified latitude-dependent population density model
  const populationDensity = estimatePopulationDensity(
    input.reentryInclinationDeg,
    input.isControlledReentry,
    input.targetLatitudeDeg,
  );

  // 4. Expected Casualties
  // E[c] = Sum(Ac_i * rho_pop) for each debris piece
  // Simplified: E[c] = Ac_total * rho_pop (per m^2)
  const expectedCasualties = totalCasualtyArea * populationDensity;

  const isCompliant = expectedCasualties < 1e-4;
  const margin = ((1e-4 - expectedCasualties) / 1e-4) * 100;

  return {
    expectedCasualties,
    isCompliant,
    casualtyAreaM2: totalCasualtyArea,
    impactProbability: input.isControlledReentry
      ? 1.0
      : estimateImpactProbability(input.reentryInclinationDeg),
    populationDensity,
    complianceThreshold: 1e-4,
    margin,
    breakdown: [
      {
        label: "Spacecraft Dry Mass",
        value: `${input.spacecraftDryMassKg} kg`,
      },
      {
        label: "Surviving Components",
        value: `${input.numberOfSurvivingComponents}`,
      },
      {
        label: "Avg. Surviving Area",
        value: `${input.averageSurvivingAreaM2.toFixed(4)} m\u00B2`,
      },
      {
        label: "Total Casualty Area (Ac)",
        value: `${totalCasualtyArea.toFixed(4)} m\u00B2`,
      },
      {
        label: "Reentry Inclination",
        value: `${input.reentryInclinationDeg}\u00B0`,
      },
      {
        label: "Population Density",
        value: `${populationDensity.toExponential(2)} persons/m\u00B2`,
      },
      {
        label: "Expected Casualties E[c]",
        value: expectedCasualties.toExponential(3),
      },
      { label: "Threshold", value: "1\u00D710\u207B\u2074" },
      { label: "Margin", value: `${margin.toFixed(1)}%` },
    ],
    recommendation: isCompliant
      ? `E[c] = ${expectedCasualties.toExponential(2)} \u2014 within the 1\u00D710\u207B\u2074 limit. ${margin > 50 ? "Comfortable margin." : "Close to threshold \u2014 consider Design for Demise measures."}`
      : `E[c] = ${expectedCasualties.toExponential(2)} \u2014 EXCEEDS the 1\u00D710\u207B\u2074 limit. ${input.isControlledReentry ? "Consider targeting a lower-population-density reentry corridor." : "Controlled reentry or Design for Demise required to reduce surviving components."}`,
  };
}

/**
 * Simplified latitude-dependent population density model.
 * Based on world population distribution by latitude band.
 */
function estimatePopulationDensity(
  inclinationDeg: number,
  isControlled: boolean,
  targetLatDeg?: number,
): number {
  if (isControlled && targetLatDeg !== undefined) {
    // Controlled reentry to specific location
    // South Pacific Ocean Uninhabited Area (SPOUA): ~0
    if (Math.abs(targetLatDeg) > 40 && targetLatDeg < -20) return 1e-8; // Ocean
    return getLatitudeDensity(targetLatDeg);
  }

  // Uncontrolled: average population density across accessible latitude bands
  // Inclination determines max/min latitude of ground track
  const maxLat = Math.min(inclinationDeg, 90);
  let totalDensity = 0;
  let bands = 0;

  for (let lat = -maxLat; lat <= maxLat; lat += 5) {
    totalDensity += getLatitudeDensity(lat);
    bands++;
  }

  return bands > 0 ? totalDensity / bands : 3e-5;
}

/**
 * Simplified world average population density by latitude (persons/m^2).
 * Derived from gridded population data aggregated to 15-degree bands.
 */
function getLatitudeDensity(lat: number): number {
  const absLat = Math.abs(lat);
  if (absLat > 75) return 1e-8; // Polar -- virtually uninhabited
  if (absLat > 60) return 5e-6; // Sub-polar
  if (absLat > 45) return 3e-5; // Mid-latitude (Europe, Russia)
  if (absLat > 30) return 5e-5; // Subtropical (US, China, India)
  if (absLat > 15) return 4e-5; // Tropical
  return 3e-5; // Equatorial
}

/**
 * Estimate impact probability for uncontrolled reentry.
 * For uncontrolled reentry, impact can occur anywhere on the ground track.
 * Higher inclination = more land coverage = higher probability.
 */
function estimateImpactProbability(inclinationDeg: number): number {
  // Earth's land fraction (~29%)
  const landFraction = 0.29;
  // Slight correction: higher inclinations cover more land at mid-latitudes
  if (inclinationDeg > 50) return landFraction * 1.05;
  if (inclinationDeg < 10) return landFraction * 0.85; // Near-equatorial: more ocean
  return landFraction;
}
