"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Renders an Astra answer with inline Atlas-ID deep-links. Each
 * `[INT-WASSENAAR]`, `[DE-VVG]`, etc. token becomes a clickable link
 * to the source-detail page; the rest of the message is preserved as
 * `whitespace-pre-wrap` plain text so multi-line formatting from the
 * model survives.
 *
 * Used inside the AtlasAstraChat assistant-message bubble. Pure
 * presentation — the segmentation is done by tokenizeAtlasMessage().
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Fragment } from "react";
import {
  tokenizeAtlasMessage,
  atlasIdToHref,
  caseIdToHref,
} from "@/lib/atlas/render-message";
import { CitationPill } from "@/components/atlas/CitationPill";

interface AtlasMessageRendererProps {
  content: string;
  /** Optional class for the wrapping <p>. Defaults to the chat-bubble
   *  whitespace-pre-wrap pattern used today in AtlasAstraChat. */
  className?: string;
}

export default function AtlasMessageRenderer({
  content,
  className = "whitespace-pre-wrap",
}: AtlasMessageRendererProps) {
  const tokens = tokenizeAtlasMessage(content);
  return (
    <p className={className}>
      {tokens.map((tok, idx) => {
        if (tok.kind === "text") {
          // Use a Fragment so React keeps the keyed slot but we don't
          // wrap a span around every text run (cheaper DOM).
          return <Fragment key={idx}>{tok.value}</Fragment>;
        }
        if (tok.kind === "case-id") {
          const href = caseIdToHref(tok.id);
          if (!href) return <Fragment key={idx}>{tok.raw}</Fragment>;
          return <CitationPill key={idx} id={tok.id} href={href} kind="case" />;
        }
        // Source citation
        const href = atlasIdToHref(tok.id);
        if (!href) {
          return <Fragment key={idx}>{tok.raw}</Fragment>;
        }
        return <CitationPill key={idx} id={tok.id} href={href} kind="source" />;
      })}
    </p>
  );
}
