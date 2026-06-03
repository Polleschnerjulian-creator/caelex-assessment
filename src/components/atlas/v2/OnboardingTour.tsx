"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Onboarding Tour (2026-05-13).
 *
 * Modal-Carousel mit 12 Slides (Sprint 19 expansion, v1→v2 migration)
 * die einem neuen User die wichtigsten
 * Atlas-Konzepte zeigen: Was Atlas ist, Mandate als Workspaces,
 * Mandate im Chat anhängen, Vault-RAG, Tastatur-Shortcuts.
 *
 * Trigger:
 *   1. Auto-show beim ersten Atlas-Mount per User/Browser, gated durch
 *      localStorage `atlas-v2-onboarding-seen`. Set on Skip OR Complete
 *      → identische Persistenz-Regel.
 *   2. Manual re-open via globalem Window-Event `atlas-v2-open-tour`,
 *      ausgelöst durch den Help-Button in der Sidebar-Footer.
 *
 * Visuals: jede Slide hat ein stylisiertes Preview (Mini-Card, Mini-
 * Composer, Mini-File-Row) statt eines generischen Icons. Spiegelt die
 * tatsächlichen UI-Patterns aus dem Live-Atlas wider — Onboarding fühlt
 * sich an wie ein Sneak-Peek auf das Produkt, nicht wie eine Marketing-
 * Brochüre. Tokens (border-slate-200 / rounded-lg / etc.) sind 1:1 die
 * gleichen wie im Production-UI; eine Schema-Änderung dort propagiert
 * automatisch hierher.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  ArrowUp,
  FileText,
  Search,
  MessageSquare,
  Quote,
  GitPullRequest,
  Sparkles,
  Hash,
  Link2,
  BookMarked,
  Image as ImageIcon,
  Building,
  Mail,
  Command,
} from "lucide-react";
import { AtlasGlyph } from "./AtlasGlyph";

/* Sprint 19 (2026-05-19) — Storage-key bumped von "atlas-v2-onboarding-
   seen" auf "...-v2-seen" damit existing users (die den alten 5-slide
   tour bereits dismissed haben) den neuen 12-slide v1→v2-migration tour
   auto-shown bekommen. Wer ihn schon hat: kann jederzeit via help-icon
   im sidebar-footer wieder öffnen. */
const STORAGE_KEY = "atlas-v2-onboarding-tour-v2";

/* AUDIT-FIX L8: Magic-number extracted. We defer the auto-show by 300ms
   so AtlasShellV2's initial paint settles (mandate sidebar fetch +
   theme hydration both finish in < ~250ms locally). Without the delay,
   the tour modal flashes for one frame underneath the still-painting
   shell, which looks broken. 300ms is the eyeballed value that keeps
   the tour visible "immediately" to the user but reliably AFTER the
   shell's first useful paint. If we ever migrate to React 19 Activity-
   based mount-tracking, this can drop to a useLayoutEffect + RAF. */
const MOUNT_DELAY_MS = 300;

/* H27: focus-trap selector — see MandateAttachModal for rationale. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Slide {
  id: string;
  title: string;
  body: string;
  visual: () => React.ReactNode;
}

/* Sprint 19 (2026-05-19) — Expanded tour for v1→v2 migration.
   12 Slides die jedem v1-anwalt zeigen was sich geändert hat + welche
   neuen features bestehen. Re-callable via help-icon im sidebar. */
const SLIDES: Slide[] = [
  {
    id: "welcome-v2",
    title: "Atlas v2 ist da",
    body: "Komplett umgebaut: Chat-first statt Dashboard. Integrierter Word-grade Editor. Auto-Zitate. Mandanten-Review-Workflow. Diese Tour zeigt dir was neu ist — 12 Steps, ~3 Minuten.",
    visual: VisualWelcomeV2,
  },
  {
    id: "chat-first",
    title: "Chat ist deine Startseite",
    body: "Kein Modul-Dashboard mehr. Du öffnest Atlas → direkt im Chat-Composer. Frag was du willst — Atlas kennt EU Space Act, WeltrG, BORA, NIS2, alle ESA-Verträge. Antworten mit Zitat zur Quelle.",
    visual: VisualChatFirst,
  },
  {
    id: "slash-commands",
    title: "/-Befehle für Dokumente",
    body: "Tipp `/schriftsatz`, `/brief`, `/vertrag`, `/memo`, `/aktennotiz`, `/email`, `/checklist`, `/recherche` im Composer. Atlas fügt ein DIN-konformes Skelett ein das du fertigstellen lässt.",
    visual: VisualSlashCommands,
  },
  {
    id: "mandate",
    title: "Mandate als Workspace",
    body: "Pro Akte ein Mandat: Vault-Files, Deadlines, Custom-Instructions, alle Chats zum Fall. Im Composer auf + → 'Mandat anhängen': Atlas sieht ab dann alles automatisch — du musst keinen Context wiederholen.",
    visual: VisualMandateAttach,
  },
  {
    id: "vault",
    title: "Frag deine Akten direkt",
    body: "PDFs / DOCX in den Vault → Atlas indexiert automatisch (OCR + Embeddings). Frag z.B. 'Was steht im Bescheid vom 12.3.?' — Atlas liefert die exakte Stelle mit Link auf die Quelldatei.",
    visual: VisualVault,
  },
  {
    id: "artifacts",
    title: "AI-Antworten als Artefakt-Karten",
    body: "Wenn Atlas einen Schriftsatz, Brief oder Vertrag schreibt, erscheint eine Artefakt-Karte unter der Antwort. Click → rechtsseitiges Preview-Panel mit PDF/DOCX-Export, oder direkt im Editor öffnen.",
    visual: VisualArtifactCard,
  },
  {
    id: "editor",
    title: "Word-grade Editor im Browser",
    body: "Per Klick auf 'Bearbeiten' öffnest du den vollwertigen Editor: A4-Seite mit DIN 5008-Margins, Ribbon-Toolbar (Font, Heading, Lists, Tables, Footnotes), 100% WYSIWYG. Keine Markdown-Marker sichtbar.",
    visual: VisualEditor,
  },
  {
    id: "citations",
    title: "Strukturierte juristische Zitate",
    body: "Im Editor: Zitat-Button → Dialog mit 11 Quellentypen (Gesetz, Urteil, BVerfGE, EuGH, Kommentar, EU-VO…). Atlas formatiert nach DE-Konvention (Stüber/Möllers). Plus: Querverweise + Auto-Quellenverzeichnis am Ende.",
    visual: VisualCitations,
  },
  {
    id: "review",
    title: "Kommentare & Änderungsvorschläge",
    body: "Markier Text → 'Kommentar' für Diskussion mit Mandant (threaded, resolvable). Oder 'Vorschlag: Löschen/Einfügen' für Track-Changes-style Review. Accept/Reject im rechten Panel.",
    visual: VisualReview,
  },
  {
    id: "pdf-letterhead",
    title: "PDF-Export mit Briefkopf",
    body: "Jeder Schriftsatz/Brief wird als DIN 5008-konformes PDF exportiert. Settings → Firm → Letterhead: Logo + Kanzlei-Adresse einmal hochladen → erscheint auto auf jeder PDF. Direct sendable.",
    visual: VisualLetterhead,
  },
  {
    id: "suche",
    title: "Eine Suche, alles findbar",
    body: "Sidebar → Suche: durchsucht deine Wissensbasis (eigene Snippets, Schriftsätze, Notizen) UND 937 statutory Legal-Sources (UN-Treaties, EU-Recht, nationale Space-Gesetze) parallel.",
    visual: VisualSuche,
  },
  {
    id: "shortcuts",
    title: "Power-User Shortcuts",
    body: "⌘K = Command-Palette (jeder Chat, Mandat, Setting). ⌘\\ = Sidebar toggle. ⌘S = Save im Editor. ⌘F = Find/Replace. Die Tour startest du jederzeit neu via Help-Icon links unten in der Sidebar.",
    visual: VisualShortcuts,
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  /* H27: capture the element that opened the modal so we can restore
     focus to it on close — keyboard users (and screen-reader users)
     should land back where they were rather than at <body>. */
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  /* Mount: check localStorage. Only auto-show if user has never seen it. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    /* AUDIT-FIX L8: Defer one shell-paint so we don't flash the modal
       during initial paint — see MOUNT_DELAY_MS comment for rationale. */
    const t = window.setTimeout(() => setOpen(true), MOUNT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  /* Listen for the manual re-open event from the sidebar help button. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("atlas-v2-open-tour", handler);
    return () => window.removeEventListener("atlas-v2-open-tour", handler);
  }, []);

  const close = useCallback(() => {
    if (typeof window !== "undefined") {
      /* AUDIT-FIX L7: We only ever truthy-check this key, so an ISO
         timestamp wastes ~24 bytes per user with no consumer of the
         value. Store the literal "1" — same semantics, smaller blob,
         clearer intent (boolean-as-string). */
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  }, []);

  /* H27: snapshot opener-focus on open + restore on close, and move
     focus into the modal so Tab cycles inside it from the start. */
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current =
        (document.activeElement as HTMLElement | null) ?? null;
      /* Defer so the dialog has mounted; pick the first focusable
         element inside (the Skip button in the header). */
      setTimeout(() => {
        if (!modalRef.current) return;
        const first =
          modalRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      }, 0);
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  /* Esc closes (mark as seen — same as Skip).
     H27: also trap Tab so focus can't leave the modal. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") {
        setStep((s) => Math.min(s + 1, SLIDES.length - 1));
      }
      if (e.key === "ArrowLeft") {
        setStep((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusables =
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!modalRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
          return;
        }
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!open) return null;

  const isLast = step === SLIDES.length - 1;
  const isFirst = step === 0;
  const slide = SLIDES[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atlas-onboarding-tour-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.14)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_16px_40px_rgba(0,0,0,0.50)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — minimal, just the skip-button */}
        <div className="flex items-center justify-end px-4 pt-3">
          <button
            type="button"
            onClick={close}
            aria-label="Tour überspringen"
            className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] text-slate-500 transition-colors hover:bg-black/[0.04] hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
          >
            <span>Überspringen</span>
            <X size={12} />
          </button>
        </div>

        {/* Visual — same height across slides so transitions don't jump */}
        <div className="px-6 pt-2 pb-4">
          <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/[0.03]">
            {slide.visual()}
          </div>
        </div>

        {/* Title + body */}
        <div className="px-6 pb-5">
          <h2
            id="atlas-onboarding-tour-title"
            className="text-[18px] font-medium tracking-tight text-slate-900 dark:text-slate-100"
          >
            {slide.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
            {slide.body}
          </p>
        </div>

        {/* Footer: pagination dots + nav */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-white/[0.06]">
          <div
            className="flex items-center gap-1.5"
            aria-label="Tour-Fortschritt"
          >
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Slide ${i + 1} von ${SLIDES.length}`}
                aria-current={i === step ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                  i === step
                    ? "w-6 bg-slate-700 dark:bg-slate-200"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.20]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[12.5px] text-slate-600 transition-colors hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
              >
                <ChevronLeft size={13} />
                Zurück
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={close}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              >
                Loslegen
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setStep((s) => Math.min(s + 1, SLIDES.length - 1))
                }
                className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              >
                Weiter
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Slide visuals — stylisierte Mini-Previews der echten UI.
   Tokens spiegeln 1:1 die Production-Komponenten (border-slate-200,
   rounded-lg, slate-text-Hierarchie). Wenn das echte UI sich ändert,
   sollten diese Previews ebenfalls angepasst werden — Onboarding ist
   ein Marketing-Surface mit dem Anspruch, korrekt zu sein.
   ───────────────────────────────────────────────────────────────── */

/* BUG-T3-4 (wave 11D, removed 2026-05-19): the v1-era VisualWelcome /
   VisualMandate / VisualAttach functions were replaced by the v2
   variants (VisualWelcomeV2, VisualMandateAttach below) in Sprint 19
   when the tour was expanded from 5 to 12 slides. The old visuals
   were never deleted — ~95 LOC of dead code that no SLIDES entry
   references. Removed for clarity + bundle. The Briefcase / Plus /
   ArrowUp / X icon imports they used are still used by VisualMandateAttach
   below, so the lucide-react imports stay. */

function VisualVault() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      {/* File-Row mit Embed-Badge — wie in MandateFilesList */}
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 dark:border-white/[0.08] dark:bg-[#222]">
        <FileText size={11} className="text-slate-500" />
        <span className="text-[10.5px] text-slate-700 dark:text-slate-200">
          BNetzA-Bescheid-12-03.pdf
        </span>
        <span className="ml-auto text-[9.5px] text-emerald-600 dark:text-emerald-400">
          ✓ embedded
        </span>
      </div>
      {/* Atlas-Antwort mit Citation */}
      <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2 dark:border-white/[0.08] dark:bg-[#222]">
        <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-slate-500 dark:text-slate-500">
          <Search size={9} />
          Atlas zitiert
        </div>
        <div className="mt-1 text-[10.5px] italic text-slate-700 dark:text-slate-300">
          „Widerspruchsfrist beträgt einen Monat ab Zustellung des Bescheids."
        </div>
        <div className="mt-1 text-[9.5px] text-slate-500 dark:text-slate-400">
          → BNetzA-Bescheid-12-03.pdf
        </div>
      </div>
    </div>
  );
}

function VisualShortcuts() {
  const shortcuts: Array<[string, string]> = [
    ["⌘ K", "Composer fokussieren"],
    ["⌘ \\", "Sidebar ein/ausklappen"],
    ["⏎", "Nachricht senden"],
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {shortcuts.map(([key, desc]) => (
        <div key={key} className="flex items-center gap-3">
          <kbd className="inline-flex min-w-[44px] items-center justify-center rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10.5px] text-slate-700 dark:border-white/[0.08] dark:bg-[#222] dark:text-slate-200">
            {key}
          </kbd>
          <span className="text-[12px] text-slate-600 dark:text-slate-400">
            {desc}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sprint 19 — Neue Visuals für v1→v2 migration tour.
   ───────────────────────────────────────────────────────────────── */

function VisualWelcomeV2() {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-700 dark:text-slate-200">
      <div className="relative">
        <AtlasGlyph size={48} animated />
        <span className="absolute -right-3 -top-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[8.5px] font-bold text-white shadow-sm">
          v2
        </span>
      </div>
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        Komplett neu · Mai 2026
      </div>
      <div className="flex gap-1.5">
        {["Chat-first", "WYSIWYG-Editor", "Auto-Zitate", "Review"].map((t) => (
          <span
            key={t}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function VisualChatFirst() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-[#222]">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
          Atlas
        </div>
        <div className="text-[10.5px] leading-relaxed text-slate-700 dark:text-slate-300">
          Nach § 2 Abs. 1 WeltrG ist eine Genehmigung erforderlich für…
          <span className="ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-emerald-100 text-[7.5px] font-bold text-emerald-700">
            ¹
          </span>
        </div>
        <div className="mt-1 text-[8.5px] text-slate-500">
          ¹ § 2 WeltrG · BGBl I S. 2502
        </div>
      </div>
      <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-white/[0.08] dark:bg-[#222]">
        <span className="text-[10.5px] text-slate-400">
          Frage zum Mandat stellen…
        </span>
      </div>
    </div>
  );
}

function VisualSlashCommands() {
  const cmds = [
    ["/schriftsatz", "Gerichtlicher Schriftsatz"],
    ["/brief", "Mandantenbrief"],
    ["/vertrag", "Vertrag mit §§-Struktur"],
    ["/memo", "Internes Memo"],
  ];
  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#222]">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9.5px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        Slash-Commands · ↑↓ navigieren
      </div>
      {cmds.map(([cmd, desc], i) => (
        <div
          key={cmd}
          className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${
            i === 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
          }`}
        >
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            {cmd}
          </span>
          <span className="text-slate-500">{desc}</span>
        </div>
      ))}
    </div>
  );
}

function VisualMandateAttach() {
  return (
    <div className="flex w-[280px] flex-col gap-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-[#222]">
        <div className="text-[12px] font-medium text-slate-900 dark:text-slate-100">
          Spire 2024 · Satelliten-Genehmigung
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
          <span>📁 24 Files</span>
          <span>·</span>
          <span>💬 12 Chats</span>
          <span>·</span>
          <span className="text-amber-600">⏰ Frist 14d</span>
        </div>
      </div>
      <div className="self-start">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 py-1 pl-2 pr-2 text-[10.5px] dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <Briefcase size={9} className="text-emerald-700" />
          <span className="text-emerald-700 dark:text-emerald-300">
            Mandat angehängt
          </span>
        </span>
      </div>
    </div>
  );
}

function VisualArtifactCard() {
  return (
    <div className="flex w-[280px] flex-col gap-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/[0.08] dark:bg-[#222]">
        <div className="text-[10.5px] text-slate-600">
          Hier ist der Antrag nach § 2 WeltrG:
        </div>
      </div>
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/[0.04]">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <FileText
              size={16}
              className="text-emerald-700 dark:text-emerald-300"
            />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Schriftsatz
            </div>
            <div className="text-[11.5px] font-medium text-slate-900 dark:text-slate-100">
              Antrag § 2 WeltrG
            </div>
            <div className="text-[9.5px] text-slate-500">
              Click für Vorschau
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualEditor() {
  return (
    <div className="flex w-[300px] flex-col gap-1.5">
      {/* Ribbon-bar Mini */}
      <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-white/[0.08] dark:bg-[#222]">
        <span className="font-bold text-slate-700">B</span>
        <span className="italic text-slate-700">I</span>
        <span className="underline text-slate-700">U</span>
        <span className="mx-1 h-3 w-px bg-slate-200" />
        <span className="text-[10px] font-semibold text-slate-700">H1</span>
        <span className="text-[10px] text-slate-600">H2</span>
        <span className="text-[10px] text-slate-600">H3</span>
        <span className="mx-1 h-3 w-px bg-slate-200" />
        <span className="text-[10px] text-slate-600">≡ ≣ ≣</span>
      </div>
      {/* A4-Page mini */}
      <div className="rounded-sm bg-white p-3 shadow-md ring-1 ring-slate-200">
        <div className="text-[10px] font-bold text-slate-900">
          I. Sachverhalt
        </div>
        <div className="mt-1 h-1 w-full rounded bg-slate-100" />
        <div className="mt-1 h-1 w-4/5 rounded bg-slate-100" />
        <div className="mt-2 text-[10px] font-bold text-slate-900">
          II. Würdigung
        </div>
        <div className="mt-1 h-1 w-full rounded bg-slate-100" />
        <div className="mt-1 h-1 w-3/5 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function VisualCitations() {
  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#222]">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9.5px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/50">
        <Quote size={10} className="mr-1 inline" />
        Zitat einfügen
      </div>
      <div className="space-y-1.5 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Hash size={10} className="text-slate-400" />
          <span className="text-[10px] text-slate-500">Gesetz</span>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-2 py-1.5 font-serif text-[11.5px] italic text-slate-900 dark:bg-emerald-500/10 dark:text-slate-100">
          § 433 Abs. 1 S. 1 BGB
        </div>
        <div className="flex items-center gap-2 text-[9.5px] text-slate-500">
          <BookMarked size={10} />
          <span>Auto-Quellenverzeichnis am Doc-Ende</span>
        </div>
      </div>
    </div>
  );
}

function VisualReview() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-2 dark:border-amber-500/30 dark:bg-amber-500/[0.04]">
        <div className="text-[10px] italic text-amber-800 dark:text-amber-200">
          „§ 433 BGB"
        </div>
        <div className="mt-1 flex items-start gap-1.5">
          <MessageSquare size={9} className="mt-0.5 text-amber-700" />
          <span className="text-[10.5px] text-slate-700 dark:text-slate-300">
            Bitte hier prüfen — eher § 280?
          </span>
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[10px] dark:bg-emerald-500/10">
          <span className="text-emerald-700">+ Einfügen</span>
        </div>
        <div className="flex-1 rounded-md border border-red-200 bg-red-50/60 px-2 py-1 text-[10px] dark:bg-red-500/10">
          <span className="text-red-700 line-through">− Löschen</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[9.5px] text-slate-500">
        <GitPullRequest size={9} />
        <span>Accept/Reject im rechten Panel</span>
      </div>
    </div>
  );
}

function VisualLetterhead() {
  return (
    <div className="w-[260px] rounded-sm bg-white p-3 shadow-md ring-1 ring-slate-200">
      <div className="flex items-start justify-between border-b border-slate-100 pb-1.5">
        <div>
          <div className="text-[10px] font-bold text-slate-900">
            Musterrecht & Partner
          </div>
          <div className="text-[7.5px] text-slate-500">
            Anwälte für Weltraumrecht · Berlin
          </div>
        </div>
        <Building size={14} className="text-slate-300" />
      </div>
      <div className="mt-2 space-y-0.5">
        <div className="h-1 w-full rounded bg-slate-100" />
        <div className="h-1 w-5/6 rounded bg-slate-100" />
        <div className="h-1 w-4/6 rounded bg-slate-100" />
      </div>
      <div className="mt-2 flex justify-end">
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8.5px] font-medium text-emerald-700">
          DIN 5008 PDF
        </span>
      </div>
    </div>
  );
}

function VisualSuche() {
  return (
    <div className="w-[300px] space-y-1.5">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/[0.08] dark:bg-[#222]">
        <Search size={12} className="text-slate-400" />
        <span className="text-[10.5px] text-slate-600">§ 2 WeltrG</span>
      </div>
      <div className="space-y-1">
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-white/[0.08] dark:bg-[#222]">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-rose-50 px-1 text-[8.5px] font-medium text-rose-700">
              Gesetz
            </span>
            <span className="text-[10px] font-medium">Weltraumgesetz</span>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-white/[0.08] dark:bg-[#222]">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-emerald-50 px-1 text-[8.5px] font-medium text-emerald-700">
              Wissensbasis
            </span>
            <span className="text-[10px]">Schriftsatz-Vorlage zu § 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
