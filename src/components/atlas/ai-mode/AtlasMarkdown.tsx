"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./ai-mode.module.css";

interface AtlasMarkdownProps {
  text: string;
}

export function AtlasMarkdown({ text }: AtlasMarkdownProps) {
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
          a: (props) => (
            <a
              className={styles.mdLink}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
