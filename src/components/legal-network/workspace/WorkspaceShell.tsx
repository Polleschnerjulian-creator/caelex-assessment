"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * WorkspaceShell — the matter workspace layout. Dark-stage full-
 * screen "arbeitstabelt" with tabs for Overview / Tasks / Notes /
 * Documents / Audit. Phase 2 ships with Overview/Tasks/Notes/Audit
 * populated; Documents comes with Phase 2b.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ScopeItem } from "@/lib/legal-network/scope";
import { OverviewTab } from "./tabs/OverviewTab";
import { TasksTab } from "./tabs/TasksTab";
import { NotesTab } from "./tabs/NotesTab";
import { AuditTab } from "./tabs/AuditTab";
import { ChatTab } from "./tabs/ChatTab";

interface MatterContext {
  id: string;
  name: string;
  reference: string | null;
  description: string | null;
  status: string;
  scope: ScopeItem[];
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  handshakeHash: string;
  acceptedAt: string | null;
  lawFirmOrg: { id: string; name: string; logoUrl: string | null };
  clientOrg: { id: string; name: string; logoUrl: string | null };
  _count: { accessLogs: number; invitations: number };
}

type TabKey = "overview" | "chat" | "tasks" | "notes" | "audit";

const TABS: Array<{ key: TabKey; label: string; hint: string }> = [
  {
    key: "overview",
    label: "Übersicht",
    hint: "Mandanten-Kontext, Scope, Zeitlinie",
  },
  {
    key: "chat",
    label: "AI Chat",
    hint: "Claude Sonnet im Mandanten-Kontext — Memos, Strategie, Fragen",
  },
  {
    key: "tasks",
    label: "Aufgaben",
    hint: "Tasks mit Fristen, Priorität, Zuweisung",
  },
  {
    key: "notes",
    label: "Notizen",
    hint: "Memo-Drafts, freie Notizen, Versionierung",
  },
  {
    key: "audit",
    label: "Audit",
    hint: "Hash-chain-signierte Zugriffshistorie",
  },
];

export function WorkspaceShell({ matterId }: { matterId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = (params.get("tab") as TabKey) ?? "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [matter, setMatter] = useState<MatterContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Matter nicht ladbar");
      setMatter(json.matter);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Reflect tab in URL without rerendering everything
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  if (error && !matter) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-red-400">
          {error} ·{" "}
          <button
            onClick={() => router.push("/atlas/network")}
            className="underline"
          >
            zurück
          </button>
        </div>
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/40 animate-pulse">Lade Mandat…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header bar */}
      <header className="flex-shrink-0 px-8 py-4 border-b border-white/[0.08] flex items-center gap-4">
        <Link
          href={`/atlas/network/${matterId}`}
          className="text-xs text-white/40 hover:text-white/70 transition"
        >
          ← Details
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.22em] uppercase text-white/40">
              {matter.clientOrg.name}
            </span>
            <StatusPill status={matter.status} />
          </div>
          <h1 className="text-lg font-semibold truncate">{matter.name}</h1>
        </div>
        <div className="text-right flex-shrink-0">
          {matter.reference && (
            <div className="text-[10px] tracking-wide text-white/50">
              Ref. {matter.reference}
            </div>
          )}
          {matter.effectiveUntil && (
            <div className="text-[10px] text-white/30 mt-0.5">
              gültig bis{" "}
              {new Date(matter.effectiveUntil).toLocaleDateString("de-DE")}
            </div>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex-shrink-0 px-8 border-b border-white/[0.06] flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            title={tab.hint}
            className={`relative px-4 py-3 text-[12px] font-medium tracking-wide transition ${
              activeTab === tab.key
                ? "text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === "overview" && <OverviewTab matter={matter} />}
        {activeTab === "chat" && <ChatTab matterId={matterId} />}
        {activeTab === "tasks" && <TasksTab matterId={matterId} />}
        {activeTab === "notes" && <NotesTab matterId={matterId} />}
        {activeTab === "audit" && <AuditTab matterId={matterId} />}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "ACTIVE"
      ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"
      : status === "SUSPENDED"
        ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
        : status === "REVOKED" || status === "CLOSED"
          ? "bg-red-500/20 text-red-300 ring-red-500/40"
          : "bg-white/10 text-white/70 ring-white/20";
  return (
    <span
      className={`text-[9px] font-medium px-2 py-0.5 rounded-full ring-1 ${color}`}
    >
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}
