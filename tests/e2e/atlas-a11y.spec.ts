/**
 * Atlas WCAG 2.2 AA Accessibility Test Suite — Phase H verification
 *
 * Runs axe-core (via @axe-core/playwright) against every public Atlas
 * route. Asserts zero critical/serious violations under tags:
 *   - wcag2a, wcag2aa  (WCAG 2.0 + 2.1 Level A & AA criteria)
 *   - wcag22a, wcag22aa  (WCAG 2.2 Level A & AA criteria, including
 *     the 6 new 2.2 criteria: Focus Not Obscured, Dragging Movements,
 *     Target Size, Consistent Help, Redundant Entry, Accessible
 *     Authentication)
 *
 * Authenticated Atlas routes (/atlas/*) are NOT covered by this suite
 * because they require a logged-in session — they will be added in a
 * follow-up using Playwright's `storageState` once the e2e auth-fixture
 * pattern is in place. The 7 public auth-pages cover the most critical
 * a11y surfaces (sign-up + login flows that prospects encounter first).
 *
 * Reference: docs/ATLAS-ACCESSIBILITY-AUDIT.md (Phase H)
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicAtlasPages = [
  { name: "Atlas — Sign In", url: "/atlas-login" },
  { name: "Atlas — Sign Up", url: "/atlas-signup" },
  { name: "Atlas — Demo Booking", url: "/atlas-access" },
  { name: "Atlas — No Access (org-type gate)", url: "/atlas-no-access" },
  { name: "Atlas — Forgot Password", url: "/atlas-forgot-password" },
  { name: "Atlas — Reset Password", url: "/atlas-reset-password" },
];

for (const { name, url } of publicAtlasPages) {
  test(`${name} (${url}) — WCAG 2.2 AA conformance`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22a", "wcag22aa"])
      .analyze();

    // Critical + serious are the gating tiers. axe also reports
    // moderate + minor issues — those are tracked in the audit
    // doc but not gating for the suite (they require designer
    // judgment to decide whether each is genuinely actionable).
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (critical.length > 0) {
      console.log(
        `\n[a11y] ${name} violations:`,
        JSON.stringify(critical, null, 2),
      );
    }
    expect(critical).toEqual([]);
  });
}

/**
 * Theme-switch coverage: the same auth pages also need to pass in
 * Atlas-light + Atlas-dark mode separately. The Atlas pre-hydration
 * script reads localStorage to set data-atlas-preload before React
 * paints, so we set the storage value before navigation.
 */
const themes = ["light", "dark"] as const;

for (const theme of themes) {
  test(`Atlas Sign-In page in ${theme} mode — WCAG 2.2 AA conformance`, async ({
    page,
  }) => {
    // Pre-set the atlas-theme localStorage value so the pre-hydration
    // flash-guard picks the right palette before any paint.
    await page.addInitScript((t) => {
      window.localStorage.setItem("atlas-theme", t);
    }, theme);

    await page.goto("/atlas-login");
    await page.waitForLoadState("domcontentloaded");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22a", "wcag22aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (critical.length > 0) {
      console.log(
        `\n[a11y/${theme}] atlas-login violations:`,
        JSON.stringify(critical, null, 2),
      );
    }
    expect(critical).toEqual([]);
  });
}
