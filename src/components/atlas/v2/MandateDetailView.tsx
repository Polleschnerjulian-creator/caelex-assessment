"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate detail view (M1 layout revamp, theme-aware).
 *
 * Single-page-scroll layout (no tabs) with clearly delimited sections,
 * top-down in the order the lawyer needs them:
 *
 *   ┌─ Header (name, client, status, jurisdiction badges) ──────────┐
 *   ├─ Briefing-Slot (M1 placeholder — M3 replaces with auto-briefing)
 *   ├─ Composer: „Neuer Chat in diesem Mandat" ───────────────────┤
 *   ├─ Chats in this mandate ────────────────────────────────────┤
 *   ├─ Vault (files, R2-backed upload + extracted-text indexing) ─┤
 *   ├─ Deadlines (Fristen) ──────────────────────────────────────┤
 *   ├─ Stundenerfassung (preserved daily-driver tool) ───────────┤
 *   ├─ Mitglieder ──────────────────────────────────────────────┤
 *   └─ Custom Instructions (collapsed by default) ──────────────┘
 *
 * Each section uses `<section id="…" class="mb-8 scroll-mt-20">` so anchor-
 * jumps (e.g. `#chats`, `#vault`) scroll the section heading clear of the
 * 4-row sticky page header (M36 — `scroll-mt-6` was too small and section
 * titles disappeared under the header on jump).
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
  ChevronDown,
  ChevronRight,
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
import { MandateBackgroundAgentSection } from "./MandateBackgroundAgentSection";

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
  /* Custom Instructions is collapsed by default (M1 layout): power-feature,
     not something the lawyer touches every session. */
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    /* AUDIT-FIX 2026-05-17: clear stale error BEFORE the fetch so a prior
       failure doesn't briefly re-render while the retry is in flight.
       Previously setError(null) only fired in the success branch, leaving
       a stale message visible on retry. */
    setError(null);
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
        <Loader2
          size={14}
          className="mr-2 animate-spin motion-reduce:animate-none"
        />{" "}
        Lädt Mandat…
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

      {/* Scrollable content — single-page-scroll, NO tabs */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {/* Briefing-Slot — M1 placeholder, wird in M3 mit echtem Auto-Briefing ersetzt */}
          <section
            id="briefing"
            className="mb-6 scroll-mt-20 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">
                🧠
              </span>
              <div>
                <h3 className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  Briefing
                </h3>
                <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                  Auto-Briefing („Wo stehen wir?") kommt in M3. Solange: öffne
                  einen der Chats unten oder lege neue Files / Deadlines an.
                </p>
              </div>
            </div>
          </section>

          {/* Composer — „Neuer Chat in diesem Mandat" */}
          <section id="new-chat" className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">
              Neuer Chat in diesem Mandat
            </h2>
            <MandateNewChatComposer
              mandateId={mandate.id}
              mandateName={mandate.name}
              disabled={isArchived || isClosed}
            />
          </section>

          {/* Chats */}
          <section id="chats" className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">
              Chats ({mandate._count.chats})
            </h2>
            <MandateChatsList chats={mandate.chats} mandateId={mandate.id} />
          </section>

          {/* Vault — files (R2-backed upload + extracted-text indexing) */}
          <section id="vault" className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">
              Vault ({mandate._count.files})
            </h2>
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

          {/* Deadlines (Fristen) */}
          <section id="deadlines" className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">
              Deadlines
            </h2>
            <MandateDeadlines
              mandateId={mandate.id}
              disabled={isArchived || isClosed}
            />
          </section>

          <MandateBackgroundAgentSection mandateId={mandate.id} />

          {/* Stundenerfassung (preserved — second daily-driver tool for the lawyer) */}
          <section id="time-entries" className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">
              Stundenerfassung
            </h2>
            <MandateTimeEntries
              mandateId={mandate.id}
              disabled={isArchived || isClosed}
            />
          </section>

          {/* Members */}
          <section id="members" className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">
              Mitglieder ({mandate._count.members})
            </h2>
            <MandateMembersList
              mandateId={mandate.id}
              members={mandate.members}
              ownerUserId={mandate.ownerUserId}
              onChanged={() => void reload()}
            />
          </section>

          {/* Custom Instructions — collapsed by default */}
          <section id="custom-instructions" className="mb-8 scroll-mt-20">
            <button
              type="button"
              onClick={() => setInstructionsOpen((v) => !v)}
              aria-expanded={instructionsOpen}
              aria-controls="custom-instructions-body"
              className="mb-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            >
              {instructionsOpen ? (
                <ChevronDown size={14} className="shrink-0" />
              ) : (
                <ChevronRight size={14} className="shrink-0" />
              )}
              <h2 className="inline">Custom Instructions</h2>
            </button>
            {instructionsOpen && (
              <div id="custom-instructions-body">
                <MandateInstructionsEditor
                  mandateId={mandate.id}
                  initialValue={mandate.customInstructions ?? ""}
                  onSaved={(v) =>
                    setMandate((m) => (m ? { ...m, customInstructions: v } : m))
                  }
                />
              </div>
            )}
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
