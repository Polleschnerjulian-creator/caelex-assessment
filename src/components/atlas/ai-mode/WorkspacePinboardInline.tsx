"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * WorkspacePinboardInline — embedded Pinboard panel for the Atlas
 * AI Mode. Mirrors the chat-mode transition (orb shifts to corner,
 * conversation panel fills the centre) — but renders a Pinboard with
 * pinnable cards instead of a chat thread.
 *
 * In-memory state for now. Persistence (lazy-create a STANDALONE
 * matter on first card-pin) is wired up in matter-service but not
 * yet hooked here — it follows once the live DB has the LegalMatter
 * schema deployed.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useState } from "react";
import { Plus, X, Inbox } from "lucide-react";

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
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderRadius: 999,
          background: "rgba(15, 15, 15, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          color: "rgba(245, 245, 244, 0.9)",
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 500,
          pointerEvents: "auto",
        }}
      >
        <Inbox size={14} strokeWidth={1.5} style={{ opacity: 0.7 }} />
        <span>Workspace</span>
        <span
          style={{
            opacity: 0.4,
            fontSize: 10,
            letterSpacing: "0.05em",
            textTransform: "none",
          }}
        >
          {cards.length} {cards.length === 1 ? "Karte" : "Karten"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Workspace schliessen"
          style={{
            marginLeft: 8,
            padding: 4,
            background: "transparent",
            border: 0,
            color: "rgba(245, 245, 244, 0.55)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Card grid — clipped to a centered area, leaving the corner for the
          minimised orb. */}
      <div
        style={{
          position: "absolute",
          top: 96,
          right: 48,
          bottom: 200,
          left: "30%",
          overflowY: "auto",
          padding: 24,
          pointerEvents: "auto",
        }}
      >
        {cards.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 12,
              color: "rgba(245, 245, 244, 0.4)",
              fontSize: 13,
              letterSpacing: "-0.01em",
              fontWeight: 400,
            }}
          >
            <Inbox size={28} strokeWidth={1.2} style={{ opacity: 0.4 }} />
            <p style={{ margin: 0, textAlign: "center", maxWidth: 360 }}>
              Leerer Workspace. Pinne Notizen, Atlas-Antworten und Quellen ein —
              alles bleibt hier in der Bühne.
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(245, 245, 244, 0.85)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "-0.005em",
                cursor: "pointer",
              }}
            >
              <Plus size={12} strokeWidth={1.8} />
              Erste Karte anpinnen
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
              alignContent: "start",
            }}
          >
            {cards.map((card) => (
              <article
                key={card.id}
                style={{
                  position: "relative",
                  background: "rgba(20, 20, 22, 0.62)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: 14,
                  backdropFilter: "blur(14px)",
                  color: "rgba(245, 245, 244, 0.88)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  letterSpacing: "-0.005em",
                }}
              >
                <button
                  type="button"
                  onClick={() => onRemoveCard(card.id)}
                  aria-label="Karte entfernen"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    padding: 4,
                    background: "transparent",
                    border: 0,
                    color: "rgba(245, 245, 244, 0.32)",
                    cursor: "pointer",
                    display: "inline-flex",
                  }}
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
                <h3
                  style={{
                    margin: "0 24px 6px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "rgba(245, 245, 244, 0.95)",
                  }}
                >
                  {card.title}
                </h3>
                {card.content && (
                  <p
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      color: "rgba(245, 245, 244, 0.7)",
                    }}
                  >
                    {card.content}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Floating composer toggle */}
      {cards.length > 0 && !composerOpen && (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          aria-label="Karte hinzufuegen"
          style={{
            position: "absolute",
            right: 48,
            bottom: 220,
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.95)",
            color: "#0a0a0b",
            border: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
            pointerEvents: "auto",
          }}
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      )}

      {/* Composer */}
      {composerOpen && (
        <div
          style={{
            position: "absolute",
            right: 48,
            bottom: 200,
            width: 380,
            background: "rgba(15, 15, 15, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 14,
            padding: 14,
            backdropFilter: "blur(20px)",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <input
            type="text"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={{
              background: "transparent",
              border: 0,
              outline: "none",
              color: "rgba(245, 245, 244, 0.95)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              padding: "4px 0",
            }}
          />
          <textarea
            placeholder="Notiz, Zitat, Atlas-Antwort..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{
              background: "transparent",
              border: 0,
              outline: "none",
              color: "rgba(245, 245, 244, 0.78)",
              fontSize: 12,
              lineHeight: 1.5,
              letterSpacing: "-0.005em",
              padding: "4px 0",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              paddingTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                setTitle("");
                setContent("");
              }}
              style={{
                padding: "6px 10px",
                background: "transparent",
                border: 0,
                color: "rgba(245, 245, 244, 0.5)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!title.trim() && !content.trim()}
              style={{
                padding: "6px 12px",
                background: "rgba(245, 245, 244, 0.92)",
                border: 0,
                borderRadius: 6,
                color: "#0a0a0b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                opacity: !title.trim() && !content.trim() ? 0.4 : 1,
              }}
            >
              Anpinnen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
