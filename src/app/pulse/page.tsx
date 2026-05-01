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

export default function PulsePage() {
  const [legalName, setLegalName] = useState("");
  const [vatId, setVatId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PulseResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/public/pulse/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          legalName,
          email,
          vatId: vatId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
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

      setResult(data as PulseResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
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

              {/* Source list — set the expectation for what's about to happen */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SOURCE_LABELS).map(([key, src]) => {
                  const Icon = src.icon;
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl bg-navy-900/50 border border-navy-700/50"
                    >
                      <Icon className="w-5 h-5 text-emerald-400 mb-2" />
                      <div className="text-small font-semibold text-slate-200 mb-1">
                        {src.label}
                      </div>
                      <div className="text-caption text-slate-500">
                        {src.description}
                      </div>
                    </div>
                  );
                })}
              </div>
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
