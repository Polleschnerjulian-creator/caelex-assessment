import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { isAnalyticsConsentString } from "@/lib/analytics-consent.server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import {
  isEssentialEventType,
  isEventType,
  parseWireEvent,
  productFromPath,
  analyticsEventSchema,
  slugSchema,
  MAX_BATCH_EVENTS,
  type WireEvent,
} from "@/lib/analytics/events";

// ─────────────────────────────────────────────────────────────────────────────
// Legacy single-event schema (kept for backward-compatibility with the existing
// `src/lib/analytics.ts` emitter, which still POSTs ONE event as a bare object
// `{ eventType, eventData?, category?, sessionId, ... }`). The new batched
// emitter sends an ARRAY of events (or `{ events: [...], _consent }`), validated
// per-event by the shared contract via parseWireEvent(). All three shapes are
// normalised to a flat array of wire-event candidates below.
// ─────────────────────────────────────────────────────────────────────────────
const legacySingleEventSchema = z.object({
  eventType: z.string().min(1).max(100),
  eventData: z.record(z.string(), z.unknown()).optional(),
  category: z
    .enum(["navigation", "engagement", "conversion", "error", "general"])
    .optional(),
  sessionId: z.string().min(1).max(128),
  userId: z.string().max(128).nullable().optional(),
  organizationId: z.string().max(128).nullable().optional(),
  path: z.string().max(512).nullable().optional(),
  durationMs: z.number().nullable().optional(),
  timestamp: z.string().optional(),
  // NOTE: a legacy `referrer` field is intentionally NOT modelled here. The
  // schema is non-strict, so legacy bodies that include `referrer` still parse,
  // but we never READ it — referrer is a removed client field under the PII
  // boundary (only server-derived ipCountry is stored for geo).
});

// Hard ceiling on candidates we will even attempt to validate — the shared
// contract's MAX_BATCH_EVENTS (50). Anything beyond is truncated (not rejected)
// so a slightly-oversized batch still ingests its first 50 events rather than
// failing wholesale — analytics is best-effort. (The contract's
// batchEventsSchema.max(50) is the strict client-side mirror of this ceiling.)
const MAX_INGEST_EVENTS = MAX_BATCH_EVENTS;

/**
 * Strip query string + fragment from a client-supplied path so only the
 * pathname is ever persisted (privacy hygiene — query text can carry PII /
 * privileged matter). Mirrors the contract's pathnameOnly() but is inlined here
 * to coerce a possibly-dirty legacy `path` into the pathname-only shape the
 * store requires. Never throws.
 */
function pathnameOnly(input: string | null | undefined): string | null {
  if (typeof input !== "string" || input.length === 0) return null;
  let p = input;
  const schemeIdx = p.indexOf("://");
  if (schemeIdx !== -1) {
    const afterScheme = p.slice(schemeIdx + 3);
    const slashIdx = afterScheme.indexOf("/");
    p = slashIdx === -1 ? "/" : afterScheme.slice(slashIdx);
  }
  const hashIdx = p.indexOf("#");
  if (hashIdx !== -1) p = p.slice(0, hashIdx);
  const qIdx = p.indexOf("?");
  if (qIdx !== -1) p = p.slice(0, qIdx);
  if (p.length === 0) return "/";
  if (p[0] !== "/") p = "/" + p;
  return p.slice(0, 512);
}

/**
 * Conservative bot/crawler filter. Behavioural analytics must not be polluted
 * by automated traffic. We DROP events whose User-Agent matches a well-known
 * crawler / headless-automation token. This is intentionally fail-OPEN: a
 * missing or unrecognised UA is allowed through (we never want to silently lose
 * real users), and we never store the UA decision — it only gates ingestion.
 */
const BOT_UA_REGEX =
  /(bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|gtmetrix|pingdom|uptimerobot|curl|wget|python-requests|axios\/|go-http-client|java\/|okhttp|scrapy|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|google-read-aloud|chrome-lighthouse)/i;

function looksLikeBot(userAgent: string | null): boolean {
  if (!userAgent) return false; // fail-open — never drop a real user on a blank UA
  return BOT_UA_REGEX.test(userAgent);
}

/**
 * Normalise the parsed request body into a flat array of UNVALIDATED wire-event
 * candidates + the out-of-band consent string (if the wrapper form supplied
 * one). Accepts:
 *   - a bare array of events                       → batched form
 *   - `{ events: [...], _consent? }`               → batched wrapper form
 *   - a single `{ eventType, ... }` object         → legacy single-event form
 * Returns `{ candidates, wrapperConsent }`. Never throws.
 */
function normaliseBody(body: unknown): {
  candidates: unknown[];
  wrapperConsent: string | undefined;
} {
  // Bare array → batch.
  if (Array.isArray(body)) {
    return { candidates: body, wrapperConsent: undefined };
  }

  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;

    // Wrapper form: { events: [...], _consent? }
    if (Array.isArray(obj.events)) {
      return {
        candidates: obj.events,
        wrapperConsent:
          typeof obj._consent === "string" ? obj._consent : undefined,
      };
    }

    // Legacy single-event form: a bare object carrying eventType.
    if (typeof obj.eventType === "string") {
      return {
        candidates: [obj],
        wrapperConsent:
          typeof obj._consent === "string" ? obj._consent : undefined,
      };
    }
  }

  return { candidates: [], wrapperConsent: undefined };
}

/**
 * Validate one candidate into a WireEvent. Tries the strict contract schema
 * first (parseWireEvent — the canonical, query-string-rejecting, strict-keys
 * path). If that fails, falls back to the permissive legacy single-event schema
 * and coerces it into a WireEvent shape (sanitising `path` to pathname-only and
 * dropping the legacy-only `referrer`, which the client must not set). Returns
 * null when neither parses, so a single malformed event never fails the batch.
 */
function toWireEvent(candidate: unknown): WireEvent | null {
  const strict = parseWireEvent(candidate);
  if (strict) {
    // Defensive: even though pathSchema forbids "?", re-run pathnameOnly so any
    // future loosening of the schema cannot leak a query string into the store.
    return { ...strict, path: pathnameOnly(strict.path ?? null) };
  }

  const legacy = legacySingleEventSchema.safeParse(candidate);
  if (!legacy.success) return null;
  const d = legacy.data;
  return {
    eventType: d.eventType as WireEvent["eventType"],
    eventData: d.eventData ?? {},
    category: d.category,
    sessionId: d.sessionId,
    userId: d.userId ?? null,
    organizationId: d.organizationId ?? null,
    path: pathnameOnly(d.path ?? null),
    durationMs:
      typeof d.durationMs === "number" && Number.isFinite(d.durationMs)
        ? Math.max(0, Math.trunc(d.durationMs))
        : null,
    timestamp: d.timestamp,
  } as WireEvent;
}

/**
 * Pull the typed payload object out of an eventData envelope. The contract's
 * buildEventData() nests typed props under `eventData.payload`; legacy emitters
 * may put them at the top level. Returns a merged view (payload props win) so
 * acquisition derivation works regardless of emitter version. Never throws.
 */
function extractPayload(
  eventData: Record<string, unknown>,
): Record<string, unknown> {
  const nested =
    eventData.payload && typeof eventData.payload === "object"
      ? (eventData.payload as Record<string, unknown>)
      : {};
  return { ...eventData, ...nested };
}

// Slug shape (mirrors the contract's SLUG_REGEX) — UTM values that reach
// AcquisitionEvent must be normalised slugs, never raw query text. Defence in
// depth: even if a malformed value slipped past the wire schema, this rejects it.
const ACQ_SLUG_REGEX = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;

/** Return the value only if it is a clean slug string, else null. */
function readSlug(value: unknown): string | null {
  return typeof value === "string" && ACQ_SLUG_REGEX.test(value) ? value : null;
}

// Legacy eventTypes still emitted by older clients that are NOT in the typed
// EVENT_TYPES union but are explicitly grandfathered (so existing tracking keeps
// working). Every other unknown eventType is dropped server-side, bounding
// eventType cardinality and refusing client-invented event names.
const GRANDFATHERED_EVENT_TYPES = new Set<string>(["page_view"]);

/**
 * SERVER-SIDE PII FIREWALL for eventData.
 *
 * The wire schema validates `eventData` only as an open `z.record(string,unknown)`
 * — a tampered or buggy client could smuggle PII (a name, email, query string,
 * privileged matter) into it. The client-side buildEventData() enforces the typed
 * taxonomy, but the client can be bypassed, so we MUST re-enforce here.
 *
 * Strategy: re-validate `{eventType, ...eventData}` against the strict typed
 * `analyticsEventSchema`. If it conforms, persist the VALIDATED envelope+payload
 * (closed enums / slugs / numbers / booleans only — PII-impossible). If it does
 * NOT conform (legacy or tampered), reduce to a minimal safe envelope
 * {schemaVersion, product (+ any valid-slug surface/feature/topic)} and DROP the
 * untrusted payload entirely. Either way, no free-form string reaches the store.
 * Pure; never throws.
 */
function sanitizeEventData(
  eventType: string,
  raw: Record<string, unknown>,
  product: string,
): Record<string, string | number | boolean | null> {
  const strict = analyticsEventSchema.safeParse({ eventType, ...raw });
  if (strict.success) {
    const { eventType: _omit, ...data } = strict.data as Record<
      string,
      unknown
    >;
    return {
      ...(data as Record<string, string | number | boolean | null>),
      product,
    };
  }
  // Fallback: keep ONLY structurally-safe envelope slugs; drop the payload.
  const safe: Record<string, string | number | boolean | null> = {
    schemaVersion: 1,
    product,
  };
  for (const k of ["surface", "feature", "topic"] as const) {
    if (slugSchema.safeParse(raw[k]).success) safe[k] = raw[k] as string;
  }
  return safe;
}

/**
 * POST /api/analytics/track
 *
 * Fire-and-forget behavioural-event ingestion for the cross-product analytics
 * spine. Accepts a single legacy event OR a batched array (≤50). Each event is
 * validated against the shared typed contract, consent-gated, bot-filtered,
 * stamped with server-derived product + ipCountry, and written via createMany.
 *
 * Privacy invariants (unchanged + reinforced):
 *   - pathname-only is enforced (query strings stripped + schema-rejected),
 *   - ipCountry is derived SERVER-side from cf-ipcountry / x-vercel-ip-country;
 *     the raw IP is NEVER stored,
 *   - userId (if supplied) is re-validated against the session; spoofs dropped,
 *   - non-essential events are dropped without analytics consent.
 */
export async function POST(request: Request) {
  try {
    // ── Parse the body (JSON or sendBeacon text/plain) ──
    let body: unknown;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = JSON.parse(text);
    }

    const { candidates, wrapperConsent } = normaliseBody(body);
    if (candidates.length === 0) {
      // Nothing parseable — succeed silently (analytics must never 4xx loudly).
      return NextResponse.json({ ok: true, tracked: 0 });
    }

    // ── Validate each candidate; drop malformed events individually ──
    const events: WireEvent[] = [];
    for (const c of candidates.slice(0, MAX_INGEST_EVENTS)) {
      const wire = toWireEvent(c);
      if (wire) events.push(wire);
    }
    if (events.length === 0) {
      return NextResponse.json({ ok: true, tracked: 0 });
    }

    // ── Rate limit: analytics tier, keyed on identifier + sessionId so one tab
    //    cannot flood while a shared IP keeps generous per-session headroom.
    //    Uses the FIRST event's sessionId (a batch is one tab → one session). ──
    const sessionId = events[0].sessionId;
    const rlIdentifier = `${getIdentifier(request)}:${sessionId}`;
    const rl = await checkRateLimit("analytics", rlIdentifier);
    if (!rl.success) {
      return createRateLimitResponse(rl);
    }

    // ── Bot filter: drop events from known crawlers / headless automation ──
    const userAgent = request.headers.get("user-agent") || null;
    if (looksLikeBot(userAgent)) {
      // Pretend success — do not reveal the filter to the bot.
      return NextResponse.json({ ok: true, tracked: 0 });
    }

    // ── Resolve the authenticated session ONCE (anti-spoof for userId) ──
    let sessionUserId: string | null = null;
    try {
      const session = await auth();
      sessionUserId = session?.user?.id ?? null;
    } catch {
      sessionUserId = null;
    }

    // ── Consent: header (fetch) or out-of-band wrapper `_consent` (sendBeacon).
    //    The consent string rides OUTSIDE the typed taxonomy so it can never
    //    pollute an event. Interpreted by the single shared resolver helper. ──
    const cookieConsent =
      request.headers.get("x-cookie-consent") || wrapperConsent;
    const hasConsent = isAnalyticsConsentString(cookieConsent);

    // ── Server-derived coarse geo (NEVER the raw IP) ──
    const ipCountry =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      null;

    // ── Build the persisted rows + collect acquisition side-effects ──
    const now = new Date();
    const rows: Array<{
      eventType: string;
      eventCategory: string;
      eventData: Record<string, string | number | boolean | null>;
      sessionId: string;
      userId: string | null;
      organizationId: string | null;
      path: string | null;
      durationMs: number | null;
      ipCountry: string | null;
      userAgent: string | null;
      timestamp: Date;
    }> = [];
    const acquisitionCreates: Array<Record<string, unknown>> = [];

    for (const ev of events) {
      // Consent gate — non-essential events require analytics consent.
      if (!hasConsent && !isEssentialEventType(ev.eventType)) {
        continue;
      }

      // Server-side eventType allow-list — drop unknown/client-invented types
      // (bounds eventType cardinality; PII cannot ride in eventType anyway).
      if (
        !isEventType(ev.eventType) &&
        !GRANDFATHERED_EVENT_TYPES.has(ev.eventType)
      ) {
        continue;
      }

      // Anti-spoof: a supplied userId must match the session, else null it.
      const userId =
        ev.userId && sessionUserId && ev.userId === sessionUserId
          ? ev.userId
          : null;

      const path = pathnameOnly(ev.path ?? null);
      // Server-side PII firewall — re-validate eventData against the strict
      // taxonomy so a tampered client cannot persist free-form PII.
      const eventData = sanitizeEventData(
        ev.eventType,
        (ev.eventData ?? {}) as Record<string, unknown>,
        productFromPath(path),
      );

      rows.push({
        eventType: ev.eventType,
        eventCategory: ev.category || "general",
        eventData,
        sessionId: ev.sessionId,
        userId,
        organizationId: ev.organizationId || null,
        path,
        durationMs: typeof ev.durationMs === "number" ? ev.durationMs : null,
        ipCountry,
        userAgent,
        timestamp: ev.timestamp ? new Date(ev.timestamp) : now,
      });

      // ── Acquisition derivation (preserved intent, contract-aligned) ──
      // Under the typed taxonomy, UTM is carried as PII-safe SLUGS in the
      // `acq_page_viewed` payload (never a raw query string — `path` is
      // pathname-only). Read those normalised values directly. We also accept
      // the legacy bare "page_view" event for any client not yet on the new
      // taxonomy; for it, UTM is unavailable (query stripped) so only a payload
      // utmSource yields a row.
      if (
        (ev.eventType === "acq_page_viewed" ||
          (ev.eventType as string) === "page_view" ||
          ev.eventType === "page_viewed") &&
        !userId
      ) {
        const payload = extractPayload(eventData);
        const utmSource = readSlug(payload.utmSource);
        if (utmSource) {
          acquisitionCreates.push({
            anonymousId: ev.sessionId,
            source: utmSource,
            medium: readSlug(payload.utmMedium),
            campaign: readSlug(payload.utmCampaign),
            content: readSlug(payload.utmContent),
            term: readSlug(payload.utmTerm),
            landingPage: path,
            eventType: "visit",
            country: ipCountry,
          });
        }
      }

      // Signup conversion → acquisition "signup". Accepts the essential legacy
      // "signup" event and the typed "acq_signup_completed" funnel event.
      if (
        (ev.eventType === "signup" ||
          ev.eventType === "acq_signup_completed") &&
        userId
      ) {
        acquisitionCreates.push({
          userId,
          anonymousId: ev.sessionId,
          source: "direct", // refined later in aggregation
          eventType: "signup",
          country: ipCountry,
        });
      }
    }

    if (rows.length === 0) {
      // Everything was dropped by the consent gate — report honestly.
      return NextResponse.json({ ok: true, tracked: 0 });
    }

    // ── Persist: one createMany for all event rows (the batch write win) ──
    await prisma.analyticsEvent.createMany({ data: rows });

    // ── Acquisition rows are low-volume; create sequentially (best-effort) ──
    for (const acq of acquisitionCreates) {
      try {
        await prisma.acquisitionEvent.create({
          data: acq as never,
        });
      } catch {
        // Never let an acquisition side-effect fail the ingestion response.
      }
    }

    return NextResponse.json({ ok: true, tracked: rows.length });
  } catch (error) {
    // Log but return success — analytics should never fail loudly.
    logger.error("[Analytics Track] Error", error);
    return NextResponse.json({ ok: true, tracked: 0 });
  }
}

// Prevent caching
export const dynamic = "force-dynamic";
