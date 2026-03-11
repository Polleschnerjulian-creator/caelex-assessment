"use client";

import { useState } from "react";
import { Loader2, ExternalLink, ChevronDown } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

type RequirementStatus =
  | "COMPLIANT"
  | "PARTIAL"
  | "NON_COMPLIANT"
  | "NOT_ASSESSED"
  | "NOT_APPLICABLE";

export interface AssetRequirement {
  id: string;
  requirementId: string;
  requirementLabel: string;
  regulationFramework: string;
  status: RequirementStatus;
  evidenceId?: string | null;
  notes?: string | null;
  nextReviewDate?: string | null;
}

interface AssetRequirementsTabProps {
  requirements: AssetRequirement[];
  assetId: string;
  onUpdate: (
    reqId: string,
    data: {
      status?: RequirementStatus;
      notes?: string;
      nextReviewDate?: string;
    },
  ) => Promise<void>;
}

const STATUS_BADGE: Record<RequirementStatus, string> = {
  COMPLIANT: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  PARTIAL: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  NON_COMPLIANT: "bg-red-500/20 text-red-400 border border-red-500/30",
  NOT_ASSESSED: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  NOT_APPLICABLE: "bg-slate-600/20 text-slate-500 border border-slate-600/30",
};

const STATUS_OPTIONS: RequirementStatus[] = [
  "NOT_ASSESSED",
  "COMPLIANT",
  "PARTIAL",
  "NON_COMPLIANT",
  "NOT_APPLICABLE",
];

function RequirementRow({
  req,
  onUpdate,
}: {
  req: AssetRequirement;
  onUpdate: AssetRequirementsTabProps["onUpdate"];
}) {
  const [status, setStatus] = useState<RequirementStatus>(req.status);
  const [notes, setNotes] = useState(req.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleStatusChange(newStatus: RequirementStatus) {
    setStatus(newStatus);
    setSaving(true);
    try {
      await onUpdate(req.id, { status: newStatus });
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesSave() {
    setSaving(true);
    try {
      await onUpdate(req.id, { notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-[var(--glass-border)] last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <ChevronDown
          size={14}
          className={`text-slate-500 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-small font-medium text-slate-200 truncate">
            {req.requirementLabel}
          </p>
          <p className="text-caption text-slate-500 mt-0.5">
            {req.regulationFramework} · {req.requirementId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <Loader2 size={12} className="animate-spin text-slate-500" />
          )}
          <select
            value={status}
            onChange={(e) => {
              e.stopPropagation();
              handleStatusChange(e.target.value as RequirementStatus);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`text-caption px-2 py-1 rounded border bg-transparent cursor-pointer focus:outline-none ${STATUS_BADGE[status]}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-navy-900 text-slate-200">
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-white/[0.01]">
          <div>
            <label className="block text-caption text-slate-500 mb-1 uppercase tracking-wider">
              Notes
            </label>
            <div className="flex gap-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes…"
                rows={2}
                className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-small text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
              <button
                onClick={handleNotesSave}
                disabled={saving}
                className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-small rounded-lg border border-emerald-500/30 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
          {req.evidenceId && (
            <a
              href={`/dashboard/documents/${req.evidenceId}`}
              className="inline-flex items-center gap-1.5 text-small text-emerald-400 hover:underline"
            >
              <ExternalLink size={12} />
              View evidence
            </a>
          )}
          {req.nextReviewDate && (
            <p className="text-caption text-slate-500">
              Next review:{" "}
              {new Date(req.nextReviewDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssetRequirementsTab({
  requirements,
  assetId: _assetId,
  onUpdate,
}: AssetRequirementsTabProps) {
  const grouped = requirements.reduce<Record<string, AssetRequirement[]>>(
    (acc, req) => {
      const key = req.regulationFramework;
      if (!acc[key]) acc[key] = [];
      acc[key].push(req);
      return acc;
    },
    {},
  );

  const statusCounts = requirements.reduce<Record<RequirementStatus, number>>(
    (acc, req) => {
      acc[req.status] = (acc[req.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<RequirementStatus, number>,
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(statusCounts) as [RequirementStatus, number][]).map(
          ([status, count]) => (
            <span
              key={status}
              className={`inline-flex items-center px-2.5 py-1 rounded text-caption font-medium ${STATUS_BADGE[status]}`}
            >
              {count} {status.replace(/_/g, " ")}
            </span>
          ),
        )}
      </div>

      {requirements.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <p className="text-body text-slate-400">
            No requirements mapped to this asset yet.
          </p>
        </GlassCard>
      ) : (
        Object.entries(grouped).map(([framework, reqs]) => (
          <GlassCard key={framework} hover={false} className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--glass-border)] bg-white/[0.02]">
              <h4 className="text-body font-semibold text-slate-200">
                {framework}
              </h4>
              <p className="text-caption text-slate-500">
                {reqs.length} requirements
              </p>
            </div>
            <div>
              {reqs.map((req) => (
                <RequirementRow key={req.id} req={req} onUpdate={onUpdate} />
              ))}
            </div>
          </GlassCard>
        ))
      )}
    </div>
  );
}
