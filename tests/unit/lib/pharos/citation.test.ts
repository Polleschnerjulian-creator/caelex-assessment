/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Citation Layer Tests — Pharos "Verifiable Refusal" Foundation
 *
 * These tests fix the security-critical contract:
 *   1. Tool envelopes that claim ok=true must carry citations OR be abstentions
 *   2. Final answers must reference citations or explicitly abstain
 *   3. Content hashes are stable across runs (canonical JSON)
 *   4. Citation builders produce schema-valid output
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

// Skip the server-only check so the citation module loads under vitest.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  ABSTENTION_MARKER,
  CitationSchema,
  ToolEnvelopeSchema,
  answerIsCitationCompliant,
  auditEntryCitation,
  citationContentHash,
  computationCitation,
  dataRowCitation,
} from "@/lib/pharos/citation";

describe("citationContentHash", () => {
  it("is stable for same input regardless of key order", () => {
    const a = { foo: 1, bar: 2, nested: { z: 9, a: 1 } };
    const b = { nested: { a: 1, z: 9 }, bar: 2, foo: 1 };
    expect(citationContentHash(a)).toBe(citationContentHash(b));
  });

  it("changes when any field changes", () => {
    const a = { foo: 1, bar: 2 };
    const b = { foo: 1, bar: 3 };
    expect(citationContentHash(a)).not.toBe(citationContentHash(b));
  });

  it("produces sha256:<32hex> format", () => {
    expect(citationContentHash({ x: 1 })).toMatch(/^sha256:[0-9a-f]{32}$/);
  });
});

describe("citation builders", () => {
  it("dataRowCitation produces a schema-valid Citation", () => {
    const c = dataRowCitation({
      table: "OversightRelationship",
      id: "abc123",
      span: "status",
      content: { id: "abc123", status: "ACTIVE" },
    });
    expect(c.id).toBe("DB:OversightRelationship:abc123");
    expect(c.kind).toBe("data-row");
    expect(() => CitationSchema.parse(c)).not.toThrow();
  });

  it("computationCitation embeds version into ID", () => {
    const c = computationCitation({
      name: "operator-compliance-score",
      version: "v1.0",
      inputs: { incidents: 2, overdue: 0 },
    });
    expect(c.id).toBe("COMP:operator-compliance-score@v1.0");
    expect(c.kind).toBe("computation");
  });

  it("auditEntryCitation links to oversight + entry", () => {
    const c = auditEntryCitation({
      oversightId: "ov1",
      entryId: "entry1",
      entryHash: "f".repeat(64),
    });
    expect(c.id).toBe("AUDIT:ov1:entry1");
    expect(c.contentHash).toBe(`sha256:${"f".repeat(32)}`);
  });
});

describe("ToolEnvelopeSchema invariant", () => {
  const goodCitation = dataRowCitation({
    table: "X",
    id: "y",
    content: { ok: true },
  });

  it("rejects ok=true with empty citations and no abstain", () => {
    const envelope = { ok: true, citations: [], data: { foo: 1 } };
    expect(() => ToolEnvelopeSchema.parse(envelope)).toThrow();
  });

  it("accepts ok=true with citations", () => {
    const envelope = { ok: true, citations: [goodCitation], data: { foo: 1 } };
    expect(() => ToolEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it("accepts ok=true with abstain=true and empty citations", () => {
    const envelope = {
      ok: true,
      abstain: true,
      abstainReason: "no data",
      citations: [],
    };
    expect(() => ToolEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it("accepts ok=false with empty citations (failed call)", () => {
    const envelope = { ok: false, citations: [], error: "boom" };
    expect(() => ToolEnvelopeSchema.parse(envelope)).not.toThrow();
  });
});

describe("answerIsCitationCompliant", () => {
  const c1 = dataRowCitation({ table: "X", id: "y", content: { v: 1 } });
  const c2 = computationCitation({
    name: "score",
    version: "v1",
    inputs: {},
  });

  it("accepts an answer that references at least one citation ID", () => {
    const answer = "Der Score beträgt 65 [COMP:score@v1].";
    const r = answerIsCitationCompliant(answer, [c1, c2]);
    expect(r.compliant).toBe(true);
    expect(r.abstained).toBe(false);
  });

  it("rejects an answer that references no citation IDs", () => {
    const answer = "Der Score beträgt 65.";
    const r = answerIsCitationCompliant(answer, [c1, c2]);
    expect(r.compliant).toBe(false);
    expect(r.reason).toMatch(/Halluzination|keine der/i);
  });

  it("accepts an explicit abstention with no citations", () => {
    const answer = `${ABSTENTION_MARKER}\nReason: no data\nAlternative: manual review`;
    const r = answerIsCitationCompliant(answer, []);
    expect(r.compliant).toBe(true);
    expect(r.abstained).toBe(true);
  });

  it("rejects empty answer with no citations and no abstention", () => {
    const r = answerIsCitationCompliant("Some answer", []);
    expect(r.compliant).toBe(false);
  });

  it("invented citation IDs that don't appear in the citation list are not enough", () => {
    const answer = "Score 65 [COMP:fake-engine@v9].";
    const r = answerIsCitationCompliant(answer, [c1, c2]);
    expect(r.compliant).toBe(false);
  });
});
