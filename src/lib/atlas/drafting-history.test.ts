/**
 * Tests for drafting-history localStorage helpers.
 *
 * Runs in jsdom via Vitest — localStorage is available via the
 * browser-like environment Vitest sets up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getDraftLibrary,
  pushDraftLibrary,
  deleteDraftLibraryEntry,
  clearDraftLibrary,
  addPromptVersion,
  type DraftLibraryEntry,
} from "./drafting-history";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function baseEntry(): Omit<DraftLibraryEntry, "id" | "ts" | "versions"> {
  return {
    kind: "auth",
    title: "Test Auth Draft",
    prompt: "Draft an authorization for Sky-Sat under German law.",
    outputLocale: "de",
    privileged: false,
  };
}

beforeEach(() => {
  localStorage.clear();
});

/* ── A-H10: body persistence ─────────────────────────────────────────── */

describe("pushDraftLibrary — body persistence (A-H10)", () => {
  it("persists body when provided", () => {
    pushDraftLibrary({ ...baseEntry(), body: "GENERATED TEXT" });
    const lib = getDraftLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].body).toBe("GENERATED TEXT");
  });

  it("body is undefined when not provided (backward compat)", () => {
    pushDraftLibrary(baseEntry());
    const lib = getDraftLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].body).toBeUndefined();
  });

  it("persists multi-paragraph body correctly", () => {
    const body = "# Authorization\n\nParagraph one.\n\nParagraph two.";
    pushDraftLibrary({ ...baseEntry(), body });
    const lib = getDraftLibrary();
    expect(lib[0].body).toBe(body);
  });

  it("body survives a round-trip through getDraftLibrary", () => {
    const body = "Langer generierter Text mit Sonderzeichen: ä ö ü «»";
    pushDraftLibrary({ ...baseEntry(), body });
    // Simulate a fresh read (as if after navigation/refresh):
    const lib = getDraftLibrary();
    expect(lib[0].body).toBe(body);
  });

  it("legacy entries without body still load correctly", () => {
    // Manually write a legacy entry (no body field) to localStorage
    const legacy = {
      id: "drft-legacy-abc",
      kind: "auth",
      title: "Legacy Draft",
      prompt: "Old prompt",
      outputLocale: "en",
      privileged: false,
      ts: Date.now() - 100_000,
      versions: [
        { prompt: "Old prompt", ts: Date.now() - 100_000, source: "initial" },
      ],
      // Note: no `body` field
    };
    localStorage.setItem("atlas-drafting-library", JSON.stringify([legacy]));

    const lib = getDraftLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].id).toBe("drft-legacy-abc");
    expect(lib[0].body).toBeUndefined();
    expect(lib[0].prompt).toBe("Old prompt");
  });
});

/* ── Existing behaviours (regression guard) ────────────────────────────── */

describe("pushDraftLibrary — basic operations", () => {
  it("assigns an id and ts", () => {
    const entry = pushDraftLibrary(baseEntry());
    expect(entry.id).toMatch(/^drft-/);
    expect(entry.ts).toBeGreaterThan(0);
  });

  it("seeds initial version", () => {
    const entry = pushDraftLibrary(baseEntry());
    expect(entry.versions).toHaveLength(1);
    expect(entry.versions![0].source).toBe("initial");
  });

  it("newest entry is first", () => {
    pushDraftLibrary({ ...baseEntry(), title: "First" });
    pushDraftLibrary({ ...baseEntry(), title: "Second" });
    const lib = getDraftLibrary();
    expect(lib[0].title).toBe("Second");
    expect(lib[1].title).toBe("First");
  });
});

describe("deleteDraftLibraryEntry", () => {
  it("removes the entry with matching id", () => {
    const e = pushDraftLibrary(baseEntry());
    deleteDraftLibraryEntry(e.id);
    expect(getDraftLibrary()).toHaveLength(0);
  });
});

describe("clearDraftLibrary", () => {
  it("empties the library", () => {
    pushDraftLibrary(baseEntry());
    pushDraftLibrary(baseEntry());
    clearDraftLibrary();
    expect(getDraftLibrary()).toHaveLength(0);
  });
});

describe("addPromptVersion", () => {
  it("appends a new version and updates prompt", () => {
    const e = pushDraftLibrary(baseEntry());
    addPromptVersion(e.id, "Updated prompt");
    const lib = getDraftLibrary();
    expect(lib[0].prompt).toBe("Updated prompt");
    expect(lib[0].versions).toHaveLength(2);
    expect(lib[0].versions![1].source).toBe("edit-regenerate");
  });
});
