# Trade UI Redesign — Phase 3D Implementation Plan: Unified Documents Smart-Filter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ONE unified, cross-type documents table (built on the shipped `TradeTable<T>`) to `/trade/documents`, aggregating all eight Trade document types with columns for type, reference, counterparty, status, and **expiry (sortable)**, plus smart filters (type, status-tone, "expiring ≤ 30/60/90 days") and unified search. Additive — the eight per-type sub-pages are untouched.

**Architecture:** A pure, Vitest-tested `unified-documents.ts` (the `UnifiedTradeDocumentRow` shape + eight `toUnifiedRow` mappers + `expiryBucket`/`daysUntil` + filter predicates) → a thin `unified-documents.server.ts` that `Promise.all`-fans-out the eight existing `list*` service reads and maps them (NO new SQL, NO migration) → a server `page.tsx` that renders a `"use client"` `UnifiedDocumentsTable` wrapper around `TradeTable`.

**Tech Stack:** Next.js 15 / React / TypeScript, Tailwind `--trade-*` tokens, lucide-react, Vitest (node for the pure module; the two components are gated by `tsc --noEmit` + `npm run lint` + source review — jsdom hangs on this machine, matching Phases 1/2/3A).

**Branch:** `fix/trade-to-92`. Commit locally per task; deploy the whole batch at the end (Task 6) per the batched-deploy policy. Commitlint subjects are **lowercase**.

**Companion spec:** `docs/superpowers/specs/2026-05-31-trade-ui-phase3d-documents-design.md`.

**Verified facts (trust these — already read from the codebase):**

- `TradeTable<T>` (`../_components/TradeTable`) props incl. `rows`, `columns: TradeColumn<T>[]` (`{ key; header; render; sortBy?; align? }`), `getRowId`, `rowHref?`, `search?`, `filters?`, `resultCount?`, `loading?`, `emptyState?`, `initialSort?`. It owns its toolbar + density toggle.
- `sortRows` (`@/lib/trade/table-state`) sorts by `sortBy(row) => string | number`, comparing values directly (so ISO date strings sort chronologically; null must be mapped to a sentinel by the column's `sortBy`).
- Pure-logic tests use **Vitest**, co-located as `*.test.ts` (`import { describe, it, expect } from "vitest"`) — see `src/lib/trade/table-state.test.ts`.
- The eight list reads + their return types (all already org-scoped, index-backed):
  - `listEucRequests(orgId)` → `EucWithRelations[]` (`@/lib/trade/euc-service`). Row: `formType`, `party {canonicalName,countryCode}`, `operation`, `status: TradeEUCStatus`, `validUntil: Date|null`, `createdAt`.
  - `listReexportConsents(orgId)` → `ReexportWithRelations[]` (`@/lib/trade/reexport-service`). Row: `formType`, `originalLicenseNumber: string|null`, `requestingParty {canonicalName,countryCode}`, `originalExporterCountry`, `newDestinationCountry`, `status: TradeReexportStatus`, `validUntil`, `createdAt`.
  - `listVsds(orgId)` → `VSDWithRelations[]` (`@/lib/trade/vsd-service`). Row: `authority: TradeVSDAuthority`, `violationType`, `title`, `filingReference: string|null`, `discoveredAt`, `status: TradeVSDStatus`, `createdAt`. **No validUntil.**
  - `listSammelgenehmigungen(orgId)` → `SammelgenehmigungWithRelations[]` (`@/lib/trade/sammelgenehmigung/sammelgenehmigung-service`). Row: `bafaReference: string|null`, `title`, `status: TradeSammelgenehmigungStatus`, `validUntil: Date` (always set), `allowedEndUsers: {canonicalName}[]`, `createdAt`.
  - `listDeemedExportAuthorizations(orgId)` → `TradeDeemedExportAuthorization[]` (`@/lib/trade/deemed-export/deemed-export-service`). Row: `foreignNationalName: string|null`, `foreignNationalEmployeeId`, `foreignNationality`, `authorizationType`, `authorizationReference: string|null`, `exemptionBasis: string|null`, `status: TradeDeemedExportAuthorizationStatus`, `validUntil: Date|null`, `createdAt`.
  - `listLosAuthorisations(orgId)` → `FranceLosWithRelations[]` (`@/lib/trade/france-los/france-los-service`). Row: `missionName`, `operatorName`, `authorisationType`, `cnesReference: string|null`, `status: TradeFranceLosAuthorisationStatus`, `validUntil: Date|null`, `createdAt`.
  - `listUkEcjuLicenses(orgId)` → `UkEcjuLicenseWithCreator[]` (`@/lib/trade/uk-ecju/uk-ecju-service`). Row: `applicantName`, `licenseType`, `ecjuReference: string|null`, `status: TradeUkEcjuLicenseStatus`, `validUntil: Date|null`, `createdAt`.
  - `listFaaAstLicenses(orgId)` → `FaaAstLicenseWithCreator[]` (`@/lib/trade/faa-ast/faa-ast-service`). Row: `operatorName`, `licenseType`, `faaReference: string|null`, `launchSite`, `vehicleName`, `status: TradeFaaAstLicenseStatus`, `validUntil: Date|null`, `createdAt`.
- `getTradeAuth()` (`@/lib/trade/trade-auth`) → `{ userId, organizationId, role } | null`; returns null on session/membership/product-access failure.
- Route slugs (folders under `src/app/(trade)/trade/`): `euc`, `reexport-consents`, `vsd`, `sammelgenehmigungen`, `france-los`, `uk-ecju`, `faa-ast`, `deemed-exports`.
- Reusable client bits: `EmptyStateRich` (`../_components/EmptyStateRich`), `TradeTable` + `TradeColumn` (`../_components/TradeTable`).
- **No migration needed** — read-only aggregation; every model already has `@@index([organizationId, status])` + `@@index([validUntil])`.

---

## Task 1: Pure normalizer + expiry helpers + filter predicates

**Files:**

- Create: `src/lib/trade/unified-documents.ts`
- Test: `src/lib/trade/unified-documents.test.ts`

**Step 1 — write the test first (`unified-documents.test.ts`):**

```ts
import { describe, it, expect } from "vitest";
import {
  daysUntil,
  expiryBucket,
  matchesExpiryFilter,
  matchesSearch,
  statusTone,
  DOC_TYPE_REGISTRY,
  toEucRow,
  toReexportRow,
  toVsdRow,
  toSammelgenehmigungRow,
  toDeemedExportRow,
  toFranceLosRow,
  toUkEcjuRow,
  toFaaAstRow,
  type UnifiedTradeDocumentRow,
} from "./unified-documents";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const iso = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("daysUntil", () => {
  it("null → null", () => expect(daysUntil(null, NOW)).toBeNull());
  it("today → 0 (date-only, ignores time)", () =>
    expect(daysUntil(iso("2026-06-01"), NOW)).toBe(0));
  it("tomorrow → 1", () => expect(daysUntil(iso("2026-06-02"), NOW)).toBe(1));
  it("yesterday → -1", () =>
    expect(daysUntil(iso("2026-05-31"), NOW)).toBe(-1));
  it("30 days out → 30", () =>
    expect(daysUntil(iso("2026-07-01"), NOW)).toBe(30));
});

describe("expiryBucket", () => {
  it("null → none", () => expect(expiryBucket(null, NOW)).toBe("none"));
  it("past → expired", () =>
    expect(expiryBucket(iso("2026-05-01"), NOW)).toBe("expired"));
  it("today → soon", () =>
    expect(expiryBucket(iso("2026-06-01"), NOW)).toBe("soon"));
  it("at 30d boundary → soon", () =>
    expect(expiryBucket(iso("2026-07-01"), NOW)).toBe("soon"));
  it("31d → later", () =>
    expect(expiryBucket(iso("2026-07-02"), NOW)).toBe("later"));
});

describe("matchesExpiryFilter", () => {
  const row = (validUntil: string | null): UnifiedTradeDocumentRow =>
    ({ validUntil }) as UnifiedTradeDocumentRow;
  it("null validUntil never matches a ≤N filter", () =>
    expect(matchesExpiryFilter(row(null), 30, NOW)).toBe(false));
  it("within window matches", () =>
    expect(matchesExpiryFilter(row("2026-06-15"), 30, NOW)).toBe(true));
  it("beyond window does not match", () =>
    expect(matchesExpiryFilter(row("2026-09-01"), 30, NOW)).toBe(false));
  it("already expired does not match a future ≤N filter", () =>
    expect(matchesExpiryFilter(row("2026-05-01"), 30, NOW)).toBe(false));
});

describe("matchesSearch", () => {
  const row = {
    reference: "GBSIEL/2026/0012345",
    subReference: "SIEL (Standard Individual)",
    counterparty: "ICEYE Polska",
  } as UnifiedTradeDocumentRow;
  it("matches reference, case-insensitive", () =>
    expect(matchesSearch(row, "gbsiel")).toBe(true));
  it("matches counterparty", () =>
    expect(matchesSearch(row, "iceye")).toBe(true));
  it("matches subReference", () =>
    expect(matchesSearch(row, "standard")).toBe(true));
  it("empty query matches everything", () =>
    expect(matchesSearch(row, "")).toBe(true));
  it("no match → false", () => expect(matchesSearch(row, "zzz")).toBe(false));
});

describe("statusTone totality", () => {
  // Every enum value of every type must map to a tone (guards the
  // exhaustive `never` switch). Listed explicitly so a future enum
  // addition fails the test until mapped.
  const cases: Array<[string, ReturnType<typeof statusTone>]> = [
    // EUC
    ["EUC", "REQUESTED"],
    ["EUC", "SENT_TO_PARTY"],
    ["EUC", "RECEIVED"],
    ["EUC", "VALIDATED"],
    ["EUC", "EXPIRED"],
    ["EUC", "REVOKED"],
    // REEXPORT
    ["REEXPORT", "DRAFTED"],
    ["REEXPORT", "SENT"],
    ["REEXPORT", "APPROVED"],
    ["REEXPORT", "DENIED"],
    ["REEXPORT", "EXPIRED"],
    ["REEXPORT", "REVOKED"],
    // VSD
    ["VSD", "DISCOVERED"],
    ["VSD", "INVESTIGATING"],
    ["VSD", "DRAFTED"],
    ["VSD", "SUBMITTED"],
    ["VSD", "ACKNOWLEDGED"],
    ["VSD", "RESOLVED"],
    ["VSD", "WITHDRAWN"],
    // SAMMELGENEHMIGUNG
    ["SAMMELGENEHMIGUNG", "DRAFT"],
    ["SAMMELGENEHMIGUNG", "ACTIVE"],
    ["SAMMELGENEHMIGUNG", "EXHAUSTED"],
    ["SAMMELGENEHMIGUNG", "EXPIRED"],
    ["SAMMELGENEHMIGUNG", "REVOKED"],
    // FRANCE_LOS
    ["FRANCE_LOS", "DRAFT"],
    ["FRANCE_LOS", "SUBMITTED"],
    ["FRANCE_LOS", "UNDER_REVIEW"],
    ["FRANCE_LOS", "AUTHORISED"],
    ["FRANCE_LOS", "REFUSED"],
    ["FRANCE_LOS", "REVOKED"],
    ["FRANCE_LOS", "COMPLETED"],
    // UK_ECJU
    ["UK_ECJU", "DRAFT"],
    ["UK_ECJU", "SUBMITTED"],
    ["UK_ECJU", "APPROVED"],
    ["UK_ECJU", "REJECTED"],
    ["UK_ECJU", "EXPIRED"],
    ["UK_ECJU", "REVOKED"],
    ["UK_ECJU", "EXHAUSTED"],
    // FAA_AST
    ["FAA_AST", "DRAFT"],
    ["FAA_AST", "PRE_APP_CONSULTATION"],
    ["FAA_AST", "APPLICATION_SUBMITTED"],
    ["FAA_AST", "ENVIRONMENTAL_REVIEW"],
    ["FAA_AST", "UNDER_REVIEW"],
    ["FAA_AST", "APPROVED"],
    ["FAA_AST", "REJECTED"],
    ["FAA_AST", "EXPIRED"],
    ["FAA_AST", "REVOKED"],
    // DEEMED_EXPORT
    ["DEEMED_EXPORT", "ACTIVE"],
    ["DEEMED_EXPORT", "EXPIRED"],
    ["DEEMED_EXPORT", "REVOKED"],
  ];
  it.each(cases)("%s/%s maps to a tone", (docType, status) => {
    const tone = statusTone(docType as never, status);
    expect(["positive", "pending", "negative", "neutral"]).toContain(tone);
  });
});

describe("toUnifiedRow mappers", () => {
  it("EUC: form-type ref, party counterparty, slug→href", () => {
    const r = toEucRow(
      {
        id: "euc1",
        formType: "BAFA_C1",
        status: "VALIDATED",
        validUntil: iso("2027-01-01"),
        createdAt: iso("2026-01-01"),
        party: { canonicalName: "ACME GmbH", countryCode: "DE" },
      } as never,
      NOW,
    );
    expect(r.id).toBe("EUC:euc1");
    expect(r.docType).toBe("EUC");
    expect(r.typeLabel).toBe(DOC_TYPE_REGISTRY.EUC.label);
    expect(r.detailHref).toBe("/trade/euc/euc1");
    expect(r.counterparty).toBe("ACME GmbH");
    expect(r.counterpartyCountry).toBe("DE");
    expect(r.validUntil).toBe("2027-01-01");
    expect(r.statusTone).toBe("positive");
  });

  it("UK_ECJU: null ecjuReference → (draft) fallback, GB country", () => {
    const r = toUkEcjuRow(
      {
        id: "uk1",
        applicantName: "ICEYE UK Ltd",
        licenseType: "SIEL",
        ecjuReference: null,
        status: "DRAFT",
        validUntil: null,
        createdAt: iso("2026-02-02"),
      } as never,
      NOW,
    );
    expect(r.reference.startsWith("(draft)")).toBe(true);
    expect(r.detailHref).toBe("/trade/uk-ecju/uk1");
    expect(r.counterpartyCountry).toBe("GB");
    expect(r.validUntil).toBeNull();
    expect(r.expiry).toBe("none");
  });

  it("VSD: filingReference fallback to title, no validUntil", () => {
    const r = toVsdRow(
      {
        id: "v1",
        authority: "BIS",
        violationType: "UNLICENSED_EXPORT",
        title: "Shipped 5A002 to RU",
        filingReference: null,
        status: "DISCOVERED",
        createdAt: iso("2026-03-03"),
      } as never,
      NOW,
    );
    expect(r.reference).toBe("Shipped 5A002 to RU");
    expect(r.validUntil).toBeNull();
    expect(r.detailHref).toBe("/trade/vsd/v1");
    expect(r.statusTone).toBe("negative"); // DISCOVERED = open issue
  });

  it("SAMMELGENEHMIGUNG: bafaReference, first end-user, always-set validUntil", () => {
    const r = toSammelgenehmigungRow(
      {
        id: "s1",
        bafaReference: "AGG-DE-2026-12345",
        title: "Avionics 2026",
        status: "ACTIVE",
        validUntil: iso("2026-06-20"),
        createdAt: iso("2026-01-15"),
        allowedEndUsers: [{ canonicalName: "ISRO" }],
      } as never,
      NOW,
    );
    expect(r.reference).toBe("AGG-DE-2026-12345");
    expect(r.counterparty).toBe("ISRO");
    expect(r.expiry).toBe("soon");
    expect(r.daysUntilExpiry).toBe(19);
  });

  it("DEEMED_EXPORT: name fallback to employeeId, exemption ref", () => {
    const r = toDeemedExportRow(
      {
        id: "d1",
        foreignNationalName: null,
        foreignNationalEmployeeId: "HR-12345",
        foreignNationality: "CN",
        authorizationType: "EXEMPTION",
        authorizationReference: null,
        exemptionBasis: "STA-740.20",
        status: "ACTIVE",
        validUntil: null,
        createdAt: iso("2026-04-04"),
      } as never,
      NOW,
    );
    expect(r.counterparty).toBe("HR-12345");
    expect(r.counterpartyCountry).toBe("CN");
    expect(r.reference).toContain("STA-740.20");
    expect(r.detailHref).toBe("/trade/deemed-exports/d1");
  });

  it("REEXPORT: originalLicenseNumber ref, requestingParty counterparty", () => {
    const r = toReexportRow(
      {
        id: "rx1",
        formType: "BAFA_REEXPORT_AUTH",
        originalLicenseNumber: "D123456",
        requestingParty: { canonicalName: "Foo Ltd", countryCode: "GB" },
        status: "SENT",
        validUntil: null,
        createdAt: iso("2026-02-20"),
      } as never,
      NOW,
    );
    expect(r.reference).toBe("D123456");
    expect(r.counterparty).toBe("Foo Ltd");
    expect(r.statusTone).toBe("pending");
  });

  it("FRANCE_LOS: cnesReference fallback to mission, operator FR", () => {
    const r = toFranceLosRow(
      {
        id: "fr1",
        missionName: "SAT-1",
        operatorName: "Foo SA",
        authorisationType: "LAUNCH",
        cnesReference: null,
        status: "DRAFT",
        validUntil: null,
        createdAt: iso("2026-05-05"),
      } as never,
      NOW,
    );
    expect(r.reference).toBe("SAT-1");
    expect(r.counterpartyCountry).toBe("FR");
    expect(r.detailHref).toBe("/trade/france-los/fr1");
  });

  it("FAA_AST: faaReference fallback, operator US", () => {
    const r = toFaaAstRow(
      {
        id: "fa1",
        operatorName: "SpaceX",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-119",
        launchSite: "Boca Chica",
        vehicleName: "Starship",
        status: "APPROVED",
        validUntil: iso("2031-01-01"),
        createdAt: iso("2026-01-01"),
      } as never,
      NOW,
    );
    expect(r.reference).toBe("LRLO 22-119");
    expect(r.counterpartyCountry).toBe("US");
    expect(r.statusTone).toBe("positive");
  });
});
```

**Step 2 — implement `unified-documents.ts` to pass:**

```ts
/**
 * Pure normalization + expiry logic for the unified Trade documents
 * view (Phase 3D). No React, no DOM, no I/O — fully Vitest-testable in
 * node. The server aggregator (`unified-documents.server.ts`) calls the
 * eight `to*Row` mappers; the client table calls the predicates +
 * `expiryBucket`. `now` is always injected so there is no hidden clock.
 */

export type UnifiedDocType =
  | "EUC"
  | "REEXPORT"
  | "VSD"
  | "SAMMELGENEHMIGUNG"
  | "FRANCE_LOS"
  | "UK_ECJU"
  | "FAA_AST"
  | "DEEMED_EXPORT";

export type ExpiryBucket = "expired" | "soon" | "later" | "none";
export type StatusTone = "positive" | "pending" | "negative" | "neutral";

export interface UnifiedTradeDocumentRow {
  id: string;
  sourceId: string;
  docType: UnifiedDocType;
  typeLabel: string;
  reference: string;
  subReference: string | null;
  counterparty: string | null;
  counterpartyCountry: string | null;
  status: string;
  statusLabel: string;
  statusTone: StatusTone;
  validUntil: string | null;
  expiry: ExpiryBucket;
  daysUntilExpiry: number | null;
  detailHref: string;
  createdAt: string;
}

/** Soonest-expiry threshold (days) for the "soon" bucket + the default
 *  "expiring soon" badge. The quick-filter pills (30/60/90) are passed
 *  explicitly to `matchesExpiryFilter` and are independent of this. */
export const SOON_THRESHOLD_DAYS = 30;

export const DOC_TYPE_REGISTRY: Record<
  UnifiedDocType,
  { label: string; slug: string }
> = {
  EUC: { label: "End-Use Certificate", slug: "euc" },
  REEXPORT: { label: "Re-Export Consent", slug: "reexport-consents" },
  VSD: { label: "Voluntary Self-Disclosure", slug: "vsd" },
  SAMMELGENEHMIGUNG: {
    label: "Sammelgenehmigung",
    slug: "sammelgenehmigungen",
  },
  FRANCE_LOS: { label: "France LOS", slug: "france-los" },
  UK_ECJU: { label: "UK ECJU Licence", slug: "uk-ecju" },
  FAA_AST: { label: "FAA AST Licence", slug: "faa-ast" },
  DEEMED_EXPORT: { label: "Deemed Export", slug: "deemed-exports" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight-UTC epoch of a date, so day math ignores time-of-day. */
function midnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysUntil(validUntil: Date | null, now: Date): number | null {
  if (validUntil == null) return null;
  return Math.floor((midnight(validUntil) - midnight(now)) / DAY_MS);
}

export function expiryBucket(validUntil: Date | null, now: Date): ExpiryBucket {
  const d = daysUntil(validUntil, now);
  if (d == null) return "none";
  if (d < 0) return "expired";
  if (d <= SOON_THRESHOLD_DAYS) return "soon";
  return "later";
}

/** ISO `YYYY-MM-DD` (date-only) or null. */
function isoDate(d: Date | null): string | null {
  return d == null ? null : d.toISOString().slice(0, 10);
}

export function matchesExpiryFilter(
  row: Pick<UnifiedTradeDocumentRow, "validUntil">,
  withinDays: number,
  now: Date,
): boolean {
  if (row.validUntil == null) return false;
  const d = daysUntil(new Date(`${row.validUntil}T00:00:00.000Z`), now);
  return d != null && d >= 0 && d <= withinDays;
}

export function matchesSearch(
  row: Pick<
    UnifiedTradeDocumentRow,
    "reference" | "subReference" | "counterparty"
  >,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  const hay = [row.reference, row.subReference, row.counterparty]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

// ─── Status tone ────────────────────────────────────────────────────
// Collapse each per-type status enum into one of four tones. The switch
// is total per type; an unmapped value falls through to "neutral" but
// the totality test enumerates every enum value to catch gaps early.

export function statusTone(
  _docType: UnifiedDocType,
  status: string,
): StatusTone {
  switch (status) {
    // positive — valid / granted / closed-good
    case "VALIDATED":
    case "APPROVED":
    case "AUTHORISED":
    case "ACTIVE":
    case "RESOLVED":
    case "RECEIVED":
      return "positive";
    // negative — refused / revoked / open-issue
    case "REJECTED":
    case "REFUSED":
    case "DENIED":
    case "REVOKED":
    case "WITHDRAWN":
    case "DISCOVERED":
      return "negative";
    // neutral — terminal-inert
    case "EXPIRED":
    case "EXHAUSTED":
    case "COMPLETED":
      return "neutral";
    // pending — everything in-flight
    case "REQUESTED":
    case "SENT_TO_PARTY":
    case "DRAFTED":
    case "DRAFT":
    case "SENT":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "INVESTIGATING":
    case "ACKNOWLEDGED":
    case "PRE_APP_CONSULTATION":
    case "APPLICATION_SUBMITTED":
    case "ENVIRONMENTAL_REVIEW":
      return "pending";
    default:
      return "neutral";
  }
}

// ─── Per-type humanized status labels ───────────────────────────────
// Minimal label maps (server-safe — no client imports). Only the labels
// needed by the unified pill; the per-type detail pages keep their own.

const STATUS_LABEL: Record<string, string> = {
  // shared across types where spelling matches
  REQUESTED: "Requested",
  SENT_TO_PARTY: "Sent",
  RECEIVED: "Received",
  VALIDATED: "Validated",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  DRAFTED: "Drafted",
  SENT: "Sent",
  APPROVED: "Approved",
  DENIED: "Denied",
  DISCOVERED: "Discovered",
  INVESTIGATING: "Investigating",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  WITHDRAWN: "Withdrawn",
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXHAUSTED: "Exhausted",
  UNDER_REVIEW: "Under review",
  AUTHORISED: "Authorised",
  REFUSED: "Refused",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  PRE_APP_CONSULTATION: "Pre-app consultation",
  APPLICATION_SUBMITTED: "Application submitted",
  ENVIRONMENTAL_REVIEW: "Environmental review",
};

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

// ─── Row builder (shared tail) ──────────────────────────────────────

function buildRow(args: {
  docType: UnifiedDocType;
  sourceId: string;
  reference: string;
  subReference?: string | null;
  counterparty?: string | null;
  counterpartyCountry?: string | null;
  status: string;
  validUntil: Date | null;
  createdAt: Date;
  now: Date;
}): UnifiedTradeDocumentRow {
  const { slug, label } = DOC_TYPE_REGISTRY[args.docType];
  return {
    id: `${args.docType}:${args.sourceId}`,
    sourceId: args.sourceId,
    docType: args.docType,
    typeLabel: label,
    reference: args.reference,
    subReference: args.subReference ?? null,
    counterparty: args.counterparty ?? null,
    counterpartyCountry: args.counterpartyCountry ?? null,
    status: args.status,
    statusLabel: statusLabel(args.status),
    statusTone: statusTone(args.docType, args.status),
    validUntil: isoDate(args.validUntil),
    expiry: expiryBucket(args.validUntil, args.now),
    daysUntilExpiry: daysUntil(args.validUntil, args.now),
    detailHref: `/trade/${slug}/${args.sourceId}`,
    createdAt: args.createdAt.toISOString(),
  };
}

// ─── Eight mappers ──────────────────────────────────────────────────
// Inputs are typed `any`-lite via structural picks so the pure module
// does not import Prisma types (keeps it node-pure + decoupled). The
// server file passes the real `*WithRelations` rows, which are
// structurally compatible. Each mapper reads ONLY fields already shown
// on the corresponding per-type list page (no PII / privileged widening).

const EUC_FORM_LABEL: Record<string, string> = {
  BAFA_C1: "BAFA C1",
  BAFA_C6: "BAFA C6",
  BAFA_C7: "BAFA C7",
  BIS_711: "BIS Form 711",
  DDTC_DS83: "DDTC DS-83",
  OTHER: "Other",
};

export function toEucRow(
  e: {
    id: string;
    formType: string;
    status: string;
    validUntil: Date | null;
    createdAt: Date;
    party: { canonicalName: string; countryCode: string };
  },
  now: Date,
): UnifiedTradeDocumentRow {
  return buildRow({
    docType: "EUC",
    sourceId: e.id,
    reference: EUC_FORM_LABEL[e.formType] ?? e.formType,
    subReference: null,
    counterparty: e.party.canonicalName,
    counterpartyCountry: e.party.countryCode,
    status: e.status,
    validUntil: e.validUntil,
    createdAt: e.createdAt,
    now,
  });
}

const REEXPORT_FORM_LABEL: Record<string, string> = {
  BIS_REEXPORT_AUTH: "BIS re-export",
  BAFA_REEXPORT_AUTH: "BAFA §17 AWV",
  EU_INTRA_REEXPORT: "EU intra (Art. 11)",
  OTHER: "Other",
};

export function toReexportRow(
  c: {
    id: string;
    formType: string;
    originalLicenseNumber: string | null;
    requestingParty: { canonicalName: string; countryCode: string };
    status: string;
    validUntil: Date | null;
    createdAt: Date;
  },
  now: Date,
): UnifiedTradeDocumentRow {
  const formLabel = REEXPORT_FORM_LABEL[c.formType] ?? c.formType;
  return buildRow({
    docType: "REEXPORT",
    sourceId: c.id,
    reference: c.originalLicenseNumber ?? formLabel,
    subReference: c.originalLicenseNumber ? formLabel : null,
    counterparty: c.requestingParty.canonicalName,
    counterpartyCountry: c.requestingParty.countryCode,
    status: c.status,
    validUntil: c.validUntil,
    createdAt: c.createdAt,
    now,
  });
}

const VSD_AUTHORITY_LABEL: Record<string, string> = {
  BIS: "BIS",
  DDTC: "DDTC",
  OFAC: "OFAC",
  BAFA: "BAFA",
  EU_COMPETENT_AUTHORITY: "EU Competent Authority",
  OTHER: "Other",
};

export function toVsdRow(
  v: {
    id: string;
    authority: string;
    title: string;
    filingReference: string | null;
    status: string;
    createdAt: Date;
  },
  now: Date,
): UnifiedTradeDocumentRow {
  return buildRow({
    docType: "VSD",
    sourceId: v.id,
    reference: v.filingReference ?? v.title,
    subReference: v.filingReference ? v.title : null,
    counterparty: VSD_AUTHORITY_LABEL[v.authority] ?? v.authority,
    counterpartyCountry: null,
    status: v.status,
    validUntil: null, // VSD has no validity window
    createdAt: v.createdAt,
    now,
  });
}

export function toSammelgenehmigungRow(
  s: {
    id: string;
    bafaReference: string | null;
    title: string;
    status: string;
    validUntil: Date;
    createdAt: Date;
    allowedEndUsers: { canonicalName: string }[];
  },
  now: Date,
): UnifiedTradeDocumentRow {
  const firstEndUser = s.allowedEndUsers[0]?.canonicalName ?? "(any)";
  return buildRow({
    docType: "SAMMELGENEHMIGUNG",
    sourceId: s.id,
    reference: s.bafaReference ?? s.title,
    subReference: s.bafaReference ? s.title : null,
    counterparty: firstEndUser,
    counterpartyCountry: null,
    status: s.status,
    validUntil: s.validUntil,
    createdAt: s.createdAt,
    now,
  });
}

const DEEMED_TYPE_LABEL: Record<string, string> = {
  DEEMED_EXPORT_LICENSE: "Deemed Export Licence",
  EAR_LICENSE: "EAR Licence",
  ITAR_TAA_OR_MLA: "ITAR TAA / MLA",
  EXEMPTION: "Exemption",
};

export function toDeemedExportRow(
  d: {
    id: string;
    foreignNationalName: string | null;
    foreignNationalEmployeeId: string;
    foreignNationality: string;
    authorizationType: string;
    authorizationReference: string | null;
    exemptionBasis: string | null;
    status: string;
    validUntil: Date | null;
    createdAt: Date;
  },
  now: Date,
): UnifiedTradeDocumentRow {
  const ref =
    d.authorizationReference ??
    (d.exemptionBasis ? `Exempt: ${d.exemptionBasis}` : "—");
  return buildRow({
    docType: "DEEMED_EXPORT",
    sourceId: d.id,
    reference: ref,
    subReference: DEEMED_TYPE_LABEL[d.authorizationType] ?? d.authorizationType,
    counterparty: d.foreignNationalName ?? d.foreignNationalEmployeeId,
    counterpartyCountry: d.foreignNationality,
    status: d.status,
    validUntil: d.validUntil,
    createdAt: d.createdAt,
    now,
  });
}

const LOS_TYPE_LABEL: Record<string, string> = {
  LAUNCH: "Launch",
  OPERATION_IN_ORBIT: "In-Orbit Operation",
  CONTROLLED_RETURN: "Controlled Return",
  RE_ENTRY_FROM_THIRD_PARTY: "Third-Party Re-Entry",
};

export function toFranceLosRow(
  l: {
    id: string;
    missionName: string;
    operatorName: string;
    authorisationType: string;
    cnesReference: string | null;
    status: string;
    validUntil: Date | null;
    createdAt: Date;
  },
  now: Date,
): UnifiedTradeDocumentRow {
  return buildRow({
    docType: "FRANCE_LOS",
    sourceId: l.id,
    reference: l.cnesReference ?? l.missionName,
    subReference: LOS_TYPE_LABEL[l.authorisationType] ?? l.authorisationType,
    counterparty: l.operatorName,
    counterpartyCountry: "FR",
    status: l.status,
    validUntil: l.validUntil,
    createdAt: l.createdAt,
    now,
  });
}

const UK_TYPE_LABEL: Record<string, string> = {
  SIEL: "SIEL",
  OIEL: "OIEL",
  OGEL: "OGEL",
  SIEL_TC: "SIEL-TC",
  OITCL: "OITCL",
};

export function toUkEcjuRow(
  u: {
    id: string;
    applicantName: string;
    licenseType: string;
    ecjuReference: string | null;
    status: string;
    validUntil: Date | null;
    createdAt: Date;
  },
  now: Date,
): UnifiedTradeDocumentRow {
  return buildRow({
    docType: "UK_ECJU",
    sourceId: u.id,
    reference: u.ecjuReference ?? `(draft) ${u.id.slice(-6)}`,
    subReference: UK_TYPE_LABEL[u.licenseType] ?? u.licenseType,
    counterparty: u.applicantName,
    counterpartyCountry: "GB",
    status: u.status,
    validUntil: u.validUntil,
    createdAt: u.createdAt,
    now,
  });
}

const FAA_TYPE_LABEL: Record<string, string> = {
  PART_450_LAUNCH: "Part 450 Launch",
  PART_450_REENTRY: "Part 450 Re-Entry",
  PART_450_VEHICLE_OPERATOR: "Part 450 Vehicle Operator",
  PART_435_REENTRY_REUSABLE: "Part 435 RLV Re-Entry",
};

export function toFaaAstRow(
  f: {
    id: string;
    operatorName: string;
    licenseType: string;
    faaReference: string | null;
    status: string;
    validUntil: Date | null;
    createdAt: Date;
  },
  now: Date,
): UnifiedTradeDocumentRow {
  return buildRow({
    docType: "FAA_AST",
    sourceId: f.id,
    reference: f.faaReference ?? `(draft) ${f.id.slice(-6)}`,
    subReference: FAA_TYPE_LABEL[f.licenseType] ?? f.licenseType,
    counterparty: f.operatorName,
    counterpartyCountry: "US",
    status: f.status,
    validUntil: f.validUntil,
    createdAt: f.createdAt,
    now,
  });
}
```

**Step 3 — verify:**

```bash
npx vitest run src/lib/trade/unified-documents.test.ts
npx tsc --noEmit
```

Both green before commit.

**Commit:** `feat(trade): pure unified-documents normalizer + expiry buckets (ui phase 3d)`

---

## Task 2: Server aggregator (`unified-documents.server.ts`)

**File:** Create `src/lib/trade/unified-documents.server.ts`

No new test (thin glue — correctness = tested services + tested mappers; gated by tsc). Sketch:

```ts
import "server-only";

import { listEucRequests } from "@/lib/trade/euc-service";
import { listReexportConsents } from "@/lib/trade/reexport-service";
import { listVsds } from "@/lib/trade/vsd-service";
import { listSammelgenehmigungen } from "@/lib/trade/sammelgenehmigung/sammelgenehmigung-service";
import { listDeemedExportAuthorizations } from "@/lib/trade/deemed-export/deemed-export-service";
import { listLosAuthorisations } from "@/lib/trade/france-los/france-los-service";
import { listUkEcjuLicenses } from "@/lib/trade/uk-ecju/uk-ecju-service";
import { listFaaAstLicenses } from "@/lib/trade/faa-ast/faa-ast-service";
import {
  toEucRow,
  toReexportRow,
  toVsdRow,
  toSammelgenehmigungRow,
  toDeemedExportRow,
  toFranceLosRow,
  toUkEcjuRow,
  toFaaAstRow,
  type UnifiedTradeDocumentRow,
} from "@/lib/trade/unified-documents";

/**
 * Aggregate all eight Trade document types for an org into one
 * normalized, JSON-serializable row list. Read-only: fans out the
 * existing org-scoped `list*` reads in parallel (no new SQL, no
 * migration), maps each through its pure normalizer, concatenates.
 * `now` is injected for deterministic expiry derivation.
 */
export async function listUnifiedDocuments(
  organizationId: string,
  now: Date = new Date(),
): Promise<UnifiedTradeDocumentRow[]> {
  const [eucs, reexports, vsds, sags, deemed, los, uk, faa] = await Promise.all(
    [
      listEucRequests(organizationId),
      listReexportConsents(organizationId),
      listVsds(organizationId),
      listSammelgenehmigungen(organizationId),
      listDeemedExportAuthorizations(organizationId),
      listLosAuthorisations(organizationId),
      listUkEcjuLicenses(organizationId),
      listFaaAstLicenses(organizationId),
    ],
  );

  return [
    ...eucs.map((r) => toEucRow(r, now)),
    ...reexports.map((r) => toReexportRow(r, now)),
    ...vsds.map((r) => toVsdRow(r, now)),
    ...sags.map((r) => toSammelgenehmigungRow(r, now)),
    ...deemed.map((r) => toDeemedExportRow(r, now)),
    ...los.map((r) => toFranceLosRow(r, now)),
    ...uk.map((r) => toUkEcjuRow(r, now)),
    ...faa.map((r) => toFaaAstRow(r, now)),
  ];
}
```

> **If a `list*` signature differs** from the Verified-facts list (e.g. requires an options object), adapt the call here only — do not change the service. Confirm each import path + return-array element shape compiles via tsc.

**Verify:** `npx tsc --noEmit`. **Commit:** `feat(trade): unified-documents server aggregator — parallel fan-out (ui phase 3d)`

---

## Task 3: Client table wrapper (`UnifiedDocumentsTable.tsx`)

**File:** Create `src/app/(trade)/trade/documents/_components/UnifiedDocumentsTable.tsx` (`"use client"`).

Owns: `search` string; `typeFilter: Set<UnifiedDocType>`; `toneFilter: Set<StatusTone>`; `expiryFilter: null | 30 | 60 | 90 | "expired"`. Derives visible rows with `useMemo` over the pure predicates. Renders `TradeTable<UnifiedTradeDocumentRow>`. Sketch of the load-bearing parts:

```tsx
"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { EmptyStateRich } from "../../_components/EmptyStateRich";
import { TradeTable, type TradeColumn } from "../../_components/TradeTable";
import {
  matchesExpiryFilter,
  matchesSearch,
  DOC_TYPE_REGISTRY,
  type UnifiedTradeDocumentRow,
  type UnifiedDocType,
  type StatusTone,
} from "@/lib/trade/unified-documents";

const TONE_PILL: Record<StatusTone, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  pending: "bg-indigo-100 text-indigo-700",
  negative: "bg-red-100 text-red-700",
  neutral: "bg-slate-200 text-slate-600",
};
const TONE_FILTERS: ReadonlyArray<{ key: StatusTone; label: string }> = [
  { key: "positive", label: "Valid" },
  { key: "pending", label: "Pending" },
  { key: "negative", label: "Issue" },
  { key: "neutral", label: "Closed" },
];
const EXPIRY_FILTERS: ReadonlyArray<{
  key: null | 30 | 60 | 90 | "expired";
  label: string;
}> = [
  { key: null, label: "All" },
  { key: "expired", label: "Expired" },
  { key: 30, label: "≤ 30d" },
  { key: 60, label: "≤ 60d" },
  { key: 90, label: "≤ 90d" },
];

export function UnifiedDocumentsTable({
  rows,
}: {
  rows: UnifiedTradeDocumentRow[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<UnifiedDocType>>(new Set());
  const [toneFilter, setToneFilter] = useState<Set<StatusTone>>(new Set());
  const [expiryFilter, setExpiryFilter] = useState<
    null | 30 | 60 | 90 | "expired"
  >(null);

  const now = useMemo(() => new Date(), []);
  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter.size > 0 && !typeFilter.has(r.docType)) return false;
      if (toneFilter.size > 0 && !toneFilter.has(r.statusTone)) return false;
      if (expiryFilter === "expired" && r.expiry !== "expired") return false;
      if (
        typeof expiryFilter === "number" &&
        !matchesExpiryFilter(r, expiryFilter, now)
      )
        return false;
      if (!matchesSearch(r, search)) return false;
      return true;
    });
  }, [rows, typeFilter, toneFilter, expiryFilter, search, now]);

  const columns: TradeColumn<UnifiedTradeDocumentRow>[] = [
    {
      key: "docType",
      header: "Type",
      sortBy: (r) => r.typeLabel,
      render: (r) => (
        <span className="inline-flex rounded bg-trade-bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-trade-text-secondary ring-1 ring-trade-border">
          {r.typeLabel}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      sortBy: (r) => r.reference.toLowerCase(),
      render: (r) => (
        <div>
          <div className="text-[13px] font-semibold text-trade-text-primary">
            {r.reference}
          </div>
          {r.subReference && (
            <div className="text-[11px] text-trade-text-muted">
              {r.subReference}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "counterparty",
      header: "Counterparty",
      sortBy: (r) => (r.counterparty ?? "").toLowerCase(),
      render: (r) =>
        r.counterparty ? (
          <span className="text-[13px] text-trade-text-secondary">
            {r.counterparty}
            {r.counterpartyCountry && (
              <span className="ml-1.5 text-[11px] text-trade-text-muted">
                {r.counterpartyCountry}
              </span>
            )}
          </span>
        ) : (
          <span className="text-trade-text-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortBy: (r) => r.statusLabel,
      render: (r) => (
        <span
          className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${TONE_PILL[r.statusTone]}`}
        >
          {r.statusLabel}
        </span>
      ),
    },
    {
      key: "validUntil",
      header: "Valid until",
      // null sorts LAST (sentinel) so soonest-expiring lands on top.
      sortBy: (r) => r.validUntil ?? "9999-12-31",
      render: (r) =>
        r.validUntil ? (
          <span className="text-[13px] text-trade-text-secondary">
            {r.validUntil}
            {r.expiry === "expired" && (
              <span className="ml-2 rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                expired
              </span>
            )}
            {r.expiry === "soon" && r.daysUntilExpiry != null && (
              <span className="ml-2 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                {r.daysUntilExpiry}d left
              </span>
            )}
          </span>
        ) : (
          <span className="text-trade-text-muted">—</span>
        ),
    },
  ];

  // filterSlot: three pill groups (expiry single-select, type multi,
  // tone multi) — copy the pill markup pattern verbatim from
  // parties/page.tsx (rounded-full, trade-accent-soft when active).
  const filterSlot = (
    <>
      {/* expiry quick-filter */}
      {EXPIRY_FILTERS.map((f) => (
        <button
          key={String(f.key)}
          onClick={() => setExpiryFilter(f.key)}
          aria-pressed={expiryFilter === f.key}
          className={pillClass(expiryFilter === f.key)}
        >
          {f.label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-trade-border-subtle" />
      {/* type multi-select */}
      {(Object.keys(DOC_TYPE_REGISTRY) as UnifiedDocType[]).map((t) => (
        <button
          key={t}
          onClick={() => setTypeFilter((p) => toggle(p, t))}
          aria-pressed={typeFilter.has(t)}
          className={pillClass(typeFilter.has(t))}
        >
          {DOC_TYPE_REGISTRY[t].label}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-trade-border-subtle" />
      {/* tone multi-select */}
      {TONE_FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => setToneFilter((p) => toggle(p, f.key))}
          aria-pressed={toneFilter.has(f.key)}
          className={pillClass(toneFilter.has(f.key))}
        >
          {f.label}
        </button>
      ))}
    </>
  );

  return (
    <TradeTable<UnifiedTradeDocumentRow>
      rows={visible}
      columns={columns}
      getRowId={(r) => r.id}
      rowHref={(r) => r.detailHref}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search reference or counterparty…",
      }}
      filters={filterSlot}
      resultCount={visible.length}
      initialSort={{ key: "validUntil", dir: "asc" }}
      emptyState={
        <EmptyStateRich
          icon={FileText}
          title="No documents match"
          description="Adjust the filters, or create documents from the per-type pages above."
        />
      }
    />
  );
}

// local helpers: toggle<T>(set, v) immutable add/remove; pillClass(active)
// returns the rounded-full active/inactive class string (lift verbatim
// from parties/page.tsx).
```

**Verify:** `npx tsc --noEmit && npm run lint`. **Commit:** `feat(trade): unified documents table — smart filters + expiry sort (ui phase 3d)`

---

## Task 4: Wire the page (`documents/page.tsx`)

**File:** Edit `src/app/(trade)/trade/documents/page.tsx`.

Convert to a server component that gates on `getTradeAuth()`, keeps the eight hub cards as a compact strip, fetches `listUnifiedDocuments(orgId)`, and renders `<UnifiedDocumentsTable rows={rows} />` beneath. Sketch:

```tsx
import { redirect } from "next/navigation";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { listUnifiedDocuments } from "@/lib/trade/unified-documents.server";
import { UnifiedDocumentsTable } from "./_components/UnifiedDocumentsTable";
// keep the existing DOC_TYPES card array + the card grid markup.

export const metadata = { title: "Dokumente — Caelex Trade" };

export default async function DocumentsPage() {
  const ctx = await getTradeAuth();
  if (!ctx) redirect("/login?callbackUrl=%2Ftrade%2Fdocuments");

  const rows = await listUnifiedDocuments(ctx.organizationId);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <h1 className="text-xl font-semibold text-trade-text-primary">
        Dokumente
      </h1>
      <p className="mt-1 text-sm text-trade-text-muted">
        Alle Genehmigungen &amp; Nachweise an einem Ort — sortiere nach Ablauf,
        um zu sehen, was als Nächstes erneuert werden muss.
      </p>

      {/* existing 8-card hub — keep as compact strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* …existing DOC_TYPES.map(...) cards unchanged… */}
      </div>

      {/* unified cross-type triage table */}
      <div className="mt-8">
        <h2 className="mb-3 text-[15px] font-semibold text-trade-text-primary">
          Alle Dokumente
        </h2>
        <UnifiedDocumentsTable rows={rows} />
      </div>
    </div>
  );
}
```

> Note: the file currently has no `"use client"`; the existing card array + icons stay. If keeping inline `lucide-react` icons in a server component causes any RSC complaint, move just the card grid into a tiny presentational child — but server components render lucide icons fine, so prefer leaving it inline.

**Verify:** `npx tsc --noEmit && npm run lint`. **Commit:** `feat(trade): unified documents view on /trade/documents hub (ui phase 3d)`

---

## Task 5: Spec amendment / status board

**File:** Edit the master plan status board (`docs/superpowers/plans/2026-05-30-caelex-trade-to-92-MASTER.md`) §4 — mark Phase 3D shipped (the redesign sprint it belongs to). If a per-phase status table exists for the UI redesign, tick 3D there too. Doc-only.

**Commit:** `docs(trade): mark ui phase 3d (unified documents) shipped`

---

## Task 6: Verify + batched deploy

This completes a batch (3A migrations + 3D). Per the batched-deploy policy, deploy now only if the 6–8-sprint threshold is met or the user says so; otherwise stop after Task 5 with everything committed locally.

- [ ] `npx vitest run src/lib/trade/unified-documents.test.ts` — green.
- [ ] `npx vitest run src/lib/trade/` — no regressions in sibling trade tests.
- [ ] `npx tsc --noEmit` — no NEW errors on touched files.
- [ ] `npm run lint` — clean on the four new/edited files.
- [ ] Manual smoke (`npm run dev`): visit `/trade/documents` → table renders all eight types; sort "Valid until" puts soonest-expiring first with null-expiry (VSDs) last; "≤ 30d" pill narrows to soon-expiring; a type pill narrows to one type; search by a counterparty name filters; clicking a row navigates to the correct per-type detail page.
- [ ] If deploying: `git checkout main && git pull --ff-only origin main && git merge fix/trade-to-92 --no-edit && git push origin main`. Skip the feature-branch push (no preview build).

---

## Independently-committable summary

| Task | Commit (lowercase subject)                                                          | Independently shippable?    |
| ---- | ----------------------------------------------------------------------------------- | --------------------------- |
| 1    | `feat(trade): pure unified-documents normalizer + expiry buckets (ui phase 3d)`     | Yes (pure module + tests)   |
| 2    | `feat(trade): unified-documents server aggregator — parallel fan-out (ui phase 3d)` | Yes (compiles on top of T1) |
| 3    | `feat(trade): unified documents table — smart filters + expiry sort (ui phase 3d)`  | Yes (component, tsc-gated)  |
| 4    | `feat(trade): unified documents view on /trade/documents hub (ui phase 3d)`         | Yes (wires it live)         |
| 5    | `docs(trade): mark ui phase 3d (unified documents) shipped`                         | Yes (doc-only)              |
| 6    | (deploy — no commit)                                                                | —                           |
