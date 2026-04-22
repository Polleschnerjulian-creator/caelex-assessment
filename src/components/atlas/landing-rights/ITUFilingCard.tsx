/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * ITU filing card — compact display with BIU status + Resolution 35
 * milestone progress + deep-link to ITU SRS database.
 */

import { ExternalLink } from "lucide-react";
import type { ITUFiling } from "@/data/landing-rights";

const BIU_LABEL: Record<ITUFiling["biu_status"], string> = {
  pre_biu: "Pre-BIU",
  biu_achieved: "BIU achieved",
  biu_failed: "BIU failed",
  unknown: "Status unknown",
};

const BIU_COLOR: Record<ITUFiling["biu_status"], string> = {
  pre_biu: "bg-amber-50 text-amber-700 border-amber-200",
  biu_achieved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  biu_failed: "bg-red-50 text-red-700 border-red-200",
  unknown:
    "bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-secondary)] border-[var(--atlas-border)]",
};

export function ITUFilingCard({ filing }: { filing: ITUFiling }) {
  const pct = filing.resolution_35_milestones?.current_progress_pct;
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--atlas-text-primary)]">
            {filing.operator}
          </p>
          <p className="text-[11px] font-mono text-[var(--atlas-text-muted)] truncate">
            {filing.satellite_network_id}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-semibold uppercase tracking-wider flex-shrink-0 ${BIU_COLOR[filing.biu_status]}`}
        >
          {BIU_LABEL[filing.biu_status]}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[var(--atlas-text-muted)]">
        <span>{filing.system_type}</span>
        {filing.biu_date && <span>BIU {filing.biu_date}</span>}
      </div>

      {filing.resolution_35_milestones && (
        <div className="pt-2 border-t border-[var(--atlas-border-subtle)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
              Resolution 35 progress
            </span>
            {pct !== undefined && (
              <span className="text-[11px] font-bold text-[var(--atlas-text-primary)]">
                {pct}%
              </span>
            )}
          </div>
          {pct !== undefined && (
            <div className="h-1.5 w-full bg-[var(--atlas-bg-inset)] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] text-[var(--atlas-text-muted)]">
            {filing.resolution_35_milestones.milestone_10_pct && (
              <div>
                <p className="uppercase tracking-wider text-[var(--atlas-text-faint)]">
                  10%
                </p>
                <p className="text-[var(--atlas-text-secondary)]">
                  {filing.resolution_35_milestones.milestone_10_pct}
                </p>
              </div>
            )}
            {filing.resolution_35_milestones.milestone_50_pct && (
              <div>
                <p className="uppercase tracking-wider text-[var(--atlas-text-faint)]">
                  50%
                </p>
                <p className="text-[var(--atlas-text-secondary)]">
                  {filing.resolution_35_milestones.milestone_50_pct}
                </p>
              </div>
            )}
            {filing.resolution_35_milestones.milestone_100_pct && (
              <div>
                <p className="uppercase tracking-wider text-[var(--atlas-text-faint)]">
                  100%
                </p>
                <p className="text-[var(--atlas-text-secondary)]">
                  {filing.resolution_35_milestones.milestone_100_pct}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {filing.notes && (
        <p className="text-[11px] text-[var(--atlas-text-secondary)] leading-relaxed">
          {filing.notes}
        </p>
      )}

      {filing.itu_srs_url && (
        <a
          href={filing.itu_srs_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700"
        >
          ITU SRS database <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}
