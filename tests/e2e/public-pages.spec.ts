import { test, expect } from "@playwright/test";

/**
 * Public Pages E2E Tests
 *
 * Tests all public-facing pages load correctly without auth.
 * These can run against production (caelex.eu).
 */

test.describe("Landing Page", () => {
  test("should load and display hero content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/Caelex/i);
  });

  test("should have working navigation", async ({ page }) => {
    await page.goto("/");
    // Navigation should be visible
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
  });

  test("should link to assessment", async ({ page }) => {
    await page.goto("/");
    const assessmentLink = page.getByRole("link", { name: /get started/i });
    await expect(assessmentLink).toBeVisible();
  });
});

test.describe("Assessment Module Picker", () => {
  test("should display all assessment modules", async ({ page }) => {
    await page.goto("/assessment");
    await page.waitForLoadState("domcontentloaded");

    // Should show EU Space Act assessment option
    await expect(page.getByText(/EU Space/i).first()).toBeVisible();
  });

  test("should navigate to EU Space Act assessment", async ({ page }) => {
    await page.goto("/assessment/eu-space-act");
    await page.waitForLoadState("domcontentloaded");

    // Should show first question
    await expect(page.getByText(/space activity/i).first()).toBeVisible();
  });

  test("should navigate to NIS2 assessment", async ({ page }) => {
    await page.goto("/assessment/nis2");
    await page.waitForLoadState("domcontentloaded");

    // NIS2 page should load
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Verity Public Pages", () => {
  test("should load Verity landing page", async ({ page }) => {
    await page.goto("/verity");
    await page.waitForLoadState("domcontentloaded");

    // Should show Verity content
    await expect(page.getByText(/compliance/i).first()).toBeVisible();
  });

  test("should load Verity verification page", async ({ page }) => {
    await page.goto("/verity/verify");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Legal Pages", () => {
  test("should load Impressum", async ({ page }) => {
    await page.goto("/legal/impressum");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load Privacy Policy", async ({ page }) => {
    await page.goto("/legal/privacy");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load Terms", async ({ page }) => {
    await page.goto("/legal/terms");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Resource Pages", () => {
  test("should load FAQ", async ({ page }) => {
    await page.goto("/resources/faq");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load Glossary", async ({ page }) => {
    await page.goto("/resources/glossary");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load Platform page", async ({ page }) => {
    await page.goto("/platform");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load Pricing page", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Login/Signup Pages", () => {
  test("should load login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    // Should show login form
    await expect(
      page.getByRole("button", { name: /sign in|log in/i }).first(),
    ).toBeVisible();
  });

  test("should load signup page", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
