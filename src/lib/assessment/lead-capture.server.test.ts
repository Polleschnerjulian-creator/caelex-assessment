/**
 * Lead-capture sanitizer pins (ILA attribution): junk never reaches the
 * AssessmentLead.source column.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  maskEmail: (e: string) => e,
}));
vi.mock("@/lib/email/templates/newsletter-confirmation", () => ({
  sendNewsletterConfirmation: vi.fn(),
}));

import { sanitizeLeadSource } from "./lead-capture.server";

describe("sanitizeLeadSource (campaign attribution)", () => {
  it("accepts clean slugs and lowercases them", () => {
    expect(sanitizeLeadSource("ila2026")).toBe("ila2026");
    expect(sanitizeLeadSource("ILA2026")).toBe("ila2026");
    expect(sanitizeLeadSource("  booth-qr_1 ")).toBe("booth-qr_1");
  });

  it("rejects junk, oversize, and missing values", () => {
    expect(sanitizeLeadSource("x")).toBeNull();
    expect(sanitizeLeadSource("<script>alert(1)</script>")).toBeNull();
    expect(sanitizeLeadSource("a".repeat(41))).toBeNull();
    expect(sanitizeLeadSource("white space")).toBeNull();
    expect(sanitizeLeadSource(null)).toBeNull();
    expect(sanitizeLeadSource(undefined)).toBeNull();
  });
});
