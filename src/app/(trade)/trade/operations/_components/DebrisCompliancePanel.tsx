"use client";

/**
 * DebrisCompliancePanel — Caelex Comply cross-domain bridge.
 *
 * Read-only surface that pulls the related spacecraft's debris-mitigation
 * compliance state from the main Caelex Comply Debris module and renders
 * it on the Trade Operation detail page. Three indicators (IADC, 25-year
 * deorbit, FCC ODMP) + last-review date + a deep link to
 * /dashboard/modules/debris where the operator can edit the underlying
 * DebrisAssessment.
 *
 * The panel is independently nullable — when no Spacecraft is linked
 * to the operation (via Mission → MissionSpacecraft → Spacecraft), we
 * render an explanatory empty state with instructions on how to link.
 *
 * Data source: GET /api/trade/operations/[id]/comply-bridge (debris key).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  Orbit,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  Link2Off,
} from "lucide-react";
import type { ReactNode } from "react";

interface SpacecraftLinkContext {
  spacecraftId: string;
  spacecraftName: string;
  cosparId: string | null;
  noradId: string | null;
  orbitType: string;
  missionRefId: string;
  missionName: string;
}

export interface DebrisStatusView {
  spacecraft: SpacecraftLinkContext;
  iadcCompliant: boolean | null;
  deorbit25Year: "yes" | "no" | "exempt" | null;
  fccOdmpStatus: "yes" | "no" | "n_a" | null;
  lastReviewDate: string | Date | null;
  complianceScore: number | null;
  status: "compliant" | "non_compliant" | "under_review" | "unknown";
}

interface DebrisCompliancePanelProps {
  data: DebrisStatusView | null;
  loading?: boolean;
}

const STATUS_META: Record<
  DebrisStatusView["status"],
  { label: string; chip: string; text: string }
> = {
  compliant: {
    label: "Compliant",
    chip: "trade-chip-success",
    text: "text-trade-accent-success",
  },
  non_compliant: {
    label: "Non-Compliant",
    chip: "trade-chip-danger",
    text: "text-trade-accent-danger",
  },
  under_review: {
    label: "Under Review",
    chip: "trade-chip-warn",
    text: "text-trade-accent-warn",
  },
  unknown: {
    label: "Unknown",
    chip: "trade-chip-neutral",
    text: "text-trade-text-secondary",
  },
};

function YesNoIcon({
  value,
}: {
  value: "yes" | "no" | "exempt" | "n_a" | null | boolean;
}): ReactNode {
  if (value === "yes" || value === true) {
    return (
      <CheckCircle2
        className="h-3.5 w-3.5 text-trade-accent-success"
        aria-label="yes"
      />
    );
  }
  if (value === "no" || value === false) {
    return (
      <XCircle
        className="h-3.5 w-3.5 text-trade-accent-danger"
        aria-label="no"
      />
    );
  }
  if (value === "exempt" || value === "n_a") {
    return (
      <MinusCircle
        className="h-3.5 w-3.5 text-trade-text-muted"
        aria-label="not applicable"
      />
    );
  }
  return (
    <HelpCircle
      className="h-3.5 w-3.5 text-trade-text-muted"
      aria-label="unknown"
    />
  );
}

export function DebrisCompliancePanel({
  data,
  loading,
}: DebrisCompliancePanelProps) {
  if (loading) {
    return (
      <section
        className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-5"
        aria-label="Caelex Comply: debris compliance"
      >
        <PanelHeader />
        <div className="text-[12px] text-trade-text-muted">
          Loading debris status…
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section
        className="rounded-md border border-dashed border-trade-border-subtle bg-trade-bg-panel p-5"
        aria-label="Caelex Comply: debris compliance"
      >
        <PanelHeader />
        <EmptyState />
      </section>
    );
  }

  const meta = STATUS_META[data.status];
  const reviewDate = data.lastReviewDate ? new Date(data.lastReviewDate) : null;

  return (
    <section
      className={`rounded-md ${meta.chip} p-5`}
      aria-label="Caelex Comply: debris compliance"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <PanelHeader />
        <span
          className={`shrink-0 rounded px-2 py-[2px] text-[10px] font-bold uppercase tracking-widest ${meta.chip}`}
        >
          {meta.label}
        </span>
      </header>

      <div className="mb-3 text-[11px] text-trade-text-secondary">
        <span className="font-mono">{data.spacecraft.spacecraftName}</span>
        {data.spacecraft.cosparId && (
          <span className="ml-2 text-trade-text-muted">
            COSPAR {data.spacecraft.cosparId}
          </span>
        )}
        <span className="ml-2 text-trade-text-muted">
          · {data.spacecraft.orbitType}
        </span>
      </div>

      <ul className="mb-3 space-y-1.5 text-[12px] text-trade-text-primary">
        <IndicatorRow
          label="IADC mitigation guideline conformance"
          status={
            data.iadcCompliant === null
              ? null
              : data.iadcCompliant
                ? "yes"
                : "no"
          }
        />
        <IndicatorRow
          label="25-year deorbit plan (IADC § 5.3.2 / NASA-STD-8719.14B)"
          status={data.deorbit25Year}
        />
        <IndicatorRow
          label="FCC Orbital Debris Mitigation Plan (47 CFR § 25.114(d)(14))"
          status={data.fccOdmpStatus}
        />
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-trade-border-subtle pt-3 text-[11px] text-trade-text-muted">
        <div>
          {reviewDate ? (
            <>Last reviewed {reviewDate.toLocaleDateString("en-GB")}</>
          ) : (
            <>No review recorded</>
          )}
          {data.complianceScore !== null && (
            <span className="ml-2">· score {data.complianceScore}/100</span>
          )}
        </div>
        <Link
          href="/dashboard/modules/debris"
          className="inline-flex items-center gap-1 rounded border border-trade-border-subtle bg-trade-bg-panel px-2 py-1 font-medium text-trade-accent transition hover:bg-trade-hover hover:text-trade-accent-strong"
        >
          Open Debris module <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="flex items-center gap-2">
      <Orbit className="h-4 w-4 text-trade-text-secondary" aria-hidden="true" />
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
        Caelex Comply · Debris Mitigation
      </h3>
    </div>
  );
}

function IndicatorRow({
  label,
  status,
}: {
  label: string;
  status: "yes" | "no" | "exempt" | "n_a" | null;
}) {
  const statusLabel = (() => {
    switch (status) {
      case "yes":
        return "Yes";
      case "no":
        return "No";
      case "exempt":
        return "Exempt (GEO graveyard)";
      case "n_a":
        return "N/A";
      default:
        return "Unknown";
    }
  })();
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-[11.5px] leading-snug">{label}</span>
      <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-trade-text-muted">
        <YesNoIcon value={status} />
        {statusLabel}
      </span>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start gap-3 text-[12px] text-trade-text-secondary">
      <Link2Off className="mt-0.5 h-4 w-4 shrink-0 text-trade-text-muted" />
      <div>
        <p>
          This operation isn&rsquo;t linked to a Caelex Comply Spacecraft.
          Debris mitigation status can only be surfaced once the underlying
          Mission + Spacecraft are attached.
        </p>
        <p className="mt-1 text-trade-text-muted">
          To link: edit the operation &rarr; assign Mission &rarr; ensure the
          Mission has an active Spacecraft assignment.
        </p>
      </div>
    </div>
  );
}
