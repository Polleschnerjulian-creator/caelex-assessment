/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Shared filename-slug helper (Q04 dedup, 2026-05-17).
 *
 * Used by every Atlas export path: artifact-pdf, artifact-docx,
 * chat-briefing-pdf, chat-briefing-docx, mandate-export, draft-export.
 *
 * Previously each file had its own implementation that differed
 * subtly — some stripped leading/trailing dashes, some didn't; some
 * converted umlauts, some passed them through. This produced
 * differently-shaped filenames depending on which export the lawyer
 * triggered for the same title.
 *
 * Behaviour: lowercase → umlaut ASCII-fold → kebab-case → strip
 * leading/trailing dashes → 60-char cap → fallback `"dokument"`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export function slugifyFilename(s: string, fallback = "dokument"): string {
  return (
    s
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || fallback
  );
}
