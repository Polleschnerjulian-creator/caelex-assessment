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
  X,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { ChatImageAttachment } from "./types";
import { ContextWindowIndicator } from "./ContextWindowIndicator";

/** Optional per-chat usage stats, surfaced in the composer's footer
 *  row via a Claude-Code-style donut. AtlasChatView passes real data;
 *  AtlasHomepage / MandateNewChatComposer omit it (the indicator
 *  then renders an empty-state 0 % ring so the affordance stays
 *  visible everywhere). */
export interface ChatInputContextStats {
  lastInputTokens: number | null;
  totalOutputTokens: number;
  totalCostUsd: number;
}

interface Props {
  initialValue?: string;
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
  ) => void | Promise<void>;
  showKorpusPill?: boolean;
  /** Per-chat token usage — drives the composer-footer donut.
   *  Optional: on the homepage / fresh chats the indicator renders
   *  its 0 % empty state. */
  contextStats?: ChatInputContextStats;
}

/* Anthropic Vision limits (stay conservative — the SDK accepts up to
   100 images per message but cost + latency push hard against that).
   5 MB raw matches Anthropic's documented per-image cap. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_TURN = 4;
const ACCEPTED_IMAGE_MIMES = new Set<ChatImageAttachment["mediaType"]>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

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
  contextStats,
}: Props) {
  const [text, setText] = useState(initialValue ?? "");
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [plusOpen, setPlusOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  /* Pending image attachments for the next send. Cleared on submit so
     the chip strip resets together with the textarea. */
  const [images, setImages] = useState<ChatImageAttachment[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  /* ⌘K via the keyboard-shortcuts hook fires `atlas-v2-focus-
     composer` — focus the textarea so the user can immediately type. */
  useEffect(() => {
    const handler = () => taRef.current?.focus();
    window.addEventListener("atlas-v2-focus-composer", handler);
    return () => window.removeEventListener("atlas-v2-focus-composer", handler);
  }, []);

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
      if (isPdf) {
        setFileError(
          "PDF-Extraktion folgt im nächsten Sprint. Bitte als TXT/MD speichern und erneut hochladen.",
        );
      } else {
        /* Image-files were previously rejected here with a "vision
           coming soon" message — vision is live now and the image
           drop-path branches BEFORE we ever reach this function (see
           onDrop below), so this fallback only fires for genuinely
           unsupported types like .docx / .zip / etc. */
        setFileError(
          `Dateityp nicht unterstützt (${file.type || file.name.split(".").pop()}). Aktuell: TXT, MD, CSV, HTML, JSON, XML — oder Foto via Plus-Menü.`,
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
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    /* Route by MIME — image files go straight to the vision pipeline,
       everything else falls through to the text-file extractor. This
       lets a lawyer drag a screenshot from Finder without first
       opening the Plus-menu. */
    void (async () => {
      for (const f of files) {
        const isImg =
          (f.type || "").startsWith("image/") ||
          /\.(jpe?g|png|gif|webp)$/i.test(f.name);
        if (isImg) {
          await handleImageFile(f);
        } else {
          await handleTextFile(f);
        }
      }
    })();
  };

  /* ── Photo-attach (Anthropic Vision — JPEG/PNG/GIF/WEBP) ───────────
     Reads the file via FileReader.readAsDataURL → strips the
     `data:image/...;base64,` prefix → stores the raw base64 in state.
     Anthropic's ImageBlockParam expects exactly that format on the
     server. Not uploaded to R2 — for ephemeral chat-attachments this
     keeps things round-trip-free, and the bytes ride along with the
     persisted AtlasMessage.content jsonb. */

  const readImageAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Bild konnte nicht gelesen werden"));
          return;
        }
        /* Strip leading "data:image/...;base64," — Anthropic's
           Base64ImageSource.data is the raw payload without prefix. */
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () =>
        reject(new Error("Bild konnte nicht gelesen werden"));
      reader.readAsDataURL(file);
    });

  const handleImageFile = async (file: File) => {
    setFileError(null);
    const mime = (file.type || "").toLowerCase();
    if (
      !ACCEPTED_IMAGE_MIMES.has(mime as ChatImageAttachment["mediaType"]) &&
      !file.name.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/)
    ) {
      setFileError(
        `Bildformat nicht unterstützt (${mime || file.name.split(".").pop()}). Erlaubt: JPEG, PNG, GIF, WEBP.`,
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError(
        `Bild zu groß (${Math.round(file.size / 1024)} KB; max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`,
      );
      return;
    }
    if (images.length >= MAX_IMAGES_PER_TURN) {
      setFileError(
        `Maximal ${MAX_IMAGES_PER_TURN} Bilder pro Nachricht. Bitte entferne ein Bild.`,
      );
      return;
    }
    try {
      const data = await readImageAsBase64(file);
      /* Normalise the media-type so it matches Anthropic's accepted
         set even if the browser filled in something exotic ("image/jpg"
         → "image/jpeg"). */
      const normMime: ChatImageAttachment["mediaType"] = (() => {
        if (mime === "image/jpg") return "image/jpeg";
        if (ACCEPTED_IMAGE_MIMES.has(mime as ChatImageAttachment["mediaType"]))
          return mime as ChatImageAttachment["mediaType"];
        const ext = file.name.toLowerCase().split(".").pop();
        if (ext === "png") return "image/png";
        if (ext === "gif") return "image/gif";
        if (ext === "webp") return "image/webp";
        return "image/jpeg";
      })();
      setImages((prev) => [
        ...prev,
        { fileName: file.name, mediaType: normMime, data },
      ]);
    } catch (e) {
      setFileError(
        e instanceof Error ? e.message : "Bild konnte nicht gelesen werden",
      );
    }
  };

  const onPickImage = () => {
    setPlusOpen(false);
    imageInputRef.current?.click();
  };

  const onImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    /* Sequential await keeps the cap-check honest — parallel awaits
       would let 8 files race past the MAX_IMAGES_PER_TURN gate. */
    for (const f of files) {
      await handleImageFile(f);
    }
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    const v = text.trim();
    /* Allow image-only messages so the user can drop a screenshot and
       say "what's in this?" via voice or a one-word prompt. But the
       composer still requires SOMETHING — either text or images — so
       a stray Enter doesn't fire an empty turn. */
    if (!v && images.length === 0) return;
    if (disabled) return;
    void onSubmit(v, toggles, images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
    setFileError(null);
  };

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasText = text.trim().length > 0;
  /* Send button enables when there's text OR at least one image
     attachment (image-only turns are valid for "what's in this?"). */
  const canSend = hasText || images.length > 0;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-[28px] border bg-white px-3 pt-3 pb-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors dark:bg-[#212121] dark:shadow-none ${
        /* Background AND shadow now match the canvas perfectly in
           dark mode (`bg-[#212121]` + `shadow-none`). The previous
           `0_8px_24px_rgba(0,0,0,0.25)` shadow read on the canvas
           as a darker halo around the pill — by contrast the pill
           appeared lighter, even though both were #212121. Killing
           the shadow leaves the border as the only edge cue, à la
           Claude.ai's composer.

           Light mode keeps a soft 4 % shadow because on a white
           canvas the eye expects some lift on form controls — that
           shadow doesn't create the inverse-halo problem. */
        dragOver
          ? "border-slate-400 bg-slate-50 dark:border-white/[0.24] dark:bg-white/[0.04]"
          : "border-slate-200 focus-within:border-slate-300 dark:border-white/[0.08] dark:focus-within:border-white/[0.16]"
      }`}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-white/80 backdrop-blur-sm dark:bg-[#212121]/80">
          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">
            <Paperclip size={14} />
            Datei oder Bild hier ablegen
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
      {/* Hidden image input — opened by Plus-Menu "Foto hochladen". */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        multiple
        onChange={(e) => void onImageInputChange(e)}
        className="hidden"
        aria-hidden="true"
      />
      {/* Image-attachment chip strip. Renders above the textarea so
          the user always sees what will ride along with the next send.
          Click the X to remove a single image. */}
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-1">
          {images.map((img, i) => (
            <div
              key={`${img.fileName}-${i}`}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={img.fileName}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label={`Bild ${img.fileName} entfernen`}
                className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
              <div
                className="absolute inset-x-0 bottom-0 line-clamp-1 bg-gradient-to-t from-black/60 to-transparent px-1 pb-0.5 pt-2 text-[8.5px] text-white"
                title={img.fileName}
              >
                {img.fileName}
              </div>
            </div>
          ))}
        </div>
      )}
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
              onPickImage={onPickImage}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Context-window donut — Claude-Code-style usage indicator.
            Sits between flex-1 spacer and the voice button so it's
            visible in every composer surface (homepage, chat-view,
            mandate-detail). Tooltip opens UPWARD because the
            composer hugs the bottom edge of the viewport. */}
        <ContextWindowIndicator
          lastInputTokens={contextStats?.lastInputTokens ?? null}
          totalOutputTokens={contextStats?.totalOutputTokens ?? 0}
          totalCostUsd={contextStats?.totalCostUsd ?? 0}
          compact
        />

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
          disabled={!canSend || disabled}
          aria-label="Senden"
          className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            canSend && !disabled
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
  onPickImage,
}: {
  toggles: typeof DEFAULT_TOGGLES;
  onToggle: (k: keyof typeof DEFAULT_TOGGLES) => void;
  onClose: () => void;
  onPickFile: () => void;
  onPickImage: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
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
          hint="JPEG, PNG, GIF, WEBP — max 5 MB"
          onClick={onPickImage}
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
