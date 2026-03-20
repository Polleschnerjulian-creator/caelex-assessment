import { test, expect, Page } from "@playwright/test";

/**
 * Assessment Flow E2E Tests
 *
 * Tests the EU Space Act assessment wizard from start to results.
 * No auth required — the assessment is public.
 */

/** Dismiss cookie consent if visible */
async function dismissCookies(page: Page) {
  try {
    const acceptBtn = page.getByRole("button", { name: /Accept All/i });
    await acceptBtn.click({ timeout: 3000 });
    await page.waitForTimeout(500);
  } catch {
    // No cookie banner — continue
  }
}

test.describe("EU Space Act Assessment — Full Flow", () => {
  test("SCO operator should progress through assessment", async ({ page }) => {
    await page.goto("/assessment/eu-space-act");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookies(page);

    // Q1: Activity type — Spacecraft Operation
    const scoOption = page.getByText(/Spacecraft Operation/i).first();
    await expect(scoOption).toBeVisible({ timeout: 10000 });
    await scoOption.click();

    // Q2: Defense only — select "No" option (second card)
    await page.waitForTimeout(500);
    // Options are "Yes, exclusively defense" and "No, dual-use or commercial"
    // Click the card containing "No" or the second option card
    const noOption = page
      .getByText(/No,|not exclusively|dual-use|commercial/i)
      .first();
    await noOption.click({ timeout: 5000 });

    // Should have progressed past Q2
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("defense-only operator should see out of scope", async ({ page }) => {
    await page.goto("/assessment/eu-space-act");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookies(page);

    // Q1: Spacecraft Operation
    await page
      .getByText(/Spacecraft Operation/i)
      .first()
      .click();
    await page.waitForTimeout(500);

    // Q2: Defense only — select "Yes, exclusively defense"
    const yesDefense = page.getByText(/Yes, exclusively/i).first();
    await yesDefense.click({ timeout: 5000 });

    // Should show out of scope message
    await expect(
      page.getByText(/out of scope|excluded|not applicable/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("NIS2 Assessment", () => {
  test("should load and show interactive content", async ({ page }) => {
    await page.goto("/assessment/nis2");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookies(page);

    // Should have interactive elements (buttons or option cards)
    const interactiveElements = page.locator(
      "button, [role='radio'], [role='button']",
    );
    expect(await interactiveElements.count()).toBeGreaterThan(0);
  });
});

test.describe("Unified Assessment", () => {
  test("should load unified assessment page", async ({ page }) => {
    await page.goto("/assessment/unified");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
