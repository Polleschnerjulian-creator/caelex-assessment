"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate-Index Card.
 *
 * Single Mandate-Card im Index-Grid. Click → Workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { MessageSquare, FileText, AlertCircle } from "lucide-react";

export interface IndexMandate {
  id: string;
  name: string;
  clientName: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  status: string;
  updatedAt: Date | string;
  createdAt: Date | string;
  _count?: {
    chats: number;
    files: number;
    deadlines?: number;
  };
  deadlines?: Array<{
    id: string;
    title: string;
    dueAt: Date | string;
  }>;
}

interface Props {
  mandate: IndexMandate;
}

function relativeTime(iso: Date | string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "gerade";
  if (sec < 3600) return `vor ${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)}h`;
  if (sec < 86400 * 7) return `vor ${Math.floor(sec / 86400)}d`;
  if (sec < 86400 * 30) return `vor ${Math.floor(sec / 86400 / 7)}w`;
  return `vor ${Math.floor(sec / 86400 / 30)}mo`;
}

function deadlineUrgency(dueIso: Date | string): {
  label: string;
  className: string;
  icon: boolean;
} {
  const due = typeof dueIso === "string" ? new Date(dueIso) : dueIso;
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return {
      label: `überfällig (${Math.abs(days)}d)`,
      className: "text-red-600 dark:text-red-400",
      icon: true,
    };
  }
  if (days <= 7) {
    return {
      label: `${days}d`,
      className: "text-red-600 dark:text-red-400",
      icon: true,
    };
  }
  if (days <= 30) {
    return {
      label: `${days}d`,
      className: "text-amber-600 dark:text-amber-400",
      icon: true,
    };
  }
  return {
    label: `${days}d`,
    className: "text-slate-500 dark:text-slate-400",
    icon: false,
  };
}

export function MandateIndexCard({ mandate }: Props) {
  const nextDeadline = mandate.deadlines?.[0];
  const urgency = nextDeadline ? deadlineUrgency(nextDeadline.dueAt) : null;

  return (
    <Link
      href={`/atlas/mandate/${mandate.id}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-[14px] font-medium text-slate-900 dark:text-slate-100">
            {mandate.name}
          </h3>
          {mandate.clientName && (
            <p className="line-clamp-1 mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {mandate.clientName}
            </p>
          )}
        </div>
      </div>

      {(mandate.jurisdiction || mandate.operatorType) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {mandate.jurisdiction && (
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {mandate.jurisdiction}
            </span>
          )}
          {mandate.operatorType && (
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {mandate.operatorType}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[11.5px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <MessageSquare size={11} className="opacity-60" />
          {mandate._count?.chats ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText size={11} className="opacity-60" />
          {mandate._count?.files ?? 0}
        </span>
        {urgency && (
          <span
            className={`inline-flex items-center gap-1 ${urgency.className}`}
          >
            {urgency.icon && <AlertCircle size={11} />}
            {urgency.label}
          </span>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-2 text-[10.5px] text-slate-400 dark:border-white/[0.05] dark:text-slate-500">
        {relativeTime(mandate.updatedAt)}
      </div>
    </Link>
  );
}
