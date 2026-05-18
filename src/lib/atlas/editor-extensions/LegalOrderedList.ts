/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — LegalOrderedList Extension.
 *
 * Sprint 11 (2026-05-18). Erweitert TipTap's OrderedList um einen
 * `listType` attribute der HTML's native <ol type="X"> nutzt:
 *
 *   "1" → 1, 2, 3, ...        (decimal, default)
 *   "I" → I, II, III, ...     (upper-roman, jur. Standard für Sections)
 *   "i" → i, ii, iii, ...     (lower-roman)
 *   "A" → A, B, C, ...        (upper-alpha, jur. für sub-points)
 *   "a" → a, b, c, ...        (lower-alpha, jur. häufig für sub-sub)
 *
 * Multi-Level legal numbering (§ 1 → I. → 1. → a) → aa)) wird im
 * Editor durch verschachtelte OrderedLists mit unterschiedlichen
 * listType-attributes abgebildet. Custom CSS-Counter für §-Markierung
 * via Klasse `legal-list-paragraph` (optional).
 *
 * HTML-Output: <ol type="I"> ... </ol> — wird von Browsern nativ
 * gerendert, behält die info bei save/load (HTML-Standard-Attribut).
 * Markdown-Roundtrip via turndown speichert es nicht direkt, aber bei
 * re-load via marked + custom-attribute kommt es zurück.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import OrderedList from "@tiptap/extension-ordered-list";

export type LegalListType = "1" | "I" | "i" | "A" | "a";

export const LegalOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listType: {
        default: "1",
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute("type") as LegalListType | null) ?? "1",
        renderHTML: (attributes: { listType?: LegalListType }) => {
          if (!attributes.listType || attributes.listType === "1") return {};
          return { type: attributes.listType };
        },
      },
    };
  },
});

/* Helper: human-readable label for the type-dropdown. */
export const LEGAL_LIST_TYPES: {
  value: LegalListType;
  label: string;
  preview: string;
}[] = [
  { value: "1", label: "Arabisch", preview: "1, 2, 3" },
  { value: "I", label: "Römisch groß", preview: "I, II, III" },
  { value: "i", label: "Römisch klein", preview: "i, ii, iii" },
  { value: "A", label: "Buchstaben groß", preview: "A, B, C" },
  { value: "a", label: "Buchstaben klein", preview: "a, b, c" },
];
