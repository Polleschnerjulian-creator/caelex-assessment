"use client";

import { useState, useRef, useEffect } from "react";
import { Quote, Check } from "lucide-react";
import type { LegalSource } from "@/data/legal-sources";
import {
  formatCitation,
  citationFormatLabel,
  CITATION_FORMATS,
  type CitationFormat,
} from "../_utils/citations";

interface Props {
  source: LegalSource;
}

/**
 * Small "Cite" dropdown button next to a source URL.
 * Click → menu with 4 citation formats.
 * Click a format → writes the formatted citation to the clipboard and
 * shows a checkmark for 1.5 s.
 */
export function CitationButton({ source }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<CitationFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function copy(format: CitationFormat) {
    const text = formatCitation(source, format);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(format);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // older browsers / insecure context
      window.prompt("Copy citation:", text);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-full px-2 py-0.5 transition-colors"
        title="Copy a formatted citation"
      >
        <Quote size={10} strokeWidth={2} />
        Cite
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-20 w-52 rounded-lg bg-white border border-gray-200 shadow-lg py-1 text-[11px]">
          {CITATION_FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => copy(f)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50"
            >
              <span>{citationFormatLabel(f)}</span>
              {copied === f ? (
                <Check
                  size={12}
                  strokeWidth={2.5}
                  className="text-emerald-500"
                />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
