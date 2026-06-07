import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/data/legal-sources", () => ({
  getLegalSourceById: vi.fn(),
  // getTranslatedSource is now called by source-detail.server.ts; stub it to
  // return a passthrough so existing tests that only care about truncation still work.
  getTranslatedSource: vi.fn(
    (source: { title_en: string; scope_description?: string }) => ({
      title: source.title_en,
      scopeDescription: source.scope_description,
      getProvisionTranslation: () => null,
    }),
  ),
}));
// The cross-reference graph (concept §2d) does a reverse lookup over the case
// corpus. Mock it so the test stays a pure unit test (no real corpus load);
// default to "no citing cases" — exercised explicitly in its own test below.
vi.mock("@/data/legal-cases", () => ({
  getCasesApplyingSource: vi.fn(() => []),
}));

import { getLegalSourceById } from "@/data/legal-sources";
import { getCasesApplyingSource } from "@/data/legal-cases";
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

  // ─── Cross-reference graph (concept §2d) ──────────────────────────────

  it("resolves related_sources + legal-basis chain, de-duped + self-excluded", () => {
    const host = {
      id: "HOST",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "Host",
      key_provisions: [],
      related_sources: ["REL-1", "HOST", "REL-1"], // self + dupe to be filtered
      amends: "PARENT",
      implements: "EU-DIR",
      superseded_by: "MISSING", // unresolved → dropped
    };
    const others: Record<string, unknown> = {
      "REL-1": {
        id: "REL-1",
        type: "federal_regulation",
        title_en: "Related One",
      },
      PARENT: { id: "PARENT", type: "federal_law", title_en: "Parent Act" },
      "EU-DIR": {
        id: "EU-DIR",
        type: "eu_directive",
        title_en: "EU Directive",
      },
    };
    vi.mocked(getLegalSourceById).mockImplementation((id: string) =>
      id === "HOST" ? (host as never) : ((others[id] ?? undefined) as never),
    );

    const detail = getScholarSourceDetail("HOST")!;
    const related = detail.resolvedRelatedSources!;
    expect(related.map((r) => r.id)).toEqual(["REL-1", "PARENT", "EU-DIR"]); // HOST (self) + dupe + MISSING (unresolved) all excluded
    expect(related[0]).toEqual({
      id: "REL-1",
      title: "Related One",
      type: "federal_regulation",
    });
  });

  it("omits resolvedRelatedSources entirely when nothing resolves", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "LONE",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "Lone",
      key_provisions: [],
      // no related_sources / amends / implements / superseded_by
    } as never);
    expect(
      getScholarSourceDetail("LONE")!.resolvedRelatedSources,
    ).toBeUndefined();
  });

  it("reverse-looks-up citing cases via getCasesApplyingSource", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "SRC",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "Src",
      key_provisions: [],
    } as never);
    vi.mocked(getCasesApplyingSource).mockReturnValue([
      { id: "CASE-1", title: "Alpha v Beta" },
      { id: "CASE-1", title: "Alpha v Beta" }, // dupe id → collapsed
      { id: "CASE-2", title: "Gamma Order" },
    ] as never);

    const cases = getScholarSourceDetail("SRC")!.citingCases!;
    expect(getCasesApplyingSource).toHaveBeenCalledWith("SRC");
    expect(cases).toEqual([
      { id: "CASE-1", title: "Alpha v Beta" },
      { id: "CASE-2", title: "Gamma Order" },
    ]);
  });

  it("omits citingCases entirely when no case applies the source", () => {
    vi.mocked(getLegalSourceById).mockReturnValue({
      id: "SRC2",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "Src2",
      key_provisions: [],
    } as never);
    vi.mocked(getCasesApplyingSource).mockReturnValue([] as never);
    expect(getScholarSourceDetail("SRC2")!.citingCases).toBeUndefined();
  });
});
