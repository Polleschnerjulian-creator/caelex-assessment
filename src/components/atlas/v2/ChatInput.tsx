"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat input box (UI refresh 2026-05-12, theme-aware).
 *
 * Refined to match ChatGPT's restraint:
 *   - Single rounded pill (rounded-3xl), no aggressive border
 *   - Icons-only chip row (no text labels)
 *   - Tools toggles collapse into one popover instead of 4 chunky chips
 *   - Send appears only when there's text (no permanently-emerald button)
 *
 * Light: white pill on white canvas with a soft slate-200 border.
 * Dark:  near-black pill on dark canvas with subtle white-08 border.
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
  const [toolsOpen, setToolsOpen] = useState(false);
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

  /* Click-outside closes the tools popover. */
  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [toolsOpen]);

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
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        rows={1}
      />

      <div className="mt-1 flex items-center gap-1">
        {/* Left: subtle icon-row */}
        <IconButton title="Datei anhängen (Sprint 5 — über Mandat)" disabled>
          <Plus size={16} />
        </IconButton>

        <IconButton
          title={toggles.web ? "Web aus" : "Web Search"}
          active={toggles.web}
          onClick={() => toggle("web")}
        >
          <Globe size={15} />
        </IconButton>

        <IconButton
          title={toggles.korpus ? "Korpus aus" : "Korpus an"}
          active={toggles.korpus}
          onClick={() => toggle("korpus")}
        >
          <BookOpenText size={15} />
        </IconButton>

        <div ref={popRef} className="relative">
          <IconButton
            title="Tools"
            active={toolsOpen}
            onClick={() => setToolsOpen((v) => !v)}
          >
            <Wrench size={14} />
          </IconButton>
          {toolsOpen && (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
              <div className="mb-1 px-2 py-1 text-[10.5px] uppercase tracking-wider text-slate-500">
                Aktive Tool-Bundles
              </div>
              {TOOL_BUNDLES.map((b) => {
                const on = toggles[b.key as keyof typeof toggles];
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => toggle(b.key as keyof typeof toggles)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[13px] text-slate-700 hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.04]"
                  >
                    <span>{b.label}</span>
                    {on && (
                      <Check
                        size={13}
                        className="text-slate-700 dark:text-slate-300"
                      />
                    )}
                  </button>
                );
              })}
            </div>
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
