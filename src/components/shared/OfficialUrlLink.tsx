/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Shared primary-source link component used across the platform wherever
 * regulatory content references a law, regulation, article, directive, etc.
 *
 * Renders as: "[title] (citation) [LANG↗]" — title is the link text,
 * citation appears in smaller gray, language + external-icon on the right.
 *
 * Usage pattern: <OfficialUrlLink url={article.officialUrl} title="TKG" citation="§ 52" />
 *
 * All props are optional except url. Falls back to plain text when url is absent.
 */

import { ExternalLink } from "lucide-react";

export function OfficialUrlLink({
  url,
  title,
  citation,
  language,
  accessed,
  size = "default",
}: {
  url?: string;
  title: string;
  citation?: string;
  language?: string;
  accessed?: string; // ISO date
  size?: "small" | "default" | "inline";
}) {
  const sizeClass =
    size === "small"
      ? "text-[11px]"
      : size === "inline"
        ? "text-[12px]"
        : "text-[13px]";

  if (!url) {
    return (
      <span className={`${sizeClass} text-gray-700`}>
        <span className="font-medium">{title}</span>
        {citation && (
          <span className="ml-1 text-[11px] text-gray-500">({citation})</span>
        )}
      </span>
    );
  }

  const tooltip = accessed
    ? `Open official source — retrieved ${accessed}`
    : "Open official source";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      className={`group inline-flex items-center gap-1.5 ${sizeClass} text-gray-700 hover:text-emerald-700 transition-colors`}
    >
      <span className="font-medium group-hover:underline">{title}</span>
      {citation && (
        <span className="text-[11px] text-gray-500 group-hover:text-emerald-600">
          ({citation})
        </span>
      )}
      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400">
        {language && <span>{language.toUpperCase()}</span>}
        <ExternalLink size={10} />
      </span>
    </a>
  );
}

/**
 * Compact variant — just the external link icon with tooltip, no label.
 * For inline use in dense rows where the citation text is already shown.
 */
export function OfficialUrlIcon({
  url,
  tooltip = "Open official source",
}: {
  url?: string;
  tooltip?: string;
}) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      className="inline-flex items-center text-gray-400 hover:text-emerald-600 transition-colors"
    >
      <ExternalLink size={12} />
    </a>
  );
}
