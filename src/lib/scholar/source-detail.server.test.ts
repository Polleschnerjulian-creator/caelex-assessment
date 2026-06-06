import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/data/legal-sources", () => ({ getLegalSourceById: vi.fn() }));

import { getLegalSourceById } from "@/data/legal-sources";
import { getScholarSourceDetail } from "./source-detail.server";

beforeEach(() => vi.clearAllMocks());

describe("getScholarSourceDetail", () => {
  it("returns null for an unknown id", () => {
    vi.mocked(getLegalSourceById).mockReturnValue(undefined as never);
    expect(getScholarSourceDetail("NOPE")).toBeNull();
  });

  it("caps paragraph_text at 600 chars and flags truncation", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "X",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "T",
      key_provisions: [
        {
          section: "§1",
          title: "P",
          summary: "s",
          paragraph_text: "a".repeat(900),
        },
      ],
    } as never);
    const prov = getScholarSourceDetail("X")!.keyProvisions[0];
    expect(prov.paragraphTextTruncated).toBe(true);
    expect(prov.paragraphText!.startsWith("a".repeat(600))).toBe(true);
    expect(prov.paragraphText!).not.toContain("a".repeat(601)); // capped, not the full 900
  });

  it("leaves short paragraph_text intact", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "Y",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "T",
      key_provisions: [
        { section: "§1", title: "P", summary: "s", paragraph_text: "short" },
      ],
    } as never);
    const prov = getScholarSourceDetail("Y")!.keyProvisions[0];
    expect(prov.paragraphText).toBe("short");
    expect(prov.paragraphTextTruncated).toBe(false);
  });
});
