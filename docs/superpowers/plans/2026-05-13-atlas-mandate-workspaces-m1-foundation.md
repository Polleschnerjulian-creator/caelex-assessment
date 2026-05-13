# Atlas Mandate-Workspaces M1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mache Mandate als project-based workspace discoverable und ad-hoc-attachbar im Chat — ohne AI-Features, nur die Architektur. AI-Features (Vault-RAG, Briefing, Cross-Chat-Memory, Deadline-Extract, Drafting-Augmentation) folgen in M2-M5.

**Architecture:** Drei strukturelle Ebenen werden aufgebaut:

1. **Discoverability:** Sidebar-Eintrag wird `Mandate` (statt `Neues Mandat`); klick → neue Index-Page mit Cards
2. **Workspace-Layout:** Mandate-Detail-Page wird auf single-page-scroll umgebaut mit Briefing-Slot (placeholder), Chats/Vault/Deadlines/Notes/Members-Sections
3. **Attach-Flow:** Composer-Plus-Menü +1 Eintrag "Mandat anhängen" öffnet Search-Modal; Auswahl persistiert `chat.mandateId` via neue API; Chip oberhalb Composer + automatischer Refresh der `MandateContextSection` in Sidebar

Schema-Migration ist additiv (alle neuen Felder nullable, eine neue Tabelle `AtlasMandateDeadlineSuggestion` für M3 vorbereitet).

**Tech Stack:**

- Next.js 15 App Router (`src/app/(atlas)/atlas/mandate/...`, `src/app/api/atlas/...`)
- TypeScript strict
- Prisma 5.22 (`prisma/schema.prisma` + `prisma db push` für dev / `prisma migrate deploy` in prod)
- Existing Auth: `getAtlasAuth()` aus `src/lib/atlas-auth.ts`
- Existing Logger: `src/lib/logger.ts`
- Existing UI primitives + Tailwind-Klassen wie in `src/components/atlas/v2/`
- Vitest für API-Tests (`vitest run <path>`); UI-Komponenten kriegen smoke-tests nur wenn Logik nicht-trivial
- lucide-react Icons (bestehende Atlas V2-Convention)
- `ALLOW_CROSS_SURFACE=1` env var für Atlas-File-Commits (pre-commit-hook scope-check)

---

## Pre-Flight

Bevor irgendein Task startet:

- [ ] **Pre 1: Working tree muss clean sein** — Run `git -C /Users/julianpolleschner/caelex-assessment status`. Wenn Änderungen offen: stash oder commit. Beginne erst mit cleanem Tree.

- [ ] **Pre 2: Auf `main` und up-to-date sein** — Run `git -C /Users/julianpolleschner/caelex-assessment status` (sollte "On branch main, up to date" zeigen). Falls nicht: `git -C /Users/julianpolleschner/caelex-assessment checkout main && git -C /Users/julianpolleschner/caelex-assessment pull --ff-only`.

- [ ] **Pre 3: DATABASE_URL für Prisma verfügbar machen** — Prisma braucht `.env` mit `DATABASE_URL` für `db push`. Pulle production env wenn nicht da:

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  vercel env pull .env --environment=production --yes
  ```

  Verifiziere `grep DATABASE_URL .env | head -1` zeigt `DATABASE_URL=postgresql://...neon.tech...`.

---

## Task 1: Schema-Migration — Nullable AtlasMandate-Felder + DeadlineSuggestion-Tabelle

**Files:**

- Modify: `prisma/schema.prisma` (zwei Stellen — AtlasMandate model + neue Model-Definition direkt nach AtlasMandateDeadline)

- [ ] **Step 1: Schema-Block in AtlasMandate erweitern** — Öffne `prisma/schema.prisma`, finde `model AtlasMandate {` (Zeile ~11646) und füge nach dem `closedAt DateTime?`-Feld (vor dem `// Relations`-Kommentar bei Zeile ~11679) folgenden Block ein:

  ```prisma
    /// Auto-Briefing Cache (Feature 1, M3). Lazy-regenerated wenn
    /// briefingStaleSince > briefingGeneratedAt oder briefingText null ist.
    briefingText        String?    @db.Text
    briefingGeneratedAt DateTime?
    briefingStaleSince  DateTime?

    /// Cross-Chat-Memory rolling summary (Feature 2, M4). crossChatSummaryUpToChatId
    /// ist Sentinel — bis zu welcher Chat-ID die Summary aktuell ist; bei neueren
    /// Chats triggert das Update-Job ein Refresh.
    crossChatSummary           String?  @db.Text
    crossChatSummaryAt         DateTime?
    crossChatSummaryUpToChatId String?

    /// Suggestions die noch nicht resolved wurden (M3, Feature 4).
    deadlineSuggestions AtlasMandateDeadlineSuggestion[]
  ```

- [ ] **Step 2: Neue Model-Definition für DeadlineSuggestion einfügen** — Finde im Schema die Stelle direkt nach `model AtlasMandateDeadline { ... }` (suche `model AtlasMandateDeadline` und springe zum `}`-Ende dieses Blocks). Füge direkt darunter folgenden neuen Model-Block ein:

  ```prisma
  /// Vorgeschlagene Deadline aus Auto-Extract (M3, Feature 4).
  /// Status-Lifecycle: pending → accepted (creates AtlasMandateDeadline) | dismissed.
  /// Atlas erzeugt diese aus Vault-Files, der User bestätigt.
  model AtlasMandateDeadlineSuggestion {
    id String @id @default(cuid())

    mandateId String
    mandate   AtlasMandate @relation(fields: [mandateId], references: [id], onDelete: Cascade)

    /// Optional: aus welchem Vault-File extrahiert.
    sourceFileId String?
    sourceFile   AtlasMandateFile? @relation("DeadlineSuggestionSource", fields: [sourceFileId], references: [id], onDelete: SetNull)

    /// Org-Scope für Multi-Tenancy-Queries.
    organizationId String

    title       String
    dueAt       DateTime
    description String? @db.Text
    confidence  Float

    /// pending | accepted | dismissed
    status     String @default("pending")
    suggestedAt DateTime @default(now())

    resolvedAt          DateTime?
    resolvedByUserId    String?
    resolvedAsDeadlineId String?

    @@index([mandateId, status])
    @@index([organizationId, status])
  }
  ```

- [ ] **Step 3: AtlasMandateFile braucht die Inverse-Relation für DeadlineSuggestion** — Finde `model AtlasMandateFile {` und füge in den Relations-Bereich (vor `createdAt`-Feld) hinzu:

  ```prisma
    /// Inverse Relation für DeadlineSuggestion (M3 Feature 4).
    deadlineSuggestions AtlasMandateDeadlineSuggestion[] @relation("DeadlineSuggestionSource")
  ```

- [ ] **Step 4: Prisma generate + db push laufen lassen**

  Run:

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  npx prisma generate && npx prisma db push --skip-generate
  ```

  Expected: "✔ Generated Prisma Client" + "🚀 Your database is now in sync with your Prisma schema."

  Wenn Fehler: lies die Prisma-Fehlermeldung sorgfältig (typische Probleme: fehlende Inverse-Relation, falsche Field-Namen). Korrigiere Schema und re-run.

- [ ] **Step 5: Verifikation per psql/Studio (optional, aber empfohlen)** — Run:

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  echo "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='AtlasMandate' AND column_name LIKE 'briefing%' OR column_name LIKE 'crossChat%';" | npx prisma db execute --stdin
  ```

  Expected: zeigt `briefingText`, `briefingGeneratedAt`, `briefingStaleSince`, `crossChatSummary`, `crossChatSummaryAt`, `crossChatSummaryUpToChatId` als nullable.

- [ ] **Step 6: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  git add prisma/schema.prisma
  git commit -m "$(cat <<'EOF'
  feat(atlas/mandate): schema fields for M1 foundation + M3 deadline-suggestions

  AtlasMandate gets briefingText/At + crossChatSummary/At nullable for
  M3/M4 caching. New AtlasMandateDeadlineSuggestion model for M3 Feature 4
  (auto-extract). All additive — zero migration risk.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 2: Sidebar Label-Change — "Neues Mandat" → "Mandate"

**Files:**

- Modify: `src/components/atlas/v2/AtlasSidebar.tsx`

- [ ] **Step 1: Sidebar-Item ändern** — Öffne `src/components/atlas/v2/AtlasSidebar.tsx`, finde den SidebarItem mit `href="/atlas/mandate/new"` (in der "Primary actions"-Section, ~Zeile 267-271 nach dem letzten Edit). Ersetze den ganzen Block durch:

  ```tsx
  <SidebarItem
    href="/atlas/mandate"
    label="Mandate"
    icon={<Briefcase size={14} />}
    active={pathname === "/atlas/mandate"}
  />
  ```

  Begründung: `pathname === "/atlas/mandate"` matched nur exakt die Index-Page; Detail-Pages `/atlas/mandate/abc123` und `/atlas/mandate/new` highlighted den Sidebar-Eintrag NICHT (kontextueller Pfad — User soll merken, dass er den Index verlassen hat).

- [ ] **Step 2: Lint check**

  Run: `npx eslint src/components/atlas/v2/AtlasSidebar.tsx`

  Expected: keine errors / warnings.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/AtlasSidebar.tsx && ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/v2): sidebar 'Neues Mandat' -> 'Mandate' (index entry)

  Klick führt jetzt auf /atlas/mandate (Index-Page, kommt in Task 8)
  statt direkt auf das Create-Form. Highlight nur exakt auf der
  Index-URL (Detail-Pages gelten als kontextueller Pfad).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 3: API — GET /api/atlas/mandate/search (Typeahead für Modal)

**Files:**

- Create: `src/app/api/atlas/mandate/search/route.ts`
- Create: `src/app/api/atlas/mandate/search/route.test.ts`

- [ ] **Step 1: Failing test schreiben** — Erstelle `src/app/api/atlas/mandate/search/route.test.ts` mit:

  ```ts
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Tests für GET /api/atlas/mandate/search — typeahead used by the
   * MandateAttachModal. Org-scoped, member-aware, prefix-match auf
   * name + clientName, max 10 results.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { describe, it, expect, vi, beforeEach } from "vitest";

  vi.mock("@/lib/prisma", () => ({
    prisma: {
      atlasMandate: {
        findMany: vi.fn(),
      },
    },
  }));

  vi.mock("@/lib/atlas-auth", () => ({
    getAtlasAuth: vi.fn(),
  }));

  vi.mock("@/lib/logger", () => ({
    logger: { error: vi.fn(), info: vi.fn() },
  }));

  import { GET } from "./route";
  import { prisma } from "@/lib/prisma";
  import { getAtlasAuth } from "@/lib/atlas-auth";

  const mkReq = (q: string) =>
    new Request(
      `http://localhost/api/atlas/mandate/search?q=${encodeURIComponent(q)}`,
    ) as unknown as Parameters<typeof GET>[0];

  describe("GET /api/atlas/mandate/search", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue(null);
      const res = await GET(mkReq("spi"));
      expect(res.status).toBe(401);
    });

    it("returns empty list when query < 1 char (no broad searches)", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      const res = await GET(mkReq(""));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { mandates: unknown[] };
      expect(body.mandates).toEqual([]);
      expect(prisma.atlasMandate.findMany).not.toHaveBeenCalled();
    });

    it("queries prisma with org-scope + member-or-owner clause + prefix match", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      vi.mocked(prisma.atlasMandate.findMany).mockResolvedValue([
        {
          id: "m1",
          name: "Spire 2024",
          clientName: "Spire Global",
          updatedAt: new Date("2026-05-12T10:00:00Z"),
        },
      ] as never);
      const res = await GET(mkReq("spi"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        mandates: Array<{ id: string; name: string }>;
      };
      expect(body.mandates).toHaveLength(1);
      expect(body.mandates[0].name).toBe("Spire 2024");

      const call = vi.mocked(prisma.atlasMandate.findMany).mock.calls[0][0]!;
      expect(call.where).toMatchObject({
        organizationId: "o1",
        status: "active",
        OR: expect.arrayContaining([
          { name: { contains: "spi", mode: "insensitive" } },
          { clientName: { contains: "spi", mode: "insensitive" } },
        ]),
      });
      expect(call.take).toBe(10);
    });
  });
  ```

- [ ] **Step 2: Test laufen lassen — soll FAIL geben**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/app/api/atlas/mandate/search/route.test.ts`

  Expected: FAIL — "Cannot find module './route'" (weil route.ts noch nicht existiert).

- [ ] **Step 3: route.ts schreiben** — Erstelle `src/app/api/atlas/mandate/search/route.ts`:

  ```ts
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * GET /api/atlas/mandate/search?q=<prefix>
   *
   * Typeahead für den MandateAttachModal im ChatInput Plus-Menü.
   * Liefert max 10 Mandate (active only, org-scoped, owner-or-member),
   * prefix-match auf name + clientName, sortiert nach updatedAt desc.
   *
   * Leerer Query → leere Liste (kein "alle ohne Filter"-Dump).
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { NextResponse, type NextRequest } from "next/server";
  import { prisma } from "@/lib/prisma";
  import { getAtlasAuth } from "@/lib/atlas-auth";
  import { logger } from "@/lib/logger";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  export async function GET(req: NextRequest) {
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length === 0) {
      /* Leerer Query → leere Liste. Der Modal füllt seinen Recent-
         Bucket über GET /api/atlas/mandate (existing) wenn der Suchbox
         leer ist; Search-Endpoint ist nur für aktive Eingaben da. */
      return NextResponse.json({ mandates: [] });
    }

    try {
      const mandates = await prisma.atlasMandate.findMany({
        where: {
          organizationId: atlas.organizationId,
          status: "active",
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
          ],
          AND: [
            {
              OR: [
                { ownerUserId: atlas.userId },
                { members: { some: { userId: atlas.userId } } },
              ],
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          clientName: true,
          updatedAt: true,
        },
      });
      return NextResponse.json({ mandates });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[atlas/mandate/search] GET failed", {
        userId: atlas.userId,
        error: msg,
      });
      return NextResponse.json(
        { error: "Mandate search failed" },
        { status: 500 },
      );
    }
  }
  ```

- [ ] **Step 4: Test re-run — soll PASS geben**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/app/api/atlas/mandate/search/route.test.ts`

  Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/app/api/atlas/mandate/search/route.ts src/app/api/atlas/mandate/search/route.test.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/mandate): GET /api/atlas/mandate/search typeahead endpoint

  Org-scoped, member-or-owner, prefix-match auf name + clientName, max 10.
  Wird vom MandateAttachModal (Task 6) konsumiert. Empty query returnt []
  damit der Modal Recent-Bucket selbst über existing /api/atlas/mandate
  füllen kann.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 4: API — POST /api/atlas/chat/[id]/attach-mandate

**Files:**

- Create: `src/app/api/atlas/chat/[id]/attach-mandate/route.ts`
- Create: `src/app/api/atlas/chat/[id]/attach-mandate/route.test.ts`

- [ ] **Step 1: Failing test** — Erstelle `src/app/api/atlas/chat/[id]/attach-mandate/route.test.ts`:

  ```ts
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Tests für POST /api/atlas/chat/[id]/attach-mandate — setzt oder
   * löscht chat.mandateId. Verifiziert Auth, Owner-Check (chat),
   * Member-or-Owner-Check (mandate), null-detach.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { describe, it, expect, vi, beforeEach } from "vitest";

  vi.mock("@/lib/prisma", () => ({
    prisma: {
      atlasChat: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      atlasMandate: {
        findFirst: vi.fn(),
      },
    },
  }));

  vi.mock("@/lib/atlas-auth", () => ({
    getAtlasAuth: vi.fn(),
  }));

  vi.mock("@/lib/logger", () => ({
    logger: { error: vi.fn(), info: vi.fn() },
  }));

  import { POST } from "./route";
  import { prisma } from "@/lib/prisma";
  import { getAtlasAuth } from "@/lib/atlas-auth";

  const mkReq = (body: unknown) =>
    new Request("http://localhost/api/atlas/chat/c1/attach-mandate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];

  const mkCtx = (id = "c1") => ({ params: Promise.resolve({ id }) });

  describe("POST /api/atlas/chat/[id]/attach-mandate", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue(null);
      const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
      expect(res.status).toBe(401);
    });

    it("returns 400 on invalid body", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      const res = await POST(mkReq({ wrong: 123 }), mkCtx());
      expect(res.status).toBe(400);
    });

    it("returns 404 when chat doesn't exist or not owned", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue(null);
      const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
      expect(res.status).toBe(404);
    });

    it("returns 404 when mandate doesn't exist or not accessible", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
        id: "c1",
      } as never);
      vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue(null);
      const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error.toLowerCase()).toContain("mandate");
    });

    it("attaches mandate and returns updated chat", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
        id: "c1",
      } as never);
      vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue({
        id: "m1",
        name: "Spire 2024",
      } as never);
      vi.mocked(prisma.atlasChat.update).mockResolvedValue({
        id: "c1",
        mandateId: "m1",
        title: "T",
        updatedAt: new Date(),
      } as never);

      const res = await POST(mkReq({ mandateId: "m1" }), mkCtx());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        chat: { id: string; mandateId: string };
      };
      expect(body.ok).toBe(true);
      expect(body.chat.mandateId).toBe("m1");

      expect(prisma.atlasChat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1" },
          data: { mandateId: "m1" },
        }),
      );
    });

    it("detaches when mandateId is null", async () => {
      vi.mocked(getAtlasAuth).mockResolvedValue({
        userId: "u1",
        organizationId: "o1",
      } as never);
      vi.mocked(prisma.atlasChat.findFirst).mockResolvedValue({
        id: "c1",
      } as never);
      vi.mocked(prisma.atlasChat.update).mockResolvedValue({
        id: "c1",
        mandateId: null,
        title: "T",
        updatedAt: new Date(),
      } as never);

      const res = await POST(mkReq({ mandateId: null }), mkCtx());
      expect(res.status).toBe(200);
      /* When detaching: skip mandate-existence check entirely */
      expect(prisma.atlasMandate.findFirst).not.toHaveBeenCalled();
      expect(prisma.atlasChat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1" },
          data: { mandateId: null },
        }),
      );
    });
  });
  ```

- [ ] **Step 2: Run test — soll FAIL**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/app/api/atlas/chat/\[id\]/attach-mandate/route.test.ts`

  Expected: FAIL — Cannot find module './route'.

- [ ] **Step 3: route.ts schreiben** — Erstelle `src/app/api/atlas/chat/[id]/attach-mandate/route.ts`:

  ```ts
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * POST /api/atlas/chat/[id]/attach-mandate
   *   Body: { mandateId: string | null }
   *
   * Setzt (mandateId: string) oder löscht (mandateId: null) die Mandat-
   * Verknüpfung eines bestehenden Chats. Wird vom MandateAttachModal
   * im ChatInput Plus-Menü aufgerufen.
   *
   * Auth-Checks:
   *   - User muss authenticated sein (401)
   *   - Chat muss org-scope + owner sein (404 sonst)
   *   - Wenn mandateId !== null: Mandate muss existieren + org-scope +
   *     owner-or-member sein (404 sonst)
   *
   * Antwort: { ok: true, chat: { id, mandateId, title, updatedAt } }
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { NextResponse, type NextRequest } from "next/server";
  import { z } from "zod";
  import { prisma } from "@/lib/prisma";
  import { getAtlasAuth } from "@/lib/atlas-auth";
  import { logger } from "@/lib/logger";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const Body = z.object({
    mandateId: z.string().min(1).max(40).nullable(),
  });

  export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) {
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { mandateId } = parsed.data;
    const { id: chatId } = await context.params;

    /* Chat-Existenz + Owner-Check. */
    const chat = await prisma.atlasChat.findFirst({
      where: {
        id: chatId,
        organizationId: atlas.organizationId,
        ownerUserId: atlas.userId,
      },
      select: { id: true },
    });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    /* Mandate-Existenz + Member-or-Owner-Check (skipped beim Detach). */
    if (mandateId !== null) {
      const mandate = await prisma.atlasMandate.findFirst({
        where: {
          id: mandateId,
          organizationId: atlas.organizationId,
          OR: [
            { ownerUserId: atlas.userId },
            { members: { some: { userId: atlas.userId } } },
          ],
        },
        select: { id: true },
      });
      if (!mandate) {
        return NextResponse.json(
          { error: "Mandate not found or no access" },
          { status: 404 },
        );
      }
    }

    try {
      const updated = await prisma.atlasChat.update({
        where: { id: chatId },
        data: { mandateId },
        select: {
          id: true,
          mandateId: true,
          title: true,
          updatedAt: true,
        },
      });
      logger.info("[atlas/chat/attach-mandate] ok", {
        userId: atlas.userId,
        chatId,
        mandateId,
      });
      return NextResponse.json({ ok: true, chat: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[atlas/chat/attach-mandate] update failed", {
        userId: atlas.userId,
        chatId,
        mandateId,
        error: msg,
      });
      return NextResponse.json({ error: "Attach failed" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 4: Test re-run — soll PASS (6 tests)**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx vitest run src/app/api/atlas/chat/\[id\]/attach-mandate/route.test.ts`

  Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/app/api/atlas/chat/\[id\]/attach-mandate/route.ts src/app/api/atlas/chat/\[id\]/attach-mandate/route.test.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/chat): POST /api/atlas/chat/[id]/attach-mandate

  Setzt oder löscht chat.mandateId. Wird vom MandateAttachModal im
  ChatInput Plus-Menü konsumiert. Auth-double-check: chat-owner UND
  mandate-owner-or-member. Detach (mandateId=null) skipped die
  Mandate-Existenzprüfung.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 5: MandateAttachChip Component

**Files:**

- Create: `src/components/atlas/v2/MandateAttachChip.tsx`

- [ ] **Step 1: Component schreiben** — Erstelle `src/components/atlas/v2/MandateAttachChip.tsx`:

  ```tsx
  "use client";

  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — MandateAttachChip
   *
   * Pill oberhalb des Composers, sichtbar wenn ein Mandat an den
   * aktuellen Chat angehängt ist. Klick auf [×] detached. Klick auf
   * den Mandats-Namen navigiert zum Mandat-Workspace (öffnet in
   * neuem Tab — der laufende Chat soll nicht verloren gehen).
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import Link from "next/link";
  import { Briefcase, X } from "lucide-react";

  interface Props {
    mandateId: string;
    mandateName: string;
    onDetach: () => void;
    /** Disable während gerade ein Attach/Detach läuft. */
    disabled?: boolean;
  }

  export function MandateAttachChip({
    mandateId,
    mandateName,
    onDetach,
    disabled,
  }: Props) {
    return (
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-[12px] dark:border-white/[0.08] dark:bg-white/[0.04]">
        <Link
          href={`/atlas/mandate/${mandateId}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-50"
          title={`Mandat-Workspace öffnen: ${mandateName}`}
        >
          <Briefcase size={11} className="shrink-0 opacity-60" />
          <span className="line-clamp-1 max-w-[180px]">{mandateName}</span>
        </Link>
        <button
          type="button"
          onClick={onDetach}
          disabled={disabled}
          aria-label="Mandat abhängen"
          title="Abhängen"
          className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/[0.06] hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 2: Lint check**

  Run: `npx eslint src/components/atlas/v2/MandateAttachChip.tsx`

  Expected: clean.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/MandateAttachChip.tsx
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/v2): MandateAttachChip component

  Pill oberhalb des Composers wenn ein Mandat an den Chat hängt.
  Klick auf den Namen öffnet Mandat-Workspace (neuer Tab); Klick auf
  [×] detached. Wird in Task 7 in den ChatInput integriert.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 6: MandateAttachModal Component

**Files:**

- Create: `src/components/atlas/v2/MandateAttachModal.tsx`

- [ ] **Step 1: Component schreiben** — Erstelle `src/components/atlas/v2/MandateAttachModal.tsx`:

  ```tsx
  "use client";

  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — MandateAttachModal
   *
   * Search-first Modal aus dem ChatInput Plus-Menü. Zwei Datenquellen:
   *   - Empty-State: Recents via existing GET /api/atlas/mandate
   *     (bis zu 8 zuletzt aktualisierte Mandate)
   *   - Active-Search: live-debounced gegen GET /api/atlas/mandate/search
   *
   * Klick auf einen Mandat-Eintrag ruft onSelect() — der Parent
   * (ChatInput) entscheidet ob der API-Call (attach) sofort oder
   * verzögert (bei brand-neuem Chat) passiert.
   *
   * Klick "Neues Mandat anlegen" navigiert zu /atlas/mandate/new
   * (öffnet neuen Tab; Chat-Composer-State bleibt erhalten).
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { useEffect, useRef, useState } from "react";
  import Link from "next/link";
  import { Search, Briefcase, Loader2, Plus, X } from "lucide-react";

  interface MandateLite {
    id: string;
    name: string;
    clientName: string | null;
    updatedAt: string;
  }

  interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (mandate: { id: string; name: string }) => void;
  }

  export function MandateAttachModal({ open, onClose, onSelect }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MandateLite[]>([]);
    const [recents, setRecents] = useState<MandateLite[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /* Auto-focus the search input on open. */
    useEffect(() => {
      if (open) {
        setQuery("");
        setResults([]);
        /* Delay one tick so the input is mounted. */
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, [open]);

    /* Lade Recents beim ersten Öffnen — separater Effect damit
       Re-Open keinen Flash erzeugt. */
    useEffect(() => {
      if (!open || recents.length > 0) return;
      void (async () => {
        const res = await fetch("/api/atlas/mandate", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { mandates: MandateLite[] };
        setRecents((data.mandates ?? []).slice(0, 8));
      })();
    }, [open, recents.length]);

    /* Debounced search 200ms. Empty query → cleared results, fall back
       auf Recents-Liste in der UI. */
    useEffect(() => {
      if (!open) return;
      const q = query.trim();
      if (q.length === 0) {
        setResults([]);
        return;
      }
      setLoading(true);
      const handle = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/atlas/mandate/search?q=${encodeURIComponent(q)}`,
            { cache: "no-store" },
          );
          if (!res.ok) {
            setResults([]);
            return;
          }
          const data = (await res.json()) as { mandates: MandateLite[] };
          setResults(data.mandates ?? []);
        } finally {
          setLoading(false);
        }
      }, 200);
      return () => clearTimeout(handle);
    }, [query, open]);

    /* Esc closes. */
    useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    const list = query.trim().length > 0 ? results : recents;

    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
              Mandat anhängen
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-white/[0.06]">
            <Search size={13} className="shrink-0 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mandat suchen…"
              aria-label="Mandat suchen"
              className="w-full bg-transparent text-[14px] text-slate-800 outline-none focus-visible:outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {loading && (
              <Loader2
                size={12}
                className="shrink-0 animate-spin text-slate-400"
              />
            )}
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-1.5 py-1.5">
            {query.trim().length === 0 && recents.length > 0 && (
              <div className="px-3 pb-1 pt-1.5 text-[10.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent
              </div>
            )}
            {list.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12.5px] text-slate-500">
                {query.trim().length > 0
                  ? loading
                    ? "Sucht…"
                    : "Keine Treffer."
                  : "Noch keine Mandate."}
              </div>
            ) : (
              list.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect({ id: m.id, name: m.name })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                >
                  <Briefcase
                    size={13}
                    className="shrink-0 opacity-60 text-slate-600 dark:text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-slate-800 dark:text-slate-100">
                      {m.name}
                    </div>
                    {m.clientName && (
                      <div className="line-clamp-1 text-[10.5px] text-slate-500">
                        {m.clientName}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 px-1.5 py-1.5 dark:border-white/[0.06]">
            <Link
              href="/atlas/mandate/new"
              target="_blank"
              rel="noopener"
              onClick={onClose}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.04]"
            >
              <Plus size={13} className="shrink-0 opacity-60" />
              Neues Mandat anlegen
            </Link>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Lint**

  Run: `npx eslint src/components/atlas/v2/MandateAttachModal.tsx`

  Expected: clean.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/MandateAttachModal.tsx
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/v2): MandateAttachModal — search-first picker

  Empty-State zeigt Recents (via GET /api/atlas/mandate, top 8); aktive
  Search debounced 200ms gegen GET /api/atlas/mandate/search. Klick →
  onSelect() callback. 'Neues Mandat anlegen'-Link öffnet /atlas/mandate/new
  in neuem Tab (Chat-Composer-State bleibt erhalten).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 7: ChatInput Integration — Plus-Menü +1 Eintrag, Chip rendering, Mandate-State

**Files:**

- Modify: `src/components/atlas/v2/ChatInput.tsx`

Diese Task modifiziert die in der vorherigen Session bereits konsolidierte ChatInput-Komponente. Der Plus-Menü hat aktuell genau eine Row ("Datei oder Bild hochladen") — wir fügen "Mandat anhängen" als zweite Row hinzu, integrieren den State, und propagieren die Mandate-Auswahl.

**WICHTIG:** Die `onSubmit`-Signatur erweitert sich um `mandateId?: string | null`. Der Parent (AtlasHomepage / AtlasChatView / MandateNewChatComposer) muss in einer Folge-Task angepasst werden, falls noch nicht gegeben — wir machen das im Rahmen von Task 7 für den Homepage-Flow nicht, weil der Homepage-Flow bereits via `mandateId` im POST body funktioniert (siehe Spec §3.C). Der ChatInput propagiert den lokalen `attachedMandate.id` an `onSubmit` — der Caller darf den Parameter ignorieren wenn er bereits einen anderen Pfad nutzt.

- [ ] **Step 1: Imports erweitern** — Öffne `src/components/atlas/v2/ChatInput.tsx`. In der Import-Section (~Zeile 26-37) ergänze die lucide-Icons (`Briefcase`):

  Suche nach:

  ```tsx
  import {
    ArrowUp,
    Plus,
    Mic,
    MicOff,
    Square,
    Loader2,
    Paperclip,
    X,
  } from "lucide-react";
  ```

  Ersetze durch:

  ```tsx
  import {
    ArrowUp,
    Plus,
    Mic,
    MicOff,
    Square,
    Loader2,
    Paperclip,
    Briefcase,
    X,
  } from "lucide-react";
  ```

  Direkt darunter, nach `import type { ChatImageAttachment } from "./types";`, ergänze:

  ```tsx
  import { MandateAttachChip } from "./MandateAttachChip";
  import { MandateAttachModal } from "./MandateAttachModal";
  ```

- [ ] **Step 2: Props erweitern für `attachedMandate` (controlled)** — Suche das `interface Props { ... }`-Block (~Zeile 52-66). Ersetze den ganzen Props-Interface-Block durch:

  ```tsx
  interface Props {
    initialValue?: string;
    disabled?: boolean;
    placeholder?: string;
    /**
     * Mandat-Attach-State — controlled vom Parent so dass derselbe
     * State über Reload / Navigation hinweg konsistent bleibt. Wenn
     * der Parent ihn nicht reicht, läuft der ChatInput im uncontrolled-
     * Modus mit lokalem useState.
     */
    attachedMandate?: { id: string; name: string } | null;
    onAttachMandate?: (mandate: { id: string; name: string } | null) => void;
    onSubmit: (
      text: string,
      toolToggles: Record<string, boolean>,
      images?: ChatImageAttachment[],
      mandateId?: string | null,
    ) => void | Promise<void>;
    showKorpusPill?: boolean;
    contextStats?: ChatInputContextStats;
  }
  ```

- [ ] **Step 3: ChatInput Body — neue State-Variablen einführen** — Suche im Body von `export function ChatInput(...)` die State-Hooks (~Zeile 107-119, nach den existing useState-Zeilen). Füge direkt nach `const [extracting, setExtracting] = useState<string[]>([]);` zwei neue State-Hooks ein:

  ```tsx
  /* Mandate-Attach: uncontrolled-Fallback wenn Parent keinen
       attachedMandate prop reicht. Wir kombinieren beide Pfade so
       dass `effectiveMandate` immer die Wahrheit ist (Prop dominiert
       wenn vorhanden). */
  const [localMandate, setLocalMandate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const effectiveMandate = attachedMandate ?? localMandate;
  const [mandateModalOpen, setMandateModalOpen] = useState(false);
  ```

  WICHTIG: Damit der Destructure stimmt, ergänze in der Funktions-Signatur die zwei neuen Props:

  Suche:

  ```tsx
  export function ChatInput({
    initialValue,
    disabled,
    placeholder,
    onSubmit,
    contextStats,
  }: Props) {
  ```

  Ersetze durch:

  ```tsx
  export function ChatInput({
    initialValue,
    disabled,
    placeholder,
    attachedMandate,
    onAttachMandate,
    onSubmit,
    contextStats,
  }: Props) {
  ```

- [ ] **Step 4: Helper für Attach + Detach** — Direkt nach den State-Variablen aus Step 3, füge folgenden Helper ein:

  ```tsx
  const setAttachedMandate = (m: { id: string; name: string } | null) => {
    /* Controlled-Pfad: Parent verwaltet, wir rufen nur den Callback. */
    if (onAttachMandate) {
      onAttachMandate(m);
      return;
    }
    /* Uncontrolled-Pfad: lokaler State. */
    setLocalMandate(m);
  };
  ```

- [ ] **Step 5: handleSend muss mandateId mitgeben** — Suche `const handleSend = () => { ... }` (~Zeile 443-455 nach den letzten Edits). Ersetze den ganzen Block durch:

  ```tsx
  const handleSend = () => {
    const v = text.trim();
    /* Allow image-only messages; allow mandate-attach-only-Sends nicht
         (Mandate ohne Text/Bild ergibt keinen Turn). */
    if (!v && images.length === 0) return;
    if (disabled) return;
    void onSubmit(
      v,
      toggles,
      images.length > 0 ? images : undefined,
      effectiveMandate?.id ?? null,
    );
    setText("");
    setImages([]);
    setFileError(null);
  };
  ```

- [ ] **Step 6: Render — Chip oberhalb der Textarea** — Suche im JSX die Stelle direkt vor dem `<textarea ... />` (~Zeile 569). Direkt davor, NACH dem `images.length > 0 && (...)`-Block (~Zeile 568), füge ein:

  ```tsx
  {
    /* Mandate-Chip — pill oberhalb der Textarea wenn ein Mandat
            angehängt ist. Klick auf [×] detached. */
  }
  {
    effectiveMandate && (
      <div className="px-1">
        <MandateAttachChip
          mandateId={effectiveMandate.id}
          mandateName={effectiveMandate.name}
          onDetach={() => setAttachedMandate(null)}
        />
      </div>
    );
  }
  ```

- [ ] **Step 7: PlusMenu erweitern um zweite Row** — Finde die `function PlusMenu({ onPickFile }: { onPickFile: () => void })`-Definition (~Zeile 707 nach den letzten Edits). Ersetze die ganze Funktion durch:

  ```tsx
  /**
   * Minimal Popover (UX simplification 2026-05-13). Aktuell zwei
   * Einträge: Datei-Upload + Mandat-Anhängen. Opens DOWNWARDS
   * (top-full mt-2) für Claude.ai-Muscle-Memory.
   */
  function PlusMenu({
    onPickFile,
    onPickMandate,
  }: {
    onPickFile: () => void;
    onPickMandate: () => void;
  }) {
    return (
      <div className="absolute left-0 top-full z-30 mt-2 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
        <div className="px-1">
          <MenuRow
            icon={<Paperclip size={14} />}
            label="Datei oder Bild hochladen"
            hint="PDF, DOCX, TXT, MD, JPG, PNG"
            onClick={onPickFile}
          />
          <MenuRow
            icon={<Briefcase size={14} />}
            label="Mandat anhängen"
            hint="Vault + Kontext"
            onClick={onPickMandate}
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 8: PlusMenu-Aufruf updaten** — Finde die Stelle im JSX wo `<PlusMenu onPickFile={onPickFile} />` steht (~Zeile 607). Ersetze durch:

  ```tsx
  {
    plusOpen && (
      <PlusMenu
        onPickFile={onPickFile}
        onPickMandate={() => {
          setPlusOpen(false);
          setMandateModalOpen(true);
        }}
      />
    );
  }
  ```

- [ ] **Step 9: MandateAttachModal als Sibling rendern** — Direkt vor dem closing `</div>` der äußersten Wrapper-`<div>` (Suche das letzte `</div>` der `return ( ... )`-Block, ~Zeile 684), füge ein:

  ```tsx
  <MandateAttachModal
    open={mandateModalOpen}
    onClose={() => setMandateModalOpen(false)}
    onSelect={(m) => {
      setAttachedMandate(m);
      setMandateModalOpen(false);
      /* Sidebar muss MandateContextSection neu resolven. Das
               existing event-bus dispatched dafür. */
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
    }}
  />
  ```

- [ ] **Step 10: Lint + Typecheck**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx eslint src/components/atlas/v2/ChatInput.tsx`

  Expected: clean (warnings über unused-vars erlaubt nur wenn pre-existing).

  Falls TypeScript-Errors: lies die Meldung sorgfältig, korrigiere. Häufiger Stolperstein: das geänderte `onSubmit`-Signatur. Caller-Sites müssen NICHT sofort angepasst werden, weil der neue Parameter optional (`mandateId?: ...`) ist; existing Callers ignorieren ihn weiter.

- [ ] **Step 11: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/ChatInput.tsx
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/v2): ChatInput — mandate-attach plus-menu entry + chip + modal

  Erweitert ChatInput um optional-controlled Mandate-Attach-State:
   - Plus-Menü +1 Eintrag 'Mandat anhängen' öffnet MandateAttachModal
   - Auswahl rendert MandateAttachChip oberhalb der Textarea
   - onSubmit-Signatur kriegt optionalen mandateId-Parameter
   - Sidebar refresh-event dispatched bei Auswahl, damit
     MandateContextSection automatisch erscheint

  Bestehende Caller müssen nicht angepasst werden (mandateId ist optional).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 8: AtlasChatView — Attach via API integrieren (für laufende Chats)

**Files:**

- Modify: `src/components/atlas/v2/AtlasChatView.tsx`

In einem laufenden Chat (`/atlas/chat/[id]`) muss der Attach SOFORT in die DB persistiert werden (POST /api/atlas/chat/[id]/attach-mandate aus Task 4). Bei brand-neuem Chat (Homepage) reicht der lokale State, weil der erste POST /api/atlas/chat den mandateId mitgibt.

- [ ] **Step 1: Locate AtlasChatView ChatInput-Verwendung** — Öffne `src/components/atlas/v2/AtlasChatView.tsx`. Suche per `grep -n "ChatInput" src/components/atlas/v2/AtlasChatView.tsx` die Stelle wo die `<ChatInput ... />` gerendert wird (typisch am Ende der Komponente, ~Zeile 200-300).

- [ ] **Step 2: State + Handler hinzufügen** — In der AtlasChatView-Funktion, in den State-Hooks am Anfang der Komponente, füge hinzu:

  ```tsx
  /* Mandate-attach state — synchronisiert mit chat.mandateId aus DB.
       Beim Mount initialisiert aus dem geladenen Chat; Updates schreiben
       sofort via API. */
  const [attachedMandate, setAttachedMandate] = useState<{
    id: string;
    name: string;
  } | null>(
    chat?.mandateId && chat?.mandate
      ? { id: chat.mandateId, name: chat.mandate.name }
      : null,
  );
  ```

  HINWEIS: Falls der `chat`-Objekt-Typ keinen `mandate.name` enthält, muss der Loader (`loadChatForUser`) erweitert werden — siehe Step 4.

- [ ] **Step 3: Attach-Handler** — Direkt nach dem useState aus Step 2, füge ein:

  ```tsx
  const handleAttachMandate = async (
    m: { id: string; name: string } | null,
  ) => {
    /* Optimistic UI — chip erscheint sofort, API call rollt im Hintergrund. */
    const previous = attachedMandate;
    setAttachedMandate(m);
    try {
      const res = await fetch(`/api/atlas/chat/${chatId}/attach-mandate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mandateId: m?.id ?? null }),
      });
      if (!res.ok) {
        /* Rollback on failure. */
        setAttachedMandate(previous);
        throw new Error(`Attach failed (${res.status})`);
      }
      /* Sidebar Re-Resolve so MandateContextSection (re-)appears. */
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
    } catch (err) {
      console.error("[AtlasChatView] attach-mandate failed", err);
    }
  };
  ```

- [ ] **Step 4: Falls `chat.mandate.name` nicht im Loader-Typ enthalten ist** — Öffne `src/lib/atlas/chat-engine.server.ts`. Suche `loadChatForUser` (function definition). Im `select`-Block, finde wo der mandate-relation geladen wird (oder füge sie hinzu). Stelle sicher dass:

  ```ts
  mandate: {
    select: { id: true, name: true },
  },
  ```

  im `select` enthalten ist. Falls schon da: skip. Falls nicht: ergänze.

- [ ] **Step 5: ChatInput-Verwendung erweitern** — Finde `<ChatInput ... onSubmit={...} />` in AtlasChatView. Ergänze die zwei neuen Props:

  ```tsx
  <ChatInput
    {/* ...existing props... */}
    attachedMandate={attachedMandate}
    onAttachMandate={handleAttachMandate}
    onSubmit={...}
  />
  ```

- [ ] **Step 6: Lint + Typecheck nur auf diese Datei**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx eslint src/components/atlas/v2/AtlasChatView.tsx`

  Expected: clean.

- [ ] **Step 7: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/AtlasChatView.tsx src/lib/atlas/chat-engine.server.ts
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/chat): AtlasChatView wires mandate-attach to API

  Klick im ChatInput-Plus-Menü -> Modal -> Auswahl ruft direkt POST
  /api/atlas/chat/[id]/attach-mandate. Optimistic UI mit rollback bei
  Failure. Sidebar refresh-event dispatched damit MandateContextSection
  rebindet.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 9: Mandate-Index Page — Server Component + Client UI

**Files:**

- Create: `src/app/(atlas)/atlas/mandate/page.tsx`
- Create: `src/app/(atlas)/atlas/mandate/_components/MandateIndexClient.tsx`
- Create: `src/app/(atlas)/atlas/mandate/_components/MandateIndexCard.tsx`

- [ ] **Step 1: Server-Component schreiben** — Erstelle `src/app/(atlas)/atlas/mandate/page.tsx`:

  ```tsx
  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — Mandate-Index page.
   *
   * Cards-Übersicht aller Mandate des Users (active by default; Filter
   * erlaubt switch zu archived/closed). Search + Sort + Filter sind
   * client-side über die initial geladene Liste — bei <500 Mandaten
   * (Lawyer-Realität) ist das schnell genug. Skalierung auf server-
   * side filtering ist M2-Aufgabe wenn Bedarf entsteht.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { redirect } from "next/navigation";
  import { prisma } from "@/lib/prisma";
  import { getAtlasAuth } from "@/lib/atlas-auth";
  import { MandateIndexClient } from "./_components/MandateIndexClient";

  export const dynamic = "force-dynamic";

  export default async function AtlasMandateIndexPage() {
    const atlas = await getAtlasAuth();
    if (!atlas) redirect("/atlas/sign-in");

    /* Lade alle Mandate (active + archived + closed), client-seitig
       gefiltert. Default-Filter ist 'active'. */
    const mandates = await prisma.atlasMandate.findMany({
      where: {
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        clientName: true,
        jurisdiction: true,
        operatorType: true,
        primaryAuthority: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: { chats: true, files: true, deadlines: true },
        },
        deadlines: {
          where: { status: "open" },
          orderBy: { dueAt: "asc" },
          take: 1,
          select: { id: true, title: true, dueAt: true },
        },
      },
    });

    return <MandateIndexClient mandates={mandates} />;
  }
  ```

- [ ] **Step 2: Client-Component schreiben** — Erstelle `src/app/(atlas)/atlas/mandate/_components/MandateIndexClient.tsx`:

  ```tsx
  "use client";

  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — Mandate-Index Client.
   *
   * Filter (Status), Sort (Last-Activity / Name / Open-Deadlines),
   * Search (über name + clientName) — alles client-side über die
   * initial geladene Liste vom Server. Cards aus MandateIndexCard.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import { useMemo, useState } from "react";
  import Link from "next/link";
  import { Search, Plus } from "lucide-react";
  import { MandateIndexCard, type IndexMandate } from "./MandateIndexCard";

  type SortKey = "recent" | "name" | "deadlines";
  type StatusFilter = "active" | "archived" | "closed" | "all";

  interface Props {
    mandates: IndexMandate[];
  }

  export function MandateIndexClient({ mandates }: Props) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [sortKey, setSortKey] = useState<SortKey>("recent");

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      const filteredByStatus =
        statusFilter === "all"
          ? mandates
          : mandates.filter((m) => m.status === statusFilter);
      const filteredByQuery =
        q.length === 0
          ? filteredByStatus
          : filteredByStatus.filter(
              (m) =>
                m.name.toLowerCase().includes(q) ||
                (m.clientName ?? "").toLowerCase().includes(q),
            );
      const sorted = [...filteredByQuery];
      if (sortKey === "recent") {
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      } else if (sortKey === "name") {
        sorted.sort((a, b) => a.name.localeCompare(b.name, "de"));
      } else if (sortKey === "deadlines") {
        sorted.sort(
          (a, b) => (b._count?.deadlines ?? 0) - (a._count?.deadlines ?? 0),
        );
      }
      return sorted;
    }, [mandates, query, statusFilter, sortKey]);

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/[0.08]">
          <h1 className="text-[18px] font-medium tracking-tight text-slate-900 dark:text-slate-100">
            Mandate
          </h1>
          <Link
            href="/atlas/mandate/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
          >
            <Plus size={13} />
            Neues Mandat
          </Link>
        </div>

        {/* Filters / Search */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3 dark:border-white/[0.05]">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-black/[0.04] px-2.5 py-1.5 dark:bg-white/[0.04]">
            <Search size={13} className="shrink-0 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mandat suchen…"
              aria-label="Mandat suchen"
              className="w-full bg-transparent text-[13px] outline-none focus-visible:outline-none placeholder:text-slate-500 dark:text-slate-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] text-slate-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-200"
            aria-label="Status filtern"
          >
            <option value="active">Aktiv</option>
            <option value="archived">Archiviert</option>
            <option value="closed">Abgeschlossen</option>
            <option value="all">Alle</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] text-slate-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-200"
            aria-label="Sortierung"
          >
            <option value="recent">Letzte Aktivität</option>
            <option value="name">Name (A-Z)</option>
            <option value="deadlines">Offene Deadlines</option>
          </select>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[14px] text-slate-500 dark:text-slate-400">
                {query.trim() || statusFilter !== "active"
                  ? "Keine Mandate für diese Filter."
                  : "Noch keine Mandate angelegt."}
              </p>
              {!(query.trim() || statusFilter !== "active") && (
                <Link
                  href="/atlas/mandate/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                  <Plus size={13} />
                  Erstes Mandat anlegen
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m) => (
                <MandateIndexCard key={m.id} mandate={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Card-Component schreiben** — Erstelle `src/app/(atlas)/atlas/mandate/_components/MandateIndexCard.tsx`:

  ```tsx
  "use client";

  /**
   * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
   *
   * Atlas V2 — Mandate-Index Card.
   *
   * Single Mandate-Card im Index-Grid. Click → Workspace.
   *
   * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
   */

  import Link from "next/link";
  import { MessageSquare, FileText, AlertCircle } from "lucide-react";

  export interface IndexMandate {
    id: string;
    name: string;
    clientName: string | null;
    jurisdiction: string | null;
    operatorType: string | null;
    primaryAuthority: string | null;
    status: string;
    updatedAt: Date | string;
    createdAt: Date | string;
    _count?: {
      chats: number;
      files: number;
      deadlines?: number;
    };
    deadlines?: Array<{
      id: string;
      title: string;
      dueAt: Date | string;
    }>;
  }

  interface Props {
    mandate: IndexMandate;
  }

  function relativeTime(iso: Date | string): string {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    const now = Date.now();
    const diffMs = now - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "gerade";
    if (sec < 3600) return `vor ${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `vor ${Math.floor(sec / 3600)}h`;
    if (sec < 86400 * 7) return `vor ${Math.floor(sec / 86400)}d`;
    if (sec < 86400 * 30) return `vor ${Math.floor(sec / 86400 / 7)}w`;
    return `vor ${Math.floor(sec / 86400 / 30)}mo`;
  }

  function deadlineUrgency(dueIso: Date | string): {
    label: string;
    className: string;
    icon: boolean;
  } {
    const due = typeof dueIso === "string" ? new Date(dueIso) : dueIso;
    const days = Math.ceil(
      (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) {
      return {
        label: `überfällig (${Math.abs(days)}d)`,
        className: "text-red-600 dark:text-red-400",
        icon: true,
      };
    }
    if (days <= 7) {
      return {
        label: `${days}d`,
        className: "text-red-600 dark:text-red-400",
        icon: true,
      };
    }
    if (days <= 30) {
      return {
        label: `${days}d`,
        className: "text-amber-600 dark:text-amber-400",
        icon: true,
      };
    }
    return {
      label: `${days}d`,
      className: "text-slate-500 dark:text-slate-400",
      icon: false,
    };
  }

  export function MandateIndexCard({ mandate }: Props) {
    const nextDeadline = mandate.deadlines?.[0];
    const urgency = nextDeadline ? deadlineUrgency(nextDeadline.dueAt) : null;

    return (
      <Link
        href={`/atlas/mandate/${mandate.id}`}
        className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.03]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-[14px] font-medium text-slate-900 dark:text-slate-100">
              {mandate.name}
            </h3>
            {mandate.clientName && (
              <p className="line-clamp-1 mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {mandate.clientName}
              </p>
            )}
          </div>
        </div>

        {(mandate.jurisdiction || mandate.operatorType) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {mandate.jurisdiction && (
              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                {mandate.jurisdiction}
              </span>
            )}
            {mandate.operatorType && (
              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                {mandate.operatorType}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-[11.5px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={11} className="opacity-60" />
            {mandate._count?.chats ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText size={11} className="opacity-60" />
            {mandate._count?.files ?? 0}
          </span>
          {urgency && (
            <span
              className={`inline-flex items-center gap-1 ${urgency.className}`}
            >
              {urgency.icon && <AlertCircle size={11} />}
              {urgency.label}
            </span>
          )}
        </div>

        <div className="mt-3 border-t border-slate-100 pt-2 text-[10.5px] text-slate-400 dark:border-white/[0.05] dark:text-slate-500">
          {relativeTime(mandate.updatedAt)}
        </div>
      </Link>
    );
  }
  ```

- [ ] **Step 4: Lint check**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx eslint src/app/\(atlas\)/atlas/mandate/page.tsx src/app/\(atlas\)/atlas/mandate/_components/MandateIndexClient.tsx src/app/\(atlas\)/atlas/mandate/_components/MandateIndexCard.tsx`

  Expected: clean.

- [ ] **Step 5: Smoke-Check (manuell wenn dev-server läuft)**
  - Start dev: `npm run dev`
  - Browse zu `http://localhost:3000/atlas/mandate`
  - Erwartung: Index-Page rendert, zeigt vorhandene Mandate als Cards, Search-Input filtert live, Status/Sort dropdowns funktionieren
  - Klick auf Card → navigiert zu `/atlas/mandate/<id>` (zeigt aktuell noch die alte MandateDetailView — das ist OK, Workspace-Revamp kommt in Task 10)

- [ ] **Step 6: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/app/\(atlas\)/atlas/mandate/page.tsx src/app/\(atlas\)/atlas/mandate/_components/
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/mandate): mandate-index page with cards + filter + search

  Server-component lädt mandates (org-scoped, owner-or-member); Client-
  component filtert/sortiert/searchet client-side. Card zeigt Name,
  Client, Jurisdiction, Counts (chats/files), nächste Deadline mit
  Traffic-Light, Last-Activity. Empty-State + 'Erstes Mandat anlegen'
  CTA. Bereit für Sidebar-Click aus Task 2.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 10: Mandate-Workspace Layout-Revamp (single-page-scroll)

**Files:**

- Modify: `src/components/atlas/v2/MandateDetailView.tsx`

Die existing MandateDetailView ist 328 Zeilen mit einer 2-col-Layout-Struktur (Header + Composer + Instructions/Members + Chats + Files + Deadlines + Time-Entries). Wir restrukturieren auf single-page-scroll mit klaren Section-Blöcken in der Spec-Reihenfolge (Briefing-Slot → Chats → Vault → Deadlines → Notes → Members → Custom Instructions). Briefing zeigt für M1 nur ein Placeholder ("Auto-Briefing wird in M3 ausgeliefert").

WICHTIG: Wir wollen die Funktionalität NICHT verlieren — nur die Reihenfolge + Section-Anchors einführen. Lies zuerst die existing Datei sorgfältig.

- [ ] **Step 1: Existing Code lesen** — `cat src/components/atlas/v2/MandateDetailView.tsx`. Identifiziere die JSX-Sub-Sections (typisch: Header, Composer, Instructions, Members, Chats-List, Files-Section, Deadlines-Section, Time-Entries).

- [ ] **Step 2: Umstrukturierungs-Plan** — Die neue Reihenfolge im JSX (top-down):
  1. **Header** (existing) — Mandat-Name, Client, badges, [Settings], [Archive]
  2. **Briefing-Slot** (NEU für M1) — Placeholder-Card
  3. **"Neuer Chat in diesem Mandat" Button** (existing — den Composer aus existing kann man ersetzen oder einfach prominent als CTA-Button rendern)
  4. **Chats-Section** (existing list, evtl. mit "Alle anzeigen →"-Link)
  5. **Vault-Section** (existing files-list)
  6. **Deadlines-Section** (existing)
  7. **Notes-Section** (falls existing — sonst als kommendes Feature placeholder)
  8. **Members-Section** (existing)
  9. **Custom Instructions** (existing, collapsed-by-default)

  Jede Section bekommt ein `<section id="..." class="...">` mit `scroll-margin-top` für Anchor-Nav (optional).

- [ ] **Step 3: Briefing-Slot Komponente einbauen** — In MandateDetailView, direkt nach dem Header-Block (vor existing Sections), füge ein:

  ```tsx
  {
    /* M1 Placeholder — wird in M3 mit echtem Auto-Briefing ersetzt */
  }
  <section
    id="briefing"
    className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]"
  >
    <div className="flex items-start gap-3">
      <span className="text-xl">🧠</span>
      <div>
        <h3 className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
          Briefing
        </h3>
        <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
          Auto-Briefing („Wo stehen wir?") kommt in M3. Solange: öffne einen der
          Chats unten oder lege neue Files / Deadlines an.
        </p>
      </div>
    </div>
  </section>;
  ```

- [ ] **Step 4: Sections in neue Reihenfolge bringen** — Bewege die JSX-Blöcke so dass sie der Sequenz aus Step 2 folgen. Jeder Block kriegt:
  - Eigenen `<section id="..." class="mb-8 scroll-mt-6">` Wrapper
  - `<h2 class="mb-3 text-[14px] font-medium text-slate-700 dark:text-slate-200">Section-Name (count)</h2>` als Header
  - Existing Inhalt im Body

  Die existing 2-col-Layout (Instructions/Members nebeneinander) wird aufgelöst — Members + Custom Instructions kommen als separate Sections am Ende.

- [ ] **Step 5: Smoke-Check + Lint**
  - Start dev: `npm run dev`
  - Browse zu `/atlas/mandate/<existierende-mandat-id>`
  - Erwartung: Header + Briefing-Placeholder + Sections in neuer Reihenfolge, alle existing Funktionen (Datei-Upload, Deadline-Anlegen, Chat-Liste, Member-Liste, Instructions-Edit) noch funktional
  - `npx eslint src/components/atlas/v2/MandateDetailView.tsx` → clean

- [ ] **Step 6: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/MandateDetailView.tsx
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/mandate): workspace single-page-scroll layout + briefing slot

  Restrukturiert MandateDetailView auf single-page-scroll mit klar
  abgegrenzten Sections (Briefing-Slot/Chats/Vault/Deadlines/Notes/
  Members/Custom-Instructions). Briefing ist M1-Placeholder; M3 ersetzt
  durch echtes Auto-Briefing.

  Funktional zero regression: alle existing Affordances (File-Upload,
  Deadline-Anlegen, Chat-Liste, Member-Mgmt, Instructions-Edit) bleiben.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 11: AtlasHomepage — Mandate-Attach in Brand-New-Chat-Flow integrieren

**Files:**

- Modify: `src/components/atlas/v2/AtlasHomepage.tsx`

Auf der Homepage soll das Plus-Menü → "Mandat anhängen" auch funktionieren. Hier brauchen wir KEINEN API-Call (es gibt noch keinen Chat) — der mandateId wird im initialen POST `/api/atlas/chat` mitgegeben.

- [ ] **Step 1: AtlasHomepage State hinzufügen** — Öffne `src/components/atlas/v2/AtlasHomepage.tsx`. Suche im Body von `AtlasHomepage()` die State-Hooks am Anfang. Direkt nach `const [seedWorkflowId, setSeedWorkflowId] = useState<string | undefined>();` (oder den anderen seed-States), füge ein:

  ```tsx
  /* Brand-new-chat: Mandate-Attach läuft rein lokal, weil noch kein
       chat existiert. Der mandateId wird im initialen POST mitgegeben. */
  const [pendingMandate, setPendingMandate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  ```

- [ ] **Step 2: handleSubmit anpassen damit mandateId mitgegeben wird** — Suche `const handleSubmit = async (text, toolToggles, images) => {`. Erweitere die Signatur um den vierten Parameter:

  ```tsx
    const handleSubmit = async (
      text: string,
      toolToggles: Record<string, boolean>,
      images?: ChatImageAttachment[],
      mandateIdFromInput?: string | null,
    ) => {
  ```

  Im POST-Body (`body: JSON.stringify({...})`), ergänze das `mandateId`-Feld:

  ```tsx
        body: JSON.stringify({
          message: text,
          toolToggles,
          /* Mandate-Attach: ChatInput hat höhere Priorität (User hat
             gerade ausgewählt). Falls leer: pending state auf der
             Homepage (Modal-Auswahl ohne Submit). Falls beides leer:
             chat ist global. */
          mandateId: mandateIdFromInput ?? pendingMandate?.id ?? undefined,
          workflowId: seedWorkflowId,
          images: images && images.length > 0 ? images : undefined,
        }),
  ```

- [ ] **Step 3: ChatInput erhält die Mandate-Props** — Finde die `<ChatInput ... />` Verwendung. Erweitere:

  ```tsx
  <ChatInput
    initialValue={seedValue}
    attachedMandate={pendingMandate}
    onAttachMandate={(m) => setPendingMandate(m)}
    onSubmit={(text, toggles, images, mandateId) =>
      handleSubmit(text, toggles, images, mandateId)
    }
  />
  ```

- [ ] **Step 4: Lint**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx eslint src/components/atlas/v2/AtlasHomepage.tsx`

  Expected: clean.

- [ ] **Step 5: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/AtlasHomepage.tsx
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/v2): AtlasHomepage propagates mandate-attach into first POST

  Brand-new-chat path: Plus-Menü 'Mandat anhängen' lokaler State,
  mandateId wandert in den initialen POST /api/atlas/chat. Bestehender
  /api/atlas/chat-Pfad erkennt mandateId schon (kein Backend-Change
  nötig).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 12: MandateNewChatComposer — Mandate-Props auch dort propagieren (für Consistency)

**Files:**

- Modify: `src/components/atlas/v2/MandateNewChatComposer.tsx`

Der MandateNewChatComposer (auf der Mandate-Workspace-Page) hat sein mandateId schon implizit gesetzt — dort macht der Plus-Menü-Attach wenig Sinn (Mandate ist schon attached). Aber wir wollen consistency: ChatInput hier mit `attachedMandate={mandate}` initialisiert + `onAttachMandate` als no-op (bzw. swap auf anderes Mandat).

- [ ] **Step 1: Lese existing Code** — `cat src/components/atlas/v2/MandateNewChatComposer.tsx` für Kontext.

- [ ] **Step 2: ChatInput-Verwendung erweitern** — Finde die `<ChatInput ... />` Verwendung. Wenn der Composer ein `mandate` (mit name) prop hat, ergänze:

  ```tsx
  <ChatInput
    {/* existing props */}
    attachedMandate={{ id: mandate.id, name: mandate.name }}
    onAttachMandate={() => {
      /* No-op auf der Mandate-Page — Mandate ist Page-scope, nicht
         abnehmbar. Falls der User wechseln will, navigiert er zum
         anderen Mandat. */
    }}
  />
  ```

  Falls in der existing Komponente kein `mandate.name` vorhanden ist (nur ID), erweitere die Prop-Definition + die Caller (MandateDetailView) entsprechend.

- [ ] **Step 3: Lint**

  Run: `cd /Users/julianpolleschner/caelex-assessment && npx eslint src/components/atlas/v2/MandateNewChatComposer.tsx`

  Expected: clean.

- [ ] **Step 4: Commit**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  ALLOW_CROSS_SURFACE=1 git add src/components/atlas/v2/MandateNewChatComposer.tsx src/components/atlas/v2/MandateDetailView.tsx 2>/dev/null || true
  ALLOW_CROSS_SURFACE=1 git commit -m "$(cat <<'EOF'
  feat(atlas/mandate): MandateNewChatComposer pre-fills mandate-attach chip

  ChatInput zeigt sofort den Mandate-Chip (page-scoped Mandat ist eh
  attached). Detach disabled — Wechsel via Navigation, nicht via Chip.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 13: End-to-End Smoke-Test (manuell)

Diese Task hat keinen Code-Output — sie ist ein Sanity-Check über den ganzen Stack.

- [ ] **Step 1: Dev-Server starten + Login** — `npm run dev`, login als test-user.

- [ ] **Step 2: Sidebar-Klick auf "Mandate"** — Erwartung: navigiert zu `/atlas/mandate`, zeigt Index-Cards.

- [ ] **Step 3: Klick auf Card** — Erwartung: navigiert zu `/atlas/mandate/<id>`, zeigt Workspace mit Briefing-Slot + Sections in neuer Reihenfolge.

- [ ] **Step 4: Zurück zum Homepage** — Browse zu `/atlas`. Klick Plus-Button im Composer. Erwartung: Popover öffnet downward, zeigt 2 Einträge ("Datei…" + "Mandat anhängen").

- [ ] **Step 5: Klick "Mandat anhängen"** — Modal öffnet, Recent-Liste sichtbar. Tippe ein paar Buchstaben → Live-Search filtert.

- [ ] **Step 6: Mandat auswählen** — Modal schließt, Chip oberhalb Composer erscheint mit Mandat-Name. Sidebar zeigt jetzt MandateContextSection (Files / Deadlines preview).

- [ ] **Step 7: Nachricht abschicken** — Erste Antwort streamt; nach Stream-Done navigiert auf `/atlas/chat/<id>`.

- [ ] **Step 8: Im Chat-View — Chip noch da, Mandate-Context noch da** — Bestätigt dass `mandateId` im DB-Chat persistiert ist.

- [ ] **Step 9: Detach via Chip [×]** — Chip verschwindet, Sidebar verliert MandateContextSection nach dem nächsten Refresh-Event.

- [ ] **Step 10: Re-Attach via Plus-Menü** — Reattach klappt, Sidebar zeigt wieder den Context.

Wenn IRGENDETWAS in Steps 2-10 nicht klappt: Issue notieren, nicht weitermachen. Häufige Probleme:

- "Plus-Menü öffnet nicht downward" → Step 7 Task 7 prüfen (CSS-Klassen `top-full mt-2`)
- "Chip erscheint nicht" → Step 6 Task 7 prüfen (effectiveMandate-Check)
- "Sidebar refresh tut nichts" → Event-Name-Typo (`atlas-v2-sidebar-refresh`)

---

## Task 14: Final Quality Gates

- [ ] **Step 1: ESLint auf alle modified files**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  npx eslint \
    src/components/atlas/v2/AtlasSidebar.tsx \
    src/components/atlas/v2/ChatInput.tsx \
    src/components/atlas/v2/AtlasChatView.tsx \
    src/components/atlas/v2/AtlasHomepage.tsx \
    src/components/atlas/v2/MandateAttachChip.tsx \
    src/components/atlas/v2/MandateAttachModal.tsx \
    src/components/atlas/v2/MandateDetailView.tsx \
    src/components/atlas/v2/MandateNewChatComposer.tsx \
    src/app/\(atlas\)/atlas/mandate/page.tsx \
    src/app/\(atlas\)/atlas/mandate/_components/MandateIndexClient.tsx \
    src/app/\(atlas\)/atlas/mandate/_components/MandateIndexCard.tsx \
    src/app/api/atlas/mandate/search/route.ts \
    src/app/api/atlas/chat/\[id\]/attach-mandate/route.ts
  ```

  Expected: zero errors / zero warnings.

- [ ] **Step 2: Vitest auf alle neuen Tests**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  npx vitest run \
    src/app/api/atlas/mandate/search/route.test.ts \
    src/app/api/atlas/chat/\[id\]/attach-mandate/route.test.ts
  ```

  Expected: alle pass.

- [ ] **Step 3: TypeScript-Check (NUR auf die touched files via grep)**

  Run:

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | grep -E "atlas/v2|atlas/mandate|attach-mandate" | head -30
  ```

  Expected: keine Treffer (nur pre-existing Errors in unrelated files wie `verity/`, `workflow/definitions`, `middleware.test`).

- [ ] **Step 4: Git status sanity** — `git -C /Users/julianpolleschner/caelex-assessment status` sollte clean sein. Alle Task-Commits sollten in `git log origin/main..HEAD` auftauchen (12-13 commits ungefähr).

---

## Task 15: Push (deferred until user explicitly approves)

Per CLAUDE.md Batched-Deploys-Policy: nicht automatisch pushen. Stattdessen reporten.

- [ ] **Step 1: Commit-Liste anzeigen**

  ```bash
  cd /Users/julianpolleschner/caelex-assessment
  git log origin/main..HEAD --oneline
  ```

- [ ] **Step 2: User informieren** — Diesen Output dem User zeigen mit Notiz: "M1 Foundation lokal fertig (Y commits). Ready zum Push wenn Du sagst 'deploy'." NICHT automatisch pushen.

---

# Self-Review (intern, nach Plan-Erstellung — vor User-Handoff)

**Spec coverage check:**

| Spec-Item                                                                     | Plan-Task                     |
| ----------------------------------------------------------------------------- | ----------------------------- |
| Sidebar-Rename "Neues Mandat" → "Mandate"                                     | Task 2                        |
| `/atlas/mandate` Index-Page mit Cards/Search/Filter/Sort                      | Task 9                        |
| `/atlas/mandate/[id]` Workspace single-page-scroll Layout                     | Task 10                       |
| Briefing-Slot (Placeholder für M1)                                            | Task 10, Step 3               |
| Composer Plus-Menü +1 Eintrag "Mandat anhängen"                               | Task 7, Step 7                |
| MandateAttachModal (Search-first, Recent + Live-Search)                       | Task 6                        |
| MandateAttachChip oberhalb Composer                                           | Task 5 + Task 7 Step 6        |
| POST /api/atlas/chat/[id]/attach-mandate                                      | Task 4                        |
| GET /api/atlas/mandate/search                                                 | Task 3                        |
| Schema: nullable AtlasMandate-Felder + AtlasMandateDeadlineSuggestion-Tabelle | Task 1                        |
| Sidebar Auto-Refresh nach Attach (existing event-bus)                         | Task 7 Step 9 + Task 8 Step 3 |
| Brand-new-chat path (mandateId in initialem POST)                             | Task 11                       |
| MandateNewChatComposer pre-attached chip                                      | Task 12                       |
| Quality gates (lint + test + typecheck)                                       | Task 14                       |
| Push-Gating per CLAUDE.md                                                     | Task 15                       |

**Out-of-scope für M1 (per Spec, NICHT im Plan):** Auto-Briefing-Generation, Cross-Chat-Memory, Vault-RAG, Auto-Deadline-Extract, Drafting-from-Mandate (alle M2-M5).

**Placeholder scan:** Keine "TBD" / "TODO" / "implement later" im Plan.

**Type consistency:** `attachedMandate` Prop ist konsistent durch alle Tasks (`{ id: string; name: string } | null`); `onAttachMandate` callback signatur konsistent; `mandateId` Parameter im onSubmit konsistent.

**Plan ready for execution.**
