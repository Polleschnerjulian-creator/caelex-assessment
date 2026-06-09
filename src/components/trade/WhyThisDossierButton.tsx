/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * WhyThisDossierButton — the one-click trigger for the court-ready ONE-PAGE
 * "Why this?" verdict dossier.
 *
 * THE HEADLINE P1 AFFORDANCE. When a regulator, auditor, or court asks "on what
 * basis did you ship — or not ship — this?", the export-control-responsible
 * person clicks here and gets a single PDF that restates the operation verdict,
 * its matched-rule reasoning, the screening-list provenance (versions + snapshot
 * hashes + as-of), the signer, and a self-content SHA-256 the regulator can
 * verify. Nothing is fabricated and nothing is decided here — the button only
 * fetches the read-only server route that ASSEMBLES the dossier from substrate
 * that already exists.
 *
 * It downloads the server-generated PDF (the dossier runs assessOperation()
 * server-side + reads snapshot provenance, so generation is a GET to
 * /api/trade/operations/[id]/dossier — not a client render).
 *
 * Dark-theme trade tokens; mirrors the BafaPdfButton style.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export interface WhyThisDossierButtonProps {
  /** The TradeOperation id whose verdict dossier to generate. */
  operationId: string;
}

export function WhyThisDossierButton({
  operationId,
}: WhyThisDossierButtonProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function downloadDossier() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/trade/operations/${encodeURIComponent(operationId)}/dossier`,
        { method: "GET", headers: { Accept: "application/pdf" } },
      );

      if (!res.ok) {
        // Map the route's JSON error envelope to an honest message.
        let message = `Dossier konnte nicht erzeugt werden (HTTP ${res.status}).`;
        if (res.status === 403) message = "Kein Zugriff auf diesen Vorgang.";
        else if (res.status === 404) message = "Vorgang nicht gefunden.";
        else if (res.status === 429)
          message =
            "Zu viele Anfragen — bitte kurz warten und erneut versuchen.";
        else {
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) message = body.error;
          } catch {
            // Non-JSON body — keep the generic message.
          }
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      // Honour the server's filename if present, else a sensible default.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename =
        match?.[1] ?? `caelex-verdict-dossier-${operationId}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Dossier-Erzeugung fehlgeschlagen",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={downloadDossier}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-60"
        style={{
          background: "rgba(129, 220, 188, 0.14)",
          color: "rgb(129, 220, 188)",
          boxShadow: "inset 0 0 0 0.5px rgba(52, 211, 153, 0.40)",
        }}
        title="Court-ready ONE-PAGE „Why this?“ verdict dossier (PDF)"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        {loading ? "Dossier wird erzeugt…" : "„Why this?“ Dossier (PDF)"}
      </button>
      {err && (
        <div
          role="alert"
          className="text-[11px]"
          style={{ color: "rgb(248, 113, 113)" }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

export default WhyThisDossierButton;
