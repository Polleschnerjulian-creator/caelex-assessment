"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Pinboard — the masonry area of the matter workspace. Phase B turns
 * it from a read-only display into a workspace:
 *
 *   1. Drag-and-drop reorder via @dnd-kit/sortable. Each card is its
 *      own sortable item; on drop, an optimistic local reorder is
 *      followed by a single PATCH /artifacts call that persists the
 *      new positions in a transaction.
 *
 *   2. Click-to-detail — clicking a card (without dragging) opens
 *      ArtifactDetailDrawer with the full payload. The 8px drag
 *      threshold (activationConstraint) cleanly separates click vs
 *      drag intent.
 *
 *   3. Manual TEXT cards via ManualCardComposer — lawyer can pin
 *      their own notes without going through Claude.
 *
 * Layout switched from CSS `columns` to CSS Grid because column-flow
 * makes DnD collision detection unstable (cards "jump" between
 * columns mid-drag). Grid + rectSortingStrategy is rock-solid.
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArtifactCard, type PinboardArtifact } from "./ArtifactCard";
import { ArtifactDetailDrawer } from "./ArtifactDetailDrawer";
import { ManualCardComposer } from "./ManualCardComposer";
import { SystemCards } from "./SystemCards";

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
    const [detail, setDetail] = useState<PinboardArtifact | null>(null);

    // DnD: a small drag threshold lets us cleanly distinguish a click
    // (opens detail drawer) from a drag (starts reordering). 8px is
    // the @dnd-kit-recommended default for this pattern.
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

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

    // ── Pin/Unpin ───────────────────────────────────────────────
    const togglePin = useCallback(
      async (id: string, pinned: boolean) => {
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
          await load();
        } catch {
          setArtifacts((prev) =>
            prev
              ? prev.map((a) => (a.id === id ? { ...a, pinned: !pinned } : a))
              : prev,
          );
        }
      },
      [matterId, load],
    );

    // ── Delete ──────────────────────────────────────────────────
    const remove = useCallback(
      async (id: string) => {
        if (!confirm("Karte entfernen?")) return;
        const snapshot = artifacts;
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

    // ── DnD reorder ─────────────────────────────────────────────
    const handleDragEnd = useCallback(
      async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !artifacts) return;

        const oldIndex = artifacts.findIndex((a) => a.id === active.id);
        const newIndex = artifacts.findIndex((a) => a.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        // Optimistic reorder
        const reordered = arrayMove(artifacts, oldIndex, newIndex);
        setArtifacts(reordered);

        // Persist — assign new sequential positions starting at 1.
        // Server validates ownership in a single transaction.
        try {
          const res = await fetch(`/api/network/matter/${matterId}/artifacts`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order: reordered.map((a, i) => ({
                id: a.id,
                position: i + 1,
              })),
            }),
          });
          if (!res.ok) throw new Error("Reorder fehlgeschlagen");
        } catch {
          // Revert to server-authoritative order
          await load();
        }
      },
      [artifacts, matterId, load],
    );

    // ── Render states ───────────────────────────────────────────
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

    return (
      <>
        {/* Tasks + Notes always at the top — they're not artifacts,
            they're live mutable entities with their own CRUD drawers.
            Sit above the artifacts grid so the lawyer can see open
            work + recent notes at a glance without scrolling. */}
        <SystemCards matterId={matterId} />

        <ManualCardComposer matterId={matterId} onCreated={load} />

        {artifacts.length === 0 ? (
          <EmptyBoardHint />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={artifacts.map((a) => a.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="
                  grid gap-4 px-6 py-6
                  grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4
                  auto-rows-min
                "
              >
                {artifacts.map((a) => (
                  <SortableCard
                    key={a.id}
                    artifact={a}
                    onTogglePin={togglePin}
                    onDelete={remove}
                    onClick={() => setDetail(a)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <ArtifactDetailDrawer
          artifact={detail}
          onClose={() => setDetail(null)}
        />
      </>
    );
  },
);

// ─── Sortable wrapper ────────────────────────────────────────────────
//
// Wraps ArtifactCard with @dnd-kit's `useSortable` hook. Exposes the
// drag listeners on the whole card (so the user can grab anywhere)
// while still allowing the inner action buttons (pin/delete) and the
// onClick→detail handler to work, thanks to:
//   - PointerSensor activationConstraint=8px (click stays click)
//   - stopPropagation on the action buttons (handled inside ArtifactCard)
// The "large" widthHint spans 2 columns so memos still feel prominent.

function SortableCard({
  artifact,
  onTogglePin,
  onDelete,
  onClick,
}: {
  artifact: PinboardArtifact;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: artifact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  } as const;

  // Wrap entire card in the sortable handle — except clicks on
  // action buttons or links bubble up. We also forward onClick on
  // the wrapper so a NON-dragged click opens the detail drawer.
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Skip click forwarding when the click came from an inline
        // button or anchor (pin / delete / "Quelle öffnen") — those
        // have their own handlers and shouldn't open the drawer.
        const target = e.target as HTMLElement;
        if (target.closest("button, a")) return;
        onClick();
      }}
      className={`${
        artifact.widthHint === "large" ? "sm:col-span-2" : ""
      } cursor-pointer`}
    >
      <ArtifactCard
        artifact={artifact}
        onTogglePin={onTogglePin}
        onDelete={onDelete}
      />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────

function EmptyBoardHint() {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-10 h-10 rounded-full bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mb-2">
          <Sparkles size={14} strokeWidth={1.5} className="text-white/45" />
        </div>
        <p className="text-[12px] text-white/40 leading-relaxed">
          Noch keine Karten von Claude. Stelle ihm links eine Frage —
          Compliance-Abrufe, Quellen­suchen oder Memos landen hier automatisch.
        </p>
      </div>
    </div>
  );
}
