"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SaveToDashboardButton — full-tier "save to dashboard" surface
 * (plan Task 3.6, consuming the Task 3.5 snapshot-import contract).
 *
 * CONTRACT (Task 3.5 — built in parallel):
 *   POST /api/tracker/import-assessment
 *   body { verdictSnapshotId: string }
 *   → 200 { imported: true, articles: number, deadlines: number }
 *   → 4xx { error: string }
 *
 * HONESTY: the saved state is shown ONLY when the server confirmed
 * `imported: true` — a 2xx without that confirmation is rendered as an
 * error, never an assumed success. The success copy echoes the server's
 * REAL counts (articles, deadlines); the error state surfaces the server's
 * own error message when one is given.
 */

import { useState } from "react";
import { CheckCircle2, LayoutDashboard, Loader2 } from "lucide-react";

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; articles: number; deadlines: number }
  | { phase: "error"; message: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function readCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
}

export interface SaveToDashboardButtonProps {
  /** The AssessmentVerdictSnapshot id this page rendered (the engine result
   *  the user actually saw — single-dataset import, Task 3.5). */
  verdictSnapshotId: string;
}

export default function SaveToDashboardButton({
  verdictSnapshotId,
}: SaveToDashboardButtonProps) {
  const [state, setState] = useState<SaveState>({ phase: "idle" });

  const save = async () => {
    if (state.phase === "saving" || state.phase === "saved") return;
    setState({ phase: "saving" });
    try {
      const res = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdictSnapshotId }),
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const serverMessage =
          isRecord(data) && typeof data.error === "string" && data.error
            ? data.error
            : `Save failed (HTTP ${res.status}). Please try again.`;
        setState({ phase: "error", message: serverMessage });
        return;
      }

      if (isRecord(data) && data.imported === true) {
        setState({
          phase: "saved",
          articles: readCount(data.articles),
          deadlines: readCount(data.deadlines),
        });
      } else {
        // A 2xx that does not CONFIRM the import is not a success.
        setState({
          phase: "error",
          message:
            "The server did not confirm the import — nothing was marked as saved. Please try again.",
        });
      }
    } catch {
      setState({
        phase: "error",
        message:
          "We couldn't reach the server. Please check your connection and try again.",
      });
    }
  };

  if (state.phase === "saved") {
    return (
      <p
        role="status"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.04] border border-black/[0.18] text-body text-[#1d1d1f]"
      >
        <CheckCircle2 size={14} aria-hidden="true" />
        Saved to your dashboard — {state.articles} article{" "}
        {state.articles === 1 ? "status" : "statuses"} and {state.deadlines}{" "}
        deadline{state.deadlines === 1 ? "" : "s"} imported.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={save}
        disabled={state.phase === "saving"}
        aria-busy={state.phase === "saving"}
        className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed text-white text-body font-medium px-5 py-2.5 rounded-full transition-all"
      >
        {state.phase === "saving" ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <LayoutDashboard size={14} aria-hidden="true" />
        )}
        {state.phase === "saving" ? "Saving…" : "Save to dashboard"}
      </button>
      {state.phase === "error" ? (
        <p role="alert" className="mt-2 text-small text-red-600">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
