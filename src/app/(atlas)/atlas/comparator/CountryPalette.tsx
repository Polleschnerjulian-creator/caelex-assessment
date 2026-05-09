"use client";

/**
 * Atlas Comparator — Cmd+K country palette.
 *
 * Audit D6 (delight, ~3h): Linear-style command palette for the
 * comparator. Press ⌘K (or Ctrl+K on non-Mac), type a few country
 * codes ("fr de uk ch"), hit Enter — selection updated instantly.
 * Recognised tokens:
 *   - ISO codes: "FR", "de", "uk", etc.
 *   - "EU" or "EU only": replace selection with EU member states
 *   - "clear": empty the selection
 *
 * Keyboard-first parallel to the click-driven CountrySelector. Lawyers
 * who type fast (most associates) can build a 5-jurisdiction selection
 * in under 2 seconds.
 */

import { useEffect, useRef, useState } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import { EU_MEMBER_STATES } from "@/lib/space-law-types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import { COMPARATOR_MAX_COUNTRIES } from "@/lib/atlas/comparator-state";

interface CountryPaletteProps {
  open: boolean;
  onClose: () => void;
  onApply: (next: SpaceLawCountryCode[]) => void;
  language: "de" | "en" | "fr" | "es";
}

/* Folded matcher — same approach as the CountrySelector search. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss");
}

interface ParseResult {
  /** Resolved country codes in input order, deduped, capped at MAX. */
  codes: SpaceLawCountryCode[];
  /** Tokens we couldn't resolve — surfaced to the user as feedback. */
  unknown: string[];
  /** "EU only" / "clear" intents that should override the codes path. */
  intent: "eu" | "clear" | null;
}

function parseQuery(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { codes: [], unknown: [], intent: null };
  const lower = trimmed.toLowerCase();
  /* Special intents recognised before code-parsing. */
  if (lower === "clear" || lower === "leeren" || lower === "reset") {
    return { codes: [], unknown: [], intent: "clear" };
  }
  if (lower === "eu" || lower === "eu only" || lower === "nur eu") {
    return {
      codes: EU_MEMBER_STATES.slice(
        0,
        COMPARATOR_MAX_COUNTRIES,
      ) as SpaceLawCountryCode[],
      unknown: [],
      intent: "eu",
    };
  }
  /* Tokenise on whitespace OR commas — both feel natural for codes. */
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  const codes: SpaceLawCountryCode[] = [];
  const unknown: string[] = [];
  for (const tok of tokens) {
    /* First try uppercase exact match against JURISDICTION_DATA keys. */
    const upper = tok.toUpperCase();
    if (JURISDICTION_DATA.has(upper as SpaceLawCountryCode)) {
      const code = upper as SpaceLawCountryCode;
      if (!codes.includes(code) && codes.length < COMPARATOR_MAX_COUNTRIES) {
        codes.push(code);
      }
      continue;
    }
    /* Otherwise try a fuzzy name match. ASCII-folded prefix match
       so "österr" finds Austria, "belg" finds Belgium. */
    const folded = fold(tok);
    let matched = false;
    for (const [code, data] of JURISDICTION_DATA.entries()) {
      if (fold(data.countryName).startsWith(folded)) {
        if (!codes.includes(code) && codes.length < COMPARATOR_MAX_COUNTRIES) {
          codes.push(code);
        }
        matched = true;
        break;
      }
    }
    if (!matched) unknown.push(tok);
  }
  return { codes, unknown, intent: null };
}

export function CountryPalette({
  open,
  onClose,
  onApply,
  language,
}: CountryPaletteProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-focus on open + clear on close. */
  useEffect(() => {
    if (open) {
      setInput("");
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  /* ESC to close. Listening at the window level so the user doesn't
     have to click into the modal first. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const parsed = parseQuery(input);
  const isDe = language === "de";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.intent === "clear") {
      onApply([]);
      onClose();
      return;
    }
    if (parsed.codes.length > 0) {
      onApply(parsed.codes);
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isDe ? "Jurisdiktionen wählen" : "Choose jurisdictions"}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit}
          className="border-b border-[var(--atlas-border-subtle)]"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isDe
                ? 'z.B. "fr de uk", "EU", "clear"…'
                : 'e.g. "fr de uk", "EU", "clear"…'
            }
            className="w-full bg-transparent px-4 py-3.5 text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)] outline-none"
            aria-label={
              isDe
                ? "Jurisdiktions-Codes oder Namen"
                : "Jurisdiction codes or names"
            }
          />
        </form>
        <div className="px-4 py-2.5 text-[11px] text-[var(--atlas-text-muted)] border-b border-[var(--atlas-border-subtle)] flex items-center justify-between">
          <span>
            {parsed.intent === "clear"
              ? isDe
                ? "Auswahl leeren"
                : "Clear selection"
              : parsed.intent === "eu"
                ? isDe
                  ? `Alle EU-Mitgliedsstaaten (${parsed.codes.length})`
                  : `All EU member states (${parsed.codes.length})`
                : parsed.codes.length > 0
                  ? isDe
                    ? `${parsed.codes.length} Jurisdiktion${parsed.codes.length === 1 ? "" : "en"} erkannt: ${parsed.codes.join(", ")}`
                    : `${parsed.codes.length} jurisdiction${parsed.codes.length === 1 ? "" : "s"} recognised: ${parsed.codes.join(", ")}`
                  : isDe
                    ? "Tippen Sie Codes oder Namen, dann Enter."
                    : "Type codes or names, then press Enter."}
          </span>
          <span className="text-[10px] text-[var(--atlas-text-faint)]">
            <kbd className="px-1 py-0.5 rounded bg-[var(--atlas-bg-inset)] mr-1">
              Enter
            </kbd>
            {isDe ? "anwenden" : "apply"}
            <span className="mx-1.5">·</span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--atlas-bg-inset)]">
              Esc
            </kbd>
          </span>
        </div>
        {parsed.unknown.length > 0 && (
          <div className="px-4 py-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10">
            {isDe ? "Unbekannt: " : "Unknown: "}
            {parsed.unknown.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
