"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/clauses — Clause Library CRUD (Bundle 33, S3).
 *
 * Manages the savable boilerplate clauses backing src/lib/atlas/
 * clause-library.ts. Marie can:
 *   - create a new clause (name + content + jurisdiction tag + tags)
 *   - edit an existing clause in place
 *   - delete a clause
 *   - filter the list by jurisdiction or free-form tag
 *   - copy clause content to clipboard for paste into a draft
 *
 * The drafting studio (/atlas/drafting) reads the same store and offers
 * an "Insert clause" dropdown on the auth-tile mission textarea so the
 * inverse direction (use a saved clause) is one click away.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PenSquare,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  Tag,
  Library,
  Search,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { SOURCE_JURISDICTION_CODES } from "@/data/legal-sources/meta";
import {
  getClauses,
  createClause,
  updateClause,
  deleteClause,
  type Clause,
} from "@/lib/atlas/clause-library";

interface DraftClause {
  name: string;
  content: string;
  jurisdiction: string;
  tags: string;
}

const EMPTY_DRAFT: DraftClause = {
  name: "",
  content: "",
  jurisdiction: "",
  tags: "",
};

function tagsFromString(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export default function ClauseLibraryPage() {
  const { language } = useLanguage();
  const isDe = language === "de";

  const [clauses, setClauses] = useState<Clause[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Editing state. `editingId === "new"` means create-mode. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftClause>(EMPTY_DRAFT);

  /* Filter controls. */
  const [search, setSearch] = useState("");
  const [filterJurisdiction, setFilterJurisdiction] = useState("");
  const [filterTag, setFilterTag] = useState("");

  /* Copy-feedback. */
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setClauses(getClauses());
    setHydrated(true);
  }, []);

  const refresh = () => setClauses(getClauses());

  // Baked, pre-sorted distinct source jurisdictions (meta generator —
  // perf pass F3; previously derived from the 3MB ALL_SOURCES barrel).
  const allJurisdictions = SOURCE_JURISDICTION_CODES;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of clauses) for (const t of c.tags) set.add(t);
    return Array.from(set).sort();
  }, [clauses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clauses.filter((c) => {
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.content.toLowerCase().includes(q)
      )
        return false;
      if (filterJurisdiction && c.jurisdiction !== filterJurisdiction)
        return false;
      if (filterTag && !c.tags.includes(filterTag)) return false;
      return true;
    });
  }, [clauses, search, filterJurisdiction, filterTag]);

  const startNew = () => {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
  };

  const startEdit = (c: Clause) => {
    setEditingId(c.id);
    setDraft({
      name: c.name,
      content: c.content,
      jurisdiction: c.jurisdiction,
      tags: c.tags.join(", "),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const saveDraft = () => {
    if (!draft.name.trim() || !draft.content.trim()) return;
    if (editingId === "new") {
      createClause({
        name: draft.name.trim(),
        content: draft.content.trim(),
        jurisdiction: draft.jurisdiction.trim(),
        tags: tagsFromString(draft.tags),
      });
    } else if (editingId) {
      updateClause(editingId, {
        name: draft.name.trim(),
        content: draft.content.trim(),
        jurisdiction: draft.jurisdiction.trim(),
        tags: tagsFromString(draft.tags),
      });
    }
    refresh();
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    deleteClause(id);
    refresh();
    if (editingId === id) cancelEdit();
  };

  const handleCopy = async (c: Clause) => {
    try {
      await navigator.clipboard.writeText(c.content);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((cur) => (cur === c.id ? null : cur)), 1500);
    } catch {
      /* clipboard API blocked — silent, user can select-and-copy manually. */
    }
  };

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
          <Library className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Klausel-Bibliothek" : "Clause library"}
          </h1>
          <span className="text-[11px] text-[var(--atlas-text-muted)] ml-2">
            ({clauses.length})
          </span>
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={editingId === "new"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-3 py-1.5 transition-colors"
        >
          <Plus size={12} strokeWidth={1.8} aria-hidden="true" />
          {isDe ? "Neue Klausel" : "New clause"}
        </button>
      </header>

      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {isDe
          ? "Speichere wiederverwendbare Standard-Klauseln (Haftungsbeschränkungen, NIS2-Vertraulichkeit, ITU-Hinweise) und füge sie mit einem Klick in jeden Entwurf ein. Live in dieser Browser-Session — Bundle 36 hebt die Bibliothek auf Mandanten-Ebene."
          : "Save reusable boilerplate clauses (liability caps, NIS2 confidentiality, ITU disclaimers) and pull them into any draft with one click. Lives in this browser session — bundle 36 will lift the library to per-org persistence."}
      </p>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap max-w-3xl">
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
              isDe ? "In Name & Inhalt suchen…" : "Search name & content…"
            }
            className="w-full pl-7 pr-2.5 py-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
          />
        </div>
        <select
          value={filterJurisdiction}
          onChange={(e) => setFilterJurisdiction(e.target.value)}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
        >
          <option value="">
            {isDe ? "Alle Jurisdiktionen" : "All jurisdictions"}
          </option>
          {allJurisdictions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
          >
            <option value="">{isDe ? "Alle Tags" : "All tags"}</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Edit/create form (renders at top when active) */}
      {editingId && (
        <section className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-500/5 p-4 max-w-3xl flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold text-[var(--atlas-text-primary)]">
            {editingId === "new"
              ? isDe
                ? "Neue Klausel erstellen"
                : "Create new clause"
              : isDe
                ? "Klausel bearbeiten"
                : "Edit clause"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Name" : "Name"}
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder={
                  isDe
                    ? "z. B. Standard Haftungsbeschränkung (BHO)"
                    : "e.g. Standard liability cap (BHO)"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Jurisdiktion (optional)" : "Jurisdiction (optional)"}
              </label>
              <select
                value={draft.jurisdiction}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, jurisdiction: e.target.value }))
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
              >
                <option value="">
                  {isDe ? "— Universell —" : "— Universal —"}
                </option>
                {allJurisdictions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Tags (komma-getrennt)" : "Tags (comma-separated)"}
              </label>
              <input
                type="text"
                value={draft.tags}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tags: e.target.value }))
                }
                placeholder="nis2, liability, boilerplate"
                className="w-full rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Inhalt" : "Content"}
              </label>
              <textarea
                value={draft.content}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, content: e.target.value }))
                }
                rows={8}
                placeholder={
                  isDe
                    ? "Den Klausel-Text hier einfügen…"
                    : "Paste the clause text here…"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-y font-mono placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 text-[11.5px] px-3 py-1.5 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
            >
              <X size={11} strokeWidth={1.8} aria-hidden="true" />
              {isDe ? "Abbrechen" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft.name.trim() || !draft.content.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11.5px] font-medium px-3 py-1.5 transition-colors"
            >
              <Save size={11} strokeWidth={1.8} aria-hidden="true" />
              {isDe ? "Speichern" : "Save"}
            </button>
          </div>
        </section>
      )}

      {/* Empty state */}
      {hydrated && clauses.length === 0 && !editingId && (
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto mt-12 gap-3">
          <Library
            size={36}
            strokeWidth={1.2}
            aria-hidden="true"
            className="text-[var(--atlas-text-faint)]"
          />
          <p className="text-[14px] font-medium text-[var(--atlas-text-primary)]">
            {isDe ? "Noch keine Klauseln" : "No clauses yet"}
          </p>
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
            {isDe
              ? "Speichere die Boilerplate, die du in 80 % aller Anträge verwendest — Haftungsbeschränkungen, NIS2-Vertraulichkeit, ITU-Disclaimer."
              : "Save the boilerplate you reuse in 80% of every filing — liability caps, NIS2 confidentiality, ITU disclaimers."}
          </p>
          <button
            type="button"
            onClick={startNew}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2 transition-colors"
          >
            <Plus size={12} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Erste Klausel" : "First clause"}
          </button>
        </div>
      )}

      {/* Clauses list */}
      <ul className="flex flex-col gap-2 max-w-3xl">
        {filtered.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className="text-[13px] font-semibold text-[var(--atlas-text-primary)] truncate">
                  {c.name}
                </h3>
                {c.jurisdiction ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--atlas-text-muted)] bg-[var(--atlas-bg-surface-muted)] px-1.5 py-0.5 rounded">
                    {c.jurisdiction}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--atlas-text-faint)]">
                    <Globe size={9} strokeWidth={1.8} aria-hidden="true" />
                    {isDe ? "Universell" : "Universal"}
                  </span>
                )}
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--atlas-text-faint)] bg-[var(--atlas-bg-surface-muted)] px-1.5 py-0.5 rounded"
                  >
                    <Tag size={9} strokeWidth={1.8} aria-hidden="true" />
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(c)}
                  title={isDe ? "In Zwischenablage" : "Copy to clipboard"}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                >
                  {copiedId === c.id ? (
                    <>
                      <Check
                        size={10}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="text-emerald-600"
                      />
                      {isDe ? "Kopiert" : "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy size={10} strokeWidth={1.8} aria-hidden="true" />
                      {isDe ? "Kopieren" : "Copy"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  disabled={editingId === c.id}
                  title={isDe ? "Bearbeiten" : "Edit"}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors disabled:opacity-50"
                >
                  <Edit3 size={10} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Bearbeiten" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  title={isDe ? "Löschen" : "Delete"}
                  className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--atlas-text-faint)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            </div>
            <pre className="text-[11.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {c.content}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
