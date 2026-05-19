/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Insertion + Deletion Marks (Suggestions / Tracked Changes MVP).
 *
 * Sprint 16 (2026-05-19). MVP-version von Word's Track-Changes:
 * Reviewer markiert vorschläge MANUELL (statt auto-interception jedes
 * keystrokes — das wäre Phase 3, ~4-8 PM). Document-owner sieht alle
 * vorschläge im Sidebar-Panel + accept/reject pro item.
 *
 * Zwei marks:
 *   - InsertionMark: text der eingefügt werden SOLL (grün underline)
 *   - DeletionMark: text der gelöscht werden SOLL (rot strikethrough)
 *
 * Accept-flow:
 *   - Insertion accept → mark entfernen (text bleibt)
 *   - Deletion accept → text + mark entfernen (echt löschen)
 *
 * Reject-flow:
 *   - Insertion reject → text + mark entfernen
 *   - Deletion reject → nur mark entfernen (text bleibt)
 *
 * MD-Roundtrip via turndown-rule in editor-md-bridge.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Mark, mergeAttributes } from "@tiptap/core";

export interface SuggestionAttrs {
  suggestionId: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    insertionMark: {
      setInsertion: (attrs: SuggestionAttrs) => ReturnType;
      unsetInsertion: () => ReturnType;
    };
    deletionMark: {
      setDeletion: (attrs: SuggestionAttrs) => ReturnType;
      unsetDeletion: () => ReturnType;
    };
  }
}

export const InsertionMark = Mark.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: "insertion",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-suggestion-id") ?? null,
        renderHTML: (attrs) => {
          const id = attrs.suggestionId as string | undefined;
          return id ? { "data-suggestion-id": id } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "ins.atlas-insertion",
        getAttrs: (el) => ({
          suggestionId: (el as HTMLElement).getAttribute("data-suggestion-id"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ins",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "atlas-insertion",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setInsertion:
        (attrs: SuggestionAttrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetInsertion:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const DeletionMark = Mark.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: "deletion",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-suggestion-id") ?? null,
        renderHTML: (attrs) => {
          const id = attrs.suggestionId as string | undefined;
          return id ? { "data-suggestion-id": id } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "del.atlas-deletion",
        getAttrs: (el) => ({
          suggestionId: (el as HTMLElement).getAttribute("data-suggestion-id"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "del",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "atlas-deletion",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDeletion:
        (attrs: SuggestionAttrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetDeletion:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
