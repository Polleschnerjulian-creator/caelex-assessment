import { test, expect } from "@playwright/test";

test.describe("NIS2 Assessment - Regulation Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/assessment");
  });

  test("should display the regulation picker with both options", async ({
    page,
  }) => {
    // Should show both EU Space Act and NIS2 assessment options
    await expect(page.getByText(/EU Space Act/i)).toBeVisible();
    await expect(page.getByText(/NIS2 Directive/i)).toBeVisible();
  });

  test("should navigate to NIS2 assessment when clicking NIS2 card", async ({
    page,
  }) => {
    // Click on the NIS2 assessment option
    await page.click("text=NIS2 Directive");

    // Should navigate to NIS2 assessment page
    await page.waitForURL("**/assessment/nis2");

    // Should show the first NIS2 question — space sub-sector (no generic sector question)
    await expect(page.getByText(/primary space activity/i)).toBeVisible();
  });

  test("should still navigate to EU Space Act assessment", async ({ page }) => {
    await page.click("text=EU Space Act");

    // Should navigate to EU Space Act assessment
    await page.waitForURL("**/assessment/eu-space-act");
  });
});

test.describe("NIS2 Assessment Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/assessment/nis2");
  });

  test("should display space sub-sector options as the first question", async ({
    page,
  }) => {
    // Should show space sub-sector options directly (no generic sector picker)
    await expect(page.getByText(/primary space activity/i)).toBeVisible();
    await expect(page.getByText(/Ground Infrastructure/i)).toBeVisible();
    await expect(page.getByText(/Satellite Communications/i)).toBeVisible();
    await expect(page.getByText(/Spacecraft Manufacturing/i)).toBeVisible();
    await expect(page.getByText(/Launch Services/i)).toBeVisible();
    await expect(page.getByText(/Earth Observation/i)).toBeVisible();
  });

  test("should NOT show generic sector options", async ({ page }) => {
    // These should NOT appear — Caelex is space-only
    await expect(page.getByText(/Digital Infrastructure/i)).not.toBeVisible();
    await expect(page.getByText(/Transport/i)).not.toBeVisible();
    await expect(page.getByText(/Other Sector/i)).not.toBeVisible();
  });

  test("should show NIS2 Directive header", async ({ page }) => {
    await expect(page.getByText(/NIS2 Directive Assessment/i)).toBeVisible();
  });

  test("should navigate to EU establishment after selecting sub-sector", async ({
    page,
  }) => {
    await page.click("text=Ground Infrastructure");

    // Should go to EU establishment question (Q2)
    await expect(page.getByText(/established in the EU/i)).toBeVisible();
  });

  test("should show out of scope for non-EU entities", async ({ page }) => {
    // Q1: Sub-sector
    await page.click("text=Ground Infrastructure");

    // Q2: Not EU established
    await page.click("text=No, outside the EU");

    // Should show out of scope message
    await expect(
      page
        .getByText(/out of scope/i)
        .or(page.getByText(/primarily applies to EU/i)),
    ).toBeVisible();
  });

  test("should allow navigation back", async ({ page }) => {
    // Q1: Select sub-sector
    await page.click("text=Ground Infrastructure");

    // Should be at Q2
    await expect(page.getByText(/established in the EU/i)).toBeVisible();

    // Go back
    await page.click('button:has-text("Back")');

    // Should be back at Q1 — space sub-sector
    await expect(page.getByText(/primary space activity/i)).toBeVisible();
  });

  test("should display progress bar", async ({ page }) => {
    // Progress indicator should be visible
    const progress = page
      .locator('[role="progressbar"]')
      .or(page.locator(".bg-white\\/80")) // progress bar fill
      .or(page.locator('[class*="progress"]'));
    await expect(progress.first()).toBeVisible();
  });

  test("should show restart option on out of scope", async ({ page }) => {
    // Get to out of scope
    await page.click("text=Ground Infrastructure");
    await page.click("text=No, outside the EU");

    // Should show restart option
    await expect(
      page
        .getByRole("button", { name: /restart/i })
        .or(page.getByRole("link", { name: /restart/i }))
        .or(page.getByText(/start over/i)),
    ).toBeVisible();
  });
});

test.describe("NIS2 Assessment - Full Flow", () => {
  test("should complete full NIS2 assessment for medium space operator", async ({
    page,
  }) => {
    await page.goto("/assessment/nis2");

    // Q1: Sub-sector - Ground Infrastructure
    await page.click("text=Ground Infrastructure");

    // Q2: EU Established - Yes
    await page.click("text=Yes, EU-established");

    // Q3: Entity Size - Medium
    await page.click("text=Medium Enterprise");

    // Q4: Member states
    await page.click("text=1 member state");

    // Q5: Ground infra - Yes
    await page.click("text=Yes");

    // Q6: ISO 27001 - No
    await page.click("text=No certification");

    // Q7: Incident response - No
    await page.click("text=No formal capability");

    // Should show results/calculating
    await expect(
      page
        .getByText(/Compliance Profile/i)
        .or(page.getByText(/Calculating/i))
        .or(page.getByText(/classification/i)),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should complete assessment for large space entity (essential)", async ({
    page,
  }) => {
    await page.goto("/assessment/nis2");

    // Q1: Satellite Communications
    await page.click("text=Satellite Communications");

    // Q2: EU - Yes
    await page.click("text=Yes, EU-established");

    // Q3: Large
    await page.click("text=Large Enterprise");

    // Q4: Multiple member states
    await page.click("text=2-5 member states");

    // Q5: Ground infra - Yes
    await page.click("text=Yes");

    // Q6: ISO 27001 - Yes
    await page.click("text=Yes, ISO 27001 certified");

    // Q7: CSIRT - Yes
    await page.click("text=Yes, we have incident response");

    // Should show results
    await expect(
      page
        .getByText(/Compliance Profile/i)
        .or(page.getByText(/Calculating/i))
        .or(page.getByText(/Essential/i)),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("NIS2 Assessment Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.goto("/assessment/nis2");

    // Should show space sub-sector options directly
    await expect(page.getByText(/primary space activity/i)).toBeVisible();

    // Click should work
    await page.click("text=Ground Infrastructure");
    await expect(page.getByText(/established in the EU/i)).toBeVisible();
  });
});
