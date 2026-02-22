import { test, expect } from "@playwright/test";

const visualPages = [
  { name: "landing", url: "/" },
  { name: "assessment-picker", url: "/assessment" },
  { name: "pricing", url: "/pricing" },
  { name: "faq", url: "/resources/faq" },
  { name: "login", url: "/login" },
];

for (const { name, url } of visualPages) {
  test(`visual regression: ${name}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Wait for animations to settle
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });
}
