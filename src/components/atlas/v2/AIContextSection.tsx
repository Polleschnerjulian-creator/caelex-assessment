"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — AI-Context Settings Section.
 *
 * Two labelled textareas:
 *   1. "Kanzlei-Stil & Standardanweisungen" — firm-wide AI house style.
 *      Editable only for Owner/Admin (canEditFirm); read-only notice for
 *      Members.
 *   2. "Persönliche KI-Anweisungen" — per-user preferences.
 *      Always editable by the authenticated user for their own record.
 *
 * Fetches from / saves to GET|PATCH /api/atlas/settings/ai-context.
 * Uses a save button (not debounce) to avoid accidental mid-sentence
 * writes. Manages feedback via local state (no ToastProvider).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { Bot, Lock } from "lucide-react";

interface AiContextData {
  firmHouseStyle: string | null;
  userInstructions: string | null;
  canEditFirm: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const MAX_CHARS = 4000;
const API_PATH = "/api/atlas/settings/ai-context";

/**
 * AIContextSection — Atlas settings section for firm + personal AI instructions.
 *
 * Drop this into the Atlas settings hub alongside the other v2 sections.
 * No external provider dependencies — uses local React state for all feedback.
 */
export function AIContextSection() {
  const [data, setData] = useState<AiContextData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firmDraft, setFirmDraft] = useState("");
  const [userDraft, setUserDraft] = useState("");

  const [firmStatus, setFirmStatus] = useState<SaveStatus>("idle");
  const [userStatus, setUserStatus] = useState<SaveStatus>("idle");

  /* ── Load ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    fetch(API_PATH)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AiContextData>;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setFirmDraft(d.firmHouseStyle ?? "");
        setUserDraft(d.userInstructions ?? "");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Save helpers ─────────────────────────────────────────────────── */

  const saveFirm = useCallback(async () => {
    setFirmStatus("saving");
    try {
      const r = await fetch(API_PATH, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmHouseStyle: firmDraft.trim() || null,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${r.status}`,
        );
      }
      setFirmStatus("saved");
      setTimeout(() => setFirmStatus("idle"), 2500);
    } catch (e: unknown) {
      console.error("[AIContextSection] saveFirm", e);
      setFirmStatus("error");
      setTimeout(() => setFirmStatus("idle"), 4000);
    }
  }, [firmDraft]);

  const saveUser = useCallback(async () => {
    setUserStatus("saving");
    try {
      const r = await fetch(API_PATH, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInstructions: userDraft.trim() || null,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${r.status}`,
        );
      }
      setUserStatus("saved");
      setTimeout(() => setUserStatus("idle"), 2500);
    } catch (e: unknown) {
      console.error("[AIContextSection] saveUser", e);
      setUserStatus("error");
      setTimeout(() => setUserStatus("idle"), 4000);
    }
  }, [userDraft]);

  /* ── Render ───────────────────────────────────────────────────────── */

  if (loadError) {
    return (
      <section>
        <SectionHeader />
        <p className="mt-4 text-[11.5px] text-red-500 dark:text-red-400">
          Fehler beim Laden: {loadError}
        </p>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <SectionHeader />
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.03]" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <SectionHeader />

      {/* Intro blurb — matches NotificationsSection style */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          Passe an, wie Atlas antwortet — kanzleiweit und persönlich. Diese
          Anweisungen werden in jeden Chat-Systemprompt eingefügt und ergänzen
          die mandatsspezifischen Anweisungen.
        </p>
      </div>

      {/* ── Firm house style ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Kanzlei-Stil &amp; Standardanweisungen
            </span>
            {!data.canEditFirm && (
              <Lock
                className="h-3 w-3 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
            )}
          </label>
          {data.canEditFirm && (
            <SaveButton
              status={firmStatus}
              disabled={firmDraft === (data.firmHouseStyle ?? "")}
              onClick={saveFirm}
            />
          )}
        </div>

        {!data.canEditFirm ? (
          /* Read-only view for Members */
          <div className="min-h-[6rem] rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
            {data.firmHouseStyle ? (
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                {data.firmHouseStyle}
              </p>
            ) : (
              <p className="text-[11.5px] italic text-slate-400 dark:text-slate-500">
                Noch keine Kanzlei-Anweisungen hinterlegt.
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              Nur Kanzlei-Inhaber und Admins können dieses Feld bearbeiten.
            </p>
          </div>
        ) : (
          <>
            <textarea
              value={firmDraft}
              onChange={(e) => setFirmDraft(e.target.value)}
              maxLength={MAX_CHARS}
              rows={6}
              placeholder="Z.B.: Antworte immer auf Deutsch. Zitiere Paragraphen im Format §&nbsp;X Abs.&nbsp;Y [Gesetz]. Verwende förmliche Anrede."
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-800 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:placeholder-slate-600 dark:focus:border-white/[0.16]"
            />
            <CharCount value={firmDraft} max={MAX_CHARS} />
          </>
        )}
      </div>

      {/* ── Personal AI instructions ──────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Persönliche KI-Anweisungen
            </span>
          </label>
          <SaveButton
            status={userStatus}
            disabled={userDraft === (data.userInstructions ?? "")}
            onClick={saveUser}
          />
        </div>

        <textarea
          value={userDraft}
          onChange={(e) => setUserDraft(e.target.value)}
          maxLength={MAX_CHARS}
          rows={5}
          placeholder="Z.B.: Fasse Antworten bevorzugt als Aufzählung zusammen. Gib immer Fundstellen an. Verwende Markdown-Tabellen für Vergleiche."
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-800 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:placeholder-slate-600 dark:focus:border-white/[0.16]"
        />
        <CharCount value={userDraft} max={MAX_CHARS} />
      </div>
    </section>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function SectionHeader() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Bot
        className="h-4 w-4 text-slate-400 dark:text-slate-500"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        KI-Anweisungen
      </h2>
    </div>
  );
}

interface SaveButtonProps {
  status: SaveStatus;
  disabled: boolean;
  onClick: () => void;
}

function SaveButton({ status, disabled, onClick }: SaveButtonProps) {
  const label =
    status === "saving"
      ? "Speichern…"
      : status === "saved"
        ? "Gespeichert"
        : status === "error"
          ? "Fehler"
          : "Speichern";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === "saving"}
      className={[
        "rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors",
        status === "saved"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : status === "error"
            ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            : disabled || status === "saving"
              ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/[0.04] dark:text-slate-600"
              : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.12]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const near = len > max * 0.85;
  return (
    <p
      className={[
        "text-right text-[10.5px]",
        near
          ? "text-amber-500 dark:text-amber-400"
          : "text-slate-400 dark:text-slate-600",
      ].join(" ")}
    >
      {len} / {max}
    </p>
  );
}
