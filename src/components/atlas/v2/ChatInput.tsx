"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat input box.
 *
 * Centred text-area + tool-picker chips + send button. Used both on
 * the homepage (empty state) and at the bottom of an active chat.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Globe, BookOpenText, Wrench } from "lucide-react";

interface Props {
  /** Initial value (e.g. when opened from a quickstart). */
  initialValue?: string;
  /** Disabled while a stream is in flight. */
  disabled?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Submit handler. */
  onSubmit: (
    text: string,
    toolToggles: Record<string, boolean>,
  ) => void | Promise<void>;
  /** Show "Korpus aktiv" pill. */
  showKorpusPill?: boolean;
}

export function ChatInput({
  initialValue,
  disabled,
  placeholder,
  onSubmit,
  showKorpusPill = true,
}: Props) {
  const [text, setText] = useState(initialValue ?? "");
  const [toolToggles, setToolToggles] = useState({
    korpus: true,
    compliance: true,
    comparison: true,
    drafting: true,
    validity: true,
    documents: false,
    web: false,
    workflow: true,
    mandate: true,
  });
  const taRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-grow the textarea up to a sensible max-height. */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [text]);

  /* Update value when an external `initialValue` arrives (quickstart click). */
  useEffect(() => {
    if (initialValue !== undefined) setText(initialValue);
  }, [initialValue]);

  const handleSend = () => {
    const v = text.trim();
    if (!v || disabled) return;
    void onSubmit(v, toolToggles);
    setText("");
  };

  const toggle = (key: keyof typeof toolToggles) => {
    setToolToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-md focus-within:border-emerald-500/50">
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
        className="block w-full resize-none bg-transparent px-2 py-2 text-[14px] text-slate-100 outline-none placeholder:text-slate-500"
        rows={1}
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {/* Files (placeholder; wired in Sprint 5) */}
          <button
            type="button"
            disabled
            title="Datei-Upload (Sprint 5)"
            className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 opacity-40"
          >
            <Paperclip size={11} />
            <span>Dateien</span>
          </button>

          <ToggleChip
            on={toolToggles.web}
            onClick={() => toggle("web")}
            icon={<Globe size={11} />}
            label="Web"
          />

          {showKorpusPill && (
            <ToggleChip
              on={toolToggles.korpus}
              onClick={() => toggle("korpus")}
              icon={<BookOpenText size={11} />}
              label="Korpus"
            />
          )}

          <ToggleChip
            on={
              toolToggles.compliance ||
              toolToggles.comparison ||
              toolToggles.drafting ||
              toolToggles.validity ||
              toolToggles.workflow
            }
            onClick={() => {
              const allOn =
                toolToggles.compliance &&
                toolToggles.comparison &&
                toolToggles.drafting &&
                toolToggles.validity &&
                toolToggles.workflow;
              const next = !allOn;
              setToolToggles((prev) => ({
                ...prev,
                compliance: next,
                comparison: next,
                drafting: next,
                validity: next,
                workflow: next,
              }));
            }}
            icon={<Wrench size={11} />}
            label="Tools"
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Senden"
        >
          <Send size={12} />
          Senden
        </button>
      </div>
    </div>
  );
}

function ToggleChip({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 transition-colors ${
        on
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-300"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
