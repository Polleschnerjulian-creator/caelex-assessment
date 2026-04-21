"use client";

/**
 * SnapshotListView — client renderer for the Profile Snapshots history.
 *
 * Receives a pre-loaded list from the server component. Handles:
 *   - Grouping by purpose (tabbed filter)
 *   - Per-row copy hash + open verify page
 *   - Empty states (feature off, no snapshots yet)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Hash,
} from "lucide-react";

export interface SnapshotRow {
  id: string;
  snapshotHash: string;
  issuerKeyId: string;
  frozenAt: string;
  frozenBy: string;
  purpose: string | null;
}

interface SnapshotListViewProps {
  enabled: boolean;
  snapshots: SnapshotRow[];
}

const PURPOSE_LABELS: Record<string, string> = {
  voluntary: "Voluntary",
  audit: "Audit",
  dd: "Due Diligence",
  nca: "NCA Submission",
};

const PURPOSE_COLORS: Record<string, string> = {
  voluntary:
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  audit: "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200",
  dd: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200",
  nca: "bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200",
};

export function SnapshotListView({
  enabled,
  snapshots,
}: SnapshotListViewProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return snapshots;
    return snapshots.filter((s) => (s.purpose ?? "voluntary") === filter);
  }, [snapshots, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: snapshots.length };
    for (const s of snapshots) {
      const p = s.purpose ?? "voluntary";
      c[p] = (c[p] ?? 0) + 1;
    }
    return c;
  }, [snapshots]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/dashboard/verity"
          className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <ArrowLeft className="w-3 h-3" /> Verity
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Profile Snapshots
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Signed, frozen records of your operator profile. Share a snapshot URL
          with a regulator or auditor — they can verify it offline, without a
          Caelex account.
        </p>
      </div>

      {!enabled ? (
        <EmptyFlagState />
      ) : snapshots.length === 0 ? (
        <EmptyListState />
      ) : (
        <>
          <FilterBar filter={filter} counts={counts} onChange={setFilter} />
          <ul className="space-y-2">
            {filtered.map((s) => (
              <SnapshotRow key={s.id} snapshot={s} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function FilterBar({
  filter,
  counts,
  onChange,
}: {
  filter: string;
  counts: Record<string, number>;
  onChange: (f: string) => void;
}) {
  const tabs: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "voluntary", label: PURPOSE_LABELS.voluntary },
    { key: "audit", label: PURPOSE_LABELS.audit },
    { key: "dd", label: PURPOSE_LABELS.dd },
    { key: "nca", label: PURPOSE_LABELS.nca },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--divider-color)]">
      {tabs.map((t) => {
        const count = counts[t.key] ?? 0;
        const active = filter === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              "px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px",
              active
                ? "border-emerald-500 text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
            ].join(" ")}
          >
            {t.label}
            {count > 0 && (
              <span className="ml-1.5 text-[10px] opacity-60 tabular-nums">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SnapshotRow({ snapshot }: { snapshot: SnapshotRow }) {
  const [copied, setCopied] = useState(false);
  const purposeKey = snapshot.purpose ?? "voluntary";

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.snapshotHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* silent */
    }
  };

  return (
    <li className="rounded-lg border border-[var(--divider-color)] bg-[var(--surface-soft)] p-4 hover:border-emerald-500/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left side: timestamp + purpose */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {new Date(snapshot.frozenAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span
              className={[
                "px-2 py-0.5 rounded-full text-[10px] font-medium",
                PURPOSE_COLORS[purposeKey] ?? PURPOSE_COLORS.voluntary,
              ].join(" ")}
            >
              {PURPOSE_LABELS[purposeKey] ?? purposeKey}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <Hash className="w-3 h-3 text-[var(--text-tertiary)]" />
            <code className="font-mono text-[11px] text-[var(--text-tertiary)] truncate">
              {snapshot.snapshotHash.slice(0, 32)}…
            </code>
            <button
              onClick={copyHash}
              aria-label="Copy snapshot hash"
              className="p-0.5 rounded hover:bg-[var(--fill-soft)]"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-[var(--text-tertiary)]" />
              )}
            </button>
          </div>

          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {snapshot.issuerKeyId}
            </span>
            <span className="font-mono">{snapshot.id}</span>
          </div>
        </div>

        {/* Right side: actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <a
            href={`/verity/profile-snapshot/${snapshot.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded border border-emerald-500/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          >
            Verify <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </li>
  );
}

function EmptyFlagState() {
  return (
    <div className="rounded-lg border border-[var(--divider-color)] bg-[var(--surface-soft)] p-8 text-center">
      <ShieldCheck className="w-8 h-8 text-[var(--text-tertiary)] mx-auto" />
      <h2 className="mt-3 text-sm font-medium text-[var(--text-primary)]">
        Provenance is not enabled for this environment
      </h2>
      <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md mx-auto">
        Set{" "}
        <code className="px-1 py-0.5 rounded bg-[var(--fill-soft)] text-[10px]">
          NEXT_PUBLIC_FEAT_PROVENANCE_V1=1
        </code>{" "}
        to allow signed profile snapshots.
      </p>
    </div>
  );
}

function EmptyListState() {
  return (
    <div className="rounded-lg border border-[var(--divider-color)] bg-[var(--surface-soft)] p-8 text-center">
      <ShieldCheck className="w-8 h-8 text-[var(--text-tertiary)] mx-auto" />
      <h2 className="mt-3 text-sm font-medium text-[var(--text-primary)]">
        No snapshots yet
      </h2>
      <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md mx-auto">
        Freeze your current profile state from the dashboard widget to create a
        cryptographically signed record you can share with regulators,
        investors, or auditors.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
