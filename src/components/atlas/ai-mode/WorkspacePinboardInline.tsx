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

import { useCallback, useState } from "react";
import { Plus, X, Inbox } from "lucide-react";
import styles from "./workspace-pinboard.module.css";

export interface WorkspaceCard {
  id: string;
  title: string;
  content: string;
  createdAt: number;
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const submit = useCallback(() => {
    const t = title.trim();
    const c = content.trim();
    if (!t && !c) return;
    onAddCard({ title: t || "Notiz", content: c });
    setTitle("");
    setContent("");
    setComposerOpen(false);
  }, [title, content, onAddCard]);

  return (
    /* Wrapper carries the CSS-Variables (--ws-orb-x, etc.) so they
       cascade down to the panel + cutout-ring + content children.
       Defining them on `:root` would be a global selector which the
       CSS-Module loader rejects. The wrapper itself is a transparent
       full-stage layer — no visuals beyond the var scope. */
    <div className={styles.root}>
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Workspace schliessen"
            className={styles.headerClose}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

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
                onClick={() => setComposerOpen(true)}
                className={styles.emptyCta}
              >
                <Plus size={13} strokeWidth={1.8} />
                Erste Karte anpinnen
              </button>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {cards.map((card) => (
                <article key={card.id} className={styles.card}>
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
              ))}
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
            <input
              type="text"
              placeholder="Titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className={styles.composerTitle}
            />
            <textarea
              placeholder="Notiz, Zitat, Atlas-Antwort..."
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
      </div>
    </div>
  );
}
