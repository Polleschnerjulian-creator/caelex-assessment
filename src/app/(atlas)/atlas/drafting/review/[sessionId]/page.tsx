"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/review/[sessionId] — Live partner-review (Bundle 38, B3).
 *
 * One review session = one shared draft + a comment thread. Marie
 * generates a draft → clicks "Share for review" on /atlas/drafting/
 * history → a session is created and she sends the link to Klaus.
 * Klaus opens the link, reads the draft, comments. Marie sees the
 * comments on next refresh and can edit the draft body inline.
 *
 * MVP storage is localStorage so the share-link only resolves on the
 * same browser. Bundle 36's eventual backend lift will swap the store
 * for Postgres so partners on different machines can collaborate. The
 * data shape and the UI flow are identical; only the storage adapter
 * changes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PenSquare,
  ArrowLeft,
  MessageSquarePlus,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Sparkles,
  Save,
  Copy,
  Check,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import {
  getReviewSession,
  addReviewComment,
  resolveReviewComment,
  deleteReviewComment,
  updateReviewSession,
  type ReviewSession,
} from "@/lib/atlas/review-sessions";

function fmtRelative(ts: number, isDe: boolean): string {
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return isDe ? "gerade eben" : "just now";
  if (diffMin < 60) return isDe ? `vor ${diffMin} Min.` : `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return isDe ? `vor ${diffH} Std.` : `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return isDe ? `vor ${diffD} Tag(en)` : `${diffD}d ago`;
  return new Date(ts).toLocaleDateString(isDe ? "de-DE" : "en-GB");
}

export default function ReviewSessionPage() {
  const { language } = useLanguage();
  const isDe = language === "de";
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;

  const [session, setSession] = useState<ReviewSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");
  const [bodyDirty, setBodyDirty] = useState(false);
  const [author, setAuthor] = useState("");
  const [newComment, setNewComment] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const refresh = () => {
    if (!sessionId) return;
    const next = getReviewSession(sessionId);
    setSession(next);
    if (next && !bodyDirty) setBodyDraft(next.draftBody);
  };

  useEffect(() => {
    if (!sessionId) return;
    const loaded = getReviewSession(sessionId);
    setSession(loaded);
    if (loaded) setBodyDraft(loaded.draftBody);
    /* Persist a default author so subsequent comments don't make Marie
       re-type her name every time. */
    try {
      const stored = window.localStorage.getItem(
        "atlas-drafting-review-author",
      );
      if (stored) setAuthor(stored);
    } catch {
      /* silent */
    }
    setHydrated(true);
  }, [sessionId]);

  const handleSaveBody = () => {
    if (!sessionId) return;
    updateReviewSession(sessionId, { draftBody: bodyDraft });
    setBodyDirty(false);
    refresh();
  };

  const handleAddComment = () => {
    if (!sessionId || !newComment.trim() || !author.trim()) return;
    try {
      window.localStorage.setItem(
        "atlas-drafting-review-author",
        author.trim(),
      );
    } catch {
      /* silent */
    }
    addReviewComment(sessionId, {
      author: author.trim(),
      body: newComment.trim(),
    });
    setNewComment("");
    refresh();
  };

  const handleResolve = (commentId: string) => {
    if (!sessionId) return;
    resolveReviewComment(sessionId, commentId);
    refresh();
  };

  const handleDeleteComment = (commentId: string) => {
    if (!sessionId) return;
    deleteReviewComment(sessionId, commentId);
    refresh();
  };

  const handleRegenerate = () => {
    if (!session) return;
    openAIMode({ prompt: session.draftPrompt });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      /* silent */
    }
  };

  if (hydrated && !session) {
    return (
      <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
        <header className="flex items-center gap-3 max-w-3xl">
          <Link
            href="/atlas/drafting/history"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Meine Entwürfe" : "My Drafts"}
          </Link>
        </header>
        <div className="flex flex-col items-center text-center max-w-md mx-auto mt-12 gap-3">
          <AlertCircle
            size={36}
            strokeWidth={1.2}
            aria-hidden="true"
            className="text-[var(--atlas-text-faint)]"
          />
          <p className="text-[14px] font-medium text-[var(--atlas-text-primary)]">
            {isDe
              ? "Review-Session nicht gefunden"
              : "Review session not found"}
          </p>
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
            {isDe
              ? "Der Link führt zu keiner gespeicherten Session. (MVP: Sessions liegen in deinem Browser-Storage — Cross-Device-Sharing kommt mit dem Backend-Lift in Bundle 36.)"
              : "The link doesn't resolve to a saved session. (MVP note: sessions live in your browser storage — cross-device sharing arrives with the bundle 36 backend lift.)"}
          </p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const openComments = session.comments.filter((c) => !c.resolvedAt).length;
  const resolvedComments = session.comments.length - openComments;

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2 max-w-4xl">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/atlas/drafting/history"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Meine Entwürfe" : "My Drafts"}
          </Link>
          <span className="text-[var(--atlas-text-faint)]">·</span>
          <PenSquare className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)] truncate">
            {session.draftTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--atlas-text-muted)]">
            {openComments} {isDe ? "offen" : "open"} · {resolvedComments}{" "}
            {isDe ? "erledigt" : "resolved"}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
          >
            {linkCopied ? (
              <>
                <Check size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Kopiert" : "Copied"}
              </>
            ) : (
              <>
                <Copy size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Link kopieren" : "Copy link"}
              </>
            )}
          </button>
        </div>
      </header>

      {/* MVP caveat banner */}
      <div className="rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 max-w-4xl">
        <p className="text-[10.5px] text-amber-800 dark:text-amber-200 leading-relaxed">
          <AlertCircle
            size={11}
            strokeWidth={1.8}
            aria-hidden="true"
            className="inline-block mr-1 -mt-0.5"
          />
          {isDe
            ? "MVP: Sessions liegen lokal in deinem Browser. Der Link funktioniert nur auf diesem Gerät. Echtes Cross-Device-Sharing kommt mit Bundle 36 (Backend-Persistenz)."
            : "MVP: sessions live in your browser. The share link only resolves on this device. True cross-device sharing arrives with bundle 36 (backend persistence)."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        {/* Left: draft + edit */}
        <section className="flex flex-col gap-2 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--atlas-text-primary)]">
              {isDe ? "Entwurf" : "Draft"}
            </h2>
            <button
              type="button"
              onClick={handleRegenerate}
              title={
                isDe
                  ? "Original-Prompt erneut dispatchen"
                  : "Re-fire the original prompt"
              }
              className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
            >
              <Sparkles size={10} strokeWidth={1.8} aria-hidden="true" />
              {isDe ? "Neu generieren" : "Regenerate"}
            </button>
          </div>
          <textarea
            value={bodyDraft}
            onChange={(e) => {
              setBodyDraft(e.target.value);
              setBodyDirty(true);
            }}
            rows={20}
            placeholder={
              isDe
                ? "AI-Antwort hier einfügen, dann zur Review freigeben…"
                : "Paste the AI response here, then share for review…"
            }
            className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-y font-mono placeholder:text-[var(--atlas-text-faint)]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-[var(--atlas-text-faint)]">
              {bodyDirty
                ? isDe
                  ? "Ungespeicherte Änderungen"
                  : "Unsaved changes"
                : isDe
                  ? `Zuletzt aktualisiert ${fmtRelative(session.updatedAt, isDe)}`
                  : `Last updated ${fmtRelative(session.updatedAt, isDe)}`}
            </span>
            <button
              type="button"
              onClick={handleSaveBody}
              disabled={!bodyDirty}
              className="inline-flex items-center gap-1.5 rounded bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11px] font-medium px-3 py-1 transition-colors"
            >
              <Save size={11} strokeWidth={1.8} aria-hidden="true" />
              {isDe ? "Speichern" : "Save"}
            </button>
          </div>

          {/* Original-prompt (collapsible — context for the reviewer) */}
          <details className="mt-2">
            <summary className="cursor-pointer text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]">
              {isDe ? "Original-Prompt anzeigen" : "Show original prompt"}
            </summary>
            <pre className="mt-1.5 text-[10px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
              {session.draftPrompt}
            </pre>
          </details>
        </section>

        {/* Right: comments */}
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4">
          <h2 className="text-[13px] font-semibold text-[var(--atlas-text-primary)]">
            {isDe ? "Kommentare" : "Comments"}
            <span className="ml-2 text-[11px] font-normal text-[var(--atlas-text-muted)]">
              ({session.comments.length})
            </span>
          </h2>

          <ul className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
            {session.comments.length === 0 && (
              <li className="text-[11.5px] italic text-[var(--atlas-text-muted)]">
                {isDe
                  ? "Noch keine Kommentare. Klaus, leg los."
                  : "No comments yet. Klaus, your turn."}
              </li>
            )}
            {session.comments.map((c) => (
              <li
                key={c.id}
                className={`rounded-md border p-2 flex flex-col gap-1 ${
                  c.resolvedAt
                    ? "opacity-60 border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)]"
                    : "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11.5px] font-semibold text-[var(--atlas-text-primary)] truncate">
                      {c.author}
                    </span>
                    <span className="text-[10px] text-[var(--atlas-text-faint)]">
                      {fmtRelative(c.ts, isDe)}
                    </span>
                    {c.resolvedAt && (
                      <span className="text-[9.5px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400">
                        {isDe ? "Erledigt" : "Resolved"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleResolve(c.id)}
                      title={
                        c.resolvedAt
                          ? isDe
                            ? "Erneut öffnen"
                            : "Reopen"
                          : isDe
                            ? "Als erledigt markieren"
                            : "Mark resolved"
                      }
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--atlas-text-faint)] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                    >
                      <CheckCircle2
                        size={11}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      title={isDe ? "Löschen" : "Delete"}
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--atlas-text-faint)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-[var(--atlas-text-primary)] leading-relaxed whitespace-pre-wrap">
                  {c.body}
                </p>
              </li>
            ))}
          </ul>

          {/* Add-comment form */}
          <div className="border-t border-[var(--atlas-border-subtle)] pt-3 flex flex-col gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={isDe ? "Dein Name" : "Your name"}
              className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1 text-[11.5px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
            />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              placeholder={isDe ? "Kommentar hinzufügen…" : "Add a comment…"}
              className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-y placeholder:text-[var(--atlas-text-faint)]"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newComment.trim() || !author.trim()}
              className="self-end inline-flex items-center gap-1.5 rounded bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11px] font-medium px-3 py-1 transition-colors"
            >
              <MessageSquarePlus
                size={11}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {isDe ? "Kommentieren" : "Comment"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
