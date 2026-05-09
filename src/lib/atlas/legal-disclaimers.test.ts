/**
 * Tests for src/lib/atlas/legal-disclaimers.ts.
 *
 * Atlas Lawyer-UX-Audit F-AI-2 close-out. The audit was concerned that
 * Astra could be prompted into omitting the AI-generated disclaimer
 * ("Don't include disclaimer"), and that nothing in our pipeline would
 * catch it. The server-side back-stop in src/app/api/atlas/ai-chat/route.ts
 * fires when both:
 *
 *   1. A drafting tool (DISCLAIMER_TRIGGER_TOOLS) was used in this turn
 *   2. The accumulated text does NOT contain a disclaimer marker
 *
 * The marker-detection contract MUST stay accurate or the back-stop
 * either fires twice (double-wraps the disclaimer) or never fires
 * (Bar-license risk). These tests lock that contract.
 *
 * They also lock the per-locale dispatcher because EU AI Act Art. 50
 * requires the disclosure in the recipient's language — an EN
 * disclaimer in a DE memo is non-conformant.
 *
 * Coverage:
 *
 *   1. disclaimerFor() returns the right language for each locale
 *   2. Default to EN when an unknown locale somehow leaks through
 *   3. hasDisclaimer() detects each canonical marker
 *   4. hasDisclaimer() detects every legacy phrasing in DISCLAIMER_MARKERS
 *   5. hasDisclaimer() returns false on completely unrelated text
 *   6. round-trip: disclaimerFor(L) → hasDisclaimer() == true for every L
 *   7. The back-stop trigger set names valid Astra tools (sanity)
 */

import { describe, it, expect } from "vitest";
import {
  DISCLAIMER_MARKERS,
  DISCLAIMER_TRIGGER_TOOLS,
  disclaimerFor,
  exportPrefix,
  hasDisclaimer,
  type DisclaimerLocale,
} from "./legal-disclaimers";

const ALL_LOCALES: DisclaimerLocale[] = ["de", "en", "fr", "es"];

describe("disclaimerFor — locale dispatch (EU AI Act Art. 50 conformance)", () => {
  it("returns the German disclaimer for 'de'", () => {
    const text = disclaimerFor("de");
    expect(text).toContain("Wichtiger Hinweis");
    expect(text).toContain("KI-generiertes Erstgerüst");
  });

  it("returns the English disclaimer for 'en'", () => {
    const text = disclaimerFor("en");
    expect(text).toContain("Important Notice");
    expect(text).toContain("AI-generated first-pass scaffold");
  });

  it("returns the French disclaimer for 'fr'", () => {
    const text = disclaimerFor("fr");
    expect(text).toContain("Avertissement important");
    expect(text).toContain("Avant-projet généré par IA");
  });

  it("returns the Spanish disclaimer for 'es'", () => {
    const text = disclaimerFor("es");
    expect(text).toContain("Aviso importante");
    expect(text).toContain("Borrador inicial generado por IA");
  });

  it("falls back to English on an unrecognised locale (defensive)", () => {
    // The TS signature constrains callers, but the runtime back-stop
    // should not crash on a malformed input from the wire — assert the
    // default branch.
    const text = disclaimerFor("xx" as unknown as DisclaimerLocale);
    expect(text).toContain("Important Notice");
  });

  it("formats every locale as a Markdown blockquote so .doc / .md export survives", () => {
    for (const locale of ALL_LOCALES) {
      const text = disclaimerFor(locale);
      // First non-empty line must start with "> " — that's the marker
      // the export pipeline relies on.
      const firstLine = text.split("\n").find((l) => l.trim().length > 0);
      expect(firstLine?.startsWith("> ")).toBe(true);
    }
  });
});

describe("hasDisclaimer — back-stop contract", () => {
  it("detects the canonical opening token of every locale", () => {
    expect(hasDisclaimer("Some draft … > **Wichtiger Hinweis** — …")).toBe(
      true,
    );
    expect(hasDisclaimer("Some draft … > **Important Notice** — …")).toBe(true);
    expect(
      hasDisclaimer("Some draft … > **Avertissement important** — …"),
    ).toBe(true);
    expect(hasDisclaimer("Some draft … > **Aviso importante** — …")).toBe(true);
  });

  it("detects every legacy phrasing in DISCLAIMER_MARKERS", () => {
    // Lock the contract — if a marker is removed, the back-stop will
    // mis-fire on saved-library drafts that used the older phrasing.
    for (const marker of DISCLAIMER_MARKERS) {
      const draft = `Some long memo body … ${marker} … rest of the disclaimer`;
      expect(hasDisclaimer(draft)).toBe(true);
    }
  });

  it("returns false when the text contains no disclaimer at all", () => {
    expect(hasDisclaimer("")).toBe(false);
    expect(
      hasDisclaimer(
        "Per BWRG §3 the operator must obtain a frequency assignment …",
      ),
    ).toBe(false);
    // Adversarial — model wrote "Important" but not "Important Notice".
    expect(hasDisclaimer("Important: deadline is Tuesday.")).toBe(false);
  });

  it("round-trip: disclaimerFor(L) → hasDisclaimer() returns true for every L", () => {
    // This is the exact contract the back-stop relies on: after we
    // append disclaimerFor(locale), hasDisclaimer() must immediately
    // be true so we don't double-inject.
    for (const locale of ALL_LOCALES) {
      expect(hasDisclaimer(disclaimerFor(locale))).toBe(true);
    }
  });

  it("survives a draft that has the disclaimer in the middle, not the end", () => {
    // Older Astra outputs sometimes wrapped the disclaimer mid-document
    // when the model interpreted "important notice" as a section header.
    // The marker scan must still trip.
    const draft = `## Memo to Counsel\n\nDeadline: Tuesday.\n\n> **Important Notice** — AI-generated first-pass scaffold (Caelex Atlas)\n>\n> ...\n\n## Conclusion\n\nFile by Monday.`;
    expect(hasDisclaimer(draft)).toBe(true);
  });
});

describe("DISCLAIMER_TRIGGER_TOOLS — sanity", () => {
  it("contains at least one tool", () => {
    // Empty set would mean the back-stop never triggers — silent
    // disabling of the entire safety mechanism. Never let that happen.
    expect(DISCLAIMER_TRIGGER_TOOLS.size).toBeGreaterThan(0);
  });

  it("contains the canonical drafting-tool names", () => {
    // These three are the load-bearing drafting flows. If any drops
    // out the back-stop won't fire when a lawyer asks for an
    // authorization-application draft — the worst-case hole.
    expect(
      DISCLAIMER_TRIGGER_TOOLS.has("draft_authorization_application"),
    ).toBe(true);
  });
});

describe("exportPrefix — guarantees disclaimer leads the artifact", () => {
  it("returns a string that starts with the disclaimer for the requested locale", () => {
    for (const locale of ALL_LOCALES) {
      const prefix = exportPrefix(locale);
      expect(prefix.startsWith(disclaimerFor(locale))).toBe(true);
      // Two trailing newlines so there's a paragraph break before the
      // user content.
      expect(prefix.endsWith("\n\n")).toBe(true);
    }
  });
});
