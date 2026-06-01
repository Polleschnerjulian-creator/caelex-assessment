/**
 * Pure unit tests for the Unified Documents normalizer (UI Phase 3D).
 *
 * Pure logic only — no DOM rendering — so it runs reliably under the
 * project's default jsdom test environment (the global tests/setup.tsx
 * stubs window.matchMedia, which a `node` override would break).
 *
 * Coverage focus (the core risk surface):
 *   1. status-tone TOTALITY — every member of all 8 status enums maps to
 *      a valid UnifiedStatusTone (guards against an unmapped enum member).
 *   2. per-type mapper assertions — title / subtitle / href / reference /
 *      status / sortDate are wired from the right source field.
 *   3. expiry bucketing — none / expired / soon / later + boundary + bad date.
 *   4. post-processing — withExpiryBuckets immutability, recency sort.
 */

import { describe, it, expect } from "vitest";
import {
  type UnifiedStatusTone,
  type UnifiedTradeDocumentRow,
  DOC_TYPE_LABELS,
  EXPIRY_SOON_DAYS,
  eucTone,
  reexportTone,
  vsdTone,
  sammelTone,
  franceLosTone,
  ukEcjuTone,
  faaAstTone,
  deemedTone,
  expiryBucket,
  normalizeEuc,
  normalizeReexport,
  normalizeVsd,
  normalizeSammel,
  normalizeFranceLos,
  normalizeUkEcju,
  normalizeFaaAst,
  normalizeDeemed,
  withExpiryBuckets,
  sortUnifiedByRecency,
} from "./unified-documents";

// The full enum-member lists, hand-mirrored from prisma/schema.prisma.
// If the schema gains a member, the corresponding tone fn won't compile
// (no default arm) AND this list should be updated — double safety.
const ENUMS = {
  euc: [
    "REQUESTED",
    "SENT_TO_PARTY",
    "RECEIVED",
    "VALIDATED",
    "EXPIRED",
    "REVOKED",
  ],
  reexport: ["DRAFTED", "SENT", "APPROVED", "DENIED", "EXPIRED", "REVOKED"],
  vsd: [
    "DISCOVERED",
    "INVESTIGATING",
    "DRAFTED",
    "SUBMITTED",
    "ACKNOWLEDGED",
    "RESOLVED",
    "WITHDRAWN",
  ],
  sammel: ["DRAFT", "ACTIVE", "EXHAUSTED", "EXPIRED", "REVOKED"],
  franceLos: [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "AUTHORISED",
    "REFUSED",
    "REVOKED",
    "COMPLETED",
  ],
  ukEcju: [
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "REVOKED",
    "EXHAUSTED",
  ],
  faaAst: [
    "DRAFT",
    "PRE_APP_CONSULTATION",
    "APPLICATION_SUBMITTED",
    "ENVIRONMENTAL_REVIEW",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "REVOKED",
  ],
  deemed: ["ACTIVE", "EXPIRED", "REVOKED"],
} as const;

const VALID_TONES: ReadonlySet<UnifiedStatusTone> = new Set([
  "positive",
  "progress",
  "pending",
  "warning",
  "critical",
  "neutral",
]);

// ─── 1. status-tone totality ────────────────────────────────────────

describe("status-tone totality — every enum member yields a valid tone", () => {
  const cases: Array<
    [string, (s: never) => UnifiedStatusTone, readonly string[]]
  > = [
    ["euc", eucTone as (s: never) => UnifiedStatusTone, ENUMS.euc],
    [
      "reexport",
      reexportTone as (s: never) => UnifiedStatusTone,
      ENUMS.reexport,
    ],
    ["vsd", vsdTone as (s: never) => UnifiedStatusTone, ENUMS.vsd],
    ["sammel", sammelTone as (s: never) => UnifiedStatusTone, ENUMS.sammel],
    [
      "franceLos",
      franceLosTone as (s: never) => UnifiedStatusTone,
      ENUMS.franceLos,
    ],
    ["ukEcju", ukEcjuTone as (s: never) => UnifiedStatusTone, ENUMS.ukEcju],
    ["faaAst", faaAstTone as (s: never) => UnifiedStatusTone, ENUMS.faaAst],
    ["deemed", deemedTone as (s: never) => UnifiedStatusTone, ENUMS.deemed],
  ];

  for (const [name, fn, members] of cases) {
    it(`${name}: all ${members.length} members → a known tone`, () => {
      for (const m of members) {
        const tone = fn(m as never);
        expect(VALID_TONES.has(tone), `${name}.${m} → ${tone}`).toBe(true);
      }
    });
  }

  it("known terminal-good states are positive", () => {
    expect(eucTone("VALIDATED")).toBe("positive");
    expect(reexportTone("APPROVED")).toBe("positive");
    expect(vsdTone("RESOLVED")).toBe("positive");
    expect(sammelTone("ACTIVE")).toBe("positive");
    expect(franceLosTone("AUTHORISED")).toBe("positive");
    expect(ukEcjuTone("APPROVED")).toBe("positive");
    expect(faaAstTone("APPROVED")).toBe("positive");
    expect(deemedTone("ACTIVE")).toBe("positive");
  });

  it("known bad states are critical", () => {
    expect(eucTone("REVOKED")).toBe("critical");
    expect(reexportTone("DENIED")).toBe("critical");
    expect(vsdTone("DISCOVERED")).toBe("critical");
    expect(sammelTone("REVOKED")).toBe("critical");
    expect(franceLosTone("REFUSED")).toBe("critical");
    expect(ukEcjuTone("REJECTED")).toBe("critical");
    expect(faaAstTone("REVOKED")).toBe("critical");
    expect(deemedTone("REVOKED")).toBe("critical");
  });

  it("expired across types collapses to neutral", () => {
    expect(eucTone("EXPIRED")).toBe("neutral");
    expect(reexportTone("EXPIRED")).toBe("neutral");
    expect(sammelTone("EXPIRED")).toBe("neutral");
    expect(ukEcjuTone("EXPIRED")).toBe("neutral");
    expect(faaAstTone("EXPIRED")).toBe("neutral");
    expect(deemedTone("EXPIRED")).toBe("neutral");
  });
});

// ─── 2. per-type mappers ────────────────────────────────────────────

const D = (s: string) => new Date(s);

describe("normalizeEuc", () => {
  const row = normalizeEuc({
    id: "euc1",
    organizationId: "org1",
    formType: "BAFA_C1",
    partyId: "p1",
    operationId: null,
    status: "RECEIVED",
    validUntil: D("2026-09-01T00:00:00.000Z"),
    notes: null,
    signedDocumentId: null,
    sentAt: null,
    receivedAt: null,
    validatedAt: null,
    lastActionById: "u1",
    createdAt: D("2026-01-01T00:00:00.000Z"),
    updatedAt: D("2026-02-01T00:00:00.000Z"),
    party: { canonicalName: "ICEYE Polska", countryCode: "PL" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  it("maps party name to title + country to subtitle", () => {
    expect(row.title).toBe("ICEYE Polska");
    expect(row.subtitle).toBe("PL");
  });
  it("deep-links to the EUC [id] page", () =>
    expect(row.href).toBe("/trade/euc/euc1"));
  it("carries raw status + label + tone", () => {
    expect(row.status).toBe("RECEIVED");
    expect(row.statusLabel).toBe("Received");
    expect(row.statusTone).toBe("warning");
  });
  it("rowKey is type-prefixed", () => expect(row.rowKey).toBe("EUC:euc1"));
  it("validUntil is an ISO string; sortDate prefers it", () => {
    expect(row.validUntil).toBe("2026-09-01T00:00:00.000Z");
    expect(row.sortDate).toBe("2026-09-01T00:00:00.000Z");
  });
  it("typeLabel matches the German map", () =>
    expect(row.typeLabel).toBe(DOC_TYPE_LABELS.EUC));
});

describe("normalizeEuc — null validUntil falls back to createdAt for sort", () => {
  const row = normalizeEuc({
    id: "euc2",
    status: "REQUESTED",
    validUntil: null,
    createdAt: D("2026-03-03T00:00:00.000Z"),
    updatedAt: D("2026-03-03T00:00:00.000Z"),
    party: { canonicalName: "X", countryCode: "DE" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("validUntil null", () => expect(row.validUntil).toBeNull());
  it("sortDate uses createdAt", () =>
    expect(row.sortDate).toBe("2026-03-03T00:00:00.000Z"));
  it("REQUESTED → pending", () => expect(row.statusTone).toBe("pending"));
});

describe("normalizeReexport", () => {
  const row = normalizeReexport({
    id: "rx1",
    status: "SENT",
    validUntil: null,
    originalLicenseNumber: "DE-LIC-9",
    newDestinationCountry: "AE",
    createdAt: D("2026-04-04T00:00:00.000Z"),
    updatedAt: D("2026-04-04T00:00:00.000Z"),
    requestingParty: { canonicalName: "Acme GmbH", countryCode: "DE" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title from requesting party", () => expect(row.title).toBe("Acme GmbH"));
  it("subtitle shows destination arrow", () =>
    expect(row.subtitle).toBe("→ AE"));
  it("reference from originalLicenseNumber", () =>
    expect(row.reference).toBe("DE-LIC-9"));
  it("href is the LIST page (no [id] route exists)", () =>
    expect(row.href).toBe("/trade/reexport-consents"));
  it("SENT → progress", () => expect(row.statusTone).toBe("progress"));
});

describe("normalizeVsd", () => {
  const row = normalizeVsd({
    id: "vsd1",
    status: "SUBMITTED",
    authority: "BIS",
    title: "Unlicensed 5A002 to RU",
    filingReference: "BIS-VSD-2026-001",
    discoveredAt: D("2026-05-05T00:00:00.000Z"),
    createdAt: D("2026-05-06T00:00:00.000Z"),
    updatedAt: D("2026-05-07T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title from VSD title", () =>
    expect(row.title).toBe("Unlicensed 5A002 to RU"));
  it("subtitle from authority", () => expect(row.subtitle).toBe("BIS"));
  it("reference from filingReference", () =>
    expect(row.reference).toBe("BIS-VSD-2026-001"));
  it("never has a validUntil", () => expect(row.validUntil).toBeNull());
  it("sortDate is the discovery date (not createdAt)", () =>
    expect(row.sortDate).toBe("2026-05-05T00:00:00.000Z"));
  it("href is the LIST page (no [id] route exists)", () =>
    expect(row.href).toBe("/trade/vsd"));
  it("SUBMITTED → progress", () => expect(row.statusTone).toBe("progress"));
});

describe("normalizeSammel", () => {
  const row = normalizeSammel({
    id: "sg1",
    status: "ACTIVE",
    title: "Avionics 2026-2027",
    bafaReference: "AGG-DE-2026-12345",
    validFrom: D("2026-01-01T00:00:00.000Z"),
    validUntil: D("2027-12-31T00:00:00.000Z"),
    createdAt: D("2026-01-01T00:00:00.000Z"),
    updatedAt: D("2026-01-01T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title + reference", () => {
    expect(row.title).toBe("Avionics 2026-2027");
    expect(row.reference).toBe("AGG-DE-2026-12345");
  });
  it("deep-links to [id]", () =>
    expect(row.href).toBe("/trade/sammelgenehmigungen/sg1"));
  it("ACTIVE → positive", () => expect(row.statusTone).toBe("positive"));
  it("sortDate is validUntil", () =>
    expect(row.sortDate).toBe("2027-12-31T00:00:00.000Z"));
});

describe("normalizeFranceLos", () => {
  const row = normalizeFranceLos({
    id: "los1",
    status: "AUTHORISED",
    missionName: "Pléiades-NG",
    operatorName: "Airbus DS",
    cnesReference: "DGE-LOS-2026-0042",
    validUntil: D("2030-01-01T00:00:00.000Z"),
    createdAt: D("2026-06-01T00:00:00.000Z"),
    updatedAt: D("2026-06-01T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title from mission, subtitle from operator", () => {
    expect(row.title).toBe("Pléiades-NG");
    expect(row.subtitle).toBe("Airbus DS");
  });
  it("reference from cnesReference", () =>
    expect(row.reference).toBe("DGE-LOS-2026-0042"));
  it("href deep-links to [id]", () =>
    expect(row.href).toBe("/trade/france-los/los1"));
  it("AUTHORISED → positive", () => expect(row.statusTone).toBe("positive"));
});

describe("normalizeUkEcju", () => {
  const row = normalizeUkEcju({
    id: "uk1",
    status: "APPROVED",
    applicantName: "Skyrora Ltd",
    licenseType: "SIEL",
    ecjuReference: "GBSIEL/2026/0012345",
    validUntil: D("2028-01-01T00:00:00.000Z"),
    createdAt: D("2026-02-02T00:00:00.000Z"),
    updatedAt: D("2026-03-03T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title from applicant, subtitle from licenseType", () => {
    expect(row.title).toBe("Skyrora Ltd");
    expect(row.subtitle).toBe("SIEL");
  });
  it("reference from ecjuReference", () =>
    expect(row.reference).toBe("GBSIEL/2026/0012345"));
  it("href deep-links to [id]", () =>
    expect(row.href).toBe("/trade/uk-ecju/uk1"));
});

describe("normalizeUkEcju — unissued licence falls back to updatedAt", () => {
  const row = normalizeUkEcju({
    id: "uk2",
    status: "SUBMITTED",
    applicantName: "Y",
    licenseType: "OIEL",
    ecjuReference: null,
    validUntil: null,
    createdAt: D("2026-02-02T00:00:00.000Z"),
    updatedAt: D("2026-04-04T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("reference null when unissued", () => expect(row.reference).toBeNull());
  it("sortDate falls back to updatedAt", () =>
    expect(row.sortDate).toBe("2026-04-04T00:00:00.000Z"));
});

describe("normalizeFaaAst", () => {
  const row = normalizeFaaAst({
    id: "faa1",
    status: "UNDER_REVIEW",
    operatorName: "Rocket Lab USA",
    vehicleName: "Neutron",
    faaReference: null,
    validUntil: null,
    createdAt: D("2026-07-07T00:00:00.000Z"),
    updatedAt: D("2026-08-08T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title from vehicle, subtitle from operator", () => {
    expect(row.title).toBe("Neutron");
    expect(row.subtitle).toBe("Rocket Lab USA");
  });
  it("href deep-links to [id]", () =>
    expect(row.href).toBe("/trade/faa-ast/faa1"));
  it("UNDER_REVIEW → progress", () => expect(row.statusTone).toBe("progress"));
  it("sortDate falls back to updatedAt", () =>
    expect(row.sortDate).toBe("2026-08-08T00:00:00.000Z"));
});

describe("normalizeDeemed", () => {
  const row = normalizeDeemed({
    id: "de1",
    status: "ACTIVE",
    foreignNationalEmployeeId: "EMP-42",
    foreignNationalName: "Jane Doe",
    foreignNationality: "CN",
    authorizationReference: "BIS-DEEMED-7",
    validUntil: D("2027-06-01T00:00:00.000Z"),
    createdAt: D("2026-01-01T00:00:00.000Z"),
    updatedAt: D("2026-01-01T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title prefers the name when present", () =>
    expect(row.title).toBe("Jane Doe"));
  it("subtitle from nationality", () => expect(row.subtitle).toBe("CN"));
  it("reference from authorizationReference", () =>
    expect(row.reference).toBe("BIS-DEEMED-7"));
  it("href deep-links to deemed-exports/[id]", () =>
    expect(row.href).toBe("/trade/deemed-exports/de1"));
});

describe("normalizeDeemed — falls back to employee id when name missing", () => {
  const row = normalizeDeemed({
    id: "de2",
    status: "ACTIVE",
    foreignNationalEmployeeId: "EMP-99",
    foreignNationalName: null,
    foreignNationality: "IN",
    authorizationReference: null,
    validUntil: null,
    createdAt: D("2026-01-01T00:00:00.000Z"),
    updatedAt: D("2026-01-01T00:00:00.000Z"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  it("title falls back to employee id", () => expect(row.title).toBe("EMP-99"));
  it("reference null", () => expect(row.reference).toBeNull());
});

// ─── 3. expiry bucketing ────────────────────────────────────────────

describe("expiryBucket", () => {
  const now = D("2026-06-01T00:00:00.000Z");
  it("null → none", () => expect(expiryBucket(null, now)).toBe("none"));
  it("undefined → none", () =>
    expect(expiryBucket(undefined, now)).toBe("none"));
  it("invalid date string → none", () =>
    expect(expiryBucket("not-a-date", now)).toBe("none"));
  it("past → expired", () =>
    expect(expiryBucket(D("2026-05-01T00:00:00.000Z"), now)).toBe("expired"));
  it("within 30d → soon", () =>
    expect(expiryBucket(D("2026-06-20T00:00:00.000Z"), now)).toBe("soon"));
  it("beyond 30d → later", () =>
    expect(expiryBucket(D("2026-09-01T00:00:00.000Z"), now)).toBe("later"));
  it("exactly now → soon (ms === 0 is not negative)", () =>
    expect(expiryBucket(now, now)).toBe("soon"));
  it("exactly at the window edge → soon (inclusive)", () => {
    const edge = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86400000);
    expect(expiryBucket(edge, now)).toBe("soon");
  });
  it("one ms past the window edge → later", () => {
    const past = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86400000 + 1);
    expect(expiryBucket(past, now)).toBe("later");
  });
  it("accepts an ISO string as input", () =>
    expect(expiryBucket("2026-05-01T00:00:00.000Z", now)).toBe("expired"));
  it("honours a custom soonDays window", () =>
    expect(expiryBucket(D("2026-06-20T00:00:00.000Z"), now, 7)).toBe("later"));
});

// ─── 4. post-processing ─────────────────────────────────────────────

function fakeRow(
  partial: Partial<UnifiedTradeDocumentRow> & { id: string; sortDate: string },
): UnifiedTradeDocumentRow {
  return {
    rowKey: `EUC:${partial.id}`,
    docType: "EUC",
    typeLabel: "End-Use Certificate",
    href: "/x",
    title: "t",
    subtitle: "",
    reference: null,
    status: "REQUESTED",
    statusLabel: "Requested",
    statusTone: "pending",
    validUntil: null,
    expiryBucket: "none",
    createdAt: partial.sortDate,
    ...partial,
  };
}

describe("withExpiryBuckets", () => {
  const now = D("2026-06-01T00:00:00.000Z");
  const input = [
    fakeRow({
      id: "a",
      sortDate: "2026-01-01T00:00:00.000Z",
      validUntil: null,
    }),
    fakeRow({
      id: "b",
      sortDate: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-05-01T00:00:00.000Z",
    }),
    fakeRow({
      id: "c",
      sortDate: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-06-15T00:00:00.000Z",
    }),
  ];
  const out = withExpiryBuckets(input, now);

  it("stamps the right bucket per row", () => {
    expect(out[0].expiryBucket).toBe("none");
    expect(out[1].expiryBucket).toBe("expired");
    expect(out[2].expiryBucket).toBe("soon");
  });
  it("does not mutate the input rows", () => {
    expect(input[1].expiryBucket).toBe("none");
  });
  it("returns new row objects (no aliasing)", () => {
    expect(out[0]).not.toBe(input[0]);
  });
});

describe("sortUnifiedByRecency", () => {
  const rows = [
    fakeRow({ id: "old", sortDate: "2026-01-01T00:00:00.000Z" }),
    fakeRow({ id: "new", sortDate: "2026-12-01T00:00:00.000Z" }),
    fakeRow({ id: "mid", sortDate: "2026-06-01T00:00:00.000Z" }),
  ];
  it("orders newest sortDate first", () =>
    expect(sortUnifiedByRecency(rows).map((r) => r.id)).toEqual([
      "new",
      "mid",
      "old",
    ]));
  it("does not mutate the input array", () => {
    const before = rows.map((r) => r.id);
    sortUnifiedByRecency(rows);
    expect(rows.map((r) => r.id)).toEqual(before);
  });
  it("is stable for equal sortDates (preserves input order)", () => {
    const tie = [
      fakeRow({ id: "first", sortDate: "2026-06-01T00:00:00.000Z" }),
      fakeRow({ id: "second", sortDate: "2026-06-01T00:00:00.000Z" }),
    ];
    expect(sortUnifiedByRecency(tie).map((r) => r.id)).toEqual([
      "first",
      "second",
    ]);
  });
});
