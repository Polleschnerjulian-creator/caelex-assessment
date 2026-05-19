/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — CitationMark TipTap Extension.
 *
 * Sprint 13 (2026-05-18). Markiert eingefügten Zitat-Text (vom
 * CitationDialog) als TipTap-Mark mit data-citation-type attribute.
 * Das ist die Grundlage für:
 *
 *   1. Visual styling (italic + emerald subtle border-bottom)
 *   2. Table of Authorities — automatisches Quellenverzeichnis das
 *      alle markierten Zitate scant + nach typ gruppiert
 *   3. Future: Kurz-Zitat-Logik (zweite Nennung → "Möllers (Fn. 1)")
 *   4. Future: Click-to-edit über CitationDialog
 *
 * MD-Roundtrip: rendert als <span class="atlas-citation"
 * data-citation-type="X">…</span>. Turndown muss eine custom rule
 * haben die das als raw-HTML in markdown preserved (siehe
 * editor-md-bridge.ts).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Mark, mergeAttributes } from "@tiptap/core";

export type CitationKind =
  | "gesetz"
  | "urteil"
  | "bverfg-amtl"
  | "bghz-amtl"
  | "eugh"
  | "kommentar"
  | "lehrbuch"
  | "aufsatz"
  | "festschrift"
  | "eu-vo"
  | "online";

/** Display label per type — used by ToA generator for section headings. */
export const CITATION_KIND_LABEL: Record<CitationKind, string> = {
  gesetz: "Gesetze",
  urteil: "Rechtsprechung",
  "bverfg-amtl": "Rechtsprechung",
  "bghz-amtl": "Rechtsprechung",
  eugh: "Rechtsprechung",
  kommentar: "Kommentare",
  lehrbuch: "Lehrbücher",
  aufsatz: "Aufsätze",
  festschrift: "Festschriften",
  "eu-vo": "EU-Recht",
  online: "Online-Quellen",
};

/** Sort-order for ToA — Gesetze first, dann Rechtsprechung, dann Literatur. */
export const CITATION_KIND_ORDER: CitationKind[] = [
  "gesetz",
  "eu-vo",
  "urteil",
  "bverfg-amtl",
  "bghz-amtl",
  "eugh",
  "kommentar",
  "lehrbuch",
  "aufsatz",
  "festschrift",
  "online",
];

export interface CitationMarkAttrs {
  citationType: CitationKind;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citationMark: {
      /** Set the citation-mark on the current selection. */
      setCitation: (attrs: CitationMarkAttrs) => ReturnType;
      /** Remove the citation-mark from selection. */
      unsetCitation: () => ReturnType;
    };
  }
}

export const CitationMark = Mark.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: "citation",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      citationType: {
        default: "gesetz",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-citation-type") ?? "gesetz",
        renderHTML: (attrs) => {
          const t = attrs.citationType as string | undefined;
          return t ? { "data-citation-type": t } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.atlas-citation",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            citationType: node.getAttribute("data-citation-type") ?? "gesetz",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "atlas-citation",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCitation:
        (attrs: CitationMarkAttrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetCitation:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
