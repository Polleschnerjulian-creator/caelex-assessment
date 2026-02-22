import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  { name: "Landing", url: "/" },
  { name: "Assessment Picker", url: "/assessment" },
  { name: "EU Space Act Assessment", url: "/assessment/eu-space-act" },
  { name: "Pricing", url: "/pricing" },
  { name: "FAQ", url: "/resources/faq" },
  { name: "Login", url: "/login" },
];

for (const { name, url } of pages) {
  test(`${name} (${url}) should have no critical a11y violations`, async ({
    page,
  }) => {
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    expect(critical).toEqual([]);
  });
}
