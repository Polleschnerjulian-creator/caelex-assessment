import "server-only";

import type {
  SpaceWeatherProvider,
  SpaceWeatherData,
  ProviderInfo,
} from "@/lib/data-sources/types";
import { getCurrentF107 } from "@/lib/ephemeris/data/solar-flux-adapter";

// ─── Configuration ──────────────────────────────────────────────────────────

const PROVIDER_INFO: ProviderInfo = {
  name: "NOAA SWPC Solar Cycle Indices",
  region: "US",
  baseUrl: "https://services.swpc.noaa.gov",
  // NOAA SWPC data is a US government product in the public domain.
  legalBasis:
    "NOAA SWPC public data — US government open data, no restrictions",
  requiresInstitutionalAccess: false,
};

// ─── Provider Implementation ─────────────────────────────────────────────────

export const noaaProvider: SpaceWeatherProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  /**
   * NOAA SWPC is a public endpoint with no API key requirement.
   * Always returns true.
   */
  isConfigured(): boolean {
    return true;
  },

  /**
   * Fetch current space weather conditions from NOAA SWPC.
   * Delegates to the existing solar flux adapter which handles caching (24h TTL)
   * and falls back to a reference value (150 SFU) on failure.
   *
   * Note: NOAA's solar cycle indices endpoint does not include Kp index —
   * that would require a separate fetch from the Kp/Ap endpoint.
   * kpIndex is therefore null in this provider.
   */
  async fetchCurrentConditions(): Promise<SpaceWeatherData | null> {
    try {
      const f107 = await getCurrentF107();

      return {
        f107,
        kpIndex: null,
        observedAt: new Date().toISOString(),
        source: "NOAA SWPC Solar Cycle Indices",
        predictions: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.warn(`[NOAA] fetchCurrentConditions failed: ${message}`);
      return null;
    }
  },
};
