/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * ClusterSection — one obligation cluster on the FULL result page
 * (plan Task 3.3, §6 (2) "obligation map by cluster").
 *
 * Server-compatible presentational component (no hooks — the interactive
 * parts live inside the client FindingCard children). Renders:
 *   - the cluster label + per-verdict counts (chips, only non-zero),
 *   - the optional Task 3.2 readiness band as an "N of M" evidence band —
 *     deliberately worded with "of", NEVER a slash or a 0–100 figure
 *     (honesty invariant #6: per-cluster bands only, no score),
 *   - EVERY finding through FindingCard (full envelopes — the full tier
 *     shows bodies, unlike the quick tier's counts + one headline). The
 *     per-finding refusal guard lives in FindingCard itself.
 *
 * Props are structural (JSON-tolerant) — the page feeds it the stored
 * snapshot's cluster objects.
 */

import FindingCard from "./FindingCard";
import type { AssessmentFinding } from "@/lib/assessment/finding";
// Type-only import — erased at compile time (server module never bundles).
import type { ClusterReadiness } from "@/lib/assessment/readiness.server";

export interface ClusterSectionData {
  id: string;
  label: string;
  counts: {
    applicable: number;
    conditional: number;
    contested: number;
    advisory: number;
  };
  findings: AssessmentFinding[];
}

export interface ClusterSectionProps {
  cluster: ClusterSectionData;
  /** Task 3.2 per-cluster evidence band, when the result carries one. */
  readiness?: ClusterReadiness;
}

function ReadinessBand({ readiness }: { readiness: ClusterReadiness }) {
  // "N of M" wording — never a slash, never an aggregate (invariant #6).
  const parts: string[] = [];
  if (readiness.partial > 0) parts.push(`${readiness.partial} partial`);
  if (readiness.undocumented > 0)
    parts.push(`${readiness.undocumented} undocumented`);
  if (readiness.missing > 0) parts.push(`${readiness.missing} missing`);
  if (readiness.unsure > 0) parts.push(`${readiness.unsure} unsure`);

  return (
    <p
      data-testid="readiness-band"
      className="mb-4 text-small text-white/55 leading-relaxed"
    >
      Evidence readiness:{" "}
      <span className="font-medium text-emerald-300">
        {readiness.evidenced} of {readiness.total}
      </span>{" "}
      items evidenced
      {parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
    </p>
  );
}

export default function ClusterSection({
  cluster,
  readiness,
}: ClusterSectionProps) {
  const countChips: { label: string; value: number; className: string }[] = [
    {
      label: "applicable",
      value: cluster.counts.applicable,
      className: "text-red-300",
    },
    {
      label: "conditional",
      value: cluster.counts.conditional,
      className: "text-amber-300",
    },
    {
      label: "contested",
      value: cluster.counts.contested,
      className: "text-amber-300",
    },
    {
      label: "advisory",
      value: cluster.counts.advisory,
      className: "text-white/60",
    },
  ].filter((c) => c.value > 0);

  return (
    <section
      aria-label={cluster.label}
      className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-title text-white">{cluster.label}</h3>
        <div className="flex flex-wrap gap-3">
          {countChips.map((c) => (
            <span key={c.label} className="text-small text-white/45">
              <span className={`font-medium ${c.className}`}>{c.value}</span>{" "}
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {readiness ? <ReadinessBand readiness={readiness} /> : null}

      {cluster.findings.length > 0 ? (
        <div className="space-y-3">
          {cluster.findings.map((f, i) => (
            <FindingCard key={i} finding={f} />
          ))}
        </div>
      ) : (
        <p className="text-body text-white/55 leading-relaxed">
          No findings were recorded in this cluster — none identified on your
          answers.
        </p>
      )}
    </section>
  );
}
