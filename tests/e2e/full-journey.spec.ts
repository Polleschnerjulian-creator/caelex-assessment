import { test, expect, Page } from "@playwright/test";

/**
 * Full Journey E2E Tests
 *
 * Tests the complete user journey from Landing Page → Assessment → Results → PDF
 * for multiple operator profiles. These are integration-level E2E tests that verify
 * the entire flow works end-to-end.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate from landing to assessment by clicking the CTA */
async function navigateFromLandingToAssessment(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click the "Start your assessment" CTA
  const ctaLink = page.getByRole("link", { name: /start your assessment/i });
  await expect(ctaLink).toBeVisible();
  await ctaLink.click();

  // Wait for assessment page to load
  await page.waitForURL(/\/assessment/);
  await expect(page.getByText(/space activity/i)).toBeVisible();
}

/** Complete the standard pre-screening questions (Q1-Q3) for spacecraft operators */
async function completeSpacecraftPreScreening(page: Page) {
  // Q1: Activity type → Spacecraft Operation
  await page.getByText("Spacecraft Operation").click();
  await expect(page.getByText(/defense/i)).toBeVisible();

  // Q2: Defense → No
  await page.getByText("No, not exclusively defense").click();
  await expect(page.getByText(/launched after/i)).toBeVisible();

  // Q3: Post-2030 → Yes
  await page.getByText("Yes, launching after 2030").click();
  await expect(page.getByText(/organization established/i)).toBeVisible();
}

/** Verify the results dashboard is displayed with key sections */
async function verifyResultsDashboard(page: Page) {
  await expect(page.getByText(/Compliance Profile/i)).toBeVisible();
  await expect(page.getByText(/Operator Type/i)).toBeVisible();
  await expect(page.getByText(/Regime/i)).toBeVisible();
  await expect(page.getByText(/articles/i)).toBeVisible();
}

// ---------------------------------------------------------------------------
// Journey 1: EU Spacecraft Operator — Medium, LEO, Standard Regime
// ---------------------------------------------------------------------------

test.describe("Journey: EU Spacecraft Operator (Standard Regime)", () => {
  test("Landing → Assessment → Results → PDF download", async ({ page }) => {
    // --- Landing Page ---
    await navigateFromLandingToAssessment(page);

    // --- Assessment Flow ---
    await completeSpacecraftPreScreening(page);

    // Q4: Establishment → EU
    await page.getByText("EU Member State").click();
    await expect(page.getByText(/best describes/i)).toBeVisible();

    // Q5: Entity Size → Medium
    await page.getByText("Medium Enterprise").click();
    await expect(page.getByText(/constellation/i)).toBeVisible();

    // Q6: Constellation → No
    await page.getByText("No, single satellite").click();
    await expect(page.getByText(/orbit/i)).toBeVisible();

    // Q7: Orbit → LEO (may need double-click due to step skipping)
    await page.getByText("LEO").click();

    // Wait for either EU services question or orbit question (step skip behavior)
    const euServicesVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);

    if (!euServicesVisible) {
      // If orbit question showed again due to step skipping, click LEO again
      await page.getByText("LEO").click();
    }

    await expect(page.getByText(/space-based services/i)).toBeVisible();

    // Q8: EU Services → Yes
    await page.getByText("Yes, EU market activity").click();

    // --- Results Dashboard ---
    await verifyResultsDashboard(page);

    // Verify Standard Regime
    await expect(page.getByText(/Standard/i)).toBeVisible();
    await expect(page.getByText(/Spacecraft Operator/i)).toBeVisible();

    // Verify module cards are present
    await expect(page.getByText(/Authorization/i)).toBeVisible();
    await expect(page.getByText(/Cybersecurity/i)).toBeVisible();

    // Verify checklist section
    await expect(
      page.getByText(/Next Steps/i).or(page.getByText(/Checklist/i)),
    ).toBeVisible();

    // Verify key dates
    await expect(page.getByText(/2030/)).toBeVisible();

    // --- PDF Download ---
    // Click download button — should open email gate modal
    const downloadBtn = page
      .getByRole("button", { name: /download/i })
      .or(page.getByText(/Download.*PDF/i).first());
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Email gate modal should appear
    await expect(
      page.getByText(/email/i).or(page.getByPlaceholder(/email/i)),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 2: Small Enterprise — Light Regime
// ---------------------------------------------------------------------------

test.describe("Journey: Small Enterprise (Light Regime)", () => {
  test("should show light regime indicators throughout flow", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);
    await completeSpacecraftPreScreening(page);

    // Q4: EU
    await page.getByText("EU Member State").click();
    await expect(page.getByText(/best describes/i)).toBeVisible();

    // Q5: Small Enterprise
    await page.getByText("Small Enterprise").click();
    await expect(page.getByText(/constellation/i)).toBeVisible();

    // Should show light regime callout after step 5
    await expect(page.getByText(/Light Regime/i)).toBeVisible();

    // Q6: No constellation
    await page.getByText("No, single satellite").click();
    await expect(page.getByText(/orbit/i)).toBeVisible();

    // Light regime indicator should persist
    await expect(page.getByText(/Light Regime/i)).toBeVisible();

    // Q7: LEO
    await page.getByText("LEO").click();

    // Handle potential step skipping
    const euServicesVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);
    if (!euServicesVisible) {
      await page.getByText("LEO").click();
    }
    await expect(page.getByText(/space-based services/i)).toBeVisible();

    // Q8: Yes EU services
    await page.getByText("Yes, EU market activity").click();

    // Results should show Light Regime
    await verifyResultsDashboard(page);
    await expect(page.getByText(/Light/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 3: Third Country Operator
// ---------------------------------------------------------------------------

test.describe("Journey: Third Country Operator", () => {
  test("should complete assessment for third-country operator with EU services", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);
    await completeSpacecraftPreScreening(page);

    // Q4: Third country with EU services
    await page.getByText("Outside EU, serving EU market").click();

    // Should continue the assessment flow (third country with EU services is in scope)
    // Check that either we got the entity size question or TCO-specific results
    const hasSizeQuestion = await page
      .getByText(/best describes/i)
      .isVisible()
      .catch(() => false);

    if (hasSizeQuestion) {
      // Continue with the rest of the flow
      await page.getByText("Large Enterprise").click();
      await page.getByText("No, single satellite").click();

      // Handle orbit question
      await page.getByText("GEO").click();
      const euSvcVisible = await page
        .getByText(/space-based services/i)
        .isVisible()
        .catch(() => false);
      if (!euSvcVisible) {
        await page.getByText("GEO").click();
      }
      await expect(page.getByText(/space-based services/i)).toBeVisible();

      await page.getByText("Yes, EU market activity").click();
    }

    // Should show results with Third Country indications
    await expect(page.getByText(/Compliance Profile/i)).toBeVisible();
    await expect(
      page
        .getByText(/Third Country/i)
        .or(page.getByText(/legal representative/i)),
    ).toBeVisible();
  });

  test("should show out of scope for third-country without EU services", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);
    await completeSpacecraftPreScreening(page);

    // Q4: Third country without EU services → out of scope
    await page.getByText("Outside EU, no EU activity").click();

    // Should show out of scope
    await expect(
      page
        .getByText(/Outside Regulation Scope/i)
        .or(page.getByText(/Out of scope/i)),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 4: Launch Operator
// ---------------------------------------------------------------------------

test.describe("Journey: Launch Operator", () => {
  test("should complete assessment for launch vehicle operator", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);

    // Q1: Launch Vehicle
    await page.getByText("Launch Vehicle Services").click();
    await expect(page.getByText(/defense/i)).toBeVisible();

    // Q2: Not defense
    await page.getByText("No, not exclusively defense").click();
    await expect(page.getByText(/launched after/i)).toBeVisible();

    // Q3: Post-2030
    await page.getByText("Yes, launching after 2030").click();
    await expect(page.getByText(/organization established/i)).toBeVisible();

    // Q4: EU
    await page.getByText("EU Member State").click();
    await expect(page.getByText(/best describes/i)).toBeVisible();

    // Q5: Large
    await page.getByText("Large Enterprise").click();
    await expect(page.getByText(/constellation/i)).toBeVisible();

    // Q6: No constellation
    await page.getByText("No, single satellite").click();
    await expect(page.getByText(/orbit/i)).toBeVisible();

    // Q7: LEO
    await page.getByText("LEO").click();
    const euSvcVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);
    if (!euSvcVisible) {
      await page.getByText("LEO").click();
    }
    await expect(page.getByText(/space-based services/i)).toBeVisible();

    // Q8: Yes EU services
    await page.getByText("Yes, EU market activity").click();

    // Should show results for launch operator
    await verifyResultsDashboard(page);
    await expect(page.getByText(/Launch/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 5: Mega Constellation
// ---------------------------------------------------------------------------

test.describe("Journey: Mega Constellation", () => {
  test("should handle mega constellation flow with additional questions", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);
    await completeSpacecraftPreScreening(page);

    // Q4: EU
    await page.getByText("EU Member State").click();
    await expect(page.getByText(/best describes/i)).toBeVisible();

    // Q5: Large
    await page.getByText("Large Enterprise").click();
    await expect(page.getByText(/constellation/i)).toBeVisible();

    // Q6: Yes constellation
    await page.getByText("Yes, constellation").click();
    await expect(page.getByText(/how many satellites/i)).toBeVisible();

    // Q6b: Mega constellation (1000+)
    await page.getByText("1,000+ satellites").click();
    await expect(page.getByText(/orbit/i)).toBeVisible();

    // Q7: LEO
    await page.getByText("LEO").click();

    // Handle potential step behavior
    const euSvcVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);
    if (!euSvcVisible) {
      // May need to click LEO again
      const orbitStillVisible = await page
        .getByText(/orbit/i)
        .isVisible()
        .catch(() => false);
      if (orbitStillVisible) {
        await page.getByText("LEO").click();
      }
    }
    await expect(page.getByText(/space-based services/i)).toBeVisible();

    // Q8: Yes
    await page.getByText("Yes, EU market activity").click();

    // Should show results
    await verifyResultsDashboard(page);
  });
});

// ---------------------------------------------------------------------------
// Journey 6: Out-of-Scope Scenarios
// ---------------------------------------------------------------------------

test.describe("Journey: Out-of-Scope Paths", () => {
  test("defense-only exclusion with restart", async ({ page }) => {
    await navigateFromLandingToAssessment(page);

    // Q1: Spacecraft
    await page.getByText("Spacecraft Operation").click();

    // Q2: Yes, defense only
    await page.getByText("Yes, exclusively defense").click();

    // Should show out of scope
    await expect(page.getByText(/Outside Regulation Scope/i)).toBeVisible();
    await expect(page.getByText(/Art\. 2/i)).toBeVisible();

    // Restart and verify we're back at the beginning
    await page.getByText("Start over").click();
    await expect(page.getByText(/space activity/i)).toBeVisible();
  });

  test("pre-2030 assets exclusion", async ({ page }) => {
    await navigateFromLandingToAssessment(page);

    // Q1: Spacecraft
    await page.getByText("Spacecraft Operation").click();

    // Q2: No defense
    await page.getByText("No, not exclusively defense").click();

    // Q3: All pre-2030
    await page.getByText("No, all launched before 2030").click();

    // Should show out of scope
    await expect(page.getByText(/Outside Regulation Scope/i)).toBeVisible();
    await expect(
      page.getByText(/grandfathered/i).or(page.getByText(/Art\. 2/i)),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 7: Back Navigation Through Entire Flow
// ---------------------------------------------------------------------------

test.describe("Journey: Navigation & State Preservation", () => {
  test("should preserve answers when navigating back and forth", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);

    // Q1: Spacecraft
    await page.getByText("Spacecraft Operation").click();
    await expect(page.getByText(/defense/i)).toBeVisible();

    // Q2: No defense
    await page.getByText("No, not exclusively defense").click();
    await expect(page.getByText(/launched after/i)).toBeVisible();

    // Go back to Q2
    await page.getByText("Back").click();
    await expect(page.getByText(/defense/i)).toBeVisible();

    // Go back to Q1
    await page.getByText("Back").click();
    await expect(page.getByText(/space activity/i)).toBeVisible();

    // Go forward again — original answers should still work
    await page.getByText("Spacecraft Operation").click();
    await expect(page.getByText(/defense/i)).toBeVisible();
  });

  test("should show Home link on first step and Back on subsequent steps", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);

    // First step should show Home
    await expect(page.getByText("Home")).toBeVisible();

    // Advance to next step
    await page.getByText("Spacecraft Operation").click();

    // Should now show Back instead of Home
    await expect(page.getByText("Back")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 8: Keyboard-Only Navigation
// ---------------------------------------------------------------------------

test.describe("Journey: Keyboard-Only Navigation", () => {
  test("should navigate entire assessment using only keyboard", async ({
    page,
  }) => {
    await page.goto("/assessment");
    await page.waitForLoadState("networkidle");

    // Wait for first question to load
    await expect(page.getByText(/space activity/i)).toBeVisible();

    // Tab to first option and press Enter
    await page.keyboard.press("Tab");
    // Tab past header elements (Home link, EU Space Act label) to reach options
    // Keep tabbing until we reach the first option button
    let attempts = 0;
    while (attempts < 10) {
      const focusedRole = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute("role") || el?.tagName?.toLowerCase();
      });
      if (focusedRole === "button") {
        const focusedText = await page.evaluate(
          () => document.activeElement?.textContent || "",
        );
        if (focusedText.includes("Spacecraft Operation")) {
          break;
        }
      }
      await page.keyboard.press("Tab");
      attempts++;
    }

    // Select Spacecraft Operation with Enter
    await page.keyboard.press("Enter");

    // Should advance to defense question
    await expect(page.getByText(/defense/i)).toBeVisible();

    // Tab to "No" option and press Enter
    attempts = 0;
    while (attempts < 10) {
      const focusedText = await page.evaluate(
        () => document.activeElement?.textContent || "",
      );
      if (focusedText.includes("No, not exclusively defense")) {
        break;
      }
      await page.keyboard.press("Tab");
      attempts++;
    }

    await page.keyboard.press("Enter");

    // Should advance to post-2030 question
    await expect(page.getByText(/launched after/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 9: Landing Page Completeness
// ---------------------------------------------------------------------------

test.describe("Journey: Landing Page", () => {
  test("should render all landing page sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Hero section
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Start your assessment/i)).toBeVisible();

    // Navigation
    const nav = page.locator("nav").or(page.locator("header"));
    await expect(nav.first()).toBeVisible();

    // Footer
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("should navigate from landing CTA to assessment page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click the main CTA
    await page.getByRole("link", { name: /start your assessment/i }).click();

    // Should be on assessment page
    await page.waitForURL(/\/assessment/);
    await expect(page.getByText(/space activity/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 10: Results Dashboard Interactions
// ---------------------------------------------------------------------------

test.describe("Journey: Results Dashboard Interactions", () => {
  test.beforeEach(async ({ page }) => {
    // Complete a full assessment to reach results
    await page.goto("/assessment");
    await page.getByText("Spacecraft Operation").click();
    await page.getByText("No, not exclusively defense").click();
    await page.getByText("Yes, launching after 2030").click();
    await page.getByText("EU Member State").click();
    await page.getByText("Medium Enterprise").click();
    await page.getByText("No, single satellite").click();
    await page.getByText("LEO").click();
    // Handle potential step skipping
    const euSvcVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);
    if (!euSvcVisible) {
      await page.getByText("LEO").click();
    }
    await expect(page.getByText(/space-based services/i)).toBeVisible();
    await page.getByText("Yes, EU market activity").click();
    await expect(page.getByText(/Compliance Profile/i)).toBeVisible();
  });

  test("should display all results sections", async ({ page }) => {
    // Compliance Profile
    await expect(page.getByText(/Operator Type/i)).toBeVisible();
    await expect(page.getByText(/Regime/i)).toBeVisible();

    // Module cards
    await expect(page.getByText(/Authorization/i)).toBeVisible();

    // Checklist
    await expect(
      page.getByText(/Next Steps/i).or(page.getByText(/Checklist/i)),
    ).toBeVisible();
  });

  test("should open email gate when clicking download", async ({ page }) => {
    // Find and click download button
    const downloadBtn = page
      .getByRole("button", { name: /download/i })
      .or(page.getByText(/Download.*PDF/i).first());
    await downloadBtn.click();

    // Email gate should open
    await expect(
      page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i)),
    ).toBeVisible();
  });

  test("should restart assessment from results", async ({ page }) => {
    // Find and click start over
    const restartBtn = page
      .getByRole("button", { name: /start over/i })
      .or(page.getByText(/Start Over/i).first());
    await restartBtn.click();

    // Should be back at first question
    await expect(page.getByText(/space activity/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Journey 11: In-Space Services Operator
// ---------------------------------------------------------------------------

test.describe("Journey: In-Space Services Operator", () => {
  test("should complete assessment for ISOS operator", async ({ page }) => {
    await navigateFromLandingToAssessment(page);

    // Q1: In-Space Services
    await page.getByText("In-Space Services").click();
    await expect(page.getByText(/defense/i)).toBeVisible();

    // Q2: Not defense
    await page.getByText("No, not exclusively defense").click();
    await expect(page.getByText(/launched after/i)).toBeVisible();

    // Q3: Post-2030
    await page.getByText("Yes, launching after 2030").click();
    await expect(page.getByText(/organization established/i)).toBeVisible();

    // Q4: EU
    await page.getByText("EU Member State").click();
    await expect(page.getByText(/best describes/i)).toBeVisible();

    // Q5: Medium
    await page.getByText("Medium Enterprise").click();
    await expect(page.getByText(/constellation/i)).toBeVisible();

    // Q6: No constellation
    await page.getByText("No, single satellite").click();
    await expect(page.getByText(/orbit/i)).toBeVisible();

    // Q7: LEO
    await page.getByText("LEO").click();
    const euSvcVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);
    if (!euSvcVisible) {
      await page.getByText("LEO").click();
    }
    await expect(page.getByText(/space-based services/i)).toBeVisible();

    // Q8: Yes
    await page.getByText("Yes, EU market activity").click();

    // Should show results
    await verifyResultsDashboard(page);
  });
});

// ---------------------------------------------------------------------------
// Journey 12: Research Institution — Light Regime
// ---------------------------------------------------------------------------

test.describe("Journey: Research Institution", () => {
  test("should qualify for light regime as research institution", async ({
    page,
  }) => {
    await navigateFromLandingToAssessment(page);
    await completeSpacecraftPreScreening(page);

    // Q4: EU
    await page.getByText("EU Member State").click();
    await expect(page.getByText(/best describes/i)).toBeVisible();

    // Q5: Research institution
    await page.getByText("Research/Educational Institution").click();
    await expect(page.getByText(/constellation/i)).toBeVisible();

    // Should show light regime indicator
    await expect(page.getByText(/Light Regime/i)).toBeVisible();

    // Complete remaining questions
    await page.getByText("No, single satellite").click();
    await expect(page.getByText(/orbit/i)).toBeVisible();

    await page.getByText("MEO").click();
    const euSvcVisible = await page
      .getByText(/space-based services/i)
      .isVisible()
      .catch(() => false);
    if (!euSvcVisible) {
      await page.getByText("MEO").click();
    }
    await expect(page.getByText(/space-based services/i)).toBeVisible();

    await page.getByText("Yes, EU market activity").click();

    // Results should show light regime
    await verifyResultsDashboard(page);
    await expect(page.getByText(/Light/i)).toBeVisible();
  });
});
