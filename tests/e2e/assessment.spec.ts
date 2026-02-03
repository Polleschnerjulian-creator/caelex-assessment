import { test, expect } from "@playwright/test";

test.describe("Assessment Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/assessment");
  });

  test("should display the assessment wizard", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/space activity/i)).toBeVisible();
  });

  test("should navigate through activity type question", async ({ page }) => {
    // Click on Spacecraft Operation option
    await page.click("text=Spacecraft Operation");

    // Should advance to next question
    await expect(page.getByText(/defense/i)).toBeVisible();
  });

  test("should show out of scope for defense-only activities", async ({
    page,
  }) => {
    // Select spacecraft operation
    await page.click("text=Spacecraft Operation");

    // Select defense only
    await page.click("text=Yes");

    // Should show out of scope message
    await expect(page.getByText(/out of scope/i)).toBeVisible();
    await expect(page.getByText(/excluded under Art. 2/i)).toBeVisible();
  });

  test("should show out of scope for pre-2030 assets", async ({ page }) => {
    // Select spacecraft operation
    await page.click("text=Spacecraft Operation");

    // Not defense only
    await page.click("text=No");

    // All assets before 2030
    await page.click("text=No");

    // Should show out of scope message
    await expect(page.getByText(/grandfathered/i)).toBeVisible();
  });

  test("should complete full assessment for EU spacecraft operator", async ({
    page,
  }) => {
    // Q1: Activity type
    await page.click("text=Spacecraft Operation");

    // Q2: Defense - No
    await page.click("text=No");

    // Q3: Pre-2030 - Yes (assets after 2030)
    await page.click("text=Yes");

    // Q4: EU Establishment
    await page.click("text=EU Member State");

    // Q5: Entity Size
    await page.click("text=Medium enterprise");

    // Q6: Constellation - No
    await page.click("text=No");

    // Q7: Orbit
    await page.click("text=LEO");

    // Q8: EU Services
    await page.click("text=Yes");

    // Should show results
    await expect(page.getByText(/Compliance Profile/i)).toBeVisible();
    await expect(page.getByText(/Spacecraft Operator/i)).toBeVisible();
    await expect(page.getByText(/Standard/i)).toBeVisible();
  });

  test("should show light regime for small enterprise", async ({ page }) => {
    // Q1: Activity type
    await page.click("text=Spacecraft Operation");

    // Q2: Defense - No
    await page.click("text=No");

    // Q3: Pre-2030 - Yes
    await page.click("text=Yes");

    // Q4: EU Establishment
    await page.click("text=EU Member State");

    // Q5: Entity Size - Small
    await page.click("text=Small enterprise");

    // Q6: Constellation - No
    await page.click("text=No");

    // Q7: Orbit
    await page.click("text=LEO");

    // Q8: EU Services
    await page.click("text=Yes");

    // Should show light regime
    await expect(page.getByText(/Light Regime/i)).toBeVisible();
  });

  test("should handle third country operator", async ({ page }) => {
    // Q1: Activity type
    await page.click("text=Spacecraft Operation");

    // Q2: Defense - No
    await page.click("text=No");

    // Q3: Pre-2030 - Yes
    await page.click("text=Yes");

    // Q4: Third country with EU services
    await page.click("text=Outside the EU");

    // Should show third country message
    await expect(page.getByText(/Third Country/i)).toBeVisible();
  });

  test("should allow navigation back", async ({ page }) => {
    // Q1: Activity type
    await page.click("text=Spacecraft Operation");

    // Q2: Defense - No
    await page.click("text=No");

    // Go back
    await page.click('button:has-text("Back")');

    // Should be back at defense question
    await expect(page.getByText(/defense/i)).toBeVisible();
  });

  test("should show constellation size question when applicable", async ({
    page,
  }) => {
    // Q1: Activity type
    await page.click("text=Spacecraft Operation");

    // Q2: Defense - No
    await page.click("text=No");

    // Q3: Pre-2030 - Yes
    await page.click("text=Yes");

    // Q4: EU Establishment
    await page.click("text=EU Member State");

    // Q5: Entity Size
    await page.click("text=Large enterprise");

    // Q6: Constellation - Yes
    await page.click("text=Yes");

    // Should show constellation size options
    await expect(page.getByText(/how many satellites/i)).toBeVisible();
  });

  test("should display progress bar", async ({ page }) => {
    const progressBar = page
      .locator('[role="progressbar"]')
      .or(page.locator(".progress"));
    await expect(progressBar).toBeVisible();
  });

  test("should show restart option on out of scope", async ({ page }) => {
    // Get to out of scope
    await page.click("text=Spacecraft Operation");
    await page.click("text=Yes"); // Defense only

    // Should show restart button
    await expect(page.getByRole("button", { name: /restart/i })).toBeVisible();
  });

  test("should restart assessment when clicking restart", async ({ page }) => {
    // Get to out of scope
    await page.click("text=Spacecraft Operation");
    await page.click("text=Yes");

    // Click restart
    await page.click('button:has-text("Restart")');

    // Should be back at first question
    await expect(page.getByText(/space activity/i)).toBeVisible();
  });
});

test.describe("Assessment Results", () => {
  test.beforeEach(async ({ page }) => {
    // Complete a full assessment
    await page.goto("/assessment");
    await page.click("text=Spacecraft Operation");
    await page.click("text=No"); // Not defense
    await page.click("text=Yes"); // Post-2030
    await page.click("text=EU Member State");
    await page.click("text=Medium enterprise");
    await page.click("text=No"); // No constellation
    await page.click("text=LEO");
    await page.click("text=Yes"); // EU services
  });

  test("should display compliance profile card", async ({ page }) => {
    await expect(page.getByText(/Compliance Profile/i)).toBeVisible();
    await expect(page.getByText(/Operator Type/i)).toBeVisible();
    await expect(page.getByText(/Regime/i)).toBeVisible();
  });

  test("should display module status cards", async ({ page }) => {
    // Should show module cards
    await expect(page.getByText(/Authorization/i)).toBeVisible();
    await expect(page.getByText(/Cybersecurity/i)).toBeVisible();
    await expect(page.getByText(/Debris/i)).toBeVisible();
    await expect(page.getByText(/Environmental/i)).toBeVisible();
  });

  test("should display checklist preview", async ({ page }) => {
    await expect(
      page.getByText(/Next Steps/i).or(page.getByText(/Checklist/i)),
    ).toBeVisible();
  });

  test("should show applicable articles count", async ({ page }) => {
    // Should show article statistics
    await expect(page.getByText(/articles/i)).toBeVisible();
  });

  test("should show authorization path", async ({ page }) => {
    await expect(
      page.getByText(/National Authority/i).or(page.getByText(/NCA/i)),
    ).toBeVisible();
  });

  test("should show key dates", async ({ page }) => {
    await expect(page.getByText(/2030/i)).toBeVisible();
  });

  test("should have download report button", async ({ page }) => {
    await expect(
      page
        .getByRole("button", { name: /download/i })
        .or(page.getByText(/PDF/i)),
    ).toBeVisible();
  });

  test("should have start over option", async ({ page }) => {
    await expect(
      page
        .getByRole("button", { name: /start over/i })
        .or(page.getByText(/restart/i)),
    ).toBeVisible();
  });
});

test.describe("Assessment Accessibility", () => {
  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/assessment");

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/assessment");

    // Tab through options
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Press Enter to select
    await page.keyboard.press("Enter");

    // Should advance to next question
    await expect(page.getByText(/defense/i)).toBeVisible();
  });

  test("should have focus visible on interactive elements", async ({
    page,
  }) => {
    await page.goto("/assessment");

    // Tab to first option
    await page.keyboard.press("Tab");

    // Check focus is visible
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

test.describe("Assessment Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.goto("/assessment");

    // Options should be visible and clickable
    await expect(page.getByText(/Spacecraft Operation/i)).toBeVisible();

    // Click should work
    await page.click("text=Spacecraft Operation");
    await expect(page.getByText(/defense/i)).toBeVisible();
  });

  test("should show progress bar on mobile", async ({ page }) => {
    await page.goto("/assessment");

    const progressIndicator = page
      .locator('[role="progressbar"]')
      .or(page.locator(".progress"));
    await expect(progressIndicator).toBeVisible();
  });
});
