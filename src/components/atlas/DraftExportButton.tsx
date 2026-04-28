"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileCode, ChevronDown, Check } from "lucide-react";
import {
  exportDraftAsWord,
  exportDraftAsMarkdown,
} from "@/lib/atlas/draft-export";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Export-as-Word/Markdown dropdown for any Astra-streamed message.
 *
 * Mounted next to the Library save chip on completed Atlas messages
 * in AIMode. Single dropdown with two formats:
 *
 *   • Word (.doc) — Word-flavoured HTML, opens directly in Office
 *     Word with headings, bold, lists, tables, citation pills.
 *   • Markdown (.md) — plain text for Notion / Obsidian / DMS.
 *
 * Compact "icon + caret" variant sits inside the chat bubble; doesn't
 * compete with the Library save chip.
 */
export function DraftExportButton({
  content,
  /** Optional title — falls back to the first heading or first line. */
  title,
  /** Compact = icon-only header, no label. Default true (chat bubble). */
  compact = true,
}: {
  content: string;
  title?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [exported, setExported] = useState<"word" | "markdown" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();
  // The export helper accepts en|de — collapse fr/es to en for chrome.
  // Pilot is bilingual EN/DE; if we add full FR/ES later we'll widen
  // the helper's locale param.
  const exportLocale: "en" | "de" = language === "de" ? "de" : "en";
  const isDe = language === "de";

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleWord = () => {
    exportDraftAsWord({ markdown: content, title, locale: exportLocale });
    setExported("word");
    setOpen(false);
    setTimeout(() => setExported(null), 1800);
  };
  const handleMarkdown = () => {
    exportDraftAsMarkdown({ markdown: content, title, locale: exportLocale });
    setExported("markdown");
    setOpen(false);
    setTimeout(() => setExported(null), 1800);
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("atlas.export_draft_aria")}
        aria-label={t("atlas.export_draft_aria")}
        aria-expanded={open}
        className={
          compact
            ? "inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors"
            : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--atlas-text-muted)] border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:text-[var(--atlas-text-primary)] hover:border-[var(--atlas-border-strong)] transition-colors"
        }
      >
        {exported ? (
          <Check
            className="h-3 w-3 text-emerald-400"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : (
          <Download className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
        )}
        {!compact && (
          <span>
            {exported ? t("atlas.export_done") : t("atlas.export_label")}
          </span>
        )}
        <ChevronDown
          className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-1 z-50 w-56 rounded-lg border border-black/20 bg-[#0f0f12] shadow-2xl overflow-hidden"
        >
          <button
            type="button"
            onClick={handleWord}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-white/85 hover:bg-white/5 transition-colors"
          >
            <FileText
              className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-[12px] font-medium">Word (.doc)</div>
              <p className="text-[10px] text-white/40 mt-0.5">
                {isDe
                  ? "Öffnet direkt in Office Word, Formatierung erhalten"
                  : "Opens in Office Word, formatting preserved"}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleMarkdown}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-white/85 hover:bg-white/5 transition-colors border-t border-white/[0.04]"
          >
            <FileCode
              className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-[12px] font-medium">Markdown (.md)</div>
              <p className="text-[10px] text-white/40 mt-0.5">
                {isDe
                  ? "Für Notion, Obsidian, DMS-Imports"
                  : "For Notion, Obsidian, DMS imports"}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
