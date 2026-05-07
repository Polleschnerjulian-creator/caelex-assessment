/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BafaPdfButton — generates the BAFA-ELAN-K2 Antrag-Vorbereitung PDF
 * client-side via @react-pdf/renderer's `pdf().toBlob()` API and
 * triggers a download.
 *
 * Used in /dashboard/trade/operations/[id] (Sprint C4).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import {
  BafaElanK2Document,
  type BafaPdfApplicant,
  type BafaPdfOperation,
} from "./BafaElanK2Document";

export function BafaPdfButton({
  operation,
  applicant,
}: {
  operation: BafaPdfOperation;
  applicant: BafaPdfApplicant;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generatePdf() {
    setLoading(true);
    setErr(null);
    try {
      // Lazy-import @react-pdf/renderer's pdf() — keeps the heavy
      // PDF generation deps out of the initial page bundle. Only loaded
      // when the user actually clicks the button.
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <BafaElanK2Document operation={operation} applicant={applicant} />,
      ).toBlob();

      // Trigger download
      const filename = `bafa-elan-k2-${operation.reference.replace(/[^A-Z0-9_-]/gi, "-")}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={generatePdf}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-60"
        style={{
          background: "rgba(96,165,250,0.14)",
          color: "rgb(96,165,250)",
          boxShadow: "inset 0 0 0 0.5px rgba(96,165,250,0.40)",
        }}
        title="Generate BAFA-ELAN-K2 application worksheet PDF"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="h-3.5 w-3.5" />
        )}
        {loading ? "Generating PDF…" : "BAFA-Antrag PDF"}
      </button>
      {err && (
        <div className="text-[11px]" style={{ color: "rgb(248,113,113)" }}>
          {err}
        </div>
      )}
    </div>
  );
}
