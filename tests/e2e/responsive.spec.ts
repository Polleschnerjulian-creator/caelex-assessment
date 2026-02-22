import { test, expect } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const pages = ["/", "/assessment", "/pricing"];

for (const viewport of viewports) {
  for (const url of pages) {
    test(`${url} renders at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Verify no horizontal scrollbar (content fits viewport)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 5); // 5px tolerance

      // Verify main content is visible
      await expect(page.locator('main, [role="main"], body')).toBeVisible();
    });
  }
}
