"use client";

/**
 * ComplyBridgePanels — coordinator for the three Caelex Comply
 * cross-domain panels on the Trade Operation detail page.
 *
 * Fetches once from GET /api/trade/operations/[id]/comply-bridge, then
 * forwards each section of the response to the corresponding pure
 * presentational panel. Keeping fetching here (rather than in each
 * panel) avoids triple-fanning the same DB round trip and lets the
 * loading/error states stay consistent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import {
  DebrisCompliancePanel,
  type DebrisStatusView,
} from "./DebrisCompliancePanel";
import {
  SpectrumCoordinationPanel,
  type SpectrumStatusView,
} from "./SpectrumCoordinationPanel";
import {
  AuthorizationPanel,
  type AuthorizationStatusView,
} from "./AuthorizationPanel";

interface ComplyBridgeResponse {
  debris: DebrisStatusView | null;
  spectrum: SpectrumStatusView | null;
  authorization: AuthorizationStatusView | null;
}

interface ComplyBridgePanelsProps {
  operationId: string;
}

export function ComplyBridgePanels({ operationId }: ComplyBridgePanelsProps) {
  const [data, setData] = useState<ComplyBridgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/trade/operations/${operationId}/comply-bridge`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load Caelex Comply data");
        }
        return r.json();
      })
      .then((body) => {
        if (!cancelled) setData(body as ComplyBridgeResponse);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [operationId]);

  if (error) {
    return (
      <section
        className="trade-chip-warn rounded-md border p-4"
        aria-label="Caelex Comply bridge — unavailable"
      >
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-current">
          Caelex Comply data unavailable
        </div>
        <p className="text-[12px] text-current">{error}</p>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DebrisCompliancePanel data={data?.debris ?? null} loading={loading} />
      <SpectrumCoordinationPanel
        data={data?.spectrum ?? null}
        loading={loading}
      />
      <AuthorizationPanel
        data={data?.authorization ?? null}
        loading={loading}
      />
    </div>
  );
}
