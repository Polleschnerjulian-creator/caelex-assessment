"use client";

/**
 * CiteExport — copy a source/case citation as BibTeX or RIS, or print.
 * Pure client interaction; formatting lives in @/lib/scholar/citation.
 */

import { useState } from "react";
import { Quote, Printer, Check } from "lucide-react";
import { useScholarLocale } from "../_i18n/LocaleProvider";
import { t } from "../_i18n/core";
import { SOURCE } from "../_i18n/source";
import { toBibTeX, toRIS, type CitationInput } from "@/lib/scholar/citation";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-small text-gray-800 hover:border-gray-400 hover:bg-gray-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]";

export function CiteExport({ citation }: { citation: CitationInput }) {
  const locale = useScholarLocale();
  const [copied, setCopied] = useState<"bibtex" | "ris" | null>(null);

  const copy = async (kind: "bibtex" | "ris") => {
    const text = kind === "bibtex" ? toBibTeX(citation) : toRIS(citation);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 scholar-noprint">
      <button type="button" onClick={() => copy("bibtex")} className={BTN}>
        {copied === "bibtex" ? <Check size={14} /> : <Quote size={14} />}
        {copied === "bibtex"
          ? t(locale, SOURCE, "copied")
          : t(locale, SOURCE, "copyBibtex")}
      </button>
      <button type="button" onClick={() => copy("ris")} className={BTN}>
        {copied === "ris" ? <Check size={14} /> : <Quote size={14} />}
        {copied === "ris"
          ? t(locale, SOURCE, "copied")
          : t(locale, SOURCE, "copyRis")}
      </button>
      <button type="button" onClick={() => window.print()} className={BTN}>
        <Printer size={14} />
        {t(locale, SOURCE, "print")}
      </button>
    </div>
  );
}
