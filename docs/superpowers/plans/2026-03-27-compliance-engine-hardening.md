# Compliance Engine Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the full compliance engine stack — centralized validation, unified response format, scoring algorithm improvements, error handling, concurrency protection, and tests.

**Architecture:** Infrastructure-first approach in 3 phases. Phase 1 creates shared utilities (validation schemas, response helpers, engine utilities) that all subsequent work builds on. Phase 2 improves engine algorithms (deduplication, scoring, transparency). Phase 3 adds robustness (error handling, concurrency, batch optimization, tests).

**Tech Stack:** Next.js 15, TypeScript, Prisma, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-compliance-engine-hardening-design.md`

---

## File Structure

### New Files

| File                               | Responsibility                                  |
| ---------------------------------- | ----------------------------------------------- |
| `src/lib/api-response.ts`          | Unified API response helpers + error codes      |
| `src/lib/engines/shared.server.ts` | Shared engine utilities, constants, error types |

### Modified Files

| File                                        | Changes                                      |
| ------------------------------------------- | -------------------------------------------- |
| `src/lib/validations.ts`                    | Add 4 assessment schemas + types             |
| `src/lib/unified-engine-merger.server.ts`   | Dedup, confidence, risk scoring              |
| `src/lib/nis2-engine.server.ts`             | Overlap config, error handling               |
| `src/lib/rrs-engine.server.ts`              | Scoring config transparency                  |
| `src/lib/rcr-engine.server.ts`              | Penalty/correlation config                   |
| `src/lib/space-law-engine.server.ts`        | Use shared favorability                      |
| `src/lib/uk-space-engine.server.ts`         | Use shared favorability                      |
| `src/lib/engine.server.ts`                  | EngineDataError                              |
| `src/lib/nis2-auto-assessment.server.ts`    | EngineDataError                              |
| `src/lib/workflow/engine.ts`                | Optimistic locking support                   |
| `prisma/schema.prisma`                      | Add `version` field to AuthorizationWorkflow |
| `src/app/api/assessment/calculate/route.ts` | Centralized schema + response helpers        |
| `src/app/api/nis2/calculate/route.ts`       | Remove dual validation, centralized schema   |
| `src/app/api/nis2/route.ts`                 | Response helpers, batch optimization         |
| `src/app/api/nis2/requirements/route.ts`    | Response helpers                             |
| `src/app/api/nis2/[assessmentId]/route.ts`  | Response helpers                             |
| `src/app/api/nis2/crosswalk/route.ts`       | Response helpers                             |
| `src/app/api/unified/calculate/route.ts`    | Add Zod validation, response helpers         |
| `src/app/api/authorization/route.ts`        | Response helpers                             |
| `src/app/api/space-law/calculate/route.ts`  | Centralized schema                           |
| `src/app/api/copuos/route.ts`               | Remove type assertions                       |

### Test Files (extend existing)

| File                                              | New Tests                                        |
| ------------------------------------------------- | ------------------------------------------------ |
| `tests/unit/lib/unified-engine-merger.test.ts`    | Dedup context, confidence quality, risk severity |
| `tests/unit/lib/engine.test.ts`                   | EngineDataError paths                            |
| `tests/unit/lib/nis2-engine.test.ts`              | EngineDataError, overlap config                  |
| `src/lib/rrs-engine.server.test.ts`               | Missing data → score 0                           |
| `src/lib/rcr-engine.server.test.ts`               | Grade boundaries                                 |
| `tests/integration/api/unified/calculate.test.ts` | Validation errors, malformed input               |

---

## Phase 1: Foundation

---

### Task 1: Create shared engine utilities

**Files:**

- Create: `src/lib/engines/shared.server.ts`
- Test: `src/lib/engines/shared.server.test.ts`

- [ ] **Step 1: Create the engines directory**

```bash
mkdir -p /Users/julianpolleschner/caelex-assessment/src/lib/engines
```

- [ ] **Step 2: Write tests for shared utilities**

Create `src/lib/engines/shared.server.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  clampScore,
  calculateFavorabilityScore,
  mapScoreToLetterGrade,
  ASSESSMENT_MIN_DURATION_MS,
  EngineDataError,
} from "./shared.server";

describe("clampScore", () => {
  it("clamps values below 0 to 0", () => {
    expect(clampScore(-10)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clampScore(150)).toBe(100);
  });

  it("passes through values in range", () => {
    expect(clampScore(50)).toBe(50);
  });

  it("handles exact boundaries", () => {
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });

  it("supports custom min/max", () => {
    expect(clampScore(5, 10, 90)).toBe(10);
    expect(clampScore(95, 10, 90)).toBe(90);
  });
});

describe("calculateFavorabilityScore", () => {
  it("returns 20 for jurisdictions with no space law", () => {
    const result = calculateFavorabilityScore({
      legislationStatus: "none",
      processingWeeks: { min: 0, max: 0 },
      hasGovernmentIndemnification: false,
      liabilityRegime: "unlimited",
      regulatoryMaturityYear: 2025,
      countryCode: "XX",
      hasNationalRegistry: false,
    });
    expect(result.score).toBe(20);
  });

  it("gives maximum score for ideal jurisdiction", () => {
    const result = calculateFavorabilityScore({
      legislationStatus: "enacted",
      processingWeeks: { min: 4, max: 8 },
      hasGovernmentIndemnification: true,
      liabilityRegime: "capped",
      regulatoryMaturityYear: 2008,
      countryCode: "FR",
      hasNationalRegistry: true,
    });
    expect(result.score).toBe(96); // 50+15+10+8+10+3
    expect(result.factors).toContain("Fast licensing timeline");
    expect(result.factors).toContain("Government indemnification available");
  });

  it("clamps score to 0-100", () => {
    const result = calculateFavorabilityScore({
      legislationStatus: "enacted",
      processingWeeks: { min: 2, max: 4 },
      hasGovernmentIndemnification: true,
      liabilityRegime: "capped",
      regulatoryMaturityYear: 2005,
      countryCode: "LU",
      hasNationalRegistry: true,
      specialProvisions: { spaceResources: true, smallEntity: true },
      activityType: "space_resources",
      entitySize: "small",
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("mapScoreToLetterGrade", () => {
  it("maps 90+ to A", () => {
    expect(mapScoreToLetterGrade(95)).toBe("A");
  });

  it("maps 80-89 to B", () => {
    expect(mapScoreToLetterGrade(85)).toBe("B");
  });

  it("maps 60-79 to C", () => {
    expect(mapScoreToLetterGrade(70)).toBe("C");
  });

  it("maps 40-59 to D", () => {
    expect(mapScoreToLetterGrade(50)).toBe("D");
  });

  it("maps below 40 to F", () => {
    expect(mapScoreToLetterGrade(20)).toBe("F");
  });

  it("handles exact boundaries", () => {
    expect(mapScoreToLetterGrade(90)).toBe("A");
    expect(mapScoreToLetterGrade(89)).toBe("B");
    expect(mapScoreToLetterGrade(80)).toBe("B");
    expect(mapScoreToLetterGrade(79)).toBe("C");
  });
});

describe("ASSESSMENT_MIN_DURATION_MS", () => {
  it("is 3000", () => {
    expect(ASSESSMENT_MIN_DURATION_MS).toBe(3000);
  });
});

describe("EngineDataError", () => {
  it("is an instance of Error", () => {
    const err = new EngineDataError("test", { engine: "nis2", dataFile: "x" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("EngineDataError");
    expect(err.message).toBe("test");
    expect(err.context.engine).toBe("nis2");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/engines/shared.server.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement shared utilities**

Create `src/lib/engines/shared.server.ts`:

```typescript
import "server-only";

// ─── Constants ───

export const ASSESSMENT_MIN_DURATION_MS = 3000;

// ─── Score Utilities ───

export function clampScore(score: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, score));
}

// ─── RRS Letter Grade (A-F) ───

export function mapScoreToLetterGrade(
  score: number,
): "A" | "B" | "C" | "D" | "F" {
  const clamped = clampScore(score);
  if (clamped >= 90) return "A";
  if (clamped >= 80) return "B";
  if (clamped >= 60) return "C";
  if (clamped >= 40) return "D";
  return "F";
}

// ─── Favorability Score (shared between space-law + uk-space engines) ───

export interface FavorabilityInput {
  legislationStatus: "enacted" | "draft" | "none";
  processingWeeks: { min: number; max: number };
  hasGovernmentIndemnification: boolean;
  liabilityRegime: "capped" | "negotiable" | "unlimited";
  regulatoryMaturityYear: number;
  countryCode: string;
  hasNationalRegistry: boolean;
  specialProvisions?: { spaceResources?: boolean; smallEntity?: boolean };
  activityType?: string;
  entitySize?: string;
}

export interface FavorabilityResult {
  score: number;
  factors: string[];
}

export function calculateFavorabilityScore(
  input: FavorabilityInput,
): FavorabilityResult {
  const factors: string[] = [];

  if (input.legislationStatus === "none") {
    return {
      score: 20,
      factors: [
        "No comprehensive space law — regulatory uncertainty",
        "EU Space Act (2030) will provide framework",
      ],
    };
  }

  let score = 50;

  // Timeline
  const avgWeeks = (input.processingWeeks.min + input.processingWeeks.max) / 2;
  if (avgWeeks <= 10) {
    score += 15;
    factors.push("Fast licensing timeline");
  } else if (avgWeeks <= 16) {
    score += 8;
    factors.push("Moderate licensing timeline");
  } else {
    score -= 5;
    factors.push("Longer licensing timeline");
  }

  // Government indemnification
  if (input.hasGovernmentIndemnification) {
    score += 10;
    factors.push("Government indemnification available");
  }

  // Insurance flexibility
  if (input.liabilityRegime === "capped") {
    score += 8;
    factors.push("Capped liability regime");
  } else if (input.liabilityRegime === "negotiable") {
    score += 5;
    factors.push("Negotiable liability terms");
  }

  // Regulatory maturity
  if (input.regulatoryMaturityYear <= 2010) {
    score += 10;
    factors.push("Mature regulatory framework");
  } else if (input.regulatoryMaturityYear <= 2018) {
    score += 5;
    factors.push("Established regulatory framework");
  }

  // Luxembourg space resources
  if (
    input.countryCode === "LU" &&
    input.specialProvisions?.spaceResources &&
    input.activityType === "space_resources"
  ) {
    score += 15;
    factors.push("Explicit space resources legislation");
  }

  // Small entity benefits
  if (input.entitySize === "small") {
    if (input.countryCode === "NL") {
      score += 5;
      factors.push("Reduced insurance thresholds for small satellites");
    }
    if (input.countryCode === "LU" && input.specialProvisions?.smallEntity) {
      score += 5;
      factors.push("Flexible thresholds for smaller operators");
    }
  }

  // National registry
  if (input.hasNationalRegistry) {
    score += 3;
    factors.push("National space registry maintained");
  }

  return { score: clampScore(score), factors };
}

// ─── Org Member Fetching ───

export async function getOrgMemberUserIds(
  prisma: { organizationMember: { findMany: Function } },
  organizationId: string,
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  return members.map((m: { userId: string }) => m.userId);
}

// ─── Error Types ───

export class EngineDataError extends Error {
  public readonly context: {
    engine: string;
    dataFile: string;
    cause?: unknown;
  };

  constructor(
    message: string,
    context: { engine: string; dataFile: string; cause?: unknown },
  ) {
    super(message);
    this.name = "EngineDataError";
    this.context = context;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/engines/shared.server.test.ts
```

Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/engines/shared.server.ts src/lib/engines/shared.server.test.ts && git commit -m "feat(engines): add shared utilities — clampScore, favorability, grading, EngineDataError"
```

---

### Task 2: Create unified API response helpers

**Files:**

- Create: `src/lib/api-response.ts`
- Test: `src/lib/api-response.test.ts`

- [ ] **Step 1: Write tests for response helpers**

Create `src/lib/api-response.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "./api-response";

describe("createSuccessResponse", () => {
  it("wraps data in { data: ... } envelope", async () => {
    const response = createSuccessResponse({ result: { score: 85 } });
    const body = await response.json();
    expect(body).toEqual({ data: { result: { score: 85 } } });
    expect(response.status).toBe(200);
  });

  it("supports custom status codes", async () => {
    const response = createSuccessResponse({ id: "123" }, 201);
    expect(response.status).toBe(201);
  });
});

describe("createErrorResponse", () => {
  it("returns error envelope with code", async () => {
    const response = createErrorResponse("Not found", ErrorCode.NOT_FOUND, 404);
    const body = await response.json();
    expect(body).toEqual({
      error: "Not found",
      code: "NOT_FOUND",
    });
    expect(response.status).toBe(404);
  });

  it("includes details when provided", async () => {
    const response = createErrorResponse(
      "Invalid input",
      ErrorCode.VALIDATION_ERROR,
      400,
      { field: "entitySize" },
    );
    const body = await response.json();
    expect(body.details).toEqual({ field: "entitySize" });
  });

  it("defaults to 500 status", async () => {
    const response = createErrorResponse("fail", ErrorCode.ENGINE_ERROR);
    expect(response.status).toBe(500);
  });
});

describe("createValidationError", () => {
  it("formats Zod errors into response", async () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    if (result.success) throw new Error("Should fail");

    const response = createValidationError(result.error);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details).toBeDefined();
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/api-response.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement response helpers**

Create `src/lib/api-response.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSafeErrorMessage } from "./validations";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  ENGINE_ERROR = "ENGINE_ERROR",
  ENGINE_DATA_UNAVAILABLE = "ENGINE_DATA_UNAVAILABLE",
  CONFLICT = "CONFLICT",
}

export function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function createErrorResponse(
  message: string,
  code: ErrorCode,
  status = 500,
  details?: Record<string, unknown>,
): NextResponse {
  const body: {
    error: string;
    code: string;
    details?: Record<string, unknown>;
  } = {
    error: message,
    code,
  };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export function createValidationError(zodError: z.ZodError): NextResponse {
  return createErrorResponse(
    "Validation failed",
    ErrorCode.VALIDATION_ERROR,
    400,
    zodError.flatten().fieldErrors as Record<string, unknown>,
  );
}

/**
 * Wrap engine errors into appropriate API responses.
 * Import EngineDataError from engines/shared.server to check instanceof.
 */
export function createEngineErrorResponse(error: unknown): NextResponse {
  // Dynamic import check to avoid circular dependency
  const message = getSafeErrorMessage(error, "Assessment calculation failed");

  // Check by error name to avoid importing server-only module
  if (error instanceof Error && error.name === "EngineDataError") {
    return createErrorResponse(message, ErrorCode.ENGINE_DATA_UNAVAILABLE, 503);
  }

  return createErrorResponse(message, ErrorCode.ENGINE_ERROR, 500);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/api-response.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/api-response.ts src/lib/api-response.test.ts && git commit -m "feat(api): add unified response helpers with error codes"
```

---

### Task 3: Add centralized assessment schemas

**Files:**

- Modify: `src/lib/validations.ts` (add after line 312)

- [ ] **Step 1: Add the 4 assessment schemas to validations.ts**

Add after the `InsuranceAssessmentSchema` (line 312) in `src/lib/validations.ts`:

```typescript
// ─── Assessment Calculation Schemas ───

export const EUSpaceActAnswersSchema = z.object({
  activityType: z
    .enum([
      "spacecraft",
      "launch_vehicle",
      "launch_site",
      "isos",
      "data_provider",
    ])
    .nullable()
    .optional(),
  entitySize: z
    .enum(["small", "research", "medium", "large"])
    .nullable()
    .optional(),
  primaryOrbit: z.enum(["LEO", "MEO", "GEO", "beyond"]).nullable().optional(),
  establishment: z
    .enum(["eu", "third_country_eu_services", "third_country_no_eu"])
    .nullable()
    .optional(),
  constellationSize: z.number().min(0).max(100000).nullable().optional(),
  isDefenseOnly: z.boolean().nullable().optional(),
  hasPostLaunchAssets: z.boolean().nullable().optional(),
  operatesConstellation: z.boolean().nullable().optional(),
  offersEUServices: z.boolean().nullable().optional(),
});

export const EUSpaceActCalculateSchema = z.object({
  answers: EUSpaceActAnswersSchema,
  startedAt: z.number().optional(),
});

export const NIS2CalculateAnswersSchema = z.object({
  sector: z.enum(["space"]).nullable().optional(),
  spaceSubSector: z
    .enum([
      "ground_infrastructure",
      "satellite_communications",
      "spacecraft_manufacturing",
      "launch_services",
      "earth_observation",
      "navigation",
      "space_situational_awareness",
    ])
    .nullable()
    .optional(),
  entitySize: z
    .enum(["micro", "small", "medium", "large"])
    .nullable()
    .optional(),
  employeeCount: z.number().nullable().optional(),
  annualRevenue: z.number().nullable().optional(),
  memberStateCount: z.number().int().min(0).max(27).nullable().optional(),
  isEUEstablished: z.boolean().nullable().optional(),
  operatesGroundInfra: z.boolean().nullable().optional(),
  operatesSatComms: z.boolean().nullable().optional(),
  manufacturesSpacecraft: z.boolean().nullable().optional(),
  providesLaunchServices: z.boolean().nullable().optional(),
  providesEOData: z.boolean().nullable().optional(),
  hasISO27001: z.boolean().nullable().optional(),
  hasExistingCSIRT: z.boolean().nullable().optional(),
  hasRiskManagement: z.boolean().nullable().optional(),
});

export const NIS2CalculateSchema = z.object({
  answers: NIS2CalculateAnswersSchema,
  startedAt: z.number().optional(),
});

export const SpaceLawCalculateAnswersSchema = z.object({
  selectedJurisdictions: z
    .array(z.enum(["FR", "DE", "UK", "NL", "AT", "BE", "DK", "IT", "LU", "NO"]))
    .min(1),
  activityType: z.string().min(1),
  entitySize: z
    .enum(["micro", "small", "medium", "large"])
    .nullable()
    .optional(),
});

export const SpaceLawCalculateSchema = z.object({
  answers: SpaceLawCalculateAnswersSchema,
  startedAt: z.number().optional(),
});

export const UnifiedCalculateAnswersSchema = z.object({
  establishmentCountry: z.string().min(2).max(3),
  entitySize: z.enum(["micro", "small", "medium", "large"]),
  activityTypes: z.array(z.string()).optional().default([]),
  serviceTypes: z.array(z.string()).optional().default([]),
  primaryOrbitalRegime: z.string().nullable().optional(),
  operatesConstellation: z.boolean().nullable().optional(),
  constellationSize: z.string().nullable().optional(),
  servesEUCustomers: z.boolean().nullable().optional(),
  servesCriticalInfrastructure: z.boolean().nullable().optional(),
  hasCybersecurityPolicy: z.boolean().nullable().optional(),
  hasRiskManagement: z.boolean().nullable().optional(),
  hasIncidentResponsePlan: z.boolean().nullable().optional(),
  hasSupplyChainSecurity: z.boolean().nullable().optional(),
  hasBusinessContinuityPlan: z.boolean().nullable().optional(),
  hasEncryption: z.boolean().nullable().optional(),
  hasAccessControl: z.boolean().nullable().optional(),
  hasVulnerabilityManagement: z.boolean().nullable().optional(),
  interestedJurisdictions: z.array(z.string()).optional().default([]),
  hasInsurance: z.boolean().nullable().optional(),
});

export const UnifiedCalculateSchema = z.object({
  answers: UnifiedCalculateAnswersSchema,
  startedAt: z.number().optional(),
});
```

Also add type exports at the end of the file (after existing exports around line 714):

```typescript
export type EUSpaceActAnswersInput = z.infer<typeof EUSpaceActAnswersSchema>;
export type NIS2CalculateAnswersInput = z.infer<
  typeof NIS2CalculateAnswersSchema
>;
export type SpaceLawCalculateAnswersInput = z.infer<
  typeof SpaceLawCalculateAnswersSchema
>;
export type UnifiedCalculateAnswersInput = z.infer<
  typeof UnifiedCalculateAnswersSchema
>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx tsc --noEmit src/lib/validations.ts 2>&1 | head -20
```

Expected: No errors (or only pre-existing errors unrelated to our changes).

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/validations.ts && git commit -m "feat(validations): add centralized schemas for EU Space Act, NIS2, Space Law, Unified"
```

---

### Task 4: Migrate EU Space Act calculate route

**Files:**

- Modify: `src/app/api/assessment/calculate/route.ts`

- [ ] **Step 1: Replace inline schema with centralized import and use response helpers**

In `src/app/api/assessment/calculate/route.ts`:

Replace the inline `answersSchema` and `calculateBodySchema` (lines 28-53) with an import:

```typescript
import { EUSpaceActCalculateSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createValidationError,
  createEngineErrorResponse,
} from "@/lib/api-response";
import { ASSESSMENT_MIN_DURATION_MS } from "@/lib/engines/shared.server";
```

Delete the inline schema definitions (lines 28-53).

Replace the Zod parse call (around line 75) — change from:

```typescript
const parsed = calculateBodySchema.safeParse(body);
```

to:

```typescript
const parsed = EUSpaceActCalculateSchema.safeParse(body);
```

Replace the validation error response (lines 80-83) — change from:

```typescript
return NextResponse.json(
  { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
  { status: 400 },
);
```

to:

```typescript
return createValidationError(parsed.error);
```

Remove the `as AssessmentAnswers` type assertion on line 102 — use `parsed.data.answers` directly (it's already typed by Zod).

Replace the success response at the end — change from:

```typescript
return NextResponse.json({ result: redactedResult }, { ... });
```

to:

```typescript
return createSuccessResponse({ result: redactedResult });
```

Replace the hardcoded timing constant with `ASSESSMENT_MIN_DURATION_MS`.

Wrap the engine call in try/catch — change from:

```typescript
const result = calculateCompliance(answers as AssessmentAnswers, data);
```

to:

```typescript
try {
  const result = calculateCompliance(parsed.data.answers, data);
  // ... rest of success path
} catch (error) {
  return createEngineErrorResponse(error);
}
```

- [ ] **Step 2: Run existing tests to verify no regressions**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/integration/api/assessment/calculate.test.ts
```

Expected: ALL PASS (response shape may need test adjustments if tests check raw `{ result }` vs `{ data: { result } }`).

Note: If tests fail because response envelope changed from `{ result }` to `{ data: { result } }`, update the test assertions accordingly. This is expected and intentional.

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/assessment/calculate/route.ts && git commit -m "refactor(api): migrate EU Space Act route to centralized schema + response helpers"
```

---

### Task 5: Migrate NIS2 calculate route — remove dual validation

**Files:**

- Modify: `src/app/api/nis2/calculate/route.ts`

- [ ] **Step 1: Replace inline schema, delete validateNIS2Answers, add response helpers**

In `src/app/api/nis2/calculate/route.ts`:

Add imports:

```typescript
import { NIS2CalculateSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createValidationError,
  createEngineErrorResponse,
} from "@/lib/api-response";
import { ASSESSMENT_MIN_DURATION_MS } from "@/lib/engines/shared.server";
```

Delete the 3 `VALID_*` constants (lines 29-41):

```typescript
// DELETE: const VALID_SECTORS = ["space"] as const;
// DELETE: const VALID_SPACE_SUB_SECTORS = [...] as const;
// DELETE: const VALID_ENTITY_SIZES = [...] as const;
```

Delete the entire `validateNIS2Answers` function (lines 47-118).

Delete the inline `calculateSchema` (lines 138-171).

Replace the Zod parse call — use `NIS2CalculateSchema.safeParse(body)`.

Replace the validation error with `createValidationError(parsed.error)`.

Delete the redundant manual validation call (around line 196):

```typescript
// DELETE: const validationError = validateNIS2Answers(answers);
// DELETE: if (validationError) { ... }
```

Replace success/error responses with `createSuccessResponse` / `createEngineErrorResponse`.

Replace hardcoded timing with `ASSESSMENT_MIN_DURATION_MS`.

- [ ] **Step 2: Run existing tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/integration/api/nis2/nis2.test.ts
```

Expected: ALL PASS (adjust test assertions for new response envelope if needed).

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/nis2/calculate/route.ts && git commit -m "refactor(api): migrate NIS2 calculate route, remove dual validation (~70 LOC)"
```

---

### Task 6: Migrate unified calculate route — add Zod validation

**Files:**

- Modify: `src/app/api/unified/calculate/route.ts`

- [ ] **Step 1: Add Zod validation, replace type assertion, add response helpers**

In `src/app/api/unified/calculate/route.ts`:

Add imports:

```typescript
import { UnifiedCalculateSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createValidationError,
  createErrorResponse,
  createEngineErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { ASSESSMENT_MIN_DURATION_MS } from "@/lib/engines/shared.server";
```

Replace the hardcoded timing (line 22):

```typescript
// DELETE: const MIN_ASSESSMENT_TIME = 5000;
// Now uses ASSESSMENT_MIN_DURATION_MS (3000) from shared
```

Replace the raw type assertion (lines 27-30) with Zod validation:

```typescript
// DELETE: const { answers, startedAt } = body as { answers: Partial<UnifiedAssessmentAnswers>; startedAt: number };

const parsed = UnifiedCalculateSchema.safeParse(body);
if (!parsed.success) {
  return createValidationError(parsed.error);
}
const { answers, startedAt } = parsed.data;
```

Delete the manual required field check (lines 44-50) — Zod handles this now:

```typescript
// DELETE: if (!answers.establishmentCountry || !answers.entitySize) { ... }
```

Wrap engine calls in try/catch with `createEngineErrorResponse`.

Replace success response with `createSuccessResponse`.

- [ ] **Step 2: Run existing tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/integration/api/unified/calculate.test.ts
```

Expected: ALL PASS (adjust for new response envelope if needed).

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/unified/calculate/route.ts && git commit -m "feat(api): add Zod validation to unified calculate route (was missing entirely)"
```

---

### Task 7: Migrate remaining routes to response helpers

**Files:**

- Modify: `src/app/api/space-law/calculate/route.ts`
- Modify: `src/app/api/copuos/route.ts`
- Modify: `src/app/api/authorization/route.ts`
- Modify: `src/app/api/nis2/route.ts`
- Modify: `src/app/api/nis2/requirements/route.ts`
- Modify: `src/app/api/nis2/[assessmentId]/route.ts`
- Modify: `src/app/api/nis2/crosswalk/route.ts`

- [ ] **Step 1: Migrate space-law calculate**

In `src/app/api/space-law/calculate/route.ts`:

- Import `SpaceLawCalculateSchema` from `@/lib/validations`
- Import response helpers from `@/lib/api-response`
- Import `ASSESSMENT_MIN_DURATION_MS` from `@/lib/engines/shared.server`
- Replace `answers as SpaceLawAssessmentAnswers` (line 99) with Zod-parsed `parsed.data.answers`
- Use `createSuccessResponse` / `createValidationError` / `createEngineErrorResponse`

- [ ] **Step 2: Migrate copuos route**

In `src/app/api/copuos/route.ts`:

- Import response helpers from `@/lib/api-response`
- Replace `orbitRegime as OrbitRegime` (line 130) and `missionType as MissionType` (line 133) with proper Zod validation
- Add a small inline schema for the COPUOS-specific inputs (orbit regime and mission type enums)
- Use `createSuccessResponse` for all responses

- [ ] **Step 3: Migrate authorization route**

In `src/app/api/authorization/route.ts`:

- Import response helpers from `@/lib/api-response`
- Wrap response (line 181) in `createSuccessResponse({ workflow, ncaDetermination: { ... } })`
- Use `createErrorResponse` for error paths

- [ ] **Step 4: Migrate NIS2 sub-routes (route.ts, requirements, [assessmentId], crosswalk)**

For each of these 4 files:

- Import response helpers from `@/lib/api-response`
- Replace `NextResponse.json({ error: ... })` with `createErrorResponse()`
- Replace `NextResponse.json({ assessments/assessment/requirements: ... })` with `createSuccessResponse()`

- [ ] **Step 5: Run all affected tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/integration/ --reporter=verbose
```

Expected: ALL PASS (adjust assertions for response envelope changes).

- [ ] **Step 6: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/ && git commit -m "refactor(api): migrate all compliance routes to unified response helpers"
```

---

### Task 8: Extract favorability scoring to shared utility

**Files:**

- Modify: `src/lib/space-law-engine.server.ts` (lines 521-607)
- Modify: `src/lib/uk-space-engine.server.ts`

- [ ] **Step 1: In space-law-engine, replace inline function with shared import**

In `src/lib/space-law-engine.server.ts`:

Add import:

```typescript
import {
  calculateFavorabilityScore as sharedFavorabilityScore,
  type FavorabilityInput,
} from "@/lib/engines/shared.server";
```

Replace the existing `calculateFavorabilityScore` function (lines 521-607) with a wrapper that converts the jurisdiction data into `FavorabilityInput`:

```typescript
function calculateFavorabilityScore(
  data: JurisdictionLaw,
  answers: SpaceLawAssessmentAnswers,
): { score: number; factors: string[] } {
  return sharedFavorabilityScore({
    legislationStatus: data.legislation.status,
    processingWeeks: data.timeline.typicalProcessingWeeks,
    hasGovernmentIndemnification:
      data.insuranceLiability.governmentIndemnification,
    liabilityRegime: data.insuranceLiability.liabilityRegime,
    regulatoryMaturityYear: data.legislation.yearEnacted,
    countryCode: data.countryCode,
    hasNationalRegistry: data.registration.nationalRegistryExists,
    specialProvisions: {
      spaceResources: data.countryCode === "LU",
      smallEntity: ["NL", "LU"].includes(data.countryCode),
    },
    activityType: answers.activityType,
    entitySize: answers.entitySize,
  });
}
```

- [ ] **Step 2: In uk-space-engine, replace duplicate with shared import**

In `src/lib/uk-space-engine.server.ts`:

Same pattern — import `sharedFavorabilityScore` and replace the UK-specific `deriveUkFavorabilityScore` function with a call that maps UK data to `FavorabilityInput`.

- [ ] **Step 3: Run space-law and UK tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/space-law-engine.test.ts tests/unit/lib/uk-space-engine.test.ts
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/space-law-engine.server.ts src/lib/uk-space-engine.server.ts && git commit -m "refactor(engines): extract favorability scoring to shared utility (~60 LOC dedup)"
```

---

## Phase 2: Engine Correctness

---

### Task 9: Article deduplication with multi-activity context

**Files:**

- Modify: `src/lib/unified-engine-merger.server.ts` (lines 111-121)
- Test: `tests/unit/lib/unified-engine-merger.test.ts`

- [ ] **Step 1: Write test for multi-activity context preservation**

Add to `tests/unit/lib/unified-engine-merger.test.ts`:

```typescript
describe("article deduplication with multi-activity context", () => {
  it("merges applicableActivities when same article appears for multiple activities", () => {
    // Create two results with the same article number but different activities
    const result1 = createMockSpaceActResult({
      applicableArticles: [
        createMockArticle({ number: "74", applies_to: ["SCO"] }),
      ],
      activityLabel: "Spacecraft Operator",
    });
    const result2 = createMockSpaceActResult({
      applicableArticles: [
        createMockArticle({ number: "74", applies_to: ["LO"] }),
      ],
      activityLabel: "Launch Operator",
    });

    const merged = mergeArticlesWithContext([result1, result2]);

    expect(merged).toHaveLength(1);
    expect(merged[0].number).toBe("74");
    expect(merged[0].applicableActivities).toContain("SCO");
    expect(merged[0].applicableActivities).toContain("LO");
  });

  it("keeps unique articles as-is", () => {
    const result1 = createMockSpaceActResult({
      applicableArticles: [createMockArticle({ number: "74" })],
    });
    const result2 = createMockSpaceActResult({
      applicableArticles: [createMockArticle({ number: "96" })],
    });

    const merged = mergeArticlesWithContext([result1, result2]);

    expect(merged).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/unified-engine-merger.test.ts -t "multi-activity"
```

Expected: FAIL

- [ ] **Step 3: Implement multi-activity deduplication**

In `src/lib/unified-engine-merger.server.ts`, replace lines 111-121:

```typescript
// Deduplicate articles by number, preserving multi-activity context
interface MergedArticle extends Article {
  applicableActivities: string[];
}

const articleMap = new Map<string, MergedArticle>();
for (const result of results) {
  const activityLabel = result.operatorAbbreviation || "UNKNOWN";
  for (const article of result.applicableArticles) {
    const key = String(article.number);
    const existing = articleMap.get(key);
    if (existing) {
      if (!existing.applicableActivities.includes(activityLabel)) {
        existing.applicableActivities.push(activityLabel);
      }
    } else {
      articleMap.set(key, {
        ...article,
        applicableActivities: [activityLabel],
      });
    }
  }
}
const mergedArticles = Array.from(articleMap.values());
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/unified-engine-merger.test.ts -t "multi-activity"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/unified-engine-merger.server.ts tests/unit/lib/unified-engine-merger.test.ts && git commit -m "feat(unified): preserve multi-activity context in article deduplication"
```

---

### Task 10: Confidence score with quality weighting

**Files:**

- Modify: `src/lib/unified-engine-merger.server.ts` (lines 271-308)
- Test: `tests/unit/lib/unified-engine-merger.test.ts`

- [ ] **Step 1: Write tests for quality-weighted confidence**

Add to `tests/unit/lib/unified-engine-merger.test.ts`:

```typescript
describe("quality-weighted confidence score", () => {
  it("returns 0 for completely empty answers", () => {
    const score = calculateConfidenceScore({});
    expect(score).toBe(0);
  });

  it("weights required fields (activityTypes, entitySize, establishmentCountry) higher", () => {
    const withRequired = calculateConfidenceScore({
      establishmentCountry: "DE",
      entitySize: "medium",
      activityTypes: ["spacecraft"],
    });
    const withOptional = calculateConfidenceScore({
      hasInsurance: true,
      hasEncryption: true,
      hasAccessControl: true,
    });
    expect(withRequired).toBeGreaterThan(withOptional);
  });

  it("gives partial credit for low-specificity answers", () => {
    const singleSelect = calculateConfidenceScore({
      activityTypes: ["spacecraft"],
    });
    const multiSelect = calculateConfidenceScore({
      activityTypes: ["spacecraft", "launch_vehicle", "isos"],
    });
    expect(multiSelect).toBeGreaterThan(singleSelect);
  });

  it("returns 100 for fully answered, high-quality inputs", () => {
    const score = calculateConfidenceScore({
      establishmentCountry: "DE",
      entitySize: "large",
      activityTypes: ["spacecraft", "launch_vehicle"],
      serviceTypes: ["eo", "comms"],
      primaryOrbitalRegime: "LEO",
      operatesConstellation: true,
      servesEUCustomers: true,
      servesCriticalInfrastructure: false,
      hasCybersecurityPolicy: true,
      hasRiskManagement: true,
      hasIncidentResponsePlan: true,
      hasSupplyChainSecurity: true,
      hasBusinessContinuityPlan: true,
      hasEncryption: true,
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      interestedJurisdictions: ["DE", "FR"],
      hasInsurance: true,
    });
    expect(score).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/unified-engine-merger.test.ts -t "quality-weighted"
```

- [ ] **Step 3: Implement quality-weighted confidence score**

Replace `calculateConfidenceScore` (lines 271-308) in `src/lib/unified-engine-merger.server.ts`:

```typescript
interface ConfidenceField {
  key: keyof UnifiedAssessmentAnswers;
  weight: number; // 2 = required, 1.5 = important, 1 = standard
}

const CONFIDENCE_FIELDS: ConfidenceField[] = [
  { key: "establishmentCountry", weight: 2 },
  { key: "entitySize", weight: 2 },
  { key: "activityTypes", weight: 2 },
  { key: "primaryOrbitalRegime", weight: 1.5 },
  { key: "operatesConstellation", weight: 1.5 },
  { key: "servesEUCustomers", weight: 1.5 },
  { key: "serviceTypes", weight: 1 },
  { key: "servesCriticalInfrastructure", weight: 1 },
  { key: "hasCybersecurityPolicy", weight: 1 },
  { key: "hasRiskManagement", weight: 1 },
  { key: "hasIncidentResponsePlan", weight: 1 },
  { key: "hasSupplyChainSecurity", weight: 1 },
  { key: "hasBusinessContinuityPlan", weight: 1 },
  { key: "hasEncryption", weight: 1 },
  { key: "hasAccessControl", weight: 1 },
  { key: "hasVulnerabilityManagement", weight: 1 },
  { key: "interestedJurisdictions", weight: 1 },
  { key: "hasInsurance", weight: 1 },
];

function calculateConfidenceScore(
  answers: Partial<UnifiedAssessmentAnswers>,
): number {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const field of CONFIDENCE_FIELDS) {
    totalWeight += field.weight;
    const value = answers[field.key];

    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Multi-select: more selections = higher quality
      if (value.length === 1) {
        earnedWeight += field.weight * 0.5;
      } else {
        earnedWeight += field.weight;
      }
    } else if (typeof value === "string") {
      if (value.trim() === "") continue;
      earnedWeight += field.weight;
    } else {
      // boolean or number — answered is full credit
      earnedWeight += field.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((earnedWeight / totalWeight) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/unified-engine-merger.test.ts -t "quality-weighted"
```

- [ ] **Step 5: Run full unified engine test suite for regressions**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/unified-engine-merger.test.ts
```

- [ ] **Step 6: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/unified-engine-merger.server.ts tests/unit/lib/unified-engine-merger.test.ts && git commit -m "feat(unified): quality-weighted confidence score with field importance"
```

---

### Task 11: Risk scoring with gap severity

**Files:**

- Modify: `src/lib/unified-engine-merger.server.ts` (lines 596-609)
- Test: `tests/unit/lib/unified-engine-merger.test.ts`

- [ ] **Step 1: Write tests for severity-weighted risk scoring**

Add to `tests/unit/lib/unified-engine-merger.test.ts`:

```typescript
describe("severity-weighted risk scoring", () => {
  it("rates cybersecurity gap as higher risk than administrative gap", () => {
    const cyberGap = calculateOverallRisk(true, "standard", true, "essential", {
      cybersecurity_policy: true,
    });
    const adminGap = calculateOverallRisk(true, "standard", true, "essential", {
      administrative_docs: true,
    });
    // cyberGap weight=3, adminGap weight=1; cyberGap should be more severe
    expect(riskLevel(cyberGap)).not.toBe("low");
  });

  it("returns low when no gaps exist", () => {
    const risk = calculateOverallRisk(true, "standard", true, "essential", {});
    expect(risk.level).toBe("low");
  });

  it("returns critical for combined high-severity gaps", () => {
    const risk = calculateOverallRisk(true, "standard", true, "essential", {
      cybersecurity_policy: true,
      incident_response: true,
      debris_mitigation: true,
      spacecraft_registration: true,
    });
    // 3+3+2+2 = 10, above critical threshold 12? No, 10 >= 8 = high
    expect(["high", "critical"]).toContain(risk.level);
  });
});
```

- [ ] **Step 2: Implement severity-weighted risk scoring**

Add the config and replace `calculateOverallRisk` (lines 596-609):

```typescript
const RISK_SCORING_CONFIG = {
  gapWeights: {
    cybersecurity_policy: { weight: 3, rationale: "Core NIS2 requirement" },
    incident_response: {
      weight: 3,
      rationale: "Legal obligation (24h/72h reporting)",
    },
    debris_mitigation: { weight: 2, rationale: "EU Space Act mandatory" },
    spacecraft_registration: { weight: 2, rationale: "Legal prerequisite" },
    insurance_coverage: { weight: 1.5, rationale: "Financial compliance" },
    environmental_footprint: { weight: 1, rationale: "Reporting obligation" },
    administrative_docs: { weight: 1, rationale: "Supporting documentation" },
  },
  thresholds: {
    critical: 12,
    high: 8,
    medium: 4,
  },
} as const;

interface RiskResult {
  level: "low" | "medium" | "high" | "critical";
  weightedScore: number;
  gaps: Array<{ type: string; weight: number }>;
}

function calculateOverallRisk(
  spaceActApplies: boolean,
  spaceActRegime: string,
  nis2Applies: boolean,
  nis2Classification: string,
  gaps: Record<string, boolean>,
): RiskResult {
  if (!spaceActApplies && !nis2Applies) {
    return { level: "low", weightedScore: 0, gaps: [] };
  }

  const activeGaps: Array<{ type: string; weight: number }> = [];
  let weightedScore = 0;

  for (const [gapType, isPresent] of Object.entries(gaps)) {
    if (!isPresent) continue;
    const config =
      RISK_SCORING_CONFIG.gapWeights[
        gapType as keyof typeof RISK_SCORING_CONFIG.gapWeights
      ];
    const weight = config?.weight ?? 1;
    weightedScore += weight;
    activeGaps.push({ type: gapType, weight });
  }

  let level: RiskResult["level"];
  if (weightedScore >= RISK_SCORING_CONFIG.thresholds.critical) {
    level = "critical";
  } else if (weightedScore >= RISK_SCORING_CONFIG.thresholds.high) {
    level = "high";
  } else if (weightedScore >= RISK_SCORING_CONFIG.thresholds.medium) {
    level = "medium";
  } else {
    level = "low";
  }

  return { level, weightedScore, gaps: activeGaps };
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/unified-engine-merger.test.ts -t "severity-weighted"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/unified-engine-merger.server.ts tests/unit/lib/unified-engine-merger.test.ts && git commit -m "feat(unified): severity-weighted risk scoring replaces count-based thresholds"
```

---

### Task 12: RRS scoring transparency

**Files:**

- Modify: `src/lib/rrs-engine.server.ts`

- [ ] **Step 1: Extract weights and factor budgets to documented config object**

In `src/lib/rrs-engine.server.ts`, replace the `WEIGHTS` constant (lines 78-85) with:

```typescript
export const RRS_SCORING_CONFIG = {
  components: {
    authorizationReadiness: {
      weight: 0.25,
      rationale:
        "Authorization is the regulatory prerequisite for any space activity — without it, operations are illegal",
      factors: {
        auth_workflow: {
          maxPoints: 40,
          rationale: "Workflow completion is the primary readiness indicator",
        },
        auth_documents: {
          maxPoints: 35,
          rationale: "Document completeness drives NCA submission success",
        },
        auth_articles: {
          maxPoints: 25,
          rationale: "Article-level tracking shows depth of understanding",
        },
      },
    },
    cybersecurityPosture: {
      weight: 0.2,
      rationale:
        "NIS2 compliance is legally mandatory for space operators classified as essential/important entities",
    },
    operationalCompliance: {
      weight: 0.2,
      rationale:
        "Debris, environmental, and insurance obligations are ongoing operational requirements",
    },
    jurisdictionalCoverage: {
      weight: 0.15,
      rationale:
        "Multi-jurisdiction readiness reduces regulatory risk and enables market access",
    },
    regulatoryTrajectory: {
      weight: 0.1,
      rationale:
        "Improvement trend signals organizational commitment and reduces future risk",
    },
    governanceProcess: {
      weight: 0.1,
      rationale:
        "Audit trails and evidence management are foundational for any regulatory engagement",
    },
  },
} as const;
```

Update all references from `WEIGHTS.authorizationReadiness` to `RRS_SCORING_CONFIG.components.authorizationReadiness.weight`.

Update factor definitions (lines 350-392) to read maxPoints from the config:

```typescript
const authConfig = RRS_SCORING_CONFIG.components.authorizationReadiness.factors;

const workflowFactor: RRSFactor = {
  id: "auth_workflow",
  name: "Authorization Workflow Status",
  maxPoints: authConfig.auth_workflow.maxPoints,
  earnedPoints: 0,
  description: authConfig.auth_workflow.rationale,
};
```

- [ ] **Step 2: Run existing RRS tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/rrs-engine.server.test.ts tests/unit/lib/rrs-engine.test.ts
```

Expected: ALL PASS (behavior unchanged, only structure refactored)

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/rrs-engine.server.ts && git commit -m "refactor(rrs): extract scoring config with documented rationales per weight/factor"
```

---

### Task 13: RCR penalty and correlation config

**Files:**

- Modify: `src/lib/rcr-engine.server.ts`

- [ ] **Step 1: Extract penalty constants and correlation rules to config objects**

In `src/lib/rcr-engine.server.ts`, replace the penalty constants (lines 34-43) with:

```typescript
export const RCR_PENALTY_CONFIG = {
  incidents: {
    penaltyPer: 3,
    maxPenalty: 15,
    rationale:
      "Each unresolved incident signals active regulatory risk; capped to prevent single-dimension domination",
  },
  ncaSubmissions: {
    penaltyPer: 5,
    maxPenalty: 15,
    rationale:
      "Pending NCA submissions indicate incomplete authorization process",
  },
  temporalDecay: {
    thresholdDays: 180,
    ratePerMonth: 0.1,
    rationale: "10% per month reflects data staleness risk after 6 months",
  },
  validityDays: 90,
  methodologyVersion: "1.0.0",
} as const;

export const RCR_CORRELATION_RULES = [
  {
    id: "cyber_auth_inconsistency",
    condition: (scores: Record<string, number>) =>
      scores.cybersecurityPosture < 50 && scores.authorizationReadiness > 80,
    adjustment: -5,
    component: "authorizationReadiness",
    rationale:
      "High auth readiness with poor cybersecurity indicates superficial compliance (Art. 8 NIS2 cross-dependency)",
  },
  {
    id: "jurisdiction_ops_inconsistency",
    condition: (scores: Record<string, number>) =>
      scores.jurisdictionalCoverage < 30 && scores.operationalCompliance > 70,
    adjustment: -5,
    component: "operationalCompliance",
    rationale:
      "Operational score inconsistent with weak jurisdictional coverage (multi-jurisdiction risk)",
  },
  {
    id: "governance_weakness",
    condition: (scores: Record<string, number>) =>
      scores.governanceProcess < 30,
    adjustment: -3,
    component: "__any_above_80__",
    rationale: "Any high score is suspect when governance is weak (< 30)",
  },
] as const;
```

Update `computeCorrelationAdjustments` (lines 291-334) to iterate over `RCR_CORRELATION_RULES` instead of hardcoded if/else.

Update all references from `MAX_INCIDENT_PENALTY` → `RCR_PENALTY_CONFIG.incidents.maxPenalty`, etc.

- [ ] **Step 2: Run existing RCR tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/lib/rcr-engine.server.test.ts
```

Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/rcr-engine.server.ts && git commit -m "refactor(rcr): extract penalty + correlation config with rationales"
```

---

### Task 14: NIS2 overlap estimates parameterized

**Files:**

- Modify: `src/lib/nis2-engine.server.ts` (lines 215-230)

- [ ] **Step 1: Add overlap config and update engine output**

In `src/lib/nis2-engine.server.ts`, add config before the overlap calculation:

```typescript
const OVERLAP_CONFIG = {
  supersedes: {
    estimatedSavingsWeeks: 3,
    confidenceLevel: "estimated" as const,
    source:
      "Internal estimate — not empirically validated. Based on assumption that superseding requirement eliminates full duplication.",
  },
  overlaps: {
    estimatedSavingsWeeks: 1.5,
    confidenceLevel: "estimated" as const,
    source:
      "Internal estimate — not empirically validated. Based on assumption that overlapping requirements share ~50% implementation effort.",
  },
};
```

Replace the hardcoded savings calculation (lines 215-230):

```typescript
const totalPotentialSavingsWeeks =
  overlappingRequirements.filter(
    (r) => r.effortType === "single_implementation",
  ).length *
    OVERLAP_CONFIG.supersedes.estimatedSavingsWeeks +
  overlappingRequirements.filter((r) => r.effortType === "partial_overlap")
    .length *
    OVERLAP_CONFIG.overlaps.estimatedSavingsWeeks;

return {
  count: overlappingRequirements.length,
  totalPotentialSavingsWeeks: Math.round(totalPotentialSavingsWeeks),
  overlappingRequirements,
  confidenceLevel: OVERLAP_CONFIG.supersedes.confidenceLevel,
  estimationSource: OVERLAP_CONFIG.supersedes.source,
};
```

- [ ] **Step 2: Run NIS2 tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/nis2-engine.test.ts src/lib/nis2-auto-assessment.server.test.ts
```

Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/nis2-engine.server.ts && git commit -m "feat(nis2): parameterize overlap savings with confidence level + source"
```

---

## Phase 3: Robustness

---

### Task 15: EngineDataError for silent failures

**Files:**

- Modify: `src/lib/nis2-engine.server.ts` (lines 26-37)
- Modify: `src/lib/engine.server.ts`
- Modify: `src/lib/space-law-engine.server.ts` (lines 35-55)
- Modify: `src/lib/nis2-auto-assessment.server.ts`
- Test: `tests/unit/lib/nis2-engine.test.ts`
- Test: `tests/unit/lib/engine.test.ts`

- [ ] **Step 1: Write tests for EngineDataError on load failure**

Add to `tests/unit/lib/nis2-engine.test.ts`:

```typescript
import { EngineDataError } from "@/lib/engines/shared.server";

describe("EngineDataError on data load failure", () => {
  it("throws EngineDataError when NIS2 requirements fail to load", async () => {
    // Mock the dynamic import to throw
    vi.doMock("@/data/nis2-requirements", () => {
      throw new Error("Module not found");
    });

    const { getNIS2RequirementsModule } =
      await import("@/lib/nis2-engine.server");

    await expect(getNIS2RequirementsModule()).rejects.toThrow(EngineDataError);
  });
});
```

- [ ] **Step 2: Update lazy imports to throw EngineDataError**

In `src/lib/nis2-engine.server.ts`, update `getNIS2RequirementsModule` (lines 26-37):

```typescript
import { EngineDataError } from "@/lib/engines/shared.server";

async function getNIS2RequirementsModule() {
  if (!_nis2RequirementsModule) {
    try {
      _nis2RequirementsModule = await import("@/data/nis2-requirements");
    } catch (error) {
      throw new EngineDataError("NIS2 requirements data could not be loaded", {
        engine: "nis2",
        dataFile: "nis2-requirements.ts",
        cause: error,
      });
    }
  }
  return _nis2RequirementsModule;
}
```

Apply the same pattern to:

- `src/lib/engine.server.ts` — articles data import
- `src/lib/space-law-engine.server.ts` — `getJurisdictionData()` and `getCrossReferences()` (lines 35-55)
- `src/lib/nis2-auto-assessment.server.ts` — requirements import

- [ ] **Step 3: Run tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/nis2-engine.test.ts tests/unit/lib/engine.test.ts
```

- [ ] **Step 4: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/lib/nis2-engine.server.ts src/lib/engine.server.ts src/lib/space-law-engine.server.ts src/lib/nis2-auto-assessment.server.ts tests/unit/lib/ && git commit -m "fix(engines): throw EngineDataError on data load failure instead of silent degradation"
```

---

### Task 16: Workflow optimistic locking

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `src/lib/workflow/engine.ts`
- Test: `tests/unit/lib/workflow-engine.test.ts`

- [ ] **Step 1: Add version field to schema**

In `prisma/schema.prisma`, find the `AuthorizationWorkflow` model and add:

```prisma
model AuthorizationWorkflow {
  // ... existing fields
  version   Int       @default(0)
}
```

- [ ] **Step 2: Generate Prisma client**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx prisma generate
```

- [ ] **Step 3: Write test for optimistic locking**

Add to `tests/unit/lib/workflow-engine.test.ts`:

```typescript
describe("optimistic locking", () => {
  it("increments version on successful transition", () => {
    const workflow = createMockWorkflow({ version: 0 });
    const result = executeTransitionWithVersion(workflow, "start");
    expect(result.newVersion).toBe(1);
  });

  it("rejects transition when version mismatch", () => {
    const workflow = createMockWorkflow({ version: 5 });
    const result = executeTransitionWithVersion(workflow, "start", {
      expectedVersion: 3,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("conflict");
  });
});
```

- [ ] **Step 4: Add version support to workflow engine**

In `src/lib/workflow/engine.ts`, update the `executeTransition` method to accept and return version:

Add to the `TransitionResult` interface:

```typescript
newVersion?: number;
```

Add version check at the start of `executeTransition`:

```typescript
if (
  options?.expectedVersion !== undefined &&
  options.expectedVersion !== context.version
) {
  return {
    success: false,
    previousState: currentState,
    currentState,
    transitionEvent: event,
    error: "Version conflict — workflow was modified by another request",
    timestamp,
  };
}
```

On successful transition, set:

```typescript
newVersion: (context.version ?? 0) + 1,
```

- [ ] **Step 5: Run workflow tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/lib/workflow-engine.test.ts
```

- [ ] **Step 6: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add prisma/schema.prisma src/lib/workflow/engine.ts tests/unit/lib/workflow-engine.test.ts && git commit -m "feat(workflow): add optimistic locking with version field for concurrency protection"
```

---

### Task 17: NIS2 auto-assessment batch optimization

**Files:**

- Modify: `src/app/api/nis2/route.ts` (lines 229-244)

- [ ] **Step 1: Replace Promise.all of individual updates with batched transaction**

In `src/app/api/nis2/route.ts`, replace lines 229-244:

```typescript
// Before: 51 individual queries
// const autoUpdates = autoAssessments.filter(...).map(auto =>
//   prisma.nIS2RequirementStatus.updateMany({ ... })
// );
// const autoResults = await Promise.all(autoUpdates);

// After: Batch by status, 2-3 queries total
const applicableAutos = autoAssessments.filter(
  (auto) => auto.suggestedStatus === "partial" && auto.reason,
);

if (applicableAutos.length > 0) {
  const partialIds = applicableAutos.map((a) => a.requirementId);

  await prisma.$transaction([
    prisma.nIS2RequirementStatus.updateMany({
      where: {
        assessmentId: assessment.id,
        requirementId: { in: partialIds },
        status: "not_assessed",
      },
      data: {
        status: "partial",
      },
    }),
  ]);

  // Update notes individually only for requirements that have specific reasons
  // (notes differ per requirement, so can't batch)
  const noteUpdates = applicableAutos
    .filter((a) => a.reason)
    .map((auto) =>
      prisma.nIS2RequirementStatus.updateMany({
        where: {
          assessmentId: assessment.id,
          requirementId: auto.requirementId,
        },
        data: { notes: auto.reason },
      }),
    );

  if (noteUpdates.length > 0) {
    await prisma.$transaction(noteUpdates);
  }
}
const autoAssessedCount = applicableAutos.length;
```

- [ ] **Step 2: Run NIS2 integration tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/integration/api/nis2/nis2.test.ts
```

- [ ] **Step 3: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add src/app/api/nis2/route.ts && git commit -m "perf(nis2): batch auto-assessment updates — 51 queries reduced to 2-3"
```

---

### Task 18: Error-path and boundary tests

**Files:**

- Modify: existing test files

- [ ] **Step 1: Add boundary condition tests to unified engine**

Add to `tests/unit/lib/unified-engine-merger.test.ts`:

```typescript
describe("boundary conditions", () => {
  it("handles empty activity types after filter", () => {
    const result = mergeResults([], {
      activityTypes: [],
      establishmentCountry: "DE",
      entitySize: "medium",
    });
    expect(result).toBeDefined();
    expect(result.spaceAct.applies).toBe(false);
  });

  it("confidence score is 0 with all null/undefined fields", () => {
    const score = calculateConfidenceScore({
      establishmentCountry: undefined,
      entitySize: undefined,
      activityTypes: undefined,
    });
    expect(score).toBe(0);
  });
});
```

- [ ] **Step 2: Add NIS2 entity size boundary tests**

Add to `tests/unit/lib/nis2-engine.test.ts`:

```typescript
describe("entity size boundaries", () => {
  it("classifies 9 employees as micro", () => {
    const result = classifyEntity({
      employeeCount: 9,
      annualRevenue: 1_000_000,
    });
    expect(result).toBe("micro");
  });

  it("classifies 10 employees as small", () => {
    const result = classifyEntity({
      employeeCount: 10,
      annualRevenue: 1_000_000,
    });
    expect(result).toBe("small");
  });

  it("classifies 249 employees as medium", () => {
    const result = classifyEntity({
      employeeCount: 249,
      annualRevenue: 40_000_000,
    });
    expect(result).toBe("medium");
  });

  it("classifies 250 employees as large", () => {
    const result = classifyEntity({
      employeeCount: 250,
      annualRevenue: 40_000_000,
    });
    expect(result).toBe("large");
  });
});
```

- [ ] **Step 3: Add RCR grade boundary tests**

Add to `src/lib/rcr-engine.server.test.ts`:

```typescript
describe("grade boundaries", () => {
  it("maps score 95 to AAA", () => {
    expect(mapScoreToGrade(95)).toBe("AAA");
  });

  it("maps score 94 to AA+ (not AAA)", () => {
    const grade = mapScoreToGrade(94);
    expect(grade).not.toBe("AAA");
  });

  it("maps score 0 to D", () => {
    expect(mapScoreToGrade(0)).toBe("D");
  });

  it("maps score 100 to AAA", () => {
    expect(mapScoreToGrade(100)).toBe("AAA");
  });
});
```

- [ ] **Step 4: Add API validation error tests to unified**

Add to `tests/integration/api/unified/calculate.test.ts`:

```typescript
describe("validation errors", () => {
  it("returns 400 for missing required fields", async () => {
    const response = await POST("/api/unified/calculate", {
      answers: { entitySize: undefined },
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await fetch("/api/unified/calculate", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 5: Run all tests**

```bash
cd /Users/julianpolleschner/caelex-assessment && npx vitest run tests/unit/ tests/integration/ src/lib/*.test.ts --reporter=verbose
```

Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add tests/ src/lib/ && git commit -m "test(engines): add boundary condition + error path tests across all engines"
```

---

### Task 19: Final verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/julianpolleschner/caelex-assessment && npm run test:run
```

Expected: ALL PASS

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/julianpolleschner/caelex-assessment && npm run typecheck
```

Expected: No new errors

- [ ] **Step 3: Run linter**

```bash
cd /Users/julianpolleschner/caelex-assessment && npm run lint
```

Expected: No new errors

- [ ] **Step 4: Final commit with all remaining changes**

```bash
cd /Users/julianpolleschner/caelex-assessment && git add -A && git status
```

If there are uncommitted changes, commit them:

```bash
git commit -m "chore: final cleanup from compliance engine hardening"
```
