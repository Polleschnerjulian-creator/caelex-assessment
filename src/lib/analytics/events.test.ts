/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the typed analytics event catalogue (src/lib/analytics/events.ts).
 *
 * Two things matter most and are exercised hard below:
 *   1. productFromPath — the URL-path-prefix → product deriver (the
 *      cross-product dimension). Verified against the REAL runtime paths
 *      (route groups are stripped, so `/atlas` not `/(atlas)`).
 *   2. The PII-impossible Zod guarantee — the schemas must REJECT a query
 *      string in `path` and an unknown `product`, and must reject any
 *      free-form / unknown property smuggled into an event.
 *
 * Pure module — no DB, no browser globals, no network. (Not executed here;
 * the orchestrator runs the suite centrally.)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  ANALYTICS_SCHEMA_VERSION,
  PRODUCTS,
  PRODUCT_VALUES,
  productSchema,
  productToProductCode,
  productFromPath,
  SLUG_REGEX,
  slugSchema,
  PATH_REGEX,
  pathSchema,
  ipCountrySchema,
  opaqueIdSchema,
  EVENT_TYPES,
  EVENT_TYPE_VALUES,
  ESSENTIAL_EVENT_TYPES,
  isEssentialEventType,
  eventTypeSchema,
  eventEnvelopeSchema,
  eventPayloadSchemas,
  analyticsEventSchema,
  wireEventSchema,
  batchEventsSchema,
  batchRequestSchema,
  MAX_BATCH_EVENTS,
  buildEventData,
  isEventType,
  isProduct,
  parseWireEvent,
  type Product,
} from "./events";

// ─────────────────────────────────────────────────────────────────────────────
// productFromPath
// ─────────────────────────────────────────────────────────────────────────────

describe("productFromPath", () => {
  it("maps the five product path prefixes (spec §3.3 canon)", () => {
    expect(productFromPath("/atlas")).toBe(PRODUCTS.ATLAS);
    expect(productFromPath("/trade")).toBe(PRODUCTS.TRADE);
    expect(productFromPath("/scholar")).toBe(PRODUCTS.SCHOLAR);
    expect(productFromPath("/pharos")).toBe(PRODUCTS.PHAROS);
    expect(productFromPath("/dashboard")).toBe(PRODUCTS.COMPLY);
  });

  it("maps deep nested paths under each prefix", () => {
    expect(productFromPath("/atlas/search?q=foo")).toBe(PRODUCTS.ATLAS);
    expect(productFromPath("/trade/operations/op_123")).toBe(PRODUCTS.TRADE);
    expect(productFromPath("/scholar/planspiel/run/abc")).toBe(
      PRODUCTS.SCHOLAR,
    );
    expect(productFromPath("/pharos/cases/c1/advance")).toBe(PRODUCTS.PHAROS);
    expect(productFromPath("/dashboard/modules/cybersecurity")).toBe(
      PRODUCTS.COMPLY,
    );
  });

  it("folds the standalone *-login / *-access / *-signup auth pages into their product", () => {
    expect(productFromPath("/atlas-login")).toBe(PRODUCTS.ATLAS);
    expect(productFromPath("/atlas-signup")).toBe(PRODUCTS.ATLAS);
    expect(productFromPath("/atlas-access")).toBe(PRODUCTS.ATLAS);
    expect(productFromPath("/trade-login")).toBe(PRODUCTS.TRADE);
    expect(productFromPath("/trade-access")).toBe(PRODUCTS.TRADE);
    expect(productFromPath("/scholar-login")).toBe(PRODUCTS.SCHOLAR);
    expect(productFromPath("/scholar-no-access")).toBe(PRODUCTS.SCHOLAR);
    expect(productFromPath("/pharos-login")).toBe(PRODUCTS.PHAROS);
    expect(productFromPath("/pharos-auto-signin")).toBe(PRODUCTS.PHAROS);
  });

  it("maps Comply sub-surfaces (assure, academy) and Pharos network surfaces", () => {
    expect(productFromPath("/assure/dashboard")).toBe(PRODUCTS.COMPLY);
    expect(productFromPath("/academy/courses")).toBe(PRODUCTS.COMPLY);
    expect(productFromPath("/legal-network")).toBe(PRODUCTS.PHAROS);
    expect(productFromPath("/network/attestations")).toBe(PRODUCTS.PHAROS);
  });

  it("defaults everything else (top of funnel) to marketing", () => {
    expect(productFromPath("/")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/about")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/pricing")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/blog/some-post")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/login")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/demo")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/contact")).toBe(PRODUCTS.MARKETING);
  });

  it("strips query strings + fragments before matching (no PII in derivation)", () => {
    expect(productFromPath("/atlas?utm_source=foo&email=a@b.com")).toBe(
      PRODUCTS.ATLAS,
    );
    expect(productFromPath("/dashboard#section")).toBe(PRODUCTS.COMPLY);
    expect(productFromPath("/trade/x?q=secret%20deal#top")).toBe(
      PRODUCTS.TRADE,
    );
  });

  it("accepts absolute URLs by reading their pathname", () => {
    expect(productFromPath("https://www.caelex.eu/atlas/search")).toBe(
      PRODUCTS.ATLAS,
    );
    expect(productFromPath("https://caelex.eu/dashboard")).toBe(
      PRODUCTS.COMPLY,
    );
    expect(productFromPath("https://www.caelex.eu/")).toBe(PRODUCTS.MARKETING);
  });

  it("is case-insensitive on the path", () => {
    expect(productFromPath("/ATLAS/Search")).toBe(PRODUCTS.ATLAS);
    expect(productFromPath("/Dashboard")).toBe(PRODUCTS.COMPLY);
  });

  it("does NOT match a prefix that is only a substring of a longer segment", () => {
    // `/atlasance` must not match `/atlas`; falls through to marketing.
    expect(productFromPath("/atlasance")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/dashboarding")).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("/networkz")).toBe(PRODUCTS.MARKETING);
  });

  it("handles null / undefined / empty input as marketing, never throwing", () => {
    expect(productFromPath(null)).toBe(PRODUCTS.MARKETING);
    expect(productFromPath(undefined)).toBe(PRODUCTS.MARKETING);
    expect(productFromPath("")).toBe(PRODUCTS.MARKETING);
  });

  it("is total: every product value is reachable and a member of PRODUCT_VALUES", () => {
    const reached = new Set<Product>([
      productFromPath("/atlas"),
      productFromPath("/trade"),
      productFromPath("/scholar"),
      productFromPath("/pharos"),
      productFromPath("/dashboard"),
      productFromPath("/"),
    ]);
    expect(reached).toEqual(new Set(PRODUCT_VALUES));
    for (const p of reached) expect(PRODUCT_VALUES).toContain(p);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// product enum + ProductCode mapping
// ─────────────────────────────────────────────────────────────────────────────

describe("product enum + productToProductCode", () => {
  it("exposes exactly six product values", () => {
    expect(PRODUCT_VALUES).toEqual([
      "comply",
      "trade",
      "atlas",
      "pharos",
      "scholar",
      "marketing",
    ]);
  });

  it("productSchema accepts every product and rejects an unknown product", () => {
    for (const p of PRODUCT_VALUES) {
      expect(productSchema.safeParse(p).success).toBe(true);
    }
    expect(productSchema.safeParse("teleport").success).toBe(false);
    expect(productSchema.safeParse("COMPLY").success).toBe(false); // case-sensitive
    expect(productSchema.safeParse("").success).toBe(false);
  });

  it("maps the five products to their ProductCode and marketing to null", () => {
    expect(productToProductCode(PRODUCTS.COMPLY)).toBe("COMPLY");
    expect(productToProductCode(PRODUCTS.TRADE)).toBe("TRADE");
    expect(productToProductCode(PRODUCTS.ATLAS)).toBe("ATLAS");
    expect(productToProductCode(PRODUCTS.PHAROS)).toBe("PHAROS");
    expect(productToProductCode(PRODUCTS.SCHOLAR)).toBe("SCHOLAR");
    expect(productToProductCode(PRODUCTS.MARKETING)).toBeNull();
  });

  it("isProduct type guard", () => {
    expect(isProduct("atlas")).toBe(true);
    expect(isProduct("marketing")).toBe(true);
    expect(isProduct("nope")).toBe(false);
    expect(isProduct(42)).toBe(false);
    expect(isProduct(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PII-boundary primitives: slug, path, ipCountry, opaqueId
// ─────────────────────────────────────────────────────────────────────────────

describe("slug primitive", () => {
  it("accepts lowercase slugs incl. _ - : . separators", () => {
    for (const ok of [
      "eu_space_act",
      "atlas:search",
      "module.cybersecurity",
      "de",
      "us-regulatory",
      "a",
      "x".repeat(64),
    ]) {
      expect(SLUG_REGEX.test(ok)).toBe(true);
      expect(slugSchema.safeParse(ok).success).toBe(true);
    }
  });

  it("REJECTS anything that could carry PII / prose (spaces, @, uppercase, punctuation)", () => {
    for (const bad of [
      "John Doe",
      "john@example.com",
      "Hello, world!",
      "UPPER",
      "trailing space ",
      " leading",
      "has/slash",
      "semi;colon",
      "quote'd",
      "<script>",
      "",
      "x".repeat(65), // too long
    ]) {
      expect(SLUG_REGEX.test(bad)).toBe(false);
      expect(slugSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("path primitive (pathname-only, query-string-FORBIDDEN)", () => {
  it("accepts pathname-only values", () => {
    for (const ok of ["/", "/atlas", "/dashboard/modules/cybersecurity"]) {
      expect(PATH_REGEX.test(ok)).toBe(true);
      expect(pathSchema.safeParse(ok).success).toBe(true);
    }
  });

  it("REJECTS a path containing a query string", () => {
    expect(PATH_REGEX.test("/atlas?utm_source=x")).toBe(false);
    expect(pathSchema.safeParse("/atlas?utm_source=x").success).toBe(false);
    expect(pathSchema.safeParse("/search?q=secret+deal").success).toBe(false);
  });

  it("REJECTS a path containing a fragment or whitespace, and a non-rooted path", () => {
    expect(pathSchema.safeParse("/atlas#frag").success).toBe(false);
    expect(pathSchema.safeParse("/has space").success).toBe(false);
    expect(pathSchema.safeParse("atlas").success).toBe(false); // must start with /
    expect(pathSchema.safeParse("/" + "x".repeat(512)).success).toBe(false); // > 512
  });
});

describe("ipCountry primitive", () => {
  it("accepts a 2-char code and rejects raw IPs / long strings", () => {
    expect(ipCountrySchema.safeParse("DE").success).toBe(true);
    expect(ipCountrySchema.safeParse("US").success).toBe(true);
    expect(ipCountrySchema.safeParse("XX").success).toBe(true);
    expect(ipCountrySchema.safeParse("Germany").success).toBe(false);
    expect(ipCountrySchema.safeParse("203.0.113.7").success).toBe(false);
    expect(ipCountrySchema.safeParse("d").success).toBe(false);
  });
});

describe("opaqueId primitive", () => {
  it("accepts ids and rejects free text", () => {
    expect(opaqueIdSchema.safeParse("clx_abc123DEF").success).toBe(true);
    expect(
      opaqueIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success,
    ).toBe(true);
    expect(opaqueIdSchema.safeParse("a real sentence here").success).toBe(
      false,
    );
    expect(opaqueIdSchema.safeParse("name@email.com").success).toBe(false);
    expect(opaqueIdSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// event types + essential allow-list
// ─────────────────────────────────────────────────────────────────────────────

describe("event types", () => {
  it("eventTypeSchema accepts every declared type and rejects unknowns", () => {
    for (const t of EVENT_TYPE_VALUES) {
      expect(eventTypeSchema.safeParse(t).success).toBe(true);
    }
    expect(eventTypeSchema.safeParse("not_an_event").success).toBe(false);
    expect(eventTypeSchema.safeParse("PageViewed").success).toBe(false);
  });

  it("every event type has a payload schema (exhaustive coverage)", () => {
    for (const t of EVENT_TYPE_VALUES) {
      expect(eventPayloadSchemas[t]).toBeDefined();
    }
  });

  it("essential allow-list is exactly signup + login", () => {
    expect(ESSENTIAL_EVENT_TYPES).toEqual([
      EVENT_TYPES.SIGNUP,
      EVENT_TYPES.LOGIN,
    ]);
    expect(isEssentialEventType("signup")).toBe(true);
    expect(isEssentialEventType("login")).toBe(true);
    expect(isEssentialEventType("page_viewed")).toBe(false);
    expect(isEssentialEventType("atlas_search_ran")).toBe(false);
  });

  it("isEventType type guard", () => {
    expect(isEventType("page_viewed")).toBe(true);
    expect(isEventType("trade_operation_status_changed")).toBe(true);
    expect(isEventType("bogus")).toBe(false);
    expect(isEventType(123)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// envelope + full event schema (accept / reject, incl. PII rejection)
// ─────────────────────────────────────────────────────────────────────────────

describe("eventEnvelopeSchema", () => {
  const valid = {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    product: PRODUCTS.ATLAS,
    surface: "search",
    feature: "semantic_search",
  };

  it("accepts a valid envelope (with and without topic)", () => {
    expect(eventEnvelopeSchema.safeParse(valid).success).toBe(true);
    expect(
      eventEnvelopeSchema.safeParse({ ...valid, topic: "de" }).success,
    ).toBe(true);
  });

  it("REJECTS an unknown product in the envelope", () => {
    expect(
      eventEnvelopeSchema.safeParse({ ...valid, product: "teleport" }).success,
    ).toBe(false);
  });

  it("REJECTS a wrong schemaVersion", () => {
    expect(
      eventEnvelopeSchema.safeParse({ ...valid, schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it("REJECTS a surface/feature/topic that could carry PII (free text)", () => {
    expect(
      eventEnvelopeSchema.safeParse({ ...valid, surface: "John Doe" }).success,
    ).toBe(false);
    expect(
      eventEnvelopeSchema.safeParse({ ...valid, feature: "a@b.com" }).success,
    ).toBe(false);
    expect(
      eventEnvelopeSchema.safeParse({ ...valid, topic: "secret client name" })
        .success,
    ).toBe(false);
  });
});

describe("analyticsEventSchema (envelope + typed payload, discriminated by eventType)", () => {
  it("accepts a well-formed Atlas search event", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.ATLAS,
      surface: "search",
      feature: "semantic_search",
      topic: "de",
      eventType: EVENT_TYPES.ATLAS_SEMANTIC_SEARCH_RAN,
      payload: {
        queryLen: 17,
        jurisdiction: "de",
        resultCount: 8,
        zeroResults: false,
      },
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(true);
  });

  it("accepts the Trade funnel-spine status-change event", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.TRADE,
      surface: "operations",
      feature: "status",
      eventType: EVENT_TYPES.TRADE_OPERATION_STATUS_CHANGED,
      payload: {
        from: "screening",
        to: "awaiting_license",
        operationId: "op_123",
      },
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(true);
  });

  it("accepts a prop-less event with an empty payload", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.ATLAS,
      surface: "ai",
      feature: "ai_mode",
      eventType: EVENT_TYPES.ATLAS_AI_MODE_OPENED,
      payload: {},
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(true);
  });

  it("REJECTS an unknown event type (discriminator miss)", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.ATLAS,
      surface: "search",
      feature: "search",
      eventType: "atlas_mind_read",
      payload: {},
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(false);
  });

  it("REJECTS raw query TEXT smuggled into a search payload (only queryLen is allowed)", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.ATLAS,
      surface: "search",
      feature: "search",
      eventType: EVENT_TYPES.ATLAS_SEARCH_RAN,
      // `query` is NOT a declared prop and the payload schema is .strict()
      payload: { queryLen: 12, query: "Acme Corp v. State secret matter" },
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(false);
  });

  it("REJECTS a stray PII key smuggled into a prop-less event", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.MARKETING,
      surface: "marketing",
      feature: "demo",
      eventType: EVENT_TYPES.ACQ_DEMO_REQUESTED,
      payload: { email: "lead@company.com", name: "Jane Lead" },
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(false);
  });

  it("REJECTS a closed-enum violation (export format)", () => {
    const ev = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: PRODUCTS.ATLAS,
      surface: "export",
      feature: "export",
      eventType: EVENT_TYPES.ATLAS_EXPORT_RUN,
      payload: { format: "exe" }, // only docx|pdf|datev
    };
    expect(analyticsEventSchema.safeParse(ev).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildEventData helper
// ─────────────────────────────────────────────────────────────────────────────

describe("buildEventData", () => {
  it("stamps schemaVersion + envelope and returns a flat persisted shape", () => {
    const data = buildEventData(
      EVENT_TYPES.COMPLY_ASSESSMENT_COMPLETED,
      {
        product: PRODUCTS.COMPLY,
        surface: "assessment",
        feature: "wizard",
        topic: "eu_space_act",
      },
      { regulation: "eu_space_act", durationMs: 42000 },
    );
    expect(data).toEqual({
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: "comply",
      surface: "assessment",
      feature: "wizard",
      topic: "eu_space_act",
      payload: { regulation: "eu_space_act", durationMs: 42000 },
    });
  });

  it("omits topic when not provided", () => {
    const data = buildEventData(EVENT_TYPES.PAGE_VIEWED, {
      product: PRODUCTS.MARKETING,
      surface: "marketing",
      feature: "landing",
    });
    expect(data).not.toHaveProperty("topic");
    expect(data.payload).toEqual({});
  });

  it("THROWS when the payload violates the event's typed schema", () => {
    expect(() =>
      buildEventData(
        EVENT_TYPES.ATLAS_SEARCH_RAN,
        { product: PRODUCTS.ATLAS, surface: "search", feature: "search" },
        // raw query text is not an allowed prop
        { queryLen: 5, query: "privileged matter" },
      ),
    ).toThrow();
  });

  it("THROWS when the envelope carries an unknown product", () => {
    expect(() =>
      buildEventData(
        EVENT_TYPES.PAGE_VIEWED,
        // @ts-expect-error — deliberately invalid product for the runtime check
        { product: "teleport", surface: "x", feature: "y" },
      ),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wire event + batch payload
// ─────────────────────────────────────────────────────────────────────────────

describe("wireEventSchema", () => {
  const base = {
    eventType: EVENT_TYPES.PAGE_VIEWED,
    eventData: {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: "atlas",
      surface: "search",
      feature: "search",
      payload: {},
    },
    sessionId: "sess_abc123",
  };

  it("accepts a minimal valid wire event", () => {
    expect(wireEventSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a pathname-only path and REJECTS a path with a query string", () => {
    expect(
      wireEventSchema.safeParse({ ...base, path: "/atlas/search" }).success,
    ).toBe(true);
    expect(
      wireEventSchema.safeParse({ ...base, path: "/atlas?q=secret" }).success,
    ).toBe(false);
  });

  it("REJECTS an unknown event type", () => {
    expect(
      wireEventSchema.safeParse({ ...base, eventType: "nope" }).success,
    ).toBe(false);
  });

  it("REJECTS unknown top-level keys (no referrer/userAgent/ipCountry from client)", () => {
    expect(
      wireEventSchema.safeParse({ ...base, referrer: "https://x.com" }).success,
    ).toBe(false);
    expect(
      wireEventSchema.safeParse({ ...base, ipCountry: "DE" }).success,
    ).toBe(false);
    expect(
      wireEventSchema.safeParse({ ...base, email: "a@b.com" }).success,
    ).toBe(false);
  });

  it("REJECTS a negative durationMs", () => {
    expect(wireEventSchema.safeParse({ ...base, durationMs: -5 }).success).toBe(
      false,
    );
  });

  it("parseWireEvent returns the event on success and null on failure", () => {
    expect(parseWireEvent(base)).not.toBeNull();
    expect(parseWireEvent({ junk: true })).toBeNull();
    expect(parseWireEvent(null)).toBeNull();
  });
});

describe("batch payload", () => {
  const ev = {
    eventType: EVENT_TYPES.PAGE_VIEWED,
    eventData: {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      product: "comply",
      surface: "dashboard",
      feature: "home",
      payload: {},
    },
    sessionId: "sess_x",
  };

  it("accepts a non-empty array up to the cap", () => {
    expect(batchEventsSchema.safeParse([ev]).success).toBe(true);
    expect(
      batchEventsSchema.safeParse(Array(MAX_BATCH_EVENTS).fill(ev)).success,
    ).toBe(true);
  });

  it("REJECTS an empty array and an over-cap array", () => {
    expect(batchEventsSchema.safeParse([]).success).toBe(false);
    expect(
      batchEventsSchema.safeParse(Array(MAX_BATCH_EVENTS + 1).fill(ev)).success,
    ).toBe(false);
  });

  it("batchRequestSchema accepts both a bare array and the {events,_consent} object", () => {
    expect(batchRequestSchema.safeParse([ev]).success).toBe(true);
    expect(
      batchRequestSchema.safeParse({ events: [ev], _consent: "analytics" })
        .success,
    ).toBe(true);
  });

  it("batchRequestSchema REJECTS an object missing events or carrying stray keys", () => {
    expect(
      batchRequestSchema.safeParse({ _consent: "analytics" }).success,
    ).toBe(false);
    expect(
      batchRequestSchema.safeParse({ events: [ev], leak: "x" }).success,
    ).toBe(false);
  });
});
