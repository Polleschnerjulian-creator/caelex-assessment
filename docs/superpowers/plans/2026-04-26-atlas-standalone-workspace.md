# Atlas Standalone Workspace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine 5. Quick-Action im Atlas AI Mode (`⌘5` „Workspace öffnen") öffnet einen leeren persistenten `WorkspacePinboard` ohne Mandant-Setup. Promote-Pfad zu echtem Matter ist explizit als Status-Transition kodiert (`STANDALONE → PENDING_INVITE`).

**Architecture:** `LegalMatter` wird zum Status-Spectrum. Neuer Enum-Wert `STANDALONE` + nullable `clientOrgId`. Existing `WorkspacePinboard`/`Pinboard`/`ArtifactCard`/`ChatSidebar` werden 1:1 wiederverwendet (sie hängen an `matterId`, Status orthogonal). Promote = State-Transition + existing accept-token-flow.

**Tech Stack:** Prisma 5.22, Next.js 15 App Router, NextAuth v5, Vitest, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-04-26-atlas-standalone-workspace-design.md`

---

## File Structure

### Files to Create

| Path                                                                        | Responsibility                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `prisma/migrations/20260426120000_atlas_standalone_workspace/migration.sql` | Idempotente SQL — `STANDALONE` Enum-Wert hinzufügen, `clientOrgId` nullable machen            |
| `src/app/api/atlas/workspace/route.ts`                                      | POST endpoint — `createStandaloneMatter`, returns `{ matterId }`                              |
| `src/app/api/network/matter/[id]/promote/route.ts`                          | POST endpoint — `promoteStandaloneMatter`, returns `{ rawAcceptToken, expiresAt, acceptUrl }` |

### Files to Modify

| Path                                                                      | Change                                                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                    | `LegalMatter.clientOrgId` String → String?, `MatterStatus` enum +STANDALONE                                                                 |
| `src/lib/legal-network/matter-service.ts`                                 | `createStandaloneMatter`, `promoteStandaloneMatter`, neuer Error-Code `MATTER_NOT_STANDALONE`, neuer Error-Code `INVALID_STATE_FOR_PROMOTE` |
| `src/lib/legal-network/require-matter.ts` (oder gleichwertige Middleware) | STANDALONE als „active for lawFirm-side only" handhaben                                                                                     |
| `src/app/api/network/matters/route.ts`                                    | Query-Param `?status=` ergänzen                                                                                                             |
| `src/components/atlas/ai-mode/AIMode.tsx`                                 | 5. Quick-Action `Inbox`/`⌘5`, `runQuickAction("workspace")` mit direct-navigate                                                             |
| `src/components/atlas/ai-mode/ActionPanels.tsx`                           | `MattersPanel`: STANDALONE-Block oben. `InvitePanel`: optionaler `matterId`-Prop für Promote-Mode                                           |
| `src/components/legal-network/workspace/pinboard/MatterStatusBanner.tsx`  | STANDALONE-State mit Promote-Button                                                                                                         |
| `tests/unit/lib/legal-network/matter-service.test.ts`                     | Tests für die zwei neuen Service-Methoden                                                                                                   |

### Test files

| Path                                                           | Coverage                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `tests/unit/lib/legal-network/matter-service.test.ts` (modify) | Unit: createStandaloneMatter, promoteStandaloneMatter, state-transition assertions |
| `tests/integration/api/atlas-workspace.test.ts` (create)       | Integration: POST /api/atlas/workspace happy path + auth gates                     |
| `tests/integration/api/matter-promote.test.ts` (create)        | Integration: POST .../promote happy path + state-machine errors                    |

---

## Task 1: Schema-Migration

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260426120000_atlas_standalone_workspace/migration.sql`

- [ ] **Step 1: Schema editieren — `clientOrgId` nullable**

In `prisma/schema.prisma`, finde im `model LegalMatter` Block die Zeile mit `clientOrgId  String` und ändere auf:

```prisma
model LegalMatter {
  ...
  lawFirmOrgId String
  clientOrgId  String?  // null im STANDALONE-State (workspace ohne Mandant)
  ...
}
```

- [ ] **Step 2: Schema editieren — STANDALONE Enum-Wert**

Im gleichen File, finde den `enum MatterStatus` Block und füge `STANDALONE` als ersten Wert hinzu:

```prisma
enum MatterStatus {
  STANDALONE       // solo workspace, kein client, kein handshake
  PENDING_INVITE
  PENDING_CONSENT
  ACTIVE
  SUSPENDED
  CLOSED
  REVOKED
}
```

- [ ] **Step 3: Migration-SQL schreiben**

Das Schema kennt jetzt `STANDALONE` und nullable `clientOrgId`. Erstelle das Migration-Verzeichnis + SQL manuell (idempotent, weil DATABASE_URL lokal nicht verfügbar):

```bash
mkdir -p prisma/migrations/20260426120000_atlas_standalone_workspace
```

Erstelle `prisma/migrations/20260426120000_atlas_standalone_workspace/migration.sql`:

```sql
-- Atlas Standalone Workspace — Idempotente Migration
-- Erweitert LegalMatter um STANDALONE-Status + nullable clientOrgId

-- 1. Enum-Wert STANDALONE ergänzen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MatterStatus' AND e.enumlabel = 'STANDALONE'
  ) THEN
    ALTER TYPE "MatterStatus" ADD VALUE 'STANDALONE' BEFORE 'PENDING_INVITE';
  END IF;
END$$;

-- 2. clientOrgId nullable machen (idempotent — ALTER COLUMN DROP NOT NULL ist
--    in Postgres ein no-op wenn die Column schon nullable ist)
ALTER TABLE "LegalMatter" ALTER COLUMN "clientOrgId" DROP NOT NULL;
```

- [ ] **Step 4: Prisma-Client regenerieren**

```bash
npx prisma generate
```

Expected output: „Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client"

- [ ] **Step 5: TypeScript-Check**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -cE "^[^[:space:]].+\.tsx?\([0-9]+,[0-9]+\): error"
```

Expected: gleicher Wert wie vor der Änderung (preexisting baseline ~810). Wenn höher → ein non-null Lookup auf `clientOrgId` ist gebrochen. Suche mit `npx tsc --noEmit | grep clientOrgId` und fixe punktuell mit `?? ""` oder null-checks.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260426120000_atlas_standalone_workspace/
git commit -m "feat(atlas): schema for standalone workspace (clientOrgId nullable + STANDALONE status)"
```

---

## Task 2: matter-service — createStandaloneMatter

**Files:**

- Modify: `src/lib/legal-network/matter-service.ts`
- Test: `tests/unit/lib/legal-network/matter-service.test.ts`

- [ ] **Step 1: Failing Test schreiben**

Öffne `tests/unit/lib/legal-network/matter-service.test.ts`. Am Ende der bestehenden Tests, vor dem letzten `});` der äußeren `describe`, einfügen:

```typescript
describe("createStandaloneMatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a STANDALONE matter with null clientOrgId and empty scope", async () => {
    const created = {
      id: "m_solo_1",
      lawFirmOrgId: "lf_1",
      clientOrgId: null,
      name: "Neuer Workspace · 26.04.2026",
      reference: null,
      description: null,
      scope: [],
      status: "STANDALONE",
      invitedBy: "u_1",
      invitedFrom: "ATLAS",
      invitedAt: new Date(),
    };
    (
      prisma.legalMatter.create as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(created);

    const result = await createStandaloneMatter({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
    });

    expect(result.matterId).toBe("m_solo_1");
    expect(prisma.legalMatter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lawFirmOrgId: "lf_1",
        clientOrgId: null,
        status: "STANDALONE",
        scope: [],
        invitedBy: "u_1",
        invitedFrom: "ATLAS",
      }),
      select: { id: true },
    });
  });

  it("uses the provided name when given", async () => {
    (
      prisma.legalMatter.create as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "m_solo_2",
    });
    await createStandaloneMatter({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
      name: "Q4 IPO due-diligence",
    });
    expect(prisma.legalMatter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Q4 IPO due-diligence" }),
      select: { id: true },
    });
  });
});
```

Stelle sicher dass `createStandaloneMatter` oben mit den anderen Service-Funktionen importiert ist:

```typescript
import {
  createInvite,
  acceptInvite,
  rejectInvite,
  revokeMatter,
  setMatterStatus,
  createStandaloneMatter, // neu
} from "@/lib/legal-network/matter-service";
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/unit/lib/legal-network/matter-service.test.ts -t createStandaloneMatter
```

Expected: FAIL mit „createStandaloneMatter is not exported" oder „is not a function".

- [ ] **Step 3: Service-Funktion implementieren**

In `src/lib/legal-network/matter-service.ts`, nach dem `setMatterStatus`-Export (Zeile ~526), neue Funktion einfügen:

```typescript
/**
 * Erstellt ein leeres STANDALONE-Matter („Quick-Pinboard"). Kein
 * Mandant, kein Scope, kein Invite-Token. Lawyer-side-only.
 *
 * Wird über die 5. Quick-Action im Atlas AI Mode (⌘5) aufgerufen.
 * Aus dem Status STANDALONE kann das Matter via promoteStandaloneMatter
 * zum echten Mandat werden — siehe dortige Doku.
 */
export async function createStandaloneMatter(input: {
  lawFirmOrgId: string;
  createdBy: string;
  name?: string;
}): Promise<{ matterId: string }> {
  const defaultName = `Neuer Workspace · ${new Date().toLocaleDateString(
    "de-DE",
    { day: "2-digit", month: "2-digit", year: "numeric" },
  )}`;

  const created = await prisma.legalMatter.create({
    data: {
      lawFirmOrgId: input.lawFirmOrgId,
      clientOrgId: null,
      name: input.name?.trim() || defaultName,
      scope: [] as unknown as Prisma.InputJsonValue,
      status: "STANDALONE",
      invitedBy: input.createdBy,
      invitedFrom: "ATLAS",
    },
    select: { id: true },
  });

  return { matterId: created.id };
}
```

Falls `Prisma` noch nicht importiert ist, oben im File ergänzen: `import { Prisma } from "@prisma/client";`.

- [ ] **Step 4: Test laufen lassen — muss durchgehen**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/unit/lib/legal-network/matter-service.test.ts -t createStandaloneMatter
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/legal-network/matter-service.ts tests/unit/lib/legal-network/matter-service.test.ts
git commit -m "feat(atlas): matter-service.createStandaloneMatter"
```

---

## Task 3: matter-service — promoteStandaloneMatter

**Files:**

- Modify: `src/lib/legal-network/matter-service.ts`
- Test: `tests/unit/lib/legal-network/matter-service.test.ts`

- [ ] **Step 1: Failing Test schreiben**

In `matter-service.test.ts`, nach dem `createStandaloneMatter`-describe-Block einfügen:

```typescript
describe("promoteStandaloneMatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions STANDALONE matter to PENDING_INVITE and mints token", async () => {
    (
      prisma.legalMatter.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "m_solo_1",
      status: "STANDALONE",
      lawFirmOrgId: "lf_1",
      clientOrgId: null,
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (cb) => cb(prisma),
    );
    (
      prisma.legalMatter.update as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "m_solo_1",
      status: "PENDING_INVITE",
    });
    (
      prisma.legalMatterInvitation.create as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ id: "inv_1" });

    const result = await promoteStandaloneMatter({
      matterId: "m_solo_1",
      clientOrgId: "co_1",
      scope: [{ category: "DOCUMENTS", permissions: ["READ"] }],
      durationMonths: 12,
      invitingUserId: "u_1",
    });

    expect(result.rawAcceptToken).toBeTruthy();
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(prisma.legalMatter.update).toHaveBeenCalledWith({
      where: { id: "m_solo_1" },
      data: expect.objectContaining({
        clientOrgId: "co_1",
        status: "PENDING_INVITE",
      }),
    });
  });

  it("rejects when matter is not in STANDALONE state", async () => {
    (
      prisma.legalMatter.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "m_active",
      status: "ACTIVE",
      lawFirmOrgId: "lf_1",
      clientOrgId: "co_1",
    });

    await expect(
      promoteStandaloneMatter({
        matterId: "m_active",
        clientOrgId: "co_2",
        scope: [],
        durationMonths: 12,
        invitingUserId: "u_1",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_STATE_FOR_PROMOTE",
    });
  });

  it("rejects when matter does not exist", async () => {
    (
      prisma.legalMatter.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);

    await expect(
      promoteStandaloneMatter({
        matterId: "m_missing",
        clientOrgId: "co_1",
        scope: [],
        durationMonths: 12,
        invitingUserId: "u_1",
      }),
    ).rejects.toMatchObject({
      code: "MATTER_NOT_FOUND",
    });
  });
});
```

Import-Statement oben erweitern:

```typescript
import {
  createInvite,
  acceptInvite,
  rejectInvite,
  revokeMatter,
  setMatterStatus,
  createStandaloneMatter,
  promoteStandaloneMatter, // neu
} from "@/lib/legal-network/matter-service";
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/unit/lib/legal-network/matter-service.test.ts -t promoteStandaloneMatter
```

Expected: FAIL mit „is not a function" + die zwei Error-Code-Tests fail mit gleichem Grund.

- [ ] **Step 3: Error-Codes erweitern**

In `src/lib/legal-network/matter-service.ts`, finde `MatterServiceErrorCode` (Zeile ~34) und ergänze die zwei neuen Codes:

```typescript
export type MatterServiceErrorCode =
  | "MATTER_NOT_FOUND"
  | "TOKEN_INVALID"
  | "TOKEN_CONSUMED"
  | "TOKEN_EXPIRED"
  | "NOT_AUTHORIZED"
  | "MATTER_WRONG_STATE"
  | "SCOPE_WIDENED"
  | "INVALID_SCOPE"
  | "INVALID_STATE_FOR_PROMOTE" // neu
  | "MATTER_NOT_STANDALONE"; // neu (defensive — falls die check-pass-through für andere ops)
```

Falls eine der oben genannten Codes nicht existiert, lass sie weg — das ist nur die Vorlage. Schau in der Datei nach den existing Codes und appendiere nur die zwei neuen.

- [ ] **Step 4: Service-Funktion implementieren**

In `src/lib/legal-network/matter-service.ts`, nach `createStandaloneMatter` einfügen:

```typescript
/**
 * Promotet ein STANDALONE-Matter zum echten Mandat. Mandant + Scope
 * kommen rein, Status → PENDING_INVITE, accept-token wird geminted.
 * Ab hier läuft der existing accept-flow.
 *
 * Werft INVALID_STATE_FOR_PROMOTE wenn der Matter nicht in STANDALONE
 * ist — kein silent-overwrite, weil das die scope/handshake-Semantik
 * eines bereits aktiven Matters zerstören würde.
 */
export async function promoteStandaloneMatter(input: {
  matterId: string;
  clientOrgId: string;
  scope: ScopeItem[];
  durationMonths: number;
  invitingUserId: string;
}): Promise<{ rawAcceptToken: string; expiresAt: Date }> {
  const matter = await prisma.legalMatter.findUnique({
    where: { id: input.matterId },
    select: { id: true, status: true, lawFirmOrgId: true, clientOrgId: true },
  });
  if (!matter) {
    throw new MatterServiceError("MATTER_NOT_FOUND", "Matter nicht gefunden");
  }
  if (matter.status !== "STANDALONE") {
    throw new MatterServiceError(
      "INVALID_STATE_FOR_PROMOTE",
      `Promote nur aus STANDALONE möglich, aktueller Status: ${matter.status}`,
    );
  }

  // Token mint via existing helper (siehe createInvite — gleiche Mechanik)
  const { rawToken, tokenHash } = await mintInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.$transaction(async (tx) => {
    await tx.legalMatter.update({
      where: { id: input.matterId },
      data: {
        clientOrgId: input.clientOrgId,
        scope: input.scope as unknown as Prisma.InputJsonValue,
        status: "PENDING_INVITE",
        invitedBy: input.invitingUserId,
        invitedAt: new Date(),
      },
    });
    await tx.legalMatterInvitation.create({
      data: {
        matterId: input.matterId,
        tokenHash,
        proposedScope: input.scope as unknown as Prisma.InputJsonValue,
        proposedDurationMonths: input.durationMonths,
        expiresAt,
        invitedBy: input.invitingUserId,
      },
    });
  });

  return { rawAcceptToken: rawToken, expiresAt };
}
```

Wichtig: `mintInviteToken()` ist die existing Helper-Funktion in `src/lib/legal-network/tokens.ts`. Wenn der Funktionsname dort anders heißt, schau nach (z.B. `hashToken`, `mintToken`) und passe an. Schaue dazu auch wie `createInvite()` heute den Token mintet — folge exakt dem Pattern.

- [ ] **Step 5: Test laufen lassen — muss durchgehen**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/unit/lib/legal-network/matter-service.test.ts -t promoteStandaloneMatter
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/legal-network/matter-service.ts tests/unit/lib/legal-network/matter-service.test.ts
git commit -m "feat(atlas): matter-service.promoteStandaloneMatter (state-transition)"
```

---

## Task 4: Gate-Patches in existing services

Drei Stellen müssen STANDALONE-aware werden. Jede ist eine eigenständige kleine Änderung — separat testen.

**Files:**

- Modify: `src/lib/legal-network/require-matter.ts` (oder gleichwertige Auth-Middleware)
- Modify: `src/lib/legal-network/scope.ts` (validation)
- Modify: `src/app/api/network/matters/route.ts` (status filter + null-clientOrgId Listing)
- Test: `tests/unit/lib/legal-network/require-matter.test.ts`

- [ ] **Step 1: requireActiveMatter — STANDALONE für lawFirm-side erlauben**

Öffne `src/lib/legal-network/require-matter.ts`. Finde die Stelle wo der Status geprüft wird (typisch: `if (matter.status !== "ACTIVE") throw ...`). Erweitere:

```typescript
// STANDALONE = lawyer-side workspace ohne Mandant. Lawyer hat
// Vollzugriff (es gibt keinen anderen Stakeholder), Operator ist
// per definitionem nicht eingeladen → 403 für non-lawFirm-side.
if (matter.status === "STANDALONE") {
  if (callerOrgId !== matter.lawFirmOrgId) {
    throw new MatterServiceError(
      "NOT_AUTHORIZED",
      "Workspace ist privat — nur Kanzlei-Seite hat Zugriff",
    );
  }
  return matter;  // bypass den ACTIVE-Check
}

// Existing logic für PENDING/ACTIVE/...
if (matter.status !== "ACTIVE") {
  throw new MatterServiceError("MATTER_WRONG_STATE", ...);
}
```

Pass die Variablennamen (`callerOrgId`, `matter`) an den existing Code an — der grobe Pattern kommt nicht von mir, ich kenne den exakten Aufruf nicht. Wenn die Middleware anders strukturiert ist, finde die status-Prüfung und füge den STANDALONE-Branch davor ein.

- [ ] **Step 2: Test schreiben für requireActiveMatter — STANDALONE erlaubt für lawFirm-side**

In `tests/unit/lib/legal-network/require-matter.test.ts` ergänzen:

```typescript
it("STANDALONE matter passes for lawFirm-side caller", async () => {
  (
    prisma.legalMatter.findUnique as ReturnType<typeof vi.fn>
  ).mockResolvedValueOnce({
    id: "m_solo",
    status: "STANDALONE",
    lawFirmOrgId: "lf_1",
    clientOrgId: null,
  });

  const result = await requireActiveMatter({
    matterId: "m_solo",
    callerOrgId: "lf_1",
  });
  expect(result.id).toBe("m_solo");
});

it("STANDALONE matter rejects non-lawFirm caller with NOT_AUTHORIZED", async () => {
  (
    prisma.legalMatter.findUnique as ReturnType<typeof vi.fn>
  ).mockResolvedValueOnce({
    id: "m_solo",
    status: "STANDALONE",
    lawFirmOrgId: "lf_1",
    clientOrgId: null,
  });

  await expect(
    requireActiveMatter({ matterId: "m_solo", callerOrgId: "co_1" }),
  ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
});
```

Pass die Argument-Form (`{matterId, callerOrgId}`) an die echte Funktionssignatur an.

- [ ] **Step 3: Test laufen lassen**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/unit/lib/legal-network/require-matter.test.ts
```

Expected: alle existing + die zwei neuen Tests pass.

- [ ] **Step 4: Scope-Validation — STANDALONE skippen**

Öffne `src/lib/legal-network/scope.ts`. Wenn dort eine Funktion wie `validateScope(scope, status)` existiert: skip-branch für STANDALONE einfügen. Wenn die Validation rein client-seitig ist, ist hier nichts zu tun — überspring diesen Step.

Pattern (bei status-aware Validation):

```typescript
export function validateScope(scope: ScopeItem[], status?: MatterStatus) {
  if (status === "STANDALONE") return { ok: true }; // scope = [] per definition
  // existing validation
}
```

- [ ] **Step 5: matters-Listing — null-clientOrgId Behandlung**

Öffne `src/app/api/network/matters/route.ts`. Im GET-Handler ergänze einen `?status=` Query-Param:

```typescript
const url = new URL(request.url);
const statusParam = url.searchParams.get("status"); // z.B. "STANDALONE,ACTIVE"
const statusFilter = statusParam
  ? statusParam.split(",").filter(Boolean)
  : null;

const matters = await prisma.legalMatter.findMany({
  where: {
    OR: [{ lawFirmOrgId: callerOrgId }, { clientOrgId: callerOrgId }],
    ...(statusFilter ? { status: { in: statusFilter as MatterStatus[] } } : {}),
  },
  include: {
    // ... existing includes
    clientOrg: { select: { id: true, name: true, slug: true } }, // bleibt nullable
  },
  orderBy: { invitedAt: "desc" },
});
```

Wichtig: das `include: { clientOrg: ... }` muss gegen null robust sein — Prisma returnt automatisch `clientOrg: null` wenn `clientOrgId === null`. Konsumenten am Frontend müssen das handhaben (siehe Task 9).

- [ ] **Step 6: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -cE "^[^[:space:]].+\.tsx?\([0-9]+,[0-9]+\): error"
```

Expected: gleicher baseline-Wert.

- [ ] **Step 7: Commit**

```bash
git add src/lib/legal-network/ src/app/api/network/matters/route.ts tests/unit/lib/legal-network/require-matter.test.ts
git commit -m "feat(atlas): gate-patches for STANDALONE state (require-matter, scope, listing)"
```

---

## Task 5: API — POST /api/atlas/workspace

**Files:**

- Create: `src/app/api/atlas/workspace/route.ts`

- [ ] **Step 1: Route-Datei erstellen**

```bash
mkdir -p src/app/api/atlas/workspace
```

Erstelle `src/app/api/atlas/workspace/route.ts`:

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/atlas/workspace
 *
 * Atlas-AI-Mode 5. Quick-Action ⌘5: Erstellt einen leeren STANDALONE
 * Matter (ohne Mandant, ohne Scope, ohne Handshake) und gibt die
 * matterId zurück. Client navigiert anschließend zu
 * /atlas/network/{matterId}/workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  createStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "legal_matter_invite",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        organization: {
          select: { id: true, orgType: true, isActive: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership || !membership.organization.isActive) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }
    // Atlas (lawyer-side) — operators are not lawyers, no workspace
    // privilege for them.
    if (
      membership.organization.orgType !== "LAW_FIRM" &&
      membership.organization.orgType !== "BOTH"
    ) {
      return NextResponse.json(
        { error: "Workspace is for law-firm orgs only" },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createStandaloneMatter({
      lawFirmOrgId: membership.organizationId,
      createdBy: session.user.id,
      name: parsed.data.name,
    });

    return NextResponse.json({ matterId: result.matterId });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace failed: ${msg}`);
    return NextResponse.json(
      { error: "Workspace creation failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "atlas/workspace" | head -5
```

Expected: keine Errors für die neue Route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/atlas/workspace/
git commit -m "feat(atlas): POST /api/atlas/workspace endpoint"
```

---

## Task 6: API — POST /api/network/matter/[id]/promote

**Files:**

- Create: `src/app/api/network/matter/[id]/promote/route.ts`

- [ ] **Step 1: Route-Datei erstellen**

```bash
mkdir -p "src/app/api/network/matter/[id]/promote"
```

Erstelle `src/app/api/network/matter/[id]/promote/route.ts`:

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/network/matter/[id]/promote
 *
 * Promotet einen STANDALONE-Matter zum echten Mandat: nimmt
 * clientOrgId + scope + durationMonths, ruft promoteStandaloneMatter
 * auf, returnt rawAcceptToken + acceptUrl.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { ScopeItemSchema } from "@/lib/legal-network/scope";
import {
  promoteStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  clientOrgId: z.string().cuid(),
  scope: z.array(ScopeItemSchema).min(1).max(16),
  durationMonths: z.number().int().min(1).max(60),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: matterId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "legal_matter_invite",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    // Confirm caller's org is the matter's lawFirmOrgId — only the
    // owning law firm may promote its own workspace.
    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true },
    });
    if (!matter) {
      return NextResponse.json({ error: "Matter not found" }, { status: 404 });
    }
    if (matter.lawFirmOrgId !== membership.organizationId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await promoteStandaloneMatter({
      matterId,
      clientOrgId: parsed.data.clientOrgId,
      scope: parsed.data.scope,
      durationMonths: parsed.data.durationMonths,
      invitingUserId: session.user.id,
    });

    return NextResponse.json({
      matterId,
      rawAcceptToken: result.rawAcceptToken,
      expiresAt: result.expiresAt.toISOString(),
      acceptUrl: `/network/accept/${result.rawAcceptToken}`,
    });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      const status =
        err.code === "MATTER_NOT_FOUND"
          ? 404
          : err.code === "INVALID_STATE_FOR_PROMOTE"
            ? 409
            : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/network/matter/.../promote failed: ${msg}`);
    return NextResponse.json({ error: "Promote failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "promote/route" | head -5
```

Expected: keine Errors für die neue Route.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/network/matter/[id]/promote/"
git commit -m "feat(atlas): POST /api/network/matter/[id]/promote endpoint"
```

---

## Task 7: UI — 5. Quick-Action im AIMode

**Files:**

- Modify: `src/components/atlas/ai-mode/AIMode.tsx`

- [ ] **Step 1: Inbox-Icon importieren**

Öffne `src/components/atlas/ai-mode/AIMode.tsx`. Finde den lucide-react import (Zeile ~38):

```tsx
import { Briefcase, UserPlus, PenLine, Scale } from "lucide-react";
```

Ergänze `Inbox`:

```tsx
import { Briefcase, UserPlus, PenLine, Scale, Inbox } from "lucide-react";
```

- [ ] **Step 2: 5. Quick-Action ergänzen**

Finde den `QUICK_ACTIONS` Array (Zeile ~83). Vor dem schließenden `] as const;` neuen Eintrag einfügen:

```tsx
const QUICK_ACTIONS = [
  // ... 4 existing entries ...
  {
    icon: Inbox,
    label: "Workspace öffnen",
    panel: "workspace" as const,
    kbd: "5",
  },
] as const;
```

- [ ] **Step 3: Keyboard shortcut auf ⌘1-5 erweitern**

Finde den keyboard handler (suche nach `["1", "2", "3", "4"]` — Zeile ~283). Ändere zu:

```tsx
const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
```

- [ ] **Step 4: runQuickAction handler — workspace-Branch**

Suche nach der Funktion `runQuickAction` (oder dem zentralen Handler der `panel`-Werte verarbeitet). Da die existing 4 alle ein Panel öffnen (`setActivePanel(...)`), brauchen wir einen Sonderweg für `"workspace"`: direkt-navigieren statt Panel öffnen.

Pattern (innerhalb von runQuickAction oder dem Click-Handler eines Buttons):

```tsx
if (action.panel === "workspace") {
  // Direkt-navigate — kein Panel
  void (async () => {
    try {
      const res = await fetch("/api/atlas/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        setToastText(json.error ?? "Workspace konnte nicht angelegt werden");
        return;
      }
      router.push(`/atlas/network/${json.matterId}/workspace`);
    } catch (err) {
      setToastText(err instanceof Error ? err.message : "Fehler");
    }
  })();
  return;
}
// existing logic für matters/invite/memo/compare:
setActivePanel(action.panel);
```

- [ ] **Step 5: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "AIMode" | head -5
```

Expected: leer.

- [ ] **Step 6: Commit**

```bash
git add src/components/atlas/ai-mode/AIMode.tsx
git commit -m "feat(atlas): 5th quick-action ⌘5 'Workspace öffnen' in AIMode"
```

---

## Task 8: UI — MattersPanel STANDALONE-Block

**Files:**

- Modify: `src/components/atlas/ai-mode/ActionPanels.tsx`

- [ ] **Step 1: MattersPanel — Status-Filter-Fetch**

Finde `function MattersPanel(...)` in `ActionPanels.tsx`. Im Daten-Fetch-Effekt: ändere die Query so, dass sowohl STANDALONE als auch active Matters geladen werden, dann clientseitig getrennt.

```tsx
useEffect(() => {
  if (!open) return;
  void fetch(
    "/api/network/matters?status=STANDALONE,PENDING_INVITE,PENDING_CONSENT,ACTIVE",
  )
    .then((r) => r.json())
    .then((data) => {
      setMatters(data.matters ?? []);
    })
    .catch(() => setMatters([]));
}, [open]);
```

- [ ] **Step 2: STANDALONE-Block oben rendern**

Im Render-Bereich des Panels, vor der existing Matter-Liste:

```tsx
const standaloneMatters = matters.filter((m) => m.status === "STANDALONE");
const activeMatters = matters.filter((m) => m.status !== "STANDALONE");

// ... in JSX:
{
  standaloneMatters.length > 0 && (
    <div className={styles.matterSection}>
      <div className={styles.sectionLabel}>Offene Workspaces</div>
      {standaloneMatters.map((m) => (
        <button
          key={m.id}
          className={styles.standaloneRow}
          onClick={() => onNavigate(`/atlas/network/${m.id}/workspace`)}
        >
          <Inbox size={14} strokeWidth={1.5} />
          <span className={styles.matterName}>{m.name}</span>
          <span className={styles.matterDate}>
            {new Date(m.invitedAt).toLocaleDateString("de-DE")}
          </span>
        </button>
      ))}
    </div>
  );
}

{
  activeMatters.length > 0 && (
    <div className={styles.matterSection}>
      <div className={styles.sectionLabel}>Aktive Mandate</div>
      {/* existing render of activeMatters ... */}
    </div>
  );
}
```

- [ ] **Step 3: CSS-Klassen ergänzen**

In `src/components/atlas/ai-mode/ai-mode.module.css` neue Klassen für den STANDALONE-Visual-Stil:

```css
.standaloneRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: var(--atlas-text-mute);
  cursor: pointer;
  margin-bottom: 6px;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.standaloneRow:hover {
  border-color: rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.03);
}
.matterDate {
  margin-left: auto;
  font-size: 11px;
  color: var(--atlas-text-dim);
}
.sectionLabel {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--atlas-text-dim);
  margin: 8px 0 6px;
}
.matterSection {
  margin-bottom: 16px;
}
```

Wenn die existing Klassen für die Matter-Liste anders heißen, übernimm den Pattern, lege die neuen daneben.

- [ ] **Step 4: Inbox-Icon importieren**

Oben in `ActionPanels.tsx` zu den lucide-Imports hinzufügen:

```tsx
import { ..., Inbox } from "lucide-react";
```

- [ ] **Step 5: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "ActionPanels" | head -5
```

Expected: leer.

- [ ] **Step 6: Commit**

```bash
git add src/components/atlas/ai-mode/ActionPanels.tsx src/components/atlas/ai-mode/ai-mode.module.css
git commit -m "feat(atlas): STANDALONE workspace block in MattersPanel"
```

---

## Task 9: UI — MatterStatusBanner STANDALONE-State

**Files:**

- Modify: `src/components/legal-network/workspace/pinboard/MatterStatusBanner.tsx`

- [ ] **Step 1: shouldShowStatusBanner für STANDALONE**

Finde `shouldShowStatusBanner(status: string): boolean` (Zeile ~174) und füge STANDALONE zu den Status-Werten hinzu, die einen Banner zeigen:

```tsx
export function shouldShowStatusBanner(status: string): boolean {
  return [
    "STANDALONE",
    "PENDING_INVITE",
    "PENDING_CONSENT",
    "SUSPENDED",
    // ggf. weitere existing values übernehmen
  ].includes(status);
}
```

Behalte die existing Liste bei und ergänze STANDALONE oben.

- [ ] **Step 2: Banner-Branch für STANDALONE im Render**

Finde im `MatterStatusBanner` Render-Block die Status-Switch-Logik (z.B. `if (status === "PENDING_INVITE") ...`). Ergänze davor:

```tsx
if (status === "STANDALONE") {
  return (
    <div className={styles.bannerStandalone}>
      <div className={styles.bannerIcon}>
        <Inbox size={16} strokeWidth={1.5} />
      </div>
      <div className={styles.bannerBody}>
        <div className={styles.bannerTitle}>Privater Workspace</div>
        <p className={styles.bannerText}>
          Dieser Workspace ist nur für dich sichtbar. Mandant einladen → wird
          zum echten Mandat.
        </p>
      </div>
      <button className={styles.bannerAction} onClick={onPromoteClick}>
        In echtes Mandat umwandeln
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Promote-Click-Prop hinzufügen**

In `MatterStatusBannerProps` (Interface, Zeile ~29) ergänzen:

```tsx
interface MatterStatusBannerProps {
  // ... existing props ...
  /** Wird aufgerufen wenn der User „In echtes Mandat umwandeln"
   *  klickt. Parent öffnet das Promote-Form. */
  onPromoteClick?: () => void;
}
```

Im Function-Signature den neuen Prop destrukturieren:

```tsx
export function MatterStatusBanner({
  // ... existing ...
  onPromoteClick,
}: MatterStatusBannerProps) {
```

Wenn `onPromoteClick` nicht gesetzt ist und Status STANDALONE — fallback: `onClick={() => alert("Promote-Handler nicht konfiguriert")}`. Oder besser: don't render der Button. Meistens setzt der parent ihn aber, also no-op-fallback ist fine.

- [ ] **Step 4: Inbox-Icon importieren**

Oben im File:

```tsx
import { Inbox /* existing imports */ } from "lucide-react";
```

- [ ] **Step 5: CSS-Klassen ergänzen**

Wenn das Banner Tailwind nutzt, schreib die neuen Branches inline mit Tailwind-Klassen. Wenn module.css, neue Klassen `.bannerStandalone`, `.bannerIcon`, `.bannerBody`, `.bannerTitle`, `.bannerText`, `.bannerAction` analog zu existing patterns. Beispiel-Stil im Atlas-amber-Schema (warm, Workspace = privat):

```tsx
// Inline Tailwind:
className =
  "flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-4";
```

- [ ] **Step 6: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "MatterStatusBanner" | head -5
```

Expected: leer.

- [ ] **Step 7: Commit**

```bash
git add src/components/legal-network/workspace/pinboard/MatterStatusBanner.tsx
git commit -m "feat(atlas): STANDALONE banner state in MatterStatusBanner"
```

---

## Task 10: UI — InvitePanel Promote-Mode

**Files:**

- Modify: `src/components/atlas/ai-mode/ActionPanels.tsx`
- Modify: `src/components/legal-network/workspace/pinboard/WorkspacePinboard.tsx` (Wire-up des Promote-Buttons)

- [ ] **Step 1: InvitePanel — optional matterId-Prop**

In `ActionPanels.tsx`, finde `function InvitePanel(...)`. Erweitere die Props:

```tsx
export function InvitePanel({
  open,
  onClose,
  onSuccess,
  promoteMatterId,  // neu — wenn gesetzt → Promote-Mode statt Create-Mode
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  promoteMatterId?: string;
}) {
```

- [ ] **Step 2: Submit-Branch für Promote-Mode**

Im Submit-Handler des Forms innerhalb `InvitePanel`:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);
  try {
    const url = promoteMatterId
      ? `/api/network/matter/${promoteMatterId}/promote`
      : "/api/network/invite";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientOrgId: selectedOrgId,
        scope,
        durationMonths,
        // create-mode benötigt zusätzliche fields wie name, reference;
        // im promote-Mode werden die ignoriert (matter existiert schon)
        ...(promoteMatterId ? {} : { name, reference }),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Submit fehlgeschlagen");
      return;
    }
    onSuccess?.();
    onClose();
  } finally {
    setSubmitting(false);
  }
};
```

Header und Submit-Button-Label im Promote-Mode anpassen:

```tsx
<h2>{promoteMatterId ? "Workspace umwandeln" : "Mandant einladen"}</h2>
// ...
<button type="submit" disabled={submitting}>
  {submitting
    ? "..."
    : promoteMatterId
      ? "Mandant einladen & Token erzeugen"
      : "Einladen"}
</button>
```

- [ ] **Step 3: WorkspacePinboard — Promote-Button wire-up**

In `WorkspacePinboard.tsx`, finde wo `MatterStatusBanner` gerendert wird. Ergänze einen lokalen state für „Promote-Modal offen":

```tsx
const [promoteOpen, setPromoteOpen] = useState(false);
```

Banner-Render erweitern:

```tsx
<MatterStatusBanner
  // existing props ...
  onPromoteClick={() => setPromoteOpen(true)}
/>
```

Und das Promote-Form als Modal/Sheet rendern. Wenn der WorkspacePinboard schon Modals hat, folge dem Pattern. Andernfalls einfach am Ende der Component:

```tsx
{
  promoteOpen && (
    <InvitePanel
      open={promoteOpen}
      onClose={() => setPromoteOpen(false)}
      onSuccess={() => {
        setPromoteOpen(false);
        // refresh matter status
        router.refresh();
      }}
      promoteMatterId={matterId}
    />
  );
}
```

Falls `InvitePanel` aktuell nur im Atlas-AI-Mode-Layout verwendet wird (linker side-panel), kannst du es exportieren und in WorkspacePinboard separat rendern — visuell ist das dann ggf. nicht im Sidebar sondern als Modal. Falls das visuell zu viel Mehraufwand ist, alternative: ein kleineres `PromoteForm`-Inline-Component dediziert für diesen Flow, mit der gleichen Submit-Logik.

- [ ] **Step 4: Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "ActionPanels|WorkspacePinboard" | head -5
```

Expected: leer.

- [ ] **Step 5: Commit**

```bash
git add src/components/atlas/ai-mode/ActionPanels.tsx src/components/legal-network/workspace/pinboard/WorkspacePinboard.tsx
git commit -m "feat(atlas): InvitePanel promote-mode + WorkspacePinboard wire-up"
```

---

## Task 11: Integration smoke-test

**Files:**

- Create: `tests/integration/api/atlas-workspace.test.ts`

- [ ] **Step 1: Smoke-Test schreiben**

```bash
mkdir -p tests/integration/api
```

Erstelle `tests/integration/api/atlas-workspace.test.ts`:

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Smoke tests for /api/atlas/workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirstMember: vi.fn(),
  createSm: vi.fn(),
  rl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: mocks.findFirstMember },
  },
}));
vi.mock("@/lib/legal-network/matter-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/legal-network/matter-service")
  >("@/lib/legal-network/matter-service");
  return {
    ...actual,
    createStandaloneMatter: mocks.createSm,
  };
});
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mocks.rl,
  getIdentifier: () => "ip:test",
}));

import { POST } from "@/app/api/atlas/workspace/route";

function makeReq(body: unknown = {}) {
  return new Request("http://test/api/atlas/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/atlas/workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rl.mockResolvedValue({ success: true, reset: 0 });
  });

  it("returns 401 without session", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when org is OPERATOR-only", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u_1" } });
    mocks.findFirstMember.mockResolvedValue({
      organizationId: "op_1",
      organization: { id: "op_1", orgType: "OPERATOR", isActive: true },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it("creates a standalone matter for LAW_FIRM org", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u_1" } });
    mocks.findFirstMember.mockResolvedValue({
      organizationId: "lf_1",
      organization: { id: "lf_1", orgType: "LAW_FIRM", isActive: true },
    });
    mocks.createSm.mockResolvedValue({ matterId: "m_solo_1" });

    const res = await POST(makeReq({ name: "Test Workspace" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.matterId).toBe("m_solo_1");
    expect(mocks.createSm).toHaveBeenCalledWith({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
      name: "Test Workspace",
    });
  });
});
```

- [ ] **Step 2: Test laufen lassen**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/integration/api/atlas-workspace.test.ts
```

Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/api/atlas-workspace.test.ts
git commit -m "test(atlas): integration smoke for /api/atlas/workspace"
```

---

## Task 12: Final Push + Manueller Smoke-Test

- [ ] **Step 1: Vollständiger Test-Run**

```bash
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run tests/unit/lib/legal-network tests/integration/api/atlas-workspace.test.ts
```

Expected: alle Tests grün.

- [ ] **Step 2: Vollständiger Typecheck**

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -cE "^[^[:space:]].+\.tsx?\([0-9]+,[0-9]+\): error"
```

Expected: gleicher baseline-Wert wie zu Beginn (~810). Nicht höher.

- [ ] **Step 3: Push**

```bash
git push origin claude/practical-fermi-4f4481:main
```

- [ ] **Step 4: Manueller Smoke-Test nach Vercel-Deploy**

Nach erfolgreichem Vercel-Deploy:

1. Öffne `https://caelex.eu/atlas` (im Pharos-preview-mode oder als echter Atlas-User)
2. AI-Mode öffnen — der zentrale Pill ist sichtbar
3. `⌘5` drücken oder Quick-Action „Workspace öffnen" klicken
4. Erwartetes Verhalten:
   - Toast „Workspace wird erstellt…"
   - Navigation auf `/atlas/network/{id}/workspace`
   - Hero-State des `WorkspacePinboard` mit leerem Pinboard
   - Banner zeigt „Privater Workspace · In echtes Mandat umwandeln"
5. „In echtes Mandat umwandeln" klicken
6. Form öffnet sich, Mandant wählen, Scope setzen, submit
7. Erwartet: Banner wechselt auf `PENDING_INVITE`, accept-URL angezeigt

Wenn ein Schritt nicht funktioniert: Browser-Console + Vercel-Runtime-Logs prüfen, Issue im Plan zurückverfolgen.

---

## Self-Review Notes

Die folgenden Spec-Anforderungen sind durch Tasks abgedeckt:

| Spec-Sektion                                             | Task              |
| -------------------------------------------------------- | ----------------- |
| Schema-Diff (clientOrgId nullable, STANDALONE enum)      | Task 1            |
| Service: createStandaloneMatter                          | Task 2            |
| Service: promoteStandaloneMatter                         | Task 3            |
| Gate-Patches (requireActiveMatter, scope, listing)       | Task 4            |
| API: POST /api/atlas/workspace                           | Task 5            |
| API: POST /api/network/matter/[id]/promote               | Task 6            |
| UI: 5. Quick-Action ⌘5                                   | Task 7            |
| UI: MattersPanel STANDALONE-Block                        | Task 8            |
| UI: MatterStatusBanner STANDALONE-State                  | Task 9            |
| UI: InvitePanel Promote-Mode + WorkspacePinboard wire-up | Task 10           |
| Testing                                                  | Tasks 2, 3, 4, 11 |
| Manuelle Smoke-Tests                                     | Task 12           |

**Edge Cases aus Spec-Tabelle:**

- ✅ Card-Pin im STANDALONE → orthogonal, no-op (Pinboard kümmert sich nicht um Status)
- ✅ Operator-Direct-URL-Zugriff auf STANDALONE → Task 4 (require-matter middleware)
- ✅ Promote ohne clientOrgId → Task 6 (Zod validation, 400)
- ✅ Promote auf nicht-STANDALONE-Matter → Task 3 (service throws INVALID_STATE_FOR_PROMOTE → 409)
- ✅ Mandant lehnt Promote-Invite ab → Status REVOKED (existing accept-flow behavior, kein Code-Change nötig)
- ✅ Cards-Sichtbarkeit beim Promote → existing scope-gate handhabt das, no-op
- ✅ Workspace persistent über Sessions → auto durch Persistierung in DB
- Open: Workspace löschen → out-of-scope per Spec, kein Task
