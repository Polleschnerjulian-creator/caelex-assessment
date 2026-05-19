"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — CommentsPanel.
 *
 * Sprint 15 (2026-05-19). Right-sidebar-content für die Comments-tab.
 * Listet alle comments (offen + resolved) mit author, timestamp, text.
 * Per click springt der editor zum highlighted text + scroll. Per click
 * auf "Erledigt" wird der comment resolved (visual struck-through). Per
 * click auf "Löschen" wird der comment + sein mark entfernt.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  MessageSquare,
  Check,
  Trash2,
  Send,
  CheckCircle2,
  Circle,
} from "lucide-react";

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  replies?: CommentReply[];
  /** Excerpt of the commented text (≤80 chars) — shown in panel as
   *  context so user knows which text the comment is about without
   *  scrolling. */
  anchorText?: string;
}

interface Props {
  comments: Comment[];
  onJumpTo: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onAddReply: (commentId: string, text: string) => void;
  currentUserName: string;
}

export function CommentsPanel({
  comments,
  onJumpTo,
  onResolve,
  onDelete,
  onAddReply,
  currentUserName,
}: Props) {
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const visible = comments.filter((c) =>
    filter === "all" ? true : filter === "open" ? !c.resolved : c.resolved,
  );

  return (
    <div className="flex h-full flex-col">
      {/* Filter chips */}
      <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        {(["open", "resolved", "all"] as const).map((f) => {
          const count =
            f === "all"
              ? comments.length
              : f === "open"
                ? comments.filter((c) => !c.resolved).length
                : comments.filter((c) => c.resolved).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                filter === f
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {f === "open" ? "Offen" : f === "resolved" ? "Erledigt" : "Alle"}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {visible.length === 0 ? (
          <div className="px-2 py-8 text-center text-[11.5px] text-slate-500">
            <MessageSquare
              size={20}
              className="mx-auto mb-2 text-slate-300 dark:text-slate-700"
            />
            {filter === "open"
              ? "Keine offenen Kommentare. Markier Text + click 'Kommentar' in der Toolbar."
              : filter === "resolved"
                ? "Noch keine erledigten Kommentare."
                : "Noch keine Kommentare."}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((c) => (
              <li key={c.id}>
                <CommentCard
                  comment={c}
                  currentUserName={currentUserName}
                  onJump={() => onJumpTo(c.id)}
                  onResolve={() => onResolve(c.id)}
                  onDelete={() => onDelete(c.id)}
                  onReply={(text) => onAddReply(c.id, text)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  currentUserName,
  onJump,
  onResolve,
  onDelete,
  onReply,
}: {
  comment: Comment;
  currentUserName: string;
  onJump: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onReply: (text: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSendReply = () => {
    const t = replyText.trim();
    if (!t) return;
    onReply(t);
    setReplyText("");
    setReplyOpen(false);
  };

  return (
    <div
      className={`rounded-lg border p-2.5 transition-colors ${
        comment.resolved
          ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
          : "border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/[0.04]"
      }`}
    >
      {/* Anchor preview (the commented text) */}
      {comment.anchorText && (
        <button
          type="button"
          onClick={onJump}
          title="Zum kommentierten Text springen"
          className={`mb-1.5 block w-full rounded-md border-l-2 px-2 py-1 text-left text-[10.5px] italic transition-colors hover:bg-white ${
            comment.resolved
              ? "border-slate-300 text-slate-500"
              : "border-amber-400 text-amber-800 dark:border-amber-500/50 dark:text-amber-200"
          }`}
        >
          „{comment.anchorText}"
        </button>
      )}

      {/* Header: author + timestamp + actions */}
      <div className="flex items-start gap-2">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${
            comment.resolved ? "bg-slate-400" : "bg-emerald-500"
          }`}
        >
          {comment.author.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {comment.author}
            </span>
            <span className="text-slate-400">
              ·{" "}
              {new Date(comment.createdAt).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onResolve}
          title={comment.resolved ? "Wieder öffnen" : "Als erledigt markieren"}
          className="rounded p-0.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400"
        >
          {comment.resolved ? <CheckCircle2 size={12} /> : <Circle size={12} />}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Kommentar wirklich löschen?")) onDelete();
          }}
          title="Löschen"
          className="rounded p-0.5 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Body */}
      <div
        className={`mt-1 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 ${
          comment.resolved ? "line-through opacity-70" : ""
        }`}
      >
        {comment.text}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
          {comment.replies.map((r) => (
            <li key={r.id}>
              <div className="text-[10.5px] text-slate-500">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {r.author}
                </span>
                <span className="text-slate-400">
                  {" · "}
                  {new Date(r.createdAt).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="text-[11.5px] text-slate-700 dark:text-slate-300">
                {r.text}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Reply input */}
      {!comment.resolved && (
        <div className="mt-2">
          {replyOpen ? (
            <div className="space-y-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder={`Antworten als ${currentUserName}…`}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyText("");
                  }}
                  className="rounded px-2 py-0.5 text-[10.5px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[10.5px] font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  <Send size={9} />
                  Senden
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="text-[10.5px] text-emerald-700 hover:underline dark:text-emerald-400"
            >
              + Antworten
            </button>
          )}
        </div>
      )}
    </div>
  );
}
