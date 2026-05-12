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
  MicOff,
  Square,
  Loader2,
  Check,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

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
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Voice-input integration. The hook handles the full MediaRecorder
     → /api/atlas/transcribe lifecycle and returns a transcript that
     we splice into the textarea. */
  const voice = useVoiceRecorder();

  /* When a transcript lands, append it to the current text (or set
     if empty), then clear the hook's transcript buffer so we don't
     re-insert on next render. */
  useEffect(() => {
    if (voice.transcript) {
      setText((prev) =>
        prev ? `${prev} ${voice.transcript}` : voice.transcript!,
      );
      voice.reset();
      /* Focus the textarea so the user can immediately review + edit
         + send the transcribed text. */
      taRef.current?.focus();
    }
  }, [voice.transcript, voice]);

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

  /* ── File-attach (text-files only — drag-drop + click) ─────────────
     Client-side FileReader extracts the text, then we splice it into
     the textarea as a tagged block the model recognises. No upload
     to R2 / DB — the file content becomes part of the user's message
     content. PDF / DOCX / images need server-side extraction and are
     surfaced via the disabled menu entries (next sprint).
     -----------------------------------------------------------------*/

  const handleTextFile = async (file: File) => {
    setFileError(null);
    /* Hard cap 1 MB of text — anything larger blows past the model's
       useful context window for a single chat turn. */
    const MAX_TEXT_BYTES = 1 * 1024 * 1024;
    const TEXT_MIMES = [
      "text/plain",
      "text/markdown",
      "text/html",
      "text/csv",
      "application/json",
      "application/xml",
      "text/xml",
    ];
    const TEXT_EXTS = [
      ".txt",
      ".md",
      ".markdown",
      ".csv",
      ".html",
      ".htm",
      ".json",
      ".xml",
      ".log",
    ];
    const looksText =
      TEXT_MIMES.includes(file.type) ||
      TEXT_EXTS.some((e) => file.name.toLowerCase().endsWith(e));

    if (!looksText) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const isImg = file.type.startsWith("image/");
      if (isPdf) {
        setFileError(
          "PDF-Extraktion folgt im nächsten Sprint. Bitte als TXT/MD speichern und erneut hochladen.",
        );
      } else if (isImg) {
        setFileError(
          "Bilderkennung folgt mit Vision-Support. Bitte Text-Datei hochladen.",
        );
      } else {
        setFileError(
          `Dateityp nicht unterstützt (${file.type || file.name.split(".").pop()}). Aktuell: TXT, MD, CSV, HTML, JSON, XML.`,
        );
      }
      return;
    }
    if (file.size > MAX_TEXT_BYTES) {
      setFileError(
        `Datei zu groß (${Math.round(file.size / 1024)} KB; max ${MAX_TEXT_BYTES / 1024} KB).`,
      );
      return;
    }
    try {
      const content = await file.text();
      const trimmed = content.trim();
      if (!trimmed) {
        setFileError("Datei ist leer.");
        return;
      }
      /* Splice the file content into the textarea as a clearly-fenced
         block. The model reads the fence as "this came from an
         attachment, treat it as quoted material". */
      const block = `\n\n--- Anhang: ${file.name} ---\n${trimmed}\n--- /Anhang ---\n\n`;
      setText((prev) => (prev ? prev + block : block.trimStart()));
      taRef.current?.focus();
    } catch (e) {
      setFileError("Datei konnte nicht gelesen werden.");
    }
  };

  const onPickFile = () => {
    setPlusOpen(false);
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleTextFile(f);
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) void handleTextFile(f);
  };

  const handleSend = () => {
    const v = text.trim();
    if (!v || disabled) return;
    void onSubmit(v, toggles);
    setText("");
    setFileError(null);
  };

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasText = text.trim().length > 0;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-[28px] border bg-white px-3 pt-3 pb-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors dark:bg-[#1a1a1a] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
        dragOver
          ? "border-slate-400 bg-slate-50 dark:border-white/[0.24] dark:bg-white/[0.04]"
          : "border-slate-200 focus-within:border-slate-300 dark:border-white/[0.08] dark:focus-within:border-white/[0.16]"
      }`}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-white/80 backdrop-blur-sm dark:bg-[#1a1a1a]/80">
          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">
            <Paperclip size={14} />
            Text-Datei hier ablegen
          </div>
        </div>
      )}
      {/* Hidden file input — opened by Plus-Menu "Datei hochladen". */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.csv,.html,.htm,.json,.xml,.log,text/plain,text/markdown,text/csv,text/html,application/json,text/xml"
        onChange={onFileInputChange}
        className="hidden"
        aria-hidden="true"
      />
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
              onPickFile={onPickFile}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Voice input — three visible states:
              idle/no-backend  → static Mic
              requesting       → spinner (waiting on permission prompt)
              recording        → pulsing red square (click to stop + transcribe)
              transcribing     → spinner (server processing)
            The hook gates feature availability so the button stays
            disabled when MediaRecorder is unsupported or OPENAI_API_KEY
            is missing server-side. */}
        <VoiceButton voice={voice} />

        {/* If the user is currently recording, show a small
            elapsed-time + size hint inline so they know it's live. */}
        {voice.state === "recording" && (
          <span className="ml-1 hidden text-[11px] tabular-nums text-red-600 dark:text-red-400 sm:inline">
            {voice.seconds}s
          </span>
        )}
        {voice.state === "transcribing" && (
          <span className="ml-1 hidden text-[11px] text-slate-500 sm:inline">
            transkribiert…
          </span>
        )}

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

      {/* Voice-error inline hint — only renders when the recorder
          surfaced a friendly German error string (mic denied, no
          backend, etc). Self-clearing on next start(). */}
      {voice.error && (
        <div className="mt-1 px-2 text-[11px] text-red-500 dark:text-red-400">
          {voice.error}
        </div>
      )}
      {fileError && (
        <div className="mt-1 flex items-start gap-2 px-2 text-[11px] text-red-500 dark:text-red-400">
          <span className="flex-1">{fileError}</span>
          <button
            type="button"
            onClick={() => setFileError(null)}
            className="shrink-0 underline-offset-2 hover:underline"
          >
            ausblenden
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Plus-menu popover ───────────────────────────────────────────────── */

function PlusMenu({
  toggles,
  onToggle,
  onClose: _onClose,
  onPickFile,
}: {
  toggles: typeof DEFAULT_TOGGLES;
  onToggle: (k: keyof typeof DEFAULT_TOGGLES) => void;
  onClose: () => void;
  onPickFile: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
      {/* Anhängen */}
      <MenuSection label="Anhängen">
        <MenuRow
          icon={<Paperclip size={14} />}
          label="Datei hochladen"
          hint="TXT, MD, CSV, HTML, JSON"
          onClick={onPickFile}
        />
        <MenuRow
          icon={<ImageIcon size={14} />}
          label="Foto hochladen"
          hint="folgt mit Vision-Support"
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

/* ── Voice-input button ──────────────────────────────────────────────── */

function VoiceButton({
  voice,
}: {
  voice: ReturnType<typeof useVoiceRecorder>;
}) {
  const disabled =
    voice.availability === "unsupported" ||
    voice.availability === "no-backend" ||
    voice.state === "transcribing";

  const tooltip = (() => {
    if (voice.availability === "unsupported") {
      return "Spracheingabe in diesem Browser nicht unterstützt";
    }
    if (voice.availability === "no-backend") {
      return "Spracheingabe noch nicht freigeschaltet";
    }
    if (voice.state === "recording") return "Aufnahme stoppen + transkribieren";
    if (voice.state === "transcribing") return "Transkribiert…";
    if (voice.state === "requesting") return "Mikrofonzugriff anfordern…";
    return "Spracheingabe starten";
  })();

  const onClick = () => {
    if (disabled) return;
    if (voice.state === "recording") voice.stop();
    else void voice.start();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        voice.state === "recording"
          ? "animate-pulse bg-red-500 text-white"
          : voice.availability === "unsupported" ||
              voice.availability === "no-backend"
            ? "text-slate-300 cursor-default dark:text-slate-700"
            : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
      }`}
    >
      {voice.state === "recording" ? (
        <Square size={11} strokeWidth={2.5} fill="currentColor" />
      ) : voice.state === "requesting" || voice.state === "transcribing" ? (
        <Loader2 size={14} className="animate-spin" />
      ) : voice.availability === "unsupported" ? (
        <MicOff size={15} />
      ) : (
        <Mic size={15} />
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
