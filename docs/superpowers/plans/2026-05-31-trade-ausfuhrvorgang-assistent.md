# Ausfuhrvorgang-Assistent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One guided flow ("Neuer Ausfuhrvorgang": Was? / An wen? / Wohin?) that chains the existing Trade engines in legal order and returns a single plain-language verdict (🟢 darf liefern / 🟡 Genehmigung nötig / 🔴 verboten) with a to-do list, solving the screening gap inline and routing the classification gap to the item editor.

**Architecture:** A **pure** verdict core (`deriveVerdict`) + a **pure** shared classifier (`classifyItemForOperation`) + a thin **I/O** orchestrator (`assessOperation`) that loads a persisted `TradeOperation` and composes the existing engines. One new API route (`GET .../assess`) and a client wizard that reuses `ClassificationPanel` (drill-down) and the existing screen endpoint (inline). No new DB model, no new compliance logic — orchestration + plain-language presentation over Sprint-A/C-correct engines.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Prisma, Vitest + React Testing Library, Tailwind (trade glass tokens).

**Spec:** `docs/superpowers/specs/2026-05-30-trade-ausfuhrvorgang-assistent-design.md`

---

## Conventions (read once)

- **Branch:** `fix/trade-to-92` (already checked out).
- **Run a single test file:** `npx vitest run <path>`
- **Typecheck:** `npx tsc --noEmit`
- **Commit trailer (every commit):**
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- **Commitlint:** subject lowercase, conventional (`feat(trade): ...`, `test(trade): ...`).
- **Sequential only:** if executed via subagents, dispatch implementer subagents **strictly one at a time** (write-conflict rule).
- **Task order matters:** Task 5 (`VerdictPanel`) is built **before** Task 6 (the wizard that imports it).

## Verified facts this plan is built on (confirmed by grep/read at planning time — do not re-derive)

Engine signatures + **exact import paths**:

```ts
// @/lib/comply-v2/trade/property-trigger-engine
export function determineTriggers(
  input: PropertyTriggerInput,
): TriggerEvaluation;
export interface PropertyTriggerInput {
  name: string;
  eccnEU?: string | null;
  eccnUS?: string | null;
  usmlCategory?: string | null;
  mtcrCategory?: string | null;
  germanAlEntry?: string | null;
  apertureMeters?: number | null;
  rangeKm?: number | null;
  payloadKg?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
  gsdMeters?: number | null;
  IspSeconds?: number | null;
  deltaVMetersPerSecond?: number | null;
  transmitPowerW?: number | null;
  frequencyGhz?: number | null;
  radHardTidKrad?: number | null;
  seuRateErrorsPerBitDay?:
    | number
    | null; /* + more parametric attrs, all optional */
}
export interface TriggerEvaluation {
  /* opaque to the assistant — only forwarded, never read */
}

// @/lib/comply-v2/trade/de-minimis-calculator
export function calculateDeMinimis(input: DeMinimisInput): DeMinimisResult;
export type DestinationTier = "STANDARD" | "RESTRICTED" | "EMBARGOED";
export interface DeMinimisInput {
  usControlledContentPercent: number;
  hasItarContent: boolean;
  designedWithUSTech: boolean;
  manufacturedWithUSEquipment: boolean;
  destinationTier: DestinationTier;
  destinationCountry?: string;
  usContentEccns?: string[];
}
export interface DeMinimisResult {
  outcome:
    | "DE_MINIMIS_ELIGIBLE"
    | "DE_MINIMIS_EXCEEDED"
    | "ITAR_CONTROLLED"
    | "FDPR_TRIGGERED"
    | "EMBARGOED_DESTINATION"
    | "REQUIRES_LEGAL_REVIEW";
  appliedThresholdPercent: number | null;
  usControlledContentPercent: number;
  fdprFlag: boolean;
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | "CLEAR";
  reasons: string[];
  recommendations: string[];
  disclaimer: string;
}

// @/lib/comply-v2/trade/license-determination
export function determineLicenseRequirements(
  triggerEval: TriggerEvaluation,
  deMinimis: DeMinimisResult | null,
  destinationCountry?: string,
  exceptionContext?: Omit<ExceptionMatchInput, "destinationCountry">,
  screeningContext?: { sanctionsLists: string[] },
  actualCodes?: { eccnEU?: string | null; eccnUS?: string | null },
): LicenseDetermination;
export interface LicenseDetermination {
  requirements: LicenseRequirement[];
  gate: OverallGate;
  mtcrCatIBlock: boolean;
  itarBlock: boolean;
  embargoBlock: boolean;
  annexIVBlock: boolean;
  nextSteps: string[];
  applicableExceptions?: ApplicableException[];
  disclaimer: string;
}
export interface LicenseRequirement {
  jurisdiction: string;
  authority: LicenseAuthority;
  status: RequirementStatus;
  licenseType: LicenseType | null;
  reason: string;
  recommendedAction: string;
  triggerCode?: string;
  applicableException?: {
    code: string;
    label: string;
    citation: string;
    conditions: string[];
  };
}
export type OverallGate = "CLEARED" | "REVIEW_NEEDED" | "BLOCKED";
export type RequirementStatus =
  | "REQUIRED"
  | "LIKELY_REQUIRED"
  | "EXCEPTION_MAY_APPLY"
  | "NLR"
  | "DENIED"
  | "PROHIBITED"
  | "UNKNOWN";

// NOTE: `ClassificationResult` is NOT exported by any engine. The component at
// @/components/trade/types defines it as {triggerEval, deMinimis, licenseDetermination}.
// This plan makes classify-item.ts the canonical (server-safe) home for that type;
// it is structurally identical, so values flow into <ClassificationPanel> unchanged.
```

Prisma enums (`@prisma/client`):

```ts
TradeScreeningStatus =
  "NOT_SCREENED" | "CLEAR" | "POTENTIAL_MATCH" | "CONFIRMED_HIT" | "STALE";
TradePartyStatus = "ACTIVE" | "ARCHIVED" | "BLOCKED";
TradeItemStatus = "DRAFT" | "CLASSIFIED" | "REQUIRES_REVIEW" | "ARCHIVED";
```

`TradeOperation` scalar fields used: `id, organizationId, shipToCountry, counterpartyId`. Relations: `counterparty` (→ `legalName, screeningStatus, status`), `lines` (→ `item`).
`TradeItem` fields used: `id, name, status, eccnEU, eccnUS, usmlCategory, usContentPercent, designedWithUSTech, manufacturedWithUSEquipment` (+ parametric attrs via `PropertyTriggerInput`).

Existing endpoints (confirmed):

- `POST /api/trade/operations` — create. Body `{reference, description, operationType, counterpartyId, shipFromCountry, shipToCountry, endUseCountry?, routeStops?, declaredEndUse, endUserName?, endUserSector?, scheduledShipDate?}` → `201 {operation}`.
- `POST /api/trade/operations/[id]/lines` — body `{itemId, quantity, unitValue, unitCurrency?}` → `{line}`.
- `POST /api/trade/parties/[id]/screen` — **no body**; runs `screenParty`, updates denormalized `screeningStatus`, returns `{result}`.
- `GET /api/trade/operations/[id]` — full operation with `counterparty`, `lines.item`.
- Item editor **page** exists at `/trade/items/[id]` (rich classify UI) — classification gap links here.

Auth + infra in every route:

```ts
const tradeAuth = await getTradeAuth(); // @/lib/trade/trade-auth → {userId,organizationId,role}|null
if (!tradeAuth)
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
const { userId, organizationId } = tradeAuth;
const rl = await checkRateLimit("api", getIdentifier(req, userId)); // @/lib/ratelimit
if (!rl.success) return createRateLimitResponse(rl);
// logger: import { logger } from "@/lib/logger";
```

Reusable UI:

- `ClassificationPanel` (client) — `@/components/trade/ClassificationPanel`, props `{ classification: ClassificationResult }`.
- Sidebar `SECTIONS` NavItem `{ href, label, icon, tooltip?, match?, badgeKey? }` — `src/app/(trade)/trade/_components/TradeSidebar.tsx`.
- Pipeline page (client) with "New Operation" CTA — `src/app/(trade)/trade/operations/page.tsx`.
- Wizard state pattern to mirror: `src/components/assessment/AssessmentWizard.tsx` (`useState` step index + handlers).

---

## File Structure

| File                                                                              | Responsibility                                                                                                                                                                           |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/trade/classification/classify-item.ts` (new, **pure**)                   | `ClassificationResult` type + `classifyItemForOperation(item, opts)` — shared classify chain (triggers → de-minimis → license), forwarding real ECCN codes + optional screening context. |
| `src/lib/trade/classification/classify-item.test.ts` (new)                        | Unit tests for the classifier.                                                                                                                                                           |
| `src/lib/trade/operation-assistant-verdict.ts` (new, **pure**)                    | Verdict types + `deriveVerdict(lines, screening)`. The compliance-critical core. No I/O.                                                                                                 |
| `src/lib/trade/operation-assistant-verdict.test.ts` (new)                         | Exhaustive table-driven verdict tests (no mocks).                                                                                                                                        |
| `src/lib/trade/operation-assistant.server.ts` (new, **I/O**)                      | `assessOperation(operationId, ctx)`; loads operation, composes the two pure modules; `OperationNotFoundError`.                                                                           |
| `src/lib/trade/operation-assistant.server.test.ts` (new)                          | Orchestrator tests (prisma + logger + classifier mocked).                                                                                                                                |
| `src/app/api/trade/operations/[id]/assess/route.ts` (new)                         | `GET` wrapper: auth + rate-limit + org-scope → `assessOperation`.                                                                                                                        |
| `src/app/api/trade/operations/[id]/assess/route.test.ts` (new)                    | Route tests (403, 404, 200).                                                                                                                                                             |
| `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx` (new, client) | Renders verdict + 5 steps + pendenzen; inline "Jetzt screenen"; per-line `ClassificationPanel` drill-down; re-assess. **Built first.**                                                   |
| `src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx` (new)    | Component tests.                                                                                                                                                                         |
| `src/app/(trade)/trade/operations/new/page.tsx` (new, client)                     | 3-question wizard shell; creates operation + line; renders `VerdictPanel`.                                                                                                               |
| `src/app/(trade)/trade/_components/TradeSidebar.tsx` (modify)                     | Add "Geführter Vorgang" nav item under Operations.                                                                                                                                       |
| `src/app/(trade)/trade/operations/page.tsx` (modify)                              | Add "Geführter Vorgang" CTA → `/trade/operations/new`.                                                                                                                                   |

---

## Task 1: Shared pure classifier `classifyItemForOperation`

**Files:**

- Create: `src/lib/trade/classification/classify-item.ts`
- Test: `src/lib/trade/classification/classify-item.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/trade/classification/classify-item.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  classifyItemForOperation,
  destinationTierForCountry,
  type ClassifiableItem,
} from "./classify-item";

const bare: ClassifiableItem = { name: "Aluminium bracket" };

describe("destinationTierForCountry", () => {
  it("maps restricted destinations to RESTRICTED and others to STANDARD", () => {
    expect(destinationTierForCountry("CN")).toBe("RESTRICTED");
    expect(destinationTierForCountry("RU")).toBe("RESTRICTED");
    expect(destinationTierForCountry("FR")).toBe("STANDARD");
    expect(destinationTierForCountry(null)).toBe("STANDARD");
    expect(destinationTierForCountry(undefined)).toBe("STANDARD");
  });
});

describe("classifyItemForOperation", () => {
  it("returns deMinimis=null when the item declares no US content", () => {
    const res = classifyItemForOperation(bare, { destinationCountry: "FR" });
    expect(res.deMinimis).toBeNull();
    expect(res.licenseDetermination.gate).toBe("CLEARED");
  });

  it("flags an ITAR block when the item carries a USML category", () => {
    const itar: ClassifiableItem = {
      name: "Star tracker",
      usmlCategory: "XV(e)",
    };
    const res = classifyItemForOperation(itar, { destinationCountry: "FR" });
    expect(res.licenseDetermination.itarBlock).toBe(true);
    expect(res.licenseDetermination.gate).toBe("BLOCKED");
  });

  it("computes de-minimis (echoing declared US content) when US content is present", () => {
    const usItem: ClassifiableItem = {
      name: "RF amplifier",
      usContentPercent: 40,
      designedWithUSTech: true,
    };
    const res = classifyItemForOperation(usItem, { destinationCountry: "CN" });
    expect(res.deMinimis).not.toBeNull();
    expect(res.deMinimis!.usControlledContentPercent).toBe(40);
  });

  it("forwards actual ECCN codes to the license gate (closes the T-M5 wiring)", () => {
    const dualUse: ClassifiableItem = {
      name: "TT&C transceiver",
      eccnEU: "9A515.a",
    };
    const res = classifyItemForOperation(dualUse, { destinationCountry: "CN" });
    expect(res.licenseDetermination.gate).not.toBe("CLEARED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/trade/classification/classify-item.test.ts` → FAIL (`Cannot find module './classify-item'`).

- [ ] **Step 3: Write the implementation** — `src/lib/trade/classification/classify-item.ts`:

```ts
import {
  determineTriggers,
  type PropertyTriggerInput,
  type TriggerEvaluation,
} from "@/lib/comply-v2/trade/property-trigger-engine";
import {
  calculateDeMinimis,
  type DestinationTier,
  type DeMinimisResult,
} from "@/lib/comply-v2/trade/de-minimis-calculator";
import {
  determineLicenseRequirements,
  type LicenseDetermination,
} from "@/lib/comply-v2/trade/license-determination";

/** Canonical, server-safe shape of a full single-item classification. */
export interface ClassificationResult {
  triggerEval: TriggerEvaluation;
  deMinimis: DeMinimisResult | null;
  licenseDetermination: LicenseDetermination;
}

/** Classification-relevant subset of a TradeItem (PropertyTriggerInput already
 * carries name + codes + parametric attrs; we add the de-minimis fields). */
export type ClassifiableItem = PropertyTriggerInput & {
  usContentPercent?: number | null;
  designedWithUSTech?: boolean | null;
  manufacturedWithUSEquipment?: boolean | null;
};

export interface ClassifyOptions {
  destinationCountry?: string | null;
  /** Sanctions lists consulted for the counterparty, forwarded to the license gate. */
  screeningContext?: { sanctionsLists: string[] };
}

const RESTRICTED_DESTINATIONS = new Set(["CN", "RU", "VE", "BY"]);

export function destinationTierForCountry(
  country: string | null | undefined,
): DestinationTier {
  if (!country) return "STANDARD";
  return RESTRICTED_DESTINATIONS.has(country) ? "RESTRICTED" : "STANDARD";
}

/** Pure: no I/O. Mirrors the items-route chain but additionally forwards
 * actualCodes (T-M5) and the optional screeningContext. */
export function classifyItemForOperation(
  item: ClassifiableItem,
  opts: ClassifyOptions = {},
): ClassificationResult {
  const destinationCountry = opts.destinationCountry ?? undefined;
  const triggerEval = determineTriggers(item);
  const destinationTier = destinationTierForCountry(destinationCountry);

  const deMinimis =
    item.usContentPercent != null
      ? calculateDeMinimis({
          usControlledContentPercent: item.usContentPercent,
          hasItarContent: item.usmlCategory != null,
          designedWithUSTech: item.designedWithUSTech ?? false,
          manufacturedWithUSEquipment:
            item.manufacturedWithUSEquipment ?? false,
          destinationTier,
          destinationCountry,
        })
      : null;

  const licenseDetermination = determineLicenseRequirements(
    triggerEval,
    deMinimis,
    destinationCountry,
    undefined,
    opts.screeningContext,
    { eccnEU: item.eccnEU ?? null, eccnUS: item.eccnUS ?? null },
  );

  return { triggerEval, deMinimis, licenseDetermination };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/trade/classification/classify-item.test.ts` → PASS. If the ITAR/dual-use assertion mismatches the engine, read the real `gate`/`itarBlock` value and pin the test to it (engine is the source of truth) — never weaken the conservative intent (a dual-use code to a restricted destination must not produce `CLEARED`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/classification/classify-item.ts src/lib/trade/classification/classify-item.test.ts
git commit -m "feat(trade): shared pure classifier for the ausfuhrvorgang assistant"
```

---

## Task 2: Pure verdict core `deriveVerdict`

**Files:**

- Create: `src/lib/trade/operation-assistant-verdict.ts`
- Test: `src/lib/trade/operation-assistant-verdict.test.ts`

Conservative mapping: any **blocked** step ⇒ 🔴; else any **gap** step ⇒ 🟡; else 🟢. 🟢 requires every line CLEARED **and** a fresh-CLEAR counterparty.

- [ ] **Step 1: Write the failing test** — `src/lib/trade/operation-assistant-verdict.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
} from "./operation-assistant-verdict";
import type { ClassificationResult } from "@/lib/trade/classification/classify-item";

function classification(over: {
  gate?: "CLEARED" | "REVIEW_NEEDED" | "BLOCKED";
  itarBlock?: boolean;
  embargoBlock?: boolean;
  annexIVBlock?: boolean;
  mtcrCatIBlock?: boolean;
  required?: boolean;
  deMinimisOutcome?: string | null;
}): ClassificationResult {
  return {
    triggerEval: {} as never, // deriveVerdict never reads triggerEval
    deMinimis:
      over.deMinimisOutcome == null
        ? null
        : ({
            outcome: over.deMinimisOutcome,
            appliedThresholdPercent: 25,
            usControlledContentPercent: 40,
            fdprFlag: false,
            riskLevel: "MEDIUM",
            reasons: [],
            recommendations: [],
            disclaimer: "",
          } as never),
    licenseDetermination: {
      requirements: over.required
        ? ([
            {
              jurisdiction: "DE",
              authority: "BAFA",
              status: "REQUIRED",
              licenseType: "BAFA_ANTRAG",
              reason: "9A515 → CN",
              recommendedAction: "BAFA-Antrag stellen",
            },
          ] as never)
        : [],
      gate: over.gate ?? "CLEARED",
      mtcrCatIBlock: over.mtcrCatIBlock ?? false,
      itarBlock: over.itarBlock ?? false,
      embargoBlock: over.embargoBlock ?? false,
      annexIVBlock: over.annexIVBlock ?? false,
      nextSteps: [],
      disclaimer: "",
    },
  };
}

function line(over: Partial<LineAssessment> = {}): LineAssessment {
  return {
    lineId: "l1",
    itemId: "i1",
    itemName: "Widget",
    classified: true,
    classification: classification({ gate: "CLEARED" }),
    ...over,
  };
}

const clearScreen: ScreeningAssessment = {
  status: "CLEAR",
  partyName: "Acme Space SAS",
  partyBlocked: false,
};

describe("deriveVerdict — green path", () => {
  it("GO only when every line is CLEARED and the party is fresh-CLEAR", () => {
    const r = deriveVerdict([line()], clearScreen);
    expect(r.verdict).toBe("GO");
    expect(r.pendenzen).toHaveLength(0);
    expect(r.steps.find((s) => s.step === "license")!.status).toBe("done");
  });
});

describe("deriveVerdict — blocked dominates", () => {
  it("BLOCKED when a line gate is BLOCKED", () => {
    const r = deriveVerdict(
      [
        line({
          classification: classification({ gate: "BLOCKED", itarBlock: true }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("BLOCKED");
  });
  it("BLOCKED when the counterparty is a confirmed sanctions hit", () => {
    const r = deriveVerdict([line()], {
      ...clearScreen,
      status: "CONFIRMED_HIT",
    });
    expect(r.verdict).toBe("BLOCKED");
    expect(r.steps.find((s) => s.step === "screen")!.status).toBe("blocked");
  });
  it("BLOCKED when the counterparty record is BLOCKED", () => {
    const r = deriveVerdict([line()], { ...clearScreen, partyBlocked: true });
    expect(r.verdict).toBe("BLOCKED");
  });
  it("BLOCKED beats a green line", () => {
    const r = deriveVerdict(
      [
        line(),
        line({
          lineId: "l2",
          classification: classification({
            gate: "BLOCKED",
            embargoBlock: true,
          }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("BLOCKED");
  });
});

describe("deriveVerdict — review for any gap (never a false green)", () => {
  it("REVIEW when a line is not yet classified", () => {
    const r = deriveVerdict(
      [line({ classified: false, classification: null })],
      clearScreen,
    );
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "classify")!.status).toBe("gap");
    expect(r.pendenzen.some((p) => /klassifiz/i.test(p.label))).toBe(true);
  });
  it("REVIEW when the counterparty is not screened", () => {
    const r = deriveVerdict([line()], {
      ...clearScreen,
      status: "NOT_SCREENED",
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "screen")!.status).toBe("gap");
  });
  it("REVIEW when screening is stale", () => {
    expect(
      deriveVerdict([line()], { ...clearScreen, status: "STALE" }).verdict,
    ).toBe("REVIEW");
  });
  it("REVIEW (not BLOCKED) for a potential sanctions match", () => {
    const r = deriveVerdict([line()], {
      ...clearScreen,
      status: "POTENTIAL_MATCH",
    });
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "screen")!.status).toBe("gap");
  });
  it("REVIEW when a license is required", () => {
    const r = deriveVerdict(
      [
        line({
          classification: classification({
            gate: "REVIEW_NEEDED",
            required: true,
          }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "license")!.status).toBe("gap");
    expect(r.steps.find((s) => s.step === "form")!.status).toBe("gap");
    expect(r.pendenzen.some((p) => /BAFA/i.test(p.label))).toBe(true);
  });
  it("REVIEW when de-minimis is exceeded without a hard block", () => {
    const r = deriveVerdict(
      [
        line({
          classification: classification({
            gate: "REVIEW_NEEDED",
            deMinimisOutcome: "DE_MINIMIS_EXCEEDED",
          }),
        }),
      ],
      clearScreen,
    );
    expect(r.verdict).toBe("REVIEW");
    expect(r.steps.find((s) => s.step === "jurisdiction")!.status).toBe("gap");
  });
});

describe("deriveVerdict — shape", () => {
  it("always emits exactly five steps in canonical order", () => {
    const r = deriveVerdict([line()], clearScreen);
    expect(r.steps.map((s) => s.step)).toEqual([
      "classify",
      "screen",
      "jurisdiction",
      "license",
      "form",
    ]);
  });
  it("produces a non-empty German headline for each verdict", () => {
    expect(
      deriveVerdict([line()], clearScreen).headline.length,
    ).toBeGreaterThan(0);
    expect(
      deriveVerdict(
        [line({ classification: classification({ gate: "BLOCKED" }) })],
        clearScreen,
      ).headline.length,
    ).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/trade/operation-assistant-verdict.test.ts` → FAIL (`Cannot find module './operation-assistant-verdict'`).

- [ ] **Step 3: Write the implementation** — `src/lib/trade/operation-assistant-verdict.ts`:

```ts
import type { ClassificationResult } from "@/lib/trade/classification/classify-item";
import type { TradeScreeningStatus } from "@prisma/client";

export type Verdict = "GO" | "REVIEW" | "BLOCKED";
export type StepStatus = "done" | "gap" | "blocked";
export type AssistantStep =
  | "classify"
  | "screen"
  | "jurisdiction"
  | "license"
  | "form";

export interface StepResult {
  step: AssistantStep;
  status: StepStatus;
  summary: string; // one-line plain German
  why: string; // the basis / citation
  detailRef?: string;
}
export interface Pendenz {
  label: string;
  actionHref?: string;
}
export interface LineAssessment {
  lineId: string;
  itemId: string;
  itemName: string;
  classified: boolean;
  classification: ClassificationResult | null;
}
export interface ScreeningAssessment {
  status: TradeScreeningStatus;
  partyName: string;
  partyBlocked: boolean;
}
export interface VerdictResult {
  verdict: Verdict;
  headline: string;
  steps: StepResult[];
  pendenzen: Pendenz[];
}

const VERDICT_EMOJI: Record<Verdict, string> = {
  GO: "🟢",
  REVIEW: "🟡",
  BLOCKED: "🔴",
};

function worst(a: StepStatus, b: StepStatus): StepStatus {
  if (a === "blocked" || b === "blocked") return "blocked";
  if (a === "gap" || b === "gap") return "gap";
  return "done";
}
function hardBlock(c: ClassificationResult): boolean {
  const d = c.licenseDetermination;
  return (
    d.gate === "BLOCKED" ||
    d.itarBlock ||
    d.embargoBlock ||
    d.annexIVBlock ||
    d.mtcrCatIBlock
  );
}
function licenseRequired(c: ClassificationResult): boolean {
  return c.licenseDetermination.requirements.some((r) =>
    ["REQUIRED", "LIKELY_REQUIRED", "EXCEPTION_MAY_APPLY", "UNKNOWN"].includes(
      r.status,
    ),
  );
}

export function deriveVerdict(
  lines: LineAssessment[],
  screening: ScreeningAssessment,
): VerdictResult {
  const pendenzen: Pendenz[] = [];

  // Step 1: classify
  const unclassified = lines.filter((l) => !l.classified || !l.classification);
  const classifyStep: StepResult = unclassified.length
    ? {
        step: "classify",
        status: "gap",
        summary: `${unclassified.length} von ${lines.length} Artikel(n) noch nicht klassifiziert`,
        why: "Ohne ECCN/USML-Einstufung lässt sich der Genehmigungsbedarf nicht bestimmen.",
      }
    : {
        step: "classify",
        status: "done",
        summary: "Alle Artikel klassifiziert",
        why: "Jeder Artikel trägt eine Einstufung (ECCN/USML/AL).",
      };
  for (const l of unclassified) {
    pendenzen.push({
      label: `Artikel „${l.itemName}" klassifizieren`,
      actionHref: `/trade/items/${l.itemId}`,
    });
  }

  // Step 2: screen
  let screenStep: StepResult;
  if (screening.partyBlocked || screening.status === "CONFIRMED_HIT") {
    screenStep = {
      step: "screen",
      status: "blocked",
      summary: `${screening.partyName}: Sanktionstreffer`,
      why: "Bestätigter Treffer auf einer kritischen Sanktionsliste — Lieferung untersagt.",
    };
  } else if (screening.status === "POTENTIAL_MATCH") {
    screenStep = {
      step: "screen",
      status: "gap",
      summary: `${screening.partyName}: möglicher Treffer — Prüfung nötig`,
      why: "Fuzzy-/Kaskaden-Treffer muss manuell abgeklärt werden, bevor geliefert wird.",
    };
    pendenzen.push({ label: `Screening von „${screening.partyName}" klären` });
  } else if (
    screening.status === "NOT_SCREENED" ||
    screening.status === "STALE"
  ) {
    screenStep = {
      step: "screen",
      status: "gap",
      summary: `${screening.partyName}: ${screening.status === "STALE" ? "Screening veraltet" : "noch nicht gescreent"}`,
      why: "Gegenpartei muss gegen OFAC/EU/UN/BIS gescreent werden.",
    };
    pendenzen.push({ label: `„${screening.partyName}" screenen` });
  } else {
    screenStep = {
      step: "screen",
      status: "done",
      summary: `${screening.partyName}: sauber`,
      why: "Aktuelles Screening ohne Treffer auf den kritischen Listen.",
    };
  }

  // Step 3: jurisdiction / de-minimis
  const classified = lines
    .map((l) => l.classification)
    .filter((c): c is ClassificationResult => Boolean(c));
  const deMinimisOutcomes = classified
    .map((c) => c.deMinimis?.outcome)
    .filter(Boolean) as string[];
  let jurisdictionStep: StepResult;
  if (deMinimisOutcomes.includes("ITAR_CONTROLLED")) {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "blocked",
      summary: "ITAR-kontrollierter US-Anteil",
      why: "ITAR-Anteil → US-Jurisdiktion, eine EU-Genehmigung genügt nicht.",
    };
  } else if (
    deMinimisOutcomes.some((o) =>
      [
        "DE_MINIMIS_EXCEEDED",
        "FDPR_TRIGGERED",
        "EMBARGOED_DESTINATION",
        "REQUIRES_LEGAL_REVIEW",
      ].includes(o),
    )
  ) {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "gap",
      summary: "US-Anteil über Schwelle / FDPR — Prüfung nötig",
      why: "De-minimis-Schwelle überschritten oder FDPR greift; US-Reexport-Bezug prüfen.",
    };
    pendenzen.push({ label: "US-Anteil / De-minimis prüfen" });
  } else if (deMinimisOutcomes.length === 0) {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "done",
      summary: "Keine relevanten US-Anteile deklariert",
      why: "Kein US-Content angegeben — De-minimis nicht einschlägig.",
    };
  } else {
    jurisdictionStep = {
      step: "jurisdiction",
      status: "done",
      summary: "US-Anteil unter De-minimis-Schwelle",
      why: "US-Anteil bleibt unter der anwendbaren Schwelle.",
    };
  }

  // Step 4: license
  const anyHardBlock = classified.some(hardBlock);
  const anyLicense = classified.some(licenseRequired);
  const anyReview = classified.some(
    (c) => c.licenseDetermination.gate === "REVIEW_NEEDED",
  );
  let licenseStep: StepResult;
  if (anyHardBlock) {
    licenseStep = {
      step: "license",
      status: "blocked",
      summary: "Lieferung untersagt",
      why: "Harte Sperre (ITAR/Embargo/Annex IV/MTCR Cat-I) — keine Ausnahme greift.",
    };
  } else if (anyLicense || anyReview) {
    licenseStep = {
      step: "license",
      status: "gap",
      summary: "Genehmigung erforderlich",
      why: "Mindestens ein Artikel löst eine Genehmigungspflicht aus.",
    };
  } else {
    licenseStep = {
      step: "license",
      status: "done",
      summary: "Keine Genehmigung erforderlich (NLR/EAR99)",
      why: "Kein Trigger, keine Schwelle überschritten.",
    };
  }

  // Step 5: form
  let formStep: StepResult;
  if (anyHardBlock) {
    formStep = {
      step: "form",
      status: "blocked",
      summary: "Kein Antrag — Vorgang abbrechen",
      why: "Bei harter Sperre ist kein Genehmigungsantrag möglich.",
    };
  } else if (anyLicense || anyReview) {
    formStep = {
      step: "form",
      status: "gap",
      summary: "BAFA-Antrag vorbereiten",
      why: "Genehmigungspflicht → ELAN-K2-Antrag aus dem Vorgang erzeugen.",
    };
    pendenzen.push({ label: "BAFA-Antrag (ELAN-K2) erstellen" });
  } else {
    formStep = {
      step: "form",
      status: "done",
      summary: "Kein Antrag nötig",
      why: "Keine Genehmigungspflicht — Lieferung ohne BAFA-Antrag.",
    };
  }

  const steps = [
    classifyStep,
    screenStep,
    jurisdictionStep,
    licenseStep,
    formStep,
  ];
  const overall = steps.reduce<StepStatus>(
    (acc, s) => worst(acc, s.status),
    "done",
  );
  const verdict: Verdict =
    overall === "blocked" ? "BLOCKED" : overall === "gap" ? "REVIEW" : "GO";

  const headlineText: Record<Verdict, string> = {
    GO: "Darf liefern — keine Genehmigung erforderlich",
    REVIEW: anyHardBlock
      ? "Prüfung nötig"
      : anyLicense || anyReview
        ? "Genehmigung nötig"
        : "Offene Punkte vor Lieferung",
    BLOCKED: "Lieferung verboten",
  };
  const headline = `${VERDICT_EMOJI[verdict]} ${headlineText[verdict]}`;

  return { verdict, headline, steps, pendenzen };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/trade/operation-assistant-verdict.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/operation-assistant-verdict.ts src/lib/trade/operation-assistant-verdict.test.ts
git commit -m "feat(trade): pure verdict core for the ausfuhrvorgang assistant"
```

---

## Task 3: I/O orchestrator `assessOperation`

**Files:**

- Create: `src/lib/trade/operation-assistant.server.ts`
- Test: `src/lib/trade/operation-assistant.server.test.ts`

A throwing classifier must degrade to a **gap** (→ conservative REVIEW), never a false GO and never a crash. `assessOperation` does **not** call `screenParty` — it reads the denormalized `screeningStatus` (cheap, and the inline screen action re-runs the real screen on demand).

- [ ] **Step 1: Write the failing test** — `src/lib/trade/operation-assistant.server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { tradeOperation: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/trade/classification/classify-item", async (orig) => {
  const actual =
    await orig<typeof import("@/lib/trade/classification/classify-item")>();
  return {
    ...actual,
    classifyItemForOperation: vi.fn(actual.classifyItemForOperation),
  };
});

import { prisma } from "@/lib/prisma";
import { classifyItemForOperation } from "@/lib/trade/classification/classify-item";
import {
  assessOperation,
  OperationNotFoundError,
} from "./operation-assistant.server";

const findFirst = prisma.tradeOperation.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const classifyMock = classifyItemForOperation as unknown as ReturnType<
  typeof vi.fn
>;

function item(over: Record<string, unknown> = {}) {
  return {
    id: "i1",
    name: "Aluminium bracket",
    status: "CLASSIFIED",
    eccnEU: null,
    eccnUS: null,
    usmlCategory: null,
    usContentPercent: null,
    designedWithUSTech: false,
    manufacturedWithUSEquipment: false,
    ...over,
  };
}
function operationRow(over: Record<string, unknown> = {}) {
  return {
    id: "op1",
    organizationId: "org1",
    shipToCountry: "FR",
    counterpartyId: "tp1",
    counterparty: {
      legalName: "Acme Space SAS",
      screeningStatus: "CLEAR",
      status: "ACTIVE",
    },
    lines: [{ id: "l1", itemId: "i1", item: item() }],
    ...over,
  };
}

beforeEach(() => {
  findFirst.mockReset();
});

describe("assessOperation", () => {
  it("throws OperationNotFoundError when missing or cross-org", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      assessOperation("nope", { organizationId: "org1" }),
    ).rejects.toBeInstanceOf(OperationNotFoundError);
  });
  it("scopes the query to the caller's organization", async () => {
    findFirst.mockResolvedValue(operationRow());
    await assessOperation("op1", { organizationId: "org1" });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "op1", organizationId: "org1" } }),
    );
  });
  it("returns GO for a classified line + clear party, exposing counterpartyId", async () => {
    findFirst.mockResolvedValue(operationRow());
    const r = await assessOperation("op1", { organizationId: "org1" });
    expect(r.verdict).toBe("GO");
    expect(r.operationId).toBe("op1");
    expect(r.counterpartyId).toBe("tp1");
    expect(r.lines).toHaveLength(1);
  });
  it("returns REVIEW when a line item is not yet classified", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        lines: [{ id: "l1", itemId: "i1", item: item({ status: "DRAFT" }) }],
      }),
    );
    expect(
      (await assessOperation("op1", { organizationId: "org1" })).verdict,
    ).toBe("REVIEW");
  });
  it("returns BLOCKED when the counterparty is a confirmed hit", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        counterparty: {
          legalName: "Sanctioned Co",
          screeningStatus: "CONFIRMED_HIT",
          status: "BLOCKED",
        },
      }),
    );
    expect(
      (await assessOperation("op1", { organizationId: "org1" })).verdict,
    ).toBe("BLOCKED");
  });
  it("degrades a throwing classifier to REVIEW (never a false GO)", async () => {
    classifyMock.mockImplementationOnce(() => {
      throw new Error("engine boom");
    });
    findFirst.mockResolvedValue(
      operationRow({
        lines: [{ id: "l1", itemId: "i1", item: item({ eccnEU: "9A515.a" }) }],
      }),
    );
    expect(
      (await assessOperation("op1", { organizationId: "org1" })).verdict,
    ).toBe("REVIEW");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/trade/operation-assistant.server.test.ts` → FAIL (`Cannot find module './operation-assistant.server'`).

- [ ] **Step 3: Write the implementation** — `src/lib/trade/operation-assistant.server.ts`:

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  classifyItemForOperation,
  type ClassifiableItem,
  type ClassificationResult,
} from "@/lib/trade/classification/classify-item";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
  type VerdictResult,
} from "@/lib/trade/operation-assistant-verdict";

export class OperationNotFoundError extends Error {
  constructor(operationId: string) {
    super(`Trade operation ${operationId} not found in organization scope`);
    this.name = "OperationNotFoundError";
  }
}

export interface OperationAssessment extends VerdictResult {
  operationId: string;
  counterpartyId: string;
  lines: Array<{
    lineId: string;
    itemId: string;
    itemName: string;
    classification: ClassificationResult | null;
  }>;
}

/** Classified once the item has a status or any control code. */
function isClassified(item: {
  status: string;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
}): boolean {
  return (
    item.status === "CLASSIFIED" ||
    Boolean(item.eccnEU) ||
    Boolean(item.eccnUS) ||
    Boolean(item.usmlCategory)
  );
}

export async function assessOperation(
  operationId: string,
  ctx: { organizationId: string },
): Promise<OperationAssessment> {
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: operationId, organizationId: ctx.organizationId },
    include: {
      counterparty: {
        select: { legalName: true, screeningStatus: true, status: true },
      },
      lines: { include: { item: true } },
    },
  });
  if (!operation) throw new OperationNotFoundError(operationId);

  const destinationCountry = operation.shipToCountry ?? null;

  const lineAssessments: LineAssessment[] = operation.lines.map((l) => {
    const item = l.item;
    let classified = isClassified(item);
    let classification: ClassificationResult | null = null;
    if (classified) {
      try {
        classification = classifyItemForOperation(
          item as unknown as ClassifiableItem,
          {
            destinationCountry,
          },
        );
      } catch (err) {
        // Engine failure must never produce a false GO: degrade to a gap so the
        // verdict becomes REVIEW, and the operation stays resumable.
        logger.error(
          { err, itemId: item.id },
          "classifyItemForOperation failed",
        );
        classified = false;
        classification = null;
      }
    }
    return {
      lineId: l.id,
      itemId: item.id,
      itemName: item.name,
      classified,
      classification,
    };
  });

  const screening: ScreeningAssessment = {
    status: operation.counterparty.screeningStatus,
    partyName: operation.counterparty.legalName,
    partyBlocked: operation.counterparty.status === "BLOCKED",
  };

  const verdict = deriveVerdict(lineAssessments, screening);

  return {
    operationId: operation.id,
    counterpartyId: operation.counterpartyId,
    ...verdict,
    lines: lineAssessments.map((l) => ({
      lineId: l.lineId,
      itemId: l.itemId,
      itemName: l.itemName,
      classification: l.classification,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/trade/operation-assistant.server.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/operation-assistant.server.ts src/lib/trade/operation-assistant.server.test.ts
git commit -m "feat(trade): assessOperation orchestrator wiring engines to the verdict core"
```

---

## Task 4: API route `GET /api/trade/operations/[id]/assess`

**Files:**

- Create: `src/app/api/trade/operations/[id]/assess/route.ts`
- Test: `src/app/api/trade/operations/[id]/assess/route.test.ts`

- [ ] **Step 1: Write the failing test** — `src/app/api/trade/operations/[id]/assess/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/trade/trade-auth", () => ({ getTradeAuth: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("id"),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/trade/operation-assistant.server", () => ({
  assessOperation: vi.fn(),
  OperationNotFoundError: class OperationNotFoundError extends Error {},
}));

import { GET } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  assessOperation,
  OperationNotFoundError,
} from "@/lib/trade/operation-assistant.server";

const auth = getTradeAuth as unknown as ReturnType<typeof vi.fn>;
const assess = assessOperation as unknown as ReturnType<typeof vi.fn>;
const ctx = (id = "op1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  auth.mockReset();
  assess.mockReset();
});

describe("GET /api/trade/operations/[id]/assess", () => {
  it("returns 403 when not authenticated/entitled", async () => {
    auth.mockResolvedValue(null);
    expect((await GET(new Request("http://t/assess"), ctx())).status).toBe(403);
  });
  it("returns 404 when the operation is not in scope", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "OWNER",
    });
    assess.mockRejectedValue(new OperationNotFoundError("op1"));
    expect((await GET(new Request("http://t/assess"), ctx())).status).toBe(404);
  });
  it("returns 200 with the assessment, scoped to the caller org", async () => {
    auth.mockResolvedValue({
      userId: "u1",
      organizationId: "org1",
      role: "OWNER",
    });
    assess.mockResolvedValue({
      operationId: "op1",
      counterpartyId: "tp1",
      verdict: "GO",
      headline: "🟢 ok",
      steps: [],
      pendenzen: [],
      lines: [],
    });
    const res = await GET(new Request("http://t/assess"), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).assessment.verdict).toBe("GO");
    expect(assess).toHaveBeenCalledWith("op1", { organizationId: "org1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run "src/app/api/trade/operations/[id]/assess/route.test.ts"` → FAIL (`Cannot find module './route'`).

- [ ] **Step 3: Write the implementation** — `src/app/api/trade/operations/[id]/assess/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  assessOperation,
  OperationNotFoundError,
} from "@/lib/trade/operation-assistant.server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;
    try {
      const assessment = await assessOperation(id, { organizationId });
      return NextResponse.json({ assessment });
    } catch (e) {
      if (e instanceof OperationNotFoundError) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      throw e;
    }
  } catch (err) {
    logger.error({ err }, "GET /api/trade/operations/[id]/assess failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run "src/app/api/trade/operations/[id]/assess/route.test.ts"` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/trade/operations/[id]/assess/route.ts" "src/app/api/trade/operations/[id]/assess/route.test.ts"
git commit -m "feat(trade): GET assess route returning the operation verdict"
```

---

## Task 5: `VerdictPanel` — result + inline gap-solving (built before the wizard)

**Files:**

- Create: `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx`
- Test: `src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx`

Fetches `GET .../assess`, renders headline + 5 steps + pendenzen. **Inline screen** (one-click `POST .../parties/[id]/screen`, no body, then re-assess) on the screen gap. Classification gap → links to the item editor (pendenz `actionHref`). Per-line **drill-down** embeds the existing `ClassificationPanel`.

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${n}`} {...p} />
          );
          I.displayName = n;
          return I;
        },
      },
    ),
);
vi.mock("@/components/trade/ClassificationPanel", () => ({
  ClassificationPanel: () => <div data-testid="classification-panel" />,
}));

import { VerdictPanel } from "./VerdictPanel";

const GO = {
  assessment: {
    operationId: "op1",
    counterpartyId: "tp1",
    verdict: "GO",
    headline: "🟢 Darf liefern — keine Genehmigung erforderlich",
    steps: [
      {
        step: "classify",
        status: "done",
        summary: "Alle Artikel klassifiziert",
        why: "",
      },
      { step: "screen", status: "done", summary: "Acme: sauber", why: "" },
      {
        step: "jurisdiction",
        status: "done",
        summary: "Keine US-Anteile",
        why: "",
      },
      {
        step: "license",
        status: "done",
        summary: "Keine Genehmigung",
        why: "",
      },
      { step: "form", status: "done", summary: "Kein Antrag nötig", why: "" },
    ],
    pendenzen: [],
    lines: [],
  },
};
const REVIEW = {
  assessment: {
    ...GO.assessment,
    verdict: "REVIEW",
    headline: "🟡 Genehmigung nötig",
    steps: [
      { step: "classify", status: "done", summary: "ok", why: "" },
      {
        step: "screen",
        status: "gap",
        summary: "noch nicht gescreent",
        why: "",
      },
      { step: "jurisdiction", status: "done", summary: "ok", why: "" },
      {
        step: "license",
        status: "gap",
        summary: "Genehmigung erforderlich",
        why: "",
      },
      {
        step: "form",
        status: "gap",
        summary: "BAFA-Antrag vorbereiten",
        why: "",
      },
    ],
    pendenzen: [{ label: "BAFA-Antrag (ELAN-K2) erstellen" }],
  },
};

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("VerdictPanel", () => {
  it("renders the green verdict headline after fetching", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => GO,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() => expect(screen.getByText(/Darf liefern/)).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith("/api/trade/operations/op1/assess");
  });
  it("renders pendenzen + an inline screen action for a review verdict", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => REVIEW,
    });
    render(<VerdictPanel operationId="op1" />);
    await waitFor(() =>
      expect(screen.getByText(/Genehmigung nötig/)).toBeTruthy(),
    );
    expect(screen.getByText(/BAFA-Antrag/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /screenen/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run "src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx"` → FAIL (`Cannot find module './VerdictPanel'`).

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ClassificationPanel } from "@/components/trade/ClassificationPanel";

type StepStatus = "done" | "gap" | "blocked";
type Verdict = "GO" | "REVIEW" | "BLOCKED";

interface StepResult {
  step: string;
  status: StepStatus;
  summary: string;
  why: string;
}
interface Pendenz {
  label: string;
  actionHref?: string;
}
interface LineView {
  lineId: string;
  itemId: string;
  itemName: string;
  classification: unknown | null;
}
interface Assessment {
  operationId: string;
  counterpartyId: string;
  verdict: Verdict;
  headline: string;
  steps: StepResult[];
  pendenzen: Pendenz[];
  lines: LineView[];
}

const STEP_LABEL: Record<string, string> = {
  classify: "Klassifizieren",
  screen: "Screenen",
  jurisdiction: "Jurisdiktion / De-minimis",
  license: "Genehmigungsbedarf",
  form: "Formular",
};
const VERDICT_CLASS: Record<Verdict, string> = {
  GO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  BLOCKED: "border-red-500/40 bg-red-500/10 text-red-200",
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done")
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === "blocked") return <XCircle className="h-5 w-5 text-red-400" />;
  return <AlertTriangle className="h-5 w-5 text-amber-400" />;
}

export function VerdictPanel({ operationId }: { operationId: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screening, setScreening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}/assess`);
      if (!res.ok)
        throw new Error((await res.json()).error ?? "Prüfung fehlgeschlagen");
      setAssessment((await res.json()).assessment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runScreen = useCallback(async () => {
    if (!assessment) return;
    setScreening(true);
    try {
      await fetch(`/api/trade/parties/${assessment.counterpartyId}/screen`, {
        method: "POST",
      });
      await load();
    } finally {
      setScreening(false);
    }
  }, [assessment, load]);

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 text-trade-text-muted"
        data-testid="verdict-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Prüfe …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }
  if (!assessment) return null;

  return (
    <section className="space-y-5" data-testid="verdict-panel">
      <div
        className={`rounded-xl border px-5 py-4 text-lg font-semibold ${VERDICT_CLASS[assessment.verdict]}`}
      >
        {assessment.headline}
      </div>

      <ol className="space-y-2">
        {assessment.steps.map((s) => (
          <li
            key={s.step}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <StepIcon status={s.status} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">
                {STEP_LABEL[s.step] ?? s.step}
              </div>
              <div className="text-sm text-trade-text-muted">{s.summary}</div>
              {s.why && (
                <div className="mt-0.5 text-xs text-trade-text-muted/70">
                  {s.why}
                </div>
              )}
            </div>
            {s.step === "screen" && s.status === "gap" && (
              <button
                onClick={() => void runScreen()}
                disabled={screening}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {screening ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Jetzt screenen
              </button>
            )}
          </li>
        ))}
      </ol>

      {assessment.lines.some((l) => l.classification) && (
        <div className="space-y-2">
          {assessment.lines
            .filter((l) => l.classification)
            .map((l) => (
              <details
                key={l.lineId}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <summary className="cursor-pointer text-sm text-white">
                  Einstufungsdetails — {l.itemName}
                </summary>
                <div className="mt-3">
                  {/* ClassificationResult is structurally identical to the panel's prop type */}
                  <ClassificationPanel
                    classification={l.classification as never}
                  />
                </div>
              </details>
            ))}
        </div>
      )}

      {assessment.pendenzen.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="mb-2 text-sm font-medium text-amber-200">
            Offene Punkte
          </div>
          <ul className="space-y-1.5">
            {assessment.pendenzen.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 text-sm text-trade-text-muted"
              >
                <span>{p.label}</span>
                {p.actionHref && (
                  <Link
                    href={p.actionHref}
                    className="text-emerald-400 hover:underline"
                  >
                    öffnen
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white"
        >
          <RefreshCw className="h-4 w-4" /> Erneut prüfen
        </button>
        <Link
          href={`/trade/operations/${operationId}`}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white"
        >
          Zum Vorgang
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run "src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx"` → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx" "src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx"
git commit -m "feat(trade): verdict panel with inline screening + classification drill-down"
```

---

## Task 6: Wizard shell `new/page.tsx`

**Files:**

- Create: `src/app/(trade)/trade/operations/new/page.tsx`

Client component; state machine mirrors `AssessmentWizard.tsx` (a `step` value + handlers). v1 selects existing item + counterparty by id (quick-create is a Non-Goal). On the final step it creates the operation, adds the single line, then renders `VerdictPanel` (Task 5).

- [ ] **Step 1: Write the page** — `src/app/(trade)/trade/operations/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { VerdictPanel } from "./_components/VerdictPanel";

type Step = "was" | "anWen" | "wohin" | "ergebnis";

interface Draft {
  itemId: string;
  quantity: number;
  unitValue: number;
  counterpartyId: string;
  shipFromCountry: string;
  shipToCountry: string;
  declaredEndUse: "CIVIL" | "DUAL_USE" | "MILITARY" | "WMD_RELATED";
  endUserName: string;
}

const EMPTY: Draft = {
  itemId: "",
  quantity: 1,
  unitValue: 0,
  counterpartyId: "",
  shipFromCountry: "DE",
  shipToCountry: "",
  declaredEndUse: "CIVIL",
  endUserName: "",
};

export default function NewOperationWizardPage() {
  const [step, setStep] = useState<Step>("was");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  async function createOperationAndAssess() {
    setSubmitting(true);
    setError(null);
    try {
      const ref = `AV-${draft.shipToCountry || "XX"}-${Date.now().toString(36).toUpperCase()}`;
      const opRes = await fetch("/api/trade/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference: ref,
          description: `Geführter Ausfuhrvorgang nach ${draft.shipToCountry}`,
          operationType: "EXPORT",
          counterpartyId: draft.counterpartyId,
          shipFromCountry: draft.shipFromCountry,
          shipToCountry: draft.shipToCountry,
          declaredEndUse: draft.declaredEndUse,
          endUserName: draft.endUserName || undefined,
        }),
      });
      if (!opRes.ok)
        throw new Error(
          (await opRes.json()).error ?? "Vorgang konnte nicht angelegt werden",
        );
      const { operation } = await opRes.json();

      const lineRes = await fetch(
        `/api/trade/operations/${operation.id}/lines`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            itemId: draft.itemId,
            quantity: draft.quantity,
            unitValue: draft.unitValue,
          }),
        },
      );
      if (!lineRes.ok)
        throw new Error(
          (await lineRes.json()).error ??
            "Artikel konnte nicht hinzugefügt werden",
        );

      setOperationId(operation.id);
      setStep("ergebnis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-3xl px-6 py-8"
      data-testid="ausfuhrvorgang-wizard"
    >
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/trade/operations"
          className="inline-flex items-center gap-1 text-sm text-trade-text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Pipeline
        </Link>
        <h1 className="text-xl font-semibold text-white">
          Neuer Ausfuhrvorgang
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === "was" && (
        <section className="space-y-4">
          <h2 className="text-lg text-white">Was lieferst du?</h2>
          <label className="block text-sm text-trade-text-muted">
            Artikel-ID
            <input
              className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-white"
              value={draft.itemId}
              onChange={(e) => patch({ itemId: e.target.value })}
              placeholder="z. B. itm_…"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-trade-text-muted">
              Menge
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-white"
                value={draft.quantity}
                onChange={(e) => patch({ quantity: Number(e.target.value) })}
              />
            </label>
            <label className="block text-sm text-trade-text-muted">
              Stückwert (EUR)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-white"
                value={draft.unitValue}
                onChange={(e) => patch({ unitValue: Number(e.target.value) })}
              />
            </label>
          </div>
          <button
            disabled={!draft.itemId}
            onClick={() => setStep("anWen")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-white disabled:opacity-40"
          >
            Weiter <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === "anWen" && (
        <section className="space-y-4">
          <h2 className="text-lg text-white">An wen?</h2>
          <label className="block text-sm text-trade-text-muted">
            Gegenpartei-ID
            <input
              className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-white"
              value={draft.counterpartyId}
              onChange={(e) => patch({ counterpartyId: e.target.value })}
              placeholder="z. B. tp_…"
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("was")}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-white"
            >
              Zurück
            </button>
            <button
              disabled={!draft.counterpartyId}
              onClick={() => setStep("wohin")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-white disabled:opacity-40"
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === "wohin" && (
        <section className="space-y-4">
          <h2 className="text-lg text-white">Wohin und wozu?</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-trade-text-muted">
              Zielland (ISO-2)
              <input
                maxLength={2}
                className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 uppercase text-white"
                value={draft.shipToCountry}
                onChange={(e) =>
                  patch({ shipToCountry: e.target.value.toUpperCase() })
                }
                placeholder="CN"
              />
            </label>
            <label className="block text-sm text-trade-text-muted">
              Verwendung
              <select
                className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-white"
                value={draft.declaredEndUse}
                onChange={(e) =>
                  patch({
                    declaredEndUse: e.target.value as Draft["declaredEndUse"],
                  })
                }
              >
                <option value="CIVIL">Zivil</option>
                <option value="DUAL_USE">Dual-Use</option>
                <option value="MILITARY">Militärisch</option>
                <option value="WMD_RELATED">WMD-bezogen</option>
              </select>
            </label>
          </div>
          <label className="block text-sm text-trade-text-muted">
            Endverwender (optional)
            <input
              className="mt-1 w-full rounded-lg bg-white/[0.04] px-3 py-2 text-white"
              value={draft.endUserName}
              onChange={(e) => patch({ endUserName: e.target.value })}
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("anWen")}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-white"
            >
              Zurück
            </button>
            <button
              disabled={draft.shipToCountry.length !== 2 || submitting}
              onClick={createOperationAndAssess}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-white disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Prüfen: Darf ich liefern?
            </button>
          </div>
        </section>
      )}

      {step === "ergebnis" && operationId && (
        <VerdictPanel operationId={operationId} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → no errors referencing `new/page.tsx` or `VerdictPanel` (Task 5 already exists).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(trade)/trade/operations/new/page.tsx"
git commit -m "feat(trade): ausfuhrvorgang wizard shell (was/an wen/wohin → assess)"
```

---

## Task 7: Navigation entry + CTA

**Files:**

- Modify: `src/app/(trade)/trade/_components/TradeSidebar.tsx`
- Modify: `src/app/(trade)/trade/operations/page.tsx`

- [ ] **Step 1: Add the sidebar nav item.** In `TradeSidebar.tsx`, find the `SECTIONS` **Operations** group (first item `{ href: "/trade/operations", label: "Pipeline", ... }`). Insert **before** it:

```tsx
{
  href: "/trade/operations/new",
  label: "Geführter Vorgang",
  icon: Sparkles,
  match: (p: string) => p.startsWith("/trade/operations/new"),
  tooltip: "Geführter Ausfuhrvorgang: Was? An wen? Wohin? → ein Urteil.",
},
```

Add `Sparkles` to the existing `lucide-react` import in this file if not already imported.

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → no new errors in `TradeSidebar.tsx`.

- [ ] **Step 3: Add the pipeline CTA.** In `src/app/(trade)/trade/operations/page.tsx`, directly **before** the existing "New Operation" button (the one toggling `showNewForm`), add:

```tsx
<Link
  href="/trade/operations/new"
  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
>
  <Sparkles className="h-4 w-4" /> Geführter Vorgang
</Link>
```

Ensure `Link` (`next/link`) and `Sparkles` (`lucide-react`) are imported in this file; add to existing imports if missing. Keep the existing inline form button as the "advanced" path.

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/TradeSidebar.tsx" "src/app/(trade)/trade/operations/page.tsx"
git commit -m "feat(trade): surface the guided ausfuhrvorgang in sidebar + pipeline cta"
```

---

## Task 8: Full-feature verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole assistant test set**

```bash
npx vitest run \
  src/lib/trade/classification/classify-item.test.ts \
  src/lib/trade/operation-assistant-verdict.test.ts \
  src/lib/trade/operation-assistant.server.test.ts \
  "src/app/api/trade/operations/[id]/assess/route.test.ts" \
  "src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx"
```

Expected: ALL green.

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → no new errors attributable to new/modified files.

- [ ] **Step 3: Lint touched files**

```bash
npx eslint src/lib/trade/classification/classify-item.ts src/lib/trade/operation-assistant-verdict.ts src/lib/trade/operation-assistant.server.ts "src/app/(trade)/trade/operations/new/page.tsx" "src/app/(trade)/trade/operations/new/_components/VerdictPanel.tsx"
```

Expected: clean.

- [ ] **Step 4: Final commit if anything was adjusted**

```bash
git add -A
git commit -m "test(trade): verify ausfuhrvorgang assistant end-to-end" || echo "nothing to commit"
```

---

## v1 scoping notes (faithful to the approved spec)

- **Inline gap-solving, as chosen by the user ("Inline lösen + weiterführen"):** the **screening** gap is solved fully inline (one-click `POST .../screen` → re-assess). The **classification** gap routes to the existing item editor (`/trade/items/[id]`, which has the datasheet-upload + attribute UI) and the user returns to "Erneut prüfen". A datasheet-upload widget embedded _inside_ the wizard is v2 (Non-Goals).
- **Jurisdiction step uses the existing de-minimis outcome**, not a second `evaluateSubjectToEAR` call. The deployed classify path already derives EAR jurisdiction via `calculateDeMinimis`; a separate cascade call would need a synthetic single-component BoM and could yield a _divergent_ second jurisdiction answer. Representing step 3 via the de-minimis `outcome` is cheaper (no extra engine call) and avoids divergence. `evaluateSubjectToEAR` is reserved for the v2 multi-component BoM.
- **No new compliance logic.** Every legal decision still comes from `determineTriggers` / `calculateDeMinimis` / `determineLicenseRequirements` / `screenParty`. The assistant only orchestrates and presents.
- **Line-based orchestrator, single-item UI.** `assessOperation` already iterates `operation.lines`; only the wizard UI is single-item. Multi-item is a UI-only follow-up.
- **`assessOperation` never re-screens.** It reads the denormalized `screeningStatus` ("knows what's done", and keeps Claude/API runtime cost at zero for re-assessment). Screening is only (re)run by the explicit inline action.
- **`classifyItemForOperation` is strictly more correct than the items route** (forwards `actualCodes`, closing the dormant T-M5 wiring). Deduping the items route to delegate to it is a clean, separate follow-up (Sprint F cleanup), left out here to keep the deployed classify endpoint untouched.

## Deliberately NOT in v1 (YAGNI)

Quick-create of items/counterparties inside the wizard (v1 uses existing master-data ids), datasheet upload embedded in the wizard, multi-item BoM UI, mandate/customer templates, batch operations, automatic BAFA submission, the licence-time predictor inline, and a separate `evaluateSubjectToEAR` jurisdiction sub-step.
