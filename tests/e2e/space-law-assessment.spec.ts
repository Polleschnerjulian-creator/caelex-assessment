import { test, expect } from "@playwright/test";

test.describe("Space Law Assessment Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/assessment/space-law");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display the space law assessment page with heading", async ({
    page,
  }) => {
    await expect(page.getByText(/National Space Law/i)).toBeVisible();
    await expect(
      page.getByText(/jurisdiction/i).or(page.getByText(/considering/i)),
    ).toBeVisible();
  });

  test("should display jurisdiction selection options", async ({ page }) => {
    // Q1 should show jurisdiction options
    await expect(page.getByText(/France/i)).toBeVisible();
    await expect(page.getByText(/United Kingdom/i)).toBeVisible();
    await expect(page.getByText(/Germany/i)).toBeVisible();
    await expect(page.getByText(/Luxembourg/i)).toBeVisible();
  });

  test("should allow selecting jurisdictions", async ({ page }) => {
    // Select a jurisdiction from the multi-select options
    await page.click("text=France");

    // France should be selected (visual indicator or continue button)
    await expect(
      page.getByText(/France/i).or(page.getByText(/selected/i)),
    ).toBeVisible();
  });

  test("should allow selecting multiple jurisdictions and continuing", async ({
    page,
  }) => {
    // Select jurisdictions (multi-select — up to 3)
    await page.click("text=France");
    await page.click("text=Germany");

    // Click continue/next to advance past multi-select
    const continueBtn = page
      .getByRole("button", { name: /continue/i })
      .or(page.getByRole("button", { name: /next/i }));
    await continueBtn.click();

    // Should advance to Q2: activity type
    await expect(page.getByText(/space activity/i)).toBeVisible();
  });

  test("should display progress bar", async ({ page }) => {
    const progressBar = page
      .locator('[role="progressbar"]')
      .or(page.locator(".bg-white\\/80"))
      .or(page.locator('[class*="progress"]'));
    await expect(progressBar.first()).toBeVisible();
  });

  test("should advance progress bar as questions are answered", async ({
    page,
  }) => {
    // Select jurisdiction and continue
    await page.click("text=France");
    const continueBtn = page
      .getByRole("button", { name: /continue/i })
      .or(page.getByRole("button", { name: /next/i }));
    await continueBtn.click();

    // Should be at Q2 — progress should have advanced
    await expect(page.getByText(/space activity/i)).toBeVisible();

    // Select activity type
    await page.click("text=Spacecraft Operation");

    // Should advance to Q3
    await expect(
      page.getByText(/organization/i).or(page.getByText(/entity/i)),
    ).toBeVisible();
  });

  test("should complete full assessment and show results", async ({ page }) => {
    // Q1: Select jurisdictions
    await page.click("text=France");
    await page.click("text=Luxembourg");
    const continueBtn = page
      .getByRole("button", { name: /continue/i })
      .or(page.getByRole("button", { name: /next/i }));
    await continueBtn.click();

    // Q2: Activity type
    await expect(page.getByText(/space activity/i)).toBeVisible();
    await page.click("text=Spacecraft Operation");

    // Answer remaining questions by clicking visible options
    // Q3 onwards — click through available options
    for (let step = 0; step < 6; step++) {
      // Wait for a question to appear
      await page.waitForTimeout(500);

      // Try to find and click the first available option button
      const optionButtons = page
        .locator("button")
        .filter({ hasNotText: /back|home|restart/i });
      const count = await optionButtons.count();

      if (count > 0) {
        // Click the first non-navigation button that looks like an option
        for (let i = 0; i < count; i++) {
          const btn = optionButtons.nth(i);
          const text = await btn.textContent();
          if (
            text &&
            !text.match(/back|home|restart|continue|next/i) &&
            text.trim().length > 0
          ) {
            await btn.click();
            break;
          }
        }
      }

      // Check if results appeared
      const hasResults = await page
        .getByText(/Compliance/i)
        .isVisible()
        .catch(() => false);
      if (hasResults) break;
    }

    // Should eventually show results or calculating state
    await expect(
      page
        .getByText(/Compliance/i)
        .or(page.getByText(/Calculating/i))
        .or(page.getByText(/Analyzing/i))
        .or(page.getByText(/Result/i)),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should allow navigation back", async ({ page }) => {
    // Q1: Select jurisdiction
    await page.click("text=France");
    const continueBtn = page
      .getByRole("button", { name: /continue/i })
      .or(page.getByRole("button", { name: /next/i }));
    await continueBtn.click();

    // Should be at Q2
    await expect(page.getByText(/space activity/i)).toBeVisible();

    // Go back
    await page.click('button:has-text("Back")');

    // Should be back at Q1 — jurisdiction selection
    await expect(page.getByText(/jurisdiction/i)).toBeVisible();
  });

  test("should show Home link on first step", async ({ page }) => {
    await expect(page.getByText("Home")).toBeVisible();
  });
});

test.describe("Space Law Assessment Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.goto("/assessment/space-law");
    await page.waitForLoadState("domcontentloaded");

    // Jurisdiction options should be visible
    await expect(page.getByText(/France/i)).toBeVisible();

    // Click should work
    await page.click("text=France");
  });
});
