"use client";

/**
 * Sprint UF19 — Inline evidence drawer for the Article Tracker.
 *
 * Audit finding P1-2: an external auditor expanding an article on
 * /dashboard/tracker saw summary, operator-action, status buttons —
 * but NO attached evidence. They had to navigate to /dashboard/audit-
 * center → Evidence tab → manually search for the article ID. Three
 * surfaces, no cross-links, foot-gun.
 *
 * UF19 collapses that flow: a "View evidence (N)" button per article
 * opens an inline drawer showing the same evidence + documents that
 * the Audit Center surface lists, scoped to that specific article.
 *
 * # Why fetch on demand vs. eager
 *
 * The tracker page already runs hot (cycles through 119 EU Space Act
 * articles + 51 NIS2 + 50 cybersecurity etc — totals ~600 articles).
 * Eager-fetching evidence for every article would be hundreds of
 * round-trips. Lazy-fetch on first expand keeps the page light: only
 * articles the user actually inspects pay the cost.
 *
 * # Why a drawer (not a modal)
 *
 * Keeps context: the article summary stays visible while evidence
 * loads. Auditor can scan summary + evidence side-by-side without
 * losing place in the article list.
 *
 * # Document downloads
 *
 * Each ComplianceEvidenceDocument links to a Document row in the
 * vault. The existing /api/documents/[id]/download endpoint
 * resolves a signed R2 URL and redirects — that's the link target
 * for each "Download" button. No new infra.
 */

import * as React from "react";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface EvidenceDocument {
  id: string;
  document: {
    id: string;
    name: string;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
  };
}

interface EvidenceItem {
  id: string;
  title: string;
  description: string | null;
  evidenceType: string;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  documents: EvidenceDocument[];
  createdAt: string;
  updatedAt: string;
}

interface EvidenceDrawerProps {
  /** Tracker article identifier (e.g. "art-74"). */
  articleId: string;
  /** Regulation key the article belongs to (EU_SPACE_ACT, NIS2, ...). */
  regulationType: string;
}

/**
 * Lazy-fetch + render evidence for a single article. Renders nothing
 * until the user expands the trigger button.
 */
export function EvidenceDrawer({
  articleId,
  regulationType,
}: EvidenceDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [evidence, setEvidence] = React.useState<EvidenceItem[] | null>(null);
  const [count, setCount] = React.useState<number | null>(null);

  // Pre-fetch the count (cheap query) on mount so the trigger button
  // can show "View evidence (N)" without opening the drawer. If the
  // user has 600 articles this fires 600 times — but the endpoint
  // is paginated and we only need total. We could batch this server-
  // side later; for now it's acceptable since each query is light.
  //
  // Pragmatic compromise: we fetch the count ONLY once the user has
  // expanded the parent article (signal of intent). The tracker
  // controls expansion via its own toggle; the drawer mounts with
  // the article and fetches on first open click.
  const fetchEvidence = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("regulationType", regulationType);
      params.set("requirementId", articleId);
      const res = await fetch(
        `/api/audit-center/evidence?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`Evidence query failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        evidence?: EvidenceItem[];
        pagination?: { total?: number };
      };
      setEvidence(data.evidence ?? []);
      setCount(data.pagination?.total ?? data.evidence?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [articleId, regulationType]);

  function handleToggle() {
    if (!open && evidence === null && !loading) {
      // First open — fetch.
      fetchEvidence();
    }
    setOpen((v) => !v);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-1.5 text-[12px] font-medium text-emerald-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.08]"
      >
        <FileText className="h-3 w-3" strokeWidth={2} />
        {loading
          ? "Loading evidence…"
          : count === null
            ? "View evidence"
            : count === 0
              ? "No evidence attached"
              : `View evidence (${count})`}
      </button>

      {open ? (
        <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
              Fetching evidence for {articleId}…
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-2 text-[12px] text-rose-300">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" strokeWidth={2} />
                {error}
              </span>
              <button
                type="button"
                onClick={fetchEvidence}
                className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08]"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={2} />
                Retry
              </button>
            </div>
          ) : evidence === null || evidence.length === 0 ? (
            <p className="text-[12px] text-slate-500">
              No evidence attached for this article yet. Add evidence from Audit
              Center → Evidence tab.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {evidence.map((e) => (
                <EvidenceCard key={e.id} evidence={e} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: EvidenceItem }) {
  const status = evidence.status.toLowerCase();
  const tier =
    status === "accepted" || status === "approved"
      ? "emerald"
      : status === "rejected" || status === "expired"
        ? "rose"
        : status === "submitted" || status === "under_review"
          ? "amber"
          : "slate";

  const tierColor =
    tier === "emerald"
      ? "rgba(16, 185, 129, 0.85)"
      : tier === "amber"
        ? "rgba(251, 191, 36, 0.85)"
        : tier === "rose"
          ? "rgba(244, 63, 94, 0.85)"
          : "rgba(148, 163, 184, 0.7)";

  return (
    <li
      className="rounded-lg p-3"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-[12.5px] font-semibold text-slate-100">
          {evidence.title}
        </h4>
        <span
          className="text-[10.5px] font-semibold uppercase tracking-wide"
          style={{ color: tierColor }}
        >
          {status.replace(/_/g, " ")}
        </span>
      </div>

      {evidence.description ? (
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400 line-clamp-2">
          {evidence.description}
        </p>
      ) : null}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" strokeWidth={2} />
          updated {formatDate(evidence.updatedAt)}
        </span>
        {evidence.validUntil ? (
          <span>
            valid until {formatDate(evidence.validUntil)}
            {isExpired(evidence.validUntil) ? (
              <span className="ml-1 font-semibold text-rose-300">
                (expired)
              </span>
            ) : null}
          </span>
        ) : null}
        {evidence.reviewedAt ? (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
            reviewed {formatDate(evidence.reviewedAt)}
          </span>
        ) : null}
      </div>

      {evidence.documents.length > 0 ? (
        <div className="mt-2 space-y-1">
          {evidence.documents.map((doc) => (
            <a
              key={doc.id}
              href={`/api/documents/${doc.document.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md bg-white/[0.025] px-2 py-1.5 text-[11.5px] text-slate-300 transition hover:bg-white/[0.05] hover:text-slate-100"
            >
              <Download
                className="h-3 w-3 shrink-0 text-emerald-300"
                strokeWidth={2}
              />
              <span className="min-w-0 flex-1 truncate">
                {doc.document.name || doc.document.fileName || "Untitled"}
              </span>
              {doc.document.fileSize !== null ? (
                <span className="shrink-0 font-mono text-[10px] text-slate-500">
                  {formatBytes(doc.document.fileSize)}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[10.5px] italic text-slate-500">
          No files attached to this evidence record.
        </p>
      )}
    </li>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function isExpired(iso: string): boolean {
  try {
    return new Date(iso).getTime() < Date.now();
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
