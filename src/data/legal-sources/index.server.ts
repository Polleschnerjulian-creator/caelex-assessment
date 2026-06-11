// src/data/legal-sources/index.server.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Legal Sources — SERVER-ONLY barrel entry point (perf pass F3).
 *
 * Identical API to "./index", but poisoned with `server-only` so any
 * accidental import from a "use client" module fails at BUILD time
 * instead of silently shipping the ~3MB corpus to the browser.
 *
 * Prefer this path in NEW server-side code (engines, API routes, RSC
 * pages). The raw "./index" barrel must remain importable from the
 * client for now because five legacy "use client" browse pages
 * (atlas/search, atlas/sources, atlas/sources/[id],
 * atlas/jurisdictions/[code], atlas/compare-articles) still consume it
 * directly; once those move to API-backed fetching, `server-only` can
 * move into ./index.ts itself and this wrapper can be inlined.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

export * from "./index";
