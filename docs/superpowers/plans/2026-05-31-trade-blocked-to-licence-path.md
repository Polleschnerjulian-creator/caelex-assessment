# Trade — "BLOCKED → what now" Licence-Application Path + Liability Framing (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the guided "Darf ich liefern?" verdict comes back 🟡 REVIEW or 🔴 BLOCKED, stop dead-ending the novice: render a **"Was jetzt?"** panel that names WHY, the **likely licence type + authority** (already computed by the engine), a **required-docs checklist**, and an **"Antrag vorbereiten"** action that builds a pre-filled DRAFT licence (reusing the Phase-3B renewal-draft discipline) the human confirms + files themselves. **Plus** make the **liability / over-trust framing** unmissable at the verdict (REVIEW & BLOCKED loud; GO honest; auto-classify/screen cues persistent-light).

**Architecture:** One new **pure, node-tested** module `src/lib/trade/license-application.ts` (select-strongest-requirement + map-to-`TradeLicenseType` + derive-required-docs + build-draft + portal-links + liability copy consts). UI: a `WasJetztPanel` + a `LicenseApplicationModal` (structural clone of `LicenseRenewalModal`), wired into the existing `VerdictPanel`. **Zero** new API route / cron / Notification / Prisma migration / runtime dependency. Components gated by **tsc + eslint + source review** (jsdom hangs on this machine — do NOT add component tests).

**Tech Stack:** Next.js 15 / React / TypeScript, Tailwind `--trade-*` tokens, lucide-react, Vitest (node only for the pure module).

**Branch:** `fix/trade-to-92`. Commit locally per task; deploy the whole batch at the end (per the CLAUDE.md batched-deploy policy). Each task below is independently committable.

**Verified facts (already read from the codebase — trust these):**

- `GET /api/trade/operations/[id]/assess` → `assessOperation()` returns `{ verdict, headline, steps[], pendenzen[], operationId, counterpartyId, lines[] }`; each `lines[].classification` is a `ClassificationResult` carrying `licenseDetermination: LicenseDetermination`. **The client already receives the per-line `licenseDetermination` — no new fetch/route needed.** (`src/lib/trade/operation-assistant.server.ts`, `.../[id]/assess/route.ts`)
- `LicenseDetermination` (from `src/lib/comply-v2/trade/license-determination.ts`) = `{ requirements: LicenseRequirement[]; gate: "CLEARED"|"REVIEW_NEEDED"|"BLOCKED"; mtcrCatIBlock; itarBlock; embargoBlock; annexIVBlock; nextSteps: string[]; applicableExceptions?; disclaimer: string }`.
- `LicenseRequirement` = `{ jurisdiction: string; authority: "BIS"|"DDTC"|"BAFA"|"EU_COMPETENT_AUTHORITY"|"MTCR_REVIEW"; status: "REQUIRED"|"LIKELY_REQUIRED"|"EXCEPTION_MAY_APPLY"|"NLR"|"DENIED"|"PROHIBITED"|"UNKNOWN"; licenseType: "SPECIFIC_LICENSE"|"LICENSE_EXCEPTION"|"GENERAL_LICENSE"|"NLR"|"TAA"|"DSP5"|"BAFA_ANTRAG"|null; reason: string; recommendedAction: string; triggerCode?; applicableException? }`.
- `POST /api/trade/licenses` accepts `{ licenseType: TradeLicenseType, licenseNumber?, issuedAt?(datetime), validUntil?(datetime), conditions: Record<string,unknown>, totalCapValue?(number, euros), capCurrency(3), status: TradeLicenseStatus, documentId? }` → returns `{ license }` (cents already serialised to euros). **No `[id]`/PATCH route exists; none is added.** (`src/app/api/trade/licenses/route.ts`)
- `TradeLicenseType` enum: `BAFA_EINZEL, BAFA_AGG_12/16/27/47, BAFA_EUGEA_EU001/EU002, BIS_EAR, BIS_LICENSE_EXCEPTION_STA/CSA/ENC, DDTC_DSP5, DDTC_DSP73, DDTC_TAA, DDTC_MLA, OTHER`. `TradeLicenseStatus`: `DRAFT, PENDING, ACTIVE, REVOKED, EXPIRED, EXHAUSTED`. (`prisma/schema.prisma`)
- `TYPE_META` (label/jurisdiction/group BAFA|BIS|DDTC|EU|OTHER) is in `src/app/(trade)/trade/licenses/_components/license-types.ts` — reuse it in the panel + modal for the type label/badge.
- Phase-3B `buildLicenseRenewalDraft(prior)` (`src/lib/trade/license-renewal.ts`) is the clone-prefill template: copies substance, **blanks** number/issuedAt/validUntil, stamps `conditions.renewalOf`, returns `status:"DRAFT"` + `carriedSummary` + verbatim `disclaimer`. `LicenseRenewalModal.tsx` is the modal template (POSTs to `/api/trade/licenses`, shows disclaimer verbatim, `useToast`).
- `VerdictPanel` (`src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx`) renders the verdict headline + 5-step list + classification `<details>` + pendenzen + "Erneut prüfen"/"Zum Vorgang" buttons. It already holds the full `assessment` in state. `--trade-*` tokens + lucide icons + `VERDICT_CLASS` amber/red classes are already there.
- Operation fields available for prefill: `reference, description, shipFromCountry, shipToCountry, endUseCountry?, declaredEndUse, endUserName?` on `TradeOperation`; per line: `quantity, unitValue(BigInt cents), unitCurrency, item{ name, eccnEU, eccnUS, usmlCategory }`. (But the assess API response exposes only `lines[].itemName` + `classification` + `counterpartyId` — see Task 4 note on what the panel can read vs. what it must request.)
- `--trade-*` token names in use: `trade-bg-panel, trade-bg-elevated, trade-bg-subtle, trade-border, trade-border-subtle, trade-text-primary, trade-text-secondary, trade-text-muted, trade-accent, trade-accent-strong, trade-accent-soft, trade-hover`. Emerald/amber/red verdict colours via Tailwind `emerald-*/amber-*/red-*`.
- Test convention: pure modules get `*.test.ts` co-located, `import { describe, it, expect } from "vitest"`, injectable `now`/fixtures (see `license-renewal.test.ts`).

---

## Task 1: Pure `license-application.ts` — types + `selectApplicationTarget` + `mapToTradeLicenseType` (TDD)

**Files:**

- Create: `src/lib/trade/license-application.ts`
- Test: `src/lib/trade/license-application.test.ts`

- [ ] **Step 1 (RED): write the failing test** (selection + mapping portion):

```ts
import { describe, it, expect } from "vitest";
import {
  selectApplicationTarget,
  mapToTradeLicenseType,
  type EngineDetermination,
} from "./license-application";

// Minimal LicenseDetermination fixtures (only the fields the module reads).
function det(
  reqs: Array<Partial<EngineDetermination["requirements"][number]>>,
  gate: EngineDetermination["gate"] = "REVIEW_NEEDED",
): EngineDetermination {
  return {
    gate,
    requirements: reqs.map((r) => ({
      jurisdiction: "X",
      authority: "BAFA",
      status: "REQUIRED",
      licenseType: "BAFA_ANTRAG",
      reason: "r",
      recommendedAction: "a",
      ...r,
    })),
    mtcrCatIBlock: false,
    itarBlock: false,
    embargoBlock: false,
    annexIVBlock: false,
    nextSteps: [],
    disclaimer: "d",
  } as EngineDetermination;
}

describe("selectApplicationTarget", () => {
  it("returns null when no determinations / no actionable requirement", () => {
    expect(selectApplicationTarget([])).toBeNull();
    expect(
      selectApplicationTarget([det([{ status: "NLR", licenseType: "NLR" }])]),
    ).toBeNull();
  });

  it("prefers the most severe status across all lines (PROHIBITED > DENIED > REQUIRED > LIKELY > UNKNOWN)", () => {
    const t = selectApplicationTarget([
      det([{ status: "REQUIRED", authority: "BAFA" }]),
      det([
        {
          status: "PROHIBITED",
          authority: "EU_COMPETENT_AUTHORITY",
          licenseType: null,
        },
      ]),
      det([{ status: "LIKELY_REQUIRED", authority: "BIS" }]),
    ]);
    expect(t?.requirement.status).toBe("PROHIBITED");
    expect(t?.blocked).toBe(true);
  });

  it("within REQUIRED, picks by deterministic authority order (DDTC, then BIS, then BAFA, then EU)", () => {
    const t = selectApplicationTarget([
      det([
        { status: "REQUIRED", authority: "BAFA", licenseType: "BAFA_ANTRAG" },
      ]),
      det([{ status: "REQUIRED", authority: "DDTC", licenseType: "DSP5" }]),
    ]);
    expect(t?.requirement.authority).toBe("DDTC");
    expect(t?.blocked).toBe(false);
  });

  it("flags blocked for DENIED and MTCR too", () => {
    expect(
      selectApplicationTarget([
        det([
          {
            status: "DENIED",
            authority: "BIS",
            licenseType: "SPECIFIC_LICENSE",
          },
        ]),
      ])?.blocked,
    ).toBe(true);
  });
});

describe("mapToTradeLicenseType", () => {
  it("is total: every engine (authority, type) pair maps to a concrete TradeLicenseType", () => {
    const pairs = [
      ["BAFA", "BAFA_ANTRAG"],
      ["BAFA", "SPECIFIC_LICENSE"],
      ["BAFA", null],
      ["EU_COMPETENT_AUTHORITY", "GENERAL_LICENSE"],
      ["EU_COMPETENT_AUTHORITY", null],
      ["DDTC", "DSP5"],
      ["DDTC", "TAA"],
      ["DDTC", "SPECIFIC_LICENSE"],
      ["DDTC", null],
      ["BIS", "SPECIFIC_LICENSE"],
      ["BIS", "LICENSE_EXCEPTION"],
      ["BIS", null],
      ["MTCR_REVIEW", null],
    ] as const;
    for (const [auth, lt] of pairs) {
      const m = mapToTradeLicenseType(auth, lt);
      expect(typeof m.tradeLicenseType).toBe("string");
      expect(m.tradeLicenseType.length).toBeGreaterThan(0);
    }
  });

  it("maps BAFA→BAFA_EINZEL, DDTC DSP5→DDTC_DSP5, DDTC TAA→DDTC_TAA, BIS→BIS_EAR", () => {
    expect(mapToTradeLicenseType("BAFA", "BAFA_ANTRAG").tradeLicenseType).toBe(
      "BAFA_EINZEL",
    );
    expect(mapToTradeLicenseType("DDTC", "DSP5").tradeLicenseType).toBe(
      "DDTC_DSP5",
    );
    expect(mapToTradeLicenseType("DDTC", "TAA").tradeLicenseType).toBe(
      "DDTC_TAA",
    );
    expect(
      mapToTradeLicenseType("BIS", "SPECIFIC_LICENSE").tradeLicenseType,
    ).toBe("BIS_EAR");
  });

  it("hedges (approximate=true) when the engine type is ambiguous", () => {
    expect(mapToTradeLicenseType("BIS", "SPECIFIC_LICENSE").approximate).toBe(
      true,
    );
    expect(mapToTradeLicenseType("BAFA", "BAFA_ANTRAG").approximate).toBe(true); // could be AGG/EUGEA
    expect(mapToTradeLicenseType("MTCR_REVIEW", null).approximate).toBe(true);
  });
});
```

Run `npx vitest run src/lib/trade/license-application.test.ts` — MUST fail (module/exports absent).

- [ ] **Step 2 (GREEN): implement the selection + mapping** in `src/lib/trade/license-application.ts`:

```ts
/**
 * Caelex Trade — "BLOCKED → what now" licence-application path.
 *
 * PURE module: no React, no DB, no I/O, no Anthropic. It is a POST-PROCESSOR
 * over the verdict engine's existing per-line `LicenseDetermination` output.
 * It answers, for a non-GO verdict: which single licence application is the
 * actionable next step, which fine-grained TradeLicenseType it maps to, which
 * documents it needs, and a pre-filled DRAFT create-payload the human confirms
 * + files themselves. It NEVER submits and is NOT legal advice.
 *
 * Mirrors the Phase-3B renewal discipline (license-renewal.ts):
 * clone/prefill, blank the authority number + dates, stamp lineage in
 * conditions, return status "DRAFT" + verbatim disclaimer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  LicenseDetermination,
  LicenseRequirement,
  LicenseAuthority,
  LicenseType as EngineLicenseType,
} from "@/lib/comply-v2/trade/license-determination";
import type { TradeLicenseType } from "@prisma/client";

export type EngineDetermination = LicenseDetermination;

// ─── Severity + authority ordering (deterministic selection) ──────────

// Higher = more severe / higher priority to surface.
const STATUS_SEVERITY: Record<LicenseRequirement["status"], number> = {
  PROHIBITED: 60,
  DENIED: 50,
  REQUIRED: 40,
  LIKELY_REQUIRED: 30,
  UNKNOWN: 20,
  EXCEPTION_MAY_APPLY: 10,
  NLR: 0,
};

// When statuses tie, this authority order breaks the tie (most
// "no-derogation / item-intrinsic" first). DDTC (ITAR) cannot be
// derogated intra-EU; BIS next; then BAFA/EU.
const AUTHORITY_ORDER: Record<LicenseAuthority, number> = {
  DDTC: 4,
  BIS: 3,
  BAFA: 2,
  EU_COMPETENT_AUTHORITY: 1,
  MTCR_REVIEW: 0,
};

/** A requirement is "actionable enough to surface" if it isn't a pure NLR. */
function isSurfaceable(r: LicenseRequirement): boolean {
  return r.status !== "NLR";
}

/** A surfaced target is "blocked" (no application path) for these statuses. */
function isBlockedStatus(status: LicenseRequirement["status"]): boolean {
  return status === "DENIED" || status === "PROHIBITED";
}

export interface ApplicationTarget {
  /** The single strongest requirement across all lines. */
  requirement: LicenseRequirement;
  /** True when no application is possible (DENIED/PROHIBITED/MTCR) → stop state. */
  blocked: boolean;
}

/**
 * Pick the single strongest actionable LicenseRequirement across every
 * classified line's determination. Most-severe status wins; ties broken
 * by authority order; null when nothing is surfaceable (e.g. all NLR / GO).
 */
export function selectApplicationTarget(
  determinations: EngineDetermination[],
): ApplicationTarget | null {
  let best: LicenseRequirement | null = null;
  for (const det of determinations) {
    for (const r of det.requirements) {
      if (!isSurfaceable(r)) continue;
      if (best === null) {
        best = r;
        continue;
      }
      const sevDelta = STATUS_SEVERITY[r.status] - STATUS_SEVERITY[best.status];
      if (sevDelta > 0) best = r;
      else if (
        sevDelta === 0 &&
        AUTHORITY_ORDER[r.authority] > AUTHORITY_ORDER[best.authority]
      ) {
        best = r;
      }
    }
  }
  if (best === null) return null;
  // MTCR_REVIEW is inherently a stop even if mislabelled — treat as blocked.
  const blocked =
    isBlockedStatus(best.status) || best.authority === "MTCR_REVIEW";
  return { requirement: best, blocked };
}

// ─── Engine type → fine-grained TradeLicenseType (conservative) ───────

export interface MappedLicenseType {
  tradeLicenseType: TradeLicenseType;
  /**
   * True when the mapping is a best-guess (the engine type is coarser than
   * the enum). The UI MUST hedge ("wahrscheinliche Einstufung — bestätigen")
   * when this is set.
   */
  approximate: boolean;
}

/**
 * Map the engine's coarse (authority, licenseType) onto the fileable
 * TradeLicenseType enum. TOTAL (never throws, never null) and CONSERVATIVE:
 * when ambiguous, pick the safest *individual/specific* licence of that
 * authority and flag `approximate` so the UI hedges.
 */
export function mapToTradeLicenseType(
  authority: LicenseAuthority,
  engineLicenseType: EngineLicenseType | null,
): MappedLicenseType {
  switch (authority) {
    case "DDTC":
      if (engineLicenseType === "TAA")
        return { tradeLicenseType: "DDTC_TAA", approximate: false };
      // DSP5 / SPECIFIC_LICENSE / null → individual DSP-5 export licence.
      return {
        tradeLicenseType: "DDTC_DSP5",
        approximate: engineLicenseType !== "DSP5",
      };
    case "BIS":
      // EAR specific licence is the safe default; STA/ENC etc. are exceptions
      // the operator confirms, so we do NOT auto-pick an exception type here.
      return { tradeLicenseType: "BIS_EAR", approximate: true };
    case "BAFA":
      // Einzelausfuhrgenehmigung is the safe default; AGG/EUGEA are
      // general authorisations the operator confirms eligibility for.
      return { tradeLicenseType: "BAFA_EINZEL", approximate: true };
    case "EU_COMPETENT_AUTHORITY":
      // EU national competent authority for a DE operator → route via BAFA.
      return { tradeLicenseType: "BAFA_EINZEL", approximate: true };
    case "MTCR_REVIEW":
      // No fileable individual licence — caller treats as blocked; OTHER as
      // a non-misleading placeholder (a draft is never built for this).
      return { tradeLicenseType: "OTHER", approximate: true };
    default:
      return { tradeLicenseType: "OTHER", approximate: true };
  }
}
```

Run the test — MUST pass. `npx tsc --noEmit` clean on the new file.

- [ ] **Step 3:** `git add -A && git commit` — `feat(trade): pure license-application select+map (blocked→licence path)`.

---

## Task 2: `deriveRequiredDocuments` + `authorityPortal` + liability copy consts (TDD)

**Files:** extend `src/lib/trade/license-application.ts` + `…test.ts`.

- [ ] **Step 1 (RED): add failing tests:**

```ts
import {
  deriveRequiredDocuments,
  authorityPortal,
  LIABILITY_COPY,
  APPLICATION_DISCLAIMER,
} from "./license-application";

describe("deriveRequiredDocuments", () => {
  const reqBAFA = {
    authority: "BAFA",
    status: "REQUIRED",
    licenseType: "BAFA_ANTRAG",
    jurisdiction: "Export to RU",
    reason: "r",
    recommendedAction: "a",
  } as const;
  const reqDDTC = {
    authority: "DDTC",
    status: "REQUIRED",
    licenseType: "DSP5",
    jurisdiction: "US (ITAR)",
    reason: "r",
    recommendedAction: "a",
  } as const;
  const reqDenied = {
    authority: "BIS",
    status: "DENIED",
    licenseType: "SPECIFIC_LICENSE",
    jurisdiction: "embargo",
    reason: "Embargo",
    recommendedAction: "stop",
  } as const;

  it("BAFA REQUIRED → includes a mandatory EUC with a /trade/euc link", () => {
    const r = deriveRequiredDocuments({ requirement: reqBAFA, blocked: false });
    expect(r.stopGuidance).toBeUndefined();
    const euc = r.documents.find((d) => d.key === "EUC");
    expect(euc?.mandatory).toBe(true);
    expect(euc?.actionHref).toBe("/trade/euc");
  });

  it("DDTC REQUIRED → includes DS-83 / end-use statement", () => {
    const r = deriveRequiredDocuments({ requirement: reqDDTC, blocked: false });
    expect(
      r.documents.some((d) => d.key === "DDTC_DS83" || d.key === "EUC"),
    ).toBe(true);
  });

  it("blocked target → NO documents, returns stopGuidance instead", () => {
    const r = deriveRequiredDocuments({
      requirement: reqDenied,
      blocked: true,
    });
    expect(r.documents).toHaveLength(0);
    expect(r.stopGuidance && r.stopGuidance.length).toBeGreaterThan(0);
  });
});

describe("authorityPortal", () => {
  it("returns a label + url for each authority", () => {
    expect(authorityPortal("BAFA").url).toContain("bafa");
    expect(authorityPortal("DDTC").label.length).toBeGreaterThan(0);
    expect(authorityPortal("BIS").url).toContain("http");
  });
});

describe("liability copy", () => {
  it("REVIEW/BLOCKED banner carries the mandatory phrases", () => {
    expect(LIABILITY_COPY.verdictBanner).toMatch(/keine Rechtsberatung/i);
    expect(LIABILITY_COPY.verdictBanner).toMatch(
      /Verantwortung bleibt bei dir/i,
    );
    expect(LIABILITY_COPY.verdictBanner).toMatch(/fachkundige Freigabe/i);
  });
  it("GO note is honest about ongoing obligations (record-keeping)", () => {
    expect(LIABILITY_COPY.goNote).toMatch(/5 Jahre/);
    expect(LIABILITY_COPY.goNote).toMatch(/re-?verifizieren/i);
  });
  it("auto-suggest cue + application disclaimer say it's not a clearance / not submitted", () => {
    expect(LIABILITY_COPY.autoSuggestCue).toMatch(/Vorschlag/i);
    expect(APPLICATION_DISCLAIMER).toMatch(
      /reicht .* NICHTS ein|nicht ein|kein.* Antrag.* eingereicht/i,
    );
    expect(APPLICATION_DISCLAIMER).toMatch(/keine Rechtsberatung/i);
  });
});
```

- [ ] **Step 2 (GREEN): implement** (append to `license-application.ts`):

```ts
// ─── Required-documents derivation ────────────────────────────────────

export interface RequiredDoc {
  key: string;
  label: string;
  why: string;
  mandatory: boolean;
  actionHref?: string;
}

export interface RequiredDocsResult {
  documents: RequiredDoc[];
  /** Set ONLY for blocked targets — replaces the docs/apply UI with a stop. */
  stopGuidance?: string;
}

const EUC_DOC: RequiredDoc = {
  key: "EUC",
  label: "Endverbleibserklärung (EUC)",
  why: "Die Behörde verlangt eine unterschriebene Endverbleibs-/Endverwendungs­erklärung des Endempfängers.",
  mandatory: true,
  actionHref: "/trade/euc",
};
const TECH_SPEC_DOC: RequiredDoc = {
  key: "TECH_SPEC",
  label: "Technische Spezifikation des Guts",
  why: "Beleg der Gütereigenschaften für die Einstufung im Antrag.",
  mandatory: true,
};
const BOM_DOC: RequiredDoc = {
  key: "BOM",
  label: "Stückliste / Bill of Materials",
  why: "Stützt De-minimis / Ursprungsangaben.",
  mandatory: false,
};

/**
 * Per-authority required-docs lookup. Static (no external call). For a
 * blocked target, returns NO documents and a stopGuidance string — a novice
 * must never be invited to "prepare an application" for a hard-blocked export.
 */
export function deriveRequiredDocuments(
  target: ApplicationTarget,
): RequiredDocsResult {
  if (target.blocked) {
    return {
      documents: [],
      stopGuidance:
        `Kein Genehmigungsantrag möglich: ${target.requirement.reason} ` +
        `Vorgang abbrechen und Abbruch dokumentieren, Parteiidentität gegen die ` +
        `aktuelle Liste re-verifizieren und qualifizierte Exportkontroll-Rechtsberatung ` +
        `hinzuziehen, bevor irgendetwas unternommen wird.`,
    };
  }
  switch (target.requirement.authority) {
    case "DDTC":
      return {
        documents: [
          { ...EUC_DOC, label: "End-Use Certificate / DSP-83", key: "DDTC_DS83" },
          TECH_SPEC_DOC,
          {
            key: "LOE",
            label: "Letter of Explanation + Endempfänger-Angaben",
            why: "DDTC verlangt eine Begründung und vollständige Consignee/End-User-Angaben.",
            mandatory: true,
          },
        ],
      };
    case "BIS":
      return {
        documents: [
          {
            key: "BIS_711",
            label: "BIS-711 (Statement by Ultimate Consignee & Purchaser)",
            why: "Pflichtformular für eine BIS-Einzelgenehmigung (15 CFR §748).",
            mandatory: true,
          },
          TECH_SPEC_DOC,
          {
            key: "END_USE_STMT",
            label: "End-Use / End-User-Erklärung",
            why: "BIS verlangt Angaben zu Endverwendung und Endempfänger.",
            mandatory: true,
          },
        ],
      };
    case "BAFA":
    case "EU_COMPETENT_AUTHORITY":
    default:
      return { documents: [EUC_DOC, TECH_SPEC_DOC, BOM_DOC] };
  }
}

// ─── Authority portal deep-links ──────────────────────────────────────

export function authorityPortal(authority: LicenseAuthority): {
  label: string;
  url: string;
} {
  switch (authority) {
    case "DDTC":
      return { label: "DDTC DECCS", url: "https://www.pmddtc.state.gov/" };
    case "BIS":
      return { label: "BIS SNAP-R", url: "https://www.bis.doc.gov/" };
    case "BAFA":
    case "EU_COMPETENT_AUTHORITY":
    default:
      return { label: "BAFA ELAN-K2", url: "https://elan.bafa.bund.de/" };
  }
}

// ─── Liability / over-trust copy — SINGLE SOURCE OF TRUTH ─────────────

export const APPLICATION_DISCLAIMER =
  "Caelex bereitet hier nur einen internen ENTWURF (DRAFT) vor und reicht " +
  "NICHTS bei BAFA / BIS / DDTC ein. Den Antrag musst du selbst über den " +
  "Behördenkanal (BAFA ELAN-K2, BIS SNAP-R, DDTC DECCS) einreichen und vor " +
  "jeder Lieferung alle Bedingungen gegen den erteilten Bescheid re-verifizieren. " +
  "Dies ist keine Rechtsberatung und ersetzt keinen qualifizierten " +
  "Ausfuhrverantwortlichen. Die vorbefüllten Angaben sind ein Ausgangspunkt, " +
  "keine Garantie — die Behörde kann andere Bedingungen festlegen.";

export const LIABILITY_COPY = {
  /** LOUDEST: under the verdict headline on REVIEW & BLOCKED. */
  verdictBanner:
    "Entscheidungsunterstützung — keine Freigabe. Caelex klassifiziert und " +
    "screent automatisch, um dir Arbeit abzunehmen — die Verantwortung bleibt " +
    "bei dir. Bei „Prüfung nötig" / „Verboten" und in jedem Zweifelsfall vor der " +
    "Lieferung fachkundige Freigabe einholen (qualifizierter Ausfuhrverantwortlicher / Rechtsberatung).",
  /** HONEST GREEN: under the verdict headline on GO. */
  goNote:
    "Darf liefern — aber nicht „nichts tun". Auch ohne Genehmigung gelten " +
    "Pflichten: Ausfuhrnachweise 5 Jahre aufbewahren, EUC/Endverwendung " +
    "dokumentieren und vor jeder Lieferung re-verifizieren (Einstufung, " +
    "Empfänger, Ziel können sich ändern). Bei neuen Erkenntnissen erneut prüfen.",
  /** PERSISTENT-LIGHT: inline near auto-classify / auto-screen claims. */
  autoSuggestCue:
    "Automatisch — als Vorschlag, nicht als Freigabe. Endgültige Einstufung " +
    "bestätigt der Ausfuhrverantwortliche.",
} as const;
```

Run tests + `npx tsc --noEmit` — MUST pass.

- [ ] **Step 3:** commit — `feat(trade): required-docs deriver + authority portals + liability copy`.

---

## Task 3: `buildLicenseApplicationDraft` — clone/prefill (TDD)

**Files:** extend `src/lib/trade/license-application.ts` + `…test.ts`.

- [ ] **Step 1 (RED): add failing tests:**

```ts
import {
  buildLicenseApplicationDraft,
  type OperationContext,
} from "./license-application";

const ctx: OperationContext = {
  operationId: "op_1",
  reference: "AV-RU-ABC",
  counterpartyName: "Acme Foreign GmbH",
  shipToCountry: "RU",
  endUseCountry: null,
  declaredEndUse: "CIVIL",
  triggerCodes: ["9A515.a"],
  totalValueEur: 250000,
  currency: "EUR",
};
const reqBAFA = {
  authority: "BAFA",
  status: "REQUIRED",
  licenseType: "BAFA_ANTRAG",
  jurisdiction: "Export to RU",
  reason: "EU-Anhang-I-Dual-Use, Ausfuhr nach RU",
  recommendedAction: "ELAN-K2",
} as const;

describe("buildLicenseApplicationDraft", () => {
  const draft = buildLicenseApplicationDraft(
    { requirement: reqBAFA, blocked: false },
    ctx,
  );

  it("maps to a fileable TradeLicenseType (BAFA_EINZEL) and flags approximate", () => {
    expect(draft.licenseType).toBe("BAFA_EINZEL");
    expect(draft.approximate).toBe(true);
  });
  it("DELIBERATELY blanks authority number + both dates (never fabricated)", () => {
    expect(draft.licenseNumber).toBeUndefined();
    expect(draft.issuedAt).toBeUndefined();
    expect(draft.validUntil).toBeUndefined();
  });
  it("status is DRAFT and lineage is stamped via conditions.applicationFor", () => {
    expect(draft.status).toBe("DRAFT");
    expect(draft.conditions.applicationFor).toBe("op_1");
  });
  it("pre-fills coveredCodes (trigger), coveredCountries (destination), end-use, cap", () => {
    expect(draft.conditions.coveredCodes).toEqual(["9A515.a"]);
    expect(draft.conditions.coveredCountries).toEqual(["RU"]);
    expect(draft.conditions.endUseRestrictions).toEqual([
      "civilian end-use only",
    ]);
    expect(draft.totalCapValue).toBe(250000);
    expect(draft.capCurrency).toBe("EUR");
  });
  it("carries the verbatim disclaimer + a human carriedSummary", () => {
    expect(draft.disclaimer).toBe(APPLICATION_DISCLAIMER);
    expect(draft.carriedSummary).toMatch(/AV-RU-ABC/);
  });
  it("THROWS for a blocked target (no draft for a hard-blocked export)", () => {
    expect(() =>
      buildLicenseApplicationDraft(
        {
          requirement: { ...reqBAFA, status: "PROHIBITED", licenseType: null },
          blocked: true,
        },
        ctx,
      ),
    ).toThrow();
  });
});
```

- [ ] **Step 2 (GREEN): implement** (append):

```ts
// ─── Application-draft builder (clone/prefill — mirrors renewal) ──────

export interface OperationContext {
  operationId: string;
  reference: string;
  counterpartyName: string;
  shipToCountry: string;
  endUseCountry: string | null;
  declaredEndUse: "CIVIL" | "DUAL_USE" | "MILITARY" | "WMD_RELATED";
  /** ECCN/USML codes that triggered the requirement (for conditions.coveredCodes). */
  triggerCodes: string[];
  /** Σ line value as a STARTING cap (euros — API serialises cents→euros). */
  totalValueEur: number | null;
  currency: string;
}

export interface LicenseApplicationDraft {
  licenseType: TradeLicenseType;
  /** UI hedges "wahrscheinliche Einstufung — bestätigen" when true. */
  approximate: boolean;
  licenseNumber: undefined; // authority no. unknown until issued — NEVER fabricated
  issuedAt: undefined;
  validUntil: undefined;
  totalCapValue: number | null; // starting cap
  capCurrency: string;
  conditions: Record<string, unknown>; // coveredCodes/Countries + endUse + applicationFor + notes
  status: "DRAFT";
  carriedSummary: string;
  disclaimer: string;
}

const END_USE_RESTRICTION: Record<
  OperationContext["declaredEndUse"],
  string[]
> = {
  CIVIL: ["civilian end-use only"],
  DUAL_USE: ["dual-use — end-use to be confirmed"],
  MILITARY: ["military end-use declared"],
  WMD_RELATED: ["WMD-related end-use flagged — seek counsel"],
};

/**
 * Clone the operation/item/party context into a new-licence DRAFT payload.
 * Deterministic field-copy — no LLM, no network — mirroring
 * buildLicenseRenewalDraft. The authority number + dates are intentionally
 * blank (a fresh application has none until issued). THROWS for a blocked
 * target: there is no licence application for a hard-blocked export.
 */
export function buildLicenseApplicationDraft(
  target: ApplicationTarget,
  ctx: OperationContext,
): LicenseApplicationDraft {
  if (target.blocked) {
    throw new Error(
      "buildLicenseApplicationDraft called for a blocked target — no application path exists.",
    );
  }
  const { tradeLicenseType, approximate } = mapToTradeLicenseType(
    target.requirement.authority,
    target.requirement.licenseType,
  );

  const coveredCountries = [ctx.shipToCountry];
  if (ctx.endUseCountry && ctx.endUseCountry !== ctx.shipToCountry) {
    coveredCountries.push(ctx.endUseCountry);
  }

  const conditions: Record<string, unknown> = {
    coveredCodes: [...ctx.triggerCodes],
    coveredCountries,
    endUseRestrictions: END_USE_RESTRICTION[ctx.declaredEndUse],
    applicationFor: ctx.operationId, // lineage (mirrors renewalOf) — no migration
    notes:
      `Antragsentwurf aus Vorgang ${ctx.reference}; Gegenpartei ${ctx.counterpartyName}; ` +
      `Grund: ${target.requirement.reason}`,
  };

  const carriedSummary =
    `Vorbefüllt aus Vorgang ${ctx.reference} — Lizenztyp, betroffene Codes, ` +
    `Zielland und Endverwendung. Nummer, Ausstellungsdatum und Gültigkeit ` +
    `trägst du ein, sobald die Behörde die Genehmigung erteilt.`;

  return {
    licenseType: tradeLicenseType,
    approximate,
    licenseNumber: undefined,
    issuedAt: undefined,
    validUntil: undefined,
    totalCapValue: ctx.totalValueEur,
    capCurrency: ctx.currency,
    conditions,
    status: "DRAFT",
    carriedSummary,
    disclaimer: APPLICATION_DISCLAIMER,
  };
}
```

Run full `npx vitest run src/lib/trade/license-application.test.ts` + `npx tsc --noEmit` — MUST pass.

- [ ] **Step 3:** commit — `feat(trade): buildLicenseApplicationDraft clone/prefill (blanks no.+dates)`.

---

## Task 4: `LicenseApplicationModal` + `WasJetztPanel` components (gated: tsc + eslint + source)

> **No component tests** (jsdom hangs). Verify with `npx tsc --noEmit` + `npx eslint <files>` + careful source review against the sketches.

**Files:**

- Create: `src/app/(trade)/trade/operations/new/_components/LicenseApplicationModal.tsx`
- Create: `src/app/(trade)/trade/operations/new/_components/WasJetztPanel.tsx`

- [ ] **Step 1: `LicenseApplicationModal.tsx`** — a structural clone of `LicenseRenewalModal`. Differences: title "Antrag vorbereiten", seeded from a `LicenseApplicationDraft` (not a prior licence), shows the `approximate` hedge, and on success surfaces the authority deep-link. Sketch (abbreviated — copy the renewal modal's input/label consts, disclaimer block, POST shape, `useToast` verbatim):

```tsx
"use client";

import { useMemo, useState } from "react";
import { X, FileText, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  buildLicenseApplicationDraft,
  authorityPortal,
  type ApplicationTarget,
  type OperationContext,
} from "@/lib/trade/license-application";
import { TYPE_META, type LicenseType } from "@/app/(trade)/trade/licenses/_components/license-types";

const inputClass =
  "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary";

export function LicenseApplicationModal({
  target,
  ctx,
  onClose,
  onCreated,
}: {
  target: ApplicationTarget;
  ctx: OperationContext;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const toast = useToast();
  const draft = useMemo(() => buildLicenseApplicationDraft(target, ctx), [target, ctx]);
  const portal = authorityPortal(target.requirement.authority);
  const typeMeta = TYPE_META[draft.licenseType as LicenseType] ?? TYPE_META.OTHER;

  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [totalCapValue, setTotalCapValue] = useState(
    draft.totalCapValue !== null ? String(draft.totalCapValue) : "",
  );
  const [capCurrency, setCapCurrency] = useState(draft.capCurrency);
  const [notes, setNotes] = useState(
    typeof draft.conditions.notes === "string" ? draft.conditions.notes : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const conditions: Record<string, unknown> = { ...draft.conditions };
      if (notes.trim()) conditions.notes = notes.trim();
      else delete conditions.notes;
      const capValue = totalCapValue ? parseFloat(totalCapValue) : undefined;

      const res = await fetch("/api/trade/licenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          licenseType: draft.licenseType,
          // NEVER send licenseNumber — unknown until the authority issues it.
          issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          totalCapValue: capValue,
          capCurrency: capCurrency.toUpperCase(),
          conditions,
          status: "DRAFT",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Entwurf konnte nicht erstellt werden"); return; }
      setCreated(true);
      onCreated?.();
      toast.success(
        "Antragsentwurf erstellt",
        "Ein DRAFT wurde unter „Genehmigungen" angelegt. Reiche ihn selbst beim Behördenkanal ein und re-verifiziere alle Bedingungen vor jeder Lieferung.",
      );
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-trade-text-primary">Antrag vorbereiten</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-trade-text-secondary">
              <span className="font-semibold text-trade-text-primary">{typeMeta.label}</span>
              <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
                {typeMeta.jurisdiction}
              </span>
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Schließen"
          className="rounded-md p-1 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Approximate-type hedge */}
      {draft.approximate && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Wahrscheinliche Einstufung als {typeMeta.label}. Bestätige den genauen Lizenztyp vor der Einreichung.
        </p>
      )}

      <p className="mb-4 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2 text-[12px] leading-relaxed text-trade-text-secondary">
        {draft.carriedSummary}
      </p>

      {/* (Carried conditions surface + editable dates/cap/notes — COPY the
          read-only conditions block + the issued/validUntil/cap/notes grid
          verbatim from LicenseRenewalModal.) */}

      <form onSubmit={submit}>
        {/* …editable fields grid (same as renewal modal)… */}

        <p lang="de" className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{draft.disclaimer}</span>
        </p>

        {err && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</div>}

        <div className="mt-4 flex items-center justify-end gap-2">
          {created && (
            <a href={portal.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 rounded-md border border-trade-border px-4 py-2 text-[13px] font-semibold text-trade-accent transition hover:bg-trade-hover">
              {`Jetzt bei ${portal.label} einreichen`} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button type="button" onClick={onClose}
            className="rounded-md border border-trade-border bg-trade-bg-panel px-4 py-2 text-[13px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary">
            {created ? "Schließen" : "Abbrechen"}
          </button>
          {!created && (
            <button type="submit" disabled={submitting}
              className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "Erstelle…" : "Entwurf erstellen"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: `WasJetztPanel.tsx`** — consumes the already-loaded determinations, renders the REVIEW (actionable) vs BLOCKED (stop) layouts from the spec, and opens the modal. Sketch:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  XCircle,
  ExternalLink,
  FileText,
  CheckSquare,
} from "lucide-react";
import {
  selectApplicationTarget,
  deriveRequiredDocuments,
  authorityPortal,
  type EngineDetermination,
  type OperationContext,
} from "@/lib/trade/license-application";
import {
  TYPE_META,
  type LicenseType,
} from "@/app/(trade)/trade/licenses/_components/license-types";
import { mapToTradeLicenseType } from "@/lib/trade/license-application";
import { LicenseApplicationModal } from "./LicenseApplicationModal";

export function WasJetztPanel({
  determinations,
  ctx,
  onDraftCreated,
}: {
  determinations: EngineDetermination[];
  ctx: OperationContext;
  onDraftCreated?: () => void;
}) {
  const target = useMemo(
    () => selectApplicationTarget(determinations),
    [determinations],
  );
  const [open, setOpen] = useState(false);
  if (!target) return null; // GO / nothing actionable

  const docs = deriveRequiredDocuments(target);
  const portal = authorityPortal(target.requirement.authority);

  // ── BLOCKED: stop state (no apply path) ──
  if (target.blocked) {
    return (
      <section
        className="rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-4"
        data-testid="was-jetzt-blocked"
      >
        <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-red-200">
          <XCircle className="h-5 w-5" /> Was jetzt? — Lieferung verboten, kein
          Antrag möglich
        </div>
        <p className="mb-2 text-sm text-trade-text-secondary">
          <strong>Warum?</strong> {target.requirement.reason}
        </p>
        <p className="text-sm text-red-200">{docs.stopGuidance}</p>
      </section>
    );
  }

  // ── REVIEW: actionable licence path ──
  const typeMeta =
    TYPE_META[
      mapToTradeLicenseType(
        target.requirement.authority,
        target.requirement.licenseType,
      ).tradeLicenseType as LicenseType
    ] ?? TYPE_META.OTHER;
  return (
    <section
      className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/5 px-5 py-4"
      data-testid="was-jetzt-review"
    >
      <div className="flex items-center gap-2 text-[15px] font-semibold text-amber-200">
        <AlertTriangle className="h-5 w-5" /> Was jetzt?
      </div>
      <p className="text-sm text-trade-text-secondary">
        <strong>Warum?</strong> {target.requirement.reason}
      </p>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-trade-text-muted">
          Wahrscheinlich benötigte Genehmigung
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-trade-accent" />
          <span className="font-semibold text-trade-text-primary">
            {typeMeta.label}
          </span>
          <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
            {typeMeta.jurisdiction} · {target.requirement.authority}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-trade-text-muted">
          ⓘ Wahrscheinliche Einstufung — vor Einreichung bestätigen.
        </p>
      </div>

      {docs.documents.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-trade-text-muted">
            Benötigte Unterlagen
          </div>
          <ul className="space-y-1.5">
            {docs.documents.map((d) => (
              <li
                key={d.key}
                className="flex items-center justify-between gap-3 text-sm text-trade-text-secondary"
              >
                <span className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-trade-text-muted" />
                  {d.label}{" "}
                  {!d.mandatory && (
                    <em className="text-[11px] text-trade-text-muted">
                      (empfohlen)
                    </em>
                  )}
                </span>
                {d.actionHref && (
                  <a
                    href={d.actionHref}
                    className="text-trade-accent hover:underline"
                  >
                    öffnen ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-trade-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-trade-accent-strong"
        >
          Antrag vorbereiten
        </button>
        <a
          href={portal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-trade-accent hover:underline"
        >
          Behörde: {portal.label} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="text-[11px] text-trade-text-muted">
        ⓘ Caelex bereitet einen ENTWURF vor und reicht NICHTS ein. Keine
        Rechtsberatung. Du bleibst verantwortlich.
      </p>

      {open && (
        <LicenseApplicationModal
          target={target}
          ctx={ctx}
          onClose={() => setOpen(false)}
          onCreated={onDraftCreated}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint src/app/(trade)/trade/operations/new/_components/LicenseApplicationModal.tsx src/app/(trade)/trade/operations/new/_components/WasJetztPanel.tsx` — clean. Source-review against sketches + spec.

- [ ] **Step 4:** commit — `feat(trade): WasJetztPanel + LicenseApplicationModal (blocked→licence UI)`.

---

## Task 5: Wire into `VerdictPanel` — panel + 3-tier liability framing (gated)

**File:** edit `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx`.

> **Data note (important):** the assess response gives the panel `lines[].classification` (→ the `licenseDetermination` array) and `counterpartyId`, but **NOT** the operation's `reference / shipToCountry / declaredEndUse / line values / counterparty legalName` it needs to build the `OperationContext` for prefill. **Two options — pick one (this is a human decision, see report):**
>
> - **(5a) Thin extra fetch:** on mount, also `GET /api/trade/operations/${operationId}` (existing route) to read `reference, shipToCountry, endUseCountry, declaredEndUse, counterparty.legalName, lines[].{quantity,unitValue,unitCurrency,item codes}` → assemble `OperationContext`. One extra read, no new endpoint. **Recommended** (smallest, reuses an existing route).
> - **(5b) Extend the assess response:** add the few operation fields to `OperationAssessment` in `operation-assistant.server.ts` (additive, node-tested) so the panel needs no second fetch. Slightly more engine surface, but one round-trip.

- [ ] **Step 1:** add the **liability banner** under the verdict headline (all verdicts), branching GO vs non-GO, using `LIABILITY_COPY`:

```tsx
import { LIABILITY_COPY } from "@/lib/trade/license-application";
import { ShieldAlert, Info } from "lucide-react";

// …directly under the existing verdict headline block:
{
  assessment.verdict === "GO" ? (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{LIABILITY_COPY.goNote}</span>
    </div>
  ) : (
    <div
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
        assessment.verdict === "BLOCKED"
          ? "border-red-500/40 bg-red-500/10 text-red-100"
          : "border-amber-500/40 bg-amber-500/10 text-amber-100"
      }`}
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{LIABILITY_COPY.verdictBanner}</span>
    </div>
  );
}
```

- [ ] **Step 2:** assemble `OperationContext` (per the chosen 5a/5b) + the `determinations` array, and render `WasJetztPanel` after the steps list, before the existing pendenzen block:

```tsx
const determinations = assessment.lines
  .map((l) => l.classification?.licenseDetermination)
  .filter((d): d is EngineDetermination => Boolean(d));

// …after the <ol> steps list:
{
  assessment.verdict !== "GO" && opContext && (
    <WasJetztPanel
      determinations={determinations}
      ctx={opContext}
      onDraftCreated={() => void load()}
    />
  );
}
```

- [ ] **Step 3:** add the **persistent-light auto-suggest cue** to the `classify` + `screen` step rows: a tiny inline `ⓘ` with `title={LIABILITY_COPY.autoSuggestCue}` (and/or a one-line muted span under the step `why`). Keep it light — it must not compete with the banner. (Optionally extract a 5-line `AutoSuggestHint` inline component in the same file.)

- [ ] **Step 4:** `npx tsc --noEmit` + `npx eslint <VerdictPanel.tsx>` — clean. Source-review: GO shows the green honest-note + no panel; REVIEW shows amber banner + actionable panel; BLOCKED shows red banner + stop panel.

- [ ] **Step 5:** commit — `feat(trade): verdict liability banner + Was-jetzt wiring (GO honest, REVIEW/BLOCKED loud)`.

---

## Task 6: Verification + batched deploy

- [ ] **Step 1 — full pure-test run:** `npx vitest run src/lib/trade/license-application.test.ts` → all green. Also run the neighbours to prove no regression: `npx vitest run src/lib/trade/license-renewal.test.ts src/lib/trade/operation-assistant-verdict.test.ts`.
- [ ] **Step 2 — typecheck:** `npx tsc --noEmit` → no NEW errors on touched files (`license-application.ts`, `WasJetztPanel.tsx`, `LicenseApplicationModal.tsx`, `VerdictPanel.tsx`; note pre-existing repo errors, do not block on them).
- [ ] **Step 3 — lint:** `npx eslint` the four touched files → clean.
- [ ] **Step 4 — manual source-review checklist** (since components are unit-test-gated):
  - REVIEW verdict → "Was jetzt?" shows authority + fine-grained type (hedged), required-docs (EUC deep-links `/trade/euc`), "Antrag vorbereiten" opens the modal, portal deep-link present.
  - "Antrag vorbereiten" → modal pre-filled (codes/country/end-use/cap), number+dates blank, disclaimer verbatim; confirm POSTs `status:"DRAFT"` to `/api/trade/licenses`; success → toast + "Jetzt bei … einreichen ↗".
  - BLOCKED verdict → stop state, **no** "Antrag vorbereiten" button.
  - Liability: red/amber banner on non-GO under the headline; green honest-note on GO; auto-suggest cue on classify/screen rows.
  - DRAFT appears in `/trade/licenses` with `conditions.applicationFor === operationId`.
- [ ] **Step 5 — batched deploy** (per CLAUDE.md): only when the 6–8-commit batch threshold is reached or the user says "deploy now". Then: `git checkout main && git pull --ff-only origin main && git merge fix/trade-to-92 --no-edit && git push origin main` (production-only; **skip** the feature-branch push to avoid a Vercel preview build).

---

## Notes / honesty boundaries (carry into every surface)

- **Prepare-and-link only — never submit.** The DRAFT is internal; filing is the human's manual step via the authority portal. Repeated in `APPLICATION_DISCLAIMER`, the modal, the toast, and the panel.
- **No "apply" path for BLOCKED.** `deriveRequiredDocuments`/`buildLicenseApplicationDraft` hard-stop on `DENIED`/`PROHIBITED`/MTCR (the builder throws; the panel renders the stop state).
- **Hedge the mapping.** `approximate` is surfaced wherever a licence type is named.
- **GO ≠ done.** The honest-green note keeps record-keeping/re-verification visible.
- **Single-source copy.** All German liability strings live in `license-application.ts` and are asserted by tests — no drift between panel/modal/banner.
- **Zero migration / zero new dep / zero new route.** Reuses `TradeLicense` DRAFT, `POST /api/trade/licenses`, the existing assess response, and `conditions.applicationFor` (additive-in-JSON).
