import { describe, it, expect, vi } from "vitest";
import { parseRRule } from "./rrule-processor.server";

// Mock server-only and prisma so the module can be imported in tests
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("parseRRule", () => {
  it("parses YEARLY rule", () => {
    const result = parseRRule(
      "FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=15",
      new Date("2026-02-01"),
    );
    expect(result).not.toBeNull();
    expect(result!.nextDate.getMonth()).toBe(0); // January
    expect(result!.nextDate.getDate()).toBe(15);
    expect(result!.nextDate.getFullYear()).toBe(2027);
    expect(result!.frequency).toBe("yearly");
  });

  it("parses QUARTERLY rule", () => {
    const result = parseRRule("FREQ=QUARTERLY", new Date("2026-02-15"));
    expect(result).not.toBeNull();
    expect(result!.nextDate.getMonth()).toBe(3); // April (next quarter)
    expect(result!.frequency).toBe("quarterly");
  });

  it("parses MONTHLY rule", () => {
    const result = parseRRule(
      "FREQ=MONTHLY;BYMONTHDAY=1",
      new Date("2026-04-02"),
    );
    expect(result).not.toBeNull();
    expect(result!.nextDate.getMonth()).toBe(4); // May
    expect(result!.nextDate.getDate()).toBe(1);
  });

  it("returns null for empty string", () => {
    expect(parseRRule("", new Date())).toBeNull();
  });

  it("returns null for unsupported frequency", () => {
    expect(parseRRule("FREQ=WEEKLY", new Date())).toBeNull();
  });

  it("parses YEARLY rule with BYMONTH=3 and BYMONTHDAY=31", () => {
    const result = parseRRule(
      "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=31",
      new Date("2026-01-01"),
    );
    expect(result).not.toBeNull();
    expect(result!.nextDate.getMonth()).toBe(2); // March
    expect(result!.nextDate.getDate()).toBe(31);
    expect(result!.nextDate.getFullYear()).toBe(2026);
    expect(result!.frequency).toBe("yearly");
  });

  it("parses YEARLY rule and advances to next year when date already passed", () => {
    const result = parseRRule(
      "FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=30",
      new Date("2026-07-01"),
    );
    expect(result).not.toBeNull();
    expect(result!.nextDate.getMonth()).toBe(5); // June
    expect(result!.nextDate.getDate()).toBe(30);
    expect(result!.nextDate.getFullYear()).toBe(2027);
  });

  it("parses MONTHLY rule and uses next month when day already passed", () => {
    const result = parseRRule(
      "FREQ=MONTHLY;BYMONTHDAY=1",
      new Date("2026-04-15"),
    );
    expect(result).not.toBeNull();
    expect(result!.nextDate.getMonth()).toBe(4); // May
    expect(result!.nextDate.getDate()).toBe(1);
  });

  it("parses QUARTERLY rule and wraps to next year when at Q4", () => {
    const result = parseRRule("FREQ=QUARTERLY", new Date("2026-10-15"));
    expect(result).not.toBeNull();
    // Q4 = months 9-11, next quarter starts at month 12 (Jan of next year)
    expect(result!.nextDate.getFullYear()).toBe(2027);
    expect(result!.nextDate.getMonth()).toBe(0); // January
  });
});
