import { test, expect } from "@playwright/test";

test.describe("Dashboard Navigation — Unauthenticated Access", () => {
  test("should redirect /dashboard to login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/modules/authorization to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/modules/authorization");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/modules/cybersecurity to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/modules/cybersecurity");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/documents to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/documents");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/settings to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/timeline to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/timeline");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/tracker to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/tracker");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });

  test("should redirect /dashboard/admin to login without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
  });
});
