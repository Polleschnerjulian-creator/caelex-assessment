/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-side PDF render + content-hash helper for the DPA cover.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createHash } from "node:crypto";
import { DpaCoverDocument, type DpaCoverPdfData } from "./template";

export async function renderDpaCoverPdf(
  data: DpaCoverPdfData,
): Promise<Buffer> {
  return renderToBuffer(React.createElement(DpaCoverDocument, { data }));
}

/**
 * Compute the canonical SHA-256 hash of the DPA content. Re-imports
 * the DE content module on demand so we don't bundle the entire DPA
 * into the cover-PDF code path. Stable across runs as long as
 * dpa-de.ts content doesn't change.
 */
export async function computeDpaContentHash(): Promise<string> {
  /* Lazy-import so the cover-PDF route doesn't bundle the entire DPA
     module into other code paths. */
  const mod = await import("@/app/legal/dpa/_content/dpa-de");
  /* DPA_DE is a LegalDocument record; JSON-serialise for a stable
     binary input to SHA-256. */
  const serialised = JSON.stringify(mod.DPA_DE);
  return createHash("sha256").update(serialised).digest("hex");
}
