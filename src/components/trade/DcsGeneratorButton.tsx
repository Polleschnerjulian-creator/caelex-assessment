/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DcsGeneratorButton — opens a small modal that generates the
 * Destination Control Statement (§ 758.6) text for the given shipment
 * and lets the operator copy it to clipboard or download the .txt.
 *
 * Sprint Z30 (Tier 4). Suitable for embedding on the trade operations
 * detail page or anywhere a "subject to the EAR" item is being
 * exported.
 *
 * The component is purely client-side. It fires a POST to
 * /api/trade/dcs/generate with the provided ECCN(s), destination, and
 * consignee — the API wraps the pure generator in
 * src/lib/trade/dcs-generator.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useState, useCallback } from "react";
import { FileText, Loader2, X, Copy, Check, FileDown } from "lucide-react";

export interface DcsGeneratorButtonProps {
  /** ECCNs on the shipment. At least one required. */
  eccns: string[];
  /** ISO-3166 alpha-2 destination country code. */
  destinationCountry: string;
  /** Optional pretty country name for display. */
  destinationCountryName?: string;
  /** Optional consignee / end-user name. */
  consigneeName?: string;
  /** Optional operator-supplied shipment reference (PO, AWB). */
  shipmentReference?: string;
  /** Optional className passthrough so parents can adjust spacing. */
  className?: string;
}

interface DcsResponse {
  text: string;
  variant: "generic_758_6_a" | "extended_758_6_b_9x515_600_series";
  normalizedEccns: string[];
  normalizedDestinationCountry: string;
  extendedLanguageApplies: boolean;
  extendedLanguageTriggerEccns: string[];
  citation: string;
}

export function DcsGeneratorButton({
  eccns,
  destinationCountry,
  destinationCountryName,
  consigneeName,
  shipmentReference,
  className,
}: DcsGeneratorButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dcs, setDcs] = useState<DcsResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchDcs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDcs(null);
    try {
      const res = await fetch("/api/trade/dcs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eccns,
          destinationCountry,
          destinationCountryName,
          consigneeName,
          shipmentReference,
          format: "json",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as DcsResponse;
      setDcs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [
    eccns,
    destinationCountry,
    destinationCountryName,
    consigneeName,
    shipmentReference,
  ]);

  function handleOpen() {
    setOpen(true);
    void fetchDcs();
  }

  function handleClose() {
    setOpen(false);
    // Reset transient state so a reopen always re-fetches.
    setDcs(null);
    setError(null);
    setCopied(false);
  }

  async function handleCopy() {
    if (!dcs) return;
    try {
      await navigator.clipboard.writeText(dcs.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Clipboard write failed — copy the text manually.");
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/trade/dcs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eccns,
          destinationCountry,
          destinationCountryName,
          consigneeName,
          shipmentReference,
          format: "text",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeDest = (
        dcs?.normalizedDestinationCountry ?? destinationCountry.toUpperCase()
      ).toLowerCase();
      a.download = `dcs-${safeDest}-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${className ?? ""}`}
        style={{
          background: "rgba(16,185,129,0.14)",
          color: "rgb(16,185,129)",
          boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.40)",
        }}
        title="Generate Destination Control Statement (15 CFR § 758.6)"
      >
        <FileText className="h-3.5 w-3.5" />
        DCS Statement
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Destination Control Statement"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">
                  Destination Control Statement
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Per 15 CFR § 758.6 — paste this onto your commercial invoice,
                  bill of lading, or air waybill.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {loading && (
                <div className="flex items-center gap-2 py-8 text-[13px] text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating statement…
                </div>
              )}

              {error && !loading && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700"
                >
                  {error}
                </div>
              )}

              {dcs && !loading && !error && (
                <>
                  {dcs.extendedLanguageApplies && (
                    <div
                      role="status"
                      className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800"
                    >
                      <span className="font-semibold">
                        § 758.6(b) extended language
                      </span>{" "}
                      applies because{" "}
                      {dcs.extendedLanguageTriggerEccns.join(", ")}{" "}
                      {dcs.extendedLanguageTriggerEccns.length === 1
                        ? "is"
                        : "are"}{" "}
                      a 9x515 or 600-series classification.
                    </div>
                  )}
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-800">
                    {dcs.text}
                  </pre>
                  <p className="mt-3 text-[10.5px] text-slate-500">
                    {dcs.citation}
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!dcs || downloading}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FileDown className="h-3 w-3" />
                )}
                Download .txt
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!dcs}
                className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy text
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
