import { describe, it, expect } from "vitest";
import { safeScholarUrl } from "./safe-redirect";

describe("safeScholarUrl", () => {
  it("accepts the scholar surface", () => {
    expect(safeScholarUrl("/scholar")).toBe("/scholar");
    expect(safeScholarUrl("/scholar/sources/DE-SATDSIG-2007")).toBe(
      "/scholar/sources/DE-SATDSIG-2007",
    );
    expect(safeScholarUrl("/scholar-login")).toBe("/scholar-login");
  });
  it("rejects other internal paths", () => {
    expect(safeScholarUrl("/dashboard")).toBe("/scholar");
    expect(safeScholarUrl("/atlas")).toBe("/scholar");
  });
  it("rejects open redirects", () => {
    expect(safeScholarUrl("//evil.com")).toBe("/scholar");
    expect(safeScholarUrl("https://evil.com")).toBe("/scholar");
    expect(safeScholarUrl("evil")).toBe("/scholar");
    expect(safeScholarUrl(null)).toBe("/scholar");
  });
});
