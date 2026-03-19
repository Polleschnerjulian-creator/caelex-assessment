import "server-only";

import type {
  ConjunctionDataProvider,
  ProviderInfo,
} from "@/lib/data-sources/types";
import type { ParsedCDM } from "@/lib/shield/types";
import {
  fetchCDMs,
  isSpaceTrackConfigured,
} from "@/lib/shield/space-track-client.server";

// ─── Configuration ──────────────────────────────────────────────────────────

const PROVIDER_INFO: ProviderInfo = {
  name: "Space-Track CDM Public",
  region: "US",
  baseUrl: "https://www.space-track.org",
  // Space-Track is operated by the US 18th Space Control Squadron (USSPACECOM).
  // Access requires registration and acceptance of the Space-Track terms of use.
  legalBasis:
    "USSPACECOM Space-Track — registered user access, US government data, free for civil/commercial use",
  requiresInstitutionalAccess: false,
};

// ─── Provider Implementation ─────────────────────────────────────────────────

export const spaceTrackProvider: ConjunctionDataProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  /**
   * Delegates to the existing Space-Track config check.
   * Requires SPACETRACK_IDENTITY and SPACETRACK_PASSWORD env vars,
   * and SPACETRACK_ENABLED must not be "false".
   */
  isConfigured(): boolean {
    return isSpaceTrackConfigured();
  },

  /**
   * Fetch CDMs for a list of NORAD IDs from Space-Track.
   * Delegates to the existing client which handles batching, retry, and auth.
   */
  async fetchCDMs(
    noradIds: string[],
    sinceDays?: number,
  ): Promise<ParsedCDM[]> {
    return fetchCDMs(noradIds, sinceDays);
  },
};
