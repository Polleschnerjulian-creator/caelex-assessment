/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Clickable primary-source link — resolves source_id via PRIMARY_SOURCES
 * registry and renders an external link with external-icon + language badge
 * + "Retrieved YYYY-MM-DD" tooltip. Falls back to plain text if source_id
 * is not yet in the registry (so landing-rights content never breaks).
 */

import { ExternalLink } from "lucide-react";
import { getPrimarySource } from "@/data/landing-rights/primary-sources";

export function SourceLink({
  sourceId,
  title,
  citation,
}: {
  sourceId: string;
  title: string;
  citation?: string;
}) {
  const source = getPrimarySource(sourceId);

  if (!source) {
    // Graceful fallback — source not yet in registry
    return (
      <span className="text-[13px] text-[var(--atlas-text-secondary)]">
        <span className="font-medium">{title}</span>
        {citation && (
          <span className="ml-1 text-[11px] text-[var(--atlas-text-muted)]">
            ({citation})
          </span>
        )}
      </span>
    );
  }

  return (
    <a
      href={source.official_url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open official source — retrieved ${source.last_accessed}`}
      className="group inline-flex items-center gap-1.5 text-[13px] text-[var(--atlas-text-secondary)] hover:text-emerald-700 transition-colors"
    >
      <span className="font-medium group-hover:underline">{title}</span>
      {citation && (
        <span className="text-[11px] text-[var(--atlas-text-muted)] group-hover:text-emerald-600">
          ({citation})
        </span>
      )}
      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-[var(--atlas-text-faint)]">
        {source.language.toUpperCase()}
        <ExternalLink size={10} />
      </span>
    </a>
  );
}
