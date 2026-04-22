"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, CheckCircle2, X, Rss } from "lucide-react";

/**
 * /dashboard/admin/atlas-discoveries — Phase 2 auto-update review queue.
 *
 * The atlas-feed-discovery cron polls public RSS/Atom feeds and creates
 * an AtlasPendingSourceCandidate row when an entry matches space-law
 * keywords and isn't already indexed in the static data files. Admins
 * triage them:
 *   APPROVE — add to a data file (manual PR), stamp reviewedAt/By
 *   REJECT  — false positive, out of scope, duplicate
 */

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Candidate {
  id: string;
  jurisdiction: string;
  feedSource: string;
  title: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
  matchKeywords: unknown;
  detectedAt: string;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  dedupKey: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function keywordsArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export default function AtlasDiscoveriesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | "ALL"
  >("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async (status: typeof filter) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/atlas-discoveries?status=${status}&limit=200`,
      );
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
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
    async (id: string, action: "approve" | "reject") => {
      setActionLoading(id);
      try {
        const res = await fetch("/api/admin/atlas-discoveries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        if (res.ok) {
          setCandidates((prev) => prev.filter((c) => c.id !== id));
        }
      } catch {
        // silent
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const pendingCount = candidates.filter(
    (c) => c.reviewStatus === "PENDING",
  ).length;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">
            ATLAS Source Discoveries
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Entries from public gazette / UN feeds that match space-law keywords
            but aren&rsquo;t indexed yet. Approve to add to a data file, reject
            if noise.
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
      ) : candidates.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-[13px]">
            {filter === "PENDING"
              ? "Queue is clear. No pending discoveries."
              : "No discoveries match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => {
            const kws = keywordsArray(c.matchKeywords);
            return (
              <article
                key={c.id}
                className="rounded-xl bg-white border border-gray-100 p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400">
                        {c.jurisdiction}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                        <Rss size={9} strokeWidth={2} />
                        {c.feedSource}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        · detected {timeAgo(c.detectedAt)}
                      </span>
                      {c.publishedAt && (
                        <span className="text-[10px] text-gray-400">
                          · published{" "}
                          {new Date(c.publishedAt).toLocaleDateString("en-GB")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[14px] font-medium text-gray-900 leading-snug mb-1">
                      {c.title}
                    </h3>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline break-all"
                    >
                      {c.url}
                      <ExternalLink size={10} className="flex-shrink-0" />
                    </a>
                  </div>
                  <span
                    className={`text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${
                      c.reviewStatus === "PENDING"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : c.reviewStatus === "APPROVED"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    {c.reviewStatus}
                  </span>
                </div>

                {c.description && (
                  <p className="text-[12px] text-gray-600 leading-relaxed mb-3 line-clamp-3">
                    {c.description}
                  </p>
                )}

                {kws.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {kws.map((kw) => (
                      <span
                        key={kw}
                        className="text-[9px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {c.reviewNote && (
                  <div className="text-[11px] text-gray-500 italic mb-3 pl-3 border-l-2 border-gray-200">
                    Note: {c.reviewNote}
                  </div>
                )}

                {c.reviewStatus === "PENDING" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(c.id, "approve")}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      Approve for data file
                    </button>
                    <button
                      onClick={() => handleAction(c.id, "reject")}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
