/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — CommentMark TipTap Extension.
 *
 * Sprint 15 (2026-05-19). Wrappt text-selection mit einer comment-mark
 * die einen `commentId` attribute trägt. Die volle comment-daten
 * (author, text, createdAt, resolved, replies) leben in einem separaten
 * React-state-array, gemapped via id. Pattern matches Word/Google Docs
 * comments: mark im document = "hier ist ein comment", panel rechts =
 * "das ist sein inhalt".
 *
 * Visual: gelber margin-highlight (wie sticky-note) auf dem mark-text.
 * Resolved comments verlieren ihre färbung (struck-through optional).
 *
 * MD-Roundtrip: rendert als <span class="atlas-comment" data-comment-id="...">.
 * Roundtrip-preservation via turndown-rule in editor-md-bridge.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkAttrs {
  commentId: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      /** Wrap the current selection with a comment-mark. */
      setComment: (attrs: CommentMarkAttrs) => ReturnType;
      /** Remove all comment-marks from current selection. */
      unsetComment: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: "comment",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-comment-id") ?? null,
        renderHTML: (attrs) => {
          const id = attrs.commentId as string | undefined;
          return id ? { "data-comment-id": id } : {};
        },
      },
      resolved: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-resolved") === "true",
        renderHTML: (attrs) => {
          return attrs.resolved ? { "data-resolved": "true" } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.atlas-comment",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            commentId: node.getAttribute("data-comment-id"),
            resolved: node.getAttribute("data-resolved") === "true",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "atlas-comment",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attrs: CommentMarkAttrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
