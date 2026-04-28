"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Translation-provenance banner for source-detail and compare-articles
 * pages. Renders when:
 *   1. UI language is set to one that doesn't match the source's
 *      authentic-language jurisdiction (e.g. user is reading German
 *      while looking at an EU directive, an Outer-Space-Treaty entry,
 *      or a French national law).
 *   2. The source has at least one Caelex-curated translation in
 *      `LEGAL_SOURCE_TRANSLATIONS_DE` (or sister files for other
 *      languages).
 *
 * Why this matters: Atlas's German rendering of an EU directive is
 * NOT the EUR-Lex DE version — it's a Caelex editorial summary
 * authored from the source-language text, sometimes consulting the
 * EUR-Lex DE official translation but never copying it verbatim. A
 * lawyer reading a Caelex DE summary of NIS2 Art. 21 might otherwise
 * mistake it for the binding German version. This banner tells them
 * up-front: "This is Caelex's German rendering. The binding
 * language version is EUR-Lex / Amtsblatt / depositary text."
 *
 * Closes audit-finding #7 (translations-de.ts EUR-Lex attribution).
 *
 * Pure presentational — drop into the top of a source-detail page or
 * compare-articles column header.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Languages } from "lucide-react";
import type { Language } from "@/lib/i18n";

/** Map of `LegalSource.jurisdiction` → the language code in which the
 *  source's authentic text is published. Used to decide whether the
 *  user's UI language disagrees with the binding language and we
 *  therefore need to show the provenance banner.
 *
 *  Defaults: each ISO-alpha-2 country code maps to its primary
 *  official language (or English where the country has multiple
 *  official languages but publishes statutes in English by default).
 *  Unmapped jurisdictions default to "en" — conservative since the
 *  banner will fire whenever language !== "en", which is the safest
 *  outcome for unrecognised jurisdictions. */
const AUTHENTIC_LANGUAGES: Record<string, Language[]> = {
  // EU instruments are authentic in all 24 official EU languages —
  // we list de + en here because those are the locales Atlas ships.
  // The point of the banner isn't to claim EUR-Lex DE is missing —
  // it's to remind the user that Caelex's DE rendering is editorial,
  // not the EUR-Lex DE official translation.
  EU: ["en"],
  INT: ["en"],
  DE: ["de"],
  AT: ["de"],
  CH: ["de"],
  US: ["en"],
  UK: ["en"],
  AU: ["en"],
  NZ: ["en"],
  CA: ["en"],
  IE: ["en"],
  FR: ["en"],
  IT: ["en"],
  ES: ["en"],
  NL: ["en"],
  SE: ["en"],
  NO: ["en"],
  EE: ["en"],
  AE: ["en"],
};

export function TranslationProvenanceNotice({
  jurisdiction,
  language,
}: {
  /** Parent `LegalSource.jurisdiction`. */
  jurisdiction: string | undefined | null;
  /** Active UI language. */
  language: Language;
}) {
  if (!jurisdiction) return null;
  const authenticLangs = AUTHENTIC_LANGUAGES[jurisdiction.toUpperCase()] ?? [
    "en",
  ];

  // No banner when the user is already reading in an authentic
  // language for this jurisdiction — nothing to disclose.
  if (authenticLangs.includes(language)) return null;

  const isDe = language === "de";

  return (
    <div
      className="flex items-start gap-2 rounded-md border border-blue-200 dark:border-blue-700/40 bg-blue-50/70 dark:bg-blue-900/15 px-3 py-2 text-[11.5px] leading-relaxed text-blue-900 dark:text-blue-100"
      role="note"
    >
      <Languages
        className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
        strokeWidth={1.6}
        aria-hidden="true"
      />
      <p>
        {isDe ? (
          <>
            <strong>Caelex-Übersetzung.</strong> Titel und
            Bestimmungs­zusammenfassungen auf dieser Seite sind redaktionelle
            deutsche Fassungen von Caelex — keine wörtliche Wiedergabe der
            offiziellen deutschen Sprachfassung. Verbindlich ist allein die im
            jeweiligen offiziellen Veröffentlichungsorgan publizierte Fassung
            (EU-Recht: Amtsblatt der EU; UN-Verträge: Vertragsdepositum;
            nationales Recht: jeweiliges Gesetzblatt). Den verlinkten amtlichen
            Originaltext finden Sie in der unteren Quellen­zeile sowie bei jeder
            „Original-Wortlaut"-Box.
          </>
        ) : (
          <>
            <strong>Caelex translation.</strong> Titles and provision summaries
            on this page are Caelex-authored renderings — not verbatim copies of
            any official translation. Only the version published in the
            respective official channel is authentic (EU law: Official Journal
            of the European Union; UN treaties: depositary text; national law:
            respective state gazette). Find the linked official text in the
            source row at the bottom of the page and inside each &quot;Verbatim
            text&quot; box.
          </>
        )}
      </p>
    </div>
  );
}
