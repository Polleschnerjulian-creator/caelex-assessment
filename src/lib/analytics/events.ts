/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — the typed event catalogue (shared client + server contract).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This is the SINGLE SOURCE OF TRUTH for the shape of every behavioural event
 * the cross-product analytics spine emits. It is a PURE module — no React, no
 * Prisma, no `server-only`, no `window` access at import time — so it can be
 * imported from:
 *   - the client `<AnalyticsProvider/>` / `useTracking()` hook (browser),
 *   - the existing `src/lib/analytics.ts` emitter (browser + server),
 *   - the ingestion route `src/app/api/analytics/track` (server), and
 *   - the aggregation crons (server).
 *
 * ── WHY A TYPED CATALOGUE (the "best in world" lever) ────────────────────────
 * World-class product analytics rests on a clean Object-Action taxonomy where
 * the PII boundary is enforced BY THE TYPE, not by app-code review. The decisive
 * property of this file is therefore:
 *
 *   ┌────────────────────────────────────────────────────────────────────────┐
 *   │  PII IS STRUCTURALLY IMPOSSIBLE.                                         │
 *   │  The event envelope has NO free-form string field. Every string field   │
 *   │  is either a CLOSED enum (`product`, `eventType`) or a bounded, shape-  │
 *   │  validated token (`surface`/`feature`/`topic` = slug regex; `path` =    │
 *   │  pathname-only regex that REJECTS any "?"; `ipCountry` = ISO-3166 2-    │
 *   │  letter). There is nowhere to put a name, an email, an IP, or a raw     │
 *   │  query string. This is the legal basis the LIA leans on to assert the   │
 *   │  event store is "pseudonymous" (DSGVO Art. 6(1)(f), §6.1 of the spec).  │
 *   └────────────────────────────────────────────────────────────────────────┘
 *
 * Numbers (`durationMs`, `resultCount`, `tokens`, …) and booleans (`zeroResults`)
 * carry the quantitative signal. Identifiers that MUST be free (sourceId, caseId,
 * itemId, …) are typed but documented as opaque-id-only and are length-capped so
 * they cannot smuggle prose. Atlas/Trade query TEXT is never carried — only
 * `query_len` (a number) + a normalised/hashed `topic`.
 *
 * ── NAMING ───────────────────────────────────────────────────────────────────
 * Object-Action, lowercase `snake_case`, past-tense `verb_noun`
 * (`page_viewed`, `screen_dwelled`, `element_clicked`, `feature_used`,
 * `assessment_completed`, `operation_status_changed`). The closed `EventType`
 * union below is the allow-list; the `/api/analytics/track` boundary validates
 * against it.
 *
 * ── MANDATORY ENVELOPE (rides in AnalyticsEvent.eventData — ZERO migration) ──
 *   schemaVersion : start at 1 (bump on any breaking shape change)
 *   product       : closed PRODUCTS enum (derived from the URL path prefix)
 *   surface       : route-group / named feature area  (slug)
 *   feature       : named action area                 (slug)
 *   topic?        : normalised id / hash (jurisdiction code, module id, ECCN
 *                   bucket) — NEVER raw query text     (slug)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 0. Schema version
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envelope schema version. Bump when the *shape* of the envelope changes in a
 * breaking way. The ingestion route + crons can branch on this to stay
 * forward/backward compatible. Old rows keep their original version.
 */
export const ANALYTICS_SCHEMA_VERSION = 1 as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Products (the cross-product dimension)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The five Caelex products + a synthetic `marketing` bucket for the public
 * site / top-of-funnel (which is not a `ProductCode`). The five product values
 * are the LOWERCASED `ProductCode` enum strings (`prisma/schema.prisma` →
 * `COMPLY · TRADE · ATLAS · PHAROS · SCHOLAR`) so rollups can upper-case and
 * join to `OrganizationProductAccess.product` with a trivial map. `marketing`
 * is intentionally NOT a ProductCode — it never joins to product access.
 */
export const PRODUCTS = {
  COMPLY: "comply",
  TRADE: "trade",
  ATLAS: "atlas",
  PHAROS: "pharos",
  SCHOLAR: "scholar",
  MARKETING: "marketing",
} as const;

/** Union of the six product dimension values. */
export type Product = (typeof PRODUCTS)[keyof typeof PRODUCTS];

/** Ordered, frozen list of every product value (handy for iteration / Zod). */
export const PRODUCT_VALUES = Object.freeze(
  Object.values(PRODUCTS),
) as readonly Product[];

/** Zod enum over the six product values. */
export const productSchema = z.enum([
  PRODUCTS.COMPLY,
  PRODUCTS.TRADE,
  PRODUCTS.ATLAS,
  PRODUCTS.PHAROS,
  PRODUCTS.SCHOLAR,
  PRODUCTS.MARKETING,
]);

/**
 * Map a product dimension value back to its `ProductCode` enum string, or
 * `null` for `marketing` (which has no ProductCode). Kept as a string map so
 * this module stays free of any `@prisma/client` import (it must remain
 * client-importable). Rollups can cast the result to `ProductCode`.
 */
export function productToProductCode(product: Product): string | null {
  switch (product) {
    case PRODUCTS.COMPLY:
      return "COMPLY";
    case PRODUCTS.TRADE:
      return "TRADE";
    case PRODUCTS.ATLAS:
      return "ATLAS";
    case PRODUCTS.PHAROS:
      return "PHAROS";
    case PRODUCTS.SCHOLAR:
      return "SCHOLAR";
    case PRODUCTS.MARKETING:
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. productFromPath — derive the product from a runtime pathname
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal prefix table. ORDER MATTERS: the first matching entry wins, so more
 * specific / longer prefixes that must not be swallowed by a shorter one are
 * listed first. Each entry matches when the (lowercased) pathname equals the
 * prefix OR continues with `/` or `-` (so `/atlas` and `/atlas-login` both map
 * to atlas, but a hypothetical `/atlasing` would NOT).
 *
 * GROUNDING (verified 2026-06-08): Next.js route GROUPS like `(atlas)`,
 * `(trade)`, `(scholar)`, `(pharos)` are STRIPPED from the URL — they never
 * appear in `window.location.pathname`. The real runtime path segments are
 * `/atlas`, `/trade`, `/scholar`, `/pharos`, `/dashboard`. This deriver MUST
 * therefore key off the runtime path, not the source directory name. The
 * standalone `*-login` / `*-access` / `*-signup` auth pages (e.g.
 * `src/app/atlas-login`, `src/app/trade-access`) are deliberately folded into
 * their product so the pre-login funnel is attributed correctly. `pharos` also
 * claims the regulator-facing `/legal-network` and `/network` surfaces.
 *
 * This is a documented SUPERSET of the spec §3.3 canonical mapping
 * (`/atlas→ATLAS, /pharos→PHAROS, /trade→TRADE, /scholar→SCHOLAR,
 * /dashboard→COMPLY, else MARKETING`) — every canonical rule is preserved; the
 * auth-prefix + Comply-subsurface rows only refine the `else → MARKETING`
 * default into the correct product where the path unambiguously belongs to one.
 */
const PRODUCT_PATH_PREFIXES: ReadonlyArray<readonly [string, Product]> = [
  // ATLAS — lawyer surface + its auth pages
  ["/atlas", PRODUCTS.ATLAS],

  // TRADE / Passage — export-control surface + its auth pages
  ["/trade", PRODUCTS.TRADE],

  // SCHOLAR — student surface + its auth pages
  ["/scholar", PRODUCTS.SCHOLAR],

  // PHAROS — regulator surface + its auth pages + the legal-network/network area
  ["/pharos", PRODUCTS.PHAROS],
  ["/legal-network", PRODUCTS.PHAROS],
  ["/network", PRODUCTS.PHAROS],

  // COMPLY — the instrumented dashboard product + its in-app sub-surfaces
  ["/dashboard", PRODUCTS.COMPLY],
  ["/assure", PRODUCTS.COMPLY],
  ["/academy", PRODUCTS.COMPLY],
];

/**
 * Strip query string + hash from a path, returning the pathname only. Accepts
 * a bare pathname, a path+query, or an absolute URL — and never throws. This is
 * the privacy hygiene that keeps query text (which can carry PII / privileged
 * matter) out of the product derivation entirely.
 */
function pathnameOnly(input: string): string {
  if (typeof input !== "string" || input.length === 0) return "/";
  let p = input;
  // Absolute URL → take its pathname.
  const schemeIdx = p.indexOf("://");
  if (schemeIdx !== -1) {
    const afterScheme = p.slice(schemeIdx + 3);
    const slashIdx = afterScheme.indexOf("/");
    p = slashIdx === -1 ? "/" : afterScheme.slice(slashIdx);
  }
  // Drop hash, then query.
  const hashIdx = p.indexOf("#");
  if (hashIdx !== -1) p = p.slice(0, hashIdx);
  const qIdx = p.indexOf("?");
  if (qIdx !== -1) p = p.slice(0, qIdx);
  if (p.length === 0) return "/";
  if (p[0] !== "/") p = "/" + p;
  return p;
}

/**
 * Derive the {@link Product} dimension from a runtime pathname (the value of
 * `window.location.pathname`, or a Next.js `usePathname()` result). Query
 * strings / hashes / absolute-URL wrappers are stripped first, the path is
 * lowercased, and the first matching prefix in {@link PRODUCT_PATH_PREFIXES}
 * wins. Anything unmatched (`/`, `/about`, `/pricing`, `/blog`, `/login`,
 * `/demo`, …) is the top-of-funnel → `marketing`.
 *
 * Pure + total: every string input yields exactly one Product; never throws.
 */
export function productFromPath(pathname: string | null | undefined): Product {
  if (!pathname) return PRODUCTS.MARKETING;
  const path = pathnameOnly(pathname).toLowerCase();

  for (const [prefix, product] of PRODUCT_PATH_PREFIXES) {
    if (path === prefix) return product;
    if (path.startsWith(prefix)) {
      // Only match on a clean segment / auth-suffix boundary so `/atlas` does
      // not match `/atlasance` but does match `/atlas/x` and `/atlas-login`.
      const next = path.charAt(prefix.length);
      if (next === "/" || next === "-") return product;
    }
  }
  return PRODUCTS.MARKETING;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Closed taxonomies for the envelope fields (PII boundary primitives)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A "slug" — the bounded token shape allowed for `surface`, `feature`, and
 * `topic`. Lowercase ASCII, digits, and the separators `_ - : .` only; 1–64
 * chars; NO spaces, NO uppercase, NO punctuation that could hold prose. This is
 * what makes those fields incapable of carrying a name/email/sentence: a value
 * like "John Doe <john@x.com>" cannot pass this regex. Colons allow the
 * `atlas:search` product-namespaced `featureId` convention; dots allow dotted
 * module ids.
 */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;

/** Zod schema for a slug-shaped envelope field. */
export const slugSchema = z
  .string()
  .regex(SLUG_REGEX, "must be a lowercase slug (a-z 0-9 _ - : .), 1–64 chars");

/**
 * Pathname-only schema. Must start with `/`, must NOT contain `?`, `#`, or
 * whitespace, max 512 chars. This STRUCTURALLY forbids query strings (the most
 * common PII-in-URL leak) and fragments from ever reaching the event store. The
 * client deriver strips them; this schema is the server-side backstop.
 */
export const PATH_REGEX = /^\/[^?#\s]*$/;
export const pathSchema = z
  .string()
  .max(512)
  .regex(PATH_REGEX, "must be a pathname only — no query string, no fragment");

/**
 * ISO-3166-1 alpha-2 country code (uppercase, exactly two letters) OR the
 * sentinel "XX"/"T1" Cloudflare/Vercel can emit. Coarse geo only — NEVER a raw
 * IP. Optional, because the SERVER derives it from `cf-ipcountry` /
 * `x-vercel-ip-country`; clients must not send it.
 */
export const ipCountrySchema = z
  .string()
  .regex(/^[A-Z0-9]{2}$/, "must be a 2-char ISO country code (server-derived)");

/**
 * An opaque entity identifier (sourceId, caseId, itemId, conversationId, …).
 * Bounded to 128 chars and to an id-shaped charset (alphanumerics + `_ - : .`)
 * so it can hold a cuid / uuid / slug but CANNOT hold a sentence or an email.
 * Documented contract: callers pass DB ids or normalised tokens only — never
 * human text.
 */
export const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/, "opaque id only — no free text");

// ─────────────────────────────────────────────────────────────────────────────
// 4. Event types (the closed Object-Action allow-list)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every allowed `eventType`, grouped by domain. Object-Action, snake_case,
 * past-tense. Adding an event = add it here (and, if it carries extra typed
 * props, give it a payload schema in {@link eventPayloadSchemas}). The
 * ingestion route validates incoming `eventType` against this set.
 */
export const EVENT_TYPES = {
  // ── Cross-product automatic capture (emitted by the shared provider) ──
  PAGE_VIEWED: "page_viewed",
  SCREEN_DWELLED: "screen_dwelled",
  ELEMENT_CLICKED: "element_clicked",
  FEATURE_USED: "feature_used",

  // ── Lifecycle / essential (allow-listed through the consent gate) ──
  SIGNUP: "signup",
  LOGIN: "login",
  USER_IDENTIFIED: "user_identified",

  // ── ATLAS (lawyer) ──
  ATLAS_SEARCH_RAN: "atlas_search_ran",
  ATLAS_SEMANTIC_SEARCH_RAN: "atlas_semantic_search_ran",
  ATLAS_SOURCE_READ: "atlas_source_read",
  ATLAS_CASE_READ: "atlas_case_read",
  ATLAS_AI_MODE_OPENED: "atlas_ai_mode_opened",
  ATLAS_CHAT_MESSAGE_SENT: "atlas_chat_message_sent",
  ATLAS_DRAFT_STARTED: "atlas_draft_started",
  ATLAS_DRAFT_COMPLETED: "atlas_draft_completed",
  ATLAS_CONFLICT_CHECK_RUN: "atlas_conflict_check_run",
  ATLAS_BOOKMARK_ADDED: "atlas_bookmark_added",
  ATLAS_EXPORT_RUN: "atlas_export_run",

  // ── COMPLY (compliance dashboard) ──
  COMPLY_MODULE_OPENED: "comply_module_opened",
  COMPLY_ASSESSMENT_STARTED: "comply_assessment_started",
  COMPLY_ASSESSMENT_COMPLETED: "comply_assessment_completed",
  COMPLY_REQUIREMENT_STATUS_CHANGED: "comply_requirement_status_changed",
  COMPLY_DOCUMENT_GENERATED: "comply_document_generated",
  COMPLY_ASTRA_QUERY: "comply_astra_query",
  ASSURE_PROFILE_SECTION_COMPLETED: "assure_profile_section_completed",
  ASSURE_DATAROOM_SHARED: "assure_dataroom_shared",
  ACADEMY_COURSE_STARTED: "academy_course_started",
  ACADEMY_SIMULATION_RUN: "academy_simulation_run",

  // ── TRADE / Passage (export control) ──
  TRADE_CLASSIFY_STARTED: "trade_classify_started",
  TRADE_CLASSIFY_COMPLETED: "trade_classify_completed",
  TRADE_OPERATION_STATUS_CHANGED: "trade_operation_status_changed",
  TRADE_SCREENING_HIT: "trade_screening_hit",
  TRADE_SCREENING_CLEARED: "trade_screening_cleared",
  TRADE_LICENSE_GRANTED: "trade_license_granted",
  TRADE_DOCUMENT_GENERATED: "trade_document_generated",

  // ── SCHOLAR (student) ──
  SCHOLAR_SOURCE_READ: "scholar_source_read",

  // ── PHAROS (regulator) ──
  PHAROS_OVERSIGHT_INITIATED: "pharos_oversight_initiated",
  PHAROS_WORKFLOW_ADVANCED: "pharos_workflow_advanced",
  PHAROS_APPROVAL_SIGNED: "pharos_approval_signed",
  PHAROS_APPROVAL_REJECTED: "pharos_approval_rejected",
  PHAROS_BRIEFING_GENERATED: "pharos_briefing_generated",
  PHAROS_TRANSPARENCY_PUBLISHED: "pharos_transparency_published",

  // ── MARKETING / acquisition (top of funnel) ──
  ACQ_PAGE_VIEWED: "acq_page_viewed",
  ACQ_DEMO_REQUESTED: "acq_demo_requested",
  ACQ_CONTACT_SUBMITTED: "acq_contact_submitted",
  ACQ_NEWSLETTER_SUBSCRIBED: "acq_newsletter_subscribed",
  ACQ_SIGNUP_STARTED: "acq_signup_started",
  ACQ_SIGNUP_COMPLETED: "acq_signup_completed",
} as const;

/** Union of every allowed `eventType` string. */
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/** Ordered, frozen list of every event-type value. */
export const EVENT_TYPE_VALUES = Object.freeze(
  Object.values(EVENT_TYPES),
) as readonly EventType[];

/**
 * The subset of event types that are ESSENTIAL and therefore pass the consent
 * gate even without analytics consent (mirrors + extends the existing
 * `essentialEvents = ["signup","login"]` allow-list in the ingestion route).
 * Kept here so the gate's allow-list is part of the typed contract rather than
 * a magic literal in the route. The route remains the enforcement point.
 */
export const ESSENTIAL_EVENT_TYPES = Object.freeze([
  EVENT_TYPES.SIGNUP,
  EVENT_TYPES.LOGIN,
]) as readonly EventType[];

/** True when `eventType` is an essential (consent-exempt) event. */
export function isEssentialEventType(eventType: string): boolean {
  return (ESSENTIAL_EVENT_TYPES as readonly string[]).includes(eventType);
}

/** Zod enum over every allowed event type (built from the frozen value list). */
export const eventTypeSchema = z.enum(
  EVENT_TYPE_VALUES as unknown as [EventType, ...EventType[]],
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. The mandatory envelope + the full event schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The mandatory dimensional envelope present on EVERY event. This is the part
 * that rides in `AnalyticsEvent.eventData` (zero migration) alongside the
 * event-specific props. `topic` is optional; everything else is required.
 *
 * `.strict()` is deliberately NOT applied here because per-event payload props
 * are merged in by {@link analyticsEventSchema}; the closed-field guarantee is
 * provided instead by (a) the slug/path/number/boolean primitive types on
 * every field and (b) the per-event payload schemas being themselves strict.
 */
export const eventEnvelopeSchema = z.object({
  schemaVersion: z.literal(ANALYTICS_SCHEMA_VERSION),
  product: productSchema,
  surface: slugSchema,
  feature: slugSchema,
  topic: slugSchema.optional(),
});

/** The mandatory envelope, as a type. */
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

/**
 * Per-event extra-property schemas. Each is `.strict()` so NO unknown key can
 * ride along (the second half of the PII-impossible guarantee — you cannot
 * smuggle `{ email: "…" }` into a known event). Events with no extra props are
 * intentionally absent here and validate with an empty strict object.
 *
 * Every value field is a number / boolean / closed-enum / opaque-id / slug —
 * never a free-form string. `query_len` is the canonical example: Atlas/Trade
 * search TEXT is forbidden; only its LENGTH (a number) and a normalised
 * `topic`/`jurisdiction` slug are allowed.
 */
export const eventPayloadSchemas = {
  // ── Cross-product automatic capture ──
  [EVENT_TYPES.PAGE_VIEWED]: z.object({}).strict(),
  [EVENT_TYPES.SCREEN_DWELLED]: z
    .object({
      durationMs: z.number().int().nonnegative(),
      maxScrollPct: z.number().int().min(0).max(100).optional(),
    })
    .strict(),
  [EVENT_TYPES.ELEMENT_CLICKED]: z
    .object({
      // The `data-track` allow-list token of the clicked element — a slug, so
      // inner text (which could carry PII) can never be the value.
      token: slugSchema,
    })
    .strict(),
  [EVENT_TYPES.FEATURE_USED]: z
    .object({
      // Optional normalised action verb (slug) for generic feature pings.
      action: slugSchema.optional(),
    })
    .strict(),

  // ── Lifecycle ──
  [EVENT_TYPES.SIGNUP]: z.object({}).strict(),
  [EVENT_TYPES.LOGIN]: z.object({}).strict(),
  [EVENT_TYPES.USER_IDENTIFIED]: z.object({}).strict(),

  // ── ATLAS ──
  [EVENT_TYPES.ATLAS_SEARCH_RAN]: z
    .object({
      queryLen: z.number().int().nonnegative(),
      jurisdiction: slugSchema.optional(),
      resultCount: z.number().int().nonnegative().optional(),
      zeroResults: z.boolean().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_SEMANTIC_SEARCH_RAN]: z
    .object({
      queryLen: z.number().int().nonnegative(),
      jurisdiction: slugSchema.optional(),
      resultCount: z.number().int().nonnegative().optional(),
      zeroResults: z.boolean().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_SOURCE_READ]: z
    .object({
      sourceId: opaqueIdSchema,
      jurisdiction: slugSchema.optional(),
      dwellMs: z.number().int().nonnegative().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_CASE_READ]: z
    .object({
      caseId: opaqueIdSchema,
      jurisdiction: slugSchema.optional(),
      dwellMs: z.number().int().nonnegative().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_AI_MODE_OPENED]: z.object({}).strict(),
  [EVENT_TYPES.ATLAS_CHAT_MESSAGE_SENT]: z
    .object({
      tokens: z.number().int().nonnegative().optional(),
      toolCalls: z.number().int().nonnegative().optional(),
      iterations: z.number().int().nonnegative().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_DRAFT_STARTED]: z
    .object({
      docType: slugSchema.optional(),
      mode: slugSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_DRAFT_COMPLETED]: z
    .object({
      docType: slugSchema.optional(),
      mode: slugSchema.optional(),
      durationMs: z.number().int().nonnegative().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_CONFLICT_CHECK_RUN]: z
    .object({
      hit: z.boolean().optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_BOOKMARK_ADDED]: z
    .object({
      sourceId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.ATLAS_EXPORT_RUN]: z
    .object({
      // Closed format enum — not a free string.
      format: z.enum(["docx", "pdf", "datev"]),
    })
    .strict(),

  // ── COMPLY ──
  [EVENT_TYPES.COMPLY_MODULE_OPENED]: z
    .object({
      moduleId: slugSchema,
    })
    .strict(),
  [EVENT_TYPES.COMPLY_ASSESSMENT_STARTED]: z
    .object({
      regulation: slugSchema,
    })
    .strict(),
  [EVENT_TYPES.COMPLY_ASSESSMENT_COMPLETED]: z
    .object({
      regulation: slugSchema,
      durationMs: z.number().int().nonnegative().optional(),
    })
    .strict(),
  [EVENT_TYPES.COMPLY_REQUIREMENT_STATUS_CHANGED]: z
    .object({
      moduleId: slugSchema.optional(),
      from: slugSchema.optional(),
      to: slugSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.COMPLY_DOCUMENT_GENERATED]: z
    .object({
      reportType: slugSchema,
    })
    .strict(),
  [EVENT_TYPES.COMPLY_ASTRA_QUERY]: z
    .object({
      queryLen: z.number().int().nonnegative().optional(),
      tokens: z.number().int().nonnegative().optional(),
    })
    .strict(),
  [EVENT_TYPES.ASSURE_PROFILE_SECTION_COMPLETED]: z
    .object({
      section: slugSchema,
    })
    .strict(),
  [EVENT_TYPES.ASSURE_DATAROOM_SHARED]: z.object({}).strict(),
  [EVENT_TYPES.ACADEMY_COURSE_STARTED]: z
    .object({
      courseId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.ACADEMY_SIMULATION_RUN]: z
    .object({
      simulationId: opaqueIdSchema.optional(),
    })
    .strict(),

  // ── TRADE / Passage ──
  [EVENT_TYPES.TRADE_CLASSIFY_STARTED]: z
    .object({
      itemId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.TRADE_CLASSIFY_COMPLETED]: z
    .object({
      itemId: opaqueIdSchema.optional(),
      eccn: slugSchema.optional(),
      method: slugSchema.optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .strict(),
  [EVENT_TYPES.TRADE_OPERATION_STATUS_CHANGED]: z
    .object({
      // The funnel spine. `from`/`to` are slugs (status codes), not prose.
      from: slugSchema,
      to: slugSchema,
      operationId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.TRADE_SCREENING_HIT]: z
    .object({
      listType: slugSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.TRADE_SCREENING_CLEARED]: z.object({}).strict(),
  [EVENT_TYPES.TRADE_LICENSE_GRANTED]: z
    .object({
      licenseType: slugSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.TRADE_DOCUMENT_GENERATED]: z
    .object({
      // Closed doc-type enum (EUC | VSD | …) normalised to a slug.
      docType: slugSchema,
    })
    .strict(),

  // ── SCHOLAR ──
  [EVENT_TYPES.SCHOLAR_SOURCE_READ]: z
    .object({
      sourceId: opaqueIdSchema.optional(),
      dwellMs: z.number().int().nonnegative().optional(),
    })
    .strict(),

  // ── PHAROS ──
  [EVENT_TYPES.PHAROS_OVERSIGHT_INITIATED]: z
    .object({
      caseId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.PHAROS_WORKFLOW_ADVANCED]: z
    .object({
      caseId: opaqueIdSchema.optional(),
      stage: slugSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.PHAROS_APPROVAL_SIGNED]: z
    .object({
      caseId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.PHAROS_APPROVAL_REJECTED]: z
    .object({
      caseId: opaqueIdSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.PHAROS_BRIEFING_GENERATED]: z.object({}).strict(),
  [EVENT_TYPES.PHAROS_TRANSPARENCY_PUBLISHED]: z.object({}).strict(),

  // ── MARKETING / acquisition ──
  [EVENT_TYPES.ACQ_PAGE_VIEWED]: z
    .object({
      // UTM values are normalised to slugs at capture — never raw query text.
      utmSource: slugSchema.optional(),
      utmMedium: slugSchema.optional(),
      utmCampaign: slugSchema.optional(),
      utmContent: slugSchema.optional(),
      utmTerm: slugSchema.optional(),
    })
    .strict(),
  [EVENT_TYPES.ACQ_DEMO_REQUESTED]: z.object({}).strict(),
  [EVENT_TYPES.ACQ_CONTACT_SUBMITTED]: z.object({}).strict(),
  [EVENT_TYPES.ACQ_NEWSLETTER_SUBSCRIBED]: z.object({}).strict(),
  [EVENT_TYPES.ACQ_SIGNUP_STARTED]: z.object({}).strict(),
  [EVENT_TYPES.ACQ_SIGNUP_COMPLETED]: z.object({}).strict(),
} as const satisfies Record<EventType, z.ZodTypeAny>;

/**
 * The default payload schema for any event type that does not declare extra
 * props: an EMPTY strict object (no keys allowed). Used as a fallback so the
 * `Record<EventType, …>` above can stay exhaustive while still rejecting stray
 * keys on prop-less events.
 */
export const EMPTY_PAYLOAD_SCHEMA = z.object({}).strict();

/**
 * The FULL validated event = the mandatory envelope MERGED with the
 * event-specific payload, discriminated by `eventType`. This is the single
 * Zod object the ingestion route should parse each event against. Built as a
 * discriminated union so each branch enforces both the closed envelope and the
 * strict per-event props together — closing the PII door on both halves.
 */
export const analyticsEventSchema = z.discriminatedUnion(
  "eventType",
  EVENT_TYPE_VALUES.map((type) =>
    eventEnvelopeSchema.extend({
      eventType: z.literal(type),
      payload: (eventPayloadSchemas[type] ?? EMPTY_PAYLOAD_SCHEMA).optional(),
    }),
  ) as unknown as [z.ZodObject<z.ZodRawShape>, ...z.ZodObject<z.ZodRawShape>[]],
);

/** A fully-validated analytics event (envelope + typed payload). */
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 6. The wire envelope + batch payload (client → /api/analytics/track)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The per-event wire shape the client emitter sends and the ingestion route
 * maps onto an `AnalyticsEvent` row. The taxonomy lives in `eventData` (envelope
 * + payload); the top-level fields mirror the existing `AnalyticsEvent` columns
 * that the route already understands (`sessionId`, `userId?`, `path`, …).
 *
 * Privacy invariants encoded here:
 *   - `path` is `pathSchema` → pathname-only, query-string-FORBIDDEN.
 *   - there is NO `referrer`/`userAgent`/`ipCountry`/`email`/`name` field the
 *     CLIENT can populate; `ipCountry` + `userAgent` are derived SERVER-side
 *     from request headers, never trusted from the body.
 *   - `userId` is accepted but the route re-validates it against the session
 *     and drops spoofed mismatches (unchanged behaviour).
 */
export const wireEventSchema = z
  .object({
    /** Closed event-type enum. */
    eventType: eventTypeSchema,
    /** The taxonomy envelope + typed payload, stored in AnalyticsEvent.eventData. */
    eventData: z.record(z.string(), z.unknown()),
    /** Coarse legacy category mirror (kept for the existing column default). */
    category: z
      .enum(["navigation", "engagement", "conversion", "error", "general"])
      .optional(),
    /** Required browser session id (the `sess_…` uuid). */
    sessionId: z.string().min(1).max(128),
    /** Optional authenticated user id — re-validated server-side. */
    userId: z.string().max(128).nullable().optional(),
    /** Optional org id for B2B tenanting. */
    organizationId: z.string().max(128).nullable().optional(),
    /** Pathname ONLY — query strings structurally rejected. */
    path: pathSchema.nullable().optional(),
    /** Optional foreground duration for timed events. */
    durationMs: z.number().int().nonnegative().nullable().optional(),
    /** Optional client ISO timestamp (server falls back to now()). */
    timestamp: z.string().datetime().optional(),
  })
  .strict();

/** A single event on the wire. */
export type WireEvent = z.infer<typeof wireEventSchema>;

/** Hard cap on events per batch POST (DoS / payload-size guard). */
export const MAX_BATCH_EVENTS = 50 as const;

/**
 * The batch payload: an array of wire events, sent in ONE `sendBeacon` to cut
 * ingestion writes ~5–20×. The route can `createMany` them in one statement.
 * Capped at {@link MAX_BATCH_EVENTS}. A consent string is carried OUT-OF-BAND
 * (the existing `_consent` sibling field / `x-cookie-consent` header), not
 * inside an event, so it cannot pollute the typed taxonomy.
 */
export const batchEventsSchema = z
  .array(wireEventSchema)
  .min(1)
  .max(MAX_BATCH_EVENTS);

/** The wire batch type (array of events). */
export type BatchEvents = z.infer<typeof batchEventsSchema>;

/**
 * The full batch request body shape: either a bare array of events, OR an
 * object wrapping the array plus the out-of-band consent signal (mirroring the
 * existing single-event `_consent` field). The route accepts both so the
 * single-event legacy body and the new batched body can coexist during rollout.
 */
export const batchRequestSchema = z.union([
  batchEventsSchema,
  z
    .object({
      events: batchEventsSchema,
      _consent: z.string().max(32).optional(),
    })
    .strict(),
]);

/** The full batch request body type. */
export type BatchRequest = z.infer<typeof batchRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 7. Helpers the emitter / route / crons share
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build + validate a complete `eventData` envelope object. The shared client
 * provider calls this to stamp `schemaVersion` + `product` (+ surface/feature/
 * topic) and merge the typed payload, then hands the result to the emitter.
 * Throws (via Zod) if the result is not a valid envelope+payload for the given
 * event type — surfacing taxonomy mistakes at the call site in dev rather than
 * silently writing junk. Returns a plain object safe to JSON-serialise into
 * `AnalyticsEvent.eventData`.
 */
export function buildEventData<T extends EventType>(
  eventType: T,
  envelope: Omit<EventEnvelope, "schemaVersion">,
  payload?: Record<string, unknown>,
): Record<string, unknown> {
  const merged = {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    ...envelope,
    eventType,
    payload: payload ?? {},
  };
  // Validate the envelope + typed payload together.
  analyticsEventSchema.parse(merged);
  // Persisted shape: flatten envelope + nest the typed payload under `payload`.
  return {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    product: envelope.product,
    surface: envelope.surface,
    feature: envelope.feature,
    ...(envelope.topic !== undefined ? { topic: envelope.topic } : {}),
    payload: payload ?? {},
  };
}

/**
 * Type guard: is `value` one of the allowed event-type strings?
 */
export function isEventType(value: unknown): value is EventType {
  return (
    typeof value === "string" &&
    (EVENT_TYPE_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Type guard: is `value` one of the allowed product strings?
 */
export function isProduct(value: unknown): value is Product {
  return (
    typeof value === "string" &&
    (PRODUCT_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Safe-parse a single wire event. Returns the parsed event or `null` on
 * failure (analytics must never throw at the ingestion boundary). The route
 * uses this to drop malformed events without 500-ing.
 */
export function parseWireEvent(input: unknown): WireEvent | null {
  const r = wireEventSchema.safeParse(input);
  return r.success ? r.data : null;
}
