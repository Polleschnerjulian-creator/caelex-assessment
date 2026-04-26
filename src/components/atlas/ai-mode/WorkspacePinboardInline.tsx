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

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  Inbox,
  Sparkles,
  Loader2,
  PencilLine,
  BookText,
  User,
  Search,
  Globe,
  Shield,
  Scale,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Pencil,
} from "lucide-react";
import styles from "./workspace-pinboard.module.css";

// ─── Konflikt-Detection ───────────────────────────────────────────────
//
// "Konflikte prüfen" runs Atlas-AI over all user-pinned cards and
// surfaces real contradictions / scope mismatches / gaps. Returned
// conflicts are stored locally — no DB persistence yet.

interface Conflict {
  cardAId: string;
  cardBId: string;
  severity: "high" | "medium" | "low";
  summary: string;
  explanation: string;
}

// ─── Corpus search ────────────────────────────────────────────────────
//
// The "Quelle" archetype opens a picker that searches the Atlas
// regulatory corpus (EU Space Act, NIS2, national space laws). Hits
// are pinned as cards with the proper citation.

interface CorpusHit {
  id: string;
  kind: "eu" | "nis2" | "nat";
  title: string;
  content: string;
  citation: string;
  jurisdiction?: string;
  officialUrl?: string;
}

/** Per-kind icon for the result list. Helps the lawyer scan results
 *  quickly without reading the kind badge text. */
const KIND_ICON: Record<CorpusHit["kind"], typeof Globe> = {
  eu: Globe,
  nis2: Shield,
  nat: Scale,
};
const KIND_LABEL: Record<CorpusHit["kind"], string> = {
  eu: "EU Space Act",
  nis2: "NIS2",
  nat: "National",
};

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
   *  Atlas from other cards on the board. "ai-answer" — Atlas's
   *  reply to a question asked via the radial-menu's "Atlas fragen"
   *  archetype. Drives visual style and whether the card is included
   *  in future synthesis context. */
  kind?: "user" | "ai-clause" | "ai-answer";
  title: string;
  content: string;
  createdAt: number;
  /** For ai-clause and ai-answer: the IDs of the cards Atlas drew
   *  from. Lets us show "based on cards X, Y" in the UI later. */
  sourceCardIds?: string[];
  /** For ai-answer: the original question the user typed. Lets us
   *  show "Frage:" inline and allow re-asking later. */
  question?: string;
}

interface WorkspaceSummary {
  id: string;
  title: string;
  cardCount: number;
  updatedAt: string;
}

interface Props {
  cards: WorkspaceCard[];
  /** Initial-load indicator — shown while AIMode is fetching the
   *  workspace list / creating the first one. */
  loading?: boolean;
  /** All non-archived workspaces for this user, used to build the
   *  switcher dropdown. */
  workspaces?: WorkspaceSummary[];
  /** Currently-active workspace id. Drives the title shown in the
   *  switcher and which workspace receives new cards. */
  currentWorkspaceId?: string | null;
  onAddCard: (card: Omit<WorkspaceCard, "id" | "createdAt">) => void;
  onRemoveCard: (id: string) => void;
  /** Switch to a different workspace; AIMode will load its cards. */
  onSwitchWorkspace?: (id: string) => void;
  /** Create a fresh workspace (server-side) and switch to it. */
  onCreateWorkspace?: (title?: string) => void;
  /** Rename the workspace with id. */
  onRenameWorkspace?: (id: string, title: string) => void;
  /** Delete the workspace; cascades to all its cards. */
  onDeleteWorkspace?: (id: string) => void;
  onClose: () => void;
}

export function WorkspacePinboardInline({
  cards,
  loading,
  workspaces,
  currentWorkspaceId,
  onAddCard,
  onRemoveCard,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onClose,
}: Props) {
  // Switcher dropdown open state. Click outside or pick a workspace
  // closes it.
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Inline title-editing state — when the lawyer double-clicks the
  // current workspace title in the header, we swap to an input.
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const currentWorkspace = workspaces?.find((w) => w.id === currentWorkspaceId);

  // Close the switcher on outside-click. ESC also closes — a Linear-
  // style escape hatch since the switcher takes over input focus
  // when it's open.
  useEffect(() => {
    if (!switcherOpen) return;
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent) {
        const t = e.target as HTMLElement;
        if (t.closest(`.${styles.switcher}`)) return;
      }
      setSwitcherOpen(false);
    };
    document.addEventListener("click", handler as EventListener);
    document.addEventListener("keydown", handler as EventListener);
    return () => {
      document.removeEventListener("click", handler as EventListener);
      document.removeEventListener("keydown", handler as EventListener);
    };
  }, [switcherOpen]);

  // Submit title rename. Called on blur or Enter.
  const commitRename = useCallback(() => {
    setEditingTitle(false);
    const next = titleDraft.trim();
    if (
      currentWorkspace &&
      next &&
      next !== currentWorkspace.title &&
      onRenameWorkspace
    ) {
      onRenameWorkspace(currentWorkspace.id, next);
    }
  }, [currentWorkspace, titleDraft, onRenameWorkspace]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerArchetype, setComposerArchetype] =
    useState<CardArchetype>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  // "Atlas fragen" round-trip is async too — separate state so the
  // synthesize button + ask-composer don't confuse each other.
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // Corpus picker — used when archetype is "source". Keeps the user-
  // typed query separate from the title field above (the title is the
  // pinned card's label, the query is just the search input).
  const [corpusQuery, setCorpusQuery] = useState("");
  const [corpusHits, setCorpusHits] = useState<CorpusHit[]>([]);
  const [corpusLoading, setCorpusLoading] = useState(false);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  // Default to all kinds enabled. The chip-row can toggle each.
  const [corpusKinds, setCorpusKinds] = useState<Set<CorpusHit["kind"]>>(
    () => new Set(["eu", "nis2", "nat"]),
  );
  // Keep the latest in-flight request id so a slow earlier response
  // doesn't overwrite a faster later one (race condition guard).
  const corpusReqRef = useRef(0);

  // Konflikt-state — list of detected conflicts plus the in-flight
  // marker for the header button. `conflictsLastRunAt` lets us show
  // "vor 2 min geprüft" so the lawyer knows the result is fresh.
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictsLastRunAt, setConflictsLastRunAt] = useState<number | null>(
    null,
  );
  // Whether the conflict-detail panel is expanded. Starts collapsed
  // even when there are conflicts — the count pill is enough at a
  // glance, the lawyer expands when ready.
  const [conflictPanelOpen, setConflictPanelOpen] = useState(false);
  // Highlighted card id (from clicking a conflict in the panel).
  // Triggers a yellow flash on the matching card and scrolls it into
  // view. Cleared after the flash animation.
  const [flashCardId, setFlashCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

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
    // Reset corpus state when entering/exiting the picker so old
    // results don't flash on the next open.
    setCorpusQuery("");
    setCorpusHits([]);
    setCorpusError(null);
  }, []);

  // Debounced corpus search — only active when the source-archetype
  // picker is open. 250ms delay keeps roundtrips down without feeling
  // sluggish; empty query fetches the first page so the user sees
  // "browse" results immediately on opening.
  useEffect(() => {
    if (!composerOpen || composerArchetype !== "source") return;
    const reqId = ++corpusReqRef.current;
    const kinds = Array.from(corpusKinds).join(",");
    const t = setTimeout(async () => {
      setCorpusLoading(true);
      setCorpusError(null);
      try {
        const url = `/api/atlas/workspace/corpus-search?q=${encodeURIComponent(
          corpusQuery,
        )}&kinds=${kinds}&limit=30`;
        const res = await fetch(url);
        const json = (await res.json()) as {
          hits?: CorpusHit[];
          error?: string;
        };
        // Late-arriving response: ignore.
        if (reqId !== corpusReqRef.current) return;
        if (!res.ok) {
          setCorpusError(json.error ?? "Suche fehlgeschlagen");
          setCorpusHits([]);
          return;
        }
        setCorpusHits(json.hits ?? []);
      } catch (err) {
        if (reqId !== corpusReqRef.current) return;
        setCorpusError(err instanceof Error ? err.message : "Fehler");
      } finally {
        if (reqId === corpusReqRef.current) {
          setCorpusLoading(false);
        }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [composerOpen, composerArchetype, corpusQuery, corpusKinds]);

  /** Pin a corpus hit as a user-card. Citation is prepended to the
   *  content so the card is self-contained — the lawyer can read the
   *  source without re-opening the picker. */
  const pinHit = useCallback(
    (hit: CorpusHit) => {
      onAddCard({
        kind: "user",
        title: hit.title,
        content: `${hit.citation}\n\n${hit.content}`,
      });
      // Close the composer after pinning; user can re-open via radial
      // menu for the next source.
      setComposerOpen(false);
      setCorpusQuery("");
      setCorpusHits([]);
    },
    [onAddCard],
  );

  /** Toggle a kind chip in the corpus filter row. */
  const toggleCorpusKind = useCallback((kind: CorpusHit["kind"]) => {
    setCorpusKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        // Don't allow zero-kinds (would always return empty results).
        if (next.size === 1) return prev;
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
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

  // User-card branch: title or content suffice. Pins synchronously.
  // Ask-branch: requires non-empty content (the question itself), and
  // routes through Atlas-AI to produce an `ai-answer` card.
  const submit = useCallback(async () => {
    const t = title.trim();
    const c = content.trim();
    if (composerArchetype === "ask") {
      // For ask, the question lives in the textarea (`content`). Title
      // is optional — if missing, Atlas's response title takes over.
      if (!c) return;
      setAskError(null);
      setAsking(true);
      try {
        // Send all *other* user-pinned cards along as context. AI cards
        // are excluded — we don't want Atlas building on top of its own
        // earlier output unless the user explicitly pinned it as ground.
        const contextCards = cards
          .filter((card) => card.kind !== "ai-answer")
          .map((card) => ({ title: card.title, content: card.content }));
        const res = await fetch("/api/atlas/workspace/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: c,
            contextCards: contextCards.length > 0 ? contextCards : undefined,
          }),
        });
        const json = (await res.json()) as {
          title?: string;
          content?: string;
          error?: string;
        };
        if (!res.ok || !json.content) {
          setAskError(json.error ?? "Atlas-Frage fehlgeschlagen");
          return;
        }
        onAddCard({
          kind: "ai-answer",
          title: t || json.title || c.slice(0, 80),
          content: json.content,
          question: c,
          sourceCardIds: cards
            .filter((card) => card.kind !== "ai-answer")
            .map((card) => card.id),
        });
        setTitle("");
        setContent("");
        setComposerOpen(false);
      } catch (err) {
        setAskError(err instanceof Error ? err.message : "Fehler");
      } finally {
        setAsking(false);
      }
      return;
    }

    // Default branch — note / source / client all just pin a user card.
    if (!t && !c) return;
    onAddCard({ kind: "user", title: t || "Notiz", content: c });
    setTitle("");
    setContent("");
    setComposerOpen(false);
  }, [title, content, composerArchetype, cards, onAddCard]);

  // Only user-authored cards seed the synthesis. AI-generated clauses
  // could go in too in principle, but the first version keeps the
  // signal clean: synthesise from human-pinned material only.
  const synthesisInputCards = cards.filter((c) => c.kind !== "ai-clause");
  const canSynthesize = synthesisInputCards.length >= 2 && !synthesizing;

  /** Run Atlas conflict-detection over all user cards. AI cards are
   *  excluded because we don't want to flag Atlas's own derivatives
   *  as conflicts with the human inputs they were built from. */
  const checkConflicts = useCallback(async () => {
    setConflictError(null);
    setCheckingConflicts(true);
    try {
      const inputCards = cards
        .filter((c) => c.kind !== "ai-clause" && c.kind !== "ai-answer")
        .map((c) => ({ id: c.id, title: c.title, content: c.content }));
      if (inputCards.length < 2) {
        setConflicts([]);
        setConflictsLastRunAt(Date.now());
        return;
      }
      const res = await fetch("/api/atlas/workspace/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: inputCards }),
      });
      const json = (await res.json()) as {
        conflicts?: Conflict[];
        error?: string;
      };
      if (!res.ok) {
        setConflictError(json.error ?? "Konflikt-Pruefung fehlgeschlagen");
        return;
      }
      setConflicts(json.conflicts ?? []);
      setConflictsLastRunAt(Date.now());
      // Auto-open the panel only when conflicts are found; if Atlas
      // came back clean, the green pill is enough — no need to push
      // an empty drawer at the lawyer.
      if ((json.conflicts ?? []).length > 0) {
        setConflictPanelOpen(true);
      }
    } catch (err) {
      setConflictError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setCheckingConflicts(false);
    }
  }, [cards]);

  /** Scroll a card into view and trigger the flash animation. Used
   *  when the user clicks a conflict-row in the detail panel. */
  const focusCard = useCallback((id: string) => {
    const el = cardRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setFlashCardId(id);
    // Clear after the flash animation completes so re-clicking the
    // same card re-triggers the highlight.
    window.setTimeout(() => setFlashCardId(null), 1200);
  }, []);

  // Invalidate previous conflict results when the card set changes.
  // The lawyer adds/removes a card — old conflicts may no longer
  // apply, so we drop them and the lawyer re-runs the check.
  // We track card-id-set as a stable string key so we don't fire on
  // unrelated re-renders.
  const cardIdSetKey = cards
    .filter((c) => c.kind !== "ai-clause" && c.kind !== "ai-answer")
    .map((c) => c.id)
    .sort()
    .join("|");
  const lastCardIdSetRef = useRef<string>(cardIdSetKey);
  useEffect(() => {
    if (lastCardIdSetRef.current !== cardIdSetKey) {
      lastCardIdSetRef.current = cardIdSetKey;
      // Only invalidate if conflicts were actually loaded — don't
      // clobber the panel state on every keystroke during composer.
      setConflicts((prev) => (prev.length > 0 ? [] : prev));
      setConflictsLastRunAt(null);
      setConflictPanelOpen(false);
    }
  }, [cardIdSetKey]);

  // Build a Set of card ids that are involved in any conflict — used
  // to mark cards visually with a red border + warning badge.
  const conflictedCardIds = new Set<string>();
  for (const c of conflicts) {
    conflictedCardIds.add(c.cardAId);
    conflictedCardIds.add(c.cardBId);
  }

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
          {/* Workspace title — double-click to rename. Switcher opens
              from the chevron-button to the right of the title. */}
          {editingTitle && currentWorkspace ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              autoFocus
              className={styles.headerTitleInput}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => {
                if (!currentWorkspace) return;
                setTitleDraft(currentWorkspace.title);
                setEditingTitle(true);
              }}
              onClick={() =>
                workspaces &&
                workspaces.length > 0 &&
                setSwitcherOpen((s) => !s)
              }
              className={styles.headerLabelButton}
              aria-label="Workspace wechseln"
            >
              <span className={styles.headerLabel}>
                {currentWorkspace?.title ?? "Workspace"}
              </span>
              {workspaces && workspaces.length > 0 && (
                <ChevronDown
                  size={11}
                  strokeWidth={2}
                  className={`${styles.headerChevron} ${
                    switcherOpen ? styles.headerChevronOpen : ""
                  }`}
                />
              )}
            </button>
          )}
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

          {/* Konflikte prüfen — sibling action to synthesize. Toggles
              a state-variant pill: amber+count when conflicts exist,
              emerald check when board is clean. */}
          {synthesisInputCards.length >= 2 &&
            (conflicts.length > 0 ? (
              <button
                type="button"
                onClick={() => setConflictPanelOpen((o) => !o)}
                aria-label="Konfliktdetails anzeigen"
                className={`${styles.headerConflict} ${styles.headerConflictActive}`}
              >
                <AlertTriangle size={12} strokeWidth={1.8} />
                <span>
                  {conflicts.length}{" "}
                  {conflicts.length === 1 ? "Konflikt" : "Konflikte"}
                </span>
              </button>
            ) : conflictsLastRunAt && !checkingConflicts ? (
              <button
                type="button"
                onClick={checkConflicts}
                aria-label="Konflikte erneut pruefen"
                className={`${styles.headerConflict} ${styles.headerConflictClean}`}
              >
                <CheckCircle2 size={12} strokeWidth={1.8} />
                <span>Konfliktfrei</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={checkConflicts}
                disabled={checkingConflicts}
                aria-label="Konflikte pruefen"
                className={styles.headerConflict}
              >
                {checkingConflicts ? (
                  <Loader2
                    size={12}
                    strokeWidth={2}
                    className={styles.headerSpin}
                  />
                ) : (
                  <AlertTriangle size={12} strokeWidth={1.8} />
                )}
                <span>
                  {checkingConflicts ? "Pruefe..." : "Konflikte pruefen"}
                </span>
              </button>
            ))}
          <button
            type="button"
            onClick={onClose}
            aria-label="Workspace schliessen"
            className={styles.headerClose}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Workspace switcher dropdown — opens below the header pill,
            shows all of the user's workspaces with quick rename/delete
            affordances and a "+ Neuer Workspace" footer. */}
        {switcherOpen && workspaces && (
          <div className={styles.switcher} role="menu">
            <div className={styles.switcherHead}>
              <span>Workspaces</span>
              <span className={styles.switcherHint}>{workspaces.length}</span>
            </div>
            <div className={styles.switcherList}>
              {workspaces.map((w) => {
                const isCurrent = w.id === currentWorkspaceId;
                return (
                  <div
                    key={w.id}
                    className={`${styles.switcherRow} ${
                      isCurrent ? styles.switcherRowActive : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCurrent) onSwitchWorkspace?.(w.id);
                        setSwitcherOpen(false);
                      }}
                      className={styles.switcherRowMain}
                    >
                      <Inbox size={11} strokeWidth={1.6} />
                      <span className={styles.switcherRowTitle}>{w.title}</span>
                      <span className={styles.switcherRowCount}>
                        {w.cardCount}
                      </span>
                    </button>
                    {/* Inline rename — only for the active workspace
                        because non-active rename means switching first
                        anyway, and reducing affordances keeps the row
                        clean. */}
                    {isCurrent && onRenameWorkspace && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTitleDraft(w.title);
                          setEditingTitle(true);
                          setSwitcherOpen(false);
                        }}
                        aria-label="Umbenennen"
                        className={styles.switcherRowAction}
                      >
                        <Pencil size={11} strokeWidth={1.7} />
                      </button>
                    )}
                    {onDeleteWorkspace && workspaces.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Confirm only if there are cards to lose;
                          // empty workspaces vanish silently.
                          if (
                            w.cardCount > 0 &&
                            !window.confirm(
                              `"${w.title}" mit ${w.cardCount} Karte(n) endgueltig loeschen?`,
                            )
                          ) {
                            return;
                          }
                          onDeleteWorkspace(w.id);
                          setSwitcherOpen(false);
                        }}
                        aria-label="Loeschen"
                        className={`${styles.switcherRowAction} ${styles.switcherRowDelete}`}
                      >
                        <Trash2 size={11} strokeWidth={1.7} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {onCreateWorkspace && (
              <button
                type="button"
                onClick={() => {
                  onCreateWorkspace();
                  setSwitcherOpen(false);
                }}
                className={styles.switcherCreate}
              >
                <Plus size={12} strokeWidth={1.8} />
                <span>Neuer Workspace</span>
              </button>
            )}
          </div>
        )}

        {/* Loading overlay shown on first workspace open while AIMode
            fetches the user's workspace list. */}
        {loading && cards.length === 0 && (
          <div className={styles.loadingPill}>
            <Loader2 size={12} strokeWidth={2} className={styles.headerSpin} />
            <span>Lade Workspace...</span>
          </div>
        )}

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

        {/* Ask error pill — same visual lane as synth error so the
            user sees a single "something went wrong" zone. */}
        {askError && (
          <div className={styles.synthError} role="alert">
            <span>{askError}</span>
            <button
              type="button"
              onClick={() => setAskError(null)}
              aria-label="Fehler schliessen"
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Conflict error pill — same lane as synth/ask. */}
        {conflictError && (
          <div className={styles.synthError} role="alert">
            <span>{conflictError}</span>
            <button
              type="button"
              onClick={() => setConflictError(null)}
              aria-label="Fehler schliessen"
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Conflict-detail panel — opens below the header when the
            user clicks the conflict-count pill. Each row is clickable
            and scrolls/flashes the involved cards. */}
        {conflictPanelOpen && conflicts.length > 0 && (
          <div className={styles.conflictPanel} role="dialog">
            <div className={styles.conflictPanelHead}>
              <AlertTriangle size={13} strokeWidth={1.8} />
              <span>Atlas hat {conflicts.length} Konflikt(e) erkannt</span>
              <button
                type="button"
                onClick={() => setConflictPanelOpen(false)}
                aria-label="Panel schliessen"
                className={styles.conflictPanelClose}
              >
                <X size={12} strokeWidth={1.8} />
              </button>
            </div>
            <div className={styles.conflictPanelBody}>
              {conflicts.map((conflict, i) => {
                const cardA = cards.find((c) => c.id === conflict.cardAId);
                const cardB = cards.find((c) => c.id === conflict.cardBId);
                return (
                  <div
                    key={`${conflict.cardAId}-${conflict.cardBId}-${i}`}
                    className={`${styles.conflictRow} ${
                      styles[`conflictRow_${conflict.severity}`] ?? ""
                    }`}
                  >
                    <div className={styles.conflictRowHead}>
                      <span
                        className={`${styles.conflictSeverityDot} ${
                          styles[`conflictSeverity_${conflict.severity}`] ?? ""
                        }`}
                      />
                      <span className={styles.conflictRowSummary}>
                        {conflict.summary}
                      </span>
                    </div>
                    <div className={styles.conflictPair}>
                      <button
                        type="button"
                        onClick={() => focusCard(conflict.cardAId)}
                        className={styles.conflictCardLink}
                        title={cardA?.content}
                      >
                        {cardA?.title ?? "Karte (entfernt)"}
                      </button>
                      <span className={styles.conflictPairArrow}>↔</span>
                      <button
                        type="button"
                        onClick={() => focusCard(conflict.cardBId)}
                        className={styles.conflictCardLink}
                        title={cardB?.content}
                      >
                        {cardB?.title ?? "Karte (entfernt)"}
                      </button>
                    </div>
                    <p className={styles.conflictExplanation}>
                      {conflict.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
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
                const isClause = card.kind === "ai-clause";
                const isAnswer = card.kind === "ai-answer";
                const isAi = isClause || isAnswer;
                const inConflict = conflictedCardIds.has(card.id);
                const isFlashing = flashCardId === card.id;
                return (
                  <article
                    key={card.id}
                    ref={(el) => {
                      // Track DOM nodes so focusCard() can scroll to the
                      // exact card when the lawyer clicks a conflict
                      // row. Cleanup on unmount removes the entry.
                      if (el) {
                        cardRefs.current.set(card.id, el);
                      } else {
                        cardRefs.current.delete(card.id);
                      }
                    }}
                    className={`${styles.card} ${isAi ? styles.cardAi : ""} ${
                      isAnswer ? styles.cardAnswer : ""
                    } ${inConflict ? styles.cardConflict : ""} ${
                      isFlashing ? styles.cardFlash : ""
                    }`}
                  >
                    {isClause && (
                      <div className={styles.cardAiBadge}>
                        <Sparkles size={10} strokeWidth={2} />
                        <span>Atlas-Klausel</span>
                      </div>
                    )}
                    {isAnswer && (
                      <div
                        className={`${styles.cardAiBadge} ${styles.cardAnswerBadge}`}
                      >
                        <Sparkles size={10} strokeWidth={2} />
                        <span>Atlas-Antwort</span>
                      </div>
                    )}
                    {/* Konflikt-Badge — sits above the title when this
                        card is in any conflict. The detail panel above
                        shows what the conflict is. */}
                    {inConflict && (
                      <div className={styles.cardConflictBadge}>
                        <AlertTriangle size={10} strokeWidth={2} />
                        <span>Konflikt</span>
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
                    {/* For ai-answer cards, show the original question
                        before the answer so the lawyer remembers what
                        was asked without re-reading the title. */}
                    {isAnswer && card.question && (
                      <p className={styles.cardQuestion}>
                        <span className={styles.cardQuestionLabel}>Frage:</span>{" "}
                        {card.question}
                      </p>
                    )}
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
        {composerOpen && composerArchetype === "source" && (
          // Corpus picker — replaces the freeform composer for the
          // "Quelle" archetype. Search → filter chips → result list →
          // click to pin.
          <div className={`${styles.composer} ${styles.composerPicker}`}>
            <div className={styles.composerTypeTag}>
              <activeArchetype.icon size={11} strokeWidth={1.8} />
              <span>{activeArchetype.label}</span>
              <span className={styles.composerTypeHint}>
                · Atlas-Korpus durchsuchen
              </span>
            </div>

            <div className={styles.pickerSearch}>
              <Search
                size={14}
                strokeWidth={1.8}
                className={styles.pickerSearchIcon}
              />
              <input
                type="text"
                placeholder="z.B. Weltraummuell, Authorisierung, Art. 7..."
                value={corpusQuery}
                onChange={(e) => setCorpusQuery(e.target.value)}
                autoFocus
                className={styles.pickerSearchInput}
              />
              {corpusLoading && (
                <Loader2
                  size={13}
                  strokeWidth={2}
                  className={`${styles.pickerSearchSpin} ${styles.headerSpin}`}
                />
              )}
            </div>

            <div className={styles.pickerKindRow}>
              {(["eu", "nis2", "nat"] as const).map((kind) => {
                const active = corpusKinds.has(kind);
                const Icon = KIND_ICON[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleCorpusKind(kind)}
                    className={`${styles.pickerKindChip} ${
                      active ? styles.pickerKindChipActive : ""
                    }`}
                  >
                    <Icon size={10} strokeWidth={1.8} />
                    <span>{KIND_LABEL[kind]}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.pickerResults}>
              {corpusError && (
                <div className={styles.pickerError}>{corpusError}</div>
              )}
              {!corpusError && corpusHits.length === 0 && !corpusLoading && (
                <div className={styles.pickerEmpty}>
                  {corpusQuery
                    ? "Keine Treffer."
                    : "Tippe einen Suchbegriff oder waehle Filter."}
                </div>
              )}
              {corpusHits.map((hit) => {
                const Icon = KIND_ICON[hit.kind];
                return (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => pinHit(hit)}
                    className={styles.pickerResult}
                  >
                    <div className={styles.pickerResultHead}>
                      <span className={styles.pickerResultKind}>
                        <Icon size={10} strokeWidth={1.8} />
                        {KIND_LABEL[hit.kind]}
                        {hit.jurisdiction && hit.kind === "nat" && (
                          <span className={styles.pickerResultJurisdiction}>
                            {" "}
                            · {hit.jurisdiction}
                          </span>
                        )}
                      </span>
                      <span className={styles.pickerResultCite}>
                        {hit.citation}
                      </span>
                    </div>
                    <div className={styles.pickerResultTitle}>{hit.title}</div>
                    <div className={styles.pickerResultBody}>{hit.content}</div>
                  </button>
                );
              })}
            </div>

            <div className={styles.composerActions}>
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setCorpusQuery("");
                  setCorpusHits([]);
                }}
                className={styles.composerCancel}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
        {composerOpen && composerArchetype !== "source" && (
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
                disabled={asking}
                className={styles.composerCancel}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={
                  composerArchetype === "ask"
                    ? !content.trim() || asking
                    : !title.trim() && !content.trim()
                }
                className={`${styles.composerSubmit} ${
                  composerArchetype === "ask" ? styles.composerSubmitAsk : ""
                }`}
              >
                {composerArchetype === "ask" ? (
                  asking ? (
                    <>
                      <Loader2
                        size={12}
                        strokeWidth={2}
                        className={styles.headerSpin}
                      />
                      Atlas denkt...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} strokeWidth={1.8} />
                      Atlas fragen
                    </>
                  )
                ) : (
                  "Anpinnen"
                )}
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
