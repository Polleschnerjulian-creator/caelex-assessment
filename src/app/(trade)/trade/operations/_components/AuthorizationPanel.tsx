"use client";

/**
 * AuthorizationPanel — Caelex Comply cross-domain bridge.
 *
 * Read-only surface that pulls the related spacecraft's national space-act
 * authorisation state (AuthorizationWorkflow + NIS2 entity classification)
 * from the main Caelex Comply Authorization module.
 *
 * Surfaces three signals:
 *   - National space-act authorisation status (Caelex Comply)
 *   - EU Space Act compliance pathway (AuthorizationWorkflow.pathway)
 *   - NIS2 essential / important / out-of-scope classification
 *
 * Data source: GET /api/trade/operations/[id]/comply-bridge (authorization key).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { Stamp, ArrowUpRight, Link2Off } from "lucide-react";

interface SpacecraftLinkContext {
  spacecraftId: string;
  spacecraftName: string;
  cosparId: string | null;
  noradId: string | null;
  orbitType: string;
  missionRefId: string;
  missionName: string;
}

export interface AuthorizationStatusView {
  spacecraft: SpacecraftLinkContext;
  nationalAuthorizationStatus: string | null;
  primaryNcaName: string | null;
  euSpaceActPathway: string | null;
  nis2Classification: "essential" | "important" | "out_of_scope" | null;
  status: "compliant" | "non_compliant" | "under_review" | "unknown";
}

interface AuthorizationPanelProps {
  data: AuthorizationStatusView | null;
  loading?: boolean;
}

const STATUS_META: Record<
  AuthorizationStatusView["status"],
  { label: string; bg: string; border: string; badge: string }
> = {
  compliant: {
    label: "Approved",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
  },
  non_compliant: {
    label: "Rejected",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-600 text-white",
  },
  under_review: {
    label: "Under Review",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-500 text-white",
  },
  unknown: {
    label: "Not Started",
    bg: "bg-trade-bg-panel",
    border: "border-trade-border-subtle",
    badge: "bg-trade-text-muted text-white",
  },
};

const WORKFLOW_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "Draft in progress",
  submitted: "Submitted to NCA",
  under_review: "Under NCA review",
  approved: "Approved",
  rejected: "Rejected",
};

const PATHWAY_LABEL: Record<string, string> = {
  national_authorization: "National authorisation (national space act)",
  euspa_registration: "EUSPA registration (EU Space Act § 13)",
  commission_decision: "EU Commission decision (EU Space Act § 17)",
};

const NIS2_LABEL: Record<
  Exclude<AuthorizationStatusView["nis2Classification"], null>,
  string
> = {
  essential: "Essential entity",
  important: "Important entity",
  out_of_scope: "Out of scope",
};

const NIS2_TONE: Record<
  Exclude<AuthorizationStatusView["nis2Classification"], null>,
  string
> = {
  essential: "text-red-700 bg-red-100",
  important: "text-amber-700 bg-amber-100",
  out_of_scope: "text-trade-text-secondary bg-trade-bg-subtle",
};

export function AuthorizationPanel({ data, loading }: AuthorizationPanelProps) {
  if (loading) {
    return (
      <section
        className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-5"
        aria-label="Caelex Comply: authorization"
      >
        <PanelHeader />
        <div className="text-[12px] text-trade-text-muted">
          Loading authorization status…
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section
        className="rounded-md border border-dashed border-trade-border-subtle bg-trade-bg-panel p-5"
        aria-label="Caelex Comply: authorization"
      >
        <PanelHeader />
        <EmptyState />
      </section>
    );
  }

  const meta = STATUS_META[data.status];
  const workflowLabel = data.nationalAuthorizationStatus
    ? (WORKFLOW_STATUS_LABEL[data.nationalAuthorizationStatus] ??
      data.nationalAuthorizationStatus)
    : "No workflow";
  const pathwayLabel = data.euSpaceActPathway
    ? (PATHWAY_LABEL[data.euSpaceActPathway] ?? data.euSpaceActPathway)
    : null;

  return (
    <section
      className={`rounded-md border ${meta.border} ${meta.bg} p-5`}
      aria-label="Caelex Comply: authorization"
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
        <Row label="National authorisation">
          <span className="text-trade-text-primary">{workflowLabel}</span>
          {data.primaryNcaName && (
            <span className="ml-2 text-trade-text-muted">
              · {data.primaryNcaName}
            </span>
          )}
        </Row>

        <Row label="EU Space Act pathway">
          {pathwayLabel ? (
            <span className="text-trade-text-primary">{pathwayLabel}</span>
          ) : (
            <span className="text-trade-text-muted">Not determined</span>
          )}
        </Row>

        <Row label="NIS2 entity classification">
          {data.nis2Classification ? (
            <span
              className={`rounded px-1.5 py-[1px] font-mono text-[10px] font-bold uppercase tracking-widest ${NIS2_TONE[data.nis2Classification]}`}
            >
              {NIS2_LABEL[data.nis2Classification]}
            </span>
          ) : (
            <span className="text-trade-text-muted">Not assessed</span>
          )}
        </Row>
      </dl>

      <div className="flex items-center justify-end border-t border-trade-border-subtle pt-3">
        <Link
          href="/dashboard/modules/authorization"
          className="inline-flex items-center gap-1 rounded border border-trade-border-subtle bg-trade-bg-panel px-2 py-1 text-[11px] font-medium text-trade-accent transition hover:bg-trade-hover hover:text-trade-accent-strong"
        >
          Open Authorization module <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="flex items-center gap-2">
      <Stamp className="h-4 w-4 text-trade-text-secondary" aria-hidden="true" />
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
        Caelex Comply · Authorization
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
          This operation isn&rsquo;t linked to a Caelex Comply Spacecraft.
          National space-act authorisation and NIS2 classification can only be
          surfaced once a Mission + Spacecraft are attached.
        </p>
        <p className="mt-1 text-trade-text-muted">
          To link: edit the operation &rarr; assign Mission &rarr; ensure the
          Mission has an active Spacecraft assignment.
        </p>
      </div>
    </div>
  );
}
