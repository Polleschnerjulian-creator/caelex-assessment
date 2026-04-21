"use client";

/**
 * /dev/provenance — visual preview of the Context-Omnipresence primitives.
 *
 * Not wired to real data. Demonstrates every origin × every density for
 * <ProvenanceChip /> and the <CausalBreadcrumb /> variants. Used by design
 * + engineering to eyeball the visual system before it gets plumbed into
 * real flows in Phase 3+.
 *
 * Public route, no auth. Contains no user data.
 */

import { useState } from "react";
import {
  ProvenanceChip,
  CausalBreadcrumb,
  SidePeek,
  type ChipDensity,
  type TraceDTO,
} from "@/components/provenance";
import { ALL_TRUST_ORIGINS } from "@/lib/design/trust-tokens";
import { useLanguage } from "@/components/providers/LanguageProvider";

// Mock data for the SidePeek demo — no API roundtrip needed.
const MOCK_TRACE: TraceDTO = {
  id: "trace_mock_1",
  entityType: "operator_profile",
  entityId: "op_demo",
  fieldName: "operatorType",
  value: "satellite_operator",
  origin: "assessment",
  sourceRef: {
    kind: "assessment",
    assessmentId: "assess_2026_01_15",
    questionId: "q_operator_type",
    answeredAt: "2026-01-15T12:43:00Z",
  },
  confidence: null,
  modelVersion: null,
  derivedAt: "2026-01-15T12:43:00Z",
  expiresAt: "2027-01-15T12:43:00Z",
  upstreamTraceIds: ["trace_mock_parent"],
};

const MOCK_UPSTREAM: TraceDTO[] = [
  MOCK_TRACE,
  {
    id: "trace_mock_parent",
    entityType: "assessment",
    entityId: "assess_2026_01_15",
    fieldName: "q_operator_type",
    value: "satellite_operator",
    origin: "user-asserted",
    sourceRef: {
      kind: "user-edit",
      userId: "u_demo",
      editedAt: "2026-01-15T12:40:00Z",
    },
    confidence: null,
    modelVersion: null,
    derivedAt: "2026-01-15T12:40:00Z",
    expiresAt: null,
    upstreamTraceIds: [],
  },
];

export default function ProvenancePreviewPage() {
  const { language, setLanguage } = useLanguage();
  const [density, setDensity] = useState<ChipDensity>("full");
  const [stale, setStale] = useState(false);
  const [dark, setDark] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 transition-colors">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <header className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              Provenance Primitives — Preview
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Phase 2A — Design tokens + ProvenanceChip + CausalBreadcrumb. Not
              wired to real data. Docs:{" "}
              <code className="text-xs">
                docs/CONTEXT-OMNIPRESENCE-INTEGRATION.md
              </code>
            </p>
          </header>

          {/* Controls */}
          <section className="flex flex-wrap gap-3 items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Density:</span>
              {(["full", "compact", "icon"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`px-2 py-1 rounded border text-xs ${
                    density === d
                      ? "bg-emerald-500 border-emerald-600 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={stale}
                onChange={(e) => setStale(e.target.checked)}
              />
              stale
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={dark}
                onChange={(e) => setDark(e.target.checked)}
              />
              dark mode
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-medium">Lang:</span>
              {(["en", "de", "fr", "es"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2 py-1 rounded border text-xs uppercase ${
                    language === l
                      ? "bg-emerald-500 border-emerald-600 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {/* ProvenanceChip grid */}
          <section>
            <h2 className="text-lg font-semibold mb-3">ProvenanceChip</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALL_TRUST_ORIGINS.map((origin) => (
                <div
                  key={origin}
                  className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-lg p-3"
                >
                  <code className="text-xs text-slate-500 dark:text-slate-400">
                    {origin}
                  </code>
                  <ProvenanceChip
                    origin={origin}
                    density={density}
                    confidence={origin === "ai-inferred" ? 0.82 : null}
                    stale={stale}
                    onClick={() =>
                      window.alert(
                        `Side-peek for "${origin}" would open here (Phase 2B)`,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          {/* CausalBreadcrumb samples */}
          <section>
            <h2 className="text-lg font-semibold mb-3">CausalBreadcrumb</h2>
            <div className="space-y-4">
              <Row
                value="Essential Entity"
                breadcrumb={
                  <CausalBreadcrumb
                    origin="deterministic"
                    reason="size ≥250 employees"
                    citation="NIS2 Art. 3"
                    date="2026-01-15"
                  />
                }
              />
              <Row
                value="LEO constellation (50 sats)"
                breadcrumb={
                  <CausalBreadcrumb
                    origin="assessment"
                    reason="Assessment Q7"
                    date="2026-01-15"
                  />
                }
              />
              <Row
                value="Control A1.3: Asset Management"
                breadcrumb={
                  <CausalBreadcrumb
                    origin="source-backed"
                    reason="NIS2 Art. 21(2)(d)"
                    citation="essential entities"
                    date="2026-02-02"
                  />
                }
              />
              <Row
                value="Supply chain contractor risk (0.82)"
                breadcrumb={
                  <CausalBreadcrumb
                    origin="ai-inferred"
                    reason="derived from Q12 answer (>10 contractors)"
                    date="2026-04-02"
                    onClick={() =>
                      window.alert("Jump to upstream trace (Phase 2B)")
                    }
                  />
                }
              />
              <Row
                value="German subsidiary authorized entity"
                breadcrumb={
                  <CausalBreadcrumb
                    origin="user-asserted"
                    reason="manually entered by compliance officer"
                    date="2026-03-12"
                  />
                }
              />
            </div>
          </section>

          {/* SidePeek demo — click-through trace detail panel */}
          <section>
            <h2 className="text-lg font-semibold mb-3">SidePeek</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Click to open the trace-detail panel with mock data (no API).
              Demonstrates the upstream chain navigation + metadata view.
            </p>
            <button
              onClick={() => setPeekOpen(true)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm"
            >
              Open SidePeek
            </button>
            <SidePeek
              traceId={peekOpen ? MOCK_TRACE.id : null}
              onClose={() => setPeekOpen(false)}
              initialData={{ trace: MOCK_TRACE, upstream: MOCK_UPSTREAM }}
            />
          </section>

          {/* Composition demo — chip + breadcrumb together */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Composition</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Chip before the value, breadcrumb after — for dense module rows.
            </p>
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ProvenanceChip origin="deterministic" density="compact" />
                <span className="font-medium">
                  Control A1.3: Asset Management
                </span>
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Missing
                </span>
                <CausalBreadcrumb
                  origin="deterministic"
                  reason="NIS2 Art. 21(2)(d)"
                  date="2026-02-02"
                  className="ml-2"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ProvenanceChip
                  origin="ai-inferred"
                  density="compact"
                  confidence={0.82}
                />
                <span className="font-medium">
                  Control A7.2: Supply Chain Risk
                </span>
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Partial
                </span>
                <CausalBreadcrumb
                  origin="ai-inferred"
                  reason="derived from Q12 contractor count"
                  date="2026-04-02"
                  className="ml-2"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({
  value,
  breadcrumb,
}: {
  value: string;
  breadcrumb: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-slate-200 dark:border-slate-800 pl-3">
      <span className="font-medium text-sm">{value}</span>
      {breadcrumb}
    </div>
  );
}
