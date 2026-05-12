"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate detail view (UI refresh, theme-aware).
 *
 * Layout (Claude-Projects-style):
 *   ┌─ Header (name, client, status, jurisdiction badges) ──────────┐
 *   ├─ Inline new-chat composer (mandate-scoped) ───────────────────┤
 *   ├─ 2-col grid:                                                  │
 *   │   ◇ Custom Instructions editor                                │
 *   │   ◇ Members list + add form                                   │
 *   ├─ Chats in this mandate (full-width list)                      │
 *   └─ Files (R2-backed upload + extracted-text indexing)            │
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Users,
  MessageSquare,
  FileText,
  Archive,
  Loader2,
} from "lucide-react";
import type { MandateDetail } from "./mandate-types";
import { MandateInstructionsEditor } from "./MandateInstructionsEditor";
import { MandateMembersList } from "./MandateMembersList";
import { MandateChatsList } from "./MandateChatsList";
import { MandateNewChatComposer } from "./MandateNewChatComposer";
import { MandateFileUpload } from "./MandateFileUpload";
import { MandateFilesList } from "./MandateFilesList";
import { MandateDeadlines } from "./MandateDeadlines";
import { MandateTimeEntries } from "./MandateTimeEntries";

interface Props {
  mandateId: string;
}

export function MandateDetailView({ mandateId }: Props) {
  const router = useRouter();
  const [mandate, setMandate] = useState<MandateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  /* Bumped after each upload so MandateFilesList refetches.
     Independent from the mandate-detail reload so we don't re-render
     the whole page just because a file landed. */
  const [filesRefreshKey, setFilesRefreshKey] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) setError("Mandat nicht gefunden");
        else setError(`HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { mandate: MandateDetail };
      setMandate(data.mandate);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleArchive = async () => {
    if (
      !confirm(
        "Mandat archivieren? Es bleibt mit allen Chats erhalten, verschwindet aber aus der Sidebar.",
      )
    )
      return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
        router.push("/atlas");
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Archivieren fehlgeschlagen");
      }
    } finally {
      setArchiving(false);
    }
  };

  if (loading && !mandate) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 size={14} className="mr-2 animate-spin" /> Lädt Mandat…
      </div>
    );
  }

  if (error && !mandate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-red-500 dark:text-red-400">
        <span>{error}</span>
        <Link
          href="/atlas"
          className="text-xs text-slate-500 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Zurück zu Atlas
        </Link>
      </div>
    );
  }

  if (!mandate) return null;

  const isArchived = mandate.status === "archived";
  const isClosed = mandate.status === "closed";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link
              href="/atlas"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft size={12} /> Zurück zu Atlas
            </Link>
            {!isArchived && !isClosed && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
              >
                <Archive size={11} />
                {archiving ? "Archiviere…" : "Archivieren"}
              </button>
            )}
          </div>
          <div className="flex items-start gap-3">
            <Briefcase
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {mandate.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                {mandate.clientName && (
                  <Pill label="Klient" value={mandate.clientName} />
                )}
                {mandate.jurisdiction && (
                  <Pill label="Jurisdiktion" value={mandate.jurisdiction} />
                )}
                {mandate.operatorType && (
                  <Pill label="Operator" value={mandate.operatorType} />
                )}
                {mandate.primaryAuthority && (
                  <Pill label="Behörde" value={mandate.primaryAuthority} />
                )}
                <StatusPill status={mandate.status} />
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span>
              Owner: {mandate.owner.name ?? mandate.owner.email ?? "—"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users size={10} /> {mandate._count.members} Mitglied
              {mandate._count.members !== 1 ? "er" : ""}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={10} /> {mandate._count.chats} Chat
              {mandate._count.chats !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <FileText size={10} /> {mandate._count.files} Datei
              {mandate._count.files !== 1 ? "en" : ""}
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Inline new-chat composer */}
          <section>
            <MandateNewChatComposer
              mandateId={mandate.id}
              mandateName={mandate.name}
              disabled={isArchived || isClosed}
            />
          </section>

          {/* 2-col: Instructions + Members */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <SectionTitle>Custom Instructions</SectionTitle>
              <MandateInstructionsEditor
                mandateId={mandate.id}
                initialValue={mandate.customInstructions ?? ""}
                onSaved={(v) =>
                  setMandate((m) => (m ? { ...m, customInstructions: v } : m))
                }
              />
            </section>

            <section>
              <SectionTitle>Mitglieder</SectionTitle>
              <MandateMembersList
                mandateId={mandate.id}
                members={mandate.members}
                ownerUserId={mandate.ownerUserId}
                onChanged={() => void reload()}
              />
            </section>
          </div>

          {/* Deadlines + Stundenerfassung side-by-side on desktop —
              two daily-driver tools for the lawyer. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <SectionTitle>Fristen</SectionTitle>
              <MandateDeadlines
                mandateId={mandate.id}
                disabled={isArchived || isClosed}
              />
            </section>
            <section>
              <SectionTitle>Stundenerfassung</SectionTitle>
              <MandateTimeEntries
                mandateId={mandate.id}
                disabled={isArchived || isClosed}
              />
            </section>
          </div>

          {/* Chats list (full-width) */}
          <section>
            <SectionTitle>Chats in diesem Mandat</SectionTitle>
            <MandateChatsList chats={mandate.chats} mandateId={mandate.id} />
          </section>

          {/* Files (R2-backed) */}
          <section>
            <SectionTitle>Dateien</SectionTitle>
            <div className="space-y-3">
              <MandateFileUpload
                mandateId={mandate.id}
                onChanged={() => setFilesRefreshKey((n) => n + 1)}
                disabled={isArchived || isClosed}
              />
              <MandateFilesList
                mandateId={mandate.id}
                refreshKey={filesRefreshKey}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Astra kann Dateien direkt im Chat referenzieren — frag z.B. „Was
              steht in der Mission-Spec zu Frequenzen?". TXT/MD/HTML/CSV, PDF,
              DOCX und XLSX werden automatisch text-extrahiert.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-900">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-800 dark:text-slate-200">{value}</span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "archived") {
    return (
      <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Archiviert
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400">
        Geschlossen
      </span>
    );
  }
  return (
    <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
      Aktiv
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </h2>
  );
}
