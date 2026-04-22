"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  X,
  CheckSquare,
  Sparkles,
} from "lucide-react";

/**
 * /dashboard/admin/atlas-amendments — Phase 1 auto-update review queue.
 *
 * The daily atlas-source-check cron detects when an indexed legal-source
 * URL changes, then asks Claude Haiku whether the change is substantive.
 * Cosmetic diffs are auto-rejected. This page surfaces the remaining
 * PENDING candidates so a platform admin can decide:
 *   APPROVE     — real amendment; data file should be updated
 *   REJECT      — false positive or noise
 *   INTEGRATED  — already written back into the static data file
 */

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Amendment {
  id: string;
  sourceId: string;
  jurisdiction: string;
  contentHash: string;
  previousHash: string | null;
  httpStatus: number | null;
  detectedAt: string;
  diffSummaryAi: string | null;
  diffKeyChanges: unknown;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  integratedAt: string | null;
  sourceUrl: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function keyChangesArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export default function AtlasAmendmentsPage() {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | "ALL"
  >("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async (status: typeof filter) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/atlas-amendments?status=${status}&limit=200`,
      );
      if (res.ok) {
        const data = await res.json();
        setAmendments(data.amendments || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(filter);
  }, [fetchAll, filter]);

  const handleAction = useCallback(
    async (id: string, action: "approve" | "reject" | "mark_integrated") => {
      setActionLoading(id);
      try {
        const res = await fetch("/api/admin/atlas-amendments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        if (res.ok) {
          // Remove from local list — it's either out of scope for the
          // current filter (PENDING → APPROVED) or already reflected by
          // integratedAt. Simpler than a perfect local merge.
          setAmendments((prev) => prev.filter((a) => a.id !== id));
        }
      } catch {
        // silent
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const pendingCount = amendments.filter(
    (a) => a.reviewStatus === "PENDING",
  ).length;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">
            ATLAS Amendment Review
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Claude-classified content changes detected on indexed legal-source
            URLs. Cosmetic diffs are auto-rejected upstream.
          </p>
        </div>
        <button
          onClick={() => fetchAll(filter)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
            {f === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-[13px]">
          Loading…
        </div>
      ) : amendments.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-[13px]">
            {filter === "PENDING"
              ? "Queue is clear. No pending amendments need review."
              : "No amendments match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {amendments.map((a) => {
            const tags = keyChangesArray(a.diffKeyChanges);
            return (
              <article
                key={a.id}
                className="rounded-xl bg-white border border-gray-100 p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400">
                        {a.jurisdiction}
                      </span>
                      <span className="text-[13px] font-medium text-gray-900 truncate">
                        {a.sourceId}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        · detected {timeAgo(a.detectedAt)}
                      </span>
                    </div>
                    {a.sourceUrl && (
                      <a
                        href={a.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        {a.sourceUrl}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${
                      a.reviewStatus === "PENDING"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : a.reviewStatus === "APPROVED"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    {a.integratedAt ? "Integrated" : a.reviewStatus}
                  </span>
                </div>

                {/* AI summary */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100 mb-3">
                  <Sparkles
                    size={12}
                    className="text-emerald-600 mt-0.5 flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                      Claude summary
                    </span>
                    <p className="text-[12px] text-gray-700 leading-relaxed">
                      {a.diffSummaryAi ??
                        "No AI summary — admin must review the source URL directly."}
                    </p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Review note (if already reviewed) */}
                {a.reviewNote && (
                  <div className="text-[11px] text-gray-500 italic mb-3 pl-3 border-l-2 border-gray-200">
                    Note: {a.reviewNote}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {a.reviewStatus === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleAction(a.id, "approve")}
                        disabled={actionLoading === a.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(a.id, "reject")}
                        disabled={actionLoading === a.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        <X size={12} />
                        Reject
                      </button>
                    </>
                  )}
                  {a.reviewStatus === "APPROVED" && !a.integratedAt && (
                    <button
                      onClick={() => handleAction(a.id, "mark_integrated")}
                      disabled={actionLoading === a.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <CheckSquare size={12} />
                      Mark integrated into data file
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
