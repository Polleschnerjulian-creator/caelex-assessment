import "server-only";

import type {
  OrbitalDataProvider,
  ProviderInfo,
} from "@/lib/data-sources/types";
import type { OrbitalElements } from "@/lib/ephemeris/core/types";
import { getOrbitalElements } from "@/lib/ephemeris/data/celestrak-adapter";

// ─── Configuration ──────────────────────────────────────────────────────────

const PROVIDER_INFO: ProviderInfo = {
  name: "CelesTrak GP",
  region: "US",
  baseUrl: "https://celestrak.org",
  // CelesTrak is operated by Dr. T.S. Kelso and provides public GP element sets
  // derived from US Space Force Space-Track data under open data terms.
  legalBasis:
    "CelesTrak public data — derived from USSPACECOM catalog, free for non-commercial use",
  requiresInstitutionalAccess: false,
};

// ─── Provider Implementation ─────────────────────────────────────────────────

export const celestrakProvider: OrbitalDataProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  /**
   * CelesTrak is a public endpoint with no API key requirement.
   * Always returns true.
   */
  isConfigured(): boolean {
    return true;
  },

  /**
   * Fetch orbital elements (TLE/GP data) for a given NORAD catalog ID.
   * Delegates to the existing CelesTrak adapter which handles caching (4h TTL).
   */
  async fetchOrbitalElements(noradId: string): Promise<OrbitalElements | null> {
    return getOrbitalElements(noradId);
  },
};
