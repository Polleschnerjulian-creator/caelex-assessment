/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the shared filename-slug helper (Q11 — first audit test
 * for a new shared module). Pure function, no mocks.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { slugifyFilename } from "./filename-slug";

describe("slugifyFilename", () => {
  it("lowercases + kebab-cases", () => {
    expect(slugifyFilename("Hello World")).toBe("hello-world");
  });

  it("ASCII-folds German umlauts (ä→ae, ö→oe, ü→ue, ß→ss)", () => {
    expect(slugifyFilename("Müller Größe Übung Straße")).toBe(
      "mueller-groesse-uebung-strasse",
    );
  });

  it("strips leading and trailing dashes", () => {
    expect(slugifyFilename("!!!Hello!!!")).toBe("hello");
    expect(slugifyFilename("2026 Plan")).toBe("2026-plan");
  });

  it("collapses multiple non-alphanum runs", () => {
    expect(slugifyFilename("foo --- bar___baz")).toBe("foo-bar-baz");
  });

  it("caps at 60 chars", () => {
    const long = "a".repeat(200);
    expect(slugifyFilename(long)).toHaveLength(60);
  });

  it("uses fallback when the result is empty", () => {
    expect(slugifyFilename("!!!")).toBe("dokument");
    expect(slugifyFilename("")).toBe("dokument");
    expect(slugifyFilename("   ")).toBe("dokument");
  });

  it("respects a custom fallback", () => {
    expect(slugifyFilename("???", "chat")).toBe("chat");
    expect(slugifyFilename("???", "mandat")).toBe("mandat");
  });

  it("handles a real legal document title", () => {
    expect(
      slugifyFilename("BNetzA Genehmigungsverfahren OrbitCo GmbH – S-Band"),
    ).toBe("bnetza-genehmigungsverfahren-orbitco-gmbh-s-band");
  });
});
