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

/* AUDIT-FIX Q02 (2026-05-17): removed unused `mandateId` prop. It was
   declared on the Props interface, passed by callers, but never read
   inside the component (chat links use chatId, not mandateId). Dead
   props inflate the public API surface and mislead callers into
   thinking the value matters. */
interface Props {
  chats: MandateChatRecord[];
}

export function MandateChatsList({ chats }: Props) {
  if (chats.length === 0) {
    /* UI-FIX 2026-05-18: Empty-State mit Icon + klarem CTA-Pfeil zum
       Composer oben. Visuelles Anker statt nur flachem Text-Kasten. */
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-slate-700/60 dark:bg-slate-900/30">
        <MessageSquare
          size={20}
          strokeWidth={1.5}
          className="text-slate-400 dark:text-slate-600"
        />
        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
          Noch keine Chats in diesem Mandat
        </p>
        <p className="max-w-sm text-[11.5px] text-slate-500 dark:text-slate-400">
          Stelle deine erste Frage oben im Composer ↑ — Atlas kennt dann
          automatisch alle Custom-Instructions, Vault-Files und Parteien dieses
          Mandats.
        </p>
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
