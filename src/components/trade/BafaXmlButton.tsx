/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BafaXmlButton — sibling to BafaPdfButton. Downloads the BAFA
 * ELAN-K2-conformant XML for upload to the BAFA portal.
 *
 * Trigger: fetch GET /api/trade/operations/[id]/bafa-xml as a blob,
 * stream to <a download>. No bundle cost for the XML builder on this
 * page — the route handler does the work server-side.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function BafaXmlButton({
  operationId,
  operationReference,
}: {
  operationId: string;
  operationReference: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function downloadXml() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}/bafa-xml`, {
        method: "GET",
        headers: { Accept: "application/xml" },
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) detail = body.error;
        } catch {
          // Body wasn't JSON — keep the HTTP detail
        }
        throw new Error(detail);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const safeRef = operationReference.replace(/[^A-Z0-9_-]/gi, "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `bafa-elan-k2-${safeRef}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "XML export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={downloadXml}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-60"
        style={{
          background: "rgba(34,197,94,0.14)",
          color: "rgb(34,197,94)",
          boxShadow: "inset 0 0 0 0.5px rgba(34,197,94,0.40)",
        }}
        title="Download BAFA-ELAN-K2 XML for portal upload"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {loading ? "Generating XML…" : "BAFA-Antrag XML"}
      </button>
      {err && (
        <div className="text-[11px]" style={{ color: "rgb(248,113,113)" }}>
          {err}
        </div>
      )}
    </div>
  );
}
