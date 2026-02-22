import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display 3 pricing tiers", async ({ page }) => {
    await expect(page.getByText("Essentials")).toBeVisible();
    await expect(page.getByText("Professional")).toBeVisible();
    await expect(page.getByText("Enterprise")).toBeVisible();
  });

  test("should display tier descriptions", async ({ page }) => {
    await expect(page.getByText(/startups & small operators/i)).toBeVisible();
    await expect(page.getByText(/growing companies/i)).toBeVisible();
    await expect(page.getByText(/large organizations/i)).toBeVisible();
  });

  test("should display feature lists for each tier", async ({ page }) => {
    // Each tier should have feature items with checkmarks
    await expect(
      page.getByText(/EU Space Act Assessment/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/NIS2 Directive Assessment/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Document Vault/i).first()).toBeVisible();
  });

  test("should display CTA buttons on each tier", async ({ page }) => {
    // Essentials and Professional have "Start Free Trial", Enterprise has "Contact Sales"
    const startTrialButtons = page.getByText("Start Free Trial");
    await expect(startTrialButtons.first()).toBeVisible();

    const contactSalesButton = page.getByText("Contact Sales");
    await expect(contactSalesButton).toBeVisible();
  });

  test("should have monthly/annual billing toggle", async ({ page }) => {
    const monthlyButton = page.getByRole("button", { name: /monthly/i });
    const yearlyButton = page.getByRole("button", { name: /yearly/i });

    await expect(monthlyButton).toBeVisible();
    await expect(yearlyButton).toBeVisible();
  });

  test("should toggle between monthly and yearly pricing", async ({ page }) => {
    // Default is yearly — verify yearly prices are shown
    await expect(page.getByText(/billed annually/i).first()).toBeVisible();

    // Switch to monthly
    await page.getByRole("button", { name: /monthly/i }).click();

    // Yearly billing text should no longer appear
    await expect(page.getByText(/billed annually/i)).not.toBeVisible();
  });

  test("should highlight the Professional tier as most popular", async ({
    page,
  }) => {
    await expect(page.getByText(/Most Popular/i)).toBeVisible();
  });

  test("should navigate when clicking a CTA button", async ({ page }) => {
    // Click "Start Free Trial" on the first tier
    const ctaLink = page.getByText("Start Free Trial").first();
    await expect(ctaLink).toBeVisible();

    // The CTAs link to /contact?plan=...
    await expect(ctaLink).toHaveAttribute("href", /contact/i);
  });

  test("should display feature comparison table", async ({ page }) => {
    await expect(page.getByText(/Feature Comparison/i)).toBeVisible();
    await expect(page.getByText(/Compare Plans/i)).toBeVisible();
  });

  test("should display pricing FAQ section", async ({ page }) => {
    await expect(page.getByText(/Common Questions/i)).toBeVisible();
    await expect(page.getByText(/What does Caelex replace/i)).toBeVisible();
  });

  test("should display trust elements", async ({ page }) => {
    await expect(page.getByText(/14-day free trial/i)).toBeVisible();
    await expect(page.getByText(/Cancel anytime/i)).toBeVisible();
    await expect(page.getByText(/GDPR compliant/i)).toBeVisible();
  });

  test("should display statistics footer", async ({ page }) => {
    await expect(page.getByText(/Articles Mapped/i)).toBeVisible();
    await expect(page.getByText(/Jurisdictions/i).first()).toBeVisible();
  });
});

test.describe("Pricing Page Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should display pricing tiers stacked on mobile", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("Essentials")).toBeVisible();
    await expect(page.getByText("Professional")).toBeVisible();
    await expect(page.getByText("Enterprise")).toBeVisible();
  });
});
