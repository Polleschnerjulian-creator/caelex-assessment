import type { CategoryDeepDive } from "../types";

export const RE_ENTRY_DEEP_DIVES: CategoryDeepDive[] = [
  {
    jurisdiction: "US",
    category: "re_entry",
    title: "FAA Part 450 reentry licensing — the commercial frontier",
    summary:
      "Commercial re-entry matured from 0 → 4 Part 450 reentry licensees in 24 months. SpaceX Dragon (RLO 20-007, renewed 2022), Varda Space (first-ever Part 450 reentry licence VOL 24-130, 14 February 2024), Inversion Space (15 October 2024) and Sierra Space Dream Chaser (pending). Statutory MPL cap $500M with ~$3.1B federal indemnity.",
    key_provisions: [
      {
        title: "14 CFR Part 450 reentry licensing",
        body: "Part 450 consolidated launch and reentry regulations into a performance-based regime. Applicants must demonstrate compliance with casualty risk thresholds (collective casualty expectation ≤ 1 × 10⁻⁴ per mission), debris containment, and hazard control.",
        citation: "14 CFR Part 450",
      },
      {
        title: "Statutory insurance cap and federal indemnity",
        body: "Maximum Probable Loss (MPL) third-party insurance is capped statutorily at $500M under 51 U.S.C. § 50914. Above MPL, federal indemnity applies up to ~$3.1B under 51 U.S.C. § 50915 (subject to appropriation). Varda's W-4 received a novel 'umbrella' vehicle-operator licence valid through 2029.",
        citation: "51 U.S.C. §§ 50914–50915; 14 CFR Part 440",
      },
      {
        title: "Cross-border reentry consultation",
        body: "Starship Flight 7 (16 January 2025) and Flight 8 (6 March 2025) Caribbean debris incidents — closing Miami, Fort Lauderdale, Palm Beach and Orlando airports — made cross-border reentry consultation the single most active regulatory issue of 2025–2026. UK diplomatic protests over Turks and Caicos airspace risk accelerated state-recourse liability debate.",
        citation: "FAA AC 450.169-1A (debris containment)",
      },
    ],
    practical_notes:
      "The June 2025 Nyx 'Mission Possible' flight (The Exploration Company) combined French CNES LOS re-entry authorisation with an FAA payload recommendation letter — the first real transatlantic re-entry precedent and the template for EU operators returning payloads to US test ranges.",
    last_verified: "2026-04-17",
  },
];
