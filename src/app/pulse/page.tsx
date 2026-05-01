"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Shield,
  Sparkles,
  Database,
  Globe2,
  Satellite,
  Building2,
  RefreshCw,
  FileDown,
} from "lucide-react";

/**
 * /pulse — Caelex Public-Pulse-Tool (Sprint 4B)
 *
 * Funnel-stage-1: an operator types their company name + VAT-ID + email
 * and gets back a structured cross-verification across 4 free public
 * sources (VIES, GLEIF, UNOOSA, CelesTrak). Lead is captured server-side
 * by `/api/public/pulse/detect`.
 *
 * **Sprint 4B scope:** functional form + result display + loading state.
 * Sprint 4C will add the streaming source-verification animation.
 *
 * Design system: dark navy + emerald accents per CLAUDE.md.
 */

// ─── Source labels ─────────────────────────────────────────────────────────
// Mirrors the SourceKey union from auto-detection/types.ts for friendly UI.
const SOURCE_LABELS: Record<
  string,
  { label: string; icon: typeof Building2; description: string }
> = {
  "vies-eu-vat": {
    label: "VIES",
    icon: Building2,
    description: "EU Commission VAT validation gateway",
  },
  "gleif-lei": {
    label: "GLEIF",
    icon: Globe2,
    description: "G20/ISO Legal Entity Identifier registry",
  },
  "unoosa-online-index": {
    label: "UNOOSA",
    icon: Satellite,
    description: "UN registry of space objects",
  },
  "celestrak-satcat": {
    label: "CelesTrak SATCAT",
    icon: Database,
    description: "US Air Force satellite catalog",
  },
};

// ─── Field labels ──────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  establishment: "Country of establishment",
  isConstellation: "Operates a constellation",
  constellationSize: "Constellation size",
  primaryOrbit: "Primary orbit",
  operatorType: "Operator type",
  entitySize: "Entity size",
};

interface PulseField {
  fieldName: string;
  value: unknown;
  agreementCount: number;
  contributingAdapters: string[];
}

interface PulseResponse {
  leadId: string;
  receivedAt: string;
  successfulSources: string[];
  failedSources: Array<{ source: string; errorKind: string; message: string }>;
  mergedFields: PulseField[];
  warnings: string[];
  bestPossibleTier: "T0_UNVERIFIED" | "T2_SOURCE_VERIFIED";
}

// ─── Sprint 4C: per-source streaming state ────────────────────────────────
//
// As each `source-result` event arrives over SSE, we update the UI card for
// that source. Possible per-source states:
//   - "idle"     — initial, before submit
//   - "checking" — the adapter is in flight (got a `source-checking` event)
//   - "success"  — got an `ok: true` source-result event
//   - "failed"   — got an `ok: false` source-result event
type SourceStatus = "idle" | "checking" | "success" | "failed";

interface SourceState {
  status: SourceStatus;
  errorKind?: string;
}

const SOURCE_KEYS = [
  "vies-eu-vat",
  "gleif-lei",
  "unoosa-online-index",
  "celestrak-satcat",
] as const;

function initSourceStates(): Record<string, SourceState> {
  return Object.fromEntries(
    SOURCE_KEYS.map((s) => [s, { status: "idle" as const }]),
  );
}

/**
 * Parse a single SSE-formatted event block. Returns null on garbage so
 * the consumer can keep streaming instead of throwing on partial data.
 *
 *   event: source-result
 *   data: {"source":"vies-eu-vat","ok":true}
 */
function parseSseEvent(
  raw: string,
): { event: string; data: Record<string, unknown> } | null {
  const lines = raw.split("\n");
  let event = "message";
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith(":")) continue; // comment
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
  }
  if (dataParts.length === 0) return null;
  try {
    const data = JSON.parse(dataParts.join("\n")) as Record<string, unknown>;
    return { event, data };
  } catch {
    return null;
  }
}

export default function PulsePage() {
  const [legalName, setLegalName] = useState("");
  const [vatId, setVatId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PulseResponse | null>(null);
  const [sourceStates, setSourceStates] =
    useState<Record<string, SourceState>>(initSourceStates);
  const [leadId, setLeadId] = useState<string | null>(null);

  /**
   * Submit handler — Sprint 4C streaming flow:
   *
   *   1. POST to /api/public/pulse/stream
   *   2. Read response body as a stream
   *   3. Parse SSE events (event: <name>\ndata: <json>\n\n)
   *   4. Update UI per-source as `source-result` events arrive
   *   5. Render full result panel on `complete` event
   *
   * Falls back to non-streaming `/api/public/pulse/detect` if the
   * browser lacks ReadableStream — prevents the page from breaking on
   * very old browsers (we get the all-at-once render instead).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setResult(null);
    setSourceStates(initSourceStates());
    setLeadId(null);
    setSubmitting(true);

    const requestBody = JSON.stringify({
      legalName,
      email,
      vatId: vatId || undefined,
    });

    try {
      const res = await fetch("/api/public/pulse/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
      });

      // Validation / rate-limit failures are JSON, not SSE
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(
            "You've reached the per-hour rate limit for this tool. Please try again later or sign up for a free Caelex account.",
          );
        } else if (res.status === 400 && data.issues) {
          const fieldErrors = data.issues
            .map((i: { path: string; message: string }) => i.message)
            .join("; ");
          setError(`Invalid input: ${fieldErrors}`);
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      // Streaming path
      if (!res.body) {
        // Older browsers — fall back to non-streaming /detect
        await fallbackToDetect(requestBody);
        return;
      }

      await consumeStream(res.body);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Consume the SSE stream from /api/public/pulse/stream. Updates
   * `sourceStates` and `result` reactively as events arrive.
   */
  const consumeStream = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Live aggregates so we can emit a final PulseResponse when the
    // `complete` event arrives. We DON'T set `result` until then —
    // the streaming UI shows source-by-source progress instead.
    const liveSourceResults: Record<
      string,
      {
        ok: boolean;
        errorKind?: string;
        message?: string;
        fields?: Array<{ fieldName: string; value: unknown }>;
      }
    > = {};
    let liveLeadId: string | null = null;
    let liveReceivedAt = "";
    let liveMerged: PulseField[] = [];
    let liveWarnings: string[] = [];
    let liveTier: "T0_UNVERIFIED" | "T2_SOURCE_VERIFIED" = "T0_UNVERIFIED";
    let liveStreamError: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse complete events (\n\n delimited)
      let split: number;
      while ((split = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const parsed = parseSseEvent(rawEvent);
        if (!parsed) continue;
        const { event, data } = parsed;

        switch (event) {
          case "lead": {
            liveLeadId = data.leadId as string;
            liveReceivedAt = data.receivedAt as string;
            setLeadId(liveLeadId);
            break;
          }
          case "source-checking": {
            const source = data.source as string;
            setSourceStates((prev) => ({
              ...prev,
              [source]: { status: "checking" },
            }));
            break;
          }
          case "source-result": {
            const source = data.source as string;
            const ok = data.ok as boolean;
            liveSourceResults[source] = {
              ok,
              errorKind: data.errorKind as string | undefined,
              message: data.message as string | undefined,
              fields: data.fields as
                | Array<{ fieldName: string; value: unknown }>
                | undefined,
            };
            setSourceStates((prev) => ({
              ...prev,
              [source]: {
                status: ok ? "success" : "failed",
                errorKind: ok ? undefined : (data.errorKind as string),
              },
            }));
            break;
          }
          case "complete": {
            liveMerged = (data.mergedFields as PulseField[]) ?? [];
            liveWarnings = (data.warnings as string[]) ?? [];
            liveTier =
              (data.bestPossibleTier as
                | "T0_UNVERIFIED"
                | "T2_SOURCE_VERIFIED") ?? "T0_UNVERIFIED";
            break;
          }
          case "error": {
            liveStreamError = (data.message as string) ?? "Stream error";
            break;
          }
        }
      }
    }

    if (liveStreamError) {
      setError(liveStreamError);
      return;
    }

    // Build the canonical PulseResponse from live aggregates so the result
    // panel can render with the same shape as Sprint 4A's /detect endpoint.
    const successfulSources = Object.entries(liveSourceResults)
      .filter(([, r]) => r.ok)
      .map(([s]) => s);
    const failedSources = Object.entries(liveSourceResults)
      .filter(([, r]) => !r.ok)
      .map(([s, r]) => ({
        source: s,
        errorKind: r.errorKind ?? "unknown",
        message: r.message ?? "",
      }));

    setResult({
      leadId: liveLeadId ?? "",
      receivedAt: liveReceivedAt || new Date().toISOString(),
      successfulSources,
      failedSources,
      mergedFields: liveMerged,
      warnings: liveWarnings,
      bestPossibleTier: liveTier,
    });
  };

  /**
   * Fallback path for browsers without ReadableStream support. Calls the
   * non-streaming /detect endpoint and renders the result all-at-once.
   */
  const fallbackToDetect = async (requestBody: string) => {
    const res = await fetch("/api/public/pulse/detect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: requestBody,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setResult(data as PulseResponse);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSourceStates(initSourceStates());
    setLeadId(null);
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <header className="border-b border-navy-700/50">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between">
          <Link href="/" className="text-display-sm font-semibold text-white">
            Caelex
          </Link>
          <Link
            href="/signup"
            className="text-small text-slate-400 hover:text-white transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-caption text-emerald-400 mb-6">
            <Sparkles className="w-3 h-3" />
            Free • No signup required
          </div>
          <h1 className="text-display md:text-display-lg font-semibold text-white tracking-tight mb-4">
            Pulse — your compliance posture in 30 seconds
          </h1>
          <p className="text-body-lg text-slate-400 max-w-2xl mx-auto">
            We cross-verify your company against four authoritative public
            sources — EU tax authority, G20 LEI registry, UN space registry, US
            Air Force satellite catalog. Real data, no demos.
          </p>
        </motion.div>

        {/* ─── Form / Result ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              <form
                onSubmit={handleSubmit}
                className="bg-navy-900 border border-navy-700/50 rounded-2xl p-6 md:p-8 space-y-5"
                aria-label="Pulse compliance check form"
              >
                <div>
                  <label
                    htmlFor="pulse-legal-name"
                    className="block text-small font-medium text-slate-200 mb-2"
                  >
                    Legal name *
                  </label>
                  <input
                    id="pulse-legal-name"
                    type="text"
                    required
                    minLength={3}
                    maxLength={200}
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="OneWeb Limited"
                    autoComplete="organization"
                    className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-700 text-body text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pulse-vat-id"
                    className="block text-small font-medium text-slate-200 mb-2"
                  >
                    EU VAT-ID{" "}
                    <span className="text-slate-500">
                      (optional, recommended)
                    </span>
                  </label>
                  <input
                    id="pulse-vat-id"
                    type="text"
                    maxLength={20}
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                    placeholder="DE123456789"
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-700 text-body text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                  <p className="mt-2 text-caption text-slate-500">
                    Boosts validation precision via VIES tax-authority lookup.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="pulse-email"
                    className="block text-small font-medium text-slate-200 mb-2"
                  >
                    Work email *
                  </label>
                  <input
                    id="pulse-email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="anna@your-company.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-700 text-body text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="mt-2 text-caption text-slate-500">
                    We&apos;ll send your full verification report. No marketing
                    spam.
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-small">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !legalName || !email}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-white text-subtitle font-semibold transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking 4 sources…
                    </>
                  ) : (
                    <>
                      Run pulse check
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-caption text-slate-500 text-center">
                  Rate-limited to 3 checks per hour per IP. We capture your
                  email + the verification result for our funnel — your
                  compliance data is yours alone.
                </p>
              </form>

              {/* Source grid — Sprint 4C: progressive reveal during submit.
                   Cards stay descriptive while idle, transition through
                   "checking…" → "✓ verified" / "✗ failed" as SSE events
                   arrive. */}
              <div
                className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3"
                aria-label="Source verification progress"
                aria-live="polite"
              >
                {Object.entries(SOURCE_LABELS).map(([key, src]) => {
                  const Icon = src.icon;
                  const state = sourceStates[key] ?? { status: "idle" };
                  return (
                    <SourceCard
                      key={key}
                      sourceKey={key}
                      label={src.label}
                      description={src.description}
                      Icon={Icon}
                      state={state}
                    />
                  );
                })}
              </div>
              {leadId && submitting && (
                <p
                  className="mt-4 text-caption text-slate-500 text-center"
                  aria-live="polite"
                >
                  Lead captured ({leadId.slice(0, 12)}…) — verifying sources…
                </p>
              )}
            </motion.div>
          ) : (
            <PulseResult result={result} email={email} onReset={handleReset} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Result Component ──────────────────────────────────────────────────────

function PulseResult({
  result,
  email,
  onReset,
}: {
  result: PulseResponse;
  email: string;
  onReset: () => void;
}) {
  const tierBadge =
    result.bestPossibleTier === "T2_SOURCE_VERIFIED" ? (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-caption text-emerald-300">
        <CheckCircle2 className="w-3 h-3" />
        Source-verified data available
      </div>
    ) : (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-caption text-amber-300">
        <AlertTriangle className="w-3 h-3" />
        No public data found — manual setup needed
      </div>
    );

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
      role="region"
      aria-label="Pulse verification result"
    >
      <div className="bg-navy-900 border border-navy-700/50 rounded-2xl p-6 md:p-8 space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-heading font-semibold text-white mb-2">
              Verification result
            </h2>
            <p className="text-small text-slate-400">
              We checked{" "}
              {result.successfulSources.length + result.failedSources.length}{" "}
              source
              {result.successfulSources.length + result.failedSources.length ===
              1
                ? ""
                : "s"}{" "}
              for <span className="font-mono text-slate-300">{email}</span>
            </p>
          </div>
          {tierBadge}
        </header>

        {/* ─── Per-source outcomes ──────────────────── */}
        <section aria-label="Source outcomes">
          <h3 className="text-small uppercase tracking-wider text-slate-500 mb-3">
            Sources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(SOURCE_LABELS).map((source) => {
              const succeeded = result.successfulSources.includes(source);
              const failed = result.failedSources.find(
                (f) => f.source === source,
              );
              const Icon = SOURCE_LABELS[source].icon;
              return (
                <div
                  key={source}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    succeeded
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : failed
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-slate-700/10 border-slate-700/30"
                  }`}
                >
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-small font-medium text-slate-200">
                        {SOURCE_LABELS[source].label}
                      </span>
                      {succeeded && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                    {failed && (
                      <p className="text-caption text-amber-300/80 mt-0.5">
                        {failed.errorKind}
                      </p>
                    )}
                    {!succeeded && !failed && (
                      <p className="text-caption text-slate-500 mt-0.5">
                        Not applicable
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Merged fields ─────────────────────────── */}
        {result.mergedFields.length > 0 && (
          <section aria-label="Detected fields">
            <h3 className="text-small uppercase tracking-wider text-slate-500 mb-3">
              What we know about you
            </h3>
            <ul className="space-y-2">
              {result.mergedFields.map((field) => (
                <li
                  key={field.fieldName}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-navy-800/50"
                >
                  <div className="min-w-0">
                    <div className="text-small text-slate-400">
                      {FIELD_LABELS[field.fieldName] ?? field.fieldName}
                    </div>
                    <div className="text-body font-mono text-slate-100 mt-0.5">
                      {String(field.value)}
                    </div>
                  </div>
                  <div className="text-caption text-emerald-300/80 mt-1 flex-shrink-0">
                    {field.agreementCount}/{result.successfulSources.length}{" "}
                    source
                    {result.successfulSources.length === 1 ? "" : "s"} confirmed
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── Warnings ──────────────────────────────── */}
        {result.warnings.length > 0 && (
          <section aria-label="Notes">
            <h3 className="text-small uppercase tracking-wider text-slate-500 mb-3">
              Notes
            </h3>
            <ul className="space-y-2 text-caption text-slate-400">
              {result.warnings.slice(0, 5).map((warning, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-navy-800/30"
                >
                  <span className="w-1 h-1 rounded-full bg-slate-500 mt-2 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── CTA ──────────────────────────────────── */}
        <footer className="pt-4 border-t border-navy-700/30 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-subtitle font-semibold transition-colors"
          >
            <Shield className="w-4 h-4" />
            Sign up to lock this in
          </Link>
          <a
            href={`/api/public/pulse/report/${result.leadId}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-200 text-subtitle font-medium transition-colors"
            aria-label="Download 15-page PDF report"
          >
            <FileDown className="w-4 h-4" />
            Download PDF
          </a>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-300 text-subtitle font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Run another check
          </button>
        </footer>
      </div>

      <p className="mt-6 text-caption text-slate-500 text-center">
        Lead ID: <span className="font-mono">{result.leadId}</span>
      </p>
    </motion.div>
  );
}

// ─── Source Card (Sprint 4C — progressive reveal) ─────────────────────────

function SourceCard({
  sourceKey,
  label,
  description,
  Icon,
  state,
}: {
  sourceKey: string;
  label: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  state: SourceState;
}) {
  const idle = state.status === "idle";
  const checking = state.status === "checking";
  const success = state.status === "success";
  const failed = state.status === "failed";

  // Border + bg shade per state
  const tone = success
    ? "bg-emerald-500/10 border-emerald-500/30"
    : failed
      ? "bg-amber-500/10 border-amber-500/30"
      : checking
        ? "bg-emerald-500/5 border-emerald-500/20"
        : "bg-navy-900/50 border-navy-700/50";

  return (
    <motion.div
      layout
      data-source={sourceKey}
      data-state={state.status}
      className={`p-4 rounded-xl border ${tone} transition-colors`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon
          className={`w-5 h-5 ${
            success
              ? "text-emerald-400"
              : failed
                ? "text-amber-400"
                : "text-emerald-400"
          }`}
        />
        {checking && (
          <Loader2 className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
        )}
        {success && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {failed && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
      </div>
      <div className="text-small font-semibold text-slate-200 mb-1">
        {label}
      </div>
      <div className="text-caption text-slate-500 min-h-[2.25rem]">
        {idle && description}
        {checking && <span className="text-emerald-300/80">Querying…</span>}
        {success && <span className="text-emerald-300/80">Confirmed ✓</span>}
        {failed && (
          <span className="text-amber-300/80">
            {state.errorKind ?? "unavailable"}
          </span>
        )}
      </div>
    </motion.div>
  );
}
