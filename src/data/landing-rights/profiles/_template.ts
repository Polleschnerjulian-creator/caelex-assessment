/**
 * Template for adding a new jurisdiction to Landing Rights.
 *
 * 1. Copy to `profiles/<lowercase-code>.ts` (e.g., `fr.ts`)
 * 2. Replace all XX / placeholders
 * 3. Set `depth` honestly: 'stub' if only skeleton, 'standard' if researched, 'deep' if lawyer-reviewed
 * 4. Update `last_verified` to today's ISO date
 * 5. Register in `src/data/landing-rights/index.ts`
 */

import type { LandingRightsProfile } from "../types";

export const PROFILE_XX: LandingRightsProfile = {
  jurisdiction: "DE", // replace
  depth: "stub",
  last_verified: "2026-04-17",
  overview: {
    summary: "...",
    regime_type: "two_track",
  },
  regulators: [],
  legal_basis: [],
  fees: {},
  timeline: { typical_duration_months: { min: 6, max: 12 } },
  foreign_ownership: {},
  renewal: {},
  security_review: { required: false },
  operator_snapshots: {},
};
