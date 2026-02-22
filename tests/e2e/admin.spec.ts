import { test, expect } from "@playwright/test";

test.describe("Admin Panel Access Control", () => {
  test("should redirect /dashboard/admin to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should not return a 404 for /dashboard/admin", async ({ page }) => {
    const response = await page.goto("/dashboard/admin");

    if (response) {
      // The route should exist — expect redirect or success, not 404
      expect(response.status()).not.toBe(404);
    }

    // Should not show a Not Found page
    await expect(page.getByText(/404/i)).not.toBeVisible();
    await expect(page.getByText(/not found/i)).not.toBeVisible();
  });

  test("should redirect /dashboard/admin/users to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/users");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/admin/organizations to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/organizations");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/admin/analytics to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/analytics");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/admin/audit to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/audit");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should land on login page after admin redirect", async ({ page }) => {
    await page.goto("/dashboard/admin");

    // Wait for redirect
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });

    // Login form should be visible
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
