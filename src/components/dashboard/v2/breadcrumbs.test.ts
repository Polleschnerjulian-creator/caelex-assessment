/**
 * Tests for src/components/dashboard/v2/breadcrumbs.ts
 *
 * Coverage:
 *   1. Empty pathname → empty crumbs
 *   2. Root /dashboard → single Dashboard crumb marked current
 *   3. /dashboard/posture → Dashboard, Posture (current)
 *   4. Static-label lookup for known nav segments
 *   5. Slug fallback to title-case for unknown segments
 *   6. cuid-shaped segment truncates to 6+… chars
 *   7. uuid segment also truncates
 *   8. Multi-level path produces accumulating hrefs
 *   9. isCurrent only true for the last crumb
 */

import { describe, it, expect } from "vitest";

import { breadcrumbsFromPath } from "./breadcrumbs";

describe("breadcrumbsFromPath", () => {
  it("empty pathname → empty crumbs", () => {
    expect(breadcrumbsFromPath("")).toEqual([]);
    expect(breadcrumbsFromPath("/")).toEqual([]);
  });

  it("/dashboard → single Dashboard crumb marked current", () => {
    const crumbs = breadcrumbsFromPath("/dashboard");
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toEqual({
      label: "Dashboard",
      href: "/dashboard",
      isCurrent: true,
    });
  });

  it("/dashboard/posture → Dashboard + Posture, current=Posture", () => {
    const crumbs = breadcrumbsFromPath("/dashboard/posture");
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0]).toMatchObject({
      label: "Dashboard",
      href: "/dashboard",
      isCurrent: false,
    });
    expect(crumbs[1]).toMatchObject({
      label: "Posture",
      href: "/dashboard/posture",
      isCurrent: true,
    });
  });

  it("static-label lookup for multi-word segments — Time Travel, Audit Center, Article Tracker", () => {
    expect(breadcrumbsFromPath("/dashboard/time-travel")[1].label).toBe(
      "Time Travel",
    );
    expect(breadcrumbsFromPath("/dashboard/audit-center")[1].label).toBe(
      "Audit Center",
    );
    expect(breadcrumbsFromPath("/dashboard/tracker")[1].label).toBe(
      "Article Tracker",
    );
  });

  it("title-case fallback for segments not in the static table", () => {
    const crumbs = breadcrumbsFromPath("/dashboard/some-new-feature");
    expect(crumbs[1].label).toBe("Some New Feature");
  });

  it("cuid-shaped segment (24 lowercase alnum) truncates to 6+… chars", () => {
    const cuid = "c" + "abcdef0123456789abcdef01"; // 25 chars
    const crumbs = breadcrumbsFromPath(`/dashboard/missions/${cuid}`);
    expect(crumbs).toHaveLength(3);
    expect(crumbs[2].label).toBe("cabcde…");
    expect(crumbs[2].href).toBe(`/dashboard/missions/${cuid}`);
  });

  it("uuid segment truncates", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const crumbs = breadcrumbsFromPath(`/dashboard/items/eu-space-act/${uuid}`);
    expect(crumbs).toHaveLength(4);
    expect(crumbs[2].label).toBe("EU Space Act");
    expect(crumbs[3].label.length).toBeLessThanOrEqual(8);
    expect(crumbs[3].label).toContain("…");
  });

  it("multi-level path produces accumulating hrefs", () => {
    const crumbs = breadcrumbsFromPath(
      "/dashboard/items/eu-space-act/foo-bar-baz",
    );
    expect(crumbs.map((c) => c.href)).toEqual([
      "/dashboard",
      "/dashboard/items",
      "/dashboard/items/eu-space-act",
      "/dashboard/items/eu-space-act/foo-bar-baz",
    ]);
  });

  it("isCurrent only true for the last crumb", () => {
    const crumbs = breadcrumbsFromPath("/dashboard/network/graph");
    expect(crumbs.map((c) => c.isCurrent)).toEqual([false, false, true]);
  });

  it("Universe segment (Sprint 10B nav entry) gets the static Universe label", () => {
    const crumbs = breadcrumbsFromPath("/dashboard/universe");
    expect(crumbs[1].label).toBe("Universe");
  });

  it("Astra route maps astra-v2 → Astra", () => {
    expect(breadcrumbsFromPath("/dashboard/astra-v2")[1].label).toBe("Astra");
  });

  it("settings/ui maps both to friendly labels", () => {
    const crumbs = breadcrumbsFromPath("/dashboard/settings/ui");
    expect(crumbs.map((c) => c.label)).toEqual(["Dashboard", "Settings", "UI"]);
  });
});
