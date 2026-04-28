"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * MatterTable — shared list view for LegalMatter records, used from
 * both the Atlas law-firm side and the Caelex operator side. The
 * `viewerSide` prop controls which counterparty gets prominence
 * (operators want to see WHICH FIRM; firms want to see WHICH CLIENT).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScopeItem } from "@/lib/legal-network/scope";

interface Matter {
  id: string;
  name: string;
  reference: string | null;
  status: string;
  scope: ScopeItem[];
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  invitedFrom: "ATLAS" | "CAELEX";
  invitedAt: string;
  acceptedAt: string | null;
  lawFirm: { id: string; name: string; logoUrl: string | null };
  client: { id: string; name: string; logoUrl: string | null };
  accessCount: number;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  PENDING_INVITE: {
    label: "wartet auf Zusage",
    color:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30",
  },
  PENDING_CONSENT: {
    label: "Amendment offen",
    color:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  ACTIVE: {
    label: "aktiv",
    color:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  },
  SUSPENDED: {
    label: "pausiert",
    color:
      "bg-slate-500/10 text-slate-700 dark:text-slate-400 ring-1 ring-slate-500/30",
  },
  CLOSED: {
    label: "geschlossen",
    color:
      "bg-slate-500/10 text-slate-600 dark:text-slate-500 ring-1 ring-slate-500/20",
  },
  REVOKED: {
    label: "widerrufen",
    color:
      "bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-500/30",
  },
};

export function MatterTable({
  viewerSide,
  inviteHref,
  emptyCta,
}: {
  viewerSide: "ATLAS" | "CAELEX";
  inviteHref: string;
  emptyCta: string;
}) {
  const [matters, setMatters] = useState<Matter[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/network/matters")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Laden fehlgeschlagen");
        setMatters(j.matters);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
    );
  }

  if (!matters) {
    return (
      <div className="text-sm text-slate-400 animate-pulse">Lade Mandate…</div>
    );
  }

  if (matters.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-sm text-slate-500 mb-4">{emptyCta}</div>
        <Link
          href={inviteHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium hover:opacity-90 transition"
        >
          + Neues Mandat
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matters.map((m) => {
        const counterparty = viewerSide === "ATLAS" ? m.client : m.lawFirm;
        const badge = STATUS_BADGE[m.status] ?? STATUS_BADGE.ACTIVE;
        const scopeSummary = m.scope
          .map((s) => s.category.split("_")[0].toLowerCase())
          .slice(0, 3)
          .join(" · ");
        return (
          <Link
            key={m.id}
            href={
              viewerSide === "ATLAS"
                ? `/atlas/network/${m.id}`
                : `/dashboard/network/legal-counsel/${m.id}`
            }
            className="block p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-500">
                    {counterparty.name}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 group-hover:underline">
                  {m.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {m.reference && <span>Ref. {m.reference}</span>}
                  <span className="truncate">scope: {scopeSummary}</span>
                  {m.accessCount > 0 && <span>{m.accessCount} Zugriffe</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {m.effectiveUntil && (
                  <div className="text-[10px] text-slate-500">
                    gültig bis{" "}
                    {new Date(m.effectiveUntil).toLocaleDateString("de-DE")}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">
                  zuletzt {new Date(m.updatedAt).toLocaleDateString("de-DE")}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
      <Link
        href={inviteHref}
        className="block p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
      >
        + Neues Mandat
      </Link>
    </div>
  );
}
