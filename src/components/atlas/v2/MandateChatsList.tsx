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
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/30">
        Noch keine Chats in diesem Mandat. Stelle deine erste Frage oben im
        Composer.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700/60 dark:bg-slate-900/40">
      {chats.map((c) => (
        <li key={c.id}>
          <Link
            href={`/atlas/chat/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 text-[13px] text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <MessageSquare
              size={12}
              className="shrink-0 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            {/* AUDIT-FIX 2026-05-17: chat.title is null for brand-new chats
                until the first AI response generates a title. Previously
                rendered as empty span. Now aligned with the sidebar's
                fallback. */}
            <span className="line-clamp-1 flex-1">
              {c.title || "Unbenannter Chat"}
            </span>
            <span className="shrink-0 text-[10px] text-slate-500 tabular-nums">
              {/* AUDIT-FIX L15 (2026-05-15): aligned with MandateFilesList
                  which already uses `toLocaleDateString("de-DE")`. The
                  prior bespoke "gerade eben / vor X Min / vor X Std /
                  vor X Tagen" ladder was nice-to-read but inconsistent
                  with every other list view in the mandate detail page,
                  and it drifted UI-text out of sync with the formatter
                  the file list uses for the same `createdAt` column. */}
              {new Date(c.updatedAt).toLocaleDateString("de-DE")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
