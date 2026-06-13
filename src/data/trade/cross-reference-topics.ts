/**
 * Sprint B2 — Cross-reference topics for trade classification.
 *
 * Topics cluster controlled items across the 5 jurisdictions Caelex
 * tracks. The clustering is the value: when a user enters a "Hall
 * thruster" we want to surface ALL parallel listings (EU 9A011 + US
 * 9A515.f + USML XV(e)(2) + MTCR 9A106) — not just one.
 *
 * **Source for every topic:** Caelex compilation cross-checked against
 * EUR-Lex (EU 2021/821 Annex I), eCFR (US CCL + USML), MTCR Annex
 * Handbook 2010 (the only public version), and BAFA Auslegungshinweise.
 *
 * Coverage is intentionally Aerospace-focused per Sprint B2 scope:
 * spacecraft components, propulsion, navigation, sensors, optics,
 * thermal, communications. Non-aerospace topics (chemical precursors,
 * biological agents, marine systems, conventional weapons) are out of
 * scope for this Wave.
 */

import type { CrossReferenceTopic } from "./schema";

/**
 * The cross-reference topics. Each `slug` is kebab-case stable (used as
 * a foreign key from ClassificationEntry.crossReferenceTopic).
 *
 * Add new topics in alphabetical order. Don't rename slugs — they're
 * persisted in the DB as classification metadata.
 */
export const CROSS_REFERENCE_TOPICS: CrossReferenceTopic[] = [
  {
    slug: "complete-launch-vehicles",
    title: "Complete Launch Vehicles (SLVs)",
    description:
      "Complete space-launch vehicles capable of delivering ≥500 kg payload to ≥300 km. MTCR Cat. I (strong presumption of denial). Always ITAR-jurisdiction in the US.",
    codes: [
      "EU_ANNEX_I:9A004",
      "EU_ANNEX_I:9A104",
      "US_CCL:9A004",
      "USML:IV(a)(1)",
      "MTCR_ANNEX:1.A.1",
      "DE_ANLAGE_AL:0009",
    ],
  },
  {
    slug: "rocket-propulsion-liquid-engines",
    title: "Liquid-Propellant Rocket Engines",
    description:
      "Liquid bipropellant rocket engines (LOx/Kerosene, LOx/Methane, LOx/Hydrogen, hypergolic). MTCR Cat. II for engines below MTCR Cat. I thresholds.",
    codes: [
      "EU_ANNEX_I:9A005",
      "EU_ANNEX_I:9A105",
      "US_CCL:9A005",
      "USML:IV(d)(1)",
      "MTCR_ANNEX:2.A.1",
    ],
  },
  {
    slug: "rocket-propulsion-solid-engines",
    title: "Solid-Propellant Rocket Motors",
    description:
      "Solid-propellant rocket motors and components (case, igniter, nozzle, propellant grain). MTCR Cat. II for sub-Cat-I systems.",
    codes: [
      "EU_ANNEX_I:9A007",
      "EU_ANNEX_I:9A107",
      "US_CCL:9A007",
      "USML:IV(d)(2)",
      "MTCR_ANNEX:2.A.1",
    ],
  },
  {
    slug: "hall-thrusters-electric-propulsion",
    title: "Hall-Effect & Ion Thrusters",
    description:
      "Electric propulsion (Hall-effect thrusters, gridded ion thrusters, FEEP, PPT, magnetoplasmadynamic). PCUs/PPUs often US-origin → De-minimis trigger.",
    codes: [
      "EU_ANNEX_I:9A004.f",
      "US_CCL:9A004.f",
      "USML:XV(e)(2)",
      "MTCR_ANNEX:9A106",
    ],
  },
  {
    slug: "spacecraft-bus-platforms",
    title: "Spacecraft Bus / Platform",
    description:
      "Complete spacecraft buses including satellite platforms. ECR 2014/2017 moved most commercial sats from USML XV to ECCN 9A515.a/b — but mil-spec, anti-jam, anti-spoofing capabilities keep an item under USML XV.",
    codes: [
      "EU_ANNEX_I:9A515",
      "US_CCL:9A515.a",
      "US_CCL:9A515.b",
      "USML:XV(a)(1)",
      "USML:XV(a)(7)",
    ],
  },
  {
    slug: "spacecraft-rad-hard-electronics",
    title: "Radiation-Hardened Spacecraft Electronics",
    description:
      "Radiation-hardened ICs, MCUs, FPGAs, memories rated for total-ionizing-dose ≥ 5×10⁴ rad(Si) and single-event-upset criteria. Cross-control by Cat. 3 + Cat. 9.",
    codes: [
      "EU_ANNEX_I:3A001.a.1",
      "US_CCL:3A001.a.1",
      "US_CCL:9A515.d",
      "USML:XV(e)(8)",
    ],
  },
  {
    slug: "high-resolution-eo-payloads",
    title: "High-Resolution Electro-Optical Payloads",
    description:
      "Optical payloads with aperture ≥ 0.50 m or resolution sufficient to resolve <0.50 m GSD remain USML XV(a)(7)(i). BIS rejected the 0.80 m liberalization in the 2024 Interim Final Rule.",
    codes: [
      "EU_ANNEX_I:6A002",
      "EU_ANNEX_I:6A003",
      "US_CCL:6A002",
      "US_CCL:6A003",
      "US_CCL:9A515.g",
      "USML:XV(a)(7)(i)",
    ],
  },
  {
    slug: "synthetic-aperture-radar-payloads",
    title: "Synthetic Aperture Radar (SAR) Payloads",
    description:
      "Spaceborne SAR systems. High-resolution / multi-band / interferometric SAR remains USML XV. Lower-spec SAR (e.g. ICEYE, Capella) typically falls under US CCL 9A515 with regular licensing.",
    codes: [
      "EU_ANNEX_I:6A008",
      "US_CCL:6A008",
      "US_CCL:9A515.j",
      "USML:XV(a)(7)(ii)",
    ],
  },
  {
    slug: "gnss-receivers-imus-star-trackers",
    title: "GNSS Receivers, IMUs & Star Trackers",
    description:
      "Navigation hardware: GNSS receivers (anti-jam/anti-spoof variants are stricter), IMUs above gyroscope drift thresholds, star trackers. MTCR cross-control via 7A103/7A105/7A116.",
    codes: [
      "EU_ANNEX_I:7A003",
      "EU_ANNEX_I:7A004",
      "EU_ANNEX_I:7A005",
      "EU_ANNEX_I:7A103",
      "US_CCL:7A003",
      "US_CCL:7A004",
      "US_CCL:7A005",
      "US_CCL:7A103",
      "USML:XII(c)",
      "USML:XII(d)",
      "MTCR_ANNEX:9A105",
    ],
  },
  {
    slug: "spacecraft-tt-c-and-comms",
    title: "Spacecraft TT&C and Inter-Satellite Comms",
    description:
      "Telemetry/Tracking/Command (TT&C) systems and inter-satellite optical/RF links. Anti-jam waveforms (e.g. MILSATCOM) keep items USML XI(c). Telemetry data itself is per EAR Cat. 9 Note 2 NOT controlled tech for health/operational status.",
    codes: [
      "EU_ANNEX_I:5A001.b",
      "US_CCL:5A001.b",
      "US_CCL:9A515.h",
      "USML:XI(c)(2)",
      "USML:XV(c)",
    ],
  },
  {
    slug: "optical-comm-terminals",
    title: "Free-Space Optical Communication Terminals",
    description:
      "Laser-based inter-satellite communication terminals (e.g. Mynaric Condor, Tesat SCOT). Wassenaar 5A001.f covers high-bandwidth/low-divergence variants. Some manufacturers market 'ITAR-free' — verify via BoM-origin tracking.",
    codes: ["EU_ANNEX_I:5A001.f", "US_CCL:5A001.f", "USML:XV(e)(11)"],
  },
  {
    slug: "cryogenic-systems-spacecraft",
    title: "Cryogenic Systems for Spacecraft",
    description:
      "Cryogenic propellant tanks (LOx/LH2 for upper stages) and cryogenic cooling systems for sensors. Sprint 2025/2003 added EU-autonomous 3A504 for cryogenic cooling subsystems below 4 K.",
    codes: [
      "EU_ANNEX_I:9A009",
      "EU_ANNEX_I:9A010",
      "EU_ANNEX_I:3A504",
      "US_CCL:9A009",
      "US_CCL:9A010",
      "MTCR_ANNEX:3.A.7",
    ],
  },
  {
    slug: "manpads-and-anti-spacecraft",
    title: "MANPADS, Anti-Satellite, and Counter-Space Systems",
    description:
      "Man-portable air-defense systems and any anti-satellite (ASAT) capability. Always USML Cat. IV. Always MTCR Cat. I if reaching orbital regime.",
    codes: [
      "USML:IV(b)",
      "USML:IV(c)",
      "USML:XV(a)(8)",
      "MTCR_ANNEX:1.A.2",
      "DE_ANLAGE_AL:0007",
    ],
  },
  {
    slug: "in-orbit-servicing-rpo",
    title: "In-Orbit Servicing / Active Debris Removal / RPO",
    description:
      "Rendezvous and Proximity Operations (RPO) including capture mechanisms, robotic arms in-space, refueling interfaces. No dedicated ECCN — falls under 9A515.a + 9A004.r (in-space habitats). High catch-all risk via Art. 4 (military endangerment) and MTCR Cat. II analogy.",
    codes: ["US_CCL:9A004", "US_CCL:9A515.a", "USML:XV(a)(2)"],
  },
  {
    slug: "high-temp-coatings-aerospace",
    title: "High-Temperature Coatings for Aerospace",
    description:
      "Coatings for engine combustion chambers, nozzles, leading edges, RV thermal protection. Wave 2025/2003 added 2E503 as EU-autonomous high-temp-coatings entry. Material substrates often Cat. 1 or Cat. 2.",
    codes: [
      "EU_ANNEX_I:2E503",
      "EU_ANNEX_I:1C002",
      "US_CCL:1C002",
      "USML:IV(h)(1)",
      "MTCR_ANNEX:6.D.1",
    ],
  },
  {
    slug: "high-entropy-alloys-refractory",
    title: "High-Entropy Alloys & Refractory Metal Powders",
    description:
      "Sprint 2025/2003 introduced 1C513 as EU-autonomous control for HEAs and refractory metal powders (W, Ta, Mo, Nb, Re) above purity / particle-size thresholds. Aerospace driver: rocket-engine combustion chambers, RV nose-cones.",
    codes: ["EU_ANNEX_I:1C513", "DE_ANLAGE_AL:1C1513"],
  },
  {
    slug: "metal-additive-manufacturing-aerospace",
    title: "Metal Additive Manufacturing for Aerospace",
    description:
      "DMLS / SLM / EBM machines printing metal parts above thermal-cycle / build-rate thresholds. Sprint 2025/2003 introduced 2B510 as EU-autonomous control. Aerospace driver: regenerative-cooled engines (Isar, RFA, MaiaSpace).",
    codes: ["EU_ANNEX_I:2B510", "DE_ANLAGE_AL:2B1510"],
  },
];

/**
 * Quick lookup: get all entries for a topic, filtered by jurisdiction.
 */
export function getCodesForJurisdiction(
  topic: CrossReferenceTopic,
  jurisdiction: string,
): string[] {
  const prefix = `${jurisdiction}:`;
  return topic.codes
    .filter((c) => c.startsWith(prefix))
    .map((c) => c.slice(prefix.length));
}

/**
 * Build the indexable topic-by-slug map. Used by lookup functions.
 */
export const CROSS_REFERENCE_TOPICS_BY_SLUG: Record<
  string,
  CrossReferenceTopic
> = Object.fromEntries(CROSS_REFERENCE_TOPICS.map((t) => [t.slug, t]));
