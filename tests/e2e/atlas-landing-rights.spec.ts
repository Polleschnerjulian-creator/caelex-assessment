import { test, expect } from "@playwright/test";

test.describe("Atlas Landing Rights", () => {
  test("list page renders with seeded jurisdictions", async ({ page }) => {
    await page.goto("/atlas/landing-rights");
    await expect(
      page.getByRole("heading", { name: "Landing Rights" }),
    ).toBeVisible();
    await expect(page.getByText("DE")).toBeVisible();
    await expect(page.getByText("US")).toBeVisible();
    await expect(page.getByText("IN")).toBeVisible();
  });

  test("country detail renders regulators and categories", async ({ page }) => {
    await page.goto("/atlas/landing-rights/in");
    await expect(page.getByText("DoT")).toBeVisible();
    await expect(page.getByText("Market Access")).toBeVisible();
    await expect(page.getByText("ITU Coordination")).toBeVisible();
  });

  test("deep-dive link for IN market-access works", async ({ page }) => {
    await page.goto("/atlas/landing-rights/in/market-access");
    await expect(
      page.getByRole("heading", {
        name: /GMPCS \+ IN-SPACe \+ TRAI/i,
      }),
    ).toBeVisible();
  });

  test("case studies list shows Starlink India", async ({ page }) => {
    await page.goto("/atlas/landing-rights/case-studies");
    await expect(page.getByText(/Starlink India/)).toBeVisible();
  });

  test("operators page renders matrix", async ({ page }) => {
    await page.goto("/atlas/landing-rights/operators");
    await expect(page.getByText("Starlink")).toBeVisible();
  });

  test("conduct page lists conditions", async ({ page }) => {
    await page.goto("/atlas/landing-rights/conduct");
    await expect(page.getByText(/Lawful interception gateway/)).toBeVisible();
  });

  test("disclaimer is visible on LR pages", async ({ page }) => {
    await page.goto("/atlas/landing-rights");
    await expect(page.getByText(/change frequently/i)).toBeVisible();
  });
});
