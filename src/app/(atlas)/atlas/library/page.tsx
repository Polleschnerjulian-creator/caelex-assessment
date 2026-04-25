/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/library — Personal Research Library (Phase 5)
 *
 * The lawyer's private bookshelf of saved Atlas answers. Each entry
 * carries the original Atlas-streamed content (markdown), the question
 * that produced it, and provenance metadata (source kind + matter id).
 * Citations re-render as interactive chips via the same parser used
 * in chat messages — so a saved entry stays just as inspectable as
 * the original answer.
 *
 * Cross-matter by design: matters scope per-mandate work; the library
 * is the lawyer's personal corpus of useful knowledge that travels
 * with them across mandates.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { LibraryView } from "./LibraryView";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  return <LibraryView />;
}
