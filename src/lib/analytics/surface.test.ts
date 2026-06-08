/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Tests for the path → surface/feature envelope deriver
 * (src/lib/analytics/surface.ts).
 *
 * The envelope requires `surface`/`feature` to be SLUGS, and the deriver must be
 * TOTAL — it must produce a valid slug for ANY pathname (including dynamic-id and
 * weird segments) so envelope validation never throws on a live URL. It must also
 * keep the dimension BOUNDED (collapse db ids to `:id`) and PII-free.
 *
 * Pure module — not executed here; the orchestrator runs the suite centrally.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { SLUG_REGEX, PRODUCTS } from "./events";
import {
  segmentToSlug,
  pathToSurfaceFeature,
  deriveEnvelopeHead,
} from "./surface";

describe("segmentToSlug", () => {
  it("passes through already-valid slugs unchanged", () => {
    expect(segmentToSlug("dashboard")).toBe("dashboard");
    expect(segmentToSlug("eu-space-act")).toBe("eu-space-act");
    expect(segmentToSlug("atlas:search")).toBe("atlas:search");
  });

  it("lowercases and replaces out-of-charset characters with hyphens", () => {
    expect(segmentToSlug("EU Space Act")).toBe("eu-space-act");
    expect(segmentToSlug("Foo Bar")).toBe("foo-bar");
  });

  it("collapses db-id-shaped segments to the :id sentinel (bounded cardinality)", () => {
    expect(segmentToSlug("clx1234567890abcdefghij")).toBe(":id"); // cuid-ish
    expect(segmentToSlug("123456")).toBe(":id"); // pure numeric
    expect(segmentToSlug("a1b2c3d4e5f6a1b2")).toBe(":id"); // long hex
    expect(segmentToSlug("550e8400-e29b-41d4-a716-446655440000")).toBe(":id"); // uuid length
  });

  it("returns a stable sentinel for empty input", () => {
    expect(segmentToSlug("")).toBe("index");
  });

  it("always produces a valid slug (totality)", () => {
    for (const raw of [
      "Foo",
      "a b c",
      "...---",
      "@@@",
      "Über-Café",
      "x".repeat(200),
      "_leading",
    ]) {
      const slug = segmentToSlug(raw);
      expect(SLUG_REGEX.test(slug)).toBe(true);
    }
  });
});

describe("pathToSurfaceFeature", () => {
  it("maps root to a stable surface/feature", () => {
    expect(pathToSurfaceFeature("/")).toEqual({
      surface: "root",
      feature: "index",
    });
  });

  it("uses the first segment as surface, second as feature", () => {
    expect(pathToSurfaceFeature("/dashboard")).toEqual({
      surface: "dashboard",
      feature: "index",
    });
    expect(pathToSurfaceFeature("/dashboard/modules/eu-space-act")).toEqual({
      surface: "dashboard",
      feature: "modules",
    });
    expect(pathToSurfaceFeature("/atlas/cases")).toEqual({
      surface: "atlas",
      feature: "cases",
    });
  });

  it("collapses a dynamic-id feature segment to :id", () => {
    expect(pathToSurfaceFeature("/atlas/clx1234567890abcdefghij")).toEqual({
      surface: "atlas",
      feature: ":id",
    });
  });

  it("strips query + fragment before splitting (privacy hygiene)", () => {
    expect(
      pathToSurfaceFeature("/dashboard/modules?utm_source=secret#frag"),
    ).toEqual({ surface: "dashboard", feature: "modules" });
  });

  it("produces valid slugs for both fields on any path", () => {
    for (const p of [
      "/",
      "/Foo Bar/Baz Qux",
      "/atlas/Über",
      "/trade/ops/clxabcdefghij1234567890",
      "//weird///slashes",
    ]) {
      const { surface, feature } = pathToSurfaceFeature(p);
      expect(SLUG_REGEX.test(surface)).toBe(true);
      expect(SLUG_REGEX.test(feature)).toBe(true);
    }
  });
});

describe("deriveEnvelopeHead", () => {
  it("combines productFromPath with the surface/feature split", () => {
    expect(deriveEnvelopeHead("/atlas/cases")).toEqual({
      product: PRODUCTS.ATLAS,
      surface: "atlas",
      feature: "cases",
    });
    expect(deriveEnvelopeHead("/dashboard/modules")).toEqual({
      product: PRODUCTS.COMPLY,
      surface: "dashboard",
      feature: "modules",
    });
    expect(deriveEnvelopeHead("/")).toEqual({
      product: PRODUCTS.MARKETING,
      surface: "root",
      feature: "index",
    });
    expect(deriveEnvelopeHead("/trade/classify")).toEqual({
      product: PRODUCTS.TRADE,
      surface: "trade",
      feature: "classify",
    });
  });
});
