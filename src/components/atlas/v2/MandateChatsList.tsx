"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — list of chats inside a mandate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { MandateChatRecord } from "./mandate-types";

interface Props {
  chats: MandateChatRecord[];
  mandateId: string;
}

export function MandateChatsList({ chats }: Props) {
  if (chats.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/30 px-4 py-6 text-center text-xs text-slate-500">
        Noch keine Chats in diesem Mandat. Stelle deine erste Frage oben im
        Composer.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/40">
      {chats.map((c) => (
        <li key={c.id}>
          <Link
            href={`/atlas/chat/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 text-[13px] text-slate-200 hover:bg-slate-900"
          >
            <MessageSquare
              size={12}
              className="shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="line-clamp-1 flex-1">{c.title}</span>
            <span className="shrink-0 text-[10px] text-slate-500 tabular-nums">
              {formatRelative(c.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE");
}
