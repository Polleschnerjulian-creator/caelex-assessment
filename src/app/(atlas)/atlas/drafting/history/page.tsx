"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/history — "My Drafts" library view (Bundle 32, S2).
 *
 * The drafting studio (/atlas/drafting) auto-archives every dispatched
 * prompt into the localStorage `draftLibrary` ring. Until this page,
 * the data sat there unread. This page surfaces it so Marie can:
 *
 *   - find a draft she dispatched two weeks ago (search)
 *   - restore it without retyping (one-click reopen in AI Mode)
 *   - tweak the prompt and regenerate (edit-in-place + dispatch)
 *   - clean up obsolete entries (delete / clear-all)
 *
 * Storage is shared with the main studio via getDraftLibrary /
 * deleteDraftLibraryEntry / clearDraftLibrary in
 * src/lib/atlas/drafting-history.ts. No backend yet — bundle 36 will
 * upgrade the library to per-org persistence.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PenSquare,
  ArrowLeft,
  Search,
  Trash2,
  Sparkles,
  Edit3,
  Lock,
  X,
  Languages,
  FileText,
  BookOpen,
  Columns,
  Inbox,
  AlertCircle,
  Briefcase,
  Share2,
  GitCompare,
  Layers,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import {
  getDraftLibrary,
  deleteDraftLibraryEntry,
  clearDraftLibrary,
  addPromptVersion,
  type DraftLibraryEntry,
  type DraftKind,
} from "@/lib/atlas/drafting-history";
import { createReviewSession } from "@/lib/atlas/review-sessions";
import { diffLines, diffStats } from "@/lib/atlas/text-diff";

const KIND_META: Record<
  DraftKind,
  { de: string; en: string; iconColor: string; bg: string }
> = {
  auth: {
    de: "Genehmigung",
    en: "Authorization",
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  brief: {
    de: "Briefing",
    en: "Brief",
    iconColor: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200",
  },
  compare: {
    de: "Vergleich",
    en: "Comparison",
    iconColor: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-200",
  },
  nda: {
    de: "NDA",
    en: "NDA",
    iconColor: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  cover: {
    de: "Anschreiben",
    en: "Cover letter",
    iconColor: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  },
};

function kindIcon(kind: DraftKind) {
  switch (kind) {
    case "auth":
      return <FileText size={12} strokeWidth={1.8} />;
    case "brief":
      return <BookOpen size={12} strokeWidth={1.8} />;
    case "compare":
      return <Columns size={12} strokeWidth={1.8} />;
    case "nda":
    case "cover":
      return <FileText size={12} strokeWidth={1.8} />;
  }
}

/* Format ts as a relative time-ago — short, calendar-aware. */
function fmtRelative(ts: number, isDe: boolean): string {
  const now = Date.now();
  const diffMin = Math.floor((now - ts) / 60_000);
  if (diffMin < 1) return isDe ? "gerade eben" : "just now";
  if (diffMin < 60) return isDe ? `vor ${diffMin} Min.` : `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return isDe ? `vor ${diffH} Std.` : `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return isDe ? `vor ${diffD} Tag(en)` : `${diffD}d ago`;
  return new Date(ts).toLocaleDateString(isDe ? "de-DE" : "en-GB");
}

const ALL_KINDS: DraftKind[] = ["auth", "brief", "compare", "nda", "cover"];

export default function DraftingHistoryPage() {
  const { language } = useLanguage();
  const isDe = language === "de";
  const router = useRouter();

  /* Library state. Hydrate after mount to dodge SSR localStorage. */
  const [entries, setEntries] = useState<DraftLibraryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Filter/search controls. */
  const [kindFilter, setKindFilter] = useState<Set<DraftKind>>(
    () => new Set(ALL_KINDS),
  );
  const [search, setSearch] = useState("");
  /* Bundle 36: filter by mandate. "" = all mandates. */
  const [mandateFilter, setMandateFilter] = useState<string>("");
  /* Bundle 41: filter by parallel-set id (passed via ?set= URL param
     by the parallel-draft page). */
  const searchParamsHook = useSearchParams();
  const setFilter = searchParamsHook?.get("set") ?? "";

  /* Per-entry edit-mode (only one open at a time keeps the layout tame). */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  /* Confirm-clear modal. */
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setEntries(getDraftLibrary());
    setHydrated(true);
  }, []);

  const refresh = () => setEntries(getDraftLibrary());

  const toggleKind = (k: DraftKind) => {
    const next = new Set(kindFilter);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setKindFilter(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => kindFilter.has(e.kind))
      .filter((e) => {
        if (!mandateFilter) return true;
        if (mandateFilter === "__none__") return !e.mandateId;
        return e.mandateId === mandateFilter;
      })
      .filter((e) => (setFilter ? e.parallelSetId === setFilter : true))
      .filter((e) =>
        q
          ? e.title.toLowerCase().includes(q) ||
            e.prompt.toLowerCase().includes(q)
          : true,
      );
  }, [entries, kindFilter, search, mandateFilter, setFilter]);

  /* Aggregate distinct mandates from the entries — derived rather than
     pulled from the mandate-store directly so deleted mandates with
     surviving library entries still surface as a filter option. */
  const knownMandates = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      if (e.mandateId && e.mandateName) seen.set(e.mandateId, e.mandateName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [entries]);

  const handleRestore = (entry: DraftLibraryEntry) => {
    /* "Restore" = re-fire the exact prompt that was dispatched. */
    openAIMode({ prompt: entry.prompt });
  };

  /* Bundle 38: spawn a partner-review session and navigate to it. */
  const handleShareForReview = (entry: DraftLibraryEntry) => {
    const session = createReviewSession({
      draftId: entry.id,
      draftTitle: entry.title,
      draftPrompt: entry.prompt,
    });
    router.push(`/atlas/drafting/review/${session.id}`);
  };

  const handleStartEdit = (entry: DraftLibraryEntry) => {
    setEditingId(entry.id);
    setEditPrompt(entry.prompt);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrompt("");
  };

  const handleRegenerateEdited = () => {
    if (!editPrompt.trim() || !editingId) return;
    /* Bundle 40: snapshot the new prompt as a version on the existing
       entry BEFORE dispatching, so the version-history reflects the
       full edit chain (rather than spawning a brand-new entry). */
    addPromptVersion(editingId, editPrompt.trim(), "edit-regenerate");
    refresh();
    openAIMode({ prompt: editPrompt.trim() });
    handleCancelEdit();
  };

  /* Bundle 40: per-entry version-history toggle. Tracks the entry id
     whose history is currently expanded (or null if none). */
  const [versionsOpenFor, setVersionsOpenFor] = useState<string | null>(null);

  /* A-H10: per-entry body-text toggle. Tracks the entry id whose
     generated body is currently expanded (or null if none). */
  const [bodyOpenFor, setBodyOpenFor] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteDraftLibraryEntry(id);
    refresh();
    if (editingId === id) handleCancelEdit();
  };

  const handleClearAll = () => {
    clearDraftLibrary();
    refresh();
    setConfirmClear(false);
  };

  const totalKindCounts = useMemo(() => {
    const counts: Record<DraftKind, number> = {
      auth: 0,
      brief: 0,
      compare: 0,
      nda: 0,
      cover: 0,
    };
    for (const e of entries) counts[e.kind]++;
    return counts;
  }, [entries]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/atlas/drafting"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Drafting Studio" : "Drafting Studio"}
          </Link>
          <span className="text-[var(--atlas-text-faint)]">·</span>
          <PenSquare className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Meine Entwürfe" : "My Drafts"}
          </h1>
          <span className="text-[11px] text-[var(--atlas-text-muted)] ml-2">
            ({entries.length}
            {entries.length === 50 ? "+" : ""})
          </span>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Alle löschen" : "Clear all"}
          </button>
        )}
      </header>

      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {isDe
          ? "Jeder Entwurf, den du im Drafting Studio dispatcht, wird hier automatisch archiviert (max. 50, neueste zuerst). Wiederherstellen, anpassen oder löschen — alles in einem Klick."
          : "Every draft you dispatch from the Drafting Studio is auto-archived here (max 50, newest first). Restore, tweak, or delete — one click each."}
      </p>

      {/* Filter & search row */}
      <div className="flex items-center gap-3 flex-wrap max-w-3xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={11}
            strokeWidth={1.8}
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--atlas-text-faint)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isDe ? "In Titel & Prompt suchen…" : "Search title & prompt…"
            }
            className="w-full pl-7 pr-2.5 py-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
          />
        </div>
        <div
          role="group"
          aria-label={isDe ? "Nach Typ filtern" : "Filter by kind"}
          className="flex items-center gap-1 flex-wrap"
        >
          {ALL_KINDS.map((k) => {
            const meta = KIND_META[k];
            const active = kindFilter.has(k);
            const count = totalKindCounts[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
                  active
                    ? `${meta.bg} border-current`
                    : "border-[var(--atlas-border)] text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-muted)]"
                }`}
              >
                {kindIcon(k)}
                {isDe ? meta.de : meta.en}
                {count > 0 && (
                  <span className="text-[10px] opacity-70">· {count}</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Bundle 36: mandate filter. Surfaces only when there's at
            least one library entry tagged with a mandate id. */}
        {knownMandates.length > 0 && (
          <select
            value={mandateFilter}
            onChange={(e) => setMandateFilter(e.target.value)}
            aria-label={isDe ? "Nach Mandant filtern" : "Filter by mandate"}
            className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
          >
            <option value="">{isDe ? "Alle Mandate" : "All mandates"}</option>
            {knownMandates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="__none__">
              {isDe ? "(Ohne Mandant)" : "(Untagged)"}
            </option>
          </select>
        )}
      </div>

      {/* Bundle 41: parallel-set filter banner. Surfaces when navigated
          here from the parallel-draft page. */}
      {setFilter && (
        <div className="inline-flex items-center gap-2 max-w-3xl rounded-md border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-[11.5px] text-emerald-800 dark:text-emerald-200">
          <Layers size={11} strokeWidth={1.8} aria-hidden="true" />
          {isDe ? "Set-Filter aktiv:" : "Set filter active:"}{" "}
          <span className="font-mono">{setFilter.slice(-8)}</span>
          <Link
            href="/atlas/drafting/history"
            className="ml-auto text-[10.5px] hover:underline"
          >
            {isDe ? "Filter entfernen" : "Clear"}
          </Link>
        </div>
      )}

      {/* Empty states */}
      {hydrated && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto mt-12 gap-3">
          <Inbox
            size={36}
            strokeWidth={1.2}
            aria-hidden="true"
            className="text-[var(--atlas-text-faint)]"
          />
          <p className="text-[14px] font-medium text-[var(--atlas-text-primary)]">
            {isDe ? "Noch keine Entwürfe" : "No drafts yet"}
          </p>
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
            {isDe
              ? "Dispatch deinen ersten Entwurf im Drafting Studio — er erscheint hier automatisch."
              : "Dispatch your first draft from the Drafting Studio — it'll show up here automatically."}
          </p>
          <Link
            href="/atlas/drafting"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2 transition-colors"
          >
            <Sparkles size={12} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Zum Drafting Studio" : "Open Drafting Studio"}
          </Link>
        </div>
      )}

      {hydrated && entries.length > 0 && filtered.length === 0 && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--atlas-text-muted)] italic max-w-3xl">
          <AlertCircle size={12} strokeWidth={1.8} aria-hidden="true" />
          {isDe
            ? "Keine Entwürfe entsprechen den aktuellen Filtern."
            : "No drafts match the current filters."}
        </div>
      )}

      {/* Entries list */}
      <ul className="flex flex-col gap-2 max-w-3xl">
        {filtered.map((entry) => {
          const meta = KIND_META[entry.kind];
          const isEditing = editingId === entry.id;
          return (
            <li
              key={entry.id}
              className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.bg}`}
                    >
                      {kindIcon(entry.kind)}
                      {isDe ? meta.de : meta.en}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--atlas-text-faint)]">
                      <Languages
                        size={9}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      {entry.outputLocale.toUpperCase()}
                    </span>
                    {entry.privileged && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <Lock size={9} strokeWidth={1.8} aria-hidden="true" />
                        {isDe ? "Privilegiert" : "Privileged"}
                      </span>
                    )}
                    {/* Bundle 36: mandate-name badge surfaces which
                        client this draft was dispatched against. */}
                    {entry.mandateName && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <Briefcase
                          size={9}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {entry.mandateName}
                      </span>
                    )}
                    {/* Bundle 41: parallel-set chip + jurisdiction badge.
                        Click → filter the list to that set. */}
                    {entry.parallelSetId && (
                      <Link
                        href={`/atlas/drafting/history?set=${entry.parallelSetId}`}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                        title={
                          isDe
                            ? "Set in Filter anzeigen"
                            : "Show this set in filter"
                        }
                      >
                        <Layers size={9} strokeWidth={1.8} aria-hidden="true" />
                        {isDe ? "Set" : "Set"}
                        {entry.jurisdiction && (
                          <span className="font-mono">
                            · {entry.jurisdiction}
                          </span>
                        )}
                      </Link>
                    )}
                    <span className="text-[10.5px] text-[var(--atlas-text-faint)]">
                      {fmtRelative(entry.ts, isDe)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRestore(entry)}
                      title={isDe ? "Erneut dispatchen" : "Restore & dispatch"}
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] transition-colors"
                    >
                      <Sparkles
                        size={10}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      {isDe ? "Wiederholen" : "Restore"}
                    </button>
                    {/* A-H10: show generated body toggle. Only renders
                        when the entry has a persisted body. */}
                    {entry.body && (
                      <button
                        type="button"
                        onClick={() =>
                          setBodyOpenFor((cur) =>
                            cur === entry.id ? null : entry.id,
                          )
                        }
                        title={
                          isDe
                            ? "Generierten Volltext ein-/ausblenden"
                            : "Show / hide generated body"
                        }
                        className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                      >
                        <FileText
                          size={10}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {isDe ? "Volltext" : "Body"}
                      </button>
                    )}
                    {/* Bundle 38: share-for-review action. */}
                    <button
                      type="button"
                      onClick={() => handleShareForReview(entry)}
                      title={
                        isDe
                          ? "Review-Session starten und teilen"
                          : "Spawn a review session and share"
                      }
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                    >
                      <Share2 size={10} strokeWidth={1.8} aria-hidden="true" />
                      {isDe ? "Review" : "Review"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        isEditing ? handleCancelEdit() : handleStartEdit(entry)
                      }
                      title={isDe ? "Anpassen & neu" : "Edit & regenerate"}
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                    >
                      <Edit3 size={10} strokeWidth={1.8} aria-hidden="true" />
                      {isEditing
                        ? isDe
                          ? "Abbrechen"
                          : "Cancel"
                        : isDe
                          ? "Anpassen"
                          : "Edit"}
                    </button>
                    {/* Bundle 40: versions toggle. Only renders when
                        the entry has more than one version (i.e. the
                        user has done at least one edit-regenerate). */}
                    {(entry.versions?.length ?? 0) > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVersionsOpenFor((cur) =>
                            cur === entry.id ? null : entry.id,
                          )
                        }
                        title={
                          isDe
                            ? "Versions-Verlauf ein-/ausblenden"
                            : "Toggle version history"
                        }
                        className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                      >
                        <GitCompare
                          size={10}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        v{entry.versions?.length}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      title={isDe ? "Löschen" : "Delete"}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--atlas-text-faint)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="text-[13px] font-medium text-[var(--atlas-text-primary)] truncate">
                  {entry.title}
                </p>

                {/* Bundle 40: version-history with diffs. Renders only
                    when toggled open via the "v{n}" button above. */}
                {versionsOpenFor === entry.id &&
                  entry.versions &&
                  entry.versions.length > 1 && (
                    <div className="flex flex-col gap-2 rounded border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)] p-2">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
                        {isDe ? "Versions-Verlauf" : "Version history"}
                      </p>
                      {entry.versions.map((v, idx) => {
                        const prev = idx > 0 ? entry.versions![idx - 1] : null;
                        const diff = prev
                          ? diffLines(prev.prompt, v.prompt)
                          : [];
                        const stats = prev
                          ? diffStats(diff)
                          : { added: 0, removed: 0, context: 0 };
                        const isLatest = idx === entry.versions!.length - 1;
                        return (
                          <details
                            key={v.ts}
                            open={isLatest}
                            className="rounded border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)]"
                          >
                            <summary className="cursor-pointer px-2 py-1 text-[10.5px] flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[var(--atlas-text-primary)]">
                                v{idx + 1}
                              </span>
                              <span className="text-[var(--atlas-text-faint)]">
                                {fmtRelative(v.ts, isDe)}
                              </span>
                              <span className="text-[9.5px] uppercase tracking-wider text-[var(--atlas-text-muted)]">
                                {v.source === "initial"
                                  ? isDe
                                    ? "Original"
                                    : "Initial"
                                  : isDe
                                    ? "Bearbeitet"
                                    : "Edited"}
                              </span>
                              {prev && (
                                <span className="ml-auto inline-flex items-center gap-1 text-[9.5px] font-mono">
                                  <span className="text-emerald-700 dark:text-emerald-400">
                                    +{stats.added}
                                  </span>
                                  <span className="text-red-700 dark:text-red-400">
                                    -{stats.removed}
                                  </span>
                                </span>
                              )}
                            </summary>
                            <div className="p-2 border-t border-[var(--atlas-border-subtle)]">
                              {prev ? (
                                <pre className="text-[10.5px] font-mono whitespace-pre-wrap leading-snug max-h-48 overflow-y-auto">
                                  {diff.map((d, di) => (
                                    <span
                                      key={di}
                                      className={
                                        d.kind === "added"
                                          ? "block bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-100"
                                          : d.kind === "removed"
                                            ? "block bg-red-100 dark:bg-red-500/20 text-red-900 dark:text-red-100"
                                            : "block text-[var(--atlas-text-secondary)]"
                                      }
                                    >
                                      {d.kind === "added"
                                        ? "+ "
                                        : d.kind === "removed"
                                          ? "- "
                                          : "  "}
                                      {d.text}
                                    </span>
                                  ))}
                                </pre>
                              ) : (
                                <pre className="text-[10.5px] font-mono whitespace-pre-wrap leading-snug max-h-48 overflow-y-auto text-[var(--atlas-text-secondary)]">
                                  {v.prompt}
                                </pre>
                              )}
                              <div className="mt-1.5 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAIMode({ prompt: v.prompt })
                                  }
                                  className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
                                >
                                  <Sparkles
                                    size={10}
                                    strokeWidth={1.8}
                                    aria-hidden="true"
                                  />
                                  {isDe
                                    ? "Diese Version dispatchen"
                                    : "Dispatch this version"}
                                </button>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}

                {/* A-H10: generated body panel. Renders when the user
                    toggles the "Volltext / Body" button. Entries without
                    a body (legacy) never show this section. */}
                {bodyOpenFor === entry.id && entry.body && (
                  <div className="flex flex-col gap-1.5 rounded border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
                        {isDe ? "Generierter Volltext" : "Generated body"}
                      </p>
                      <button
                        type="button"
                        onClick={() => openAIMode({ prompt: entry.prompt })}
                        className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
                        title={
                          isDe
                            ? "Prompt erneut dispatchen und neuen Volltext generieren"
                            : "Re-dispatch prompt to regenerate"
                        }
                      >
                        <Sparkles
                          size={10}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {isDe ? "Neu generieren" : "Regenerate"}
                      </button>
                    </div>
                    <pre className="text-[10.5px] text-[var(--atlas-text-secondary)] whitespace-pre-wrap font-mono max-h-80 overflow-y-auto leading-snug">
                      {entry.body}
                    </pre>
                  </div>
                )}

                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={6}
                      className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] outline-none resize-y font-mono"
                    />
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleRegenerateEdited}
                        disabled={!editPrompt.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11.5px] font-medium px-3 py-1.5 transition-colors"
                      >
                        <Sparkles
                          size={11}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {isDe ? "Neu dispatchen" : "Regenerate"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                    {entry.prompt}
                  </pre>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Confirm-clear modal */}
      {confirmClear && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-xl max-w-sm w-full p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertCircle
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                className="text-red-600 dark:text-red-400"
              />
              <h2 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
                {isDe ? "Alle Entwürfe löschen?" : "Clear all drafts?"}
              </h2>
            </div>
            <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
              {isDe
                ? `Du löschst ${entries.length} Entwürfe aus dieser Browser-Session. Aktion ist nicht rückgängig zu machen.`
                : `You're about to delete ${entries.length} drafts from this browser session. This cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
              >
                <X size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Abbrechen" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Alle löschen" : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
