import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("should redirect /dashboard/settings to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should not return a 404 for /dashboard/settings", async ({ page }) => {
    const response = await page.goto("/dashboard/settings");

    if (response) {
      // The route should exist — expect a redirect (3xx) or success (2xx), not 404
      expect(response.status()).not.toBe(404);
    }

    // After redirect, should be on the login page (not a Not Found page)
    await expect(page.getByText(/404/i)).not.toBeVisible();
    await expect(page.getByText(/not found/i)).not.toBeVisible();
  });

  test("should land on login page with functional form after redirect", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");

    // Wait for redirect
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });

    // Login form should be functional
    const emailInput = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible();

    const submitButton = page.getByRole("button", {
      name: /sign in/i,
    });
    await expect(submitButton).toBeVisible();
  });
});
