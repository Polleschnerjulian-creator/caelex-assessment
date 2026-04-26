"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * WorkspacePinboardInline — full-stage liquid-glass panel that wraps
 * the Atlas AI Mode when the user opens a workspace. The panel covers
 * the entire stage, but uses a `mask-image` radial-gradient cutout
 * so the minimised orb (top-left) shines through cleanly. Cards flow
 * to the right of the cutout; composer floats bottom-right.
 *
 * Pure UI — no DB calls. Cards live in component state for now.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  X,
  Inbox,
  Sparkles,
  Loader2,
  PencilLine,
  BookText,
  User,
} from "lucide-react";
import styles from "./workspace-pinboard.module.css";

// ─── Radial menu options ──────────────────────────────────────────────
//
// Four card-add archetypes. Each just opens the composer pre-filled
// with type-appropriate placeholders for now. Future versions can
// route source/client to dedicated pickers (Atlas-corpus search,
// client-profile form), and `ask` to a one-shot AI prompt.

type CardArchetype = "note" | "source" | "client" | "ask";

interface RadialOption {
  id: CardArchetype;
  icon: typeof PencilLine;
  label: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
}

const RADIAL_OPTIONS: RadialOption[] = [
  {
    id: "note",
    icon: PencilLine,
    label: "Notiz",
    titlePlaceholder: "Titel",
    contentPlaceholder: "Notiz, Gedanke, Stichwort...",
  },
  {
    id: "source",
    icon: BookText,
    label: "Quelle",
    titlePlaceholder: "z.B. § 7 EU Space Act",
    contentPlaceholder: "Wortlaut, Auszug, Fundstelle...",
  },
  {
    id: "client",
    icon: User,
    label: "Mandant",
    titlePlaceholder: "Mandant-Name",
    contentPlaceholder: "Sitz, Branche, offene Rechtsfragen...",
  },
  {
    id: "ask",
    icon: Sparkles,
    label: "Atlas fragen",
    titlePlaceholder: "Frage an Atlas",
    contentPlaceholder: "Was soll Atlas zu den anderen Karten beantworten?",
  },
];

export interface WorkspaceCard {
  id: string;
  /** "user" — manually authored note. "ai-clause" — synthesised by
   *  Atlas from other cards on the board. Drives visual style and
   *  whether the card is included in future synthesis context. */
  kind?: "user" | "ai-clause";
  title: string;
  content: string;
  createdAt: number;
  /** For ai-clause: the IDs of the cards Atlas drew from. Lets us
   *  show "based on cards X, Y" in the UI later. */
  sourceCardIds?: string[];
}

interface Props {
  cards: WorkspaceCard[];
  onAddCard: (card: Omit<WorkspaceCard, "id" | "createdAt">) => void;
  onRemoveCard: (id: string) => void;
  onClose: () => void;
}

export function WorkspacePinboardInline({
  cards,
  onAddCard,
  onRemoveCard,
  onClose,
}: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerArchetype, setComposerArchetype] =
    useState<CardArchetype>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);

  // Radial menu — null when closed, {x, y} (viewport coords) when open.
  // Right-click anywhere on the pinboard pops it at the cursor.
  const [radialMenu, setRadialMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const openRadialMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only fire when right-clicking the panel surface itself, not
    // when the user right-clicks an already-pinned card or the
    // composer (which need their native context menu for
    // copy/paste).
    const target = e.target as HTMLElement;
    if (
      target.closest(`.${styles.card}`) ||
      target.closest(`.${styles.composer}`) ||
      target.closest(`.${styles.headerPill}`)
    ) {
      return;
    }
    e.preventDefault();
    setRadialMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeRadialMenu = useCallback(() => setRadialMenu(null), []);

  const pickArchetype = useCallback((archetype: CardArchetype) => {
    setComposerArchetype(archetype);
    setRadialMenu(null);
    setComposerOpen(true);
    setTitle("");
    setContent("");
  }, []);

  // Outside-click + ESC close the radial menu.
  useEffect(() => {
    if (!radialMenu) return;
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      // For mouse events, the click on the radial item itself closes
      // via pickArchetype; this catches clicks elsewhere.
      if (e instanceof MouseEvent) {
        const t = e.target as HTMLElement;
        if (t.closest(`.${styles.radialMenu}`)) return;
      }
      setRadialMenu(null);
    };
    document.addEventListener("click", handler as EventListener);
    document.addEventListener("keydown", handler as EventListener);
    return () => {
      document.removeEventListener("click", handler as EventListener);
      document.removeEventListener("keydown", handler as EventListener);
    };
  }, [radialMenu]);

  const activeArchetype =
    RADIAL_OPTIONS.find((o) => o.id === composerArchetype) ?? RADIAL_OPTIONS[0];

  const submit = useCallback(() => {
    const t = title.trim();
    const c = content.trim();
    if (!t && !c) return;
    onAddCard({ kind: "user", title: t || "Notiz", content: c });
    setTitle("");
    setContent("");
    setComposerOpen(false);
  }, [title, content, onAddCard]);

  // Only user-authored cards seed the synthesis. AI-generated clauses
  // could go in too in principle, but the first version keeps the
  // signal clean: synthesise from human-pinned material only.
  const synthesisInputCards = cards.filter((c) => c.kind !== "ai-clause");
  const canSynthesize = synthesisInputCards.length >= 2 && !synthesizing;

  const synthesize = useCallback(async () => {
    setSynthError(null);
    setSynthesizing(true);
    try {
      const res = await fetch("/api/atlas/workspace/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: synthesisInputCards.map((c) => ({
            id: c.id,
            title: c.title,
            content: c.content,
          })),
        }),
      });
      const json = (await res.json()) as {
        title?: string;
        content?: string;
        error?: string;
      };
      if (!res.ok || !json.content) {
        setSynthError(json.error ?? "Synthese fehlgeschlagen");
        return;
      }
      onAddCard({
        kind: "ai-clause",
        title: json.title ?? "Synthetisierte Klausel",
        content: json.content,
        sourceCardIds: synthesisInputCards.map((c) => c.id),
      });
    } catch (err) {
      setSynthError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSynthesizing(false);
    }
  }, [synthesisInputCards, onAddCard]);

  return (
    /* Wrapper carries the CSS-Variables (--ws-orb-x, etc.) so they
       cascade down to the panel + cutout-ring + content children.
       Defining them on `:root` would be a global selector which the
       CSS-Module loader rejects. The wrapper itself is a transparent
       full-stage layer — no visuals beyond the var scope. */
    <div className={styles.root} onContextMenu={openRadialMenu}>
      {/* The liquid-glass panel itself — full-stage rect with a radial
          mask cutout for the minimised orb in the top-left. The panel
          visually wraps the orb without painting over it. */}
      <div className={styles.glassPanel} aria-hidden />

      {/* The orb-cutout ring — a thin highlight around the cutout edge
          so the boundary between panel and orb-pocket reads cleanly. */}
      <div className={styles.cutoutRing} aria-hidden />

      {/* Content layer sits above the glass panel. pointer-events: none
          on the layer, auto on individual children, so empty zones
          stay click-through. */}
      <div className={styles.content}>
        {/* Header pill (top-center) */}
        <div className={styles.headerPill}>
          <Inbox size={14} strokeWidth={1.5} className={styles.headerIcon} />
          <span className={styles.headerLabel}>Workspace</span>
          <span className={styles.headerCount}>
            {cards.length} {cards.length === 1 ? "Karte" : "Karten"}
          </span>
          {/* Synthesize action — only available with 2+ user cards.
              Pulls every user card on the board into a synthesis prompt
              and adds the AI's clause as a new card. */}
          {synthesisInputCards.length >= 2 && (
            <button
              type="button"
              onClick={synthesize}
              disabled={!canSynthesize}
              aria-label="Klausel synthetisieren"
              className={styles.headerSynthesize}
            >
              {synthesizing ? (
                <Loader2
                  size={12}
                  strokeWidth={2}
                  className={styles.headerSpin}
                />
              ) : (
                <Sparkles size={12} strokeWidth={1.8} />
              )}
              <span>
                {synthesizing ? "Synthetisiere..." : "Klausel synthetisieren"}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Workspace schliessen"
            className={styles.headerClose}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Synthesis error pill */}
        {synthError && (
          <div className={styles.synthError} role="alert">
            <span>{synthError}</span>
            <button
              type="button"
              onClick={() => setSynthError(null)}
              aria-label="Fehler schliessen"
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Card area — right of the cutout, leaves room for composer
            at bottom. */}
        <div className={styles.cardArea}>
          {cards.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={32} strokeWidth={1.1} className={styles.emptyIcon} />
              <p className={styles.emptyText}>
                Leerer Workspace.
                <br />
                Pinne Notizen, Atlas-Antworten und Quellen ein —
                <br />
                alles bleibt hier in der Bühne.
              </p>
              <button
                type="button"
                onClick={() => pickArchetype("note")}
                className={styles.emptyCta}
              >
                <Plus size={13} strokeWidth={1.8} />
                Erste Karte anpinnen
              </button>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {cards.map((card) => {
                const isAi = card.kind === "ai-clause";
                return (
                  <article
                    key={card.id}
                    className={`${styles.card} ${isAi ? styles.cardAi : ""}`}
                  >
                    {isAi && (
                      <div className={styles.cardAiBadge}>
                        <Sparkles size={10} strokeWidth={2} />
                        <span>Atlas-Klausel</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveCard(card.id)}
                      aria-label="Karte entfernen"
                      className={styles.cardRemove}
                    >
                      <X size={12} strokeWidth={1.5} />
                    </button>
                    <h3 className={styles.cardTitle}>{card.title}</h3>
                    {card.content && (
                      <p className={styles.cardContent}>{card.content}</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Composer — floating bottom-right. Either the +-button or the
            full input box. */}
        {cards.length > 0 && !composerOpen && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label="Karte hinzufuegen"
            className={styles.fab}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        )}
        {composerOpen && (
          <div className={styles.composer}>
            {/* Type-tag at the top so user knows what kind of card
                they're authoring after picking from the radial menu. */}
            <div className={styles.composerTypeTag}>
              <activeArchetype.icon size={11} strokeWidth={1.8} />
              <span>{activeArchetype.label}</span>
            </div>
            <input
              type="text"
              placeholder={activeArchetype.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className={styles.composerTitle}
            />
            <textarea
              placeholder={activeArchetype.contentPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className={styles.composerBody}
            />
            <div className={styles.composerActions}>
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setTitle("");
                  setContent("");
                }}
                className={styles.composerCancel}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!title.trim() && !content.trim()}
                className={styles.composerSubmit}
              >
                Anpinnen
              </button>
            </div>
          </div>
        )}

        {/* Radial menu — pops at the cursor on right-click. Four arcs
            distributed evenly, each opens the composer pre-filled
            with the matching card archetype. */}
        {radialMenu && (
          <div
            className={styles.radialMenu}
            style={{ left: radialMenu.x, top: radialMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
            role="menu"
          >
            {/* Center hint dot */}
            <div className={styles.radialCenter} />
            {RADIAL_OPTIONS.map((opt, i) => {
              const total = RADIAL_OPTIONS.length;
              // Start the first item at 12 o'clock and distribute clockwise.
              const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
              const radius = 72;
              const dx = Math.cos(angle) * radius;
              const dy = Math.sin(angle) * radius;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  aria-label={opt.label}
                  className={styles.radialItem}
                  style={{
                    transform: `translate(calc(${dx}px - 50%), calc(${dy}px - 50%))`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    pickArchetype(opt.id);
                  }}
                >
                  <Icon size={16} strokeWidth={1.7} />
                  <span className={styles.radialLabel}>{opt.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Menü schliessen"
              onClick={(e) => {
                e.stopPropagation();
                closeRadialMenu();
              }}
              className={styles.radialClose}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
