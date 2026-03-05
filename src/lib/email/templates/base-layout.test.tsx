import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseLayout, styles } from "./base-layout";

describe("base-layout", () => {
  describe("BaseLayout component", () => {
    it("renders children content", () => {
      const { getByText } = render(
        <BaseLayout>
          <p>Test child content</p>
        </BaseLayout>,
      );
      expect(getByText("Test child content")).toBeDefined();
    });

    it("renders CAELEX logo text", () => {
      const { getByText } = render(
        <BaseLayout>
          <p>Content</p>
        </BaseLayout>,
      );
      expect(getByText("CAELEX")).toBeDefined();
    });

    it("renders tagline", () => {
      const { getByText } = render(
        <BaseLayout>
          <p>Content</p>
        </BaseLayout>,
      );
      expect(getByText("Space Compliance, Simplified")).toBeDefined();
    });

    it("renders footer links", () => {
      const { getByText } = render(
        <BaseLayout>
          <p>Content</p>
        </BaseLayout>,
      );
      expect(getByText("Dashboard")).toBeDefined();
      expect(getByText("Notification Settings")).toBeDefined();
      expect(getByText("Help")).toBeDefined();
    });

    it("renders copyright text with current year", () => {
      const { container } = render(
        <BaseLayout>
          <p>Content</p>
        </BaseLayout>,
      );
      const year = new Date().getFullYear().toString();
      expect(container.innerHTML).toContain(year);
    });

    it("renders preview text when previewText prop is provided", () => {
      const { container } = render(
        <BaseLayout previewText="This is a preview">
          <p>Content</p>
        </BaseLayout>,
      );
      expect(container.innerHTML).toContain("This is a preview");
    });

    it("does not render hidden preview text when previewText is not provided", () => {
      const { container } = render(
        <BaseLayout>
          <p>Content</p>
        </BaseLayout>,
      );
      // Without previewText, there should be no hidden preview Text element
      // The component conditionally renders: {previewText && <Text style={previewStyle}>{previewText}</Text>}
      // We look for the previewStyle which sets display:none, visibility:hidden
      const html = container.innerHTML;
      // The preview text should not be in the body with display:none
      expect(html).not.toContain("visibility: hidden");
    });

    it("renders apple meta tag when previewText is provided", () => {
      const { container } = render(
        <BaseLayout previewText="Preview here">
          <p>Content</p>
        </BaseLayout>,
      );
      expect(container.innerHTML).toContain(
        "x-apple-disable-message-reformatting",
      );
    });

    it("renders automated notification disclaimer in footer", () => {
      const { container } = render(
        <BaseLayout>
          <p>Content</p>
        </BaseLayout>,
      );
      expect(container.innerHTML).toContain(
        "automated notification from Caelex",
      );
    });
  });

  describe("styles export", () => {
    it("exports colors object", () => {
      expect(styles.colors).toBeDefined();
      expect(styles.colors.navy950).toBe("#0A0F1E");
      expect(styles.colors.red500).toBe("#EF4444");
      expect(styles.colors.green500).toBe("#22C55E");
      expect(styles.colors.blue500).toBe("#3B82F6");
    });

    it("exports heading style", () => {
      expect(styles.heading).toBeDefined();
      expect(styles.heading.fontSize).toBe("24px");
    });

    it("exports subheading style", () => {
      expect(styles.subheading).toBeDefined();
      expect(styles.subheading.fontSize).toBe("18px");
    });

    it("exports text style", () => {
      expect(styles.text).toBeDefined();
      expect(styles.text.fontSize).toBe("14px");
    });

    it("exports mutedText style", () => {
      expect(styles.mutedText).toBeDefined();
    });

    it("exports button style", () => {
      expect(styles.button).toBeDefined();
      expect(styles.button.backgroundColor).toBe(styles.colors.blue500);
    });

    it("exports card style", () => {
      expect(styles.card).toBeDefined();
      expect(styles.card.borderRadius).toBe("8px");
    });

    it("exports badge function that returns style for critical variant", () => {
      const badgeStyle = styles.badge("critical");
      expect(badgeStyle).toBeDefined();
      expect(badgeStyle.backgroundColor).toBe(styles.colors.red500);
      expect(badgeStyle.textTransform).toBe("uppercase");
    });

    it("exports badge function that returns style for high variant", () => {
      const badgeStyle = styles.badge("high");
      expect(badgeStyle.backgroundColor).toBe(styles.colors.amber500);
    });

    it("exports badge function that returns style for medium variant", () => {
      const badgeStyle = styles.badge("medium");
      expect(badgeStyle.backgroundColor).toBe(styles.colors.blue500);
    });

    it("exports badge function that returns style for low variant", () => {
      const badgeStyle = styles.badge("low");
      expect(badgeStyle.backgroundColor).toBe(styles.colors.slate400);
    });

    it("exports badge function that returns style for info variant", () => {
      const badgeStyle = styles.badge("info");
      expect(badgeStyle.backgroundColor).toBe(styles.colors.blue400);
    });

    it("exports badge function that returns style for success variant", () => {
      const badgeStyle = styles.badge("success");
      expect(badgeStyle.backgroundColor).toBe(styles.colors.green500);
    });

    it("exports listItem style", () => {
      expect(styles.listItem).toBeDefined();
    });

    it("exports link style", () => {
      expect(styles.link).toBeDefined();
    });

    it("exports hr style", () => {
      expect(styles.hr).toBeDefined();
    });

    it("exports stat, statValue, statLabel styles", () => {
      expect(styles.stat).toBeDefined();
      expect(styles.statValue).toBeDefined();
      expect(styles.statLabel).toBeDefined();
    });
  });
});
