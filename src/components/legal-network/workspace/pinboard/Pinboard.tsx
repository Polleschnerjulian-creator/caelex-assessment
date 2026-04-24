"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Pinboard — the masonry area of the matter workspace.
 *
 * Responsibilities:
 *   1. Fetch `/api/network/matter/:id/artifacts` on mount.
 *   2. Expose a `refresh()` ref-callable so the parent can ping it
 *      when an `artifact_created` SSE event arrives mid-stream.
 *   3. Render cards in a CSS multi-column masonry (no heavy JS lib).
 *   4. Empty-state: friendly hint when no artifacts yet.
 *
 * We use native CSS `columns` instead of a JS masonry library — it's
 * cheaper, needs zero layout measurement, and is enough for ~50 cards.
 * Tradeoff: column order is top-to-bottom, left-to-right, so freshly
 * added cards don't always land at the top of the last column. Paired
 * with server-side `pinned desc, position desc` ordering this reads as
 * "pinned first, newest next" which is what lawyers actually want.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Sparkles } from "lucide-react";
import { ArtifactCard, type PinboardArtifact } from "./ArtifactCard";

export interface PinboardHandle {
  /** Re-fetch the artifact list. Called from the SSE stream parent
   *  whenever an `artifact_created` event is received. */
  refresh: () => Promise<void>;
}

interface PinboardProps {
  matterId: string;
}

export const Pinboard = forwardRef<PinboardHandle, PinboardProps>(
  function Pinboard({ matterId }, ref) {
    const [artifacts, setArtifacts] = useState<PinboardArtifact[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
      try {
        const res = await fetch(`/api/network/matter/${matterId}/artifacts`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Konnte Karten nicht laden");
        setArtifacts(json.artifacts ?? []);
      } catch (err) {
        setError((err as Error).message);
      }
    }, [matterId]);

    useEffect(() => {
      load();
    }, [load]);

    useImperativeHandle(ref, () => ({ refresh: load }), [load]);

    // ── Actions: pin + delete ───────────────────────────────────
    const togglePin = useCallback(
      async (id: string, pinned: boolean) => {
        // Optimistic update
        setArtifacts((prev) =>
          prev ? prev.map((a) => (a.id === id ? { ...a, pinned } : a)) : prev,
        );
        try {
          const res = await fetch(
            `/api/network/matter/${matterId}/artifacts/${id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pinned }),
            },
          );
          if (!res.ok) throw new Error("Pin fehlgeschlagen");
          // Reload to get server-authoritative order (pinned-first)
          await load();
        } catch {
          // Revert on error
          setArtifacts((prev) =>
            prev
              ? prev.map((a) => (a.id === id ? { ...a, pinned: !pinned } : a))
              : prev,
          );
        }
      },
      [matterId, load],
    );

    const remove = useCallback(
      async (id: string) => {
        if (!confirm("Karte entfernen?")) return;
        const snapshot = artifacts;
        // Optimistic remove
        setArtifacts((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
        try {
          const res = await fetch(
            `/api/network/matter/${matterId}/artifacts/${id}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error("Delete fehlgeschlagen");
        } catch {
          setArtifacts(snapshot);
        }
      },
      [matterId, artifacts],
    );

    if (error && !artifacts) {
      return (
        <div className="p-8 text-center text-sm text-red-400/80">{error}</div>
      );
    }

    if (!artifacts) {
      return (
        <div className="p-8 text-center text-sm text-white/35 animate-pulse">
          Lade Karten…
        </div>
      );
    }

    if (artifacts.length === 0) {
      return <EmptyBoardHint />;
    }

    return (
      <div
        className="
          [column-count:1] sm:[column-count:2] xl:[column-count:3] 2xl:[column-count:4]
          [column-gap:1rem]
          px-6 py-6
        "
      >
        {artifacts.map((a) => (
          <div
            key={a.id}
            className="mb-4 break-inside-avoid [-webkit-column-break-inside:avoid]"
          >
            <ArtifactCard
              artifact={a}
              onTogglePin={togglePin}
              onDelete={remove}
            />
          </div>
        ))}
      </div>
    );
  },
);

// ─── Empty state ──────────────────────────────────────────────────────
// First-load hint: no artifacts yet. The chat on the left is the seed
// mechanism — once Claude runs a tool, cards land here.

function EmptyBoardHint() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mb-3">
          <Sparkles size={18} strokeWidth={1.5} className="text-white/45" />
        </div>
        <p className="text-sm text-white/70 mb-1">Pinboard ist leer</p>
        <p className="text-[12px] text-white/40 leading-relaxed">
          Stelle Claude links eine Frage — Compliance-Abrufe, Quellen­suchen
          oder Memos landen hier automatisch als Karten.
        </p>
      </div>
    </div>
  );
}
