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
  Mic,
  MicOff,
  Square,
  Loader2,
  Paperclip,
  Briefcase,
  X,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { ChatImageAttachment } from "./types";
import { MandateAttachChip } from "./MandateAttachChip";
import { MandateAttachModal } from "./MandateAttachModal";
import { ContextWindowIndicator } from "./ContextWindowIndicator";

/** Optional per-chat usage stats, surfaced in the composer's footer
 *  row via a Claude-Code-style donut. AtlasChatView passes real data
 *  (sums across all turns of the chat); AtlasHomepage /
 *  MandateNewChatComposer omit it (the indicator then renders an
 *  empty-state 0 % ring so the affordance stays visible everywhere). */
export interface ChatInputContextStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

interface Props {
  initialValue?: string;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Mandat-Attach-State — controlled vom Parent so dass derselbe
   * State über Reload / Navigation hinweg konsistent bleibt. Wenn
   * der Parent ihn nicht reicht, läuft der ChatInput im uncontrolled-
   * Modus mit lokalem useState.
   */
  attachedMandate?: { id: string; name: string } | null;
  onAttachMandate?: (mandate: { id: string; name: string } | null) => void;
  onSubmit: (
    text: string,
    toolToggles: Record<string, boolean>,
    images?: ChatImageAttachment[],
    mandateId?: string | null,
  ) => void | Promise<void>;
  showKorpusPill?: boolean;
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

/* All tools always-on (UX simplification 2026-05-13). The lawyer
   shouldn't have to think about which tool-bundle is active —
   Atlas decides per-turn which to actually invoke. The toggle-UI
   was visual noise + a foot-gun (lawyer accidentally disabled
   Korpus → Atlas couldn't search → blamed the tool).

   `web` stays true as well; the per-turn cost is small and most
   queries don't trigger web-search anyway. */
const DEFAULT_TOGGLES = {
  korpus: true,
  compliance: true,
  comparison: true,
  drafting: true,
  validity: true,
  documents: true,
  web: true,
  workflow: true,
  mandate: true,
};

export function ChatInput({
  initialValue,
  disabled,
  placeholder,
  attachedMandate,
  onAttachMandate,
  onSubmit,
  contextStats,
}: Props) {
  const [text, setText] = useState(initialValue ?? "");
  /* AUDIT-FIX L12 (2026-05-15): `toggles` is never mutated post-mount
     — `useState(DEFAULT_TOGGLES)` only added a needless component-state
     slot and an extra re-render-on-init cost. DEFAULT_TOGGLES is already
     module-level + frozen-by-convention, so a plain reference is enough.
     The chat-engine contract (toolToggles record on submit) is untouched
     because `handleSend` reads `toggles` exactly as before. */
  const toggles = DEFAULT_TOGGLES;
  const [plusOpen, setPlusOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  /* Pending image attachments for the next send. Cleared on submit so
     the chip strip resets together with the textarea. */
  const [images, setImages] = useState<ChatImageAttachment[]>([]);
  /* Per-file status during PDF/DOCX extraction. Shows a spinner-strip
     under the composer while server-side extraction runs. */
  const [extracting, setExtracting] = useState<string[]>([]);
  /* Mandate-Attach: uncontrolled-Fallback wenn Parent keinen
     attachedMandate prop reicht. Wir kombinieren beide Pfade so
     dass `effectiveMandate` immer die Wahrheit ist (Prop dominiert
     wenn vorhanden). */
  const [localMandate, setLocalMandate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const effectiveMandate = attachedMandate ?? localMandate;
  const [mandateModalOpen, setMandateModalOpen] = useState(false);

  const setAttachedMandate = (m: { id: string; name: string } | null) => {
    /* Controlled-Pfad: Parent verwaltet, wir rufen nur den Callback. */
    if (onAttachMandate) {
      onAttachMandate(m);
      return;
    }
    /* Uncontrolled-Pfad: lokaler State. */
    setLocalMandate(m);
  };
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
      /* PDF / DOCX go through server-side extraction (separate
         function below). Image-files have their own drag-drop branch.
         Anything else falls through as unsupported. */
      const lower = file.name.toLowerCase();
      const isPdfOrDocx =
        file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        lower.endsWith(".pdf") ||
        lower.endsWith(".docx");
      if (isPdfOrDocx) {
        await handleBinaryDocument(file);
        return;
      }
      setFileError(
        `Dateityp nicht unterstützt (${file.type || file.name.split(".").pop()}). Aktuell: TXT, MD, CSV, HTML, JSON, XML, PDF, DOCX — oder Foto via Plus-Menü.`,
      );
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
    } catch {
      setFileError("Datei konnte nicht gelesen werden.");
    }
  };

  /* ── Binary-document attach (PDF / DOCX) ───────────────────────────
     Posts the file to /api/atlas/extract → server-side text extract
     (unpdf for PDF, mammoth for DOCX) → splices the returned text
     into the textarea as a fenced block. Hard cap 10 MB enforced
     server-side; we show a spinner-strip while extraction runs
     (typical PDF takes ~1 s, DOCX ~200 ms). */

  const handleBinaryDocument = async (file: File) => {
    setFileError(null);
    setExtracting((prev) => [...prev, file.name]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/atlas/extract", {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as {
        text?: string;
        truncated?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setFileError(body.error || `Extraktion fehlgeschlagen (${res.status})`);
        return;
      }
      const extracted = body.text ?? "";
      if (!extracted.trim()) {
        setFileError("Datei enthielt keinen extrahierbaren Text.");
        return;
      }
      const truncNote = body.truncated
        ? "\n[Anhang gekürzt — weiterer Text wurde aus Kontextgründen abgeschnitten.]"
        : "";
      const block = `\n\n--- Anhang: ${file.name} ---\n${extracted}${truncNote}\n--- /Anhang ---\n\n`;
      setText((prev) => (prev ? prev + block : block.trimStart()));
      taRef.current?.focus();
    } catch (e) {
      setFileError(
        e instanceof Error
          ? `Extraktion fehlgeschlagen: ${e.message}`
          : "Extraktion fehlgeschlagen.",
      );
    } finally {
      setExtracting((prev) => prev.filter((n) => n !== file.name));
    }
  };

  const onPickFile = () => {
    setPlusOpen(false);
    fileInputRef.current?.click();
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

  /* Unified file-router (UX simplification 2026-05-13). One picker,
     one handler — detect by MIME / extension and route to the right
     pipeline (image-vision / PDF-extract / DOCX-extract / text-
     splice). The lawyer doesn't care if it's a "Foto" or "Datei" —
     they just want to share something with Atlas. */
  const handleAnyFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    const isImg =
      (file.type || "").startsWith("image/") ||
      /\.(jpe?g|png|gif|webp)$/i.test(lower);
    if (isImg) {
      await handleImageFile(file);
      return;
    }
    /* handleTextFile already routes PDFs / DOCX to handleBinaryDocument
       internally — re-using it as the catch-all for non-image files. */
    await handleTextFile(file);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    const v = text.trim();
    /* Allow image-only messages; allow mandate-attach-only-Sends nicht
       (Mandate ohne Text/Bild ergibt keinen Turn). */
    if (!v && images.length === 0) return;
    if (disabled) return;
    void onSubmit(
      v,
      toggles,
      images.length > 0 ? images : undefined,
      effectiveMandate?.id ?? null,
    );
    setText("");
    setImages([]);
    setFileError(null);
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
      className={`relative rounded-[28px] border bg-white px-3 pt-3 pb-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors dark:bg-[#1a1a1a] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
        /* Glassmorphism: pill bg is DARKER than the canvas (canvas
           #212121, pill #1a1a1a) + soft shadow so the composer
           visually lifts off the canvas. The textarea inside uses
           `bg-transparent` and therefore inherits this same #1a1a1a
           — no inner "field-within-a-field" effect.

           This is the intentional design choice the lawyer
           confirmed they prefer over the canvas-matching variant. */
        dragOver
          ? "border-slate-400 bg-slate-50 dark:border-white/[0.24] dark:bg-white/[0.04]"
          : "border-slate-200 focus-within:border-slate-300 dark:border-white/[0.08] dark:focus-within:border-white/[0.16]"
      }`}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-white/80 backdrop-blur-sm dark:bg-[#1a1a1a]/80">
          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-200">
            <Paperclip size={14} />
            Datei oder Bild hier ablegen
          </div>
        </div>
      )}
      {/* Single unified file input — opened by Plus-Menu "Datei
          oder Bild hochladen". The handler routes by MIME / ext to
          either the image-vision pipeline (JPEG/PNG/GIF/WEBP), the
          PDF/DOCX-extract pipeline, or direct text-splice. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.csv,.html,.htm,.json,.xml,.log,.pdf,.docx,.jpg,.jpeg,.png,.gif,.webp,text/plain,text/markdown,text/csv,text/html,application/json,text/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          /* Sequential await keeps the cap-check honest — parallel
             awaits would let 8 image-files race past the
             MAX_IMAGES_PER_TURN gate. */
          for (const f of files) {
            await handleAnyFile(f);
          }
          e.target.value = "";
        }}
        className="hidden"
        aria-hidden="true"
      />
      {/* PDF/DOCX-Extraktion-Live-Strip. Spinner-Zeile pro Datei die
          gerade noch server-side extrahiert wird. Verschwindet sobald
          Server-Antwort da ist + Text in Textarea spliced. */}
      {extracting.length > 0 && (
        <div className="mb-2 flex flex-col gap-1 px-1">
          {extracting.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
            >
              <Loader2
                size={12}
                className="shrink-0 animate-spin motion-reduce:animate-none"
              />
              <span className="flex-1 truncate" title={name}>
                {name}
              </span>
              <span className="shrink-0 text-slate-400">extrahiert Text…</span>
            </div>
          ))}
        </div>
      )}

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
      {/* Mandate-Chip — pill oberhalb der Textarea wenn ein Mandat
          angehängt ist. Klick auf [×] detached. */}
      {effectiveMandate && (
        <div className="px-1">
          <MandateAttachChip
            mandateId={effectiveMandate.id}
            mandateName={effectiveMandate.name}
            onDetach={() => setAttachedMandate(null)}
          />
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
        {/* The single Plus button — opens a minimal popover with the
            file-upload affordance. Tools + Recherche-Toggles wurden
            entfernt (UX simplification 2026-05-13) — Atlas läuft mit
            allen Tools immer auto-aktiv. */}
        <div ref={popRef} className="relative">
          <IconButton
            title="Datei oder Bild hochladen"
            active={plusOpen}
            onClick={() => setPlusOpen((v) => !v)}
          >
            <Plus size={16} />
          </IconButton>
          {plusOpen && (
            <PlusMenu
              onPickFile={onPickFile}
              onPickMandate={() => {
                setPlusOpen(false);
                setMandateModalOpen(true);
              }}
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
          totalInputTokens={contextStats?.totalInputTokens ?? 0}
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
          className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all motion-reduce:transition-none ${
            canSend && !disabled
              ? "bg-slate-900 text-white hover:scale-105 motion-reduce:hover:scale-100 dark:bg-white dark:text-black"
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
      <MandateAttachModal
        open={mandateModalOpen}
        onClose={() => setMandateModalOpen(false)}
        onSelect={(m) => {
          setAttachedMandate(m);
          setMandateModalOpen(false);
          /* Sidebar muss MandateContextSection neu resolven. Das
             existing event-bus dispatched dafür. */
          window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
        }}
      />
    </div>
  );
}

/* ── Plus-menu popover ───────────────────────────────────────────────── */

/**
 * Minimal single-entry popover (UX simplification 2026-05-13).
 *
 * Was: 3 Sections (Anhängen, Recherche, Tools) × ~10 rows total — opens
 *      UPWARDS via `bottom-full mb-2`. The lawyer's brain had to
 *      decide which tools to enable per turn AND which file-flavour
 *      to upload. Both decisions were noise.
 *
 * Now: ONE row — "Datei oder Bild hochladen" — opens DOWNWARDS via
 *      `top-full mt-2` (matches Claude.ai / ChatGPT muscle memory).
 *      File-router auto-detects image vs text/PDF/DOCX based on MIME
 *      / extension and dispatches to the right pipeline. All tools
 *      always-on; Atlas decides per-turn which to actually invoke.
 *
 * Helper components (MenuRow / MenuSection / MenuDivider) are kept
 * exported-internal for potential future re-introduction (e.g. an
 * eventual "Insert from mandate file" entry), but only MenuRow is
 * currently called.
 */
/**
 * Minimal Popover (UX simplification 2026-05-13). Aktuell zwei
 * Einträge: Datei-Upload + Mandat-Anhängen. Opens DOWNWARDS
 * (top-full mt-2) für Claude.ai-Muscle-Memory.
 */
function PlusMenu({
  onPickFile,
  onPickMandate,
}: {
  onPickFile: () => void;
  onPickMandate: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:shadow-[0_8px_24px_rgba(0,0,0,0.40)]">
      <div className="px-1">
        <MenuRow
          icon={<Paperclip size={14} />}
          label="Datei oder Bild hochladen"
          hint="PDF, DOCX, TXT, MD, JPG, PNG"
          onClick={onPickFile}
        />
        <MenuRow
          icon={<Briefcase size={14} />}
          label="Mandat anhängen"
          hint="Vault + Kontext"
          onClick={onPickMandate}
        />
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
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
          ? "animate-pulse motion-reduce:animate-none bg-red-500 text-white"
          : voice.availability === "unsupported" ||
              voice.availability === "no-backend"
            ? "text-slate-300 cursor-default dark:text-slate-700"
            : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
      }`}
    >
      {voice.state === "recording" ? (
        <Square size={11} strokeWidth={2.5} fill="currentColor" />
      ) : voice.state === "requesting" || voice.state === "transcribing" ? (
        <Loader2
          size={14}
          className="animate-spin motion-reduce:animate-none"
        />
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
