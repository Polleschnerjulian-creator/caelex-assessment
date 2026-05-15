"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Onboarding Tour (2026-05-13).
 *
 * Modal-Carousel mit 5 Slides die einem neuen User die wichtigsten
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
} from "lucide-react";
import { AtlasMark } from "./AtlasLogo";

const STORAGE_KEY = "atlas-v2-onboarding-seen";

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

const SLIDES: Slide[] = [
  {
    id: "welcome",
    title: "Willkommen bei Atlas",
    body: "Dein KI-Mitarbeiter für deutsches Weltraum- und Space-Compliance-Recht. Atlas durchsucht Akten, recherchiert das Atlas-Korpus, entwirft Schriftsätze und kennt jeden EU-Space-Act-Artikel.",
    visual: VisualWelcome,
  },
  {
    id: "mandate",
    title: "Mandate sind dein Arbeitsraum",
    body: "Lege ein Mandat an für jede Akte. Vault, Deadlines, Notizen und alle Chats des Falls liegen am gleichen Ort. Atlas kennt automatisch den Mandanten, die Jurisdiktion und alle bisherigen Schritte.",
    visual: VisualMandate,
  },
  {
    id: "attach",
    title: "Mandat im Chat anhängen",
    body: "Im Composer auf das + klicken → 'Mandat anhängen'. Ab diesem Moment sieht Atlas die Custom-Instructions, alle Vault-Files und den bisherigen Chat-Verlauf — Du musst nichts mehr wiederholen.",
    visual: VisualAttach,
  },
  {
    id: "vault",
    title: "Frag deine Akten direkt",
    body: "Lade PDFs / DOCX in den Vault hoch — Atlas indexiert sie automatisch. Im Chat: 'Was steht im Bescheid vom 12.3.?' liefert Atlas die exakte Stelle, mit Link zurück auf die Quelldatei.",
    visual: VisualVault,
  },
  {
    id: "shortcuts",
    title: "Schneller arbeiten",
    body: "Mit ⌘ K springst Du sofort in den Composer, ⌘ \\ klappt die Sidebar ein, ⏎ schickt die Nachricht. Diese Tour kannst Du jederzeit über das ?-Icon links unten in der Sidebar neu starten.",
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

function VisualWelcome() {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-700 dark:text-slate-200">
      <AtlasMark size={48} />
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        Atlas V2 · Mai 2026
      </div>
    </div>
  );
}

function VisualMandate() {
  return (
    <div className="w-[240px] rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/[0.08] dark:bg-[#222]">
      <div className="text-[12.5px] font-medium text-slate-900 dark:text-slate-100">
        Spire 2024
      </div>
      <div className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
        Spire Global Inc
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          DE
        </span>
        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          sat-op
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400">
        <span>12 Chats</span>
        <span>·</span>
        <span>24 Files</span>
        <span>·</span>
        <span className="text-amber-600 dark:text-amber-400">⏰ 14d</span>
      </div>
    </div>
  );
}

function VisualAttach() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      {/* Mandate-Chip — exakt wie in Production */}
      <div className="self-start">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-2 text-[10.5px] dark:border-white/[0.08] dark:bg-white/[0.04]">
          <Briefcase size={9} className="opacity-60" />
          <span className="text-slate-700 dark:text-slate-200">Spire 2024</span>
          <X size={9} className="opacity-50" />
        </span>
      </div>
      {/* Mini-Composer Pille */}
      <div className="rounded-2xl border border-slate-200 bg-white px-3 pt-2 pb-1.5 dark:border-white/[0.08] dark:bg-[#222]">
        <div className="text-[10.5px] text-slate-400 dark:text-slate-500">
          Was steht im BNetzA-Bescheid?
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 dark:text-slate-400">
            <Plus size={11} />
          </span>
          <div className="flex-1" />
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-black">
            <ArrowUp size={10} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

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
