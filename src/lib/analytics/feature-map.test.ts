/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the (product, path) → feature descriptor + route-pattern deriver
 * (src/lib/analytics/feature-map.ts).
 *
 * Two invariants dominate these tests:
 *   1. BOUNDED + slug-safe `featureId` — every id produced for a live path must
 *      pass SLUG_REGEX, and record ids must NOT leak into the id (cardinality).
 *   2. TOTALITY — both functions must produce a value for ANY input (including
 *      "", "//", "/atlas/", trailing-slash, query/hash) and never throw.
 *
 * Pure module — not executed here; the orchestrator runs the suite centrally.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { SLUG_REGEX, PRODUCT_VALUES, type Product } from "./events";
import { deriveFeature, normalizePath, titleizeSlug } from "./feature-map";

// ─────────────────────────────────────────────────────────────────────────────
// titleizeSlug (the internal display-name helper)
// ─────────────────────────────────────────────────────────────────────────────

describe("titleizeSlug", () => {
  it("title-cases each word, splitting on - _ . :", () => {
    expect(titleizeSlug("eu-space-act")).toBe("Eu Space Act");
    expect(titleizeSlug("export_control")).toBe("Export Control");
    expect(titleizeSlug("atlas:search")).toBe("Atlas Search");
    expect(titleizeSlug("dotted.module")).toBe("Dotted Module");
  });

  it("handles single words", () => {
    expect(titleizeSlug("cases")).toBe("Cases");
    expect(titleizeSlug("home")).toBe("Home");
  });

  it("is total on empty / separator-only input", () => {
    expect(titleizeSlug("")).toBe("");
    expect(titleizeSlug("---")).toBe("");
    expect(titleizeSlug(undefined as unknown as string)).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveFeature — per-product branches
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveFeature — COMPLY", () => {
  it("keeps module granularity for /dashboard/modules/<m> with the known-name map", () => {
    expect(deriveFeature("comply", "/dashboard/modules/authorization")).toEqual(
      {
        featureId: "comply:module:authorization",
        featureName: "Authorization",
        moduleCategory: "compliance",
      },
    );
    expect(deriveFeature("comply", "/dashboard/modules/cybersecurity")).toEqual(
      {
        featureId: "comply:module:cybersecurity",
        featureName: "Cybersecurity",
        moduleCategory: "compliance",
      },
    );
    expect(deriveFeature("comply", "/dashboard/modules/debris")).toEqual({
      featureId: "comply:module:debris",
      featureName: "Debris Management",
      moduleCategory: "compliance",
    });
    expect(deriveFeature("comply", "/dashboard/modules/registration")).toEqual({
      featureId: "comply:module:registration",
      featureName: "Registration",
      moduleCategory: "compliance",
    });
    expect(deriveFeature("comply", "/dashboard/modules/environmental")).toEqual(
      {
        featureId: "comply:module:environmental",
        featureName: "Environmental",
        moduleCategory: "compliance",
      },
    );
    expect(deriveFeature("comply", "/dashboard/modules/insurance")).toEqual({
      featureId: "comply:module:insurance",
      featureName: "Insurance",
      moduleCategory: "compliance",
    });
    expect(deriveFeature("comply", "/dashboard/modules/nis2")).toEqual({
      featureId: "comply:module:nis2",
      featureName: "NIS2",
      moduleCategory: "compliance",
    });
    expect(deriveFeature("comply", "/dashboard/modules/supervision")).toEqual({
      featureId: "comply:module:supervision",
      featureName: "Supervision",
      moduleCategory: "compliance",
    });
  });

  it("title-cases unknown module ids", () => {
    expect(
      deriveFeature("comply", "/dashboard/modules/export-control"),
    ).toEqual({
      featureId: "comply:module:export-control",
      featureName: "Export Control",
      moduleCategory: "compliance",
    });
  });

  it("maps /dashboard and /dashboard/<area> to comply:<area> (dashboard category)", () => {
    expect(deriveFeature("comply", "/dashboard")).toEqual({
      featureId: "comply:home",
      featureName: "Dashboard",
      moduleCategory: "dashboard",
    });
    expect(deriveFeature("comply", "/dashboard/documents")).toEqual({
      featureId: "comply:documents",
      featureName: "Documents",
      moduleCategory: "dashboard",
    });
    expect(deriveFeature("comply", "/dashboard/astra")).toEqual({
      featureId: "comply:astra",
      featureName: "Astra",
      moduleCategory: "dashboard",
    });
  });

  it("treats /dashboard/modules with NO module as comply:modules", () => {
    expect(deriveFeature("comply", "/dashboard/modules")).toEqual({
      featureId: "comply:modules",
      featureName: "Modules",
      moduleCategory: "dashboard",
    });
    // Trailing slash variant must behave identically.
    expect(deriveFeature("comply", "/dashboard/modules/")).toEqual({
      featureId: "comply:modules",
      featureName: "Modules",
      moduleCategory: "dashboard",
    });
  });

  it("falls back to comply:modules when the module slot is an id (never emits :id)", () => {
    expect(
      deriveFeature("comply", "/dashboard/modules/clx1234567890abcdefghij"),
    ).toEqual({
      featureId: "comply:modules",
      featureName: "Modules",
      moduleCategory: "dashboard",
    });
  });

  it("maps /assure and /assure/<area> to comply:assure:<area>", () => {
    expect(deriveFeature("comply", "/assure")).toEqual({
      featureId: "comply:assure:home",
      featureName: "Assure Home",
      moduleCategory: "assure",
    });
    expect(deriveFeature("comply", "/assure/dataroom")).toEqual({
      featureId: "comply:assure:dataroom",
      featureName: "Assure Dataroom",
      moduleCategory: "assure",
    });
  });

  it("maps /academy and /academy/<area> to comply:academy:<area>", () => {
    expect(deriveFeature("comply", "/academy")).toEqual({
      featureId: "comply:academy:home",
      featureName: "Academy Home",
      moduleCategory: "academy",
    });
    expect(deriveFeature("comply", "/academy/courses")).toEqual({
      featureId: "comply:academy:courses",
      featureName: "Academy Courses",
      moduleCategory: "academy",
    });
  });
});

describe("deriveFeature — ATLAS / TRADE / SCHOLAR / PHAROS", () => {
  it("ATLAS: /atlas and /atlas/<area>", () => {
    expect(deriveFeature("atlas", "/atlas")).toEqual({
      featureId: "atlas:home",
      featureName: "Atlas Home",
      moduleCategory: "atlas",
    });
    expect(deriveFeature("atlas", "/atlas/cases")).toEqual({
      featureId: "atlas:cases",
      featureName: "Atlas Cases",
      moduleCategory: "atlas",
    });
    // A deep path with an id keeps the AREA (cases), not the id.
    expect(
      deriveFeature("atlas", "/atlas/cases/clx1234567890abcdefghij"),
    ).toEqual({
      featureId: "atlas:cases",
      featureName: "Atlas Cases",
      moduleCategory: "atlas",
    });
  });

  it("TRADE: /trade and /trade/<area>", () => {
    expect(deriveFeature("trade", "/trade")).toEqual({
      featureId: "trade:home",
      featureName: "Trade Home",
      moduleCategory: "trade",
    });
    expect(deriveFeature("trade", "/trade/classify")).toEqual({
      featureId: "trade:classify",
      featureName: "Trade Classify",
      moduleCategory: "trade",
    });
  });

  it("SCHOLAR: /scholar and /scholar/<area>", () => {
    expect(deriveFeature("scholar", "/scholar")).toEqual({
      featureId: "scholar:home",
      featureName: "Scholar Home",
      moduleCategory: "scholar",
    });
    expect(deriveFeature("scholar", "/scholar/search")).toEqual({
      featureId: "scholar:search",
      featureName: "Scholar Search",
      moduleCategory: "scholar",
    });
  });

  it("PHAROS: /pharos, /legal-network and /network all map to pharos:<area>", () => {
    expect(deriveFeature("pharos", "/pharos")).toEqual({
      featureId: "pharos:home",
      featureName: "Pharos Home",
      moduleCategory: "pharos",
    });
    expect(deriveFeature("pharos", "/pharos/oversight")).toEqual({
      featureId: "pharos:oversight",
      featureName: "Pharos Oversight",
      moduleCategory: "pharos",
    });
    // The legal-network / network roots are stripped; the area is the next seg.
    expect(deriveFeature("pharos", "/legal-network/attestations")).toEqual({
      featureId: "pharos:attestations",
      featureName: "Pharos Attestations",
      moduleCategory: "pharos",
    });
    expect(deriveFeature("pharos", "/network/dataroom")).toEqual({
      featureId: "pharos:dataroom",
      featureName: "Pharos Dataroom",
      moduleCategory: "pharos",
    });
  });
});

describe("deriveFeature — MARKETING", () => {
  it("collapses to the first segment", () => {
    expect(deriveFeature("marketing", "/blog/some-post-slug")).toEqual({
      featureId: "marketing:blog",
      featureName: "Blog",
      moduleCategory: "marketing",
    });
    expect(deriveFeature("marketing", "/pricing")).toEqual({
      featureId: "marketing:pricing",
      featureName: "Pricing",
      moduleCategory: "marketing",
    });
  });

  it("maps '/' to marketing:home", () => {
    expect(deriveFeature("marketing", "/")).toEqual({
      featureId: "marketing:home",
      featureName: "Home",
      moduleCategory: "marketing",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveFeature — rejection of non-feature paths
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveFeature — rejects non-feature paths", () => {
  it("rejects /api and /_next routes (any product)", () => {
    expect(deriveFeature("comply", "/api/analytics/track")).toBeNull();
    expect(deriveFeature("marketing", "/api")).toBeNull();
    expect(deriveFeature("atlas", "/_next/static/chunks/main.js")).toBeNull();
    expect(deriveFeature("comply", "/_next")).toBeNull();
  });

  it("rejects static asset paths by extension", () => {
    for (const p of [
      "/favicon.ico",
      "/logo.svg",
      "/styles/app.css",
      "/scripts/bundle.js",
      "/sitemap.xml",
      "/robots.txt",
      "/data/feed.json",
      "/img/hero.png",
      "/img/hero.JPG",
      "/fonts/inter.woff2",
      "/source.map",
    ]) {
      expect(deriveFeature("marketing", p)).toBeNull();
    }
  });

  it("does NOT reject a normal page that merely contains a dot earlier in the path", () => {
    // The dot is before the last slash, so it is not a trailing extension.
    expect(deriveFeature("marketing", "/v1.0/overview")).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveFeature — totality + slug-regex validity
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveFeature — totality & slug validity", () => {
  it("never throws on weird inputs and returns null or a valid descriptor", () => {
    const weird: Array<string | null | undefined> = [
      "",
      "//",
      "/atlas/",
      "/dashboard/modules/",
      "/x?q=secret#frag",
      null,
      undefined,
      "///weird///slashes",
      "/trade",
      "/UPPER/CASE/PATH",
    ];
    for (const product of PRODUCT_VALUES) {
      for (const p of weird) {
        const r = deriveFeature(product, p);
        expect(() => deriveFeature(product, p)).not.toThrow();
        if (r !== null) {
          expect(SLUG_REGEX.test(r.featureId)).toBe(true);
          expect(typeof r.featureName).toBe("string");
          expect(typeof r.moduleCategory).toBe("string");
        }
      }
    }
  });

  it("produces a SLUG_REGEX-valid featureId for a representative path per product", () => {
    const representative: Record<Product, string> = {
      comply: "/dashboard/modules/eu-space-act",
      atlas: "/atlas/cases/clx1234567890abcdefghij",
      trade: "/trade/classify",
      scholar: "/scholar/search",
      pharos: "/legal-network/attestations",
      marketing: "/blog/a-post",
    };
    for (const product of PRODUCT_VALUES) {
      const r = deriveFeature(product, representative[product]);
      expect(r).not.toBeNull();
      expect(SLUG_REGEX.test(r!.featureId)).toBe(true);
    }
  });

  it("strips query + hash defensively before deriving (privacy hygiene)", () => {
    // Same path with and without a (PII-carrying) query must yield the same id.
    expect(deriveFeature("atlas", "/atlas/cases?email=a@b.com#x")).toEqual(
      deriveFeature("atlas", "/atlas/cases"),
    );
  });

  it("trusts the product arg even when it disagrees with the path root", () => {
    // Caller says marketing; path looks like /atlas — we honour the arg and
    // collapse to the first segment (marketing:atlas), never re-derive product.
    expect(deriveFeature("marketing", "/atlas/cases")).toEqual({
      featureId: "marketing:atlas",
      featureName: "Atlas",
      moduleCategory: "marketing",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizePath
// ─────────────────────────────────────────────────────────────────────────────

describe("normalizePath — id collapse keeps edge cardinality bounded", () => {
  it("collapses cuid segments to :id", () => {
    expect(normalizePath("/atlas/cases/clx1234567890abcdefghij")).toBe(
      "/atlas/cases/:id",
    );
  });

  it("collapses uuid segments to :id", () => {
    expect(
      normalizePath("/trade/ops/550e8400-e29b-41d4-a716-446655440000"),
    ).toBe("/trade/ops/:id");
  });

  it("collapses all-numeric segments to :id", () => {
    expect(normalizePath("/dashboard/modules/123456")).toBe(
      "/dashboard/modules/:id",
    );
  });

  it("collapses any segment >= 20 chars to :id (defensive opaque-token rule)", () => {
    const long = "a".repeat(20); // 20 non-id-looking chars
    expect(normalizePath(`/x/${long}`)).toBe("/x/:id");
    // 19 chars must be kept verbatim (below the threshold).
    const short = "a".repeat(19);
    expect(normalizePath(`/x/${short}`)).toBe(`/x/${short}`);
  });

  it("lowercases the whole path", () => {
    expect(normalizePath("/Atlas/Cases")).toBe("/atlas/cases");
  });

  it("strips query + fragment defensively", () => {
    expect(normalizePath("/dashboard/modules?utm=secret#frag")).toBe(
      "/dashboard/modules",
    );
  });

  it("maps empty / '/' / null / undefined to '/'", () => {
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath(null)).toBe("/");
    expect(normalizePath(undefined)).toBe("/");
  });

  it("always returns a string starting with '/'", () => {
    for (const p of [
      "",
      "/",
      "//",
      "/a/b/c",
      "no-leading-slash",
      "/Mixed/Case/123",
      "/x?q=1",
    ]) {
      const r = normalizePath(p);
      expect(r.startsWith("/")).toBe(true);
    }
  });

  it("preserves empty segments from double slashes (route pattern, not slug)", () => {
    // "//weird" → ["", "", "weird"] → join keeps the empties.
    expect(normalizePath("//weird")).toBe("//weird");
  });

  it("preserves non-id segments verbatim (only :id is rewritten)", () => {
    expect(normalizePath("/dashboard/documents/list")).toBe(
      "/dashboard/documents/list",
    );
  });
});
