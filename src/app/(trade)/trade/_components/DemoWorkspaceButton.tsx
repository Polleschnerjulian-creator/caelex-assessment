"use client";

/**
 * Load / remove the [DEMO] sample workspace (ILA review item #1).
 * Load lives in the onboarding empty state; remove renders as a subtle
 * row whenever demo rows exist. Both refresh the RSC tree on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

export function LoadDemoWorkspaceCard() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function load() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/trade/demo-workspace", {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.ok || res.status === 409) {
        router.refresh();
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-trade-border-strong bg-trade-bg-panel px-5 py-4">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-trade-text-primary">
          Lieber erst mal ansehen?
        </div>
        <div className="mt-0.5 text-[12px] text-trade-text-muted">
          Lädt einen Beispiel-Workspace: klassifiziertes Reaktionsrad,
          Screening-Treffer zum Triagieren, prüfbereiter Vorgang. Mit einem
          Klick wieder entfernbar — alles trägt den [DEMO]-Marker.
        </div>
        {state === "error" ? (
          <div className="mt-1 text-[12px] text-red-600">
            Konnte nicht laden — bitte erneut versuchen.
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={load}
        disabled={state === "loading"}
        className="flex shrink-0 items-center gap-2 rounded-lg border border-trade-border-strong bg-trade-bg-inset px-4 py-2 text-[13px] font-medium text-trade-text-primary transition hover:border-trade-border-strong hover:bg-trade-bg-panel disabled:opacity-60"
      >
        {state === "loading" ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles size={14} aria-hidden="true" />
        )}
        Beispiel-Workspace laden
      </button>
    </div>
  );
}

export function RemoveDemoWorkspaceRow() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "removing">("idle");

  async function remove() {
    setState("removing");
    try {
      const res = await fetch("/api/trade/demo-workspace", {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
    } catch {
      // fall through to reset
    }
    setState("idle");
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-trade-border bg-trade-bg-panel px-4 py-2.5">
      <span className="text-[12px] text-trade-text-muted">
        Demo-Daten aktiv — alle Zeilen tragen den [DEMO]-Marker.
      </span>
      {state === "confirm" ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={remove}
            className="text-[12px] font-medium text-red-600 hover:underline"
          >
            Wirklich entfernen
          </button>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="text-[12px] text-trade-text-muted hover:underline"
          >
            Abbrechen
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setState("confirm")}
          disabled={state === "removing"}
          className="flex items-center gap-1.5 text-[12px] text-trade-text-muted transition hover:text-red-600 disabled:opacity-60"
        >
          {state === "removing" ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 size={12} aria-hidden="true" />
          )}
          Demo-Daten entfernen
        </button>
      )}
    </div>
  );
}
