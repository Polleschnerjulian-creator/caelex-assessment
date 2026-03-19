import "server-only";

// EU SST does not provide a public REST API.
// Access requires registration as a "user entity" under EU Regulation 2021/696
// via the EU SST Front Desk (https://www.eusst.eu).
// Once registered, conjunction warnings are delivered as CCSDS CDMs.
// TODO: Register at https://www.eusst.eu and implement CCSDS CDM parsing.

import type {
  ConjunctionDataProvider,
  ProviderInfo,
} from "@/lib/data-sources/types";
import type { ParsedCDM } from "@/lib/shield/types";

// ─── Configuration ──────────────────────────────────────────────────────────

const PROVIDER_INFO: ProviderInfo = {
  name: "EU SST (Space Surveillance and Tracking)",
  region: "EU",
  baseUrl: "https://www.eusst.eu",
  // EU Regulation 2021/696 establishes the EU Space Programme and EU SST services.
  // Access is governed by Framework Agreement between EU SST Consortium and user entities.
  legalBasis:
    "EU Regulation 2021/696 (EU Space Programme) — EU SST Service Framework",
  requiresInstitutionalAccess: true,
};

// ─── Provider Implementation ─────────────────────────────────────────────────

export const euSstProvider: ConjunctionDataProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  /**
   * EU SST access requires institutional registration under EU Regulation 2021/696.
   * Returns true only if the EU_SST_API_KEY environment variable is set,
   * which will remain false until formal registration with the EU SST Front Desk.
   */
  isConfigured(): boolean {
    return !!process.env.EU_SST_API_KEY;
  },

  /**
   * Conjunction data from EU SST.
   *
   * Currently returns an empty array because EU SST registration has not yet
   * been completed. The fallback router will use Space-Track (US) instead.
   *
   * Once registered:
   *  1. Obtain EU SST API credentials from the EU SST Front Desk.
   *  2. Set EU_SST_API_KEY in environment variables.
   *  3. Implement CCSDS CDM parsing (ISO 26900 / CCSDS 508.0-B-1 format).
   *  4. Map parsed CCSDS CDMs to the canonical ParsedCDM Caelex format.
   */
  async fetchCDMs(
    noradIds: string[],
    sinceDays?: number,
  ): Promise<ParsedCDM[]> {
    if (!this.isConfigured()) {
      console.warn(
        "[EU-SST] EU SST access is not yet configured. " +
          "Register at https://www.eusst.eu (EU Regulation 2021/696 user entity). " +
          `Requested ${noradIds.length} NORAD IDs, ${sinceDays ?? 7} day window. ` +
          "Returning empty array — fallback router will use Space-Track.",
      );
      return [];
    }

    // Placeholder: registration acquired but integration not yet implemented.
    console.warn(
      "[EU-SST] EU_SST_API_KEY is set but CCSDS CDM integration is not yet implemented. " +
        "TODO: Implement CCSDS CDM parsing and EU SST API calls.",
    );
    return [];
  },
};
