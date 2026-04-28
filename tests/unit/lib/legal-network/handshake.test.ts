// tests/unit/lib/legal-network/handshake.test.ts

/**
 * Unit tests for src/lib/legal-network/handshake.ts.
 *
 * The handshake hash is the cryptographic anchor of every Atlas /
 * Caelex bilateral matter — it's the hash of a canonical bundle
 * describing what both sides agreed to. Two properties matter:
 *
 *   1. DETERMINISTIC — same inputs → same hash. Requires sorted keys
 *      and stable array ordering for nested fields.
 *   2. TAMPER-EVIDENT — any later change to ANY field produces a
 *      different hash, which fails verification.
 *
 * If either property breaks, the hash-chain in the access log loses
 * its integrity guarantee and admin chain-checks become meaningless.
 *
 * The chain-step hash (computeAccessLogEntryHash) gets the same
 * canonical-key treatment, anchored on `previousHash` so a single
 * tampered field invalidates every following entry.
 */

import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";

vi.mock("server-only", () => ({}));

import {
  HANDSHAKE_VERSION,
  computeHandshakeHash,
  verifyHandshakeHash,
  computeAccessLogEntryHash,
  type HandshakeBundle,
  type AccessLogChainInput,
} from "@/lib/legal-network/handshake";

const FROZEN_DATES = {
  effectiveFrom: new Date("2026-04-01T10:00:00Z"),
  effectiveUntil: new Date("2027-04-01T10:00:00Z"),
  acceptedAt: new Date("2026-04-15T14:30:00Z"),
};

function makeBundle(overrides: Partial<HandshakeBundle> = {}): HandshakeBundle {
  return {
    matterId: "m-1",
    lawFirmOrgId: "lf-1",
    clientOrgId: "cl-1",
    scope: [
      { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
      {
        category: "AUTHORIZATION_WORKFLOWS",
        permissions: ["READ", "ANNOTATE"],
      },
    ],
    invitedBy: "u-lawyer",
    acceptedBy: "u-operator",
    ...FROZEN_DATES,
    ...overrides,
  };
}

describe("computeHandshakeHash — determinism", () => {
  it("returns 64 hex chars (SHA-256 digest)", () => {
    expect(computeHandshakeHash(makeBundle())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is fully deterministic across repeated invocations", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(makeBundle());
    expect(a).toBe(b);
  });

  it("is invariant under scope-array order changes (sorted internally)", () => {
    const reversed = makeBundle({
      scope: [
        {
          category: "AUTHORIZATION_WORKFLOWS",
          permissions: ["ANNOTATE", "READ"],
        },
        { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
      ],
    });
    const ordered = makeBundle();
    expect(computeHandshakeHash(reversed)).toBe(computeHandshakeHash(ordered));
  });

  it("is invariant under permission-array order changes", () => {
    const a = computeHandshakeHash(
      makeBundle({
        scope: [
          {
            category: "AUTHORIZATION_WORKFLOWS",
            permissions: ["ANNOTATE", "READ"],
          },
        ],
      }),
    );
    const b = computeHandshakeHash(
      makeBundle({
        scope: [
          {
            category: "AUTHORIZATION_WORKFLOWS",
            permissions: ["READ", "ANNOTATE"],
          },
        ],
      }),
    );
    expect(a).toBe(b);
  });

  it("is invariant under jurisdictions-array order in resourceFilter", () => {
    const a = computeHandshakeHash(
      makeBundle({
        scope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ"],
            resourceFilter: { jurisdictions: ["DE", "EU"] },
          },
        ],
      }),
    );
    const b = computeHandshakeHash(
      makeBundle({
        scope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ"],
            resourceFilter: { jurisdictions: ["EU", "DE"] },
          },
        ],
      }),
    );
    expect(a).toBe(b);
  });
});

describe("computeHandshakeHash — tamper detection", () => {
  it("CHANGES when scope category list changes", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(
      makeBundle({
        scope: [
          { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
          // dropped the AUTHORIZATION_WORKFLOWS entry
        ],
      }),
    );
    expect(a).not.toBe(b);
  });

  it("CHANGES when a permission is added to an existing scope item", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(
      makeBundle({
        scope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ", "EXPORT"], // added EXPORT
          },
          {
            category: "AUTHORIZATION_WORKFLOWS",
            permissions: ["READ", "ANNOTATE"],
          },
        ],
      }),
    );
    expect(a).not.toBe(b);
  });

  it("CHANGES when matterId changes", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(makeBundle({ matterId: "m-2" }));
    expect(a).not.toBe(b);
  });

  it("CHANGES when lawFirmOrgId changes", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(makeBundle({ lawFirmOrgId: "lf-2" }));
    expect(a).not.toBe(b);
  });

  it("CHANGES when clientOrgId changes", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(makeBundle({ clientOrgId: "cl-2" }));
    expect(a).not.toBe(b);
  });

  it("CHANGES when effectiveFrom shifts by 1 ms", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(
      makeBundle({
        effectiveFrom: new Date(FROZEN_DATES.effectiveFrom.getTime() + 1),
      }),
    );
    expect(a).not.toBe(b);
  });

  it("CHANGES when effectiveUntil shifts", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(
      makeBundle({
        effectiveUntil: new Date(
          FROZEN_DATES.effectiveUntil.getTime() + 60_000,
        ),
      }),
    );
    expect(a).not.toBe(b);
  });

  it("CHANGES when invitedBy changes", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(makeBundle({ invitedBy: "u-other" }));
    expect(a).not.toBe(b);
  });

  it("CHANGES when acceptedBy changes", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(makeBundle({ acceptedBy: "u-other" }));
    expect(a).not.toBe(b);
  });

  it("CHANGES when acceptedAt timestamp shifts", () => {
    const a = computeHandshakeHash(makeBundle());
    const b = computeHandshakeHash(
      makeBundle({
        acceptedAt: new Date(FROZEN_DATES.acceptedAt.getTime() + 1),
      }),
    );
    expect(a).not.toBe(b);
  });
});

describe("computeHandshakeHash — version anchoring", () => {
  it("encodes the HANDSHAKE_VERSION constant in the bundle", () => {
    expect(HANDSHAKE_VERSION).toBe("v1");
  });

  it("would change if the version constant were ever bumped (re-derive sanity)", () => {
    // Re-derive the hash by hand including the current version, then
    // check our derivation matches computeHandshakeHash. This is a
    // belt-and-braces check that the version is part of the hash.
    const bundle = makeBundle();
    const expected = createHash("sha256")
      .update(
        JSON.stringify(
          {
            acceptedAt: bundle.acceptedAt.toISOString(),
            acceptedBy: bundle.acceptedBy,
            clientOrgId: bundle.clientOrgId,
            effectiveFrom: bundle.effectiveFrom.toISOString(),
            effectiveUntil: bundle.effectiveUntil.toISOString(),
            handshakeVersion: HANDSHAKE_VERSION,
            invitedBy: bundle.invitedBy,
            lawFirmOrgId: bundle.lawFirmOrgId,
            matterId: bundle.matterId,
            scope: [
              {
                category: "AUTHORIZATION_WORKFLOWS",
                permissions: ["ANNOTATE", "READ"],
              },
              {
                category: "COMPLIANCE_ASSESSMENTS",
                permissions: ["READ"],
              },
            ],
          },
          // Same key-sorting replacer as the implementation
          (_k, v) => {
            if (v && typeof v === "object" && !Array.isArray(v)) {
              const out: Record<string, unknown> = {};
              for (const k of Object.keys(v).sort())
                out[k] = (v as Record<string, unknown>)[k];
              return out;
            }
            return v;
          },
        ),
        "utf8",
      )
      .digest("hex");
    expect(computeHandshakeHash(bundle)).toBe(expected);
  });
});

describe("verifyHandshakeHash", () => {
  it("returns true when the stored hash matches the current bundle", () => {
    const bundle = makeBundle();
    const stored = computeHandshakeHash(bundle);
    expect(verifyHandshakeHash(bundle, stored)).toBe(true);
  });

  it("returns false when ANY field has changed", () => {
    const bundle = makeBundle();
    const stored = computeHandshakeHash(bundle);
    const tampered = makeBundle({ matterId: "different" });
    expect(verifyHandshakeHash(tampered, stored)).toBe(false);
  });

  it("returns false on empty stored hash", () => {
    expect(verifyHandshakeHash(makeBundle(), "")).toBe(false);
  });

  it("returns false on garbage stored hash", () => {
    expect(verifyHandshakeHash(makeBundle(), "not-a-hash")).toBe(false);
  });
});

// ── Access-log chain-step hash ────────────────────────────────────

function makeChainInput(
  overrides: Partial<AccessLogChainInput> = {},
): AccessLogChainInput {
  return {
    previousHash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    matterId: "m-1",
    actorUserId: "u-1",
    actorOrgId: "lf-1",
    actorSide: "ATLAS",
    action: "READ_DOCUMENT",
    resourceType: "Document",
    resourceId: "doc-1",
    matterScope: "ACTIVE",
    context: { foo: "bar" },
    createdAt: new Date("2026-04-15T15:00:00Z"),
    ...overrides,
  };
}

describe("computeAccessLogEntryHash", () => {
  it("returns 64 hex chars (SHA-256)", () => {
    expect(computeAccessLogEntryHash(makeChainInput())).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("is deterministic across calls", () => {
    expect(computeAccessLogEntryHash(makeChainInput())).toBe(
      computeAccessLogEntryHash(makeChainInput()),
    );
  });

  it("CHANGES when previousHash changes (chain anchoring)", () => {
    const a = computeAccessLogEntryHash(makeChainInput());
    const b = computeAccessLogEntryHash(
      makeChainInput({
        previousHash: "1".repeat(64),
      }),
    );
    expect(a).not.toBe(b);
  });

  it("CHANGES when actorSide flips ATLAS↔CAELEX", () => {
    const a = computeAccessLogEntryHash(makeChainInput());
    const b = computeAccessLogEntryHash(
      makeChainInput({ actorSide: "CAELEX" }),
    );
    expect(a).not.toBe(b);
  });

  it("CHANGES when context payload differs", () => {
    const a = computeAccessLogEntryHash(makeChainInput());
    const b = computeAccessLogEntryHash(
      makeChainInput({ context: { foo: "DIFFERENT" } }),
    );
    expect(a).not.toBe(b);
  });

  it("treats null/undefined context as null (canonical)", () => {
    const a = computeAccessLogEntryHash(makeChainInput({ context: null }));
    const b = computeAccessLogEntryHash(
      makeChainInput({ context: undefined as unknown as null }),
    );
    expect(a).toBe(b);
  });

  it("handles null actorUserId (system-actor entries)", () => {
    expect(
      computeAccessLogEntryHash(makeChainInput({ actorUserId: null })),
    ).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles null resourceId (matter-level actions)", () => {
    expect(
      computeAccessLogEntryHash(makeChainInput({ resourceId: null })),
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});
