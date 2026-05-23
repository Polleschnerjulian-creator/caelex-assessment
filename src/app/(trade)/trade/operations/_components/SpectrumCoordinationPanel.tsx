"use client";

/**
 * SpectrumCoordinationPanel — Caelex Comply cross-domain bridge.
 *
 * Read-only surface that pulls the related spacecraft's ITU coordination
 * state (frequencies, filing reference, phase) from the main Caelex
 * Comply Spectrum module. The four ITU phases (FILED → COORDINATED →
 * NOTIFIED → OPERATIONAL) are surfaced as a single derived status,
 * plus DENIED for unfavorable examination outcomes.
 *
 * Data source: GET /api/trade/operations/[id]/comply-bridge (spectrum key).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { Radio, ArrowUpRight, Link2Off } from "lucide-react";

interface SpacecraftLinkContext {
  spacecraftId: string;
  spacecraftName: string;
  cosparId: string | null;
  noradId: string | null;
  orbitType: string;
  missionRefId: string;
  missionName: string;
}

export interface SpectrumStatusView {
  spacecraft: SpacecraftLinkContext;
  operatingFrequenciesMhz: number[];
  ituStatus:
    | "FILED"
    | "COORDINATED"
    | "NOTIFIED"
    | "OPERATIONAL"
    | "DENIED"
    | null;
  filingReference: string | null;
  nationalAdministration: string | null;
  status: "compliant" | "non_compliant" | "under_review" | "unknown";
}

interface SpectrumCoordinationPanelProps {
  data: SpectrumStatusView | null;
  loading?: boolean;
}

const STATUS_META: Record<
  SpectrumStatusView["status"],
  { label: string; bg: string; border: string; badge: string }
> = {
  compliant: {
    label: "Operational",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
  },
  non_compliant: {
    label: "Denied",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-600 text-white",
  },
  under_review: {
    label: "In Coordination",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-500 text-white",
  },
  unknown: {
    label: "Unknown",
    bg: "bg-trade-bg-panel",
    border: "border-trade-border-subtle",
    badge: "bg-trade-text-muted text-white",
  },
};

const ITU_PHASE_LABEL: Record<
  Exclude<SpectrumStatusView["ituStatus"], null>,
  string
> = {
  FILED: "Advance Publication filed",
  COORDINATED: "Coordination Request published",
  NOTIFIED: "Notification submitted",
  OPERATIONAL: "MFRN recorded · BIU achieved",
  DENIED: "Examination unfavorable",
};

export function SpectrumCoordinationPanel({
  data,
  loading,
}: SpectrumCoordinationPanelProps) {
  if (loading) {
    return (
      <section
        className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-5"
        aria-label="Caelex Comply: spectrum coordination"
      >
        <PanelHeader />
        <div className="text-[12px] text-trade-text-muted">
          Loading spectrum status…
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section
        className="rounded-md border border-dashed border-trade-border-subtle bg-trade-bg-panel p-5"
        aria-label="Caelex Comply: spectrum coordination"
      >
        <PanelHeader />
        <EmptyState />
      </section>
    );
  }

  const meta = STATUS_META[data.status];

  return (
    <section
      className={`rounded-md border ${meta.border} ${meta.bg} p-5`}
      aria-label="Caelex Comply: spectrum coordination"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <PanelHeader />
        <span
          className={`shrink-0 rounded px-2 py-[2px] text-[10px] font-bold uppercase tracking-widest ${meta.badge}`}
        >
          {meta.label}
        </span>
      </header>

      <div className="mb-3 text-[11px] text-trade-text-secondary">
        <span className="font-mono">{data.spacecraft.spacecraftName}</span>
        <span className="ml-2 text-trade-text-muted">
          · {data.spacecraft.orbitType}
        </span>
      </div>

      <dl className="mb-3 space-y-2 text-[12px]">
        <Row label="ITU phase">
          {data.ituStatus ? (
            <>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-trade-text-primary">
                {data.ituStatus}
              </span>
              <span className="ml-2 text-trade-text-muted">
                {ITU_PHASE_LABEL[data.ituStatus]}
              </span>
            </>
          ) : (
            <span className="text-trade-text-muted">Not filed</span>
          )}
        </Row>

        <Row label="Frequencies (MHz)">
          {data.operatingFrequenciesMhz.length === 0 ? (
            <span className="text-trade-text-muted">none declared</span>
          ) : (
            <span className="font-mono tabular-nums text-trade-text-primary">
              {data.operatingFrequenciesMhz.join(", ")}
            </span>
          )}
        </Row>

        <Row label="Filing reference">
          {data.filingReference ? (
            <span className="font-mono text-trade-text-primary">
              {data.filingReference}
            </span>
          ) : (
            <span className="text-trade-text-muted">—</span>
          )}
        </Row>

        <Row label="Administration">
          {data.nationalAdministration ? (
            <span className="text-trade-text-primary">
              {data.nationalAdministration}
            </span>
          ) : (
            <span className="text-trade-text-muted">—</span>
          )}
        </Row>
      </dl>

      <div className="flex items-center justify-end border-t border-trade-border-subtle pt-3">
        <Link
          href="/dashboard/modules/spectrum"
          className="inline-flex items-center gap-1 rounded border border-trade-border-subtle bg-white/60 px-2 py-1 text-[11px] font-medium text-trade-accent transition hover:bg-white hover:text-trade-accent-strong"
        >
          Open Spectrum module <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="flex items-center gap-2">
      <Radio className="h-4 w-4 text-trade-text-secondary" aria-hidden="true" />
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
        Caelex Comply · ITU Spectrum
      </h3>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start gap-3 text-[12px] text-trade-text-secondary">
      <Link2Off className="mt-0.5 h-4 w-4 shrink-0 text-trade-text-muted" />
      <div>
        <p>
          This operation isn&rsquo;t linked to a Caelex Comply Spacecraft. ITU
          spectrum coordination status can only be surfaced once a Mission +
          Spacecraft are attached.
        </p>
        <p className="mt-1 text-trade-text-muted">
          To link: edit the operation &rarr; assign Mission &rarr; ensure the
          Mission has an active Spacecraft assignment.
        </p>
      </div>
    </div>
  );
}
