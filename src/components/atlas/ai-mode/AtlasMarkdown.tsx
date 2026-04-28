"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * AtlasMarkdown — wraps react-markdown with Atlas-specific styling.
 *
 * Claude's responses often arrive with headers, bold emphasis, lists,
 * and horizontal rules. Rendering them raw gave us the "unformatted
 * blob" look; rendering through this component produces legal-grade
 * typography on the dark stage.
 *
 * Every element is explicitly mapped to a CSS-module class so the
 * result looks consistent across OS/browser — no default margins
 * or font sizes bleeding through from the user agent.
 *
 * Phase 3 — Citations Highlighter
 *
 *   The text is pre-processed via `injectCitationsAsLinks` (regex
 *   replace) so every detected citation becomes a Markdown pseudo-
 *   link with an `atlas-citation:` href. The `a` renderer below
 *   intercepts that href and renders a `<CitationChip>` instead of
 *   a real anchor — turning every BWRG §3 / NIS2 Art. 21 / OST Art.
 *   VI in an Atlas answer into a clickable, popover-equipped chip.
 *
 *   The pre-processor is streaming-safe: half-streamed citation
 *   patterns just don't match the regex and pass through as plain
 *   text until the next token completes the pattern.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  injectCitationsAsLinks,
  parseCitationHref,
  type Citation,
} from "@/lib/atlas/citations";
import { CitationChip } from "./CitationChip";
import styles from "./ai-mode.module.css";

interface AtlasMarkdownProps {
  text: string;
  /** Called when a lawyer clicks "Bei Atlas nachfragen" inside a
   *  citation popover. Parent (AIMode) wires this to inject an
   *  explain-prompt and run it through the existing chat pipeline.
   *  When undefined, citations still render as plain anchors so the
   *  component stays usable in non-chat contexts. */
  onAskAtlas?: (citation: Citation) => void;
}

export function AtlasMarkdown({ text, onAskAtlas }: AtlasMarkdownProps) {
  // Re-run the citation injector on every text change. Memoised so
  // identical text streams (e.g. when only metadata around a message
  // changes) don't pay the regex cost twice.
  const enrichedText = useMemo(() => injectCitationsAsLinks(text), [text]);

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h3 className={styles.mdH1} {...props} />,
          h2: (props) => <h4 className={styles.mdH2} {...props} />,
          h3: (props) => <h5 className={styles.mdH3} {...props} />,
          p: (props) => <p className={styles.mdP} {...props} />,
          ul: (props) => <ul className={styles.mdUl} {...props} />,
          ol: (props) => <ol className={styles.mdOl} {...props} />,
          li: (props) => <li className={styles.mdLi} {...props} />,
          strong: (props) => <strong className={styles.mdStrong} {...props} />,
          em: (props) => <em className={styles.mdEm} {...props} />,
          code: (props) => <code className={styles.mdCode} {...props} />,
          hr: () => <hr className={styles.mdHr} />,
          blockquote: (props) => (
            <blockquote className={styles.mdQuote} {...props} />
          ),
          a: ({ href, children, ...rest }) => {
            // Citation pseudo-links: render a chip instead of an anchor.
            if (href && href.startsWith("atlas-citation:")) {
              const citation = parseCitationHref(href);
              if (citation) {
                // The original raw text is the chip's visible label —
                // children is the [match] wrapped by react-markdown,
                // which is the exact text Claude streamed.
                const rawText = childrenToText(children);
                return (
                  <CitationChip
                    citation={citation}
                    rawText={rawText || citation.label}
                    onAskAtlas={
                      onAskAtlas ??
                      (() => {
                        /* no-op when parent doesn't wire a handler */
                      })
                    }
                  />
                );
              }
            }
            return (
              <a
                href={href}
                className={styles.mdLink}
                target="_blank"
                rel="noopener noreferrer"
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {enrichedText}
      </ReactMarkdown>
    </div>
  );
}

/** Best-effort flatten of react-markdown's `children` into a string.
 *  For citation chips we only ever wrap the literal matched text
 *  (e.g. "BWRG §3"), so the children should always be a single string
 *  leaf — but defensive joining handles any future edge cases. */
function childrenToText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  return "";
}
