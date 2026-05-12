"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat input box (UI refresh 2026-05-12, theme-aware,
 * single-Plus-menu).
 *
 * One-button composer (the row was getting busy):
 *   [+]  ……textarea……  [🎙]  [↑]
 *
 * The [+] opens a single popover containing every previously-inline
 * affordance, organized into three sections:
 *
 *   • Anhängen (file/photo upload — currently routed via Mandat)
 *   • Recherche (Web-Suche, Atlas-Korpus — toggles)
 *   • Tools     (the 6 bundle toggles)
 *
 * The toggle-state contract on the parent is unchanged — only the UI
 * wrapper changed. The chat-engine still receives the same toolToggles
 * record on submit.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Plus,
  Globe,
  BookOpenText,
  Wrench,
  Mic,
  Check,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";

interface Props {
  initialValue?: string;
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (
    text: string,
    toolToggles: Record<string, boolean>,
  ) => void | Promise<void>;
  showKorpusPill?: boolean;
}

const DEFAULT_TOGGLES = {
  korpus: true,
  compliance: true,
  comparison: true,
  drafting: true,
  validity: true,
  documents: false,
  web: false,
  workflow: true,
  mandate: true,
};

const TOOL_BUNDLES = [
  { key: "compliance", label: "Compliance" },
  { key: "comparison", label: "Vergleich" },
  { key: "drafting", label: "Drafting" },
  { key: "validity", label: "Validity" },
  { key: "workflow", label: "Workflow" },
  { key: "mandate", label: "Mandate" },
] as const;

export function ChatInput({
  initialValue,
  disabled,
  placeholder,
  onSubmit,
}: Props) {
  const [text, setText] = useState(initialValue ?? "");
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [plusOpen, setPlusOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  /* Auto-grow textarea (max 240px). */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [text]);

  /* Sync external initialValue (e.g. quickstart click). */
  useEffect(() => {
    if (initialValue !== undefined) setText(initialValue);
  }, [initialValue]);

  /* Click-outside closes the plus popover. */
  useEffect(() => {
    if (!plusOpen) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setPlusOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [plusOpen]);

  const handleSend = () => {
    const v = text.trim();
    if (!v || disabled) return;
    void onSubmit(v, toggles);
    setText("");
  };

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-3 pt-3 pb-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors focus-within:border-slate-300 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] dark:focus-within:border-white/[0.16]">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={disabled}
        placeholder={
          placeholder ?? "Frage etwas oder beschreibe was du brauchst…"
        }
        /* `focus-visible:outline-none` + `focus-visible:shadow-none`
           override the global *:focus-visible emerald outline (in
           src/app/globals.css line 1563) — the blinking caret is
           already the focus indicator for a textarea, so the
           emerald halo around the pill was both redundant and
           visually wrong. The buttons in the row below KEEP their
           focus ring for keyboard a11y. */
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-slate-900 outline-none focus-visible:shadow-none focus-visible:outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        rows={1}
      />

      <div className="mt-1 flex items-center gap-1">
        {/* The single Plus button — opens the rich popover with every
            affordance the row used to expose inline. */}
        <div ref={popRef} className="relative">
          <IconButton
            title="Anhängen, Recherche, Tools"
            active={plusOpen}
            onClick={() => setPlusOpen((v) => !v)}
          >
            <Plus size={16} />
          </IconButton>
          {plusOpen && (
            <PlusMenu
              toggles={toggles}
              onToggle={toggle}
              onClose={() => setPlusOpen(false)}
            />
          )}
        </div>

        <div className="flex-1" />

        <IconButton title="Spracheingabe (geplant)" disabled>
          <Mic size={15} />
        </IconButton>

        {/* Send — only emphasised when there's text. Light: black-on-white,
            Dark: white-on-black (same inversion as ChatGPT). */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || disabled}
          aria-label="Senden"
          className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            hasText && !disabled
              ? "bg-slate-900 text-white hover:scale-105 dark:bg-white dark:text-black"
              : "bg-slate-200 text-slate-400 dark:bg-white/[0.08] dark:text-slate-500"
          }`}
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/* ── Plus-menu popover ───────────────────────────────────────────────── */

function PlusMenu({
  toggles,
  onToggle,
  onClose: _onClose,
}: {
  toggles: typeof DEFAULT_TOGGLES;
  onToggle: (k: keyof typeof DEFAULT_TOGGLES) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
      {/* Anhängen */}
      <MenuSection label="Anhängen">
        <MenuRow
          icon={<Paperclip size={14} />}
          label="Datei hochladen"
          hint="über Mandat verfügbar"
          disabled
        />
        <MenuRow
          icon={<ImageIcon size={14} />}
          label="Foto hochladen"
          hint="über Mandat verfügbar"
          disabled
        />
      </MenuSection>

      <MenuDivider />

      {/* Recherche */}
      <MenuSection label="Recherche">
        <MenuRow
          icon={<Globe size={14} />}
          label="Web-Suche"
          checked={toggles.web}
          onClick={() => onToggle("web")}
        />
        <MenuRow
          icon={<BookOpenText size={14} />}
          label="Atlas-Korpus"
          checked={toggles.korpus}
          onClick={() => onToggle("korpus")}
        />
      </MenuSection>

      <MenuDivider />

      {/* Tools */}
      <MenuSection label="Tools">
        {TOOL_BUNDLES.map((b) => {
          const on = toggles[b.key as keyof typeof toggles];
          return (
            <MenuRow
              key={b.key}
              icon={<Wrench size={14} className="opacity-60" />}
              label={b.label}
              checked={on}
              onClick={() => onToggle(b.key as keyof typeof toggles)}
            />
          );
        })}
      </MenuSection>
    </div>
  );
}

function MenuSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-2.5 pb-0.5 pt-1.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function MenuDivider() {
  return (
    <div className="my-1 border-t border-slate-200 dark:border-white/[0.06]" />
  );
}

function MenuRow({
  icon,
  label,
  hint,
  checked,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
        disabled
          ? "cursor-default text-slate-400 dark:text-slate-600"
          : "text-slate-700 hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.04]"
      }`}
    >
      <span className={`shrink-0 ${disabled ? "opacity-50" : ""}`}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {hint && (
        <span className="shrink-0 text-[10.5px] text-slate-400 dark:text-slate-500">
          {hint}
        </span>
      )}
      {checked !== undefined && !disabled && (
        <span className="shrink-0">
          {checked ? (
            <Check size={13} className="text-slate-700 dark:text-slate-300" />
          ) : (
            <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
              aus
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/* ── Tiny shared icon-button (kept for Mic + Plus) ───────────────────── */

function IconButton({
  children,
  onClick,
  title,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        disabled
          ? "text-slate-300 cursor-default dark:text-slate-700"
          : active
            ? "bg-black/[0.06] text-slate-900 dark:bg-white/[0.08] dark:text-slate-100"
            : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
